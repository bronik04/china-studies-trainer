import { useMemo, useState } from 'react';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { clusterPlaceables } from './cluster';
import { ClusterMark } from './ClusterMark';
import { LANDMARK_POINTS, type LandmarkPoint } from './landmark-points';
import { MAP_VIEWBOX_MIN_X, MAP_VIEWBOX_WIDTH } from './target-size';

export type LandmarkLayerProps = {
  readonly points?: readonly LandmarkPoint[];
  readonly selectedLandmarkId?: string | null;
  /**
   * Задан — звёзды отвечают на нажатие и получают фокус. Приходит списком:
   * скучившиеся объекты — одна цель, и нажатие по ней отдаёт всех её членов.
   * Кто из них спрошен, знает раунд, а не карта: карта не считает
   * правильность ответа.
   */
  readonly onSelect?: (landmarkIds: readonly string[]) => void;
  readonly showsLabels?: boolean;
  readonly zoom?: number;
};

/**
 * Радиус звезды. Луч уходит наружу на 1,55 радиуса и внутрь на 0,65 — при 3,4
 * знак читается звездой уже с шести пикселей, а не превращается в пятно.
 */
const MARK_RADIUS = 3.4;

/**
 * Спрошенная звезда крупнее: в «назвать» она и есть вопрос, и знак прежнего
 * размера, отличавшийся только заливкой, терялся среди трёх десятков соседей —
 * его приходилось искать по всей карте.
 */
const SELECTED_MARK_RADIUS = 6;

const LABEL_OFFSET = MARK_RADIUS + 4;

/** Зона наведения слоя, который только показывает, — чуть больше знака. */
const HOVER_MARGIN = 1.6;

function starPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 10 }, (unused, index) => {
    const reach = index % 2 === 0 ? radius * 1.55 : radius * 0.65;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;

    return `${x + reach * Math.cos(angle)},${y + reach * Math.sin(angle)}`;
  }).join(' ');
}

/**
 * Слой достопримечательностей поверх карты.
 *
 * Знак — звезда, а не второй кружок: город и достопримечательность на одном
 * экране не встречаются (в раундах по достопримечательностям карта чистая), но
 * в разметке они соседи, и форма отличает их надёжнее любого цвета — цвет тут
 * занят заливкой региона.
 *
 * Скучившиеся объекты собираются в гроздь, и гроздь сама — цель ответа
 * (решение владельца от 2026-08-30): тренажёр спрашивает «где это», а не «в
 * какой части Пекина», и три пекинских объекта в полутора единицах карты — с
 * точки зрения вопроса одна точка. Лупы и приближения здесь нет намеренно:
 * разводить эти звёзды не нужно ни на каком масштабе.
 */
export function LandmarkLayer({
  points = LANDMARK_POINTS,
  selectedLandmarkId = null,
  onSelect,
  showsLabels = true,
  zoom = 1,
}: LandmarkLayerProps) {
  /*
   * Гроздь нужна там, где есть что объединять: цель нажатия или подсвеченный
   * ответ. Слой, который только показывает, рисует каждую звезду отдельно.
   */
  const separates = onSelect !== undefined || selectedLandmarkId !== null;

  const layout = useMemo(
    () => {
      const placeables = points.map((point) => ({
        id: point.landmark.id,
        x: point.x,
        y: point.y,
      }));

      return separates
        ? clusterPlaceables(placeables, TARGET_DIAMETER_UNITS / zoom)
        : { singles: placeables, clusters: [] };
    },
    [points, separates, zoom],
  );

  const pointById = useMemo(
    () => new Map(points.map((point) => [point.landmark.id, point])),
    [points],
  );

  /* Объект под рукой или в фокусе — его подпись рисуется поверх слоя. */
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);

  function landmarkMark(id: string, x: number, y: number) {
    const landmark = (pointById.get(id) as LandmarkPoint).landmark;
    const selected = landmark.id === selectedLandmarkId;
    const label = `${landmark.nameRu}, ${landmark.nameZh}`;
    const markRadius = selected ? SELECTED_MARK_RADIUS : MARK_RADIUS;
    /* Цель нажатия не меньше знака — как у городов. */
    const hitRadius = onSelect
      ? Math.max(
          TARGET_DIAMETER_UNITS / zoom / 2,
          markRadius * 1.55 + HOVER_MARGIN,
        )
      : markRadius * 1.55 + HOVER_MARGIN;

    return (
      <g
        key={landmark.id}
        className="landmark"
        data-landmark-id={landmark.id}
        data-landmark-kind={landmark.kind}
        data-selected={selected}
      >
        <polygon
          className="landmark-mark"
          points={starPoints(x, y, markRadius)}
          aria-hidden="true"
        />
        {/* Кольцо видно только у спрошенной звезды — как у городов. */}
        <circle
          className="landmark-halo"
          cx={x}
          cy={y}
          r={SELECTED_MARK_RADIUS * 1.9}
          fill="none"
          stroke="none"
          aria-hidden="true"
        />
        <circle
          className="landmark-hit"
          cx={x}
          cy={y}
          r={hitRadius}
          data-landmark-id={landmark.id}
          role={onSelect ? 'button' : undefined}
          aria-label={onSelect ? label : undefined}
          aria-hidden={onSelect ? undefined : 'true'}
          tabIndex={onSelect ? 0 : -1}
          onPointerEnter={() => setActiveLandmarkId(landmark.id)}
          onPointerLeave={() =>
            setActiveLandmarkId((previous) =>
              previous === landmark.id ? null : previous,
            )
          }
          onFocus={onSelect ? () => setActiveLandmarkId(landmark.id) : undefined}
          onBlur={
            onSelect
              ? () =>
                  setActiveLandmarkId((previous) =>
                    previous === landmark.id ? null : previous,
                  )
              : undefined
          }
          onClick={onSelect ? () => onSelect([landmark.id]) : undefined}
          onKeyDown={
            onSelect
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect([landmark.id]);
                  }
                }
              : undefined
          }
        />
      </g>
    );
  }

  const labelledIds = showsLabels
    ? [...new Set([selectedLandmarkId, activeLandmarkId])].filter(
        (id): id is string => id !== null && pointById.has(id),
      )
    : [];

  return (
    <g className="landmark-layer" data-interactive={onSelect !== undefined}>
      {layout.singles.map((single) =>
        landmarkMark(single.id, single.x, single.y),
      )}
      {layout.clusters.map((cluster) => {
        const askedInside = cluster.members.some(
          (member) => member.id === selectedLandmarkId,
        );
        const names = cluster.members
          .map(
            (member) => (pointById.get(member.id) as LandmarkPoint).landmark.nameRu,
          )
          .join(', ');

        return (
          <ClusterMark
            key={cluster.id}
            cluster={cluster}
            hitRadius={TARGET_DIAMETER_UNITS / zoom / 2}
            selected={askedInside}
            label={
              onSelect ? `Достопримечательности рядом: ${names}` : undefined
            }
            mark={
              <polygon
                className="landmark-mark"
                points={starPoints(
                  cluster.x,
                  cluster.y,
                  askedInside ? SELECTED_MARK_RADIUS : MARK_RADIUS,
                )}
                aria-hidden="true"
              />
            }
            onActivate={() =>
              onSelect?.(cluster.members.map((member) => member.id))
            }
          />
        );
      })}
      {labelledIds.map((landmarkId) => {
        const point = pointById.get(landmarkId) as LandmarkPoint;
        const onEasternHalf =
          point.x > MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH * 0.75;

        return (
          <text
            key={landmarkId}
            className="landmark-label"
            x={point.x + (onEasternHalf ? -LABEL_OFFSET : LABEL_OFFSET)}
            y={point.y}
            textAnchor={onEasternHalf ? 'end' : 'start'}
            aria-hidden="true"
          >
            {point.landmark.nameRu}
          </text>
        );
      })}
    </g>
  );
}
