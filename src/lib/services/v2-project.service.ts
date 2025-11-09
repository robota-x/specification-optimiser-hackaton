/**
 * CAWS Specification Builder v2 - Project Service
 *
 * Service for managing projects (the "instances" side of the architecture).
 * Handles CRUD operations for projects and their clauses.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectWithContractType,
  ProjectClause,
  ProjectClauseInsert,
  ProjectClauseHybridInsert,
  ProjectClauseFreeformInsert,
  ProjectClauseUpdate,
  ProjectClauseWithMaster,
  ProjectClauseFull,
  FieldValues,
} from '@/types/v2-schema';
import { loadPreliminariesClauses } from './v2-master-library.service';

// =====================================================================
// PROJECT CRUD
// =====================================================================

/**
 * Create a new project
 * If contract_type_id is provided, automatically populate with preliminaries clauses
 */
export async function createProject(
  projectData: ProjectInsert,
  organisationId: string
): Promise<Project> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Insert the project
  const { data: project, error: projectError } = await supabase
    .from('project')
    .insert({
      ...projectData,
      organisation_id: organisationId,
      user_id: user.user.id,
    })
    .select()
    .single();

  if (projectError) {
    console.error('Error creating project:', projectError);
    throw new Error(`Failed to create project: ${projectError.message}`);
  }

  // If contract type specified, auto-populate preliminaries
  if (project.contract_type_id) {
    try {
      await populatePreliminaries(project.project_id, project.contract_type_id);
    } catch (error) {
      console.error('Error populating preliminaries:', error);
      // Don't fail the project creation if preliminaries fail
    }
  }

  return project;
}

/**
 * Load all projects for the current user
 */
export async function loadProjects(): Promise<Project[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('user_id', user.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading projects:', error);
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading project:', error);
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return data;
}

/**
 * Get project with contract type details
 */
export async function getProjectWithContractType(
  projectId: string
): Promise<ProjectWithContractType | null> {
  const { data, error } = await supabase
    .from('project')
    .select(`
      *,
      contract_type:contract_type(*)
    `)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading project with contract type:', error);
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return data as ProjectWithContractType;
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: ProjectUpdate
): Promise<Project> {
  const { data, error } = await supabase
    .from('project')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

/**
 * Delete a project (cascades to delete all project_clauses)
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('project')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

// =====================================================================
// PROJECT CLAUSES CRUD
// =====================================================================

/**
 * Load all clauses for a project
 */
export async function loadProjectClauses(projectId: string): Promise<ProjectClause[]> {
  const { data, error } = await supabase
    .from('project_clause')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');

  if (error) {
    console.error('Error loading project clauses:', error);
    throw new Error(`Failed to load project clauses: ${error.message}`);
  }

  return data || [];
}

/**
 * Load project clauses with master clause details
 */
export async function loadProjectClausesWithMasters(
  projectId: string
): Promise<ProjectClauseWithMaster[]> {
  const { data, error } = await supabase
    .from('project_clause')
    .select(`
      *,
      master_clause:master_clause(*)
    `)
    .eq('project_id', projectId)
    .order('sort_order');

  if (error) {
    console.error('Error loading project clauses with masters:', error);
    throw new Error(`Failed to load project clauses: ${error.message}`);
  }

  return data as ProjectClauseWithMaster[];
}

/**
 * Load project clauses with full details (master clause + work section)
 */
export async function loadProjectClausesFull(projectId: string): Promise<ProjectClauseFull[]> {
  const { data, error } = await supabase
    .from('project_clause')
    .select(`
      *,
      master_clause:master_clause(
        *,
        work_section:master_work_section(*)
      )
    `)
    .eq('project_id', projectId)
    .order('sort_order');

  if (error) {
    console.error('Error loading project clauses (full):', error);
    throw new Error(`Failed to load project clauses: ${error.message}`);
  }

  return data as ProjectClauseFull[];
}

/**
 * Add a hybrid block (linked to master clause) to a project
 */
export async function addHybridClause(
  projectId: string,
  masterClauseId: string,
  initialFieldValues?: FieldValues
): Promise<ProjectClause> {
  // Get the next sort order
  const nextOrder = await getNextSortOrder(projectId);

  const clauseData: ProjectClauseHybridInsert = {
    project_id: projectId,
    master_clause_id: masterClauseId,
    field_values: initialFieldValues || {},
    sort_order: nextOrder,
  };

  const { data, error } = await supabase
    .from('project_clause')
    .insert(clauseData)
    .select()
    .single();

  if (error) {
    console.error('Error adding hybrid clause:', error);
    throw new Error(`Failed to add clause: ${error.message}`);
  }

  return data;
}

/**
 * Add a freeform block (custom clause) to a project
 */
export async function addFreeformClause(
  projectId: string,
  cawsNumber: string,
  title: string,
  body?: string
): Promise<ProjectClause> {
  // Get the next sort order
  const nextOrder = await getNextSortOrder(projectId);

  const clauseData: ProjectClauseFreeformInsert = {
    project_id: projectId,
    freeform_caws_number: cawsNumber,
    freeform_title: title,
    freeform_body: body,
    sort_order: nextOrder,
  };

  const { data, error } = await supabase
    .from('project_clause')
    .insert(clauseData)
    .select()
    .single();

  if (error) {
    console.error('Error adding freeform clause:', error);
    throw new Error(`Failed to add freeform clause: ${error.message}`);
  }

  return data;
}

/**
 * Update a project clause (field values, freeform content, or notes)
 */
export async function updateProjectClause(
  clauseId: string,
  updates: ProjectClauseUpdate
): Promise<ProjectClause> {
  const { data, error } = await supabase
    .from('project_clause')
    .update(updates)
    .eq('project_clause_id', clauseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project clause:', error);
    throw new Error(`Failed to update clause: ${error.message}`);
  }

  return data;
}

/**
 * Update field values for a hybrid clause
 */
export async function updateClauseFieldValues(
  clauseId: string,
  fieldValues: FieldValues
): Promise<ProjectClause> {
  return updateProjectClause(clauseId, { field_values: fieldValues });
}

/**
 * Update freeform clause content
 */
export async function updateFreeformClause(
  clauseId: string,
  cawsNumber?: string,
  title?: string,
  body?: string
): Promise<ProjectClause> {
  const updates: ProjectClauseUpdate = {};
  if (cawsNumber !== undefined) updates.freeform_caws_number = cawsNumber;
  if (title !== undefined) updates.freeform_title = title;
  if (body !== undefined) updates.freeform_body = body;

  return updateProjectClause(clauseId, updates);
}

/**
 * Delete a project clause
 */
export async function deleteProjectClause(clauseId: string): Promise<void> {
  const { error } = await supabase
    .from('project_clause')
    .delete()
    .eq('project_clause_id', clauseId);

  if (error) {
    console.error('Error deleting project clause:', error);
    throw new Error(`Failed to delete clause: ${error.message}`);
  }
}

/**
 * Update the sort order of multiple project clauses (for drag-and-drop)
 */
export async function updateClauseSortOrder(
  clauseUpdates: Array<{ clauseId: string; sortOrder: number }>
): Promise<void> {
  // Use a transaction-like approach with Promise.all
  const updatePromises = clauseUpdates.map(({ clauseId, sortOrder }) =>
    supabase
      .from('project_clause')
      .update({ sort_order: sortOrder })
      .eq('project_clause_id', clauseId)
  );

  const results = await Promise.all(updatePromises);

  const errors = results.filter(r => r.error).map(r => r.error);
  if (errors.length > 0) {
    console.error('Error updating clause sort orders:', errors);
    throw new Error(`Failed to update clause order: ${errors[0]?.message}`);
  }
}

// =====================================================================
// PRELIMINARIES AUTO-POPULATION
// =====================================================================

/**
 * Populate a project with preliminaries clauses based on contract type
 * Called automatically when creating a new project with a contract type
 */
async function populatePreliminaries(
  projectId: string,
  contractTypeId: string
): Promise<void> {
  // Load all preliminaries clauses for this contract type
  const prelimsClauses = await loadPreliminariesClauses(contractTypeId);

  if (prelimsClauses.length === 0) {
    console.warn(`No preliminaries clauses found for contract type ${contractTypeId}`);
    return;
  }

  // Insert all preliminaries clauses with sequential sort order
  const clauseInserts: ProjectClauseHybridInsert[] = prelimsClauses.map((masterClause, index) => ({
    project_id: projectId,
    master_clause_id: masterClause.master_clause_id,
    field_values: {},
    sort_order: index,
  }));

  const { error } = await supabase
    .from('project_clause')
    .insert(clauseInserts);

  if (error) {
    console.error('Error populating preliminaries:', error);
    throw new Error(`Failed to populate preliminaries: ${error.message}`);
  }
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Get the next available sort order for a project
 */
async function getNextSortOrder(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('project_clause')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error getting next sort order:', error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  return data[0].sort_order + 1;
}

/**
 * Batch update field values for multiple clauses
 * Useful for auto-save operations
 */
export async function batchUpdateFieldValues(
  updates: Array<{ clauseId: string; fieldValues: FieldValues }>
): Promise<void> {
  const updatePromises = updates.map(({ clauseId, fieldValues }) =>
    updateClauseFieldValues(clauseId, fieldValues)
  );

  await Promise.all(updatePromises);
}

// =====================================================================
// EXPORT ALL
// =====================================================================

export const ProjectService = {
  // Project CRUD
  createProject,
  loadProjects,
  getProject,
  getProjectWithContractType,
  updateProject,
  deleteProject,

  // Project Clauses
  loadProjectClauses,
  loadProjectClausesWithMasters,
  loadProjectClausesFull,
  addHybridClause,
  addFreeformClause,
  updateProjectClause,
  updateClauseFieldValues,
  updateFreeformClause,
  deleteProjectClause,
  updateClauseSortOrder,
  batchUpdateFieldValues,
};

export default ProjectService;
