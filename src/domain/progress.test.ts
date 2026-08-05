import type { Attempt } from './round';
import { addAttempts, EMPTY_PROGRESS, MAX_ATTEMPTS } from './progress';

function attempt(index: number): Attempt {
  return {
    questionId: `${index}-sichuan`,
    roundId: `round-${index}`,
    target: { kind: 'region', id: 'sichuan' },
    exerciseType: 'find-on-map',
    language: 'ru',
    isCorrect: true,
    durationMs: 1000,
    answeredAt: '2026-08-03T10:00:00.000Z',
  };
}

it('начинается с пустой истории', () => {
  expect(EMPTY_PROGRESS.attempts).toEqual([]);
  expect(EMPTY_PROGRESS.masteredTargets).toEqual([]);
});

/*
 * Открытых и закрытых уровней не существует, все игры доступны сразу, и поля
 * под «открытый уровень» в прогрессе больше нет: оно осталось бы числом,
 * которое никто не читает.
 */
it('не хранит открытый уровень', () => {
  expect(EMPTY_PROGRESS).not.toHaveProperty('unlockedLevel');
});

it('добавляет попытки в конец', () => {
  const progress = addAttempts(EMPTY_PROGRESS, [attempt(1), attempt(2)]);

  expect(progress.attempts).toHaveLength(2);
  expect(progress.attempts[1].roundId).toBe('round-2');
});

it('хранит не больше пятисот попыток, отбрасывая самые старые', () => {
  const many = Array.from({ length: MAX_ATTEMPTS + 10 }, (_, index) => attempt(index));

  const progress = addAttempts(EMPTY_PROGRESS, many);

  expect(progress.attempts).toHaveLength(MAX_ATTEMPTS);
  expect(progress.attempts[0].roundId).toBe('round-10');
});

it('не изменяет исходный прогресс', () => {
  addAttempts(EMPTY_PROGRESS, [attempt(1)]);

  expect(EMPTY_PROGRESS.attempts).toEqual([]);
});
