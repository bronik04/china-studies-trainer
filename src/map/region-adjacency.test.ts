import {
  assignLandTones,
  buildAdjacency,
  findToneConflicts,
  type RegionShape,
} from './region-adjacency';
import { REGION_PALETTE } from './region-palette';

/** Квадрат со стороной `size` с левым верхним углом в (x, y). */
function square(id: string, x: number, y: number, size: number): RegionShape {
  return {
    id,
    rings: [
      [
        [x, y],
        [x + size, y],
        [x + size, y + size],
        [x, y + size],
      ],
    ],
  };
}

it('считает соседями области с общей границей', () => {
  const adjacency = buildAdjacency([
    square('left', 0, 0, 10),
    square('right', 10, 0, 10),
  ]);

  expect(adjacency.get('left')).toContain('right');
  expect(adjacency.get('right')).toContain('left');
});

it('не считает соседями далёкие области', () => {
  const adjacency = buildAdjacency([
    square('near', 0, 0, 10),
    square('far', 100, 100, 10),
  ]);

  expect(adjacency.get('near')?.size).toBe(0);
});

it('даёт соседям разные тоны', () => {
  const shapes = [
    square('a', 0, 0, 10),
    square('b', 10, 0, 10),
    square('c', 20, 0, 10),
  ];
  const adjacency = buildAdjacency(shapes);
  const tones = assignLandTones(shapes, adjacency);

  expect(tones.get('a')).not.toBe(tones.get('b'));
  expect(tones.get('b')).not.toBe(tones.get('c'));
  expect(findToneConflicts(adjacency, tones)).toEqual([]);
});

it('переиспользует тон для областей, которые не соприкасаются', () => {
  const shapes = [
    square('a', 0, 0, 10),
    square('b', 10, 0, 10),
    square('c', 20, 0, 10),
  ];
  const tones = assignLandTones(shapes, buildAdjacency(shapes));

  // Четырёх красок должно хватать: цепочке из трёх звеньев нужно две.
  expect(new Set(tones.values()).size).toBeLessThanOrEqual(2);
});

it('находит конфликт, если соседям достался один тон', () => {
  const shapes = [square('a', 0, 0, 10), square('b', 10, 0, 10)];
  const adjacency = buildAdjacency(shapes);
  const broken = new Map([
    ['a', 1],
    ['b', 1],
  ] as const);

  expect(findToneConflicts(adjacency, broken)).toEqual([['a', 'b']]);
});

it('у каждого региона карты есть тон и точка подписи', () => {
  const entries = Object.entries(REGION_PALETTE);

  expect(entries).toHaveLength(34);
  for (const [id, entry] of entries) {
    expect(entry.tone, id).toBeGreaterThanOrEqual(1);
    expect(entry.tone, id).toBeLessThanOrEqual(4);
    expect(entry.inscribedDiameter, id).toBeGreaterThan(0);
    expect(entry.label, id).toHaveLength(2);
  }
});
