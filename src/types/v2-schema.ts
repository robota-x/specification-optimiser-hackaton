/**
 * CAWS Specification Builder v2 - TypeScript Type Definitions
 *
 * This file contains type definitions for the v2 database schema
 * implementing the "Masters vs Instances" architecture for CAWS.
 */

// =====================================================================
// FIELD DEFINITIONS
// =====================================================================

/**
 * Field types supported in master clause templates
 */
export type FieldType = "text" | "textarea" | "list" | "date" | "number";

/**
 * Field definition structure in master_clause.field_definitions
 */
export interface FieldDefinition {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
}

/**
 * Field value types that can be stored in project_clause.field_values
 */
export type FieldValue = string | string[] | number | null;

/**
 * Field values object (key-value pairs)
 */
export type FieldValues = Record<string, FieldValue>;

// =====================================================================
// DATABASE TABLES - ROW TYPES
// =====================================================================

/**
 * Organisation table (multi-tenant)
 */
export interface Organisation {
  organisation_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Contract Type table (for Preliminaries - Section A)
 */
export interface ContractType {
  contract_type_id: string;
  organisation_id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Master Work Section table (CAWS folders/sections)
 */
export interface MasterWorkSection {
  work_section_id: string;
  organisation_id: string;
  caws_group: string;
  caws_code: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Master Clause table (Practice Masters library - Hybrid Block templates)
 */
export interface MasterClause {
  master_clause_id: string;
  work_section_id: string;
  caws_number: string;
  title: string;
  body_template: string | null;
  field_definitions: FieldDefinition[];
  guidance_text: string | null;
  contract_type_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project table (replaces "specs" - includes preliminaries data)
 */
export interface Project {
  project_id: string;
  organisation_id: string;
  user_id: string;
  name: string;
  description: string | null;

  // Preliminaries data (Section A wizard)
  project_location: string | null;
  client_name: string | null;
  contract_type_id: string | null;
  architect_name: string | null;
  principal_designer: string | null;
  employer_name: string | null;
  project_reference: string | null;

  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Project Clause table (clause instances - handles Hybrid AND Freeform blocks)
 */
export interface ProjectClause {
  project_clause_id: string;
  project_id: string;

  // Hybrid Block fields
  master_clause_id: string | null;
  field_values: FieldValues | null;

  // Freeform Block fields
  freeform_caws_number: string | null;
  freeform_title: string | null;
  freeform_body: string | null;

  // Metadata
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// INSERT/UPDATE TYPES
// =====================================================================

/**
 * Type for inserting a new organisation
 */
export type OrganisationInsert = Omit<Organisation, 'organisation_id' | 'created_at' | 'updated_at'> & {
  organisation_id?: string;
};

/**
 * Type for inserting a new contract type
 */
export type ContractTypeInsert = Omit<ContractType, 'contract_type_id' | 'created_at' | 'updated_at'> & {
  contract_type_id?: string;
};

/**
 * Type for inserting a new master work section
 */
export type MasterWorkSectionInsert = Omit<MasterWorkSection, 'work_section_id' | 'created_at' | 'updated_at'> & {
  work_section_id?: string;
  sort_order?: number;
};

/**
 * Type for inserting a new master clause
 */
export type MasterClauseInsert = Omit<MasterClause, 'master_clause_id' | 'created_at' | 'updated_at'> & {
  master_clause_id?: string;
  sort_order?: number;
  is_active?: boolean;
};

/**
 * Type for inserting a new project
 */
export type ProjectInsert = Omit<Project, 'project_id' | 'created_at' | 'updated_at'> & {
  project_id?: string;
  status?: string;
};

/**
 * Type for inserting a new project clause (Hybrid Block)
 */
export type ProjectClauseHybridInsert = {
  project_clause_id?: string;
  project_id: string;
  master_clause_id: string;
  field_values?: FieldValues;
  sort_order: number;
  notes?: string;
};

/**
 * Type for inserting a new project clause (Freeform Block)
 */
export type ProjectClauseFreeformInsert = {
  project_clause_id?: string;
  project_id: string;
  freeform_caws_number: string;
  freeform_title: string;
  freeform_body?: string;
  sort_order: number;
  notes?: string;
};

/**
 * Union type for inserting any project clause
 */
export type ProjectClauseInsert = ProjectClauseHybridInsert | ProjectClauseFreeformInsert;

/**
 * Type for updating a project
 */
export type ProjectUpdate = Partial<Omit<Project, 'project_id' | 'organisation_id' | 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * Type for updating a project clause
 */
export type ProjectClauseUpdate = Partial<Omit<ProjectClause, 'project_clause_id' | 'project_id' | 'created_at' | 'updated_at'>>;

// =====================================================================
// EXTENDED/JOINED TYPES
// =====================================================================

/**
 * Master Work Section with nested clauses
 */
export interface MasterWorkSectionWithClauses extends MasterWorkSection {
  clauses: MasterClause[];
}

/**
 * Master Clause with parent work section
 */
export interface MasterClauseWithSection extends MasterClause {
  work_section: MasterWorkSection;
}

/**
 * Project with contract type details
 */
export interface ProjectWithContractType extends Project {
  contract_type: ContractType | null;
}

/**
 * Project Clause with master clause details (for Hybrid Blocks)
 */
export interface ProjectClauseWithMaster extends ProjectClause {
  master_clause: MasterClause | null;
}

/**
 * Fully populated project clause with all related data
 */
export interface ProjectClauseFull extends ProjectClause {
  master_clause: (MasterClause & {
    work_section: MasterWorkSection;
  }) | null;
}

// =====================================================================
// UI/DISPLAY TYPES
// =====================================================================

/**
 * Categorized master library structure for UI
 */
export interface MasterLibrary {
  work_sections: MasterWorkSectionWithClauses[];
  contract_types: ContractType[];
}

/**
 * Project clause type discriminator
 */
export type ProjectClauseType = 'hybrid' | 'freeform';

/**
 * Helper to determine clause type
 */
export function getProjectClauseType(clause: ProjectClause): ProjectClauseType {
  return clause.master_clause_id !== null ? 'hybrid' : 'freeform';
}

/**
 * Helper to check if clause is hybrid
 */
export function isHybridClause(clause: ProjectClause): clause is ProjectClause & { master_clause_id: string } {
  return clause.master_clause_id !== null;
}

/**
 * Helper to check if clause is freeform
 */
export function isFreeformClause(clause: ProjectClause): clause is ProjectClause & { freeform_caws_number: string } {
  return clause.master_clause_id === null && clause.freeform_caws_number !== null;
}

// =====================================================================
// TEMPLATE RENDERING TYPES
// =====================================================================

/**
 * Rendered clause output (after merging template with field values)
 */
export interface RenderedClause {
  caws_number: string;
  title: string;
  body: string;
  notes?: string;
}

/**
 * Helper function to render a hybrid clause
 */
export function renderHybridClause(
  masterClause: MasterClause,
  fieldValues: FieldValues = {}
): RenderedClause {
  let body = masterClause.body_template || '';

  // Replace {{field_name}} placeholders with actual values
  Object.entries(fieldValues).forEach(([fieldName, value]) => {
    const placeholder = `{{${fieldName}}}`;
    const displayValue = Array.isArray(value)
      ? value.map(v => `- ${v}`).join('\n')
      : String(value || '');
    body = body.replace(new RegExp(placeholder, 'g'), displayValue);
  });

  return {
    caws_number: masterClause.caws_number,
    title: masterClause.title,
    body,
  };
}

/**
 * Helper function to render a freeform clause
 */
export function renderFreeformClause(clause: ProjectClause): RenderedClause {
  if (!isFreeformClause(clause)) {
    throw new Error('Cannot render freeform clause: not a freeform clause');
  }

  return {
    caws_number: clause.freeform_caws_number,
    title: clause.freeform_title || '',
    body: clause.freeform_body || '',
    notes: clause.notes || undefined,
  };
}

/**
 * Helper function to render any project clause
 */
export function renderProjectClause(
  clause: ProjectClause,
  masterClause?: MasterClause
): RenderedClause {
  if (isHybridClause(clause)) {
    if (!masterClause) {
      throw new Error('Master clause required to render hybrid clause');
    }
    return renderHybridClause(masterClause, clause.field_values || {});
  } else {
    return renderFreeformClause(clause);
  }
}

// =====================================================================
// VALIDATION HELPERS
// =====================================================================

/**
 * Validate field value against field definition
 */
export function validateFieldValue(
  value: FieldValue,
  definition: FieldDefinition
): { valid: boolean; error?: string } {
  // Required field check
  if (definition.required && (value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
    return { valid: false, error: `${definition.label} is required` };
  }

  // Type-specific validation
  if (value !== null && value !== '') {
    switch (definition.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          return { valid: false, error: `${definition.label} must be text` };
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return { valid: false, error: `${definition.label} must be a number` };
        }
        break;
      case 'list':
        if (!Array.isArray(value)) {
          return { valid: false, error: `${definition.label} must be a list` };
        }
        if (!value.every(item => typeof item === 'string')) {
          return { valid: false, error: `${definition.label} must contain only text items` };
        }
        break;
    }
  }

  return { valid: true };
}

/**
 * Validate all field values against definitions
 */
export function validateFieldValues(
  values: FieldValues,
  definitions: FieldDefinition[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  definitions.forEach(def => {
    const value = values[def.name];
    const result = validateFieldValue(value, def);
    if (!result.valid && result.error) {
      errors[def.name] = result.error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get empty field values for a master clause
 */
export function getEmptyFieldValues(masterClause: MasterClause): FieldValues {
  const values: FieldValues = {};

  masterClause.field_definitions.forEach(def => {
    switch (def.type) {
      case 'list':
        values[def.name] = [];
        break;
      case 'number':
        values[def.name] = null;
        break;
      default:
        values[def.name] = '';
    }
  });

  return values;
}

// =====================================================================
// ESG OPTIMIZATION ENGINE - TYPE DEFINITIONS
// =====================================================================

/**
 * NLP Tags structure for material matching
 */
export interface NLPTags {
  synonyms?: string[];
  tags?: string[];
}

/**
 * ESG Material Library table (canonical database of materials)
 */
export interface ESGMaterialLibrary {
  esg_material_id: string;
  organisation_id: string | null;
  name: string;
  data_source: string;
  external_id: string | null;
  embodied_carbon: number;
  carbon_unit: string;
  cost_impact_text: string | null;
  modifications_text: string | null;
  alternative_to_ids: string[] | null;
  nlp_tags: NLPTags;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project Analysis Job table (manages async ESG analysis workflow)
 */
export interface ProjectAnalysisJob {
  job_id: string;
  project_id: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Project ESG Suggestion table (AI-generated suggestions/reports)
 */
export interface ProjectESGSuggestion {
  suggestion_id: string;
  project_id: string;
  source_clause_id: string | null;
  suggestion_title: string;
  suggestion_narrative: string;
  status: 'new' | 'seen' | 'dismissed';
  created_at: string;
  updated_at: string;
}

// =====================================================================
// ESG INSERT/UPDATE TYPES
// =====================================================================

/**
 * Type for inserting a new ESG material
 */
export type ESGMaterialLibraryInsert = Omit<ESGMaterialLibrary, 'esg_material_id' | 'created_at' | 'updated_at'> & {
  esg_material_id?: string;
  is_active?: boolean;
};

/**
 * Type for inserting a new analysis job
 */
export type ProjectAnalysisJobInsert = Omit<ProjectAnalysisJob, 'job_id' | 'created_at' | 'completed_at'> & {
  job_id?: string;
  status?: 'queued' | 'running' | 'complete' | 'failed';
};

/**
 * Type for inserting a new ESG suggestion
 */
export type ProjectESGSuggestionInsert = Omit<ProjectESGSuggestion, 'suggestion_id' | 'created_at' | 'updated_at'> & {
  suggestion_id?: string;
  status?: 'new' | 'seen' | 'dismissed';
};

// =====================================================================
// ESG EXTENDED TYPES (with joins)
// =====================================================================

/**
 * Project with its latest analysis job
 */
export interface ProjectWithAnalysisJob extends Project {
  latest_analysis_job?: ProjectAnalysisJob;
}

/**
 * ESG Suggestion with project details
 */
export interface ESGSuggestionWithProject extends ProjectESGSuggestion {
  project?: Project;
}

/**
 * ESG Material with alternatives (fully populated)
 */
export interface ESGMaterialWithAlternatives extends ESGMaterialLibrary {
  alternatives?: ESGMaterialLibrary[];
}

// =====================================================================
// PRODUCT LIBRARY - TYPE DEFINITIONS
// =====================================================================

/**
 * Product Library table (real-world manufacturer products linked to master clauses)
 */
export interface Product {
  product_id: string;
  master_clause_id: string;
  esg_material_id: string | null;
  manufacturer: string;
  product_name: string;
  product_data: FieldValues;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product with master clause details
 */
export interface ProductWithClause extends Product {
  master_clause: MasterClause;
}

/**
 * Product with ESG material data (for AI-powered suggestions)
 */
export interface ProductWithESGData extends Product {
  esg_material: ESGMaterialLibrary | null;
}

/**
 * Product with full details (master clause + ESG material)
 */
export interface ProductFull extends Product {
  master_clause: MasterClause;
  esg_material: ESGMaterialLibrary | null;
}

// =====================================================================
// PRODUCT INSERT/UPDATE TYPES
// =====================================================================

/**
 * Type for inserting a new product
 */
export type ProductInsert = Omit<Product, 'product_id' | 'created_at' | 'updated_at'> & {
  product_id?: string;
  is_active?: boolean;
};

/**
 * Type for updating a product
 */
export type ProductUpdate = Partial<Omit<Product, 'product_id' | 'master_clause_id' | 'created_at' | 'updated_at'>>;
