import { Outlet, Link, useLocation } from "react-router-dom";
import { Brain, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AppLayout() {
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-heading font-semibold text-slate-900 text-lg">Codebase Brain</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-700 transition-colors duration-150 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}