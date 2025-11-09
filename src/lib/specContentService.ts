import { supabase } from "@/integrations/supabase/client";
import { SpecContentBlock, BlockValues, BlockTemplate, CustomBlock } from "@/types/blocks";
import { serializeBlockValues } from "./blockUtils";
import { validateCustomBlock, validateBlockValues } from "./validation";

/**
 * Load all spec content for a spec with joined template/custom block data
 */
export async function loadSpecContent(specId: string): Promise<SpecContentBlock[]> {
  const { data, error } = await supabase
    .from("spec_content")
    .select(`
      *,
      template:block_templates(id, title, description, category, content_json, is_active, created_at),
      custom:custom_blocks(id, user_id, title, markdown_content, created_at, updated_at)
    `)
    .eq("spec_id", specId)
    .order("position", { ascending: true });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item,
    template: item.template || undefined,
    custom: item.custom || undefined,
    // Parse field_values from JSONB to our BlockValues type
    field_values: item.field_values || {},
  }));
}

/**
 * Add a template block to a spec
 */
export async function addTemplateBlock(
  specId: string,
  templateId: string,
  position: number,
  initialValues: BlockValues
): Promise<string> {
  // Validate field values
  const validatedValues = validateBlockValues(initialValues);
  
  const { data, error } = await supabase
    .from("spec_content")
    .insert({
      spec_id: specId,
      block_type: "template",
      block_template_id: templateId,
      position,
      field_values: validatedValues as any,
    })
    .select()
    .single();

  if (error) throw error;
  
  return data.id;
}

/**
 * Add a custom block to a spec
 */
export async function addCustomBlock(
  specId: string,
  customBlockId: string,
  position: number
): Promise<string> {
  const { data, error } = await supabase
    .from("spec_content")
    .insert({
      spec_id: specId,
      block_type: "custom",
      custom_block_id: customBlockId,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  
  return data.id;
}

/**
 * Update block field values
 */
export async function updateBlockValues(
  blockId: string,
  values: BlockValues
): Promise<void> {
  // Validate field values
  const validatedValues = validateBlockValues(values);
  
  const { error } = await supabase
    .from("spec_content")
    .update({ field_values: validatedValues as any })
    .eq("id", blockId);

  if (error) throw error;
}

/**
 * Batch update multiple blocks' field values
 */
export async function batchUpdateBlockValues(
  updates: { id: string; values: BlockValues }[]
): Promise<void> {
  // Validate all field values first
  const validatedUpdates = updates.map((update) => ({
    id: update.id,
    values: validateBlockValues(update.values),
  }));
  
  const promises = validatedUpdates.map((update) =>
    supabase
      .from("spec_content")
      .update({ field_values: update.values as any })
      .eq("id", update.id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error);
  
  if (errors.length > 0) {
    throw new Error(`Failed to update ${errors.length} blocks`);
  }
}

/**
 * Update block positions in batch
 */
export async function updateBlockPositions(
  blocks: { id: string; position: number }[]
): Promise<void> {
  const updates = blocks.map((block) =>
    supabase
      .from("spec_content")
      .update({ position: block.position })
      .eq("id", block.id)
  );

  const results = await Promise.all(updates);
  
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to update ${errors.length} block positions`);
  }
}

/**
 * Delete a block
 */
export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await supabase
    .from("spec_content")
    .delete()
    .eq("id", blockId);

  if (error) throw error;
}

/**
 * Create a new custom block
 */
export async function createCustomBlock(
  userId: string,
  title: string,
  markdownContent: string
): Promise<string> {
  // Validate custom block data
  const validatedData = validateCustomBlock({ title, markdown_content: markdownContent });
  
  const { data, error } = await supabase
    .from("custom_blocks")
    .insert({
      user_id: userId,
      title: validatedData.title,
      markdown_content: validatedData.markdown_content,
    })
    .select()
    .single();

  if (error) throw error;
  
  return data.id;
}

/**
 * Update a custom block
 */
export async function updateCustomBlock(
  blockId: string,
  title: string,
  markdownContent: string
): Promise<void> {
  // Validate custom block data
  const validatedData = validateCustomBlock({ title, markdown_content: markdownContent });
  
  const { error } = await supabase
    .from("custom_blocks")
    .update({
      title: validatedData.title,
      markdown_content: validatedData.markdown_content,
    })
    .eq("id", blockId);

  if (error) throw error;
}

/**
 * Delete a custom block
 */
export async function deleteCustomBlock(blockId: string): Promise<void> {
  const { error } = await supabase
    .from("custom_blocks")
    .delete()
    .eq("id", blockId);

  if (error) throw error;
}

/**
 * Load all active block templates
 */
export async function loadBlockTemplates(): Promise<BlockTemplate[]> {
  const { data, error } = await supabase
    .from("block_templates")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  
  return (data || []) as unknown as BlockTemplate[];
}

/**
 * Load user's custom blocks
 */
export async function loadCustomBlocks(userId: string): Promise<CustomBlock[]> {
  const { data, error } = await supabase
    .from("custom_blocks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  return (data || []) as unknown as CustomBlock[];
}
