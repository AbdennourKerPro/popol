import { describe, expect, it } from 'vitest';
import { cleanProfile, loadProfile, saveProfile } from './profile';

const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } }; };
const known = ['etudiant', 'locataire', 'rural', 'retraite'];

describe('Profil « Je suis… »', () => {
  it('relit le profil enregistré et écarte les identifiants inconnus', () => {
    const store = memory();
    saveProfile(['locataire', 'etudiant'], store);
    expect(loadProfile(known, store)).toEqual(['locataire', 'etudiant']);
    store.setItem('chati-profile', JSON.stringify(['locataire', 'ancien', 3, 'locataire']));
    expect(loadProfile(known, store)).toEqual(['locataire']);
  });
  it('garde trois publics au plus', () => {
    expect(cleanProfile(['etudiant', 'locataire', 'rural', 'retraite'], known)).toEqual(['etudiant', 'locataire', 'rural']);
    const store = memory(); saveProfile(['etudiant', 'locataire', 'rural', 'retraite'], store);
    expect(JSON.parse(store.getItem('chati-profile')!)).toHaveLength(3);
  });
  it('résiste à un stockage illisible ou indisponible', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadProfile(known, broken)).toEqual([]);
    expect(() => saveProfile(['etudiant'], broken)).not.toThrow();
    const store = memory(); store.setItem('chati-profile', '{pas du json');
    expect(loadProfile(known, store)).toEqual([]);
    expect(cleanProfile('etudiant', known)).toEqual([]);
  });
});
