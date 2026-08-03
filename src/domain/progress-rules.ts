import type { Attempt, Level } from './round';

export const REVIEW_WINDOW_DAYS = 14;
export const UNLOCK_ACCURACY = 0.8;
export const UNLOCK_ROUNDS = 2;
const MAX_LEVEL: Level = 4;
export const MASTERY_CORRECT_ROUNDS = 3;
export const MASTERY_MIN_LEVEL = 2;
export const MAX_REVIEW_TOPICS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RoundSummary = {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly regionIdsToReview: readonly string[];
};

function isWithinReviewWindow(attempt: Attempt, now: Date): boolean {
  return now.getTime() - Date.parse(attempt.answeredAt) <= REVIEW_WINDOW_DAYS * DAY_MS;
}

function groupBy(
  attempts: readonly Attempt[],
  key: (attempt: Attempt) => string,
): Map<string, Attempt[]> {
  const groups = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const group = groups.get(key(attempt)) ?? [];
    group.push(attempt);
    groups.set(key(attempt), group);
  }

  return groups;
}

/** Итог одного раунда. Показывается ученику без оценочного давления. */
export function summariseRound(attempts: readonly Attempt[]): RoundSummary {
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;

  return {
    total: attempts.length,
    correct,
    accuracy: attempts.length === 0 ? 0 : correct / attempts.length,
    durationMs: attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0),
    regionIdsToReview: attempts
      .filter((attempt) => !attempt.isCorrect)
      .map((attempt) => attempt.regionId)
      .slice(0, MAX_REVIEW_TOPICS),
  };
}

/**
 * Уровень открывается, когда два последних завершённых раунда предыдущего
 * уровня дали вместе не меньше 80% верных ответов (SPEC.md). Цепочка
 * прерывается на первом уровне, который этого не набрал.
 */
export function unlockedLevelFrom(attempts: readonly Attempt[]): Level {
  let unlocked: Level = 1;

  while (unlocked < MAX_LEVEL) {
    const ofLevel = attempts.filter((attempt) => attempt.level === unlocked);
    const rounds = [...groupBy(ofLevel, (attempt) => attempt.roundId).values()];
    if (rounds.length < UNLOCK_ROUNDS) {
      return unlocked;
    }

    const recent = rounds.slice(-UNLOCK_ROUNDS).flat();
    const correct = recent.filter((attempt) => attempt.isCorrect).length;
    if (correct / recent.length < UNLOCK_ACCURACY) {
      return unlocked;
    }

    unlocked = (unlocked + 1) as Level;
  }

  return unlocked;
}

/** Персональный рекорд точности среди прошлых раундов. */
export function bestAccuracy(attempts: readonly Attempt[]): number {
  const accuracies = [...groupBy(attempts, (attempt) => attempt.roundId).values()].map(
    (round) => round.filter((attempt) => attempt.isCorrect).length / round.length,
  );

  return accuracies.length === 0 ? 0 : Math.max(...accuracies);
}

/** Регионы с неверным ответом за последние 14 дней. */
export function regionIdsToRepeat(
  attempts: readonly Attempt[],
  now: Date,
): readonly string[] {
  const wrong = attempts.filter(
    (attempt) => !attempt.isCorrect && isWithinReviewWindow(attempt, now),
  );

  return [...new Set(wrong.map((attempt) => attempt.regionId))];
}

/**
 * Регион освоен после трёх верных ответов в разных завершённых раундах, из
 * которых хотя бы один — на уровне не ниже второго. Одна ошибка за последние
 * 14 дней снимает статус, но историю не стирает (PROGRESS_SYSTEM.md).
 *
 * Уровни 2–4 ещё не открыты, поэтому пока список остаётся пустым.
 */
export function masteredRegionIds(
  attempts: readonly Attempt[],
  now: Date,
): readonly string[] {
  const recentlyWrong = new Set(regionIdsToRepeat(attempts, now));
  const mastered: string[] = [];

  for (const [regionId, regionAttempts] of groupBy(
    attempts,
    (attempt) => attempt.regionId,
  )) {
    if (recentlyWrong.has(regionId)) {
      continue;
    }

    const correct = regionAttempts.filter((attempt) => attempt.isCorrect);
    const rounds = new Set(correct.map((attempt) => attempt.roundId));
    const hasHigherLevel = correct.some(
      (attempt) => attempt.level >= MASTERY_MIN_LEVEL,
    );

    if (rounds.size >= MASTERY_CORRECT_ROUNDS && hasHigherLevel) {
      mastered.push(regionId);
    }
  }

  return mastered;
}
