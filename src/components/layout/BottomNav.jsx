import { Link, useLocation } from "react-router-dom";
import { Bookmark, Compass, Home, Plus, User } from "lucide-react";
import { useItems } from "@/lib/ItemsContext";

export default function BottomNav() {
  const location = useLocation();
  const { savedIds } = useItems();
  const savedCount = savedIds?.length || 0;

  const isHome = location.pathname === "/" && !location.search;
  const isBrowse = location.pathname === "/" && location.hash === "#discovery-section";
  const isSaved = location.pathname === "/profile" && location.search.includes("tab=saved");
  const isProfile = location.pathname === "/profile" && !location.search.includes("tab=saved");

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-borderWarm bg-cream-surface/95 backdrop-blur-lg px-4 py-2 shadow-card">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
            isHome ? "text-forest" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Home className={`h-5 w-5 ${isHome ? "stroke-[2.3]" : ""}`} />
          <span>Home</span>
        </Link>

        {/* Browse */}
        <a
          href="/#discovery-section"
          className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
            isBrowse ? "text-forest" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Compass className={`h-5 w-5 ${isBrowse ? "stroke-[2.3]" : ""}`} />
          <span>Browse</span>
        </a>

        {/* Central Report Action Button */}
        <Link
          to="/add"
          className="flex flex-col items-center -mt-5"
          aria-label="Report an item"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream-surface shadow-float hover:scale-105 transition-transform border-2 border-cream-surface">
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-forest mt-0.5">Report</span>
        </Link>

        {/* Saved */}
        <Link
          to="/profile?tab=saved"
          className={`relative flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
            isSaved ? "text-forest" : "text-ink-muted hover:text-ink"
          }`}
        >
          <div className="relative">
            <Bookmark className={`h-5 w-5 ${isSaved ? "fill-forest stroke-forest" : ""}`} />
            {savedCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accentGold text-[9px] font-bold text-ink px-1">
                {savedCount}
              </span>
            )}
          </div>
          <span>Saved</span>
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition-colors ${
            isProfile ? "text-forest" : "text-ink-muted hover:text-ink"
          }`}
        >
          <User className={`h-5 w-5 ${isProfile ? "stroke-[2.3]" : ""}`} />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
