import { useMemo, useState } from 'react';
import { regions } from './content/regions';
import type { Region } from './content/types';
import { addAttempts } from './domain/progress';
import {
  bestAccuracy,
  masteredRegionIds,
  regionIdsToRepeat,
  summariseRound,
  unlockedLevelFrom,
} from './domain/progress-rules';
import type { FillRound } from './domain/fill-round';
import { createProgressStore } from './domain/progress-storage';
import type { Attempt, ExerciseType, Level } from './domain/round';
import { ExerciseRound } from './features/exercise/ExerciseRound';
import { FillMapRound } from './features/exercise/FillMapRound';
import { ALL_EXERCISE_TYPES } from './features/exercise/exercise-modes';
import { FillMapResultsPage } from './features/results/FillMapResultsPage';
import { RoundResultsPage } from './features/results/RoundResultsPage';
import {
  TopicSelectionPage,
  type RoundRequest,
} from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise' | 'results' | 'fill' | 'fill-results';

/** Хранилище может быть запрещено политикой браузера — обращение к нему бросает. */
function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function newRoundId(): string {
  return `round-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function App() {
  const store = useMemo(() => createProgressStore(readStorage()), []);
  const [progress, setProgress] = useState(() => store.read());
  const [screen, setScreen] = useState<Screen>('topic');
  const [roundPool, setRoundPool] = useState<readonly Region[]>(regions);
  const [exerciseTypes, setExerciseTypes] = useState<readonly ExerciseType[]>([
    'find-on-map',
  ]);
  const [level, setLevel] = useState<Level>(1);
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
  const [fillRound, setFillRound] = useState<FillRound | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound(pool: readonly Region[], request: RoundRequest, nextLevel: Level) {
    setRoundPool(pool);
    setExerciseTypes(request === 'mixed' ? ALL_EXERCISE_TYPES : [request]);
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  function startFillRound(nextLevel: Level) {
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setFillRound(null);
    setScreen('fill');
  }

  /**
   * Раунд-заполнение пишет по одной попытке на регион, поэтому существующие
   * правила освоенности и открытия уровней применяются без изменений.
   */
  function finishFillRound(round: FillRound) {
    const withAttempts = addAttempts(progress, round.attempts);
    const updated = {
      ...withAttempts,
      masteredRegionIds: masteredRegionIds(withAttempts.attempts, new Date()),
      unlockedLevel: unlockedLevelFrom(withAttempts.attempts),
    };
    setProgress(updated);
    store.write(updated);
    setFillRound(round);
    setScreen('fill-results');
  }

  /**
   * Освоенность и открытый уровень выводятся из истории попыток. В прогрессе
   * они всё же сохраняются: этого требует DATA_MODEL.md, — но для показа
   * всегда вычисляются заново, чтобы отставшее поле не заперло ученика.
   */
  function finishRound(attempts: readonly Attempt[]) {
    const withAttempts = addAttempts(progress, attempts);
    const updated = {
      ...withAttempts,
      masteredRegionIds: masteredRegionIds(withAttempts.attempts, new Date()),
      unlockedLevel: unlockedLevelFrom(withAttempts.attempts),
    };
    setProgress(updated);
    store.write(updated);
    setLastAttempts(attempts);
    setScreen('results');
  }

  if (screen === 'fill') {
    return (
      <FillMapRound
        regions={regions}
        level={level}
        roundId={roundId}
        seed={seed}
        onFinish={finishFillRound}
        onExit={() => setScreen('topic')}
      />
    );
  }

  if (screen === 'fill-results' && fillRound !== null) {
    return (
      <FillMapResultsPage
        round={fillRound}
        regions={regions}
        isProgressSaved={store.isAvailable}
        onNewRound={() => startFillRound(level)}
        onExit={() => setScreen('topic')}
      />
    );
  }

  if (screen === 'exercise') {
    return (
      <ExerciseRound
        regions={roundPool}
        exerciseTypes={exerciseTypes}
        level={level}
        roundId={roundId}
        seed={seed}
        onFinish={finishRound}
        onExit={() => setScreen('topic')}
      />
    );
  }

  if (screen === 'results') {
    const summary = summariseRound(lastAttempts);

    return (
      <RoundResultsPage
        summary={summary}
        regions={regions}
        bestAccuracy={bestAccuracy(progress.attempts)}
        isProgressSaved={store.isAvailable}
        onRepeatMistakes={() => {
          // Список тем на экране обрезан до пяти, а повторять надо все ошибки
          // за последние 14 дней (EXERCISES.md).
          const toRepeat = regionIdsToRepeat(progress.attempts, new Date());
          startRound(
            regions.filter((region) => toRepeat.includes(region.id)),
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
          );
        }}
        onNewRound={() =>
          startRound(
            regions,
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
          )
        }
        onExit={() => setScreen('topic')}
      />
    );
  }

  return (
    <TopicSelectionPage
      regions={regions}
      unlockedLevel={unlockedLevelFrom(progress.attempts)}
      onStartRound={(request, nextLevel) => startRound(regions, request, nextLevel)}
      onStartFillRound={startFillRound}
    >
      <ChinaMap
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={setSelectedRegionId}
        onClear={() => setSelectedRegionId(null)}
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </TopicSelectionPage>
  );
}
