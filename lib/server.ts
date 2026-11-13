import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ConversationDocument, ConversationDto, MessageDocument, MessageDto } from "@/lib/types";

const VISITOR_COOKIE = "dav_visitor";

export async function getVisitorId() {
  const store = await cookies();
  let visitorId = store.get(VISITOR_COOKIE)?.value;

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    store.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return visitorId;
}

export function asConversation(document: ConversationDocument): ConversationDto {
  return {
    id: document._id.toHexString(),
    title: document.title,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function asMessage(document: MessageDocument): MessageDto {
  return {
    id: document._id.toHexString(),
    conversationId: document.conversationId.toHexString(),
    role: document.role,
    content: document.content,
    createdAt: document.createdAt.toISOString(),
  };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
