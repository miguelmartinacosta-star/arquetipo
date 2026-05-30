/* ARQUETIPO — shared behaviour: i18n toggle (ES/EN/DE), mobile menu, reveal-on-scroll */
(function () {
  var KEY = "arq-lang";
  var LANGS = ["es", "en", "de"];

  function apply(lang) {
    if (LANGS.indexOf(lang) < 0) lang = "es";
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang);
      if (v == null) v = el.getAttribute("data-en"); /* fallback to EN if no translation */
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-en-placeholder]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang + "-placeholder");
      if (v == null) v = el.getAttribute("data-en-placeholder");
      if (v != null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
  }

  function detect() {
    var saved = localStorage.getItem(KEY);
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var navs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || navigator.userLanguage || "en"];
    for (var i = 0; i < navs.length; i++) {
      var code = String(navs[i] || "").slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) > -1) return code;
    }
    return "en"; /* default to English when browser language is not ES/EN/DE */
  }

  function init() {
    var saved = detect();
    apply(saved);

    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () {
        var l = b.getAttribute("data-lang");
        localStorage.setItem(KEY, l);
        apply(l);
      });
    });

    /* mobile menu */
    var toggle = document.querySelector(".nav-toggle");
    var overlay = document.querySelector(".nav-overlay");
    if (toggle && overlay) {
      function setOpen(o) {
        overlay.setAttribute("data-open", o ? "true" : "false");
        document.body.style.overflow = o ? "hidden" : "";
      }
      toggle.addEventListener("click", function () {
        setOpen(overlay.getAttribute("data-open") !== "true");
      });
      overlay.querySelectorAll("[data-close], a").forEach(function (el) {
        el.addEventListener("click", function () { setOpen(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setOpen(false);
      });
    }

    /* reveal on scroll */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.14 });
      document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
