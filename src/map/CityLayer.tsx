import { useMemo } from 'react';
import type { City } from '../content/types';
import { spreadHitTargets, TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { CITY_POINTS, type CityPoint } from './city-points';
import { MAP_VIEWBOX_MIN_X, MAP_VIEWBOX_WIDTH } from './target-size';

export type CityLayerProps = {
  /** Какие города показывать. По умолчанию — все из каталога. */
  readonly points?: readonly CityPoint[];
  readonly selectedCityId?: string | null;
  /**
   * Задан — города отвечают на нажатие и получают фокус. Не задан — слой
   * только показывает: 57 новых остановок Tab в атласе, где город ничего не
   * делает, стоили бы дороже, чем дают. Названия городов региона при этом не
   * пропадают — они перечислены в его карточке.
   */
  readonly onSelect?: (cityId: string) => void;
  /**
   * Ложь — подписи скрыты совсем. В «назвать город» подсвеченная точка и есть
   * вопрос, и её подпись — готовый ответ: та же утечка, что у выносок Макао и
   * Гонконга на экране ответа.
   */
  readonly showsLabels?: boolean;
  /**
   * Во сколько раз увеличена карта. Цель нажатия обязана быть 24 px на экране,
   * а не в единицах карты: на увеличении те же 24 px занимают меньше единиц, и
   * города, которые пришлось разводить на целом виде, встают на свои места.
   */
  readonly zoom?: number;
};

/** Радиус знака: город виден, но не спорит с границей региона. */
const MARK_RADIUS = 2.5;

/**
 * Подпись отходит от знака на его радиус и ещё немного — иначе буква садится
 * на кружок.
 */
const LABEL_OFFSET = MARK_RADIUS + 3;

/**
 * Слой городов поверх карты.
 *
 * Точка — три разные вещи, и разделены они намеренно (`MAP_SPEC.md`,
 * спек городов): знак стоит на настоящем месте, цель нажатия обязана быть не
 * меньше 24 px и потому может отойти, подпись появляется только у одного
 * города за раз. Из последнего следует, что задачи взаимного расположения
 * полусотни надписей не возникает — остаётся не уехать за край.
 *
 * Компонент рисуется порталом внутрь уже вставленной разметки карты, поэтому
 * система координат и увеличение у него общие с ней, а не подогнанные.
 */
export function CityLayer({
  points = CITY_POINTS,
  selectedCityId = null,
  onSelect,
  showsLabels = true,
  zoom = 1,
}: CityLayerProps) {
  const targets = useMemo(
    () =>
      spreadHitTargets(
        points.map((point) => ({ id: point.city.id, x: point.x, y: point.y })),
        TARGET_DIAMETER_UNITS / zoom,
      ),
    [points, zoom],
  );

  const cityById = useMemo(
    () => new Map(points.map((point) => [point.city.id, point.city])),
    [points],
  );

  return (
    <g
      className="city-layer"
      data-interactive={onSelect !== undefined}
      data-labels={showsLabels}
    >
      {targets.map((target) => {
        const city = cityById.get(target.id) as City;
        /*
         * Сторона подписи выбирается по положению знака: у восточного
         * побережья, где городов больше всего, подпись справа ушла бы за край
         * viewBox.
         */
        const onEasternHalf =
          target.x > MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH * 0.75;
        const label = `${city.nameRu}, ${city.nameZh}`;

        return (
          <g
            key={city.id}
            className="city"
            data-city-id={city.id}
            data-city-set={city.set}
            data-selected={city.id === selectedCityId}
          >
            <circle
              className="city-mark"
              cx={target.x}
              cy={target.y}
              r={MARK_RADIUS}
              aria-hidden="true"
            />
            {/*
              Кольцо рисуется всегда, но видно только у выбранной точки: без
              него спрошенный город терялся среди полусотни одинаковых знаков.
            */}
            <circle
              className="city-halo"
              cx={target.x}
              cy={target.y}
              r={MARK_RADIUS * 3.5}
              fill="none"
              stroke="none"
              aria-hidden="true"
            />
            {/*
              Цель нажатия невидима и может стоять не на знаке. Когда она
              отошла, её связь со знаком показывает поводок: без него нажатие
              срабатывало бы «мимо города».
            */}
            {target.hitX !== target.x || target.hitY !== target.y ? (
              <line
                className="city-leader"
                x1={target.x}
                y1={target.y}
                x2={target.hitX}
                y2={target.hitY}
                aria-hidden="true"
              />
            ) : null}
            <text
              className="city-label"
              x={target.x + (onEasternHalf ? -LABEL_OFFSET : LABEL_OFFSET)}
              y={target.y}
              textAnchor={onEasternHalf ? 'end' : 'start'}
              aria-hidden="true"
            >
              {city.nameRu}
            </text>
            <circle
              className="city-hit"
              cx={target.hitX}
              cy={target.hitY}
              r={target.radius}
              data-city-id={city.id}
              role={onSelect ? 'button' : undefined}
              aria-label={onSelect ? label : undefined}
              aria-hidden={onSelect ? undefined : 'true'}
              tabIndex={onSelect ? 0 : -1}
              onClick={onSelect ? () => onSelect(city.id) : undefined}
              onKeyDown={
                onSelect
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(city.id);
                      }
                    }
                  : undefined
              }
            />
          </g>
        );
      })}
    </g>
  );
}
