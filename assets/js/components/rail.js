import { h, icon, $, $$ } from "../lib/dom.js";
import { t, pick } from "../i18n.js";
import { RAIL_ITEMS } from "../config/rail-items.js";

export function initRail({ toast }) {
  const rail = $("#rail");
  const list = $("#rail-list");
  const scrim = $("#scrim");
  const toggle = $("#rail-toggle");
  const mobile = matchMedia("(max-width: 899px)");

  function render() {
    list.replaceChildren(...RAIL_ITEMS.map((item) => {
      const soon = item.status === "soon";
      const a = h("a", {
        class: "rail__item", href: item.url, "data-id": item.id,
        "aria-current": item.active ? "page" : null,
        "aria-disabled": soon ? "true" : null,
        target: !soon && /^https?:/.test(item.url) ? "_blank" : null,
        rel: !soon && /^https?:/.test(item.url) ? "noopener noreferrer" : null,
      },
      h("span", { class: "rail__icon" }, icon(item.icon)),
      h("span", { class: "rail__label" }, h("b", {}, pick(item.label)), h("small", {}, pick(item.desc))),
      soon ? h("span", { class: "rail__badge" }, t("soon")) : null);

      a.addEventListener("pointermove", (e) => {
        const r = a.getBoundingClientRect();
        const ic = $(".rail__icon", a).getBoundingClientRect();
        a.style.setProperty("--mx", `${e.clientX - r.left}px`);
        const dx = (e.clientX - (ic.left + ic.width / 2)) / 18;
        const dy = (e.clientY - (ic.top + ic.height / 2)) / 18;
        $(".rail__icon", a).style.setProperty("--tx", `${Math.max(-3, Math.min(3, dx))}px`);
        $(".rail__icon", a).style.setProperty("--ty", `${Math.max(-3, Math.min(3, dy))}px`);
      });
      a.addEventListener("pointerleave", () => {
        const ic = $(".rail__icon", a);
        ic.style.setProperty("--tx", "0px");
        ic.style.setProperty("--ty", "0px");
      });
      a.addEventListener("click", (e) => {
        if (soon) {
          e.preventDefault();
          toast(t("soonToast", { name: pick(item.label) }));
        }
        if (mobile.matches && !item.active) close();
        else if (mobile.matches && item.active) close();
      });
      return a;
    }));
  }

  function open() {
    rail.classList.add("is-open");
    scrim.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", t("menuClose"));
    $(".rail__item", rail)?.focus();
  }
  function close({ restore = true } = {}) {
    if (!rail.classList.contains("is-open")) return;
    rail.classList.remove("is-open");
    scrim.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("menuOpen"));
    if (restore) toggle.focus();
  }

  toggle.addEventListener("click", () => (rail.classList.contains("is-open") ? close() : open()));
  scrim.addEventListener("click", () => close());
  rail.addEventListener("keydown", (e) => {
    if (!mobile.matches || !rail.classList.contains("is-open")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Tab") {
      const items = $$("a", rail);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener("change", () => close({ restore: false }));

  render();
  return { render, close };
}
