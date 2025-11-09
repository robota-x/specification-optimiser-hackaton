/**
 * CAWS Specification Builder v2 - Product Browser Component
 *
 * Modal dialog for browsing and selecting manufacturer products
 * for a specific master clause (Product-First workflow)
 */

import { useState } from 'react';
import { useProductsForClause } from '@/hooks/useV2ProductLibrary';
import type { Product } from '@/types/v2-schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, CheckCircle } from 'lucide-react';

// =====================================================================
// TYPES
// =====================================================================

export interface ProductBrowserProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Master clause ID to fetch products for */
  masterClauseId: string | null;
  /** CAWS number for display (e.g., "F10/110") */
  cawsNumber?: string;
  /** Clause title for display (e.g., "FACING BRICKS") */
  clauseTitle?: string;
  /** Callback when a product is selected */
  onProductSelect: (product: Product) => void;
}

// =====================================================================
// COMPONENT
// =====================================================================

export function ProductBrowser({
  open,
  onOpenChange,
  masterClauseId,
  cawsNumber,
  clauseTitle,
  onProductSelect,
}: ProductBrowserProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Fetch products for this clause
  const {
    data: products = [],
    isLoading,
    error,
  } = useProductsForClause(masterClauseId, {
    enabled: open && !!masterClauseId,
  });

  // Handle product selection
  const handleSelect = (product: Product) => {
    setSelectedProductId(product.product_id);
  };

  // Handle confirm (close modal and call callback)
  const handleConfirm = () => {
    const selectedProduct = products.find((p) => p.product_id === selectedProductId);
    if (selectedProduct) {
      onProductSelect(selectedProduct);
      onOpenChange(false);
      setSelectedProductId(null); // Reset selection
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
    setSelectedProductId(null); // Reset selection
  };

  // Group products by manufacturer
  const productsByManufacturer = products.reduce((acc, product) => {
    if (!acc[product.manufacturer]) {
      acc[product.manufacturer] = [];
    }
    acc[product.manufacturer].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const manufacturers = Object.keys(productsByManufacturer).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Browse Product Library
          </DialogTitle>
          <DialogDescription>
            {cawsNumber && clauseTitle && (
              <span className="font-medium">
                {cawsNumber} - {clauseTitle}
              </span>
            )}
            {!cawsNumber && !clauseTitle && masterClauseId && (
              <span>Select a product to auto-populate the specification fields</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading products...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load products. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!isLoading && !error && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                There are no manufacturer products in the library for this clause yet.
                Please fill in the fields manually or contact your administrator.
              </p>
            </div>
          )}

          {/* Products List */}
          {!isLoading && !error && products.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {manufacturers.map((manufacturer) => (
                  <div key={manufacturer} className="space-y-2">
                    {/* Manufacturer Header */}
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {manufacturer}
                    </h3>

                    {/* Products for this manufacturer */}
                    <div className="space-y-2">
                      {productsByManufacturer[manufacturer].map((product) => {
                        const isSelected = selectedProductId === product.product_id;

                        return (
                          <button
                            key={product.product_id}
                            onClick={() => handleSelect(product)}
                            className={`
                              w-full text-left p-4 rounded-lg border-2 transition-all
                              ${
                                isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
                              }
                            `}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                {/* Product Name */}
                                <div className="font-medium mb-1">
                                  {product.product_name}
                                </div>

                                {/* Product Data Preview */}
                                {product.product_data && Object.keys(product.product_data).length > 0 && (
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    {Object.entries(product.product_data)
                                      .slice(0, 3)
                                      .map(([key, value]) => (
                                        <div key={key}>
                                          <span className="font-medium capitalize">
                                            {key.replace(/_/g, ' ')}:
                                          </span>{' '}
                                          {String(value)}
                                        </div>
                                      ))}
                                    {Object.keys(product.product_data).length > 3 && (
                                      <div className="text-muted-foreground/70 italic">
                                        +{Object.keys(product.product_data).length - 3} more fields
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Selected Indicator */}
                              {isSelected && (
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {products.length > 0 && (
              <span>
                {products.length} {products.length === 1 ? 'product' : 'products'} available
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedProductId || isLoading}
            >
              Select Product
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
