/**
 * Смежность регионов и раскраска карты.
 *
 * Соседи определяются по геометрии: контуры считаются смежными, если их
 * вершины сходятся ближе порога. Список соседей вручную не ведётся — он
 * разошёлся бы с картой при первой же правке геометрии.
 */
import { type Point } from './svg-path';

/**
 * Порог смежности в единицах viewBox. Вершины соседних контуров в исходной
 * карте не совпадают точно: общая граница обводится дважды с расхождением до
 * десятых долей единицы.
 */
export const ADJACENCY_EPSILON = 1.6;

export type RegionShape = {
  readonly id: string;
  readonly rings: readonly Point[][];
};

/**
 * Соседи ищутся через пространственный хэш: прямое сравнение всех пар вершин
 * даёт около 50 млн операций и не заканчивается за разумное время.
 *
 * Область может попасть в соседи, лишь пройдя рядом, — раскраску это не
 * ломает: лишнее ребро только добавляет ограничение, а не снимает его.
 */
export function buildAdjacency(
  shapes: readonly RegionShape[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const buckets = new Map<string, Set<string>>();

  for (const shape of shapes) {
    for (const ring of shape.rings) {
      for (const [x, y] of ring) {
        const column = Math.floor(x / ADJACENCY_EPSILON);
        const row = Math.floor(y / ADJACENCY_EPSILON);

        for (let dx = -1; dx <= 1; dx += 1) {
          for (let dy = -1; dy <= 1; dy += 1) {
            const key = `${column + dx},${row + dy}`;
            const bucket = buckets.get(key) ?? new Set<string>();
            bucket.add(shape.id);
            buckets.set(key, bucket);
          }
        }
      }
    }
  }

  const adjacency = new Map<string, Set<string>>(
    shapes.map((shape) => [shape.id, new Set<string>()]),
  );

  for (const bucket of buckets.values()) {
    const ids = [...bucket];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        adjacency.get(ids[i])?.add(ids[j]);
        adjacency.get(ids[j])?.add(ids[i]);
      }
    }
  }

  return adjacency;
}

export const LAND_TONE_COUNT = 4;

export type LandTone = 1 | 2 | 3 | 4;

/**
 * Раскраска по Уэлшу — Пауэллу: области берутся по убыванию числа соседей и
 * получают наименьший тон, не занятый соседями. Плоской карте по теореме о
 * четырёх красках всегда хватает четырёх тонов; если алгоритм запросил
 * пятый — это ошибка в данных, и она поднимается наверх, а не прячется.
 */
export function assignLandTones(
  shapes: readonly RegionShape[],
  adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlyMap<string, LandTone> {
  const byDegree = [...shapes].sort(
    (left, right) =>
      (adjacency.get(right.id)?.size ?? 0) - (adjacency.get(left.id)?.size ?? 0),
  );

  const tones = new Map<string, LandTone>();

  for (const shape of byDegree) {
    const taken = new Set(
      [...(adjacency.get(shape.id) ?? [])]
        .map((neighbour) => tones.get(neighbour))
        .filter((tone): tone is LandTone => tone !== undefined),
    );

    let tone = 1;
    while (taken.has(tone as LandTone)) {
      tone += 1;
    }

    if (tone > LAND_TONE_COUNT) {
      throw new Error(
        `Региону ${shape.id} не хватило ${LAND_TONE_COUNT} тонов: проверьте порог смежности`,
      );
    }

    tones.set(shape.id, tone as LandTone);
  }

  return tones;
}

/** Проверка результата: у соседей не должно быть одинакового тона. */
export function findToneConflicts(
  adjacency: ReadonlyMap<string, ReadonlySet<string>>,
  tones: ReadonlyMap<string, LandTone>,
): readonly (readonly [string, string])[] {
  const conflicts: (readonly [string, string])[] = [];

  for (const [id, neighbours] of adjacency) {
    for (const neighbour of neighbours) {
      if (id < neighbour && tones.get(id) === tones.get(neighbour)) {
        conflicts.push([id, neighbour]);
      }
    }
  }

  return conflicts;
}
