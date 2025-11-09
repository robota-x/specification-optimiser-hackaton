import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Library, ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { SpecContentBlock, BlockTemplate, CustomBlock, BlockValues } from "@/types/blocks";
import { getEmptyFieldValues } from "@/lib/blockUtils";
import { validateSpec } from "@/lib/validation";
import {
  loadSpecContent,
  addTemplateBlock,
  addCustomBlock,
  updateBlockPositions,
  deleteBlock as deleteBlockFromDB,
  loadBlockTemplates,
  loadCustomBlocks,
  createCustomBlock as createCustomBlockInDB,
  updateCustomBlock as updateCustomBlockInDB,
  deleteCustomBlock as deleteCustomBlockFromDB,
  batchUpdateBlockValues,
} from "@/lib/specContentService";
import { SortableBlockList } from "@/components/blocks/SortableBlockList";
import { BlockLibrary } from "@/components/blocks/BlockLibrary";
import { CustomBlockLibrary } from "@/components/blocks/CustomBlockLibrary";
import { CustomBlockDialog } from "@/components/blocks/CustomBlockDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Spec {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
}

const SpecEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Auth & spec state
  const [user, setUser] = useState<User | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Block state
  const [blocks, setBlocks] = useState<SpecContentBlock[]>([]);
  const [blockValues, setBlockValues] = useState<Record<string, BlockValues>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  
  // Libraries state
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Dialog state
  const [customBlockDialogOpen, setCustomBlockDialogOpen] = useState(false);
  const [editingCustomBlock, setEditingCustomBlock] = useState<CustomBlock | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, id]);

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, blockValues, title, description]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadData = async () => {
    if (!id) return;

    try {
      // Load spec
      const { data: specData, error: specError } = await supabase
        .from("specs")
        .select("*")
        .eq("id", id)
        .single();

      if (specError) throw specError;

      setSpec(specData);
      setTitle(specData.title);
      setDescription(specData.description || "");

      // Load blocks, templates, and custom blocks in parallel
      const [blocksData, templatesData, customBlocksData] = await Promise.all([
        loadSpecContent(id),
        loadBlockTemplates(),
        loadCustomBlocks(specData.user_id),
      ]);

      setBlocks(blocksData);
      setTemplates(templatesData);
      setCustomBlocks(customBlocksData);

      // Initialize block values from loaded data and expand first block
      const initialValues: Record<string, BlockValues> = {};
      const initialExpanded = new Set<string>();

      blocksData.forEach((block, index) => {
        if (block.block_type === "template" && block.template) {
          // Use loaded field_values if they exist, otherwise use empty values
          initialValues[block.id] = block.field_values || getEmptyFieldValues(block.template);
        }
        if (index === 0) {
          initialExpanded.add(block.id);
        }
      });

      setBlockValues(initialValues);
      setExpandedBlocks(initialExpanded);
    } catch (error: any) {
      toast({
        title: "Error loading spec",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!spec) return;

    setSaving(true);
    try {
      // Validate spec data
      validateSpec({ title, description });
      
      // Save spec metadata
      const { error: specError } = await supabase
        .from("specs")
        .update({
          title,
          description,
        })
        .eq("id", spec.id);

      if (specError) throw specError;

      // Save all block field values
      const blockUpdates = blocks
        .filter((block) => block.block_type === "template" && blockValues[block.id])
        .map((block) => ({
          id: block.id,
          values: blockValues[block.id],
        }));

      if (blockUpdates.length > 0) {
        await batchUpdateBlockValues(blockUpdates);
      }

      setHasUnsavedChanges(false);

      if (!isAutoSave) {
        toast({
          title: "Saved!",
          description: "Specification has been updated.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplateBlock = async (templateId: string) => {
    if (!spec) return;

    try {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const position = blocks.length;
      const initialValues = getEmptyFieldValues(template);

      const blockId = await addTemplateBlock(spec.id, templateId, position, initialValues);

      // Add to local state
      const newBlock: SpecContentBlock = {
        id: blockId,
        spec_id: spec.id,
        block_type: "template",
        position,
        block_template_id: templateId,
        custom_block_id: null,
        template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setBlocks((prev) => [...prev, newBlock]);
      setBlockValues((prev) => ({ ...prev, [blockId]: initialValues }));
      setExpandedBlocks((prev) => new Set(prev).add(blockId));

      toast({
        title: "Block added",
        description: `${template.title} has been added to your spec.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddCustomBlock = async (customBlockId: string) => {
    if (!spec) return;

    try {
      const customBlock = customBlocks.find((b) => b.id === customBlockId);
      if (!customBlock) return;

      const position = blocks.length;
      const blockId = await addCustomBlock(spec.id, customBlockId, position);

      // Add to local state
      const newBlock: SpecContentBlock = {
        id: blockId,
        spec_id: spec.id,
        block_type: "custom",
        position,
        block_template_id: null,
        custom_block_id: customBlockId,
        custom: customBlock,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setBlocks((prev) => [...prev, newBlock]);
      setExpandedBlocks((prev) => new Set(prev).add(blockId));

      toast({
        title: "Block added",
        description: `${customBlock.title} has been added to your spec.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReorderBlocks = async (reorderedBlocks: SpecContentBlock[]) => {
    setBlocks(reorderedBlocks);

    try {
      await updateBlockPositions(
        reorderedBlocks.map((b) => ({ id: b.id, position: b.position }))
      );
    } catch (error: any) {
      toast({
        title: "Error reordering blocks",
        description: error.message,
        variant: "destructive",
      });
      // Reload to get correct state
      loadData();
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlockToDelete(blockId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteBlock = async () => {
    if (!blockToDelete) return;

    try {
      await deleteBlockFromDB(blockToDelete);

      setBlocks((prev) => {
        const filtered = prev.filter((b) => b.id !== blockToDelete);
        // Update positions
        return filtered.map((block, index) => ({ ...block, position: index }));
      });

      setBlockValues((prev) => {
        const { [blockToDelete]: _, ...rest } = prev;
        return rest;
      });

      setExpandedBlocks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(blockToDelete);
        return newSet;
      });

      toast({
        title: "Block deleted",
        description: "Block has been removed from your spec.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting block",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setBlockToDelete(null);
    }
  };

  const handleUpdateBlockValues = (blockId: string, values: BlockValues) => {
    setBlockValues((prev) => ({ ...prev, [blockId]: values }));
    setHasUnsavedChanges(true);
  };

  const handleToggleExpand = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const handleCreateCustomBlock = async (title: string, content: string) => {
    if (!user) return;

    try {
      const blockId = await createCustomBlockInDB(user.id, title, content);

      const newBlock: CustomBlock = {
        id: blockId,
        user_id: user.id,
        title,
        markdown_content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCustomBlocks((prev) => [newBlock, ...prev]);

      toast({
        title: "Custom block created",
        description: `${title} is now available in your library.`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating custom block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCustomBlock = async (title: string, content: string) => {
    if (!editingCustomBlock) return;

    try {
      await updateCustomBlockInDB(editingCustomBlock.id, title, content);

      setCustomBlocks((prev) =>
        prev.map((block) =>
          block.id === editingCustomBlock.id
            ? { ...block, title, markdown_content: content, updated_at: new Date().toISOString() }
            : block
        )
      );

      toast({
        title: "Custom block updated",
        description: `${title} has been updated.`,
      });

      setEditingCustomBlock(null);
    } catch (error: any) {
      toast({
        title: "Error updating custom block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomBlock = async (blockId: string) => {
    try {
      await deleteCustomBlockFromDB(blockId);

      setCustomBlocks((prev) => prev.filter((b) => b.id !== blockId));

      toast({
        title: "Custom block deleted",
        description: "Custom block has been removed from your library.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting custom block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading specification...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l border-border h-6"></div>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-2 flex-1"
              placeholder="Specification Title"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button onClick={() => handleSave()} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`border-r border-border bg-card transition-all duration-300 ${
            sidebarOpen ? "w-80" : "w-0"
          } overflow-hidden`}
        >
          <Tabs defaultValue="templates" className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b border-border">
              <TabsTrigger value="templates" className="flex-1">
                Templates
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                Custom
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates" className="flex-1 m-0 overflow-hidden">
              <BlockLibrary templates={templates} onAddTemplate={handleAddTemplateBlock} />
            </TabsContent>
            <TabsContent value="custom" className="flex-1 m-0 overflow-hidden">
              <CustomBlockLibrary
                blocks={customBlocks}
                onAdd={handleAddCustomBlock}
                onEdit={(block) => {
                  setEditingCustomBlock(block);
                  setCustomBlockDialogOpen(true);
                }}
                onDelete={handleDeleteCustomBlock}
                onCreate={() => {
                  setEditingCustomBlock(null);
                  setCustomBlockDialogOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Toggle sidebar button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-2 top-20 z-20"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8 max-w-5xl">
            <div className="mb-8">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Brief description of this specification"
                maxLength={500}
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Content Blocks</h2>
              {!sidebarOpen && (
                <Button onClick={() => setSidebarOpen(true)} size="sm">
                  <Library className="h-4 w-4 mr-2" />
                  Open Library
                </Button>
              )}
            </div>

            <SortableBlockList
              blocks={blocks}
              expandedBlocks={expandedBlocks}
              onToggleExpand={handleToggleExpand}
              onReorder={handleReorderBlocks}
              onDelete={handleDeleteBlock}
              onUpdateValues={handleUpdateBlockValues}
              blockValues={blockValues}
            />
          </div>
        </main>
      </div>

      {/* Custom block dialog */}
      <CustomBlockDialog
        open={customBlockDialogOpen}
        onOpenChange={(open) => {
          setCustomBlockDialogOpen(open);
          if (!open) setEditingCustomBlock(null);
        }}
        onSave={editingCustomBlock ? handleUpdateCustomBlock : handleCreateCustomBlock}
        initialTitle={editingCustomBlock?.title}
        initialContent={editingCustomBlock?.markdown_content}
        isEditing={!!editingCustomBlock}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this block? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBlock}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpecEditor;
