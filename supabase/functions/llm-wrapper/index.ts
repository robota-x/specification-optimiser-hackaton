import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LLM Wrapper - Multi-purpose LLM function for ESG analysis
 *
 * This function supports multiple prompt types:
 * - 'extract': Extract materials from specification text (NLP Entity Extraction)
 * - 'report': Generate ESG report from analysis data
 *
 * Input payload structure:
 * {
 *   prompt_type: 'extract' | 'report',
 *   payload: any (structure depends on prompt_type)
 * }
 */

interface ExtractPayload {
  text: string; // The full text content to extract materials from
}

interface AnalysisData {
  totalCurrentCarbon: number;
  totalPotentialSavings: number;
  materialsAnalyzed: number;
  suggestions: Array<{
    currentMaterial: string;
    currentCarbon: number;
    alternativeMaterial: string;
    alternativeCarbon: number;
    savings: number;
    savingsPercentage: number;
    costImpact: string;
    modifications: string;
  }>;
}

interface ReportPayload {
  analysis: AnalysisData;
  projectName: string;
}

interface LLMRequest {
  prompt_type: 'extract' | 'report';
  payload: ExtractPayload | ReportPayload;
}

/**
 * Build the prompt for material extraction
 */
function buildExtractionPrompt(payload: ExtractPayload): string {
  return `You are an expert construction materials analyst with deep knowledge of UK construction specifications and the NRM (New Rules of Measurement).

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
  },
  {
    "material": "Standard Facing Bricks",
    "quantity": "5000 bricks",
    "context": "Brief context from spec (1 sentence)"
  }
]

SPECIFICATION TEXT:
${payload.text}

IMPORTANT: Return ONLY the JSON array. Do not include any explanatory text, markdown formatting, or code blocks.`;
}

/**
 * Build the prompt for ESG report generation
 */
function buildReportPrompt(payload: ReportPayload): string {
  const { analysis, projectName } = payload;

  return `You are an expert ESG (Environmental, Social, Governance) consultant specializing in construction and embodied carbon reduction.

You have analyzed the specification for "${projectName}" and identified opportunities to reduce embodied carbon through material substitutions.

ANALYSIS DATA:
- Total current embodied carbon: ${analysis.totalCurrentCarbon.toFixed(2)} kgCO2e
- Total potential savings: ${analysis.totalPotentialSavings.toFixed(2)} kgCO2e (${((analysis.totalPotentialSavings / analysis.totalCurrentCarbon) * 100).toFixed(1)}% reduction)
- Materials analyzed: ${analysis.materialsAnalyzed}
- Improvement opportunities identified: ${analysis.suggestions.length}

TOP OPPORTUNITIES (sorted by impact):
${analysis.suggestions.slice(0, 5).map((s, i) => `
${i + 1}. Replace "${s.currentMaterial}" (${s.currentCarbon.toFixed(2)} kgCO2e) with "${s.alternativeMaterial}" (${s.alternativeCarbon.toFixed(2)} kgCO2e)
   - Savings: ${s.savings.toFixed(2)} kgCO2e (${s.savingsPercentage.toFixed(1)}% reduction)
   - Cost impact: ${s.costImpact}
   - Modifications required: ${s.modifications}
`).join('\n')}

YOUR TASK:
Write a professional ESG report for the project team. The report should:

1. **Executive Summary** (2-3 sentences)
   - Overall carbon footprint and potential savings
   - Key message about the opportunity

2. **Top 3 Recommendations** (detailed)
   For each recommendation include:
   - What to change and why
   - Carbon savings (quantified)
   - Cost implications (realistic and balanced)
   - Any technical considerations or modifications needed
   - Implementation difficulty (easy/moderate/complex)

3. **Additional Opportunities** (brief list)
   - List remaining opportunities in priority order
   - Include savings for each

4. **Next Steps**
   - Practical actions the project team should take
   - Considerations for implementation

TONE & STYLE:
- Professional but accessible
- Focus on practical, actionable advice
- Balance environmental benefits with cost and technical reality
- Use UK construction terminology and standards
- Be specific with numbers and percentages
- Acknowledge trade-offs honestly

OUTPUT FORMAT:
Return your response as a JSON object with this structure:
{
  "title": "ESG Analysis: [Project Name]",
  "summary": "Brief executive summary paragraph",
  "topRecommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed explanation (2-3 paragraphs, use markdown for formatting)",
      "savings": "X kgCO2e (Y% reduction)",
      "costImpact": "Cost implications",
      "difficulty": "easy|moderate|complex"
    }
  ],
  "additionalOpportunities": [
    {
      "title": "Brief opportunity description",
      "savings": "X kgCO2e"
    }
  ],
  "nextSteps": "Markdown-formatted list of next steps"
}

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text, markdown code blocks, or formatting outside the JSON.`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the user (optional for system calls)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
      }
    }

    // Parse request body
    const requestBody = await req.json() as LLMRequest;
    const { prompt_type, payload } = requestBody;

    if (!prompt_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt_type, payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate prompt_type
    if (prompt_type !== 'extract' && prompt_type !== 'report') {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt_type. Must be "extract" or "report"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Use a more capable model for complex tasks
    const modelName = prompt_type === 'report' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Build the appropriate prompt
    let prompt: string;
    switch (prompt_type) {
      case 'extract':
        prompt = buildExtractionPrompt(payload as ExtractPayload);
        break;
      case 'report':
        prompt = buildReportPrompt(payload as ReportPayload);
        break;
      default:
        throw new Error('Invalid prompt_type');
    }

    console.log(`Processing ${prompt_type} request${userId ? ` for user ${userId}` : ' (system)'}`);

    try {
      // Call Gemini API
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // For extraction and report types, we expect JSON
      let parsedResponse: any;
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', parseError);
        console.error('Raw response:', text);

        return new Response(
          JSON.stringify({
            error: 'Failed to parse LLM response',
            details: 'The LLM did not return valid JSON',
            rawResponse: text.substring(0, 500) // First 500 chars for debugging
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          prompt_type,
          data: parsedResponse
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (geminiError) {
      console.error('Error calling Gemini API:', geminiError);

      return new Response(
        JSON.stringify({
          error: 'Failed to call Gemini API',
          details: geminiError instanceof Error ? geminiError.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
