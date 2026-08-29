import { useMemo, useState } from 'react';
import type { Landmark } from '../content/landmarks';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { clusterPlaceables } from './cluster';
import { ClusterLens } from './ClusterLens';
import { LANDMARK_POINTS, type LandmarkPoint } from './landmark-points';
import { MAP_VIEWBOX_MIN_X, MAP_VIEWBOX_WIDTH } from './target-size';

export type LandmarkLayerProps = {
  readonly points?: readonly LandmarkPoint[];
  readonly selectedLandmarkId?: string | null;
  /** Задан — звёзды отвечают на нажатие и получают фокус. То же, что у городов. */
  readonly onSelect?: (landmarkId: string) => void;
  readonly showsLabels?: boolean;
  readonly zoom?: number;
};

/**
 * Радиус звезды. Луч уходит наружу на 1,55 радиуса и внутрь на 0,65 — при 3,4
 * знак читается звездой уже с шести пикселей, а не превращается в пятно.
 */
const MARK_RADIUS = 3.4;

const LABEL_OFFSET = MARK_RADIUS + 4;

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
 * Устроен как слой городов: знак стоит на настоящем месте, подпись появляется
 * у одного объекта за раз, а скучившиеся объекты собираются в гроздь и
 * раскрываются лупой. У трёх пекинских объектов между знаками полторы единицы
 * карты — без грозди они были бы одним пятном.
 */
export function LandmarkLayer({
  points = LANDMARK_POINTS,
  selectedLandmarkId = null,
  onSelect,
  showsLabels = true,
  zoom = 1,
}: LandmarkLayerProps) {
  const layout = useMemo(
    () =>
      clusterPlaceables(
        points.map((point) => ({
          id: point.landmark.id,
          x: point.x,
          y: point.y,
        })),
        TARGET_DIAMETER_UNITS / zoom,
      ),
    [points, zoom],
  );

  const landmarkById = useMemo(
    () => new Map(points.map((point) => [point.landmark.id, point.landmark])),
    [points],
  );

  /*
   * Гроздь со спрошенным объектом раскрывается сама: в «назвать» подсвеченная
   * звезда и есть вопрос, а свёрнутая гроздь спрятала бы его.
   */
  const askedClusterId =
    layout.clusters.find((cluster) =>
      cluster.members.some((member) => member.id === selectedLandmarkId),
    )?.id ?? null;

  const [openClusterId, setOpenClusterId] = useState<string | null>(
    askedClusterId,
  );
  const [lastAsked, setLastAsked] = useState<string | null>(askedClusterId);

  /* Подстройка во время отрисовки, а не эффектом: см. `CityLayer`. */
  if (askedClusterId !== lastAsked) {
    setLastAsked(askedClusterId);
    setOpenClusterId(askedClusterId);
  }

  function landmarkMark(id: string, x: number, y: number, inLens: boolean) {
    const landmark = landmarkById.get(id) as Landmark;
    const onEasternHalf = x > MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH * 0.75;
    const label = `${landmark.nameRu}, ${landmark.nameZh}`;

    return (
      <g
        key={landmark.id}
        className="landmark"
        data-landmark-id={landmark.id}
        data-landmark-kind={landmark.kind}
        data-selected={landmark.id === selectedLandmarkId}
      >
        <polygon
          className="landmark-mark"
          points={starPoints(x, y, MARK_RADIUS)}
          aria-hidden="true"
        />
        <text
          className="landmark-label"
          x={x + (onEasternHalf ? -LABEL_OFFSET : LABEL_OFFSET)}
          y={y}
          textAnchor={onEasternHalf ? 'end' : 'start'}
          aria-hidden="true"
        >
          {landmark.nameRu}
        </text>
        <circle
          className="landmark-hit"
          cx={x}
          cy={y}
          r={TARGET_DIAMETER_UNITS / zoom / 2}
          data-landmark-id={landmark.id}
          data-cluster-member={inLens ? landmark.id : undefined}
          role={onSelect ? 'button' : undefined}
          aria-label={onSelect ? label : undefined}
          aria-hidden={onSelect ? undefined : 'true'}
          tabIndex={onSelect ? 0 : -1}
          onClick={onSelect ? () => onSelect(landmark.id) : undefined}
          onKeyDown={
            onSelect
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(landmark.id);
                  }
                }
              : undefined
          }
        />
      </g>
    );
  }

  return (
    <g
      className="landmark-layer"
      data-interactive={onSelect !== undefined}
      data-labels={showsLabels}
    >
      {layout.singles.map((single) =>
        landmarkMark(single.id, single.x, single.y, false),
      )}
      {layout.clusters.map((cluster) => {
        const names = cluster.members
          .map((member) => (landmarkById.get(member.id) as Landmark).nameRu)
          .join(', ');

        return (
          <ClusterLens
            key={cluster.id}
            cluster={cluster}
            open={openClusterId === cluster.id}
            hitRadius={TARGET_DIAMETER_UNITS / zoom / 2}
            label={
              onSelect
                ? `Гроздь из ${cluster.members.length} достопримечательностей: ${names}`
                : undefined
            }
            mark={
              <polygon
                className="landmark-mark"
                points={starPoints(cluster.x, cluster.y, MARK_RADIUS)}
                aria-hidden="true"
              />
            }
            onOpen={() => setOpenClusterId(cluster.id)}
            onClose={() => setOpenClusterId(null)}
          >
            {cluster.members.map((member) =>
              landmarkMark(member.id, member.lensX, member.lensY, true),
            )}
          </ClusterLens>
        );
      })}
    </g>
  );
}
