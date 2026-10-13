import { expect, it } from 'vitest';
import { collections } from './collections';
import { cultureCollectionsUpTo, sameKindAs } from './culture-sets';

/* Наборы вложены: каждый следующий включает предыдущий, как у городов. */
it('наборы вложены и растут', () => {
  const culture = cultureCollectionsUpTo('culture');
  const nature = cultureCollectionsUpTo('nature');
  const all = cultureCollectionsUpTo('all');

  expect(nature.length).toBeGreaterThan(culture.length);
  expect(all.length).toBeGreaterThan(nature.length);
  for (const item of culture) {
    expect(nature).toContain(item);
  }
  for (const item of nature) {
    expect(all).toContain(item);
  }
});

/* Без снимка вопроса не существует: спрашивать нечем. */
it('берёт только коллекции со снимком', () => {
  for (const collection of cultureCollectionsUpTo('all')) {
    expect(collection.photos.length, collection.id).toBeGreaterThan(0);
  }
});

/*
 * Первый набор — то, ради чего режим заявлен карточкой: памятник, праздник,
 * ремесло. Ни регионов, ни объектов физической географии в нём нет.
 */
it('первый набор — памятники и явления, без регионов и объектов', () => {
  for (const collection of cultureCollectionsUpTo('culture')) {
    expect(collection.aboutRegionId, collection.id).toBeUndefined();
    expect(collection.aboutFeatureId, collection.id).toBeUndefined();
  }
});

/*
 * Отвлекающие того же рода: снимок горы не может оказаться праздником, и
 * разнородные варианты отпадали бы, не будучи прочитанными.
 */
it('соседи по роду — того же рода', () => {
  const region = collections.find((item) => item.id === 'region-hunan')!;
  const feature = collections.find((item) => item.id === 'feature-yangtze')!;
  const culture = collections.find((item) => item.id === 'beijing-opera')!;

  expect(sameKindAs(region).every((item) => item.aboutRegionId !== undefined)).toBe(true);
  expect(sameKindAs(feature).every((item) => item.aboutFeatureId !== undefined)).toBe(true);
  expect(sameKindAs(culture)).toContain(culture);
  expect(sameKindAs(culture).length).toBeLessThan(sameKindAs(region).length);
});

/*
 * Часть и целое в одном вопросе не встречаются — то же правило, что у
 * вариантов физической карты. На снимке Трёх ущелий река и есть Янцзы:
 * вариант «Янцзы» был бы вторым верным ответом.
 */
it('участок и его река не отвлекают друг от друга', () => {
  const gorges = collections.find((item) => item.id === 'feature-three-gorges')!;
  const yangtze = collections.find((item) => item.id === 'feature-yangtze')!;

  expect(gorges.photos.length).toBeGreaterThan(0);
  expect(sameKindAs(gorges)).not.toContain(yangtze);
  expect(sameKindAs(yangtze)).not.toContain(gorges);
  expect(sameKindAs(yangtze)).toContain(yangtze);
});
