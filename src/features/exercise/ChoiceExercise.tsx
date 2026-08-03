import { useMemo, useState, type MouseEvent } from 'react';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Attempt,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { AnswerFeedback } from './AnswerFeedback';
import type { ExerciseMode } from './exercise-modes';

export type ChoiceExerciseProps = {
  readonly regions: readonly Region[];
  readonly mode: ExerciseMode;
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

export function ChoiceExercise({
  regions,
  mode,
  roundId,
  seed,
  onFinish,
  onExit,
}: ChoiceExerciseProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      roundId,
      exerciseType: mode.exerciseType,
      level: 1,
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
  const choices = choicesByQuestion[round.currentIndex];
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  function handleAnswer(event: MouseEvent<HTMLButtonElement>) {
    const regionId = event.currentTarget.dataset.choiceId ?? '';
    if (round.status !== 'ready' || regionId === '') {
      return;
    }

    setAnsweredRegionId(regionId);
    setRound(
      answerQuestion(round, {
        answeredRegionId: regionId,
        durationMs: Math.round(performance.now() - askedAt),
        answeredAt: new Date().toISOString(),
      }),
    );
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
        <h1 data-testid="exercise-target">{mode.promptOf(targetRegion)}</h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length}
        </p>
      </header>
      {mode.showsMap ? (
        <ChinaMap
          regions={regions}
          selectedRegionId={question.regionId}
          onSelect={() => {}}
          onClear={() => {}}
          interactive={false}
        />
      ) : null}
      <ul className="choice-list" aria-label="Варианты ответа">
        {choices.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              data-testid="choice-option"
              data-choice-id={choice.id}
              data-result={resultOf(choice.id, question.regionId, answeredRegionId)}
              disabled={round.status !== 'ready'}
              onClick={handleAnswer}
            >
              {mode.optionOf(choice)}
            </button>
          </li>
        ))}
      </ul>
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
