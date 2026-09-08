import { createHash } from 'node:crypto';
import type { PhysicalFeature } from '../src/content/types';
import { RELIEF_STEPS, SHAPE_FEATURE_IDS } from './data/relief-steps';
import { GORGE_ENDPOINTS } from './data/gorge-endpoints';

/**
 * Отпечаток входов генератора геометрии.
 *
 * Нужен затем же, зачем `validateRegionPalette`: забытый генератор не должен
 * проходить сборку. Наличие цели в `physical-geometry.ts` ничего не значит —
 * убрать у реки отрезок и не перегенерировать значит оставить на карте
 * прежнюю линию при зелёной сборке. Отпечаток отвечает на другой вопрос:
 * получена ли эта геометрия из тех входов, что лежат в репозитории сейчас.
 *
 * В отпечаток входит всё, что меняет результат: состав целей и номера
 * отрезков, номера озёр, разметка ступеней, привязка форм к целям, концы
 * участков-ущелий и сама выжимка. Порядок
 * ключей фиксируется сортировкой — иначе отпечаток менялся бы от перестановки
 * строк в справочнике, ничего не меняя по существу.
 */
export function physicalInputsFingerprint(
  features: readonly PhysicalFeature[],
  sourceJson: string,
): string {
  const catalog = features
    .map((feature) => {
      if (feature.kind === 'river') {
        return `river:${feature.id}:${[...feature.riverNums].sort((a, b) => a - b).join(',')}`;
      }

      if (feature.kind === 'lake') {
        return `lake:${feature.id}:${[...feature.lakeIds].sort((a, b) => a - b).join(',')}`;
      }

      if (feature.kind === 'marine') {
        return `marine:${feature.id}:${feature.neId}`;
      }

      if (feature.kind === 'point') {
        return `point:${feature.id}:${feature.neId}`;
      }

      if (feature.kind === 'gorge') {
        return `gorge:${feature.id}:${feature.partOf}`;
      }

      return `landform:${feature.id}:${feature.step}`;
    })
    .sort();

  const steps = Object.entries(RELIEF_STEPS)
    .map(([key, step]) => `${key}=${step}`)
    .sort();

  const targets = Object.entries(SHAPE_FEATURE_IDS)
    .map(([key, id]) => `${key}=${id}`)
    .sort();

  /*
   * Концы участков — такой же вход, как номера отрезков реки: сдвинуть конец и
   * не перегенерировать значит оставить на карте прежний участок при зелёной
   * сборке.
   */
  const ends = Object.entries(GORGE_ENDPOINTS)
    .map(([id, at]) => `${id}=${at.from.join(',')}>${at.to.join(',')}`)
    .sort();

  return createHash('sha256')
    .update([...catalog, ...steps, ...targets, ...ends, sourceJson].join('\n'))
    .digest('hex')
    .slice(0, 16);
}
