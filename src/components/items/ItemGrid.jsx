import { motion } from "framer-motion";
import { Compass, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ItemCard from "@/components/items/ItemCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export default function ItemGrid({ items = [], onResetFilters }) {
  if (items.length === 0) {
    return (
      <div className="my-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-dark text-sage border border-borderWarm mb-4">
          <Compass className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold text-ink">Nothing here yet</h3>
        <p className="mt-1.5 max-w-md text-sm text-ink-muted">
          No reports match your current search or category filter. Try clearing filters or be the first to report this item.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-xl border border-borderWarm bg-cream-surface px-4 py-2.5 text-xs font-medium text-ink hover:border-sage transition-colors"
            >
              Clear all filters
            </button>
          )}
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Report an item
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={itemVariants}>
          <ItemCard item={item} />
        </motion.div>
      ))}
    </motion.div>
  );
}
