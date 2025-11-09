/**
 * CAWS Specification Builder v2 - Master Library Service
 *
 * Service for fetching master work sections and clauses from the Practice Library.
 * This is the "read-only" side of the Masters vs Instances architecture.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  MasterWorkSection,
  MasterWorkSectionWithClauses,
  MasterClause,
  MasterClauseWithSection,
  ContractType,
  MasterLibrary,
} from '@/types/v2-schema';

// =====================================================================
// CONTRACT TYPES
// =====================================================================

/**
 * Load all contract types
 */
export async function loadContractTypes(): Promise<ContractType[]> {
  const { data, error } = await supabase
    .from('contract_type')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error loading contract types:', error);
    throw new Error(`Failed to load contract types: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific contract type by ID
 */
export async function getContractType(contractTypeId: string): Promise<ContractType | null> {
  const { data, error } = await supabase
    .from('contract_type')
    .select('*')
    .eq('contract_type_id', contractTypeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading contract type:', error);
    throw new Error(`Failed to load contract type: ${error.message}`);
  }

  return data;
}

// =====================================================================
// MASTER WORK SECTIONS
// =====================================================================

/**
 * Load all master work sections (for library navigation tree)
 */
export async function loadMasterWorkSections(): Promise<MasterWorkSection[]> {
  const { data, error } = await supabase
    .from('master_work_section')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error loading master work sections:', error);
    throw new Error(`Failed to load work sections: ${error.message}`);
  }

  return data || [];
}

/**
 * Load master work sections grouped by CAWS group (A, F, M, etc.)
 */
export async function loadMasterWorkSectionsByGroup(): Promise<Record<string, MasterWorkSection[]>> {
  const sections = await loadMasterWorkSections();

  return sections.reduce((acc, section) => {
    const group = section.caws_group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(section);
    return acc;
  }, {} as Record<string, MasterWorkSection[]>);
}

/**
 * Get a specific master work section by ID
 */
export async function getMasterWorkSection(workSectionId: string): Promise<MasterWorkSection | null> {
  const { data, error } = await supabase
    .from('master_work_section')
    .select('*')
    .eq('work_section_id', workSectionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading master work section:', error);
    throw new Error(`Failed to load work section: ${error.message}`);
  }

  return data;
}

/**
 * Get master work section by CAWS code (e.g., "M10", "F10")
 */
export async function getMasterWorkSectionByCode(cawsCode: string): Promise<MasterWorkSection | null> {
  const { data, error } = await supabase
    .from('master_work_section')
    .select('*')
    .eq('caws_code', cawsCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading master work section by code:', error);
    throw new Error(`Failed to load work section: ${error.message}`);
  }

  return data;
}

// =====================================================================
// MASTER CLAUSES
// =====================================================================

/**
 * Load all active master clauses
 */
export async function loadMasterClauses(): Promise<MasterClause[]> {
  const { data, error } = await supabase
    .from('master_clause')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error loading master clauses:', error);
    throw new Error(`Failed to load master clauses: ${error.message}`);
  }

  return data || [];
}

/**
 * Load master clauses for a specific work section
 */
export async function loadMasterClausesByWorkSection(
  workSectionId: string
): Promise<MasterClause[]> {
  const { data, error } = await supabase
    .from('master_clause')
    .select('*')
    .eq('work_section_id', workSectionId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error loading master clauses for work section:', error);
    throw new Error(`Failed to load master clauses: ${error.message}`);
  }

  return data || [];
}

/**
 * Load master clauses for a specific contract type (Preliminaries - Section A)
 */
export async function loadPreliminariesClauses(
  contractTypeId: string
): Promise<MasterClause[]> {
  const { data, error } = await supabase
    .from('master_clause')
    .select('*')
    .eq('contract_type_id', contractTypeId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error loading preliminaries clauses:', error);
    throw new Error(`Failed to load preliminaries clauses: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific master clause by ID
 */
export async function getMasterClause(masterClauseId: string): Promise<MasterClause | null> {
  const { data, error } = await supabase
    .from('master_clause')
    .select('*')
    .eq('master_clause_id', masterClauseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading master clause:', error);
    throw new Error(`Failed to load master clause: ${error.message}`);
  }

  return data;
}

/**
 * Get master clause with its parent work section
 */
export async function getMasterClauseWithSection(
  masterClauseId: string
): Promise<MasterClauseWithSection | null> {
  const { data, error } = await supabase
    .from('master_clause')
    .select(`
      *,
      work_section:master_work_section(*)
    `)
    .eq('master_clause_id', masterClauseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error loading master clause with section:', error);
    throw new Error(`Failed to load master clause: ${error.message}`);
  }

  return data as MasterClauseWithSection;
}

/**
 * Search master clauses by keyword (title or CAWS number)
 */
export async function searchMasterClauses(query: string): Promise<MasterClause[]> {
  const { data, error } = await supabase
    .from('master_clause')
    .select('*')
    .eq('is_active', true)
    .or(`title.ilike.%${query}%,caws_number.ilike.%${query}%`)
    .order('sort_order')
    .limit(50);

  if (error) {
    console.error('Error searching master clauses:', error);
    throw new Error(`Failed to search master clauses: ${error.message}`);
  }

  return data || [];
}

// =====================================================================
// COMBINED LIBRARY LOADING
// =====================================================================

/**
 * Load the entire master library (work sections with nested clauses)
 * This is optimized for building the library navigation UI
 */
export async function loadMasterLibrary(): Promise<MasterLibrary> {
  // Load work sections and clauses in parallel
  const [workSections, allClauses, contractTypes] = await Promise.all([
    loadMasterWorkSections(),
    loadMasterClauses(),
    loadContractTypes(),
  ]);

  // Group clauses by work section
  const clausesBySection = allClauses.reduce((acc, clause) => {
    const sectionId = clause.work_section_id;
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(clause);
    return acc;
  }, {} as Record<string, MasterClause[]>);

  // Combine work sections with their clauses
  const work_sections: MasterWorkSectionWithClauses[] = workSections.map(section => ({
    ...section,
    clauses: clausesBySection[section.work_section_id] || [],
  }));

  return {
    work_sections,
    contract_types: contractTypes,
  };
}

/**
 * Load master library filtered by CAWS group (e.g., "F" for Masonry)
 */
export async function loadMasterLibraryByGroup(cawsGroup: string): Promise<MasterWorkSectionWithClauses[]> {
  const { data: workSections, error: sectionsError } = await supabase
    .from('master_work_section')
    .select('*')
    .eq('caws_group', cawsGroup)
    .order('sort_order');

  if (sectionsError) {
    console.error('Error loading work sections by group:', sectionsError);
    throw new Error(`Failed to load work sections: ${sectionsError.message}`);
  }

  if (!workSections || workSections.length === 0) {
    return [];
  }

  // Load clauses for these sections
  const sectionIds = workSections.map(s => s.work_section_id);
  const { data: clauses, error: clausesError } = await supabase
    .from('master_clause')
    .select('*')
    .in('work_section_id', sectionIds)
    .eq('is_active', true)
    .order('sort_order');

  if (clausesError) {
    console.error('Error loading clauses for work sections:', clausesError);
    throw new Error(`Failed to load clauses: ${clausesError.message}`);
  }

  // Group clauses by section
  const clausesBySection = (clauses || []).reduce((acc, clause) => {
    const sectionId = clause.work_section_id;
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(clause);
    return acc;
  }, {} as Record<string, MasterClause[]>);

  // Combine
  return workSections.map(section => ({
    ...section,
    clauses: clausesBySection[section.work_section_id] || [],
  }));
}

// =====================================================================
// EXPORT ALL
// =====================================================================

export const MasterLibraryService = {
  // Contract Types
  loadContractTypes,
  getContractType,

  // Work Sections
  loadMasterWorkSections,
  loadMasterWorkSectionsByGroup,
  getMasterWorkSection,
  getMasterWorkSectionByCode,

  // Master Clauses
  loadMasterClauses,
  loadMasterClausesByWorkSection,
  loadPreliminariesClauses,
  getMasterClause,
  getMasterClauseWithSection,
  searchMasterClauses,

  // Combined Library
  loadMasterLibrary,
  loadMasterLibraryByGroup,
};

export default MasterLibraryService;
