import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { expect, it } from 'vitest';
import { CANAL_RELATIONS } from './data/canal-relations';

/*
 * Выжимка — производная база данных OpenStreetMap, и ODbL требует, чтобы она
 * оставалась отделимой и названной. Тест держит это свойство: лицензия и
 * указание авторства лежат в самом файле, а не только в документации.
 */
const source = JSON.parse(
  readFileSync(resolvePath(import.meta.dirname, 'data/canal-source.json'), 'utf8'),
) as {
  license: string;
  attribution: string;
  canals: { featureId: string; relation: number; ways: [number, number][][] }[];
};

it('выжимка названа лицензией ODbL и указывает авторство', () => {
  expect(source.license).toBe('ODbL-1.0');
  expect(source.attribution).toBe('© OpenStreetMap contributors');
});

it('у каждого канала из CANAL_RELATIONS есть участки своего отношения', () => {
  for (const [featureId, relation] of Object.entries(CANAL_RELATIONS)) {
    const canal = source.canals.find((one) => one.featureId === featureId);

    expect(canal?.relation).toBe(relation);
    expect(canal?.ways.length).toBeGreaterThan(100);
  }
});

it('точки лежат на востоке Китая и записаны с пятью знаками', () => {
  for (const canal of source.canals) {
    for (const [lon, lat] of canal.ways.flat()) {
      expect(lon).toBeGreaterThan(115);
      expect(lon).toBeLessThan(121);
      expect(lat).toBeGreaterThan(30);
      expect(lat).toBeLessThan(40.5);
      expect(Number(lon.toFixed(5))).toBe(lon);
    }
  }
});
