import {
  Accessibility, Armchair, Baby, Backpack, Bike, Briefcase, Building, Building2, Car, Flame, Globe, GraduationCap, HandHeart, HardHat,
  HeartHandshake, HeartPulse, Home, Hourglass, House, KeyRound, Landmark, Megaphone, Rainbow, School, Search, Smile, Snowflake,
  Stethoscope, Store, Sun, TrainFront, Tractor, Trees, User, Wallet, X,
} from 'lucide-react';
import { type Theme, THEME_IDS, THEMES } from './taxonomie';
import type { Choice, Longueur, Question } from './types';

/**
 * Interest tags (`i:theme`): the topics ticked at the end. They weigh less than a matching situation,
 * so that the measures which change the person's daily life come first.
 */
export const POIDS_INTERET: Record<string, number> = { i: 2 };
/**
 * `b:` a difficulty the person has stated (bills, health…): measures for everyone on that theme that
 * directly reach most people count as if aimed at them, even if the theme was not ticked.
 */
export const POIDS_BESOIN = 5;
export const besoin = (theme: Theme) => `b:${theme}`;
export const interet = (theme: Theme) => `i:${theme}`;

const toutesLesThemes = (): Choice[] => THEME_IDS.map((t) => ({ id: t, label: THEMES[t].label, icon: THEMES[t].icon, tags: [interet(t)] }));

const non = (label = 'Non'): Choice => ({ id: 'non', label, icon: X, tags: [] });
const aucun = (label = 'Rien de tout ça'): Choice => ({ id: 'rien', label, icon: Smile, tags: [] });

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
    id: 'metier', niveau: 'court', multiple: true, si: [['salarie'], ['independant']],
    jeu: 'Et ton travail, c’est plutôt…',
    militant: 'Et votre travail, c’est dans quel domaine ?',
    pourquoi: 'Soignants, enseignants et métiers pénibles sont visés par des mesures précises : salaires, effectifs, retraite anticipée.',
    choices: [
      { id: 'soin', label: 'Dans le soin ou le médico-social', icon: Stethoscope, tags: ['soignant'] },
      { id: 'education', label: 'Dans l’éducation ou la recherche', icon: School, tags: ['enseignant'] },
      { id: 'penible', label: 'Physique, de nuit ou en horaires décalés', icon: HardHat, tags: ['metier_penible'] },
      aucun('Aucun de ces cas'),
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
    id: 'genre', niveau: 'court', jeuSeul: true,
    jeu: 'Tu es…',
    aide: 'Pour faire remonter les mesures sur l’égalité femmes-hommes. Tu peux passer.',
    militant: '', pourquoi: '',
    choices: [
      { id: 'femme', label: 'Une femme', icon: User, tags: ['femme'] },
      { id: 'homme', label: 'Un homme', icon: User, tags: [] },
      { id: 'autre', label: 'Non-binaire ou autre', icon: Rainbow, tags: ['lgbti'] },
    ],
  },
  {
    id: 'budget', niveau: 'court',
    jeu: 'Avec ce que gagne ton foyer, les fins de mois sont…',
    militant: 'Avec ce que gagne votre foyer, est-ce que les fins de mois sont difficiles ?',
    pourquoi: 'Un budget serré fait remonter les mesures sur les salaires, les minima sociaux, les aides et les prix.',
    choices: [
      { id: 'difficiles', label: 'Difficiles', icon: Wallet, tags: ['budget_serre', besoin('pouvoir_achat')] },
      { id: 'justes', label: 'Un peu justes', icon: Hourglass, tags: [besoin('pouvoir_achat')] },
      { id: 'ca-va', label: 'Ça va', icon: Smile, tags: [] },
    ],
  },
  {
    id: 'foyer', niveau: 'court', multiple: true,
    jeu: 'Dans ton foyer, il y a…',
    militant: 'Dans votre foyer, est-ce qu’il y a…',
    pourquoi: 'Les enfants et les proches à charge ouvrent les mesures sur l’école, la petite enfance, les familles monoparentales et l’aide aux aidants.',
    choices: [
      { id: 'scolarise', label: 'Des enfants scolarisés', icon: School, tags: ['parent', 'enfant_scolarise'] },
      { id: 'petit', label: 'Un enfant de moins de 6 ans', icon: Baby, tags: ['parent', 'petite_enfance'] },
      { id: 'seul', label: 'J’élève seul·e mes enfants', icon: HandHeart, tags: ['parent', 'monoparental'] },
      { id: 'aidant', label: 'Un proche âgé ou malade que j’aide', icon: HeartHandshake, tags: ['aidant'] },
      aucun(),
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
    pourquoi: 'Le lieu de vie oriente vers les mesures sur les services publics, les transports, les quartiers populaires et l’outre-mer.',
    choices: [
      { id: 'grande-ville', label: 'Dans une grande ville', icon: Building, tags: ['grande_ville'] },
      { id: 'quartier', label: 'Dans un quartier populaire', icon: Building2, tags: ['quartier_populaire'] },
      { id: 'moyenne', label: 'Dans une ville moyenne', icon: Store, tags: [] },
      { id: 'rural', label: 'À la campagne ou dans une petite ville', icon: Trees, tags: ['rural'] },
      { id: 'outre-mer', label: 'En outre-mer', icon: Sun, tags: ['outre_mer'] },
    ],
  },
  // ---- normal
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
      aucun('Rien de particulier'),
    ],
  },
  {
    id: 'identite', niveau: 'normal', multiple: true, jeuSeul: true,
    jeu: 'Si tu le souhaites : tu es concerné·e par…',
    aide: 'Facultatif. Rien n’est enregistré : ça sert seulement à faire remonter les mesures qui te protègent.',
    militant: '', pourquoi: '',
    choices: [
      { id: 'lgbti', label: 'Je suis LGBTI+', icon: Rainbow, tags: ['lgbti'] },
      { id: 'racisme', label: 'Le racisme ou les discriminations (origine, couleur de peau, religion)', icon: Megaphone, tags: ['discrimine'] },
      { id: 'etranger', label: 'Je suis étranger·e ou immigré·e', icon: Globe, tags: ['etranger'] },
      aucun(),
    ],
  },
  {
    id: 'compte', niveau: 'court', multiple: true, max: 3,
    jeu: 'Pour finir : un sujet qui te tient à cœur ? (3 maximum)',
    militant: 'Pour finir, un sujet qui vous tient particulièrement à cœur ? Trois au plus.',
    pourquoi: 'Une seule question d’opinion, en dernier : elle complète le classement avec des mesures plus générales.',
    choices: toutesLesThemes(),
  },
];

export const QUESTIONS: Record<string, Question> = Object.fromEntries(QUESTION_LIST.map((q) => [q.id, q]));

/** What each journey offers. Its length in questions (and so its duration) comes from the question bank. */
export const LONGUEURS: Record<Longueur, { titre: string; mesures: number; description: string }> = {
  court: { titre: 'Court', mesures: 15, description: 'Ta situation en quelques questions : les 15 mesures qui changent le plus ton quotidien.' },
  normal: { titre: 'Complet', mesures: 25, description: 'Santé, énergie, transports et plus encore : 25 mesures vraiment sur mesure.' },
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

