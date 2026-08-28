import { expect, it } from 'vitest';
import { collections } from '../content/collections';
import { cultureCollectionsUpTo, sameKindAs } from '../content/culture-sets';
import { buildCultureChoices } from './culture-choices';
import { CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';

const POOL = cultureCollectionsUpTo('all');

function idsFor(id: string, seed = 3): string[] {
  const target = collections.find((item) => item.id === id)!;

  return buildCultureChoices(
    target,
    sameKindAs(target),
    POOL,
    createSeededRandom(seed),
  ).map((item) => item.id);
}

it('даёт четыре варианта, среди них верный', () => {
  const ids = idsFor('region-hunan');

  expect(ids).toHaveLength(CHOICE_COUNT);
  expect(ids).toContain('region-hunan');
  expect(new Set(ids).size).toBe(CHOICE_COUNT);
});

it('отвлекает тем же родом', () => {
  for (const id of idsFor('feature-yangtze')) {
    expect(
      collections.find((item) => item.id === id)?.aboutFeatureId,
      id,
    ).toBeDefined();
  }
});

/*
 * Своих в наборе «памятники и явления» всего семь, и трёх отвлекающих хватает.
 * Но если бы не хватило, вопрос всё равно обязан получить четыре варианта:
 * вопрос с двумя хуже подсказки в виде рода.
 */
it('добирает из общего пула, когда своих мало', () => {
  const target = collections.find((item) => item.id === 'beijing-opera')!;
  const ids = buildCultureChoices(
    target,
    [target],
    POOL,
    createSeededRandom(1),
  ).map((item) => item.id);

  expect(ids).toHaveLength(CHOICE_COUNT);
  expect(ids).toContain('beijing-opera');
});

it('повторяется по сиду', () => {
  expect(idsFor('great-wall', 9)).toEqual(idsFor('great-wall', 9));
});
