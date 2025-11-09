import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, LogOut, Download } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { SpecPDFGenerator } from "@/components/pdf/SpecPDFGenerator";

interface Spec {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDFForSpec, setGeneratingPDFForSpec] = useState<Spec | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadSpecs();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSpecs = async () => {
    try {
      const { data, error } = await supabase
        .from("specs")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setSpecs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading specs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewSpec = async () => {
    try {
      const { data, error } = await supabase
        .from("specs")
        .insert({
          title: "Untitled Specification",
          description: "New specification document",
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/spec/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating spec",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleDownloadPDF = (spec: Spec, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setGeneratingPDFForSpec(spec);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Architectural Specification AI Green Optimiser</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Your Specifications</h2>
            <p className="text-muted-foreground">Manage and create specification documents</p>
          </div>
          <Button onClick={createNewSpec} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Specification
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : specs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No specifications yet</h3>
              <p className="text-muted-foreground mb-6">Create your first specification to get started</p>
              <Button onClick={createNewSpec}>
                <Plus className="h-4 w-4 mr-2" />
                Create Specification
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specs.map((spec) => (
              <Card
                key={spec.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/spec/${spec.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {spec.title}
                  </CardTitle>
                  <CardDescription>
                    {spec.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(spec.updated_at).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDownloadPDF(spec, e)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* PDF Generator */}
      {generatingPDFForSpec && (
        <SpecPDFGenerator
          specId={generatingPDFForSpec.id}
          title={generatingPDFForSpec.title}
          description={generatingPDFForSpec.description || ""}
          onComplete={() => setGeneratingPDFForSpec(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
