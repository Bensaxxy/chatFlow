const DRAFT_KEY_PREFIX = "chatflow:draft";
const DRAFT_UPDATED_EVENT = "chatflow:draft-updated";

interface DraftUpdatedDetail {
  userId: string;
  conversationId: string;
  text: string;
}

const createDraftKey = (userId: string, conversationId: string): string =>
  `${DRAFT_KEY_PREFIX}:${userId}:${conversationId}`;

const createUserDraftPrefix = (userId: string): string =>
  `${DRAFT_KEY_PREFIX}:${userId}:`;

export const getConversationDraft = (
  userId: string,
  conversationId: string,
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(createDraftKey(userId, conversationId)) ?? ""
  );
};

export const getAllConversationDrafts = (
  userId: string,
): Map<string, string> => {
  const drafts = new Map<string, string>();

  if (typeof window === "undefined") {
    return drafts;
  }

  const userPrefix = createUserDraftPrefix(userId);

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key?.startsWith(userPrefix)) {
      continue;
    }

    const conversationId = key.slice(userPrefix.length);
    const text = window.localStorage.getItem(key) ?? "";

    if (conversationId && text.trim()) {
      drafts.set(conversationId, text);
    }
  }

  return drafts;
};

export const saveConversationDraft = (
  userId: string,
  conversationId: string,
  text: string,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = createDraftKey(userId, conversationId);

  if (text.length === 0) {
    window.localStorage.removeItem(storageKey);
  } else {
    window.localStorage.setItem(storageKey, text);
  }

  window.dispatchEvent(
    new CustomEvent<DraftUpdatedDetail>(DRAFT_UPDATED_EVENT, {
      detail: {
        userId,
        conversationId,
        text,
      },
    }),
  );
};

export const clearConversationDraft = (
  userId: string,
  conversationId: string,
): void => {
  saveConversationDraft(userId, conversationId, "");
};

export const subscribeToConversationDrafts = (
  userId: string,
  listener: (conversationId: string, text: string) => void,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const userPrefix = createUserDraftPrefix(userId);

  const handleDraftUpdated = (event: Event): void => {
    const customEvent = event as CustomEvent<DraftUpdatedDetail>;
    const detail = customEvent.detail;

    if (!detail || detail.userId !== userId) {
      return;
    }

    listener(detail.conversationId, detail.text);
  };

  const handleStorage = (event: StorageEvent): void => {
    if (!event.key?.startsWith(userPrefix)) {
      return;
    }

    const conversationId = event.key.slice(userPrefix.length);

    if (!conversationId) {
      return;
    }

    listener(conversationId, event.newValue ?? "");
  };

  window.addEventListener(DRAFT_UPDATED_EVENT, handleDraftUpdated);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DRAFT_UPDATED_EVENT, handleDraftUpdated);

    window.removeEventListener("storage", handleStorage);
  };
};
