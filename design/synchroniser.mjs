#!/usr/bin/env node
// Copie le système de design (jetons.css, systeme.css) dans les deux applications, qui sont
// construites séparément (contextes Docker distincts) et ne peuvent pas importer design/.
//   node design/synchroniser.mjs
// Un test dans chaque application vérifie que la copie est à jour.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FICHIERS = ['jetons.css', 'systeme.css'];
export const ENTETE = '/* Fichier généré par design/synchroniser.mjs : ne pas modifier ici, modifier design/. */\n';
const ICI = dirname(fileURLToPath(import.meta.url));
const CIBLES = ['../app/src/styles/systeme', '../rag/frontend/src/styles/systeme'];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const cible of CIBLES) {
    const dossier = join(ICI, cible);
    mkdirSync(dossier, { recursive: true });
    for (const fichier of FICHIERS) writeFileSync(join(dossier, fichier), ENTETE + readFileSync(join(ICI, fichier), 'utf8'));
    console.log(`copié dans ${cible}`);
  }
}
