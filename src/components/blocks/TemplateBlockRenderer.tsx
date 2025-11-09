import { BlockTemplate, BlockValues } from "@/types/blocks";
import { TextField } from "./fields/TextField";
import { TextareaField } from "./fields/TextareaField";
import { ListField } from "./fields/ListField";
import { DateField } from "./fields/DateField";

interface TemplateBlockRendererProps {
  template: BlockTemplate;
  values: BlockValues;
  onChange: (values: BlockValues) => void;
}

export function TemplateBlockRenderer({ template, values, onChange }: TemplateBlockRendererProps) {
  const updateField = (fieldName: string, value: any) => {
    onChange({
      ...values,
      [fieldName]: value,
    });
  };

  return (
    <div className="space-y-4">
      {template.content_json.fields.map((field) => {
        const fieldValue = values[field.name];

        switch (field.type) {
          case "text":
            return (
              <TextField
                key={field.name}
                label={field.label}
                value={(fieldValue as string) || ""}
                onChange={(val) => updateField(field.name, val)}
                placeholder={field.placeholder}
                required={field.required}
              />
            );

          case "textarea":
            return (
              <TextareaField
                key={field.name}
                label={field.label}
                value={(fieldValue as string) || ""}
                onChange={(val) => updateField(field.name, val)}
                placeholder={field.placeholder}
                required={field.required}
              />
            );

          case "list":
            return (
              <ListField
                key={field.name}
                label={field.label}
                value={(fieldValue as string[]) || []}
                onChange={(val) => updateField(field.name, val)}
                placeholder={field.placeholder}
                required={field.required}
              />
            );

          case "date":
            return (
              <DateField
                key={field.name}
                label={field.label}
                value={(fieldValue as Date) || null}
                onChange={(val) => updateField(field.name, val)}
                placeholder={field.placeholder}
                required={field.required}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
