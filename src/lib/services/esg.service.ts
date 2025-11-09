/**
 * ESG Service - Service layer for ESG Optimization Engine
 *
 * This service provides methods for:
 * - Initiating ESG analysis jobs
 * - Fetching analysis job status
 * - Loading ESG suggestions/reports
 * - Managing ESG material library
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectAnalysisJob,
  ProjectAnalysisJobInsert,
  ProjectESGSuggestion,
  ESGMaterialLibrary,
} from '@/types/v2-schema';

// =====================================================================
// ANALYSIS JOB OPERATIONS
// =====================================================================

/**
 * Initiate an ESG analysis for a project
 * This calls the Edge Function to queue the analysis job
 */
export async function initiateProjectAnalysis(projectId: string): Promise<{
  success: boolean;
  job_id: string;
  status: string;
  message: string;
}> {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call the initiate-project-analysis Edge Function
    const { data, error } = await supabase.functions.invoke('initiate-project-analysis', {
      body: { project_id: projectId },
    });

    if (error) {
      console.error('Error initiating analysis:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to initiate project analysis:', error);
    throw error;
  }
}

/**
 * Cancel current analysis and retry from scratch
 * This marks any running/queued jobs as 'failed', deletes partial results, and starts fresh
 */
export async function cancelAndRetryAnalysis(projectId: string): Promise<{
  success: boolean;
  job_id: string;
  status: string;
  message: string;
}> {
  try {
    // Mark any existing running/queued jobs as failed
    const { error: cancelError } = await supabase
      .from('project_analysis_job')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user'
      })
      .eq('project_id', projectId)
      .in('status', ['queued', 'running']);

    if (cancelError) {
      console.error('Error cancelling existing jobs:', cancelError);
      throw cancelError;
    }

    // Delete any partial ESG suggestions
    const { error: deleteError } = await supabase
      .from('project_esg_suggestion')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting partial suggestions:', deleteError);
      // Don't throw - we can proceed even if deletion fails
    }

    // Start a fresh analysis
    return await initiateProjectAnalysis(projectId);
  } catch (error) {
    console.error('Failed to cancel and retry analysis:', error);
    throw error;
  }
}

/**
 * Get the latest analysis job for a project
 */
export async function getLatestAnalysisJob(projectId: string): Promise<ProjectAnalysisJob | null> {
  const { data, error } = await supabase
    .from('project_analysis_job')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest analysis job:', error);
    throw error;
  }

  return data;
}

/**
 * Get all analysis jobs for a project
 */
export async function getProjectAnalysisJobs(projectId: string): Promise<ProjectAnalysisJob[]> {
  const { data, error } = await supabase
    .from('project_analysis_job')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching analysis jobs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Subscribe to analysis job updates for a project (real-time)
 */
export function subscribeToAnalysisJob(
  projectId: string,
  callback: (job: ProjectAnalysisJob) => void
) {
  const channel = supabase
    .channel(`analysis-job-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'project_analysis_job',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.log('Analysis job update:', payload);
        callback(payload.new as ProjectAnalysisJob);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// =====================================================================
// ESG SUGGESTION OPERATIONS
// =====================================================================

/**
 * Get the project-wide ESG report for a project
 */
export async function getProjectESGReport(projectId: string): Promise<ProjectESGSuggestion | null> {
  const { data, error } = await supabase
    .from('project_esg_suggestion')
    .select('*')
    .eq('project_id', projectId)
    .is('source_clause_id', null) // Project-wide report
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching ESG report:', error);
    throw error;
  }

  return data;
}

/**
 * Get all ESG suggestions for a project (including clause-specific)
 */
export async function getProjectESGSuggestions(projectId: string): Promise<ProjectESGSuggestion[]> {
  const { data, error } = await supabase
    .from('project_esg_suggestion')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ESG suggestions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update the status of an ESG suggestion (mark as seen/dismissed)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'new' | 'seen' | 'dismissed'
): Promise<void> {
  const { error } = await supabase
    .from('project_esg_suggestion')
    .update({ status })
    .eq('suggestion_id', suggestionId);

  if (error) {
    console.error('Error updating suggestion status:', error);
    throw error;
  }
}

/**
 * Subscribe to ESG suggestion updates for a project (real-time)
 */
export function subscribeToESGSuggestions(
  projectId: string,
  callback: (suggestion: ProjectESGSuggestion) => void
) {
  const channel = supabase
    .channel(`esg-suggestions-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'project_esg_suggestion',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        console.log('ESG suggestion update:', payload);
        if (payload.new) {
          callback(payload.new as ProjectESGSuggestion);
        }
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// =====================================================================
// ESG MATERIAL LIBRARY OPERATIONS
// =====================================================================

/**
 * Get all materials from the ESG library (global + org-specific)
 */
export async function getESGMaterialLibrary(): Promise<ESGMaterialLibrary[]> {
  const { data, error } = await supabase
    .from('esg_material_library')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching ESG material library:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific material by ID
 */
export async function getESGMaterial(materialId: string): Promise<ESGMaterialLibrary | null> {
  const { data, error } = await supabase
    .from('esg_material_library')
    .select('*')
    .eq('esg_material_id', materialId)
    .single();

  if (error) {
    console.error('Error fetching ESG material:', error);
    throw error;
  }

  return data;
}

/**
 * Get alternatives for a specific material
 */
export async function getMaterialAlternatives(materialId: string): Promise<ESGMaterialLibrary[]> {
  const { data, error } = await supabase
    .from('esg_material_library')
    .select('*')
    .contains('alternative_to_ids', [materialId])
    .eq('is_active', true)
    .order('embodied_carbon', { ascending: true });

  if (error) {
    console.error('Error fetching material alternatives:', error);
    throw error;
  }

  return data || [];
}

/**
 * Search materials by name or synonym
 */
export async function searchESGMaterials(query: string): Promise<ESGMaterialLibrary[]> {
  const lowerQuery = query.toLowerCase();

  // Note: This is a simple client-side search.
  // For production, consider implementing a server-side full-text search.
  const allMaterials = await getESGMaterialLibrary();

  return allMaterials.filter((material) => {
    // Check name
    if (material.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check synonyms in nlp_tags
    if (material.nlp_tags?.synonyms) {
      const synonymMatch = material.nlp_tags.synonyms.some((synonym) =>
        synonym.toLowerCase().includes(lowerQuery)
      );
      if (synonymMatch) {
        return true;
      }
    }

    // Check tags in nlp_tags
    if (material.nlp_tags?.tags) {
      const tagMatch = material.nlp_tags.tags.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );
      if (tagMatch) {
        return true;
      }
    }

    return false;
  });
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Check if an analysis is currently running for a project
 */
export async function isAnalysisRunning(projectId: string): Promise<boolean> {
  const latestJob = await getLatestAnalysisJob(projectId);

  if (!latestJob) {
    return false;
  }

  return latestJob.status === 'queued' || latestJob.status === 'running';
}

/**
 * Get a human-readable status message for an analysis job
 */
export function getAnalysisStatusMessage(job: ProjectAnalysisJob | null): string {
  if (!job) {
    return 'No analysis has been run yet';
  }

  switch (job.status) {
    case 'queued':
      return 'Analysis queued...';
    case 'running':
      return 'Analyzing your specification...';
    case 'complete':
      return 'Analysis complete';
    case 'failed':
      return `Analysis failed: ${job.error_message || 'Unknown error'}`;
    default:
      return 'Unknown status';
  }
}
