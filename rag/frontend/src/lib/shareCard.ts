import { stripInline } from './richText';

/* Image card for sharing an answer (1080 × 1350, 4:5), drawn with the canvas 2D API. Same
 * technique as the poster of the « Ça change quoi pour moi ? » app (app/src/lib/poster.ts),
 * ported here because the two apps are built in separate Docker contexts. */

const C = { purple: '#4c0297', red: '#d1271c', cream: '#fffcf4', frame: '#203652', blue: '#245aa8', blueSoft: '#dfeaf8', ink: '#192b43', muted: '#52657b' };
const SANS = '"Public Sans", sans-serif';
const SERIF = '"Gowun Batang", serif';
const W = 1080, H = 1350;

/** Keeps a number with its thousands and its unit on one line: « 1 700 euros », « 10 % », « 60 ans ». */
export const glue = (text: string) => text
  .replace(/(\d) (?=\d{3}(?!\d))/g, '$1 ')
  .replace(/(\d) (?=(?:euros?|€|%|heures?|ans|semaines?|jours|mois|annuités|M€|Md€)(?![\p{L}]))/gu, '$1 ')
  .replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');

/** Splits a text into lines no wider than `width` (regular spaces only: non-breaking ones keep a
 * figure together). With `maxLines`, the last kept line ends with an ellipsis. Pure: the width
 * of a string is given by `measure`. */
export function wrapLines(text: string, width: number, measure: (s: string) => number, maxLines = Infinity): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of glue(text).split(/[ \t\n]+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && measure(`${last}…`) > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd().replace(/[,;:.]$/, '')}…`;
  return kept;
}

/** Cuts a single line (a link has no space to wrap on) to `width`, with an ellipsis. */
export function ellipsis(text: string, width: number, measure: (s: string) => number): string {
  if (measure(text) <= width) return text;
  let t = text;
  while (t.length > 1 && measure(`${t}…`) > width) t = t.slice(0, -1);
  return `${t}…`;
}

/** Outlined shape with a solid offset shadow, as in the interface. */
function framed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, line = 6, shadow = 12) {
  if (shadow) { ctx.fillStyle = C.frame; ctx.beginPath(); ctx.roundRect(x + shadow, y + shadow, w, h, r); ctx.fill(); }
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.lineWidth = line; ctx.strokeStyle = C.frame; ctx.stroke();
}

export interface ShareCardContent { question: string; answer: string; points: string[]; url: string }

export async function renderShareCard({ question, answer, points, url }: ShareCardContent): Promise<Blob> {
  await Promise.all([`900 64px ${SANS}`, `700 26px ${SANS}`, `400 36px ${SERIF}`].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const measure = (s: string) => ctx.measureText(s).width;

  // Dotted cream background, thick framed card
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(76, 2, 151, 0.09)';
  for (let y = 15; y < H; y += 30) for (let x = 15; x < W; x += 30) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
  const M = 56, FOOTER = 150, P = 60;
  const card = { x: M, y: M, w: W - 2 * M - 14, h: H - M - FOOTER };
  framed(ctx, card.x, card.y, card.w, card.h, 44, '#fff', 8, 16);
  const cx = card.x + P, cw = card.w - 2 * P, bottom = card.y + card.h - P;
  let y = card.y + P;

  // Wordmark
  ctx.fillStyle = C.purple; ctx.font = `900 54px ${SANS}`;
  ctx.fillText('Chati', cx, y + 44);
  ctx.fillStyle = C.red; ctx.fillText('.', cx + measure('Chati'), y + 44);
  ctx.fillStyle = C.frame; ctx.font = `700 22px ${SANS}`;
  ctx.fillText('LE PROGRAMME, EXPLIQUÉ', cx + 2, y + 78);
  y += 78 + 44;

  // Question, Public Sans 900, shrunk to fit four lines
  let qs = 64;
  ctx.font = `900 ${qs}px ${SANS}`;
  while (wrapLines(question, cw, measure).length > 4 && qs > 40) { qs -= 2; ctx.font = `900 ${qs}px ${SANS}`; }
  const qLines = wrapLines(question, cw, measure, 4);
  ctx.fillStyle = C.frame;
  qLines.forEach((line, i) => ctx.fillText(line, cx, y + qs * (0.85 + i * 1.08)));
  y += qs * qLines.length * 1.08 + 26;
  ctx.fillStyle = C.red; ctx.fillRect(cx, y, 120, 8);
  y += 8 + 42;

  // Answer and up to three points, Gowun Batang, shrunk until everything fits
  const items = points.map(stripInline).filter(Boolean).slice(0, 3);
  const text = stripInline(answer);
  const heightOf = (fs: number, answerLines: string[], pointLines: string[][]) =>
    answerLines.length * fs * 1.45 + pointLines.reduce((h, l) => h + 22 + l.length * fs * 1.4, pointLines.length ? 18 : 0);
  const layout = (fs: number) => {
    ctx.font = `400 ${fs}px ${SERIF}`;
    const answerLines = wrapLines(text, cw, measure, 5);
    const pointLines = items.map(p => wrapLines(p, cw - 44, measure, 3));
    return { answerLines, pointLines, height: heightOf(fs, answerLines, pointLines) };
  };
  let fs = 38, body = layout(fs);
  while (body.height > bottom - y && fs > 24) { fs -= 2; body = layout(fs); }
  while (body.height > bottom - y && body.pointLines.length) { body.pointLines.pop(); body.height = heightOf(fs, body.answerLines, body.pointLines); }
  ctx.font = `400 ${fs}px ${SERIF}`; ctx.fillStyle = C.ink;
  body.answerLines.forEach((line, i) => ctx.fillText(line, cx, y + fs * (1 + i * 1.45)));
  y += body.answerLines.length * fs * 1.45 + 18;
  for (const lines of body.pointLines) {
    y += 22;
    ctx.fillStyle = C.blue; ctx.fillRect(cx + 2, y + fs * 0.42, 14, 14);
    ctx.fillStyle = C.ink;
    lines.forEach((line, i) => ctx.fillText(line, cx + 44, y + fs * (0.9 + i * 1.4)));
    y += lines.length * fs * 1.4;
  }

  // Footer: signature and the link that asks the question again
  const fy = card.y + card.h + 16 + 54;
  ctx.font = `900 38px ${SANS}`; ctx.fillStyle = C.frame;
  ctx.fillText('Chati — le Chat Insoumis', M + 4, fy);
  ctx.font = `700 24px ${SANS}`; ctx.fillStyle = C.purple;
  ctx.fillText(ellipsis(url.replace(/^https?:\/\//, ''), W - 2 * M, measure), M + 4, fy + 44);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Image impossible à créer'))), 'image/png'));
}
