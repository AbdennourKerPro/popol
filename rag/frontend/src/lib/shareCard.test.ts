import { describe, expect, it } from 'vitest';
import { ellipsis, glue, wrapLines } from './shareCard';

const chars = (s: string) => s.length;  // one unit per character

describe('Découpe du texte de la carte image', () => {
  it('coupe aux espaces sans dépasser la largeur', () => {
    const lines = wrapLines('Le programme propose la retraite pour tous', 16, chars);
    expect(lines).toEqual(['Le programme', 'propose la', 'retraite pour', 'tous']);
    expect(lines.every(l => l.length <= 16)).toBe(true);
  });
  it('garde un chiffre avec son unité et ses milliers', () => {
    expect(glue('Un SMIC à 1 600 euros et 10 % de plus')).toBe('Un SMIC à 1 600 euros et 10 % de plus');
    const lines = wrapLines('Retraite à 60 ans', 12, chars);
    expect(lines).toEqual(['Retraite à', '60 ans']);
  });
  it('limite le nombre de lignes avec des points de suspension', () => {
    const lines = wrapLines('un deux trois quatre cinq six sept huit', 10, chars, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines[1].length).toBeLessThanOrEqual(10);
  });
  it('garde un mot plus long que la ligne, et ignore les espaces multiples', () => {
    expect(wrapLines('anticonstitutionnellement  oui', 10, chars)).toEqual(['anticonstitutionnellement', 'oui']);
    expect(wrapLines('', 10, chars)).toEqual([]);
  });
  it('raccourcit un lien trop long', () => {
    expect(ellipsis('chati.example/?q=retraites', 12, chars)).toBe('chati.examp…');
    expect(ellipsis('court', 12, chars)).toBe('court');
  });
});
