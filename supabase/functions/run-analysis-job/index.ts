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

/**
 * Extract all text content from project clauses
 */
async function extractProjectText(supabase: any, projectId: string): Promise<string> {
  // Fetch all project clauses with their master clause templates
  const { data: clauses, error } = await supabase
    .from('project_clause')
    .select(`
      project_clause_id,
      caws_number,
      field_values,
      freeform_body,
      master_clause_id,
      master_clause (
        caws_number,
        short_title,
        body_template,
        field_definitions
      )
    `)
    .eq('project_id', projectId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching project clauses:', error);
    throw new Error('Failed to fetch project clauses');
  }

  if (!clauses || clauses.length === 0) {
    console.log('No clauses found for project');
    return '';
  }

  console.log(`Found ${clauses.length} clauses for project ${projectId}`);

  // Build a comprehensive text blob
  const textParts: string[] = [];

  for (const clause of clauses) {
    // Add CAWS number and context
    textParts.push(`\n--- CLAUSE ${clause.caws_number} ---`);

    if (clause.master_clause_id && clause.master_clause) {
      // Hybrid clause - use template with field values
      textParts.push(`Title: ${clause.master_clause.short_title}`);

      let renderedText = clause.master_clause.body_template || '';

      // Replace placeholders with actual field values
      if (clause.field_values && typeof clause.field_values === 'object') {
        const fieldValues = clause.field_values as Record<string, any>;

        for (const [key, value] of Object.entries(fieldValues)) {
          if (value !== null && value !== undefined) {
            const placeholder = `{{${key}}}`;
            const replacement = Array.isArray(value) ? value.join(', ') : String(value);
            renderedText = renderedText.replace(new RegExp(placeholder, 'g'), replacement);
          }
        }
      }

      textParts.push(renderedText);
    } else if (clause.freeform_body) {
      // Freeform clause
      textParts.push(clause.freeform_body);
    }
  }

  return textParts.join('\n\n');
}

/**
 * Call the LLM wrapper to extract materials
 */
async function callLLMExtraction(supabaseUrl: string, serviceKey: string, text: string): Promise<ExtractedMaterial[]> {
  const llmUrl = `${supabaseUrl}/functions/v1/llm-wrapper`;

  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
      prompt_type: 'extract',
      payload: { text }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM extraction failed:', errorText);
    throw new Error('Failed to extract materials from text');
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error('Invalid LLM extraction response');
  }

  return result.data as ExtractedMaterial[];
}

/**
 * Link extracted materials to the ESG Material Library
 */
async function linkMaterialsToLibrary(
  supabase: any,
  extractedMaterials: ExtractedMaterial[]
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

  // For each extracted material, find the best match in the library
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
  supabaseUrl: string,
  serviceKey: string,
  projectName: string,
  suggestions: Suggestion[]
): Promise<any> {
  const totalCurrentCarbon = suggestions.reduce((sum, s) => sum + s.currentCarbon, 0);
  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.savings, 0);

  const llmUrl = `${supabaseUrl}/functions/v1/llm-wrapper`;

  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({
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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM report generation failed:', errorText);
    throw new Error('Failed to generate ESG report');
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error('Invalid LLM report response');
  }

  return result.data;
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse request body
    const requestBody = await req.json() as RunAnalysisRequest;
    const { job_id, project_id } = requestBody;

    if (!job_id || !project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: job_id, project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting analysis job ${job_id} for project ${project_id}`);

    // Update job status to running
    await supabase
      .from('project_analysis_job')
      .update({ status: 'running' })
      .eq('job_id', job_id);

    try {
      // Get project name
      const { data: project, error: projectError } = await supabase
        .from('project')
        .select('project_name')
        .eq('project_id', project_id)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      const projectName = project.project_name || 'Untitled Project';

      // Step A: Extract materials from project text
      console.log('Step A: Extracting project text...');
      const projectText = await extractProjectText(supabase, project_id);

      if (!projectText || projectText.trim().length === 0) {
        console.log('No text content found in project');

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

      console.log(`Extracted ${projectText.length} characters of text`);

      console.log('Step A: Calling LLM for material extraction...');
      const extractedMaterials = await callLLMExtraction(supabaseUrl, supabaseServiceKey, projectText);
      console.log(`Extracted ${extractedMaterials.length} materials`);

      // Step B: Link materials to library
      console.log('Step B: Linking materials to library...');
      const linkedMaterials = await linkMaterialsToLibrary(supabase, extractedMaterials);
      console.log(`Linked ${linkedMaterials.size} materials to library`);

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
      console.log('Step B: Analyzing materials and finding alternatives...');
      const suggestions = await analyzeMaterials(supabase, linkedMaterials);

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
      console.log('Step C: Generating ESG report...');
      const report = await generateESGReport(supabaseUrl, supabaseServiceKey, projectName, suggestions);

      // Step D: Save the report
      console.log('Step D: Saving ESG report...');
      await saveESGReport(supabase, project_id, report);

      // Mark job as complete
      await supabase
        .from('project_analysis_job')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString()
        })
        .eq('job_id', job_id);

      console.log(`Analysis job ${job_id} completed successfully`);

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
      console.error('Analysis error:', analysisError);

      // Mark job as failed
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
    console.error('Unexpected error:', error);
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
