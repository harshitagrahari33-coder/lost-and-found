import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TypeBadge from "@/components/items/TypeBadge";
import SaveButton from "@/components/items/SaveButton";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=85";

export default function ItemCard({ item }) {
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-borderWarm bg-cream-surface shadow-subtle hover:shadow-cardHover hover:border-sage transition-colors duration-200"
    >
      <Link to={`/item/${item.id}`} className="flex flex-col flex-1">
        {/* Photo Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-dark">
          <img
            src={item.imageUrl || FALLBACK_IMAGE}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
          />

          {/* Top Floating Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <TypeBadge type={item.type} size="sm" />
            {item.resolved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/90 text-cream-surface px-2.5 py-0.5 text-[11px] font-medium tracking-wide">
                <CheckCircle2 className="h-3 w-3 text-foundGreen" />
                Resolved
              </span>
            )}
          </div>

          {/* Save Button (top-right) */}
          <div className="absolute top-3 right-3 z-10 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
            <SaveButton itemId={item.id} showCount count={item.saves || 0} />
          </div>

          {/* Category Tag (bottom-left overlay) */}
          {item.category && (
            <div className="absolute bottom-2.5 left-3">
              <span className="inline-flex rounded-full bg-cream-surface/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-ink-muted border border-borderWarm/80">
                {item.category}
              </span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="flex flex-col flex-1 p-4 justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink line-clamp-1 group-hover:text-forest transition-colors">
              {item.title}
            </h3>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-sage" />
              <span className="truncate">{item.location}</span>
              <span className="text-borderWarm-dark">·</span>
              <Clock className="h-3 w-3 flex-shrink-0 text-ink-light" />
              <span className="flex-shrink-0">{timeAgo}</span>
            </div>
          </div>

          {/* Card Footer / Action */}
          <div className="mt-4 pt-3 border-t border-borderWarm-light flex items-center justify-between text-xs font-medium text-forest">
            <span className="text-ink-muted font-normal">
              By {item.user}
            </span>
            <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-200">
              View details <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
