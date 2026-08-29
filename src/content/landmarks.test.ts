import { expect, it } from 'vitest';
import { landmarks } from './landmarks';
import { regions } from './regions';
import { sources } from './sources';

it('у каждой записи есть регион из справочника', () => {
  const known = new Set(regions.map((region) => region.id));

  for (const landmark of landmarks) {
    expect(known.has(landmark.regionId), `${landmark.id}: неизвестный регион`).toBe(
      true,
    );
  }
});

it('у каждой записи есть источник и хотя бы один факт', () => {
  const known = new Set<string>(sources.map((source) => source.id));

  for (const landmark of landmarks) {
    expect(landmark.sourceIds.length, `${landmark.id}: нет источника`).toBeGreaterThan(0);
    expect(landmark.facts.length, `${landmark.id}: нет фактов`).toBeGreaterThan(0);

    for (const id of [
      ...landmark.sourceIds,
      ...landmark.facts.flatMap((fact) => fact.sourceIds),
    ]) {
      expect(known.has(id), `${landmark.id}: источник ${id} не в реестре`).toBe(true);
    }
  }
});

it('идентификаторы и китайские названия не повторяются', () => {
  expect(new Set(landmarks.map((one) => one.id)).size).toBe(landmarks.length);
  expect(new Set(landmarks.map((one) => one.nameZh)).size).toBe(landmarks.length);
});

it('координаты лежат в пределах страны', () => {
  for (const landmark of landmarks) {
    expect(landmark.lon, landmark.id).toBeGreaterThan(73);
    expect(landmark.lon, landmark.id).toBeLessThan(135);
    expect(landmark.lat, landmark.id).toBeGreaterThan(18);
    expect(landmark.lat, landmark.id).toBeLessThan(54);
  }
});
