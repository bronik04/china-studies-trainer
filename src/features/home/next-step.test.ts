import { expect, it } from 'vitest';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { nextStep } from './next-step';

const NOW = new Date('2026-08-04T12:00:00.000Z');

function attempt(
  regionId: string,
  roundId: string,
  isCorrect: boolean,
  exerciseType: ExerciseType = 'find-on-map',
  level: Level = 1,
  answeredAt: string = NOW.toISOString(),
): Attempt {
  return {
    questionId: `${roundId}-${regionId}`,
    roundId,
    regionId,
    exerciseType,
    level,
    isCorrect,
    durationMs: 1000,
    answeredAt,
  };
}

it('без истории предлагает начать с поиска на карте по всем регионам', () => {
  const step = nextStep([], NOW);

  expect(step.label).toBe('Начать: найти на карте');
  expect(step.exerciseType).toBe('find-on-map');
  expect(step.level).toBe(1);
  expect(step.regionIds).toBeNull();
});

it('при свежих ошибках предлагает повторить именно их', () => {
  const attempts = [
    attempt('hunan', 'r1', false),
    attempt('hubei', 'r1', false),
    attempt('sichuan', 'r1', true),
  ];

  const step = nextStep(attempts, NOW);

  expect(step.label).toBe('Повторить 2 региона');
  expect(step.regionIds).toEqual(['hunan', 'hubei']);
});

it('без ошибок продолжает режимом последнего раунда на открытом уровне', () => {
  const attempts = [
    attempt('hunan', 'r1', true, 'find-on-map'),
    attempt('hubei', 'r2', true, 'match-capital'),
  ];

  const step = nextStep(attempts, NOW);

  /*
   * Уровень 2, а не 1: два раунда подряд с точностью выше 80 % открывают
   * следующий уровень (SPEC.md), и кнопка обязана вести именно туда.
   */
  expect(step.label).toBe('Продолжить: уровень 2 · регион — столица');
  expect(step.exerciseType).toBe('match-capital');
  expect(step.level).toBe(2);
  expect(step.regionIds).toBeNull();
});

it('ошибки старше окна повтора не тянут назад', () => {
  const old = new Date('2026-06-01T12:00:00.000Z').toISOString();
  const attempts = [
    attempt('hunan', 'r1', false, 'find-on-map', 1, old),
    attempt('hubei', 'r2', true, 'find-on-map'),
  ];

  expect(nextStep(attempts, NOW).label).toMatch(/^Продолжить/);
});

it('подпись и набор регионов считаются вместе, а не порознь', () => {
  const attempts = [attempt('hunan', 'r1', false)];
  const step = nextStep(attempts, NOW);

  expect(step.label).toBe('Повторить 1 регион');
  expect(step.regionIds).toHaveLength(1);
});
