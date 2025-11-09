/**
 * CAWS Specification Builder v2 - Product Library React Query Hooks
 *
 * Custom hooks for Product Library data fetching using React Query
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { productLibraryService } from '@/lib/services/v2-product-library.service';
import type { Product, ProductWithClause, ProductWithESGData, ProductFull } from '@/types/v2-schema';

// =====================================================================
// QUERY KEYS
// =====================================================================

export const productLibraryKeys = {
  all: ['v2-product-library'] as const,
  products: () => [...productLibraryKeys.all, 'products'] as const,
  product: (id: string) => [...productLibraryKeys.all, 'product', id] as const,
  forClause: (masterClauseId: string) => [...productLibraryKeys.all, 'for-clause', masterClauseId] as const,
  forClauseWithDetails: (masterClauseId: string) => [...productLibraryKeys.all, 'for-clause-details', masterClauseId] as const,
  forClauseWithESG: (masterClauseId: string) => [...productLibraryKeys.all, 'for-clause-esg', masterClauseId] as const,
  forClauseFull: (masterClauseId: string) => [...productLibraryKeys.all, 'for-clause-full', masterClauseId] as const,
  search: (query: string) => [...productLibraryKeys.all, 'search', query] as const,
  count: (masterClauseId: string) => [...productLibraryKeys.all, 'count', masterClauseId] as const,
};

// =====================================================================
// QUERY HOOKS
// =====================================================================

/**
 * Get products for a specific master clause
 * Primary hook for ProductBrowser component
 */
export function useProductsForClause(
  masterClauseId: string | null | undefined,
  options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product[], Error>({
    queryKey: masterClauseId ? productLibraryKeys.forClause(masterClauseId) : ['v2-product-library', 'disabled'],
    queryFn: () => {
      if (!masterClauseId) throw new Error('Master clause ID is required');
      return productLibraryService.getProductsForClause(masterClauseId);
    },
    enabled: !!masterClauseId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Get a single product by ID
 */
export function useProduct(
  productId: string | null | undefined,
  options?: Omit<UseQueryOptions<Product | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product | null, Error>({
    queryKey: productId ? productLibraryKeys.product(productId) : ['v2-product-library', 'product-disabled'],
    queryFn: () => {
      if (!productId) throw new Error('Product ID is required');
      return productLibraryService.getProduct(productId);
    },
    enabled: !!productId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Get products with master clause details
 */
export function useProductsForClauseWithDetails(
  masterClauseId: string | null | undefined,
  options?: Omit<UseQueryOptions<ProductWithClause[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductWithClause[], Error>({
    queryKey: masterClauseId ? productLibraryKeys.forClauseWithDetails(masterClauseId) : ['v2-product-library', 'details-disabled'],
    queryFn: () => {
      if (!masterClauseId) throw new Error('Master clause ID is required');
      return productLibraryService.getProductsForClauseWithDetails(masterClauseId);
    },
    enabled: !!masterClauseId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Get products with ESG material data (for AI suggestions)
 * Returns products sorted by embodied carbon (lowest first)
 */
export function useProductsForClauseWithESGData(
  masterClauseId: string | null | undefined,
  options?: Omit<UseQueryOptions<ProductWithESGData[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductWithESGData[], Error>({
    queryKey: masterClauseId ? productLibraryKeys.forClauseWithESG(masterClauseId) : ['v2-product-library', 'esg-disabled'],
    queryFn: () => {
      if (!masterClauseId) throw new Error('Master clause ID is required');
      return productLibraryService.getProductsForClauseWithESGData(masterClauseId);
    },
    enabled: !!masterClauseId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Get products with full details (master clause + ESG material)
 */
export function useProductsForClauseFull(
  masterClauseId: string | null | undefined,
  options?: Omit<UseQueryOptions<ProductFull[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductFull[], Error>({
    queryKey: masterClauseId ? productLibraryKeys.forClauseFull(masterClauseId) : ['v2-product-library', 'full-disabled'],
    queryFn: () => {
      if (!masterClauseId) throw new Error('Master clause ID is required');
      return productLibraryService.getProductsForClauseFull(masterClauseId);
    },
    enabled: !!masterClauseId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Search products by manufacturer or product name
 */
export function useSearchProducts(
  query: string | null | undefined,
  options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product[], Error>({
    queryKey: query ? productLibraryKeys.search(query) : ['v2-product-library', 'search-disabled'],
    queryFn: () => {
      if (!query) return [];
      return productLibraryService.searchProducts(query);
    },
    enabled: !!query && query.length >= 2 && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Get all products (admin/debugging)
 */
export function useAllProducts(
  options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product[], Error>({
    queryKey: productLibraryKeys.products(),
    queryFn: () => productLibraryService.getAllProducts(),
    ...options,
  });
}

/**
 * Get count of products for a master clause
 */
export function useProductCountForClause(
  masterClauseId: string | null | undefined,
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<number, Error>({
    queryKey: masterClauseId ? productLibraryKeys.count(masterClauseId) : ['v2-product-library', 'count-disabled'],
    queryFn: () => {
      if (!masterClauseId) throw new Error('Master clause ID is required');
      return productLibraryService.getProductCountForClause(masterClauseId);
    },
    enabled: !!masterClauseId && (options?.enabled ?? true),
    ...options,
  });
}
