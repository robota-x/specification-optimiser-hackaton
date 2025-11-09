# Architectural Specification AI Green Optimiser - Product Status Report

**Report Date:** November 9, 2025
**Deployment:** https://specificationoptimiser.robota.dev
**Project Code:** specification-optimiser-hackaton

---

## Executive Summary

The Architectural Specification AI Green Optimiser is a web-based tool for creating construction specifications with integrated AI-powered ESG (Environmental, Social, Governance) optimization. The system allows architects to build specifications using a modular block-based approach and receive AI-generated suggestions for reducing embodied carbon and environmental impact.

**Current Status:**
- **Frontend Block Builder:** ✅ Fully Implemented & Working
- **Authentication & User Management:** ✅ Fully Implemented & Working
- **PDF Export:** ✅ Fully Implemented & Working
- **ESG Analysis Engine:** ⚠️ Database Schema Complete, Edge Functions Present, Frontend Integration Partial
- **CAWS Master Library (v2):** ❌ Database Schema Created, NOT YET Implemented in Frontend

---

## Architecture Overview

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- shadcn-ui component library
- TailwindCSS for styling
- React Query for data fetching
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL database + Authentication + Edge Functions)
- Row Level Security (RLS) for data protection
- Real-time subscriptions for live updates

**AI/LLM Integration:**
- Google Gemini API (gemini-1.5-flash)
- Secure edge function wrapper with rate limiting
- NLP-based material extraction for ESG analysis

**Deployment:**
- Cloudflare Pages (static frontend)
- Automated CI/CD via GitHub Actions
- Automatic database migrations on deploy

### Database Architecture

The system currently has **TWO PARALLEL SCHEMAS** in different implementation states:

#### Schema 1: V1 "Document Builder" (Currently Active in Frontend)

**Tables in Use:**
- `specs` - User specification documents
- `spec_content` - Individual blocks within specs
- `block_templates` - Predefined block templates (read-only library)
- `custom_blocks` - User-created reusable blocks

**Status:** ✅ Fully operational, powering current frontend

#### Schema 2: V2 "CAWS Master Library" (Database Only, Not Connected)

**Tables Created:**
- `organisation` - Multi-tenant support
- `contract_type` - JCT, NEC contract types
- `master_work_section` - CAWS sections (e.g., F10 Masonry, M10 Screeds)
- `master_clause` - Master clause templates with field definitions
- `project` - Replaces "specs" with preliminaries data
- `project_clause` - Clause instances (hybrid blocks + freeform blocks)

**Status:** ❌ Schema complete with full migration and seed data, but NO frontend implementation

#### Schema 3: ESG Optimization Engine (Partially Connected)

**Tables:**
- `esg_material_library` - Canonical material database with embodied carbon data
- `project_analysis_job` - Async analysis workflow management
- `project_esg_suggestion` - AI-generated suggestions and reports

**Status:** ⚠️ Database + Edge functions complete, frontend partially implemented

---

## Feature Breakdown

### 1. Authentication & User Management

**Status:** ✅ Fully Working

**Features:**
- Email/Password authentication
- Google OAuth social login
- Email confirmation required before first sign-in
- Session persistence with JWT tokens
- Row Level Security ensures users only see their own data

**User Journey:**
1. User visits landing page
2. Clicks "Get Started" or "Sign In"
3. Can choose email/password or Google OAuth
4. After signup, receives email confirmation link
5. Confirms email and can then sign in
6. Redirected to Dashboard

---

### 2. Specification Block Builder

**Status:** ✅ Fully Working

**Architecture:**

The block builder uses a flexible component-based architecture:

**Block Types:**
1. **Template Blocks** - Pre-configured forms with structured fields
   - Defined in `block_templates` table
   - Content structure stored as JSON schema
   - Fields include text inputs, textareas, selects, etc.
   - Values stored separately per spec instance

2. **Custom Blocks** - User-created freeform markdown content
   - Stored in `custom_blocks` table
   - Reusable across multiple specs
   - Support markdown formatting
   - Personal library per user

**User Journey - Creating a Specification:**

1. **Dashboard View**
   - User sees list of all their specifications
   - Can create new spec with "New Specification" button
   - Each spec shows title, description, last updated date
   - Can download PDF directly from dashboard

2. **Spec Editor View**
   - Split screen: Library sidebar (left) + Content editor (right)
   - Header shows editable title and description
   - Toggle sidebar with chevron button or Cmd/Ctrl+K

3. **Adding Blocks**
   - Library sidebar has two tabs: "Templates" and "Custom"
   - Templates organized by category (e.g., "Masonry", "Concrete", "Finishes")
   - Click template/custom block to add to spec
   - Block appears at bottom of spec
   - First block auto-expands on load

4. **Editing Blocks**
   - Click block header to expand/collapse
   - Template blocks show structured form fields
   - Custom blocks show markdown content
   - Changes mark spec as "Unsaved changes"
   - Auto-save every 30 seconds if unsaved changes exist
   - Manual save with "Save" button or Cmd/Ctrl+S

5. **Reordering Blocks**
   - Drag-and-drop using drag handle icon
   - Live reorder preview
   - Position saved to database immediately

6. **Deleting Blocks**
   - Trash icon on each block
   - Confirmation dialog before deletion
   - Cannot undo after confirmation

7. **Custom Block Library Management**
   - "Custom" tab in sidebar
   - Create new custom block with "+" button
   - Edit existing custom blocks (affects ALL specs using it)
   - Delete custom blocks (removes from library, not from specs already using it)

**Auto-save Behavior:**
- Typing in fields marks spec as "Unsaved changes"
- 30-second countdown timer starts
- Auto-saves in background without user action
- User can trigger immediate save with Cmd/Ctrl+S

**Validation:**
- Title limited to 100 characters
- Description limited to 500 characters
- Field values validated before save
- Error toasts shown for validation failures

---

### 3. PDF Export

**Status:** ✅ Fully Working

**Implementation:**
- Hidden print-optimized view rendered in DOM
- Browser's native print-to-PDF functionality
- Professional document formatting
- Includes all block content with proper hierarchy

**Features:**
- Title and description in header
- Each block rendered with title and content
- Template blocks show filled field values
- Custom blocks render markdown as formatted text
- Accessible from Dashboard (per-spec) or Editor (current spec)

**Limitations:**
- Basic styling (no advanced formatting)
- No table of contents
- No page numbers
- No header/footer customization

---

### 4. ESG Analysis & Optimization Engine

**Status:** ⚠️ Partially Implemented

**What's Working:**

**Database Layer:**
- Complete schema with three tables
- Seeded material library with sample materials:
  - Portland Cement (820 kgCO2e/tonne)
  - GGBS Cement - 67% lower carbon (270 kgCO2e/tonne)
  - PFA Cement - 38% lower carbon (510 kgCO2e/tonne)
  - Standard Facing Bricks (230 kgCO2e/1000 bricks)
  - Reclaimed Bricks - 89% lower carbon (25 kgCO2e/1000 bricks)
  - Standard Concrete (180 kgCO2e/m3)
  - Low Carbon Concrete - 39% lower carbon (110 kgCO2e/m3)
  - Virgin Steel (2100 kgCO2e/tonne)
  - Recycled Steel - 70% lower carbon (630 kgCO2e/tonne)
  - Softwood Timber (carbon negative: -470 kgCO2e/m3)

**Edge Functions:**
- `gemini-chat` - Authenticated LLM API wrapper with rate limiting (10/min, 100/hour)
- `initiate-project-analysis` - Queues ESG analysis job for a project
- `run-analysis-job` - Processes analysis job (extracts materials, generates suggestions)
- `llm-wrapper` - Reusable Gemini API abstraction

**Frontend Services:**
- Complete TypeScript service layer for ESG operations
- Real-time subscriptions for job status updates
- Material library search with synonym/tag matching
- Suggestion status management (new/seen/dismissed)

**What's Missing:**

1. **Edge Function Completion:**
   - `run-analysis-job` function needs full NLP implementation
   - Material extraction logic not complete
   - Suggestion generation needs prompt engineering

2. **Frontend UI:**
   - ESG Report tab exists in SpecEditor but component incomplete
   - No visualization of carbon metrics
   - No comparison charts for alternatives
   - No suggestion action buttons (apply/dismiss)

3. **User Journey Not Complete:**
   - Trigger: Save button in editor calls `initiateProjectAnalysis()` in background
   - Backend should extract materials from spec text
   - Backend should match to `esg_material_library` using NLP tags
   - Backend should generate suggestions with alternatives
   - Frontend should display results in ESG tab
   - Currently: Trigger works, but backend analysis incomplete, frontend display incomplete

**How It Should Work (Intended Design):**

1. User builds specification with blocks containing material references
2. User clicks "Save" in editor
3. Background: System queues ESG analysis job
4. Background: Edge function extracts material names from spec text
5. Background: NLP matching against `esg_material_library` (synonyms, tags)
6. Background: For each material found, looks up lower-carbon alternatives
7. Background: Generates AI narrative explaining:
   - Current embodied carbon total
   - Specific material carbon hotspots
   - Alternative materials with carbon savings
   - Cost implications of each alternative
   - Technical considerations (curing times, structural review, etc.)
8. Frontend: Shows toast "ESG Analysis Started"
9. Frontend: Real-time update when analysis completes
10. User switches to "ESG Analysis" tab in editor
11. Sees project-wide report with:
    - Total embodied carbon estimate
    - Carbon breakdown by material type
    - Specific suggestions with alternatives
    - For each suggestion: carbon savings %, cost impact, technical notes
12. User can mark suggestions as "seen" or "dismissed"
13. User can apply suggestions (future: auto-edit spec text)

---

### 5. Master Clause Library (CAWS System - V2)

**Status:** ❌ Database Schema Complete, NOT Implemented in Frontend

**What Exists:**

A complete "version 2" database schema designed around the CAWS (Common Arrangement of Work Sections) specification standard used in UK construction:

**Structure:**
- Organisation-based multi-tenancy
- Contract type support (JCT, NEC) with auto-loading preliminaries
- CAWS-organized master library:
  - Work Sections (e.g., F10 = Brick/block walling, M10 = Cement screeds)
  - Master Clauses within sections (e.g., F10/120 = Facing Bricks)
- Hybrid block system:
  - Body template with placeholders (e.g., "Use {{product_name}} with {{thickness}}mm")
  - Field definitions as JSON schema
  - User fills placeholders per project
- Freeform blocks as "escape hatch" for custom content

**What's Missing:**

**Entire frontend implementation:**
- No UI to browse CAWS library
- No master clause selection interface
- No project wizard with preliminaries (Section A) form
- No field rendering from JSON schema
- No placeholder substitution
- No migration path from v1 schema to v2 schema
- Services exist (`v2-master-library.service.ts`, `v2-project.service.ts`) but unused

**Why It Matters:**

The v2 schema is a more sophisticated architecture designed for:
- Professional specification standards compliance (CAWS)
- Master library management and updates
- Template reuse across organization
- Standardized preliminary information capture
- Better separation of concerns (masters vs instances)

**Current Situation:**

The application is **fully functional** using the v1 schema, but the v2 schema represents a planned architectural upgrade that was designed but never implemented. The two schemas can coexist in the database, but the frontend only uses v1.

**Decision Required:**

1. **Complete v2 implementation** - Rebuild frontend to use v2 schema, migrate existing data
2. **Remove v2 schema** - Keep v1, remove unused migrations and services
3. **Hybrid approach** - Continue v1 for now, plan v2 migration as future phase

---

## User Journeys

### Complete Journey: New User Creating First Spec

**Actors:** New architect user
**Goal:** Create a specification for a residential project

**Steps:**

1. **Discovery & Registration** (3-5 minutes)
   - Lands on homepage with value proposition
   - Clicks "Get Started"
   - Chooses Google OAuth (faster) or email/password
   - Receives confirmation email
   - Clicks confirmation link
   - Confirms email address

2. **First Sign-In** (30 seconds)
   - Returns to auth page after confirmation
   - Signs in with credentials
   - Redirected to empty Dashboard

3. **Create Specification** (30 seconds)
   - Sees empty state: "No specifications yet"
   - Clicks "Create Specification"
   - New spec created with default name "Untitled Specification"
   - Redirected to Spec Editor

4. **Build Specification** (20-30 minutes)
   - **4a. Set Project Info**
     - Edits title in header: "Riverdale Residential - Phase 1"
     - Edits description: "3-story residential building with ground floor retail"

   - **4b. Add Foundation Blocks**
     - Opens Templates sidebar
     - Selects "Concrete" category
     - Clicks "Concrete Foundations" template
     - Block appears, auto-expands
     - Fills in fields:
       - Concrete grade: C30/37
       - Foundation depth: 1200mm
       - Reinforcement: As per structural drawings

   - **4c. Add Masonry**
     - Clicks "Masonry" category
     - Adds "Facing Brickwork" template
     - Fills fields:
       - Brick type: Ibstock Red Multi
       - Bond: Flemish bond
       - Mortar: 1:1:6 cement:lime:sand
       - Pointing: Recessed

   - **4d. Add Custom Content**
     - Switches to "Custom" tab in sidebar
     - Clicks "+" to create custom block
     - Title: "Site-Specific Requirements"
     - Content (markdown):
       ```
       ## Access Constraints
       - Limited vehicle access from north side only
       - Delivery times restricted to 8am-4pm
       - Requires traffic marshal during concrete pours
       ```
     - Saves custom block
     - Block added to spec

   - **4e. Reorder Blocks**
     - Drags "Site-Specific Requirements" to top
     - Drags "Facing Brickwork" above "Concrete Foundations"

   - **4f. Save Work**
     - Clicks "Save" button
     - Toast: "Saved! Specification has been updated"
     - Toast: "ESG Analysis Started - Running ESG analysis in the background..."
     - (Analysis happens in background, user continues working)

5. **View ESG Analysis** (2-3 minutes) - **PARTIAL: UI incomplete**
   - Switches to "ESG Analysis" tab
   - **Currently:** Sees loading state or empty state
   - **Intended:** Would see:
     - Total embodied carbon estimate: 245 tonnes CO2e
     - Breakdown chart by material type
     - Specific suggestions:
       - "Replace standard concrete with low-carbon GGBS blend" (-39% carbon, +7% cost)
       - "Consider reclaimed bricks" (-89% carbon, +20% cost, subject to availability)
     - Can mark suggestions as seen/dismissed

6. **Export to PDF** (1 minute)
   - Clicks "Download PDF" in header
   - Browser opens print dialog
   - Selects "Save as PDF"
   - Downloads "Riverdale Residential - Phase 1.pdf"
   - Opens PDF to review formatted document

7. **Return Later** (Ongoing)
   - Signs out from Dashboard
   - Returns days/weeks later
   - Signs in
   - Sees "Riverdale Residential - Phase 1" in Dashboard
   - Clicks to continue editing
   - All work preserved, auto-save kept changes

**Time Investment:**
- Initial setup: 5 minutes
- Building spec: 20-30 minutes (varies by complexity)
- Total: 25-35 minutes for first spec

**Pain Points:**
- Email confirmation adds friction (could offer "skip for now" with limited access)
- ESG analysis incomplete (user expects to see results but doesn't)
- No project templates or starter kits (always starts blank)
- No collaboration features (can't share with team)

---

## Technical Integrations

### Gemini AI Integration

**Implementation:**
- Secure edge function: `supabase/functions/gemini-chat/`
- Model: `gemini-1.5-flash` (fast, cost-effective)
- Authentication: Required (JWT token in Authorization header)
- Rate Limiting: 10 requests/minute, 100 requests/hour per user
- Request Logging: All requests logged to `gemini_requests` table
- Environment: API key stored as Supabase secret (never exposed to frontend)

**Current Usage:**
- **Hardcoded test prompt:** "Say hello I'm Gemini back to me"
- **NOT accepting dynamic prompts yet** (commented TODO in code)
- Foundation is solid, needs prompt payload handling

**Intended Usage for ESG:**
1. Extract materials from specification text
2. Generate suggestion narratives explaining alternatives
3. Format reports with markdown/HTML
4. Provide technical guidance for material substitutions

**Rate Limit Tracking:**
- Only successful requests count toward limit
- Failed/rate-limited requests don't count
- Prevents abuse while allowing retries

---

## Deployment & Infrastructure

### CI/CD Pipeline

**Trigger:** Push to `main` branch

**Steps:**
1. **Build**
   - Checkout code
   - Install dependencies with Yarn
   - Run production build
   - Upload `dist/` artifacts

2. **Migrate** (New!)
   - Checkout code
   - Setup Supabase CLI
   - Run `supabase db push`
   - Apply all migrations from `supabase/migrations/`

3. **Deploy**
   - Download build artifacts
   - Deploy to Cloudflare Pages
   - Project name: `specification-optimiser-hackaton`
   - Domain: https://specificationoptimiser.robota.dev

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

**Environment Variables (Cloudflare Pages):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## What's Working Well

### ✅ Strengths

1. **Solid Foundation**
   - Clean React/TypeScript architecture
   - Type-safe data layer with full TypeScript types
   - Secure authentication with RLS
   - Fast Vite build process

2. **User Experience**
   - Intuitive drag-and-drop block builder
   - Real-time auto-save (no data loss)
   - Keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+K)
   - Responsive design works on tablet/desktop

3. **Developer Experience**
   - Well-organized codebase with clear separation of concerns
   - Comprehensive type definitions
   - Reusable service layer
   - Good error handling with user-friendly toasts

4. **Infrastructure**
   - Automated deployment pipeline
   - Database migrations in version control
   - Secure secrets management
   - Zero-downtime deployments

5. **Scalability Ready**
   - Multi-tenant architecture (organisation table)
   - RLS ensures data isolation
   - Async job queue for heavy processing
   - Edge functions scale automatically

---

## What's Missing / Incomplete

### ❌ Gaps & Technical Debt

1. **ESG Analysis Feature**
   - **Status:** 60% complete
   - **What's Missing:**
     - Material extraction NLP logic in `run-analysis-job` edge function
     - Suggestion generation prompt engineering
     - Frontend ESG Report component (mostly empty)
     - No visualization of carbon metrics
     - No action buttons to apply suggestions
   - **Estimated Effort:** 2-3 weeks (1 backend dev + 1 frontend dev)

2. **Master Library v2 Schema**
   - **Status:** 0% implemented (100% designed)
   - **What's Missing:**
     - Entire frontend rebuild to use v2 schema
     - CAWS library browser UI
     - Master clause selection and field rendering
     - Preliminaries wizard (Section A)
     - Data migration from v1 to v2
   - **Decision Required:** Complete, remove, or phase
   - **Estimated Effort:** 8-12 weeks (if proceeding)

3. **Collaboration Features**
   - No sharing/permissions system
   - No commenting on blocks
   - No revision history / version control
   - No team workspaces
   - **Estimated Effort:** 6-8 weeks

4. **Advanced PDF Export**
   - No customizable templates
   - No table of contents
   - No page numbers / headers / footers
   - No cover page with project info
   - No appendices section
   - **Estimated Effort:** 2-3 weeks

5. **Material Library Management**
   - Seeded with sample data only (~10 materials)
   - No admin interface to add/edit materials
   - No import from EC3, ICE, BECD databases
   - No user-submitted materials
   - **Estimated Effort:** 4-6 weeks for full material management system

6. **Onboarding & Templates**
   - No tutorial or guided tour
   - No project templates or starter kits
   - No sample specifications to learn from
   - **Estimated Effort:** 2 weeks

7. **Testing**
   - No unit tests
   - No integration tests
   - No E2E tests
   - Manual testing only
   - **Risk:** Regressions possible during changes

---

## Critical Architectural Decisions Needed

### Decision 1: Schema Strategy

**Question:** What to do with v2 "CAWS Master Library" schema?

**Options:**

**A. Complete v2 Implementation**
- Rebuild frontend to use v2 schema
- Migrate existing v1 data
- Remove v1 schema after migration
- **Pros:** Professional standard (CAWS), better architecture, scalable
- **Cons:** 8-12 weeks work, complete frontend rewrite, migration risk
- **Recommendation:** Only if targeting UK professional market requiring CAWS compliance

**B. Remove v2 Schema**
- Delete v2 migrations
- Remove unused v2 services
- Continue with v1 schema
- Enhance v1 with needed features
- **Pros:** Faster iteration, less complexity, proven working system
- **Cons:** Misses professional standard, less scalable
- **Recommendation:** If targeting US market or small firms not requiring CAWS

**C. Hybrid Approach**
- Keep both schemas in database
- Continue v1 for now
- Build v2 as opt-in "Pro" tier later
- **Pros:** Defers decision, allows testing market fit first
- **Cons:** Database bloat, confusion, technical debt accumulates
- **Recommendation:** Only as temporary measure (3-6 months max)

### Decision 2: ESG Analysis Completion Priority

**Question:** When to complete ESG feature?

**Options:**

**A. High Priority (Complete in 2-3 weeks)**
- Core differentiator from competitors
- AI-powered sustainability is growing market
- Feature is 60% done, finish line visible
- **Recommendation:** If ESG is key value proposition

**B. Medium Priority (Complete in 1-2 months)**
- Ship v1 without ESG
- Gather user feedback on core builder
- Use feedback to inform ESG UX
- **Recommendation:** If unsure about ESG market fit

**C. Low Priority (Revisit in 3-6 months)**
- Focus on core builder features first
- Build collaboration, templates, advanced PDF
- ESG as future differentiator
- **Recommendation:** If ESG is "nice to have" not "must have"

### Decision 3: Go-to-Market Scope

**Question:** What's the MVP for launch?

**Minimal MVP (2 weeks to launch):**
- Current block builder ✅
- PDF export ✅
- Authentication ✅
- Fix critical bugs only
- Remove ESG tab (coming soon)
- Launch with "Specification Builder" positioning

**ESG-Enabled MVP (4-5 weeks to launch):**
- Complete ESG backend edge functions
- Complete ESG frontend UI
- Launch with "AI-Powered Green Specifications" positioning
- Differentiated offering

**Professional MVP (12-14 weeks to launch):**
- Complete v2 CAWS schema implementation
- Complete ESG feature
- Professional templates
- Advanced PDF export
- Launch with "Professional Specification Platform" positioning

---

## Recommendations

### Immediate Actions (Next 2 Weeks)

1. **Make Schema Decision**
   - Meet with stakeholders: PM, Principal Dev, System Architect
   - Decide v2 schema fate (complete / remove / defer)
   - Document decision in ADR (Architecture Decision Record)
   - **Deliverable:** ADR document, updated roadmap

2. **Fix ESG Edge Function**
   - Complete `run-analysis-job` material extraction logic
   - Implement NLP matching against material library
   - Generate suggestion narratives with alternatives
   - Test end-to-end with real specifications
   - **Deliverable:** Working ESG backend

3. **Complete ESG Frontend**
   - Build ESGReport component UI
   - Display carbon metrics and suggestions
   - Add action buttons (mark seen/dismissed)
   - Polish UX with loading states, error handling
   - **Deliverable:** Working ESG feature

4. **Critical Bug Fixes**
   - Test authentication edge cases
   - Fix any data loss scenarios in auto-save
   - Test PDF export with various block combinations
   - **Deliverable:** Stable core features

### Short-Term (Next 1-2 Months)

5. **Expand Material Library**
   - Add 50-100 common construction materials
   - Source from ICE Database, EC3
   - Include cost and technical data
   - **Deliverable:** Comprehensive material database

6. **User Onboarding**
   - Create sample specifications (3-5 examples)
   - Build project templates for common building types
   - Add first-time user tutorial
   - **Deliverable:** Better first-run experience

7. **Advanced PDF Export**
   - Add table of contents
   - Add page numbers and headers
   - Create customizable cover page
   - **Deliverable:** Professional document output

8. **Analytics & Monitoring**
   - Add error tracking (Sentry or similar)
   - Add usage analytics (PostHog or similar)
   - Monitor ESG analysis job success rates
   - **Deliverable:** Data-driven insights

### Long-Term (Next 3-6 Months)

9. **Collaboration Features**
   - Team workspaces
   - Shared specifications
   - Comments and feedback
   - Revision history
   - **Deliverable:** Multi-user platform

10. **Material Library Management**
    - Admin interface for managing materials
    - Import from external EPD databases
    - User-submitted materials (with approval)
    - **Deliverable:** Self-service material data

11. **Mobile Support**
    - Responsive design for phone screens
    - Touch-optimized drag-and-drop
    - Mobile-friendly forms
    - **Deliverable:** Mobile-accessible app

12. **v2 Schema Migration** (If Proceeding)
    - Complete frontend rebuild
    - Data migration scripts
    - Staged rollout with feature flags
    - **Deliverable:** CAWS-compliant platform

---

## Risk Assessment

### High Priority Risks

**1. Schema Confusion**
- **Risk:** v1 and v2 schemas coexist but only v1 is used
- **Impact:** Developer confusion, wasted database resources, migration complexity
- **Mitigation:** Make schema decision immediately, document clearly

**2. ESG Feature Incomplete**
- **Risk:** Feature advertised but doesn't work, user disappointment
- **Impact:** Negative reviews, churn, credibility loss
- **Mitigation:** Complete ESG feature before launch OR remove tab entirely

**3. No Testing**
- **Risk:** Regressions during changes, bugs in production
- **Impact:** Data loss, user frustration, emergency fixes
- **Mitigation:** Add unit tests for critical paths, E2E tests for user journeys

**4. Gemini API Rate Limits**
- **Risk:** High ESG analysis volume hits per-user rate limits (10/min, 100/hr)
- **Impact:** Failed analyses, user frustration
- **Mitigation:** Queue jobs, batch processing, clear user messaging

### Medium Priority Risks

**5. Material Library Data Quality**
- **Risk:** Carbon data outdated or inaccurate
- **Impact:** Poor ESG suggestions, liability concerns
- **Mitigation:** Source from authoritative databases (EC3, ICE), add disclaimers

**6. PDF Export Limitations**
- **Risk:** Basic PDF output not meeting professional standards
- **Impact:** Users export elsewhere, reduced value proposition
- **Mitigation:** Communicate limitations, prioritize advanced PDF export

**7. Single-User Limitation**
- **Risk:** Architecture firms need collaboration, current version is single-user only
- **Impact:** Limited market, competitive disadvantage
- **Mitigation:** Validate need through user research, prioritize collaboration features

### Low Priority Risks

**8. Cloudflare Pages Limits**
- **Risk:** Static site hosting may not support future features
- **Impact:** May need migration to server-based hosting
- **Mitigation:** Monitor limitations, plan migration if needed

**9. Supabase Vendor Lock-in**
- **Risk:** Heavy dependence on Supabase-specific features
- **Impact:** Difficult to migrate if needed
- **Mitigation:** Acceptable for current stage, re-evaluate at scale

---

## Conclusion

The Architectural Specification AI Green Optimiser has a **solid, working foundation** with a block-based specification builder, authentication, and PDF export fully operational. The architecture is well-designed and scalable.

**The key challenge is incomplete features:**
- ESG analysis is 60% done and represents the core differentiator
- V2 CAWS schema is 0% implemented despite complete database design

**Critical decisions needed:**
1. Complete, remove, or defer v2 schema
2. Prioritize ESG completion for differentiated launch vs ship basic MVP first
3. Define go-to-market scope

**Recommended path:**
1. **Immediate:** Make schema decision, remove v2 or commit to completing it
2. **Next 2-3 weeks:** Complete ESG feature (backend + frontend)
3. **Next 4-6 weeks:** Polish UX, expand material library, add onboarding
4. **Launch:** ESG-enabled MVP with "AI-Powered Green Specifications" positioning

With focused effort on completing the ESG feature and making the schema decision, this product can launch in **4-6 weeks** as a differentiated offering in the construction specification market.
