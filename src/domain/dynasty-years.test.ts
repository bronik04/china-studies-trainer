import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { createSeededRandom } from './random';
import { answerableYears, pickYear, yearsOf } from './dynasty-years';

const years = answerableYears(dynasties);

/*
 * Юань основана в 1271, Сун пала в 1279: восемь лет лента знает две династии
 * сразу. Вопрос «кто правил в 1275» имел бы два верных ответа.
 */
it('годы перекрытия Сун и Юань не спрашиваются', () => {
  for (let year = 1271; year <= 1279; year += 1) {
    expect(years).not.toContain(year);
  }
});

/* С 280 по 581 единой державы не было — спрашивать не о чем. */
it('годы раздробленности не спрашиваются', () => {
  expect(years).not.toContain(400);
  expect(years).not.toContain(500);
});

/* Стык: 220 — последний год Хань и первый год Троецарствия. */
it('год на стыке двух записей не спрашивается', () => {
  expect(years).not.toContain(220);
});

it('обычный год внутри династии спрашивается', () => {
  expect(years).toContain(700);
  expect(yearsOf(dynasties, 'tang')).toContain(700);
});

it('год выбирается из своей династии и воспроизводится по сиду', () => {
  const first = pickYear(dynasties, 'tang', createSeededRandom(3));
  const again = pickYear(dynasties, 'tang', createSeededRandom(3));

  expect(first).toBe(again);
  expect(yearsOf(dynasties, 'tang')).toContain(first);
});

/* У каждой записи ленты должен остаться хоть один спрашиваемый год. */
it('ни одна династия не осталась без года', () => {
  for (const dynasty of dynasties) {
    expect(yearsOf(dynasties, dynasty.id).length).toBeGreaterThan(0);
  }
});

it('неизвестная династия — ошибка, а не пустой список', () => {
  expect(() => yearsOf(dynasties, 'атлантида')).toThrow(/Неизвестная династия/);
});
