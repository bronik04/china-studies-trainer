import { shuffle } from './random';
import { representationsFor, type Representation } from './representations';

export type ExerciseType = 'find-on-map' | 'name-region' | 'match-capital';
export type Level = 1 | 2 | 3 | 4;

/**
 * Вид цели. Регионы и города — разные наборы: «путает Ланьчжоу с Синином» не
 * должно смешиваться с «не знает Ганьсу», поэтому вид входит в саму цель, а не
 * выводится из идентификатора. `beijing` существует и как регион, и как город.
 */
export type TargetKind = 'region' | 'city';

export type Target = {
  readonly kind: TargetKind;
  readonly id: string;
};

export function regionTarget(id: string): Target {
  return { kind: 'region', id };
}

/** Ключ для группировки: `Map` не умеет сравнивать объекты по значению. */
export function targetKey(target: Target): string {
  return `${target.kind}:${target.id}`;
}

export function sameTarget(left: Target, right: Target): boolean {
  return left.kind === right.kind && left.id === right.id;
}

/**
 * SPEC.md описывает последовательность ready → answered → feedback → next.
 * Наблюдаемых состояний два: между регистрацией ответа и показом обратной
 * связи в MVP ничего не происходит (решение от 2026-08-03).
 */
export type QuestionStatus = 'ready' | 'feedback';

export type Question = {
  readonly id: string;
  readonly roundId: string;
  readonly target: Target;
  readonly exerciseType: ExerciseType;
  readonly representation: Representation;
  readonly level: Level;
};

export type Attempt = {
  readonly questionId: string;
  readonly roundId: string;
  readonly target: Target;
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
  /** Больше одного типа — смешанный раунд: типы чередуются (EXERCISES.md). */
  readonly exerciseTypes: readonly ExerciseType[];
  readonly level: Level;
  readonly random: () => number;
};

export type AnswerInput = {
  /**
   * Что выбрал ученик. Строка, а не цель: в играх по городам ответом бывает
   * регион, а не тот же вид, что у вопроса, и правило сравнения тогда
   * переезжает в саму игру.
   */
  readonly answeredId: string;
  readonly durationMs: number;
  readonly answeredAt: string;
};

/** Раунд по всем целям темы: каждая ровно один раз, порядок перемешан. */
export function createRound(
  targets: readonly Target[],
  options: RoundOptions,
): Round {
  if (targets.length === 0) {
    throw new Error('Раунд не создан: нет целей');
  }

  if (options.exerciseTypes.length === 0) {
    throw new Error('Раунд не создан: не заданы типы заданий');
  }

  const questions = shuffle(targets, options.random).map((target, index) => {
    const exerciseType = options.exerciseTypes[index % options.exerciseTypes.length];
    const available = representationsFor(options.level, exerciseType);
    const representation = available[Math.floor(options.random() * available.length)];

    return {
      id: `${index + 1}-${target.id}`,
      roundId: options.roundId,
      target,
      exerciseType,
      representation,
      level: options.level,
    };
  });

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
    target: question.target,
    exerciseType: question.exerciseType,
    level: question.level,
    isCorrect: input.answeredId === question.target.id,
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
