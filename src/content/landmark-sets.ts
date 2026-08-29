import { landmarks, type Landmark } from './landmarks';

/**
 * Что спрашивать в играх по достопримечательностям.
 *
 * Наборы вложены: каждый следующий включает предыдущий — то же устройство, что
 * у городов, физической географии и культуры. Ученик выбирает, докуда, а не
 * какой один.
 *
 * Порядок не случаен и не по славе, а по роду — признаку из самого каталога,
 * а не по чьему-то вкусу. Памятник узнаётся по виду постройки, природное место
 * — по краскам, а современное здание требует знать сегодняшний Китай, а не
 * только древний.
 */
export type LandmarkSet = 'monuments' | 'nature' | 'all';

export const LANDMARK_SETS: Readonly<Record<LandmarkSet, string>> = {
  monuments: 'Памятники',
  nature: 'И природа',
  all: 'И современное',
};

const MONUMENTS = landmarks.filter((one) => one.kind === 'monument');
const NATURE = landmarks.filter((one) => one.kind === 'nature');
const MODERN = landmarks.filter((one) => one.kind === 'modern');

export function landmarksUpTo(set: LandmarkSet): readonly Landmark[] {
  if (set === 'monuments') {
    return MONUMENTS;
  }

  return set === 'nature'
    ? [...MONUMENTS, ...NATURE]
    : [...MONUMENTS, ...NATURE, ...MODERN];
}
