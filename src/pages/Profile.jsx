import { useMemo, useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Loader2,
  MessageSquare,
  PlusCircle,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import ItemCard from "@/components/items/ItemCard";
import ChatBox from "@/components/items/ChatBox";
import { useAuth } from "@/lib/AuthContext";
import { useItems } from "@/lib/ItemsContext";
import { chatService } from "@/services/chatService";

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, updateUsername } = useAuth();
  const { items, savedIds } = useItems();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  // Conversations & Chat state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Read tab from query param or default to "reports"
  const activeTab = searchParams.get("tab") || "reports";

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (currentUser?.username) {
      setUsername(currentUser.username);
    }
  }, [currentUser?.username]);

  // Load user conversations
  useEffect(() => {
    let mounted = true;
    async function loadConversations() {
      if (!currentUser) return;
      setIsLoadingConversations(true);
      try {
        const list = await chatService.getConversations();
        if (mounted && list) {
          setConversations(list);
          if (list.length > 0 && !activeConvId) {
            setActiveConvId(list[0]._id);
          }
        }
      } catch (err) {
        console.warn("Could not load conversations:", err.message);
      } finally {
        if (mounted) setIsLoadingConversations(false);
      }
    }

    loadConversations();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // User's own reported items
  const myReports = useMemo(
    () =>
      items.filter(
        (item) =>
          item.user === currentUser?.username ||
          (item.reporterId?._id || item.reporterId) === currentUser?._id
      ),
    [currentUser, items]
  );

  // User's saved/bookmarked items
  const savedItems = useMemo(
    () => items.filter((item) => savedIds.includes(item.id) || savedIds.includes(item._id)),
    [items, savedIds]
  );

  // Resolved items by this user or overall
  const resolvedReports = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.user === currentUser?.username ||
            (item.reporterId?._id || item.reporterId) === currentUser?._id) &&
          item.resolved
      ),
    [currentUser, items]
  );

  function handleSaveUsername(e) {
    e.preventDefault();
    if (!updateUsername(username)) {
      toast.error("Please enter a valid username");
      return;
    }
    toast.success("Profile username updated");
    setIsEditingUsername(false);
  }

  // Selected conversation object
  const currentConversation = conversations.find((c) => c._id === activeConvId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Community-Oriented Profile Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-borderWarm bg-cream-surface p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Big friendly avatar */}
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-forest text-cream-surface font-serif text-2xl sm:text-3xl font-medium shadow-card flex-shrink-0">
              {currentUser?.username?.[0]?.toUpperCase() || <User className="h-8 w-8" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink">
                  {currentUser?.username}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-subtle px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                  <Sparkles className="h-3 w-3 text-accentGold" />
                  Student · KIET
                </span>
              </div>

              <p className="italic text-sm text-forest font-serif">
                “Building a kinder campus, one return at a time.”
              </p>

              <p className="text-xs text-ink-muted">
                Member since {format(new Date(currentUser?.joinedAt || Date.now()), "MMMM yyyy")}
              </p>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-borderWarm pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-around sm:justify-start">
            <div className="text-center">
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink">
                {myReports.length}
              </p>
              <p className="text-[11px] text-ink-muted">Reports</p>
            </div>

            <div className="text-center">
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink">
                {savedItems.length}
              </p>
              <p className="text-[11px] text-ink-muted">Saved</p>
            </div>

            <div className="text-center">
              <p className="font-serif text-xl sm:text-2xl font-medium text-forest">
                {conversations.length}
              </p>
              <p className="text-[11px] text-ink-muted">Inquiries</p>
            </div>

            <div className="text-center">
              <p className="font-serif text-xl sm:text-2xl font-medium text-forest">
                {resolvedReports.length}
              </p>
              <p className="text-[11px] text-ink-muted">Resolved</p>
            </div>
          </div>
        </div>

        {/* Username Edit Drawer / Form */}
        <div className="mt-6 pt-4 border-t border-borderWarm-light flex items-center justify-between text-xs">
          {isEditingUsername ? (
            <form onSubmit={handleSaveUsername} className="flex items-center gap-2 w-full max-w-sm">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter display name"
                className="h-8 rounded-lg border border-borderWarm bg-cream px-2.5 text-xs text-ink outline-none focus:border-forest"
              />
              <button
                type="submit"
                className="rounded-lg bg-forest px-3 py-1.5 text-cream-surface font-medium hover:bg-forest-hover"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingUsername(false)}
                className="text-ink-muted hover:text-ink px-2"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingUsername(true)}
              className="text-ink-muted hover:text-forest transition-colors underline underline-offset-2"
            >
              Edit display name
            </button>
          )}

          <Link
            to="/add"
            className="inline-flex items-center gap-1 text-forest font-semibold hover:underline"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Create new report</span>
          </Link>
        </div>
      </section>

      {/* Tabs: My Reports, Saved Items, Messages & Inquiries, Resolved */}
      <div className="space-y-6">
        <div className="flex border-b border-borderWarm gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "reports"
                ? "text-forest font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>My Reports</span>
            <span className="rounded-full bg-cream-dark px-2 py-0.2 text-[10px]">
              {myReports.length}
            </span>
            {activeTab === "reports" && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("messages")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "messages"
                ? "text-forest font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Messages & Inquiries</span>
            {conversations.length > 0 && (
              <span className="rounded-full bg-forest text-cream-surface px-2 py-0.2 text-[10px] font-semibold">
                {conversations.length}
              </span>
            )}
            {activeTab === "messages" && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("saved")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "saved"
                ? "text-forest font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved Items</span>
            <span className="rounded-full bg-cream-dark px-2 py-0.2 text-[10px]">
              {savedItems.length}
            </span>
            {activeTab === "saved" && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("resolved")}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "resolved"
                ? "text-forest font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Resolved Reunions</span>
            <span className="rounded-full bg-cream-dark px-2 py-0.2 text-[10px]">
              {resolvedReports.length}
            </span>
            {activeTab === "resolved" && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-forest rounded-full" />
            )}
          </button>
        </div>

        {/* TAB 1: My Reports */}
        {activeTab === "reports" && (
          <div>
            {myReports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
                <FileText className="h-10 w-10 text-sage mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-ink">No reports published yet</h3>
                <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                  Have you misplaced something or found an item on campus? Publishing a report takes less than a minute.
                </p>
                <Link
                  to="/add"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Report an item
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {myReports.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Messages & Inquiries Hub */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            {isLoadingConversations ? (
              <div className="py-12 flex flex-col items-center justify-center text-ink-muted gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-forest" />
                <p className="text-xs">Loading campus conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
                <MessageSquare className="h-10 w-10 text-sage mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-ink">No active conversations</h3>
                <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                  When you inquire about a lost item or when a student messages you regarding an item you posted, your discussions will appear here.
                </p>
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
                >
                  Browse campus listings
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Conversations Inbox List */}
                <div className="lg:col-span-4 rounded-2xl border border-borderWarm bg-cream-surface overflow-hidden shadow-subtle divide-y divide-borderWarm-light">
                  <div className="p-3.5 bg-cream-dark/50 border-b border-borderWarm flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Active Inquiries ({conversations.length})
                    </span>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto divide-y divide-borderWarm-light">
                    {conversations.map((conv) => {
                      const otherParticipant =
                        conv.participants?.find((p) => (p._id || p) !== currentUser?._id) ||
                        conv.participants?.[0];
                      const otherName =
                        otherParticipant?.name ||
                        otherParticipant?.collegeId ||
                        "Campus Member";
                      const itemTitle = conv.itemId?.title || "Campus Listing";
                      const isSelected = conv._id === activeConvId;
                      const timeString = conv.updatedAt
                        ? formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })
                        : "";

                      return (
                        <button
                          key={conv._id}
                          type="button"
                          onClick={() => setActiveConvId(conv._id)}
                          className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                            isSelected
                              ? "bg-sage-subtle/80 border-l-4 border-forest"
                              : "hover:bg-cream/50"
                          }`}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-cream-surface text-xs font-bold flex-shrink-0">
                            {otherName[0]?.toUpperCase() || <User className="h-4 w-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-ink truncate">
                                {otherName}
                              </span>
                              <span className="text-[10px] text-ink-light flex-shrink-0">
                                {timeString}
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-forest truncate mt-0.5">
                              {itemTitle}
                            </p>

                            <p className="text-[11px] text-ink-muted truncate mt-0.5">
                              {conv.lastMessage || "No messages yet"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Active Chat View */}
                <div className="lg:col-span-8">
                  {currentConversation ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-2xl border border-borderWarm bg-cream-surface p-3 shadow-subtle">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-semibold text-ink">
                            Regarding: {currentConversation.itemId?.title || "Campus Item"}
                          </span>
                        </div>
                        {currentConversation.itemId?._id && (
                          <Link
                            to={`/item/${currentConversation.itemId._id}`}
                            className="text-xs font-semibold text-forest hover:underline"
                          >
                            View item post →
                          </Link>
                        )}
                      </div>

                      <ChatBox
                        key={currentConversation._id}
                        conversationId={currentConversation._id}
                        itemId={currentConversation.itemId?._id || currentConversation.itemId}
                        itemTitle={currentConversation.itemId?.title || "Campus Listing"}
                        ownerUsername={
                          currentConversation.participants?.find(
                            (p) => (p._id || p)?.toString() !== (currentUser?._id || currentUser?.id)?.toString()
                          )?.name || "Campus Member"
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-borderWarm bg-cream-surface p-12 text-center text-ink-muted text-xs">
                      Select a conversation on the left to start messaging.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Saved Items */}
        {activeTab === "saved" && (
          <div>
            {savedItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
                <Bookmark className="h-10 w-10 text-sage mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-ink">No saved items</h3>
                <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                  Tap the bookmark icon on any item card while browsing to save it here for quick reference.
                </p>
                <Link
                  to="/"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-medium text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle"
                >
                  Browse items
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {savedItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Resolved Reunions */}
        {activeTab === "resolved" && (
          <div>
            {resolvedReports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-borderWarm bg-cream-surface/60 p-12 text-center">
                <HeartHandshake className="h-10 w-10 text-sage mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-ink">No resolved reports yet</h3>
                <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                  When you reunite a lost item with its owner, click "Mark as Resolved" on the item page to record the successful reunion.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resolvedReports.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
