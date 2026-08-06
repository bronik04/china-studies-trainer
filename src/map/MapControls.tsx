/*
 * Ступени увеличения. Верхние две добавлены ради озёр: контур Цинхая, самого
 * большого озера страны, на целом виде занимает 12,8 px, а на прежнем пределе
 * 1,5× — 19,1 px, то есть остаётся пятном. На 3× он доходит до 38 px и
 * читается настоящей формой; то же и у Поянху с Дунтинху, чьи очертания и
 * есть то, по чему их узнают.
 *
 * Цели нажатия от этого не страдают: их размер задан в пикселях экрана и
 * делится на увеличение — на 3× цель занимает втрое меньше единиц карты, и
 * соседние объекты перестают спорить, а не начинают.
 */
const zoomLevels = [1, 1.25, 1.5, 2, 3] as const;

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
