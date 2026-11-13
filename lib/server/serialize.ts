import type { ConversationDoc, MessageDoc } from "./db";

export const toConversation = (c: ConversationDoc) => ({
  id: c._id.toHexString(),
  title: c.title,
  pinned: c.pinned,
  lang: c.lang,
  createdAt: c.createdAt.getTime(),
  updatedAt: c.updatedAt.getTime(),
  messageCount: c.messageCount,
});

export const toMessage = (m: MessageDoc) => ({
  id: m._id.toHexString(),
  role: m.role,
  content: m.content,
  sources: m.sources ?? [],
  suggestions: m.suggestions ?? [],
  feedback: m.feedback ?? null,
  createdAt: m.createdAt.getTime(),
});
