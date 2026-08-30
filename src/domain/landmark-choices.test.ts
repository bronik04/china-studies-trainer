import { expect, it } from 'vitest';
import {
  landmarks,
  type Landmark,
  type LandmarkKind,
} from '../content/landmarks';
import { buildLandmarkChoices } from './landmark-choices';
import { createSeededRandom } from './random';

it('даёт четыре варианта и среди них цель', () => {
  const target = landmarks[0];
  const choices = buildLandmarkChoices(landmarks, target.id, createSeededRandom(1));

  expect(choices).toHaveLength(4);
  expect(choices).toContain(target);
});

it('отвлекает объектами того же рода, пока они есть', () => {
  const target = landmarks.find((one) => one.kind === 'monument')!;
  const choices = buildLandmarkChoices(landmarks, target.id, createSeededRandom(7));

  expect(choices.every((one) => one.kind === 'monument')).toBe(true);
});

/*
 * Своих может не хватить: современных сооружений в каталоге четыре, и на
 * вопросе об одном из них своих отвлекающих остаётся ровно три, а в наборе
 * «Памятники» их нет вовсе. Вопрос обязан остаться о четырёх вариантах.
 */
it('добирает из соседнего рода, когда своих меньше трёх', () => {
  const sample = landmarks[0];
  const of = (id: string, kind: LandmarkKind): Landmark => ({
    ...sample,
    id,
    kind,
    nameRu: id,
    nameZh: id,
  });
  const target = of('плотина', 'modern');
  const pool = [
    target,
    of('храм', 'monument'),
    of('гроты', 'monument'),
    of('гора', 'nature'),
  ];

  const choices = buildLandmarkChoices(pool, target.id, createSeededRandom(3));

  expect(choices).toHaveLength(4);
  expect(choices).toContain(target);
  expect(new Set(choices.map((one) => one.id)).size).toBe(4);
});

it('не зовёт Math.random: одинаковый сид даёт одинаковый выбор', () => {
  const target = landmarks[2];
  const first = buildLandmarkChoices(landmarks, target.id, createSeededRandom(42));
  const second = buildLandmarkChoices(landmarks, target.id, createSeededRandom(42));

  expect(first.map((one) => one.id)).toEqual(second.map((one) => one.id));
});

/*
 * Соседи по грозди на карте — одна звезда, и два её члена среди вариантов
 * оставили бы «что здесь отмечено» без единственного верного ответа. Список
 * исключений приходит от карты (`colocatedLandmarkIds`); домен обязан его
 * соблюсти при любом сиде.
 */
it('не берёт исключённых соседей в отвлекающие', () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const choices = buildLandmarkChoices(
      landmarks,
      'forbidden-city',
      createSeededRandom(seed),
      ['temple-of-heaven', 'summer-palace'],
    );

    const ids = choices.map((one) => one.id);
    expect(ids).not.toContain('temple-of-heaven');
    expect(ids).not.toContain('summer-palace');
    expect(ids).toContain('forbidden-city');
    expect(choices).toHaveLength(4);
  }
});
