import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCircle2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { chatService } from "@/services/chatService";

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-welcome",
    type: "info",
    title: "Welcome to KIET Recovery",
    message: "Verified institutional campus lost & found network is active.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    link: "/",
  },
  {
    id: "notif-tip",
    type: "match",
    title: "Campus Safety Tip",
    message: "Always meet during daytime at recognized campus landmarks like Central Library.",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    read: true,
    link: "/",
  },
];

export default function NotificationDropdown() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Socket.IO real-time notification listener
  useEffect(() => {
    if (!currentUser) return;

    const socket = chatService.getSocket();
    if (!socket) return;

    const handleConversationUpdated = (data) => {
      const newNotif = {
        id: `notif-${Date.now()}`,
        type: "message",
        title: "New Campus Message",
        message: data.lastMessage || "Someone inquired about your campus listing.",
        createdAt: new Date().toISOString(),
        read: false,
        link: `/profile?tab=messages`,
      };

      setNotifications((prev) => [newNotif, ...prev]);
    };

    socket.on("conversationUpdated", handleConversationUpdated);

    return () => {
      socket.off("conversationUpdated", handleConversationUpdated);
    };
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4 text-forest" />;
      case "match":
        return <Sparkles className="h-4 w-4 text-accentGold" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-foundGreen" />;
      default:
        return <Bell className="h-4 w-4 text-sage" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-8 w-8 rounded-xl border border-borderWarm bg-cream-surface text-ink-muted hover:text-ink hover:border-sage transition-all shadow-subtle"
        aria-label="Notifications"
        title="Campus Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lostCoral px-1 text-[9px] font-bold text-cream-surface shadow-xs animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-borderWarm bg-cream-surface shadow-card z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3.5 border-b border-borderWarm flex items-center justify-between bg-cream/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">Campus Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-sage-subtle px-1.5 py-0.2 text-[10px] font-semibold text-forest">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-forest hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-borderWarm-light">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    notif.read ? "hover:bg-cream/40" : "bg-sage-subtle/40 hover:bg-sage-subtle/70"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cream-surface border border-borderWarm flex-shrink-0 mt-0.5 shadow-subtle">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${notif.read ? "text-ink" : "text-forest"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-ink-light flex-shrink-0">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-borderWarm bg-cream/30 text-center">
            <Link
              to="/profile?tab=messages"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-forest hover:underline"
            >
              Open Messages & Discussions →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
