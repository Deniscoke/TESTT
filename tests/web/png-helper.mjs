// Test-only minimal PNG encoder (used to craft 16-bit, tRNS and malformed
// inputs). Not shipped in any bundle.
import zlib from "node:zlib";

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function ihdr(w, h, depth, colorType, interlace = 0) {
  const d = Buffer.alloc(13);
  d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4);
  d[8] = depth; d[9] = colorType; d[10] = 0; d[11] = 0; d[12] = interlace;
  return chunk("IHDR", d);
}

// rows: array of Buffers (raw scanline bytes without filter byte); filter 0.
export function png({ w, h, depth, colorType, rows, extra = [], filterByte = 0 }) {
  const raw = Buffer.concat(rows.map((r) => Buffer.concat([Buffer.from([filterByte]), r])));
  return Buffer.concat([SIG, ihdr(w, h, depth, colorType), ...extra,
    chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
