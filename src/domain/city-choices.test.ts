import { cities } from '../content/cities';
import { buildCityChoices } from './city-choices';
import { CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';

it('даёт четыре варианта и среди них правильный', () => {
  const choices = buildCityChoices(cities, 'chengdu', createSeededRandom(1));

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(choices.map((city) => city.id)).toContain('chengdu');
  expect(new Set(choices.map((city) => city.id)).size).toBe(CHOICE_COUNT);
});

/*
 * Главное правило игры: отвлекающие не с другого конца страны. Пятнадцать
 * градусов — это примерно расстояние от Шанхая до Пекина; всё, что дальше,
 * решается по стороне света, а не по знанию города.
 */
it('берёт отвлекающих из округи, а не с другого конца страны', () => {
  const target = cities.find((city) => city.id === 'suzhou')!;
  const choices = buildCityChoices(cities, 'suzhou', createSeededRandom(3));

  for (const choice of choices) {
    expect(
      Math.hypot(choice.lon - target.lon, choice.lat - target.lat),
      choice.nameRu,
    ).toBeLessThan(15);
  }
});

it('предпочитает города того же набора', () => {
  const choices = buildCityChoices(cities, 'kaifeng', createSeededRandom(2));

  expect(choices.filter((city) => city.set === 'notable').length).toBeGreaterThan(1);
});

it('не знает города — не строит вопрос', () => {
  expect(() => buildCityChoices(cities, 'атлантида', createSeededRandom(1))).toThrow(
    /Неизвестный город/,
  );
});

it('даёт один и тот же набор при одном сиде', () => {
  expect(buildCityChoices(cities, 'lhasa', createSeededRandom(7))).toEqual(
    buildCityChoices(cities, 'lhasa', createSeededRandom(7)),
  );
});
