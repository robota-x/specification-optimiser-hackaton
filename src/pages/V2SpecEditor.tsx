/**
 * V2 Spec Editor - Three-panel CAWS builder
 * Layout: Master Library | Project Navigator | Clause Editor
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Download, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  useProject,
  useProjectClausesFull,
  useUpdateProject,
} from '@/hooks/useV2Projects';
import { useMasterLibrary } from '@/hooks/useV2MasterLibrary';
import { ProjectNavigator } from '@/components/v2/ProjectNavigator';
import { MasterLibraryBrowser } from '@/components/v2/MasterLibraryBrowser';
import { ClauseEditor } from '@/components/v2/ClauseEditor';
import { ESGReport } from '@/components/esg';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectClauseFull } from '@/types/v2-schema';
import { openPrintDialog } from '@/utils/printDocument';

export default function V2SpecEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [user, setUser] = useState<User | null>(null);

  // Editor state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);

  // Queries
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: clauses = [], isLoading: clausesLoading } = useProjectClausesFull(id);
  const { data: masterLibrary, isLoading: libraryLoading } = useMasterLibrary();

  // Mutations
  const updateProject = useUpdateProject();

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load project data
  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description || '');
    }
  }, [project]);

  // Auto-select first clause
  useEffect(() => {
    if (clauses.length > 0 && !selectedClauseId) {
      setSelectedClauseId(clauses[0].project_clause_id);
    }
  }, [clauses, selectedClauseId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectName, projectDescription]);

  const handleSave = async () => {
    if (!project) return;

    try {
      await updateProject.mutateAsync({
        projectId: project.project_id,
        updates: {
          name: projectName,
          description: projectDescription,
        },
      });

      setHasUnsavedChanges(false);

      toast({
        title: 'Saved!',
        description: 'Project has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePDFExport = () => {
    if (!project) return;

    try {
      openPrintDialog(project, clauses);
      toast({
        title: 'PDF Export',
        description: 'Opening print dialog...',
      });
    } catch (error: any) {
      toast({
        title: 'Error exporting PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSelectClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
  };

  if (projectLoading || clausesLoading || libraryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-2xl bg-primary/10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="text-lg text-muted-foreground font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-6">Project not found</p>
          <Button onClick={() => navigate('/dashboard')} size="lg" className="h-11 px-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedClause = clauses.find((c) => c.project_clause_id === selectedClauseId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Professional Header with enhanced visual hierarchy */}
      <header className="border-b-2 border-border sticky top-0 bg-card/95 backdrop-blur-sm z-10 shadow-sm">
        <div className="px-6 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="border-2 hover:bg-secondary/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l-2 border-border h-8"></div>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="text-xl font-bold border-none shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 px-3 flex-1 bg-transparent"
              placeholder="Project Name"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
                <span className="text-xs font-medium text-accent">Unsaved</span>
              </div>
            )}
            <Button variant="outline" onClick={handlePDFExport} className="border-2 h-10">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProject.isPending}
              className="h-10 px-6 shadow-md"
            >
              {updateProject.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {updateProject.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with enhanced tabs */}
      <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b-2 border-border px-6 h-12 bg-muted/30">
          <TabsTrigger value="editor" className="text-base data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Editor
          </TabsTrigger>
          <TabsTrigger value="esg" className="text-base data-[state=active]:bg-card data-[state=active]:shadow-sm">
            ESG Analysis
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab - Three-panel layout with refined borders */}
        <TabsContent value="editor" className="flex-1 flex overflow-hidden m-0">
          {/* Left Sidebar: Master Library */}
          <aside className="w-80 border-r-2 border-border bg-card overflow-y-auto shadow-sm">
            <MasterLibraryBrowser
              projectId={project.project_id}
              masterLibrary={masterLibrary}
            />
          </aside>

          {/* Middle Sidebar: Project Navigator */}
          <aside className="w-80 border-r-2 border-border bg-card overflow-y-auto shadow-sm">
            <ProjectNavigator
              projectId={project.project_id}
              clauses={clauses}
              selectedClauseId={selectedClauseId}
              onSelectClause={handleSelectClause}
            />
          </aside>

          {/* Right: Clause Editor (full width) */}
          <main className="flex-1 overflow-y-auto bg-background">
            <ClauseEditor
              projectId={project.project_id}
              clause={selectedClause || null}
              onClauseUpdated={() => {
                // Clauses will auto-refresh via React Query
              }}
            />
          </main>
        </TabsContent>

        {/* ESG Analysis Tab with enhanced container */}
        <TabsContent value="esg" className="flex-1 overflow-hidden m-0">
          <div className="h-full overflow-y-auto bg-muted/20">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
              <ESGReport projectId={project.project_id} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
