import type { Attempt, Level } from './round';
import {
  bestAccuracy,
  masteredRegionIds,
  MAX_REVIEW_TOPICS,
  regionIdsToRepeat,
  summariseRound,
} from './progress-rules';

const NOW = new Date('2026-08-03T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    questionId: '1-sichuan',
    roundId: 'round-1',
    regionId: 'sichuan',
    exerciseType: 'find-on-map',
    level: 1 as Level,
    isCorrect: true,
    durationMs: 1000,
    answeredAt: daysAgo(0),
    ...overrides,
  };
}

it('считает точность раунда', () => {
  const summary = summariseRound([
    attempt({ regionId: 'sichuan', isCorrect: true, durationMs: 1000 }),
    attempt({ regionId: 'yunnan', isCorrect: false, durationMs: 3000 }),
  ]);

  expect(summary.total).toBe(2);
  expect(summary.correct).toBe(1);
  expect(summary.accuracy).toBe(0.5);
  expect(summary.durationMs).toBe(4000);
});

it('собирает темы для повторения из ошибок раунда', () => {
  const summary = summariseRound([
    attempt({ regionId: 'sichuan', isCorrect: false }),
    attempt({ regionId: 'yunnan', isCorrect: true }),
  ]);

  expect(summary.regionIdsToReview).toEqual(['sichuan']);
});

it('показывает не больше пяти тем для повторения', () => {
  const wrong = Array.from({ length: 8 }, (_, index) =>
    attempt({ regionId: `region-${index}`, isCorrect: false }),
  );

  expect(summariseRound(wrong).regionIdsToReview).toHaveLength(MAX_REVIEW_TOPICS);
});

it('без ответов даёт нулевую точность, а не деление на ноль', () => {
  expect(summariseRound([]).accuracy).toBe(0);
});

it('берёт лучшую точность среди прошлых раундов', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-1', isCorrect: false }),
    attempt({ roundId: 'round-2', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true }),
  ];

  expect(bestAccuracy(attempts)).toBe(1);
});

it('без истории рекорд равен нулю', () => {
  expect(bestAccuracy([])).toBe(0);
});

it('возвращает в повторение регионы с ошибкой за последние 14 дней', () => {
  const attempts = [
    attempt({ regionId: 'sichuan', isCorrect: false, answeredAt: daysAgo(3) }),
    attempt({ regionId: 'yunnan', isCorrect: false, answeredAt: daysAgo(20) }),
    attempt({ regionId: 'hebei', isCorrect: true, answeredAt: daysAgo(1) }),
  ];

  expect(regionIdsToRepeat(attempts, NOW)).toEqual(['sichuan']);
});

it('не осваивает регион без ответа на уровне не ниже второго', () => {
  const attempts = [1, 2, 3].map((index) =>
    attempt({ roundId: `round-${index}`, isCorrect: true }),
  );

  expect(masteredRegionIds(attempts, NOW)).toEqual([]);
});

it('осваивает регион после трёх верных ответов в разных раундах', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, level: 2 as Level }),
    attempt({ roundId: 'round-3', isCorrect: true }),
  ];

  expect(masteredRegionIds(attempts, NOW)).toEqual(['sichuan']);
});

it('снимает освоенность после ошибки за последние 14 дней', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, level: 2 as Level }),
    attempt({ roundId: 'round-3', isCorrect: true }),
    attempt({ roundId: 'round-4', isCorrect: false, answeredAt: daysAgo(2) }),
  ];

  expect(masteredRegionIds(attempts, NOW)).toEqual([]);
});
