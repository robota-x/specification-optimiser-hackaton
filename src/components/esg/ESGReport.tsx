/**
 * ESGReport Component
 *
 * Main component for displaying ESG analysis reports with real-time updates
 */

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from './SuggestionCard';
import {
  getLatestAnalysisJob,
  getProjectESGReport,
  subscribeToAnalysisJob,
  subscribeToESGSuggestions,
  initiateProjectAnalysis,
  cancelAndRetryAnalysis,
  getAnalysisStatusMessage,
} from '@/lib/services/esg.service';
import type { ProjectAnalysisJob, ProjectESGSuggestion } from '@/types/v2-schema';

interface ESGReportProps {
  projectId: string;
}

export function ESGReport({ projectId }: ESGReportProps) {
  const [analysisJob, setAnalysisJob] = useState<ProjectAnalysisJob | null>(null);
  const [suggestion, setSuggestion] = useState<ProjectESGSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [projectId]);

  // Subscribe to real-time updates + fallback polling
  useEffect(() => {
    // Subscribe to analysis job updates
    const unsubscribeJob = subscribeToAnalysisJob(projectId, (job) => {
      console.log('Received job update:', job);
      setAnalysisJob(job);

      // If job completed, refresh the suggestion
      if (job.status === 'complete') {
        loadSuggestion();
      }
    });

    // Subscribe to suggestion updates
    const unsubscribeSuggestion = subscribeToESGSuggestions(projectId, (newSuggestion) => {
      console.log('Received suggestion update:', newSuggestion);
      // Only update if it's a project-wide report (source_clause_id is null)
      if (!newSuggestion.source_clause_id) {
        setSuggestion(newSuggestion);
      }
    });

    // Fallback polling every 5 seconds when job is running
    const pollInterval = setInterval(async () => {
      if (analysisJob?.status === 'running' || analysisJob?.status === 'queued') {
        console.log('Polling for job status update...');
        try {
          const job = await getLatestAnalysisJob(projectId);
          if (job && job.status !== analysisJob.status) {
            console.log('Job status changed via polling:', job.status);
            setAnalysisJob(job);
            if (job.status === 'complete') {
              loadSuggestion();
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }
    }, 5000);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeJob();
      unsubscribeSuggestion();
      clearInterval(pollInterval);
    };
  }, [projectId, analysisJob?.status]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load latest analysis job
      const job = await getLatestAnalysisJob(projectId);
      setAnalysisJob(job);

      // Load project ESG report
      await loadSuggestion();
    } catch (err) {
      console.error('Failed to load ESG data:', err);
      setError('Failed to load ESG analysis data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestion = async () => {
    try {
      const report = await getProjectESGReport(projectId);
      setSuggestion(report);
    } catch (err) {
      console.error('Failed to load ESG report:', err);
    }
  };

  const handleRunAnalysis = async () => {
    setIsInitiating(true);
    setError(null);
    setElapsedSeconds(0);

    try {
      const result = await initiateProjectAnalysis(projectId);
      console.log('Analysis initiated:', result);

      // Reload the analysis job status
      await loadData();
    } catch (err) {
      console.error('Failed to initiate analysis:', err);
      setError('Failed to start ESG analysis. Please try again.');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleStopAndRetry = async () => {
    setIsRetrying(true);
    setError(null);
    setElapsedSeconds(0);

    try {
      const result = await cancelAndRetryAnalysis(projectId);
      console.log('Analysis cancelled and retried:', result);

      // Reload the analysis job status
      await loadData();
    } catch (err) {
      console.error('Failed to cancel and retry analysis:', err);
      setError('Failed to reset analysis. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  // Timer for elapsed time tracking
  useEffect(() => {
    const isRunning = analysisJob?.status === 'queued' || analysisJob?.status === 'running';

    if (!isRunning) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time based on job created_at
    const startTime = analysisJob.created_at ? new Date(analysisJob.created_at).getTime() : Date.now();
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setElapsedSeconds(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(currentElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [analysisJob?.status, analysisJob?.created_at]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading ESG analysis...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Get current status
  const isRunning = analysisJob?.status === 'queued' || analysisJob?.status === 'running';
  const hasFailed = analysisJob?.status === 'failed';
  const hasCompleted = analysisJob?.status === 'complete';
  const showWarning = isRunning && elapsedSeconds > 30;

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ESG Analysis</h2>
          <p className="text-muted-foreground">
            AI-powered carbon reduction opportunities for your specification
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              onClick={handleStopAndRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-3 w-3" />
                  Stop & Retry
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleRunAnalysis}
            disabled={isRunning || isInitiating}
            variant={hasCompleted ? 'outline' : 'default'}
          >
            {isInitiating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing... ({formatElapsedTime(elapsedSeconds)})
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasCompleted ? 'Re-run Analysis' : 'Run Analysis'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status alerts */}
      {isRunning && (
        <Alert variant={showWarning ? 'destructive' : 'default'}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>
            {showWarning ? 'Analysis Taking Longer Than Expected' : 'Analysis in Progress'}
          </AlertTitle>
          <AlertDescription>
            {getAnalysisStatusMessage(analysisJob)}
            {' '}
            (Elapsed: {formatElapsedTime(elapsedSeconds)})
            <br />
            {showWarning ? (
              <span className="text-xs mt-1 block font-medium">
                This is taking longer than usual. Try using the "Stop & Retry" button to reset the analysis.
              </span>
            ) : (
              <span className="text-xs text-muted-foreground mt-1 block">
                This may take 1-2 minutes. The page will update automatically when complete.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {hasFailed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>
            {analysisJob?.error_message || 'An unknown error occurred during analysis.'}
            <br />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRunAnalysis}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasCompleted && !suggestion && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Analysis Complete</AlertTitle>
          <AlertDescription>
            Analysis completed, but no report was generated. This might be because no materials
            were found in your specification.
          </AlertDescription>
        </Alert>
      )}

      {/* Report display */}
      {suggestion && (
        <SuggestionCard
          suggestion={suggestion}
          onStatusChange={loadSuggestion}
        />
      )}

      {/* No analysis yet */}
      {!analysisJob && !isRunning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Analysis Yet</AlertTitle>
          <AlertDescription>
            Click "Run Analysis" to analyze your specification and receive AI-powered ESG
            recommendations for reducing embodied carbon.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
