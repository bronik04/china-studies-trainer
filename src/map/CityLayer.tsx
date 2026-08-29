import { useMemo, useState } from 'react';
import type { City } from '../content/types';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { CITY_POINTS, type CityPoint } from './city-points';
import { clusterPlaceables } from './cluster';
import { ClusterLens } from './ClusterLens';
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
   * города, которые пришлось собирать в гроздь на целом виде, расходятся сами.
   */
  readonly zoom?: number;
};

/**
 * Радиус знака: город виден, но не спорит с границей региона.
 *
 * Мера берётся от той карты, где город разглядывают, а не от опорной ширины:
 * в атласе карта шириной 542 px при 806 единицах viewBox даёт 0.67 px на
 * единицу, и прежние 2.5 превращались в точку 3.4 px.
 */
const MARK_RADIUS = 3.2;

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
 * меньше 24 px, подпись появляется только у одного города за раз. Из
 * последнего следует, что задачи взаимного расположения полусотни надписей не
 * возникает — остаётся не уехать за край.
 *
 * Там, где города стоят ближе цели нажатия — дельта Янцзы, — они собираются в
 * гроздь и раскрываются лупой (`cluster.ts`). Прежде цель отходила от знака и
 * связывалась с ним поводком; на пяти городах в пяти единицах карты это
 * читалось кляксой с усами.
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
  /*
   * Гроздь нужна там, где есть что разделять: цель нажатия или подсвеченный
   * ответ. Слой, который только показывает, — атлас — собирать знаки в число
   * не должен: раскрыть такую гроздь нечем, и половина городов просто
   * исчезла бы с карты.
   */
  const separates = onSelect !== undefined || selectedCityId !== null;

  const layout = useMemo(
    () => {
      const placeables = points.map((point) => ({
        id: point.city.id,
        x: point.x,
        y: point.y,
      }));

      return separates
        ? clusterPlaceables(placeables, TARGET_DIAMETER_UNITS / zoom)
        : { singles: placeables, clusters: [] };
    },
    [points, separates, zoom],
  );

  const cityById = useMemo(
    () => new Map(points.map((point) => [point.city.id, point.city])),
    [points],
  );

  /*
   * Гроздь со спрошенным городом раскрывается сама: в «назвать город»
   * подсвеченная точка и есть вопрос, и свёрнутая гроздь спрятала бы его.
   * После этого ученик волен закрыть её с клавиатуры — до следующего вопроса.
   */
  const askedClusterId =
    layout.clusters.find((cluster) =>
      cluster.members.some((member) => member.id === selectedCityId),
    )?.id ?? null;

  /*
   * Что раскрыто. `null` — ученик ничего не трогал, и раскрыта гроздь со
   * спрошенной целью; пустая строка — он закрыл её сам; иначе — та, которую он
   * раскрыл. Так раскрытой всегда остаётся ровно одна.
   */
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);
  const [lastAsked, setLastAsked] = useState<string | null>(askedClusterId);

  /*
   * Подстройка во время отрисовки, а не эффектом: эффект здесь дал бы вторую
   * перерисовку на каждый вопрос, и линтер справедливо на это ругается.
   */
  if (askedClusterId !== lastAsked) {
    setLastAsked(askedClusterId);
    setOpenClusterId(null);
  }

  function cityMark(cityId: string, x: number, y: number, inLens: boolean) {
    const city = cityById.get(cityId) as City;
    /*
     * Сторона подписи выбирается по положению знака: у восточного побережья,
     * где городов больше всего, подпись справа ушла бы за край viewBox.
     */
    const onEasternHalf = x > MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH * 0.75;
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
          cx={x}
          cy={y}
          r={MARK_RADIUS}
          aria-hidden="true"
        />
        {/*
          Кольцо рисуется всегда, но видно только у выбранной точки: без него
          спрошенный город терялся среди полусотни одинаковых знаков.
        */}
        <circle
          className="city-halo"
          cx={x}
          cy={y}
          r={MARK_RADIUS * 3.5}
          fill="none"
          stroke="none"
          aria-hidden="true"
        />
        <text
          className="city-label"
          x={x + (onEasternHalf ? -LABEL_OFFSET : LABEL_OFFSET)}
          y={y}
          textAnchor={onEasternHalf ? 'end' : 'start'}
          aria-hidden="true"
        >
          {city.nameRu}
        </text>
        <circle
          className="city-hit"
          cx={x}
          cy={y}
          r={TARGET_DIAMETER_UNITS / zoom / 2}
          data-city-id={city.id}
          data-cluster-member={inLens ? city.id : undefined}
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
  }

  return (
    <g
      className="city-layer"
      data-interactive={onSelect !== undefined}
      data-labels={showsLabels}
    >
      {layout.singles.map((single) =>
        cityMark(single.id, single.x, single.y, false),
      )}
      {layout.clusters.map((cluster) => {
        const names = cluster.members
          .map((member) => (cityById.get(member.id) as City).nameRu)
          .join(', ');

        return (
          <ClusterLens
            key={cluster.id}
            cluster={cluster}
            open={
              openClusterId === null
                ? cluster.id === askedClusterId
                : openClusterId === cluster.id
            }
            movesFocus={openClusterId === cluster.id}
            hitRadius={TARGET_DIAMETER_UNITS / zoom / 2}
            label={
              onSelect
                ? `Гроздь из ${cluster.members.length} городов: ${names}`
                : undefined
            }
            mark={
              <circle
                className="city-mark"
                cx={cluster.x}
                cy={cluster.y}
                r={MARK_RADIUS}
                aria-hidden="true"
              />
            }
            onOpen={() => setOpenClusterId(cluster.id)}
            onClose={() => setOpenClusterId('')}
          >
            {cluster.members.map((member) =>
              cityMark(member.id, member.lensX, member.lensY, true),
            )}
          </ClusterLens>
        );
      })}
    </g>
  );
}
