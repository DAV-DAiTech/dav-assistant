import { DICT } from "./i18n-dict.js";

const root = document.documentElement;
let lang = root.lang === "en" ? "en" : "vi";

export const getLang = () => lang;

export function t(key, vars) {
  const hit = key.split(".").reduce((o, k) => (o == null ? o : o[k]), DICT[lang]);
  let out = typeof hit === "string" ? hit : key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

export const pick = (obj) => obj[lang] ?? obj.vi;

export function setLang(next) {
  lang = next === "en" ? "en" : "vi";
  root.lang = lang;
  try { localStorage.setItem("dav-lang", lang); } catch { /* storage unavailable */ }
}

export function applyI18n(scope = document) {
  scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  scope.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  scope.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  scope.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  scope.querySelectorAll("[data-i18n-alt]").forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
  if (scope === document) {
    document.title = t("title");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("description"));
  }
}
