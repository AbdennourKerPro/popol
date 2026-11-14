import type { LucideIcon } from 'lucide-react';

/** Profile label set by an answer: a public of the taxonomy (`locataire`) or an interest (`i:ecologie`). */
export type Tag = string;
/** OR of ANDs: `[['salarie', 'penible'], ['senior']]`. */
export type Condition = Tag[][];

/** Journey length: each one adds questions to the previous one. */
export type Longueur = 'court' | 'normal';
/** Who runs the journey: the person alone (game) or a militant interviewing them. */
export type Mode = 'jeu' | 'militant';

export interface Choice {
  id: string;
  label: string;
  icon: LucideIcon;
  tags: Tag[];
}

export interface Question {
  id: string;
  /** Game wording (tutoiement). */
  jeu: string;
  /** Militant wording, to be said aloud (vouvoiement). */
  militant: string;
  /** Militant hint: why this question is asked. */
  pourquoi: string;
  /** Game hint shown under the question. */
  aide?: string;
  /** Personal question (identity) asked only in the game, never at the door. */
  jeuSeul?: boolean;
  /** Shortest journey that asks it. */
  niveau: Longueur;
  si?: Condition;
  multiple?: boolean;
  /** Most choices that can be ticked in a multiple question. */
  max?: number;
  /** Hide the choices whose tags are already given by an earlier answer. */
  sansDoublon?: boolean;
  choices: Choice[];
}
