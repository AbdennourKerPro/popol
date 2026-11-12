import type { AnswerBlock } from '../lib/types';
import AnswerBlocks from './AnswerBlocks';
import { ChatiCat } from './ChatiCat';

/** While an answer is being written: provisional blocks, current step, passages found. */
export default function Attente({ stage, found, draftBlocks }: { stage: string; found: string[]; draftBlocks: AnswerBlock[] }) {
  return (
    <>
      {!!draftBlocks.length && (
        <article className="assistant-message provisional" aria-busy="true" aria-label="Réponse en cours de rédaction">
          <div className="answer-body"><AnswerBlocks blocks={draftBlocks} sources={[]} /></div>
        </article>
      )}
      <div className="thinking" role="status">
        <span className="mini-brand"><ChatiCat size={30} /></span>
        <span className="thinking-dots"><i /><i /><i /></span>
        {stage}
      </div>
      {!!found.length && (
        <div className="thinking-found" aria-live="polite">
          <span>Dans le programme, j’ai trouvé :</span>
          <ul>{found.map(title => <li key={title}>{title}</li>)}</ul>
        </div>
      )}
    </>
  );
}
