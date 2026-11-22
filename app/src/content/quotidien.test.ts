import { expect, test } from 'vitest';
import { hasMesure } from '../lib/programme';
import { LIEUX_DU_QUOTIDIEN } from './quotidien';

test('chaque lieu a un identifiant unique et renvoie à une mesure du programme', () => {
  const ids = LIEUX_DU_QUOTIDIEN.map((lieu) => lieu.id);
  expect(new Set(ids).size).toBe(LIEUX_DU_QUOTIDIEN.length);

  for (const lieu of LIEUX_DU_QUOTIDIEN) {
    expect(hasMesure(lieu.mesureId), lieu.mesureId).toBe(true);
  }
});
