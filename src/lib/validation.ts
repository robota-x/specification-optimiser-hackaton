import { z } from "zod";
import { BlockValues } from "@/types/blocks";

/**
 * Validation schema for spec metadata
 */
export const specSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
});

/**
 * Validation schema for custom blocks
 */
export const customBlockSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  markdown_content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(5000, "Content must be 5000 characters or less"),
});

/**
 * Validation schema for block field values
 */
export const blockFieldValueSchema = z.object({
  text: z.string().max(500, "Text must be 500 characters or less").optional(),
  textarea: z.string().max(5000, "Text must be 5000 characters or less").optional(),
  list: z.array(z.string().max(200, "List item must be 200 characters or less")).optional(),
  date: z.union([z.date(), z.string()]).optional(),
});

/**
 * Validate spec metadata
 */
export function validateSpec(data: { title: string; description?: string | null }) {
  return specSchema.parse(data);
}

/**
 * Validate custom block
 */
export function validateCustomBlock(data: { title: string; markdown_content: string }) {
  return customBlockSchema.parse(data);
}

/**
 * Validate block field values against their types
 */
export function validateBlockValues(values: BlockValues): BlockValues {
  const validated: BlockValues = {};
  
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      validated[key] = value;
      continue;
    }

    if (typeof value === "string") {
      // Limit string fields to 500 chars
      if (value.length > 500) {
        throw new Error(`Field "${key}" exceeds maximum length of 500 characters`);
      }
      validated[key] = value;
    } else if (Array.isArray(value)) {
      // Validate array items
      const validatedArray = value.map((item) => {
        if (typeof item === "string" && item.length > 200) {
          throw new Error(`List item in "${key}" exceeds maximum length of 200 characters`);
        }
        return item;
      });
      validated[key] = validatedArray;
    } else if (value instanceof Date) {
      validated[key] = value;
    } else {
      validated[key] = value;
    }
  }

  return validated;
}
