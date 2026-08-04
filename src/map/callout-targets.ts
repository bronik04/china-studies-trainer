/**
 * Регионы, которые невозможно выбрать указателем: Макао занимает 0.7×1.4
 * единицы viewBox, Гонконг — 7.1×5.0. Они выносятся маркерами в свободное
 * море юго-восточнее Гуандуна, а их собственные контуры становятся
 * декоративными.
 *
 * Координаты якорей — центры габаритов контуров в единицах viewBox,
 * измеренные по самой карте. Координаты маркеров выбраны вручную в пустой
 * акватории; выносные линии не пересекаются.
 */
export type CalloutTarget = {
  readonly regionId: string;
  readonly regionKind: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly anchor: readonly [number, number];
  readonly marker: readonly [number, number];
};

export const CALLOUT_TARGETS: readonly CalloutTarget[] = [
  {
    regionId: 'macao',
    regionKind: 'sar',
    label: 'Макао, 澳门特别行政区',
    shortLabel: 'Макао',
    anchor: [505.8, 515.4],
    // Маркеры разведены по горизонтали шире, чем требует сам кружок: подписи
    // набраны 11 px, и на прежнем расстоянии «Макао» и «Гонконг» наезжали
    // друг на друга.
    marker: [502, 542],
  },
  {
    regionId: 'hong-kong',
    regionKind: 'sar',
    label: 'Гонконг, 香港特别行政区',
    shortLabel: 'Гонконг',
    anchor: [512.9, 512.5],
    marker: [566, 538],
  },
];

/** Радиус маркера: 22 единицы в поперечнике ≈ 24 CSS px при ширине карты 835 px. */
export const MARKER_RADIUS = 11;

/** Базовая линия подписи ниже центра маркера. */
export const LABEL_OFFSET = MARKER_RADIUS + 10;

/** Запас под нижние выносные элементы букв, чтобы подпись не обрезалась краем карты. */
export const LABEL_DESCENDER = 3;

/**
 * Порог выбираемости в единицах viewBox (≈13 CSS px). Ниже него область
 * невозможно нажать указателем. Полные 24×24 CSS px обеспечивает
 * равнозначный список регионов под картой — исключение «Equivalent»
 * в WCAG 2.5.8.
 */
export const MIN_TARGET_UNITS = 12;
