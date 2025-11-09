import { SpecContentBlock, BlockValues } from "@/types/blocks";
import { format } from "date-fns";

interface SpecPrintViewProps {
  title: string;
  description: string;
  blocks: SpecContentBlock[];
  blockValues: Record<string, BlockValues>;
}

export function SpecPrintView({ title, description, blocks, blockValues }: SpecPrintViewProps) {
  const formatFieldValue = (value: any, fieldType?: string): string => {
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ");
    }

    if (value instanceof Date) {
      return format(value, "PPP");
    }

    if (typeof value === "string" && fieldType === "date") {
      try {
        return format(new Date(value), "PPP");
      } catch {
        return value;
      }
    }

    return String(value);
  };

  return (
    <div className="spec-print-view hidden print:block">
      <div className="print-content">
        {/* Header */}
        <div className="print-header">
          <h1 className="print-title">{title}</h1>
          {description && (
            <p className="print-description">{description}</p>
          )}
          <div className="print-meta">
            <p>Generated: {format(new Date(), "PPP 'at' p")}</p>
          </div>
        </div>

        {/* Content Blocks */}
        <div className="print-blocks">
          {blocks.map((block, index) => (
            <div key={block.id} className="print-block">
              {/* Block Title */}
              <h2 className="print-block-title">
                {index + 1}. {block.block_type === "template"
                  ? block.template?.title
                  : block.custom?.title}
              </h2>

              {/* Block Content */}
              {block.block_type === "template" && block.template ? (
                <div className="print-block-content">
                  {block.template.content_json.fields.map((field) => {
                    const value = blockValues[block.id]?.[field.name];
                    const formattedValue = formatFieldValue(value, field.type);

                    if (!formattedValue) return null;

                    return (
                      <div key={field.name} className="print-field">
                        <div className="print-field-label">{field.label}:</div>
                        <div className="print-field-value">
                          {field.type === "textarea" || field.type === "list" ? (
                            <div className="whitespace-pre-wrap">{formattedValue}</div>
                          ) : (
                            formattedValue
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : block.block_type === "custom" && block.custom ? (
                <div className="print-block-content">
                  <div className="print-markdown whitespace-pre-wrap">
                    {block.custom.markdown_content}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <p>End of Specification</p>
        </div>
      </div>

      <style>{`
        @media print {
          /* Hide everything except print view */
          body * {
            visibility: hidden;
          }

          .spec-print-view,
          .spec-print-view * {
            visibility: visible;
          }

          .spec-print-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: 2cm;
          }

          /* Print content styling */
          .print-content {
            font-family: 'Times New Roman', serif;
            color: #000;
            line-height: 1.6;
          }

          /* Header */
          .print-header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #000;
          }

          .print-title {
            font-size: 24pt;
            font-weight: bold;
            margin: 0 0 0.5rem 0;
            color: #000;
          }

          .print-description {
            font-size: 12pt;
            margin: 0 0 1rem 0;
            color: #333;
            font-style: italic;
          }

          .print-meta {
            font-size: 9pt;
            color: #666;
            margin-top: 0.5rem;
          }

          .print-meta p {
            margin: 0;
          }

          /* Blocks */
          .print-blocks {
            margin-top: 2rem;
          }

          .print-block {
            margin-bottom: 2rem;
            page-break-inside: avoid;
          }

          .print-block-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 0 0 1rem 0;
            color: #000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 0.5rem;
          }

          .print-block-content {
            margin-left: 1rem;
          }

          /* Fields */
          .print-field {
            margin-bottom: 1rem;
            page-break-inside: avoid;
          }

          .print-field-label {
            font-size: 10pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.25rem;
          }

          .print-field-value {
            font-size: 11pt;
            color: #000;
            padding-left: 1rem;
          }

          /* Markdown content */
          .print-markdown {
            font-size: 11pt;
            color: #000;
            line-height: 1.7;
          }

          /* Footer */
          .print-footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 9pt;
            color: #666;
          }

          /* Ensure proper page breaks */
          h2 {
            page-break-after: avoid;
          }

          /* Prevent orphans and widows */
          p {
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>
    </div>
  );
}
