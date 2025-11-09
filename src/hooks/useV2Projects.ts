/**
 * React Query hooks for v2 CAWS Project operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  loadProjects,
  getProject,
  getProjectWithContractType,
  updateProject,
  deleteProject,
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
} from '@/lib/services/v2-project.service';
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectClause,
  ProjectClauseUpdate,
  FieldValues,
} from '@/types/v2-schema';

// =====================================================================
// PROJECT QUERIES
// =====================================================================

/**
 * Load all projects for current user
 */
export function useProjects() {
  return useQuery({
    queryKey: ['v2-projects'],
    queryFn: loadProjects,
  });
}

/**
 * Get a specific project by ID
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['v2-project', projectId],
    queryFn: () => projectId ? getProject(projectId) : null,
    enabled: !!projectId,
  });
}

/**
 * Get project with contract type details
 */
export function useProjectWithContractType(projectId: string | undefined) {
  return useQuery({
    queryKey: ['v2-project-with-contract', projectId],
    queryFn: () => projectId ? getProjectWithContractType(projectId) : null,
    enabled: !!projectId,
  });
}

// =====================================================================
// PROJECT CLAUSES QUERIES
// =====================================================================

/**
 * Load all clauses for a project
 */
export function useProjectClauses(projectId: string | undefined) {
  return useQuery({
    queryKey: ['v2-project-clauses', projectId],
    queryFn: () => projectId ? loadProjectClauses(projectId) : [],
    enabled: !!projectId,
  });
}

/**
 * Load project clauses with master clause details
 */
export function useProjectClausesWithMasters(projectId: string | undefined) {
  return useQuery({
    queryKey: ['v2-project-clauses-with-masters', projectId],
    queryFn: () => projectId ? loadProjectClausesWithMasters(projectId) : [],
    enabled: !!projectId,
  });
}

/**
 * Load project clauses with full details (master + work section)
 */
export function useProjectClausesFull(projectId: string | undefined) {
  return useQuery({
    queryKey: ['v2-project-clauses-full', projectId],
    queryFn: () => projectId ? loadProjectClausesFull(projectId) : [],
    enabled: !!projectId,
  });
}

// =====================================================================
// PROJECT MUTATIONS
// =====================================================================

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectData, organisationId }: { projectData: ProjectInsert; organisationId: string }) =>
      createProject(projectData, organisationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2-projects'] });
    },
  });
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: ProjectUpdate }) =>
      updateProject(projectId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-projects'] });
      queryClient.invalidateQueries({ queryKey: ['v2-project', data.project_id] });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v2-projects'] });
    },
  });
}

// =====================================================================
// PROJECT CLAUSE MUTATIONS
// =====================================================================

/**
 * Add a hybrid clause (linked to master clause)
 */
export function useAddHybridClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, masterClauseId, initialFieldValues }: {
      projectId: string;
      masterClauseId: string;
      initialFieldValues?: FieldValues;
    }) => addHybridClause(projectId, masterClauseId, initialFieldValues),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', data.project_id] });
    },
  });
}

/**
 * Add a freeform clause (custom content)
 */
export function useAddFreeformClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, cawsNumber, title, body }: {
      projectId: string;
      cawsNumber: string;
      title: string;
      body?: string;
    }) => addFreeformClause(projectId, cawsNumber, title, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', data.project_id] });
    },
  });
}

/**
 * Update a project clause
 */
export function useUpdateProjectClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clauseId, updates }: { clauseId: string; updates: ProjectClauseUpdate }) =>
      updateProjectClause(clauseId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', data.project_id] });
    },
  });
}

/**
 * Update field values for a hybrid clause
 */
export function useUpdateClauseFieldValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clauseId, fieldValues }: { clauseId: string; fieldValues: FieldValues }) =>
      updateClauseFieldValues(clauseId, fieldValues),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', data.project_id] });
    },
  });
}

/**
 * Update freeform clause content
 */
export function useUpdateFreeformClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clauseId, cawsNumber, title, body }: {
      clauseId: string;
      cawsNumber?: string;
      title?: string;
      body?: string;
    }) => updateFreeformClause(clauseId, cawsNumber, title, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', data.project_id] });
    },
  });
}

/**
 * Delete a project clause
 */
export function useDeleteProjectClause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clauseId, projectId }: { clauseId: string; projectId: string }) =>
      deleteProjectClause(clauseId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', variables.projectId] });
    },
  });
}

/**
 * Update clause sort order (for drag-and-drop)
 */
export function useUpdateClauseSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, clauseUpdates }: {
      projectId: string;
      clauseUpdates: Array<{ clauseId: string; sortOrder: number }>;
    }) => updateClauseSortOrder(clauseUpdates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', variables.projectId] });
    },
  });
}

/**
 * Batch update field values
 */
export function useBatchUpdateFieldValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, updates }: {
      projectId: string;
      updates: Array<{ clauseId: string; fieldValues: FieldValues }>;
    }) => batchUpdateFieldValues(updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-with-masters', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['v2-project-clauses-full', variables.projectId] });
    },
  });
}
