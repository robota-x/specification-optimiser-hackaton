import { BlockTemplate, BlockFieldValue, BlockValues } from "@/types/blocks";

/**
 * Initialize empty field values for a template
 */
export function getEmptyFieldValues(template: BlockTemplate): BlockValues {
  const values: BlockValues = {};
  
  template.content_json.fields.forEach((field) => {
    if (field.type === "list") {
      values[field.name] = [];
    } else if (field.type === "date") {
      values[field.name] = null;
    } else {
      values[field.name] = "";
    }
  });
  
  return values;
}

/**
 * Serialize block values for database storage
 */
export function serializeBlockValues(values: BlockValues): string {
  const serialized: Record<string, any> = {};
  
  Object.entries(values).forEach(([key, value]) => {
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else {
      serialized[key] = value;
    }
  });
  
  return JSON.stringify(serialized);
}

/**
 * Deserialize block values from database
 */
export function deserializeBlockValues(jsonString: string | null): BlockValues {
  if (!jsonString) return {};
  
  try {
    const parsed = JSON.parse(jsonString);
    const values: BlockValues = {};
    
    Object.entries(parsed).forEach(([key, value]) => {
      // Check if it's a date string
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        values[key] = new Date(value);
      } else {
        values[key] = value as BlockFieldValue;
      }
    });
    
    return values;
  } catch (error) {
    console.error("Error deserializing block values:", error);
    return {};
  }
}

/**
 * Validate field value based on type
 */
export function validateFieldValue(
  value: BlockFieldValue,
  type: string,
  required: boolean = false
): boolean {
  if (required && (value === null || value === "" || (Array.isArray(value) && value.length === 0))) {
    return false;
  }
  
  if (type === "list" && !Array.isArray(value)) {
    return false;
  }
  
  if (type === "date" && value !== null && !(value instanceof Date)) {
    return false;
  }
  
  return true;
}
