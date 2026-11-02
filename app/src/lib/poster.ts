import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Mascot } from '../components/Mascot';
import { MARQUE } from '../content/brand';

import { type Format, FORMATS } from './posterFormats';

const C = { purple: '#4c0297', red: '#d1271c', cream: '#fffcf4', frame: '#1d1240', lilac: '#f4ecfc', mark: '#ffcbc4', muted: '#6d6676' };
const SANS = '"Public Sans", sans-serif';
const SERIF = '"Gowun Batang", serif';

export interface PosterContent {
  theme: string;
  mesures: string[];
  chiffres: string[];
  format: Format;
  /** Public address of the app, printed at the bottom when known. */
  url?: string;
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Outlined shape with a solid offset shadow, as in the interface. */
function framed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, line = 6, shadow = 12) {
  if (shadow) {
    ctx.fillStyle = C.frame;
    ctx.beginPath(); ctx.roundRect(x + shadow, y + shadow, w, h, r); ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.lineWidth = line; ctx.strokeStyle = C.frame; ctx.stroke();
}

function rotated(ctx: CanvasRenderingContext2D, cx: number, cy: number, deg: number, draw: () => void) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((deg * Math.PI) / 180); draw(); ctx.restore();
}

export async function renderPoster({ theme, mesures, chiffres, format, url }: PosterContent): Promise<Blob> {
  const [W, H] = FORMATS[format].size;
  await Promise.all([`900 80px ${SANS}`, `800 28px ${SANS}`, `600 24px ${SANS}`, `400 34px ${SERIF}`].map((f) => document.fonts.load(f)));
  const mascotSvg = renderToStaticMarkup(createElement(Mascot, { mood: 'happy', size: 230 }));
  const mascot = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvg)}`);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  // Dotted cream background
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(76, 2, 151, 0.10)';
  for (let y = 15; y < H; y += 30) for (let x = 15; x < W; x += 30) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }

  const M = 56, FOOTER = 200, P = 56;
  const card = { x: M, y: M, w: W - 2 * M - 14, h: H - M - FOOTER };
  framed(ctx, card.x, card.y, card.w, card.h, 48, '#fff', 7, 16);
  const cx = card.x + P, cw = card.w - 2 * P;
  let y = card.y + P;

  // Wordmark and theme sticker
  const logoH = 80;
  ctx.fillStyle = C.purple; ctx.font = `900 64px ${SANS}`;
  ctx.fillText(MARQUE.nom, cx, y + 52);
  ctx.fillStyle = C.frame; ctx.font = `800 24px ${SANS}`;
  ctx.fillText(MARQUE.sousTitre.toUpperCase(), cx + 3, y + 84);
  ctx.font = `900 28px ${SANS}`;
  const label = theme.toUpperCase();
  const pw = ctx.measureText(label).width + 48, ph = 56;
  rotated(ctx, card.x + card.w - P - pw / 2, y + logoH / 2, 4, () => {
    framed(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2, C.red, 4, 5);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(label, 0, 10);
    ctx.textAlign = 'left';
  });
  y += logoH + 46;

  // Title, with the marker under "pour moi"
  let ts = format === 'story' ? 96 : 84;
  const fitTitle = () => { ctx.font = `900 ${ts}px ${SANS}`; return Math.max(ctx.measureText('Ce que le programme').width, ctx.measureText('change pour moi').width); };
  while (fitTitle() > cw && ts > 50) ts -= 2;
  const lh = ts * 1.06;
  ctx.fillStyle = C.frame;
  ctx.fillText('Ce que le programme', cx, y + ts * 0.82);
  const change = 'change ';
  const cwChange = ctx.measureText(change).width, wMoi = ctx.measureText('pour moi').width;
  const base2 = y + lh + ts * 0.82;
  ctx.fillStyle = C.mark;
  ctx.fillRect(cx + cwChange - 6, base2 - ts * 0.34, wMoi + 12, ts * 0.42);
  ctx.fillStyle = C.frame; ctx.fillText(change, cx, base2);
  ctx.fillStyle = C.purple; ctx.fillText('pour moi', cx + cwChange, base2);
  y += 2 * lh + 28;

  // Figures as chips
  if (chiffres.length) {
    ctx.font = `800 28px ${SANS}`;
    const chipH = 54, gap = 14;
    let x = cx;
    for (const raw of chiffres.slice(0, 4)) {
      const text = ellipsis(ctx, raw, cw - 44);
      const w = ctx.measureText(text).width + 44;
      if (x > cx && x + w > cx + cw) { x = cx; y += chipH + gap; }
      framed(ctx, x, y, w, chipH, chipH / 2, C.purple, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillText(text, x + 22, y + 37);
      x += w + gap;
    }
    y += chipH + 30;
  }

  // Numbered measures, shrunk to fit; overflow summarised
  const bottom = card.y + card.h - P;
  const pad = 22, textX = 96, gap = 16;
  const layout = (fs: number) => {
    ctx.font = `400 ${fs}px ${SERIF}`;
    return mesures.map((m) => {
      const lines = wrap(ctx, m, cw - textX - 28);
      return { lines, h: Math.max(lines.length * fs * 1.38 + 2 * pad - fs * 0.38, 96) };
    });
  };
  let fs = format === 'story' ? 40 : 36;
  let items = layout(fs);
  const total = (list: { h: number }[]) => list.reduce((s, i) => s + i.h + gap, -gap);
  while (total(items) > bottom - y && fs > 24) { fs -= 2; items = layout(fs); }
  let hidden = 0;
  while (items.length > 1 && total(items) + 60 > bottom - y && total(items) > bottom - y) { items.pop(); hidden += 1; }

  items.forEach((item, i) => {
    framed(ctx, cx, y, cw, item.h, 22, C.lilac, 4, 0);
    rotated(ctx, cx + 20 + 29, y + 18 + 29, -6, () => {
      framed(ctx, -29, -29, 58, 58, 14, C.red, 4, 0);
      ctx.font = `900 30px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 0, 11);
      ctx.textAlign = 'left';
    });
    ctx.font = `400 ${fs}px ${SERIF}`; ctx.fillStyle = '#212320';
    item.lines.forEach((line, l) => ctx.fillText(line, cx + textX, y + pad + fs * 0.9 + l * fs * 1.38));
    y += item.h + gap;
  });
  if (hidden) {
    ctx.font = `800 28px ${SANS}`; ctx.fillStyle = C.purple;
    ctx.fillText(`+ ${hidden} autre${hidden > 1 ? 's' : ''} mesure${hidden > 1 ? 's' : ''} pour moi`, cx, y + 30);
  }

  // Mascot overlapping the card corner
  rotated(ctx, card.x + card.w - 78, card.y + card.h + 40, 9, () => ctx.drawImage(mascot, -115, -120, 230, 241));

  // Footer
  const fy = card.y + card.h + 16 + 52;
  ctx.font = `900 40px ${SANS}`; ctx.fillStyle = C.frame;
  ctx.fillText('Ça change quoi pour moi', M + 4, fy);
  const qx = M + 4 + ctx.measureText('Ça change quoi pour moi').width;
  ctx.fillStyle = C.red; ctx.fillText(' ?', qx, fy);
  ctx.font = `600 24px ${SANS}`; ctx.fillStyle = C.muted;
  ctx.fillText('Site non officiel · soutien à la candidature de Jean-Luc Mélenchon', M + 4, fy + 40);
  if (url) { ctx.font = `800 26px ${SANS}`; ctx.fillStyle = C.purple; ctx.fillText(`Fais le test : ${url}`, M + 4, fy + 80); }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible à créer'))), 'image/png'));
}
