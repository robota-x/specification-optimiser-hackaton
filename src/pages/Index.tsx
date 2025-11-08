import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-3xl">
        <h1 className="mb-4 text-5xl font-bold text-foreground">Welcome to Specky</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Professional specification builder for construction and design projects
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
