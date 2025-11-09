import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Leaf } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <div className="flex min-h-screen items-center justify-center px-6 py-20">
        <div className="text-center max-w-5xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Professional Specification Management</span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-6xl md:text-7xl font-bold text-foreground tracking-tight leading-tight">
            Architectural Specification
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary mt-2">
              AI Green Optimiser
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Elevate your specification workflow with AI-powered intelligence for sustainable architectural excellence
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-8 text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="h-14 px-8 text-lg border-2 hover:bg-secondary/50"
            >
              Sign In
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-6 justify-center items-center text-sm">
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border shadow-sm">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">Professional Grade</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border shadow-sm">
              <div className="p-2 rounded-lg bg-accent/10">
                <Leaf className="h-5 w-5 text-accent" />
              </div>
              <span className="font-medium text-foreground">Sustainability Focused</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card border border-border shadow-sm">
              <div className="p-2 rounded-lg bg-secondary">
                <Sparkles className="h-5 w-5 text-secondary-foreground" />
              </div>
              <span className="font-medium text-foreground">AI-Powered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
