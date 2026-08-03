/**
 * Проекция карты `public/maps/china-provinces.svg`.
 *
 * Исходная карта опубликована без описания проекции. Коэффициенты получены
 * методом наименьших квадратов по центроидам 33 регионов: карта построена в
 * проекции Меркатора, остаточная невязка — 1.8 px при среднем поперечнике
 * региона в десятки пикселей. Проверка на изолированных контурах, которые
 * невозможно подогнать случайно: Хайнань — 2.34 px, Шаньдун — 2.20 px.
 *
 * Константы нужны, чтобы добавлять на карту географические объекты
 * (например, контур Тайваня) в той же системе координат.
 */
export const MAP_VIEW_BOX = { width: 774, height: 569 } as const;

const SCALE_X = 12.667029;
const OFFSET_X = -932.6409;
const SCALE_Y = -725.487859;
const OFFSET_Y = 803.4503;

/** Ордината Меркатора для широты в градусах. */
export function mercatorY(latitude: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
}

/** Переводит долготу и широту в координаты карты. */
export function projectLonLat(longitude: number, latitude: number): readonly [number, number] {
  return [
    SCALE_X * longitude + OFFSET_X,
    SCALE_Y * mercatorY(latitude) + OFFSET_Y,
  ];
}
