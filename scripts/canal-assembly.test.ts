import { describe, expect, it } from 'vitest';
import type { Point } from '../src/map/svg-path';
import { assembleCanal, type CanalLimits } from './canal-assembly';

const LIMITS: CanalLimits = {
  joinTolerance: 0.01,
  minPartShare: 0.05,
  maxParts: 2,
  maxGap: 0.15,
  maxDroppedShare: 0.15,
};

/* Отрезок из n точек вдоль параллели: долгота от `from` с шагом 0.1°. */
function run(from: number, n: number, lat = 0): Point[] {
  return Array.from({ length: n }, (_, i) => [from + i * 0.1, lat] as Point);
}

describe('assembleCanal', () => {
  it('сшивает касающиеся участки в одну цепь', () => {
    const { parts, dropped } = assembleCanal([run(0, 10), run(0.9, 10)], LIMITS);

    expect(parts).toHaveLength(1);
    expect(parts[0]).toHaveLength(19);
    expect(dropped).toBe(0);
  });

  it('оставляет две цепи, если между ними разрыв в пределах', () => {
    /* Первая кончается на 0.9, вторая начинается на 1.0: разрыв 0.1°. */
    const { parts } = assembleCanal([run(0, 10), run(1.0, 10)], LIMITS);

    expect(parts).toHaveLength(2);
  });

  it('отбрасывает обрывок и считает его точки', () => {
    const stub = [
      [50, 50],
      [50.01, 50],
    ] as Point[];
    const { parts, dropped, total } = assembleCanal(
      [run(0, 30), run(2.9, 30), stub],
      LIMITS,
    );

    expect(parts).toHaveLength(1);
    expect(dropped).toBe(2);
    expect(total).toBe(62);
  });

  it('падает, если разрыв между цепями больше предела', () => {
    expect(() => assembleCanal([run(0, 10), run(2, 10)], LIMITS)).toThrow(
      /разрыв/,
    );
  });

  it('падает, если цепей больше предела', () => {
    expect(() =>
      assembleCanal([run(0, 10), run(1.0, 10), run(2.0, 10)], LIMITS),
    ).toThrow(/распался/);
  });

  it('падает, если в обрывки ушло больше допустимой доли', () => {
    const stubs = Array.from(
      { length: 5 },
      (_, i) =>
        [
          [100 + i * 10, 0],
          [100.01 + i * 10, 0],
        ] as Point[],
    );

    /* Порог части поднят: иначе обрывки из двух точек остались бы цепями. */
    expect(() =>
      assembleCanal([run(0, 20), ...stubs], {
        ...LIMITS,
        minPartShare: 0.2,
        maxDroppedShare: 0.1,
      }),
    ).toThrow(/обрывки/);
  });

  it('не зацикливается на одних вырожденных кусках', () => {
    expect(() =>
      assembleCanal(
        [[[0, 0]] as Point[], [[1, 1]] as Point[]],
        LIMITS,
      ),
    ).toThrow(/не собрался/);
  });
});
