-- =====================================================================
-- CAWS Specification Builder v2 - Product Library Sample Data
-- =====================================================================
-- Light data population for testing the "Product-First" workflow
-- Real-world manufacturer products mapped to master clauses
-- =====================================================================

-- =====================================================================
-- 1. CEMENT PRODUCTS (E10/110 - CEMENT PRESCRIPTIVE)
-- =====================================================================

-- Get master_clause_id for E10/110
DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Hanson - Regen GGBS (Low-carbon option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000001',
            v_master_clause_id,
            'Hanson',
            'Regen GGBS',
            '{"cement_type": "CEM III/A (GGBS)", "manufacturer": "Hanson", "product_ref": "Regen"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Tarmac - Standard Portland Cement (High-carbon baseline)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000002',
            v_master_clause_id,
            'Tarmac',
            'Standard Portland Cement',
            '{"cement_type": "CEM I", "manufacturer": "Tarmac", "product_ref": "Standard Portland"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- CEMEX - CEM I Portland
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000003',
            v_master_clause_id,
            'CEMEX',
            'CEM I Portland',
            '{"cement_type": "CEM I", "manufacturer": "CEMEX", "product_ref": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 2. FACING BRICKS (F10/110 - FACING BRICKS PRESCRIPTIVE)
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
        -- Ibstock - Red Multi Smooth
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000004',
            v_master_clause_id,
            'Ibstock',
            'Red Multi Smooth',
            '{"brick_type": "Clay facing brick", "manufacturer": "Ibstock", "product_ref": "Red Multi Smooth", "finish": "Smooth", "strength": "25", "durability": "F2"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Wienerberger - Marziale
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000005',
            v_master_clause_id,
            'Wienerberger',
            'Marziale',
            '{"brick_type": "Clay facing brick", "manufacturer": "Wienerberger", "product_ref": "Marziale", "finish": "Creased", "strength": "12", "durability": "F2"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Forterra - Hampton Rural Blend
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000006',
            v_master_clause_id,
            'Forterra',
            'Hampton Rural Blend',
            '{"brick_type": "Clay facing brick", "manufacturer": "Forterra", "product_ref": "Hampton Rural Blend", "finish": "Sandfaced", "strength": "20", "durability": "F2"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 3. STRUCTURAL STEEL (G10/110 - STRUCTURAL STEEL SECTIONS)
-- =====================================================================

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'G10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- British Steel - S355JR Sections
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000007',
            v_master_clause_id,
            'British Steel',
            'S355JR Sections',
            '{"steel_grade": "S355JR", "recycled_content_percent": "90+"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Tata Steel - S355JR Sections
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000008',
            v_master_clause_id,
            'Tata Steel',
            'S355JR Sections',
            '{"steel_grade": "S355JR", "recycled_content_percent": "90+"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- 4. CAVITY INSULATION (F30/120 - CAVITY INSULATION)
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
        -- Kingspan - Kooltherm K108 Cavity Board (PIR - high performance)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000009',
            v_master_clause_id,
            'Kingspan',
            'Kooltherm K108 Cavity Board',
            '{"insulation_type": "PIR Board", "manufacturer": "Kingspan", "product_ref": "Kooltherm K108", "conductivity": "0.019"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Rockwool - RW3 Cavity Slabs (Mineral wool - good fire performance)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000000a',
            v_master_clause_id,
            'Rockwool',
            'RW3 Cavity Slabs',
            '{"insulation_type": "Mineral wool batts", "manufacturer": "Rockwool", "product_ref": "RW3", "conductivity": "0.034"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- VERIFICATION QUERIES (For testing/validation)
-- =====================================================================

-- Count products by clause
-- SELECT
--     mc.caws_number,
--     mc.title,
--     COUNT(pl.product_id) AS product_count
-- FROM master_clause mc
-- LEFT JOIN product_library pl ON mc.master_clause_id = pl.master_clause_id
-- WHERE mc.caws_number IN ('E10/110', 'F10/110', 'G10/110', 'F30/120')
-- GROUP BY mc.caws_number, mc.title
-- ORDER BY mc.caws_number;

-- List all products
-- SELECT
--     mc.caws_number,
--     pl.manufacturer,
--     pl.product_name,
--     pl.product_data
-- FROM product_library pl
-- JOIN master_clause mc ON pl.master_clause_id = mc.master_clause_id
-- ORDER BY mc.caws_number, pl.manufacturer;
