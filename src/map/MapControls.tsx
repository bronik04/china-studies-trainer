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
        onClick={() => onZoomChange(zoomLevels[zoomIndex + 1])}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Уменьшить"
        disabled={!canZoomOut}
        onClick={() => onZoomChange(zoomLevels[zoomIndex - 1])}
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
