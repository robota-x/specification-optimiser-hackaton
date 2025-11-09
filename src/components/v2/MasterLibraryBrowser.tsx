/**
 * Master Library Browser - Center panel for browsing CAWS master library
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAddHybridClause, useAddFreeformClause } from '@/hooks/useV2Projects';
import { cn } from '@/lib/utils';
import type { MasterLibrary, MasterWorkSectionWithClauses, MasterClause } from '@/types/v2-schema';
import { ChevronRight, ChevronDown, Plus, Search, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MasterLibraryBrowserProps {
  projectId: string;
  masterLibrary?: MasterLibrary;
}

export function MasterLibraryBrowser({ projectId, masterLibrary }: MasterLibraryBrowserProps) {
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [freeformDialogOpen, setFreeformDialogOpen] = useState(false);
  const [freeformData, setFreeformData] = useState({
    cawsNumber: '',
    title: '',
    body: '',
  });

  // Mutations
  const addHybridClause = useAddHybridClause();
  const addFreeformClause = useAddFreeformClause();

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleAddMasterClause = async (masterClauseId: string, title: string) => {
    try {
      await addHybridClause.mutateAsync({
        projectId,
        masterClauseId,
      });

      toast({
        title: 'Clause added',
        description: `${title} has been added to your project`,
      });
    } catch (error: any) {
      toast({
        title: 'Error adding clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenFreeformDialog = () => {
    setFreeformData({
      cawsNumber: '',
      title: '',
      body: '',
    });
    setFreeformDialogOpen(true);
  };

  const handleAddFreeformClause = async () => {
    if (!freeformData.cawsNumber || !freeformData.title) {
      toast({
        title: 'Required fields',
        description: 'CAWS number and title are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addFreeformClause.mutateAsync({
        projectId,
        cawsNumber: freeformData.cawsNumber,
        title: freeformData.title,
        body: freeformData.body,
      });

      toast({
        title: 'Custom clause added',
        description: `${freeformData.title} has been added to your project`,
      });

      setFreeformDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error adding custom clause',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter work sections and clauses by search query
  const filteredLibrary = masterLibrary?.work_sections.filter((section) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const sectionMatches =
      section.title.toLowerCase().includes(query) ||
      section.caws_code.toLowerCase().includes(query);

    const clauseMatches = section.clauses.some(
      (clause) =>
        clause.title.toLowerCase().includes(query) ||
        clause.caws_number.toLowerCase().includes(query)
    );

    return sectionMatches || clauseMatches;
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header with enhanced styling */}
        <div className="p-4 border-b-2 border-border space-y-3 bg-gradient-to-r from-card to-secondary/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Master Library</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenFreeformDialog}
                  className="border-2 hover:bg-accent/20 hover:border-accent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a custom freeform clause</TooltipContent>
            </Tooltip>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {!filteredLibrary || filteredLibrary.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="p-3 rounded-xl bg-muted/50 inline-block mb-3">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No clauses found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLibrary.map((section) => {
                const isExpanded = expandedSections.has(section.work_section_id);
                const visibleClauses = searchQuery
                  ? section.clauses.filter(
                      (clause) =>
                        clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        clause.caws_number.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : section.clauses;

                if (searchQuery && visibleClauses.length === 0) {
                  return null;
                }

                return (
                  <div key={section.work_section_id} className="space-y-1">
                    {/* Section header with enhanced styling */}
                    <button
                      onClick={() => toggleSection(section.work_section_id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-accent/20 transition-all duration-200 border-2 border-transparent hover:border-accent/30"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-primary" />
                      )}
                      <span className="font-mono text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {section.caws_code}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">{section.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {section.clauses.length}
                      </span>
                    </button>

                    {/* Clauses in section with enhanced hover */}
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {visibleClauses.map((clause) => (
                          <div
                            key={clause.master_clause_id}
                            className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-accent/20 border-2 border-transparent hover:border-accent/30 transition-all duration-200 group"
                          >
                            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-muted/50 inline-block mb-1">
                                {clause.caws_number}
                              </div>
                              <div className="text-sm leading-tight font-medium">{clause.title}</div>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 hover:bg-accent hover:text-accent-foreground"
                                  onClick={() =>
                                    handleAddMasterClause(clause.master_clause_id, clause.title)
                                  }
                                  disabled={addHybridClause.isPending}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">Add "{clause.title}" to project</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

        {/* Freeform Clause Dialog with enhanced styling */}
        <Dialog open={freeformDialogOpen} onOpenChange={setFreeformDialogOpen}>
        <DialogContent className="border-2">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Custom Clause</DialogTitle>
            <DialogDescription className="text-base">
              Create a freeform clause that's not part of the master library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caws_number" className="text-sm font-semibold">CAWS Number *</Label>
              <Input
                id="caws_number"
                value={freeformData.cawsNumber}
                onChange={(e) =>
                  setFreeformData((prev) => ({ ...prev, cawsNumber: e.target.value }))
                }
                placeholder="e.g., F10/999"
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
              <Input
                id="title"
                value={freeformData.title}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Custom Specification Requirement"
                className="h-11 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" className="text-sm font-semibold">Content (Markdown supported)</Label>
              <Textarea
                id="body"
                value={freeformData.body}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Enter the clause content..."
                rows={8}
                className="border-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreeformDialogOpen(false)} className="border-2">
              Cancel
            </Button>
            <Button
              onClick={handleAddFreeformClause}
              disabled={addFreeformClause.isPending}
              className="shadow-md"
            >
              Add Clause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
