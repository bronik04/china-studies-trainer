import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cities } from '../src/content/cities';
import { physicalFeatures } from '../src/content/physical-features';
import { regions } from '../src/content/regions';
import { parseLandRings } from '../src/map/land-rings';
import { CALLOUT_TARGETS } from '../src/map/callout-targets';
import {
  INPUTS_FINGERPRINT,
  LAKE_SHAPES,
  MARINE_SHAPES,
  POINT_MARKS,
  RELIEF_SHAPES,
  RIVER_LINES,
} from '../src/map/physical-geometry';
import { RELIEF_BANDS, RELIEF_INPUTS_FINGERPRINT } from '../src/map/relief-bands';
import {
  COMFORTABLE_TARGET_PX,
  MAP_VIEWBOX_WIDTH,
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
import { MAX_MAP_ZOOM } from '../src/map/map-view';
import { landmarks } from '../src/content/landmarks';
import {
  validateCityPlacement,
  validateClusters,
  validateLandmarkPlacement,
  validateMapAreaIds,
  validatePhysicalGeometry,
  validateRegionPalette,
  validateTargetSizes,
  validateViewBox,
} from '../src/map/validate-map';
import { PALETTE_INPUTS_FINGERPRINT } from '../src/map/region-palette';
import {
  NEIGHBOURS_INPUTS_FINGERPRINT,
  REGION_NEIGHBOURS,
} from '../src/map/region-neighbours';
import { neighboursOf, shapesFrom } from './generate-region-neighbours';
import {
  COUNTRIES_INPUTS_FINGERPRINT,
  COUNTRY_SHAPES,
} from '../src/map/country-geometry';
import { physicalInputsFingerprint } from './physical-fingerprint';
import { paletteInputsFingerprint } from './palette-fingerprint';
import { reliefInputsFingerprint } from './relief-fingerprint';

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

    return { id: city.id, regionId: city.regionId, x, y };
  }),
  {
    contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
    distanceToBoundary: (mapAreaId, x, y) =>
      distanceToBoundary(ringsOf(mapAreaId), x, y),
    mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    mapAreaIds: [...rings.keys()],
  },
);

/*
 * Города на кромке контура — известное и законное состояние: координаты
 * настоящие, а контуры карты генерализованы, и приморский или приграничный
 * город выходит наружу на доли единицы, оставаясь на своём месте. Двигать его
 * ради контура значило бы учить неверному.
 *
 * Но «названы и пропущены» — не то же, что «разрешены»: новый город на кромке
 * попал бы в тот же лог и прошёл незамеченным, а он мог оказаться там из-за
 * настоящей ошибки в координатах. Поэтому список закреплён, и любое
 * расхождение с ним требует человеческого взгляда.
 */
const EXPECTED_ON_BOUNDARY = ['hong-kong', 'qingdao', 'shenzhen'];

const onBoundary = [...placement.onBoundary].sort();
const unexpected = onBoundary.filter((id) => !EXPECTED_ON_BOUNDARY.includes(id));
const gone = EXPECTED_ON_BOUNDARY.filter((id) => !onBoundary.includes(id));

if (unexpected.length > 0) {
  throw new Error(
    `Новые города на кромке контура: ${unexpected.join(', ')}. Проверьте их ` +
      'координаты по источнику; если город и правда приморский или ' +
      'приграничный, добавьте его в EXPECTED_ON_BOUNDARY.',
  );
}

if (gone.length > 0) {
  throw new Error(
    `Города ушли с кромки контура: ${gone.join(', ')}. Список ` +
      'EXPECTED_ON_BOUNDARY устарел — уберите их из него.',
  );
}

console.info(
  `Проверено городов: ${cities.length}. На кромке контура: ${onBoundary.length}` +
    (onBoundary.length > 0 ? ` (${onBoundary.join(', ')})` : ''),
);

/*
 * Достопримечательности проверяются той же геометрией и тем же допуском, что и
 * города: звезда обязана лежать в контуре своего региона. Внутри контура все,
 * кроме одной: мост Гонконг — Чжухай — Макао идёт над устьем, и суши под ним
 * нет. Ближе всех к краю изнутри — городище Ваньду, полторы единицы.
 */
const landmarkPlacement = validateLandmarkPlacement(
  landmarks.map((one) => {
    const [x, y] = projectLonLat(one.lon, one.lat);

    return { id: one.id, regionId: one.regionId, x, y };
  }),
  {
    contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
    distanceToBoundary: (mapAreaId, x, y) =>
      distanceToBoundary(ringsOf(mapAreaId), x, y),
    mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    mapAreaIds: [...rings.keys()],
  },
);

/*
 * Звезда за контуром — законное состояние ровно для одного объекта: мост
 * Гонконг — Чжухай — Макао идёт над устьем Чжуцзяна, и суши под ним нет.
 * Двигать его на берег значило бы учить неверному.
 *
 * Список закреплён по той же причине, что у городов: новая звезда на кромке
 * попала бы в тот же лог и прошла незамеченной, а она могла оказаться там
 * из-за ошибки в координатах.
 */
const EXPECTED_LANDMARKS_ON_BOUNDARY = ['hzm-bridge'];

const landmarksOnBoundary = [...landmarkPlacement.onBoundary].sort();
const unexpectedLandmarks = landmarksOnBoundary.filter(
  (id) => !EXPECTED_LANDMARKS_ON_BOUNDARY.includes(id),
);
const goneLandmarks = EXPECTED_LANDMARKS_ON_BOUNDARY.filter(
  (id) => !landmarksOnBoundary.includes(id),
);

if (unexpectedLandmarks.length > 0) {
  throw new Error(
    `Новые достопримечательности на кромке контура: ${unexpectedLandmarks.join(', ')}. ` +
      'Проверьте координаты по источнику; если объект и правда стоит над водой ' +
      'или на самой границе, добавьте его в EXPECTED_LANDMARKS_ON_BOUNDARY.',
  );
}

if (goneLandmarks.length > 0) {
  throw new Error(
    `Достопримечательности ушли с кромки контура: ${goneLandmarks.join(', ')}. ` +
      'Список EXPECTED_LANDMARKS_ON_BOUNDARY устарел — уберите их из него.',
  );
}

/*
 * Гроздь городов обязана расходиться настоящим приближением: нажатие по ней
 * увеличивает карту, и пары теснее предела молча запирали бы ответ. Гроздь
 * достопримечательностей — сама цель ответа, ей предел не писан.
 */
const clusterReport = validateClusters([
  {
    layer: 'города',
    points: cities.map((city) => {
      const [x, y] = projectLonLat(city.lon, city.lat);

      return { id: city.id, x, y };
    }),
    separable: true,
  },
  {
    layer: 'достопримечательности',
    points: landmarks.map((one) => {
      const [x, y] = projectLonLat(one.lon, one.lat);

      return { id: one.id, x, y };
    }),
    separable: false,
  },
]);

console.info(
  `Проверено достопримечательностей: ${landmarks.length}. На кромке контура: ` +
    `${landmarksOnBoundary.length}` +
    (landmarksOnBoundary.length > 0 ? ` (${landmarksOnBoundary.join(', ')})` : '') +
    '. Самая тесная гроздь: ' +
    clusterReport
      .map(
        (entry) =>
          `${entry.layer} — ${entry.id} расходится на ${entry.scale.toFixed(1)}×`,
      )
      .join('; ') +
    ` при пределе увеличения ${MAX_MAP_ZOOM}× (для городов)`,
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
 * Палитра — тем же приёмом. `validateRegionPalette` выше спрашивает, есть ли
 * запись у каждого региона, и на этот вопрос сдвинутый контур ответит «да»:
 * запись останется прежней. Отпечаток спрашивает другое — из этих ли контуров
 * она собрана. Он же сторожит цели нажатия: их расставляет `generate:hit-targets`
 * по точкам и диаметрам палитры.
 */
const expectedPaletteFingerprint = paletteInputsFingerprint(svg);
if (expectedPaletteFingerprint !== PALETTE_INPUTS_FINGERPRINT) {
  throw new Error(
    `Палитра собрана из других контуров: в файле ${PALETTE_INPUTS_FINGERPRINT}, ` +
      `у нынешних ${expectedPaletteFingerprint}. Запустите npm run generate:palette`,
  );
}

/*
 * Соседство — тем же приёмом: граф собран из контуров, и сдвинутый контур
 * оставил бы его прежним при зелёной сборке.
 */
if (expectedPaletteFingerprint !== NEIGHBOURS_INPUTS_FINGERPRINT) {
  throw new Error(
    `Граф соседства собран из других контуров: в файле ${NEIGHBOURS_INPUTS_FINGERPRINT}, ` +
      `у нынешних ${expectedPaletteFingerprint}. Запустите npm run generate:neighbours`,
  );
}

/*
 * Порог соприкосновения обязан стоять на плато. Замерено: с 0.5 до 2.0 единиц
 * граф не меняется, ниже 0.2 разваливается. Если после правки геометрии ответ
 * станет зависеть от выбранного числа, лучше уронить сборку, чем спросить у
 * ученика вопрос, у которого нет верного ответа.
 */
const wideNeighbours = neighboursOf(shapesFrom(svg), 2);
for (const [regionId, list] of Object.entries(REGION_NEIGHBOURS)) {
  const narrow = [...list].sort().join(' ');
  const wide = [...(wideNeighbours[regionId] ?? [])].sort().join(' ');
  if (narrow !== wide) {
    throw new Error(
      `Соседство ${regionId} зависит от порога: при 0.5 «${narrow}», ` +
        `при 2.0 «${wide}». Порог съехал с плато — проверьте геометрию.`,
    );
  }
}

/*
 * Слой стран — тем же приёмом: он собран из выжимки, и подменённая выжимка без
 * перегенерации оставила бы на карте прежние очертания при зелёной сборке.
 */
const expectedCountriesFingerprint = createHash('sha256')
  .update(
    readFileSync(new URL('data/countries-source.json', import.meta.url), 'utf8'),
  )
  .digest('hex')
  .slice(0, 16);
if (expectedCountriesFingerprint !== COUNTRIES_INPUTS_FINGERPRINT) {
  throw new Error(
    `Слой стран собран из другой выжимки: в файле ${COUNTRIES_INPUTS_FINGERPRINT}, ` +
      `у нынешней ${expectedCountriesFingerprint}. Запустите npm run generate:countries`,
  );
}

/*
 * Сколько стран мельче порога нажатия. Не роняет сборку: у Афганистана в кадр
 * заходит только Ваханский коридор, и это не дефект карты, а география. Число
 * объясняет, почему такие страны отвечаются из равнозначного списка.
 */
const smallCountries = COUNTRY_SHAPES.filter(
  (shape) => (shape.diameter * REFERENCE_MAP_WIDTH) / MAP_VIEWBOX_WIDTH < MIN_TARGET_PX,
);
console.info(
  `Проверено стран: ${COUNTRY_SHAPES.length}. Мельче ${MIN_TARGET_PX} px при ширине ` +
    `${REFERENCE_MAP_WIDTH} px: ${smallCountries.length}` +
    (smallCountries.length > 0
      ? ` (${smallCountries.map((shape) => shape.id).join(', ')})`
      : ''),
);

/*
 * Полосы высот проверяются тем же приёмом и по той же причине: заменить
 * выжимку и не перегенерировать значит оставить на карте прежний рельеф при
 * зелёной сборке.
 */
const expectedReliefFingerprint = reliefInputsFingerprint(
  RELIEF_BANDS.map((band) => band.threshold),
  readFileSync(new URL('data/relief-source.json', import.meta.url), 'utf8'),
);
if (expectedReliefFingerprint !== RELIEF_INPUTS_FINGERPRINT) {
  throw new Error(
    `Полосы рельефа собраны из других входов: в файле ${RELIEF_INPUTS_FINGERPRINT}, ` +
      `у нынешних входов ${expectedReliefFingerprint}. Запустите npm run generate:relief`,
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
    lakes: new Map(
      LAKE_SHAPES.map((shape) => [shape.featureId, parseMapPath(shape.d)]),
    ),
    lakeMarks: new Map(
      LAKE_SHAPES.map((shape) => [
        shape.featureId,
        [shape.markX, shape.markY] as Point,
      ]),
    ),
    shapeLabels: new Map(
      RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map(
        (shape) => [
          shape.featureId as string,
          [shape.labelX as number, shape.labelY as number] as Point,
        ],
      ),
    ),
    pointMarks: new Map(
      POINT_MARKS.map((mark) => [mark.featureId, [mark.x, mark.y] as Point]),
    ),
    marine: new Map(
      MARINE_SHAPES.map((shape) => [shape.featureId, parseMapPath(shape.d)]),
    ),
    marineLabels: new Map(
      MARINE_SHAPES.map((shape) => [
        shape.featureId,
        [shape.labelX, shape.labelY] as Point,
      ]),
    ),
    landRings: parseLandRings(svg),
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
