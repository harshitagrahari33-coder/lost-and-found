import { Bookmark, LayoutGrid, Map, MapPin, Search, X } from "lucide-react";
import { motion } from "framer-motion";

export const CAMPUS_FILTER_LOCATIONS = [
  { id: "", label: "All Campus Locations" },
  { id: "Library", label: "Central Library" },
  { id: "Engineering", label: "Engineering Blocks (A/B)" },
  { id: "Cafeteria", label: "Central Cafeteria" },
  { id: "Sports", label: "Sports Complex & Gym" },
  { id: "Science", label: "Science Block & Labs" },
  { id: "Hostel", label: "Hostel Grounds" },
  { id: "Auditorium", label: "Central Auditorium" },
];

export default function SearchFilter({
  search,
  onSearchChange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  locationFilter = "",
  onLocationFilterChange,
  viewMode = "grid",
  onViewModeChange,
  showOnlySaved,
  onToggleSaved,
  savedCount = 0,
  counts = {},
}) {
  const hasActiveFilters = Boolean(
    search || (type && type !== "all") || category || locationFilter || showOnlySaved
  );

  const resetAll = () => {
    onSearchChange("");
    onTypeChange("all");
    if (onCategoryChange) onCategoryChange("");
    if (onLocationFilterChange) onLocationFilterChange("");
    if (onToggleSaved && showOnlySaved) onToggleSaved(false);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items, locations, or keywords..."
            className="h-11 w-full rounded-xl border border-borderWarm bg-cream-surface pl-10 pr-9 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:ring-1 focus:ring-forest shadow-subtle"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Campus Landmark Dropdown */}
        {onLocationFilterChange && (
          <div className="relative min-w-[190px]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <select
              value={locationFilter}
              onChange={(e) => onLocationFilterChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-borderWarm bg-cream-surface pl-8 pr-3 text-xs font-medium text-ink outline-none transition focus:border-forest focus:ring-1 focus:ring-forest shadow-subtle appearance-none cursor-pointer"
            >
              {CAMPUS_FILTER_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
            {locationFilter && (
              <button
                type="button"
                onClick={() => onLocationFilterChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* View Mode Switcher: Grid vs Map */}
        {onViewModeChange && (
          <div className="flex items-center rounded-xl border border-borderWarm bg-cream-surface p-1 shadow-subtle flex-shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-forest text-cream-surface shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("map")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "map"
                  ? "bg-forest text-cream-surface shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
              title="Campus Map View"
            >
              <Map className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Campus Map</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Status Pills & Saved filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All", count: counts.all },
            { id: "lost", label: "Lost", count: counts.lost },
            { id: "found", label: "Found", count: counts.found },
          ].map((tab) => {
            const active = type === tab.id && !showOnlySaved;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (showOnlySaved && onToggleSaved) onToggleSaved(false);
                  onTypeChange(tab.id);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  active
                    ? "bg-forest text-cream-surface shadow-subtle"
                    : "bg-cream-surface text-ink-muted hover:text-ink border border-borderWarm hover:border-sage"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      active ? "bg-forest-light text-cream-surface" : "bg-cream-dark text-ink-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Saved Items Quick Filter */}
          {onToggleSaved && (
            <button
              type="button"
              onClick={() => onToggleSaved(!showOnlySaved)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                showOnlySaved
                  ? "bg-forest text-cream-surface shadow-subtle"
                  : "bg-cream-surface text-ink-muted hover:text-ink border border-borderWarm hover:border-sage"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${showOnlySaved ? "fill-current text-accentGold" : ""}`} />
              <span>Saved</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                  showOnlySaved ? "bg-forest-light text-cream-surface" : "bg-cream-dark text-ink-muted"
                }`}
              >
                {savedCount}
              </span>
            </button>
          )}

          {/* Reset button if active filters */}
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-xl border border-borderWarm bg-cream-surface px-2.5 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-borderWarm-dark transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
