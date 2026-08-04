/**
 * Считает по геометрии карты то, что нельзя вести руками:
 *
 *   - тон заливки каждого региона (четыре краски, у соседей не совпадают);
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
  assignLandTones,
  buildAdjacency,
  findToneConflicts,
  type RegionShape,
} from '../src/map/region-adjacency';
import { largestInscribedCircle, parseMapPath } from '../src/map/svg-path';

const MAP_FILE = 'public/maps/china-provinces.svg';
const OUTPUT_FILE = 'src/map/region-palette.ts';

const svg = readFileSync(MAP_FILE, 'utf8');

/**
 * Декоративные контуры (те, что вынесены маркерами) в раскраске участвуют:
 * они по-прежнему рисуются на карте и должны отличаться от соседей. А вот
 * подпись и нажимаемость у них определяет маркер, а не контур.
 */
const shapes: (RegionShape & { readonly decorative: boolean })[] = [];

for (const [, attributes] of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
  const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
  const d = /\sd="([\s\S]*?)"/.exec(attributes)?.[1];

  if (id === undefined || d === undefined) {
    throw new Error(`Контур без id или данных: ${attributes.slice(0, 80)}`);
  }

  shapes.push({
    id,
    rings: parseMapPath(d),
    decorative: /aria-hidden="true"/.test(attributes),
  });
}

const adjacency = buildAdjacency(shapes);
const tones = assignLandTones(shapes, adjacency);
const conflicts = findToneConflicts(adjacency, tones);

if (conflicts.length > 0) {
  throw new Error(
    `Соседи одного тона: ${conflicts.map((pair) => pair.join(' и ')).join(', ')}`,
  );
}

const entries = shapes
  .map((shape) => {
    const circle = largestInscribedCircle(shape.rings);

    return {
      id: shape.id,
      tone: tones.get(shape.id)!,
      x: Number(circle.x.toFixed(1)),
      y: Number(circle.y.toFixed(1)),
      diameter: Number((circle.radius * 2).toFixed(1)),
      decorative: shape.decorative,
    };
  })
  .sort((left, right) => left.id.localeCompare(right.id));

const body = entries
  .map(
    (entry) =>
      `  '${entry.id}': { tone: ${entry.tone}, label: [${entry.x}, ${entry.y}], inscribedDiameter: ${entry.diameter} },`,
  )
  .join('\n');

const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */
import type { LandTone } from './region-adjacency';

export type RegionPaletteEntry = {
  /** Номер краски заливки: у соседних регионов не совпадает. */
  readonly tone: LandTone;
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

const degrees = [...adjacency.entries()].map(([, set]) => set.size);
console.info(
  `Регионов: ${entries.length}. Тонов: 4. Наибольшее число соседей: ${Math.max(
    ...degrees,
  )}. Конфликтов: 0.`,
);
