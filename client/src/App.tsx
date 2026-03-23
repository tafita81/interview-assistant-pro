import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";
import Assistant from "./pages/Assistant";
import TechTest from "./pages/TechTest";
import NotFound from "./pages/NotFound";

export default function App() {
  const [location] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && location !== "/") {
      // Redirect to home if not authenticated and trying to access protected route
    }
  }, [isAuthenticated, loading, location]);

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-cyan border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Route handling
  if (location === "/") return <Home />;
  if (location === "/assistant") return <Assistant />;
  if (location === "/tech-test") return <TechTest />;
  return <NotFound />;
}
