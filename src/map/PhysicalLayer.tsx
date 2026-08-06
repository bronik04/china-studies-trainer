import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import { RELIEF_SHAPES, RIVER_LINES } from './physical-geometry';
import { RIVER_SHAPES } from './river-hit';

/**
 * Физическая карта: заливка по ступеням рельефа и шесть рек поверх.
 *
 * Рисуется порталом внутрь уже вставленной разметки карты — как слой городов,
 * и по той же причине: система координат и увеличение достаются ему от самой
 * карты, а не подгоняются вторым `svg` поверх.
 *
 * Обрезка по границе Китая делается `clipPath` из `<use>` на те же 34 контура
 * региона. Копировать их геометрию сюда не нужно и вредно: копия разошлась бы
 * с картой при первой же её правке.
 */
const NAME_OF = new Map(
  physicalFeatures.map((feature) => [
    feature.id,
    `${feature.nameRu}, ${feature.nameZh}`,
  ]),
);

const NAME_RU_OF = new Map(
  physicalFeatures.map((feature) => [feature.id, feature.nameRu]),
);

/** Подпись отходит от линии вверх, иначе буквы садятся на саму реку. */
const LABEL_OFFSET = 4;

/**
 * Точка подписи — середина самого длинного куска линии. У реки, разрезанной
 * рамкой карты, середина общего списка точек попала бы в разрыв.
 */
const LABEL_POINTS = new Map(
  RIVER_SHAPES.map((river) => {
    const longest = river.parts.reduce(
      (best, part) => (part.length > best.length ? part : best),
      river.parts[0] ?? [],
    );

    return [river.featureId, longest[Math.floor(longest.length / 2)] ?? [0, 0]];
  }),
);

const CLIP_ID = 'china-land-clip';

export type PhysicalLayerProps = {
  readonly selectedFeatureId?: string | null;
  /**
   * Река под указателем. Приходит снаружи, потому что наводятся не на саму
   * линию, а на полосу вокруг неё: попасть рукой в полторы единицы ширины
   * нельзя, и какая река под курсором, решает расстояние, а не браузер.
   */
  readonly hoveredFeatureId?: string | null;
  /**
   * Задан — объекты отвечают на нажатие и получают фокус. Не задан — слой
   * только показывает: в атласе шесть новых остановок `Tab` оправданы, а на
   * чужой поверхности — нет. Имя объекта при этом остаётся: реки — то главное,
   * что говорит эта карта, и читалке экрана они названы в обоих случаях.
   *
   * Сам обработчик здесь отвечает только клавиатуре. Указатель разрешается
   * расстоянием в `ChinaMap`: линия слишком тонка, чтобы быть целью, и
   * ставить на неё `onClick` значило бы завести вторую дорогу к тому же
   * действию — с другим правилом попадания.
   */
  readonly onSelect?: (featureId: string) => void;
  /** Ложь — подписи скрыты: в игре подпись объекта и есть ответ. */
  readonly showsLabels?: boolean;
};

export function PhysicalLayer({
  selectedFeatureId = null,
  hoveredFeatureId = null,
  onSelect,
  showsLabels = true,
}: PhysicalLayerProps) {
  return (
    <g
      className="physical-layer"
      data-interactive={onSelect !== undefined}
      data-labels={showsLabels}
    >
      <defs>
        <clipPath id={CLIP_ID}>
          {regions.map((region) => (
            <use key={region.mapAreaId} href={`#${region.mapAreaId}`} />
          ))}
        </clipPath>
      </defs>

      <g className="relief" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.map((shape) => (
          <path
            key={shape.key}
            className="relief-shape"
            d={shape.d}
            data-step={shape.step}
            data-feature-id={shape.featureId}
            aria-hidden="true"
          />
        ))}
      </g>

      <g className="rivers" clipPath={`url(#${CLIP_ID})`}>
        {RIVER_LINES.map((line) => {
          const label = NAME_OF.get(line.featureId) ?? line.featureId;
          const [labelX, labelY] = LABEL_POINTS.get(line.featureId) ?? [0, 0];

          return (
            <g key={line.featureId} className="river">
              <path
                className="river-line"
                d={line.d}
                data-feature-id={line.featureId}
                data-selected={line.featureId === selectedFeatureId}
                data-hovered={line.featureId === hoveredFeatureId}
                role={onSelect ? 'button' : undefined}
                aria-label={label}
                tabIndex={onSelect ? 0 : -1}
                onKeyDown={
                  onSelect
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(line.featureId);
                        }
                      }
                    : undefined
                }
              />
              <text
                className="physical-label"
                x={labelX}
                y={labelY - LABEL_OFFSET}
                textAnchor="middle"
                aria-hidden="true"
              >
                {NAME_RU_OF.get(line.featureId)}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}
