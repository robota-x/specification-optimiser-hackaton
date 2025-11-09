-- =====================================================================
-- CAWS Specification Builder v2 - Seed Data
-- =====================================================================
-- Sample CAWS master library data based on UK specification standards
-- =====================================================================

-- =====================================================================
-- 1. SAMPLE ORGANISATION
-- =====================================================================

INSERT INTO organisation (organisation_id, name)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Sample Architecture Practice')
ON CONFLICT (organisation_id) DO NOTHING;

-- =====================================================================
-- 2. CONTRACT TYPES (For Preliminaries - Section A)
-- =====================================================================

INSERT INTO contract_type (contract_type_id, organisation_id, code, name, description)
VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'JCT_SBC_2016',
        'JCT Standard Building Contract 2016',
        'Standard form of building contract for large-scale projects'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'JCT_MWD_2016',
        'JCT Minor Works Building Contract 2016',
        'Suitable for smaller building works'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'JCT_ICD_2016',
        'JCT Intermediate Building Contract 2016',
        'For medium-sized construction projects'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'NEC4_ECC',
        'NEC4 Engineering and Construction Contract',
        'NEC suite for infrastructure and engineering projects'
    )
ON CONFLICT (organisation_id, code) DO NOTHING;

-- =====================================================================
-- 3. MASTER WORK SECTIONS
-- =====================================================================

-- Section A: Preliminaries/General conditions
INSERT INTO master_work_section (work_section_id, organisation_id, caws_group, caws_code, title, description, sort_order)
VALUES
    (
        '20000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-000000000001',
        'A',
        'A10',
        'Project particulars',
        'General project information and particulars',
        10
    ),
    (
        '20000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-000000000001',
        'A',
        'A20',
        'The contract/subcontract',
        'Contract conditions and legal framework',
        20
    ),
    (
        '20000000-0000-0000-0000-00000000000c',
        '00000000-0000-0000-0000-000000000001',
        'A',
        'A30',
        'Tendering/subletting/supply',
        'Tendering procedures and subcontracting arrangements',
        30
    )
ON CONFLICT (organisation_id, caws_code) DO NOTHING;

-- Section F: Masonry
INSERT INTO master_work_section (work_section_id, organisation_id, caws_group, caws_code, title, description, sort_order)
VALUES
    (
        '20000000-0000-0000-0000-0000000000f1',
        '00000000-0000-0000-0000-000000000001',
        'F',
        'F10',
        'Brick/block walling',
        'Clay and concrete bricks, blocks and associated work',
        100
    ),
    (
        '20000000-0000-0000-0000-0000000000f2',
        '00000000-0000-0000-0000-000000000001',
        'F',
        'F20',
        'Natural stone rubble walling',
        'Random rubble and coursed rubble walling',
        110
    ),
    (
        '20000000-0000-0000-0000-0000000000f3',
        '00000000-0000-0000-0000-000000000001',
        'F',
        'F30',
        'Accessories/sundry items for brick/block/stone walling',
        'DPCs, wall ties, insulation, reinforcement',
        120
    )
ON CONFLICT (organisation_id, caws_code) DO NOTHING;

-- Section M: Floor, wall, ceiling and roof finishes
INSERT INTO master_work_section (work_section_id, organisation_id, caws_group, caws_code, title, description, sort_order)
VALUES
    (
        '20000000-0000-0000-0000-0000000000m1',
        '00000000-0000-0000-0000-000000000001',
        'M',
        'M10',
        'Cement:sand/concrete/granolithic screeds/toppings',
        'Screeds and toppings for floors',
        200
    ),
    (
        '20000000-0000-0000-0000-0000000000m2',
        '00000000-0000-0000-0000-000000000001',
        'M',
        'M20',
        'Plastered/rendered/roughcast coatings',
        'Internal plastering and external rendering',
        210
    ),
    (
        '20000000-0000-0000-0000-0000000000m4',
        '00000000-0000-0000-0000-000000000001',
        'M',
        'M40',
        'Stone/concrete/quarry/ceramic tiling/mosaic',
        'Tiling and mosaic finishes',
        230
    )
ON CONFLICT (organisation_id, caws_code) DO NOTHING;

-- =====================================================================
-- 4. MASTER CLAUSES - SECTION A (PRELIMINARIES)
-- =====================================================================
-- These clauses are linked to contract_type_id and auto-populate new projects

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
    -- A10/110 - PROJECT
    (
        '30000000-0000-0000-0000-0000000000a1',
        '20000000-0000-0000-0000-00000000000a',
        'A10/110',
        'PROJECT',
        E'Project name: {{project_name}}\nProject location: {{project_location}}\nEmployer: {{employer_name}}\nClient: {{client_name}}',
        '[
            {"name": "project_name", "type": "text", "label": "Project Name", "placeholder": "Enter project name", "required": true},
            {"name": "project_location", "type": "textarea", "label": "Project Location", "placeholder": "Enter full project address", "required": true},
            {"name": "employer_name", "type": "text", "label": "Employer", "placeholder": "Enter employer name", "required": true},
            {"name": "client_name", "type": "text", "label": "Client", "placeholder": "Enter client name", "required": false}
        ]'::jsonb,
        'Provide the key project identification details. The Employer is the party commissioning the work.',
        '10000000-0000-0000-0000-000000000001', -- JCT_SBC_2016
        10
    ),

    -- A10/120 - DRAWINGS
    (
        '30000000-0000-0000-0000-0000000000a2',
        '20000000-0000-0000-0000-00000000000a',
        'A10/120',
        'DRAWINGS',
        E'The following drawings form part of the contract documentation:\n\n{{drawing_list}}',
        '[
            {"name": "drawing_list", "type": "list", "label": "Drawing Numbers", "placeholder": "e.g., A-001 Rev P3", "required": true}
        ]'::jsonb,
        'List all drawings that form part of the contract. Include revision numbers.',
        '10000000-0000-0000-0000-000000000001', -- JCT_SBC_2016
        20
    ),

    -- A20/110 - CONTRACT
    (
        '30000000-0000-0000-0000-0000000000a3',
        '20000000-0000-0000-0000-00000000000b',
        'A20/110',
        'THE CONTRACT',
        E'Form of contract: JCT Standard Building Contract 2016\nContract type: {{contract_variant}}\nSectional completion: {{sectional_completion}}',
        '[
            {"name": "contract_variant", "type": "text", "label": "Contract Variant", "placeholder": "e.g., With Quantities, With Approximate Quantities", "required": true},
            {"name": "sectional_completion", "type": "text", "label": "Sectional Completion", "placeholder": "Yes/No", "required": true}
        ]'::jsonb,
        'Specify the JCT contract variant and whether sectional completion applies.',
        '10000000-0000-0000-0000-000000000001', -- JCT_SBC_2016
        30
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 5. MASTER CLAUSES - SECTION F (MASONRY)
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
    -- F10/120 - FACING BRICKS
    (
        '30000000-0000-0000-0000-0000000000f1',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/120',
        'FACING BRICKS',
        E'Facing bricks: {{product_name}}. To {{standard}}.\n\nSize: {{brick_size}}\nColour/texture: {{colour_texture}}\nCompressive strength: {{compressive_strength}}\n\nBedding: {{bedding_type}} in {{mortar_designation}} mortar to {{mortar_standard}}.\nJointing: {{jointing_type}}.',
        '[
            {"name": "product_name", "type": "text", "label": "Product Name", "placeholder": "e.g., Ibstock Red Multi Stock", "required": true},
            {"name": "standard", "type": "text", "label": "British Standard", "placeholder": "e.g., BS EN 771-1", "required": true},
            {"name": "brick_size", "type": "text", "label": "Brick Size", "placeholder": "e.g., 215 x 102.5 x 65mm", "required": true},
            {"name": "colour_texture", "type": "text", "label": "Colour/Texture", "placeholder": "e.g., Red multi smooth", "required": true},
            {"name": "compressive_strength", "type": "text", "label": "Compressive Strength", "placeholder": "e.g., Minimum 20 N/mm²", "required": true},
            {"name": "bedding_type", "type": "text", "label": "Bedding Type", "placeholder": "e.g., Stretcher bond, English bond", "required": true},
            {"name": "mortar_designation", "type": "text", "label": "Mortar Designation", "placeholder": "e.g., M4, M6, M12", "required": true},
            {"name": "mortar_standard", "type": "text", "label": "Mortar Standard", "placeholder": "e.g., BS EN 998-2", "required": true},
            {"name": "jointing_type", "type": "text", "label": "Jointing Type", "placeholder": "e.g., Flush smooth, Weathered", "required": true}
        ]'::jsonb,
        'Specify the facing brick product, size, strength, bedding and jointing requirements. Ensure the product meets required performance standards.',
        NULL, -- Not a preliminaries clause
        10
    ),

    -- F10/210 - CONCRETE BLOCKS
    (
        '30000000-0000-0000-0000-0000000000f2',
        '20000000-0000-0000-0000-0000000000f1',
        'F10/210',
        'CONCRETE BLOCKS',
        E'Concrete blocks: {{product_name}}. To {{standard}}.\n\nSize: {{block_size}}\nDensity: {{density}}\nCompressive strength: {{compressive_strength}}\n\nBedding: {{bedding_type}} in {{mortar_designation}} mortar.',
        '[
            {"name": "product_name", "type": "text", "label": "Product Name", "placeholder": "e.g., Celcon Standard Block", "required": true},
            {"name": "standard", "type": "text", "label": "British Standard", "placeholder": "e.g., BS EN 771-3", "required": true},
            {"name": "block_size", "type": "text", "label": "Block Size", "placeholder": "e.g., 440 x 215 x 100mm", "required": true},
            {"name": "density", "type": "text", "label": "Density", "placeholder": "e.g., 600 kg/m³", "required": true},
            {"name": "compressive_strength", "type": "text", "label": "Compressive Strength", "placeholder": "e.g., Minimum 3.6 N/mm²", "required": true},
            {"name": "bedding_type", "type": "text", "label": "Bedding Type", "placeholder": "e.g., Stretcher bond", "required": true},
            {"name": "mortar_designation", "type": "text", "label": "Mortar Designation", "placeholder": "e.g., M4", "required": true}
        ]'::jsonb,
        'Specify concrete block type, density and strength appropriate for the application (loadbearing/non-loadbearing, internal/external).',
        NULL,
        20
    ),

    -- F30/110 - DAMP PROOF COURSES
    (
        '30000000-0000-0000-0000-0000000000f3',
        '20000000-0000-0000-0000-0000000000f3',
        'F30/110',
        'DAMP PROOF COURSES',
        E'Damp proof course: {{dpc_type}}. To {{standard}}.\n\nWidth: {{width}}\nThickness: {{thickness}}\n\nLap joints: {{lap_distance}}\nPosition: {{position}}',
        '[
            {"name": "dpc_type", "type": "text", "label": "DPC Type", "placeholder": "e.g., Pitch polymer, Lead", "required": true},
            {"name": "standard", "type": "text", "label": "British Standard", "placeholder": "e.g., BS 8215", "required": true},
            {"name": "width", "type": "text", "label": "Width", "placeholder": "e.g., To suit wall thickness", "required": true},
            {"name": "thickness", "type": "text", "label": "Thickness", "placeholder": "e.g., Minimum 0.5mm", "required": true},
            {"name": "lap_distance", "type": "text", "label": "Lap Distance", "placeholder": "e.g., Minimum 100mm", "required": true},
            {"name": "position", "type": "text", "label": "Position", "placeholder": "e.g., Minimum 150mm above ground level", "required": true}
        ]'::jsonb,
        'DPC must be positioned to prevent rising damp and moisture penetration. Ensure continuity with DPMs.',
        NULL,
        30
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- 6. MASTER CLAUSES - SECTION M (FLOOR, WALL, CEILING FINISHES)
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
    -- M10/305 - AGGREGATES
    (
        '30000000-0000-0000-0000-0000000000m1',
        '20000000-0000-0000-0000-0000000000m1',
        'M10/305',
        'AGGREGATES',
        E'Aggregates for screeds: {{aggregate_type}}. To {{standard}}.\n\nGrading: {{grading}}\nMaximum size: {{max_size}}',
        '[
            {"name": "aggregate_type", "type": "text", "label": "Aggregate Type", "placeholder": "e.g., Sharp sand, Gravel", "required": true},
            {"name": "standard", "type": "text", "label": "British Standard", "placeholder": "e.g., BS EN 13139", "required": true},
            {"name": "grading", "type": "text", "label": "Grading", "placeholder": "e.g., Well graded", "required": true},
            {"name": "max_size", "type": "text", "label": "Maximum Size", "placeholder": "e.g., 4mm", "required": true}
        ]'::jsonb,
        'Aggregates must be clean, well-graded and free from deleterious materials.',
        NULL,
        10
    ),

    -- M10/410 - CEMENT:SAND SCREEDS
    (
        '30000000-0000-0000-0000-0000000000m2',
        '20000000-0000-0000-0000-0000000000m1',
        'M10/410',
        'CEMENT:SAND SCREEDS',
        E'Cement:sand screed: {{mix_ratio}} mix.\n\nThickness: {{thickness}}\nFinish: {{finish_type}}\n\nBase preparation: {{base_prep}}\nCuring: {{curing_method}}',
        '[
            {"name": "mix_ratio", "type": "text", "label": "Mix Ratio", "placeholder": "e.g., 1:3 cement:sand", "required": true},
            {"name": "thickness", "type": "text", "label": "Thickness", "placeholder": "e.g., 65mm", "required": true},
            {"name": "finish_type", "type": "text", "label": "Finish Type", "placeholder": "e.g., Wood float, Steel trowel", "required": true},
            {"name": "base_prep", "type": "text", "label": "Base Preparation", "placeholder": "e.g., Clean, apply bonding agent", "required": true},
            {"name": "curing_method", "type": "text", "label": "Curing Method", "placeholder": "e.g., Cover with polythene for 7 days", "required": true}
        ]'::jsonb,
        'Minimum screed thickness depends on whether bonded, unbonded or floating. Refer to BS 8204-1 for guidance.',
        NULL,
        20
    ),

    -- M20/110 - PLASTERED COATINGS
    (
        '30000000-0000-0000-0000-0000000000m3',
        '20000000-0000-0000-0000-0000000000m2',
        'M20/110',
        'PLASTERED COATINGS',
        E'Plaster: {{plaster_type}}. To {{standard}}.\n\nCoats: {{number_of_coats}}\nTotal thickness: {{total_thickness}}\nFinish: {{finish_quality}}',
        '[
            {"name": "plaster_type", "type": "text", "label": "Plaster Type", "placeholder": "e.g., Thistle MultiFinish, Thistle Hardwall", "required": true},
            {"name": "standard", "type": "text", "label": "British Standard", "placeholder": "e.g., BS EN 13279-1", "required": true},
            {"name": "number_of_coats", "type": "text", "label": "Number of Coats", "placeholder": "e.g., Two coat work", "required": true},
            {"name": "total_thickness", "type": "text", "label": "Total Thickness", "placeholder": "e.g., 13mm", "required": true},
            {"name": "finish_quality", "type": "text", "label": "Finish Quality", "placeholder": "e.g., Ready to receive decoration", "required": true}
        ]'::jsonb,
        'Ensure substrate is suitable and properly prepared. Different plasters required for different backgrounds.',
        NULL,
        30
    ),

    -- M40/220 - CERAMIC WALL TILING
    (
        '30000000-0000-0000-0000-0000000000m4',
        '20000000-0000-0000-0000-0000000000m4',
        'M40/220',
        'CERAMIC WALL TILING',
        E'Ceramic wall tiles: {{product_name}}.\n\nSize: {{tile_size}}\nColour/finish: {{colour_finish}}\nGrading: {{grading}}\n\nAdhesive: {{adhesive_type}} to {{adhesive_standard}}\nGrout: {{grout_type}} to {{grout_standard}}\nJoint width: {{joint_width}}',
        '[
            {"name": "product_name", "type": "text", "label": "Product Name", "placeholder": "e.g., Porcelanosa Oxford Blanco", "required": true},
            {"name": "tile_size", "type": "text", "label": "Tile Size", "placeholder": "e.g., 300 x 600mm", "required": true},
            {"name": "colour_finish", "type": "text", "label": "Colour/Finish", "placeholder": "e.g., White gloss", "required": true},
            {"name": "grading", "type": "text", "label": "Grading", "placeholder": "e.g., First quality", "required": true},
            {"name": "adhesive_type", "type": "text", "label": "Adhesive Type", "placeholder": "e.g., Polymer modified cement adhesive", "required": true},
            {"name": "adhesive_standard", "type": "text", "label": "Adhesive Standard", "placeholder": "e.g., BS EN 12004", "required": true},
            {"name": "grout_type", "type": "text", "label": "Grout Type", "placeholder": "e.g., Epoxy resin grout", "required": true},
            {"name": "grout_standard", "type": "text", "label": "Grout Standard", "placeholder": "e.g., BS EN 13888", "required": true},
            {"name": "joint_width", "type": "text", "label": "Joint Width", "placeholder": "e.g., 3mm", "required": true}
        ]'::jsonb,
        'Select adhesive class based on substrate and exposure. Ensure tiles are suitable for wet areas if required.',
        NULL,
        40
    )
ON CONFLICT (work_section_id, caws_number) DO NOTHING;

-- =====================================================================
-- VERIFICATION QUERIES (For testing/validation)
-- =====================================================================

-- Uncomment these to verify the seed data was inserted correctly:

-- SELECT COUNT(*) AS contract_types FROM contract_type;
-- SELECT COUNT(*) AS work_sections FROM master_work_section;
-- SELECT COUNT(*) AS master_clauses FROM master_clause;
-- SELECT caws_code, title FROM master_work_section ORDER BY sort_order;
-- SELECT mc.caws_number, mc.title, mws.caws_code
-- FROM master_clause mc
-- JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
-- ORDER BY mws.sort_order, mc.sort_order;
