import { targetKey, type Attempt, type Target, type TargetKind } from './round';

export const REVIEW_WINDOW_DAYS = 14;
export const MASTERY_CORRECT_ROUNDS = 3;
export const MAX_REVIEW_TOPICS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RoundSummary = {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly targetsToReview: readonly Target[];
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
    targetsToReview: attempts
      .filter((attempt) => !attempt.isCorrect)
      .map((attempt) => attempt.target)
      .slice(0, MAX_REVIEW_TOPICS),
  };
}

/** Персональный рекорд точности среди прошлых раундов. */
export function bestAccuracy(attempts: readonly Attempt[]): number {
  const accuracies = [...groupBy(attempts, (attempt) => attempt.roundId).values()].map(
    (round) => round.filter((attempt) => attempt.isCorrect).length / round.length,
  );

  return accuracies.length === 0 ? 0 : Math.max(...accuracies);
}

/** Цели заданного вида с неверным ответом за последние 14 дней. */
export function targetsToRepeat(
  attempts: readonly Attempt[],
  now: Date,
  kind: TargetKind,
): readonly Target[] {
  const wrong = attempts.filter(
    (attempt) =>
      attempt.target.kind === kind &&
      !attempt.isCorrect &&
      isWithinReviewWindow(attempt, now),
  );

  const seen = new Set<string>();
  const unique: Target[] = [];

  for (const attempt of wrong) {
    const key = targetKey(attempt.target);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(attempt.target);
    }
  }

  return unique;
}

/**
 * Цель освоена после трёх верных ответов в разных завершённых раундах, из
 * которых хотя бы один — на вопрос иероглифами: узнать регион по русской
 * подписи и назвать его по иероглифам разное знание (PROGRESS_SYSTEM.md).
 * Одна ошибка за последние 14 дней снимает статус, но историю не стирает.
 */
export function masteredTargets(
  attempts: readonly Attempt[],
  now: Date,
  kind: TargetKind,
): readonly Target[] {
  const recentlyWrong = new Set(
    targetsToRepeat(attempts, now, kind).map((target) => targetKey(target)),
  );
  const mastered: Target[] = [];

  for (const [key, targetAttempts] of groupBy(
    attempts.filter((attempt) => attempt.target.kind === kind),
    (attempt) => targetKey(attempt.target),
  )) {
    if (recentlyWrong.has(key)) {
      continue;
    }

    const correct = targetAttempts.filter((attempt) => attempt.isCorrect);
    const rounds = new Set(correct.map((attempt) => attempt.roundId));
    const answeredInChinese = correct.some((attempt) => attempt.language === 'zh');

    if (rounds.size >= MASTERY_CORRECT_ROUNDS && answeredInChinese) {
      mastered.push(targetAttempts[0].target);
    }
  }

  return mastered;
}
