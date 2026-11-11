/*
 * DAV Assistant – page behaviour (vanilla JS, no build step).
 * Modules: i18n, theme, header, topics/questions, toasts, chat frame (load state, fullscreen).
 * The chat itself is the FPT AI Factory widget in an iframe; its URL and connection key are
 * unchanged and live in the data-chat-url attribute of #chat-card.
 */
(function () {
  'use strict';

  var DICT = window.DAV_I18N;
  var root = document.documentElement;
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var state = {
    lang: DICT[root.lang] ? root.lang : 'vi',
    themePref: root.dataset.themePref || 'system',
    topic: null
  };

  var TOPIC_IDS = ['admissions', 'benchmark', 'tuition', 'majors', 'english', 'partners', 'scholarship', 'dorm', 'clubs', 'news'];

  function t(key) { return DICT[state.lang][key]; }

  /* ---------- Toasts ---------- */
  var toastRoot = $('#toasts');
  function toast(message) {
    while (toastRoot.children.length >= 3) toastRoot.firstChild.remove();
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
    var text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);
    toastRoot.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
      setTimeout(function () { el.remove(); }, 400);
    }, 2800);
  }

  /* ---------- Segmented controls ---------- */
  function setSeg(seg, index) {
    seg.style.setProperty('--i', index);
    $$('.seg-btn', seg).forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === index)); });
  }

  /* ---------- Chat URLs ---------- */
  var chatCard = $('#chat-card');
  var chatFrame = $('#chat');
  var chatStage = $('.chat-stage');
  function chatUrl() { return chatCard.dataset.chatUrl + state.lang; }
  function syncChatLinks() {
    ['#chat-full', '#chat-newtab', '#chat-open'].forEach(function (sel) { $(sel).href = chatUrl(); });
  }

  /* ---------- i18n ---------- */
  function applyI18n() {
    var d = DICT[state.lang];
    root.lang = state.lang;
    document.title = d.title;
    $('meta[name="description"]').setAttribute('content', d.description);

    $$('[data-i18n]').forEach(function (el) { if (d[el.dataset.i18n] != null) el.textContent = d[el.dataset.i18n]; });
    $$('[data-i18n-html]').forEach(function (el) { if (d[el.dataset.i18nHtml] != null) el.innerHTML = d[el.dataset.i18nHtml]; });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.dataset.i18nAttr.split(';').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length === 2 && d[parts[1]] != null) el.setAttribute(parts[0], d[parts[1]]);
      });
    });
    $('#chat').setAttribute('title', d.chatFrameTitle);
    $('#chat-expand').setAttribute('aria-label', expanded ? d.chatCollapse : d.chatExpand);
    $('#chat-expand').setAttribute('title', expanded ? d.chatCollapse : d.chatExpand);

    setSeg($('.seg-lang'), state.lang === 'vi' ? 0 : 1);
    renderTopics();
    renderQuestions(false);
    syncChatLinks();
  }

  function setLang(lang, announce) {
    if (!DICT[lang] || lang === state.lang) return;
    state.lang = lang;
    store.set('dav-lang', lang);
    applyI18n();
    // The widget picks its language from the URL, so the frame is reloaded once.
    watchChat(true);
    if (announce) toast(t('toastLang'));
  }

  /* ---------- Theme ---------- */
  var THEME_ORDER = ['light', 'dark', 'system'];
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function resolveTheme(pref) { return pref === 'dark' || (pref === 'system' && darkQuery.matches) ? 'dark' : 'light'; }

  function applyTheme(animate) {
    if (animate && !reduceMotion.matches) {
      root.classList.add('theme-transition');
      setTimeout(function () { root.classList.remove('theme-transition'); }, 400);
    }
    root.dataset.theme = resolveTheme(state.themePref);
    root.dataset.themePref = state.themePref;
    setSeg($('.seg-theme'), THEME_ORDER.indexOf(state.themePref));
  }

  function setTheme(pref, announce) {
    if (pref === state.themePref) return;
    state.themePref = pref;
    store.set('dav-theme', pref);
    applyTheme(true);
    if (announce) toast(t('toastTheme')[pref]);
  }

  darkQuery.addEventListener('change', function () { if (state.themePref === 'system') applyTheme(true); });

  /* ---------- Topics & suggested questions ---------- */
  function renderTopics() {
    var list = $('#topics');
    var names = t('topics');
    list.textContent = '';
    TOPIC_IDS.forEach(function (id) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.topic = id;
      btn.textContent = names[id];
      btn.setAttribute('aria-pressed', String(state.topic === id));
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  var questionsToken = 0;
  function renderQuestions(animate) {
    var list = $('#questions');
    var items = t('questions')[state.topic || 'default'];
    var token = ++questionsToken;

    function build() {
      list.textContent = '';
      items.forEach(function (q) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'q-item';
        var text = document.createElement('span');
        text.className = 'q-text';
        text.textContent = q;
        btn.appendChild(text);
        btn.insertAdjacentHTML('beforeend', '<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg>');
        li.appendChild(btn);
        list.appendChild(li);
      });
    }

    if (!animate || reduceMotion.matches) { build(); return; }

    var out = list.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }],
      { duration: 150, easing: 'ease-out', fill: 'forwards' }
    );
    out.onfinish = function () {
      if (token !== questionsToken) return;
      build();
      out.cancel();
      list.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: EASE }
      );
    };
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function flashChat() {
    chatCard.classList.remove('is-flash');
    void chatCard.offsetWidth;
    chatCard.classList.add('is-flash');
    if (window.matchMedia('(max-width: 899px)').matches) chatCard.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    try { chatFrame.focus(); } catch (e) {}
  }

  $('#topics').addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    state.topic = state.topic === btn.dataset.topic ? null : btn.dataset.topic;
    $$('.chip', $('#topics')).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.topic === state.topic)); });
    renderQuestions(true);
  });

  $('#questions').addEventListener('click', function (e) {
    var btn = e.target.closest('.q-item');
    if (!btn) return;
    var text = $('.q-text', btn).textContent;
    copyText(text).then(function () {
      btn.classList.add('is-copied');
      var use = $('use', btn);
      if (use) use.setAttribute('href', '#i-check');
      setTimeout(function () {
        btn.classList.remove('is-copied');
        if (use) use.setAttribute('href', '#i-copy');
      }, 1600);
      toast(t('toastCopied'));
      flashChat();
    }, function () { toast(t('toastCopyFailed')); });
  });

  /* ---------- Header ---------- */
  var header = $('.site-header');
  var menuBtn = $('#menu-btn');
  var controls = $('#header-controls');
  var ticking = false;

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    });
  }, { passive: true });

  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    controls.classList.toggle('is-open', open);
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('click', function (e) {
    if (!controls.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });

  $('.seg-lang').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang, true);
  });
  $('.seg-theme').addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-pref]');
    if (b) setTheme(b.dataset.themePref, true);
  });

  /* ---------- Chat frame: load state, retry, in-page fullscreen ---------- */
  var chatError = $('#chat-error');
  var chatLoading = $('#chat-loading');
  var loadTimer = null;

  function markLoaded() {
    clearTimeout(loadTimer);
    chatStage.classList.add('is-loaded');
    chatError.hidden = true;
    chatLoading.hidden = true;
  }

  function watchChat(reload) {
    clearTimeout(loadTimer);
    chatStage.classList.remove('is-loaded');
    chatLoading.hidden = false;
    chatError.hidden = true;
    chatFrame.dataset.loaded = '';
    if (reload) {
      chatFrame.removeAttribute('src');
      chatFrame.src = chatUrl();
    }
    // Same 12s window as before: if the frame never loads, offer a retry and a direct link.
    loadTimer = setTimeout(function () {
      if (chatFrame.dataset.loaded !== '1') {
        chatStage.classList.remove('is-loaded');
        chatError.hidden = false;
      }
    }, 12000);
  }

  chatFrame.addEventListener('load', markLoaded);
  $('#chat-retry').addEventListener('click', function () { watchChat(true); });

  var expanded = false;
  var expandBtn = $('#chat-expand');
  var scrim = $('#scrim');

  function setExpanded(on) {
    if (on === expanded) return;
    var first = chatCard.getBoundingClientRect();
    expanded = on;
    chatCard.classList.toggle('is-expanded', on);
    scrim.hidden = !on;
    document.body.classList.toggle('no-scroll', on);
    expandBtn.setAttribute('aria-pressed', String(on));
    var label = on ? t('chatCollapse') : t('chatExpand');
    expandBtn.setAttribute('aria-label', label);
    expandBtn.setAttribute('title', label);

    if (!reduceMotion.matches) {
      var last = chatCard.getBoundingClientRect();
      chatCard.animate([
        { transform: 'translate(' + (first.left - last.left) + 'px,' + (first.top - last.top) + 'px) scale(' + (first.width / last.width) + ',' + (first.height / last.height) + ')' },
        { transform: 'none' }
      ], { duration: 380, easing: EASE });
    }
  }

  expandBtn.addEventListener('click', function () { setExpanded(!expanded); });
  scrim.addEventListener('click', function () { setExpanded(false); });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (expanded) setExpanded(false);
      if (controls.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
      return;
    }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      e.preventDefault();
      flashChat();
    }
  });

  /* ---------- Init ---------- */
  applyTheme(false);
  applyI18n();
  header.classList.toggle('is-scrolled', window.scrollY > 8);
  if (chatFrame.dataset.loaded === '1') markLoaded(); else watchChat(false);
})();
