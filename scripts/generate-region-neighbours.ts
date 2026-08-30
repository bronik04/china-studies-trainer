/**
 * Считает граф соседства регионов по контурам карты и пишет
 * `src/map/region-neighbours.ts`. Файл сгенерирован: править его руками
 * бессмысленно, следующий прогон перезапишет.
 *
 * Почему по геометрии, а не по внешнему справочнику: ученик отвечает нажатием
 * по этой самой карте, и разойдись справочник с рисунком — у вопроса не будет
 * верного ответа вовсе. Соседство обязано быть свойством той карты, по которой
 * играют.
 *
 * Запуск: npx tsx scripts/generate-region-neighbours.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseMapPath, type Point } from '../src/map/svg-path';
import { paletteInputsFingerprint, regionContours } from './palette-fingerprint';

const MAP_FILE = 'public/maps/china-provinces.svg';
const OUTPUT_FILE = 'src/map/region-neighbours.ts';

/**
 * Порог соприкосновения в единицах viewBox. Стоит на плато, а не подобран: с
 * 0.5 до 2.0 граф не меняется (70 рёбер), ниже 0.2 разваливается — соседние
 * контуры делят не все вершины. Плато сторожит `validate:map`.
 */
export const TOUCH_EPSILON = 0.5;

export type NeighbourShape = {
  readonly id: string;
  readonly points: readonly Point[];
};

export function shapesFrom(svg: string): readonly NeighbourShape[] {
  return regionContours(svg).map((contour) => ({
    id: contour.id,
    points: parseMapPath(contour.d).flat(),
  }));
}

function touches(
  a: readonly Point[],
  b: readonly Point[],
  epsilon: number,
): boolean {
  for (const [ax, ay] of a) {
    for (const [bx, by] of b) {
      if (Math.hypot(ax - bx, ay - by) <= epsilon) {
        return true;
      }
    }
  }

  return false;
}

export function neighboursOf(
  shapes: readonly NeighbourShape[],
  epsilon: number,
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const shape of shapes) {
    graph[shape.id] = [];
  }

  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      if (touches(shapes[i].points, shapes[j].points, epsilon)) {
        graph[shapes[i].id].push(shapes[j].id);
        graph[shapes[j].id].push(shapes[i].id);
      }
    }
  }

  for (const list of Object.values(graph)) {
    list.sort();
  }

  return graph;
}

/* Прогон только при прямом запуске: `validate:map` берёт отсюда сами функции. */
if (process.argv[1]?.endsWith('generate-region-neighbours.ts')) {
  const svg = readFileSync(MAP_FILE, 'utf8');
  const graph = neighboursOf(shapesFrom(svg), TOUCH_EPSILON);

  const body = Object.entries(graph)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, list]) => `  '${id}': [${list.map((n) => `'${n}'`).join(', ')}],`)
    .join('\n');

  writeFileSync(
    OUTPUT_FILE,
    `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: ${MAP_FILE}
 * Генератор: scripts/generate-region-neighbours.ts
 */

/**
 * Отпечаток контуров, из которых граф собран. Сверяется в \`validate:map\`:
 * правка контура без \`npm run generate:neighbours\` оставила бы соседство
 * прежним при зелёной сборке.
 */
export const NEIGHBOURS_INPUTS_FINGERPRINT = '${paletteInputsFingerprint(svg)}';

/** Порог соприкосновения, при котором граф посчитан (единицы viewBox). */
export const NEIGHBOURS_EPSILON = ${TOUCH_EPSILON};

export const REGION_NEIGHBOURS: Readonly<Record<string, readonly string[]>> = {
${body}
};
`,
    'utf8',
  );

  const edges =
    Object.values(graph).reduce((sum, list) => sum + list.length, 0) / 2;
  console.info(`Соседство: регионов ${Object.keys(graph).length}, рёбер ${edges}`);
}
