import { expect, it } from 'vitest';
import { marineAt } from './marine-hit';
import { MARINE_SHAPES } from './physical-geometry';

it('точка подписи достаётся своему морю', () => {
  for (const shape of MARINE_SHAPES) {
    expect(marineAt(shape.labelX, shape.labelY), shape.featureId).toBe(
      shape.featureId,
    );
  }
});

/* Общая кромка достаётся меньшему: пролив уже моря, залив уже моря. */
it('на общей кромке побеждает меньший', () => {
  const strait = MARINE_SHAPES.find(
    (shape) => shape.featureId === 'taiwan-strait',
  )!;

  expect(marineAt(strait.labelX, strait.labelY)).toBe('taiwan-strait');
});

/* Середина Тибетского нагорья — суша, и моря там нет. */
it('в глубине суши моря нет', () => {
  expect(marineAt(225, 385)).toBeNull();
});
