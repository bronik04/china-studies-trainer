/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */
import type { LandTone } from './region-adjacency';

export type RegionPaletteEntry = {
  /** Номер краски заливки: у соседних регионов не совпадает. */
  readonly tone: LandTone;
  /** Точка подписи — центр наибольшей вписанной окружности, единицы viewBox. */
  readonly label: readonly [number, number];
  /** Диаметр этой окружности: сколько места реально есть под нажатие. */
  readonly inscribedDiameter: number;
};

export const REGION_PALETTE: Readonly<Record<string, RegionPaletteEntry>> = {
  'anhui': { tone: 2, label: [554.2, 389.9], inscribedDiameter: 33.6 },
  'beijing': { tone: 1, label: [543.1, 245.5], inscribedDiameter: 13.2 },
  'chongqing': { tone: 4, label: [414.8, 412.7], inscribedDiameter: 17.9 },
  'fujian': { tone: 2, label: [563.7, 457.9], inscribedDiameter: 35.3 },
  'gansu': { tone: 3, label: [286, 244], inscribedDiameter: 46.7 },
  'guangdong': { tone: 1, label: [500.2, 492.7], inscribedDiameter: 30.3 },
  'guangxi': { tone: 4, label: [449.8, 495.6], inscribedDiameter: 49.2 },
  'guizhou': { tone: 3, label: [427.3, 449.8], inscribedDiameter: 36.5 },
  'hainan': { tone: 2, label: [456.2, 556.5], inscribedDiameter: 18.8 },
  'hebei': { tone: 2, label: [529.3, 277.5], inscribedDiameter: 35 },
  'heilongjiang': { tone: 3, label: [682.8, 122.8], inscribedDiameter: 82.1 },
  'henan': { tone: 1, label: [503.9, 348.1], inscribedDiameter: 43.7 },
  'hong-kong': { tone: 2, label: [512.6, 511.5], inscribedDiameter: 2 },
  'hubei': { tone: 3, label: [492.3, 390.2], inscribedDiameter: 37.9 },
  'hunan': { tone: 2, label: [477.3, 433.5], inscribedDiameter: 48 },
  'inner-mongolia': { tone: 1, label: [576, 176.1], inscribedDiameter: 71.7 },
  'jiangsu': { tone: 3, label: [588.1, 375.3], inscribedDiameter: 26.6 },
  'jiangxi': { tone: 4, label: [533.2, 429.8], inscribedDiameter: 37.4 },
  'jilin': { tone: 2, label: [671.8, 199.8], inscribedDiameter: 43.8 },
  'liaoning': { tone: 3, label: [632.1, 226.7], inscribedDiameter: 44.8 },
  'macao': { tone: 3, label: [505.8, 515.7], inscribedDiameter: 0.4 },
  'ningxia': { tone: 4, label: [408.6, 297.1], inscribedDiameter: 17.9 },
  'qinghai': { tone: 2, label: [267.8, 316.6], inscribedDiameter: 91.8 },
  'shaanxi': { tone: 2, label: [436.6, 350.4], inscribedDiameter: 38.1 },
  'shandong': { tone: 4, label: [559.8, 312.6], inscribedDiameter: 44 },
  'shanghai': { tone: 2, label: [605, 389.5], inscribedDiameter: 8.7 },
  'shanxi': { tone: 3, label: [490, 291.4], inscribedDiameter: 38.6 },
  'sichuan': { tone: 1, label: [358.1, 400.5], inscribedDiameter: 69.5 },
  'taiwan': { tone: 1, label: [597.7, 496.7], inscribedDiameter: 16.8 },
  'tianjin': { tone: 3, label: [553.6, 263.1], inscribedDiameter: 11.7 },
  'tibet': { tone: 3, label: [159.3, 371.8], inscribedDiameter: 102.5 },
  'xinjiang': { tone: 1, label: [166.8, 216.1], inscribedDiameter: 149.5 },
  'yunnan': { tone: 2, label: [348.3, 486.2], inscribedDiameter: 52.1 },
  'zhejiang': { tone: 1, label: [587.1, 418], inscribedDiameter: 36.3 },
};
