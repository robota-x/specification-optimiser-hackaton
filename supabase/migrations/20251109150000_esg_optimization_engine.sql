-- =====================================================
-- ESG Optimization Engine - Production Schema
-- =====================================================
-- This migration creates the production-ready ESG feature
-- with NLP-based material extraction and analysis
-- =====================================================

-- =====================================================
-- Table 0: User_Organisation_Mapping
-- Many-to-many relationship between users and organisations
-- Required for RLS policies in ESG tables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_organisation_mapping (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisation(organisation_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organisation_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_organisation_mapping_user ON public.user_organisation_mapping(user_id);
CREATE INDEX idx_user_organisation_mapping_org ON public.user_organisation_mapping(organisation_id);

-- Enable RLS
ALTER TABLE public.user_organisation_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own organisation mappings
CREATE POLICY "Users can view their organisation mappings"
  ON public.user_organisation_mapping
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own mappings (or system can insert)
CREATE POLICY "Users can insert their organisation mappings"
  ON public.user_organisation_mapping
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Policy: Users can delete their own mappings
CREATE POLICY "Users can delete their organisation mappings"
  ON public.user_organisation_mapping
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- =====================================================
-- Table 1: ESG_Material_Library
-- The "Knowledge Base" - Canonical database of materials
-- populated from EPDs/LCA sources
-- =====================================================

CREATE TABLE IF NOT EXISTS public.esg_material_library (
  esg_material_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisation(organisation_id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  data_source VARCHAR(255) NOT NULL, -- e.g., "EC3", "ICE", "BECD", "Manufacturer EPD"
  external_id VARCHAR(255), -- ID from external database (e.g., EC3 EPD ID)
  embodied_carbon DECIMAL(12, 4) NOT NULL, -- kgCO2e
  carbon_unit VARCHAR(50) NOT NULL DEFAULT 'kgCO2e/tonne', -- e.g., "kgCO2e/tonne", "kgCO2e/m3"
  cost_impact_text VARCHAR(500), -- e.g., "Slightly higher cost"
  modifications_text TEXT, -- e.g., "Requires structural review of curing times"
  alternative_to_ids UUID[], -- Array of esg_material_id this is an alternative for
  nlp_tags JSONB NOT NULL DEFAULT '{}', -- For NLP linking: {"synonyms": ["OPC Cement", "CEM I"], "tags": ["cement", "concrete"]}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_esg_material_library_organisation ON public.esg_material_library(organisation_id);
CREATE INDEX idx_esg_material_library_name ON public.esg_material_library(name);
CREATE INDEX idx_esg_material_library_data_source ON public.esg_material_library(data_source);
CREATE INDEX idx_esg_material_library_nlp_tags ON public.esg_material_library USING gin(nlp_tags);
CREATE INDEX idx_esg_material_library_alternative_to ON public.esg_material_library USING gin(alternative_to_ids);
CREATE INDEX idx_esg_material_library_active ON public.esg_material_library(is_active) WHERE is_active = true;

-- Add RLS (Row Level Security)
ALTER TABLE public.esg_material_library ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read global materials (organisation_id IS NULL) and their org's custom materials
CREATE POLICY "Users can read global and org materials"
  ON public.esg_material_library
  FOR SELECT
  USING (
    organisation_id IS NULL OR
    organisation_id IN (
      SELECT organisation_id FROM public.user_organisation_mapping WHERE user_id = auth.uid()
    )
  );

-- Policy: Only authenticated users can insert materials for their organisation
CREATE POLICY "Users can insert materials for their organisation"
  ON public.esg_material_library
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organisation_id IN (
      SELECT organisation_id FROM public.user_organisation_mapping WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update materials in their organisation
CREATE POLICY "Users can update materials in their organisation"
  ON public.esg_material_library
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_organisation_mapping WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete materials in their organisation
CREATE POLICY "Users can delete materials in their organisation"
  ON public.esg_material_library
  FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.user_organisation_mapping WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Table 2: Project_Analysis_Job
-- Manages the asynchronous ESG analysis workflow
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_analysis_job (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'complete', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_project_analysis_job_project ON public.project_analysis_job(project_id);
CREATE INDEX idx_project_analysis_job_status ON public.project_analysis_job(status);
CREATE INDEX idx_project_analysis_job_created ON public.project_analysis_job(created_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE public.project_analysis_job ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see jobs for their own projects
CREATE POLICY "Users can read their project analysis jobs"
  ON public.project_analysis_job
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project WHERE user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can insert jobs for their projects
CREATE POLICY "Users can insert jobs for their projects"
  ON public.project_analysis_job
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    project_id IN (
      SELECT project_id FROM public.project WHERE user_id = auth.uid()
    )
  );

-- Policy: System can update any job (for the edge function)
CREATE POLICY "System can update jobs"
  ON public.project_analysis_job
  FOR UPDATE
  USING (true); -- This will be called by the service role key

-- =====================================================
-- Table 3: Project_ESG_Suggestion
-- The "AI Output" - Stores all suggestions/reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_esg_suggestion (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project(project_id) ON DELETE CASCADE,
  source_clause_id UUID REFERENCES public.project_clause(project_clause_id) ON DELETE CASCADE,
  suggestion_title VARCHAR(500) NOT NULL,
  suggestion_narrative TEXT NOT NULL, -- Can be Markdown/HTML
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'seen', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_project_esg_suggestion_project ON public.project_esg_suggestion(project_id);
CREATE INDEX idx_project_esg_suggestion_clause ON public.project_esg_suggestion(source_clause_id);
CREATE INDEX idx_project_esg_suggestion_status ON public.project_esg_suggestion(status);
CREATE INDEX idx_project_esg_suggestion_created ON public.project_esg_suggestion(created_at DESC);

-- Add composite index for project-wide suggestions
CREATE INDEX idx_project_esg_suggestion_project_global ON public.project_esg_suggestion(project_id)
  WHERE source_clause_id IS NULL;

-- Add RLS (Row Level Security)
ALTER TABLE public.project_esg_suggestion ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read suggestions for their projects
CREATE POLICY "Users can read their project suggestions"
  ON public.project_esg_suggestion
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project WHERE user_id = auth.uid()
    )
  );

-- Policy: System can insert suggestions (via edge function)
CREATE POLICY "System can insert suggestions"
  ON public.project_esg_suggestion
  FOR INSERT
  WITH CHECK (true); -- This will be called by the service role key

-- Policy: Users can update suggestions for their projects
CREATE POLICY "Users can update their suggestions"
  ON public.project_esg_suggestion
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM public.project WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete suggestions for their projects
CREATE POLICY "Users can delete their suggestions"
  ON public.project_esg_suggestion
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

-- Trigger for esg_material_library
CREATE OR REPLACE FUNCTION update_esg_material_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_esg_material_library_updated_at
  BEFORE UPDATE ON public.esg_material_library
  FOR EACH ROW
  EXECUTE FUNCTION update_esg_material_library_updated_at();

-- Trigger for project_esg_suggestion
CREATE OR REPLACE FUNCTION update_project_esg_suggestion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_esg_suggestion_updated_at
  BEFORE UPDATE ON public.project_esg_suggestion
  FOR EACH ROW
  EXECUTE FUNCTION update_project_esg_suggestion_updated_at();

-- =====================================================
-- Seed Data: Sample ESG Materials Library
-- =====================================================
-- These are example materials based on common EPD databases
-- In production, these would be imported from EC3, ICE Database, etc.

INSERT INTO public.esg_material_library (
  organisation_id,
  name,
  data_source,
  external_id,
  embodied_carbon,
  carbon_unit,
  cost_impact_text,
  modifications_text,
  alternative_to_ids,
  nlp_tags
) VALUES
  -- Portland Cement (OPC) - High carbon baseline
  (
    NULL,
    'Portland Cement (CEM I)',
    'ICE Database v3.0',
    'ICE-CEMENT-001',
    820.00,
    'kgCO2e/tonne',
    'Standard cost',
    'No modifications required - standard material',
    NULL,
    '{"synonyms": ["OPC Cement", "CEM I", "Portland Cement", "Ordinary Portland Cement"], "tags": ["cement", "concrete", "binder"]}'::jsonb
  ),

  -- GGBS Cement - Lower carbon alternative to OPC
  (
    NULL,
    'Ground Granulated Blast-furnace Slag Cement (CEM III/A)',
    'ICE Database v3.0',
    'ICE-CEMENT-002',
    270.00,
    'kgCO2e/tonne',
    '5-10% cost increase',
    'Requires careful curing in cold weather. May require extended curing times.',
    ARRAY(SELECT esg_material_id FROM public.esg_material_library WHERE name = 'Portland Cement (CEM I)' LIMIT 1),
    '{"synonyms": ["GGBS", "GGBS Cement", "CEM III/A", "Slag Cement", "Ground Granulated Blast Furnace Slag"], "tags": ["cement", "concrete", "binder", "low-carbon"]}'::jsonb
  ),

  -- PFA Cement - Lower carbon alternative to OPC
  (
    NULL,
    'Pulverised Fuel Ash Cement (CEM II/B-V)',
    'ICE Database v3.0',
    'ICE-CEMENT-003',
    510.00,
    'kgCO2e/tonne',
    '3-8% cost increase',
    'May require adjustments to mix design. Consider strength development time.',
    ARRAY(SELECT esg_material_id FROM public.esg_material_library WHERE name = 'Portland Cement (CEM I)' LIMIT 1),
    '{"synonyms": ["PFA", "PFA Cement", "CEM II/B-V", "Fly Ash Cement", "Pulverised Fuel Ash"], "tags": ["cement", "concrete", "binder", "low-carbon"]}'::jsonb
  ),

  -- Clay Bricks - Standard
  (
    NULL,
    'Standard Facing Bricks',
    'ICE Database v3.0',
    'ICE-BRICK-001',
    230.00,
    'kgCO2e/1000 bricks',
    'Standard cost',
    'No modifications required - standard material',
    NULL,
    '{"synonyms": ["facing bricks", "clay bricks", "standard bricks", "brick", "facing brick"], "tags": ["bricks", "masonry", "walling"]}'::jsonb
  ),

  -- Reclaimed Bricks - Lower carbon alternative
  (
    NULL,
    'Reclaimed Facing Bricks',
    'WRAP Embodied Carbon Database',
    'WRAP-BRICK-001',
    25.00,
    'kgCO2e/1000 bricks',
    '15-25% cost increase (subject to availability)',
    'Requires structural assessment for load-bearing applications. Visual variation expected.',
    ARRAY(SELECT esg_material_id FROM public.esg_material_library WHERE name = 'Standard Facing Bricks' LIMIT 1),
    '{"synonyms": ["reclaimed bricks", "salvaged bricks", "recycled bricks", "second-hand bricks", "used bricks"], "tags": ["bricks", "masonry", "walling", "recycled", "low-carbon"]}'::jsonb
  ),

  -- Timber - Softwood
  (
    NULL,
    'Softwood Timber (Structural)',
    'ICE Database v3.0',
    'ICE-TIMBER-001',
    -470.00,
    'kgCO2e/m3',
    'Standard cost',
    'Ensure timber is from certified sustainable sources (FSC/PEFC)',
    NULL,
    '{"synonyms": ["softwood", "structural timber", "timber", "wood", "construction timber"], "tags": ["timber", "wood", "structural", "carbon-negative"]}'::jsonb
  ),

  -- Steel - Virgin
  (
    NULL,
    'Virgin Steel Sections',
    'World Steel Association',
    'WSA-STEEL-001',
    2100.00,
    'kgCO2e/tonne',
    'Standard cost',
    'No modifications required - standard material',
    NULL,
    '{"synonyms": ["steel", "structural steel", "virgin steel", "steel sections", "steel beams"], "tags": ["steel", "structural", "metal"]}'::jsonb
  ),

  -- Steel - Recycled
  (
    NULL,
    'Recycled Steel Sections',
    'World Steel Association',
    'WSA-STEEL-002',
    630.00,
    'kgCO2e/tonne',
    'Competitive with virgin steel',
    'May require verification of structural properties. Consider lead times.',
    ARRAY(SELECT esg_material_id FROM public.esg_material_library WHERE name = 'Virgin Steel Sections' LIMIT 1),
    '{"synonyms": ["recycled steel", "scrap steel", "reused steel", "secondary steel"], "tags": ["steel", "structural", "metal", "recycled", "low-carbon"]}'::jsonb
  ),

  -- Concrete - Standard
  (
    NULL,
    'Standard Concrete C30/37',
    'Concrete Centre',
    'CC-CONC-001',
    180.00,
    'kgCO2e/m3',
    'Standard cost',
    'No modifications required - standard material',
    NULL,
    '{"synonyms": ["concrete", "standard concrete", "C30/37", "ready-mix concrete"], "tags": ["concrete", "structural"]}'::jsonb
  ),

  -- Concrete - Low Carbon
  (
    NULL,
    'Low Carbon Concrete C30/37 (GGBS blend)',
    'Concrete Centre',
    'CC-CONC-002',
    110.00,
    'kgCO2e/m3',
    '5-8% cost increase',
    'Extended curing required in cold weather. Specify minimum cement replacement levels.',
    ARRAY(SELECT esg_material_id FROM public.esg_material_library WHERE name = 'Standard Concrete C30/37' LIMIT 1),
    '{"synonyms": ["low carbon concrete", "GGBS concrete", "eco concrete", "green concrete"], "tags": ["concrete", "structural", "low-carbon"]}'::jsonb
  );

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE public.esg_material_library IS 'Canonical database of construction materials with ESG data from EPD/LCA sources';
COMMENT ON TABLE public.project_analysis_job IS 'Manages asynchronous ESG analysis workflow for projects';
COMMENT ON TABLE public.project_esg_suggestion IS 'Stores AI-generated ESG suggestions and reports for projects';

COMMENT ON COLUMN public.esg_material_library.nlp_tags IS 'JSONB field for NLP linking. Contains synonyms and tags for material recognition.';
COMMENT ON COLUMN public.esg_material_library.alternative_to_ids IS 'Array of material IDs this material can replace as a lower-carbon alternative';
COMMENT ON COLUMN public.project_esg_suggestion.source_clause_id IS 'NULL for project-wide reports, NOT NULL for clause-specific suggestions';
COMMENT ON COLUMN public.project_analysis_job.status IS 'Job status: queued, running, complete, failed';
