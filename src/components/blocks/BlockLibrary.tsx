import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BlockTemplate } from "@/types/blocks";
import { TemplateCard } from "./TemplateCard";
import { Search } from "lucide-react";

interface BlockLibraryProps {
  templates: BlockTemplate[];
  onAddTemplate: (templateId: string) => void;
}

export function BlockLibrary({ templates, onAddTemplate }: BlockLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndGrouped = useMemo(() => {
    const filtered = templates.filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce((acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, BlockTemplate[]>);

    return grouped;
  }, [templates, searchQuery]);

  const categories = Object.keys(filteredAndGrouped).sort();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-3">Block Library</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates found
            </p>
          ) : (
            <Accordion type="multiple" defaultValue={categories} className="space-y-2">
              {categories.map((category) => (
                <AccordionItem key={category} value={category} className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    {category}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2">
                    {filteredAndGrouped[category].map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onAdd={() => onAddTemplate(template.id)}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
