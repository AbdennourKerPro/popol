import type { LucideIcon } from 'lucide-react';

/** Profile label set by an answer, e.g. `locataire`, `bas_salaire`. */
export type Tag = string;
/** OR of ANDs: `[['salarie', 'penible'], ['senior']]`. */
export type Condition = Tag[][];

export interface Choice {
  id: string;
  label: string;
  icon: LucideIcon;
  tags: Tag[];
  /** Game mode: measure revealed as a bonus right after this answer. */
  teaser?: string;
}

export interface Question {
  id: string;
  /** Game wording (tutoiement). */
  jeu: string;
  /** Militant wording, to be said aloud (vouvoiement). */
  militant: string;
  /** Militant hint: why this question is asked. */
  pourquoi: string;
  si?: Condition;
  /** Hidden as soon as one of these tags is present. */
  sauf?: Tag[];
  multiple?: boolean;
  choices: Choice[];
}

/** A programme measure made relevant by a profile. */
export interface Target {
  mesure: string;
  si: Condition;
  poids: 1 | 2 | 3;
  /** Each present tag adds 1 to the score. */
  plus?: Tag[];
  tu: string;
  vous: string;
}

export interface Objection {
  objection: string;
  reponse: string;
  mesures: string[];
}

export interface Quiz {
  question: string;
  options: string[];
  bonne: number;
  mesure: string;
}

export type Accent = 'red' | 'purple' | 'ink';

export interface Theme {
  id: string;
  titre: string;
  accroche: string;
  icon: LucideIcon;
  accent: Accent;
  /** Themes of the "explorer" section are not tied to a personal situation. */
  groupe?: 'explorer';
  questions: string[];
  /** Game mode: the quiz is inserted after this many answers in the theme. */
  quizApres?: number;
  quiz?: Quiz;
  /** How many relevant measures are offered at most (default 8). */
  maxMesures?: number;
  cibles: Target[];
  /** Measures for everyone, shown after the personal ones. */
  collectif: string[];
  objections: Objection[];
}
