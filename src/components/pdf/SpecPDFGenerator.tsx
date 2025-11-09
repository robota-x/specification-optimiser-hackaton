import { useState, useEffect } from "react";
import { SpecContentBlock, BlockValues } from "@/types/blocks";
import { loadSpecContent } from "@/lib/specContentService";
import { SpecPrintView } from "./SpecPrintView";
import { useSpecPDF } from "@/hooks/useSpecPDF";

interface SpecPDFGeneratorProps {
  specId: string;
  title: string;
  description: string;
  onComplete?: () => void;
}

export function SpecPDFGenerator({ specId, title, description, onComplete }: SpecPDFGeneratorProps) {
  const [blocks, setBlocks] = useState<SpecContentBlock[]>([]);
  const [blockValues, setBlockValues] = useState<Record<string, BlockValues>>({});
  const [loading, setLoading] = useState(true);
  const { generatePDF } = useSpecPDF();

  useEffect(() => {
    const loadAndGenerate = async () => {
      try {
        // Load spec content
        const blocksData = await loadSpecContent(specId);
        setBlocks(blocksData);

        // Extract block values
        const values: Record<string, BlockValues> = {};
        blocksData.forEach((block) => {
          if (block.block_type === "template" && block.field_values) {
            values[block.id] = block.field_values;
          }
        });
        setBlockValues(values);

        // Wait a bit for the DOM to update
        setTimeout(() => {
          generatePDF(title);
          setLoading(false);
          onComplete?.();
        }, 100);
      } catch (error) {
        console.error("Error loading spec for PDF:", error);
        setLoading(false);
        onComplete?.();
      }
    };

    loadAndGenerate();
  }, [specId, title, generatePDF, onComplete]);

  if (!loading) {
    return null;
  }

  return (
    <SpecPrintView
      title={title}
      description={description}
      blocks={blocks}
      blockValues={blockValues}
    />
  );
}
