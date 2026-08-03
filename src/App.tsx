import { useState } from 'react';
import { regions } from './content/regions';
import { FindOnMapExercise } from './features/exercise/FindOnMapExercise';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise';

function newRoundId(): string {
  return `round-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('topic');
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound() {
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  if (screen === 'exercise') {
    return (
      <FindOnMapExercise
        regions={regions}
        roundId={roundId}
        seed={seed}
        onFinish={() => setScreen('topic')}
        onExit={() => setScreen('topic')}
      />
    );
  }

  return (
    <TopicSelectionPage regions={regions} onStartRound={startRound}>
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
