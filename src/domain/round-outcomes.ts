import type { RegionOutcome } from './fill-round';
import type { Attempt } from './round';

/**
 * Исход раунда по каждой цели — тем же словарём, каким карта красит области.
 *
 * Исходов здесь два, а не три: в обычном раунде попытка одна — `ExerciseRound`
 * записывает ответ и сразу переходит дальше, — и «со второй» взяться неоткуда.
 * Третий исход есть у игры «Заполнить карту», где попыток три, и считает его
 * `summariseFillRound`.
 *
 * Побеждает последний ответ по цели: повтор ошибок спрашивает регион второй
 * раз в том же раунде, и карта итога показывает, чем раунд кончился, а не с
 * чего начался.
 */
export function outcomesByTarget(
  attempts: readonly Attempt[],
): Readonly<Record<string, RegionOutcome>> {
  const outcomes: Record<string, RegionOutcome> = {};

  for (const attempt of attempts) {
    outcomes[attempt.target.id] = attempt.isCorrect ? 'first-try' : 'failed';
  }

  return outcomes;
}
