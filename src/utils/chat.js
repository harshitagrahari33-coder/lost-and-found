import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage";

function normalizeMessage(message) {
  return {
    user: message.user || "Anonymous",
    text: message.text || "",
    time: message.time || new Date().toISOString(),
  };
}

export function getChatThreads() {
  const threads = readStorage(STORAGE_KEYS.chats, {});

  if (!threads || typeof threads !== "object" || Array.isArray(threads)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(threads).map(([itemId, messages]) => [
      itemId,
      Array.isArray(messages) ? messages.map(normalizeMessage) : [],
    ]),
  );
}

export function getItemMessages(itemId) {
  if (!itemId) {
    return [];
  }

  const threads = getChatThreads();
  return Array.isArray(threads[itemId]) ? threads[itemId] : [];
}

export function saveItemMessages(itemId, messages) {
  if (!itemId) {
    return [];
  }

  const threads = getChatThreads();
  const nextMessages = messages.map(normalizeMessage);
  const nextThreads = {
    ...threads,
    [itemId]: nextMessages,
  };

  writeStorage(STORAGE_KEYS.chats, nextThreads);
  return nextMessages;
}

export function addItemMessage(itemId, message) {
  const existingMessages = getItemMessages(itemId);
  const nextMessage = normalizeMessage(message);
  return saveItemMessages(itemId, [...existingMessages, nextMessage]);
}
