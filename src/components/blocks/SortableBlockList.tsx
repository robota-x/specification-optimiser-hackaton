import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SpecContentBlock, BlockValues } from "@/types/blocks";
import { BlockItem } from "./BlockItem";

interface SortableBlockListProps {
  blocks: SpecContentBlock[];
  expandedBlocks: Set<string>;
  onToggleExpand: (blockId: string) => void;
  onReorder: (blocks: SpecContentBlock[]) => void;
  onDelete: (blockId: string) => void;
  onUpdateValues: (blockId: string, values: BlockValues) => void;
  blockValues: Record<string, BlockValues>;
}

export function SortableBlockList({
  blocks,
  expandedBlocks,
  onToggleExpand,
  onReorder,
  onDelete,
  onUpdateValues,
  blockValues,
}: SortableBlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        position: index,
      }));

      onReorder(reorderedBlocks);
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No blocks yet. Add one from the library!</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockItem
              key={block.id}
              block={block}
              isExpanded={expandedBlocks.has(block.id)}
              onToggleExpand={() => onToggleExpand(block.id)}
              onDelete={() => onDelete(block.id)}
              onUpdateValues={
                block.block_type === "template"
                  ? (values) => onUpdateValues(block.id, values)
                  : undefined
              }
              values={blockValues[block.id]}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
