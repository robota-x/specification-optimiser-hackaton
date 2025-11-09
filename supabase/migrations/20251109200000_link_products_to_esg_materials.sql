-- =====================================================================
-- Link Products to ESG Materials - Critical Path for "Hybrid Analysis"
-- =====================================================================
-- This migration links products in product_library to esg_material_library
-- enabling direct ESG material lookups (Path A) instead of NLP extraction
-- =====================================================================

-- =====================================================================
-- CEMENT PRODUCTS → ESG MATERIALS
-- =====================================================================

-- Link Hanson Regen GGBS to GGBS Cement (low-carbon)
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Ground Granulated Blast-furnace Slag Cement (CEM III/A)'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000001'; -- Hanson Regen GGBS

-- Link Tarmac Standard Portland Cement to Portland Cement (high-carbon baseline)
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Portland Cement (CEM I)'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000002'; -- Tarmac Standard Portland

-- Link CEMEX CEM I Portland to Portland Cement
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Portland Cement (CEM I)'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000003'; -- CEMEX CEM I

-- =====================================================================
-- FACING BRICKS → ESG MATERIALS
-- =====================================================================

-- Link Ibstock Red Multi Smooth to Standard Facing Bricks
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Standard Facing Bricks'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000004'; -- Ibstock Red Multi Smooth

-- Link Wienerberger Marziale to Standard Facing Bricks
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Standard Facing Bricks'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000005'; -- Wienerberger Marziale

-- Link Forterra Hampton Rural Blend to Standard Facing Bricks
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Standard Facing Bricks'
    LIMIT 1
)
WHERE product_id = '60000000-0000-0000-0000-000000000006'; -- Forterra Hampton Rural Blend

-- =====================================================================
-- CONCRETE PRODUCTS → ESG MATERIALS
-- =====================================================================

-- Link concrete products if they exist
-- Note: Check product_library for concrete products and add mappings

-- Link standard ready-mix concrete to Standard Concrete C30/37
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Standard Concrete C30/37'
    LIMIT 1
)
WHERE manufacturer IN ('Hanson', 'Tarmac', 'CEMEX', 'Aggregate Industries')
  AND product_name ILIKE '%C30%'
  AND esg_material_id IS NULL;

-- Link low-carbon concrete to Low Carbon Concrete (GGBS blend)
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Low Carbon Concrete C30/37 (GGBS blend)'
    LIMIT 1
)
WHERE manufacturer IN ('Hanson', 'Tarmac', 'CEMEX', 'Aggregate Industries')
  AND (
    product_name ILIKE '%GGBS%' OR
    product_name ILIKE '%low carbon%' OR
    product_name ILIKE '%eco%' OR
    product_name ILIKE '%green%'
  )
  AND esg_material_id IS NULL;

-- =====================================================================
-- STEEL PRODUCTS → ESG MATERIALS
-- =====================================================================

-- Link virgin steel products
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Virgin Steel Sections'
    LIMIT 1
)
WHERE manufacturer IN ('Tata Steel', 'British Steel', 'ArcelorMittal')
  AND product_name ILIKE '%steel%'
  AND product_name NOT ILIKE '%recycled%'
  AND product_name NOT ILIKE '%reused%'
  AND esg_material_id IS NULL;

-- Link recycled steel products
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Recycled Steel Sections'
    LIMIT 1
)
WHERE manufacturer IN ('Tata Steel', 'British Steel', 'ArcelorMittal')
  AND (
    product_name ILIKE '%recycled%' OR
    product_name ILIKE '%reused%' OR
    product_name ILIKE '%secondary%'
  )
  AND esg_material_id IS NULL;

-- =====================================================================
-- TIMBER PRODUCTS → ESG MATERIALS
-- =====================================================================

-- Link softwood timber products
UPDATE product_library
SET esg_material_id = (
    SELECT esg_material_id
    FROM esg_material_library
    WHERE name = 'Softwood Timber (Structural)'
    LIMIT 1
)
WHERE (
    manufacturer ILIKE '%timber%' OR
    product_name ILIKE '%timber%' OR
    product_name ILIKE '%softwood%'
  )
  AND esg_material_id IS NULL;

-- =====================================================================
-- VALIDATION & REPORTING
-- =====================================================================

-- Count products with ESG links
DO $$
DECLARE
    v_total_products INTEGER;
    v_linked_products INTEGER;
    v_unlinked_products INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_products FROM product_library WHERE is_active = true;
    SELECT COUNT(*) INTO v_linked_products FROM product_library WHERE is_active = true AND esg_material_id IS NOT NULL;
    SELECT COUNT(*) INTO v_unlinked_products FROM product_library WHERE is_active = true AND esg_material_id IS NULL;

    RAISE NOTICE '=== Product-ESG Linking Summary ===';
    RAISE NOTICE 'Total active products: %', v_total_products;
    RAISE NOTICE 'Products with ESG links: %', v_linked_products;
    RAISE NOTICE 'Products without ESG links: %', v_unlinked_products;
    RAISE NOTICE 'Coverage: %% ', ROUND((v_linked_products::numeric / NULLIF(v_total_products, 0) * 100), 2);
END $$;

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Already exists from create_product_library.sql but adding for safety
CREATE INDEX IF NOT EXISTS idx_product_library_esg_material
ON product_library(esg_material_id)
WHERE esg_material_id IS NOT NULL;

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON COLUMN product_library.esg_material_id IS
'Links product to ESG material library for direct carbon analysis (Path A). NULL means no direct link, will use NLP matching (Path B).';
