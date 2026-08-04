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
import { AtlasPage } from './features/atlas/AtlasPage';
import { HomePage } from './features/home/HomePage';
import type { MapZoom } from './map/MapControls';

/** «mixed» — смешанный раунд четвёртого уровня, где типы заданий чередуются. */
type RoundRequest = ExerciseType | 'mixed';

type Screen = 'home' | 'atlas' | 'exercise' | 'results' | 'fill' | 'fill-results';

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
  const [screen, setScreen] = useState<Screen>('home');
  const [roundPool, setRoundPool] = useState<readonly Region[]>(regions);
  const [exerciseTypes, setExerciseTypes] = useState<readonly ExerciseType[]>([
    'find-on-map',
  ]);
  const [level, setLevel] = useState<Level>(1);
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
  const [repeatRegionIds, setRepeatRegionIds] = useState<readonly string[]>([]);
  const [fillRound, setFillRound] = useState<FillRound | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  /**
   * `regionIds === null` — раунд по всем регионам темы. Набор считается здесь,
   * а не у вызывающего: подпись кнопки и её действие приходят из одного
   * правила (`nextStep`), и разделять их снова незачем.
   */
  function startRound(
    request: RoundRequest,
    nextLevel: Level,
    regionIds: readonly string[] | null,
  ) {
    setRoundPool(
      regionIds === null
        ? regions
        : regions.filter((region) => regionIds.includes(region.id)),
    );
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
   * Освоенность и открытый уровень выводятся из истории попыток. В прогрессе
   * они всё же сохраняются: этого требует DATA_MODEL.md, — но для показа
   * всегда вычисляются заново, чтобы отставшее поле не заперло ученика.
   *
   * Общая для всех режимов: раунд-заполнение пишет по одной попытке на
   * регион, поэтому правила применяются к нему без изменений.
   */
  function commitAttempts(attempts: readonly Attempt[]) {
    const withAttempts = addAttempts(progress, attempts);
    const updated = {
      ...withAttempts,
      masteredRegionIds: masteredRegionIds(withAttempts.attempts, new Date()),
      unlockedLevel: unlockedLevelFrom(withAttempts.attempts),
    };
    setProgress(updated);
    store.write(updated);

    return updated;
  }

  function finishFillRound(round: FillRound) {
    commitAttempts(round.attempts);
    setFillRound(round);
    setScreen('fill-results');
  }

  function finishRound(attempts: readonly Attempt[]) {
    const updated = commitAttempts(attempts);
    setLastAttempts(attempts);
    /*
     * Набор для повтора считается здесь, а не при отрисовке итогов: `new Date()`
     * в теле компонента — нечистый вызов. Заодно подпись кнопки и её действие
     * получают один и тот же список, а не два вычисления одного правила.
     */
    setRepeatRegionIds(regionIdsToRepeat(updated.attempts, new Date()));
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
        onExit={() => setScreen('home')}
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
        onExit={() => setScreen('home')}
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
        onExit={() => setScreen('home')}
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
        regionIdsToRepeat={repeatRegionIds}
        onRepeatMistakes={() => {
          startRound(
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
            repeatRegionIds,
          );
        }}
        onNewRound={() =>
          startRound(
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
            null,
          )
        }
        onExit={() => setScreen('home')}
      />
    );
  }

  if (screen === 'atlas') {
    return (
      <AtlasPage
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={setSelectedRegionId}
        onClear={() => setSelectedRegionId(null)}
        zoom={zoom}
        onZoomChange={setZoom}
        onExit={() => setScreen('home')}
        onTrain={() =>
          startRound('find-on-map', unlockedLevelFrom(progress.attempts), null)
        }
      />
    );
  }

  return (
    <HomePage
      regions={regions}
      attempts={progress.attempts}
      onStartRound={startRound}
      onStartFillRound={startFillRound}
      onOpenAtlas={() => setScreen('atlas')}
    />
  );
}
