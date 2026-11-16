import {
  Compass,
  Headphones,
  Watch,
  FileText,
  ShoppingBag,
  Shirt,
  BookOpen,
  Key,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";

export const CATEGORIES_WITH_ICONS = [
  { id: "all", label: "All Items", icon: Compass },
  { id: "Electronics", label: "Electronics", icon: Headphones },
  { id: "Accessories", label: "Accessories", icon: Watch },
  { id: "Documents", label: "Documents", icon: FileText },
  { id: "Bags", label: "Bags & Wallets", icon: ShoppingBag },
  { id: "Clothing", label: "Clothing", icon: Shirt },
  { id: "Stationery", label: "Stationery", icon: BookOpen },
  { id: "Keys", label: "Keys", icon: Key },
  { id: "Other", label: "Other", icon: Package },
];

export default function CategoryStrip({ activeCategory, onSelectCategory, itemCounts = {} }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {CATEGORIES_WITH_ICONS.map((cat) => {
          const Icon = cat.icon;
          const isActive =
            (cat.id === "all" && (!activeCategory || activeCategory === "all")) ||
            activeCategory === cat.id;

          const count = cat.id === "all" ? itemCounts.all : itemCounts[cat.id] || 0;

          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onSelectCategory(cat.id === "all" ? "" : cat.id)}
              className={`snap-start flex-shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all border ${
                isActive
                  ? "bg-forest text-cream-surface border-forest shadow-sm"
                  : "bg-cream-surface text-ink-muted hover:text-ink hover:border-sage border-borderWarm"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? "text-accentGold" : "text-sage"
                }`}
              />
              <span>{cat.label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive
                      ? "bg-forest-light text-cream-surface"
                      : "bg-cream-dark text-ink-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
