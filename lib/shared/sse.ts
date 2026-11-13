export interface SseEvent {
  event?: string;
  data: string;
}

function parseEvent(raw: string): SseEvent | null {
  const data: string[] = [];
  let event: string | undefined;
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") event = value;
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

/**
 * Parses a Server-Sent Events byte stream. CRLF and CR line endings are
 * normalized even when a "\r\n" pair is split across two network chunks.
 */
export async function* parseSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let carry = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      let chunk = carry + decoder.decode(value, { stream: true });
      carry = "";
      if (chunk.endsWith("\r")) {
        carry = "\r";
        chunk = chunk.slice(0, -1);
      }
      buffer += chunk.replace(/\r\n?/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) yield event;
      }
    }
    buffer += (carry + decoder.decode()).replace(/\r\n?/g, "\n");
    const last = parseEvent(buffer.trim());
    if (last) yield last;
  } finally {
    reader.cancel().catch(() => {});
  }
}

export function sseFrame(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
