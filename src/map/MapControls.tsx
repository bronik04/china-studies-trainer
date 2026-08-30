import { ZOOM_LEVELS, type MapZoom } from './map-view';

/*
 * Ступени живут в `map-view.ts` — ими пользуются не только кнопки, — а
 * отсюда реэкспортируются: поверхности знают о масштабе через управление им.
 */
export { ZOOM_LEVELS, type MapZoom } from './map-view';

type MapControlsProps = {
  readonly zoom: MapZoom;
  readonly onZoomChange: (zoom: MapZoom) => void;
};

export function MapControls({ zoom, onZoomChange }: MapControlsProps) {
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;

  /*
   * Слова ушли в `aria-label`, на карте остались знаки: три подписи в полный
   * рост стояли поверх карты и весили больше неё. Знак скрыт от читалки —
   * имя кнопки уже сказано словом, и «плюс Увеличить» прочиталось бы дважды.
   *
   * Знаки нарисованы, а не набраны: настоящий минус (U+2212) и круговая
   * стрелка (U+21BA) не входят в подмножества шрифтов, а расширять их ради
   * двух символов проект уже пробовал и откатил. Рисунку шрифт не нужен
   * вовсе — и в исходниках не появляется знак, которого нет в шрифте.
   */
  return (
    <div className="map-controls" aria-label="Масштаб карты">
      <button
        type="button"
        aria-label="Увеличить"
        disabled={!canZoomIn}
        onClick={() => onZoomChange(ZOOM_LEVELS[zoomIndex + 1])}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Уменьшить"
        disabled={!canZoomOut}
        onClick={() => onZoomChange(ZOOM_LEVELS[zoomIndex - 1])}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.5 8h9" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Сбросить вид"
        disabled={zoom === 1}
        onClick={() => onZoomChange(1)}
      >
        {/*
          Уголки рамки, а не круговая стрелка: действие возвращает карту к
          целому виду, а не отменяет последний шаг. Уголки к тому же рисуются
          прямыми штрихами и остаются чёткими на любом экране — дуга радиусом
          в пять единиц на 20 px размывалась.
        */}
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
        </svg>
      </button>
    </div>
  );
}
