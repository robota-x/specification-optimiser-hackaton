/**
 * Project Navigator - Left panel showing project clause tree
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ProjectClauseFull } from '@/types/v2-schema';
import { ChevronRight, File, Folder, Trash2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeleteProjectClause } from '@/hooks/useV2Projects';
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

interface ProjectNavigatorProps {
  projectId: string;
  clauses: ProjectClauseFull[];
  selectedClauseId: string | null;
  onSelectClause: (clauseId: string) => void;
  onRunESGAnalysis?: () => void;
}

interface GroupedClauses {
  [sectionCode: string]: {
    title: string;
    clauses: ProjectClauseFull[];
  };
}

export function ProjectNavigator({
  projectId,
  clauses,
  selectedClauseId,
  onSelectClause,
  onRunESGAnalysis,
}: ProjectNavigatorProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteClause = useDeleteProjectClause();

  const selectedClause = clauses.find((c) => c.project_clause_id === selectedClauseId);

  const handleDelete = async () => {
    if (!selectedClauseId) return;

    try {
      await deleteClause.mutateAsync({
        clauseId: selectedClauseId,
        projectId,
      });

      toast({
        title: 'Clause deleted',
        description: 'Clause has been removed from your project',
      });
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

  // Group clauses by work section
  const groupedClauses = useMemo(() => {
    const groups: GroupedClauses = {};

    clauses.forEach((clause) => {
      // Determine section code and title
      let sectionCode = 'CUSTOM';
      let sectionTitle = 'Custom Clauses';

      if (clause.master_clause && clause.master_clause.work_section) {
        sectionCode = clause.master_clause.work_section.caws_code;
        sectionTitle = `${sectionCode} - ${clause.master_clause.work_section.title}`;
      } else if (clause.freeform_caws_number) {
        // Extract section code from freeform CAWS number (e.g., "F10/120" -> "F10")
        const match = clause.freeform_caws_number.match(/^([A-Z]\d+)/);
        if (match) {
          sectionCode = match[1];
          sectionTitle = `${sectionCode} - Custom`;
        }
      }

      if (!groups[sectionCode]) {
        groups[sectionCode] = {
          title: sectionTitle,
          clauses: [],
        };
      }

      groups[sectionCode].clauses.push(clause);
    });

    // Sort sections by code
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as GroupedClauses);
  }, [clauses]);

  const getClauseNumber = (clause: ProjectClauseFull): string => {
    if (clause.master_clause) {
      return clause.master_clause.caws_number;
    }
    return clause.freeform_caws_number || '';
  };

  const getClauseTitle = (clause: ProjectClauseFull): string => {
    if (clause.master_clause) {
      return clause.master_clause.title;
    }
    return clause.freeform_title || 'Untitled Clause';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with enhanced styling */}
      <div className="p-5 border-b-2 border-border bg-gradient-to-br from-orange-50 via-card to-pink-50 dark:from-orange-950/20 dark:via-card dark:to-pink-950/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent tracking-tight">Current Project</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
            {clauses.length} {clauses.length === 1 ? 'clause' : 'clauses'}
          </div>
        </div>
        {onRunESGAnalysis && (
          <Button
            onClick={onRunESGAnalysis}
            className="w-full mt-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-md"
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Run ESG Analysis
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {Object.entries(groupedClauses).length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="p-3 rounded-xl bg-muted/50 inline-block mb-3">
                <Folder className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No clauses yet</p>
              <p className="text-xs text-muted-foreground">Add clauses from the Master Library below</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedClauses).map(([sectionCode, { title, clauses }]) => (
                <div key={sectionCode} className="space-y-1">
                  {/* Section header with enhanced styling */}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <Folder className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 break-words">{title}</span>
                  </div>

                  {/* Clauses in section with better hover states */}
                  {clauses.map((clause) => (
                    <div
                      key={clause.project_clause_id}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group',
                        'hover:bg-accent/20 hover:shadow-sm',
                        selectedClauseId === clause.project_clause_id &&
                          'bg-accent text-accent-foreground shadow-md border-l-2 border-accent'
                      )}
                    >
                      <button
                        onClick={() => onSelectClause(clause.project_clause_id)}
                        className="flex-1 flex items-start gap-2 text-left min-w-0"
                      >
                        <File className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {getClauseNumber(clause)}
                            </span>
                          </div>
                          <div className="text-sm font-medium leading-tight break-words">{getClauseTitle(clause)}</div>
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ensure clause is selected before opening delete dialog
                          if (selectedClauseId !== clause.project_clause_id) {
                            onSelectClause(clause.project_clause_id);
                          }
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clause</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedClause ? getClauseTitle(selectedClause) : 'this clause'}"? This action cannot be undone.
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
