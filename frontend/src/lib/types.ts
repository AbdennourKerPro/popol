export interface Source {
  id: string; type: 'mesure' | 'annexe_bloc' | 'web'; section: string; subsection: string;
  text: string; pages: number[]; source_url: string; pdf_url: string; corpus_version: string;
  title?: string; publisher?: string; retrieved_at?: string;
}
export interface ChatOptions { research?: boolean; focus_measure_id?: string }
export interface Followup { label: string; question: string; measure_id: string; measure_title: string; research: boolean }
export interface Answer {
  request_id: string; corpus_version: string; status: 'answered' | 'partial' | 'clarification' | 'not_in_corpus';
  blocks: { kind: string; text: string; source_ids: string[] }[];
  measures: { id: string; explanation: string; expected_benefit: string; benefit_basis: string }[];
  sources: Source[]; mode: 'generated' | 'consultation'; quota?: Quota | null;
  research?: boolean; followups?: Followup[];
}
export interface Quota { limit: number; used: number; remaining: number; resets_at: string; exhausted: boolean; reason?: string | null; label?: string }
export interface ChatMessage extends ChatOptions { id: string; role: 'user' | 'assistant'; content: string; answer?: Answer }
export interface Conversation { id: string; title: string; messages: ChatMessage[]; updated: number }
export interface Status {
  measure_count: number; annex_count: number; index_ready: boolean; index_message: string | null;
  generation_available: boolean; consultation_mode: boolean; retrieval_mode: string; model: string;
  web_search_enabled: boolean; web_available: boolean; provider?: string; beta_mode?: boolean;
}
