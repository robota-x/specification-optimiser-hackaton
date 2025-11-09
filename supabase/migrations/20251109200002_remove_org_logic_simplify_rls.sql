-- Remove Organisation Logic & Simplify RLS
-- Keep organisations table but remove from all logic
-- Shared resources: globally accessible
-- User resources: owned by user_id

-- =====================================================================
-- 1. ESG MATERIAL LIBRARY - Global Access
-- =====================================================================

DROP POLICY IF EXISTS "Users can read global and org materials" ON esg_material_library;
DROP POLICY IF EXISTS "Users can insert materials for their organisation" ON esg_material_library;
DROP POLICY IF EXISTS "Users can update their org materials" ON esg_material_library;
DROP POLICY IF EXISTS "Users can delete their org materials" ON esg_material_library;

CREATE POLICY "Anyone can read ESG materials"
    ON esg_material_library FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage ESG materials"
    ON esg_material_library FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- 2. PRODUCT LIBRARY - Global Access
-- =====================================================================

DROP POLICY IF EXISTS "Users can view products for their organization's master clauses" ON product_library;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON product_library;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON product_library;

CREATE POLICY "Anyone can read products"
    ON product_library FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage products"
    ON product_library FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- 3. MASTER WORK SECTIONS - Global Access
-- =====================================================================

DROP POLICY IF EXISTS "Users can view work sections in their organisation" ON master_work_section;
DROP POLICY IF EXISTS "Users can manage work sections in their organisation" ON master_work_section;
DROP POLICY IF EXISTS "Authenticated users can read all work sections" ON master_work_section;
DROP POLICY IF EXISTS "Authenticated users can manage work sections" ON master_work_section;

CREATE POLICY "Anyone can read work sections"
    ON master_work_section FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage work sections"
    ON master_work_section FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- 4. MASTER CLAUSES - Global Access
-- =====================================================================

DROP POLICY IF EXISTS "Users can view clauses in their organisation" ON master_clause;
DROP POLICY IF EXISTS "Users can manage clauses in their organisation" ON master_clause;
DROP POLICY IF EXISTS "Authenticated users can read all master clauses" ON master_clause;
DROP POLICY IF EXISTS "Authenticated users can manage master clauses" ON master_clause;

CREATE POLICY "Anyone can read master clauses"
    ON master_clause FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage master clauses"
    ON master_clause FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- 5. CONTRACT TYPES - Global Access
-- =====================================================================

DROP POLICY IF EXISTS "Users can view all contract types" ON contract_type;
DROP POLICY IF EXISTS "Authenticated users can read all contract types" ON contract_type;
DROP POLICY IF EXISTS "Authenticated users can manage contract types" ON contract_type;

CREATE POLICY "Anyone can read contract types"
    ON contract_type FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage contract types"
    ON contract_type FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- 6. ORGANISATIONS - Global Access (but not used)
-- =====================================================================

DROP POLICY IF EXISTS "Users can view all organisations" ON organisation;
DROP POLICY IF EXISTS "Authenticated users can read all organisations" ON organisation;
DROP POLICY IF EXISTS "Authenticated users can manage organisations" ON organisation;

CREATE POLICY "Anyone can read organisations"
    ON organisation FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can manage organisations"
    ON organisation FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
