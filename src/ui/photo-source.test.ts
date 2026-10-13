import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PHOTO_CREDITS } from '../content/photo-credits';
import { photoSource, photoSourceSet } from './photo-source';

/*
 * Vitest держит `import.meta.env.BASE_URL` равным '/', что бы ни стояло в
 * `base` конфигурации, — поэтому путь сайта подставляется здесь. Без этого
 * адрес, записанный от корня, прошёл бы тесты и сломался бы только на сайте.
 */
beforeEach(() => {
  vi.stubEnv('BASE_URL', '/china-studies-trainer/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/*
 * Снимки берутся из каталога по признаку, а не по имени: ширины пишет
 * `npm run fetch:photos`, и перекачка с другим оригиналом не должна ронять
 * тест адресов.
 */
const credits = Object.entries(PHOTO_CREDITS);
const [severalId, several] = credits.find(([, credit]) => credit.widths.length > 1)!;
const [singleId, single] = credits.find(([, credit]) => credit.widths.length === 1)!;

function file(photoId: string, width: number): string {
  return `/china-studies-trainer/photos/${photoId}-${width}.webp`;
}

it('отдаёт самый широкий файл, какой есть', () => {
  expect(photoSource(severalId)).toBe(file(severalId, Math.max(...several.widths)));
});

it('обходится единственной шириной, когда другой нет', () => {
  expect(photoSource(singleId)).toBe(file(singleId, single.widths[0]));
});

it('перечисляет в наборе все доступные ширины', () => {
  expect(photoSourceSet(severalId)).toBe(
    several.widths.map((width) => `${file(severalId, width)} ${width}w`).join(', '),
  );
});

it('в наборе из одной ширины обходится без запятой', () => {
  expect(photoSourceSet(singleId)).toBe(
    `${file(singleId, single.widths[0])} ${single.widths[0]}w`,
  );
});

it('о незнакомом снимке молчит обеими функциями', () => {
  expect(photoSource('нет-такого')).toBeNull();
  expect(photoSourceSet('нет-такого')).toBeNull();
});
