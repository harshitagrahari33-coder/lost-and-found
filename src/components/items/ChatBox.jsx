import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Inbox,
  Loader2,
  MessageCircleMore,
  Paperclip,
  Send,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { chatService } from "@/services/chatService";

export default function ChatBox({
  itemId,
  ownerUsername,
  itemTitle,
  isOwner = false,
  conversationId = null,
  onMessagesChange,
}) {
  const { currentUser, isAuthenticated } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [conversationsList, setConversationsList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserIdStr = (currentUser?._id || currentUser?.id)?.toString();

  // Initialize or fetch conversation
  const initConversation = useCallback(async () => {
    if (!isAuthenticated || !itemId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Connect socket if not connected
      const socket = chatService.connectSocket();
      if (socket) {
        setSocketConnected(socket.connected);
        socket.on("connect", () => setSocketConnected(true));
        socket.on("disconnect", () => setSocketConnected(false));
      }

      // Check all user conversations
      const allConversations = await chatService.getConversations();
      const itemConversations = (allConversations || []).filter(
        (c) => (c.itemId?._id || c.itemId) === itemId
      );

      setConversationsList(itemConversations);

      let targetConv = null;
      if (conversationId) {
        targetConv =
          itemConversations.find((c) => c._id === conversationId) ||
          (await chatService.getConversation(conversationId).catch(() => null));
      } else if (itemConversations.length > 0) {
        targetConv = itemConversations[0];
      } else if (!isOwner) {
        // Only non-owners (inquirers) should auto-create a conversation with the reporter
        try {
          targetConv = await chatService.createConversation(itemId);
          if (targetConv) {
            setConversationsList([targetConv]);
          }
        } catch (createErr) {
          console.warn("Conversation thread not pre-created:", createErr?.message);
        }
      }

      setConversation(targetConv);

      if (targetConv?._id) {
        const initialMsgs = await chatService.getMessages(targetConv._id);
        setMessages(initialMsgs || []);
        onMessagesChange?.(initialMsgs?.length || 0);

        chatService.joinConversation(targetConv._id);
        chatService.emitMessageRead(targetConv._id);
      } else {
        setMessages([]);
        onMessagesChange?.(0);
      }
    } catch (err) {
      console.error("Failed to initialize conversation:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, itemId, isOwner, conversationId, onMessagesChange]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Handle conversation change for reporters with multiple inquiries
  async function selectConversation(conv) {
    setConversation(conv);
    try {
      const msgs = await chatService.getMessages(conv._id);
      setMessages(msgs || []);
      onMessagesChange?.(msgs?.length || 0);
      chatService.joinConversation(conv._id);
      chatService.emitMessageRead(conv._id);
    } catch (err) {
      console.error("Failed to load messages for conversation:", err);
    }
  }

  // Socket event listeners
  useEffect(() => {
    if (!conversation?._id) return;
    const socket = chatService.getSocket();
    if (!socket) return;

    const handleReceiveMessage = (payload) => {
      const newMsg = payload.message || payload;
      if (newMsg.conversationId === conversation._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          const updated = [...prev, newMsg];
          onMessagesChange?.(updated.length);
          return updated;
        });

        // Mark read if from other participant
        const senderIdStr = (newMsg.senderId?._id || newMsg.senderId)?.toString();
        if (senderIdStr !== currentUserIdStr) {
          chatService.emitMessageRead(conversation._id);
        }
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversation._id) {
        const senderIdStr = data.userId?.toString();
        if (senderIdStr !== currentUserIdStr) {
          setTypingUser(data.userName || "Campus Member");
        }
      }
    };

    const handleStopTyping = (data) => {
      if (data.conversationId === conversation._id) {
        setTypingUser(null);
      }
    };

    const handleMessageRead = (data) => {
      if (data.conversationId === conversation._id) {
        setMessages((prev) =>
          prev.map((m) => {
            const mSenderStr = (m.senderId?._id || m.senderId)?.toString();
            if (mSenderStr === currentUserIdStr) {
              return { ...m, isRead: true };
            }
            return m;
          })
        );
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messageRead", handleMessageRead);

    // Fallback polling every 5s if socket is disconnected
    const pollInterval = setInterval(async () => {
      if (!socket.connected && conversation?._id) {
        try {
          const latest = await chatService.getMessages(conversation._id);
          if (latest && latest.length > 0) {
            setMessages(latest);
            onMessagesChange?.(latest.length);
          }
        } catch {
          // ignore poll error
        }
      }
    }, 5000);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messageRead", handleMessageRead);
      clearInterval(pollInterval);
    };
  }, [conversation?._id, currentUserIdStr, onMessagesChange]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Handle text typing with debounced typing emitter
  function handleTextChange(e) {
    const val = e.target.value;
    setDraft(val);

    if (!conversation?._id) return;

    chatService.emitTyping(conversation._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      chatService.emitStopTyping(conversation._id);
    }, 1500);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image attachments (JPEG, PNG, WebP) are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Attachment size must be under 5MB.");
      return;
    }

    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleClearAttachment() {
    setAttachmentFile(null);
    setAttachmentPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please sign in with your @kiet.edu email to chat.");
      return;
    }

    const text = draft.trim();
    if (!text && !attachmentFile) return;

    let activeConv = conversation;

    // If conversation not yet initialized, handle appropriately
    if (!activeConv?._id) {
      if (isOwner) {
        toast.info("No active student inquiry selected to reply to.");
        return;
      }

      // Inquirer attempting first message: create the conversation on-demand
      try {
        setIsSending(true);
        activeConv = await chatService.createConversation(itemId);
        if (activeConv?._id) {
          setConversation(activeConv);
          setConversationsList((prev) => [activeConv, ...prev]);
          chatService.joinConversation(activeConv._id);
        } else {
          toast.error("Unable to start chat thread with reporter.");
          setIsSending(false);
          return;
        }
      } catch (createErr) {
        setIsSending(false);
        const msg = createErr.response?.data?.message || createErr.message;
        if (msg?.includes("yourself")) {
          toast.info("You are the reporter of this listing. Incoming inquiries will appear here.");
        } else {
          toast.error(msg || "Failed to start chat thread.");
        }
        return;
      }
    }

    setIsSending(true);

    try {
      let attachments = [];
      if (attachmentFile) {
        const uploadRes = await chatService.uploadAttachment(activeConv._id, attachmentFile);
        if (uploadRes?.url) {
          attachments.push({
            url: uploadRes.url,
            publicId: uploadRes.publicId || "",
          });
        }
      }

      // Send via Socket.IO with fallback to REST API
      const socket = chatService.getSocket();
      if (socket && socket.connected) {
        chatService.sendSocketMessage(activeConv._id, text, attachments, (res) => {
          if (!res?.success) {
            chatService.sendMessage(activeConv._id, text, attachments);
          }
        });
      } else {
        const saved = await chatService.sendMessage(activeConv._id, text, attachments);
        setMessages((prev) => [...prev, saved]);
        onMessagesChange?.(messages.length + 1);
      }

      setDraft("");
      handleClearAttachment();
      chatService.emitStopTyping(activeConv._id);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-3xl border border-borderWarm bg-cream-surface p-6 shadow-card text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-dark text-sage">
          <MessageCircleMore className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-xl font-medium text-ink">
          Sign in to message about \"${itemTitle}\"
        </h3>
        <p className="max-w-md mx-auto text-xs text-ink-muted leading-relaxed">
          KIET Lost & Found uses authenticated student communication. Sign in with your campus @kiet.edu email to contact reporter <span className="font-semibold text-forest">{ownerUsername || "Campus Reporter"}</span>.
        </p>
      </section>
    );
  }

  const activeOtherParticipant = conversation?.participants?.find(
    (p) => (p._id || p)?.toString() !== currentUserIdStr
  );
  const activeOtherName =
    activeOtherParticipant?.name || (isOwner ? "Student" : (ownerUsername || "Campus Reporter"));

  return (
    <section className="rounded-3xl border border-borderWarm bg-cream-surface p-6 shadow-card transition-all space-y-4">
      {/* Thread Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderWarm/70 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sage">
            <MessageCircleMore className="h-4 w-4 text-forest" />
            {isOwner ? "Campus Inquiry Hub" : "Direct Campus Inquiry"}
            {socketConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foundGreen-surface px-2 py-0.5 text-[10px] font-semibold text-foundGreen">
                <span className="h-1.5 w-1.5 rounded-full bg-foundGreen animate-pulse" />
                Live Socket
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2 py-0.5 text-[10px] font-medium text-ink-light">
                REST Mode
              </span>
            )}
          </div>
          <h3 className="mt-1 text-xl font-semibold text-ink">
            {isOwner ? `Student Inquiries regarding "${itemTitle}"` : `Messages regarding "${itemTitle}"`}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {isOwner ? (
              conversation ? (
                <>
                  Direct inquiry thread with student <span className="font-semibold text-forest">{activeOtherName}</span>.
                </>
              ) : (
                "Incoming inquiries from campus members will appear here."
              )
            ) : (
              <>
                Direct thread with reporter <span className="font-semibold text-forest">{ownerUsername || "Campus Reporter"}</span>.
              </>
            )}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-cream-dark px-3 py-1.5 text-xs text-ink-muted">
          <User className="h-3.5 w-3.5 text-sage" />
          <span>
            Logged in as <strong className="text-ink">{currentUser?.username || currentUser?.name || "Campus Member"}</strong>
            {isOwner && <span className="ml-1.5 rounded-md bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest">Reporter</span>}
          </span>
        </div>
      </div>

      {/* Multiple Inquiries Switcher (if reporter has multiple inquiry threads) */}
      {conversationsList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-ink-muted font-medium flex-shrink-0">Student threads:</span>
          {conversationsList.map((c, idx) => {
            const isActive = c._id === conversation?._id;
            const otherParticipant = c.participants?.find(
              (p) => (p._id || p)?.toString() !== currentUserIdStr
            );
            const otherName = otherParticipant?.name || `Student ${idx + 1}`;

            return (
              <button
                key={c._id}
                type="button"
                onClick={() => selectConversation(c)}
                className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors flex-shrink-0 ${
                  isActive
                    ? "bg-forest text-cream-surface shadow-subtle"
                    : "border border-borderWarm bg-cream-surface text-ink hover:bg-cream-dark"
                }`}
              >
                {otherName}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="rounded-2xl border border-borderWarm bg-cream/50 p-4">
        <div className="max-h-80 min-h-52 space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex min-h-44 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-sage" />
            </div>
          ) : isOwner && conversationsList.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-borderWarm bg-cream-surface/60 p-6 text-center space-y-2.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-subtle text-forest">
                <Inbox className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-ink">No inquiries received yet</h4>
              <p className="max-w-md text-xs text-ink-muted leading-relaxed">
                You are the reporter of this listing. When classmates or campus members reach out regarding this item, their inquiry threads will appear here for you to coordinate.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 px-3 py-1 text-[11px] font-medium text-forest">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest" />
                  Your listing is live & discoverable on campus
                </span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-borderWarm bg-cream-surface/60 p-6 text-center">
              <MessageCircleMore className="h-8 w-8 text-sage" />
              <h4 className="mt-2 text-sm font-semibold text-ink">No messages yet</h4>
              <p className="mt-1 max-w-sm text-xs text-ink-muted">
                Coordinate safe pickup, verify unique item marks, or arrange to meet at campus security.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const senderIdStr = (message.senderId?._id || message.senderId)?.toString();
              const isCurrentUser = senderIdStr === currentUserIdStr;
              const senderName = message.senderId?.name || (isCurrentUser ? "You" : activeOtherName);

              return (
                <div
                  key={message._id || `${message.createdAt}-${index}`}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-subtle ${
                      isCurrentUser
                        ? "bg-forest text-cream-surface rounded-br-none"
                        : "bg-cream-surface border border-borderWarm text-ink rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] pb-1 opacity-80">
                      <span className="font-semibold uppercase tracking-wider">
                        {isCurrentUser ? "You" : senderName}
                      </span>
                      <span>
                        {message.createdAt
                          ? format(new Date(message.createdAt), "p")
                          : "Just now"}
                      </span>
                    </div>

                    {/* Image Attachment Preview */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-1 mb-2 space-y-1">
                        {message.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-xl border border-borderWarm max-w-[240px]"
                          >
                            <img
                              src={att.url}
                              alt="Chat attachment"
                              className="h-auto max-h-48 w-full object-cover hover:scale-105 transition-transform"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {message.text && (
                      <p className="leading-relaxed break-words text-sm">{message.text}</p>
                    )}

                    {/* Read receipt tick */}
                    {isCurrentUser && (
                      <div className="flex justify-end pt-1 opacity-75">
                        {message.isRead ? (
                          <CheckCheck className="h-3 w-3 text-sage-subtle" title="Read" />
                        ) : (
                          <Check className="h-3 w-3 text-cream-surface/60" title="Delivered" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {typingUser && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-borderWarm bg-cream-surface px-4 py-2 text-xs text-ink-muted shadow-subtle flex items-center gap-2">
                <span className="font-medium text-forest">{typingUser}</span> is typing
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-forest animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attachment Preview Chip */}
      {attachmentPreview && (
        <div className="relative inline-flex items-center gap-2 rounded-xl border border-borderWarm bg-cream-dark p-2 text-xs">
          <img
            src={attachmentPreview}
            alt="Preview"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div className="truncate max-w-[200px]">
            <span className="font-medium text-ink">{attachmentFile?.name}</span>
          </div>
          <button
            type="button"
            onClick={handleClearAttachment}
            className="rounded-full bg-ink/20 p-1 text-ink hover:bg-ink/30"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Reply Input Form or Owner Empty Notice */}
      {isOwner && conversationsList.length === 0 ? (
        <div className="rounded-2xl border border-borderWarm bg-cream-dark/50 p-3.5 text-center text-xs text-ink-muted">
          <span>Replies will be enabled here once a campus member initiates an inquiry on this report.</span>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach photo"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-borderWarm bg-cream-surface text-ink-muted hover:text-forest hover:border-sage transition-colors shadow-subtle flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={draft}
            onChange={handleTextChange}
            placeholder={
              isOwner
                ? `Reply to ${activeOtherName}...`
                : `Write a message to ${ownerUsername || "reporter"}...`
            }
            className="flex-1 rounded-xl border border-borderWarm bg-cream-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:ring-1 focus:ring-forest shadow-subtle"
          />

          <button
            type="submit"
            disabled={isSending || (!draft.trim() && !attachmentFile)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-subtle disabled:opacity-50 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
