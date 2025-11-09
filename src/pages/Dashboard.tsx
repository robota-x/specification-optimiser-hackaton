/**
 * Dashboard - v2 CAWS Projects
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, LogOut, Download, Trash2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useProjects, useDeleteProject } from '@/hooks/useV2Projects';
import { NewProjectWizard } from '@/components/v2/NewProjectWizard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Queries and mutations
  const { data: projects = [], isLoading } = useProjects();
  const deleteProject = useDeleteProject();

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
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject.mutateAsync(projectToDelete);

      toast({
        title: 'Project deleted',
        description: 'Project has been permanently deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleDownloadPDF = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement v2 PDF export
    toast({
      title: 'Coming soon',
      description: 'PDF export for v2 projects will be available soon',
    });
  };

  const confirmDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header with gradient accent */}
      <header className="border-b-2 border-border bg-gradient-to-r from-card via-card to-secondary/30 shadow-sm">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Specification Optimiser
              </h1>
              <p className="text-xs text-muted-foreground">Professional workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-2">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-foreground tracking-tight">Your Projects</h2>
            <p className="text-lg text-muted-foreground">
              CAWS-based specification projects with AI-powered optimization
            </p>
          </div>
          <Button
            onClick={() => setWizardOpen(true)}
            size="lg"
            className="h-12 px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-2">
                <CardHeader>
                  <div className="h-6 bg-muted rounded-lg w-3/4 mb-3"></div>
                  <div className="h-4 bg-muted rounded-lg w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded-lg w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-accent/10 mb-6">
                <FileText className="h-16 w-16 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-8 text-center max-w-md">
                Create your first CAWS specification project to begin designing sustainable architectural excellence
              </p>
              <Button onClick={() => setWizardOpen(true)} size="lg" className="h-12 px-8">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.project_id}
                className="group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 hover:-translate-y-1"
                onClick={() => navigate(`/spec/${project.project_id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDownloadPDF(project.project_id, e)}
                        className="h-8 w-8 p-0 hover:bg-accent/20 hover:text-accent"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => confirmDelete(project.project_id, e)}
                        className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl leading-tight">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || project.project_location || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.client_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">Client:</span>
                        <span className="text-muted-foreground">{project.client_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                      <div className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                        Active
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Project Wizard */}
      <NewProjectWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to delete this project? This action cannot be undone and will
              delete all clauses and data associated with this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
