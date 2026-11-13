import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  historyStore,
  mockChatAdapter,
  type LocalConversation,
} from "../lib/frontend/adapters";
import { text, headlines, featureDescriptions } from "../lib/frontend/i18n";
import { suggestions } from "../lib/frontend/suggestions";
import { ecosystem } from "../lib/frontend/ecosystem";

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
test("all ten topics provide four prompts per language and unique IDs", () => {
  assert.equal(suggestions.length, 10);
  assert.equal(new Set(suggestions.map((topic) => topic.id)).size, 10);
  for (const topic of suggestions)
    for (const lang of ["vi", "en"] as const) {
      assert.equal(topic.questions[lang].length, 4);
      assert.equal(new Set(topic.questions[lang]).size, 4);
      assert.ok(topic.label[lang].length > 0);
    }
});
test("ecosystem has eight bilingual entries and no guessed live destinations", () => {
  assert.equal(ecosystem.length, 8);
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
  storage.clear();
  assert.deepEqual(await historyStore.load(), []);
  const original: LocalConversation = {
    id: "a",
    title: "Tuyển sinh",
    updatedAt: Date.now(),
    pinned: false,
    messages: [
      { id: "m", role: "user", content: "Xin chào", createdAt: Date.now() },
    ],
  };
  await historyStore.save([original]);
  assert.deepEqual(await historyStore.load(), [original]);
  const renamed = { ...original, title: "Admissions", pinned: true };
  await historyStore.save([renamed]);
  assert.deepEqual(await historyStore.load(), [renamed]);
  await historyStore.save([]);
  assert.deepEqual(await historyStore.load(), []);
  await historyStore.save([renamed]);
  assert.deepEqual(await historyStore.load(), [renamed]);
  await historyStore.save([]);
});
test("invalid stored entries are rejected or filtered without being rendered", async () => {
  storage.set("dav.history.v4", "broken JSON");
  await assert.rejects(historyStore.load());
  storage.set("dav.history.v4", JSON.stringify([{ id: 123, messages: null }]));
  assert.deepEqual(await historyStore.load(), []);
  storage.clear();
});
test("mock chat streams explicit sample content in both languages with no network", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected network access");
  };
  try {
    for (const language of ["vi", "en"] as const) {
      let content = "";
      for await (const delta of mockChatAdapter.stream(
        "test",
        language,
        new AbortController().signal,
      ))
        content += delta;
      assert.equal(content, text[language].demoReply);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("aborting a demo stream prevents further chunks", async () => {
  const controller = new AbortController();
  let count = 0;
  for await (const _ of mockChatAdapter.stream(
    "test",
    "vi",
    controller.signal,
  )) {
    count++;
    controller.abort();
  }
  assert.equal(count, 1);
  const alreadyAborted = new AbortController();
  alreadyAborted.abort();
  for await (const _ of mockChatAdapter.stream(
    "test",
    "en",
    alreadyAborted.signal,
  ))
    assert.fail("Aborted stream emitted content");
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
