import { expect, it } from 'vitest';
import { MODE_CARDS } from './exercise-modes';

/*
 * У физической карты набор выбирается перед стартом — от двадцати одной цели
 * до сорока одной, — и карточка не должна обещать одно число. Прежнее «12
 * объектов» пережило два пополнения справочника и вдвое занижало первый же
 * раунд.
 */
it('карточки физической карты не обещают числа объектов', () => {
  const physical = MODE_CARDS.filter((card) => card.kind === 'physical');

  expect(physical.length).toBeGreaterThan(0);
  for (const card of physical) {
    expect(card.volume).toMatch(/^Набор выбирается перед стартом/);
  }
});

/* Канал спрашивается наравне с реками, и описание игры обязано это сказать. */
it('описания игр физической карты называют канал', () => {
  for (const card of MODE_CARDS.filter((one) => one.kind === 'physical')) {
    expect(card.summary).toMatch(/канал/);
  }
});
