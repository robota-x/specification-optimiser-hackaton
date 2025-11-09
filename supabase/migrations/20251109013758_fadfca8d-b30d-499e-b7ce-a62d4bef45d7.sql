-- Add field_values column to store template block data
ALTER TABLE public.spec_content
ADD COLUMN field_values JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance
CREATE INDEX idx_spec_content_field_values ON public.spec_content USING GIN(field_values);

-- Add comment for documentation
COMMENT ON COLUMN public.spec_content.field_values IS 'Stores the field values for template blocks as JSON';