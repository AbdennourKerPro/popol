import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contrast ratios (WCAG 2) of the colour pairs actually used for text. Lancé par le vitest de app/.
const jetons = Object.fromEntries([...readFileSync(new URL('jetons.css', import.meta.url), 'utf8')
  .matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map(([, nom, valeur]) => [nom, valeur]));

const rgba = hex => {
  const h = hex.slice(1).length === 3 ? [...hex.slice(1)].map(c => c + c).join('') : hex.slice(1);
  return [0, 2, 4, 6].map(i => (i < h.length ? parseInt(h.slice(i, i + 2), 16) / 255 : 1));
};
const sur = (avant, fond) => { const [r, g, b, a] = rgba(avant), f = rgba(fond); return [r, g, b].map((c, i) => c * a + f[i] * (1 - a)); };
const lum = rgb => rgb.map(c => (c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
const rapport = (texte, fond) => { const [a, b] = [lum(sur(jetons[texte], jetons[fond])), lum(rgba(jetons[fond]).slice(0, 3))].sort((x, y) => y - x); return (a + .05) / (b + .05); };

const PAIRES = [
  ['charbon', 'creme'], ['gris', 'creme'], ['gris', 'papier'], ['violet', 'creme'], ['violet', 'violet-pale'],
  ['violet', 'papier'], ['creme', 'violet'], ['creme-70', 'violet'], ['rouge', 'creme'], ['rouge', 'papier'],
  ['charbon', 'surligneur'], ['charbon', 'papier'], ['charbon', 'blanc'], ['gris', 'blanc'], ['creme', 'charbon'],
];

describe('Contrastes des jetons', () => {
  it.each(PAIRES)('%s sur %s atteint 4,5', (texte, fond) => {
    expect(rapport(texte, fond)).toBeGreaterThanOrEqual(4.5);
  });
});
