import { regions } from '../content/regions';
import { buildChoices, CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';

it('даёт ровно четыре варианта', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices).toHaveLength(CHOICE_COUNT);
});

it('включает правильный вариант ровно один раз', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices.filter((region) => region.id === 'sichuan')).toHaveLength(1);
});

it('не повторяет варианты', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(new Set(choices.map((region) => region.id)).size).toBe(CHOICE_COUNT);
});

it('предпочитает отвлекающие варианты того же типа региона', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices.every((region) => region.kind === 'province')).toBe(true);
});

it('добирает варианты из других типов, когда своих не хватает', () => {
  const choices = buildChoices(regions, 'macao', createSeededRandom(1));

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(choices.map((region) => region.id)).toContain('macao');
});

it('даёт один и тот же набор и порядок при одном seed', () => {
  expect(buildChoices(regions, 'sichuan', createSeededRandom(5))).toEqual(
    buildChoices(regions, 'sichuan', createSeededRandom(5)),
  );
});

it('ставит правильный вариант на разные места при разных seed', () => {
  const positions = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      buildChoices(regions, 'sichuan', createSeededRandom(seed)).findIndex(
        (region) => region.id === 'sichuan',
      ),
    ),
  );

  expect(positions.size).toBeGreaterThan(1);
});

it('не строит варианты для неизвестного региона', () => {
  expect(() => buildChoices(regions, 'atlantis', createSeededRandom(1))).toThrow(
    /Неизвестный регион: atlantis/,
  );
});
