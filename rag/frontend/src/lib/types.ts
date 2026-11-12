export interface Source {
  id: string; type: 'mesure' | 'texte_explicatif' | 'web'; categorie?: 'cle' | 'complementaire' | 'sous_mesure' | null; section: string; subsection: string;
  text: string; source_url: string; corpus_version: string;
  title?: string; publisher?: string; retrieved_at?: string;
}
/** `standalone`: the question makes sense without the conversation (it can be shared as a link). */
export interface ChatOptions { research?: boolean; focus_measure_id?: string; standalone?: boolean; profile?: string[] }
export interface Followup { label: string; question: string; research: boolean }
export interface AnswerPoint { text: string; source_ids: string[] }
export interface AnswerBlock { kind: string; text: string; source_ids: string[]; points?: AnswerPoint[] }
export interface Answer {
  request_id: string; corpus_version: string; status: 'answered' | 'partial' | 'clarification' | 'not_in_corpus';
  blocks: AnswerBlock[];
  measures: { id: string; explanation: string; expected_benefit: string; benefit_basis: string }[];
  sources: Source[]; mode: 'generated' | 'consultation'; quota?: Quota | null;
  research?: boolean; followups?: Followup[]; related?: Source[];
}
export interface Quota { limit: number; used: number; remaining: number; resets_at: string; exhausted: boolean; reason?: string | null; label?: string }
export type FeedbackReason = 'incomplet' | 'hors_sujet' | 'pas_clair' | 'erreur';
export interface Feedback { rating: 'up' | 'down'; reason?: FeedbackReason | null }
export interface ChatMessage extends ChatOptions { id: string; role: 'user' | 'assistant'; content: string; answer?: Answer; feedback?: Feedback }
export interface Conversation { id: string; title: string; messages: ChatMessage[]; updated: number }
export interface Status {
  measure_count: number; text_count: number; index_ready: boolean; index_message: string | null;
  generation_available: boolean; consultation_mode: boolean; retrieval_mode: string; model: string;
  web_search_enabled: boolean; web_available: boolean; provider?: string; beta_mode?: boolean;
  publics?: { id: string; label: string }[];
}
