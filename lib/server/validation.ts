import { z } from "zod";
import { ApiError } from "./http";

export const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i).transform((s) => s.toLowerCase());
export const langSchema = z.enum(["vi", "en"]);

export const chatBody = z.object({
  conversationId: objectIdString.optional(),
  message: z.string().trim().min(1).max(2000),
  lang: langSchema.default("vi"),
  regenerate: z.boolean().optional().default(false),
});

export const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const cursorSchema = z.object({
  p: z.boolean(),
  u: z.number().int().nonnegative(),
  i: objectIdString,
});

export const patchBody = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.pinned !== undefined);

export const feedbackBody = z.object({
  messageId: objectIdString,
  value: z.enum(["up", "down"]).nullable(),
});

const MAX_BODY_BYTES = 16_384;

export async function readJson(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new ApiError("invalid_input", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError("invalid_input", 400);
  }
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
