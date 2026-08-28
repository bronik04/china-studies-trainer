import { expect, it } from 'vitest';
import { cities } from './cities';
import { dynasties } from './dynasties';
import {
  askedCapitals,
  capitalOfDynasty,
  dynastyCapitals,
} from './dynasty-capitals';

it('каждая столица ссылается на город каталога и на династию', () => {
  for (const capital of dynastyCapitals) {
    expect(cities.some((city) => city.id === capital.cityId)).toBe(true);
    expect(dynasties.some((dynasty) => dynasty.id === capital.dynastyId)).toBe(
      true,
    );
    expect(capital.sourceIds.length).toBeGreaterThan(0);
  }
});

/*
 * Цель раунда — династия, а `createRound` спрашивает каждую ровно один раз:
 * две спрашиваемые строки на Хань дали бы один вопрос дважды.
 */
it('на династию приходится не больше одной спрашиваемой столицы', () => {
  const asked = askedCapitals().map((capital) => capital.dynastyId);

  expect(new Set(asked).size).toBe(asked.length);
});

/*
 * Отвлекающие берутся из городов этого же справочника. Четыре варианта
 * требуют хотя бы четырёх разных городов, иначе вопрос собрать не из чего.
 */
it('разных городов хватает на четыре варианта', () => {
  const distinct = new Set(dynastyCapitals.map((capital) => capital.cityId));

  expect(distinct.size).toBeGreaterThanOrEqual(4);
});

it('столицу династии можно найти по её идентификатору', () => {
  expect(capitalOfDynasty('tang')?.cityId).toBe('xian');
  expect(capitalOfDynasty('three-kingdoms')).toBeUndefined();
});

/*
 * Уточнение стоит там, где столица менялась: «столица Хань» без него имеет два
 * верных ответа — Чанъань у Западной и Лоян у Восточной.
 */
it('у династий с переносом столицы вопрос уточняет время', () => {
  const moved = ['han', 'song', 'ming'];

  for (const dynastyId of moved) {
    expect(capitalOfDynasty(dynastyId)?.qualifier).toBeDefined();
  }

  expect(capitalOfDynasty('qing')?.qualifier).toBeUndefined();
});
