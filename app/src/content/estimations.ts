import { heritage, impotRevenu } from '../lib/fiscalite';
import type { Tag } from './types';

/*
 * Figures computed only from numbers written in the programme and amounts entered by the
 * person. Defaults are round values to adjust, never presented as the current situation.
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

export interface Estimation {
  titre: string;
  inputs: Input[];
  calcul: (v: Record<string, number>) => Resultat;
  hypothese: string;
}

const NBSP = ' ';
const group = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
export const eur = (n: number) => `${group(n)}${NBSP}€`;

const SMIC = 1700;

const gainMensuel = (gain: number, quoi: string): Resultat => gain > 0
  ? { valeur: `+${eur(gain)}`, detail: `par mois, soit +${eur(gain * 12)} par an`, court: `+${eur(gain)} par mois ${quoi}` }
  : { valeur: 'Déjà atteint', detail: 'Avec ce montant, cette mesure ne change pas la somme versée.' };

const gainAnnuel = (gain: number, quoi: string): Resultat => gain > 0
  ? { valeur: `+${eur(gain)}`, detail: `par an, soit ${eur(gain / 12)} par mois`, court: `${eur(gain)} économisés par an ${quoi}` }
  : { valeur: '0 €', detail: 'Rien à économiser avec ces montants.' };

const seuil = (titre: string, cible: string): Estimation => ({
  titre,
  inputs: [
    { id: 'revenus', label: 'Revenus mensuels actuels', min: 0, max: 2000, step: 10, defaut: 700, unite: '€' },
    { id: 'seuil', label: 'Seuil de pauvreté mensuel', min: 900, max: 1600, step: 10, defaut: 1250, unite: '€',
      hint: 'Le seuil à 60 % du revenu médian pour une personne seule est publié chaque année par l’Insee : valeur à ajuster.' },
  ],
  calcul: ({ revenus, seuil: s }) => gainMensuel(s - revenus, `avec ${cible}`),
  hypothese: 'Le programme garantit un revenu au moins au seuil de pauvreté. Le calcul complète les revenus jusqu’à ce seuil, sans préjuger des modalités exactes.',
});

const salaireParDefaut = (tags: Set<Tag>) =>
  tags.has('bas_salaire') ? 1400 : tags.has('salaire_moyen') ? 2100 : tags.has('petite_pension') ? 1300 : 1800;

const signe = (gain: number, apres: string, court: (g: number) => string, detail: string): Resultat => {
  if (Math.abs(gain) < 1) return { valeur: '≈ 0 €', detail: `Presque aucun changement avec ces montants. ${detail}` };
  return gain > 0
    ? { valeur: `+${eur(gain)}`, detail: `${apres}. ${detail}`, court: court(gain) }
    : { valeur: `−${eur(-gain)}`, detail: `${apres.replace('en moins', 'en plus')}. ${detail}` };
};

/** Keyed by measure id. */
export const ESTIMATIONS: Record<string, Estimation> = {
  's01-ss01-m001': {
    titre: 'Ton impôt avec 14 tranches',
    inputs: [
      { id: 'couple', label: 'Déclaration commune en couple', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: (t) => (t.has('couple') ? 1 : 0) },
      { id: 'net1', label: 'Ton salaire net mensuel', min: 0, max: 12000, step: 50, defaut: salaireParDefaut, unite: '€' },
      { id: 'net2', label: 'Salaire net mensuel de ton conjoint', min: 0, max: 12000, step: 50, defaut: 1500, unite: '€', visible: (v) => v.couple === 1 },
      { id: 'enfants_foyer', label: 'Enfants à charge', min: 0, max: 6, step: 1, defaut: (t) => (t.has('parent') ? 1 : 0) },
    ],
    calcul: ({ couple, net1, net2, enfants_foyer }) => {
      const r = impotRevenu({ netMensuel: couple ? [net1, net2] : [net1], enfants: enfants_foyer });
      const famille = couple || enfants_foyer > 0
        ? ' Hors effet de la fin du quotient conjugal et du crédit d’impôt par enfant, que le programme ne chiffre pas.' : '';
      return signe(
        r.gain, 'par an en moins',
        (g) => `≈ ${eur(g)} d’impôt et de CSG en moins par an`,
        `Impôt sur le revenu : ${eur(r.actuel.ir)} → ${eur(r.propose.ir)}. CSG : ${eur(r.actuel.csg)} → ${eur(r.propose.csg)}.${famille}`,
      );
    },
    hypothese: 'Calcul inspiré du simulateur officiel de La France insoumise (impots.lafranceinsoumise.fr), qui applique un impôt sur le revenu et une CSG à 14 tranches. Les taux de ces tranches ne figurent pas dans le résumé du programme de ce site, qui indique seulement « 14 tranches ». Outil pédagogique, pas exact à l’euro près : il ne porte que sur les salaires (ni revenus du capital, ni réductions et crédits d’impôt) et utilise le barème actuel des revenus 2023. Le programme remplace le quotient conjugal par un crédit d’impôt par enfant dont le montant n’est pas précisé : le quotient familial actuel est donc conservé ici. Le simulateur officiel ajuste ensuite certains résultats (un gain minimal pour les revenus modestes, pas de gain pour les revenus élevés) : ce calcul n’applique pas cet ajustement et peut donc en différer.',
  },
  's01-ss01-m006': {
    titre: 'Ton héritage avec le plafond à 12 millions',
    inputs: [
      { id: 'couple_heritage', label: 'Patrimoine commun d’un couple', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: (t) => (t.has('couple') ? 1 : 0) },
      { id: 'patrimoine', label: 'Patrimoine transmis', min: 0, max: 3000000, step: 10000, defaut: 400000, unite: '€',
        hint: 'Au-delà de 3 millions, le calcul est le même : les taux montent jusqu’à 95 %.' },
      { id: 'heritiers', label: 'Enfants héritiers', min: 1, max: 6, step: 1, defaut: 2 },
    ],
    calcul: ({ couple_heritage, patrimoine, heritiers }) => {
      const r = heritage({ patrimoine, heritiers, couple: couple_heritage === 1 });
      if (r.actuel.droits < 1 && r.propose.droits < 1) {
        return { valeur: '0 €', detail: 'Aucun droit de succession dans les deux cas : tes enfants recevraient la même somme.' };
      }
      const plafond = r.propose.plafonne ? ' Plafond de 12 millions atteint.' : '';
      return signe(
        r.gain, 'de droits de succession en moins',
        (g) => `${eur(g)} de droits de succession en moins`,
        `Droits : ${eur(r.actuel.droits)} → ${eur(r.propose.droits)}.${plafond}`,
      );
    },
    hypothese: 'Calcul inspiré du simulateur officiel de La France insoumise (impots.lafranceinsoumise.fr/heritage). Il compare le barème actuel (abattement de 100 000 € par enfant et par parent) à un barème proposé (abattement de 120 000 €, taux de 2,5 % à 95 %, plafond de 12 millions d’euros reçus par héritier). Ces taux ne figurent pas dans le résumé du programme de ce site. Le patrimoine est réparti à parts égales entre les enfants ; en couple, on suppose un patrimoine commun dont chaque parent transmet la moitié. Ne tient pas compte de l’assurance-vie, des biens professionnels, des donations ni des autres abattements. Le simulateur officiel affirme que l’impôt sur le patrimoine baisserait ou n’augmenterait pas pour 90 % des contribuables : c’est son affirmation, pas un résultat de ce calcul.',
  },
  's01-ss08-m001': {
    titre: 'Gain avec le SMIC à 1 700 € net',
    inputs: [
      { id: 'salaire_net', label: 'Salaire net mensuel actuel', min: 600, max: 1700, step: 10, defaut: 1400, unite: '€' },
      { id: 'quotite', label: 'Temps de travail', min: 50, max: 100, step: 5, defaut: 100, unite: '%' },
    ],
    calcul: ({ salaire_net, quotite }) => {
      const cible = SMIC * quotite / 100;
      return cible > salaire_net
        ? gainMensuel(cible - salaire_net, 'avec le SMIC à 1 700 €')
        : { valeur: 'Déjà au-dessus', detail: `À ${quotite} %, le SMIC revalorisé serait de ${eur(cible)} net par mois.` };
    },
    hypothese: 'Le programme fixe le SMIC à 1 700 € net par mois à temps plein. Calcul au prorata du temps de travail, pour un salaire au SMIC, hors primes et heures supplémentaires.',
  },
  's01-ss08-m003': {
    titre: 'Gain avec le point d’indice +10 %',
    inputs: [{ id: 'traitement', label: 'Traitement net mensuel hors primes', min: 1200, max: 4500, step: 50, defaut: 2000, unite: '€' }],
    calcul: ({ traitement }) => gainMensuel(traitement * 0.1, 'avec le point d’indice'),
    hypothese: 'Le point d’indice revalorisé de 10 % s’applique au traitement indiciaire, pas aux primes. Calcul approché sur le net.',
  },
  's01-ss08-m004': {
    titre: 'Gain avec les APL +10 %',
    inputs: [{ id: 'apl', label: 'APL mensuelles actuelles', min: 10, max: 600, step: 5, defaut: 200, unite: '€' }],
    calcul: ({ apl }) => gainMensuel(apl * 0.1, 'd’APL'),
    hypothese: 'Le programme revalorise les APL de 10 %. Calcul sur le montant actuel, à situation inchangée.',
  },
  's01-ss14-m002': {
    titre: 'Pension au niveau du SMIC revalorisé',
    inputs: [{ id: 'pension', label: 'Pension nette mensuelle actuelle', min: 300, max: 1700, step: 10, defaut: 1100, unite: '€' }],
    calcul: ({ pension }) => gainMensuel(SMIC - pension, 'de pension'),
    hypothese: 'Selon le programme, toutes les pensions seraient au moins au niveau du SMIC revalorisé, soit 1 700 € net par mois.',
  },
  's01-ss14-m003': seuil('Minimum vieillesse au seuil de pauvreté', 'le minimum vieillesse'),
  's05-ss07-m001': seuil('Garantie d’autonomie', 'la garantie d’autonomie'),
  's01-ss15-m006': seuil('Garantie d’autonomie des jeunes', 'la garantie d’autonomie'),
  's01-ss14-m001': {
    titre: 'Âge de départ à la retraite',
    inputs: [
      { id: 'naissance', label: 'Année de naissance', min: 1960, max: 2010, step: 1, defaut: 1980, kind: 'annee' },
      { id: 'debut_carriere', label: 'Âge au premier emploi', min: 15, max: 30, step: 1, defaut: 22, unite: 'ans' },
    ],
    calcul: ({ naissance, debut_carriere }) => {
      const annee = naissance + 60;
      const annuites = Math.max(60, debut_carriere + 40);
      if (annee <= new Date().getFullYear()) {
        return { valeur: '60 ans', detail: 'Âge déjà atteint : départ possible dès maintenant, à taux plein avec 40 annuités.', court: 'Retraite possible à 60 ans' };
      }
      return {
        valeur: `${annee}`,
        detail: annuites === 60
          ? 'Départ possible à 60 ans, à taux plein avec 40 annuités.'
          : `Départ possible à 60 ans. Les 40 annuités seraient atteintes à ${annuites} ans, en ${naissance + annuites}, sans carrière interrompue.`,
        court: `Retraite possible à 60 ans, en ${annee}`,
      };
    },
    hypothese: 'Le programme rétablit la retraite à 60 ans pour 40 annuités, et supprime la décote. Calcul pour une carrière continue depuis le premier emploi.',
  },
  's01-ss10-m002': {
    titre: 'Temps de travail en moins',
    inputs: [
      { id: 'heures', label: 'Heures travaillées par semaine', min: 32, max: 48, step: 1, defaut: 39, unite: 'h' },
      { id: 'penible', label: 'Métier pénible', min: 0, max: 1, step: 1, kind: 'oui-non', defaut: (t) => (t.has('penible') ? 1 : 0) },
    ],
    calcul: ({ heures, penible }) => {
      const cible = penible ? 32 : 35;
      const moins = heures - cible;
      return moins > 0
        ? { valeur: `−${moins} h`, detail: `par semaine, soit environ ${group(moins * 46)} heures de moins par an`, court: `${moins} h de travail en moins par semaine` }
        : { valeur: `${cible} h`, detail: 'Déjà à la durée prévue par le programme.' };
    },
    hypothese: 'Retour immédiat aux 35 heures, 32 heures dans les métiers pénibles. Calcul sur 46 semaines travaillées (6 semaines de congés). Le résumé du programme ne précise pas ici l’effet sur la rémunération.',
  },
  's01-ss10-m003': {
    titre: 'Congés payés',
    inputs: [],
    calcul: () => ({ valeur: '+1 semaine', detail: '6 semaines de congés payés par an au lieu de 5.', court: '+1 semaine de congés payés par an' }),
    hypothese: 'Le programme crée une sixième semaine de congés payés pour tous.',
  },
  's01-ss11-m009': {
    titre: 'Formation',
    inputs: [],
    calcul: () => ({ valeur: '36 h', detail: 'de formation libre chaque année, soit 180 h sur 5 ans.', court: '36 h de formation libre par an' }),
    hypothese: '36 heures de formation libre par an pour chaque salarié, selon le programme.',
  },
  's06-ss01-m002': {
    titre: 'Économie sur la crèche',
    inputs: [{ id: 'creche', label: 'Coût mensuel de la crèche', min: 0, max: 1200, step: 10, defaut: 300, unite: '€' }],
    calcul: ({ creche }) => gainAnnuel(creche * 11, 'sur la crèche'),
    hypothese: 'Le programme rend gratuits les crèches et jardins d’enfants. Calcul sur 11 mois de garde par an.',
  },
  's06-ss03-m001': {
    titre: 'Économie sur l’école',
    inputs: [
      { id: 'nb_enfants', label: 'Enfants scolarisés', min: 1, max: 6, step: 1, defaut: 1 },
      { id: 'cantine', label: 'Cantine par mois et par enfant', min: 0, max: 200, step: 5, defaut: 60, unite: '€' },
      { id: 'frais_ecole', label: 'Transport, périscolaire, fournitures : par an et par enfant', min: 0, max: 1000, step: 10, defaut: 150, unite: '€' },
    ],
    calcul: ({ nb_enfants, cantine, frais_ecole }) => gainAnnuel(nb_enfants * (cantine * 10 + frais_ecole), 'sur l’école'),
    hypothese: 'Le programme prévoit la gratuité réelle de l’école publique : cantine, transport, périscolaire, manuels et fournitures. Calcul sur 10 mois de cantine par année scolaire.',
  },
  's05-ss02-m001': {
    titre: 'Économie avec le 100 % Sécu',
    inputs: [
      { id: 'mutuelle', label: 'Cotisation de mutuelle par mois', min: 0, max: 400, step: 5, defaut: 70, unite: '€' },
      { id: 'reste_charge', label: 'Frais de santé non remboursés par an', min: 0, max: 3000, step: 10, defaut: 200, unite: '€' },
    ],
    calcul: ({ mutuelle, reste_charge }) => gainAnnuel(mutuelle * 12 + reste_charge, 'sur la santé'),
    hypothese: 'Le programme prévoit le remboursement intégral des soins et l’intégration des mutuelles à la Sécu. Calcul si plus aucune cotisation de mutuelle ni aucun reste à charge n’est payé directement. Le financement passe par la Sécurité sociale.',
  },
  's05-ss06-m003': {
    titre: 'Économie sur les protections périodiques',
    inputs: [{ id: 'protections', label: 'Budget mensuel', min: 0, max: 40, step: 1, defaut: 10, unite: '€' }],
    calcul: ({ protections }) => gainAnnuel(protections * 12, 'de protections périodiques'),
    hypothese: 'Le programme rend les protections périodiques gratuites.',
  },
  's05-ss10-m001': {
    titre: 'AAH au niveau du SMIC',
    inputs: [{ id: 'aah', label: 'AAH mensuelle actuelle', min: 0, max: 1700, step: 10, defaut: 1000, unite: '€' }],
    calcul: ({ aah }) => gainMensuel(SMIC - aah, 'd’AAH'),
    hypothese: 'Le programme porte l’AAH au niveau du SMIC (1 700 € net) pour les personnes dans l’incapacité totale de travailler.',
  },
  's06-ss07-m002': {
    titre: 'Économie sur les frais d’inscription',
    inputs: [
      { id: 'frais_inscription', label: 'Frais d’inscription par an', min: 0, max: 1000, step: 5, defaut: 200, unite: '€' },
      { id: 'annees_etudes', label: 'Années d’études restantes', min: 1, max: 8, step: 1, defaut: 3, unite: 'ans' },
    ],
    calcul: ({ frais_inscription, annees_etudes }) => {
      const total = frais_inscription * annees_etudes;
      return total > 0
        ? { valeur: `+${eur(total)}`, detail: `sur ${annees_etudes} an${annees_etudes > 1 ? 's' : ''} d’études`, court: `${eur(total)} de frais d’inscription en moins` }
        : { valeur: '0 €', detail: 'Rien à économiser avec ces montants.' };
    },
    hypothese: 'Le programme rend les études gratuites de la licence au doctorat. Calcul hors CVEC, comptée à part.',
  },
  's06-ss07-m004': {
    titre: 'Économie sur la CVEC',
    inputs: [
      { id: 'cvec', label: 'CVEC payée par an', min: 0, max: 200, step: 1, defaut: 100, unite: '€' },
      { id: 'annees_etudes', label: 'Années d’études restantes', min: 1, max: 8, step: 1, defaut: 3, unite: 'ans' },
    ],
    calcul: ({ cvec, annees_etudes }) => ({
      valeur: `+${eur(cvec * annees_etudes)}`, detail: `sur ${annees_etudes} an${annees_etudes > 1 ? 's' : ''} d’études`, court: `${eur(cvec * annees_etudes)} de CVEC en moins`,
    }),
    hypothese: 'Le programme supprime la CVEC (contribution de vie étudiante et de campus).',
  },
  's01-ss12-m004': {
    titre: 'Indemnisation dès le premier jour',
    inputs: [
      { id: 'aj', label: 'Allocation chômage par jour', min: 15, max: 150, step: 1, defaut: 40, unite: '€' },
      { id: 'jours_attente', label: 'Jours sans indemnisation au début', min: 0, max: 30, step: 1, defaut: 7, unite: 'jours',
        hint: 'Délai d’attente et éventuels différés avant le premier versement : à ajuster selon la situation.' },
    ],
    calcul: ({ aj, jours_attente }) => jours_attente > 0
      ? { valeur: `+${eur(aj * jours_attente)}`, detail: 'à chaque ouverture de droits', court: `+${eur(aj * jours_attente)} d’allocation au début du chômage` }
      : { valeur: '0 €', detail: 'Pas de jours d’attente avec ces paramètres.' },
    hypothese: 'Le programme prévoit l’indemnisation dès le premier jour. Calcul des jours d’attente qui seraient indemnisés.',
  },
  's07-ss04-m001': {
    titre: 'Conscription citoyenne',
    inputs: [],
    calcul: () => ({ valeur: `≈ ${eur(SMIC * 9)}`, detail: 'net sur 9 mois rémunérés au SMIC revalorisé (1 700 € net).', court: `≈ ${eur(SMIC * 9)} pour 9 mois de conscription` }),
    hypothese: 'Conscription citoyenne de 9 mois rémunérée au SMIC, que le programme porte à 1 700 € net.',
  },
  's01-ss01-m003': {
    titre: 'Taxe Zucman : la calculette',
    inputs: [{ id: 'patrimoine_md', label: 'Patrimoine d’un milliardaire', min: 1, max: 200, step: 1, defaut: 10, unite: 'Md€' }],
    calcul: ({ patrimoine_md }) => ({ valeur: `${group(patrimoine_md * 20)}${NBSP}M€`, detail: 'd’impôt par an, au minimum' }),
    hypothese: 'Les milliardaires paieraient au moins 2 % d’impôt sur tout leur patrimoine.',
  },
  's01-ss09-m001': {
    titre: 'Logements publics',
    inputs: [],
    calcul: () => ({ valeur: '1 000 000', detail: 'logements publics construits en 5 ans.' }),
    hypothese: '200 000 logements publics par an pendant 5 ans, selon le programme.',
  },
  's05-ss09-m001': {
    titre: 'Places en EHPAD publics',
    inputs: [],
    calcul: () => ({ valeur: '50 000', detail: 'places en EHPAD publics créées en 5 ans.' }),
    hypothese: '10 000 places par an pendant 5 ans, selon le programme.',
  },
};

// The CSG is part of the same household calculation as the income tax.
ESTIMATIONS['s01-ss01-m002'] = ESTIMATIONS['s01-ss01-m001'];

export type Values = Record<string, number>;

export function inputValue(input: Input, values: Values, tags: Set<Tag>) {
  if (input.id in values) return values[input.id];
  return typeof input.defaut === 'function' ? input.defaut(tags) : input.defaut;
}

/** Current value of every input of an estimation (set by the person, or its default). */
export function effectiveValues(mesureId: string, values: Values, tags: Set<Tag>): Values {
  const estimation = ESTIMATIONS[mesureId];
  return Object.fromEntries((estimation?.inputs ?? []).map((i) => [i.id, inputValue(i, values, tags)]));
}

/** Inputs displayed for the current answers (conditional inputs are hidden). */
export function visibleInputs(mesureId: string, values: Values, tags: Set<Tag>): Input[] {
  const effective = effectiveValues(mesureId, values, tags);
  return (ESTIMATIONS[mesureId]?.inputs ?? []).filter((i) => !i.visible || i.visible(effective));
}

/** True once the person has set every displayed amount (toggles prefilled from answers count as set). */
export function isConfirmed(mesureId: string, values: Values, tags: Set<Tag> = new Set()) {
  if (!ESTIMATIONS[mesureId]) return false;
  return visibleInputs(mesureId, values, tags).every((i) => i.kind === 'oui-non' || i.id in values);
}

export function estimate(mesureId: string, values: Values, tags: Set<Tag>): Resultat | undefined {
  const estimation = ESTIMATIONS[mesureId];
  if (!estimation) return undefined;
  return estimation.calcul(effectiveValues(mesureId, values, tags));
}
