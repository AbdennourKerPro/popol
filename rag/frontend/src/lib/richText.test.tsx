import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderInline, stripInline } from './richText';

describe('Mise en forme des réponses', () => {
  it('met en gras les chiffres clés encadrés de **', () => {
    const parts = renderInline('Retraite à **60 ans** pour **40 annuités**.');
    expect(parts.filter(p => typeof p === 'string')).toEqual(['Retraite à ', ' pour ', '.']);
    const strong = parts.filter(isValidElement) as ReactElement<{ className: string; children: string }>[];
    expect(strong.map(s => [s.type, s.props.className, s.props.children])).toEqual([['strong', 'key-figure', '60 ans'], ['strong', 'key-figure', '40 annuités']]);
  });
  it('laisse tel quel un ** non fermé', () => {
    expect(renderInline('Un **seuil sans fin')).toEqual(['Un **seuil sans fin']);
    expect(stripInline('Un **seuil sans fin')).toBe('Un **seuil sans fin');
  });
  it('n’interprète aucune balise', () => {
    const parts = renderInline('<img src=x onerror=alert(1)> **<b>gras</b>**');
    expect(parts[0]).toBe('<img src=x onerror=alert(1)> ');
    expect((parts[1] as ReactElement<{ children: string }>).props.children).toBe('<b>gras</b>');
  });
  it('retire les marques pour la copie', () => {
    expect(stripInline('Le SMIC à **1 600 €** net.')).toBe('Le SMIC à 1 600 € net.');
  });
});
