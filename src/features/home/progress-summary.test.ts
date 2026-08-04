import { expect, it } from 'vitest';
import type { Attempt, Level } from '../../domain/round';
import { summariseProgress } from './progress-summary';

const IDS = ['hunan', 'hubei', 'sichuan'] as const;
const NOW = new Date('2026-08-04T12:00:00.000Z');

function attempt(
  regionId: string,
  roundId: string,
  isCorrect: boolean,
  level: Level = 1,
): Attempt {
  return {
    questionId: `${roundId}-${regionId}`,
    roundId,
    regionId,
    exerciseType: 'find-on-map',
    level,
    isCorrect,
    durationMs: 1000,
    answeredAt: NOW.toISOString(),
  };
}

it('без истории все регионы не тронуты', () => {
  const summary = summariseProgress(IDS, [], NOW);

  expect(summary.mastered).toBe(0);
  expect(summary.inProgress).toBe(0);
  expect(summary.untouched).toBe(3);
  expect(summary.stateByRegionId.hunan).toBe('untouched');
});

it('верные ответы только на первом уровне дают «в работе», а не «освоено»', () => {
  const attempts = [
    attempt('hunan', 'r1', true),
    attempt('hunan', 'r2', true),
    attempt('hunan', 'r3', true),
  ];

  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.stateByRegionId.hunan).toBe('in-progress');
  expect(summary.mastered).toBe(0);
  expect(summary.inProgress).toBe(1);
});

it('три верных раунда с одним на втором уровне дают «освоено»', () => {
  const attempts = [
    attempt('hunan', 'r1', true),
    attempt('hunan', 'r2', true),
    attempt('hunan', 'r3', true, 2),
  ];

  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.stateByRegionId.hunan).toBe('mastered');
  expect(summary.mastered).toBe(1);
});

it('регион с одними ошибками всё равно в работе, а не не тронут', () => {
  const summary = summariseProgress(IDS, [attempt('hubei', 'r1', false)], NOW);

  expect(summary.stateByRegionId.hubei).toBe('in-progress');
  expect(summary.untouched).toBe(2);
});

it('счёт всегда сходится к общему числу регионов', () => {
  const attempts = [attempt('hunan', 'r1', true), attempt('hubei', 'r1', false)];
  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.mastered + summary.inProgress + summary.untouched).toBe(
    summary.total,
  );
});
