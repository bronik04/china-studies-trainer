import type { Dynasty } from '../content/types';

/**
 * Годы, о которых можно спросить «кто правил».
 *
 * Спрашивать можно не о всяком годе. Два множества выпадают:
 *
 * — **разрывы**: с 280 по 581 единой державы не было, и у вопроса нет ответа;
 * — **перекрытия**: Юань основана в 1271, Сун пала в 1279 — восемь лет лента
 *   знает две династии сразу, и у вопроса два верных ответа. Столько же стоят
 *   стыки: 220 — последний год Хань и первый год Троецарствия.
 *
 * Множество считается из справочника, а не пишется руками: первая же правка
 * сроков разошлась бы со списком, а разошедшийся список выдал бы вопрос, у
 * которого верных ответов два.
 */
export function answerableYears(
  dynasties: readonly Dynasty[],
): readonly number[] {
  const from = Math.min(...dynasties.map((dynasty) => dynasty.from));
  const to = Math.max(...dynasties.map((dynasty) => dynasty.to));
  const years: number[] = [];

  for (let year = from; year <= to; year += 1) {
    const owners = dynasties.filter(
      (dynasty) => year >= dynasty.from && year <= dynasty.to,
    );

    if (owners.length === 1) {
      years.push(year);
    }
  }

  return years;
}

export function yearsOf(
  dynasties: readonly Dynasty[],
  dynastyId: string,
): readonly number[] {
  const dynasty = dynasties.find((item) => item.id === dynastyId);
  if (dynasty === undefined) {
    throw new Error(`Неизвестная династия: ${dynastyId}`);
  }

  return answerableYears(dynasties).filter(
    (year) => year >= dynasty.from && year <= dynasty.to,
  );
}

/** Год для вопроса. Генератор передаётся снаружи: домен не знает случайности. */
export function pickYear(
  dynasties: readonly Dynasty[],
  dynastyId: string,
  random: () => number,
): number {
  const years = yearsOf(dynasties, dynastyId);
  if (years.length === 0) {
    throw new Error(`У династии ${dynastyId} нет однозначных годов`);
  }

  return years[Math.floor(random() * years.length)];
}
