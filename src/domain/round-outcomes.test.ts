import { outcomesByTarget } from './round-outcomes';
import { regionTarget, type Attempt } from './round';

function attempt(id: string, isCorrect: boolean): Attempt {
  return {
    questionId: `1-${id}`,
    roundId: 'round-1',
    target: regionTarget(id),
    exerciseType: 'find-on-map',
    language: 'ru',
    isCorrect,
    durationMs: 1000,
    answeredAt: '2026-08-25T10:00:00.000Z',
  };
}

it('верный ответ — взят, неверный — не угадан', () => {
  const outcomes = outcomesByTarget([attempt('sichuan', true), attempt('anhui', false)]);

  expect(outcomes).toEqual({ sichuan: 'first-try', anhui: 'failed' });
});

/*
 * Повтор ошибок спрашивает регион второй раз в том же раунде. Побеждает
 * последний ответ: карта итога показывает, чем раунд кончился, а не с чего
 * начался.
 */
it('берёт последний ответ по цели', () => {
  const outcomes = outcomesByTarget([attempt('anhui', false), attempt('anhui', true)]);

  expect(outcomes).toEqual({ anhui: 'first-try' });
});

it('на пустом раунде даёт пустой набор', () => {
  expect(outcomesByTarget([])).toEqual({});
});
