-- =====================================================================
-- CAWS Specification Builder v2 Schema Refactor
-- Migration: v1 (Document-First) → v2 (Database-First)
-- =====================================================================
-- This migration implements the "Masters vs Instances" architecture
-- for CAWS (Common Arrangement of Work Sections) specification building.
-- =====================================================================

-- =====================================================================
-- TABLE 1: Organisation (Multi-tenant support)
-- =====================================================================
-- This table should already exist in production, but we create it here
-- for completeness. If it exists, this will be skipped.
-- =====================================================================

CREATE TABLE IF NOT EXISTS organisation (
    organisation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organisation ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own organisation
-- Note: We'll need to add a user_organisation table for many-to-many relationships
-- For now, we'll assume one organisation per user via a separate mapping
CREATE POLICY "Users can view their organisation"
    ON organisation FOR SELECT
    USING (true); -- Simplified for now; in production, join with user_organisation table

-- =====================================================================
-- TABLE 2: Contract_Type (Preliminaries Lookup)
-- =====================================================================
-- Different contract types (JCT, NEC) load different preliminary clauses
-- =====================================================================

CREATE TABLE contract_type (
    contract_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organisation_id, code)
);

-- Enable RLS
ALTER TABLE contract_type ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view contract types
CREATE POLICY "Authenticated users can view contract types"
    ON contract_type FOR SELECT
    TO authenticated
    USING (true);

-- Create index for performance
CREATE INDEX idx_contract_type_organisation ON contract_type(organisation_id);

-- =====================================================================
-- TABLE 3: Master_Work_Section (CAWS Folders/Sections)
-- =====================================================================
-- Models the CAWS "folders" (e.g., M10 - Cement Screeds, F10 - Masonry)
-- This builds the "Library" navigation tree in the frontend
-- =====================================================================

CREATE TABLE master_work_section (
    work_section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,

    -- The "Golden Thread" CAWS Identifier
    caws_group CHAR(1) NOT NULL,      -- e.g., 'F', 'M', 'A'
    caws_code VARCHAR(10) NOT NULL,   -- e.g., 'F10', 'M10', 'A10'
    title VARCHAR(255) NOT NULL,      -- e.g., "Brick/block walling"
    description TEXT,

    -- Ordering for display
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organisation_id, caws_code)
);

-- Enable RLS
ALTER TABLE master_work_section ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view work sections
CREATE POLICY "Authenticated users can view work sections"
    ON master_work_section FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes for performance
CREATE INDEX idx_master_work_section_organisation ON master_work_section(organisation_id);
CREATE INDEX idx_master_work_section_caws_group ON master_work_section(caws_group);
CREATE INDEX idx_master_work_section_caws_code ON master_work_section(caws_code);

-- =====================================================================
-- TABLE 4: Master_Clause (The "Practice Masters" Library)
-- =====================================================================
-- This is the core of the system: pre-written clause templates.
-- These are "Hybrid Blocks" with placeholders for user data.
-- =====================================================================

CREATE TABLE master_clause (
    master_clause_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_section_id UUID NOT NULL REFERENCES master_work_section(work_section_id) ON DELETE CASCADE,

    -- The "Golden Thread" CAWS Identifier
    caws_number VARCHAR(20) NOT NULL,  -- e.g., "F10/120", "M10/305", "A10/110"
    title VARCHAR(255) NOT NULL,       -- e.g., "FACING BRICKS", "AGGREGATES"

    -- The "Hybrid Block" Content Template
    -- Body has placeholders like {{field_name}} for the FE to render as inputs
    body_template TEXT,

    -- Field definitions (JSON array of field configurations)
    -- e.g., [{"name": "product_name", "type": "text", "label": "Product Name", "required": true}]
    field_definitions JSONB DEFAULT '[]'::jsonb,

    -- Technical guidance text for the user
    guidance_text TEXT,

    -- Link to Preliminaries (Section A)
    -- If NOT NULL, this clause is auto-added for projects with this contract type
    contract_type_id UUID REFERENCES contract_type(contract_type_id) ON DELETE SET NULL,

    -- Ordering within the work section
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Active/inactive flag
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(work_section_id, caws_number)
);

-- Enable RLS
ALTER TABLE master_clause ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view active master clauses
CREATE POLICY "Authenticated users can view active master clauses"
    ON master_clause FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_master_clause_work_section ON master_clause(work_section_id);
CREATE INDEX idx_master_clause_caws_number ON master_clause(caws_number);
CREATE INDEX idx_master_clause_contract_type ON master_clause(contract_type_id);
CREATE INDEX idx_master_clause_is_active ON master_clause(is_active);

-- GIN index for JSONB field_definitions
CREATE INDEX idx_master_clause_field_definitions ON master_clause USING GIN (field_definitions);

-- =====================================================================
-- TABLE 5: Project (Replaces "specs" table)
-- =====================================================================
-- The specification project with preliminaries data from Section A wizard
-- =====================================================================

CREATE TABLE project (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisation(organisation_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic project info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- PRELIMINARIES DATA (From 'New Project' Wizard - Section A)
    project_location TEXT,
    client_name VARCHAR(255),
    contract_type_id UUID REFERENCES contract_type(contract_type_id) ON DELETE SET NULL,

    -- Additional preliminaries fields (can be extended)
    architect_name VARCHAR(255),
    principal_designer VARCHAR(255),
    employer_name VARCHAR(255),
    project_reference VARCHAR(100),

    -- Project metadata
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, complete

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own projects"
    ON project FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON project FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON project FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON project FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_project_user ON project(user_id);
CREATE INDEX idx_project_organisation ON project(organisation_id);
CREATE INDEX idx_project_contract_type ON project(contract_type_id);
CREATE INDEX idx_project_status ON project(status);

-- =====================================================================
-- TABLE 6: Project_Clause (The Most Important Table)
-- =====================================================================
-- This is the "instance" of a clause in a project.
-- Handles BOTH Hybrid Blocks (linked to masters) AND Freeform Blocks.
-- =====================================================================

CREATE TABLE project_clause (
    project_clause_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,

    -- ========== HYBRID BLOCK LINK ==========
    -- If NOT NULL, this is a Hybrid Block (references master library)
    master_clause_id UUID REFERENCES master_clause(master_clause_id) ON DELETE SET NULL,

    -- User's filled data for the Hybrid Block's fields
    -- e.g., {"product_name": "Ibstock Red Smooth", "thickness": "65"}
    field_values JSONB DEFAULT '{}'::jsonb,

    -- ========== FREEFORM BLOCK CONTENT ==========
    -- If master_clause_id IS NULL, this is a Freeform Block
    -- User creates these from scratch (the "escape hatch")
    freeform_caws_number VARCHAR(20),
    freeform_title VARCHAR(255),
    freeform_body TEXT,

    -- ========== METADATA ==========
    -- User's drag-and-drop order in the frontend
    sort_order INTEGER NOT NULL,

    -- Notes/comments for this clause instance
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: Must be either Hybrid OR Freeform, not both
    CONSTRAINT chk_clause_type
        CHECK (
            (master_clause_id IS NOT NULL AND freeform_caws_number IS NULL AND freeform_title IS NULL AND freeform_body IS NULL) OR
            (master_clause_id IS NULL AND freeform_caws_number IS NOT NULL)
        )
);

-- Enable RLS
ALTER TABLE project_clause ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from project)
CREATE POLICY "Users can view clauses in their own projects"
    ON project_clause FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project
            WHERE project.project_id = project_clause.project_id
            AND project.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clauses in their own projects"
    ON project_clause FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project
            WHERE project.project_id = project_clause.project_id
            AND project.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clauses in their own projects"
    ON project_clause FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project
            WHERE project.project_id = project_clause.project_id
            AND project.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete clauses in their own projects"
    ON project_clause FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project
            WHERE project.project_id = project_clause.project_id
            AND project.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX idx_project_clause_project ON project_clause(project_id);
CREATE INDEX idx_project_clause_master ON project_clause(master_clause_id);
CREATE INDEX idx_project_clause_sort_order ON project_clause(project_id, sort_order);

-- GIN index for JSONB field_values
CREATE INDEX idx_project_clause_field_values ON project_clause USING GIN (field_values);

-- =====================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================================
-- Automatically update the updated_at timestamp on row updates
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_organisation_updated_at
    BEFORE UPDATE ON organisation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_type_updated_at
    BEFORE UPDATE ON contract_type
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_work_section_updated_at
    BEFORE UPDATE ON master_work_section
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_clause_updated_at
    BEFORE UPDATE ON master_clause
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_clause_updated_at
    BEFORE UPDATE ON project_clause
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- COMMENTS (Documentation)
-- =====================================================================

COMMENT ON TABLE organisation IS 'Multi-tenant organisation table';
COMMENT ON TABLE contract_type IS 'Contract types (JCT, NEC, etc.) that determine preliminary clauses';
COMMENT ON TABLE master_work_section IS 'CAWS work sections (folders) like M10, F10 - the master library structure';
COMMENT ON TABLE master_clause IS 'Master clause templates (Hybrid Blocks) - the Practice Masters library';
COMMENT ON TABLE project IS 'User specification projects with preliminaries data from Section A wizard';
COMMENT ON TABLE project_clause IS 'Clause instances in a project - handles both Hybrid and Freeform blocks';

COMMENT ON COLUMN master_clause.body_template IS 'Template text with placeholders like {{field_name}} for dynamic fields';
COMMENT ON COLUMN master_clause.field_definitions IS 'JSON array of field configurations for the template';
COMMENT ON COLUMN project_clause.master_clause_id IS 'If NOT NULL, this is a Hybrid Block linked to a master clause';
COMMENT ON COLUMN project_clause.field_values IS 'User-filled data for Hybrid Block fields, e.g., {"product_name": "Ibstock Red"}';
COMMENT ON COLUMN project_clause.freeform_caws_number IS 'If master_clause_id IS NULL, this is a Freeform Block with custom CAWS number';
