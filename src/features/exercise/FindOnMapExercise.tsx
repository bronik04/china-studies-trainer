import { useMemo, useState } from 'react';
import type { Region } from '../../content/types';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import type { MapZoom } from '../../map/MapControls';
import { AnswerFeedback } from './AnswerFeedback';
import { answerStatesFor } from './answer-states';

export type FindOnMapExerciseProps = {
  readonly regions: readonly Region[];
  readonly seed: number;
  readonly onFinish: () => void;
  readonly onExit: () => void;
};

export function FindOnMapExercise({
  regions,
  seed,
  onFinish,
  onExit,
}: FindOnMapExerciseProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      exerciseType: 'find-on-map',
      level: 1,
      random: createSeededRandom(seed),
    }),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());
  const [zoom, setZoom] = useState<MapZoom>(1);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.regionId)!;
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  const answerStates = useMemo(
    () => answerStatesFor(regions, question.regionId, answeredRegionId),
    [regions, question.regionId, answeredRegionId],
  );

  function handleSelect(regionId: string) {
    if (round.status !== 'ready') {
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
      onFinish();
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Найдите на карте</p>
        <h1 data-testid="exercise-target">{targetRegion.nameRu}</h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length}
        </p>
      </header>
      <ChinaMap
        regions={regions}
        selectedRegionId={answeredRegionId}
        onSelect={handleSelect}
        onClear={() => {}}
        zoom={zoom}
        onZoomChange={setZoom}
        answerStates={answerStates}
      />
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
