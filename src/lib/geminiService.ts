import { supabase } from '@/integrations/supabase/client';

export interface GeminiResponse {
  success: true;
  data: {
    text: string;
    requestId: string;
  };
}

export interface GeminiError {
  error: string;
  details?: {
    minuteCount?: number;
    hourCount?: number;
    limits?: {
      perMinute: number;
      perHour: number;
    };
  };
}

export class GeminiRateLimitError extends Error {
  constructor(
    message: string,
    public minuteCount?: number,
    public hourCount?: number
  ) {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiAuthError';
  }
}

export class GeminiAPIError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

/**
 * Call the Gemini API via the secure edge function
 *
 * This function:
 * - Validates user authentication
 * - Enforces rate limits (10/min, 100/hour)
 * - Securely calls Gemini API without exposing API keys
 *
 * @param message - The message to send to Gemini (currently not used, using hardcoded test)
 * @returns The response text from Gemini
 * @throws {GeminiAuthError} If user is not authenticated
 * @throws {GeminiRateLimitError} If rate limit is exceeded
 * @throws {GeminiAPIError} If Gemini API call fails
 * @throws {Error} For other unexpected errors
 *
 * @example
 * ```typescript
 * try {
 *   const response = await callGemini('Hello!');
 *   console.log('Gemini says:', response);
 * } catch (error) {
 *   if (error instanceof GeminiRateLimitError) {
 *     console.error('Rate limit exceeded. Try again later.');
 *   } else if (error instanceof GeminiAuthError) {
 *     console.error('Please sign in to use this feature.');
 *   } else {
 *     console.error('Error:', error.message);
 *   }
 * }
 * ```
 */
export async function callGemini(message: string): Promise<string> {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new GeminiAuthError(`Failed to get session: ${sessionError.message}`);
  }

  if (!session) {
    throw new GeminiAuthError('Please sign in to use this feature');
  }

  // Get the Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not configured');
  }

  // Call the edge function
  const response = await fetch(
    `${supabaseUrl}/functions/v1/gemini-chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    }
  );

  // Parse the response
  const data = await response.json();

  // Handle different error cases
  if (!response.ok) {
    if (response.status === 401) {
      throw new GeminiAuthError(data.error || 'Unauthorized');
    }

    if (response.status === 429) {
      const { details } = data as GeminiError;
      throw new GeminiRateLimitError(
        data.error || 'Rate limit exceeded',
        details?.minuteCount,
        details?.hourCount
      );
    }

    if (response.status >= 500) {
      throw new GeminiAPIError(
        data.error || 'Internal server error',
        data.details
      );
    }

    throw new Error(data.error || 'Unknown error occurred');
  }

  // Return the text response from Gemini
  return (data as GeminiResponse).data.text;
}

/**
 * Check if the user is authenticated for Gemini API calls
 * @returns true if user is authenticated, false otherwise
 */
export async function isGeminiAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Get the user's Gemini request history
 * Note: This requires the user to be authenticated
 *
 * @returns Array of request logs
 */
export async function getGeminiRequestHistory() {
  const { data, error } = await supabase
    .from('gemini_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch request history: ${error.message}`);
  }

  return data;
}

/**
 * Get the user's current rate limit status
 * @returns Object with current usage counts
 */
export async function getRateLimitStatus(): Promise<{
  minuteCount: number;
  hourCount: number;
  limits: {
    perMinute: number;
    perHour: number;
  };
}> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Count successful requests in the last minute
  const { count: minuteCount, error: minuteError } = await supabase
    .from('gemini_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')
    .gte('created_at', oneMinuteAgo.toISOString());

  if (minuteError) {
    throw new Error(`Failed to check rate limit: ${minuteError.message}`);
  }

  // Count successful requests in the last hour
  const { count: hourCount, error: hourError } = await supabase
    .from('gemini_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')
    .gte('created_at', oneHourAgo.toISOString());

  if (hourError) {
    throw new Error(`Failed to check rate limit: ${hourError.message}`);
  }

  return {
    minuteCount: minuteCount || 0,
    hourCount: hourCount || 0,
    limits: {
      perMinute: 10,
      perHour: 100
    }
  };
}
