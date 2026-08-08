/**
 * Выжимка из Natural Earth для физической карты.
 *
 * Полные наборы весят около 12 МБ и в репозиторий не кладутся, а без них
 * генератор геометрии невоспроизводим — ровно та ошибка, из-за которой прежний
 * контур Тайваня годами считался производным не от того файла. Скрипт берёт
 * только нужные объекты, обрезает координаты до пяти знаков и пишет выжимку,
 * которую и коммитят.
 *
 * Нужна сеть. В сборку не входит: во время сборки и во время раунда проект
 * сетевых запросов не делает.
 *
 * Запуск: npm run extract:physical
 */
import { writeFileSync } from 'node:fs';
import { physicalFeatures } from '../src/content/physical-features';
import { RELIEF_STEPS } from './data/relief-steps';

const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const OUT = new URL('data/physical-source.json', import.meta.url);
const PRECISION = 5;

type Position = readonly number[];
type Geometry = { readonly type: string; readonly coordinates: unknown };
type Feature = {
  readonly properties: Record<string, unknown>;
  readonly geometry: Geometry | null;
};

async function load(name: string): Promise<readonly Feature[]> {
  const response = await fetch(`${BASE}/${name}.geojson`);
  if (!response.ok) {
    throw new Error(`${name}: ${response.status} ${response.statusText}`);
  }

  const collection = (await response.json()) as { features: readonly Feature[] };
  console.info(`${name}: объектов ${collection.features.length}`);

  return collection.features;
}

/** Части линии: `MultiLineString` — это несколько самостоятельных кусков. */
function lineParts(geometry: Geometry, rivernum: number): Position[][] {
  const coordinates = geometry.coordinates as Position[] | Position[][];

  /*
   * Без этой проверки пустая геометрия роняет скрипт стеком на разыменовании
   * первой координаты — вместо строки о том, какой объект плох.
   */
  if (coordinates.length === 0) {
    throw new Error(`Пустая геометрия у отрезка ${rivernum}`);
  }

  return typeof (coordinates as Position[])[0][0] === 'number'
    ? [coordinates as Position[]]
    : (coordinates as Position[][]);
}

function polygonRings(geometry: Geometry): Position[][] {
  const coordinates = geometry.coordinates as Position[][] | Position[][][];

  return geometry.type === 'Polygon'
    ? (coordinates as Position[][])
    : (coordinates as Position[][][]).flat();
}

const round = (position: Position): [number, number] => [
  Number(position[0].toFixed(PRECISION)),
  Number(position[1].toFixed(PRECISION)),
];

const riverNums = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'river' ? feature.riverNums : [],
  ),
);

const riverFeatures = await load('ne_10m_rivers_lake_centerlines');
const rivers = riverFeatures
  .filter((feature) => {
    /*
     * Класс `Lake Centerline` отбрасывать нельзя: перемычки через
     * водохранилища записаны им, и без них Хуанхэ распадается на четыре
     * обрывка.
     */
    const featurecla = feature.properties.featurecla;
    return (
      feature.geometry !== null &&
      riverNums.has(feature.properties.rivernum as number) &&
      (featurecla === 'River' || featurecla === 'Lake Centerline')
    );
  })
  .map((feature) => ({
    rivernum: feature.properties.rivernum as number,
    parts: lineParts(
      feature.geometry as Geometry,
      feature.properties.rivernum as number,
    ).map((part) => part.map(round)),
  }));

const shapeFeatures = await load('ne_10m_geography_regions_polys');
/*
 * Имена полей в этом наборе — заглавными, в наборе рек — строчными. Разница не
 * логическая, а историческая, и молча ловится только опытом: `properties.name`
 * здесь всегда `undefined`.
 */
const landforms = shapeFeatures
  .filter(
    (feature) =>
      feature.geometry !== null &&
      Object.hasOwn(RELIEF_STEPS, feature.properties.NAME as string),
  )
  .map((feature) => ({
    key: feature.properties.NAME as string,
    nameRu: (feature.properties.NAME_RU as string) ?? '',
    nameZh: (feature.properties.NAME_ZH as string) ?? '',
    rings: polygonRings(feature.geometry as Geometry).map((ring) => ring.map(round)),
  }));

const missing = Object.keys(RELIEF_STEPS).filter(
  (key) => !landforms.some((landform) => landform.key === key),
);
if (missing.length > 0) {
  throw new Error(`Не найдены формы рельефа: ${missing.join(', ')}`);
}

const lakeIds = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'lake' ? feature.lakeIds : [],
  ),
);

const lakeFeatures = await load('ne_10m_lakes');
const lakes = lakeFeatures
  .filter(
    (feature) =>
      feature.geometry !== null && lakeIds.has(feature.properties.ne_id as number),
  )
  .map((feature) => ({
    neId: feature.properties.ne_id as number,
    rings: polygonRings(feature.geometry as Geometry).map((ring) => ring.map(round)),
  }));

/*
 * Проверка на ненайденное обязательна и здесь: молча пропущенное озеро дало бы
 * цель без геометрии, и поймал бы это уже `validate:map` — шагом позже и
 * сообщением не о том.
 */
const missingLakes = [...lakeIds].filter(
  (id) => !lakes.some((item) => item.neId === id),
);
if (missingLakes.length > 0) {
  throw new Error(`Не найдены озёра: ${missingLakes.join(', ')}`);
}

const foundNums = new Set(rivers.map((river) => river.rivernum));
const missingNums = [...riverNums].filter((num) => !foundNums.has(num));
if (missingNums.length > 0) {
  throw new Error(`Не найдены отрезки рек: ${missingNums.join(', ')}`);
}

/*
 * Пометка первым ключом: комментариев в JSON нет, а сказать «руками не
 * править» файл обязан сам — иначе правку в нём потеряет первый же запуск.
 *
 * Запись компактная: 11 тысяч точек с отступом занимают вдвое больше и дают
 * сорок пять тысяч строк, читать которые всё равно некому.
 */
writeFileSync(
  OUT,
  `${JSON.stringify({
    generatedBy: 'scripts/extract-physical-source.ts (npm run extract:physical) — не править руками',
    rivers,
    landforms,
    lakes,
  })}\n`,
);

const points =
  rivers.reduce((n, river) => n + river.parts.flat().length, 0) +
  landforms.reduce((n, landform) => n + landform.rings.flat().length, 0) +
  lakes.reduce((n, lake) => n + lake.rings.flat().length, 0);
console.info(
  `Выжимка записана: отрезков рек ${rivers.length}, форм ${landforms.length}, ` +
    `озёр ${lakes.length}, точек ${points}`,
);
