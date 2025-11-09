import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Run Analysis Job - The Heavy Lifter
 *
 * This function performs the complete ESG analysis workflow:
 * 1. Extract materials from all project clauses (NLP)
 * 2. Link extracted materials to the ESG Material Library
 * 3. Calculate carbon savings for alternative materials
 * 4. Generate an AI-powered ESG report
 * 5. Save the report to the database
 *
 * This is a long-running function that should be called asynchronously.
 */

interface RunAnalysisRequest {
  job_id: string;
  project_id: string;
}

interface ExtractedMaterial {
  material: string;
  quantity: string;
  context: string;
}

interface ESGMaterial {
  esg_material_id: string;
  name: string;
  embodied_carbon: number;
  carbon_unit: string;
  cost_impact_text: string;
  modifications_text: string;
  alternative_to_ids: string[] | null;
  nlp_tags: {
    synonyms?: string[];
    tags?: string[];
  };
}

interface Suggestion {
  currentMaterial: string;
  currentCarbon: number;
  alternativeMaterial: string;
  alternativeCarbon: number;
  savings: number;
  savingsPercentage: number;
  costImpact: string;
  modifications: string;
  source?: string;
  availability?: string;
}

interface ExtractedProduct {
  product_id: string;
  product_name: string;
  esg_material_id: string | null;
  manufacturer: string;
  clause_id: string;
}

interface ExtractionResult {
  text: string;
  products: ExtractedProduct[];
}

/**
 * Extract all text content and product selections from project clauses
 * This implements the "Hybrid Analysis" approach:
 * - Path A (Easy): Extract products with direct ESG links
 * - Path B (Hard): Extract text for NLP processing
 */
async function extractProjectContent(supabase: any, projectId: string): Promise<ExtractionResult> {
  // Fetch all project clauses with their master clause templates
  const { data: clauses, error } = await supabase
    .from('project_clause')
    .select(`
      project_clause_id,
      freeform_caws_number,
      field_values,
      freeform_body,
      freeform_title,
      master_clause_id,
      master_clause (
        caws_number,
        title,
        body_template,
        field_definitions
      )
    `)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project clauses:', error);
    throw new Error('Failed to fetch project clauses');
  }

  if (!clauses || clauses.length === 0) {
    console.log('No clauses found for project');
    return { text: '', products: [] };
  }

  console.log(`Found ${clauses.length} clauses for project ${projectId}`);

  // Build result with both text and products
  const textParts: string[] = [];
  const extractedProducts: ExtractedProduct[] = [];

  for (const clause of clauses) {
    // Get CAWS number - from master_clause for hybrid, or freeform_caws_number for freeform
    const cawsNumber = clause.master_clause?.caws_number || clause.freeform_caws_number || 'UNKNOWN';
    textParts.push(`\n--- CLAUSE ${cawsNumber} ---`);

    if (clause.master_clause_id && clause.master_clause) {
      // Hybrid clause - check for product selection FIRST (Path A - Easy)
      if (clause.field_values && typeof clause.field_values === 'object') {
        const fieldValues = clause.field_values as Record<string, any>;

        // Check if user selected a product from ProductBrowser
        if (fieldValues.selected_product_id) {
          console.log(`Found product selection in clause ${clause.project_clause_id}: ${fieldValues.selected_product_id}`);

          // Query product_library to get product details and ESG link
          const { data: product, error: productError } = await supabase
            .from('product_library')
            .select('product_id, product_name, manufacturer, esg_material_id')
            .eq('product_id', fieldValues.selected_product_id)
            .single();

          if (!productError && product) {
            extractedProducts.push({
              product_id: product.product_id,
              product_name: product.product_name,
              manufacturer: product.manufacturer,
              esg_material_id: product.esg_material_id,
              clause_id: clause.project_clause_id
            });

            console.log(`Extracted product: ${product.manufacturer} - ${product.product_name} (ESG ID: ${product.esg_material_id})`);
          } else {
            console.warn(`Product ${fieldValues.selected_product_id} not found in library`);
          }
        }
      }

      // Then build text for NLP extraction (Path B - Hard)
      textParts.push(`Title: ${clause.master_clause.title}`);

      let renderedText = clause.master_clause.body_template || '';

      // Replace placeholders with actual field values
      if (clause.field_values && typeof clause.field_values === 'object') {
        const fieldValues = clause.field_values as Record<string, any>;

        for (const [key, value] of Object.entries(fieldValues)) {
          // Skip product-related fields (already extracted via Path A)
          if (key === 'selected_product_id' || key.startsWith('product_')) {
            continue;
          }

          if (value !== null && value !== undefined) {
            const placeholder = `{{${key}}}`;
            const replacement = Array.isArray(value) ? value.join(', ') : String(value);
            renderedText = renderedText.replace(new RegExp(placeholder, 'g'), replacement);
          }
        }
      }

      textParts.push(renderedText);
    } else if (clause.freeform_body) {
      // Freeform clause - only text extraction (Path B)
      textParts.push(clause.freeform_body);
    }
  }

  console.log(`Extracted ${extractedProducts.length} products with direct links`);

  return {
    text: textParts.join('\n\n'),
    products: extractedProducts
  };
}

/**
 * Call the LLM wrapper to extract materials
 */
async function callLLMExtraction(geminiApiKey: string, text: string): Promise<ExtractedMaterial[]> {
  console.log('[callLLMExtraction] Calling Gemini API for material extraction...');

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `You are an expert construction materials analyst with deep knowledge of UK construction specifications and the NRM (New Rules of Measurement).

Your task is to extract ALL specified construction materials from the following specification text.

INSTRUCTIONS:
1. Read through the entire text carefully
2. Identify all construction materials mentioned (cement, concrete, bricks, steel, timber, glass, etc.)
3. Extract the material name and any specified quantities
4. Normalize material names to standard terminology (e.g., "OPC" → "Portland Cement (CEM I)")
5. Return ONLY a JSON array with no additional text or explanation

OUTPUT FORMAT (JSON only):
[
  {
    "material": "Portland Cement (CEM I)",
    "quantity": "10 tonnes",
    "context": "Brief context from spec (1 sentence)"
  }
]

SPECIFICATION TEXT:
${text}

IMPORTANT: Return ONLY the JSON array. Do not include any explanatory text, markdown formatting, or code blocks.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  console.log('[callLLMExtraction] Gemini response received, parsing...');

  // Clean up the response and parse JSON
  const cleanedText = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const materials = JSON.parse(cleanedText);
  console.log(`[callLLMExtraction] Extracted ${materials.length} materials from text`);
  return materials;
}

/**
 * Link extracted materials to the ESG Material Library
 * This implements both Path A (direct product links) and Path B (NLP matching)
 */
async function linkMaterialsToLibrary(
  supabase: any,
  extractedMaterials: ExtractedMaterial[],
  extractedProducts: ExtractedProduct[]
): Promise<Map<string, ESGMaterial>> {
  // Fetch all materials from the library (global materials only for now)
  const { data: libraryMaterials, error } = await supabase
    .from('esg_material_library')
    .select('*')
    .eq('is_active', true)
    .is('organisation_id', null); // Only global materials for now

  if (error) {
    console.error('Error fetching ESG library:', error);
    throw new Error('Failed to fetch ESG material library');
  }

  console.log(`[linkMaterialsToLibrary] Loaded ${libraryMaterials.length} materials from library`);
  
  // Debug: Log materials with alternatives
  const materialsWithAlternatives = libraryMaterials.filter((m: ESGMaterial) => 
    m.alternative_to_ids && Array.isArray(m.alternative_to_ids) && m.alternative_to_ids.length > 0
  );
  console.log(`[linkMaterialsToLibrary] Materials with alternative_to_ids: ${materialsWithAlternatives.length}`);
  materialsWithAlternatives.forEach((m: ESGMaterial) => {
    console.log(`[linkMaterialsToLibrary]   - ${m.name}: alternative_to_ids = ${JSON.stringify(m.alternative_to_ids)}`);
  });

  const linkedMaterials = new Map<string, ESGMaterial>();

  // PATH A (EASY): Process products with direct ESG links first
  console.log(`Processing ${extractedProducts.length} products with direct ESG links...`);

  for (const product of extractedProducts) {
    if (product.esg_material_id) {
      // Direct lookup - no NLP needed!
      const material = libraryMaterials.find((lib: ESGMaterial) =>
        lib.esg_material_id === product.esg_material_id
      );

      if (material) {
        console.log(`[linkMaterialsToLibrary] ✓ Direct link: ${product.manufacturer} - ${product.product_name} → ${material.name} (${material.esg_material_id})`);
        linkedMaterials.set(String(material.esg_material_id), material);
      } else {
        console.warn(`[linkMaterialsToLibrary] ✗ Product ${product.product_name} has esg_material_id ${product.esg_material_id} but material not found in library`);
      }
    } else {
      console.warn(`Product ${product.product_name} does not have esg_material_id - skipping direct link`);
    }
  }

  console.log(`[linkMaterialsToLibrary] Linked ${linkedMaterials.size} materials via direct product links (Path A)`);

  // PATH B (HARD): For each extracted material from text, find the best match using NLP
  console.log(`[linkMaterialsToLibrary] Processing ${extractedMaterials.length} text-extracted materials via NLP...`);

  for (const extracted of extractedMaterials) {
    const extractedName = extracted.material.toLowerCase().trim();
    console.log(`[linkMaterialsToLibrary] Attempting to match: "${extracted.material}"`);

    // Try to find a match using NLP tags
    const match = libraryMaterials.find((lib: ESGMaterial) => {
      const libName = lib.name.toLowerCase();

      // Direct name match
      if (libName === extractedName) {
        console.log(`[linkMaterialsToLibrary] Direct name match: "${extracted.material}" → "${lib.name}"`);
        return true;
      }

      // Check synonyms
      if (lib.nlp_tags && lib.nlp_tags.synonyms) {
        const synonyms = lib.nlp_tags.synonyms.map((s: string) => s.toLowerCase());
        if (synonyms.includes(extractedName)) {
          console.log(`[linkMaterialsToLibrary] Synonym match: "${extracted.material}" → "${lib.name}" (via synonym)`);
          return true;
        }

        // Partial match on synonyms
        if (synonyms.some((s: string) => extractedName.includes(s) || s.includes(extractedName))) {
          console.log(`[linkMaterialsToLibrary] Partial synonym match: "${extracted.material}" → "${lib.name}"`);
          return true;
        }
      }

      return false;
    });

    if (match) {
      console.log(`[linkMaterialsToLibrary] ✓ Linked "${extracted.material}" to "${match.name}" (${match.esg_material_id})`);
      linkedMaterials.set(String(match.esg_material_id), match);
    } else {
      console.log(`[linkMaterialsToLibrary] ✗ No match found for "${extracted.material}"`);
    }
  }
  
  console.log(`[linkMaterialsToLibrary] Total linked materials: ${linkedMaterials.size}`);
  console.log(`[linkMaterialsToLibrary] Linked material IDs: ${Array.from(linkedMaterials.keys()).join(', ')}`);

  return linkedMaterials;
}

/**
 * Analyze materials and find alternatives
 */
async function analyzeMaterials(
  supabase: any,
  linkedMaterials: Map<string, ESGMaterial>
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  // Fetch all materials again to find alternatives
  const { data: allMaterials, error } = await supabase
    .from('esg_material_library')
    .select('*')
    .eq('is_active', true)
    .is('organisation_id', null);

  if (error) {
    console.error('Error fetching materials for analysis:', error);
    throw new Error('Failed to fetch materials for analysis');
  }

  // For each linked material, find alternatives
  console.log(`[analyzeMaterials] Analyzing ${linkedMaterials.size} linked materials for alternatives...`);
  
  for (const [materialId, material] of linkedMaterials) {
    console.log(`[analyzeMaterials] Checking material: ${material.name} (${materialId})`);
    
    // Find materials that list this material as an alternative
    // Note: alternative_to_ids is UUID[], materialId is string, so we need to compare as strings
    const alternatives = allMaterials.filter((alt: ESGMaterial) => {
      if (!alt.alternative_to_ids || !Array.isArray(alt.alternative_to_ids) || alt.alternative_to_ids.length === 0) {
        return false;
      }
      // Convert UUIDs to strings for comparison
      const altIdsAsStrings = alt.alternative_to_ids.map(id => String(id));
      return altIdsAsStrings.includes(String(materialId));
    });

    console.log(`[analyzeMaterials] Found ${alternatives.length} alternatives for ${material.name}`);

    // Calculate savings for each alternative
    for (const alt of alternatives) {
      const currentCarbon = parseFloat(String(material.embodied_carbon));
      const alternativeCarbon = parseFloat(String(alt.embodied_carbon));
      const savings = currentCarbon - alternativeCarbon;
      const savingsPercentage = (savings / currentCarbon) * 100;

      console.log(`[analyzeMaterials] Alternative: ${alt.name} - Current: ${currentCarbon}, Alt: ${alternativeCarbon}, Savings: ${savings}`);

      // Only include if there's a carbon saving
      if (savings > 0) {
        suggestions.push({
          currentMaterial: material.name,
          currentCarbon,
          alternativeMaterial: alt.name,
          alternativeCarbon,
          savings,
          savingsPercentage,
          costImpact: alt.cost_impact_text || 'Unknown',
          modifications: alt.modifications_text || 'None'
        });
        console.log(`[analyzeMaterials] ✓ Added suggestion: ${material.name} → ${alt.name} (${savings.toFixed(2)} kgCO2e savings)`);
      } else {
        console.log(`[analyzeMaterials] ✗ Skipped alternative ${alt.name} - no carbon saving (${savings})`);
      }
    }
    
    if (alternatives.length === 0) {
      console.log(`[analyzeMaterials] ⚠ No alternatives found for ${material.name} - checking alternative_to_ids structure...`);
      // Debug: check what materials have this as an alternative
      const materialsWithThisAsAlt = allMaterials.filter((m: ESGMaterial) => {
        if (!m.alternative_to_ids || !Array.isArray(m.alternative_to_ids)) return false;
        return m.alternative_to_ids.some(id => String(id) === String(materialId));
      });
      console.log(`[analyzeMaterials] Materials that should list ${material.name} as alternative: ${materialsWithThisAsAlt.length}`);
      if (materialsWithThisAsAlt.length > 0) {
        console.log(`[analyzeMaterials] Found materials: ${materialsWithThisAsAlt.map(m => `${m.name} (alt_to_ids: ${JSON.stringify(m.alternative_to_ids)})`).join(', ')}`);
      }
    }
  }

  // Sort by savings (highest first)
  suggestions.sort((a, b) => b.savings - a.savings);

  console.log(`Generated ${suggestions.length} suggestions`);

  return suggestions;
}

/**
 * Search for lower-carbon alternatives using Google Search grounding
 * This replaces the static library lookup with real-time web search
 */
async function searchForAlternatives(
  geminiApiKey: string,
  linkedMaterials: Map<string, ESGMaterial>
): Promise<Suggestion[]> {
  console.log('[searchForAlternatives] Searching for lower-carbon alternatives via Google Search...');

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }]
  });

  // Build a comprehensive prompt that instructs the model to search for alternatives
  const materialsList = Array.from(linkedMaterials.values())
    .map((m, i) => `${i + 1}. ${m.name} (${m.embodied_carbon} ${m.carbon_unit})`)
    .join('\n');

  const prompt = `You are an expert ESG (Environmental, Social, Governance) consultant specializing in construction materials and embodied carbon reduction.

I need you to search the web for lower-carbon alternatives to the following construction materials currently specified in a project:

MATERIALS TO ANALYZE:
${materialsList}

YOUR TASK:
1. **For EACH material above, perform a well-tuned Google Search** to find:
   - Lower-carbon alternative materials or products
   - Actual embodied carbon values (kgCO2e) from reliable sources (EPDs, LCA databases, manufacturer data)
   - Real-world products and suppliers available in the UK market
   - Cost implications and technical considerations

2. **Search Strategy:**
   - Use specific search queries like: "[Material Name] low carbon alternative embodied carbon UK"
   - Search for: "[Material Name] EPD LCA embodied carbon"
   - Look for: "sustainable [Material Name] alternatives construction UK"
   - Find actual product data from manufacturers, EC3 database, ICE database, or similar authoritative sources

3. **For each alternative found, provide:**
   - Material/product name
   - Embodied carbon value (kgCO2e) with unit
   - Source/authority (EPD, manufacturer, database)
   - Carbon savings compared to current material
   - Cost impact (if available)
   - Technical modifications required (if any)
   - Availability in UK market

4. **Focus on:**
   - Real, available products (not theoretical)
   - Verified carbon data from EPDs or LCA studies
   - Practical alternatives that can be specified in UK construction projects
   - Materials that offer genuine carbon savings (at least 10% reduction)

OUTPUT FORMAT (JSON only):
Return a JSON array with this structure:
[
  {
    "currentMaterial": "Portland Cement (CEM I)",
    "currentCarbon": 820.0,
    "alternativeMaterial": "Ground Granulated Blast-furnace Slag Cement (CEM III/A)",
    "alternativeCarbon": 270.0,
    "savings": 550.0,
    "savingsPercentage": 67.1,
    "costImpact": "5-10% cost increase",
    "modifications": "Requires careful curing in cold weather. May require extended curing times.",
    "source": "ICE Database v3.0 / Manufacturer EPD",
    "availability": "Widely available in UK market"
  }
]

IMPORTANT:
- Perform actual web searches using Google Search to find real, current data
- Only include alternatives with verified carbon savings
- Prioritize alternatives with the highest carbon reduction potential
- Return ONLY the JSON array, no additional text or markdown formatting`;

  try {
    console.log('[searchForAlternatives] Calling Gemini API with Google Search grounding...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    });
    const response = result.response;
    const text = response.text();
    
    // Check for grounding metadata
    const groundingMetadata = (response as any).groundingMetadata;
    if (groundingMetadata) {
      console.log('[searchForAlternatives] Google Search was used - queries:', groundingMetadata.webSearchQueries);
      console.log('[searchForAlternatives] Sources found:', groundingMetadata.groundingChunks?.length || 0);
    } else {
      console.log('[searchForAlternatives] Warning: No grounding metadata - model may not have used Google Search');
    }

    console.log('[searchForAlternatives] Gemini response received, parsing...');

    // Clean up and parse JSON
    const cleanedText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const suggestions = JSON.parse(cleanedText);
    console.log(`[searchForAlternatives] Found ${suggestions.length} alternatives via web search`);

    // Sort by savings (highest first)
    suggestions.sort((a: Suggestion, b: Suggestion) => b.savings - a.savings);

    return suggestions;
  } catch (error) {
    console.error('[searchForAlternatives] Error searching for alternatives:', error);
    throw error;
  }
}

/**
 * Call the LLM to generate the ESG report
 */
async function generateESGReport(
  geminiApiKey: string,
  projectName: string,
  suggestions: Suggestion[]
): Promise<any> {
  console.log('[generateESGReport] Generating ESG report via Gemini API...');

  const totalCurrentCarbon = suggestions.reduce((sum, s) => sum + s.currentCarbon, 0);
  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.savings, 0);

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an expert ESG (Environmental, Social, Governance) consultant specializing in construction and embodied carbon reduction.

You have analyzed the specification for "${projectName}" and identified opportunities to reduce embodied carbon through material substitutions. The alternatives were found through web search of current EPDs, LCA databases, and manufacturer data.

ANALYSIS DATA:
- Total potential carbon reduction: ${((totalPotentialSavings / totalCurrentCarbon) * 100).toFixed(1)}% (percentage only)
- Materials analyzed: ${suggestions.length}
- Improvement opportunities identified: ${suggestions.length}

TOP OPPORTUNITIES (sorted by impact):
${suggestions.slice(0, 5).map((s, i) => `
${i + 1}. Replace "${s.currentMaterial}" with "${s.alternativeMaterial}"
   - Carbon reduction: ${s.savingsPercentage.toFixed(1)}% (percentage only - do not include absolute kg values)
   - Cost impact: ${s.costImpact}
   - Modifications required: ${s.modifications}
   ${(s as any).source ? `- Source: ${(s as any).source}` : ''}
   ${(s as any).availability ? `- Availability: ${(s as any).availability}` : ''}
`).join('\n')}

YOUR TASK:
Write a professional ESG report focused solely on material replacement recommendations for CO2 and environmental impact reduction. Use Google Search if you need to verify any information or find additional context.

CRITICAL REQUIREMENTS:
1. **Exactly 3 recommendations maximum** - one per material/component type
2. **Use percentages only** - never include absolute kgCO2e values, only percentage reductions
3. **Additional opportunities** - only list other replacement options for the same materials/components
4. **No next steps, implementation advice, or action items** - only material replacement suggestions

The report should include:

1. **Executive Summary** (2-3 sentences)
   - Overall potential carbon reduction (as percentage only)
   - Key message about material replacement opportunities

2. **Top Recommendations** (exactly 3 or fewer, one per component type)
   For each recommendation include:
   - Material/component to replace
   - Alternative material/product name
   - Carbon reduction percentage (NOT absolute kg values)
   - Brief description of the alternative and why it reduces impact
   - Cost impact (if available)
   - Source/authority for the carbon data (EPD, manufacturer, database)

3. **Additional Opportunities** (optional)
   - Only other replacement options for the same materials/components already covered
   - List alternative materials that could replace the same components
   - Include percentage reduction for each
   - Do NOT include new component types - only variations of replacements

TONE & STYLE:
- Professional but accessible
- Focus exclusively on material replacements
- Use UK construction terminology and standards
- Use percentages only - never absolute kgCO2e values
- Reference sources when available

OUTPUT FORMAT:
Return your response as a JSON object with this structure:
{
  "title": "Single sentence describing the material replacement opportunities (e.g., 'Three material substitutions can reduce embodied carbon by X%')",
  "summary": "Brief executive summary paragraph (percentages only, no absolute values)",
  "topRecommendations": [
    {
      "title": "Recommendation title (material/component type)",
      "description": "Brief explanation of the replacement (1-2 paragraphs, use markdown for formatting)",
      "savings": "Y% reduction (percentage only, no kg values)",
      "costImpact": "Cost implications (if available)",
      "source": "Source of carbon data (EPD, manufacturer, database)"
    }
  ],
  "additionalOpportunities": [
    {
      "title": "Alternative material name for same component",
      "savings": "Y% reduction (percentage only)"
    }
  ]
}

IMPORTANT: 
- Title must be a single sentence (not "ESG Analysis: Project Name" format)
- Maximum 3 recommendations, one per component/material type
- Use percentages ONLY - never include absolute kgCO2e values
- Additional opportunities are only other replacement options for the same components
- Do NOT include "nextSteps" or any implementation guidance
- Focus solely on material replacements for CO2/environmental impact reduction
- Use Google Search if you need to verify information
- Return ONLY the JSON object. Do not include any explanatory text, markdown code blocks, or formatting outside the JSON.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]
  });
  const response = result.response;
  const text = response.text();
  
  // Check for grounding metadata
  const groundingMetadata = (response as any).groundingMetadata;
  if (groundingMetadata) {
    console.log('[generateESGReport] Google Search was used - queries:', groundingMetadata.webSearchQueries);
    console.log('[generateESGReport] Sources found:', groundingMetadata.groundingChunks?.length || 0);
  } else {
    console.log('[generateESGReport] Note: No grounding metadata in response');
  }

  console.log('[generateESGReport] Gemini response received, parsing...');

  // Clean up the response and parse JSON
  const cleanedText = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const report = JSON.parse(cleanedText);
  console.log('[generateESGReport] ESG report generated successfully');
  return report;
}

/**
 * Save the ESG report to the database
 */
async function saveESGReport(
  supabase: any,
  projectId: string,
  report: any
): Promise<void> {
  // First, delete any old reports for this project
  await supabase
    .from('project_esg_suggestion')
    .delete()
    .eq('project_id', projectId)
    .is('source_clause_id', null);

  // Build the narrative from the report
  let narrative = `# ${report.title || 'ESG Analysis'}\n\n`;
  narrative += `${report.summary}\n\n`;

  if (report.topRecommendations && report.topRecommendations.length > 0) {
    narrative += `## Top Recommendations\n\n`;
    // Limit to exactly 3 recommendations maximum
    const recommendations = report.topRecommendations.slice(0, 3);
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      narrative += `### ${i + 1}. ${rec.title}\n\n`;
      narrative += `${rec.description}\n\n`;
      narrative += `**Carbon Reduction:** ${rec.savings}\n\n`;
      if (rec.costImpact) {
        narrative += `**Cost Impact:** ${rec.costImpact}\n\n`;
      }
      if (rec.source) {
        narrative += `**Source:** ${rec.source}\n\n`;
      }
      narrative += `---\n\n`;
    }
  }

  if (report.additionalOpportunities && report.additionalOpportunities.length > 0) {
    narrative += `## Additional Opportunities\n\n`;
    narrative += `Other replacement options for the same materials/components:\n\n`;
    for (const opp of report.additionalOpportunities) {
      narrative += `- ${opp.title} (${opp.savings})\n`;
    }
    narrative += `\n`;
  }

  // Insert the new report
  const { error } = await supabase
    .from('project_esg_suggestion')
    .insert({
      project_id: projectId,
      source_clause_id: null, // Global report
      suggestion_title: report.title || 'ESG Analysis Report',
      suggestion_narrative: narrative,
      status: 'new'
    });

  if (error) {
    console.error('Error saving ESG report:', error);
    throw new Error('Failed to save ESG report');
  }

  console.log('ESG report saved successfully');
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  console.log('[run-analysis-job] Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[run-analysis-job] CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Authenticate the request - accept both user tokens and service role
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    console.error('[run-analysis-job] Missing authorization header');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // KISS: Just check for auth header, don't validate
  console.log('[run-analysis-job] Authorization header present');

  // Get Gemini API key
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('[run-analysis-job] GEMINI_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Create service role client for all operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[run-analysis-job] Supabase client created');

  try {
    // Parse request body
    console.log('[run-analysis-job] Parsing request body...');
    const requestBody = await req.json() as RunAnalysisRequest;
    const { job_id, project_id } = requestBody;

    if (!job_id || !project_id) {
      console.error('[run-analysis-job] Missing required fields - job_id:', job_id, 'project_id:', project_id);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: job_id, project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[run-analysis-job] Starting analysis job ${job_id} for project ${project_id}`);

    // Update job status to running
    console.log(`[run-analysis-job] Updating job ${job_id} status to 'running'...`);
    await supabase
      .from('project_analysis_job')
      .update({ status: 'running' })
      .eq('job_id', job_id);
    console.log(`[run-analysis-job] Job ${job_id} status updated to 'running'`);

    try {
      // Get project name
      console.log(`[run-analysis-job] Fetching project ${project_id}...`);
      const { data: project, error: projectError } = await supabase
        .from('project')
        .select('name')
        .eq('project_id', project_id)
        .single();

      if (projectError || !project) {
        console.error(`[run-analysis-job] Project not found:`, projectError?.message);
        throw new Error('Project not found');
      }

      const projectName = project.name || 'Untitled Project';
      console.log(`[run-analysis-job] Project name: ${projectName}`);

      // Step A: Extract materials from project (both products and text)
      console.log('[run-analysis-job] Step A: Extracting project content (products + text)...');
      const extractionResult = await extractProjectContent(supabase, project_id);
      console.log(`[run-analysis-job] Extraction complete - products: ${extractionResult.products.length}, text length: ${extractionResult.text.length}`);

      if ((!extractionResult.text || extractionResult.text.trim().length === 0) && extractionResult.products.length === 0) {
        console.log('[run-analysis-job] No content found in project (no text and no products)');

        // Create a "no content" report
        await supabase
          .from('project_esg_suggestion')
          .delete()
          .eq('project_id', project_id)
          .is('source_clause_id', null);

        await supabase
          .from('project_esg_suggestion')
          .insert({
            project_id: project_id,
            source_clause_id: null,
            suggestion_title: 'ESG Analysis: No Content',
            suggestion_narrative: '# No Content Found\n\nThis project does not have any clauses with material specifications yet. Add some clauses to your specification to receive ESG recommendations.',
            status: 'new'
          });

        await supabase
          .from('project_analysis_job')
          .update({
            status: 'complete',
            completed_at: new Date().toISOString()
          })
          .eq('job_id', job_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Analysis complete (no content)'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[run-analysis-job] Extracted ${extractionResult.products.length} products and ${extractionResult.text.length} characters of text`);

      // Step A (continued): Call LLM for text-based material extraction (Path B)
      let extractedMaterials: ExtractedMaterial[] = [];

      if (extractionResult.text && extractionResult.text.trim().length > 0) {
        console.log('[run-analysis-job] Step A (continued): Calling Gemini for text-based material extraction (Path B)...');
        extractedMaterials = await callLLMExtraction(geminiApiKey, extractionResult.text);
        console.log(`[run-analysis-job] Extracted ${extractedMaterials.length} materials from text via NLP`);
      } else {
        console.log('[run-analysis-job] No text content to extract - skipping LLM call');
      }

      // Step B: Link materials to library (both Path A products and Path B text)
      console.log('[run-analysis-job] Step B: Linking materials to library...');
      const linkedMaterials = await linkMaterialsToLibrary(
        supabase,
        extractedMaterials,
        extractionResult.products
      );
      console.log(`[run-analysis-job] Linked ${linkedMaterials.size} total materials to library`);

      if (linkedMaterials.size === 0) {
        // No materials found - create a report saying so
        await supabase
          .from('project_esg_suggestion')
          .delete()
          .eq('project_id', project_id)
          .is('source_clause_id', null);

        await supabase
          .from('project_esg_suggestion')
          .insert({
            project_id: project_id,
            source_clause_id: null,
            suggestion_title: 'ESG Analysis: No Materials Found',
            suggestion_narrative: '# No Recognized Materials Found\n\nThe AI could not identify any construction materials in your specification that match our ESG database. This could be because:\n\n- The specification uses non-standard material names\n- The materials are very specialized\n- The specification is still in early draft stages\n\nTry adding more specific material specifications (e.g., "Portland Cement", "facing bricks", "structural steel") to receive ESG recommendations.',
            status: 'new'
          });

        await supabase
          .from('project_analysis_job')
          .update({
            status: 'complete',
            completed_at: new Date().toISOString()
          })
          .eq('job_id', job_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Analysis complete (no materials found)'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Step B (continued): Search for alternatives using Google Search
      console.log('[run-analysis-job] Step B (continued): Searching for lower-carbon alternatives via Google Search...');
      let suggestions: Suggestion[];
      
      try {
        // Use Google Search to find real-time alternatives
        suggestions = await searchForAlternatives(geminiApiKey, linkedMaterials);
        console.log(`[run-analysis-job] Found ${suggestions.length} alternatives via web search`);
      } catch (searchError) {
        console.error('[run-analysis-job] Error in web search, falling back to library lookup:', searchError);
        // Fallback to static library if search fails
        suggestions = await analyzeMaterials(supabase, linkedMaterials);
        console.log(`[run-analysis-job] Fallback: Generated ${suggestions.length} suggestions from library`);
      }

      if (suggestions.length === 0) {
        // No suggestions - all materials are already optimal
        await supabase
          .from('project_esg_suggestion')
          .delete()
          .eq('project_id', project_id)
          .is('source_clause_id', null);

        await supabase
          .from('project_esg_suggestion')
          .insert({
            project_id: project_id,
            source_clause_id: null,
            suggestion_title: 'ESG Analysis: Already Optimized',
            suggestion_narrative: '# Great News! Your specification is already optimized\n\nThe AI has analyzed your specification and found that you are already specifying the lowest-carbon materials available in our database.\n\nKeep up the good work on sustainable construction!',
            status: 'new'
          });

        await supabase
          .from('project_analysis_job')
          .update({
            status: 'complete',
            completed_at: new Date().toISOString()
          })
          .eq('job_id', job_id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Analysis complete (already optimized)'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Step C: Generate ESG report
      console.log('[run-analysis-job] Step C: Generating ESG report...');
      const report = await generateESGReport(geminiApiKey, projectName, suggestions);
      console.log('[run-analysis-job] ESG report generated successfully');

      // Step D: Save the report
      console.log('[run-analysis-job] Step D: Saving ESG report...');
      await saveESGReport(supabase, project_id, report);
      console.log('[run-analysis-job] ESG report saved to database');

      // Mark job as complete
      console.log(`[run-analysis-job] Marking job ${job_id} as complete...`);
      await supabase
        .from('project_analysis_job')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString()
        })
        .eq('job_id', job_id);

      console.log(`[run-analysis-job] Analysis job ${job_id} completed successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Analysis completed successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (analysisError) {
      console.error('[run-analysis-job] Analysis error:', analysisError);

      // Mark job as failed
      console.error(`[run-analysis-job] Marking job ${job_id} as failed...`);
      await supabase
        .from('project_analysis_job')
        .update({
          status: 'failed',
          error_message: analysisError instanceof Error ? analysisError.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('job_id', job_id);

      throw analysisError;
    }

  } catch (error) {
    console.error('[run-analysis-job] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
