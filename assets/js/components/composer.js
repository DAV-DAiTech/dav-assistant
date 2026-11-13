import { h, icon, $, ripple } from "../lib/dom.js";
import { t, getLang } from "../i18n.js";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

export function createComposer({ chat, client, toast }) {
  const input = $("#composer-input");
  const form = $("#composer");
  const sendBtn = $("#send-btn");
  const attachBtn = $("#attach-btn");
  const fileInput = $("#file-input");
  const chips = $("#attachments");
  const micBtn = $("#mic-btn");
  let files = [];

  /* ---------- state ---------- */
  function autosize() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 168)}px`;
  }
  function update() {
    const busy = chat.isBusy();
    const hasContent = !!input.value.trim() || files.some((f) => f.status === "ready");
    const uploading = files.some((f) => f.status === "uploading");
    sendBtn.dataset.state = busy ? "loading" : hasContent ? "ready" : "idle";
    sendBtn.disabled = !busy && (!hasContent || uploading);
    const label = t(busy ? "stop" : "send");
    sendBtn.setAttribute("aria-label", label);
    sendBtn.title = label;
  }

  function submit() {
    if (chat.isBusy()) { chat.stop(); return; }
    const text = input.value.trim();
    const ready = files.filter((f) => f.status === "ready");
    if ((!text && !ready.length) || files.some((f) => f.status === "uploading")) return;
    const attachments = ready.map((f) => f.meta);
    input.value = "";
    files = [];
    renderChips();
    autosize();
    update();
    chat.send(text, { attachments });
  }

  function sendText(text) {
    if (chat.isBusy()) return;
    input.value = text;
    autosize();
    update();
    requestAnimationFrame(submit);
  }

  chat.onBusy(update);
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  input.addEventListener("input", () => { autosize(); update(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submit();
    }
  });
  sendBtn.addEventListener("pointerdown", (e) => ripple(sendBtn, e));

  /* ---------- attachments ---------- */
  function renderChips() {
    chips.replaceChildren(...files.map((f) => {
      const remove = h("button", { type: "button", "aria-label": t("removeFile", { name: f.name }) }, icon("close"));
      remove.addEventListener("click", () => { files = files.filter((x) => x !== f); renderChips(); update(); });
      return h("div", { class: `file-chip is-${f.status}` }, h("span", {}, f.name), remove);
    }));
  }

  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    for (const file of fileInput.files) {
      if (files.length >= MAX_FILES) break;
      if (file.size > MAX_BYTES) { toast(t("uploadFailed", { name: file.name })); continue; }
      const entry = { name: file.name, status: "uploading", meta: null };
      files.push(entry);
      client.upload(file)
        .then((meta) => { entry.meta = meta; entry.status = "ready"; })
        .catch(() => {
          entry.status = "error";
          toast(t("uploadFailed", { name: file.name }));
          setTimeout(() => { files = files.filter((x) => x !== entry); renderChips(); update(); }, 2500);
        })
        .finally(() => { renderChips(); update(); });
    }
    fileInput.value = "";
    renderChips();
    update();
  });

  /* ---------- voice input ---------- */
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  if (!Recognition) micBtn.hidden = true;

  function setListening(on) {
    micBtn.setAttribute("aria-pressed", String(on));
    const label = t(on ? "micStop" : "mic");
    micBtn.setAttribute("aria-label", label);
    micBtn.title = label;
  }
  micBtn.addEventListener("click", () => {
    if (recognizer) { recognizer.stop(); return; }
    recognizer = new Recognition();
    recognizer.lang = getLang() === "vi" ? "vi-VN" : "en-US";
    recognizer.interimResults = true;
    recognizer.continuous = false;
    const base = input.value ? `${input.value} ` : "";
    recognizer.onresult = (e) => {
      input.value = base + [...e.results].map((r) => r[0].transcript).join("");
      autosize();
      update();
    };
    recognizer.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(t("micDenied")); };
    recognizer.onend = () => { recognizer = null; setListening(false); input.focus(); };
    try { recognizer.start(); setListening(true); } catch { recognizer = null; }
  });

  update();
  return {
    sendText,
    focus: () => input.focus(),
    refreshLang: () => { update(); setListening(micBtn.getAttribute("aria-pressed") === "true"); renderChips(); },
  };
}
