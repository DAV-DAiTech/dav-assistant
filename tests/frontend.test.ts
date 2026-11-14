import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { historyStore, type LocalConversation } from "../lib/frontend/adapters";
import { sendMessage as mockSendMessage } from "../lib/chatbot/mockAdapter";
import { text, headlines, featureDescriptions } from "../lib/frontend/i18n";
import { suggestions } from "../lib/frontend/suggestions";
import { ecosystem } from "../lib/frontend/ecosystem";
import { getContactPosition } from "../lib/frontend/contact-position";

test("both composer layouts share the RGB border without changing send/history wiring", () => {
  const composer = readFileSync(new URL("../components/dav/composer.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../components/dav/workspace.tsx", import.meta.url), "utf8");
  assert.equal((workspace.match(/<Composer\s/g) ?? []).length, 1);
  assert.match(workspace, /docked=\{Boolean\(active\)\}/);
  assert.equal((composer.match(/<RgbBorderComposer\s/g) ?? []).length, 1);
  assert.match(composer, /<ContactPopover language=\{language\}/);
  assert.doesNotMatch(composer, /BorderBeam|details-tooltip/);
  assert.match(composer, /send\(input\.trim\(\)\)/);
  assert.match(composer, /e\.nativeEvent\.isComposing \|\| e\.keyCode === 229/);
});

test("composer internals remain frameless while the outer RGB focus band is retained", () => {
  const css = readFileSync(new URL("../app/composer.css", import.meta.url), "utf8");
  const reset = css.match(/\.composer-shell :is\(\.composer, \.composer-hints, textarea, input\) \{([^}]+)\}/)![1];
  for (const declaration of ["outline: none !important", "box-shadow: none !important", "border: 0 !important", "background: transparent !important"])
    assert.ok(reset.includes(declaration));
  assert.doesNotMatch(css, /\.composer textarea:focus-visible/);
  assert.match(css, /\.rgb-border\[data-focused="true"\] \.rgb-border-core/);
});

test("contact panel has three rows and two independent hotline links", () => {
  const panel = readFileSync(new URL("../components/dav/contact-popover.tsx", import.meta.url), "utf8");
  assert.equal((panel.match(/<ContactRow index=/g) ?? []).length, 2);
  assert.equal((panel.match(/className="contact-row contact-hotline"/g) ?? []).length, 1);
  for (const phone of ["0943482840", "0936018433"])
    assert.equal((panel.match(new RegExp(`href="tel:${phone}"`, "g")) ?? []).length, 1);
  assert.doesNotMatch(panel, /ShieldCheck|Users|personalInformation|t\.privacy|t\.clubFullName|<hr|contact-popover-scroll/);
  for (const language of ["vi", "en"] as const) {
    assert.equal("personalInformation" in text[language], false);
    assert.equal("privacy" in text[language], false);
    assert.ok(text[language].footer.includes(text[language].clubFullName));
  }
});

test("contact panel stays within each viewport and flips near the top", () => {
  for (const width of [360, 768, 1280, 1920]) {
    const panelWidth = width < 480 ? width * .92 : 360;
    for (const left of [12, width / 2, width - 120]) {
      const position = getContactPosition({ left, top: 700, bottom: 732, width: 100 }, panelWidth, 420, width, 900);
      assert.equal(position.side, "top");
      assert.ok(position.left >= 12);
      assert.ok(position.left + panelWidth <= width - 12);
      assert.ok(position.top >= 12);
      assert.ok(position.arrow >= 24 && position.arrow <= panelWidth - 24);
    }
    const flipped = getContactPosition({ left: 40, top: 20, bottom: 52, width: 100 }, panelWidth, 420, width, 900);
    assert.equal(flipped.side, "bottom");
    assert.equal(flipped.top, 64);
  }
});

test("contact panel limits height on short screens", () => {
  const position = getContactPosition({ left: 30, top: 220, bottom: 252, width: 100 }, 331, 420, 360, 400);
  assert.equal(position.maxHeight, 196);
  assert.equal(position.top, 12);
});
import {
  getCenteredScroll,
  getScrollMetrics,
  getTopicIndex,
} from "../lib/frontend/topic-navigation";

test("topic keyboard navigation reaches all ten tabs and wraps at either end", () => {
  let index = 0;
  const visited = new Set([index]);
  for (let step = 0; step < 10; step++) {
    index = getTopicIndex("ArrowRight", index, 10)!;
    visited.add(index);
  }
  assert.equal(visited.size, 10);
  assert.equal(index, 0);
  assert.equal(getTopicIndex("ArrowLeft", 0, 10), 9);
  assert.equal(getTopicIndex("Home", 6, 10), 0);
  assert.equal(getTopicIndex("End", 1, 10), 9);
  assert.equal(getTopicIndex("Tab", 0, 10), null);
  assert.equal(getTopicIndex("ArrowRight", 0, 0), null);
});

test("overflow indicators match the available scroll directions including resize and overscroll", () => {
  assert.deepEqual(getScrollMetrics(0, 400, 1000), {
    left: false,
    right: true,
    progress: 0,
    fraction: 0.4,
  });
  assert.deepEqual(getScrollMetrics(300, 400, 1000), {
    left: true,
    right: true,
    progress: 0.5,
    fraction: 0.4,
  });
  assert.deepEqual(getScrollMetrics(600, 400, 1000), {
    left: true,
    right: false,
    progress: 1,
    fraction: 0.4,
  });
  assert.deepEqual(getScrollMetrics(0, 1000, 1000), {
    left: false,
    right: false,
    progress: 0,
    fraction: 1,
  });
  assert.equal(getScrollMetrics(-20, 400, 1000).progress, 0);
  assert.equal(getScrollMetrics(700, 400, 1000).progress, 1);
  assert.equal(getScrollMetrics(0, 0, 0).fraction, 1);
});

test("tab centering clamps to the scrollable range without a vertical scroll target", () => {
  assert.equal(getCenteredScroll(0, 100, 400, 100, 100, 1000), 0);
  assert.equal(getCenteredScroll(0, 100, 400, 450, 100, 1000), 200);
  assert.equal(getCenteredScroll(600, 100, 400, 400, 100, 1000), 600);
  assert.equal(getCenteredScroll(0, 100, 1000, 100, 100, 600), 0);
});

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});

test("both languages have identical UI keys and three matching headline slots", () => {
  assert.deepEqual(Object.keys(text.vi).sort(), Object.keys(text.en).sort());
  for (const language of ["vi", "en"] as const) {
    assert.ok(
      Object.values(text[language]).every((value) => value.trim().length > 0),
    );
    assert.equal(headlines[language].length, 3);
    assert.equal(featureDescriptions[language].length, 6);
  }
});
test("nine question sets and one direct link retain all ten topic positions", () => {
  assert.equal(suggestions.length, 10);
  assert.equal(new Set(suggestions.map((topic) => topic.id)).size, 10);
  const clubs = suggestions[8];
  assert.equal(clubs.id, "clubs");
  assert.equal(clubs.url, "https://dav-club-match.vercel.app/");
  assert.equal(clubs.questions, undefined);
  assert.equal(suggestions.filter((topic) => topic.questions).length, 9);
  for (const topic of suggestions.filter((topic) => !topic.url))
    for (const lang of ["vi", "en"] as const) {
      assert.equal(topic.questions![lang].length, 4);
      assert.equal(new Set(topic.questions![lang]).size, 4);
      assert.ok(topic.label[lang].length > 0);
    }
});
test("presentation dictionaries contain responsible attribution and no retired wording", () => {
  const retired = /thử nghiệm|trải nghiệm|experimental|demo|mock|minh họa|beta/i;
  for (const language of ["vi", "en"] as const) {
    assert.doesNotMatch(JSON.stringify(text[language]), retired);
    assert.ok(text[language].clubFullName.endsWith("– DAiTech"));
    assert.ok(text[language].footer.includes(text[language].clubFullName));
  }
  assert.equal(text.vi.offline, "Mất kết nối");
});

test("first visit is light and preserves the system preference option", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes("||'light'"));
  assert.ok(layout.includes('data-ombre="blue-white"'));
  assert.ok(layout.includes("t==='system'"));
});

test("ecosystem has eight bilingual entries and no guessed live destinations", () => {
  assert.equal(ecosystem.length, 8);
  assert.deepEqual(ecosystem.slice(0, 2).map((item) => item.id), ["assistant", "club-match"]);
  assert.equal(ecosystem[1].url, suggestions[8].url);
  assert.equal(ecosystem[1].external, true);
  assert.equal(ecosystem.filter((item) => item.status === "live").length, 2);
  for (const item of ecosystem) {
    assert.ok(
      item.label.vi &&
        item.label.en &&
        item.description.vi &&
        item.description.en,
    );
    assert.equal(item.status === "live", Boolean(item.url));
  }
});
test("history supports reload, rename, pin, delete, undo, and clearing through its storage boundary", async () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body as string | undefined });
    if (url.startsWith("/api/conversations?"))
      return Response.json({
        items: [{ id: "a".repeat(24), title: "Tuyển sinh", pinned: false, updatedAt: new Date().toISOString(), messageCount: 2 }],
        nextCursor: null,
      });
    return Response.json({ ok: true });
  }) as typeof fetch;
  try {
    const loaded: LocalConversation[] = await historyStore.load();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].loaded, false);
    const id = loaded[0].id;
    await historyStore.rename(id, "Admissions");
    await historyStore.pin(id, true);
    await historyStore.remove(id);
    await historyStore.removeAll();
    const methods = calls.slice(1).map((c) => `${c.method} ${c.url}`);
    assert.deepEqual(methods.slice(0, 3), [
      `PATCH /api/conversations/${id}`,
      `PATCH /api/conversations/${id}`,
      `DELETE /api/conversations/${id}`,
    ]);
    assert.match(methods[3], /^DELETE \/api\/conversations/);
    assert.equal(JSON.parse(calls[1].body!).title, "Admissions");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("history errors from the API surface as rejections", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({ error: { code: "internal", message: "x" } }, { status: 500 })) as unknown as typeof fetch;
  try {
    await assert.rejects(historyStore.load());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("mock chat streams explicit sample content in both languages with no network", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected network access");
  };
  try {
    for (const lang of ["vi", "en"] as const) {
      let content = "";
      const types = new Set<string>();
      for await (const event of mockSendMessage({
        message: "test",
        sessionId: "test-session",
        lang,
        signal: new AbortController().signal,
      })) {
        types.add(event.type);
        if (event.type === "delta") content += event.text;
      }
      assert.ok(content.includes("MOCK_CHATBOT"));
      assert.ok(types.has("sources") && types.has("suggestions") && types.has("done"));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("aborting a mock stream prevents further chunks", async () => {
  const controller = new AbortController();
  let count = 0;
  for await (const event of mockSendMessage({
    message: "test",
    sessionId: "test-session",
    lang: "vi",
    signal: controller.signal,
  })) {
    if (event.type === "delta") count++;
    controller.abort();
  }
  assert.equal(count, 1);
});
function luminance(hex: string) {
  const values = hex
    .replace("#", "")
    .match(/../g)!
    .map((s) => {
      const n = parseInt(s, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("core text tokens meet AA normal-text contrast on solid glass backings", () => {
  const tokens = readFileSync(
    new URL("../app/design-tokens.css", import.meta.url),
    "utf8",
  );
  const blocks = tokens.split(":root[data-theme=");
  for (const block of blocks) {
    const color = (name: string) =>
      block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))![1];
    for (const name of ["text", "muted", "subtle", "accent-text"])
      assert.ok(
        contrast(color(name), color("surface-solid")) >= 4.5,
        `${name} contrast is too low`,
      );
  }
  assert.ok(contrast("#ffffff", "#2d70c8") >= 4.5);
});
