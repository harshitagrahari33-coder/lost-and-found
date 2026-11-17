import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  CornerDownRight,
  ExternalLink,
  Flag,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  ShieldAlert,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import ChatBox from "@/components/items/ChatBox";
import TypeBadge from "@/components/items/TypeBadge";
import SaveButton from "@/components/items/SaveButton";
import ItemCard from "@/components/items/ItemCard";
import LeafletMap from "@/components/items/LeafletMap";
import { useItems } from "@/lib/ItemsContext";
import { useAuth } from "@/lib/AuthContext";
import { itemService } from "@/services/itemService";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=85";

const REPORT_REASONS = [
  { value: "suspicious", label: "Suspicious listing or fraudulent claim" },
  { value: "spam", label: "Spam, duplicate or commercial promotion" },
  { value: "inappropriate", label: "Inappropriate content or offensive photo" },
  { value: "fake", label: "Fake or joke item report" },
  { value: "harassment", label: "Harassment or privacy violation" },
];

export default function ItemDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getItem, getSimilarItems, resolveItem } = useItems();
  const { currentUser, isAuthenticated } = useAuth();

  const [item, setItem] = useState(() => getItem(id));
  const [locationData, setLocationData] = useState(null);
  const [isLoading, setIsLoading] = useState(!item);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState("");

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("suspicious");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Fetch item and location data from backend
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    let isMounted = true;
    async function loadItemData() {
      try {
        const fetched = await itemService.getItemById(id);
        if (isMounted) {
          setItem(fetched);
        }
      } catch (err) {
        console.warn("Could not fetch item from backend:", err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }

      try {
        const loc = await itemService.getItemLocation(id);
        if (isMounted) {
          setLocationData(loc);
        }
      } catch (locErr) {
        // Unauthenticated or location not available
        console.warn("Could not fetch location data:", locErr.message);
      }
    }

    loadItemData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const reporterUserId = (item?.reporterId?._id || item?.reporterId)?.toString();
  const reporterName =
    item?.reporterId?.name ||
    item?.user ||
    (typeof item?.reporterId === "string" ? "Campus Reporter" : "Campus Member");
  const isOwner = Boolean(
    currentUserId && reporterUserId && currentUserId === reporterUserId
  );
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!item || item.status !== "active" || !isAuthenticated || (!isOwner && !isAdmin)) {
      setPotentialMatches([]);
      setMatchError("");
      return undefined;
    }

    let active = true;
    setIsLoadingMatches(true);
    setMatchError("");
    itemService.getMatchesForItem(item._id || item.id)
      .then((matches) => {
        if (active) setPotentialMatches(matches.slice(0, 3));
      })
      .catch((error) => {
        if (active) setMatchError(error.response?.data?.message || "Matching results are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setIsLoadingMatches(false);
      });

    return () => {
      active = false;
    };
  }, [item, isAuthenticated, isOwner, isAdmin]);

  const similarItems = item ? getSimilarItems(item, 4) : [];
  const timeAgo = item?.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : "";
  const formattedDate = item?.createdAt ? format(new Date(item.createdAt), "MMMM d, yyyy") : "";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-surface border border-borderWarm text-forest shadow-subtle animate-spin mb-4">
          <Loader2 className="h-6 w-6" />
        </div>
        <p className="font-serif text-base font-medium text-ink">Loading item details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-cream-surface border border-borderWarm text-sage mb-4">
          <Compass className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-3xl font-medium text-ink">Item not found</h2>
        <p className="mt-2 text-sm text-ink-muted">
          This report might have been resolved or removed from your local storage.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse campus reports
        </button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard", {
        description: "Share this link with classmates or campus groups.",
      });
    }
  };

  const handleResolveItem = async () => {
    try {
      const resolved = await resolveItem(item._id || item.id);
      setItem(resolved);
      toast.success("Item marked as resolved!", {
        description: "Thank you for keeping the campus community updated.",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to mark item as resolved.");
    }
  };

  const handleOpenMap = () => {
    const lat = item.latitude;
    const lng = item.longitude;
    const url =
      locationData?.mapsUrl ||
      (lat && lng
        ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
        : null);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Map coordinates not available for this listing.");
    }
  };

  const handleGetDirections = () => {
    const lat = item.latitude;
    const lng = item.longitude;
    const url =
      locationData?.directionsUrl ||
      (lat && lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : null);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.info("Directions not available for this listing.");
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please sign in with your @kiet.edu email to report a listing.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      await itemService.createReport({
        itemId: item._id || item.id,
        reason: reportReason,
        description: reportDescription.trim(),
      });
      toast.success("Listing reported for campus moderation", {
        description: "Our student safety moderators will inspect this report promptly.",
      });
      setIsReportModalOpen(false);
      setReportDescription("");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit report. It may have already been reported."
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Back Button & Top Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-borderWarm bg-cream-surface px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-sage transition-all shadow-subtle"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to browse</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-borderWarm bg-cream-surface px-3 py-2 text-xs font-medium text-ink-muted hover:text-lostCoral hover:border-lostCoral-border transition-all shadow-subtle"
            title="Report this listing"
          >
            <Flag className="h-3.5 w-3.5 text-lostCoral" />
            <span className="hidden sm:inline">Report listing</span>
          </button>

          <SaveButton itemId={item.id || item._id} showCount count={item.saves || 0} />
          <button
            type="button"
            onClick={handleShare}
            title="Share report"
            aria-label="Share report"
            className="inline-flex items-center gap-1.5 rounded-full border border-borderWarm bg-cream-surface px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-sage transition-all shadow-subtle"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main Marketplace Product Card */}
      <section className="grid gap-8 lg:grid-cols-12 lg:gap-12 items-start">
        {/* LEFT COLUMN: Large Image Gallery View */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/3] sm:aspect-[1/1] w-full overflow-hidden rounded-3xl border border-borderWarm bg-cream-surface shadow-card">
            <img
              src={item.imageUrl || FALLBACK_IMAGE}
              alt={item.title}
              className="h-full w-full object-cover"
            />
            {item.resolved && (
              <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-cream-surface px-4 py-2 text-sm font-semibold text-forest shadow-card">
                  <CheckCircle2 className="h-5 w-5 text-foundGreen" />
                  Successfully Reunited / Resolved
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-ink-light italic">
            Photographed & uploaded by reporter
          </p>
        </div>

        {/* RIGHT COLUMN: Product Information & Discovery CTAs */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Metadata */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <TypeBadge type={item.type} size="md" />
              {item.category && (
                <span className="inline-flex items-center gap-1 rounded-full border border-borderWarm bg-cream-surface px-3 py-1 text-xs font-medium text-ink-muted">
                  <Tag className="h-3 w-3 text-sage" />
                  {item.category}
                </span>
              )}
              <span className="text-xs text-ink-muted">
                Reported {timeAgo}
              </span>
            </div>

            {/* Resolved Status Banner */}
            {item.resolved && (
              <div className="rounded-2xl border border-foundGreen-border bg-foundGreen-surface/80 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-foundGreen flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foundGreen uppercase tracking-wider">
                    Reunited & Resolved
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {item.resolvedBy?.name
                      ? `Marked resolved by ${item.resolvedBy.name}`
                      : "Marked resolved by reporter"}{" "}
                    {item.resolvedAt ? `· ${format(new Date(item.resolvedAt), "PPP p")}` : ""}
                  </p>
                </div>
              </div>
            )}

            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-ink leading-tight">
              {item.title}
            </h1>
          </div>

          {/* Location & Details Card */}
          <div className="rounded-2xl border border-borderWarm bg-cream-surface p-5 space-y-4 shadow-subtle">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-subtle text-forest flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                  Reported Location
                </p>
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {item.location}
                </p>
                {item.locationDetails?.address && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    {item.locationDetails.address}
                  </p>
                )}
                {item.latitude && item.longitude && (
                  <p className="text-[11px] text-ink-light mt-0.5">
                    Campus GPS: {item.latitude}, {item.longitude}
                  </p>
                )}

                {/* Map Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2.5">
                  <button
                    type="button"
                    onClick={handleOpenMap}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-borderWarm bg-cream/50 px-3 py-1.5 text-xs font-medium text-forest hover:bg-cream-dark hover:border-sage transition-colors shadow-subtle"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-sage" />
                    <span>View on Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGetDirections}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-borderWarm bg-cream/50 px-3 py-1.5 text-xs font-medium text-forest hover:bg-cream-dark hover:border-sage transition-colors shadow-subtle"
                  >
                    <Navigation className="h-3.5 w-3.5 text-sage" />
                    <span>Get Directions</span>
                  </button>

                  {locationData?.isApproximated && (
                    <span className="text-[11px] text-ink-light italic">
                      (Approximate location. Sign in to view exact pin.)
                    </span>
                  )}
                </div>

                {/* Embedded Leaflet Map Preview */}
                {item.latitude && item.longitude && (
                  <div className="pt-3">
                    <LeafletMap
                      latitude={item.latitude}
                      longitude={item.longitude}
                      locationName={item.location}
                      editable={false}
                      height="170px"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-borderWarm-light pt-3 flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-subtle text-forest flex-shrink-0 mt-0.5">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                  Report Date
                </p>
                <p className="text-sm font-semibold text-ink mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>
          </div>

          {/* Description Block */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Description & Identifying Details
            </h2>
            <p className="text-sm text-ink/90 leading-relaxed rounded-2xl border border-borderWarm bg-cream-surface/70 p-4">
              {item.description || "No specific description was added for this item report."}
            </p>
          </div>

          {/* AI / Smart Potential Match Banner */}
          {(isOwner || isAdmin) && item.status === "active" && (
            <div className="rounded-2xl border border-accentGold/60 bg-accentGold-surface p-4 space-y-3 shadow-subtle animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accentGold-dark" />
                  <span className="text-xs font-bold uppercase tracking-wider text-accentGold-dark">
                    Smart Matching
                  </span>
                </div>
                <span className="text-[11px] font-medium text-ink-muted">
                  {isLoadingMatches ? "Searching..." : `${potentialMatches.length} candidate${potentialMatches.length === 1 ? "" : "s"}`}
                </span>
              </div>

              {isLoadingMatches ? (
                <div className="flex items-center gap-2 text-xs text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" /> Finding active reports...</div>
              ) : matchError ? (
                <p className="text-xs text-ink-muted">{matchError}</p>
              ) : potentialMatches.length === 0 ? (
                <p className="text-xs text-ink-muted">No potential matches found yet.</p>
              ) : (
                <div className="space-y-2">
                  {potentialMatches.map((match) => (
                    <div key={match.item.id || match.item._id} className="flex items-center justify-between gap-3 rounded-xl border border-borderWarm bg-cream-surface p-3 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {match.item.imageUrl && <img src={match.item.imageUrl} alt={match.item.title} className="h-12 w-12 rounded-lg object-cover border border-borderWarm flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{match.item.title}</p>
                          <p className="text-[11px] text-ink-muted truncate">{match.item.category} · {match.item.location}</p>
                          <p className="text-[10px] text-forest font-medium truncate mt-0.5">{match.score}% · {match.reasons?.slice(0, 2).join(" · ")}</p>
                        </div>
                      </div>
                      <Link to={`/item/${match.item.id || match.item._id}`} className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors">
                        <span>Compare</span><ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reporter Card */}
          <div className="flex items-center justify-between rounded-2xl border border-borderWarm bg-cream-surface p-4 shadow-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-cream-surface font-semibold text-sm">
                {reporterName?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs text-ink-muted">Reported by</p>
                <p className="text-sm font-semibold text-ink">{reporterName}</p>
                <p className="text-[11px] text-sage font-medium">Verified Campus Member</p>
              </div>
            </div>

            {item.contactPreference && (
              <span className="text-xs text-ink-muted bg-cream-dark px-2.5 py-1 rounded-lg">
                Prefers {item.contactPreference}
              </span>
            )}
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-card"
            >
              <MessageCircle className="h-4 w-4" />
              <span>
                {isChatOpen
                  ? "Hide Discussion"
                  : isOwner
                  ? "View Chat Inquiries"
                  : "Contact Reporter"}
              </span>
              {messageCount > 0 && (
                <span className="ml-1 rounded-full bg-cream-surface text-forest px-2 py-0.2 text-xs font-bold">
                  {messageCount}
                </span>
              )}
            </button>

            {isOwner && !item.resolved && (
              <button
                type="button"
                onClick={handleResolveItem}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-forest bg-sage-subtle px-4 py-3 text-sm font-medium text-forest hover:bg-sage transition-colors shadow-subtle"
              >
                <CheckCircle2 className="h-4 w-4 text-foundGreen" />
                <span>Mark as Resolved</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Discussion Chat Thread */}
      {isChatOpen && (
        <div className="pt-2">
          <ChatBox
            itemId={item._id || item.id}
            ownerUsername={reporterName}
            itemTitle={item.title}
            isOwner={isOwner}
            onMessagesChange={setMessageCount}
          />
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-borderWarm bg-cream-surface p-6 shadow-modal space-y-4">
            <div className="flex items-center justify-between border-b border-borderWarm/80 pb-3">
              <div className="flex items-center gap-2 text-lostCoral font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Report Campus Listing</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-full p-1 text-ink-muted hover:text-ink hover:bg-cream-dark transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Help keep KIET Lost & Found reliable and safe for everyone. Flag inappropriate listings, spam, or scams.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Reason for Report
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-borderWarm bg-cream/40 px-3.5 py-2.5 text-xs text-ink font-medium outline-none transition focus:border-forest focus:bg-cream-surface"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Explanation / Evidence (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide any additional details or context for campus moderators..."
                  className="w-full rounded-xl border border-borderWarm bg-cream/40 p-3 text-xs text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:bg-cream-surface"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderWarm/60">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-xl border border-borderWarm bg-cream-surface px-4 py-2 text-xs font-medium text-ink hover:bg-cream-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-lostCoral px-4 py-2 text-xs font-semibold text-cream-surface hover:bg-lostCoral-hover transition-colors shadow-subtle disabled:opacity-50"
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discovery Loop: Similar Reports */}
      {similarItems.length > 0 && (
        <section className="border-t border-borderWarm pt-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage">
                <CornerDownRight className="h-3.5 w-3.5 text-forest" />
                Discovery Loop
              </div>
              <h2 className="font-serif text-2xl font-medium text-ink mt-1">
                You might also recognize these
              </h2>
              <p className="text-xs text-ink-muted">
                Similar reports in <span className="font-medium text-forest">{item.category || "this category"}</span> across campus.
              </p>
            </div>

            <Link
              to="/"
              className="text-xs font-semibold text-forest hover:underline"
            >
              Explore all reports →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similarItems.map((similar) => (
              <ItemCard key={similar.id} item={similar} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
