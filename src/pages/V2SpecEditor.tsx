/**
 * V2 Spec Editor - Three-panel CAWS builder
 * Layout: Project Navigator | Master Library | Clause Editor
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
import { V2ProjectPrintView } from '@/components/v2/V2ProjectPrintView';
import type { ProjectClauseFull } from '@/types/v2-schema';

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
      window.print();
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
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const selectedClause = clauses.find((c) => c.project_clause_id === selectedClauseId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l border-border h-6"></div>
            <Input
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-2 flex-1"
              placeholder="Project Name"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button variant="outline" onClick={handlePDFExport}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={updateProject.isPending}>
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

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: Project Navigator (Left) */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto">
          <ProjectNavigator
            projectId={project.project_id}
            clauses={clauses}
            selectedClauseId={selectedClauseId}
            onSelectClause={handleSelectClause}
          />
        </aside>

        {/* Panel 2: Master Library (Center) */}
        <aside className="w-96 border-r border-border bg-card overflow-y-auto">
          <MasterLibraryBrowser
            projectId={project.project_id}
            masterLibrary={masterLibrary}
          />
        </aside>

        {/* Panel 3: Clause Editor (Right) */}
        <main className="flex-1 overflow-y-auto bg-background">
          <ClauseEditor
            projectId={project.project_id}
            clause={selectedClause || null}
            onClauseUpdated={() => {
              // Clauses will auto-refresh via React Query
            }}
          />
        </main>
      </div>

      {/* Print view for PDF generation */}
      {project && (
        <V2ProjectPrintView
          project={project}
          clauses={clauses}
        />
      )}
    </div>
  );
}
