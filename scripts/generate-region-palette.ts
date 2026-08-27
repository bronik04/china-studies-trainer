/**
 * Считает по геометрии карты то, что нельзя вести руками:
 *
 *   - точку подписи — центр наибольшей вписанной окружности;
 *   - её диаметр — честную меру нажимаемости области.
 *
 * Результат пишется в `src/map/region-palette.ts`. Файл сгенерирован: править
 * его руками бессмысленно, следующий прогон перезапишет.
 *
 * Запуск: npx tsx scripts/generate-region-palette.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  largestInscribedCircle,
  parseMapPath,
  type Point,
} from '../src/map/svg-path';
import {
  paletteInputsFingerprint,
  regionContours,
} from './palette-fingerprint';

const MAP_FILE = 'public/maps/china-provinces.svg';
const OUTPUT_FILE = 'src/map/region-palette.ts';

const svg = readFileSync(MAP_FILE, 'utf8');

type Shape = {
  readonly id: string;
  readonly rings: Point[][];
};

/* Разбор общий с отпечатком: два одинаковых однажды разошлись бы. */
const shapes: Shape[] = regionContours(svg).map((contour) => ({
  id: contour.id,
  rings: parseMapPath(contour.d),
}));

const entries = shapes
  .map((shape) => {
    const circle = largestInscribedCircle(shape.rings);

    return {
      id: shape.id,
      x: Number(circle.x.toFixed(1)),
      y: Number(circle.y.toFixed(1)),
      diameter: Number((circle.radius * 2).toFixed(1)),
    };
  })
  .sort((left, right) => left.id.localeCompare(right.id));

const body = entries
  .map(
    (entry) =>
      `  '${entry.id}': { label: [${entry.x}, ${entry.y}], inscribedDiameter: ${entry.diameter} },`,
  )
  .join('\n');

const fingerprint = paletteInputsFingerprint(svg);

const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */

/**
 * Отпечаток контуров, из которых палитра собрана. Сверяется в
 * \`validate:map\`: правка контура без \`npm run generate:palette\` оставила бы
 * подписи и цели нажатия на старых местах при зелёной сборке.
 */
export const PALETTE_INPUTS_FINGERPRINT = '${fingerprint}';

export type RegionPaletteEntry = {
  /** Точка подписи — центр наибольшей вписанной окружности, единицы viewBox. */
  readonly label: readonly [number, number];
  /** Диаметр этой окружности: сколько места реально есть под нажатие. */
  readonly inscribedDiameter: number;
};

export const REGION_PALETTE: Readonly<Record<string, RegionPaletteEntry>> = {
${body}
};
`;

writeFileSync(OUTPUT_FILE, file);
console.info(`Регионов: ${entries.length}. Отпечаток входов: ${fingerprint}.`);
