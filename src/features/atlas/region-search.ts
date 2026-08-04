import type { Region } from '../../content/types';

/**
 * Приводит строку к виду, в котором её сравнивают. Разложение NFD с удалением
 * комбинирующих знаков снимает и тона пиньиня (`Húnán` → `hunan`), и точки над
 * `ё` — оба случая решает одно правило, отдельная замена `ё` не нужна.
 */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('ru')
    .trim();
}

/**
 * Поля для поиска: как регион называют по-русски, как он пишется и звучит
 * по-китайски и какой у него центр. Ученик ищет по тому, что помнит, а помнит
 * он разное.
 */
function haystack(region: Region): string {
  return normalise(
    [region.nameRu, region.pinyin, region.nameZh, region.capitalRu].join(' '),
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
