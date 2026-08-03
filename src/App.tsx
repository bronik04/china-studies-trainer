import { useMemo, useState } from 'react';
import { regions } from './content/regions';
import type { Region } from './content/types';
import { addAttempts } from './domain/progress';
import {
  bestAccuracy,
  regionIdsToRepeat,
  summariseRound,
} from './domain/progress-rules';
import { createProgressStore } from './domain/progress-storage';
import type { Attempt } from './domain/round';
import { FindOnMapExercise } from './features/exercise/FindOnMapExercise';
import { RoundResultsPage } from './features/results/RoundResultsPage';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise' | 'results';

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
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound(pool: readonly Region[]) {
    setRoundPool(pool);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  function finishRound(attempts: readonly Attempt[]) {
    const updated = addAttempts(progress, attempts);
    setProgress(updated);
    store.write(updated);
    setLastAttempts(attempts);
    setScreen('results');
  }

  if (screen === 'exercise') {
    return (
      <FindOnMapExercise
        regions={roundPool}
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
          startRound(regions.filter((region) => toRepeat.includes(region.id)));
        }}
        onNewRound={() => startRound(regions)}
        onExit={() => setScreen('topic')}
      />
    );
  }

  return (
    <TopicSelectionPage regions={regions} onStartRound={() => startRound(regions)}>
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
