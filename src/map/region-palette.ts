/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */

export type RegionPaletteEntry = {
  /** Точка подписи — центр наибольшей вписанной окружности, единицы viewBox. */
  readonly label: readonly [number, number];
  /** Диаметр этой окружности: сколько места реально есть под нажатие. */
  readonly inscribedDiameter: number;
};

export const REGION_PALETTE: Readonly<Record<string, RegionPaletteEntry>> = {
  'anhui': { label: [554.2, 389.9], inscribedDiameter: 33.6 },
  'beijing': { label: [543.1, 245.5], inscribedDiameter: 13.2 },
  'chongqing': { label: [414.8, 412.7], inscribedDiameter: 17.9 },
  'fujian': { label: [563.7, 457.9], inscribedDiameter: 35.3 },
  'gansu': { label: [286, 244], inscribedDiameter: 46.7 },
  'guangdong': { label: [500.2, 492.7], inscribedDiameter: 30.3 },
  'guangxi': { label: [449.8, 495.6], inscribedDiameter: 49.2 },
  'guizhou': { label: [427.3, 449.8], inscribedDiameter: 36.5 },
  'hainan': { label: [456.2, 556.5], inscribedDiameter: 18.8 },
  'hebei': { label: [529.3, 277.5], inscribedDiameter: 35 },
  'heilongjiang': { label: [682.8, 122.8], inscribedDiameter: 82.1 },
  'henan': { label: [503.9, 348.1], inscribedDiameter: 43.7 },
  'hong-kong': { label: [512.6, 511.5], inscribedDiameter: 2 },
  'hubei': { label: [492.3, 390.2], inscribedDiameter: 37.9 },
  'hunan': { label: [477.3, 433.5], inscribedDiameter: 48 },
  'inner-mongolia': { label: [576, 176.1], inscribedDiameter: 71.7 },
  'jiangsu': { label: [588.1, 375.3], inscribedDiameter: 26.6 },
  'jiangxi': { label: [533.2, 429.8], inscribedDiameter: 37.4 },
  'jilin': { label: [671.8, 199.8], inscribedDiameter: 43.8 },
  'liaoning': { label: [632.1, 226.7], inscribedDiameter: 44.8 },
  'macao': { label: [505.8, 515.7], inscribedDiameter: 0.4 },
  'ningxia': { label: [408.6, 297.1], inscribedDiameter: 17.9 },
  'qinghai': { label: [267.8, 316.6], inscribedDiameter: 91.8 },
  'shaanxi': { label: [436.6, 350.4], inscribedDiameter: 38.1 },
  'shandong': { label: [559.8, 312.6], inscribedDiameter: 44 },
  'shanghai': { label: [605, 389.5], inscribedDiameter: 8.7 },
  'shanxi': { label: [490, 291.4], inscribedDiameter: 38.6 },
  'sichuan': { label: [358.1, 400.5], inscribedDiameter: 69.5 },
  'taiwan': { label: [597.7, 496.7], inscribedDiameter: 16.8 },
  'tianjin': { label: [553.6, 263.1], inscribedDiameter: 11.7 },
  'tibet': { label: [159.3, 371.8], inscribedDiameter: 102.5 },
  'xinjiang': { label: [166.8, 216.1], inscribedDiameter: 149.5 },
  'yunnan': { label: [348.3, 486.2], inscribedDiameter: 52.1 },
  'zhejiang': { label: [587.1, 418], inscribedDiameter: 36.3 },
};
