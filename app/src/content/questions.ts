import {
  Accessibility, Armchair, Baby, Backpack, Bike, Briefcase, Building, Building2, Car, Check, Dumbbell, Flame, GraduationCap, HandHeart,
  HeartPulse, Home, Hourglass, House, KeyRound, Landmark, Megaphone, School, Search, Smile, Snowflake, Store, Sun, TrainFront, Tractor,
  Trees, User, X,
} from 'lucide-react';
import { type Theme, THEME_IDS, THEMES } from './taxonomie';
import type { Choice, Longueur, Question } from './types';

/** Interest tags: `i:` ticked as what matters most, `j:` second round, `k:` third round / soft probes. */
export const POIDS_INTERET: Record<string, number> = { i: 3, j: 2, k: 1 };
/**
 * `b:` a difficulty the person has stated (bills, health…): measures for everyone on that theme that
 * directly reach most people count as if aimed at them, even if the theme was not ticked.
 */
export const POIDS_BESOIN = 5;
export const besoin = (theme: Theme) => `b:${theme}`;
export const interet = (rang: 'i' | 'j' | 'k', theme: Theme) => `${rang}:${theme}`;

const toutesLesThemes = (rang: 'i' | 'j' | 'k'): Choice[] =>
  THEME_IDS.map((t) => ({ id: t, label: THEMES[t].label, icon: THEMES[t].icon, tags: [interet(rang, t)] }));

const oui = (tags: string[], label = 'Oui'): Choice => ({ id: 'oui', label, icon: Check, tags });
const non = (label = 'Non'): Choice => ({ id: 'non', label, icon: X, tags: [] });

/** Shared question bank, in asking order. `niveau` is the shortest journey that asks it. */
export const QUESTION_LIST: Question[] = [
  // ---- court
  {
    id: 'statut', niveau: 'court',
    jeu: 'Pour commencer, tu fais quoi dans la vie ?',
    militant: 'Qu’est-ce que vous faites dans la vie en ce moment ?',
    pourquoi: 'Le statut oriente vers les mesures sur le travail, les salaires, le chômage ou les retraites.',
    choices: [
      { id: 'prive', label: 'Salarié·e du privé', icon: Briefcase, tags: ['salarie'] },
      { id: 'public', label: 'Fonctionnaire, agent public', icon: Landmark, tags: ['salarie', 'agent_public'] },
      { id: 'precaire', label: 'CDD, intérim, temps partiel subi', icon: Hourglass, tags: ['salarie', 'precaire'] },
      { id: 'independant', label: 'Artisan, commerçant·e, indépendant·e', icon: Store, tags: ['independant'] },
      { id: 'agriculteur', label: 'Agriculteur·rice, éleveur·se, pêcheur·se', icon: Tractor, tags: ['agriculteur'] },
      { id: 'plateforme', label: 'Livreur·se, VTC, plateforme', icon: Bike, tags: ['plateforme'] },
      { id: 'etudiant', label: 'Lycéen·ne, apprenti·e, étudiant·e', icon: GraduationCap, tags: ['etudiant'] },
      { id: 'chomage', label: 'Sans emploi, au RSA', icon: Search, tags: ['chomeur'] },
      { id: 'retraite', label: 'Retraité·e', icon: Armchair, tags: ['retraite'] },
    ],
  },
  {
    id: 'age', niveau: 'court',
    jeu: 'Tu as quel âge ?',
    militant: 'Vous avez quel âge, si ce n’est pas indiscret ?',
    pourquoi: 'L’âge distingue les mesures pour la jeunesse de celles qui concernent la fin de carrière et la retraite.',
    choices: [
      { id: 'jeune', label: 'Moins de 30 ans', icon: Backpack, tags: ['jeune'] },
      { id: 'adulte', label: '30 à 54 ans', icon: User, tags: [] },
      { id: 'senior', label: '55 à 64 ans', icon: Briefcase, tags: ['senior'] },
      { id: 'ainé', label: '65 ans et plus', icon: Armchair, tags: ['senior'] },
    ],
  },
  {
    id: 'foyer', niveau: 'court', multiple: true,
    jeu: 'Dans ton foyer, il y a…',
    militant: 'Dans votre foyer, est-ce qu’il y a…',
    pourquoi: 'Les enfants et les proches à charge ouvrent les mesures sur l’école, la petite enfance et l’aide aux aidants.',
    choices: [
      { id: 'scolarise', label: 'Des enfants scolarisés', icon: School, tags: ['parent', 'enfant_scolarise'] },
      { id: 'petit', label: 'Un enfant de moins de 6 ans', icon: Baby, tags: ['parent', 'petite_enfance'] },
      { id: 'aidant', label: 'Un proche âgé ou malade que j’aide', icon: HandHeart, tags: ['aidant'] },
      { id: 'rien', label: 'Rien de tout ça', icon: Smile, tags: [] },
    ],
  },
  {
    id: 'logement', niveau: 'court',
    jeu: 'Et côté logement ?',
    militant: 'Vous êtes plutôt locataire ou propriétaire ?',
    pourquoi: 'Locataire, propriétaire ou mal logé : les mesures sur les loyers, le logement social et la rénovation diffèrent.',
    choices: [
      { id: 'locataire', label: 'Locataire dans le privé', icon: KeyRound, tags: ['locataire'] },
      { id: 'hlm', label: 'Locataire d’un logement social', icon: Building2, tags: ['locataire', 'hlm'] },
      { id: 'proprietaire', label: 'Propriétaire', icon: House, tags: ['proprietaire'] },
      { id: 'precaire', label: 'Hébergé·e ou logement précaire', icon: Home, tags: ['mal_loge', besoin('logement')] },
    ],
  },
  {
    id: 'lieu', niveau: 'court',
    jeu: 'Tu vis plutôt où ?',
    militant: 'Vous habitez plutôt où ?',
    pourquoi: 'Le lieu de vie oriente vers les mesures sur les services publics, les transports et l’outre-mer.',
    choices: [
      { id: 'grande-ville', label: 'Dans une grande ville', icon: Building, tags: ['grande_ville'] },
      { id: 'moyenne', label: 'Dans une ville moyenne', icon: Building2, tags: [] },
      { id: 'rural', label: 'À la campagne ou dans une petite ville', icon: Trees, tags: ['rural'] },
      { id: 'outre-mer', label: 'En outre-mer', icon: Sun, tags: ['outre_mer'] },
    ],
  },
  {
    id: 'compte', niveau: 'court', multiple: true, max: 4,
    jeu: 'Qu’est-ce qui compte le plus pour toi ? (4 maximum)',
    militant: 'Qu’est-ce qui compte le plus pour vous ? Choisissez-en quatre au plus.',
    pourquoi: 'C’est la question centrale : elle fait remonter les mesures des sujets qui comptent pour la personne.',
    choices: toutesLesThemes('i'),
  },
  // ---- normal
  {
    id: 'budget', niveau: 'normal',
    jeu: 'Les fins de mois, c’est…',
    militant: 'Est-ce que les fins de mois sont difficiles ?',
    pourquoi: 'Savoir si le budget est serré fait remonter les mesures sur les revenus, les aides et les prix.',
    choices: [
      oui(['budget_serre', besoin('pouvoir_achat')], 'Souvent juste'),
      { id: 'ca-va', label: 'Ça va', icon: Smile, tags: [] },
    ],
  },
  {
    id: 'energie', niveau: 'normal',
    jeu: 'Les factures d’énergie et le chauffage, ça pèse ?',
    militant: 'Les factures d’énergie, le chauffage, est-ce que ça pèse sur votre budget ?',
    pourquoi: 'La précarité énergétique ouvre les mesures sur les factures, l’isolation et le logement.',
    choices: [
      { id: 'pese', label: 'Oui, ça pèse', icon: Flame, tags: ['precarite_energetique', besoin('pouvoir_achat')] },
      { id: 'pese-mal-loge', label: 'Oui, et mon logement est mal isolé ou en mauvais état', icon: Snowflake, tags: ['precarite_energetique', 'mal_loge', besoin('pouvoir_achat'), besoin('logement')] },
      non('Non, ça va'),
    ],
  },
  {
    id: 'mobilite', niveau: 'normal', multiple: true,
    jeu: 'Pour te déplacer, tu utilises…',
    militant: 'Pour vos déplacements du quotidien, vous utilisez quoi ?',
    pourquoi: 'Voiture ou transports collectifs : les mesures sur le carburant, le train ou les transports ne sont pas les mêmes.',
    choices: [
      { id: 'voiture', label: 'La voiture', icon: Car, tags: ['automobiliste'] },
      { id: 'transports', label: 'Les transports en commun ou le train', icon: TrainFront, tags: ['usager_transports'] },
      { id: 'velo', label: 'Le vélo ou la marche', icon: Bike, tags: ['usager_transports'] },
      { id: 'peu', label: 'Je me déplace peu', icon: Home, tags: [] },
    ],
  },
  {
    id: 'sante', niveau: 'normal', multiple: true,
    jeu: 'Côté santé, tu es concerné·e par…',
    militant: 'Côté santé, est-ce que vous ou un proche êtes concerné par…',
    pourquoi: 'Maladie chronique ou handicap : les mesures sur les soins, l’hôpital et l’autonomie deviennent prioritaires.',
    choices: [
      { id: 'maladie', label: 'Une maladie chronique ou grave', icon: HeartPulse, tags: ['maladie', besoin('sante')] },
      { id: 'handicap', label: 'Un handicap', icon: Accessibility, tags: ['handicap', besoin('sante')] },
      { id: 'rien', label: 'Rien de particulier', icon: Smile, tags: [] },
    ],
  },
  {
    id: 'compte2', niveau: 'normal', multiple: true, max: 4, sansDoublon: true,
    jeu: 'Et ça, ça t’intéresse aussi ? (4 maximum)',
    militant: 'Et quels autres sujets vous intéressent ? Quatre au plus.',
    pourquoi: 'Un deuxième tour de sujets, moins prioritaires, pour compléter le classement.',
    choices: toutesLesThemes('j'),
  },
  // ---- long
  {
    id: 'compte3', niveau: 'long', multiple: true, max: 4, sansDoublon: true,
    jeu: 'Encore un dernier tour : d’autres sujets qui t’intéressent ?',
    militant: 'Dernier tour : d’autres sujets qui vous intéressent ?',
    pourquoi: 'Un troisième tour de sujets pour élargir le classement à ce qui reste.',
    choices: toutesLesThemes('k'),
  },
  {
    id: 'climat', niveau: 'long',
    jeu: 'Le climat et la nature, ça t’inquiète ?',
    militant: 'Le climat et la nature, c’est un sujet d’inquiétude pour vous ?',
    pourquoi: 'Une inquiétude écologique fait remonter les mesures de planification et de protection de la nature.',
    choices: [oui([interet('k', 'ecologie')], 'Oui, beaucoup'), non('Pas vraiment')],
  },
  {
    id: 'alimentation', niveau: 'long',
    jeu: 'Ce que tu manges, tu y fais attention ?',
    militant: 'Est-ce que vous faites attention à ce que vous mangez ?',
    pourquoi: 'L’attention à l’alimentation fait remonter les mesures sur l’agriculture, la cantine et les produits locaux.',
    choices: [oui([interet('k', 'agriculture')], 'Oui, beaucoup'), non('Pas vraiment')],
  },
  {
    id: 'culture', niveau: 'long', multiple: true,
    jeu: 'Tu pratiques…',
    militant: 'Vous pratiquez…',
    pourquoi: 'La pratique du sport ou de la culture fait remonter les mesures qui s’y rapportent.',
    choices: [
      { id: 'sport', label: 'Un sport ou une activité physique', icon: Dumbbell, tags: [interet('k', 'culture_sport')] },
      { id: 'culture', label: 'Des sorties ou des pratiques culturelles', icon: Megaphone, tags: [interet('k', 'culture_sport')] },
      { id: 'rien', label: 'Ni l’un ni l’autre', icon: Smile, tags: [] },
    ],
  },
  {
    id: 'numerique', niveau: 'long',
    jeu: 'Ta vie privée en ligne, les géants du web, l’intelligence artificielle : ça t’inquiète ?',
    militant: 'Votre vie privée en ligne, les géants du web, l’intelligence artificielle : ça vous inquiète ?',
    pourquoi: 'Une inquiétude numérique fait remonter les mesures sur les données personnelles et les outils numériques.',
    choices: [oui([interet('k', 'numerique')], 'Oui'), non('Pas trop')],
  },
  {
    id: 'democratie', niveau: 'long',
    jeu: 'Tu as l’impression que les politiques t’écoutent ?',
    militant: 'Avez-vous l’impression que les responsables politiques vous écoutent ?',
    pourquoi: 'Le sentiment de ne pas être entendu fait remonter les mesures sur les institutions et la participation.',
    choices: [{ id: 'non', label: 'Pas du tout', icon: X, tags: [interet('k', 'democratie')] }, { id: 'oui', label: 'Plutôt oui', icon: Check, tags: [] }],
  },
  {
    id: 'securite', niveau: 'long',
    jeu: 'La sécurité et la justice, c’est un sujet qui te préoccupe ?',
    militant: 'La sécurité et la justice, c’est un sujet qui vous préoccupe ?',
    pourquoi: 'Ce sujet fait remonter les mesures sur la police, la justice et les libertés.',
    choices: [oui([interet('k', 'justice_securite')], 'Oui'), non('Pas particulièrement')],
  },
  {
    id: 'international', niveau: 'long',
    jeu: 'Les guerres et la place de la France dans le monde, ça t’inquiète ?',
    militant: 'Les guerres et la place de la France dans le monde, ça vous inquiète ?',
    pourquoi: 'Ce sujet fait remonter les mesures sur la paix, la diplomatie et l’Europe.',
    choices: [oui([interet('k', 'international')], 'Oui'), non('Pas trop')],
  },
  {
    id: 'discriminations', niveau: 'long',
    jeu: 'L’égalité et la lutte contre les discriminations, c’est important pour toi ?',
    militant: 'L’égalité et la lutte contre les discriminations, c’est important pour vous ?',
    pourquoi: 'Ce sujet fait remonter les mesures sur les droits des femmes et contre les discriminations.',
    choices: [oui([interet('k', 'egalite')], 'Oui'), non('Pas particulièrement')],
  },
];

export const QUESTIONS: Record<string, Question> = Object.fromEntries(QUESTION_LIST.map((q) => [q.id, q]));

/** What each journey offers. Its length in questions (and so its duration) comes from the question bank. */
export const LONGUEURS: Record<Longueur, { titre: string; mesures: number; description: string }> = {
  court: { titre: 'Court', mesures: 15, description: 'Les 15 mesures qui comptent le plus pour toi.' },
  normal: { titre: 'Normal', mesures: 20, description: 'Un classement de 20 mesures, plus fin.' },
  long: { titre: 'Long', mesures: 30, description: 'Un classement de 30 mesures vraiment sur mesure.' },
};

/** Average time to read and answer one question, tap included. */
export const SECONDES_PAR_QUESTION = 15;
const minutes = (questions: number) => Math.max(1, Math.ceil((questions * SECONDES_PAR_QUESTION) / 60));
/** « ≈ 3 min » for a number of questions. */
export const dureeEstimee = (questions: number) => `≈ ${minutes(questions)} min`;
/** Time left in a journey: « ≈ 2 min restantes ». */
export const tempsRestant = (questions: number) =>
  questions <= 0 ? '' : questions * SECONDES_PAR_QUESTION <= 60 ? 'Moins d’une minute' : `≈ ${minutes(questions)} min restantes`;
/** How many of the ranked measures are highlighted first. */
export const EN_TETE = 10;

