import type { Region } from '../content/types';
import { REGION_NEIGHBOURS } from '../map/region-neighbours';
import { shuffle } from './random';
import type { QuestionLanguage } from './question-language';
import { neighboursTarget, type Attempt } from './round';

/**
 * Раунд «соседи региона»: вопрос — регион, ответ — множество регионов.
 *
 * Отдельный модуль, а не расширение `round.ts`: там действует инвариант
 * «повторный ответ на вопрос запрещён», а здесь ответов много и каждый
 * приходит отдельным нажатием. Тот же довод, по которому отдельно живёт
 * `fill-round.ts`: снимать инвариант ради одной игры значило бы ослабить пять
 * работающих.
 */

export type NeighboursQuestion = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly neighbourIds: readonly string[];
  readonly language: QuestionLanguage;
};

export type NeighboursRound = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly order: readonly NeighboursQuestion[];
  readonly currentIndex: number;
  /** Отмеченные регионы текущего вопроса. Сбрасываются при переходе к следующему. */
  readonly marked: readonly string[];
  readonly attempts: readonly Attempt[];
};

export type NeighboursVerdict = {
  readonly found: readonly string[];
  readonly missed: readonly string[];
  readonly extra: readonly string[];
  readonly isCorrect: boolean;
};

export type NeighboursRoundOptions = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly random: () => number;
};

export type NeighboursAnswerInput = {
  readonly durationMs: number;
  readonly answeredAt: string;
};

/**
 * Спрашиваются те, у кого сухопутных соседей больше одного (решение владельца
 * от 2026-08-30). У Хайнаня и Тайваня их нет вовсе, у Гонконга и Макао
 * единственный Гуандун — такой вопрос проверяет не знание, а умение нажать.
 * Ответами все четверо остаются: не отметить Гонконг и Макао в вопросе о
 * Гуандуне — ошибка.
 */
export function askedRegions(regions: readonly Region[]): readonly Region[] {
  return regions.filter(
    (region) => (REGION_NEIGHBOURS[region.id] ?? []).length > 1,
  );
}

export function createNeighboursRound(
  regions: readonly Region[],
  options: NeighboursRoundOptions,
): NeighboursRound {
  const asked = askedRegions(regions);
  if (asked.length === 0) {
    throw new Error('Раунд не создан: некого спрашивать');
  }

  const order = shuffle(asked, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    roundId: options.roundId,
    regionId: region.id,
    neighbourIds: REGION_NEIGHBOURS[region.id],
    language: options.language,
  }));

  return {
    roundId: options.roundId,
    language: options.language,
    order,
    currentIndex: 0,
    marked: [],
    attempts: [],
  };
}

export function isNeighboursRoundFinished(round: NeighboursRound): boolean {
  return round.currentIndex >= round.order.length;
}

export function currentNeighboursQuestion(
  round: NeighboursRound,
): NeighboursQuestion {
  const question = round.order[round.currentIndex];
  if (!question) {
    throw new Error('Раунд завершён: текущего вопроса нет');
  }

  return question;
}

export function toggleMark(
  round: NeighboursRound,
  regionId: string,
): NeighboursRound {
  const marked = round.marked.includes(regionId)
    ? round.marked.filter((id) => id !== regionId)
    : [...round.marked, regionId];

  return { ...round, marked };
}

/**
 * Верно — только когда множество совпало точно. Пропущенный сосед и лишний
 * весят одинаково: и то и другое означает, что окружение региона ученик
 * представляет неверно.
 */
export function judge(
  question: NeighboursQuestion,
  marked: readonly string[],
): NeighboursVerdict {
  const truth = new Set(question.neighbourIds);
  const found = marked.filter((id) => truth.has(id));
  const extra = marked.filter((id) => !truth.has(id));
  const missed = question.neighbourIds.filter((id) => !marked.includes(id));

  return {
    found,
    missed,
    extra,
    isCorrect: missed.length === 0 && extra.length === 0,
  };
}

export function submitNeighbours(
  round: NeighboursRound,
  input: NeighboursAnswerInput,
): { readonly round: NeighboursRound; readonly verdict: NeighboursVerdict } {
  if (isNeighboursRoundFinished(round)) {
    throw new Error('Раунд завершён: отвечать не на что');
  }

  const question = currentNeighboursQuestion(round);
  const verdict = judge(question, round.marked);

  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    target: neighboursTarget(question.regionId),
    exerciseType: 'find-on-map',
    language: question.language,
    isCorrect: verdict.isCorrect,
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  return {
    round: {
      ...round,
      currentIndex: round.currentIndex + 1,
      marked: [],
      attempts: [...round.attempts, attempt],
    },
    verdict,
  };
}
