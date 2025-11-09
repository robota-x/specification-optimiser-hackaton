/**
 * Clause Editor - Right panel for editing selected clause
 * Supports both Hybrid (master-based) and Freeform clauses
 */

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  useUpdateClauseFieldValues,
  useUpdateFreeformClause,
  useDeleteProjectClause,
} from '@/hooks/useV2Projects';
import type { ProjectClauseFull, FieldValues, FieldDefinition, Product } from '@/types/v2-schema';
import { isHybridClause, isFreeformClause, renderHybridClause } from '@/types/v2-schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProductBrowser } from './ProductBrowser';

interface ClauseEditorProps {
  projectId: string;
  clause: ProjectClauseFull | null;
  onClauseUpdated: () => void;
}

export function ClauseEditor({ projectId, clause, onClauseUpdated }: ClauseEditorProps) {
  const { toast } = useToast();

  // Hybrid clause state
  const [fieldValues, setFieldValues] = useState<FieldValues>({});

  // Freeform clause state
  const [freeformCawsNumber, setFreeformCawsNumber] = useState('');
  const [freeformTitle, setFreeformTitle] = useState('');
  const [freeformBody, setFreeformBody] = useState('');

  // Notes (shared between both types)
  const [notes, setNotes] = useState('');

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productBrowserOpen, setProductBrowserOpen] = useState(false);

  // Mutations
  const updateFieldValues = useUpdateClauseFieldValues();
  const updateFreeform = useUpdateFreeformClause();
  const deleteClause = useDeleteProjectClause();

  // Load clause data when clause changes
  useEffect(() => {
    if (!clause) {
      setFieldValues({});
      setFreeformCawsNumber('');
      setFreeformTitle('');
      setFreeformBody('');
      setNotes('');
      setHasUnsavedChanges(false);
      return;
    }

    if (isHybridClause(clause)) {
      // Load hybrid clause field values
      setFieldValues(clause.field_values || {});
    } else if (isFreeformClause(clause)) {
      // Load freeform clause data
      setFreeformCawsNumber(clause.freeform_caws_number || '');
      setFreeformTitle(clause.freeform_title || '');
      setFreeformBody(clause.freeform_body || '');
    }

    // Load notes (shared field)
    setNotes(clause.notes || '');
    setHasUnsavedChanges(false);
  }, [clause]);

  // Auto-save after 30 seconds of inactivity
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave(true); // isAutoSave = true
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, fieldValues, freeformCawsNumber, freeformTitle, freeformBody, notes]);

  // Render preview for hybrid clauses
  const renderedPreview = useMemo(() => {
    if (!clause) return null;

    if (isHybridClause(clause) && clause.master_clause) {
      try {
        return renderHybridClause(clause.master_clause, fieldValues);
      } catch (error) {
        console.error('Error rendering preview:', error);
        return null;
      }
    }

    return null;
  }, [clause, fieldValues]);

  const handleSave = async (isAutoSave = false) => {
    if (!clause) return;

    try {
      if (isHybridClause(clause)) {
        await updateFieldValues.mutateAsync({
          clauseId: clause.project_clause_id,
          fieldValues,
        });
      } else if (isFreeformClause(clause)) {
        await updateFreeform.mutateAsync({
          clauseId: clause.project_clause_id,
          cawsNumber: freeformCawsNumber,
          title: freeformTitle,
          body: freeformBody,
        });
      }

      // Update notes (separate mutation if needed - for now we'll include in the above)
      // The service already supports notes in ProjectClauseUpdate

      setHasUnsavedChanges(false);
      onClauseUpdated();

      if (!isAutoSave) {
        toast({
          title: 'Saved',
          description: 'Clause has been updated',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error saving clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!clause) return;

    try {
      await deleteClause.mutateAsync({
        clauseId: clause.project_clause_id,
        projectId,
      });

      toast({
        title: 'Clause deleted',
        description: 'Clause has been removed from your project',
      });

      onClauseUpdated();
    } catch (error: any) {
      toast({
        title: 'Error deleting clause',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleProductSelect = async (product: Product) => {
    if (!clause || !isHybridClause(clause)) return;

    try {
      // Merge product data with existing field values
      const updatedFieldValues: FieldValues = {
        ...fieldValues,
        ...product.product_data,
        // Store the selected product ID for tracking
        selected_product_id: product.product_id,
      };

      // Update local state
      setFieldValues(updatedFieldValues);
      setHasUnsavedChanges(true);

      // Immediately save to database
      await updateFieldValues.mutateAsync({
        clauseId: clause.project_clause_id,
        fieldValues: updatedFieldValues,
      });

      toast({
        title: 'Product selected',
        description: `${product.manufacturer} - ${product.product_name} has been applied`,
      });

      setHasUnsavedChanges(false);
      onClauseUpdated();
    } catch (error: any) {
      toast({
        title: 'Error applying product',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderField = (fieldDef: FieldDefinition) => {
    const value = fieldValues[fieldDef.name] || '';

    const handleChange = (newValue: any) => {
      setFieldValues((prev) => ({ ...prev, [fieldDef.name]: newValue }));
      setHasUnsavedChanges(true);
    };

    switch (fieldDef.type) {
      case 'text':
        return (
          <Input
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={fieldDef.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value as number}
            onChange={(e) => handleChange(Number(e.target.value))}
            placeholder={fieldDef.placeholder}
          />
        );

      case 'list':
        const listValue = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {listValue.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newList = [...listValue];
                    newList[index] = e.target.value;
                    handleChange(newList);
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newList = listValue.filter((_, i) => i !== index);
                    handleChange(newList);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleChange([...listValue, ''])}
            >
              Add Item
            </Button>
          </div>
        );

      case 'date':
        const dateValue = value ? new Date(value as string) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateValue && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => handleChange(date ? date.toISOString() : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      default:
        return (
          <Input
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={fieldDef.placeholder}
          />
        );
    }
  };

  if (!clause) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Select a clause to edit</p>
      </div>
    );
  }

  const isHybrid = isHybridClause(clause);
  const isFreeform = isFreeformClause(clause);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-muted-foreground font-mono mb-1">
              {isHybrid && clause.master_clause?.caws_number}
              {isFreeform && clause.freeform_caws_number}
            </div>
            <h2 className="text-2xl font-bold">
              {isHybrid && clause.master_clause?.title}
              {isFreeform && clause.freeform_title}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product Library Button (Hybrid clauses only) */}
        {isHybrid && clause.master_clause && (
          <div className="mb-4">
            <Button
              variant="secondary"
              onClick={() => setProductBrowserOpen(true)}
              className="w-full"
            >
              <Package className="h-4 w-4 mr-2" />
              Browse Product Library
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Select a manufacturer product to auto-fill the specification fields
            </p>
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-2">
            <span className="text-sm text-amber-900 dark:text-amber-200">
              You have unsaved changes
            </span>
            <Button size="sm" onClick={handleSave} disabled={updateFieldValues.isPending || updateFreeform.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Hybrid Clause Editor */}
          {isHybrid && clause.master_clause && (
            <>
              {/* Guidance text */}
              {clause.master_clause.guidance_text && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    {clause.master_clause.guidance_text}
                  </p>
                </div>
              )}

              {/* Field editors */}
              {clause.master_clause.field_definitions.map((fieldDef) => (
                <div key={fieldDef.name} className="space-y-2">
                  <Label htmlFor={fieldDef.name}>
                    {fieldDef.label}
                    {fieldDef.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {fieldDef.description && (
                    <p className="text-sm text-muted-foreground">{fieldDef.description}</p>
                  )}
                  {renderField(fieldDef)}
                </div>
              ))}
            </>
          )}

          {/* Freeform Clause Editor */}
          {isFreeform && (
            <>
              <div className="space-y-2">
                <Label htmlFor="freeform_caws_number">CAWS Number</Label>
                <Input
                  id="freeform_caws_number"
                  value={freeformCawsNumber}
                  onChange={(e) => {
                    setFreeformCawsNumber(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., F10/999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeform_title">Title</Label>
                <Input
                  id="freeform_title"
                  value={freeformTitle}
                  onChange={(e) => {
                    setFreeformTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Clause title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeform_body">Content (Markdown supported)</Label>
                <Textarea
                  id="freeform_body"
                  value={freeformBody}
                  onChange={(e) => {
                    setFreeformBody(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter the clause content..."
                  rows={12}
                />
              </div>
            </>
          )}

          {/* Notes field (available for both hybrid and freeform) */}
          <div className="space-y-2 pt-6 border-t">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Add notes or comments about this clause..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Notes will appear in the PDF export but are not part of the specification content.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Preview Section */}
      {(renderedPreview || (isFreeform && freeformBody)) && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-6">
            <h3 className="text-sm font-semibold mb-3">Preview</h3>
            <div className="bg-background rounded-lg border border-border p-6">
              {/* Hybrid clause preview */}
              {renderedPreview && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {renderedPreview.body}
                  </ReactMarkdown>
                </div>
              )}

              {/* Freeform clause preview */}
              {isFreeform && freeformBody && !renderedPreview && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {freeformBody}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-6 border-t border-border">
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || updateFieldValues.isPending || updateFreeform.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateFieldValues.isPending || updateFreeform.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clause</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this clause? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Browser Modal */}
      {isHybrid && clause.master_clause && (
        <ProductBrowser
          open={productBrowserOpen}
          onOpenChange={setProductBrowserOpen}
          masterClauseId={clause.master_clause.master_clause_id}
          cawsNumber={clause.master_clause.caws_number}
          clauseTitle={clause.master_clause.title}
          onProductSelect={handleProductSelect}
        />
      )}
    </div>
  );
}
