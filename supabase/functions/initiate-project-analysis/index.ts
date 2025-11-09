import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Initiate Project Analysis - Lightweight trigger function
 *
 * This function queues an ESG analysis job for a project.
 * It's designed to be fast and non-blocking.
 *
 * The heavy lifting is done by the run-analysis-job function,
 * which is triggered by a database event when a new job is created.
 */

interface InitiateAnalysisRequest {
  project_id: string;
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

    // Parse request body
    const requestBody = await req.json() as InitiateAnalysisRequest;
    const { project_id } = requestBody;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Initiating analysis for project: ${project_id}`);

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('project')
      .select('project_id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found or unauthorized' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if there's already a job running or queued for this project
    const { data: existingJobs, error: existingJobsError } = await supabase
      .from('project_analysis_job')
      .select('job_id, status')
      .eq('project_id', project_id)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingJobsError) {
      console.error('Error checking existing jobs:', existingJobsError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing jobs' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If there's already a job running or queued, return it
    if (existingJobs && existingJobs.length > 0) {
      console.log(`Job already exists for project ${project_id}:`, existingJobs[0].job_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Analysis already in progress',
          job_id: existingJobs[0].job_id,
          status: existingJobs[0].status
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a new analysis job
    const { data: newJob, error: insertError } = await supabase
      .from('project_analysis_job')
      .insert({
        project_id: project_id,
        status: 'queued'
      })
      .select()
      .single();

    if (insertError || !newJob) {
      console.error('Error creating analysis job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create analysis job' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Created new analysis job: ${newJob.job_id}`);

    // Invoke the run-analysis-job function asynchronously
    // Note: This is a fire-and-forget call. We don't wait for the response.
    try {
      const runAnalysisUrl = `${supabaseUrl}/functions/v1/run-analysis-job`;

      // Fire and forget - don't await the response
      fetch(runAnalysisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          job_id: newJob.job_id,
          project_id: project_id
        })
      }).catch(error => {
        console.error('Failed to invoke run-analysis-job:', error);
      });

      console.log('Invoked run-analysis-job function');
    } catch (error) {
      console.error('Error invoking run-analysis-job:', error);
      // Don't fail the request - the job is already queued
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analysis job queued successfully',
        job_id: newJob.job_id,
        status: 'queued'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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
