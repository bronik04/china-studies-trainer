import { readFileSync } from 'node:fs';
import { cities } from '../src/content/cities';
import { physicalFeatures } from '../src/content/physical-features';
import { regions } from '../src/content/regions';
import { CALLOUT_TARGETS } from '../src/map/callout-targets';
import {
  INPUTS_FINGERPRINT,
  RELIEF_SHAPES,
  RIVER_LINES,
} from '../src/map/physical-geometry';
import {
  COMFORTABLE_TARGET_PX,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
} from '../src/map/target-size';
import { projectLonLat } from '../src/map/projection';
import {
  containsPoint,
  distanceToBoundary,
  parseMapPath,
  type Point,
} from '../src/map/svg-path';
import {
  validateCityPlacement,
  validateMapAreaIds,
  validatePhysicalGeometry,
  validateRegionPalette,
  validateTargetSizes,
  validateViewBox,
} from '../src/map/validate-map';
import { physicalInputsFingerprint } from './physical-fingerprint';

const assetPath = new URL('../public/maps/china-provinces.svg', import.meta.url);
const svg = readFileSync(assetPath, 'utf8');
const mapAreaIds = [...svg.matchAll(/data-region-id="([^"]+)"/g)].map(
  ([, id]) => id,
);
const hitTargetIds = [...svg.matchAll(/data-hit-region-id="([^"]+)"/g)].map(
  ([, id]) => id,
);

const regionIds = regions.map((region) => region.mapAreaId);

validateViewBox(/viewBox="([^"]+)"/.exec(svg)?.[1] ?? null);
validateMapAreaIds(regionIds, mapAreaIds);
validateRegionPalette(regionIds);
validateTargetSizes(
  regionIds,
  hitTargetIds,
  CALLOUT_TARGETS.map((target) => target.regionId),
);

console.info(
  `Проверено областей карты: ${mapAreaIds.length}. Целей нажатия: ${hitTargetIds.length}. Выносок: ${CALLOUT_TARGETS.length}.`,
);

/*
 * Города проверяются по той же геометрии, что и области: контуры разбираются
 * один раз и переиспользуются. Проекция применяется здесь, а не в каталоге, —
 * в каталоге координаты остаются градусами.
 */
const rings = new Map<string, Point[][]>();
for (const [, attributes] of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
  const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
  const d = /\sd="([\s\S]*?)"/.exec(attributes)?.[1];

  if (id !== undefined && d !== undefined) {
    rings.set(id, parseMapPath(d));
  }
}

const mapAreaOf = new Map(regions.map((region) => [region.id, region.mapAreaId]));
const ringsOf = (mapAreaId: string): Point[][] => rings.get(mapAreaId) ?? [];

const placement = validateCityPlacement(
  cities.map((city) => {
    const [x, y] = projectLonLat(city.lon, city.lat);

    return { cityId: city.id, regionId: city.regionId, x, y };
  }),
  {
    contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
    distanceToBoundary: (mapAreaId, x, y) =>
      distanceToBoundary(ringsOf(mapAreaId), x, y),
    mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    mapAreaIds: [...rings.keys()],
  },
);

console.info(
  `Проверено городов: ${cities.length}. На кромке контура: ${placement.onBoundary.length}` +
    (placement.onBoundary.length > 0 ? ` (${placement.onBoundary.join(', ')})` : ''),
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

/*
 * Сгенерированная геометрия обязана быть получена из тех входов, что лежат в
 * репозитории сейчас. Без этой сверки правка справочника или разметки ступеней
 * без запуска генератора проходит сборку молча: цель на месте, геометрия у неё
 * есть — просто прежняя. Та же причина, по которой существует
 * `validateRegionPalette`.
 */
const expectedFingerprint = physicalInputsFingerprint(
  physicalFeatures,
  readFileSync(new URL('data/physical-source.json', import.meta.url), 'utf8'),
);
if (expectedFingerprint !== INPUTS_FINGERPRINT) {
  throw new Error(
    `Геометрия физической карты собрана из других входов: в файле ${INPUTS_FINGERPRINT}, ` +
      `у нынешних входов ${expectedFingerprint}. Запустите npm run generate:physical`,
  );
}

/*
 * Физические цели проверяются теми же контурами, что и города: `rings` и
 * `mapAreaOf` уже разобраны выше и переиспользуются.
 */
const physical = validatePhysicalGeometry(
  physicalFeatures,
  {
    rivers: new Map(RIVER_LINES.map((line) => [line.featureId, parseMapPath(line.d)])),
    landforms: new Map(
      RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => [
        shape.featureId as string,
        parseMapPath(shape.d),
      ]),
    ),
  },
  {
    contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
    distanceToBoundary: (mapAreaId, x, y) => distanceToBoundary(ringsOf(mapAreaId), x, y),
    mapAreaOf: (regionId) => mapAreaOf.get(regionId),
  },
);

console.info(
  `Проверено физических целей: ${physicalFeatures.length}. ` +
    `Форм на подложке: ${RELIEF_SHAPES.length}. Свободная длина рек: ` +
    [...physical.freeShare]
      .map(([id, share]) => `${id} ${(100 * share).toFixed(0)} %`)
      .join(', '),
);
