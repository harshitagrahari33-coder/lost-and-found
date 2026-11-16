import { useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const QUICK_CHIPS = [
  "Backpack",
  "Laptop",
  "Phone",
  "Wallet",
  "Keys",
  "ID Card",
  "Bottle",
  "Headphones",
];

const CAMPUS_HERO_IMAGE =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=85";

export default function Hero({ onSearch, initialSearch = "" }) {
  const [query, setQuery] = useState(initialSearch);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query.trim());
    }
  };

  const handleChipClick = (chip) => {
    setQuery(chip);
    if (onSearch) {
      onSearch(chip);
    }
  };

  return (
    <section className="relative pt-4 pb-8 md:pt-8 md:pb-12">
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Editorial Headline, Subtitle, Search, Chips */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-borderWarm bg-cream-surface px-3.5 py-1 text-xs font-medium text-forest shadow-subtle">
            <Sparkles className="h-3.5 w-3.5 text-accentGold" />
            <span>Campus Community Lost & Found</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-medium leading-[1.12] text-ink">
            Items get lost.<br />
            <span className="italic font-normal text-forest">Kindness brings</span><br />
            them back.
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-ink-muted leading-relaxed">
            A community-powered way to find what you’ve misplaced and return what you’ve found across campus.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="relative max-w-xl">
            <div className="flex items-center rounded-2xl border border-borderWarm bg-cream-surface p-1.5 shadow-card transition-all focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
              <Search className="ml-3 h-5 w-5 text-sage flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items, locations, or keywords..."
                className="w-full bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-light outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-sm flex-shrink-0"
              >
                <span>Search</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Search Chips */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-light">
              Popular searches:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="rounded-lg border border-borderWarm bg-cream-surface/80 px-2.5 py-1 text-xs text-ink-muted hover:border-sage hover:text-forest hover:bg-cream-surface transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Campus Visual */}
        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            {/* Main Rounded Image */}
            <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden rounded-3xl border border-borderWarm bg-cream-surface shadow-card">
              <img
                src={CAMPUS_HERO_IMAGE}
                alt="Warm campus quad with students under sunlight"
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />
            </div>

            {/* Floating Editorial Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 rounded-2xl border border-borderWarm bg-cream-surface/95 p-4 shadow-card backdrop-blur-md max-w-[210px]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sage">
                Community Impact
              </p>
              <p className="mt-1 text-sm font-semibold text-ink leading-snug">
                12 items safely reunited with owners this week.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
