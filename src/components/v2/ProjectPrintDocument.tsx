/**
 * Project Print Document - Clean document layout for PDF export
 * Renders project specification as a professional document with proper formatting
 */

import type { Project, ProjectClauseFull } from '@/types/v2-schema';
import { isHybridClause, isFreeformClause, renderProjectClause } from '@/types/v2-schema';

interface ProjectPrintDocumentProps {
  project: Project;
  clauses: ProjectClauseFull[];
}

export function ProjectPrintDocument({ project, clauses }: ProjectPrintDocumentProps) {
  return (
    <div className="print-document">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
            counter-reset: page;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Hide all UI elements */
          header,
          nav,
          button,
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure document is visible */
          .print-document {
            display: block !important;
          }
          
          /* Remove page numbers */
          @page {
            counter-reset: page;
          }
          
          /* Prevent page breaks inside clauses */
          .clause-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Allow page breaks between clauses */
          .clause-section + .clause-section {
            page-break-before: auto;
          }
        }
        
        .print-document {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #000;
          max-width: 100%;
        }
        
        .title-page {
          page-break-after: always;
          margin-bottom: 3rem;
        }
        
        .document-title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          color: #000;
        }
        
        .document-description {
          font-size: 1.1rem;
          color: #333;
          margin-bottom: 2rem;
          line-height: 1.8;
        }
        
        .project-details {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px solid #000;
        }
        
        .project-detail-row {
          margin-bottom: 0.75rem;
          font-size: 1rem;
        }
        
        .project-detail-label {
          font-weight: bold;
          display: inline-block;
          min-width: 150px;
        }
        
        .generated-date {
          margin-top: 2rem;
          font-size: 0.9rem;
          color: #666;
        }
        
        .clause-section {
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
        }
        
        .clause-caws {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          color: #555;
          margin-bottom: 0.5rem;
          font-weight: normal;
        }
        
        .clause-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #000;
          page-break-after: avoid;
        }
        
        .clause-body {
          font-size: 1rem;
          line-height: 1.8;
          color: #000;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin-bottom: 1rem;
        }
        
        .clause-notes {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #f5f5f5;
          border-left: 3px solid #ccc;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        
        .clause-notes-label {
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
      `}</style>

      <div className="title-page">
        <h1 className="document-title">{project.name}</h1>

        {project.description && (
          <div className="document-description">{project.description}</div>
        )}

        <div className="project-details">
          {project.project_location && (
            <div className="project-detail-row">
              <span className="project-detail-label">Location:</span>
              <span>{project.project_location}</span>
            </div>
          )}

          {project.client_name && (
            <div className="project-detail-row">
              <span className="project-detail-label">Client:</span>
              <span>{project.client_name}</span>
            </div>
          )}

          {project.architect_name && (
            <div className="project-detail-row">
              <span className="project-detail-label">Architect:</span>
              <span>{project.architect_name}</span>
            </div>
          )}

          {project.principal_designer && (
            <div className="project-detail-row">
              <span className="project-detail-label">Principal Designer:</span>
              <span>{project.principal_designer}</span>
            </div>
          )}

          {project.employer_name && (
            <div className="project-detail-row">
              <span className="project-detail-label">Employer:</span>
              <span>{project.employer_name}</span>
            </div>
          )}

          {project.project_reference && (
            <div className="project-detail-row">
              <span className="project-detail-label">Reference:</span>
              <span>{project.project_reference}</span>
            </div>
          )}
        </div>

        <div className="generated-date">
          Generated: {new Date().toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Clauses */}
      {clauses.map((clause) => {
        let renderedClause;
        let renderError: string | null = null;

        try {
          if (isHybridClause(clause) && clause.master_clause) {
            renderedClause = renderProjectClause(clause, clause.master_clause);
          } else if (isFreeformClause(clause)) {
            renderedClause = renderProjectClause(clause);
          } else {
            renderError = 'Invalid clause type: missing master_clause_id and freeform fields';
            console.error('Invalid clause type:', clause);
          }
        } catch (error) {
          renderError = error instanceof Error ? error.message : 'Unknown error rendering clause';
          console.error('Error rendering clause:', error, clause);
        }

        if (renderError) {
          return (
            <div key={clause.project_clause_id} className="clause-section">
              <div style={{
                border: '2px solid #dc2626',
                borderRadius: '4px',
                padding: '1rem',
                backgroundColor: '#fee2e2'
              }}>
                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>
                  ⚠ Error Rendering Clause
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Clause ID: {clause.project_clause_id}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#dc2626', marginTop: '0.5rem' }}>
                  {renderError}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={clause.project_clause_id} className="clause-section">
            <div className="clause-caws">{renderedClause!.caws_number}</div>
            <h2 className="clause-title">{renderedClause!.title}</h2>
            <div className="clause-body">{renderedClause!.body}</div>
            {renderedClause!.notes && (
              <div className="clause-notes">
                <div className="clause-notes-label">Notes:</div>
                <div>{renderedClause!.notes}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

