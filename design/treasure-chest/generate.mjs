// Treasure chest icon generator: composes layered pixel grids, validates, writes PNGs + a grid .js file.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT = process.argv[2];

// Palette: the app's own colors (lib/icons.ts) keep their letters; new shades are added for the 32px art.
export const COLORS = {
  k: "#2b1d14", // outline (app)
  i: "#1c120c", // chest interior darkness
  d: "#4a2c1a", // deep wood (lid inside)
  B: "#6b4226", // dark wood (app)
  b: "#9c6b3c", // wood (app)
  h: "#c99760", // wood highlight
  m: "#7a4a22", // bronze shadow
  n: "#b87333", // bronze
  N: "#e8a860", // bronze highlight
  o: "#b8801f", // dark gold (app)
  y: "#e8b33a", // gold (app)
  Y: "#f8d878", // light gold (app)
  w: "#fff8e7", // sparkle white (app)
  p: "#7d4fb0", // gem (app purple)
  P: "#b88ce0", // gem light (app)
  s: "#8a939c", // dull gem / cobweb shade (app grey)
  S: "#d0d7de", // cobweb (app light grey)
  r: "#c0392b", // mimic red (app)
  R: "#e8705f", // mimic tongue light (app)
  c: "#f4e4c1", // teeth (app parchment)
  C: "#d9bf8c", // teeth shade (app)
};

// ---------- 32×32 master ----------
const BACK32 = [
  "................................",
  "........kkkkkkkkkkkkkkkk........",
  "......kknnnnnnnnnnnnnnnnkk......",
  "....kknBBBBBBBBBBBBBBBBBBnkk....",
  "...knBddddddddddddddddddddBnk...",
  "...knBdmmddddddddddddddmmdBnk...",
  "...knBdmmddddddddddddddmmdBnk...",
  "...knBBmmBBBBBBBBBBBBBBmmBBnk...",
  "...knBdmmddddddddddddddmmdBnk...",
  "...knBBmmBBBBBBBBBBBBBBmmBBnk...",
  "...knBdmmddddddddddddddmmdBnk...",
  "...knnnnnnnnnnnnnnnnnnnnnnnnk...",
  "...khhhhhhhhhhhhhhhhhhhhhhhhk...",
  "...kdBBBBBBBBBBBBBBBBBBBBBBdk...",
  "...kdiiiiiiiiiiiiiiiiiiiiiidk...",
  "...kdiiiiiiiiiiiiiiiiiiiiiidk...",
  "...kdiiiiiiiiiiiiiiiiiiiiiidk...",
  "...kdiiiiiiiiiiiiiiiiiiiiiidk...",
];
const FRONT32 = [
  "...kNhhhhhhhhhhhhhhhhhhhhhhNk...", // 18 front rim
  "...knnnnnnnnnkNNNNknnnnnnnnnk...", // 19 top band + lock top
  "...kNnbNnbbbbknQqnkbbbbNnbnNk...", // 20
  "...khbbNnbbbbknqqnkbbbbNnbbBk...", // 21
  "...kbBBNnBBBBkmnnmkBBBBNnBBBk...", // 22 plank line
  "...khbbNnbbbbkmkkmkbbbbNnbbBk...", // 23 keyhole
  "...khbbNnbbbbbkkkkbbbbbNnbbBk...", // 24
  "...kbBBNnBBBBBBBBBBBBBBNnBBBk...", // 25 plank line
  "...khbbNnbbbbbbbbbbbbbbNnbbBk...", // 26
  "...kBBBNnBBBBBBBBBBBBBBNnBBBk...", // 27 shade
  "...kNnnnnnnnnnnnnnnnnnnnnnnNk...", // 28 bottom band
  "...kmmmmmmmmmmmmmmmmmmmmmmmmk...", // 29
  "....kkkkkkkkkkkkkkkkkkkkkkkk....", // 30
  "................................", // 31
];

const COIN32 = [".kkk.", "kYyyk", "kyook", ".kkk."];
const COIN32_EDGE = [".kk.", "kYyk", "kyok", "kyok", ".kk."]; // coin standing on edge
const SPARK = [".w.", "wYw", ".w."];

// ---------- 16×16 glyph ----------
const BACK16 = [
  "................",
  "................",
  "...kkkkkkkkkk...",
  "..kndddddddddk..",
  "..kndBBBBBBBnk..".replace("kndBBBBBBBnk", "knBBBBBBBBnk"),
  ".kkkkkkkkkkkkkk.",
  ".kiiiiiiiiiiiik.",
  ".kiiiiiiiiiiiik.",
];
BACK16[3] = "..knddddddddnk..";
const FRONT16 = [
  ".khhhhhhhhhhhhk.", // 8 rim
  ".kbnbbbkkbbbnbk.", // 9
  ".kbnbbkqQkbbnbk.", // 10 gem
  ".kbnbbbkkbbbnbk.", // 11
  ".kBnBBBBBBBBnBk.", // 12
  ".kkkkkkkkkkkkkk.", // 13
  "................",
  "................",
];

// ---------- helpers ----------
const blank = (n) => Array.from({ length: n }, () => Array(n).fill("."));
function stamp(g, art, x, y) {
  art.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch !== "." && g[y + dy] && g[y + dy][x + dx] !== undefined) g[y + dy][x + dx] = ch;
    })
  );
}
function stampRows(g, rows, y0) {
  rows.forEach((row, dy) => [...row].forEach((ch, x) => { if (ch !== ".") g[y0 + dy][x] = ch; }));
}

// Coin-pile texture: offset rows of small coins (light top, gold body, dark rim).
function tex(x, y) {
  const shift = (Math.floor(y / 2) % 2) * 2;
  const t = (x + shift) % 4;
  if (y % 2 === 0) return ["Y", "y", "y", "o"][t];
  return ["y", "o", "y", "y"][t];
}

// Mound of gold: parabola profile with a lumpy coin silhouette.
function pile(g, { peak, k, cx, x0, x1, floor, outline = true }) {
  const bump = [0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0];
  const tops = {};
  for (let x = x0; x <= x1; x++) {
    let top = Math.round(peak + k * (x - cx) ** 2) + bump[x % bump.length];
    if (top > floor) continue;
    tops[x] = top;
    for (let y = top; y <= floor; y++) g[y][x] = y === top ? (x % 3 === 0 ? "y" : "Y") : tex(x, y);
  }
  if (outline) {
    for (const [xs, top] of Object.entries(tops)) {
      const x = +xs;
      if (top - 1 >= 0) g[top - 1][x] = "k";
      // close the sides where the neighbour column is lower
      for (const nx of [x - 1, x + 1]) {
        const nt = tops[nx];
        const lowest = nt === undefined ? floor : nt - 1;
        for (let y = top; y <= Math.min(lowest, floor); y++) if (nt === undefined || y < nt) g[y][nx] = g[y][nx] === "." ? "." : "k";
      }
    }
  }
}

const GEM = {
  bright: { q: "p", Q: "w" },
  normal: { q: "p", Q: "P" },
  dull: { q: "s", Q: "S" },
  angry: { q: "r", Q: "R" },
};

function finish(g, gem) {
  const map = GEM[gem];
  return g.map((row) => row.map((ch) => map[ch] ?? ch).join(""));
}

// ---------- states ----------
export const STATES = [
  { id: "wealthy", name: "Wealthy", range: "80–100%" },
  { id: "comfortable", name: "Comfortable", range: "60–79%" },
  { id: "cautious", name: "Cautious", range: "40–59%" },
  { id: "low", name: "Low", range: "20–39%" },
  { id: "critical", name: "Critical", range: "0–19%" },
  { id: "overspent", name: "Overspent", range: "below 0%" },
];

function chest32(state) {
  const g = blank(32);
  stampRows(g, BACK32, 0);
  const P = { cx: 15.5, x0: 4, x1: 27, floor: 17 };
  let gem = "normal";
  const late = []; // stamped after the front wall
  if (state === "wealthy") {
    pile(g, { ...P, peak: 3, k: 0.062 });
    gem = "bright";
    late.push([COIN32, 5, 16], [COIN32, 3, 19], [COIN32, 22, 17], [COIN32, 0, 26], [COIN32, 26, 27], [COIN32, 3, 28]);
    late.push([SPARK, 4, 1], [SPARK, 25, 4], [SPARK, 17, 0]);
  } else if (state === "comfortable") {
    pile(g, { ...P, peak: 8, k: 0.038 });
    late.push([SPARK, 23, 6]);
  } else if (state === "cautious") {
    pile(g, { ...P, peak: 13, k: 0.016 });
  } else if (state === "low") {
    pile(g, { ...P, peak: 15, k: 0.075 });
  } else if (state === "critical") {
    gem = "dull";
    // cobweb in the back-left corner
    stamp(g, ["SsS..", "sS...", "S....", "....."], 5, 13);
    stamp(g, ["..S", ".sS", "SsS"].map((r) => r.split("").reverse().join("")), 24, 13);
    late.push([COIN32, 12, 14], [COIN32, 17, 15]);
  }
  stampRows(g, FRONT32, 18);
  for (const [art, x, y] of late) stamp(g, art, x, y);
  return finish(g, gem);
}

function mimic32(frame) {
  const g = blank(32);
  stampRows(g, BACK32, 0);
  for (let x = 4; x <= 27; x++) { g[12][x] = "i"; g[13][x] = "i"; }
  // upper fangs hang from the lid edge
  for (const x of [5, 9, 13, 17, 21, 25]) { g[12][x] = "c"; g[12][x + 1] = "C"; g[13][x] = "c"; }
  // angry glowing eyes (inner corners drop)
  if (frame === 0) {
    stamp(g, ["YY.", "YrY"], 9, 14);
    stamp(g, [".YY", "YrY"], 20, 14);
  } else {
    stamp(g, ["YYY"], 9, 15);
    stamp(g, ["YYY"], 20, 15);
  }
  // lower fangs point up from the front rim
  for (const x of [5, 16, 20, 24]) { g[17][x] = "c"; g[17][x + 1] = "C"; g[16][x] = "c"; }
  stampRows(g, FRONT32, 18);
  // tongue lolling over the front, left of the lock
  stamp(g, [
    ".RRRRR.",
    "kRRrRRk",
    "kRRrRRk",
    ".kRrRk.",
    ".kRrRk.",
    "..kRk..",
    "...k...",
  ], 6, 17);
  return finish(g, "angry");
}

function chest16(state) {
  const g = blank(16);
  stampRows(g, BACK16, 0);
  const P = { cx: 7.5, x0: 3, x1: 12, floor: 7 };
  let gem = "normal";
  const late = [];
  if (state === "wealthy") {
    pile(g, { ...P, peak: 1, k: 0.11, outline: false });
    gem = "bright";

  } else if (state === "comfortable") pile(g, { ...P, peak: 4, k: 0.06, outline: false });
  else if (state === "cautious") pile(g, { ...P, peak: 6, k: 0.03 });
  else if (state === "low") pile(g, { ...P, peak: 7, k: 0.12 });
  else if (state === "critical") {
    gem = "dull";
    stamp(g, ["Ss", "s."], 2, 6);
    late.push([["Yo"], 7, 7]);
  }
  stampRows(g, FRONT16, 8);
  for (const [art, x, y] of late) stamp(g, art, x, y);
  // wealthy: gold spills over the rim
  if (state === "wealthy") { g[8][4] = "y"; g[8][10] = "Y"; g[9][10] = "o"; }
  return finish(g, gem);
}

function mimic16() {
  const g = blank(16);
  stampRows(g, BACK16, 0);
  for (const x of [2, 7, 12]) g[6][x + (x === 12 ? 1 : 0)] = "c";
  stamp(g, ["Y", "r"].slice(0, 1), 5, 6); stamp(g, ["Y"], 10, 6);
  g[6][4] = "Y"; g[6][11] = "Y";
  for (const x of [8, 12]) g[7][x] = "c";
  stampRows(g, FRONT16, 8);
  g[7][3] = "R"; g[8][3] = "R"; g[9][3] = "r";
  return finish(g, "angry");
}

// ---------- build ----------
const art = { 32: {}, 16: {} };
for (const s of STATES) {
  art[32][s.id] = s.id === "overspent" ? mimic32(0) : chest32(s.id);
  art[16][s.id] = s.id === "overspent" ? mimic16() : chest16(s.id);
}
art[32]["overspent-blink"] = mimic32(1);

// validate
for (const size of [32, 16]) for (const [id, rows] of Object.entries(art[size])) {
  if (rows.length !== size) throw new Error(`${size}/${id}: ${rows.length} rows`);
  rows.forEach((r, i) => {
    if (r.length !== size) throw new Error(`${size}/${id} row ${i}: ${r.length} cols`);
    for (const ch of r) if (ch !== "." && !COLORS[ch]) throw new Error(`${size}/${id} row ${i}: unknown '${ch}'`);
  });
}

// PNG
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(rows, scale) {
  const n = rows.length * scale;
  const raw = Buffer.alloc((n * 4 + 1) * n);
  for (let y = 0; y < n; y++) {
    raw[y * (n * 4 + 1)] = 0;
    for (let x = 0; x < n; x++) {
      const ch = rows[Math.floor(y / scale)][Math.floor(x / scale)];
      const o = y * (n * 4 + 1) + 1 + x * 4;
      if (ch === ".") continue;
      const hex = COLORS[ch];
      raw[o] = parseInt(hex.slice(1, 3), 16); raw[o + 1] = parseInt(hex.slice(3, 5), 16); raw[o + 2] = parseInt(hex.slice(5, 7), 16); raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

if (OUT) {
  fs.mkdirSync(path.join(OUT, "png"), { recursive: true });
  for (const size of [32, 16]) for (const [id, rows] of Object.entries(art[size]))
    for (const scale of size === 32 ? [1, 2, 3] : [1, 2, 3, 4]) fs.writeFileSync(path.join(OUT, "png", `chest-${size}-${id}@${scale}x.png`), png(rows, scale));
  // contact sheet for review: all states, 32px @8x and 16px @8x
  const sheet = (size, ids, sc) => {
    const W = ids.length * (size + 2);
    const rows = Array.from({ length: size + 2 }, (_, y) => Array.from({ length: W }, (_, x) => {
      const i = Math.floor(x / (size + 2)), lx = x % (size + 2) - 1, ly = y - 1;
      return lx >= 0 && lx < size && ly >= 0 && ly < size ? art[size][ids[i]][ly][lx] : ".";
    }).join(""));
    return { rows, sc };
  };
  const writeSheet = (name, { rows, sc }) => {
    // non-square png
    const h = rows.length * sc, w = rows[0].length * sc;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[Math.floor(y / sc)][Math.floor(x / sc)]; const o = y * (w * 4 + 1) + 1 + x * 4;
      const hex = ch === "." ? ((Math.floor(x / sc / 4) + Math.floor(y / sc / 4)) % 2 ? "#e8e4dc" : "#cfcabf") : COLORS[ch];
      raw[o] = parseInt(hex.slice(1, 3), 16); raw[o + 1] = parseInt(hex.slice(3, 5), 16); raw[o + 2] = parseInt(hex.slice(5, 7), 16); raw[o + 3] = 255;
    }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    fs.writeFileSync(path.join(OUT, name), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
  };
  const ids = STATES.map((s) => s.id);
  writeSheet("sheet-32.png", sheet(32, [...ids, "overspent-blink"], 8));
  writeSheet("sheet-16.png", sheet(16, ids, 10));

  const js = `// Treasure chest "Gold Remaining" icon family. Same letter-grid format as lib/icons.ts.
// 32×32 = detailed master (show at 32, 64, 96 px). 16×16 = glyph (show at 16, 48 px, or beside pouch icons).
// "." is see-through. States: ${ids.join(", ")} (+ overspent-blink, a 2nd mimic frame).

export const CHEST_COLORS = ${JSON.stringify(COLORS, null, 2)};

export const CHEST_STATES = ${JSON.stringify(STATES, null, 2)};

export const CHEST_32 = ${JSON.stringify(art[32], null, 2)};

export const CHEST_16 = ${JSON.stringify(art[16], null, 2)};
`;
  fs.writeFileSync(path.join(OUT, "treasure-chest-art.js"), js);
  fs.writeFileSync(path.join(OUT, "art.json"), JSON.stringify({ COLORS, STATES, art }));
}
console.log("ok");
