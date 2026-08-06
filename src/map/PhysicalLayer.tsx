import { useState } from 'react';
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

/**
 * Где стоит подпись каждой из двенадцати целей. У реки это середина самого
 * длинного куска линии, поднятая над ней; у формы — точка, посчитанная
 * генератором как середина наибольшей вписанной окружности.
 */
const LABELLED: readonly { featureId: string; x: number; y: number }[] = [
  ...RIVER_SHAPES.map((river) => {
    const [x, y] = LABEL_POINTS.get(river.featureId) ?? [0, 0];

    return { featureId: river.featureId, x, y: y - LABEL_OFFSET };
  }),
  ...RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => ({
    featureId: shape.featureId!,
    x: shape.labelX ?? 0,
    y: shape.labelY ?? 0,
  })),
];

const CLIP_ID = 'china-land-clip';

/** Литерал `{}` в параметрах создавал бы новый объект на каждой отрисовке. */
const NO_OUTCOMES: Readonly<Record<string, FeatureOutcome>> = {};

/** Чем кончился ответ по объекту. */
export type FeatureOutcome = 'correct' | 'incorrect';

export type PhysicalLayerProps = {
  readonly selectedFeatureId?: string | null;
  /**
   * Река под указателем. Приходит снаружи, потому что наводятся не на саму
   * линию, а на полосу вокруг неё: попасть рукой в полторы единицы ширины
   * нельзя, и какая река под курсором, решает расстояние, а не браузер.
   *
   * У формы всё наоборот: она сама знает, что на неё навели, — и знает только
   * она. Слой вставлен порталом, события React всплывают по дереву React, и до
   * карты наведение на узел слоя не доходит. Поэтому источников два, и это не
   * дублирование: у реки цель считают, у формы она есть.
   */
  readonly hoveredFeatureId?: string | null;
  /**
   * Задан — объекты отвечают на нажатие и получают фокус. Не задан — слой
   * только показывает: в атласе шесть новых остановок `Tab` оправданы, а на
   * чужой поверхности — нет. Имя объекта при этом остаётся: реки — то главное,
   * что говорит эта карта, и читалке экрана они названы в обоих случаях.
   *
   * Указателю узлы слоя отвечают сами, и это не вторая дорога к тому же
   * действию: слой вставлен порталом, а события React всплывают по дереву
   * React, а не DOM, — до обработчика карты нажатие по узлу слоя не доходит
   * вовсе. Карта разрешает расстоянием ровно те нажатия, что пришлись мимо
   * узлов: линия шириной в полторы единицы почти всегда мимо.
   */
  readonly onSelect?: (featureId: string) => void;
  /** Ложь — подписи скрыты: в игре подпись объекта и есть ответ. */
  readonly showsLabels?: boolean;
  /**
   * Чем кончился ответ по объекту. Пусто до ответа: на физической карте
   * состояние не бывает цветом — он занят тремя ступенями, — и до ответа
   * помечать нечего.
   */
  readonly featureOutcomes?: Readonly<Record<string, FeatureOutcome>>;
};

export function PhysicalLayer({
  selectedFeatureId = null,
  hoveredFeatureId = null,
  onSelect,
  showsLabels = true,
  featureOutcomes = NO_OUTCOMES,
}: PhysicalLayerProps) {
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const hovered = hoveredFeatureId ?? hoveredShapeId;

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
        {RELIEF_SHAPES.map((shape) => {
          /*
           * Спрашиваются шесть форм из тридцати восьми. Остальные тридцать две
           * заливают фон и молчат: имён у них на экране нет, иначе пришлось бы
           * сверять тридцать восемь имён вместо шести ради подложки.
           */
          const isTarget = shape.featureId !== undefined;
          const answers = isTarget && onSelect !== undefined;

          return (
            <path
              key={shape.key}
              className="relief-shape"
              d={shape.d}
              data-step={shape.step}
              data-feature-id={shape.featureId}
              data-selected={isTarget && shape.featureId === selectedFeatureId}
              data-outcome={
                isTarget ? featureOutcomes[shape.featureId!] : undefined
              }
              role={answers ? 'button' : undefined}
              aria-label={isTarget ? NAME_OF.get(shape.featureId!) : undefined}
              aria-hidden={isTarget ? undefined : 'true'}
              tabIndex={answers ? 0 : -1}
              onClick={answers ? () => onSelect(shape.featureId!) : undefined}
              onPointerEnter={
                answers ? () => setHoveredShapeId(shape.featureId!) : undefined
              }
              onPointerLeave={answers ? () => setHoveredShapeId(null) : undefined}
              onFocus={answers ? () => setHoveredShapeId(shape.featureId!) : undefined}
              onBlur={answers ? () => setHoveredShapeId(null) : undefined}
              onKeyDown={
                answers
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(shape.featureId!);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </g>

      {/*
        Границы регионов поверх ступеней. Без них физическая карта перестаёт
        связывать новый материал со старым: ученик видит рельеф, но не видит,
        где он. Геометрия та же, что у clipPath, — `<use>` на те же контуры,
        второй копии путей на карте не появляется.
      */}
      <g className="region-outlines" clipPath={`url(#${CLIP_ID})`} aria-hidden="true">
        {regions.map((region) => (
          <use key={region.mapAreaId} href={`#${region.mapAreaId}`} />
        ))}
      </g>

      {/*
        Копия контура под штриховку исхода. Заливка нарисованной формы
        заменяется целиком: поставить ей `fill: url(#…)` — и ступень исчезнет,
        а между штрихами покажется область региона под слоем. Поэтому форма с
        исходом рисуется дважды. Копий не больше двух за вопрос: правильный
        объект и, если ученик промахнулся, выбранный.
      */}
      <g className="relief-outcomes" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.filter(
          (shape) =>
            shape.featureId !== undefined &&
            featureOutcomes[shape.featureId] !== undefined,
        ).map((shape) => (
          <path
            key={shape.key}
            className="relief-outcome"
            d={shape.d}
            data-outcome={featureOutcomes[shape.featureId!]}
            aria-hidden="true"
          />
        ))}
      </g>

      <g className="rivers" clipPath={`url(#${CLIP_ID})`}>
        {RIVER_LINES.map((line) => {
          const label = NAME_OF.get(line.featureId) ?? line.featureId;

          return (
            <g key={line.featureId} className="river">
              <path
                className="river-line"
                d={line.d}
                data-feature-id={line.featureId}
                data-selected={line.featureId === selectedFeatureId}
                data-hovered={line.featureId === hoveredFeatureId}
                data-outcome={featureOutcomes[line.featureId]}
                role={onSelect ? 'button' : undefined}
                aria-label={label}
                tabIndex={onSelect ? 0 : -1}
                onClick={onSelect ? () => onSelect(line.featureId) : undefined}
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
            </g>
          );
        })}
      </g>

      {/*
        Подписи объектов — последними и без обрезки по границе.
        Без обрезки: «Великая Китайская равнина» длиннее самой равнины, и
        clipPath съедал у неё хвост. Последними: буквы не должны уходить под
        линию реки.

        Видна подпись у одного объекта за раз — при наведении, фокусе и
        выборе, как у городов. Постоянные подписи здесь не держатся: Тарим
        течёт по Таримской впадине, Хуанхэ идёт через Лёссовое плато, и имена
        накладываются друг на друга.
      */}
      <g className="physical-labels">
        {LABELLED.map((label) => (
          <text
            key={label.featureId}
            className="physical-label"
            x={label.x}
            y={label.y}
            data-feature-id={label.featureId}
            data-selected={label.featureId === selectedFeatureId}
            data-hovered={label.featureId === hovered}
            textAnchor="middle"
            aria-hidden="true"
          >
            {NAME_RU_OF.get(label.featureId)}
          </text>
        ))}
      </g>
    </g>
  );
}
