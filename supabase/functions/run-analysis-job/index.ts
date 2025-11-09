import { createClient } from "@supabase/supabase-js";

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
async function callLLMExtraction(supabase: any, text: string): Promise<ExtractedMaterial[]> {
  console.log('[callLLMExtraction] Calling llm-wrapper for material extraction...');

  const { data, error } = await supabase.functions.invoke('llm-wrapper', {
    body: {
      prompt_type: 'extract',
      payload: { text }
    }
  });

  if (error) {
    console.error('[callLLMExtraction] LLM extraction failed:', error);
    throw new Error('Failed to extract materials from text');
  }

  if (!data || !data.success || !data.data) {
    console.error('[callLLMExtraction] Invalid LLM response:', data);
    throw new Error('Invalid LLM extraction response');
  }

  console.log(`[callLLMExtraction] Extracted ${data.data.length} materials from text`);
  return data.data as ExtractedMaterial[];
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

  console.log(`Loaded ${libraryMaterials.length} materials from library`);

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
        console.log(`✓ Direct link: ${product.manufacturer} - ${product.product_name} → ${material.name}`);
        linkedMaterials.set(material.esg_material_id, material);
      } else {
        console.warn(`Product ${product.product_name} has esg_material_id ${product.esg_material_id} but material not found in library`);
      }
    } else {
      console.warn(`Product ${product.product_name} does not have esg_material_id - skipping direct link`);
    }
  }

  console.log(`Linked ${linkedMaterials.size} materials via direct product links (Path A)`);

  // PATH B (HARD): For each extracted material from text, find the best match using NLP
  console.log(`Processing ${extractedMaterials.length} text-extracted materials via NLP...`);

  for (const extracted of extractedMaterials) {
    const extractedName = extracted.material.toLowerCase().trim();

    // Try to find a match using NLP tags
    const match = libraryMaterials.find((lib: ESGMaterial) => {
      const libName = lib.name.toLowerCase();

      // Direct name match
      if (libName === extractedName) {
        return true;
      }

      // Check synonyms
      if (lib.nlp_tags && lib.nlp_tags.synonyms) {
        const synonyms = lib.nlp_tags.synonyms.map((s: string) => s.toLowerCase());
        if (synonyms.includes(extractedName)) {
          return true;
        }

        // Partial match on synonyms
        if (synonyms.some((s: string) => extractedName.includes(s) || s.includes(extractedName))) {
          return true;
        }
      }

      return false;
    });

    if (match) {
      console.log(`Linked "${extracted.material}" to "${match.name}"`);
      linkedMaterials.set(match.esg_material_id, match);
    } else {
      console.log(`No match found for "${extracted.material}"`);
    }
  }

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
  for (const [materialId, material] of linkedMaterials) {
    // Find materials that list this material as an alternative
    const alternatives = allMaterials.filter((alt: ESGMaterial) => {
      return alt.alternative_to_ids && alt.alternative_to_ids.includes(materialId);
    });

    // Calculate savings for each alternative
    for (const alt of alternatives) {
      const currentCarbon = parseFloat(String(material.embodied_carbon));
      const alternativeCarbon = parseFloat(String(alt.embodied_carbon));
      const savings = currentCarbon - alternativeCarbon;
      const savingsPercentage = (savings / currentCarbon) * 100;

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
      }
    }
  }

  // Sort by savings (highest first)
  suggestions.sort((a, b) => b.savings - a.savings);

  console.log(`Generated ${suggestions.length} suggestions`);

  return suggestions;
}

/**
 * Call the LLM to generate the ESG report
 */
async function generateESGReport(
  supabase: any,
  projectName: string,
  suggestions: Suggestion[]
): Promise<any> {
  console.log('[generateESGReport] Generating ESG report via llm-wrapper...');

  const totalCurrentCarbon = suggestions.reduce((sum, s) => sum + s.currentCarbon, 0);
  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.savings, 0);

  const { data, error } = await supabase.functions.invoke('llm-wrapper', {
    body: {
      prompt_type: 'report',
      payload: {
        projectName,
        analysis: {
          totalCurrentCarbon,
          totalPotentialSavings,
          materialsAnalyzed: suggestions.length,
          suggestions
        }
      }
    }
  });

  if (error) {
    console.error('[generateESGReport] LLM report generation failed:', error);
    throw new Error('Failed to generate ESG report');
  }

  if (!data || !data.success || !data.data) {
    console.error('[generateESGReport] Invalid LLM response:', data);
    throw new Error('Invalid LLM report response');
  }

  console.log('[generateESGReport] ESG report generated successfully');
  return data.data;
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
  let narrative = `# ${report.summary}\n\n`;

  if (report.topRecommendations && report.topRecommendations.length > 0) {
    narrative += `## Top Recommendations\n\n`;
    for (let i = 0; i < report.topRecommendations.length; i++) {
      const rec = report.topRecommendations[i];
      narrative += `### ${i + 1}. ${rec.title}\n\n`;
      narrative += `${rec.description}\n\n`;
      narrative += `**Savings:** ${rec.savings}\n\n`;
      narrative += `**Cost Impact:** ${rec.costImpact}\n\n`;
      narrative += `**Difficulty:** ${rec.difficulty}\n\n`;
      narrative += `---\n\n`;
    }
  }

  if (report.additionalOpportunities && report.additionalOpportunities.length > 0) {
    narrative += `## Additional Opportunities\n\n`;
    for (const opp of report.additionalOpportunities) {
      narrative += `- ${opp.title} (${opp.savings})\n`;
    }
    narrative += `\n`;
  }

  if (report.nextSteps) {
    narrative += `## Next Steps\n\n`;
    narrative += report.nextSteps;
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

  // Try to authenticate as service role first (internal calls)
  // Use native Supabase client with service role to verify the token
  console.log('[run-analysis-job] Attempting authentication...');

  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Try to get user with the provided token - this works for both service role and user tokens
  const { data: { user }, error: authError } = await serviceSupabase.auth.getUser();

  if (authError || !user) {
    // Token validation failed completely
    console.error('[run-analysis-job] Authentication failed:', authError?.message);
    return new Response(
      JSON.stringify({ error: 'Unauthorized - invalid authentication token' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log('[run-analysis-job] Authentication successful for user:', user.id);

  // Create Supabase client with service role for database operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[run-analysis-job] Supabase client initialized with service role');

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
        console.log('[run-analysis-job] Step A (continued): Calling LLM for text-based material extraction (Path B)...');
        extractedMaterials = await callLLMExtraction(supabase, extractionResult.text);
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

      // Step B (continued): Analyze and find alternatives
      console.log('[run-analysis-job] Step B (continued): Analyzing materials and finding alternatives...');
      const suggestions = await analyzeMaterials(supabase, linkedMaterials);
      console.log(`[run-analysis-job] Generated ${suggestions.length} suggestions`);

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
      const report = await generateESGReport(supabase, projectName, suggestions);
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
