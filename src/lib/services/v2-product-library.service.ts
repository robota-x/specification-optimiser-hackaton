/**
 * CAWS Specification Builder v2 - Product Library Service
 *
 * Service layer for accessing the Product Library
 * Provides real-world manufacturer products for "Product-First" workflow
 */

import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductWithClause, ProductWithESGData, ProductFull } from '@/types/v2-schema';

// =====================================================================
// ERROR HANDLING
// =====================================================================

class ProductLibraryError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'ProductLibraryError';
  }
}

// =====================================================================
// PRODUCT QUERIES
// =====================================================================

/**
 * Load all products for a specific master clause
 * This is the main query for the ProductBrowser component
 */
export async function getProductsForClause(masterClauseId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select('*')
      .eq('master_clause_id', masterClauseId)
      .eq('is_active', true)
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError(
      `Failed to load products for clause ${masterClauseId}`,
      error
    );
  }
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  } catch (error) {
    throw new ProductLibraryError(`Failed to load product ${productId}`, error);
  }
}

/**
 * Get products with master clause details
 */
export async function getProductsForClauseWithDetails(
  masterClauseId: string
): Promise<ProductWithClause[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select(`
        *,
        master_clause:master_clause_id (*)
      `)
      .eq('master_clause_id', masterClauseId)
      .eq('is_active', true)
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError(
      `Failed to load products with details for clause ${masterClauseId}`,
      error
    );
  }
}

/**
 * Get products with ESG material data (for AI suggestions)
 * Orders by embodied carbon (lowest first)
 */
export async function getProductsForClauseWithESGData(
  masterClauseId: string
): Promise<ProductWithESGData[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select(`
        *,
        esg_material:esg_material_id (*)
      `)
      .eq('master_clause_id', masterClauseId)
      .eq('is_active', true)
      .order('esg_material.embodied_carbon', { ascending: true, nullsFirst: false })
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError(
      `Failed to load products with ESG data for clause ${masterClauseId}`,
      error
    );
  }
}

/**
 * Get products with full details (master clause + ESG material)
 */
export async function getProductsForClauseFull(
  masterClauseId: string
): Promise<ProductFull[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select(`
        *,
        master_clause:master_clause_id (*),
        esg_material:esg_material_id (*)
      `)
      .eq('master_clause_id', masterClauseId)
      .eq('is_active', true)
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError(
      `Failed to load products with full details for clause ${masterClauseId}`,
      error
    );
  }
}

/**
 * Search products by manufacturer or product name
 */
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select('*')
      .or(`manufacturer.ilike.%${query}%,product_name.ilike.%${query}%`)
      .eq('is_active', true)
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError(`Failed to search products for query: ${query}`, error);
  }
}

/**
 * Get all products (admin/debugging)
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('product_library')
      .select('*')
      .eq('is_active', true)
      .order('manufacturer', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new ProductLibraryError('Failed to load all products', error);
  }
}

/**
 * Get count of products for a master clause
 */
export async function getProductCountForClause(masterClauseId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('product_library')
      .select('*', { count: 'exact', head: true })
      .eq('master_clause_id', masterClauseId)
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    throw new ProductLibraryError(
      `Failed to get product count for clause ${masterClauseId}`,
      error
    );
  }
}

// =====================================================================
// EXPORTS
// =====================================================================

export const productLibraryService = {
  getProductsForClause,
  getProduct,
  getProductsForClauseWithDetails,
  getProductsForClauseWithESGData,
  getProductsForClauseFull,
  searchProducts,
  getAllProducts,
  getProductCountForClause,
};
