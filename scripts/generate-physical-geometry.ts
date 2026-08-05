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
import type { ReliefStep } from '../src/content/types';
import {
  clipRingToFrame,
  clipToFrame,
  simplifyPath,
  simplifyRing,
  toPathData,
  type Frame,
} from '../src/map/polyline';
import { projectLonLat } from '../src/map/projection';
import type { Point } from '../src/map/svg-path';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from '../src/map/target-size';
import { RELIEF_STEPS, SHAPE_FEATURE_IDS } from './data/relief-steps';
import { chainPieces } from './physical-assembly';

/*
 * Выжимка читается файлом, а не импортом JSON: импорт модулей JSON требует
 * согласия сборщика, загрузчика и линтера, и все три пришлось бы уговаривать
 * ради одного места.
 */
const source = JSON.parse(
  readFileSync(new URL('data/physical-source.json', import.meta.url), 'utf8'),
) as {
  rivers: { rivernum: number; parts: [number, number][][] }[];
  landforms: { key: string; nameRu: string; nameZh: string; rings: [number, number][][] }[];
};

const OUT = new URL('../src/map/physical-geometry.ts', import.meta.url);

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

function ringArea(ring: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
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
    const pieces = feature.riverNums.flatMap((num) => partsByNum.get(num) ?? []);
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

    return { featureId: feature.id, d: toPathData(parts) };
  });

// --- Формы рельефа ----------------------------------------------------------

const withoutStep = source.landforms.filter(
  (landform) => (RELIEF_STEPS[landform.key] as ReliefStep | undefined) === undefined,
);
if (withoutStep.length > 0) {
  throw new Error(
    `Нет ступени у форм: ${withoutStep.map((landform) => landform.key).join(', ')}. ` +
      'Разметка живёт в scripts/data/relief-steps.ts',
  );
}

const shapes = source.landforms
  .map((landform) => {
    const rings = landform.rings
      .map((ring) =>
        clipRingToFrame(
          simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS),
          FRAME,
        ),
      )
      .filter((ring) => ring.length > 3);

    return {
      key: landform.key,
      step: RELIEF_STEPS[landform.key],
      featureId: SHAPE_FEATURE_IDS[landform.key],
      rings,
      area: rings.reduce((sum, ring) => sum + ringArea(ring), 0),
    };
  })
  .filter((shape) => shape.rings.length > 0)
  /*
   * Крупные формы рисуются первыми: иначе Тибетское нагорье накрыло бы
   * Цайдамскую котловину, которая лежит внутри него.
   */
  .sort((left, right) => right.area - left.area);

// --- Запись -----------------------------------------------------------------

const quote = (value: string) => `'${value.replace(/'/g, "\\'")}'`;

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
};

export type RiverLine = {
  readonly featureId: string;
  readonly d: string;
};

/** Формы рельефа от крупных к мелким: порядок и есть порядок отрисовки. */
export const RELIEF_SHAPES: readonly ReliefShape[] = [
${shapes
  .map(
    (shape) =>
      `  { key: ${quote(shape.key)}, step: ${shape.step}, ${
        shape.featureId ? `featureId: ${quote(shape.featureId)}, ` : ''
      }d: ${quote(toPathData(shape.rings, { closed: true }))} },`,
  )
  .join('\n')}
];

export const RIVER_LINES: readonly RiverLine[] = [
${riverLines
  .map((line) => `  { featureId: ${quote(line.featureId)}, d: ${quote(line.d)} },`)
  .join('\n')}
];
`;

writeFileSync(OUT, module);
console.info(
  `Записано: форм ${shapes.length}, рек ${riverLines.length}, ` +
    `размер ${(module.length / 1024).toFixed(0)} КБ`,
);
