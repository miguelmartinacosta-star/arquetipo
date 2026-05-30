/* ARQUETIPO — lightweight Tweaks panel (vanilla, host-protocol aware).
   Lets you experiment live with key brand colors. Choices persist in localStorage
   and apply across pages that load this script. */
(function () {
  var KEY = "arq-tweaks";
  var GROUPS = [
    { label: "Dark sections", sub: "Why now · footer", varName: "--slate", base: "#34414A",
      options: ["#34414A", "#2B3942", "#222C33", "#3C4651", "#2E3A45", "#3A3F44"] },
    { label: "Deep ink", sub: "Hero · closing · nav", varName: "--ink", base: "#1A1A1A",
      options: ["#1A1A1A", "#14181C", "#10161A", "#1E2428", "#211F1C"] },
    { label: "Accent", sub: "Serene highlight", varName: "--serene", base: "#A8BBC9",
      options: ["#A8BBC9", "#93AEC0", "#B7C4CC", "#8FB0C2", "#9FB8AE"] }
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { localStorage.setItem(KEY, JSON.stringify(o)); }
  var state = load();

  function applyAll() {
    GROUPS.forEach(function (g) {
      var v = state[g.varName];
      if (v) document.documentElement.style.setProperty(g.varName, v);
    });
  }
  applyAll();

  var panel, built = false;

  function build() {
    if (built) return; built = true;
    var css = document.createElement("style");
    css.textContent = [
      ".arq-tw{position:fixed;right:18px;bottom:18px;z-index:9999;width:300px;max-width:calc(100vw - 36px);",
      "background:rgba(16,20,24,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);",
      "border:1px solid rgba(168,187,201,.22);color:#FAFAFA;font-family:'Geist Mono',ui-monospace,monospace;",
      "box-shadow:0 24px 64px rgba(0,0,0,.5);display:none;}",
      ".arq-tw.open{display:block;}",
      ".arq-tw__hd{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid rgba(168,187,201,.16);}",
      ".arq-tw__hd b{font-family:'Geist',sans-serif;font-weight:600;letter-spacing:.16em;font-size:11px;text-transform:uppercase;color:#A8BBC9;}",
      ".arq-tw__x{background:none;border:none;color:#8DA3B3;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;}",
      ".arq-tw__x:hover{color:#FAFAFA;}",
      ".arq-tw__bd{padding:6px 16px 16px;max-height:60vh;overflow:auto;}",
      ".arq-tw__g{padding:14px 0 4px;border-bottom:1px solid rgba(168,187,201,.10);}",
      ".arq-tw__g:last-child{border-bottom:none;}",
      ".arq-tw__l{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#cfd8de;margin:0 0 2px;}",
      ".arq-tw__s{font-size:9.5px;letter-spacing:.05em;color:#6f7f88;margin:0 0 11px;}",
      ".arq-tw__sw{display:flex;flex-wrap:wrap;gap:8px;}",
      ".arq-tw__sw button{width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.18);cursor:pointer;padding:0;position:relative;transition:transform .12s;}",
      ".arq-tw__sw button:hover{transform:scale(1.1);}",
      ".arq-tw__sw button.on{box-shadow:0 0 0 2px #1A1A1A,0 0 0 4px #A8BBC9;}",
      ".arq-tw__reset{margin-top:14px;width:100%;background:none;border:1px solid rgba(168,187,201,.3);color:#A8BBC9;font-family:inherit;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:9px;cursor:pointer;}",
      ".arq-tw__reset:hover{background:#A8BBC9;color:#10161A;}"
    ].join("");
    document.head.appendChild(css);

    panel = document.createElement("div");
    panel.className = "arq-tw";
    var html = '<div class="arq-tw__hd"><b>Tweaks</b><button class="arq-tw__x" aria-label="Close">\u00d7</button></div><div class="arq-tw__bd">';
    GROUPS.forEach(function (g, gi) {
      html += '<div class="arq-tw__g"><p class="arq-tw__l">' + g.label + '</p><p class="arq-tw__s">' + g.sub + '</p><div class="arq-tw__sw" data-g="' + gi + '">';
      g.options.forEach(function (c) {
        var cur = state[g.varName] || g.base;
        html += '<button data-c="' + c + '" class="' + (cur.toLowerCase() === c.toLowerCase() ? "on" : "") + '" style="background:' + c + '" title="' + c + '"></button>';
      });
      html += '</div></div>';
    });
    html += '<button class="arq-tw__reset">Reset to defaults</button></div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);

    panel.querySelector(".arq-tw__x").addEventListener("click", dismiss);
    panel.querySelector(".arq-tw__reset").addEventListener("click", function () {
      state = {}; save(state);
      GROUPS.forEach(function (g) { document.documentElement.style.removeProperty(g.varName); });
      refreshOn();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: {} }, "*");
    });
    panel.querySelectorAll(".arq-tw__sw").forEach(function (row) {
      row.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-c]"); if (!btn) return;
        var g = GROUPS[+row.getAttribute("data-g")];
        var c = btn.getAttribute("data-c");
        state[g.varName] = c; save(state);
        document.documentElement.style.setProperty(g.varName, c);
        refreshOn();
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: state }, "*");
      });
    });
  }

  function refreshOn() {
    if (!panel) return;
    GROUPS.forEach(function (g, gi) {
      var cur = state[g.varName] || g.base;
      panel.querySelectorAll('.arq-tw__sw[data-g="' + gi + '"] button').forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-c").toLowerCase() === cur.toLowerCase());
      });
    });
  }

  function show() { build(); panel.classList.add("open"); }
  function hide() { if (panel) panel.classList.remove("open"); }
  function dismiss() { hide(); window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); }

  window.addEventListener("message", function (e) {
    var t = e && e.data && e.data.type;
    if (t === "__activate_edit_mode") show();
    else if (t === "__deactivate_edit_mode") hide();
  });
  window.parent.postMessage({ type: "__edit_mode_available" }, "*");
})();
