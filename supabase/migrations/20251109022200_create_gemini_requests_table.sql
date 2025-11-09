-- Create table for tracking Gemini API requests for rate limiting
CREATE TABLE IF NOT EXISTS public.gemini_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient rate limiting queries
CREATE INDEX idx_gemini_requests_user_created ON public.gemini_requests(user_id, created_at DESC);
CREATE INDEX idx_gemini_requests_status ON public.gemini_requests(status);

-- Enable Row Level Security
ALTER TABLE public.gemini_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own requests
CREATE POLICY "Users can view own gemini requests"
  ON public.gemini_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert gemini requests"
  ON public.gemini_requests
  FOR INSERT
  WITH CHECK (true);

-- Service role can update (for edge functions)
CREATE POLICY "Service role can update gemini requests"
  ON public.gemini_requests
  FOR UPDATE
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.gemini_requests IS 'Tracks Gemini API requests for rate limiting. Only logs metadata, not request content.';
