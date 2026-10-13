import { expect, it } from 'vitest';
import { physicalFeatures } from '../src/content/physical-features';
import { physicalInputsFingerprint } from './physical-fingerprint';

/*
 * Выжимка канала — такой же вход генератора, как выжимка Natural Earth:
 * перекачать канал и не перегенерировать значит оставить на карте прежнюю
 * линию при зелёной сборке.
 */
it('выжимка канала входит в отпечаток', () => {
  const before = physicalInputsFingerprint(physicalFeatures, '{}', '{"canals":[]}');
  const after = physicalInputsFingerprint(physicalFeatures, '{}', '{"canals":[1]}');

  expect(after).not.toBe(before);
});

it('одинаковые входы дают одинаковый отпечаток', () => {
  expect(physicalInputsFingerprint(physicalFeatures, '{}', '{}')).toBe(
    physicalInputsFingerprint(physicalFeatures, '{}', '{}'),
  );
});
