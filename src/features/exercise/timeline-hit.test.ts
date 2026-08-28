import { expect, it } from 'vitest';
import { dynasties, TIMELINE_FROM, TIMELINE_TO } from '../../content/dynasties';
import { hitAreas, minHitShare, type TimelineSpan } from './timeline-hit';

const SPANS: readonly TimelineSpan[] = [
  { id: 'a', left: 0, width: 0.4 },
  /* Полоса Цинь: четырнадцать лет из четырёх тысяч. */
  { id: 'b', left: 0.4, width: 0.004 },
  { id: 'c', left: 0.404, width: 0.3 },
];

it('узкая полоса получает цель не меньше порога', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits.find((hit) => hit.id === 'b')!.width).toBeGreaterThanOrEqual(0.05);
});

it('цели не накладываются и идут в том же порядке', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits.map((hit) => hit.id)).toEqual(['a', 'b', 'c']);
  for (let index = 1; index < hits.length; index += 1) {
    expect(hits[index].left).toBeGreaterThanOrEqual(
      hits[index - 1].left + hits[index - 1].width - 1e-9,
    );
  }
});

it('цели не выходят за ленту', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits[0].left).toBeGreaterThanOrEqual(0);
  expect(hits.at(-1)!.left + hits.at(-1)!.width).toBeLessThanOrEqual(1 + 1e-9);
});

/*
 * На узком экране двенадцать целей по 44 px не помещаются — тогда порог
 * опускается до равной доли, а гарантированным путём остаются кнопки
 * вариантов. Обещать 44 px там, где их нет, значило бы соврать в проверке.
 */
it('порог опускается, когда 44 px на всех не хватает', () => {
  expect(minHitShare(1024, 12)).toBeCloseTo(44 / 1024, 5);
  expect(minHitShare(375, 12)).toBeCloseTo(1 / 12, 5);
});

/* Настоящая лента: двенадцать полос, две из них короче полупроцента. */
it('на настоящей ленте все двенадцать целей достигают 44 px при 1024 px', () => {
  const span = TIMELINE_TO - TIMELINE_FROM;
  const spans = dynasties.map((dynasty) => ({
    id: dynasty.id,
    left: (dynasty.from - TIMELINE_FROM) / span,
    width: (dynasty.to - dynasty.from) / span,
  }));

  const minShare = minHitShare(1024, spans.length);
  const hits = hitAreas(spans, minShare);

  expect(minShare).toBeCloseTo(44 / 1024, 5);
  for (const hit of hits) {
    expect(hit.width * 1024).toBeGreaterThanOrEqual(44 - 1e-6);
  }
});
