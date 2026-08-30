import { expect, it } from 'vitest';
import { landmarks } from '../content/landmarks';
import { regions } from '../content/regions';
import { regionAnswerableLandmarks } from './landmark-pool';

/*
 * «Исторический центр Макао» отвечает сам за себя: имя объекта называет его
 * регион, и вопрос «в каком он регионе» ничего не проверяет.
 */
it('исключает объекты, называющие свой регион именем', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);
  const ids = pool.map((one) => one.id);

  expect(ids).not.toContain('macao-historic-centre');
  expect(ids).not.toContain('fujian-tulou');
  expect(ids).not.toContain('shanghai-tower');
});

/*
 * Чужой регион в имени — не подсказка, а ловушка: мост Гонконг — Чжухай —
 * Макао лежит в Гуандуне, и именно это здесь спрашивается.
 */
it('оставляет объекты, называющие чужие регионы', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).toContain('hzm-bridge');
});

it('не трогает объекты с нейтральными именами', () => {
  const pool = regionAnswerableLandmarks(landmarks, regions);

  expect(pool.map((one) => one.id)).toContain('forbidden-city');
  expect(pool.length).toBe(landmarks.length - 3);
});
