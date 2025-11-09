/**
 * Utility functions for generating print-ready HTML documents
 */

import type { Project, ProjectClauseFull } from '@/types/v2-schema';
import { isHybridClause, isFreeformClause, renderProjectClause } from '@/types/v2-schema';
import { marked } from 'marked';

/**
 * Escape HTML to prevent XSS (for non-markdown content)
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Convert markdown to HTML with proper sanitization
 */
function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }
  
  try {
    // Configure marked for safe rendering
    // Note: marked v17+ uses a different API
    const html = marked.parse(markdown, {
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub Flavored Markdown
    }) as string;
    
    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback to escaped text if markdown parsing fails
    return escapeHtml(markdown);
  }
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
        margin: 0;
        padding: 0;
      }
      
      html {
        margin: 0;
        padding: 0;
      }
      
      .print-document {
        max-width: 100%;
      }
      
      .title-page {
        display: block;
        padding: 2rem 0;
        width: 100%;
        page-break-after: always;
        page-break-inside: avoid;
      }
      
      .document-title {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #000;
        page-break-after: avoid;
      }
      
      .document-description {
        font-size: 1.1rem;
        color: #333;
        margin-bottom: 2rem;
        line-height: 1.8;
        white-space: pre-wrap;
        page-break-after: avoid;
      }
      
      .project-details {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 2px solid #000;
        page-break-inside: avoid;
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
        page-break-before: avoid;
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
        word-wrap: break-word;
        margin-bottom: 1rem;
      }
      
      /* Markdown styling */
      .clause-body h1,
      .clause-body h2,
      .clause-body h3,
      .clause-body h4,
      .clause-body h5,
      .clause-body h6 {
        font-weight: bold;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        color: #000;
        page-break-after: avoid;
      }
      
      .clause-body h1 { font-size: 1.75rem; }
      .clause-body h2 { font-size: 1.5rem; }
      .clause-body h3 { font-size: 1.25rem; }
      .clause-body h4 { font-size: 1.1rem; }
      .clause-body h5 { font-size: 1rem; }
      .clause-body h6 { font-size: 0.95rem; }
      
      .clause-body p {
        margin-bottom: 1rem;
        line-height: 1.8;
      }
      
      .clause-body ul,
      .clause-body ol {
        margin: 1rem 0;
        padding-left: 2rem;
        line-height: 1.8;
      }
      
      .clause-body li {
        margin-bottom: 0.5rem;
      }
      
      .clause-body ul {
        list-style-type: disc;
      }
      
      .clause-body ol {
        list-style-type: decimal;
      }
      
      .clause-body strong,
      .clause-body b {
        font-weight: bold;
        color: #000;
      }
      
      .clause-body em,
      .clause-body i {
        font-style: italic;
      }
      
      .clause-body code {
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        background-color: #f5f5f5;
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      
      .clause-body pre {
        background-color: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        margin: 1rem 0;
        page-break-inside: avoid;
      }
      
      .clause-body pre code {
        background-color: transparent;
        padding: 0;
      }
      
      .clause-body blockquote {
        border-left: 4px solid #ccc;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #555;
        font-style: italic;
      }
      
      .clause-body table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        page-break-inside: avoid;
      }
      
      .clause-body th,
      .clause-body td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
      }
      
      .clause-body th {
        font-weight: bold;
        background-color: #f5f5f5;
      }
      
      .clause-body hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 1.5rem 0;
      }
      
      .clause-body a {
        color: #000;
        text-decoration: underline;
      }
      
      .clause-notes {
        margin-top: 1rem;
        padding: 0.75rem;
        background-color: #f5f5f5;
        border-left: 3px solid #ccc;
        font-size: 0.95rem;
        line-height: 1.6;
      }
      
      .clause-notes h1,
      .clause-notes h2,
      .clause-notes h3,
      .clause-notes h4,
      .clause-notes h5,
      .clause-notes h6 {
        font-weight: bold;
        margin-top: 0.75rem;
        margin-bottom: 0.5rem;
        color: #000;
      }
      
      .clause-notes p {
        margin-bottom: 0.75rem;
      }
      
      .clause-notes ul,
      .clause-notes ol {
        margin: 0.75rem 0;
        padding-left: 1.5rem;
      }
      
      .clause-notes li {
        margin-bottom: 0.25rem;
      }
      
      .clause-notes strong,
      .clause-notes b {
        font-weight: bold;
      }
      
      .clause-notes em,
      .clause-notes i {
        font-style: italic;
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

  // Sort clauses by CAWS number for proper ordering
  const sortedClauses = [...clauses].sort((a, b) => {
    let aCaws: string;
    let bCaws: string;
    
    if (isHybridClause(a) && a.master_clause) {
      aCaws = a.master_clause.caws_number || '';
    } else if (isFreeformClause(a)) {
      aCaws = a.freeform_caws_number || '';
    } else {
      aCaws = '';
    }
    
    if (isHybridClause(b) && b.master_clause) {
      bCaws = b.master_clause.caws_number || '';
    } else if (isFreeformClause(b)) {
      bCaws = b.freeform_caws_number || '';
    } else {
      bCaws = '';
    }
    
    // Compare CAWS numbers (handles both numeric and alphanumeric)
    return aCaws.localeCompare(bCaws, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Generate clauses HTML
  const clausesHTML = sortedClauses.map((clause) => {
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
      console.error('Error rendering clause:', error, clause);
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

    // Convert markdown body and notes to HTML
    const bodyHtml = markdownToHtml(renderedClause!.body);
    const notesHtml = renderedClause!.notes ? markdownToHtml(renderedClause!.notes) : null;

    return `
      <div class="clause-section">
        <div class="clause-caws">${escapeHtml(renderedClause!.caws_number)}</div>
        <h2 class="clause-title">${escapeHtml(renderedClause!.title)}</h2>
        <div class="clause-body">${bodyHtml}</div>
        ${notesHtml ? `
          <div class="clause-notes">
            <div class="clause-notes-label">Notes:</div>
            <div>${notesHtml}</div>
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

