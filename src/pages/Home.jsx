import { useMemo, useState } from "react";
import Hero from "@/components/home/Hero";
import CommunityStats from "@/components/home/CommunityStats";
import CategoryStrip from "@/components/items/CategoryStrip";
import SearchFilter from "@/components/items/SearchFilter";
import ItemGrid from "@/components/items/ItemGrid";
import CampusItemMap from "@/components/items/CampusItemMap";
import { useItems } from "@/lib/ItemsContext";

export default function Home() {
  const { items, savedIds } = useItems();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'map'
  const [showOnlySaved, setShowOnlySaved] = useState(false);

  // Filter items dynamically
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locQuery = locationFilter.trim().toLowerCase();

    return items.filter((item) => {
      // Saved filter
      const itemId = item.id || item._id;
      if (showOnlySaved && !savedIds.includes(itemId)) {
        return false;
      }

      // Type filter (all, lost, found)
      if (type !== "all" && item.type !== type) {
        return false;
      }

      // Category filter
      if (category && item.category !== category) {
        return false;
      }

      // Location filter (campus landmark building)
      if (locQuery) {
        const itemLoc = (typeof item.location === "string" ? item.location : item.location?.name || "").toLowerCase();
        const itemAddr = (item.locationDetails?.address || "").toLowerCase();
        if (!itemLoc.includes(locQuery) && !itemAddr.includes(locQuery)) {
          return false;
        }
      }

      // Search query (matches title, description, location, or user)
      if (query) {
        const itemLoc = (typeof item.location === "string" ? item.location : item.location?.name || "").toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesLocation = itemLoc.includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesUser = item.user?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesLocation && !matchesDescription && !matchesUser && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [items, search, type, category, locationFilter, showOnlySaved, savedIds]);

  // Counts for status pills
  const counts = useMemo(
    () => ({
      all: items.length,
      lost: items.filter((item) => item.type === "lost").length,
      found: items.filter((item) => item.type === "found").length,
    }),
    [items]
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    const map = { all: items.length };
    items.forEach((item) => {
      if (item.category) {
        map[item.category] = (map[item.category] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  const handleHeroSearch = (query) => {
    setSearch(query);
    // Smooth scroll down to discovery section
    const discoveryEl = document.getElementById("discovery-section");
    if (discoveryEl) {
      discoveryEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setType("all");
    setCategory("");
    setLocationFilter("");
    setShowOnlySaved(false);
  };

  return (
    <div className="space-y-10 md:space-y-14">
      {/* 1. Discovery-Focused Hero */}
      <Hero onSearch={handleHeroSearch} initialSearch={search} />

      {/* 2. Lightweight Community Impact Section */}
      <CommunityStats />

      {/* 3. Browse / Discovery Section */}
      <section id="discovery-section" className="space-y-6 pt-4 scroll-mt-20">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-borderWarm/60 pb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-ink">
              Find something familiar.
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Browse recent lost and found reports from around campus.
            </p>
          </div>

          <span className="text-xs font-medium text-ink-muted">
            Showing <strong className="text-forest font-semibold">{filteredItems.length}</strong> of {items.length} items
          </span>
        </div>

        {/* Categories Horizontal Strip */}
        <div id="category-section" className="scroll-mt-24">
          <CategoryStrip
            activeCategory={category}
            onSelectCategory={setCategory}
            itemCounts={categoryCounts}
          />
        </div>

        {/* Search Bar + All/Lost/Found/Saved + Location Filter + View Mode Toggle */}
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          type={type}
          onTypeChange={setType}
          category={category}
          onCategoryChange={setCategory}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showOnlySaved={showOnlySaved}
          onToggleSaved={setShowOnlySaved}
          savedCount={savedIds.length}
          counts={counts}
        />

        {/* Dynamic Display: Grid View or Campus Map View */}
        {viewMode === "map" ? (
          <CampusItemMap items={filteredItems} />
        ) : (
          <ItemGrid
            items={filteredItems}
            onResetFilters={handleResetFilters}
          />
        )}
      </section>
    </div>
  );
}
