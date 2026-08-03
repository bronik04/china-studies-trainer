import type { Region } from '../content/types';
import { shuffle } from './random';

export type ExerciseType = 'find-on-map' | 'name-region' | 'match-capital';
export type Level = 1 | 2 | 3 | 4;

/**
 * SPEC.md описывает последовательность ready → answered → feedback → next.
 * Наблюдаемых состояний два: между регистрацией ответа и показом обратной
 * связи в MVP ничего не происходит (решение от 2026-08-03).
 */
export type QuestionStatus = 'ready' | 'feedback';

export type Question = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
};

export type Attempt = {
  readonly questionId: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly isCorrect: boolean;
  readonly durationMs: number;
  readonly answeredAt: string;
};

export type Round = {
  readonly questions: readonly Question[];
  readonly currentIndex: number;
  readonly status: QuestionStatus;
  readonly attempts: readonly Attempt[];
};

export type RoundOptions = {
  readonly roundId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly random: () => number;
};

export type AnswerInput = {
  readonly answeredRegionId: string;
  readonly durationMs: number;
  readonly answeredAt: string;
};

/** Раунд по всем регионам темы: каждый ровно один раз, порядок перемешан. */
export function createRound(
  regions: readonly Region[],
  options: RoundOptions,
): Round {
  if (regions.length === 0) {
    throw new Error('Раунд не создан: нет регионов');
  }

  const questions = shuffle(regions, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    roundId: options.roundId,
    regionId: region.id,
    exerciseType: options.exerciseType,
    level: options.level,
  }));

  return { questions, currentIndex: 0, status: 'ready', attempts: [] };
}

export function isRoundFinished(round: Round): boolean {
  return round.currentIndex >= round.questions.length;
}

export function currentQuestion(round: Round): Question {
  const question = round.questions[round.currentIndex];
  if (!question) {
    throw new Error('Раунд завершён: текущего вопроса нет');
  }

  return question;
}

export function answerQuestion(round: Round, input: AnswerInput): Round {
  if (round.status !== 'ready') {
    throw new Error('Повторный ответ на вопрос запрещён');
  }

  const question = currentQuestion(round);
  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    regionId: question.regionId,
    exerciseType: question.exerciseType,
    level: question.level,
    isCorrect: input.answeredRegionId === question.regionId,
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  return { ...round, status: 'feedback', attempts: [...round.attempts, attempt] };
}

export function goToNextQuestion(round: Round): Round {
  if (round.status !== 'feedback') {
    throw new Error('Переход к следующему вопросу возможен только после ответа');
  }

  return { ...round, currentIndex: round.currentIndex + 1, status: 'ready' };
}
