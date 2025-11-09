import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CustomBlock } from "@/types/blocks";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomBlockLibraryProps {
  blocks: CustomBlock[];
  onAdd: (blockId: string) => void;
  onEdit: (block: CustomBlock) => void;
  onDelete: (blockId: string) => void;
  onCreate: () => void;
}

export function CustomBlockLibrary({
  blocks,
  onAdd,
  onEdit,
  onDelete,
  onCreate,
}: CustomBlockLibraryProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Custom Blocks</h3>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No custom blocks yet. Create one to get started!
            </p>
          ) : (
            blocks.map((block) => (
              <Card key={block.id} className="hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{block.title}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(block)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(block.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {block.markdown_content.substring(0, 100)}
                    {block.markdown_content.length > 100 ? "..." : ""}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAdd(block.id)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Add to Spec
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
