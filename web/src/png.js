// Pixel Proofreader: exact PNG decoder (no canvas, no colour management).
//
// Browsers' canvas path can alter pixel values (colour management, alpha
// premultiplication), which would make pixel-exact checks unreliable, so we
// decode PNG ourselves. Supports colour types 0, 2, 3, 4, 6, bit depths
// 1/2/4/8/16, Adam7 interlacing and tRNS. 16-bit samples are reduced to their
// high byte. Colour-space chunks (gAMA, iCCP, sRGB, cHRM) are ignored on
// purpose: the tool inspects stored pixel values, not displayed colours.
//
// decode(bytes, inflate, opts) -> Promise<{ width, height, rgba, info }>
//   inflate(Uint8Array zlibData) -> Promise<Uint8Array> (DecompressionStream or zlib)
// Throws PngError with a human-readable message for malformed input.

var PixelProofreaderPng = (function () {
  "use strict";

  var SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  var DEFAULT_MAX_PIXELS = 4096 * 4096;

  function PngError(message) {
    var e = new Error(message);
    e.name = "PngError";
    return e;
  }

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes, start, end) {
    var c = 0xffffffff;
    for (var i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function u32(b, o) {
    return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  }

  var CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  var VALID_DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

  // Parses chunks; returns header, palette, transparency and the zlib stream.
  function parse(bytes, opts) {
    if (!(bytes instanceof Uint8Array)) throw PngError("Input is not binary data.");
    if (bytes.length < 8) throw PngError("Not a PNG file (too short).");
    for (var s = 0; s < 8; s++) {
      if (bytes[s] !== SIGNATURE[s]) throw PngError("Not a PNG file (bad signature).");
    }
    var pos = 8, ihdr = null, plte = null, trns = null, idat = [], idatLen = 0, sawEnd = false;
    while (pos < bytes.length) {
      if (pos + 12 > bytes.length) throw PngError("Truncated PNG chunk.");
      var len = u32(bytes, pos);
      var type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
      var dataStart = pos + 8, dataEnd = dataStart + len;
      if (len > 0x7fffffff || dataEnd + 4 > bytes.length) throw PngError("Truncated PNG chunk '" + type + "'.");
      if (crc32(bytes, pos + 4, dataEnd) !== u32(bytes, dataEnd)) {
        throw PngError("Corrupted PNG (CRC mismatch in '" + type + "' chunk).");
      }
      var data = bytes.subarray(dataStart, dataEnd);
      if (type === "IHDR") {
        if (len !== 13) throw PngError("Invalid IHDR chunk.");
        ihdr = {
          width: u32(data, 0), height: u32(data, 4), bitDepth: data[8], colorType: data[9],
          compression: data[10], filter: data[11], interlace: data[12],
        };
      } else if (!ihdr) {
        throw PngError("Invalid PNG (IHDR must come first).");
      } else if (type === "PLTE") {
        if (len % 3 !== 0 || len === 0 || len > 768) throw PngError("Invalid palette (PLTE).");
        plte = data;
      } else if (type === "tRNS") {
        trns = data;
      } else if (type === "IDAT") {
        idat.push(data);
        idatLen += len;
      } else if (type === "IEND") {
        sawEnd = true;
        break;
      } else if ((bytes[pos + 4] & 0x20) === 0) {
        throw PngError("Unsupported critical PNG chunk '" + type + "'.");
      }
      pos = dataEnd + 4;
    }
    if (!ihdr) throw PngError("Invalid PNG (missing IHDR).");
    if (!sawEnd) throw PngError("Truncated PNG (missing IEND).");
    if (idatLen === 0) throw PngError("Invalid PNG (no image data).");
    var h = ihdr;
    if (h.width === 0 || h.height === 0) throw PngError("Invalid PNG size 0.");
    var maxPixels = (opts && opts.maxPixels) || DEFAULT_MAX_PIXELS;
    if (h.width * h.height > maxPixels) {
      throw PngError("Image too large (" + h.width + "x" + h.height + "). Limit is " +
        maxPixels + " pixels.");
    }
    if (!CHANNELS.hasOwnProperty(h.colorType)) throw PngError("Unsupported PNG colour type " + h.colorType + ".");
    if (VALID_DEPTHS[h.colorType].indexOf(h.bitDepth) < 0) {
      throw PngError("Invalid bit depth " + h.bitDepth + " for colour type " + h.colorType + ".");
    }
    if (h.compression !== 0 || h.filter !== 0 || (h.interlace !== 0 && h.interlace !== 1)) {
      throw PngError("Unsupported PNG compression, filter or interlace method.");
    }
    if (h.colorType === 3 && !plte) throw PngError("Indexed PNG without a palette.");
    var z = new Uint8Array(idatLen), o = 0;
    for (var i = 0; i < idat.length; i++) { z.set(idat[i], o); o += idat[i].length; }
    return { header: h, plte: plte, trns: trns, zlib: z };
  }

  function paeth(a, b, c) {
    var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
  }

  // Unfilters one (sub)image in place; returns { data, rowBytes } or throws.
  function unfilter(raw, offset, w, h, bitsPerPixel) {
    var rowBytes = Math.ceil(w * bitsPerPixel / 8);
    var bpp = Math.max(1, bitsPerPixel >> 3);
    var out = new Uint8Array(rowBytes * h);
    var need = (rowBytes + 1) * h;
    if (offset + need > raw.length) throw PngError("Truncated image data.");
    for (var y = 0; y < h; y++) {
      var ft = raw[offset + y * (rowBytes + 1)];
      var src = offset + y * (rowBytes + 1) + 1;
      var dst = y * rowBytes, prev = dst - rowBytes;
      for (var x = 0; x < rowBytes; x++) {
        var a = x >= bpp ? out[dst + x - bpp] : 0;
        var b = y > 0 ? out[prev + x] : 0;
        var c = (x >= bpp && y > 0) ? out[prev + x - bpp] : 0;
        var v = raw[src + x];
        switch (ft) {
          case 0: break;
          case 1: v = v + a; break;
          case 2: v = v + b; break;
          case 3: v = v + ((a + b) >> 1); break;
          case 4: v = v + paeth(a, b, c); break;
          default: throw PngError("Invalid PNG filter type " + ft + ".");
        }
        out[dst + x] = v & 0xff;
      }
    }
    return { data: out, rowBytes: rowBytes, used: need };
  }

  // Reads sample n (0-based within the row) at the given bit depth.
  function sample(data, rowStart, n, depth) {
    if (depth === 8) return data[rowStart + n];
    if (depth === 16) return data[rowStart + 2 * n]; // high byte
    var perByte = 8 / depth;
    var byte = data[rowStart + Math.floor(n / perByte)];
    var shift = 8 - depth * (n % perByte + 1);
    return (byte >> shift) & ((1 << depth) - 1);
  }

  function sample16(data, rowStart, n) {
    return (data[rowStart + 2 * n] << 8) | data[rowStart + 2 * n + 1];
  }

  var ADAM7 = [
    [0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4],
    [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2],
  ];

  function toRgba(parsed, raw) {
    var h = parsed.header, W = h.width, H = h.height, depth = h.bitDepth, ct = h.colorType;
    var ch = CHANNELS[ct], bitsPerPixel = ch * depth;
    var rgba = new Uint8Array(W * H * 4);
    var scale = depth < 8 ? 255 / ((1 << depth) - 1) : 1;
    var plte = parsed.plte, trns = parsed.trns;
    var trnsKey = null;
    if (trns && ct === 0 && trns.length >= 2) trnsKey = [(trns[0] << 8) | trns[1]];
    if (trns && ct === 2 && trns.length >= 6) {
      trnsKey = [(trns[0] << 8) | trns[1], (trns[2] << 8) | trns[3], (trns[4] << 8) | trns[5]];
    }
    var paletteSize = plte ? plte.length / 3 : 0;

    function put(px, py, data, rowStart, n) {
      var o = (py * W + px) * 4, r, g, b, a = 255;
      if (ct === 3) {
        var idx = sample(data, rowStart, n, depth);
        if (idx >= paletteSize) throw PngError("Palette index out of range.");
        r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2];
        a = (trns && idx < trns.length) ? trns[idx] : 255;
      } else if (ct === 0 || ct === 4) {
        var v = sample(data, rowStart, n * (ct === 4 ? 2 : 1), depth);
        r = g = b = Math.round(v * scale);
        if (ct === 4) a = sample(data, rowStart, n * 2 + 1, depth);
        if (trnsKey) {
          var raw0 = depth === 16 ? sample16(data, rowStart, n) : v;
          if (raw0 === trnsKey[0]) a = 0;
        }
      } else {
        var k = ct === 6 ? 4 : 3;
        r = sample(data, rowStart, n * k, depth);
        g = sample(data, rowStart, n * k + 1, depth);
        b = sample(data, rowStart, n * k + 2, depth);
        if (ct === 6) a = sample(data, rowStart, n * k + 3, depth);
        if (trnsKey) {
          var rr = depth === 16 ? sample16(data, rowStart, n * 3) : r;
          var gg = depth === 16 ? sample16(data, rowStart, n * 3 + 1) : g;
          var bb = depth === 16 ? sample16(data, rowStart, n * 3 + 2) : b;
          if (rr === trnsKey[0] && gg === trnsKey[1] && bb === trnsKey[2]) a = 0;
        }
      }
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a;
    }

    if (h.interlace === 0) {
      var u = unfilter(raw, 0, W, H, bitsPerPixel);
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) put(x, y, u.data, y * u.rowBytes, x);
      }
    } else {
      var offset = 0;
      for (var p = 0; p < 7; p++) {
        var a7 = ADAM7[p];
        var pw = Math.ceil((W - a7[0]) / a7[2]), ph = Math.ceil((H - a7[1]) / a7[3]);
        if (pw <= 0 || ph <= 0) continue;
        var up = unfilter(raw, offset, pw, ph, bitsPerPixel);
        offset += up.used;
        for (var yy = 0; yy < ph; yy++) {
          for (var xx = 0; xx < pw; xx++) {
            put(a7[0] + xx * a7[2], a7[1] + yy * a7[3], up.data, yy * up.rowBytes, xx);
          }
        }
      }
    }
    return {
      width: W, height: H, rgba: rgba,
      info: { colorType: ct, bitDepth: depth, interlaced: h.interlace === 1, paletteSize: paletteSize },
    };
  }

  function decode(bytes, inflate, opts) {
    var parsed;
    try {
      parsed = parse(bytes, opts);
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve()
      .then(function () { return inflate(parsed.zlib); })
      .catch(function () { throw PngError("Corrupted PNG (image data cannot be decompressed)."); })
      .then(function (raw) { return toRgba(parsed, raw); });
  }

  // Browser inflate using the standard DecompressionStream ("deflate" = zlib).
  function browserInflate(data) {
    var ds = new DecompressionStream("deflate");
    var stream = new Blob([data]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  return { decode: decode, browserInflate: browserInflate, crc32: crc32, DEFAULT_MAX_PIXELS: DEFAULT_MAX_PIXELS };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PixelProofreaderPng;
