import { renderInline } from '../lib/richText';
import type { AnswerBlock, Source } from '../lib/types';

const blockTitles: Record<string, string> = { explanation: 'Ce qui changerait', comparison: 'Par rapport à aujourd’hui', benefits: 'Les avantages attendus', limits: 'Les points à préciser' };

/** Answer blocks: introduction, then one sourced item per point. Citation numbers are the
 * position of the source in `sources`. Without `onCite`, citations are shown but inactive
 * (provisional rendering while the answer is still being written). */
export default function AnswerBlocks({ blocks, sources, onCite }: { blocks: AnswerBlock[]; sources: Source[]; onCite?: (id: string) => void }) {
  const cite = (id: string) => {
    const number = sources.findIndex(s => s.id === id) + 1;
    return onCite
      ? <button key={id} className="citation" aria-label={`Consulter la source ${id}`} onClick={() => onCite(id)}>{number}</button>
      : <span key={id} className="citation" aria-hidden="true">{number || '·'}</span>;
  };
  return <>{blocks.map((block, i) => {
    const points = block.points ?? [];
    const inPoints = new Set(points.flatMap(p => p.source_ids));
    return <div className={`answer-block block-${block.kind}`} key={i}>
      {blockTitles[block.kind] && <h3>{blockTitles[block.kind]}</h3>}
      <p>{renderInline(block.text)}{block.source_ids.filter(id => !inPoints.has(id)).map(cite)}</p>
      {!!points.length && <ul className="answer-points">{points.map((point, j) => <li key={j}>{renderInline(point.text)}{point.source_ids.map(cite)}</li>)}</ul>}
    </div>;
  })}</>;
}
