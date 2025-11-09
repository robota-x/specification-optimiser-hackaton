/**
 * Master Library Browser - Center panel for browsing CAWS master library
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAddHybridClause, useAddFreeformClause } from '@/hooks/useV2Projects';
import { cn } from '@/lib/utils';
import type { MasterLibrary, MasterWorkSectionWithClauses, MasterClause } from '@/types/v2-schema';
import { ChevronRight, ChevronDown, Plus, Search, FileText, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProductsForClause } from '@/hooks/useV2ProductLibrary';
import type { Product } from '@/types/v2-schema';
import { Package, CheckCircle } from 'lucide-react';

interface MasterLibraryBrowserProps {
  projectId: string;
  masterLibrary?: MasterLibrary;
}

export function MasterLibraryBrowser({ projectId, masterLibrary }: MasterLibraryBrowserProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [freeformDialogOpen, setFreeformDialogOpen] = useState(false);
  const [freeformData, setFreeformData] = useState({
    cawsNumber: '',
    title: '',
    body: '',
  });

  // Product selection modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedMasterClause, setSelectedMasterClause] = useState<MasterClause | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Mutations
  const addHybridClause = useAddHybridClause();
  const addFreeformClause = useAddFreeformClause();

  // Fetch products for selected clause
  const {
    data: products = [],
    isLoading: productsLoading,
  } = useProductsForClause(selectedMasterClause?.master_clause_id || null, {
    enabled: productModalOpen && !!selectedMasterClause,
    onSuccess: (data) => {
      console.log('[MasterLibraryBrowser] Products loaded for clause:', selectedMasterClause?.master_clause_id, 'Count:', data.length, data);
    },
    onError: (error) => {
      console.error('[MasterLibraryBrowser] Failed to load products:', error);
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Open product selection modal
  const handleOpenProductModal = (clause: MasterClause) => {
    console.log('[MasterLibraryBrowser] Opening product modal for clause:', clause.master_clause_id, clause.title);
    setSelectedMasterClause(clause);
    setSelectedProductId(null);
    setProductModalOpen(true);
  };

  // Add clause manually (without product)
  const handleAddManually = async () => {
    if (!selectedMasterClause) return;

    try {
      await addHybridClause.mutateAsync({
        projectId,
        masterClauseId: selectedMasterClause.master_clause_id,
      });

      toast({
        title: 'Clause added',
        description: `${selectedMasterClause.title} has been added to your project`,
      });

      setProductModalOpen(false);
      setSelectedMasterClause(null);
    } catch (error: any) {
      toast({
        title: 'Error adding clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Add clause with selected product
  const handleAddWithProduct = async () => {
    if (!selectedMasterClause || !selectedProductId) return;

    try {
      // Find the selected product to extract its data
      const selectedProduct = products.find((p) => p.product_id === selectedProductId);
      if (!selectedProduct) {
        toast({
          title: 'Error',
          description: 'Selected product not found',
          variant: 'destructive',
        });
        return;
      }

      // Build initial field values from product_data, including the selected_product_id
      const initialFieldValues: Record<string, any> = {
        selected_product_id: selectedProductId,
        ...(selectedProduct.product_data || {}),
      };

      await addHybridClause.mutateAsync({
        projectId,
        masterClauseId: selectedMasterClause.master_clause_id,
        initialFieldValues,
      });

      toast({
        title: 'Clause added with product',
        description: `${selectedMasterClause.title} has been added with ${selectedProduct.product_name}`,
      });

      setProductModalOpen(false);
      setSelectedMasterClause(null);
      setSelectedProductId(null);
    } catch (error: any) {
      toast({
        title: 'Error adding clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenFreeformDialog = () => {
    setFreeformData({
      cawsNumber: '',
      title: '',
      body: '',
    });
    setFreeformDialogOpen(true);
  };

  const handleAddFreeformClause = async () => {
    if (!freeformData.cawsNumber || !freeformData.title) {
      toast({
        title: 'Required fields',
        description: 'CAWS number and title are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addFreeformClause.mutateAsync({
        projectId,
        cawsNumber: freeformData.cawsNumber,
        title: freeformData.title,
        body: freeformData.body,
      });

      toast({
        title: 'Custom clause added',
        description: `${freeformData.title} has been added to your project`,
      });

      setFreeformDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error adding custom clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter work sections and clauses by search query
  const filteredLibrary = masterLibrary?.work_sections.filter((section) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const sectionMatches =
      section.title.toLowerCase().includes(query) ||
      section.caws_code.toLowerCase().includes(query);

    const clauseMatches = section.clauses.some(
      (clause) =>
        clause.title.toLowerCase().includes(query) ||
        clause.caws_number.toLowerCase().includes(query)
    );

    return sectionMatches || clauseMatches;
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header with enhanced styling */}
        <div className="p-5 border-b-2 border-border space-y-3 bg-gradient-to-br from-purple-50 via-card to-blue-50 dark:from-purple-950/20 dark:via-card dark:to-blue-950/20">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight">Master Library</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenFreeformDialog}
                  className="border-2 hover:bg-accent/20 hover:border-accent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a custom freeform clause</TooltipContent>
            </Tooltip>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {!filteredLibrary || filteredLibrary.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="p-3 rounded-xl bg-muted/50 inline-block mb-3">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No clauses found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLibrary.map((section) => {
                const isExpanded = expandedSections.has(section.work_section_id);
                const visibleClauses = searchQuery
                  ? section.clauses.filter(
                      (clause) =>
                        clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        clause.caws_number.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : section.clauses;

                if (searchQuery && visibleClauses.length === 0) {
                  return null;
                }

                return (
                  <div key={section.work_section_id} className="space-y-1">
                    {/* Section header with enhanced styling */}
                    <button
                      onClick={() => toggleSection(section.work_section_id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-accent/20 transition-all duration-200 border-2 border-transparent hover:border-accent/30"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-purple-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-purple-600" />
                      )}
                      <span className="font-mono text-xs font-medium px-2 py-1 rounded-md bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {section.caws_code}
                      </span>
                      <span className="flex-1 text-sm font-medium break-words">{section.title}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium shadow-sm">
                        {section.clauses.length}
                      </span>
                    </button>

                    {/* Clauses in section with enhanced hover */}
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {visibleClauses.map((clause) => (
                          <button
                            key={clause.master_clause_id}
                            onClick={() => handleOpenProductModal(clause)}
                            disabled={addHybridClause.isPending}
                            className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-accent/20 border-2 border-transparent hover:border-accent/30 transition-all duration-200 text-left"
                          >
                            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block mb-1">
                                {clause.caws_number}
                              </div>
                              <div className="text-sm leading-tight font-medium break-words">{clause.title}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

        {/* Freeform Clause Dialog with enhanced styling */}
        <Dialog open={freeformDialogOpen} onOpenChange={setFreeformDialogOpen}>
        <DialogContent className="border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Custom Clause</DialogTitle>
            <DialogDescription className="text-base">
              Create a freeform clause that's not part of the master library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caws_number" className="text-sm font-semibold">CAWS Number *</Label>
              <Input
                id="caws_number"
                value={freeformData.cawsNumber}
                onChange={(e) =>
                  setFreeformData((prev) => ({ ...prev, cawsNumber: e.target.value }))
                }
                placeholder="e.g., F10/999"
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
              <Input
                id="title"
                value={freeformData.title}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Custom Specification Requirement"
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" className="text-sm font-semibold">Content (Markdown supported)</Label>
              <Textarea
                id="body"
                value={freeformData.body}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Enter the clause content..."
                rows={8}
                className="border-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreeformDialogOpen(false)} className="border-2">
              Cancel
            </Button>
            <Button
              onClick={handleAddFreeformClause}
              disabled={addFreeformClause.isPending}
              className="shadow-md"
            >
              Add Clause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selection Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Add Clause to Project
            </DialogTitle>
            <DialogDescription>
              {selectedMasterClause && (
                <span className="font-medium">
                  {selectedMasterClause.caws_number} - {selectedMasterClause.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-3">
              {/* Loading State */}
              {productsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-foreground">Loading products...</p>
                  </div>
                </div>
              )}

              {/* Products List */}
              {!productsLoading && products.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wide px-1 mb-3">
                    Select from product library
                  </div>
                  {(() => {
                    // Group products by manufacturer
                    const productsByManufacturer = products.reduce((acc, product) => {
                      if (!acc[product.manufacturer]) {
                        acc[product.manufacturer] = [];
                      }
                      acc[product.manufacturer].push(product);
                      return acc;
                    }, {} as Record<string, Product[]>);

                    const manufacturers = Object.keys(productsByManufacturer).sort();

                    return manufacturers.map((manufacturer) => (
                      <div key={manufacturer} className="space-y-1.5">
                        <h3 className="font-semibold text-xs text-foreground uppercase tracking-wide px-2 py-1 bg-primary/10 rounded">
                          {manufacturer}
                        </h3>
                        <div className="space-y-1">
                          {productsByManufacturer[manufacturer].map((product) => {
                            const isSelected = selectedProductId === product.product_id;
                            return (
                              <button
                                key={product.product_id}
                                onClick={() => setSelectedProductId(product.product_id)}
                                className={`
                                  w-full text-left px-3 py-2 rounded-md border transition-all
                                  ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 shadow-sm'
                                      : 'border-border hover:border-primary/50 hover:bg-accent/30'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-foreground mb-0.5">{product.product_name}</div>
                                    {product.product_data && Object.keys(product.product_data).length > 0 && (
                                      <div className="text-xs text-foreground/70 flex flex-wrap gap-x-3 gap-y-0.5">
                                        {Object.entries(product.product_data)
                                          .slice(0, 2)
                                          .map(([key, value]) => (
                                            <span key={key}>
                                              <span className="font-medium text-foreground/80">
                                                {key.replace(/_/g, ' ')}:
                                              </span>{' '}
                                              {String(value)}
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Fill Manually Option - Last */}
              {!productsLoading && (
                <>
                  {products.length > 0 && (
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-foreground/60">Or</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedProductId('manual')}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-md border transition-all
                      ${
                        selectedProductId === 'manual'
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/50 hover:bg-accent/30'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">Fill Manually</div>
                        <div className="text-xs text-foreground/70">
                          Add an empty clause and fill in the fields yourself
                        </div>
                      </div>
                      {selectedProductId === 'manual' && (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                </>
              )}

              {/* Empty state when no products */}
              {!productsLoading && products.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No products available in the library for this clause.
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {products.length > 0 && (
                <span>
                  {products.length} {products.length === 1 ? 'product' : 'products'} available
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setProductModalOpen(false);
                  setSelectedProductId(null);
                  setSelectedMasterClause(null);
                }}
                className="border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={selectedProductId === 'manual' ? handleAddManually : handleAddWithProduct}
                disabled={!selectedProductId || addHybridClause.isPending}
                className="shadow-md"
              >
                {addHybridClause.isPending ? 'Adding...' : 'Add to Project'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
