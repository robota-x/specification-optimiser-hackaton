# CAWS Specification Builder v2 - Database Refactoring Guide

## Table of Contents

1. [Overview](#overview)
2. [What Changed: v1 → v2](#what-changed-v1--v2)
3. [Database Schema](#database-schema)
4. [Migration Guide](#migration-guide)
5. [Service Layer Usage](#service-layer-usage)
6. [Frontend Integration](#frontend-integration)
7. [Key Workflows](#key-workflows)
8. [Testing the Migration](#testing-the-migration)

---

## Overview

This document describes the v2 database refactoring for the CAWS Specification Builder. The refactoring transitions from a **document-first** architecture to a **database-first** architecture based on the "Masters vs Instances" pattern.

### The Core Architectural Shift

| Aspect | v1 (Document-First) | v2 (Database-First) |
|--------|---------------------|---------------------|
| **Model** | A spec is a collection of blocks that store their own content | A spec is a list of foreign keys to a master library + user data |
| **Blocks** | All blocks are treated as new content | Blocks reference immutable master clauses with editable fields |
| **CAWS** | Not enforced | CAWS numbering (e.g., `M10/305`) is the "golden thread" |
| **Workflow** | User writes content | User selects, excludes, and completes pre-written clauses |
| **Features** | Limited reusability | Practice Masters, Preliminaries wizard, Hybrid + Freeform blocks |

---

## What Changed: v1 → v2

### Database Tables

#### Removed/Replaced Tables (v1)

| v1 Table | Status | v2 Replacement |
|----------|--------|----------------|
| `specs` | Replaced | `project` (with preliminaries fields) |
| `block_templates` | Replaced | `master_clause` (with CAWS numbering) |
| `custom_blocks` | Merged | `project_clause` (freeform blocks) |
| `spec_content` | Replaced | `project_clause` (handles both hybrid and freeform) |

#### New Tables (v2)

| Table | Purpose |
|-------|---------|
| `organisation` | Multi-tenant support |
| `contract_type` | Contract types (JCT, NEC) for preliminaries |
| `master_work_section` | CAWS folders (M10, F10, A10, etc.) |
| `master_clause` | Master library of clause templates |
| `project` | User specification projects with preliminaries |
| `project_clause` | Clause instances (hybrid + freeform) |

### TypeScript Types

- **New file**: `src/types/v2-schema.ts` - Complete type definitions for v2 schema
- **Old file**: `src/types/blocks.ts` - Can be kept for backward compatibility during migration

### Service Layer

| v1 Service | v2 Service | Location |
|------------|-----------|----------|
| `specContentService.ts` | `v2-project.service.ts` | `src/lib/services/` |
| N/A | `v2-master-library.service.ts` | `src/lib/services/` |

---

## Database Schema

### Entity Relationship Diagram

```
organisation (multi-tenant)
    ↓
    ├─→ contract_type (JCT, NEC, etc.)
    │       ↓
    │       └─→ master_clause (preliminaries clauses)
    │
    ├─→ master_work_section (M10, F10, A10, etc.)
    │       ↓
    │       └─→ master_clause (practice library)
    │
    └─→ project (user specs)
            ↓
            └─→ project_clause (hybrid OR freeform)
                    ↓
                    └─→ master_clause (optional FK for hybrid)
```

### Table Details

#### 1. `organisation`
Multi-tenant organization table.

```sql
organisation (
    organisation_id UUID PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

#### 2. `contract_type`
Contract types (JCT, NEC variants) that determine preliminaries clauses.

```sql
contract_type (
    contract_type_id UUID PRIMARY KEY,
    organisation_id UUID → organisation,
    code VARCHAR(50),              -- e.g., "JCT_SBC_2016"
    name VARCHAR(255),             -- e.g., "JCT Standard Building Contract 2016"
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(organisation_id, code)
)
```

#### 3. `master_work_section`
CAWS work sections (folders like M10, F10).

```sql
master_work_section (
    work_section_id UUID PRIMARY KEY,
    organisation_id UUID → organisation,
    caws_group CHAR(1),            -- e.g., 'M', 'F', 'A'
    caws_code VARCHAR(10),         -- e.g., 'M10', 'F10'
    title VARCHAR(255),            -- e.g., "Cement screeds"
    description TEXT,
    sort_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(organisation_id, caws_code)
)
```

#### 4. `master_clause`
The "Practice Masters" library - clause templates with field placeholders.

```sql
master_clause (
    master_clause_id UUID PRIMARY KEY,
    work_section_id UUID → master_work_section,
    caws_number VARCHAR(20),       -- e.g., "M10/305" (GOLDEN THREAD)
    title VARCHAR(255),            -- e.g., "AGGREGATES"
    body_template TEXT,            -- Template with {{field_name}} placeholders
    field_definitions JSONB,       -- Array of field configs
    guidance_text TEXT,            -- Technical help text
    contract_type_id UUID → contract_type (nullable),
    sort_order INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(work_section_id, caws_number)
)
```

**Example `field_definitions`**:
```json
[
  {
    "name": "product_name",
    "type": "text",
    "label": "Product Name",
    "placeholder": "e.g., Ibstock Red Smooth",
    "required": true
  },
  {
    "name": "thickness",
    "type": "number",
    "label": "Thickness (mm)",
    "required": true
  }
]
```

#### 5. `project`
User specification projects with preliminaries data.

```sql
project (
    project_id UUID PRIMARY KEY,
    organisation_id UUID → organisation,
    user_id UUID → auth.users,
    name VARCHAR(255),
    description TEXT,

    -- Preliminaries (Section A wizard)
    project_location TEXT,
    client_name VARCHAR(255),
    contract_type_id UUID → contract_type,
    architect_name VARCHAR(255),
    principal_designer VARCHAR(255),
    employer_name VARCHAR(255),
    project_reference VARCHAR(100),

    status VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

#### 6. `project_clause`
**THE MOST IMPORTANT TABLE** - handles BOTH hybrid and freeform blocks.

```sql
project_clause (
    project_clause_id UUID PRIMARY KEY,
    project_id UUID → project,

    -- HYBRID BLOCK (if master_clause_id IS NOT NULL)
    master_clause_id UUID → master_clause (nullable),
    field_values JSONB,            -- User-filled data: {"product_name": "Ibstock Red"}

    -- FREEFORM BLOCK (if master_clause_id IS NULL)
    freeform_caws_number VARCHAR(20),
    freeform_title VARCHAR(255),
    freeform_body TEXT,

    -- METADATA
    sort_order INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    -- Constraint: Must be hybrid OR freeform, not both
    CHECK (
        (master_clause_id IS NOT NULL AND freeform_caws_number IS NULL) OR
        (master_clause_id IS NULL AND freeform_caws_number IS NOT NULL)
    )
)
```

---

## Migration Guide

### Step 1: Apply Migrations

The migration files are in `supabase/migrations/`:

1. **Schema**: `20251109120000_v2_schema_refactor.sql`
2. **Seed Data**: `20251109120001_v2_seed_data.sql`

Apply them using Supabase CLI:

```bash
# Reset and apply all migrations (DEVELOPMENT ONLY)
supabase db reset

# OR apply migrations incrementally (PRODUCTION)
supabase db push
```

### Step 2: Verify Migration

Run these queries to verify the schema:

```sql
-- Count tables
SELECT COUNT(*) FROM contract_type;
SELECT COUNT(*) FROM master_work_section;
SELECT COUNT(*) FROM master_clause;

-- View work sections
SELECT caws_code, title FROM master_work_section ORDER BY sort_order;

-- View sample clauses
SELECT mc.caws_number, mc.title, mws.caws_code
FROM master_clause mc
JOIN master_work_section mws ON mc.work_section_id = mws.work_section_id
ORDER BY mws.sort_order, mc.sort_order
LIMIT 20;
```

### Step 3: Data Migration (v1 → v2)

If you have existing v1 data, you can migrate it:

```sql
-- Example migration script (customize as needed)

-- 1. Migrate specs → projects
INSERT INTO project (project_id, organisation_id, user_id, name, description, status, created_at, updated_at)
SELECT
    id,
    '00000000-0000-0000-0000-000000000001'::UUID, -- Default org
    user_id,
    title,
    description,
    'draft',
    created_at,
    updated_at
FROM specs;

-- 2. Migrate custom_blocks → project_clause (freeform)
-- (This requires mapping custom blocks to their usage in spec_content)

-- 3. Migrate spec_content → project_clause
-- (This is complex and depends on your v1 data structure)
```

**Note**: A full data migration script should be created based on your specific v1 data.

---

## Service Layer Usage

### Master Library Service

```typescript
import MasterLibraryService from '@/lib/services/v2-master-library.service';

// Load the entire master library (for UI navigation)
const library = await MasterLibraryService.loadMasterLibrary();
// Returns: { work_sections: [...], contract_types: [...] }

// Load clauses for a specific work section
const clauses = await MasterLibraryService.loadMasterClausesByWorkSection(workSectionId);

// Search for clauses
const results = await MasterLibraryService.searchMasterClauses('brick');

// Load preliminaries for a contract type
const prelimsClauses = await MasterLibraryService.loadPreliminariesClauses(contractTypeId);
```

### Project Service

```typescript
import ProjectService from '@/lib/services/v2-project.service';

// Create a new project (auto-populates preliminaries if contract_type_id provided)
const project = await ProjectService.createProject({
  name: 'New Office Building',
  project_location: '123 High Street, London',
  client_name: 'ABC Corp',
  contract_type_id: 'jct-sbc-2016-id',
}, organisationId);

// Load all user projects
const projects = await ProjectService.loadProjects();

// Load project clauses with full details
const clauses = await ProjectService.loadProjectClausesFull(projectId);

// Add a hybrid clause (from master library)
const clause = await ProjectService.addHybridClause(
  projectId,
  masterClauseId,
  { product_name: 'Initial value' } // Optional initial field values
);

// Update field values
await ProjectService.updateClauseFieldValues(clauseId, {
  product_name: 'Ibstock Red Smooth',
  thickness: '65',
});

// Add a freeform clause
const customClause = await ProjectService.addFreeformClause(
  projectId,
  'M10/999',
  'Special Bespoke Screed',
  'The contractor must provide...'
);

// Update sort order (drag-and-drop)
await ProjectService.updateClauseSortOrder([
  { clauseId: 'clause-1-id', sortOrder: 0 },
  { clauseId: 'clause-2-id', sortOrder: 1 },
  { clauseId: 'clause-3-id', sortOrder: 2 },
]);
```

---

## Frontend Integration

### Updated Component Structure

```
src/
├── components/
│   ├── v2/
│   │   ├── MasterLibraryPanel.tsx          # Browse master work sections & clauses
│   │   ├── PreliminariesWizard.tsx         # New project wizard with contract type
│   │   ├── HybridClauseEditor.tsx          # Edit hybrid block fields
│   │   ├── FreeformClauseEditor.tsx        # Edit freeform block content
│   │   ├── ProjectClauseItem.tsx           # Display/edit a project clause
│   │   └── ProjectClauseList.tsx           # Sortable list of clauses
│   └── ... (keep old components during migration)
├── pages/
│   ├── v2/
│   │   ├── ProjectDashboard.tsx            # List projects
│   │   ├── ProjectEditor.tsx               # Main editor with library + clauses
│   │   └── NewProjectWizard.tsx            # Preliminaries wizard
│   └── ... (keep old pages during migration)
└── lib/
    └── services/
        ├── v2-master-library.service.ts
        └── v2-project.service.ts
```

### Example: Rendering a Clause

```typescript
import { renderProjectClause } from '@/types/v2-schema';

function ClauseDisplay({ clause, masterClause }) {
  const rendered = renderProjectClause(clause, masterClause);

  return (
    <div>
      <h3>{rendered.caws_number} - {rendered.title}</h3>
      <pre>{rendered.body}</pre>
    </div>
  );
}
```

### Example: Master Library Panel

```typescript
function MasterLibraryPanel() {
  const [library, setLibrary] = useState<MasterLibrary | null>(null);

  useEffect(() => {
    async function load() {
      const data = await MasterLibraryService.loadMasterLibrary();
      setLibrary(data);
    }
    load();
  }, []);

  if (!library) return <div>Loading library...</div>;

  return (
    <div>
      {library.work_sections.map(section => (
        <div key={section.work_section_id}>
          <h3>{section.caws_code} - {section.title}</h3>
          <ul>
            {section.clauses.map(clause => (
              <li key={clause.master_clause_id}>
                <button onClick={() => handleAddClause(clause.master_clause_id)}>
                  {clause.caws_number} - {clause.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

---

## Key Workflows

### Workflow 1: Creating a New Project (Preliminaries Wizard)

1. **User Action**: User fills out wizard (project name, location, client, **contract type**)
2. **Backend**:
   ```typescript
   const project = await ProjectService.createProject({
     name: 'Office Building',
     project_location: '123 High Street',
     client_name: 'ABC Corp',
     contract_type_id: 'jct-sbc-2016-id',
   }, organisationId);
   // Automatically inserts all Section A preliminaries clauses!
   ```
3. **Frontend**: Redirects to project editor, shows Section A clauses ready to complete

### Workflow 2: Adding a Hybrid Block (Select → Complete)

1. **User Action**: Drags `M10/305 - AGGREGATES` from library panel
2. **Backend**:
   ```typescript
   const clause = await ProjectService.addHybridClause(projectId, masterClauseId);
   ```
3. **User Action**: Clicks the new clause, sees form fields (from `master_clause.field_definitions`)
4. **User fills**: `aggregate_type: "Sharp sand"`, `max_size: "4mm"`
5. **Backend**:
   ```typescript
   await ProjectService.updateClauseFieldValues(clauseId, {
     aggregate_type: 'Sharp sand',
     max_size: '4mm',
   });
   ```

### Workflow 3: Adding a Freeform Block (Escape Hatch)

1. **User Action**: Drags "Custom Clause" block from toolbar
2. **Backend**:
   ```typescript
   const clause = await ProjectService.addFreeformClause(
     projectId,
     'M10/999',
     'Special Bespoke Screed'
   );
   ```
3. **User edits**: Fills in CAWS number, title, and body (rich text editor)
4. **Backend**:
   ```typescript
   await ProjectService.updateFreeformClause(
     clauseId,
     'M10/999',
     'Special Bespoke Screed',
     'The contractor must provide a bespoke screed with...'
   );
   ```

### Workflow 4: Rendering the Final Document (PDF/View)

```typescript
async function generateDocument(projectId: string) {
  const clauses = await ProjectService.loadProjectClausesFull(projectId);

  const renderedClauses = clauses.map(clause => {
    if (clause.master_clause) {
      // Hybrid block
      return renderHybridClause(clause.master_clause, clause.field_values || {});
    } else {
      // Freeform block
      return renderFreeformClause(clause);
    }
  });

  // Pass to PDF generator
  return renderedClauses;
}
```

---

## Testing the Migration

### 1. Test Master Library Loading

```typescript
// In a React component or test file
const library = await MasterLibraryService.loadMasterLibrary();
console.log('Work sections:', library.work_sections.length);
console.log('Contract types:', library.contract_types.length);

// Should see:
// - 6 work sections (A10, A20, A30, F10, F20, F30, M10, M20, M40)
// - 4 contract types (JCT SBC, JCT MWD, JCT ICD, NEC4 ECC)
// - Multiple master clauses per section
```

### 2. Test Project Creation with Preliminaries

```typescript
const project = await ProjectService.createProject({
  name: 'Test Project',
  contract_type_id: 'jct-sbc-2016-id',
}, organisationId);

const clauses = await ProjectService.loadProjectClauses(project.project_id);
console.log('Auto-inserted preliminaries:', clauses.length);
// Should see 3 clauses (A10/110, A10/120, A20/110)
```

### 3. Test Hybrid Clause

```typescript
// Get a master clause (e.g., M10/305 - AGGREGATES)
const masterClause = await MasterLibraryService.getMasterClause('m10-305-id');

// Add to project
const clause = await ProjectService.addHybridClause(projectId, masterClause.master_clause_id);

// Update field values
await ProjectService.updateClauseFieldValues(clause.project_clause_id, {
  aggregate_type: 'Sharp sand',
  standard: 'BS EN 13139',
  grading: 'Well graded',
  max_size: '4mm',
});

// Render
const rendered = renderHybridClause(masterClause, clause.field_values);
console.log(rendered.body);
// Should see template with values filled in
```

### 4. Test Freeform Clause

```typescript
const freeformClause = await ProjectService.addFreeformClause(
  projectId,
  'M10/999',
  'Custom Screed Specification',
  'Special requirements for this project...'
);

console.log('Freeform clause created:', freeformClause);
```

### 5. Test Drag-and-Drop Reordering

```typescript
await ProjectService.updateClauseSortOrder([
  { clauseId: 'clause-3-id', sortOrder: 0 },
  { clauseId: 'clause-1-id', sortOrder: 1 },
  { clauseId: 'clause-2-id', sortOrder: 2 },
]);

const reorderedClauses = await ProjectService.loadProjectClauses(projectId);
console.log('New order:', reorderedClauses.map(c => c.sort_order));
```

---

## Next Steps

### Phase 1: Backend Complete ✅
- [x] Database schema
- [x] Seed data
- [x] TypeScript types
- [x] Service layer

### Phase 2: Frontend Refactoring (Next)
- [ ] Create `PreliminariesWizard` component
- [ ] Create `MasterLibraryPanel` component
- [ ] Create `HybridClauseEditor` component
- [ ] Create `FreeformClauseEditor` component
- [ ] Update `ProjectEditor` to use v2 services
- [ ] Update `Dashboard` to use v2 projects

### Phase 3: Data Migration (If Needed)
- [ ] Write v1 → v2 data migration script
- [ ] Test migration with production data copy
- [ ] Execute migration

### Phase 4: Cleanup
- [ ] Remove v1 tables (after full migration)
- [ ] Remove v1 service files
- [ ] Update all references

---

## Support

For questions or issues:
1. Review this document
2. Check the seed data in `supabase/migrations/20251109120001_v2_seed_data.sql`
3. Refer to service layer source code for API usage
4. Test queries in Supabase SQL editor

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Author**: AI Assistant via Claude Code
