import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Compass, LogIn, LogOut, MessageSquare, PlusCircle, Shield, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useItems } from "@/lib/ItemsContext";
import NotificationDropdown from "@/components/layout/NotificationDropdown";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { savedIds } = useItems();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBrowseClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const discoveryEl = document.getElementById("discovery-section");
      if (discoveryEl) {
        discoveryEl.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleCategoriesClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const catEl = document.getElementById("category-section");
      if (catEl) {
        catEl.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/#category-section");
    }
  };

  const savedCount = savedIds?.length || 0;
  const isAdmin = currentUser?.role === "admin";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-cream/95 backdrop-blur-md py-2.5 shadow-sm border-borderWarm"
          : "bg-cream/80 backdrop-blur-sm py-3.5 border-borderWarm/70"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* LEFT: Minimal Logo & Brand */}
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-cream-surface shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Compass className="h-5 w-5 text-accentGold" />
          </div>
          <div>
            <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-ink group-hover:text-forest transition-colors">
              Lost & Found
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-medium uppercase tracking-wider text-sage">
              Campus Recovery
            </span>
          </div>
        </Link>

        {/* CENTER: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            onClick={handleBrowseClick}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === "/"
                ? "text-forest bg-cream-surface shadow-subtle border border-borderWarm"
                : "text-ink-muted hover:text-ink hover:bg-cream-surface/60"
            }`}
          >
            Browse
          </Link>
          <a
            href="#category-section"
            onClick={handleCategoriesClick}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-cream-surface/60 transition-colors"
          >
            Categories
          </a>
          <Link
            to="/add"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              location.pathname === "/add"
                ? "text-forest bg-cream-surface shadow-subtle border border-borderWarm"
                : "text-ink-muted hover:text-ink hover:bg-cream-surface/60"
            }`}
          >
            Report an Item
          </Link>
          {currentUser && (
            <Link
              to="/profile?tab=messages"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                location.pathname === "/profile" && location.search.includes("tab=messages")
                  ? "text-forest bg-cream-surface shadow-subtle border border-borderWarm font-semibold"
                  : "text-ink-muted hover:text-ink hover:bg-cream-surface/60"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Inquiries</span>
            </Link>
          )}
          {currentUser && (
            <Link
              to="/profile"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === "/profile" && !location.search.includes("tab=messages")
                  ? "text-forest bg-cream-surface shadow-subtle border border-borderWarm"
                  : "text-ink-muted hover:text-ink hover:bg-cream-surface/60"
              }`}
            >
              My Reports
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                location.pathname === "/admin"
                  ? "text-forest bg-cream-surface shadow-subtle border border-borderWarm font-semibold"
                  : "text-accentGold-dark hover:text-forest hover:bg-cream-surface/60"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-accentGold" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* RIGHT: User Status / CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications dropdown for signed-in users */}
          {currentUser && <NotificationDropdown />}

          {/* Saved items quick button */}
          <Link
            to={currentUser ? "/profile?tab=saved" : "/login"}
            aria-label="View saved items"
            className="relative flex items-center gap-1.5 rounded-xl border border-borderWarm bg-cream-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:border-sage transition-all shadow-subtle"
          >
            <Bookmark className={`h-4 w-4 ${savedCount > 0 ? "fill-accentGold text-accentGold" : ""}`} />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="rounded-full bg-forest px-1.5 py-0.2 text-[10px] font-semibold text-cream-surface">
                {savedCount}
              </span>
            )}
          </Link>

          {currentUser ? (
            <>
              {/* User profile / username badge */}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl border border-borderWarm bg-cream-surface p-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-ink hover:border-sage transition-all shadow-subtle"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sage-subtle text-forest font-semibold text-xs">
                  {currentUser.username?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
                </div>
                <span className="hidden sm:inline-block max-w-[90px] truncate font-medium">
                  {currentUser.username}
                </span>
                {isAdmin && (
                  <span className="hidden lg:inline-block rounded bg-accentGold/20 px-1 py-0.2 text-[9px] font-bold text-accentGold-dark uppercase">
                    Admin
                  </span>
                )}
              </Link>

              {/* Quick Report CTA (Desktop) */}
              <Link
                to="/add"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Report</span>
              </Link>

              {/* Logout icon */}
              <button
                type="button"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
                className="rounded-xl border border-borderWarm bg-cream-surface p-2 text-ink-muted hover:text-lostCoral hover:border-lostCoral-border transition-colors shadow-subtle"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-1.5 text-xs font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Campus Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
