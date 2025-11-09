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
import type { ProjectClauseFull, FieldValues, FieldDefinition } from '@/types/v2-schema';
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-6">
          <div className="p-4 rounded-2xl bg-primary/10 inline-block mb-4">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">No Clause Selected</p>
          <p className="text-sm text-muted-foreground">Select a clause from the Project Navigator to begin editing</p>
        </div>
      </div>
    );
  }

  const isHybrid = isHybridClause(clause);
  const isFreeform = isFreeformClause(clause);

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header */}
      <div className="p-6 border-b-2 border-border bg-gradient-to-r from-card to-secondary/10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-mono font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                {isHybrid && clause.master_clause?.caws_number}
                {isFreeform && clause.freeform_caws_number}
              </div>
              {isHybrid && <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">Master</span>}
              {isFreeform && <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">Custom</span>}
            </div>
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              {isHybrid && clause.master_clause?.title}
              {isFreeform && clause.freeform_title}
            </h2>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="flex items-center justify-between bg-accent/10 border-2 border-accent/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
              <span className="text-sm font-medium text-accent">
                Unsaved changes
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateFieldValues.isPending || updateFreeform.isPending}
              className="shadow-md h-9"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Now
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
              {/* Guidance text with enhanced styling */}
              {clause.master_clause.guidance_text && (
                <div className="bg-accent/10 border-2 border-accent/30 rounded-xl p-4">
                  <div className="flex gap-2 items-start">
                    <div className="p-1 rounded bg-accent/20 mt-0.5">
                      <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed flex-1">
                      {clause.master_clause.guidance_text}
                    </p>
                  </div>
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
    </div>
  );
}
