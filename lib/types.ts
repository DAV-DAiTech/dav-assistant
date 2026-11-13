import type { ObjectId } from "mongodb";

export type MessageRole = "user" | "assistant";

export interface ConversationDocument {
  _id: ObjectId;
  visitorId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  fptSessionId?: string;
  fptVisitorToken?: string;
  fptExpiresAt?: Date;
}

export interface MessageDocument {
  _id: ObjectId;
  conversationId: ObjectId;
  visitorId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  upstreamMessageId?: string;
}

export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
