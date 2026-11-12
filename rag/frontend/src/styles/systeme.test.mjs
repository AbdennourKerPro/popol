import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The design system lives in design/ and is copied here by design/synchroniser.mjs.
// design/ is absent from the Docker build context: the check is then skipped.
const DESIGN = new URL('../../../../design/', import.meta.url);
const ENTETE = '/* Fichier généré par design/synchroniser.mjs : ne pas modifier ici, modifier design/. */\n';

describe.skipIf(!existsSync(DESIGN))('Système de design', () => {
  it.each(['jetons.css', 'systeme.css'])('%s est à jour (node design/synchroniser.mjs)', fichier => {
    const copie = readFileSync(new URL(`systeme/${fichier}`, import.meta.url), 'utf8');
    expect(copie).toBe(ENTETE + readFileSync(new URL(fichier, DESIGN), 'utf8'));
  });
});
