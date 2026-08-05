/**
 * Строит контур Тайваня для `public/maps/china-provinces.svg`.
 *
 * В опубликованной карте @svg-maps/china Тайваня нет, поэтому его геометрия
 * берётся из набора china-geojson и переводится в систему координат карты
 * (см. `src/map/projection.ts`). Берётся только главный остров: остальные
 * контуры набора имеют площадь не более 2.4 px² при этом масштабе, то есть
 * неразличимы, а осколок у побережья Фуцзяни ещё и создавал бы ложную цель
 * для нажатия.
 *
 * Запуск: npx tsx scripts/generate-taiwan-path.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ringArea, toPathData } from '../src/map/polyline';
import { projectLonLat } from '../src/map/projection';
import type { Point } from '../src/map/svg-path';

const require = createRequire(import.meta.url);
const chinaGeoJson = require('china-geojson/src/geojson/china.json') as {
  features: readonly {
    properties: { name: string };
    geometry: { type: string; coordinates: unknown };
  }[];
};

const MAP_FILE = 'public/maps/china-provinces.svg';

function ringsOf(geometry: { type: string; coordinates: unknown }): number[][][] {
  const coordinates = geometry.coordinates as number[][][] | number[][][][];
  return geometry.type === 'Polygon'
    ? (coordinates as number[][][])
    : (coordinates as number[][][][]).flat();
}

const taiwan = chinaGeoJson.features.find((feature) => feature.properties.name === '台湾');
if (!taiwan) {
  throw new Error('В наборе china-geojson нет контура Тайваня');
}

const mainIsland = ringsOf(taiwan.geometry)
  .map((ring) =>
    ring.map(([longitude, latitude]) => projectLonLat(longitude, latitude) as Point),
  )
  .sort((left, right) => ringArea(right) - ringArea(left))[0];

/*
 * Запись пути — общей функцией: у неё есть тесты, включая круговой через
 * `parseMapPath`, а у прежней здешней копии их не было.
 */
const path = toPathData([mainIsland], { closed: true });
const svg = readFileSync(MAP_FILE, 'utf8');
const patched = svg.replace(
  /(id="taiwan"[^>]*?\sd=")[^"]+(")/s,
  (_match, before: string, after: string) => `${before}${path}${after}`,
);

if (patched === svg) {
  throw new Error(`Не найден контур taiwan в ${MAP_FILE}`);
}

writeFileSync(MAP_FILE, patched);
console.info(`Контур Тайваня обновлён: точек ${mainIsland.length}, длина пути ${path.length}`);
