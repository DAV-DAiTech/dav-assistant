import { $ } from "./lib/dom.js";
import { applyI18n } from "./i18n.js";
import { ChatClient } from "./lib/client.js";
import { createToaster } from "./components/toast.js";
import { initBackground } from "./components/background.js";
import { initHeader } from "./components/header.js";
import { initRail } from "./components/rail.js";
import { initWelcome } from "./components/welcome.js";
import { createChat } from "./components/chat.js";
import { createComposer } from "./components/composer.js";

applyI18n();

const toast = createToaster();
const client = new ChatClient();
let rail;
let welcome;
let chat;
let composer;

initHeader({
  toast,
  onLanguage: () => {
    rail.render();
    welcome.render();
    chat.refreshLang();
    composer.refreshLang();
  },
});
initBackground();
rail = initRail({ toast });
chat = createChat({ client, toast, getActiveTopic: () => welcome.getActiveTopic() });
composer = createComposer({ chat, client, toast });
welcome = initWelcome({ ask: (question) => composer.sendText(question) });

/* Keep scroll padding and toast offsets in sync with the dock height. */
const dock = $(".chat__dock");
new ResizeObserver(() => {
  document.documentElement.style.setProperty("--dock-h", `${dock.offsetHeight}px`);
}).observe(dock);

/* Disclaimer details popover */
const detailsBtn = $("#details-btn");
const detailsPop = $("#details-pop");
function setDetails(open) {
  detailsPop.classList.toggle("is-open", open);
  detailsBtn.setAttribute("aria-expanded", String(open));
}
detailsBtn.addEventListener("click", (e) => { e.stopPropagation(); setDetails(!detailsPop.classList.contains("is-open")); });
document.addEventListener("click", (e) => { if (!detailsPop.contains(e.target)) setDetails(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && detailsPop.classList.contains("is-open")) { setDetails(false); detailsBtn.focus(); }
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
    e.preventDefault();
    composer.focus();
  }
});

chat.connect();
