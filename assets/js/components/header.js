import { $, $$, withTransition } from "../lib/dom.js";
import { t, getLang, setLang, applyI18n } from "../i18n.js";

const THEMES = ["light", "dark", "system"];
const root = document.documentElement;
const dark = matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(pref) {
  return pref === "system" ? (dark.matches ? "dark" : "light") : pref;
}

function paintTheme(pref) {
  root.dataset.themePref = pref;
  root.dataset.theme = resolveTheme(pref);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", root.dataset.theme === "dark" ? "#0b1220" : "#0a2a66");
}

export function initHeader({ toast, onLanguage }) {
  const langSeg = $("#lang-seg");
  const themeBtn = $("#theme-btn");
  const qrBtn = $("#qr-btn");
  const qrPop = $("#qr-pop");
  const fsBtn = $("#fs-btn");

  /* ---- Language ---- */
  function syncLang() {
    langSeg.dataset.value = getLang();
    $$("button", langSeg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())));
  }
  $$("button", langSeg).forEach((btn) => btn.addEventListener("click", () => {
    if (btn.dataset.lang === getLang()) return;
    withTransition(() => {
      setLang(btn.dataset.lang);
      applyI18n();
      syncLang();
      syncTheme();
      syncFullscreen();
      onLanguage();
    });
    toast(t("langToast"));
  }));
  syncLang();

  /* ---- Theme (light / dark / system) ---- */
  let pref = root.dataset.themePref || "system";
  function syncTheme() {
    const label = t(`theme${pref[0].toUpperCase()}${pref.slice(1)}`);
    themeBtn.setAttribute("aria-label", `${t("themeBtn")}: ${label}`);
    themeBtn.title = `${t("themeBtn")}: ${label}`;
  }
  themeBtn.addEventListener("click", () => {
    pref = THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length];
    try { localStorage.setItem("dav-theme", pref); } catch { /* storage unavailable */ }
    withTransition(() => { paintTheme(pref); syncTheme(); });
    toast(t("themeToast", { mode: t(`theme${pref[0].toUpperCase()}${pref.slice(1)}`) }));
  });
  dark.addEventListener("change", () => { if (pref === "system") paintTheme(pref); });
  syncTheme();

  /* ---- Popover (QR) ---- */
  function setPop(open) {
    qrPop.classList.toggle("is-open", open);
    qrBtn.setAttribute("aria-expanded", String(open));
  }
  qrBtn.addEventListener("click", (e) => { e.stopPropagation(); setPop(!qrPop.classList.contains("is-open")); });
  document.addEventListener("click", (e) => { if (!qrPop.contains(e.target)) setPop(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && qrPop.classList.contains("is-open")) { setPop(false); qrBtn.focus(); }
  });

  /* ---- Fullscreen ---- */
  function syncFullscreen() {
    const on = !!document.fullscreenElement;
    fsBtn.setAttribute("aria-label", t(on ? "fsExit" : "fsEnter"));
    fsBtn.title = t(on ? "fsExit" : "fsEnter");
    fsBtn.dataset.on = on ? "1" : "0";
  }
  if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener("fullscreenchange", syncFullscreen);
  syncFullscreen();

  return { syncTheme, syncFullscreen };
}
