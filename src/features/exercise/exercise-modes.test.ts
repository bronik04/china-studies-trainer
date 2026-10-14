import { expect, it } from 'vitest';
import {
  CITY_CARD_IDS,
  HISTORY_CARD_IDS,
  LANDMARK_CARD_IDS,
  MODE_CARDS,
  roundTitle,
} from './exercise-modes';

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

/* Имя игры в шапке раунда берётся из карточки и её главы, а не пишется заново. */
it('имя игры над ходом раунда — глава и карточка', () => {
  expect(roundTitle('find-on-map')).toBe('Регионы · Найти на карте');
  expect(roundTitle('history-order')).toBe('История · Расставить по порядку');
  expect(roundTitle('нет-такой')).toBe('');
});

it('у каждой формы вопроса городов, мест и истории есть своя карточка', () => {
  const ids = MODE_CARDS.map((card) => card.id);

  for (const id of [
    ...Object.values(CITY_CARD_IDS),
    ...Object.values(LANDMARK_CARD_IDS),
    ...Object.values(HISTORY_CARD_IDS),
  ]) {
    expect(ids).toContain(id);
  }
});
