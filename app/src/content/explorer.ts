import { BookOpen, Factory, Globe, HeartHandshake, Landmark, Scale, Shield, Trees, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import data from '../data/mesures.json';
import type { Accent, Question, Target, Theme } from './types';

/*
 * "Explorer les autres sujets": one theme per area of the programme, each with a single
 * question "what matters to you?" whose choices are the programme's own sub-sections.
 * Targets are generated from the corpus, so every measure is reachable from some answer.
 */

const MESURES = data.mesures as Record<string, { texte: string; sousSection: string }>;

interface Area {
  id: string;
  titre: string;
  accroche: string;
  icon: LucideIcon;
  accent: Accent;
  section: string;
  /** Sub-section names of the section; omitted: every sub-section not claimed by another area. */
  sous?: string[];
}

const ECONOMIE = [
  'Banques et finance', 'Biens communs et nationalisations', 'Dette publique', 'Entreprises et pouvoir des salariés',
  'Industrie et relocalisation', 'Infrastructures et bois', 'Lutte contre la fraude fiscale', 'Mer et pôles',
  'Numérique et IA', 'Petites entreprises et économie sociale', 'Espace',
];

const AREAS: Area[] = [
  { id: 'economie', titre: 'Économie et industrie', accroche: 'Banques, dette, entreprises, numérique : comment l’économie est organisée.', icon: Factory, accent: 'purple', section: 's01', sous: ECONOMIE },
  { id: 'travail', titre: 'Emploi et justice sociale', accroche: 'Chômage, précarité, retraites, égalité : le reste du monde du travail.', icon: Users, accent: 'red', section: 's01' },
  { id: 'democratie', titre: 'Démocratie et institutions', accroche: 'Constituante, justice, médias, culture, sport, laïcité.', icon: Landmark, accent: 'ink', section: 's02' },
  { id: 'ecologie', titre: 'Écologie et territoires', accroche: 'Climat, énergie, eau, forêts, agriculture, animaux, outre-mer.', icon: Trees, accent: 'purple', section: 's03' },
  { id: 'monde', titre: 'Paix, Europe et monde', accroche: 'Diplomatie, défense, ONU, Union européenne, coopération.', icon: Globe, accent: 'red', section: 's04' },
  { id: 'solidarites', titre: 'Santé et solidarités', accroche: 'Hôpital, grand âge, handicap, santé mentale, protection de l’enfance.', icon: HeartHandshake, accent: 'ink', section: 's05' },
  { id: 'ecole', titre: 'École et recherche', accroche: 'Petite enfance, école, voie professionnelle, enseignement supérieur.', icon: BookOpen, accent: 'purple', section: 's06' },
  { id: 'securite', titre: 'Sécurité et justice pénale', accroche: 'Police, justice pénale, renseignement, conscription citoyenne.', icon: Shield, accent: 'red', section: 's07' },
  { id: 'egalite', titre: 'Égalité, migrations et nationalité', accroche: 'Discriminations, accueil, séjour, asile, nationalité.', icon: Scale, accent: 'ink', section: 's08' },
];

const sectionOf = (id: string) => id.slice(0, 3);
const subOf = (id: string) => id.slice(0, 8);

/** Measure ids grouped by sub-section id (`s02-ss03`), corpus order. */
const BY_SUB = new Map<string, string[]>();
for (const id of Object.keys(MESURES)) BY_SUB.set(subOf(id), [...(BY_SUB.get(subOf(id)) ?? []), id]);

const claimed = new Set(AREAS.flatMap((a) => a.sous ?? []));
const subsOf = (area: Area) => [...BY_SUB.keys()].filter((sub) => {
  if (!sub.startsWith(area.section)) return false;
  const name = MESURES[BY_SUB.get(sub)![0]].sousSection;
  return area.sous ? area.sous.includes(name) : !claimed.has(name);
});

/** Long measures are cut for the one-line argument; the full text is always quoted below. */
const lead = (text: string) => {
  if (text.length <= 140) return text;
  const cut = text.slice(0, 140);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

export const EXPLORER_QUESTIONS: Question[] = [];

export const EXPLORER_THEMES: Theme[] = AREAS.map((area) => {
  const subs = subsOf(area);
  const questionId = `compte-${area.id}`;
  const tagOf = (sub: string) => `sujet-${sub}`;
  const labelOf = (sub: string) => MESURES[BY_SUB.get(sub)![0]].sousSection;

  EXPLORER_QUESTIONS.push({
    id: questionId,
    jeu: 'Dans ce domaine, qu’est-ce qui compte le plus pour toi ?',
    militant: 'Dans ce domaine, qu’est-ce qui compte le plus pour vous ?',
    pourquoi: 'Choisissez avec la personne les sujets qui l’intéressent : ils déterminent les mesures proposées.',
    multiple: true,
    choices: subs.map((sub) => ({ id: sub, label: labelOf(sub), icon: area.icon, tags: [tagOf(sub)] })),
  });

  // Interleave sub-sections so that a long one does not push the others out of the list.
  const columns = subs.map((sub) => BY_SUB.get(sub)!.map((mesure): Target => ({
    mesure, si: [[tagOf(sub)]], poids: 2,
    tu: `« ${labelOf(sub)} » compte pour toi : voici ce que prévoit le programme.`,
    vous: lead(MESURES[mesure].texte),
  })));
  const cibles = Array.from({ length: Math.max(...columns.map((c) => c.length)) }, (_, row) => columns.flatMap((c) => c[row] ?? [])).flat();

  return {
    id: `explorer-${area.id}`,
    groupe: 'explorer',
    titre: area.titre,
    accroche: area.accroche,
    icon: area.icon,
    accent: area.accent,
    questions: [questionId],
    maxMesures: 24,
    cibles,
    collectif: [],
    objections: [],
  } satisfies Theme;
});
