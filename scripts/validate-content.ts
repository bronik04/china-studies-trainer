import { regions } from '../src/content/regions';
import { sources } from '../src/content/sources';
import { validateCatalog } from '../src/domain/validate-catalog';

validateCatalog(regions, sources, { expectedRegionCount: 34 });
console.info('Проверено регионов: ' + regions.length);
