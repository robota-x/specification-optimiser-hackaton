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
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold">Project Navigator</h2>
        <p className="text-xs text-muted-foreground">{clauses.length} clauses</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedClauses).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No clauses yet</p>
              <p className="text-xs mt-1">Add clauses from the Master Library</p>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(groupedClauses).map(([sectionCode, { title, clauses }]) => (
                <div key={sectionCode} className="space-y-0.5">
                  {/* Section header */}
                  <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground">
                    <Folder className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate text-xs">{title}</span>
                  </div>

                  {/* Clauses in section */}
                  {clauses.map((clause) => (
                    <button
                      key={clause.project_clause_id}
                      onClick={() => onSelectClause(clause.project_clause_id)}
                      className={cn(
                        'w-full flex items-start gap-2 px-2 py-1.5 text-left text-xs rounded-md transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedClauseId === clause.project_clause_id &&
                          'bg-accent text-accent-foreground'
                      )}
                    >
                      <File className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {getClauseNumber(clause)}
                          </span>
                        </div>
                        <div className="truncate text-xs leading-tight">{getClauseTitle(clause)}</div>
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
