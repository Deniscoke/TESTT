// Pixel Proofreader: canvas viewer with crisp nearest-neighbour zoom, pan
// and an issue overlay drawn on top. The source pixels are never modified.

var PixelProofreaderViewer = (function () {
  "use strict";

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var state = { img: null, markers: [], visible: {}, colors: {}, zoom: 1, ox: 0, oy: 0,
      showOverlay: true, hover: null };
    var source = document.createElement("canvas");

    function resize() {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw();
    }

    function fit() {
      if (!state.img) return;
      var pad = 24 * (window.devicePixelRatio || 1);
      var z = Math.min((canvas.width - pad) / state.img.width, (canvas.height - pad) / state.img.height);
      state.zoom = Math.max(1, Math.floor(z));
      if (z < 1) state.zoom = z;
      center();
    }

    function center() {
      state.ox = Math.round((canvas.width - state.img.width * state.zoom) / 2);
      state.oy = Math.round((canvas.height - state.img.height * state.zoom) / 2);
      draw();
      if (opts.onZoom) opts.onZoom(state.zoom);
    }

    function setZoom(z, cx, cy) {
      if (!state.img) return;
      z = Math.min(64, Math.max(0.25, z));
      if (cx === undefined) { cx = canvas.width / 2; cy = canvas.height / 2; }
      var ix = (cx - state.ox) / state.zoom, iy = (cy - state.oy) / state.zoom;
      state.zoom = z;
      state.ox = Math.round(cx - ix * z);
      state.oy = Math.round(cy - iy * z);
      draw();
      if (opts.onZoom) opts.onZoom(z);
    }

    function checker(x, y, w, h) {
      var s = 8 * (window.devicePixelRatio || 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = "#cfd3da"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#e9ecf1";
      for (var yy = Math.floor(y / s) * s; yy < y + h; yy += s) {
        for (var xx = Math.floor(x / s) * s; xx < x + w; xx += s) {
          if (((xx / s) + (yy / s)) % 2 === 0) ctx.fillRect(xx, yy, s, s);
        }
      }
      ctx.restore();
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!state.img) return;
      var w = state.img.width * state.zoom, h = state.img.height * state.zoom;
      checker(state.ox, state.oy, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, state.ox, state.oy, w, h);
      if (state.showOverlay) {
        var z = state.zoom, lw = Math.max(1, Math.round(z / 6));
        for (var i = 0; i < state.markers.length; i++) {
          var m = state.markers[i];
          if (!state.visible[m.rule]) continue;
          var px = state.ox + m.x * z, py = state.oy + m.y * z;
          if (px + z < 0 || py + z < 0 || px > canvas.width || py > canvas.height) continue;
          ctx.strokeStyle = state.colors[m.rule];
          ctx.fillStyle = state.colors[m.rule];
          if (z >= 4) {
            ctx.lineWidth = lw;
            ctx.strokeRect(px + lw / 2, py + lw / 2, z - lw, z - lw);
          } else {
            ctx.globalAlpha = 0.85;
            ctx.fillRect(px, py, Math.max(1, z), Math.max(1, z));
            ctx.globalAlpha = 1;
          }
        }
      }
      if (state.hover && state.zoom >= 2) {
        ctx.strokeStyle = "rgba(20,20,30,0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(state.ox + state.hover.x * state.zoom + 0.5,
          state.oy + state.hover.y * state.zoom + 0.5, state.zoom - 1, state.zoom - 1);
      }
    }

    function setImage(decoded) {
      source.width = decoded.width;
      source.height = decoded.height;
      var sctx = source.getContext("2d");
      var id = sctx.createImageData(decoded.width, decoded.height);
      id.data.set(decoded.rgba);
      sctx.putImageData(id, 0, 0);
      state.img = { width: decoded.width, height: decoded.height };
      state.hover = null;
      resize();
      fit();
    }

    function toImage(ev) {
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var cx = (ev.clientX - r.left) * dpr, cy = (ev.clientY - r.top) * dpr;
      return { cx: cx, cy: cy, x: Math.floor((cx - state.ox) / state.zoom),
        y: Math.floor((cy - state.oy) / state.zoom) };
    }

    var drag = null;
    canvas.addEventListener("pointerdown", function (ev) {
      drag = { x: ev.clientX, y: ev.clientY, ox: state.ox, oy: state.oy };
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener("pointermove", function (ev) {
      var dpr = window.devicePixelRatio || 1;
      if (drag) {
        state.ox = drag.ox + (ev.clientX - drag.x) * dpr;
        state.oy = drag.oy + (ev.clientY - drag.y) * dpr;
        draw();
        return;
      }
      if (!state.img) return;
      var p = toImage(ev);
      var inside = p.x >= 0 && p.y >= 0 && p.x < state.img.width && p.y < state.img.height;
      state.hover = inside ? { x: p.x, y: p.y } : null;
      draw();
      if (opts.onHover) opts.onHover(state.hover);
    });
    function endDrag() { drag = null; }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", function () {
      state.hover = null; draw(); if (opts.onHover) opts.onHover(null);
    });
    canvas.addEventListener("wheel", function (ev) {
      if (!state.img) return;
      ev.preventDefault();
      var p = toImage(ev);
      var factor = ev.deltaY < 0 ? 1.25 : 0.8;
      var z = state.zoom * factor;
      if (z >= 1) z = Math.round(z) || 1;
      setZoom(z, p.cx, p.cy);
    }, { passive: false });
    window.addEventListener("resize", resize);

    return {
      setImage: setImage,
      setMarkers: function (markers, colors) { state.markers = markers; state.colors = colors; draw(); },
      setVisible: function (visible) { state.visible = visible; draw(); },
      setOverlay: function (on) { state.showOverlay = on; draw(); },
      zoomIn: function () { setZoom(state.zoom < 1 ? state.zoom * 2 : state.zoom + Math.max(1, Math.round(state.zoom / 4))); },
      zoomOut: function () { setZoom(state.zoom <= 1 ? state.zoom / 2 : state.zoom - Math.max(1, Math.round(state.zoom / 5))); },
      actualSize: function () { setZoom(1); center(); },
      fit: fit,
      resize: resize,
      getZoom: function () { return state.zoom; },
    };
  }

  return { create: create };
})();
