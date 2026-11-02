// Compiles the measures corpus from ../rag (single source of truth) into a compact JSON
// bundled by the app. Run automatically before dev, build and test.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../../rag/data/structured/mesures.jsonl', import.meta.url);
const output = new URL('../src/data/mesures.json', import.meta.url);

const rows = readFileSync(source, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const mesures = Object.fromEntries(rows.map((r) => [r.id, { texte: r.texte, sousSection: r.sous_section }]));

mkdirSync(new URL('.', output), { recursive: true });
writeFileSync(output, JSON.stringify({ mesures }));
console.log(`${rows.length} mesures -> src/data/mesures.json`);
