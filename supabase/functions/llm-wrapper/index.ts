import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUNCTION_NAME = 'llm-wrapper';
const RATE_LIMIT_PER_MINUTE = 60; // Global rate limit: 60 requests per minute
const RATE_LIMIT_PER_HOUR = 1000; // Global rate limit: 1000 requests per hour

interface RateLimitResult {
  allowed: boolean;
  minuteCount?: number;
  hourCount?: number;
}

/**
 * Check global rate limits (across all users)
 */
async function checkGlobalRateLimit(
  supabase: any
): Promise<RateLimitResult> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Count successful requests in the last minute (global)
  const { count: minuteCount, error: minuteError } = await supabase
    .from('gemini_requests')
    .select('*', { count: 'exact', head: true })
    .eq('function_name', FUNCTION_NAME)
    .eq('status', 'success')
    .gte('created_at', oneMinuteAgo.toISOString());

  if (minuteError) {
    console.error('Error checking minute rate limit:', minuteError);
    throw new Error('Failed to check rate limit');
  }

  if ((minuteCount || 0) >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, minuteCount: minuteCount || 0, hourCount: 0 };
  }

  // Count successful requests in the last hour (global)
  const { count: hourCount, error: hourError } = await supabase
    .from('gemini_requests')
    .select('*', { count: 'exact', head: true })
    .eq('function_name', FUNCTION_NAME)
    .eq('status', 'success')
    .gte('created_at', oneHourAgo.toISOString());

  if (hourError) {
    console.error('Error checking hour rate limit:', hourError);
    throw new Error('Failed to check rate limit');
  }

  if ((hourCount || 0) >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, minuteCount: minuteCount || 0, hourCount: hourCount || 0 };
  }

  return { allowed: true, minuteCount: minuteCount || 0, hourCount: hourCount || 0 };
}

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
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[llm-wrapper:${requestId}] Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[llm-wrapper:${requestId}] CORS preflight request`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log(`[llm-wrapper:${requestId}] Method not allowed: ${req.method}`);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check for Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[llm-wrapper:${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[llm-wrapper:${requestId}] Authorization header present, validating...`);

    // Create service role client with the provided auth header
    // This allows native auth validation for both user JWTs and service role tokens
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Validate authentication using native Supabase auth
    // This works for both user JWT tokens and service role tokens
    console.log(`[llm-wrapper:${requestId}] Validating authentication...`);
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser();

    if (authError || !user) {
      console.error(`[llm-wrapper:${requestId}] Authentication failed:`, authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    console.log(`[llm-wrapper:${requestId}] User authenticated: ${userId}`);

    // Create admin client for database operations (bypassing RLS for logging)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Use the service supabase client for user context operations
    const supabase = serviceSupabase;

    // Parse request body
    console.log(`[llm-wrapper:${requestId}] Parsing request body...`);
    const requestBody = await req.json() as LLMRequest;
    const { prompt_type, payload } = requestBody;

    if (!prompt_type || !payload) {
      console.error(`[llm-wrapper:${requestId}] Missing required fields - prompt_type:`, prompt_type, 'payload:', !!payload);
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
      console.error(`[llm-wrapper:${requestId}] Invalid prompt_type:`, prompt_type);
      return new Response(
        JSON.stringify({ error: 'Invalid prompt_type. Must be "extract" or "report"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[llm-wrapper:${requestId}] Processing ${prompt_type} request for user ${userId}`);

    // Create pending entry in database for logging (using admin client)
    console.log(`[llm-wrapper:${requestId}] Creating request log entry...`);
    const { data: requestLog, error: insertError } = await supabaseAdmin
      .from('gemini_requests')
      .insert({
        user_id: userId,
        function_name: FUNCTION_NAME,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !requestLog) {
      console.error(`[llm-wrapper:${requestId}] Error creating request log:`, insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log request' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[llm-wrapper:${requestId}] Request log created with ID: ${requestLog.id}`);

    // Check global rate limits (using admin client)
    console.log(`[llm-wrapper:${requestId}] Checking global rate limits...`);
    const rateLimitResult = await checkGlobalRateLimit(supabaseAdmin);
    console.log(`[llm-wrapper:${requestId}] Rate limit check - allowed: ${rateLimitResult.allowed}, minuteCount: ${rateLimitResult.minuteCount}, hourCount: ${rateLimitResult.hourCount}`);

    if (!rateLimitResult.allowed) {
      console.error(`[llm-wrapper:${requestId}] Rate limit exceeded - minuteCount: ${rateLimitResult.minuteCount}, hourCount: ${rateLimitResult.hourCount}`);
      // Update request status to failed (rate limited) - using admin client
      await supabaseAdmin
        .from('gemini_requests')
        .update({
          status: 'failed',
          error_message: 'Rate limit exceeded',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          details: {
            minuteCount: rateLimitResult.minuteCount,
            hourCount: rateLimitResult.hourCount,
            limits: {
              perMinute: RATE_LIMIT_PER_MINUTE,
              perHour: RATE_LIMIT_PER_HOUR
            }
          }
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Gemini API
    console.log(`[llm-wrapper:${requestId}] Initializing Gemini API...`);
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error(`[llm-wrapper:${requestId}] Gemini API key not configured`);
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
    const modelName = prompt_type === 'report' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`[llm-wrapper:${requestId}] Using Gemini model: ${modelName}`);

    // Build the appropriate prompt
    console.log(`[llm-wrapper:${requestId}] Building prompt for type: ${prompt_type}...`);
    let prompt: string;
    switch (prompt_type) {
      case 'extract':
        prompt = buildExtractionPrompt(payload as ExtractPayload);
        console.log(`[llm-wrapper:${requestId}] Extraction prompt built, length: ${prompt.length} characters`);
        break;
      case 'report':
        prompt = buildReportPrompt(payload as ReportPayload);
        console.log(`[llm-wrapper:${requestId}] Report prompt built, length: ${prompt.length} characters`);
        break;
      default:
        throw new Error('Invalid prompt_type');
    }

    try {
      // Call Gemini API
      console.log(`[llm-wrapper:${requestId}] Calling Gemini API...`);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      console.log(`[llm-wrapper:${requestId}] Gemini API response received, length: ${text.length} characters`);

      // For extraction and report types, we expect JSON
      console.log(`[llm-wrapper:${requestId}] Parsing Gemini response as JSON...`);
      let parsedResponse: any;
      try {
        // Remove markdown code blocks if present
        const cleanedText = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        parsedResponse = JSON.parse(cleanedText);
        console.log(`[llm-wrapper:${requestId}] Successfully parsed JSON response`);
      } catch (parseError) {
        console.error(`[llm-wrapper:${requestId}] Failed to parse LLM response as JSON:`, parseError);
        console.error(`[llm-wrapper:${requestId}] Raw response (first 500 chars):`, text.substring(0, 500));

        // Update request status to failed - using admin client
        await supabaseAdmin
          .from('gemini_requests')
          .update({
            status: 'failed',
            error_message: 'Failed to parse LLM response as JSON',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestLog.id);

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

      // Update request status to success - using admin client
      console.log(`[llm-wrapper:${requestId}] Updating request log ${requestLog.id} to success`);
      await supabaseAdmin
        .from('gemini_requests')
        .update({
          status: 'success',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);

      console.log(`[llm-wrapper:${requestId}] Request completed successfully for user ${userId}, prompt_type: ${prompt_type}`);
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
      console.error(`[llm-wrapper:${requestId}] Error calling Gemini API:`, geminiError);

      // Update request status to failed - using admin client
      await supabaseAdmin
        .from('gemini_requests')
        .update({
          status: 'failed',
          error_message: geminiError instanceof Error ? geminiError.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);

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
    console.error(`[llm-wrapper:${requestId}] Unexpected error:`, error);
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
