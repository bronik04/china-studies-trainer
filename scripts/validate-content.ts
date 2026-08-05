import { cities } from '../src/content/cities';
import { regions } from '../src/content/regions';
import { sources } from '../src/content/sources';
import { validateCatalog, validateCities } from '../src/domain/validate-catalog';

validateCatalog(regions, sources, { expectedRegionCount: 34 });
validateCities(cities, regions, sources);
console.info(
  `Проверено регионов: ${regions.length}; городов: ${cities.length}`,
);
