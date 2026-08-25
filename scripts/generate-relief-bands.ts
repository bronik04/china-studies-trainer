/**
 * Строит `src/map/relief-bands.ts` из выжимки высот.
 *
 * Полоса — это область «выше порога» целиком, а не кольцо между двумя
 * порогами: слои рисуются друг поверх друга снизу вверх, и вложенные кольца
 * при правиле заполнения `evenodd` дают дырки сами. Таримская котловина
 * внутри контура 1000 м получается без отдельной геометрии.
 *
 * Запуск: npm run generate:relief
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  clipRingToFrame,
  ringArea,
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
import { contourRings, sinkBorder, smoothGrid } from './relief-contours';
import { reliefInputsFingerprint } from './relief-fingerprint';

/** Границы полос гипсометрической шкалы (DECISIONS.md, 2026-08-25). */
const THRESHOLDS = [200, 500, 1000, 2000, 3000, 4000] as const;

/** Проходов сглаживания: два убирают рябь и не съедают форму долин. */
const SMOOTH_PASSES = 2;

/** Ниже любого порога: рамка сетки, чтобы кольца замыкались внутри неё. */
const FLOOR = -9999;

/** Наименьшая площадь кольца в квадратных градусах: мельче — рябь, а не форма. */
const MIN_RING_AREA_DEG2 = 0.25;

/** Допуск упрощения: доля единицы viewBox, то есть доля пикселя на карте. */
const SIMPLIFY_TOLERANCE_UNITS = 0.35;

const FRAME: Frame = {
  minX: MAP_VIEWBOX_MIN_X,
  minY: MAP_VIEWBOX_MIN_Y,
  maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
  maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
};

const sourceJson = readFileSync(
  new URL('data/relief-source.json', import.meta.url),
  'utf8',
);
const source = JSON.parse(sourceJson) as {
  lat0: number;
  lon0: number;
  step: number;
  rows: number;
  cols: number;
  altitude: number[];
};

const OUT = new URL('../src/map/relief-bands.ts', import.meta.url);

const values = smoothGrid(source.altitude, source.rows, source.cols, SMOOTH_PASSES);
sinkBorder(values, source.rows, source.cols, FLOOR);

const grid = {
  values,
  rows: source.rows,
  cols: source.cols,
  lat0: source.lat0,
  lon0: source.lon0,
  step: source.step,
};

const project = (ring: readonly Point[]): Point[] =>
  ring.map(([lon, lat]) => projectLonLat(lon, lat) as Point);

const bands = THRESHOLDS.map((threshold) => {
  const rings = contourRings(grid, threshold)
    .filter((ring) => ringArea(ring) >= MIN_RING_AREA_DEG2)
    /*
     * Сначала упрощение, потом обрезка — тот же довод, что у рек в
     * `generate-physical-geometry.ts`: упрощённое кольцо отходит от исходного
     * до допуска и, обрежь мы раньше, вышло бы за рамку на эту самую единицу.
     */
    .map((ring) =>
      clipRingToFrame(simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS), FRAME),
    )
    .filter((ring) => ring.length > 3);

  if (rings.length === 0) {
    throw new Error(
      `Полоса ${threshold} м пуста. Проверьте выжимку: npm run extract:relief`,
    );
  }

  console.info(
    `${threshold} м: колец ${rings.length}, точек ` +
      `${rings.reduce((total, ring) => total + ring.length, 0)}`,
  );

  return { threshold, d: toPathData(rings, { closed: true }) };
});

const fingerprint = reliefInputsFingerprint([...THRESHOLDS], sourceJson);

const module = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: scripts/data/relief-source.json (ETOPO1, NOAA, public domain)
 * Генератор: scripts/generate-relief-bands.ts
 */

export type ReliefBand = {
  /** Нижняя граница полосы в метрах: путь очерчивает всё, что выше неё. */
  readonly threshold: number;
  /**
   * Путь области «выше порога» со всеми кольцами. Рисовать его надо с
   * правилом заполнения \`evenodd\`: вложенное кольцо — это котловина внутри
   * нагорья, и дырку она должна давать сама.
   */
  readonly d: string;
};

/** Полосы снизу вверх: порядок и есть порядок отрисовки. */
export const RELIEF_BANDS: readonly ReliefBand[] = [
${bands.map((band) => `  { threshold: ${band.threshold}, d: '${band.d}' },`).join('\n')}
];

/**
 * Отпечаток входов, из которых собраны эти полосы: пороги и выжимка.
 * \`validate:map\` сверяет его заново и роняет сборку, если входы поменялись, а
 * генератор не запускали.
 */
export const RELIEF_INPUTS_FINGERPRINT = '${fingerprint}';
`;

writeFileSync(OUT, module);
console.info(`Записано: ${(module.length / 1024).toFixed(0)} КБ, полос ${bands.length}`);
