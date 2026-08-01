import { readFileSync } from 'node:fs';
import { regions } from '../src/content/regions';
import { validateMapAreaIds } from '../src/map/validate-map';

const assetPath = new URL('../public/maps/china-provinces.svg', import.meta.url);
const svg = readFileSync(assetPath, 'utf8');
const mapAreaIds = [...svg.matchAll(/data-region-id="([^"]+)"/g)].map(
  ([, id]) => id,
);

validateMapAreaIds(
  regions.map((region) => region.mapAreaId),
  mapAreaIds,
);
console.info(`Проверено областей карты: ${mapAreaIds.length}`);
