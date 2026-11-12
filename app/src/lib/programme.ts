import data from '../data/programme.json';

export type Categorie = 'cle' | 'comp' | 'sous';
export type Portee = 'large' | 'ciblee' | 'collective';

export interface Mesure {
  id: string;
  texte: string;
  categorie: Categorie;
  /** Sub-section id (`p2c02-ss03`). */
  sousSection: string;
  /** Measure detailed by this sub-measure. */
  parent?: string;
  url: string;
  themes: string[];
  publics: string[];
  portee: Portee;
  /** Plain-language restatement; absent when none passed the checks: the exact text is shown. */
  resume?: string;
}

export interface Rubrique { id: string; titre: string }
export interface SousSection extends Rubrique { chapitre: string }
export interface Chapitre extends Rubrique { partie: string }

type Raw = { t: string; c: Categorie; s: string; p?: string; u: string; th: string[]; pu: string[]; po: Portee; r?: string };

/** The whole programme, in book order. */
export const MESURES: Mesure[] = Object.entries(data.mesures as Record<string, Raw>).map(([id, m]) => ({
  id, texte: m.t, categorie: m.c, sousSection: m.s, parent: m.p, url: m.u, themes: m.th, publics: m.pu, portee: m.po, resume: m.r,
}));
const BY_ID = new Map(MESURES.map((m) => [m.id, m]));

export const PARTIES: Rubrique[] = data.parties;
export const CHAPITRES: Chapitre[] = data.chapitres;
export const SOUS_SECTIONS: SousSection[] = data.sousSections;
const SOUS_SECTION_BY_ID = new Map(SOUS_SECTIONS.map((s) => [s.id, s]));
const CHAPITRE_BY_ID = new Map(CHAPITRES.map((c) => [c.id, c]));

export const EXTRAIT_LE: string = data.extraitLe;
/** Campaign site of Jean-Luc Mélenchon: where to read the programme. */
export const SITE_URL = 'https://melenchon2027.fr/';
export const SITE_LABEL = 'melenchon2027.fr';

export const hasMesure = (id: string) => BY_ID.has(id);
export function mesure(id: string): Mesure {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Mesure inconnue : ${id}`);
  return found;
}
export const sousSection = (id: string) => SOUS_SECTION_BY_ID.get(id)!;
export const chapitre = (id: string) => CHAPITRE_BY_ID.get(id)!;
/** Where a measure sits in the book: « Chapitre — Sous-section ». */
export const emplacement = (m: Mesure) => {
  const sub = sousSection(m.sousSection);
  return `${chapitre(sub.chapitre).titre} · ${sub.titre}`;
};
/** The sentence to show: the restatement when it is trustworthy, else the exact text. */
export const phrase = (m: Mesure) => m.resume ?? m.texte;
