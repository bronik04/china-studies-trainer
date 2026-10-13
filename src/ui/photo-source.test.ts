import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { photoSource, photoSourceSet } from './photo-source';

/*
 * Свой каталог вместо настоящего: ширины в `photo-credits.ts` пишет
 * `npm run fetch:photos`, и перекачка с другим оригиналом не должна ронять
 * тест адресов. Снимок с одной шириной в настоящем каталоге вдобавок
 * единственный — пропади он, проверять было бы нечего.
 */
vi.mock('../content/photo-credits', () => ({
  PHOTO_CREDITS: {
    wide: { widths: [1200, 640] },
    narrow: { widths: [640] },
  },
}));

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

it('отдаёт самый широкий файл, какой есть', () => {
  expect(photoSource('wide')).toBe('/china-studies-trainer/photos/wide-1200.webp');
});

it('обходится единственной шириной, когда другой нет', () => {
  expect(photoSource('narrow')).toBe('/china-studies-trainer/photos/narrow-640.webp');
});

it('перечисляет в наборе все доступные ширины', () => {
  expect(photoSourceSet('wide')).toBe(
    '/china-studies-trainer/photos/wide-1200.webp 1200w, ' +
      '/china-studies-trainer/photos/wide-640.webp 640w',
  );
});

it('в наборе из одной ширины обходится без запятой', () => {
  expect(photoSourceSet('narrow')).toBe(
    '/china-studies-trainer/photos/narrow-640.webp 640w',
  );
});

it('о незнакомом снимке молчит обеими функциями', () => {
  expect(photoSource('нет-такого')).toBeNull();
  expect(photoSourceSet('нет-такого')).toBeNull();
});
