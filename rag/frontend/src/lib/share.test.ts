import { describe, expect, it } from 'vitest';
import { sharedQuestion, shareUrl, withoutQuestion } from './share';

describe('Lien de partage', () => {
  it('encode la question et ne transporte jamais le jeton', () => {
    const place = { origin: 'https://chati.example', pathname: '/', hash: '#t=' + 'a'.repeat(43), search: '' };
    const url = shareUrl('Retraite à 60 ans & 40 annuités ? #1', place);
    expect(url).toBe('https://chati.example/?q=Retraite%20%C3%A0%2060%20ans%20%26%2040%20annuit%C3%A9s%20%3F%20%231');
    expect(url).not.toContain('#t=');
    expect(new URL(url).searchParams.get('q')).toBe('Retraite à 60 ans & 40 annuités ? #1');
  });
  it('lit une question partagée de longueur raisonnable', () => {
    expect(sharedQuestion('?q=retraites')).toBe('retraites');
    expect(sharedQuestion('?q=x')).toBeNull();
    expect(sharedQuestion('?q=' + 'a'.repeat(501))).toBeNull();
    expect(sharedQuestion('?autre=1')).toBeNull();
  });
  it('retire seulement le paramètre de la question de l’adresse', () => {
    expect(withoutQuestion({ pathname: '/', search: '?q=retraites&x=1', hash: '' })).toBe('/?x=1');
    expect(withoutQuestion({ pathname: '/chati/', search: '?q=retraites', hash: '' })).toBe('/chati/');
  });
});
