import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  const [user, setUser] = useState<User | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadSpec();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, id]);

  const loadSpec = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("specs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setSpec(data);
      setTitle(data.title);
      setDescription(data.description || "");
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

  const handleSave = async () => {
    if (!spec) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("specs")
        .update({
          title,
          description,
        })
        .eq("id", spec.id);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Specification has been updated.",
      });
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l border-border h-6"></div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-2"
              placeholder="Specification Title"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this specification"
            />
          </div>

          <div className="border border-border rounded-lg p-8 bg-card">
            <p className="text-muted-foreground text-center">
              Block builder interface will be implemented here.
              <br />
              This is the skeleton - full functionality coming next.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SpecEditor;
