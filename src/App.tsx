import { useState } from 'react';
import { regions } from './content/regions';
import { FindOnMapExercise } from './features/exercise/FindOnMapExercise';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise';

export default function App() {
  const [screen, setScreen] = useState<Screen>('topic');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  if (screen === 'exercise') {
    return (
      <FindOnMapExercise
        regions={regions}
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
