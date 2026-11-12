// Compiles the programme corpus (../rag/data/programme) and its annotations (data/annotations.jsonl)
// into one compact JSON bundled by the app. Run automatically before dev, build and test.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const read = (url) => readFileSync(url, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const rows = read(new URL('../../rag/data/programme/mesures.jsonl', import.meta.url));
const report = JSON.parse(readFileSync(new URL('../../rag/data/programme/import-report.json', import.meta.url), 'utf8'));
const annotationsUrl = new URL('../data/annotations.jsonl', import.meta.url);
const annotations = existsSync(annotationsUrl) ? Object.fromEntries(read(annotationsUrl).map((a) => [a.id, a])) : {};

const parties = new Map();
const chapitres = new Map();
const sousSections = new Map();
const mesures = {};
const CATEGORIES = { cle: 'cle', complementaire: 'comp', sous_mesure: 'sous' };

for (const r of rows) {
  const partie = r.id.slice(0, 2);
  const titre = (value) => value.replace(/^(Partie \d+\s*–|Chapitre \d+\s*:)\s*/, '');
  parties.set(partie, { id: partie, titre: titre(r.partie) });
  chapitres.set(r.section_id, { id: r.section_id, titre: titre(r.chapitre), partie });
  sousSections.set(r.sous_section_id, { id: r.sous_section_id, titre: r.sous_section, chapitre: r.section_id });
  const a = annotations[r.id];
  mesures[r.id] = {
    t: r.texte, c: CATEGORIES[r.categorie], s: r.sous_section_id, u: r.source_url,
    ...(r.parent_id ? { p: r.parent_id } : {}),
    th: a?.themes ?? [], pu: a?.publics ?? [], po: a?.portee ?? 'collective', ...(a?.resume ? { r: a.resume } : {}),
  };
}

const output = new URL('../src/data/programme.json', import.meta.url);
mkdirSync(new URL('.', output), { recursive: true });
writeFileSync(output, JSON.stringify({
  extraitLe: report.extrait_le.slice(0, 10), source: report.source,
  parties: [...parties.values()], chapitres: [...chapitres.values()], sousSections: [...sousSections.values()], mesures,
}));
console.log(`${rows.length} mesures (${Object.keys(annotations).length} annotées) -> src/data/programme.json`);
