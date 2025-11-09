/**
 * Utility functions for generating print-ready HTML documents
 */

import type { Project, ProjectClauseFull } from '@/types/v2-schema';
import { isHybridClause, isFreeformClause, renderProjectClause } from '@/types/v2-schema';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate HTML for print document
 */
export function generatePrintHTML(project: Project, clauses: ProjectClauseFull[]): string {
  const printStyles = `
    <style>
      @page {
        size: A4;
        margin: 2cm;
        counter-reset: page;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Times New Roman', serif;
        line-height: 1.6;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .print-document {
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
        white-space: pre-wrap;
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
        page-break-inside: avoid;
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
        white-space: pre-wrap;
      }
      
      .clause-notes-label {
        font-weight: bold;
        margin-bottom: 0.25rem;
      }
      
      .error-box {
        border: 2px solid #dc2626;
        border-radius: 4px;
        padding: 1rem;
        background-color: #fee2e2;
        margin-bottom: 1rem;
      }
      
      .error-title {
        font-weight: bold;
        color: #dc2626;
        margin-bottom: 0.5rem;
      }
      
      .error-text {
        font-size: 0.9rem;
        color: #666;
      }
      
      .error-message {
        font-size: 0.9rem;
        color: #dc2626;
        margin-top: 0.5rem;
      }
    </style>
  `;

  // Generate title page HTML
  const titlePageHTML = `
    <div class="title-page">
      <h1 class="document-title">${escapeHtml(project.name)}</h1>
      ${project.description ? `<div class="document-description">${escapeHtml(project.description)}</div>` : ''}
      <div class="project-details">
        ${project.project_location ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Location:</span>
            <span>${escapeHtml(project.project_location)}</span>
          </div>
        ` : ''}
        ${project.client_name ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Client:</span>
            <span>${escapeHtml(project.client_name)}</span>
          </div>
        ` : ''}
        ${project.architect_name ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Architect:</span>
            <span>${escapeHtml(project.architect_name)}</span>
          </div>
        ` : ''}
        ${project.principal_designer ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Principal Designer:</span>
            <span>${escapeHtml(project.principal_designer)}</span>
          </div>
        ` : ''}
        ${project.employer_name ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Employer:</span>
            <span>${escapeHtml(project.employer_name)}</span>
          </div>
        ` : ''}
        ${project.project_reference ? `
          <div class="project-detail-row">
            <span class="project-detail-label">Reference:</span>
            <span>${escapeHtml(project.project_reference)}</span>
          </div>
        ` : ''}
      </div>
      <div class="generated-date">
        Generated: ${new Date().toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  `;

  // Generate clauses HTML
  const clausesHTML = clauses.map((clause) => {
    let renderedClause;
    let renderError: string | null = null;

    try {
      if (isHybridClause(clause) && clause.master_clause) {
        renderedClause = renderProjectClause(clause, clause.master_clause);
      } else if (isFreeformClause(clause)) {
        renderedClause = renderProjectClause(clause);
      } else {
        renderError = 'Invalid clause type: missing master_clause_id and freeform fields';
      }
    } catch (error) {
      renderError = error instanceof Error ? error.message : 'Unknown error rendering clause';
    }

    if (renderError) {
      return `
        <div class="clause-section">
          <div class="error-box">
            <div class="error-title">⚠ Error Rendering Clause</div>
            <div class="error-text">Clause ID: ${escapeHtml(clause.project_clause_id)}</div>
            <div class="error-message">${escapeHtml(renderError)}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="clause-section">
        <div class="clause-caws">${escapeHtml(renderedClause!.caws_number)}</div>
        <h2 class="clause-title">${escapeHtml(renderedClause!.title)}</h2>
        <div class="clause-body">${escapeHtml(renderedClause!.body)}</div>
        ${renderedClause!.notes ? `
          <div class="clause-notes">
            <div class="clause-notes-label">Notes:</div>
            <div>${escapeHtml(renderedClause!.notes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(project.name)} - Specification</title>
      ${printStyles}
    </head>
    <body>
      <div class="print-document">
        ${titlePageHTML}
        ${clausesHTML}
      </div>
    </body>
    </html>
  `;
}

/**
 * Open print dialog with document
 */
export function openPrintDialog(project: Project, clauses: ProjectClauseFull[]): void {
  const html = generatePrintHTML(project, clauses);
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups for this site.');
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Optionally close after printing (user can cancel)
      // printWindow.close();
    }, 250);
  };
}

