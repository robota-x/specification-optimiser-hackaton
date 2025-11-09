# V2 Migration Checklist

## Quick Reference for CAWS Specification Builder v2 Refactoring

This is a condensed checklist for implementing the v2 database refactoring. For full details, see [V2_REFACTORING.md](./V2_REFACTORING.md).

---

## ✅ Completed (Backend)

### 1. Database Schema ✅
- [x] `organisation` table
- [x] `contract_type` table
- [x] `master_work_section` table
- [x] `master_clause` table
- [x] `project` table (replaces `specs`)
- [x] `project_clause` table (replaces `spec_content` + `custom_blocks`)
- [x] RLS policies for all tables
- [x] Indexes for performance
- [x] Updated_at triggers

**Location**: `supabase/migrations/20251109120000_v2_schema_refactor.sql`

### 2. Seed Data ✅
- [x] Sample organisation
- [x] 4 contract types (JCT SBC, JCT MWD, JCT ICD, NEC4 ECC)
- [x] 9 work sections (A10, A20, A30, F10, F20, F30, M10, M20, M40)
- [x] 13 master clauses across sections
- [x] 3 preliminaries clauses (Section A)

**Location**: `supabase/migrations/20251109120001_v2_seed_data.sql`

### 3. TypeScript Types ✅
- [x] All table row types
- [x] Insert/update types
- [x] Extended/joined types
- [x] Field definition types
- [x] Helper functions (`renderHybridClause`, `renderFreeformClause`, `validateFieldValues`)

**Location**: `src/types/v2-schema.ts`

### 4. Service Layer ✅

**Master Library Service** (`src/lib/services/v2-master-library.service.ts`):
- [x] Load contract types
- [x] Load work sections (all, by group, by code)
- [x] Load master clauses (all, by section, by contract type, search)
- [x] Load full master library with nested clauses

**Project Service** (`src/lib/services/v2-project.service.ts`):
- [x] Project CRUD (create, load, get, update, delete)
- [x] Load project clauses (plain, with masters, full)
- [x] Add hybrid clause (linked to master)
- [x] Add freeform clause (custom content)
- [x] Update clause field values
- [x] Update freeform clause content
- [x] Delete clauses
- [x] Update sort order (drag-and-drop)
- [x] Batch update field values
- [x] Auto-populate preliminaries on project creation

### 5. Documentation ✅
- [x] Comprehensive refactoring guide
- [x] Migration checklist (this file)

---

## 📋 TODO (Frontend)

### Phase 1: Core Components

#### 1.1 Preliminaries Wizard
Create: `src/components/v2/PreliminariesWizard.tsx`

**Required fields**:
- Project name
- Project location (textarea)
- Client name
- Employer name
- Contract type (dropdown from `loadContractTypes()`)
- Architect name
- Principal designer

**Logic**:
```typescript
const handleSubmit = async (formData) => {
  const project = await ProjectService.createProject({
    name: formData.name,
    project_location: formData.location,
    client_name: formData.client,
    employer_name: formData.employer,
    contract_type_id: formData.contractType,
    architect_name: formData.architect,
    principal_designer: formData.designer,
  }, organisationId);

  // Redirect to project editor
  navigate(`/project/${project.project_id}`);
};
```

#### 1.2 Master Library Panel
Create: `src/components/v2/MasterLibraryPanel.tsx`

**Features**:
- Tree view of work sections grouped by CAWS group (A, F, M, etc.)
- Search bar for clauses
- Drag-to-add functionality
- Show clause preview on hover

**Data loading**:
```typescript
const library = await MasterLibraryService.loadMasterLibrary();
// Or load by group:
const masonryLibrary = await MasterLibraryService.loadMasterLibraryByGroup('F');
```

#### 1.3 Hybrid Clause Editor
Create: `src/components/v2/HybridClauseEditor.tsx`

**Props**: `{ clause: ProjectClause, masterClause: MasterClause }`

**Features**:
- Dynamic form fields from `masterClause.field_definitions`
- Render field types: text, textarea, list, date, number
- Show `masterClause.guidance_text` as help text
- Auto-save on blur

**Logic**:
```typescript
const handleFieldChange = async (fieldName, value) => {
  const updatedValues = { ...clause.field_values, [fieldName]: value };
  await ProjectService.updateClauseFieldValues(clause.project_clause_id, updatedValues);
};
```

#### 1.4 Freeform Clause Editor
Create: `src/components/v2/FreeformClauseEditor.tsx`

**Props**: `{ clause: ProjectClause }`

**Features**:
- Editable CAWS number input
- Editable title input
- Rich text editor for body (Markdown or WYSIWYG)
- Auto-save

**Logic**:
```typescript
const handleSave = async () => {
  await ProjectService.updateFreeformClause(
    clause.project_clause_id,
    cawsNumber,
    title,
    body
  );
};
```

#### 1.5 Project Clause Item
Create: `src/components/v2/ProjectClauseItem.tsx`

**Props**: `{ clause: ProjectClauseFull, onDelete, onMove }`

**Features**:
- Display CAWS number + title
- Expandable to show editor (hybrid or freeform)
- Delete button
- Drag handle for reordering

#### 1.6 Project Clause List
Create: `src/components/v2/ProjectClauseList.tsx`

**Features**:
- Sortable list using `@dnd-kit` (similar to v1 `SortableBlockList`)
- Render `ProjectClauseItem` for each clause
- Handle reordering via `ProjectService.updateClauseSortOrder()`

### Phase 2: Pages

#### 2.1 New Project Wizard Page
Create: `src/pages/v2/NewProjectWizard.tsx`

**Route**: `/project/new`

**Components**:
- `PreliminariesWizard`

#### 2.2 Project Dashboard
Update: `src/pages/v2/ProjectDashboard.tsx` (or update existing `Dashboard.tsx`)

**Changes**:
- Use `ProjectService.loadProjects()` instead of old service
- Display project name, location, client
- Show contract type badge
- "New Project" button → navigate to `/project/new`

#### 2.3 Project Editor
Update: `src/pages/v2/ProjectEditor.tsx` (or update existing `SpecEditor.tsx`)

**Layout**:
```
┌─────────────────────────────────────────┐
│ Header: Project Name | Save | Publish  │
├──────────────┬──────────────────────────┤
│              │                          │
│  Master      │   Project Clauses        │
│  Library     │   (Sortable List)        │
│  Panel       │                          │
│              │   - Clause 1 (Hybrid)    │
│  - A10       │   - Clause 2 (Freeform)  │
│    - A10/110 │   - Clause 3 (Hybrid)    │
│  - F10       │                          │
│    - F10/120 │   [+ Custom Clause]      │
│    - F10/210 │                          │
│  - M10       │                          │
│    - M10/305 │                          │
│              │                          │
│  [Search...] │                          │
└──────────────┴──────────────────────────┘
```

**Data loading**:
```typescript
const [project, setProject] = useState<Project | null>(null);
const [clauses, setClauses] = useState<ProjectClauseFull[]>([]);
const [library, setLibrary] = useState<MasterLibrary | null>(null);

useEffect(() => {
  async function load() {
    const [proj, cls, lib] = await Promise.all([
      ProjectService.getProject(projectId),
      ProjectService.loadProjectClausesFull(projectId),
      MasterLibraryService.loadMasterLibrary(),
    ]);
    setProject(proj);
    setClauses(cls);
    setLibrary(lib);
  }
  load();
}, [projectId]);
```

**Add clause logic**:
```typescript
const handleAddHybridClause = async (masterClauseId: string) => {
  const newClause = await ProjectService.addHybridClause(projectId, masterClauseId);
  // Reload clauses or optimistically update state
  setClauses([...clauses, newClause]);
};

const handleAddFreeformClause = async () => {
  const newClause = await ProjectService.addFreeformClause(
    projectId,
    'XXX/XXX', // Default placeholder
    'New Custom Clause'
  );
  setClauses([...clauses, newClause]);
};
```

### Phase 3: PDF Rendering Update

Update: `src/components/pdf/SpecificationPDF.tsx`

**Changes**:
- Use `ProjectService.loadProjectClausesFull()` instead of old service
- Render clauses using `renderProjectClause()` helper
- Group by work section (using `clause.master_clause.work_section.caws_code`)

```typescript
const clauses = await ProjectService.loadProjectClausesFull(projectId);

clauses.forEach(clause => {
  const rendered = renderProjectClause(clause, clause.master_clause);

  // Add to PDF
  pdf.text(`${rendered.caws_number} ${rendered.title}`, x, y);
  pdf.text(rendered.body, x, y + 10);
});
```

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Run migrations successfully
- [ ] Verify seed data inserted
- [ ] Test RLS policies (users can only see their own projects)
- [ ] Test cascade deletes (deleting project deletes clauses)

### Service Layer Tests
- [ ] Load master library
- [ ] Load contract types
- [ ] Create project with preliminaries
- [ ] Add hybrid clause
- [ ] Update hybrid clause field values
- [ ] Add freeform clause
- [ ] Update freeform clause
- [ ] Reorder clauses
- [ ] Delete clause
- [ ] Search master clauses

### Frontend Tests
- [ ] New project wizard creates project with preliminaries
- [ ] Master library panel displays work sections and clauses
- [ ] Drag clause from library to project works
- [ ] Hybrid clause editor renders fields correctly
- [ ] Freeform clause editor works
- [ ] Clause reordering via drag-and-drop works
- [ ] Clause deletion works
- [ ] PDF export shows rendered clauses

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
# Development
supabase db reset

# Production
supabase db push
```

### 2. Update Supabase Types
```bash
# Generate TypeScript types from Supabase
supabase gen types typescript --local > src/integrations/supabase/types-v2.ts

# Or for production
supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types-v2.ts
```

### 3. Frontend Deployment
```bash
# Build and test
npm run build
npm run preview

# Deploy (if using Vercel/Netlify)
vercel deploy
# or
netlify deploy
```

---

## 📊 Data Migration (v1 → v2)

If you have existing v1 data, create a migration script:

**Location**: `scripts/migrate-v1-to-v2.sql`

```sql
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

-- 2. Migrate spec_content (template blocks) → project_clause (hybrid)
-- This requires matching old block_template_id to new master_clause_id
-- You'll need a mapping table or manual matching

-- 3. Migrate custom_blocks → project_clause (freeform)
-- This is complex and depends on how custom blocks were used
```

**Note**: Full migration requires understanding your v1 data structure and creating mappings between old `block_templates` and new `master_clauses`.

---

## 🔄 Rollback Plan

If issues arise during migration:

### Database Rollback
```bash
# Revert to previous migration
supabase db reset --version <previous-version>
```

### Code Rollback
```bash
# Revert commits
git revert <commit-hash>

# Or checkout previous version
git checkout <previous-branch-or-tag>
```

### Keep v1 Alive During Transition
- Don't drop v1 tables immediately
- Run v1 and v2 in parallel
- Gradual user migration
- Full v1 removal after 100% confidence in v2

---

## ❓ FAQs

**Q: Can v1 and v2 coexist?**
A: Yes, during the transition period. The v2 tables don't conflict with v1 tables.

**Q: How do I add new master clauses?**
A: Insert into `master_clause` table directly or create an admin UI.

**Q: What if I need custom field types?**
A: Extend `FieldType` in `src/types/v2-schema.ts` and update the field rendering components.

**Q: How do I handle multi-org environments?**
A: Create a `user_organisation` junction table to map users to orgs, then update RLS policies.

**Q: Can I import master clauses from Excel/CSV?**
A: Yes, create a import script or admin tool that parses CSV and inserts into `master_work_section` and `master_clause`.

---

## 📝 Notes

- The `organisation_id` is hardcoded to a default org in seed data. For production, implement proper multi-tenant user-org mapping.
- The seed data includes UK-based CAWS examples. Customize for your region/standards.
- RLS policies assume one user = one org. Update for many-to-many relationships if needed.
- The `field_definitions` JSONB column is flexible but validate on the frontend to ensure consistency.

---

**Last Updated**: 2025-11-09
