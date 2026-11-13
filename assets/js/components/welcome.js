import { h, icon, $, $$, trackPointer, prefersReducedMotion } from "../lib/dom.js";
import { pick } from "../i18n.js";
import { TOPICS } from "../config/suggestions.js";

export function initWelcome({ ask }) {
  const list = $("#topics-list");
  const indicator = $("#topics-ind");
  const grid = $("#suggest");
  let active = TOPICS[0].id;

  const tabId = (id) => `topic-${id}`;

  function moveIndicator() {
    const tab = $('.topic[aria-selected="true"]', list);
    if (!tab) return;
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    tab.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function renderTabs() {
    $$(".topic", list).forEach((el) => el.remove());
    TOPICS.forEach((topic) => {
      const selected = topic.id === active;
      const tab = h("button", {
        class: "topic", id: tabId(topic.id), role: "tab", type: "button",
        "aria-selected": String(selected), "aria-controls": "suggest", tabindex: selected ? "0" : "-1",
      }, icon(topic.icon), h("span", {}, pick(topic.label)));
      tab.addEventListener("click", () => select(topic.id));
      list.append(tab);
    });
    requestAnimationFrame(moveIndicator);
  }

  function renderCards() {
    const topic = TOPICS.find((x) => x.id === active);
    grid.setAttribute("aria-labelledby", tabId(active));
    grid.replaceChildren(...topic.questions.map((q, n) => {
      const text = pick(q);
      const card = h("button", { class: "sugg", type: "button", style: `--n:${n}` },
        h("span", { class: "sugg__icon" }, icon(topic.icon)),
        h("span", { class: "sugg__text" }, text),
        icon("arrow-right", "sugg__go"));
      trackPointer(card);
      card.addEventListener("click", () => ask(text));
      return card;
    }));
  }

  function select(id) {
    if (id === active) return;
    active = id;
    $$(".topic", list).forEach((tab) => {
      const on = tab.id === tabId(id);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    moveIndicator();
    if (prefersReducedMotion()) { renderCards(); return; }
    grid.classList.add("is-out");
    setTimeout(() => { renderCards(); grid.classList.remove("is-out"); }, 170);
  }

  list.addEventListener("keydown", (e) => {
    const tabs = $$(".topic", list);
    const i = tabs.findIndex((tab) => tab === document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); next.focus(); next.click(); }
  });
  new ResizeObserver(() => moveIndicator()).observe(list);

  function render() { renderTabs(); renderCards(); }
  render();
  document.fonts?.ready.then(moveIndicator);

  return { render, getActiveTopic: () => active };
}
