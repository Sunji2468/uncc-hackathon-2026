/**
 * Paints sticker faces onto 2D canvases (used as three.js textures).
 * Same visual language as the app: cream face, colored photo strip, chunky type.
 */

export type Food = "noodles" | "burger" | "shakshuka" | "bowl" | "curry";

export interface DishArt {
  kind: "dish";
  title: string;
  menu: string;
  home: string;
  bg: string;
  food: Food;
  foodColor: string;
}
export interface MysteryArt {
  kind: "mystery";
  title: string;
  line: string;
}
export interface NoteArt {
  kind: "note";
  text: string;
  by: string;
}
export type StickerArt = DishArt | MysteryArt | NoteArt;

export const W = 512;
export const H = 640;

const INK = "#1A1A17";
const FACE = "#FFFDF7";
const MUTED = "#5B5850";

export function fonts() {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-bricolage").trim() || "sans-serif";
  const body = css.getPropertyValue("--font-dm-sans").trim() || "sans-serif";
  return { display, body };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function plate(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, food: Food, color: string) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#E7DFCF";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#FFF6E0";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  if (food === "noodles") {
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.11;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const rr = r * (0.22 + i * 0.13);
      ctx.ellipse(cx + (i - 1) * 4, cy + (i % 2 ? 3 : -3), rr, rr * 0.8, i, 0.3, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = "#2b2b2b";
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(i * 2.4) * r * 0.4, cy + Math.sin(i * 1.7) * r * 0.35, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (food === "burger") {
    const w = r * 1.0;
    const layers: [string, number][] = [
      ["#E9A93A", r * 0.26],
      ["#7CB342", r * 0.08],
      ["#FFD54A", r * 0.07],
      ["#6D3B1E", r * 0.18],
      ["#E9A93A", r * 0.16],
    ];
    let y = cy - r * 0.38;
    layers.forEach(([c, h], i) => {
      ctx.fillStyle = c;
      roundRect(ctx, cx - w / 2 + (i === 2 ? -6 : 0), y, w + (i === 2 ? 12 : 0), h, i === 0 ? h * 0.9 : h / 2);
      ctx.fill();
      y += h + 3;
    });
  } else if (food === "shakshuka") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    [[-0.25, -0.15], [0.22, -0.2], [0, 0.25]].forEach(([dx, dy]) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx + dx * r, cy + dy * r, r * 0.17, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFC21A";
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + dy * r, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // bowl / curry: a mound with garnish
    ctx.fillStyle = food === "curry" ? color : "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = food === "curry" ? "#ffffff" : color;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(i) * r * 0.3, cy + Math.sin(i * 1.3) * r * 0.28, r * 0.12, r * 0.08, i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#43A047";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(i * 2.1) * r * 0.42, cy + Math.sin(i * 2.1) * r * 0.4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, family: string, weight = 800) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxW && s > 18);
}

export function paintFront(art: StickerArt): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const { display, body } = fonts();

  if (art.kind === "mystery") {
    ctx.fillStyle = "#12201B";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(150, 200, 10, 150, 200, 150);
    g.addColorStop(0, "rgba(255,213,74,0.55)");
    g.addColorStop(1, "rgba(255,213,74,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFD54A";
    ctx.beginPath();
    ctx.arc(150, 200, 92, 0, Math.PI * 2);
    ctx.fill();
    // box glyph
    ctx.strokeStyle = "#12201B";
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(150, 140); ctx.lineTo(205, 170); ctx.lineTo(205, 232); ctx.lineTo(150, 262); ctx.lineTo(95, 232); ctx.lineTo(95, 170); ctx.closePath();
    ctx.moveTo(95, 170); ctx.lineTo(150, 200); ctx.lineTo(205, 170); ctx.moveTo(150, 200); ctx.lineTo(150, 262);
    ctx.stroke();
    ctx.fillStyle = "#F4EFE6";
    fitText(ctx, art.title, W - 96, 58, display);
    ctx.fillText(art.title, 48, 410);
    ctx.font = `500 32px ${body}`;
    ctx.fillStyle = "#B8C5BD";
    ctx.fillText(art.line, 48, 460);
    ctx.fillStyle = "#1B2D26";
    roundRect(ctx, 48, 500, 270, 60, 30);
    ctx.fill();
    ctx.fillStyle = "#FFD54A";
    ctx.font = `700 28px ${body}`;
    ctx.fillText("Ready to open", 72, 540);
    return c;
  }

  if (art.kind === "note") {
    ctx.fillStyle = "#FFE98A";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(26,26,23,0.08)";
    ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = INK;
    ctx.font = `800 40px ${display}`;
    ctx.fillText("Community Fridge", 40, 140);
    ctx.font = `500 44px ${body}`;
    const words = art.text.split(" ");
    let line = "";
    let y = 240;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W - 80) {
        ctx.fillText(line, 40, y);
        line = w;
        y += 58;
      } else line = test;
    }
    ctx.fillText(line, 40, y);
    ctx.font = `700 30px ${body}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(`by ${art.by}`, 40, y + 70);
    const chips: [string, string][] = [["#FFB199", "Fire 12"], ["#FFC7D2", "Heart 4"]];
    let x = 40;
    for (const [col, label] of chips) {
      ctx.font = `700 28px ${body}`;
      const w = ctx.measureText(label).width + 40;
      ctx.fillStyle = col;
      roundRect(ctx, x, H - 120, w, 58, 29);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillText(label, x + 20, H - 81);
      x += w + 14;
    }
    return c;
  }

  ctx.fillStyle = FACE;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = art.bg;
  ctx.fillRect(0, 0, W, 330);
  plate(ctx, W / 2, 168, 128, art.food, art.foodColor);
  ctx.fillStyle = INK;
  fitText(ctx, art.title, W - 80, 64, display);
  ctx.fillText(art.title, 40, 420);
  // struck-through menu price, then the home price in a coral pill
  ctx.font = `700 36px ${body}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(art.menu, 40, 492);
  const mw = ctx.measureText(art.menu).width;
  ctx.strokeStyle = MUTED;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(38, 480);
  ctx.lineTo(42 + mw, 480);
  ctx.stroke();
  ctx.font = `800 44px ${display}`;
  const hw = ctx.measureText(art.home).width + 44;
  ctx.fillStyle = "#FF5A36";
  roundRect(ctx, 60 + mw, 446, hw, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#12201B";
  ctx.fillText(art.home, 82 + mw, 494);
  ctx.fillStyle = "#F1EADB";
  roundRect(ctx, 40, 540, 230, 56, 28);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 26px ${body}`;
  ctx.fillText("Tap to flip", 72, 577);
  return c;
}

/** The recipe side, shown when the hero sticker flips. */
export function paintBack(title: string, stats: [string, string][], kept: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const { display, body } = fonts();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFD54A";
  ctx.font = `700 26px ${body}`;
  ctx.fillText("RECIPE SIDE", 40, 72);
  ctx.fillStyle = FACE;
  fitText(ctx, title, W - 80, 54, display);
  ctx.fillText(title, 40, 132);
  stats.forEach(([value, label], i) => {
    const x = 40 + (i % 2) * 222;
    const y = 172 + Math.floor(i / 2) * 150;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(ctx, x, y, 206, 130, 26);
    ctx.fill();
    ctx.fillStyle = FACE;
    ctx.font = `800 48px ${display}`;
    ctx.fillText(value, x + 20, y + 66);
    ctx.fillStyle = "#C9C3B6";
    ctx.font = `500 22px ${body}`;
    ctx.fillText(label, x + 20, y + 104);
  });
  ctx.fillStyle = "#FFD54A";
  roundRect(ctx, 40, 500, W - 80, 86, 26);
  ctx.fill();
  ctx.fillStyle = "#12201B";
  fitText(ctx, kept, W - 130, 42, display);
  ctx.fillText(kept, 64, 556);
  return c;
}

/** A tiling dot pattern for the board the stickers float above. */
export function paintDots(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1B2D26";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#2E4439";
  ctx.beginPath();
  ctx.arc(32, 32, 4, 0, Math.PI * 2);
  ctx.fill();
  return c;
}
