-- =====================================================================
-- CAWS Specification Builder v2 - Product Library
-- =====================================================================
-- "Product-First" workflow: Link real-world manufacturer products
-- to master clauses for one-click specification population
-- =====================================================================

-- =====================================================================
-- 1. CREATE PRODUCT_LIBRARY TABLE
-- =====================================================================

CREATE TABLE product_library (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to master clause (which clause can use this product)
    master_clause_id UUID NOT NULL REFERENCES master_clause(master_clause_id) ON DELETE CASCADE,

    -- AI Hook (placeholder for future ESG optimization)
    esg_material_id UUID REFERENCES esg_material_library(esg_material_id) ON DELETE SET NULL,

    -- Product identification
    manufacturer VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,

    -- The data payload that populates field_values
    -- Keys must match placeholders in master_clause.body_template
    product_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate products
    UNIQUE(master_clause_id, manufacturer, product_name)
);

-- =====================================================================
-- 2. INDEXES
-- =====================================================================

-- Fast lookup by master clause (main query pattern)
CREATE INDEX idx_product_library_master_clause
ON product_library(master_clause_id)
WHERE is_active = TRUE;

-- Fast lookup by ESG material (for future AI features)
CREATE INDEX idx_product_library_esg_material
ON product_library(esg_material_id)
WHERE esg_material_id IS NOT NULL;

-- Full-text search on manufacturer + product name
-- Using standard B-tree index for prefix matching and LIKE queries
CREATE INDEX idx_product_library_manufacturer ON product_library(manufacturer);
CREATE INDEX idx_product_library_product_name ON product_library(product_name);

-- JSONB search on product_data
CREATE INDEX idx_product_library_product_data
ON product_library USING gin(product_data);

-- =====================================================================
-- 3. TRIGGERS
-- =====================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_product_library_updated_at
    BEFORE UPDATE ON product_library
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE product_library ENABLE ROW LEVEL SECURITY;

-- Products are organization-scoped via master_clause -> work_section -> organisation
-- For now, allow read access to all authenticated users (products are "public" within org)
CREATE POLICY "Users can view products for their organization's master clauses"
    ON product_library
    FOR SELECT
    TO authenticated
    USING (
        master_clause_id IN (
            SELECT mc.master_clause_id
            FROM master_clause mc
            JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
            JOIN user_organisation_mapping uom ON mws.organisation_id = uom.organisation_id
            WHERE uom.user_id = auth.uid()
        )
    );

-- Insert/Update/Delete: Only org admins (placeholder for future RBAC)
-- For now, allow authenticated users to manage products
CREATE POLICY "Authenticated users can manage products"
    ON product_library
    FOR ALL
    TO authenticated
    USING (
        master_clause_id IN (
            SELECT mc.master_clause_id
            FROM master_clause mc
            JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
            JOIN user_organisation_mapping uom ON mws.organisation_id = uom.organisation_id
            WHERE uom.user_id = auth.uid()
        )
    )
    WITH CHECK (
        master_clause_id IN (
            SELECT mc.master_clause_id
            FROM master_clause mc
            JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
            JOIN user_organisation_mapping uom ON mws.organisation_id = uom.organisation_id
            WHERE uom.user_id = auth.uid()
        )
    );

-- =====================================================================
-- 5. HELPER FUNCTIONS
-- =====================================================================

-- Get products for a specific master clause
CREATE OR REPLACE FUNCTION get_products_for_clause(p_master_clause_id UUID)
RETURNS TABLE (
    product_id UUID,
    manufacturer VARCHAR,
    product_name VARCHAR,
    product_data JSONB,
    esg_material_id UUID,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        pl.product_id,
        pl.manufacturer,
        pl.product_name,
        pl.product_data,
        pl.esg_material_id,
        pl.is_active,
        pl.created_at
    FROM product_library pl
    WHERE pl.master_clause_id = p_master_clause_id
      AND pl.is_active = TRUE
    ORDER BY pl.manufacturer ASC, pl.product_name ASC;
$$;

-- Get products with ESG material data (for AI suggestions)
CREATE OR REPLACE FUNCTION get_products_with_esg_data(p_master_clause_id UUID)
RETURNS TABLE (
    product_id UUID,
    manufacturer VARCHAR,
    product_name VARCHAR,
    product_data JSONB,
    esg_material_id UUID,
    material_name VARCHAR,
    embodied_carbon DECIMAL,
    carbon_unit VARCHAR,
    is_active BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        pl.product_id,
        pl.manufacturer,
        pl.product_name,
        pl.product_data,
        pl.esg_material_id,
        esg.name AS material_name,
        esg.embodied_carbon,
        esg.carbon_unit,
        pl.is_active
    FROM product_library pl
    LEFT JOIN esg_material_library esg ON pl.esg_material_id = esg.esg_material_id
    WHERE pl.master_clause_id = p_master_clause_id
      AND pl.is_active = TRUE
    ORDER BY
        esg.embodied_carbon ASC NULLS LAST,
        pl.manufacturer ASC,
        pl.product_name ASC;
$$;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE product_library IS 'Library of real-world manufacturer products linked to master clauses for one-click specification population';
COMMENT ON COLUMN product_library.product_data IS 'JSONB object with keys matching master_clause.body_template placeholders';
COMMENT ON COLUMN product_library.esg_material_id IS 'Link to esg_material_library for AI-powered low-carbon suggestions (future feature)';
COMMENT ON FUNCTION get_products_for_clause IS 'Fetch all active products for a given master clause';
COMMENT ON FUNCTION get_products_with_esg_data IS 'Fetch products with ESG data for carbon optimization suggestions';
