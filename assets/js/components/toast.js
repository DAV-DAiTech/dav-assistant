import { h, icon, $ } from "../lib/dom.js";

export function createToaster() {
  const host = $("#toasts");
  return function toast(message, { duration = 2600 } = {}) {
    const el = h("div", { class: "toast", role: "status" }, icon("check"), h("span", {}, message));
    host.append(el);
    setTimeout(() => {
      el.classList.add("is-out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, duration);
  };
}
