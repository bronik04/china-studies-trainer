import { expect, it } from 'vitest';
import { colocatedLandmarkIds } from './landmark-points';

/*
 * Пекинская гроздь: три объекта в полутора единицах карты. Соседей по ней
 * раунд исключает из вариантов «что здесь отмечено».
 */
it('называет соседей по грозди целого вида', () => {
  expect([...colocatedLandmarkIds('forbidden-city')].sort()).toEqual([
    'summer-palace',
    'temple-of-heaven',
  ]);
});

it('у одиночной звезды соседей нет', () => {
  expect(colocatedLandmarkIds('potala')).toEqual([]);
});
