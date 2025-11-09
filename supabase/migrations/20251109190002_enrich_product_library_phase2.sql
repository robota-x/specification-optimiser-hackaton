-- =====================================================================
-- CAWS Specification Builder v2 - Product Library Data Enrichment (Phase 2)
-- =====================================================================
-- Expanding product library to make the builder feel comprehensive
-- Part 1: Fill gaps for clauses with zero products (11 products)
-- Part 2: Add depth to existing clauses (3 products)
-- Total: 14 new products (bringing total from 11 to 25)
-- =====================================================================

-- =====================================================================
-- PART 1: FILLING THE GAPS
-- =====================================================================

-- =====================================================================
-- 1. AGGREGATES (E10/120 - AGGREGATES PRESCRIPTIVE)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Tarmac - Recycled 20mm Aggregate (High recycled content)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000b',
            v_master_clause_id,
            'Tarmac',
            'Recycled 20mm Aggregate',
            '{"coarse_type": "Recycled concrete aggregate", "fine_type": "Standard sharp sand", "recycled_content_percent": "75"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Aggregate Industries - Primary 20mm Aggregate (Virgin aggregate - baseline)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000c',
            v_master_clause_id,
            'Aggregate Industries',
            'Primary 20mm Aggregate',
            '{"coarse_type": "Crushed granite", "fine_type": "Standard sharp sand", "recycled_content_percent": "0"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Day Aggregates - Recycled 4-20mm Shingle (Very high recycled content)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000d',
            v_master_clause_id,
            'Day Aggregates',
            'Recycled 4-20mm Shingle',
            '{"coarse_type": "Recycled aggregate", "fine_type": "Washed sharp sand", "recycled_content_percent": "90"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 2. BLOCKWORK (F10/120 - COMMON BLOCKWORK)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Plasmor - Stranlite 100mm (Lightweight aggregate block - higher strength)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000e',
            v_master_clause_id,
            'Plasmor',
            'Stranlite 100mm',
            '{"block_type": "Lightweight aggregate block", "manufacturer": "Plasmor", "product_ref": "Stranlite", "strength": "7.3", "density": "1350"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- H+H - Celcon Standard 100mm (AAC - good thermal performance)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000f',
            v_master_clause_id,
            'H+H',
            'Celcon Standard 100mm',
            '{"block_type": "Autoclaved aerated concrete (AAC)", "manufacturer": "H+H", "product_ref": "Celcon Standard", "strength": "3.6", "density": "600"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Forterra - Thermalite Shield 100mm (AAC - premium thermal)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000010',
            v_master_clause_id,
            'Forterra',
            'Thermalite Shield 100mm',
            '{"block_type": "Autoclaved aerated concrete (AAC)", "manufacturer": "Forterra", "product_ref": "Thermalite Shield", "strength": "3.6", "density": "600"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 3. MORTAR (F10/220 - MORTAR PRESCRIPTIVE)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/220'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- CPI Euromix - CPI M4 Mortar (Standard Portland cement - high carbon)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000011',
            v_master_clause_id,
            'CPI Euromix',
            'CPI M4 Mortar (Bulk Bag)',
            '{"designation": "M4", "cement_type": "CEM I", "sand_type": "BS EN 13139", "admixture_type": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Tarmac - Blue Circle Lime Mortar (Low-carbon alternative)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000012',
            v_master_clause_id,
            'Tarmac',
            'Blue Circle Lime Mortar',
            '{"designation": "M2", "cement_type": "Natural Hydraulic Lime", "sand_type": "BS EN 13139", "admixture_type": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Readymix - RMC Mortar M4 (Standard Portland cement)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000013',
            v_master_clause_id,
            'Readymix',
            'RMC Mortar M4',
            '{"designation": "M4", "cement_type": "CEM I", "sand_type": "BS EN 13139", "admixture_type": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 4. WALL TIES (F30/110 - WALL TIES)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F30/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Ancon - STAINTFIX HRT4 (Type 4 - high performance)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000014',
            v_master_clause_id,
            'Ancon',
            'STAINTFIX HRT4 L-Type 4',
            '{"tie_type": "Type 4", "material": "Stainless steel", "manufacturer": "Ancon", "product_ref": "HRT4"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Vista Engineering - V60 Type 2 (Standard external cavity)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000015',
            v_master_clause_id,
            'Vista Engineering',
            'V60 Type 2 Wall Tie',
            '{"tie_type": "Type 2", "material": "Stainless steel", "manufacturer": "Vista Engineering", "product_ref": "V60"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- PART 2: ADDING MORE DEPTH
-- =====================================================================

-- =====================================================================
-- 5. CEMENT - Additional Option (E10/110)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Breedon - Portland-limestone cement (Mid-range carbon - CEM II)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000016',
            v_master_clause_id,
            'Breedon',
            'Portland-limestone cement',
            '{"cement_type": "CEM II/A-L", "manufacturer": "Breedon", "product_ref": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 6. FACING BRICKS - Additional Option (F10/110)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Michelmersh - Charnwood Henley Red (Premium stock brick)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000017',
            v_master_clause_id,
            'Michelmersh',
            'Charnwood Henley Red',
            '{"brick_type": "Clay facing brick", "manufacturer": "Michelmersh", "product_ref": "Henley Red", "finish": "Stock", "strength": "20", "durability": "F2"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 7. CAVITY INSULATION - Additional Option (F30/120)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F30/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Celotex - CW4000 Cavity Wall Board (PIR - alternative to Kingspan)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000018',
            v_master_clause_id,
            'Celotex',
            'CW4000 Cavity Wall Board',
            '{"insulation_type": "PIR Board", "manufacturer": "Celotex", "product_ref": "CW4000", "conductivity": "0.022"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- VERIFICATION QUERIES (For testing/validation)
-- =====================================================================

-- Count products by clause (should show 8 clauses with products)
-- SELECT
--     mc.caws_number,
--     mc.title,
--     COUNT(pl.product_id) AS product_count
-- FROM master_clause mc
-- LEFT JOIN product_library pl ON mc.master_clause_id = pl.master_clause_id
-- WHERE mc.caws_number IN ('E10/110', 'E10/120', 'F10/110', 'F10/120', 'F10/220', 'F30/110', 'F30/120', 'G10/110')
-- GROUP BY mc.caws_number, mc.title
-- ORDER BY mc.caws_number;

-- Expected results:
-- E10/110 - CEMENT: 4 products (was 3, +1)
-- E10/120 - AGGREGATES: 3 products (was 0, +3)
-- F10/110 - FACING BRICKS: 4 products (was 3, +1)
-- F10/120 - BLOCKWORK: 3 products (was 0, +3)
-- F10/220 - MORTAR: 3 products (was 0, +3)
-- F30/110 - WALL TIES: 2 products (was 0, +2)
-- F30/120 - INSULATION: 3 products (was 2, +1)
-- G10/110 - STRUCTURAL STEEL: 2 products (unchanged)
-- TOTAL: 25 products (was 11, +14)

-- List all products by clause (full verification)
-- SELECT
--     mc.caws_number,
--     mc.title,
--     pl.manufacturer,
--     pl.product_name,
--     jsonb_pretty(pl.product_data) AS product_data_preview
-- FROM product_library pl
-- JOIN master_clause mc ON pl.master_clause_id = mc.master_clause_id
-- WHERE mc.caws_number IN ('E10/110', 'E10/120', 'F10/110', 'F10/120', 'F10/220', 'F30/110', 'F30/120', 'G10/110')
-- ORDER BY mc.caws_number, pl.manufacturer, pl.product_name;

-- Count total products (should be 25)
-- SELECT COUNT(*) AS total_products FROM product_library WHERE is_active = TRUE;
