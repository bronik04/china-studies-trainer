import { cities } from '../src/content/cities';
import { dynasties } from '../src/content/dynasties';
import { dynastyCapitals } from '../src/content/dynasty-capitals';
import { collections } from '../src/content/collections';
import { physicalFeatures } from '../src/content/physical-features';
import { regions } from '../src/content/regions';
import { rulers } from '../src/content/rulers';
import { sources } from '../src/content/sources';
import {
  validateCatalog,
  validateCities,
  validateCollections,
  validateDynasties,
  validatePhysicalFeatures,
} from '../src/domain/validate-catalog';

validateCatalog(regions, sources, { expectedRegionCount: 34 });
validateCities(cities, regions, sources);
validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 34 });
validateCollections(collections, sources);
validateDynasties(dynasties, dynastyCapitals, rulers, cities, sources);
console.info(
  `Проверено регионов: ${regions.length}; городов: ${cities.length}; ` +
    `физических целей: ${physicalFeatures.length}; коллекций: ${collections.length}`,
);
