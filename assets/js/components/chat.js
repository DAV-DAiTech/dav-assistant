import { h, icon, $, prefersReducedMotion } from "../lib/dom.js";
import { t, pick } from "../i18n.js";
import { renderMarkdown, extractLinks } from "../lib/markdown.js";
import { ChatError } from "../lib/client.js";
import { TOPICS, DEFAULT_FOLLOWUPS } from "../config/suggestions.js";
import { CHAT, SITE } from "../config/app-config.js";

export function createChat({ client, toast, getActiveTopic }) {
  const scroller = $("#scroller");
  const list = $("#messages");
  const welcome = $("#welcome");
  const latest = $("#scroll-latest");
  const newChat = $("#new-chat");
  const statusChip = $("#chat-status");
  const statusText = $("#chat-status-text");
  const live = $("#sr-live");
  const banner = $("#conn-banner");
  const bannerDetail = $("#conn-detail");

  const state = { busy: false, status: "idle", code: null, inConversation: false, controller: null, asked: new Set() };
  const busyListeners = new Set();
  const fullUrl = () => `${CHAT.fullScreenUrl}&locale=${document.documentElement.lang}`;

  /* ---------- status & connection banner ---------- */
  const errorText = (code) => {
    const text = t(`err.${code}`);
    return text.startsWith("err.") ? t("err.GENERIC") : text;
  };

  function paintStatus() {
    statusChip.dataset.state = state.status;
    statusText.textContent = t(`status.${state.status}`);
    banner.hidden = !(state.status === "error" && !state.inConversation);
    bannerDetail.textContent = errorText(state.code);
    $("#conn-full").href = fullUrl();
  }
  function setStatus(status, code = null) {
    state.status = status;
    state.code = code;
    paintStatus();
  }
  async function connect() {
    setStatus("connecting");
    try { await client.ensureSession(); setStatus("ready"); } catch (err) { setStatus("error", err.code); }
  }

  /* ---------- scrolling ---------- */
  const distanceFromBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
  const nearBottom = () => distanceFromBottom() < 120;
  function scrollToBottom(smooth) {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }
  scroller.addEventListener("scroll", () => {
    document.body.classList.toggle("is-scrolled", scroller.scrollTop > 8);
    latest.classList.toggle("is-visible", state.inConversation && distanceFromBottom() > 240);
  }, { passive: true });
  latest.addEventListener("click", () => scrollToBottom(true));

  /* ---------- conversation mode ---------- */
  function enterConversation() {
    if (state.inConversation) return;
    state.inConversation = true;
    document.body.dataset.mode = "chat";
    welcome.classList.add("is-collapsing");
    setTimeout(() => { if (state.inConversation) welcome.hidden = true; }, prefersReducedMotion() ? 0 : 300);
    paintStatus();
  }

  function setBusy(busy) {
    state.busy = busy;
    document.body.toggleAttribute("data-busy", busy);
    busyListeners.forEach((fn) => fn(busy));
  }

  /* ---------- message builders ---------- */
  function addUser(text, attachments) {
    const bubble = h("div", { class: "bubble" },
      attachments.length ? h("div", { class: "attach-list" }, attachments.map((a) => h("span", {}, a.name))) : null,
      text);
    const li = h("li", { class: "msg msg--user" }, bubble);
    list.append(li);
    return li;
  }

  function addBot(question) {
    const typingLabel = h("span", {}, t("typing.thinking"));
    const typing = h("div", { class: "typing", role: "status" },
      h("span", { class: "typing__dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")), typingLabel);
    const md = h("div", { class: "md" });
    const bubble = h("div", { class: "bubble", hidden: true }, md);
    const sources = h("div", { class: "sources", hidden: true });
    const actions = h("div", { class: "actions", hidden: true });
    const followups = h("div", { class: "followups", hidden: true });
    const li = h("li", { class: "msg msg--bot" },
      h("img", { class: "msg__avatar", src: "assets/img/dav-logo.png", alt: "" }),
      h("div", { class: "msg__body" }, typing, bubble, sources, actions, followups));
    list.append(li);
    return { li, typing, typingLabel, bubble, md, sources, actions, followups, question, text: "", refs: [], followUps: [], messageId: null, revealed: false, raf: 0, regenBtn: null };
  }

  function reveal(bot) {
    if (bot.revealed) return;
    bot.revealed = true;
    bot.typing.hidden = true;
    bot.bubble.hidden = false;
    bot.md.classList.add("is-streaming");
  }

  function paint(bot) {
    bot.raf = 0;
    const stick = nearBottom();
    bot.md.innerHTML = renderMarkdown(bot.text);
    if (stick) scroller.scrollTop = scroller.scrollHeight;
  }

  /* ---------- stream events ---------- */
  function readCustom(ev, bot) {
    const value = ev.value;
    if (/ref|source|citation/i.test(ev.name || "")) {
      const items = Array.isArray(value) ? value : value?.references || value?.items || [];
      for (const r of items) {
        const url = r?.url || r?.href || r?.link;
        if (url) bot.refs.push({ url, label: r.title || r.name || "" });
      }
    } else if (/follow/i.test(ev.name || "")) {
      const items = Array.isArray(value) ? value : value?.items || [];
      bot.followUps = items.map((x) => (typeof x === "string" ? x : x?.text || x?.label || x?.question)).filter(Boolean);
    }
  }

  function handle(ev, bot) {
    switch (ev.type) {
      case "TOOL_CALL_START": bot.typingLabel.textContent = t("typing.searching"); break;
      case "TEXT_MESSAGE_START": bot.messageId = ev.messageId; reveal(bot); break;
      case "TEXT_MESSAGE_CONTENT":
      case "TEXT_MESSAGE_CHUNK":
        if (ev.messageId && !bot.messageId) bot.messageId = ev.messageId;
        reveal(bot);
        bot.text += ev.delta || "";
        if (!bot.raf) bot.raf = requestAnimationFrame(() => paint(bot));
        break;
      case "CUSTOM": readCustom(ev, bot); break;
      case "RUN_ERROR": throw new ChatError(ev.code || "GENERIC", ev.message);
      default: break;
    }
  }

  /* ---------- finishing a message ---------- */
  function sourceChips(bot) {
    const byHost = new Map();
    for (const ref of bot.refs) {
      try {
        const host = new URL(ref.url).hostname.replace(/^www\./, "");
        if (!byHost.has(host)) byHost.set(host, { url: ref.url, label: host });
      } catch { /* skip */ }
    }
    for (const link of extractLinks(bot.text)) if (!byHost.has(link.label)) byHost.set(link.label, link);
    if (!byHost.size) byHost.set(SITE.officialHost, { url: SITE.officialUrl, label: SITE.officialHost });
    return [...byHost.values()].slice(0, 4);
  }

  function pickFollowups(bot) {
    if (bot.followUps.length) return bot.followUps.slice(0, 3);
    const topic = TOPICS.find((x) => x.id === getActiveTopic());
    const pool = [...(topic?.questions || []), ...DEFAULT_FOLLOWUPS, ...TOPICS.flatMap((x) => x.questions)];
    const seen = new Set();
    const out = [];
    for (const q of pool) {
      const text = pick(q);
      if (state.asked.has(text) || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length === 3) break;
    }
    return out;
  }

  function actionButton(cls, iconId, labelKey, onClick) {
    const btn = h("button", { class: `act ${cls}`, type: "button", "data-i18n-aria": labelKey, "aria-label": t(labelKey), title: t(labelKey) }, icon(iconId));
    btn.addEventListener("click", () => onClick(btn));
    return btn;
  }

  function buildActions(bot) {
    const copy = actionButton("act--copy", "copy", "copy", async (btn) => {
      try {
        await navigator.clipboard.writeText(bot.text);
        btn.classList.add("is-done");
        btn.replaceChildren(icon("check"));
        toast(t("copied"));
        setTimeout(() => { btn.classList.remove("is-done"); btn.replaceChildren(icon("copy")); }, 1800);
      } catch { toast(t("copyFailed")); }
    });
    const rate = (btn, other, rating) => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      other.setAttribute("aria-pressed", "false");
      if (on) {
        toast(t("thanks"));
        if (bot.messageId) client.feedback(bot.messageId, rating).catch(() => {});
      }
    };
    const up = actionButton("act--up", "thumb", "like", (btn) => rate(btn, down, "up"));
    const down = actionButton("act--down", "thumb", "dislike", (btn) => rate(btn, up, "down"));
    up.setAttribute("aria-pressed", "false");
    down.setAttribute("aria-pressed", "false");
    bot.regenBtn = actionButton("act--regen", "refresh", "regenerate", () => {
      if (state.busy) return;
      bot.userLi?.remove();
      bot.li.remove();
      send(bot.question);
    });
    bot.actions.replaceChildren(copy, up, down, bot.regenBtn);
    bot.actions.hidden = false;
  }

  function finalize(bot, { stopped = false } = {}) {
    cancelAnimationFrame(bot.raf);
    if (!bot.text.trim()) {
      if (stopped) { bot.li.remove(); return; }
      throw new ChatError("GENERIC");
    }
    reveal(bot);
    bot.md.classList.remove("is-streaming");
    bot.md.innerHTML = renderMarkdown(bot.text);

    const chips = sourceChips(bot);
    bot.sources.replaceChildren(
      h("span", {}, `${t("sources")}:`),
      ...chips.map((c) => h("a", { class: "chip", href: c.url, target: "_blank", rel: "noopener noreferrer" }, c.label, icon("external"))));
    bot.sources.hidden = false;
    buildActions(bot);

    if (!stopped) {
      const questions = pickFollowups(bot);
      if (questions.length) {
        bot.followups.replaceChildren(
          h("span", { class: "followups__label" }, t("followUps")),
          ...questions.map((q, n) => {
            const chip = h("button", { class: "chip", type: "button", style: `--n:${n}` }, q);
            chip.addEventListener("click", () => send(q));
            return chip;
          }));
        bot.followups.hidden = false;
      }
    }
    live.textContent = `${t("answered")} ${bot.text.slice(0, 500)}`;
    if (nearBottom()) scrollToBottom(true);
  }

  function fail(bot, err) {
    cancelAnimationFrame(bot.raf);
    const code = err.code || "GENERIC";
    if (code === "NETWORK" || code === "ORIGIN_NOT_ALLOWED") setStatus("error", code);
    bot.typing.hidden = true;
    bot.li.classList.add("is-error");
    bot.bubble.hidden = false;
    const retry = h("button", { class: "btn", type: "button" }, icon("refresh"), t("retry"));
    retry.addEventListener("click", () => {
      if (state.busy) return;
      bot.userLi?.remove();
      bot.li.remove();
      send(bot.question);
    });
    const full = h("a", { class: "btn", href: fullUrl(), target: "_blank", rel: "noopener noreferrer" }, icon("external"), t("openFull"));
    bot.bubble.replaceChildren(
      h("strong", {}, t("errTitle")),
      h("p", {}, errorText(code)),
      h("div", { class: "notice__actions" }, retry, full));
    live.textContent = `${t("errTitle")}. ${errorText(code)}`;
  }

  /* ---------- sending ---------- */
  async function send(text, { attachments = [] } = {}) {
    text = text.trim();
    if ((!text && !attachments.length) || state.busy) return false;
    if (!text) text = attachments.map((a) => a.name).join(", ");

    enterConversation();
    list.querySelectorAll(".followups").forEach((el) => el.replaceChildren());
    list.querySelectorAll(".act--regen").forEach((el) => el.remove());
    state.asked.add(text);

    const userLi = addUser(text, attachments);
    const bot = addBot(text);
    bot.userLi = userLi;
    scrollToBottom(true);
    setBusy(true);

    const controller = new AbortController();
    state.controller = controller;
    try {
      if (state.status !== "ready") setStatus("connecting");
      const files = attachments.map(({ objectKey, name, mimeType, sizeBytes }) => ({ objectKey, name, mimeType, sizeBytes }));
      for await (const ev of client.run(text, { attachments: files, signal: controller.signal })) handle(ev, bot);
      setStatus("ready");
      finalize(bot);
    } catch (err) {
      if (err.name === "AbortError") finalize(bot, { stopped: true });
      else fail(bot, err);
    } finally {
      state.controller = null;
      setBusy(false);
    }
    return true;
  }

  const stop = () => state.controller?.abort();

  /* ---------- new conversation (two-step confirm) ---------- */
  let confirmTimer = 0;
  newChat.addEventListener("click", () => {
    if (!state.inConversation) return;
    if (newChat.dataset.confirm === "1") {
      clearTimeout(confirmTimer);
      newChat.dataset.confirm = "0";
      reset();
    } else {
      newChat.dataset.confirm = "1";
      confirmTimer = setTimeout(() => { newChat.dataset.confirm = "0"; }, 3500);
    }
  });

  async function reset() {
    stop();
    list.classList.add("is-leaving");
    await new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : 220));
    list.replaceChildren();
    list.classList.remove("is-leaving");
    state.asked.clear();
    state.inConversation = false;
    document.body.dataset.mode = "welcome";
    welcome.hidden = false;
    welcome.classList.remove("is-collapsing");
    welcome.classList.add("is-returning");
    setTimeout(() => welcome.classList.remove("is-returning"), 650);
    scroller.scrollTop = 0;
    latest.classList.remove("is-visible");
    live.textContent = "";
    toast(t("newChatDone"));
    setStatus("connecting");
    try { await client.ensureSession({ newConversation: true }); setStatus("ready"); } catch (err) { setStatus("error", err.code); }
  }

  /* ---------- connection banner actions ---------- */
  $("#conn-retry").addEventListener("click", connect);

  return {
    send, stop, reset, connect,
    isBusy: () => state.busy,
    onBusy: (fn) => busyListeners.add(fn),
    refreshLang: () => {
      paintStatus();
      list.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        el.setAttribute("aria-label", t(el.dataset.i18nAria));
        el.title = t(el.dataset.i18nAria);
      });
    },
  };
}
