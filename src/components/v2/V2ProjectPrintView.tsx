/**
 * V2 Project Print View - For PDF generation
 * Renders project clauses in a print-optimized format
 */

import { useEffect } from 'react';
import type { Project, ProjectClauseFull } from '@/types/v2-schema';
import { isHybridClause, isFreeformClause, renderProjectClause } from '@/types/v2-schema';

interface V2ProjectPrintViewProps {
  project: Project;
  clauses: ProjectClauseFull[];
  onReady?: () => void;
}

export function V2ProjectPrintView({ project, clauses, onReady }: V2ProjectPrintViewProps) {
  useEffect(() => {
    // Notify when content is ready for printing
    if (onReady) {
      const timer = setTimeout(onReady, 100);
      return () => clearTimeout(timer);
    }
  }, [onReady]);

  return (
    <div id="v2-print-view" className="hidden print:block">
      <div className="max-w-4xl mx-auto p-12 print:p-8">
        {/* Title Page */}
        <div className="mb-12 print:break-after-page">
          <h1 className="text-4xl font-bold mb-6">{project.name}</h1>

          {project.description && (
            <p className="text-lg text-muted-foreground mb-6">{project.description}</p>
          )}

          {/* Project Details */}
          <div className="space-y-3 mt-8">
            {project.project_location && (
              <div>
                <span className="font-semibold">Location: </span>
                <span>{project.project_location}</span>
              </div>
            )}

            {project.client_name && (
              <div>
                <span className="font-semibold">Client: </span>
                <span>{project.client_name}</span>
              </div>
            )}

            {project.architect_name && (
              <div>
                <span className="font-semibold">Architect: </span>
                <span>{project.architect_name}</span>
              </div>
            )}

            {project.principal_designer && (
              <div>
                <span className="font-semibold">Principal Designer: </span>
                <span>{project.principal_designer}</span>
              </div>
            )}

            {project.employer_name && (
              <div>
                <span className="font-semibold">Employer: </span>
                <span>{project.employer_name}</span>
              </div>
            )}

            {project.project_reference && (
              <div>
                <span className="font-semibold">Reference: </span>
                <span>{project.project_reference}</span>
              </div>
            )}
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            Generated: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Clauses */}
        {clauses.map((clause, index) => {
          let renderedClause;

          try {
            if (isHybridClause(clause) && clause.master_clause) {
              renderedClause = renderProjectClause(clause, clause.master_clause);
            } else if (isFreeformClause(clause)) {
              renderedClause = renderProjectClause(clause);
            } else {
              return null;
            }
          } catch (error) {
            console.error('Error rendering clause:', error);
            return null;
          }

          return (
            <div key={clause.project_clause_id} className="mb-8 print:break-inside-avoid">
              <div className="mb-2">
                <span className="text-sm font-mono text-muted-foreground">
                  {renderedClause.caws_number}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-3">{renderedClause.title}</h2>

              <div className="prose max-w-none whitespace-pre-wrap">
                {renderedClause.body}
              </div>

              {renderedClause.notes && (
                <div className="mt-3 p-3 bg-muted rounded text-sm">
                  <span className="font-semibold">Notes: </span>
                  {renderedClause.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
