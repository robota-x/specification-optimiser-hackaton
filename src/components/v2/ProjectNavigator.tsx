/**
 * Project Navigator - Left panel showing project clause tree
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ProjectClauseFull } from '@/types/v2-schema';
import { ChevronRight, File, Folder } from 'lucide-react';

interface ProjectNavigatorProps {
  projectId: string;
  clauses: ProjectClauseFull[];
  selectedClauseId: string | null;
  onSelectClause: (clauseId: string) => void;
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
}: ProjectNavigatorProps) {
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

  const getClauseTitle = (clause: ProjectClauseFull): string => {
    if (clause.master_clause) {
      return clause.master_clause.title;
    }
    return clause.freeform_title || 'Untitled Clause';
  };

  const getClauseNumber = (clause: ProjectClauseFull): string => {
    if (clause.master_clause) {
      return clause.master_clause.caws_number;
    }
    return clause.freeform_caws_number || '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with enhanced styling */}
      <div className="p-4 border-b-2 border-border bg-gradient-to-r from-card to-secondary/10">
        <h2 className="text-base font-bold text-foreground">Current Project</h2>
        <div className="flex items-center gap-2 mt-1">
          <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
            {clauses.length} {clauses.length === 1 ? 'clause' : 'clauses'}
          </div>
        </div>
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
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
                    <Folder className="h-4 w-4 text-primary" />
                    <span className="truncate text-xs font-semibold text-foreground">{title}</span>
                  </div>

                  {/* Clauses in section with better hover states */}
                  {clauses.map((clause) => (
                    <button
                      key={clause.project_clause_id}
                      onClick={() => onSelectClause(clause.project_clause_id)}
                      className={cn(
                        'w-full flex items-start gap-2 px-3 py-2 text-left rounded-lg transition-all duration-200',
                        'hover:bg-accent/20 hover:shadow-sm hover:translate-x-0.5',
                        selectedClauseId === clause.project_clause_id &&
                          'bg-accent text-accent-foreground shadow-md border-l-2 border-accent'
                      )}
                    >
                      <File className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-muted/50">
                            {getClauseNumber(clause)}
                          </span>
                        </div>
                        <div className="truncate text-sm font-medium leading-tight">{getClauseTitle(clause)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
