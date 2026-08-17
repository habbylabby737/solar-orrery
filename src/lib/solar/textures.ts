import * as THREE from "three";
import type { BodyId, BodyKind } from "./bodies";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hash(ix: number, iy: number, seed: number) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number, xPeriod: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);
  const wrap = (i: number) => ((i % xPeriod) + xPeriod) % xPeriod;
  const v00 = hash(wrap(x0), y0, seed);
  const v10 = hash(wrap(x0 + 1), y0, seed);
  const v01 = hash(wrap(x0), y0 + 1, seed);
  const v11 = hash(wrap(x0 + 1), y0 + 1, seed);
  return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
}

function fbm(x: number, y: number, seed: number, xPeriod: number, octaves = 5) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 19, Math.max(1, Math.round(xPeriod * freq)));
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function setRgb(
  data: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function canvasTexture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D, img: ImageData) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  const img = ctx.createImageData(w, h);
  paint(ctx, img);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function paintSun(data: Uint8ClampedArray, w: number, h: number) {
  const period = 8;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const n = fbm(u * period, v * 6, 3, period, 6);
      const spot = fbm(u * 14, v * 10, 44, 14, 3);
      const limb = 1 - Math.pow(Math.abs(v - 0.5) * 1.6, 2) * 0.18;
      let r = 255 * lerp(0.86, 1, n) * limb;
      let g = 255 * lerp(0.52, 0.82, n) * limb;
      let b = 255 * lerp(0.16, 0.38, n * 0.7) * limb;
      if (spot < 0.32) {
        const k = (0.32 - spot) * 1.6;
        r *= 1 - k * 0.45;
        g *= 1 - k * 0.5;
        b *= 1 - k * 0.35;
      }
      setRgb(data, (y * w + x) * 4, r, g, b);
    }
  }
}

function paintMercury(data: Uint8ClampedArray, w: number, h: number) {
  const period = 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const n = fbm(u * period, v * 8, 11, period, 6);
      const c = lerp(92, 168, n);
      setRgb(data, (y * w + x) * 4, c, c * 0.97, c * 0.93);
    }
  }
  for (let i = 0; i < 70; i++) {
    const cx = hash(i, 2, 90) * w;
    const cy = hash(i, 5, 91) * h;
    const rad = 2 + hash(i, 8, 92) * 9;
    stampCrater(data, w, h, cx, cy, rad, 0.55);
  }
}

function stampCrater(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rad: number,
  dark: number,
) {
  const r2 = rad * rad;
  for (let y = Math.max(0, cy - rad); y < Math.min(h, cy + rad); y++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const x = ((cx + dx) % w + w) % w;
      const ddx = dx;
      const ddy = y - cy;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > r2) continue;
      const t = Math.sqrt(d2) / rad;
      const i = (Math.floor(y) * w + Math.floor(x)) * 4;
      const k = t > 0.82 ? 1.12 : 1 - (1 - t) * dark;
      data[i] = Math.min(255, data[i] * k);
      data[i + 1] = Math.min(255, data[i + 1] * k);
      data[i + 2] = Math.min(255, data[i + 2] * k);
    }
  }
}

function paintVenus(data: Uint8ClampedArray, w: number, h: number) {
  const period = 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const swirl = fbm(u * period + v * 2.4, v * 7, 21, period, 5);
      const band = Math.sin((v + swirl * 0.12) * Math.PI * 9);
      const col = mixRgb([214, 186, 122], [240, 226, 176], swirl * 0.7 + band * 0.15);
      setRgb(data, (y * w + x) * 4, col[0], col[1], col[2]);
    }
  }
}

function paintEarth(data: Uint8ClampedArray, w: number, h: number) {
  const period = 7;
  const ocean: [number, number, number] = [32, 96, 178];
  const shallow: [number, number, number] = [58, 154, 186];
  const grass: [number, number, number] = [72, 138, 74];
  const desert: [number, number, number] = [186, 158, 92];
  const rock: [number, number, number] = [110, 100, 86];
  const ice: [number, number, number] = [236, 240, 244];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const lat = v * 2 - 1;
      const land = fbm(u * period, v * 5.2, 7, period, 6);
      const climate = fbm(u * 4, v * 4, 17, 4, 3);
      const polar = Math.abs(lat) > 0.78 + land * 0.08 || Math.abs(lat) > 0.9;
      let col: [number, number, number];
      if (polar) {
        col = ice;
      } else if (land > 0.54) {
        const arid = climate > 0.56 && Math.abs(lat) < 0.45;
        const alpine = land > 0.72;
        col = alpine ? rock : arid ? desert : grass;
        const shade = (land - 0.54) * 0.7;
        col = mixRgb(col, rock, shade * 0.35);
      } else if (land > 0.5) {
        col = mixRgb(shallow, grass, (land - 0.5) / 0.04);
      } else {
        col = mixRgb(ocean, shallow, Math.max(0, (land - 0.38) / 0.12));
      }
      setRgb(data, (y * w + x) * 4, col[0], col[1], col[2]);
    }
  }
}

function paintClouds(data: Uint8ClampedArray, w: number, h: number, seed: number, density: number) {
  const period = 8;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const n = fbm(u * period, v * 5, seed, period, 5);
      const a = Math.max(0, (n - density) / (1 - density));
      const alpha = Math.min(255, a * a * 230);
      setRgb(data, (y * w + x) * 4, 245, 248, 252, alpha);
    }
  }
}

function paintMars(data: Uint8ClampedArray, w: number, h: number) {
  const period = 8;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const lat = v * 2 - 1;
      const n = fbm(u * period, v * 6, 31, period, 6);
      const dark = fbm(u * 5, v * 4, 39, 5, 3);
      let col = mixRgb([168, 84, 46], [214, 126, 74], n);
      if (dark < 0.4) col = mixRgb(col, [92, 48, 32], (0.4 - dark) * 1.4);
      if (Math.abs(lat) > 0.82) col = mixRgb(col, [236, 236, 240], (Math.abs(lat) - 0.82) / 0.18);
      setRgb(data, (y * w + x) * 4, col[0], col[1], col[2]);
    }
  }
}

function paintGas(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bands: [number, number, number][],
  seed: number,
  spot?: { u: number; v: number; rw: number; rh: number; color: [number, number, number] },
) {
  const period = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const warp = fbm(u * period, v * 3, seed, period, 4);
      const vy = v + (warp - 0.5) * 0.08;
      const idx = Math.min(bands.length - 1, Math.max(0, Math.floor(vy * bands.length)));
      const next = Math.min(bands.length - 1, idx + 1);
      const ft = vy * bands.length - idx;
      let col = mixRgb(bands[idx], bands[next], fade(ft));
      const grain = fbm(u * 18, v * 14, seed + 8, 18, 3);
      col = mixRgb(col, [col[0] * 0.85, col[1] * 0.85, col[2] * 0.85], grain * 0.25);
      if (spot) {
        const du = Math.min(Math.abs(u - spot.u), 1 - Math.abs(u - spot.u)) / spot.rw;
        const dv = (v - spot.v) / spot.rh;
        const d = du * du + dv * dv;
        if (d < 1) col = mixRgb(col, spot.color, (1 - d) * 0.85);
      }
      setRgb(data, (y * w + x) * 4, col[0], col[1], col[2]);
    }
  }
}

function paintIce(data: Uint8ClampedArray, w: number, h: number, a: [number, number, number], b: [number, number, number], seed: number) {
  const period = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const n = fbm(u * period, v * 8, seed, period, 4);
      const band = Math.sin((v + n * 0.05) * Math.PI * 10) * 0.5 + 0.5;
      const col = mixRgb(a, b, n * 0.65 + band * 0.2);
      setRgb(data, (y * w + x) * 4, col[0], col[1], col[2]);
    }
  }
}

export function makeBodyTexture(id: BodyId, kind: BodyKind): THREE.CanvasTexture {
  const big = id === "earth" || id === "jupiter" || id === "sun";
  const w = big ? 1024 : 512;
  const h = big ? 512 : 256;
  return canvasTexture(w, h, (_ctx, img) => {
    const d = img.data;
    switch (id) {
      case "sun":
        paintSun(d, w, h);
        break;
      case "mercury":
        paintMercury(d, w, h);
        break;
      case "venus":
        paintVenus(d, w, h);
        break;
      case "earth":
        paintEarth(d, w, h);
        break;
      case "mars":
        paintMars(d, w, h);
        break;
      case "jupiter":
        paintGas(
          d,
          w,
          h,
          [
            [210, 176, 132],
            [186, 142, 96],
            [232, 214, 176],
            [168, 118, 78],
            [220, 188, 140],
            [196, 154, 108],
            [236, 220, 186],
            [174, 128, 86],
          ],
          51,
          { u: 0.34, v: 0.62, rw: 0.07, rh: 0.08, color: [176, 72, 48] },
        );
        break;
      case "saturn":
        paintGas(
          d,
          w,
          h,
          [
            [226, 206, 154],
            [210, 184, 128],
            [236, 220, 176],
            [198, 172, 118],
            [228, 210, 160],
          ],
          61,
        );
        break;
      case "uranus":
        paintIce(d, w, h, [154, 206, 210], [196, 228, 228], 71);
        break;
      case "neptune":
        paintIce(d, w, h, [46, 78, 168], [92, 132, 214], 81);
        break;
      default:
        if (kind === "rocky") paintMercury(d, w, h);
        break;
    }
  });
}

export function makeCloudTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 512, (_ctx, img) => paintClouds(img.data, 1024, 512, 99, 0.52));
}

export function makeVenusCloudTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 256, (_ctx, img) => {
    const w = 512;
    const h = 256;
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm((x / w) * 6, (y / h) * 8, 23, 6, 5);
        const a = 90 + n * 80;
        setRgb(d, (y * w + x) * 4, 232, 214, 164, a);
      }
    }
  });
}

export function makeRingTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 8;
  return canvasTexture(w, h, (_ctx, img) => {
    const d = img.data;
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      let a = 0;
      if (u < 0.08) a = 0;
      else if (u < 0.18) a = ((u - 0.08) / 0.1) * 140;
      else if (u < 0.42) a = 150 + Math.sin(u * 80) * 20;
      else if (u < 0.48) a = 12;
      else if (u < 0.78) a = 170 + Math.sin(u * 110) * 28;
      else if (u < 0.92) a = 90 + Math.sin(u * 60) * 18;
      else a = ((1 - u) / 0.08) * 50;
      const n = 210 + (hash(x, 1, 4) - 0.5) * 30;
      for (let y = 0; y < h; y++) {
        setRgb(d, (y * w + x) * 4, n, n * 0.94, n * 0.82, a);
      }
    }
  });
}

export function makeUranusRingTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 4;
  return canvasTexture(w, h, (_ctx, img) => {
    const d = img.data;
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const a = u > 0.35 && u < 0.55 ? 70 : u > 0.7 && u < 0.82 ? 40 : 0;
      for (let y = 0; y < h; y++) setRgb(d, (y * w + x) * 4, 200, 210, 214, a);
    }
  });
}

export function makeMoonTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 128, (_ctx, img) => {
    const w = 256;
    const h = 128;
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = fbm((x / w) * 8, (y / h) * 6, 66, 8, 5);
        const c = lerp(120, 200, n);
        setRgb(d, (y * w + x) * 4, c, c * 0.98, c * 0.94);
      }
    }
    for (let i = 0; i < 28; i++) {
      stampCrater(d, w, h, hash(i, 1, 70) * w, hash(i, 2, 71) * h, 2 + hash(i, 3, 72) * 8, 0.5);
    }
  });
}

export function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, "rgba(255, 228, 170, 0.95)");
  g.addColorStop(0.22, "rgba(255, 176, 72, 0.38)");
  g.addColorStop(0.55, "rgba(255, 140, 48, 0.1)");
  g.addColorStop(1, "rgba(255, 120, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type TexturePack = {
  bodies: Partial<Record<BodyId, THREE.CanvasTexture>>;
  clouds: THREE.CanvasTexture;
  venusClouds: THREE.CanvasTexture;
  rings: THREE.CanvasTexture;
  uranusRings: THREE.CanvasTexture;
  moon: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
};

export function createTexturePack(): TexturePack {
  const bodies: TexturePack["bodies"] = {};
  const ids: BodyId[] = [
    "sun",
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];
  for (const id of ids) {
    const kind =
      id === "sun"
        ? "star"
        : id === "jupiter" || id === "saturn"
          ? "gas"
          : id === "uranus" || id === "neptune"
            ? "ice"
            : id === "mercury"
              ? "rocky"
              : "terrestrial";
    bodies[id] = makeBodyTexture(id, kind);
  }
  return {
    bodies,
    clouds: makeCloudTexture(),
    venusClouds: makeVenusCloudTexture(),
    rings: makeRingTexture(),
    uranusRings: makeUranusRingTexture(),
    moon: makeMoonTexture(),
    glow: makeGlowTexture(),
  };
}

export function disposeTexturePack(pack: TexturePack) {
  for (const t of Object.values(pack.bodies)) t?.dispose();
  pack.clouds.dispose();
  pack.venusClouds.dispose();
  pack.rings.dispose();
  pack.uranusRings.dispose();
  pack.moon.dispose();
  pack.glow.dispose();
}
