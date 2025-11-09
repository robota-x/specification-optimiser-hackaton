-- Update gemini_requests table to support global rate limiting
-- Add function_name to track which function made the request
-- Make user_id nullable for system/internal calls

ALTER TABLE public.gemini_requests 
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS function_name VARCHAR(100);

-- Update index to support global queries
DROP INDEX IF EXISTS idx_gemini_requests_user_created;
CREATE INDEX idx_gemini_requests_created ON public.gemini_requests(created_at DESC);
CREATE INDEX idx_gemini_requests_function_created ON public.gemini_requests(function_name, created_at DESC) WHERE function_name IS NOT NULL;
CREATE INDEX idx_gemini_requests_user_created ON public.gemini_requests(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Update RLS policy to allow viewing all requests (for rate limiting purposes)
DROP POLICY IF EXISTS "Users can view own gemini requests" ON public.gemini_requests;
CREATE POLICY "Users can view own gemini requests"
  ON public.gemini_requests
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

COMMENT ON COLUMN public.gemini_requests.function_name IS 'Name of the edge function that made the request (e.g., llm-wrapper, initiate-project-analysis, run-analysis-job)';
COMMENT ON COLUMN public.gemini_requests.user_id IS 'User ID if request was made by an authenticated user, NULL for system/internal calls';

