import type { PhysicalFeature } from '../content/types';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';
import {
  clusterPlaceables,
  MAX_LENS_RADIUS_UNITS,
  type Placeable,
} from './cluster';
import { distanceToPolylines } from './polyline';
import { REGION_PALETTE } from './region-palette';
import {
  containsPoint,
  distanceToBoundary,
  largestInscribedCircle,
  polygonArea,
  type Point,
} from './svg-path';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
  MIN_TARGET_PX,
  pixelsToUnits,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
  unitsToPixels,
} from './target-size';

/**
 * У каждого региона должна быть запись в палитре: из неё берутся точка
 * подписи и диаметр вписанной окружности.
 *
 * Без этой проверки `undersizedRegions` молча пропускает неизвестный
 * идентификатор, и забытый `npm run generate:palette` проходит сборку, а
 * область остаётся без цели нажатия.
 */
export function validateRegionPalette(regionIds: readonly string[]): void {
  const missing = regionIds.filter(
    (regionId) => REGION_PALETTE[regionId] === undefined,
  );

  if (missing.length > 0) {
    throw new Error(
      `Нет записи в палитре регионов: ${missing.join(', ')}. ` +
        'Запустите npm run generate:palette',
    );
  }
}

/**
 * Единицы палитры считаны из конкретного `viewBox`. Если карту заменят на
 * источник с другими размерами, пересчёт в пиксели станет врать, порог
 * нажимаемости — пропускать мелкие области, а пропорция `--map-aspect`
 * в токенах разойдётся с содержимым коробки карты.
 */
export function validateViewBox(viewBox: string | null): void {
  const parts = viewBox?.trim().split(/\s+/) ?? [];
  const minX = Number(parts[0]);
  const minY = Number(parts[1]);
  const width = Number(parts[2]);
  const height = Number(parts[3]);

  if (minX !== MAP_VIEWBOX_MIN_X || minY !== MAP_VIEWBOX_MIN_Y) {
    throw new Error(
      `Начало координат viewBox ${minX} ${minY} не совпадает с ` +
        `${MAP_VIEWBOX_MIN_X} ${MAP_VIEWBOX_MIN_Y}. В нём живёт поле вокруг ` +
        'рисунка: без него обводка крайних регионов обрезается',
    );
  }

  if (width !== MAP_VIEWBOX_WIDTH) {
    throw new Error(
      `Ширина viewBox карты ${width} не совпадает с MAP_VIEWBOX_WIDTH ${MAP_VIEWBOX_WIDTH}. ` +
        'Обновите константу и перегенерируйте палитру и цели нажатия',
    );
  }

  if (height !== MAP_VIEWBOX_HEIGHT) {
    throw new Error(
      `Высота viewBox карты ${height} не совпадает с MAP_VIEWBOX_HEIGHT ${MAP_VIEWBOX_HEIGHT}. ` +
        'Обновите константу и токен --map-aspect в tokens.css',
    );
  }
}

/**
 * Каждый регион, который меньше порога нажатия, обязан иметь либо отдельную
 * цель `data-hit-region-id`, либо вынесенный маркер. Без этой проверки правка
 * геометрии молча вернула бы Шанхай к цели в 12 px.
 */
export function validateTargetSizes(
  regionIds: readonly string[],
  hitTargetIds: readonly string[],
  calloutIds: readonly string[],
): void {
  const covered = new Set([...hitTargetIds, ...calloutIds]);
  const missing = undersizedRegions(
    regionIds,
    REFERENCE_MAP_WIDTH,
    MIN_TARGET_PX,
  ).filter(({ regionId }) => !covered.has(regionId));

  if (missing.length > 0) {
    throw new Error(
      missing
        .map(
          ({ regionId, availablePx }) =>
            `Область меньше ${MIN_TARGET_PX} px и не имеет цели нажатия: ${regionId} (${availablePx.toFixed(
              1,
            )} px при ширине карты ${REFERENCE_MAP_WIDTH} px)`,
        )
        .join('\n'),
    );
  }
}

export function validateMapAreaIds(
  regionIds: readonly string[],
  mapAreaIds: readonly string[],
): void {
  const errors: string[] = [];
  const regionIdSet = new Set(regionIds);
  const mapAreaIdSet = new Set(mapAreaIds);

  for (const regionId of regionIds) {
    if (!mapAreaIdSet.has(regionId)) {
      errors.push(`Нет области карты: ${regionId}`);
    }
  }

  for (const mapAreaId of mapAreaIds) {
    if (!regionIdSet.has(mapAreaId)) {
      errors.push(`Неизвестная область карты: ${mapAreaId}`);
    }
  }

  for (const mapAreaId of mapAreaIdSet) {
    if (mapAreaIds.filter((id) => id === mapAreaId).length > 1) {
      errors.push(`Повторяющаяся область карты: ${mapAreaId}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

/**
 * Допуск на точку у самого края региона.
 *
 * Строгого попадания в контур требовать нельзя: проекция карты восстановлена
 * с невязкой 1.8 px (`projection.ts`), а береговая линия и границы в исходной
 * карте генерализованы. Приморские города — Гонконг, Шэньчжэнь, Циндао —
 * оказываются снаружи на доли единицы, оставаясь на своём месте.
 *
 * Три единицы — про генерализацию карты, а не про нынешний каталог. Прежний
 * наблюдаемый максимум давали приграничные города (2.0 у Маньчжурии); после
 * их снятия (DECISIONS.md, 2026-08-28) он равен 0.14 у Циндао, но допуск
 * оставлен прежним: сузить его до сегодняшнего каталога значило бы завалить
 * сборку на первом же новом приморском городе. Он и так на порядок меньше
 * расстояния до соседнего региона, поэтому неверная привязка города к региону
 * не пройдёт.
 */
export const CITY_BOUNDARY_TOLERANCE = 3;

export type Placement = {
  /** Идентификатор цели: города или достопримечательности. */
  readonly id: string;
  readonly regionId: string;
  readonly x: number;
  readonly y: number;
};

export type PlacementShapes = {
  /** Контур региона по его `mapAreaId`. */
  readonly contains: (mapAreaId: string, x: number, y: number) => boolean;
  readonly distanceToBoundary: (mapAreaId: string, x: number, y: number) => number;
  readonly mapAreaOf: (regionId: string) => string | undefined;
  readonly mapAreaIds: readonly string[];
};

export type PlacementReport = {
  /** Цели вне контура, но в пределах допуска: их видно в логе сборки. */
  readonly onBoundary: readonly string[];
};

/**
 * Точка цели должна лежать в контуре своего региона. Проверка ловит три разные
 * ошибки сразу: опечатку в координатах, неверную привязку к региону и
 * расхождение проекции.
 *
 * Существительное приходит снаружи, потому что одна и та же проверка стоит на
 * двух каталогах: сообщение «Город X вне региона» о Запретном городе сбивало
 * бы с толку ровно там, где нужно быстро понять, что не так.
 */
function validatePlacement(
  placements: readonly Placement[],
  shapes: PlacementShapes,
  noun: string,
): PlacementReport {
  const errors: string[] = [];
  const onBoundary: string[] = [];

  for (const placement of placements) {
    const mapAreaId = shapes.mapAreaOf(placement.regionId);
    if (mapAreaId === undefined) {
      errors.push(`Нет области карты у региона ${placement.regionId}`);
      continue;
    }

    if (shapes.contains(mapAreaId, placement.x, placement.y)) {
      continue;
    }

    const distance = shapes.distanceToBoundary(mapAreaId, placement.x, placement.y);
    if (distance <= CITY_BOUNDARY_TOLERANCE) {
      onBoundary.push(placement.id);
      continue;
    }

    const inside = shapes.mapAreaIds.filter((id) =>
      shapes.contains(id, placement.x, placement.y),
    );

    errors.push(
      `${noun} ${placement.id} вне региона ${placement.regionId}: ` +
        `до края ${distance.toFixed(1)} единиц при допуске ${CITY_BOUNDARY_TOLERANCE}` +
        (inside.length > 0 ? `; точка лежит в ${inside.join(', ')}` : ''),
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { onBoundary };
}

export function validateCityPlacement(
  placements: readonly Placement[],
  shapes: PlacementShapes,
): PlacementReport {
  return validatePlacement(placements, shapes, 'Город');
}

export function validateLandmarkPlacement(
  placements: readonly Placement[],
  shapes: PlacementShapes,
): PlacementReport {
  return validatePlacement(placements, shapes, 'Достопримечательность');
}

/**
 * Радиус лупы каждой грозди — в пределах `MAX_LENS_RADIUS_UNITS`.
 *
 * Лупа шириной в десятую часть карты означает не оформительскую мелочь, а то,
 * что каталог просит другого решения: коэффициент считается по ближайшей паре,
 * и один объект, придвинутый вплотную к соседу, растаскивает всю гроздь.
 * Тихого запасного пути нет намеренно — принимать такое решение должен
 * человек.
 *
 * Возвращает самую широкую лупу каждого слоя: её видно в логе сборки, и рост
 * заметен раньше, чем упрётся в предел.
 */
export function validateLensRadii(
  layers: readonly {
    readonly layer: string;
    readonly points: readonly Placeable[];
  }[],
): readonly { readonly layer: string; readonly id: string; readonly radius: number }[] {
  const errors: string[] = [];
  const widest: { layer: string; id: string; radius: number }[] = [];

  for (const { layer, points } of layers) {
    const { clusters } = clusterPlaceables(points);

    for (const cluster of clusters) {
      if (cluster.radius > MAX_LENS_RADIUS_UNITS) {
        errors.push(
          `Лупа грозди ${cluster.id} в слое «${layer}» — ${cluster.radius.toFixed(1)} ` +
            `единиц при пределе ${MAX_LENS_RADIUS_UNITS}. Объекты: ` +
            cluster.members.map((member) => member.id).join(', '),
        );
      }
    }

    const largest = clusters.reduce<(typeof clusters)[number] | undefined>(
      (best, cluster) =>
        best === undefined || cluster.radius > best.radius ? cluster : best,
      undefined,
    );

    if (largest !== undefined) {
      widest.push({ layer, id: largest.id, radius: largest.radius });
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return widest;
}

/**
 * Ширина ленты нажатия по реке в единицах карты: те же 24 px, что и у всех
 * целей, на опорной ширине.
 */
export const RIVER_RIBBON_UNITS = pixelsToUnits(MIN_TARGET_PX, REFERENCE_MAP_WIDTH);

/**
 * Какая доля точек реки обязана быть свободна — то есть иметь ближайшую чужую
 * реку дальше половины ленты.
 *
 * Требовать непересечения лент нельзя: Янцзы и Ланьцанцзян сближаются до 4,0
 * единицы карты, и это не дефект данных, а «три параллельные реки» Юньнани —
 * Цзиньша, Ланьцан и Ну идут рядом полтысячи километров (иероглифы названия не
 * пишем: подмножества шрифтов собираются по всему `src`, и знак из
 * комментария уехал бы в бандл ради текста, которого никто не увидит).
 * На исходной геометрии доли составили 94,6 % у Янцзы и 85,5 % у
 * Ланьцанцзяна, на упрощённой — 97 % и 96 % (упрощение выбрасывает частые
 * вершины извилистого горного участка, где реки и сходятся); у остальных
 * четырёх — 100 %. Порог 80 % оставляет запас настоящей географии и всё равно
 * ловит ошибку, ради которой он стоит: отрезок, отданный не той реке, кладёт
 * две линии друг на друга целиком.
 */
export const MIN_FREE_SHARE = 0.8;

export type PhysicalGeometry = {
  readonly rivers: ReadonlyMap<string, Point[][]>;
  readonly landforms: ReadonlyMap<string, Point[][]>;
  readonly lakes: ReadonlyMap<string, Point[][]>;
  /** Точка подписи формы: её ставит генератор, проверка её испытывает. */
  readonly shapeLabels: ReadonlyMap<string, Point>;
  /** Знак крайней точки: у неё нет контура, и место — это всё, что есть. */
  readonly pointMarks: ReadonlyMap<string, Point>;
  readonly marine: ReadonlyMap<string, Point[][]>;
  /** Точка подписи морской цели: её ставит генератор, проверка её испытывает. */
  readonly marineLabels: ReadonlyMap<string, Point>;
  /** Кольца суши: подпись обязана стоять внутри Китая. */
  readonly landRings: readonly Point[][];
  /**
   * Знак озера. Отдельно от колец, потому что цель нажатия строится вокруг
   * него, а не вокруг контура: контур озера меньше порога.
   */
  readonly lakeMarks: ReadonlyMap<string, Point>;
};

export type PhysicalShapes = {
  readonly contains: (mapAreaId: string, x: number, y: number) => boolean;
  readonly distanceToBoundary: (mapAreaId: string, x: number, y: number) => number;
  readonly mapAreaOf: (regionId: string) => string | undefined;
};

/**
 * Ширина цели воды в единицах карты: половина той же ленты в 24 px, которой
 * меряют цель города. То же число держит `river-hit.ts`; здесь оно взято из
 * общего источника, чтобы проверка и карта не разошлись.
 */
const WATER_HIT_RADIUS_UNITS = TARGET_DIAMETER_UNITS / 2;

/** Ближайшая к точке река или знак озера — то, что побеждает форму. */
function nearestWater(
  geometry: PhysicalGeometry,
  point: Point,
): { readonly id: string; readonly distance: number } | null {
  let nearest: { id: string; distance: number } | null = null;

  const consider = (id: string, distance: number) => {
    if (nearest === null || distance < nearest.distance) {
      nearest = { id, distance };
    }
  };

  for (const [id, parts] of geometry.rivers) {
    consider(id, distanceToPolylines(point[0], point[1], parts));
  }

  for (const [id, mark] of geometry.lakeMarks) {
    consider(id, Math.hypot(point[0] - mark[0], point[1] - mark[1]));
  }

  return nearest;
}

/**
 * Допуск рамки в единицах карты.
 *
 * Пути записаны относительными смещениями с двумя знаками, и разбор
 * накапливает округление: у обрезанного точно по краю листа контура —
 * например, у Южно-Китайского моря — последняя вершина выходит за рамку на
 * тысячные доли единицы. Проверка стоит не ради них, а ради геометрии,
 * промахнувшейся на сотни единиц, и сотая доля ей не мешает.
 */
const FRAME_TOLERANCE_UNITS = 0.05;

export type PhysicalReport = {
  /** Доля свободных точек по каждой реке: её видно в логе сборки. */
  readonly freeShare: ReadonlyMap<string, number>;
};

/**
 * Геометрия физических целей: она есть, лежит на карте, задевает заявленные
 * регионы и годится под нажатие.
 *
 * Проверка «заявленный регион задет» ловит три ошибки сразу — опечатку в
 * номере отрезка, неверную привязку и расхождение проекции, — тем же приёмом,
 * которым уже проверяются города.
 */
export function validatePhysicalGeometry(
  features: readonly PhysicalFeature[],
  geometry: PhysicalGeometry,
  shapes: PhysicalShapes,
): PhysicalReport {
  const errors: string[] = [];
  const freeShare = new Map<string, number>();
  /* Спрашиваемые формы с площадью: по ней ищется вложенность у подписи. */
  const askedLandforms = features.flatMap((feature) => {
    const rings =
      feature.kind === 'landform' ? geometry.landforms.get(feature.id) : undefined;

    return rings === undefined
      ? []
      : [{ id: feature.id, rings, area: polygonArea(rings) }];
  });
  const frame = {
    minX: MAP_VIEWBOX_MIN_X,
    minY: MAP_VIEWBOX_MIN_Y,
    maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
    maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
  };

  const pointsOf = (feature: PhysicalFeature): Point[][] | undefined => {
    if (feature.kind === 'river') {
      return geometry.rivers.get(feature.id);
    }

    if (feature.kind === 'lake') {
      return geometry.lakes.get(feature.id);
    }

    /*
     * У крайней точки геометрия — сам знак: одна точка вместо кольца. Так
     * общие проверки (рамка карты, касание заявленного региона) работают ей
     * без единой правки.
     */
    if (feature.kind === 'point') {
      const mark = geometry.pointMarks.get(feature.id);

      return mark === undefined ? undefined : [[mark]];
    }

    if (feature.kind === 'marine') {
      return geometry.marine.get(feature.id);
    }

    return geometry.landforms.get(feature.id);
  };

  for (const feature of features) {
    const rings = pointsOf(feature);
    if (rings === undefined || rings.length === 0) {
      errors.push(
        `Нет геометрии у цели ${feature.id}. Запустите npm run generate:physical`,
      );
      continue;
    }

    const points = rings.flat();

    for (const [x, y] of points) {
      if (
        x < frame.minX - FRAME_TOLERANCE_UNITS ||
        x > frame.maxX + FRAME_TOLERANCE_UNITS ||
        y < frame.minY - FRAME_TOLERANCE_UNITS ||
        y > frame.maxY + FRAME_TOLERANCE_UNITS
      ) {
        errors.push(
          `Точка за рамкой карты у цели ${feature.id}: ${x.toFixed(1)}, ${y.toFixed(1)}`,
        );
        break;
      }
    }

    for (const regionId of feature.regionIds) {
      const mapAreaId = shapes.mapAreaOf(regionId);
      if (mapAreaId === undefined) {
        errors.push(`Нет области карты у региона ${regionId}`);
        continue;
      }

      /*
       * Проверять надо в обе стороны. Вершины объекта внутри региона — это
       * случай «река течёт по региону» и «мелкая форма лежит в нём». Но у
       * формы, которая регион накрывает, все вершины снаружи: контур
       * Тибетского нагорья обходит его по краю — через Синьцзян, Сычуань и
       * заграницу, — и ни одна вершина не попадает ни в Тибет, ни в Цинхай.
       * Для этого случая берётся точка подписи региона: она заведомо внутри
       * его контура, потому что это середина наибольшей вписанной окружности.
       */
      const label = REGION_PALETTE[mapAreaId]?.label;
      const covers =
        feature.kind === 'landform' &&
        label !== undefined &&
        containsPoint(rings, label[0], label[1]);

      const touches =
        covers ||
        points.some(
          ([x, y]) =>
            shapes.contains(mapAreaId, x, y) ||
            shapes.distanceToBoundary(mapAreaId, x, y) <= CITY_BOUNDARY_TOLERANCE,
        );

      if (!touches) {
        errors.push(
          `Цель ${feature.id} заявляет регион ${regionId}, но не касается его`,
        );
      }
    }

    /*
     * Знак озера обязан лежать в воде: цель нажатия строится вокруг него, и
     * знак на суше означал бы, что ученик попадает мимо озера. Порог 24 px к
     * самому контуру при этом не применяется — ему не отвечает ни одно озеро
     * Китая, и требовать этого значило бы выкинуть их все разом.
     */
    /*
     * Знак крайней точки обязан стоять на суше Китая — цель строится вокруг
     * него, и знак посреди чужой страны означал бы, что ученик целится мимо.
     * Допуск тот же, что у городов на кромке: Джомолунгма стоит ровно на
     * границе с Непалом, и генерализованный контур карты кладёт её вершину на
     * 0,3 единицы наружу. Двигать знак ради контура значило бы учить неверному.
     *
     * Порог 24 px к самой точке не применяется: размера у неё нет вовсе, цель
     * задаёт знак (`point-marks.ts`).
     */
    if (feature.kind === 'point') {
      const mark = geometry.pointMarks.get(feature.id);
      if (mark === undefined) {
        errors.push(`Нет знака у крайней точки ${feature.id}`);
      } else {
        const land = geometry.landRings as Point[][];
        const inside =
          containsPoint(land, mark[0], mark[1]) ||
          distanceToBoundary(land, mark[0], mark[1]) <= CITY_BOUNDARY_TOLERANCE;

        if (!inside) {
          errors.push(
            `Знак крайней точки ${feature.id} вне суши Китая: ` +
              `${mark[0].toFixed(1)}, ${mark[1].toFixed(1)}`,
          );
        }
      }
    }

    /*
     * Подпись морской цели — зеркало правила формы: она обязана стоять внутри
     * контура, **не на суше** (иначе нажатие в неё достанется форме или
     * области) и не в цели воды — реки и знаки озёр побеждают море так же, как
     * побеждают форму.
     */
    if (feature.kind === 'marine') {
      const label = geometry.marineLabels.get(feature.id);
      if (label === undefined) {
        errors.push(`Нет подписи у морской цели ${feature.id}`);
      } else if (!containsPoint(rings, label[0], label[1])) {
        errors.push(`Подпись морской цели ${feature.id} вне её контура`);
      } else if (
        containsPoint(geometry.landRings as Point[][], label[0], label[1])
      ) {
        errors.push(`Подпись морской цели ${feature.id} стоит на суше`);
      } else {
        const freePx = unitsToPixels(
          distanceToBoundary(rings, label[0], label[1]) * 2,
          REFERENCE_MAP_WIDTH,
        );
        if (freePx < MIN_TARGET_PX) {
          errors.push(
            `У подписи морской цели ${feature.id} свободно ${freePx.toFixed(1)} px, ` +
              `нужно ${MIN_TARGET_PX}`,
          );
        }

        const water = nearestWater(geometry, label);
        if (water !== null && water.distance <= WATER_HIT_RADIUS_UNITS) {
          errors.push(
            `Подпись морской цели ${feature.id} в цели воды (${water.id}): ` +
              `${water.distance.toFixed(1)} единицы при пороге ` +
              `${WATER_HIT_RADIUS_UNITS.toFixed(1)}`,
          );
        }
      }
    }

    if (feature.kind === 'lake') {
      const mark = geometry.lakeMarks.get(feature.id);
      if (mark === undefined) {
        errors.push(`Нет знака у озера ${feature.id}`);
      } else if (!containsPoint(rings, mark[0], mark[1])) {
        errors.push(
          `Знак озера ${feature.id} вне его контура: ` +
            `${mark[0].toFixed(1)}, ${mark[1].toFixed(1)}`,
        );
      }
    }

    if (feature.kind === 'landform') {
      const circle = largestInscribedCircle(rings);
      const availablePx = unitsToPixels(circle.radius * 2, REFERENCE_MAP_WIDTH);
      if (availablePx < MIN_TARGET_PX) {
        errors.push(
          `Форма ${feature.id} меньше ${MIN_TARGET_PX} px: ${availablePx.toFixed(1)} px ` +
            `при ширине карты ${REFERENCE_MAP_WIDTH} px`,
        );
      }

      /*
       * Подпись формы обязана стоять там, куда можно нажать: внутри формы, на
       * суше Китая и не внутри вложенной цели. Прежде подпись Тянь-Шаня стояла
       * в Киргизии, а Гималаев — в Непале: нажатие там не давало ничего, потому
       * что за границей проверка суши отсекает всё. Порог тот же, что у самой
       * цели: подпись — это и есть место, куда целятся.
       */
      const label = geometry.shapeLabels.get(feature.id);
      if (label === undefined) {
        errors.push(`Нет подписи у формы ${feature.id}`);
      } else if (!containsPoint(rings, label[0], label[1])) {
        errors.push(`Подпись формы ${feature.id} вне её контура`);
      } else if (
        !containsPoint(geometry.landRings as Point[][], label[0], label[1])
      ) {
        errors.push(`Подпись формы ${feature.id} вне суши Китая`);
      } else {
        /*
         * Свободное место меряется и до вложенных целей: середина Таримской
         * впадины принадлежит Такла-Макану, и мерить одну лишь впадину значило
         * бы засчитать место, куда нажать нельзя.
         */
        const area = polygonArea(rings);
        const nested = askedLandforms.filter(
          (other) =>
            other.id !== feature.id &&
            other.area < area &&
            other.rings.flat().every(([x, y]) => containsPoint(rings, x, y)),
        );
        const radius = Math.min(
          distanceToBoundary(rings, label[0], label[1]),
          ...nested.map((other) =>
            distanceToBoundary(other.rings, label[0], label[1]),
          ),
        );
        const freePx = unitsToPixels(radius * 2, REFERENCE_MAP_WIDTH);
        if (freePx < MIN_TARGET_PX) {
          errors.push(
            `У подписи формы ${feature.id} свободно ${freePx.toFixed(1)} px, ` +
              `нужно ${MIN_TARGET_PX}`,
          );
        }

        /*
         * Вода проверяется здесь же: река и знак озера побеждают форму, и
         * подпись, попавшая в их цель, досталась бы не своей. Порог — тот же,
         * которым целится карта, а не запас генератора: проверка испытывает
         * правило, а не привычки того, кто его исполняет.
         */
        const water = nearestWater(geometry, label);
        if (water !== null && water.distance <= WATER_HIT_RADIUS_UNITS) {
          errors.push(
            `Подпись формы ${feature.id} в цели воды (${water.id}): ` +
              `${water.distance.toFixed(1)} единицы при пороге ` +
              `${WATER_HIT_RADIUS_UNITS.toFixed(1)}`,
          );
        }
      }
    }
  }

  /*
   * Свободная доля считается по всем рекам сразу: «свободна» — значит, что
   * ближайшая точка любой другой реки дальше половины ленты.
   */
  const riverPoints = new Map(
    features
      .filter((feature) => feature.kind === 'river')
      .map((feature) => [feature.id, (geometry.rivers.get(feature.id) ?? []).flat()]),
  );

  for (const [featureId, points] of riverPoints) {
    if (points.length === 0) {
      continue;
    }

    const others = [...riverPoints]
      .filter(([otherId]) => otherId !== featureId)
      .flatMap(([, otherPoints]) => otherPoints);

    /*
     * Расстояние до ближайшей вершины чужой реки, а не до её звена: звенья
     * разных рек соединять нельзя, а склеить их в одну ломаную значило бы
     * получить ложные звенья через всю страну. При звене реки в доли единицы и
     * пороге в 8,6 разница между вершиной и звеном ничтожна.
     */
    const nearestOtherPoint = (x: number, y: number): number => {
      let nearest = Number.POSITIVE_INFINITY;
      for (const [otherX, otherY] of others) {
        const distance = Math.hypot(x - otherX, y - otherY);
        if (distance < nearest) {
          nearest = distance;
        }
      }

      return nearest;
    };

    const free = points.filter(
      ([x, y]) => nearestOtherPoint(x, y) > RIVER_RIBBON_UNITS / 2,
    ).length;
    const share = free / points.length;
    freeShare.set(featureId, share);

    if (share < MIN_FREE_SHARE) {
      errors.push(
        `У реки ${featureId} свободно ${(100 * share).toFixed(1)} % длины при ` +
          `пороге ${(100 * MIN_FREE_SHARE).toFixed(0)} %: её негде показать однозначно`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { freeShare };
}
