import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { SpecContentBlock, BlockValues } from "@/types/blocks";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer";
import { MarkdownPreview } from "./MarkdownPreview";
import { cn } from "@/lib/utils";

interface BlockItemProps {
  block: SpecContentBlock;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdateValues?: (values: BlockValues) => void;
  values?: BlockValues;
}

export function BlockItem({
  block,
  isExpanded,
  onToggleExpand,
  onDelete,
  onUpdateValues,
  values,
}: BlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blockTitle =
    block.block_type === "template" ? block.template?.title : block.custom?.title;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-3 bg-muted/50 border-b border-border">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="flex-1 justify-start"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <span className="font-medium">{blockTitle || "Untitled Block"}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {block.block_type === "template" ? "Template" : "Custom"}
            </span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {isExpanded && (
          <div className="p-4">
            {block.block_type === "template" && block.template && onUpdateValues && values ? (
              <TemplateBlockRenderer
                template={block.template}
                values={values}
                onChange={onUpdateValues}
              />
            ) : block.block_type === "custom" && block.custom ? (
              <MarkdownPreview content={block.custom.markdown_content} />
            ) : (
              <p className="text-muted-foreground text-sm">No content available</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
