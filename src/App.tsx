import { useState } from 'react';
import { regions } from './content/regions';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

export default function App() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  return (
    <TopicSelectionPage regions={regions}>
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
