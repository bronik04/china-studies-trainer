import { masteredRegionIds } from '../../domain/progress-rules';
import type { Attempt } from '../../domain/round';
import type { RegionProgressState } from '../../map/region-progress';

export type ProgressSummary = {
  readonly stateByRegionId: Readonly<Record<string, RegionProgressState>>;
  readonly mastered: number;
  readonly inProgress: number;
  readonly untouched: number;
  readonly total: number;
};

/**
 * Состояние каждого региона и счёт по трём состояниям. Счёт нужен строке
 * состояния: карта передаёт то же самое цветом, а слова и числа — второй
 * канал, без которого статус читался бы только по заливке.
 */
export function summariseProgress(
  regionIds: readonly string[],
  attempts: readonly Attempt[],
  now: Date,
): ProgressSummary {
  const mastered = new Set(masteredRegionIds(attempts, now));
  const touched = new Set(attempts.map((attempt) => attempt.regionId));

  const stateByRegionId: Record<string, RegionProgressState> = {};
  let masteredCount = 0;
  let inProgressCount = 0;
  let untouchedCount = 0;

  for (const regionId of regionIds) {
    if (mastered.has(regionId)) {
      stateByRegionId[regionId] = 'mastered';
      masteredCount += 1;
    } else if (touched.has(regionId)) {
      stateByRegionId[regionId] = 'in-progress';
      inProgressCount += 1;
    } else {
      stateByRegionId[regionId] = 'untouched';
      untouchedCount += 1;
    }
  }

  return {
    stateByRegionId,
    mastered: masteredCount,
    inProgress: inProgressCount,
    untouched: untouchedCount,
    total: regionIds.length,
  };
}
