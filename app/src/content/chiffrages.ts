import { heritage, impotRevenu } from '../lib/fiscalite';
import type { Tag } from './types';

/*
 * Figures computed only from numbers written in the programme (`figures`, checked against the measure
 * text by a test) and amounts entered by the person. Defaults are round values to adjust, never
 * presented as the current situation. What the programme does not state is said in `hypothese`.
 */

export interface Input {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaut: number | ((tags: Set<Tag>) => number);
  unite?: string;
  /** `annee` is shown without thousands separator; `oui-non` is a toggle (0/1). */
  kind?: 'nombre' | 'annee' | 'oui-non';
  hint?: string;
  /** Hidden (and not required) while this returns false; receives every input's current value. */
  visible?: (values: Record<string, number>) => boolean;
}

export interface Resultat {
  valeur: string;
  detail: string;
  /** One line for the poster; absent when the result is not a gain. */
  court?: string;
}

export interface Chiffrage {
  titre: string;
  inputs: Input[];
  calcul: (v: Record<string, number>) => Resultat;
  /** What the programme leaves out, and every figure not written in the measure. */
  hypothese: string;
  /** Figures of the programme this calculation relies on, exactly as written in the measure text. */
  figures: string[];
  /** Same, for figures given by an explanatory text of the programme rather than by the measure. */
  appui?: { texte: string; figures: string[] };
}

const NBSP = '\u00a0';
const group = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
export const eur = (n: number) => `${group(n)}${NBSP}€`;
const millions = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString('fr-FR')}${NBSP}M€`;

/** Figures stated in the programme. */
const SMIC_NET = 1700;
/** Poverty line for a single person, as written in the guaranteed-autonomy measure. */
const SEUIL_PAUVRETE = 1337;

const gainMensuel = (gain: number, quoi: string): Resultat => gain > 0
  ? { valeur: `+${eur(gain)}`, detail: `par mois, soit +${eur(gain * 12)} par an`, court: `+${eur(gain)} par mois ${quoi}` }
  : { valeur: 'Déjà atteint', detail: 'Avec ce montant, cette mesure ne change pas la somme versée.' };

const gainAnnuel = (gain: number, quoi: string): Resultat => gain > 0
  ? { valeur: `+${eur(gain)}`, detail: `par an, soit ${eur(gain / 12)} par mois`, court: `${eur(gain)} économisés par an ${quoi}` }
  : { valeur: eur(0), detail: 'Rien à économiser avec ces montants.' };

const signe = (gain: number, apres: string, court: (g: number) => string, detail: string): Resultat => {
  if (Math.abs(gain) < 1) return { valeur: '≈ 0 €', detail: `Presque aucun changement avec ces montants. ${detail}` };
  return gain > 0
    ? { valeur: `+${eur(gain)}`, detail: `${apres}. ${detail}`, court: court(gain) }
    : { valeur: `−${eur(-gain)}`, detail: `${apres.replace('en moins', 'en plus')}. ${detail}` };
};

const SMIC: Chiffrage = {
  titre: 'Gain avec le SMIC à 1 700 € net',
  inputs: [
    { id: 'salaire_net', label: 'Salaire net mensuel actuel', min: 600, max: 1700, step: 10, defaut: 1400, unite: '€' },
    { id: 'quotite', label: 'Temps de travail', min: 50, max: 100, step: 5, defaut: 100, unite: '%' },
  ],
  calcul: ({ salaire_net, quotite }) => {
    const cible = (SMIC_NET * quotite) / 100;
    return cible > salaire_net
      ? gainMensuel(cible - salaire_net, 'avec le SMIC à 1 700 €')
      : { valeur: 'Déjà au-dessus', detail: `À ${quotite} %, le SMIC revalorisé serait de ${eur(cible)} net par mois.` };
  },
  hypothese: 'Le programme fixe le SMIC à 1 700 € net par mois. Calcul au prorata du temps de travail, pour un salaire au SMIC, hors primes et heures supplémentaires.',
  figures: ['1 700 euros net'],
};

const GARANTIE: Chiffrage = {
  titre: 'Garantie d’autonomie : ton revenu au seuil de pauvreté',
  inputs: [{ id: 'revenus', label: 'Revenu mensuel actuel (personne seule)', min: 0, max: 1337, step: 10, defaut: 700, unite: '€' }],
  calcul: ({ revenus }) => gainMensuel(SEUIL_PAUVRETE - revenus, 'avec la garantie d’autonomie'),
  hypothese: 'Le programme porte le revenu de chaque personne au seuil de pauvreté, soit 1 337 € pour une personne seule. Calcul pour une personne seule, qui complète le revenu jusqu’à ce seuil, sans préjuger des modalités ni du traitement des autres aides.',
  figures: ['1 337 euros pour une personne seule'],
};

/** Keyed by measure id of the programme. */
export const CHIFFRAGES: Record<string, Chiffrage> = {
  'p2c02-ss02-m001': {
    titre: 'Ton impôt sur le revenu avec 14 tranches',
    inputs: [
      { id: 'couple', label: 'Déclaration commune en couple', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: 0 },
      { id: 'net1', label: 'Ton salaire net mensuel', min: 0, max: 12000, step: 50, defaut: 1800, unite: '€' },
      { id: 'net2', label: 'Salaire net mensuel de ton conjoint', min: 0, max: 12000, step: 50, defaut: 1500, unite: '€', visible: (v) => v.couple === 1 },
      { id: 'enfants_foyer', label: 'Enfants à charge', min: 0, max: 6, step: 1, defaut: (t) => (t.has('parent') ? 1 : 0) },
    ],
    calcul: ({ couple, net1, net2, enfants_foyer }) => {
      const r = impotRevenu({ netMensuel: couple ? [net1, net2] : [net1], enfants: enfants_foyer });
      const famille = couple || enfants_foyer > 0 ? ' Hors autres changements que le programme ne chiffre pas (quotient conjugal, crédits par enfant).' : '';
      return signe(
        r.actuel.ir - r.propose.ir, 'par an en moins',
        (g) => `≈ ${eur(g)} d’impôt sur le revenu en moins par an`,
        `Impôt sur le revenu : ${eur(r.actuel.ir)} → ${eur(r.propose.ir)}.${famille}`,
      );
    },
    hypothese: 'Le programme prévoit un barème à 14 tranches au lieu de 5 mais n’en publie pas les taux. Ils sont ceux du simulateur de La France insoumise (impots.lafranceinsoumise.fr), appliqués au barème actuel de l’impôt : à vérifier avant de s’y fier. Calcul sur le seul impôt sur le revenu : la CSG n’y est pas incluse, car le programme la fusionne dans une cotisation sociale universelle qu’il ne chiffre pas.',
    figures: ['14 tranches'],
  },
  'p2c02-ss02-m007': {
    titre: 'Ta part d’héritage sous 150 000 €',
    inputs: [{ id: 'part', label: 'Part d’héritage reçue d’un parent', min: 0, max: 400000, step: 5000, defaut: 120000, unite: '€' }],
    calcul: ({ part }) => {
      if (part >= 150000) return { valeur: 'Au-dessus', detail: 'Ta part dépasse 150 000 € : l’exonération ne s’applique pas. Le programme ne précise pas le barème au-delà.' };
      const droits = heritage({ patrimoine: part, heritiers: 1, couple: false }).actuel.droits;
      return droits < 1
        ? { valeur: eur(0), detail: 'Pas de droits de succession aujourd’hui non plus à ce montant : rien ne change pour toi.' }
        : { valeur: `+${eur(droits)}`, detail: 'de droits de succession en moins : ceux qui seraient dus aujourd’hui.', court: `${eur(droits)} de droits de succession en moins` };
    },
    hypothese: 'Le programme exonère de droits de succession les héritages inférieurs à 150 000 €. On suppose qu’il s’agit de la part reçue par un héritier en ligne directe. Les droits actuels sont calculés avec le droit en vigueur (abattement de 100 000 € par parent et par enfant, puis barème progressif). Le programme ne donne pas le barème au-delà de 150 000 €.',
    figures: ['150 000 euros'],
  },
  'p2c02-ss03-m001': SMIC,
  'p2c02-ss01-m003': SMIC,
  'p2c02-ss01-m004': {
    titre: 'Gain avec le point d’indice +10 %',
    inputs: [{ id: 'traitement', label: 'Traitement net mensuel hors primes', min: 1200, max: 4500, step: 50, defaut: 2000, unite: '€' }],
    calcul: ({ traitement }) => gainMensuel(traitement * 0.1, 'avec le point d’indice'),
    hypothese: 'Le point d’indice revalorisé de 10 % s’applique au traitement indiciaire, pas aux primes. Calcul approché sur le net.',
    figures: ['10 %'],
  },
  'p2c02-ss01-m005': {
    titre: 'Gain avec les APL +10 %',
    inputs: [{ id: 'apl', label: 'APL mensuelles actuelles', min: 10, max: 600, step: 5, defaut: 200, unite: '€' }],
    calcul: ({ apl }) => gainMensuel(apl * 0.1, 'd’APL'),
    hypothese: 'Le programme revalorise les APL de 10 %. Calcul sur le montant actuel, à situation inchangée.',
    figures: ['10 %'],
  },
  'p3c01-ss07-m002': {
    titre: 'Pension relevée par le programme',
    inputs: [
      { id: 'carriere_complete', label: 'Carrière complète (sinon : minimum vieillesse)', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: 1 },
      { id: 'pension', label: 'Pension nette mensuelle actuelle', min: 300, max: 1700, step: 10, defaut: 1100, unite: '€' },
    ],
    calcul: ({ carriere_complete, pension }) => gainMensuel((carriere_complete ? SMIC_NET : SEUIL_PAUVRETE) - pension, 'de pension'),
    hypothese: 'Selon le programme, une pension de carrière complète est portée au moins au niveau du SMIC revalorisé (1 700 € net) et le minimum vieillesse au seuil de pauvreté (1 337 € pour une personne seule, chiffre donné par une autre mesure du programme).',
    figures: ['SMIC revalorisé', 'minimum vieillesse'],
  },
  'p3c01-ss01-m001': GARANTIE,
  'p3c02-ss03-m002': GARANTIE,
  'p3c01-ss07-m001': {
    titre: 'Ton départ à la retraite',
    inputs: [
      { id: 'naissance', label: 'Année de naissance', min: 1960, max: 2010, step: 1, defaut: 1980, kind: 'annee' },
      { id: 'debut_carriere', label: 'Âge au premier emploi', min: 15, max: 30, step: 1, defaut: 22, unite: 'ans' },
    ],
    calcul: ({ naissance, debut_carriere }) => {
      // 60 years old and 40 annuities: taux plein at the later of the two.
      const age = Math.max(60, debut_carriere + 40);
      const annee = naissance + age;
      const detail = age === 60 ? 'Départ à 60 ans, à taux plein avec 40 annuités.' : `Départ à taux plein à ${age} ans : les 40 annuités ne sont atteintes qu’à cet âge.`;
      return {
        valeur: `${annee}`, detail: `${detail} Pour une carrière continue.`,
        court: age === 60 ? `Retraite à taux plein à 60 ans, en ${annee}` : `Retraite à taux plein à ${age} ans, en ${annee}`,
      };
    },
    hypothese: 'Le programme restaure le droit à la retraite à 60 ans à taux plein pour 40 annuités de cotisations. L’âge est abaissé progressivement : le calendrier de cette transition n’est pas précisé, la date affichée est celle de la règle une fois restaurée, pour une carrière continue depuis le premier emploi.',
    figures: ['60 ans', '40 annuités'],
  },
  'p3c01-ss04-m001': {
    titre: 'Temps de travail en moins',
    inputs: [
      { id: 'heures', label: 'Heures travaillées par semaine', min: 32, max: 48, step: 1, defaut: 39, unite: 'h' },
      { id: 'penible', label: 'Métier pénible ou de nuit', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: 0 },
    ],
    calcul: ({ heures, penible }) => {
      const cible = penible ? 32 : 35;
      const moins = heures - cible;
      return moins > 0
        ? { valeur: `−${moins} h`, detail: `par semaine, soit environ ${group(moins * 46)} heures de moins par an`, court: `${moins} h de travail en moins par semaine` }
        : { valeur: `${cible} h`, detail: 'Déjà à la durée prévue par le programme.' };
    },
    hypothese: 'Retour immédiat aux 35 heures, 32 heures dans les métiers pénibles ou de nuit. Calcul sur 46 semaines travaillées (6 semaines de congés payés avec la sixième semaine proposée). Le programme ne précise pas ici l’effet sur la rémunération.',
    figures: ['35 heures', '32 heures'],
  },
  'p3c01-ss04-m002': {
    titre: 'Congés payés',
    inputs: [],
    calcul: () => ({ valeur: '+1 semaine', detail: '6 semaines de congés payés par an au lieu de 5.', court: '+1 semaine de congés payés par an' }),
    hypothese: 'Le programme généralise une sixième semaine de congés payés. Le droit actuel est de 5 semaines.',
    figures: ['sixième semaine'],
  },
  'p3c01-ss09-m003': {
    titre: 'Formation',
    inputs: [],
    calcul: () => ({ valeur: '36 h', detail: 'de formation libre chaque année, soit 180 h sur 5 ans.', court: '36 h de formation libre par an' }),
    hypothese: '36 heures de formation par an pour chaque salarié, librement utilisables, selon le programme.',
    figures: ['36 heures'],
  },
  'p3c03-ss04-m003': {
    titre: 'Économie sur la crèche publique',
    inputs: [{ id: 'creche', label: 'Coût mensuel de la crèche publique', min: 0, max: 1200, step: 10, defaut: 300, unite: '€' }],
    calcul: ({ creche }) => gainAnnuel(creche * 11, 'sur la crèche'),
    hypothese: 'Le programme garantit la gratuité des crèches publiques (pas celle des autres modes de garde). Calcul sur 11 mois de garde par an.',
    figures: ['gratuité des crèches publiques'],
  },
  'p4c02-ss02-m001': {
    titre: 'Économie sur l’école',
    inputs: [
      { id: 'nb_enfants', label: 'Enfants scolarisés', min: 1, max: 6, step: 1, defaut: 1 },
      { id: 'cantine', label: 'Cantine par mois et par enfant', min: 0, max: 200, step: 5, defaut: 60, unite: '€' },
      { id: 'frais_ecole', label: 'Transport, périscolaire, fournitures : par an et par enfant', min: 0, max: 1000, step: 10, defaut: 150, unite: '€' },
    ],
    calcul: ({ nb_enfants, cantine, frais_ecole }) => gainAnnuel(nb_enfants * (cantine * 10 + frais_ecole), 'sur l’école'),
    hypothese: 'Le programme assure la gratuité réelle de l’éducation publique : cantine, transport, activités périscolaires, manuels et fournitures. Calcul sur 10 mois de cantine par année scolaire.',
    figures: ['gratuité réelle'],
  },
  'p3c01-ss08-m001': {
    titre: 'Économie avec le 100 % Sécu',
    inputs: [
      { id: 'mutuelle', label: 'Cotisation de mutuelle par mois', min: 0, max: 400, step: 5, defaut: 70, unite: '€' },
      { id: 'reste_charge', label: 'Frais de santé non remboursés par an', min: 0, max: 3000, step: 10, defaut: 200, unite: '€' },
    ],
    calcul: ({ mutuelle, reste_charge }) => gainAnnuel(mutuelle * 12 + reste_charge, 'sur la santé'),
    hypothese: 'Le programme rembourse à 100 % les soins prescrits et intègre les assurances maladie complémentaires à la Sécurité sociale. Calcul si plus aucune cotisation de mutuelle ni aucun reste à charge n’est payé directement. Le programme ne dit pas comment le financement se répartit entre cotisations et impôts : le calcul ne l’inclut pas.',
    figures: ['100 %'],
  },
  'p3c01-ss01-m010': {
    titre: 'Économie sur les protections périodiques',
    inputs: [{ id: 'protections', label: 'Budget mensuel', min: 0, max: 40, step: 1, defaut: 10, unite: '€' }],
    calcul: ({ protections }) => gainAnnuel(protections * 12, 'de protections périodiques'),
    hypothese: 'Le programme rend gratuites les protections périodiques, quel que soit l’âge.',
    figures: ['gratuité des protections périodiques'],
  },
  'p3c02-ss05-m001': {
    titre: 'AAH au niveau du SMIC',
    inputs: [{ id: 'aah', label: 'AAH mensuelle actuelle', min: 0, max: 1700, step: 10, defaut: 1000, unite: '€' }],
    calcul: ({ aah }) => gainMensuel(SMIC_NET - aah, 'd’AAH'),
    hypothese: 'Le programme revalorise l’AAH à hauteur du SMIC. Le SMIC revalorisé étant de 1 700 € net (autre mesure du programme), calcul sur ce montant, sans préjuger des conditions de ressources.',
    figures: ['SMIC'],
  },
  'p4c02-ss06-m004': {
    titre: 'Économie sur la CVEC',
    inputs: [
      { id: 'cvec', label: 'CVEC payée par an', min: 0, max: 200, step: 1, defaut: 100, unite: '€' },
      { id: 'annees_etudes', label: 'Années d’études restantes', min: 1, max: 8, step: 1, defaut: 3, unite: 'ans' },
    ],
    calcul: ({ cvec, annees_etudes }) => ({
      valeur: `+${eur(cvec * annees_etudes)}`, detail: `sur ${annees_etudes} an${annees_etudes > 1 ? 's' : ''} d’études`, court: `${eur(cvec * annees_etudes)} de CVEC en moins`,
    }),
    hypothese: 'Le programme supprime la contribution de vie étudiante et de campus (CVEC). Le montant est à entrer : il change chaque année.',
    figures: ['CVEC'],
  },
  'p2c02-ss03-m006': {
    titre: 'Écart maximal de 1 à 20',
    inputs: [{ id: 'bas', label: 'Salaire le plus bas de l’entreprise (par mois)', min: 1500, max: 10000, step: 50, defaut: 2000, unite: '€' }],
    calcul: ({ bas }) => ({ valeur: eur(bas * 20), detail: 'par mois : le plus haut salaire autorisé dans cette entreprise' }),
    hypothese: 'Le programme fixe un salaire maximal qui limite l’écart de 1 à 20 entre le salaire le plus bas et le plus haut d’une entreprise. On suppose cet écart mesuré sur la rémunération mensuelle totale.',
    figures: ['de 1 à 20'],
  },
  'p2c02-ss02-m004': {
    titre: 'Garantie d’impôt de 2 % : la calculette',
    inputs: [{ id: 'patrimoine_m', label: 'Patrimoine d’un centimillionnaire', min: 100, max: 2000, step: 10, defaut: 150, unite: 'M€' }],
    calcul: ({ patrimoine_m }) => ({ valeur: millions(patrimoine_m * 0.02), detail: 'd’impôt par an au minimum, au titre de la garantie de 2 %' }),
    hypothese: 'Le programme introduit une garantie d’impôt de 2 % sur le patrimoine des centimillionnaires (patrimoine d’au moins 100 M€). On la lit comme un impôt total minimal de 2 % du patrimoine : le programme n’en précise pas les modalités.',
    figures: ['2 %', 'centimillionaires'],
  },
  'p4c02-ss07-m002': {
    titre: 'Conscription citoyenne',
    inputs: [],
    calcul: () => ({ valeur: `≈ ${eur(SMIC_NET * 9)}`, detail: 'net sur 9 mois rémunérés au SMIC revalorisé (1 700 € net).', court: `≈ ${eur(SMIC_NET * 9)} pour 9 mois de conscription` }),
    hypothese: 'Le programme prévoit une conscription de neuf mois, avant l’âge de 25 ans, rémunérée au SMIC revalorisé : ces deux précisions figurent dans le texte qui introduit la mesure. Le SMIC revalorisé est de 1 700 € net (autre mesure du programme).',
    figures: ['neuf mois'],
    appui: { texte: 'p4c02-ss07-t001', figures: ['avant l’âge de 25 ans', 'rémunéré au SMIC revalorisé pendant neuf mois'] },
  },
  'p5c03-ss04-m004': {
    titre: 'Logements publics',
    inputs: [],
    calcul: () => ({ valeur: '1 000 000', detail: 'logements publics construits en 5 ans, plus 150 000 logements pour les jeunes.' }),
    hypothese: '200 000 logements publics par an et 30 000 logements pour les jeunes pendant 5 ans, selon le programme.',
    figures: ['200 000 logements publics par an', '30 000 logements jeunes pendant 5 ans'],
  },
  'p3c02-ss04-m003': {
    titre: 'Places en EHPAD publics',
    inputs: [],
    calcul: () => ({ valeur: '50 000', detail: 'places en EHPAD publics créées en 5 ans.' }),
    hypothese: '10 000 places par an pendant cinq ans, selon le programme.',
    figures: ['10 000 places par an', 'cinq ans'],
  },
  'p3c03-ss04-m002': {
    titre: 'Places d’accueil des jeunes enfants',
    inputs: [],
    calcul: () => ({ valeur: '500 000', detail: 'places d’accueil pour les jeunes enfants ouvertes progressivement.' }),
    hypothese: 'Le programme planifie l’ouverture progressive de 500 000 places (crèches publiques, associatives, assistantes maternelles, jardins d’enfants).',
    figures: ['500 000 places'],
  },
  'p3c03-ss01-m006': {
    titre: 'Congé d’accueil de l’enfant',
    inputs: [],
    calcul: () => ({ valeur: '20 semaines', detail: 'de congé par parent, soit 40 semaines pour un couple : identique et obligatoire pour les deux parents.', court: '20 semaines de congé d’accueil par parent' }),
    hypothese: 'Le programme remplace les congés maternité et paternité par un congé d’accueil de l’enfant de 20 semaines par parent, identique et obligatoire. Le total de 40 semaines est celui d’un couple de deux parents.',
    figures: ['20 semaines par parent'],
  },
};

export type Values = Record<string, number>;

export function inputValue(input: Input, values: Values, tags: Set<Tag>) {
  if (input.id in values) return values[input.id];
  return typeof input.defaut === 'function' ? input.defaut(tags) : input.defaut;
}

/** Current value of every input of a chiffrage (set by the person, or its default). */
export function effectiveValues(mesureId: string, values: Values, tags: Set<Tag>): Values {
  return Object.fromEntries((CHIFFRAGES[mesureId]?.inputs ?? []).map((i) => [i.id, inputValue(i, values, tags)]));
}

/** Inputs displayed for the current answers (conditional inputs are hidden). */
export function visibleInputs(mesureId: string, values: Values, tags: Set<Tag>): Input[] {
  const effective = effectiveValues(mesureId, values, tags);
  return (CHIFFRAGES[mesureId]?.inputs ?? []).filter((i) => !i.visible || i.visible(effective));
}

/** True once the person has set every displayed amount (toggles prefilled count as set). */
export function isConfirmed(mesureId: string, values: Values, tags: Set<Tag> = new Set()) {
  if (!CHIFFRAGES[mesureId]) return false;
  return visibleInputs(mesureId, values, tags).every((i) => i.kind === 'oui-non' || i.id in values);
}

export function estimate(mesureId: string, values: Values, tags: Set<Tag>): Resultat | undefined {
  const chiffrage = CHIFFRAGES[mesureId];
  return chiffrage?.calcul(effectiveValues(mesureId, values, tags));
}
