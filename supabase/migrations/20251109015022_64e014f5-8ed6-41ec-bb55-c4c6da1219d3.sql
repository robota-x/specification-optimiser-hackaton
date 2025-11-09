-- Add length constraints to user input fields for security

-- Add constraints to specs table
ALTER TABLE public.specs
ADD CONSTRAINT specs_title_length CHECK (char_length(title) <= 100);

ALTER TABLE public.specs
ADD CONSTRAINT specs_description_length CHECK (char_length(description) <= 500);

-- Add constraints to custom_blocks table
ALTER TABLE public.custom_blocks
ADD CONSTRAINT custom_blocks_title_length CHECK (char_length(title) <= 100);

ALTER TABLE public.custom_blocks
ADD CONSTRAINT custom_blocks_content_length CHECK (char_length(markdown_content) <= 5000);

-- Add comments for documentation
COMMENT ON CONSTRAINT specs_title_length ON public.specs IS 'Enforces maximum title length of 100 characters';
COMMENT ON CONSTRAINT specs_description_length ON public.specs IS 'Enforces maximum description length of 500 characters';
COMMENT ON CONSTRAINT custom_blocks_title_length ON public.custom_blocks IS 'Enforces maximum title length of 100 characters';
COMMENT ON CONSTRAINT custom_blocks_content_length ON public.custom_blocks IS 'Enforces maximum markdown content length of 5000 characters';