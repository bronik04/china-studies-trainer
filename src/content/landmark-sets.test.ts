import { expect, it } from 'vitest';
import { landmarks } from './landmarks';
import { landmarksUpTo, LANDMARK_SETS } from './landmark-sets';

it('наборы вложены: каждый следующий включает предыдущий', () => {
  const monuments = landmarksUpTo('monuments');
  const nature = landmarksUpTo('nature');
  const all = landmarksUpTo('all');

  expect(nature.slice(0, monuments.length)).toEqual(monuments);
  expect(all.slice(0, nature.length)).toEqual(nature);
  expect(all.length).toBe(landmarks.length);
});

it('первый набор не пуст и состоит из памятников', () => {
  const monuments = landmarksUpTo('monuments');

  expect(monuments.length).toBeGreaterThan(0);
  expect(monuments.every((one) => one.kind === 'monument')).toBe(true);
});

it('у каждого набора есть подпись для окна перед стартом', () => {
  for (const set of ['monuments', 'nature', 'all'] as const) {
    expect(LANDMARK_SETS[set].length).toBeGreaterThan(0);
  }
});
