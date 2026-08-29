import { expect, it } from 'vitest';
import { clusterPlaceables } from './cluster';
import { pointMarks } from './point-marks';

it('у каждой крайней точки есть цель нажатия', () => {
  const marks = pointMarks(1);

  expect(marks.map((mark) => mark.featureId)).toEqual([
    'everest',
    'turpan-depression',
  ]);

  for (const mark of marks) {
    expect(mark.radius).toBeGreaterThan(0);
  }
});

/* Порог задан в пикселях экрана: на увеличении та же цель занимает меньше
   единиц карты — то же правило, что у знаков озёр и точек городов. */
it('цель сжимается вместе с увеличением', () => {
  expect(pointMarks(2)[0].radius).toBeLessThan(pointMarks(1)[0].radius);
});

/* Джомолунгма и Турфанская впадина в разных концах страны: грозди быть не должно. */
it('гроздей не образует', () => {
  expect(
    clusterPlaceables(
      pointMarks(1).map((mark) => ({ id: mark.featureId, x: mark.x, y: mark.y })),
    ).clusters,
  ).toEqual([]);
});
