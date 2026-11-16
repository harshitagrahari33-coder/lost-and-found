import { Compass, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="my-12 mx-auto max-w-lg rounded-3xl border border-borderWarm bg-cream-surface p-12 text-center shadow-card">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-subtle text-forest mb-4">
        <Compass className="h-8 w-8" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-sage">404 Error</p>
      <h1 className="font-serif text-3xl font-medium text-ink mt-1">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">
        The report or page you are searching for might have moved or is no longer available.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to browse items
      </Link>
    </section>
  );
}
