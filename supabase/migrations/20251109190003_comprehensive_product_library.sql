-- =====================================================================
-- CAWS Specification Builder v2 - Comprehensive Product Library
-- =====================================================================
-- Populates realistic manufacturer products for all CAWS master clauses
-- Each category has 3-4 products with at least one "greener" option
-- =====================================================================

-- =====================================================================
-- SECTION E: IN SITU CONCRETE
-- =====================================================================

-- ---------------------------------------------------------------------
-- E10/110 - CEMENT (PRESCRIPTIVE)
-- ---------------------------------------------------------------------
-- Existing products: Hanson Regen GGBS (green), Tarmac Standard Portland, CEMEX CEM I
-- Adding: PFA cement option

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Castle Cement - CEM II/B-V (PFA) - Medium-carbon option
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000036',
            v_master_clause_id,
            'Castle Cement',
            'Eurocem PFA',
            '{"cement_type": "CEM II/B-V (PFA)", "manufacturer": "Castle Cement", "product_ref": "Eurocem PFA"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- E10/120 - AGGREGATES (PRESCRIPTIVE)
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Tarmac - Virgin Limestone Aggregates (baseline)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000037',
            v_master_clause_id,
            'Tarmac',
            'Premium Limestone Aggregates',
            '{"coarse_type": "Crushed limestone 20mm", "fine_type": "Natural sand", "recycled_content_percent": "0"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Hanson - Mixed Virgin/Recycled (mid-range)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000038',
            v_master_clause_id,
            'Hanson',
            'EcoMix Aggregates',
            '{"coarse_type": "Blended limestone/recycled concrete 20mm", "fine_type": "Natural sand", "recycled_content_percent": "30"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- CEMEX - High Recycled Content (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000039',
            v_master_clause_id,
            'CEMEX',
            'ReConcrete Aggregate',
            '{"coarse_type": "Recycled concrete aggregates 20mm", "fine_type": "Manufactured sand", "recycled_content_percent": "80"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Aggregate Industries - Granite (high strength)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003a',
            v_master_clause_id,
            'Aggregate Industries',
            'Granite Premium Grade',
            '{"coarse_type": "Crushed granite 20mm", "fine_type": "Granite sand", "recycled_content_percent": "0"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- E10/130 - ADMIXTURES
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'E10/130'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Sika - Standard Superplasticizer
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003b',
            v_master_clause_id,
            'Sika',
            'ViscoCrete-20 HE',
            '{"admixture_type": "Superplasticizer (polycarboxylate)", "manufacturer": "Sika", "product_ref": "ViscoCrete-20 HE", "purpose": "High-range water reduction, workability enhancement"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- BASF - High Performance
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003c',
            v_master_clause_id,
            'BASF',
            'MasterGlenium ACE 430',
            '{"admixture_type": "Superplasticizer (polycarboxylate)", "manufacturer": "BASF", "product_ref": "MasterGlenium ACE 430", "purpose": "Extended workability retention, water reduction"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Chryso - Bio-based (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003d',
            v_master_clause_id,
            'Chryso',
            'Optima Bio 4000',
            '{"admixture_type": "Bio-based superplasticizer", "manufacturer": "Chryso", "product_ref": "Optima Bio 4000", "purpose": "Sustainable water reduction, low environmental impact"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Fosroc - Standard Plasticizer
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003e',
            v_master_clause_id,
            'Fosroc',
            'Conplast SP337',
            '{"admixture_type": "Plasticizer (lignosulphonate)", "manufacturer": "Fosroc", "product_ref": "Conplast SP337", "purpose": "Workability improvement, moderate water reduction"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- SECTION F: MASONRY
-- =====================================================================

-- ---------------------------------------------------------------------
-- F10/110 - FACING BRICKS (PRESCRIPTIVE)
-- ---------------------------------------------------------------------
-- Existing products: Ibstock Red Multi Smooth, Wienerberger Marziale, Forterra Hampton Rural Blend
-- Adding: Reclaimed brick option

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Reclaimed Brick Company - Reclaimed Bricks (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000003f',
            v_master_clause_id,
            'Reclaimed Brick Company',
            'Victorian Red Stock',
            '{"brick_type": "Reclaimed clay facing brick", "manufacturer": "Reclaimed Brick Company", "product_ref": "Victorian Red Stock", "finish": "Weathered", "strength": "25", "durability": "F2"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- F10/120 - COMMON BLOCKWORK
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Celcon - Standard Aircrete (baseline)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001a',
            v_master_clause_id,
            'Celcon',
            'Standard Block',
            '{"block_type": "Aircrete blocks", "manufacturer": "Celcon", "product_ref": "Standard", "strength": "3.6", "density": "600"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Thermalite - High Strength
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001b',
            v_master_clause_id,
            'Thermalite',
            'Hi-Strength 7',
            '{"block_type": "Aircrete blocks", "manufacturer": "Thermalite", "product_ref": "Hi-Strength 7", "strength": "7.3", "density": "750"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Lignacite - Recycled Aggregate (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001c',
            v_master_clause_id,
            'Lignacite',
            'Ecoblock',
            '{"block_type": "Concrete blocks (recycled aggregate)", "manufacturer": "Lignacite", "product_ref": "Ecoblock", "strength": "3.6", "density": "1350"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- H+H - Thin Joint Aircrete
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001d',
            v_master_clause_id,
            'H+H',
            'Celcon Thin Joint',
            '{"block_type": "Aircrete blocks (thin joint)", "manufacturer": "H+H", "product_ref": "Celcon Thin Joint", "strength": "3.6", "density": "600"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- F10/220 - MORTAR (PRESCRIPTIVE)
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F10/220'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Standard Portland Cement Mortar (baseline)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001e',
            v_master_clause_id,
            'Tarmac',
            'Mortar Mix M4',
            '{"designation": "M4", "cement_type": "CEM I (Portland)", "sand_type": "Building sand", "admixture_type": "None"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- GGBS Mortar (mid-range)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000001f',
            v_master_clause_id,
            'Hanson',
            'EcoMortar M4',
            '{"designation": "M4", "cement_type": "CEM III/A (GGBS)", "sand_type": "Building sand", "admixture_type": "Plasticizer"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Lime Mortar (green option - traditional/low carbon)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000020',
            v_master_clause_id,
            'Ty-Mawr',
            'NHL 3.5 Lime Mortar',
            '{"designation": "iii (lime-based)", "cement_type": "NHL 3.5 (Natural hydraulic lime)", "sand_type": "Sharp sand", "admixture_type": "None"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Polymer Modified (high performance)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000021',
            v_master_clause_id,
            'Weber',
            'Webermortar M4+',
            '{"designation": "M4", "cement_type": "CEM I (Portland)", "sand_type": "Graded sand", "admixture_type": "Polymer modifier"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- F30/110 - WALL TIES
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F30/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Ancon - Stainless Steel (baseline high-spec)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000022',
            v_master_clause_id,
            'Ancon',
            'Type 2 Wall Tie (304 SS)',
            '{"tie_type": "Type 2 (twist)", "material": "Stainless steel 304", "manufacturer": "Ancon", "product_ref": "WTA200"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Simpson Strong-Tie - Stainless Steel
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000023',
            v_master_clause_id,
            'Simpson Strong-Tie',
            'Type 2 Cavity Tie SS',
            '{"tie_type": "Type 2 (butterfly)", "material": "Stainless steel 316", "manufacturer": "Simpson Strong-Tie", "product_ref": "CT2-316"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Ancon - Recycled Steel Content (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000024',
            v_master_clause_id,
            'Ancon',
            'EcoTie Type 2 (Recycled SS)',
            '{"tie_type": "Type 2 (twist)", "material": "Stainless steel 304 (90% recycled)", "manufacturer": "Ancon", "product_ref": "WTA200-ECO"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Catnic - Galvanised Steel (economy option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000025',
            v_master_clause_id,
            'Catnic',
            'Type 2 Wall Tie (Galv)',
            '{"tie_type": "Type 2 (vertical twist)", "material": "Galvanized steel", "manufacturer": "Catnic", "product_ref": "WT2-GALV"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- F30/120 - CAVITY INSULATION
-- ---------------------------------------------------------------------
-- Existing products: Kingspan Kooltherm K108 (PIR), Rockwool RW3 (Mineral wool)
-- Adding: Natural fiber options

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'F30/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Steico - Wood Fibre (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000026',
            v_master_clause_id,
            'Steico',
            'STEICOprotect Wood Fibre',
            '{"insulation_type": "Wood fibre board", "manufacturer": "Steico", "product_ref": "STEICOprotect", "conductivity": "0.040"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Knauf - Glass Wool
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000027',
            v_master_clause_id,
            'Knauf',
            'Cavity Slab 32',
            '{"insulation_type": "Glass wool batts", "manufacturer": "Knauf", "product_ref": "Cavity Slab 32", "conductivity": "0.032"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- SECTION G: STRUCTURAL STEEL/TIMBER
-- =====================================================================

-- ---------------------------------------------------------------------
-- G10/110 - STRUCTURAL STEEL SECTIONS
-- ---------------------------------------------------------------------
-- Existing products: British Steel S355JR, Tata Steel S355JR
-- Adding: More options with explicit recycled content

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'G10/110'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- ArcelorMittal - High Recycled Content (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000028',
            v_master_clause_id,
            'ArcelorMittal',
            'XCarb Recycled S355JR',
            '{"steel_grade": "S355JR", "recycled_content_percent": "95+"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Celsa Steel - Electric Arc Furnace (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000029',
            v_master_clause_id,
            'Celsa Steel',
            'S355JR EAF Sections',
            '{"steel_grade": "S355JR", "recycled_content_percent": "100 (EAF)"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- G10/310 - PROTECTIVE COATINGS - PRIMER
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'G10/310'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- International - Standard Epoxy
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002a',
            v_master_clause_id,
            'International',
            'Interzinc 22',
            '{"prep_grade": "Sa 2.5", "primer_type": "Zinc-rich epoxy", "manufacturer": "International", "product_ref": "Interzinc 22"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Jotun - High Build
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002b',
            v_master_clause_id,
            'Jotun',
            'Jotamastic 87',
            '{"prep_grade": "Sa 2.5", "primer_type": "Epoxy mastic", "manufacturer": "Jotun", "product_ref": "Jotamastic 87"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Hempel - Low VOC Water-Based (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002c',
            v_master_clause_id,
            'Hempel',
            'Hempadur Avantguard 750',
            '{"prep_grade": "Sa 2.5", "primer_type": "Water-based epoxy (low VOC)", "manufacturer": "Hempel", "product_ref": "Hempadur Avantguard 750"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Rust-Oleum - Standard
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002d',
            v_master_clause_id,
            'Rust-Oleum',
            'Mathys Noxyde',
            '{"prep_grade": "Sa 2", "primer_type": "Alkyd primer", "manufacturer": "Rust-Oleum", "product_ref": "Noxyde"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- G20/100 - STRUCTURAL TIMBER FRAME
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'G20/100'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- BSW Timber - FSC Certified (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002e',
            v_master_clause_id,
            'BSW Timber',
            'FSC C24 Softwood',
            '{"frame_type": "Platform frame", "timber_species": "Softwood C24", "certification": "FSC 100% Certified"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- James Jones & Sons - PEFC Certified
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-00000000002f',
            v_master_clause_id,
            'James Jones & Sons',
            'PEFC C24 Structural',
            '{"frame_type": "Platform frame", "timber_species": "Softwood C24", "certification": "PEFC Certified"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Stora Enso - Glulam Certified (green option - engineered)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000030',
            v_master_clause_id,
            'Stora Enso',
            'FSC Glulam GL24h',
            '{"frame_type": "Glulam frame", "timber_species": "Glulam GL24h", "certification": "FSC 100% Certified"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Arnold Laver - Standard C16
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000031',
            v_master_clause_id,
            'Arnold Laver',
            'C16 Structural Softwood',
            '{"frame_type": "Platform frame", "timber_species": "Softwood C16", "certification": "PEFC Certified"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- G20/120 - TIMBER PRESERVATION
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_master_clause_id UUID;
BEGIN
    SELECT master_clause_id INTO v_master_clause_id
    FROM master_clause
    WHERE caws_number = 'G20/120'
    LIMIT 1;

    IF v_master_clause_id IS NOT NULL THEN
        -- Osmose - Copper-based (standard)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000032',
            v_master_clause_id,
            'Osmose',
            'Tanalith E',
            '{"treatment_type": "Copper-based preservative", "use_class": "UC3 (External)", "provider": "Osmose"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Lonza - High Performance
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000033',
            v_master_clause_id,
            'Lonza',
            'Vacsol Azure',
            '{"treatment_type": "Organic biocide", "use_class": "UC3 (External)", "provider": "Lonza"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- Natural Wood Preservative - Low VOC (green option)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000034',
            v_master_clause_id,
            'Osmo',
            'WR Base Coat',
            '{"treatment_type": "Water-based natural oil (low VOC)", "use_class": "UC2 (Internal/covered)", "provider": "Osmo"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;

        -- No Treatment Option (green - design out need)
        INSERT INTO product_library (product_id, master_clause_id, manufacturer, product_name, product_data)
        VALUES (
            '60000000-0000-0000-0000-000000000035',
            v_master_clause_id,
            'N/A',
            'No Treatment (UC1)',
            '{"treatment_type": "None (design ensures UC1 conditions)", "use_class": "UC1 (Internal dry)", "provider": "N/A"}'::jsonb
        )
        ON CONFLICT (master_clause_id, manufacturer, product_name) DO NOTHING;
    END IF;
END $$;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Count products by clause
-- SELECT
--     mc.caws_number,
--     mc.title,
--     COUNT(pl.product_id) AS product_count,
--     STRING_AGG(pl.manufacturer, ', ' ORDER BY pl.manufacturer) AS manufacturers
-- FROM master_clause mc
-- LEFT JOIN product_library pl ON mc.master_clause_id = pl.master_clause_id
-- WHERE mc.caws_number IN (
--     'E10/110', 'E10/120', 'E10/130',
--     'F10/110', 'F10/120', 'F10/220', 'F30/110', 'F30/120',
--     'G10/110', 'G10/310', 'G20/100', 'G20/120'
-- )
-- GROUP BY mc.caws_number, mc.title
-- ORDER BY mc.caws_number;

-- List all products with their green characteristics
-- SELECT
--     mc.caws_number,
--     mc.title,
--     pl.manufacturer,
--     pl.product_name,
--     pl.product_data::text LIKE '%recycled%' OR
--     pl.product_data::text LIKE '%FSC%' OR
--     pl.product_data::text LIKE '%reclaimed%' OR
--     pl.product_data::text LIKE '%GGBS%' OR
--     pl.product_data::text LIKE '%low VOC%' OR
--     pl.product_data::text LIKE '%lime%' OR
--     pl.product_data::text LIKE '%wood fibre%' OR
--     pl.product_data::text LIKE '%Bio%' AS is_green_option
-- FROM product_library pl
-- JOIN master_clause mc ON pl.master_clause_id = mc.master_clause_id
-- WHERE mc.caws_number IN (
--     'E10/110', 'E10/120', 'E10/130',
--     'F10/110', 'F10/120', 'F10/220', 'F30/110', 'F30/120',
--     'G10/110', 'G10/310', 'G20/100', 'G20/120'
-- )
-- ORDER BY mc.caws_number, pl.manufacturer;
