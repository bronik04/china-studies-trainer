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

const MAP_FILE = 'public/maps/china-provinces.svg';
const OUTPUT_FILE = 'src/map/region-palette.ts';

const svg = readFileSync(MAP_FILE, 'utf8');

type Shape = {
  readonly id: string;
  readonly rings: Point[][];
};

const shapes: Shape[] = [];

for (const [, attributes] of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
  const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
  const d = /\sd="([\s\S]*?)"/.exec(attributes)?.[1];

  if (id === undefined || d === undefined) {
    throw new Error(`Контур без id или данных: ${attributes.slice(0, 80)}`);
  }

  shapes.push({ id, rings: parseMapPath(d) });
}

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

const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */

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
console.info(`Регионов: ${entries.length}.`);
