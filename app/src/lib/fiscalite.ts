/*
 * Income-tax and inheritance-tax models, ported from the official simulators of La France insoumise
 * (https://impots.lafranceinsoumise.fr/ and /heritage). The proposed rates are NOT in the programme
 * summary of this repository, which only states "14 tranches" and "12 millions" : they come from those
 * simulators, whose own page calls them "pédagogiques" and not exact to the euro.
 *
 * Differences with the official code, on purpose:
 *  - the simulator then forces results (a small guaranteed gain for modest households, no gain for high
 *    incomes); this port returns the raw computation;
 *  - the décote of couples uses the couple threshold (the official code applies the single one);
 *  - inheritance is modelled for children only.
 * Current-law parameters are those of the simulator (income of 2023): they should be updated yearly.
 */

/** Piecewise-linear marginal rates: `rates[i]` applies above `thresholds[i]`. */
export function progressive(value: number, thresholds: number[], rates: number[]) {
  let total = 0;
  for (let i = 0; i < thresholds.length; i++) {
    const upper = i + 1 < thresholds.length ? thresholds[i + 1] : Infinity;
    total += rates[i] * Math.max(0, Math.min(value, upper) - thresholds[i]);
  }
  return total;
}

const monthly = (values: number[]) => values.map((v) => v * 12);

// ---------------------------------------------------------------- Income tax and CSG

const SLICES_CURRENT = { thresholds: [11294, 28797, 82341, 177106], rates: [0.11, 0.3, 0.41, 0.45] };
/** Proposed barème: 14 tranches, thresholds in net monthly euros. */
const SLICES_PROPOSED = {
  thresholds: monthly([0, 600, 900, 1300, 1600, 1900, 2300, 2700, 3100, 3600, 5000, 8000, 15000, 33000]),
  rates: [0.03, 0.04, 0.065, 0.085, 0.105, 0.125, 0.23, 0.25, 0.29, 0.32, 0.4, 0.53, 0.6, 0.7],
};
const CSG_PROPOSED = {
  thresholds: monthly([0, 500, 1000, 1400, 1800, 2200, 2700, 3400, 4200, 4990, 6000, 8000, 15000, 33000]),
  rates: [0.06, 0.065, 0.0675, 0.075, 0.08, 0.085, 0.092, 0.125, 0.1364, 0.15, 0.16, 0.17, 0.18, 0.19],
};
const CSG_CAP = 185472;
const DECOTE_RATE = 0.4525;

/** Net salary (yearly) to gross salary: the simulator's flat ratios. */
export function brut(net: number) {
  const ratios = [1.27, 1.25, 1.2, 1.15, 1.1];
  const limits = monthly([9000, 30000, 50000, 500000]);
  const i = limits.findIndex((limit) => net < limit);
  return ratios[i < 0 ? limits.length : i] * net;
}

/** Part of the gross salary subject to CSG: 98.25 % below the cap. */
const assietteCsg = (brutAnnuel: number) => progressive(brutAnnuel, [0, CSG_CAP], [0.9825, 1]);

const fraisForfaitaires = (revenu: number) => revenu - Math.min(Math.max(495, 0.1 * revenu), 14171);

/** Family quotient: adult parts plus children parts, with the cap on its advantage. */
function avecQuotient(revenu: number, couple: boolean, enfants: number, impot: (v: number) => number) {
  const adultes = couple ? 2 : 1;
  let partsEnfants = 0.5 * enfants + 0.5 * Math.max(0, enfants - 2);
  if (!couple && enfants > 0) partsEnfants += 0.5;
  const plafond = 1759 * partsEnfants * 2;
  const sans = impot(revenu / adultes) * adultes;
  const avec = impot(revenu / (adultes + partsEnfants)) * (adultes + partsEnfants);
  return sans - Math.min(sans - avec, plafond);
}

function impotNet(revenuNet: number, couple: boolean, enfants: number, slices: typeof SLICES_CURRENT) {
  const brutImpot = avecQuotient(fraisForfaitaires(revenuNet), couple, enfants,
    (v) => progressive(v, slices.thresholds, slices.rates));
  const decote = Math.max(0, (couple ? 1444 : 873) - DECOTE_RATE * brutImpot);
  const impot = brutImpot - decote;
  return impot >= 61 ? impot : 0;
}

export interface Prelevements { ir: number; csg: number; total: number }
export interface ResultatIr { actuel: Prelevements; propose: Prelevements; gain: number }

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const prelevements = (ir: number, csg: number): Prelevements => ({ ir, csg, total: ir + csg });

/** Yearly income tax and CSG of a household, today and with the proposed barèmes. `netMensuel`: one entry per adult. */
export function impotRevenu({ netMensuel, enfants }: { netMensuel: number[]; enfants: number }): ResultatIr {
  const bruts = netMensuel.map((m) => brut(m * 12));
  const couple = bruts.length > 1;
  const revenuNet = sum(bruts.map((b) => b - 0.068 * assietteCsg(b)));
  const csgActuelle = sum(bruts.map((b) => 0.097 * assietteCsg(b)));
  const csgProposee = sum(bruts.map((b) => {
    const base = assietteCsg(b);
    return progressive(base, CSG_PROPOSED.thresholds, CSG_PROPOSED.rates) + 0.005 * base;
  }));
  const actuel = prelevements(impotNet(revenuNet, couple, enfants, SLICES_CURRENT), csgActuelle);
  const propose = prelevements(impotNet(revenuNet, couple, enfants, SLICES_PROPOSED), csgProposee);
  return { actuel, propose, gain: actuel.total - propose.total };
}

// ---------------------------------------------------------------- Inheritance

const HERITAGE_ACTUEL = {
  abattement: 100_000,
  thresholds: [0, 8072, 12109, 15932, 552324, 902838, 1805677],
  rates: [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.45],
};
const HERITAGE_PROPOSE = {
  abattement: 120_000,
  plafondParHeritier: 12_000_000,
  thresholds: [0, 80000, 126200, 180000, 228800, 329000, 429600, 674800, 902838, 1266000, 1630000, 2340000,
    2925000, 4095000, 5265000, 10530000],
  rates: [0.025, 0.065, 0.09, 0.24, 0.3, 0.362, 0.4, 0.47, 0.54, 0.62, 0.69, 0.76, 0.8, 0.85, 0.9, 0.95],
};

export interface ResultatHeritage {
  actuel: { droits: number; netParHeritier: number };
  propose: { droits: number; netParHeritier: number; plafonne: boolean };
  /** Positive: less tax with the proposal. */
  gain: number;
}

/** Inheritance of children. `couple`: the patrimoine is the common one, each parent passes half of it. */
export function heritage({ patrimoine, heritiers, couple }: { patrimoine: number; heritiers: number; couple: boolean }): ResultatHeritage {
  const parts = Math.max(1, heritiers) * (couple ? 2 : 1);
  const droits = (regime: { abattement: number; thresholds: number[]; rates: number[] }) =>
    progressive(patrimoine / parts - regime.abattement, regime.thresholds, regime.rates) * parts;

  const droitsActuels = droits(HERITAGE_ACTUEL);
  let droitsProposes = droits(HERITAGE_PROPOSE);
  let netProposeTotal = patrimoine - droitsProposes;
  const plafondTotal = HERITAGE_PROPOSE.plafondParHeritier * Math.max(1, heritiers);
  const plafonne = netProposeTotal >= plafondTotal;
  if (plafonne) { droitsProposes += netProposeTotal - plafondTotal; netProposeTotal = plafondTotal; }

  const n = Math.max(1, heritiers);
  return {
    actuel: { droits: droitsActuels, netParHeritier: (patrimoine - droitsActuels) / n },
    propose: { droits: droitsProposes, netParHeritier: netProposeTotal / n, plafonne },
    gain: droitsActuels - droitsProposes,
  };
}
