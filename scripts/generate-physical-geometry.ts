/**
 * Строит `src/map/physical-geometry.ts` из выжимки Natural Earth.
 *
 * Что делает по порядку: собирает реку из отрезков по номерам, переводит
 * градусы в координаты карты той же проекцией, что и города, обрезает по рамке
 * карты, упрощает и записывает путями в том же виде, в каком записана сама
 * карта.
 *
 * Обрезка по рамке — не то же, что обрезка по границе Китая: за границу
 * рисунок не выпускает `clipPath` при отрисовке. Здесь отсекается только то,
 * чего на этой карте нет вовсе, — Амур за 135° восточной долготы, Меконг южнее
 * Юньнани: их координаты карте не принадлежат и в файле были бы мусором.
 *
 * Запуск: npm run generate:physical
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { physicalFeatures } from '../src/content/physical-features';
import { TARGET_DIAMETER_UNITS } from '../src/map/city-hit-targets';
import {
  clipRingToFrame,
  clipToFrame,
  distanceToPolylines,
  ringArea,
  simplifyPath,
  simplifyRing,
  toPathData,
  type Frame,
} from '../src/map/polyline';
import { parseLandRings } from '../src/map/land-rings';
import { projectLonLat } from '../src/map/projection';
import {
  containsPoint,
  largestFreeCircle,
  largestInscribedCircle,
  type InscribedCircle,
  type Point,
} from '../src/map/svg-path';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from '../src/map/target-size';
import { RELIEF_STEPS, SHAPE_FEATURE_IDS } from './data/relief-steps';
import { chainPieces } from './physical-assembly';
import { physicalInputsFingerprint } from './physical-fingerprint';

/*
 * Выжимка читается файлом, а не импортом JSON: импорт модулей JSON требует
 * согласия сборщика, загрузчика и линтера, и все три пришлось бы уговаривать
 * ради одного места.
 */
const sourceJson = readFileSync(
  new URL('data/physical-source.json', import.meta.url),
  'utf8',
);
const source = JSON.parse(sourceJson) as {
  rivers: { rivernum: number; parts: [number, number][][] }[];
  landforms: { key: string; nameRu: string; nameZh: string; rings: [number, number][][] }[];
  lakes: { neId: number; rings: [number, number][][] }[];
  points: { neId: number; at: [number, number] }[];
  marine: { neId: number; rings: [number, number][][] }[];
};

const OUT = new URL('../src/map/physical-geometry.ts', import.meta.url);

/*
 * Суша нужна подписям: они обязаны стоять внутри Китая. Разметка читается
 * файлом — `?raw`-импорт `land.ts` умеет только сборка.
 */
const landRings = parseLandRings(
  readFileSync(
    new URL('../public/maps/china-provinces.svg', import.meta.url),
    'utf8',
  ),
);

/** Допуск склейки в градусах: примерно километр, вдесятеро меньше звена. */
const JOIN_TOLERANCE_DEG = 0.01;

/** Допуск упрощения: одна единица viewBox — примерно один пиксель на опорной ширине. */
const SIMPLIFY_TOLERANCE_UNITS = 1;

/**
 * Сколько точек позволено не пристать к цепи. У Янцзы это две точки у Поянху,
 * у Чжуцзяна — рукава дельты, которая действительно ветвится. Всё, что больше,
 * значит ошибку в списке номеров, и генератор обязан остановиться.
 */
const MAX_LEFTOVER_SHARE = 0.15;

const FRAME: Frame = {
  minX: MAP_VIEWBOX_MIN_X,
  minY: MAP_VIEWBOX_MIN_Y,
  maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
  maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
};

const project = (ring: readonly Point[]): Point[] =>
  ring.map(([lon, lat]) => projectLonLat(lon, lat) as Point);

const landformIds = new Set(
  physicalFeatures
    .filter((feature) => feature.kind === 'landform')
    .map((feature) => feature.id),
);
const danglingTargets = Object.entries(SHAPE_FEATURE_IDS).filter(
  ([, featureId]) => !landformIds.has(featureId),
);
if (danglingTargets.length > 0) {
  throw new Error(
    'В SHAPE_FEATURE_IDS указаны цели, которых нет среди форм справочника: ' +
      danglingTargets.map(([key, id]) => `${key} → ${id}`).join(', '),
  );
}

// --- Реки -------------------------------------------------------------------

const partsByNum = new Map<number, [number, number][][]>();
for (const river of source.rivers) {
  partsByNum.set(river.rivernum, [
    ...(partsByNum.get(river.rivernum) ?? []),
    ...river.parts,
  ]);
}

const riverLines = physicalFeatures
  .filter((feature) => feature.kind === 'river')
  .map((feature) => {
    const pieces = feature.riverNums.flatMap((num) => {
      const parts = partsByNum.get(num);
      /*
       * Пустой список вместо ошибки давал бы реку короче заявленной при
       * зелёной сборке: доля потерь считается по тем же кускам, что нашлись,
       * и порог MAX_LEFTOVER_SHARE молчал бы.
       */
      if (parts === undefined) {
        throw new Error(
          `Отрезка ${num} нет в выжимке (река ${feature.id}). ` +
            'Запустите npm run extract:physical',
        );
      }

      return parts;
    });
    const { chain, leftovers } = chainPieces(pieces, JOIN_TOLERANCE_DEG);

    const total = pieces.reduce((n, piece) => n + piece.length, 0);
    const lost = leftovers.reduce((n, piece) => n + piece.length, 0);
    if (lost > total * MAX_LEFTOVER_SHARE) {
      throw new Error(
        `Река ${feature.id} не собирается: не пристало ${lost} точек из ${total}. ` +
          'Проверьте список riverNums в справочнике',
      );
    }

    /*
     * Сначала упрощение, потом обрезка: упрощённая линия отходит от исходной до
     * допуска, и, обрежь мы раньше, она вышла бы за рамку на эту самую единицу.
     */
    const parts = clipToFrame(
      simplifyPath(project(chain), SIMPLIFY_TOLERANCE_UNITS),
      FRAME,
    );

    if (parts.length === 0) {
      throw new Error(`Река ${feature.id} целиком за рамкой карты`);
    }

    console.info(
      `${feature.nameRu}: точек ${total} → цепь ${chain.length} → в рамке ` +
        `${parts.reduce((n, part) => n + part.length, 0)} (кусков ${parts.length})` +
        (lost > 0 ? `, отброшено ${lost}` : ''),
    );

    return { featureId: feature.id, parts, d: toPathData(parts) };
  });

// --- Озёра ------------------------------------------------------------------

/*
 * Озёра. Контур нужен, чтобы вода была водой, но целью он быть не может: 24 px
 * на опорной ширине — это около 120 км, а Цинхай, самое большое озеро страны,
 * даёт вписанную окружность около 13 px. Поэтому вместе с контуром считается
 * точка знака, вокруг которой слой и строит цель нажатия.
 */
const lakesById = new Map<number, [number, number][][]>(
  source.lakes.map((lake) => [lake.neId, lake.rings]),
);

const lakes = physicalFeatures
  .filter((feature) => feature.kind === 'lake')
  .map((feature) => {
    const rings = (feature.kind === 'lake' ? feature.lakeIds : [])
      .flatMap((neId) => lakesById.get(neId) ?? [])
      .map((ring) =>
        clipRingToFrame(simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS), FRAME),
      )
      .filter((ring) => ring.length > 3);

    if (rings.length === 0) {
      throw new Error(
        `Нет колец у озера ${feature.id}. Запустите npm run extract:physical`,
      );
    }

    return { featureId: feature.id, rings, mark: largestInscribedCircle(rings) };
  });

// --- Крайние точки ----------------------------------------------------------

/*
 * У вершины и впадины нет контура вовсе: набор отдаёт одну координату, и на
 * карте они живут знаком — как озеро, у которого контур меньше порога.
 */
const pointsById = new Map<number, [number, number]>(
  source.points.map((item) => [item.neId, item.at]),
);

const points = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'point') {
    return [];
  }

  const at = pointsById.get(feature.neId);
  if (at === undefined) {
    throw new Error(
      `Нет координат у точки ${feature.id}. Запустите npm run extract:physical`,
    );
  }

  const [x, y] = projectLonLat(at[0], at[1]);

  return [{ featureId: feature.id, x, y }];
});

// --- Моря -------------------------------------------------------------------

/*
 * Морские тела. Контуры обрезаются по рамке карты: у Южно-Китайского моря
 * середина целого контура лежит за краем листа, и подпись, посчитанная по
 * необрезанному кольцу, ушла бы в пустоту.
 */
const marineById = new Map<number, [number, number][][]>(
  source.marine.map((item) => [item.neId, item.rings]),
);

const marineShapes = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'marine') {
    return [];
  }

  const rings = (marineById.get(feature.neId) ?? [])
    .map((ring) =>
      clipRingToFrame(simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS), FRAME),
    )
    .filter((ring) => ring.length > 3);

  if (rings.length === 0) {
    throw new Error(
      `Нет колец у морской цели ${feature.id}. Запустите npm run extract:physical`,
    );
  }

  return [{ featureId: feature.id, rings }];
});

// --- Формы рельефа ----------------------------------------------------------

const withoutStep = source.landforms.filter(
  (landform) => !Object.hasOwn(RELIEF_STEPS, landform.key),
);
if (withoutStep.length > 0) {
  throw new Error(
    `Нет ступени у форм: ${withoutStep.map((landform) => landform.key).join(', ')}. ` +
      'Разметка живёт в scripts/data/relief-steps.ts',
  );
}

const clipped = source.landforms
  .map((landform) => ({
    key: landform.key,
    step: RELIEF_STEPS[landform.key],
    featureId: SHAPE_FEATURE_IDS[landform.key],
    rings: landform.rings
      .map((ring) =>
        clipRingToFrame(
          simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS),
          FRAME,
        ),
      )
      .filter((ring) => ring.length > 3),
  }))
  .filter((shape) => shape.rings.length > 0)
  .map((shape) => ({
    ...shape,
    area: shape.rings.reduce((sum, ring) => sum + ringArea(ring), 0),
  }));

const askedShapes = clipped.filter((shape) => shape.featureId !== undefined);

/**
 * Вложенные цели формы: спрашиваемые формы меньшей площади, лежащие внутри неё
 * целиком. Такла-Макан лежит в Таримской впадине, и середина впадины
 * принадлежит ему — по правилу «побеждает меньший» (`physical-hit.ts`).
 * Подпись впадины обязана уйти оттуда, иначе имя стоит над чужой целью.
 */
function nestedOf(shape: (typeof clipped)[number]): Point[][][] {
  return askedShapes
    .filter(
      (other) =>
        other !== shape &&
        other.area < shape.area &&
        other.rings.flat().every(([x, y]) => containsPoint(shape.rings, x, y)),
    )
    .map((other) => other.rings);
}

/**
 * Свободна ли точка от воды: река и знак озера побеждают форму по правилу
 * «побеждает меньший» (`physical-hit.ts`), и подпись, попавшая на них,
 * досталась бы не своей цели. У Юньнань-Гуйчжоуского плато середина легла
 * ровно на Янцзы — проверено тестом «каждая форма достаётся себе».
 *
 * Порог взят с запасом в допуск упрощения, а не впритык к ленте реки. Поиск
 * максимизирует радиус при жёстком ограничении и потому ставит середину
 * вплотную к границе: у того же плато запас вышел 0,06 единицы при пороге
 * 8,64. Линия реки при этом сама отходит от исходной до целой единицы
 * (`SIMPLIFY_TOLERANCE_UNITS`), и следующий пересчёт геометрии загнал бы
 * подпись внутрь ленты. Знак озера меряется тем же порогом: цель озера может
 * отойти от знака разводкой (`spreadHitTargets`), и запас покрывает и это.
 */
const WATER_RADIUS_UNITS = TARGET_DIAMETER_UNITS / 2 + SIMPLIFY_TOLERANCE_UNITS;

function isFreeOfWater(x: number, y: number): boolean {
  return (
    riverLines.every(
      (river) => distanceToPolylines(x, y, river.parts) > WATER_RADIUS_UNITS,
    ) &&
    lakes.every(
      (lake) => Math.hypot(x - lake.mark.x, y - lake.mark.y) > WATER_RADIUS_UNITS,
    )
  );
}

const shapes = clipped
  .map((shape) => ({
    ...shape,
    /*
     * Точка подписи считается здесь, а не на отрисовке: перебор по сетке в три
     * прохода, и для региона его тоже считают на сборке
     * (`generate-region-palette.ts`), а не в браузере.
     *
     * Не середина всей формы, а середина свободного круга: он лежит внутри
     * формы, на суше Китая и вне вложенных целей. Прежде подпись Тянь-Шаня
     * стояла в Киргизии, а Гималаев — в Непале: нажатие там не давало ничего,
     * потому что за границей проверка суши отсекает всё.
     */
    label:
      shape.featureId === undefined
        ? undefined
        : (largestFreeCircle(shape.rings, {
            nested: nestedOf(shape),
            isAllowed: (x, y) =>
              containsPoint(landRings, x, y) && isFreeOfWater(x, y),
          }) as InscribedCircle),
  }))
  /*
   * Крупные формы рисуются первыми: иначе Тибетское нагорье накрыло бы
   * Цайдамскую котловину, которая лежит внутри него.
   */
  .sort((left, right) => right.area - left.area);

/*
 * Подпись моря обязана стоять в воде: на суше её перехватила бы форма рельефа
 * или регион, а в ленте реки — река. Правило то же, что у формы, только суша
 * здесь запрещена, а не обязательна.
 */
const marine = marineShapes.map((shape) => ({
  ...shape,
  label: largestFreeCircle(shape.rings, {
    isAllowed: (x, y) => !containsPoint(landRings, x, y) && isFreeOfWater(x, y),
  }),
}));

// --- Запись -----------------------------------------------------------------

/*
 * Косая черта экранируется первой: иначе `\t` в имени формы стал бы в
 * сгенерированном файле табуляцией, а неудачное сочетание — синтаксической
 * ошибкой в модуле, который импортирует сборка.
 */
const quote = (value: string) =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const fingerprint = physicalInputsFingerprint(physicalFeatures, sourceJson);

const module = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: scripts/data/physical-source.json (Natural Earth, public domain)
 * Генератор: scripts/generate-physical-geometry.ts
 */
import type { ReliefStep } from '../content/types';

export type ReliefShape = {
  /** Имя формы в наборе Natural Earth: по нему идёт сверка с разметкой. */
  readonly key: string;
  readonly step: ReliefStep;
  readonly d: string;
  /** Задан — форма не только заливает фон, но и спрашивается. */
  readonly featureId?: string;
  /**
   * Куда ставить подпись: середина наибольшей вписанной окружности. Есть
   * ровно у тех форм, у которых есть \`featureId\`, — декоративные не
   * подписываются. Габаритная середина не годится: у формы-подковы она
   * оказалась бы вне контура.
   */
  readonly labelX?: number;
  readonly labelY?: number;
};

export type RiverLine = {
  readonly featureId: string;
  /**
   * Путь линии. Кусков в нём может быть несколько: обрезка по рамке карты
   * разрывает реку, если та вышла за край и вернулась. Читать его надо
   * \`parseMapPath\`, а мерить расстояние — \`distanceToPolylines\` по кускам:
   * склеенные в один список точек, они дадут звено через всю карту, и нажатие
   * в пустом месте засчитается этой реке.
   */
  readonly d: string;
};

/** Формы рельефа от крупных к мелким: порядок и есть порядок отрисовки. */
export const RELIEF_SHAPES: readonly ReliefShape[] = [
${shapes
  .map(
    (shape) =>
      `  { key: ${quote(shape.key)}, step: ${shape.step}, ${
        shape.featureId ? `featureId: ${quote(shape.featureId)}, ` : ''
      }${
        shape.label
          ? `labelX: ${shape.label.x.toFixed(2)}, labelY: ${shape.label.y.toFixed(2)}, `
          : ''
      }d: ${quote(toPathData(shape.rings, { closed: true }))} },`,
  )
  .join('\n')}
];

/**
 * Отпечаток входов, из которых собрана эта геометрия: справочник, разметка
 * ступеней и выжимка. \`validate:map\` сверяет его заново и роняет сборку, если
 * входы поменялись, а генератор не запускали.
 */
export type LakeShape = {
  readonly featureId: string;
  readonly d: string;
  /**
   * Куда ставить знак: середина наибольшей вписанной окружности. Знак нужен
   * потому, что сам контур меньше порога нажатия — 24 px на опорной ширине это
   * около 120 км, а Цинхай, самое большое озеро страны, даёт около 13 px.
   */
  readonly markX: number;
  readonly markY: number;
};

export const LAKE_SHAPES: readonly LakeShape[] = [
${lakes
  .map(
    (lake) =>
      `  { featureId: ${quote(lake.featureId)}, markX: ${lake.mark.x.toFixed(2)}, ` +
      `markY: ${lake.mark.y.toFixed(2)}, d: ${quote(toPathData(lake.rings, { closed: true }))} },`,
  )
  .join('\n')}
];

export type MarineShape = {
  readonly featureId: string;
  readonly d: string;
  /**
   * Куда ставить подпись: середина свободного круга в воде. Не середина
   * контура: у Южно-Китайского моря она лежит за краем листа, а на суше и в
   * ленте реки подпись досталась бы не своей цели.
   */
  readonly labelX: number;
  readonly labelY: number;
};

export const MARINE_SHAPES: readonly MarineShape[] = [
${marine
  .map(
    (sea) =>
      `  { featureId: ${quote(sea.featureId)}, labelX: ${sea.label.x.toFixed(2)}, ` +
      `labelY: ${sea.label.y.toFixed(2)}, d: ${quote(toPathData(sea.rings, { closed: true }))} },`,
  )
  .join('\n')}
];

export type PointMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
};

/**
 * Знаки крайних точек. Контура у них нет, поэтому здесь только место: цель
 * нажатия строит вокруг него \`point-marks.ts\`, как у озера.
 */
export const POINT_MARKS: readonly PointMark[] = [
${points
  .map(
    (mark) =>
      `  { featureId: ${quote(mark.featureId)}, x: ${mark.x.toFixed(2)}, y: ${mark.y.toFixed(2)} },`,
  )
  .join('\n')}
];

export const INPUTS_FINGERPRINT = '${fingerprint}';

export const RIVER_LINES: readonly RiverLine[] = [
${riverLines
  .map((line) => `  { featureId: ${quote(line.featureId)}, d: ${quote(line.d)} },`)
  .join('\n')}
];
`;

writeFileSync(OUT, module);
console.info(
  `Записано: форм ${shapes.length}, рек ${riverLines.length}, ` +
    `озёр ${lakes.length}, крайних точек ${points.length}, морей ${marine.length}, размер ${(module.length / 1024).toFixed(0)} КБ, ` +
    `отпечаток входов ${fingerprint}`,
);
