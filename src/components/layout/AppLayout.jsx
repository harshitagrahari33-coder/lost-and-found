import { Outlet } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink antialiased">
      {/* Sticky Translucent Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-16">
        <Outlet />
      </main>

      {/* Subtle Editorial Footer */}
      <footer className="border-t border-borderWarm bg-cream-surface/70 py-10 px-4 sm:px-6 lg:px-8 mt-auto hidden md:block">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-semibold text-ink">Lost & Found</span>
            <span>·</span>
            <span>Building a kinder campus, one return at a time.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Local-first storage</span>
            <span>·</span>
            <span>Campus Community Platform</span>
            <span>·</span>
            <span className="text-forest font-medium">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
