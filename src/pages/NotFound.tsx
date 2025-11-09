import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="text-center max-w-md px-6">
        {/* 404 Number with gradient */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h2>
        <p className="text-lg text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate(-1)}
            variant="outline"
            className="h-12 px-6 border-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </Button>
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="h-12 px-6 shadow-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            Home
          </Button>
        </div>

        {/* Additional info */}
        <p className="mt-8 text-sm text-muted-foreground">
          Path: <code className="px-2 py-1 rounded bg-muted text-foreground">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
