import { expect, it } from 'vitest';
import { landmarks } from '../content/landmarks';
import { regions } from '../content/regions';
import { regionAnswerableLandmarks } from './landmark-pool';

/*
 * «Шанхайская башня» отвечает сама за себя: имя объекта называет его регион, и
 * вопрос «в каком он регионе» ничего не проверяет.
 */
it('исключает объекты, называющие свой регион именем', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).not.toContain('shanghai-tower');
});

/*
 * Чужой регион в имени — не подсказка, а ловушка: мост Гонконг — Чжухай —
 * Макао лежит в Гуандуне, и именно это здесь спрашивается.
 */
it('оставляет объекты, называющие чужие регионы', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).toContain('hzm-bridge');
});

/*
 * Тулоу переименованы ради этой игры (решение владельца от 2026-08-30): под
 * прежним именем «Фуцзяньские тулоу» объект выпадал из неё, под нынешним
 * «Земляные дома тулоу» — спрашивается наравне со всеми.
 */
it('оставляет тулоу: нынешнее имя региона не называет', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).toContain('fujian-tulou');
});

it('не трогает объекты с нейтральными именами', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).toContain('forbidden-city');
  expect(pool.length).toBe(landmarks.length - 1);
});
