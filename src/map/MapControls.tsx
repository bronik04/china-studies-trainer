const zoomLevels = [1, 1.25, 1.5] as const;

export type MapZoom = (typeof zoomLevels)[number];

type MapControlsProps = {
  readonly zoom: MapZoom;
  readonly onZoomChange: (zoom: MapZoom) => void;
};

export function MapControls({ zoom, onZoomChange }: MapControlsProps) {
  const zoomIndex = zoomLevels.indexOf(zoom);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < zoomLevels.length - 1;

  return (
    <div className="map-controls" aria-label="Масштаб карты">
      <button
        type="button"
        disabled={!canZoomIn}
        onClick={() => onZoomChange(zoomLevels[zoomIndex + 1])}
      >
        Увеличить
      </button>
      <button
        type="button"
        disabled={!canZoomOut}
        onClick={() => onZoomChange(zoomLevels[zoomIndex - 1])}
      >
        Уменьшить
      </button>
      <button type="button" disabled={zoom === 1} onClick={() => onZoomChange(1)}>
        Сбросить вид
      </button>
    </div>
  );
}
