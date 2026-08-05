import { citiesOfRegion } from '../../content/cities';
import type { Region } from '../../content/types';

/**
 * Приводит строку к виду, в котором её сравнивают. Разложение NFD с удалением
 * комбинирующих знаков снимает и тона пиньиня (`Húnán` → `hunan`), и точки над
 * `ё` — оба случая решает одно правило, отдельная замена `ё` не нужна.
 *
 * Диапазон записан escape-последовательностями, а не самими знаками: сами они
 * комбинирующие, в исходнике невидимы и роняют `npm run validate:fonts` — тот
 * считает их знаками контента, которых нет в подмножестве шрифта.
 */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ru')
    .trim();
}

/**
 * Поля для поиска: как регион называют по-русски, как он пишется и звучит
 * по-китайски и какие города в нём стоят. Ученик ищет по тому, что помнит, а
 * помнит он разное — в том числе город, а не регион: запрос «Сучжоу» обязан
 * привести на карточку Цзянсу, иначе город можно потренировать, но нельзя
 * посмотреть.
 */
function haystack(region: Region): string {
  const cityNames = citiesOfRegion(region.id).flatMap((city) => [
    city.nameRu,
    city.nameZh,
    city.pinyin,
  ]);

  return normalise(
    [region.nameRu, region.pinyin, region.nameZh, ...cityNames].join(' '),
  );
}

/** Пустой запрос — не фильтр: список остаётся полным. */
export function searchRegions(
  regions: readonly Region[],
  query: string,
): readonly Region[] {
  const needle = normalise(query);
  if (needle === '') {
    return regions;
  }

  return regions.filter((region) => haystack(region).includes(needle));
}
