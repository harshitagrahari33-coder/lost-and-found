import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useItems } from "@/lib/ItemsContext";

export default function SaveButton({ itemId, showCount = false, count = 0, className = "" }) {
  const { isSaved, toggleSave } = useItems();
  const saved = isSaved(itemId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSave(itemId);
    if (!saved) {
      toast.success("Saved to your collection", {
        description: "You can find this in your Saved Items tab.",
      });
    } else {
      toast.info("Removed from saved items");
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      onClick={handleClick}
      aria-label={saved ? "Remove from saved" : "Save item"}
      className={`inline-flex items-center gap-1.5 rounded-full p-2 text-xs font-medium backdrop-blur-md transition-all shadow-subtle ${
        saved
          ? "bg-forest text-cream-surface border border-forest"
          : "bg-cream-surface/90 text-ink-muted hover:text-ink border border-borderWarm hover:border-sage"
      } ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 transition-colors ${
          saved ? "fill-current text-accentGold" : "text-ink-muted hover:text-ink"
        }`}
      />
      {showCount && (
        <span className={`text-xs font-semibold ${saved ? "text-cream-surface" : "text-ink-muted"}`}>
          {count}
        </span>
      )}
    </motion.button>
  );
}
