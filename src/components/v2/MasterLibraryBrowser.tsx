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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Master Library</h2>
          <Button size="sm" variant="outline" onClick={handleOpenFreeformDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Custom
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clauses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {!filteredLibrary || filteredLibrary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No clauses found</p>
            </div>
          ) : (
            <div className="space-y-1">
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
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.work_section_id)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs text-muted-foreground">
                        {section.caws_code}
                      </span>
                      <span className="flex-1 truncate">{section.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {section.clauses.length}
                      </span>
                    </button>

                    {/* Clauses in section */}
                    {isExpanded && (
                      <div className="ml-6 space-y-0.5">
                        {visibleClauses.map((clause) => (
                          <div
                            key={clause.master_clause_id}
                            className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent/50 group"
                          >
                            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-muted-foreground font-mono">
                                {clause.caws_number}
                              </div>
                              <div className="text-sm">{clause.title}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                handleAddMasterClause(clause.master_clause_id, clause.title)
                              }
                              disabled={addHybridClause.isPending}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
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

      {/* Freeform Clause Dialog */}
      <Dialog open={freeformDialogOpen} onOpenChange={setFreeformDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Clause</DialogTitle>
            <DialogDescription>
              Create a freeform clause that's not part of the master library
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caws_number">CAWS Number *</Label>
              <Input
                id="caws_number"
                value={freeformData.cawsNumber}
                onChange={(e) =>
                  setFreeformData((prev) => ({ ...prev, cawsNumber: e.target.value }))
                }
                placeholder="e.g., F10/999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={freeformData.title}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Custom Specification Requirement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content (Markdown supported)</Label>
              <Textarea
                id="body"
                value={freeformData.body}
                onChange={(e) => setFreeformData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Enter the clause content..."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFreeformDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFreeformClause}
              disabled={addFreeformClause.isPending}
            >
              Add Clause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
