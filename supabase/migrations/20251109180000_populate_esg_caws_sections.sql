-- =====================================================================
-- CAWS Specification Builder v2 - ESG Priority Sections Data
-- =====================================================================
-- Population data for E (Concrete), F (Masonry), and G (Structural Steel/Timber)
-- These sections demonstrate value to RIBA Stage 2-4 architects
-- and cover high-carbon impact building fabric items
-- =====================================================================

-- =====================================================================
-- 1. MASTER WORK SECTIONS - ESG PRIORITY SECTIONS
-- =====================================================================

-- Section E: In situ concrete
INSERT INTO master_work_section (work_section_id, organisation_id, caws_group, caws_code, title, description, sort_order)
VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'E',
        'E10',
        'Mixing / casting / curing in situ concrete',
        'In-situ concrete mixing, casting, and curing - high ESG impact',
        40
    ),
    (
        '40000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'E',
        'E30',
        'Reinforcement for in situ concrete',
        'Steel reinforcement for concrete structures',
        42
    )
ON CONFLICT (organisation_id, caws_code) DO NOTHING;

-- Section G: Structural steel/timber framing
INSERT INTO master_work_section (work_section_id, organisation_id, caws_group, caws_code, title, description, sort_order)
VALUES
    (
        '40000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'G',
        'G10',
        'Structural steel framing',
        'Structural steel frames - key competitor to timber, high ESG impact',
        130
    ),
    (
        '40000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'G',
        'G20',
        'Carpentry / Timber framing / First fixing',
        'Structural timber frames and carpentry - sustainable alternative to steel',
        135
    )
ON CONFLICT (organisation_id, caws_code) DO NOTHING;

-- =====================================================================
-- 2. MASTER CLAUSES - E10: MIXING/CASTING/CURING IN SITU CONCRETE
-- =====================================================================

INSERT INTO master_clause (
    master_clause_id,
    work_section_id,
    caws_number,
    title,
    body_template,
    field_definitions,
    guidance_text,
    contract_type_id,
    sort_order
)
VALUES
    -- E10/100 - PERFORMANCE - CONCRETE
    (
        '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001',
        'E10/100',
        'PERFORMANCE - CONCRETE',
        E'**Required Strength:** Concrete must achieve a minimum characteristic strength of {{strength_class}} (e.g., ''C30/37'') to BS EN 206.\n**Intended Working Life:** {{working_life}} years.\n**Exposure Class:** {{exposure_class}} (e.g., ''XC1'').',
        '[
            {"name": "strength_class", "type": "text", "label": "Strength Class", "placeholder": "e.g., C30/37", "required": true},
            {"name": "working_life", "type": "text", "label": "Intended Working Life (years)", "placeholder": "e.g., 50", "required": true},
            {"name": "exposure_class", "type": "text", "label": "Exposure Class", "placeholder": "e.g., XC1, XC3, XD1", "required": true}
        ]'::jsonb,
        '(RIBA Stage 2/3): Use this clause for an ''outline'' or ''performance'' specification. This defines *what* the concrete must do, leaving the *how* (the mix design) to the contractor.',
        NULL,
        10
    ),

    -- E10/110 - CEMENT (PRESCRIPTIVE)
    (
        '50000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000001',
        'E10/110',
        'CEMENT (PRESCRIPTIVE)',
        E'**Type:** {{cement_type}} to BS EN 197-1.\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.',
        '[
            {"name": "cement_type", "type": "text", "label": "Cement Type", "placeholder": "e.g., CEM I (Portland), CEM II, CEM III (GGBS)", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Hanson, Cemex", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code or reference", "required": false}
        ]'::jsonb,
        '(RIBA Stage 4): Use this clause for a ''prescriptive'' specification. This is the **key ESG clause**. Specifying ''CEM I'' (Portland Cement) is the high-carbon default. Our AI will suggest changing this to ''CEM II'' or ''CEM III'' (GGBS), which is already in your esg_material_library.',
        NULL,
        20
    ),

    -- E10/120 - AGGREGATES (PRESCRIPTIVE)
    (
        '50000000-0000-0000-0000-000000000003',
        '40000000-0000-0000-0000-000000000001',
        'E10/120',
        'AGGREGATES (PRESCRIPTIVE)',
        E'**Coarse Aggregate:** {{coarse_type}} to BS EN 12620.\n**Fine Aggregate:** {{fine_type}} to BS EN 12620.\n**Recycled Content:** Minimum {{recycled_content_percent}}% recycled or secondary aggregates.',
        '[
            {"name": "coarse_type", "type": "text", "label": "Coarse Aggregate Type", "placeholder": "e.g., Crushed limestone, Recycled concrete", "required": true},
            {"name": "fine_type", "type": "text", "label": "Fine Aggregate Type", "placeholder": "e.g., Natural sand, Manufactured sand", "required": true},
            {"name": "recycled_content_percent", "type": "text", "label": "Minimum Recycled Content (%)", "placeholder": "e.g., 50", "required": true}
        ]'::jsonb,
        '(RIBA Stage 4): This clause has a high ESG impact. To reduce embodied carbon, specify a minimum percentage of recycled content (e.g., ''50%'') for aggregates.',
        NULL,
        30
    ),

    -- E10/130 - ADMIXTURES
    (
        '50000000-0000-0000-0000-000000000004',
        '40000000-0000-0000-0000-000000000001',
        'E10/130',
        'ADMIXTURES',
        E'**Type:** {{admixture_type}} to BS EN 934-2.\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.\n**Purpose:** {{purpose}} (e.g., ''Water-reducing'', ''Superplasticizer'').',
        '[
            {"name": "admixture_type", "type": "text", "label": "Admixture Type", "placeholder": "e.g., Plasticizer, Superplasticizer", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Sika, BASF", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false},
            {"name": "purpose", "type": "text", "label": "Purpose", "placeholder": "e.g., Water-reducing, Workability enhancement", "required": true}
        ]'::jsonb,
        'Admixtures can improve performance and workability. They are also key to using low-carbon cement replacements like GGBS, which may have different workability or curing times.',
        NULL,
        40
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 3. MASTER CLAUSES - F10: BRICK / BLOCK WALLING
-- =====================================================================

INSERT INTO master_clause (
    master_clause_id,
    work_section_id,
    caws_number,
    title,
    body_template,
    field_definitions,
    guidance_text,
    contract_type_id,
    sort_order
)
VALUES
    -- F10/100 - PERFORMANCE - EXTERNAL MASONRY WALLS
    (
        '50000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/100',
        'PERFORMANCE - EXTERNAL MASONRY WALLS',
        E'**Thermal Transmittance:** Must achieve an average U-value of {{u_value}} W/m²K.\n**Acoustic Performance:** {{acoustic_rating}} dB (min) airborne sound resistance.\n**Fire Resistance:** {{fire_rating}} (REI) minutes.',
        '[
            {"name": "u_value", "type": "text", "label": "U-value (W/m²K)", "placeholder": "e.g., 0.18", "required": true},
            {"name": "acoustic_rating", "type": "text", "label": "Acoustic Rating (dB)", "placeholder": "e.g., 45", "required": true},
            {"name": "fire_rating", "type": "text", "label": "Fire Resistance (REI minutes)", "placeholder": "e.g., 60", "required": true}
        ]'::jsonb,
        '(RIBA Stage 2/3): This performance-based clause is ideal for Stage 2/3. It sets the targets for the wall "system" before you have selected the exact products.',
        NULL,
        5
    ),

    -- F10/110 - FACING BRICKS (PRESCRIPTIVE)
    (
        '50000000-0000-0000-0000-000000000006',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/110',
        'FACING BRICKS (PRESCRIPTIVE)',
        E'**Type:** {{brick_type}} (e.g., ''Clay facing bricks'', ''Reclaimed clay bricks'').\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.\n**Colour / Finish:** {{finish}}.\n**Strength:** {{strength}} N/mm².\n**Durability:** {{durability}} (e.g., ''F2'').',
        '[
            {"name": "brick_type", "type": "text", "label": "Brick Type", "placeholder": "e.g., Clay facing bricks, Reclaimed clay bricks", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Ibstock, Forterra", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false},
            {"name": "finish", "type": "text", "label": "Colour / Finish", "placeholder": "e.g., Red multi, Smooth", "required": true},
            {"name": "strength", "type": "text", "label": "Compressive Strength (N/mm²)", "placeholder": "e.g., 20", "required": true},
            {"name": "durability", "type": "text", "label": "Durability Class", "placeholder": "e.g., F2", "required": true}
        ]'::jsonb,
        '(RIBA Stage 4): This is the prescriptive clause for the bricks themselves. A key ESG suggestion will be triggered if you specify a standard ''Clay facing brick''. The AI will suggest ''Reclaimed Bricks'', which is in your esg_material_library.',
        NULL,
        15
    ),

    -- F10/120 - COMMON BLOCKWORK
    (
        '50000000-0000-0000-0000-000000000007',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/120',
        'COMMON BLOCKWORK',
        E'**Type:** {{block_type}} (e.g., ''Concrete blocks'').\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.\n**Strength:** {{strength}} N/mm².\n**Density:** {{density}} kg/m³.',
        '[
            {"name": "block_type", "type": "text", "label": "Block Type", "placeholder": "e.g., Concrete blocks, Aircrete blocks", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Celcon, Thermalite", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false},
            {"name": "strength", "type": "text", "label": "Compressive Strength (N/mm²)", "placeholder": "e.g., 3.6", "required": true},
            {"name": "density", "type": "text", "label": "Density (kg/m³)", "placeholder": "e.g., 600", "required": true}
        ]'::jsonb,
        'This is for the inner leaf of a cavity wall or internal partitions. The density has a major impact on thermal mass and acoustic performance.',
        NULL,
        25
    ),

    -- F10/220 - MORTAR (PRESCRIPTIVE)
    (
        '50000000-0000-0000-0000-000000000008',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/220',
        'MORTAR (PRESCRIPTIVE)',
        E'**Mortar Designation:** {{designation}} (e.g., ''iii'' or ''M4'').\n**Cement:** {{cement_type}} (e.g., ''CEM I'' or ''Lime'').\n**Sand:** {{sand_type}} to BS EN 13139.\n**Admixtures:** {{admixture_type}}.',
        '[
            {"name": "designation", "type": "text", "label": "Mortar Designation", "placeholder": "e.g., iii, M4, M6", "required": true},
            {"name": "cement_type", "type": "text", "label": "Cement Type", "placeholder": "e.g., CEM I, Lime", "required": true},
            {"name": "sand_type", "type": "text", "label": "Sand Type", "placeholder": "e.g., Building sand, Sharp sand", "required": true},
            {"name": "admixture_type", "type": "text", "label": "Admixtures", "placeholder": "e.g., None, Plasticizer", "required": false}
        ]'::jsonb,
        '(RIBA Stage 4): A major ESG clause. Specifying ''CEM I'' (Portland Cement) is the high-carbon default. The AI should suggest ''Lime'' as a low-carbon alternative. Note: This is often cross-referenced from section Z21, but is included here for clarity.',
        NULL,
        35
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 4. MASTER CLAUSES - F30: ACCESSORIES / SUNDRY ITEMS
-- =====================================================================

INSERT INTO master_clause (
    master_clause_id,
    work_section_id,
    caws_number,
    title,
    body_template,
    field_definitions,
    guidance_text,
    contract_type_id,
    sort_order
)
VALUES
    -- F30/110 - WALL TIES
    (
        '50000000-0000-0000-0000-000000000009',
        '20000000-0000-0000-0000-0000000000f3',
        'F30/110',
        'WALL TIES',
        E'**Type:** {{tie_type}} to BS EN 845-1 (e.g., ''Type 2'' for external cavity).\n**Material:** {{material}} (e.g., ''Stainless steel'').\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.',
        '[
            {"name": "tie_type", "type": "text", "label": "Wall Tie Type", "placeholder": "e.g., Type 2, Type 4", "required": true},
            {"name": "material", "type": "text", "label": "Material", "placeholder": "e.g., Stainless steel, Galvanized steel", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Ancon, Simpson Strong-Tie", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false}
        ]'::jsonb,
        'Wall ties are a crucial cross-reference for Section F10. An architect must specify these alongside the brick and block.',
        NULL,
        10
    ),

    -- F30/120 - CAVITY INSULATION
    (
        '50000000-0000-0000-0000-00000000000a',
        '20000000-0000-0000-0000-0000000000f3',
        'F30/120',
        'CAVITY INSULATION',
        E'**Type:** {{insulation_type}} (e.g., ''Full-fill mineral wool batts'', ''PIR board'').\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.\n**Thermal Conductivity:** {{conductivity}} W/mK (max).',
        '[
            {"name": "insulation_type", "type": "text", "label": "Insulation Type", "placeholder": "e.g., Full-fill mineral wool batts, PIR board, Wood fibre", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., Rockwool, Kingspan, Steico", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false},
            {"name": "conductivity", "type": "text", "label": "Thermal Conductivity (W/mK)", "placeholder": "e.g., 0.035", "required": true}
        ]'::jsonb,
        'This is the main component for meeting the F10/100 U-value. The ''Green Option'' here relates to the material (e.g., ''Mineral Wool'' vs. ''PIR'' vs. ''Wood Fibre'').',
        NULL,
        20
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 5. MASTER CLAUSES - G10: STRUCTURAL STEEL FRAMING
-- =====================================================================

INSERT INTO master_clause (
    master_clause_id,
    work_section_id,
    caws_number,
    title,
    body_template,
    field_definitions,
    guidance_text,
    contract_type_id,
    sort_order
)
VALUES
    -- G10/100 - PERFORMANCE - STRUCTURAL FRAME
    (
        '50000000-0000-0000-0000-00000000000b',
        '40000000-0000-0000-0000-000000000003',
        'G10/100',
        'PERFORMANCE - STRUCTURAL FRAME',
        E'**Design:** Complete structural frame design to be by Structural Engineer.\n**Standards:** Comply with BS EN 1993.\n**Fire Resistance:** {{fire_rating}} (R) minutes.',
        '[
            {"name": "fire_rating", "type": "text", "label": "Fire Resistance (R minutes)", "placeholder": "e.g., 60, 90, 120", "required": true}
        ]'::jsonb,
        '(RIBA Stage 2/3): The architect uses this clause to delegate the performance requirements of the frame to the structural engineer.',
        NULL,
        10
    ),

    -- G10/110 - STRUCTURAL STEEL SECTIONS
    (
        '50000000-0000-0000-0000-00000000000c',
        '40000000-0000-0000-0000-000000000003',
        'G10/110',
        'STRUCTURAL STEEL SECTIONS',
        E'**Steel:** To BS EN 10025.\n**Grade:** {{steel_grade}} (e.g., ''S355JR'').\n**Recycled Content:** Minimum {{recycled_content_percent}}% (EAF).',
        '[
            {"name": "steel_grade", "type": "text", "label": "Steel Grade", "placeholder": "e.g., S275JR, S355JR", "required": true},
            {"name": "recycled_content_percent", "type": "text", "label": "Minimum Recycled Content (%)", "placeholder": "e.g., 90", "required": true}
        ]'::jsonb,
        '(RIBA Stage 4): The key prescriptive clause for steel. Your esg_material_library lists ''Virgin Steel'' and ''Recycled Steel''. Specifying a minimum recycled content (e.g., ''90%'') ensures the low-carbon option is used.',
        NULL,
        20
    ),

    -- G10/310 - PROTECTIVE COATINGS - PRIMER
    (
        '50000000-0000-0000-0000-00000000000d',
        '40000000-0000-0000-0000-000000000003',
        'G10/310',
        'PROTECTIVE COATINGS - PRIMER',
        E'**Surface Preparation:** To BS EN ISO 8501-1, grade {{prep_grade}}.\n**Primer System:** {{primer_type}} (e.g., ''Zinc-rich primer'').\n**Manufacturer:** {{manufacturer}}.\n**Product Reference:** {{product_ref}}.',
        '[
            {"name": "prep_grade", "type": "text", "label": "Surface Preparation Grade", "placeholder": "e.g., Sa 2.5", "required": true},
            {"name": "primer_type", "type": "text", "label": "Primer Type", "placeholder": "e.g., Zinc-rich primer, Epoxy primer", "required": true},
            {"name": "manufacturer", "type": "text", "label": "Manufacturer", "placeholder": "e.g., International, Jotun", "required": true},
            {"name": "product_ref", "type": "text", "label": "Product Reference", "placeholder": "Product code", "required": false}
        ]'::jsonb,
        'Details the shop-applied primer. Some primers have high VOCs (Volatile Organic Compounds), which is another "Green Option" (low-VOC) for the AI to suggest.',
        NULL,
        30
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 6. MASTER CLAUSES - G20: CARPENTRY / TIMBER FRAMING / FIRST FIXING
-- =====================================================================

INSERT INTO master_clause (
    master_clause_id,
    work_section_id,
    caws_number,
    title,
    body_template,
    field_definitions,
    guidance_text,
    contract_type_id,
    sort_order
)
VALUES
    -- G20/100 - STRUCTURAL TIMBER FRAME
    (
        '50000000-0000-0000-0000-00000000000e',
        '40000000-0000-0000-0000-000000000004',
        'G20/100',
        'STRUCTURAL TIMBER FRAME',
        E'**Type:** {{frame_type}} (e.g., ''Platform frame'', ''Glulam frame'').\n**Timber:** {{timber_species}} (e.g., ''Softwood C16/C24'').\n**Source:** Must be {{certification}} (e.g., ''FSC Certified'' or ''PEFC Certified'').',
        '[
            {"name": "frame_type", "type": "text", "label": "Frame Type", "placeholder": "e.g., Platform frame, Glulam frame", "required": true},
            {"name": "timber_species", "type": "text", "label": "Timber Species/Grade", "placeholder": "e.g., Softwood C16, C24, GL24h", "required": true},
            {"name": "certification", "type": "text", "label": "Sustainability Certification", "placeholder": "e.g., FSC Certified, PEFC Certified", "required": true}
        ]'::jsonb,
        '(RIBA Stage 4): A critical ESG clause. The main "green" aspect here is **sourcing**. The certification field is non-negotiable for sustainability. This is the main competitor to G10.',
        NULL,
        10
    ),

    -- G20/120 - TIMBER PRESERVATION
    (
        '50000000-0000-0000-0000-00000000000f',
        '40000000-0000-0000-0000-000000000004',
        'G20/120',
        'TIMBER PRESERVATION',
        E'**Treatment:** {{treatment_type}} to BS 8417.\n**Use Class:** {{use_class}}.\n**Provider:** {{provider}}.',
        '[
            {"name": "treatment_type", "type": "text", "label": "Treatment Type", "placeholder": "e.g., Water-based preservative, None (if not required)", "required": true},
            {"name": "use_class", "type": "text", "label": "Use Class", "placeholder": "e.g., UC1, UC2, UC3", "required": true},
            {"name": "provider", "type": "text", "label": "Treatment Provider", "placeholder": "e.g., Osmose, Lonza", "required": false}
        ]'::jsonb,
        'Ensure the treatment specified is appropriate for the use (e.g., internal, external, ground contact) and avoids high-VOC or toxic chemicals where possible.',
        NULL,
        20
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- VERIFICATION QUERIES (For testing/validation)
-- =====================================================================

-- Count all work sections and clauses
-- SELECT
--     (SELECT COUNT(*) FROM master_work_section) AS total_work_sections,
--     (SELECT COUNT(*) FROM master_clause) AS total_clauses;

-- List all ESG priority sections
-- SELECT caws_code, title, description
-- FROM master_work_section
-- WHERE caws_group IN ('E', 'F', 'G')
-- ORDER BY caws_group, sort_order;

-- List all clauses by section
-- SELECT
--     mws.caws_code,
--     mc.caws_number,
--     mc.title,
--     LENGTH(mc.guidance_text) AS guidance_length
-- FROM master_clause mc
-- JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
-- WHERE mws.caws_group IN ('E', 'F', 'G')
-- ORDER BY mws.caws_code, mc.sort_order;
