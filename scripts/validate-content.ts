import { cities } from '../src/content/cities';
import { physicalFeatures } from '../src/content/physical-features';
import { regions } from '../src/content/regions';
import { sources } from '../src/content/sources';
import {
  validateCatalog,
  validateCities,
  validatePhysicalFeatures,
} from '../src/domain/validate-catalog';

validateCatalog(regions, sources, { expectedRegionCount: 34 });
validateCities(cities, regions, sources);
validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 12 });
console.info(
  `Проверено регионов: ${regions.length}; городов: ${cities.length}; ` +
    `физических целей: ${physicalFeatures.length}`,
);
