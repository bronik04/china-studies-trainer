import { useMemo, useState, type MouseEvent } from 'react';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import { labelOf } from '../../domain/representations';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Attempt,
  type ExerciseType,
  type Level,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { AnswerFeedback } from './AnswerFeedback';
import { answerStatesFor } from './answer-states';
import { EXERCISE_MODES } from './exercise-modes';

export type ExerciseRoundProps = {
  readonly regions: readonly Region[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly level: Level;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

function resultOf(
  choiceId: string,
  targetId: string,
  answeredRegionId: string | null,
): 'correct' | 'incorrect' | undefined {
  if (answeredRegionId === null) {
    return undefined;
  }

  if (choiceId === targetId) {
    return 'correct';
  }

  return choiceId === answeredRegionId ? 'incorrect' : undefined;
}

/**
 * Один контейнер на все задания: на смешанном уровне типы чередуются внутри
 * раунда, поэтому вид вопроса решается на каждом вопросе, а не на экране.
 */
export function ExerciseRound({
  regions,
  exerciseTypes,
  level,
  roundId,
  seed,
  onFinish,
  onExit,
}: ExerciseRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      roundId,
      exerciseTypes,
      level,
      random: createSeededRandom(seed),
    }),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());

  // Варианты считаются один раз на раунд: иначе перерисовка тасовала бы их
  // прямо под курсором.
  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildChoices(regions, question.regionId, random),
    );
  }, [regions, round.questions, seed]);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.regionId)!;
  const mode = EXERCISE_MODES[question.exerciseType];
  const isMapAnswer = question.exerciseType === 'find-on-map';
  const showsMap = isMapAnswer || question.exerciseType === 'name-region';
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  const answerStates = useMemo(
    () =>
      isMapAnswer ? answerStatesFor(regions, question.regionId, answeredRegionId) : {},
    [isMapAnswer, regions, question.regionId, answeredRegionId],
  );

  function answer(regionId: string) {
    setAnsweredRegionId(regionId);
    setRound(
      answerQuestion(round, {
        answeredRegionId: regionId,
        durationMs: Math.round(performance.now() - askedAt),
        answeredAt: new Date().toISOString(),
      }),
    );
  }

  function handleMapSelect(regionId: string) {
    if (round.status === 'ready') {
      answer(regionId);
    }
  }

  function handleChoice(event: MouseEvent<HTMLButtonElement>) {
    const regionId = event.currentTarget.dataset.choiceId ?? '';
    if (round.status === 'ready' && regionId !== '') {
      answer(regionId);
    }
  }

  function handleNext() {
    const next = goToNextQuestion(round);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">{mode.eyebrow}</p>
        <h1 data-testid="exercise-target">
          {question.exerciseType === 'name-region'
            ? 'Регион на карте'
            : labelOf(targetRegion, question.representation)}
        </h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length} · уровень {level}
        </p>
      </header>
      {showsMap ? (
        <ChinaMap
          regions={regions}
          selectedRegionId={isMapAnswer ? answeredRegionId : question.regionId}
          onSelect={handleMapSelect}
          onClear={() => {}}
          answerStates={answerStates}
          interactive={isMapAnswer}
        />
      ) : null}
      {isMapAnswer ? null : (
        <ul className="choice-list" aria-label="Варианты ответа">
          {choicesByQuestion[round.currentIndex].map((choice) => (
            <li key={choice.id}>
              <button
                type="button"
                data-testid="choice-option"
                data-choice-id={choice.id}
                data-result={resultOf(choice.id, question.regionId, answeredRegionId)}
                disabled={round.status !== 'ready'}
                onClick={handleChoice}
              >
                {question.exerciseType === 'match-capital'
                  ? choice.capitalRu
                  : labelOf(choice, question.representation)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {round.status === 'feedback' ? (
        <AnswerFeedback
          isCorrect={answeredRegionId === question.regionId}
          targetRegion={targetRegion}
          isLastQuestion={isLastQuestion}
          onNext={handleNext}
        />
      ) : null}
      <button type="button" className="secondary" onClick={onExit}>
        Прервать раунд
      </button>
    </main>
  );
}
