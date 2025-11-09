import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitResult {
  allowed: boolean;
  minuteCount?: number;
  hourCount?: number;
}

/**
 * Check if the user has exceeded rate limits
 * Rate limits: 10 requests per minute, 100 requests per hour
 * Only successful requests count toward the limit
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<RateLimitResult> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Count successful requests in the last minute
  const { data: minuteData, error: minuteError } = await supabase
    .from('gemini_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', oneMinuteAgo.toISOString());

  if (minuteError) {
    console.error('Error checking minute rate limit:', minuteError);
    throw new Error('Failed to check rate limit');
  }

  const minuteCount = minuteData?.length || 0;

  if (minuteCount >= 10) {
    return { allowed: false, minuteCount, hourCount: 0 };
  }

  // Count successful requests in the last hour
  const { data: hourData, error: hourError } = await supabase
    .from('gemini_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', oneHourAgo.toISOString());

  if (hourError) {
    console.error('Error checking hour rate limit:', hourError);
    throw new Error('Failed to check rate limit');
  }

  const hourCount = hourData?.length || 0;

  if (hourCount >= 100) {
    return { allowed: false, minuteCount, hourCount };
  }

  return { allowed: true, minuteCount, hourCount };
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

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Validate payload
    // For now, we accept any payload
    const requestBody = await req.json();
    console.log('Request received from user:', user.id);

    // Create pending entry in database
    const { data: requestLog, error: insertError } = await supabase
      .from('gemini_requests')
      .insert({
        user_id: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !requestLog) {
      console.error('Error creating request log:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log request' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limits (only successful requests count)
    const rateLimitResult = await checkRateLimit(supabase, user.id);

    if (!rateLimitResult.allowed) {
      // Update request status to failed (rate limited requests don't count)
      await supabase
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
              perMinute: 10,
              perHour: 100
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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      await supabase
        .from('gemini_requests')
        .update({
          status: 'failed',
          error_message: 'Gemini API key not configured',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);

      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Hardcoded test prompt
    const prompt = "Say hello I'm Gemini back to me";

    try {
      // Call Gemini API
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Update request status to success
      await supabase
        .from('gemini_requests')
        .update({
          status: 'success',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            text,
            requestId: requestLog.id
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (geminiError) {
      console.error('Error calling Gemini API:', geminiError);

      // Update request status to failed
      await supabase
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
