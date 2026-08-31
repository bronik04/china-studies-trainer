/**
 * Строит `src/map/country-geometry.ts` из выжимки Natural Earth.
 *
 * Что делает по порядку: переводит градусы в координаты карты той же
 * проекцией, что и города с реками, обрезает по рамке карты, выбрасывает
 * обрезки, упрощает и записывает путями в том же виде, в каком записана сама
 * карта. Для каждой страны считает середину наибольшей вписанной окружности —
 * это и точка подписи, и честная мера того, во что можно попасть указателем.
 *
 * Обрезка по рамке — не украшение. Кадр карты кончается почти по границе
 * Китая, и без обрезки в файл уехали бы Кольский полуостров и юг Индии: они
 * этой карте не принадлежат и были бы в ней мусором.
 *
 * Запуск: npm run generate:countries
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { countries } from '../src/content/countries';
import {
  clipRingToFrame,
  ringArea,
  simplifyRing,
  toPathData,
  type Frame,
} from '../src/map/polyline';
import { projectLonLat } from '../src/map/projection';
import { largestInscribedCircle, type Point } from '../src/map/svg-path';
import {
  COUNTRY_FRAME_OUTSET,
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from '../src/map/target-size';

const OUTPUT_FILE = 'src/map/country-geometry.ts';

/*
 * Выжимка читается файлом, а не импортом JSON: импорт модулей JSON требует
 * согласия сборщика, загрузчика и линтера, и все три пришлось бы уговаривать
 * ради одного места. Тот же довод, что у физической геометрии.
 */
const sourceJson = readFileSync(
  new URL('data/countries-source.json', import.meta.url),
  'utf8',
);

type SourceRings = readonly (readonly (readonly number[])[])[];
type SourceCountry = { readonly id: string; readonly rings: SourceRings };
type SourceDisputed = SourceCountry & {
  readonly nameRu: string;
  readonly note: string;
};

const source = JSON.parse(sourceJson) as {
  readonly countries: readonly SourceCountry[];
  readonly disputed: readonly SourceDisputed[];
};

/*
 * Обрезка идёт по расширенному кадру: в играх по странам карта отъезжает, и
 * по обычному кадру у стран появились бы рубленые края прямо посреди
 * видимого. Множитель общий с экраном — он живёт в `target-size.ts`.
 */
const OUTSET_X = (MAP_VIEWBOX_WIDTH * (COUNTRY_FRAME_OUTSET - 1)) / 2;
const OUTSET_Y = (MAP_VIEWBOX_HEIGHT * (COUNTRY_FRAME_OUTSET - 1)) / 2;

const FRAME: Frame = {
  minX: MAP_VIEWBOX_MIN_X - OUTSET_X,
  minY: MAP_VIEWBOX_MIN_Y - OUTSET_Y,
  maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH + OUTSET_X,
  maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT + OUTSET_Y,
};

/** Допуск упрощения. Тот же, что у форм рельефа: карта одна и та же. */
const SIMPLIFY_TOLERANCE = 0.4;

/**
 * Меньше этой площади — обрезок, а не земля: кромка кадра режет контуры, и от
 * дальних островов остаются треугольники в доли единицы. Рисовать их значит
 * ставить на карту крапинки, в которые нельзя попасть и которые ничего не
 * говорят.
 */
const MIN_RING_AREA = 1;

function toMapRings(rings: SourceRings): Point[][] {
  return rings
    .map((ring) =>
      clipRingToFrame(
        ring.map(([lon, lat]) => projectLonLat(lon, lat) as unknown as Point),
        FRAME,
      ),
    )
    .filter((ring) => ring.length >= 3 && Math.abs(ringArea(ring)) >= MIN_RING_AREA)
    .map((ring) => simplifyRing(ring, SIMPLIFY_TOLERANCE))
    .filter((ring) => ring.length >= 3);
}

const shapes = source.countries.map((country) => {
  const rings = toMapRings(country.rings);
  if (rings.length === 0) {
    throw new Error(`После обрезки от страны ${country.id} ничего не осталось`);
  }

  const circle = largestInscribedCircle(rings);

  return {
    id: country.id,
    d: toPathData(rings, { closed: true }),
    /* Точки подписи нет: подписей на карте нет ни в одной игре по странам. */
    diameter: Number((circle.radius * 2).toFixed(1)),
  };
});

const missing = countries
  .map((country) => country.id)
  .filter((id) => !shapes.some((shape) => shape.id === id));
if (missing.length > 0) {
  throw new Error(`Нет геометрии у стран: ${missing.join(', ')}`);
}

const disputed = source.disputed
  .map((area) => ({
    id: area.id,
    nameRu: area.nameRu,
    note: area.note,
    rings: toMapRings(area.rings),
  }))
  /* Участок целиком за кадром — законное состояние: рисовать нечего. */
  .filter((area) => area.rings.length > 0)
  .map((area) => ({
    id: area.id,
    nameRu: area.nameRu,
    note: area.note,
    d: toPathData(area.rings, { closed: true }),
  }));

const fingerprint = createHash('sha256')
  .update(sourceJson)
  .digest('hex')
  .slice(0, 16);

const countryLines = shapes
  .map(
    (shape) =>
      `  {\n    id: '${shape.id}',\n    diameter: ${shape.diameter},\n` +
      `    d: '${shape.d}',\n  },`,
  )
  .join('\n');

const disputedLines = disputed
  .map(
    (area) =>
      `  {\n    id: '${area.id}',\n    nameRu: '${area.nameRu}',\n` +
      `    note: '${area.note.replace(/'/g, "\\'")}',\n    d: '${area.d}',\n  },`,
  )
  .join('\n');

writeFileSync(
  OUTPUT_FILE,
  `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: scripts/data/countries-source.json
 * Генератор: scripts/generate-country-geometry.ts
 */

/**
 * Отпечаток выжимки, из которой геометрия собрана. Сверяется в \`validate:map\`:
 * заменить выжимку и не перегенерировать значит оставить на карте прежние
 * очертания при зелёной сборке.
 */
export const COUNTRIES_INPUTS_FINGERPRINT = '${fingerprint}';

export type CountryShape = {
  readonly id: string;
  /**
   * Диаметр наибольшей вписанной окружности — мера того, во что можно попасть
   * указателем. Её печатает \`validate:map\`.
   */
  readonly diameter: number;
  readonly d: string;
};

export type DisputedShape = {
  readonly id: string;
  readonly nameRu: string;
  /** Слова источника: кто участком управляет и кто его заявляет. */
  readonly note: string;
  readonly d: string;
};

export const COUNTRY_SHAPES: readonly CountryShape[] = [
${countryLines}
];

export const DISPUTED_SHAPES: readonly DisputedShape[] = [
${disputedLines}
];
`,
  'utf8',
);

console.info(
  `Страны: ${shapes.length}, спорных участков ${disputed.length}. ` +
    `Мельче 24 px при ширине 1120: ` +
    `${shapes.filter((shape) => (shape.diameter * 1120) / MAP_VIEWBOX_WIDTH < 24).length}`,
);
