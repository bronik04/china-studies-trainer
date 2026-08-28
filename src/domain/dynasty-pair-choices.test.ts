import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { dynastyCapitals } from '../content/dynasty-capitals';
import { rulers } from '../content/rulers';
import { CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';
import { buildCapitalChoices, buildRulerChoices } from './dynasty-pair-choices';

it('в вариантах столиц четыре разных города и среди них верный', () => {
  const choices = buildCapitalChoices(
    dynastyCapitals,
    dynasties,
    'tang',
    createSeededRandom(1),
  );

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(new Set(choices.map((choice) => choice.cityId)).size).toBe(
    CHOICE_COUNT,
  );
  expect(choices.some((choice) => choice.cityId === 'xian')).toBe(true);
});

/*
 * Отвлекающие — соседние по времени столицы: спутать Сун с Тан ошибка по
 * существу, спутать Сун с Цинь — промах наугад.
 */
it('отвлекающие столицы берутся у соседей по времени', () => {
  const choices = buildCapitalChoices(
    dynastyCapitals,
    dynasties,
    'song',
    createSeededRandom(2),
  );
  const dynastyIds = choices.map((choice) => choice.dynastyId);

  expect(dynastyIds).toContain('song');
  expect(dynastyIds.some((id) => ['tang', 'yuan', 'ming'].includes(id))).toBe(
    true,
  );
});

/* Три династии правили из Пекина: без отсева «Пекин» стоял бы трижды. */
it('одинаковые города в вариантах не повторяются', () => {
  for (const dynastyId of ['yuan', 'ming', 'qing']) {
    const choices = buildCapitalChoices(
      dynastyCapitals,
      dynasties,
      dynastyId,
      createSeededRandom(5),
    );

    expect(new Set(choices.map((choice) => choice.cityId)).size).toBe(
      CHOICE_COUNT,
    );
  }
});

it('в вариантах правителей четверо разных и среди них верный', () => {
  const choices = buildRulerChoices(
    rulers,
    dynasties,
    'qing',
    createSeededRandom(3),
  );

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(new Set(choices.map((choice) => choice.id)).size).toBe(CHOICE_COUNT);
  expect(choices.some((choice) => choice.dynastyId === 'qing')).toBe(true);
});

it('повторяются по сиду', () => {
  expect(
    buildRulerChoices(rulers, dynasties, 'tang', createSeededRandom(7)),
  ).toEqual(buildRulerChoices(rulers, dynasties, 'tang', createSeededRandom(7)));
});

it('неизвестная династия — ошибка', () => {
  expect(() =>
    buildCapitalChoices(
      dynastyCapitals,
      dynasties,
      'атлантида',
      createSeededRandom(1),
    ),
  ).toThrow(/Неизвестная династия/);
});

/* У Троецарствия правителя нет, и вопрос о нём собрать нельзя. */
it('династия без правителя — ошибка, а не тихий пропуск', () => {
  expect(() =>
    buildRulerChoices(rulers, dynasties, 'three-kingdoms', createSeededRandom(1)),
  ).toThrow(/нет правителя/);
});
