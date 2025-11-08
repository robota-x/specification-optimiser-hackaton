-- Create custom_blocks table for reusable markdown content
CREATE TABLE public.custom_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create block_templates table for predefined spec blocks
CREATE TABLE public.block_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create specs table for user specifications
CREATE TABLE public.specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spec_content table for spec blocks and custom content
CREATE TABLE public.spec_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES public.specs(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('template', 'custom')),
  block_template_id UUID REFERENCES public.block_templates(id) ON DELETE SET NULL,
  custom_block_id UUID REFERENCES public.custom_blocks(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT block_type_reference CHECK (
    (block_type = 'template' AND block_template_id IS NOT NULL AND custom_block_id IS NULL) OR
    (block_type = 'custom' AND custom_block_id IS NOT NULL AND block_template_id IS NULL)
  )
);

-- Enable RLS on all tables
ALTER TABLE public.custom_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_blocks
CREATE POLICY "Users can view their own custom blocks"
  ON public.custom_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom blocks"
  ON public.custom_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom blocks"
  ON public.custom_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom blocks"
  ON public.custom_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for block_templates (public read)
CREATE POLICY "Anyone can view active block templates"
  ON public.block_templates FOR SELECT
  USING (is_active = TRUE);

-- RLS policies for specs
CREATE POLICY "Users can view their own specs"
  ON public.specs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own specs"
  ON public.specs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own specs"
  ON public.specs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own specs"
  ON public.specs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for spec_content
CREATE POLICY "Users can view spec content for their specs"
  ON public.spec_content FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.specs
    WHERE specs.id = spec_content.spec_id
    AND specs.user_id = auth.uid()
  ));

CREATE POLICY "Users can create spec content for their specs"
  ON public.spec_content FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.specs
    WHERE specs.id = spec_content.spec_id
    AND specs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update spec content for their specs"
  ON public.spec_content FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.specs
    WHERE specs.id = spec_content.spec_id
    AND specs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete spec content for their specs"
  ON public.spec_content FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.specs
    WHERE specs.id = spec_content.spec_id
    AND specs.user_id = auth.uid()
  ));

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_custom_blocks_updated_at
  BEFORE UPDATE ON public.custom_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specs_updated_at
  BEFORE UPDATE ON public.specs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spec_content_updated_at
  BEFORE UPDATE ON public.spec_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_custom_blocks_user_id ON public.custom_blocks(user_id);
CREATE INDEX idx_specs_user_id ON public.specs(user_id);
CREATE INDEX idx_spec_content_spec_id ON public.spec_content(spec_id);
CREATE INDEX idx_spec_content_position ON public.spec_content(spec_id, position);