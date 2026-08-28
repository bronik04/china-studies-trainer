import type { Dynasty } from '../content/types';
import type { QuestionLanguage } from './question-language';
import { shuffle } from './random';
import { historyTarget, type Attempt } from './round';

/**
 * Раунд-расстановка: имена династий кладутся на ленту времени.
 *
 * Отдельный модуль, а не расширение `round.ts`: там действует инвариант
 * «повторный ответ на вопрос запрещён», а здесь на одно имя приходится до трёх
 * попыток. Тот же довод, по которому отдельно живёт `fill-round.ts`, и то же
 * устройство: попытки, исход на имя, обычные `Attempt` наружу.
 *
 * Наружу раунд отдаёт цели `history:<id>` — те же, что у остальных игр по
 * династиям. Поэтому освоенность, экран итогов и повтор ошибок работают без
 * единой правки.
 */

export const MAX_ATTEMPTS_PER_NAME = 3;

/**
 * Четыре имени в круге, а не шесть и не двенадцать: карточки должны помещаться
 * в строку на узком экране, а двенадцать имён разом превратили бы игру в
 * перебор.
 */
export const CIRCLE_SIZE = 4;

export type PlacementOutcome = 'first-try' | 'second-try' | 'failed';

export type OrderRound = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  /** Круги по четыре имени: порядок задаёт сид. */
  readonly circles: readonly (readonly string[])[];
  readonly currentCircle: number;
  /** Имена круга, которые ещё не поставлены. */
  readonly pending: readonly string[];
  readonly usedAttempts: number;
  readonly outcomes: Readonly<Record<string, PlacementOutcome>>;
  readonly attempts: readonly Attempt[];
};

export type OrderMove =
  | { readonly kind: 'retry'; readonly attemptsLeft: 1 | 2 }
  | {
      readonly kind: 'placed';
      readonly dynastyId: string;
      readonly outcome: PlacementOutcome;
      /** Ложь — попытки кончились, имя поставили за ученика. */
      readonly wasFound: boolean;
    };

export type OrderRoundOptions = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly random: () => number;
};

export function createOrderRound(
  dynasties: readonly Dynasty[],
  options: OrderRoundOptions,
): OrderRound {
  if (dynasties.length === 0) {
    throw new Error('Раунд не создан: нет династий');
  }

  const order = shuffle([...dynasties], options.random).map(
    (dynasty) => dynasty.id,
  );
  const circles: string[][] = [];
  for (let index = 0; index < order.length; index += CIRCLE_SIZE) {
    circles.push(order.slice(index, index + CIRCLE_SIZE));
  }

  return {
    roundId: options.roundId,
    language: options.language,
    circles,
    currentCircle: 0,
    pending: circles[0],
    usedAttempts: 0,
    outcomes: {},
    attempts: [],
  };
}

export function isOrderRoundFinished(round: OrderRound): boolean {
  return round.currentCircle >= round.circles.length;
}

function outcomeFor(usedAttempts: number): PlacementOutcome {
  if (usedAttempts === 0) {
    return 'first-try';
  }

  return usedAttempts === 1 ? 'second-try' : 'failed';
}

export type OrderPlacement = {
  readonly nameId: string;
  readonly bandId: string;
  readonly durationMs: number;
  readonly answeredAt: string;
};

export function placeName(
  round: OrderRound,
  input: OrderPlacement,
): { readonly round: OrderRound; readonly move: OrderMove } {
  if (isOrderRoundFinished(round)) {
    throw new Error('Раунд завершён: ставить некуда');
  }

  if (!round.pending.includes(input.nameId)) {
    throw new Error(`Имя ${input.nameId} не в этом круге`);
  }

  const isCorrect = input.nameId === input.bandId;
  const isLastAttempt = round.usedAttempts >= MAX_ATTEMPTS_PER_NAME - 1;

  /*
   * Промах, пока попытки есть: имя возвращается в набор, попытка списывается,
   * а полоса не трогается — её ещё займут.
   */
  if (!isCorrect && !isLastAttempt) {
    const attemptsLeft = (MAX_ATTEMPTS_PER_NAME -
      round.usedAttempts -
      1) as 1 | 2;

    return {
      round: { ...round, usedAttempts: round.usedAttempts + 1 },
      move: { kind: 'retry', attemptsLeft },
    };
  }

  const outcome = isCorrect ? outcomeFor(round.usedAttempts) : 'failed';
  const attempt: Attempt = {
    questionId: `${round.roundId}-${input.nameId}`,
    roundId: round.roundId,
    target: historyTarget(input.nameId),
    exerciseType: 'match-pair',
    language: round.language,
    /* «Освоил» значит «берёт с первой». Ответ со второй попадает в повтор. */
    isCorrect: outcome === 'first-try',
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  const pending = round.pending.filter((id) => id !== input.nameId);
  const circleDone = pending.length === 0;

  return {
    round: {
      ...round,
      currentCircle: circleDone ? round.currentCircle + 1 : round.currentCircle,
      pending: circleDone
        ? (round.circles[round.currentCircle + 1] ?? [])
        : pending,
      usedAttempts: 0,
      outcomes: { ...round.outcomes, [input.nameId]: outcome },
      attempts: [...round.attempts, attempt],
    },
    move: {
      kind: 'placed',
      dynastyId: input.nameId,
      outcome,
      wasFound: isCorrect,
    },
  };
}
