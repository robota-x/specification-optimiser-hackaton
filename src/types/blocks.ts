// Block Template Field Definition
export interface BlockTemplateField {
  name: string;
  type: "text" | "textarea" | "list" | "date";
  label: string;
  placeholder?: string;
  required?: boolean;
}

// Block Template (from DB)
export interface BlockTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_json: {
    fields: BlockTemplateField[];
  };
  is_active: boolean;
  created_at: string;
}

// Custom Block (from DB)
export interface CustomBlock {
  id: string;
  user_id: string;
  title: string;
  markdown_content: string;
  created_at: string;
  updated_at: string;
}

// Field value can be string, string array, or Date
export type BlockFieldValue = string | string[] | Date | null;

// Block instance in a spec
export interface SpecContentBlock {
  id: string;
  spec_id: string;
  block_type: "template" | "custom";
  position: number;
  block_template_id: string | null;
  custom_block_id: string | null;
  created_at: string;
  updated_at: string;
  // Field values stored as JSON
  field_values?: Record<string, BlockFieldValue>;
  // Joined data
  template?: BlockTemplate;
  custom?: CustomBlock;
}

// Form state for block values
export type BlockValues = Record<string, BlockFieldValue>;
