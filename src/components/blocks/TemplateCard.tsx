import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BlockTemplate } from "@/types/blocks";

interface TemplateCardProps {
  template: BlockTemplate;
  onAdd: () => void;
}

export function TemplateCard({ template, onAdd }: TemplateCardProps) {
  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm">{template.title}</CardTitle>
            {template.description && (
              <CardDescription className="text-xs mt-1">
                {template.description}
              </CardDescription>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          {template.content_json.fields.map((field) => (
            <span
              key={field.name}
              className="text-xs bg-muted px-2 py-1 rounded-md"
            >
              {field.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
