/**
 * Контуры суши — те же, что рисует карта.
 *
 * Разметка читается той же строкой, что и в `ChinaMap`: `?raw` подставляет её
 * на сборке, второго запроса и второй копии геометрии не появляется.
 *
 * Нужны они одному вопросу: на суше ли точка. Маска прячет то, что за
 * границей, но нажатия не отсекает — этим она и отличается от прежней
 * обрезки, — и без проверки Гималаи выбирались бы в Непале.
 */
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { parseLandRings } from './land-rings';
import { containsPoint, type Point } from './svg-path';

/**
 * Кольца всех областей одним списком. Сам разбор живёт в `land-rings.ts`: тем
 * же разбором пользуются генератор и проверки, у которых `?raw`-импорта нет.
 *
 * Правило чётности здесь то же, что у `containsPoint`: области не
 * накладываются друг на друга, а острова лежат рядом с материком, а не внутри
 * него, — взаимного погашения не возникает.
 */
export const LAND_RINGS: readonly Point[][] = parseLandRings(mapMarkup);

/** На суше ли точка карты. */
export function isOnLand(x: number, y: number): boolean {
  return containsPoint(LAND_RINGS as Point[][], x, y);
}
