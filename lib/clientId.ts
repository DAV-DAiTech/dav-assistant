const KEY = "dav.clientId.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memory: string | null = null;

export function getClientId(): string {
  if (memory) return memory;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && UUID.test(stored)) return (memory = stored);
    memory = crypto.randomUUID();
    localStorage.setItem(KEY, memory);
  } catch {
    memory ??= crypto.randomUUID();
  }
  return memory;
}

/** Generates a MongoDB-compatible ObjectId so new conversations have a stable id before the server responds. */
export function newObjectId(): string {
  const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return time + random;
}

export const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);
