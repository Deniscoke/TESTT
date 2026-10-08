// Pixel Proofreader Free: UI wiring. Single image, three checks, visual overlay.
(function () {
  "use strict";
  var Png = PixelProofreaderPng, A = PixelProofreaderAnalysis;
  var CONFIG = window.PIXEL_PROOFREADER_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  var app = $("app"), workspace = $("workspace"), dropzone = $("dropzone"), errorBox = $("error");
  var current = null, visible = {};
  A.RULES.forEach(function (r) { visible[r.id] = true; });

  var viewer = PixelProofreaderViewer.create($("canvas"), {
    onZoom: function (z) { $("zoomLabel").textContent = Math.round(z * 100) + "%"; },
    onHover: showHover,
  });

  // ---- Pro card: honest about availability ----
  if (CONFIG.proUrl) {
    $("proLink").href = CONFIG.proUrl;
    $("proLink").textContent = "Get Pro on itch.io";
    $("proNote").textContent = "One-time purchase. Opens the store page in a new tab.";
  } else {
    $("proLink").removeAttribute("href");
    $("proLink").setAttribute("aria-disabled", "true");
    $("proLink").textContent = "Pro: coming soon";
    $("proNote").textContent = "Pro is not released yet. Everything above in this panel describes the planned Pro edition.";
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    clearTimeout(showError.t);
    showError.t = setTimeout(function () { errorBox.hidden = true; }, 7000);
  }

  function hex2(n) { return (n < 16 ? "0" : "") + n.toString(16); }

  function showHover(p) {
    var bar = $("statusbar");
    if (!p || !current) {
      bar.textContent = "Hover over the image to inspect pixels. Drag to pan, scroll to zoom.";
      return;
    }
    var o = (p.y * current.decoded.width + p.x) * 4, d = current.decoded.rgba;
    var hex = "#" + hex2(d[o]) + hex2(d[o + 1]) + hex2(d[o + 2]);
    var hits = A.RULES.filter(function (r) {
      return current.index[r.id] && current.index[r.id][p.y * current.decoded.width + p.x];
    }).map(function (r) { return r.label; });
    bar.innerHTML = "";
    bar.append("x " + p.x + ", y " + p.y + " ·");
    var sw = document.createElement("span");
    sw.className = "px";
    sw.style.background = d[o + 3] ? "rgba(" + d[o] + "," + d[o + 1] + "," + d[o + 2] + "," + (d[o + 3] / 255) + ")" : "transparent";
    bar.append(sw, hex + " · alpha " + d[o + 3] + (hits.length ? " · " + hits.join(", ") : ""));
  }

  function renderRules() {
    var ul = $("rules");
    ul.innerHTML = "";
    A.RULES.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "rule";
      var count = current ? current.analysis.counts[r.id] : 0;
      li.innerHTML =
        '<label class="rule-head"><input type="checkbox"' + (visible[r.id] ? " checked" : "") + '>' +
        '<span class="swatch" style="background:' + r.color + '"></span>' +
        '<span class="rule-label"></span><span class="tag"></span><span class="count"></span></label>' +
        '<details><summary></summary><p></p></details>';
      li.querySelector(".rule-label").textContent = r.label;
      li.querySelector(".tag").textContent = r.kind === "technical" ? "technical" : "suggestion";
      li.querySelector(".count").textContent = count;
      li.querySelector("summary").textContent = r.short;
      li.querySelector("p").textContent = r.long;
      li.querySelector("input").setAttribute("aria-label", "Show " + r.label + " (" + count + ")");
      li.querySelector("input").addEventListener("change", function (ev) {
        visible[r.id] = ev.target.checked;
        viewer.setVisible(visible);
      });
      ul.appendChild(li);
    });
  }

  function run() {
    var analysis = A.analyze(current.decoded, { orphan: { skipIsolated: $("skipIsolated").checked } });
    var markers = [], colors = {}, index = {};
    A.RULES.forEach(function (r) {
      colors[r.id] = r.color;
      index[r.id] = {};
      (analysis.results[r.id] || []).forEach(function (f) {
        markers.push({ x: f.x, y: f.y, rule: r.id });
        index[r.id][f.y * current.decoded.width + f.x] = true;
      });
    });
    current.analysis = analysis;
    current.index = index;
    viewer.setMarkers(markers, colors);
    viewer.setVisible(visible);
    var s = $("summary");
    s.textContent = A.summarize(analysis);
    s.classList.toggle("clean", analysis.flaggedPixels === 0);
    renderRules();
  }

  function load(name, bytes) {
    return Png.decode(bytes, Png.browserInflate).then(function (decoded) {
      current = { name: name, decoded: decoded };
      app.classList.remove("empty");
      dropzone.hidden = true;
      workspace.hidden = false;
      $("fileName").textContent = name;
      run();
      $("fileMeta").textContent = decoded.width + " × " + decoded.height + " px · " +
        current.analysis.stats.colorCount + " colours · analysed in " + current.analysis.ms + " ms";
      viewer.setImage(decoded);
      errorBox.hidden = true;
    }).catch(function (e) {
      showError((e && e.name === "PngError") ? e.message : "This file could not be read as a PNG.");
    });
  }

  function readFile(file) {
    if (!file) return;
    if (!/\.png$/i.test(file.name) && file.type !== "image/png") {
      showError("Please choose a PNG file. Other formats are not supported.");
      return;
    }
    file.arrayBuffer().then(function (buf) { return load(file.name, new Uint8Array(buf)); });
  }

  $("fileInput").addEventListener("change", function (e) { readFile(e.target.files[0]); e.target.value = ""; });
  $("fileInput2").addEventListener("change", function (e) { readFile(e.target.files[0]); e.target.value = ""; });
  $("sampleBtn").addEventListener("click", function () {
    var b64 = CONFIG.sample || "";
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    load("sample-potion.png", bytes);
  });
  $("skipIsolated").addEventListener("change", function () { if (current) run(); });
  $("overlayToggle").addEventListener("change", function (e) { viewer.setOverlay(e.target.checked); });
  $("zoomIn").addEventListener("click", viewer.zoomIn);
  $("zoomOut").addEventListener("click", viewer.zoomOut);
  $("fitBtn").addEventListener("click", viewer.fit);
  $("oneBtn").addEventListener("click", viewer.actualSize);
  $("privacyBtn").addEventListener("click", function () { $("privacyDialog").showModal(); });

  document.addEventListener("keydown", function (e) {
    if (!current || e.target.tagName === "INPUT") return;
    if (e.key === "+" || e.key === "=") viewer.zoomIn();
    else if (e.key === "-") viewer.zoomOut();
    else if (e.key === "0") viewer.fit();
  });

  var depth = 0;
  document.addEventListener("dragenter", function (e) { e.preventDefault(); depth++; document.body.classList.add("dragging"); });
  document.addEventListener("dragleave", function () { if (--depth <= 0) { depth = 0; document.body.classList.remove("dragging"); } });
  document.addEventListener("dragover", function (e) { e.preventDefault(); });
  document.addEventListener("drop", function (e) {
    e.preventDefault();
    depth = 0;
    document.body.classList.remove("dragging");
    var f = e.dataTransfer && e.dataTransfer.files;
    if (f && f.length > 1) showError("The Free edition checks one image at a time. Analysing the first file.");
    if (f && f.length) readFile(f[0]);
  });

  renderRules();
  window.PixelProofreaderApp = { load: load, state: function () { return current; } };
})();
