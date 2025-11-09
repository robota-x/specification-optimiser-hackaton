/**
 * React Query hooks for v2 CAWS Master Library operations
 */

import { useQuery } from '@tanstack/react-query';
import {
  loadContractTypes,
  getContractType,
  loadMasterWorkSections,
  loadMasterWorkSectionsByGroup,
  getMasterWorkSection,
  getMasterWorkSectionByCode,
  loadMasterClauses,
  loadMasterClausesByWorkSection,
  loadPreliminariesClauses,
  getMasterClause,
  getMasterClauseWithSection,
  searchMasterClauses,
  loadMasterLibrary,
  loadMasterLibraryByGroup,
} from '@/lib/services/v2-master-library.service';

// =====================================================================
// CONTRACT TYPE QUERIES
// =====================================================================

/**
 * Load all contract types
 */
export function useContractTypes() {
  return useQuery({
    queryKey: ['v2-contract-types'],
    queryFn: loadContractTypes,
  });
}

/**
 * Get a specific contract type by ID
 */
export function useContractType(contractTypeId: string | undefined) {
  return useQuery({
    queryKey: ['v2-contract-type', contractTypeId],
    queryFn: () => contractTypeId ? getContractType(contractTypeId) : null,
    enabled: !!contractTypeId,
  });
}

// =====================================================================
// MASTER WORK SECTION QUERIES
// =====================================================================

/**
 * Load all master work sections
 */
export function useMasterWorkSections() {
  return useQuery({
    queryKey: ['v2-master-work-sections'],
    queryFn: loadMasterWorkSections,
  });
}

/**
 * Load master work sections grouped by CAWS group
 */
export function useMasterWorkSectionsByGroup() {
  return useQuery({
    queryKey: ['v2-master-work-sections-by-group'],
    queryFn: loadMasterWorkSectionsByGroup,
  });
}

/**
 * Get a specific master work section by ID
 */
export function useMasterWorkSection(workSectionId: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-work-section', workSectionId],
    queryFn: () => workSectionId ? getMasterWorkSection(workSectionId) : null,
    enabled: !!workSectionId,
  });
}

/**
 * Get master work section by CAWS code (e.g., "M10", "F10")
 */
export function useMasterWorkSectionByCode(cawsCode: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-work-section-by-code', cawsCode],
    queryFn: () => cawsCode ? getMasterWorkSectionByCode(cawsCode) : null,
    enabled: !!cawsCode,
  });
}

// =====================================================================
// MASTER CLAUSE QUERIES
// =====================================================================

/**
 * Load all active master clauses
 */
export function useMasterClauses() {
  return useQuery({
    queryKey: ['v2-master-clauses'],
    queryFn: loadMasterClauses,
  });
}

/**
 * Load master clauses for a specific work section
 */
export function useMasterClausesByWorkSection(workSectionId: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-clauses-by-section', workSectionId],
    queryFn: () => workSectionId ? loadMasterClausesByWorkSection(workSectionId) : [],
    enabled: !!workSectionId,
  });
}

/**
 * Load preliminaries clauses for a contract type
 */
export function usePreliminariesClauses(contractTypeId: string | undefined) {
  return useQuery({
    queryKey: ['v2-preliminaries-clauses', contractTypeId],
    queryFn: () => contractTypeId ? loadPreliminariesClauses(contractTypeId) : [],
    enabled: !!contractTypeId,
  });
}

/**
 * Get a specific master clause by ID
 */
export function useMasterClause(masterClauseId: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-clause', masterClauseId],
    queryFn: () => masterClauseId ? getMasterClause(masterClauseId) : null,
    enabled: !!masterClauseId,
  });
}

/**
 * Get master clause with its parent work section
 */
export function useMasterClauseWithSection(masterClauseId: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-clause-with-section', masterClauseId],
    queryFn: () => masterClauseId ? getMasterClauseWithSection(masterClauseId) : null,
    enabled: !!masterClauseId,
  });
}

/**
 * Search master clauses by keyword
 */
export function useSearchMasterClauses(query: string | undefined) {
  return useQuery({
    queryKey: ['v2-search-master-clauses', query],
    queryFn: () => query ? searchMasterClauses(query) : [],
    enabled: !!query && query.length > 0,
  });
}

// =====================================================================
// COMBINED LIBRARY QUERIES
// =====================================================================

/**
 * Load the entire master library (for navigation UI)
 */
export function useMasterLibrary() {
  return useQuery({
    queryKey: ['v2-master-library'],
    queryFn: loadMasterLibrary,
  });
}

/**
 * Load master library filtered by CAWS group
 */
export function useMasterLibraryByGroup(cawsGroup: string | undefined) {
  return useQuery({
    queryKey: ['v2-master-library-by-group', cawsGroup],
    queryFn: () => cawsGroup ? loadMasterLibraryByGroup(cawsGroup) : [],
    enabled: !!cawsGroup,
  });
}
