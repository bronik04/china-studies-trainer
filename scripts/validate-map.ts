import { readFileSync } from 'node:fs';
import { regions } from '../src/content/regions';
import { CALLOUT_TARGETS } from '../src/map/callout-targets';
import {
  COMFORTABLE_TARGET_PX,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
} from '../src/map/target-size';
import {
  validateLandTones,
  validateMapAreaIds,
  validateTargetSizes,
} from '../src/map/validate-map';

const assetPath = new URL('../public/maps/china-provinces.svg', import.meta.url);
const svg = readFileSync(assetPath, 'utf8');
const mapAreaIds = [...svg.matchAll(/data-region-id="([^"]+)"/g)].map(
  ([, id]) => id,
);
const hitTargetIds = [...svg.matchAll(/data-hit-region-id="([^"]+)"/g)].map(
  ([, id]) => id,
);

const regionIds = regions.map((region) => region.mapAreaId);

validateMapAreaIds(regionIds, mapAreaIds);
validateLandTones(regionIds);
validateTargetSizes(
  regionIds,
  hitTargetIds,
  CALLOUT_TARGETS.map((target) => target.regionId),
);

console.info(
  `Проверено областей карты: ${mapAreaIds.length}. Целей нажатия: ${hitTargetIds.length}. Выносок: ${CALLOUT_TARGETS.length}.`,
);

/*
 * Порог AAA и узкий экран не блокируют сборку, но и не молчат: на 375 px
 * карта остаётся непригодной для мелких регионов, и это должно быть видно в
 * логе, а не забыто. Полное решение — панорамирование при увеличении или
 * врезка — вынесено в ROADMAP.md.
 */
const belowComfortable = undersizedRegions(
  regionIds,
  REFERENCE_MAP_WIDTH,
  COMFORTABLE_TARGET_PX,
).length;
const MOBILE_MAP_WIDTH = 343;
const belowOnMobile = undersizedRegions(
  regionIds,
  MOBILE_MAP_WIDTH,
  MIN_TARGET_PX,
).length;

console.info(
  `Ниже ${COMFORTABLE_TARGET_PX} px при ширине ${REFERENCE_MAP_WIDTH} px: ${belowComfortable}. ` +
    `Ниже ${MIN_TARGET_PX} px при ширине ${MOBILE_MAP_WIDTH} px: ${belowOnMobile}.`,
);
