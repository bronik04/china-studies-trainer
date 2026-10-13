import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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

it('отдаёт самый широкий файл, какой есть', () => {
  expect(photoSource('badaling')).toBe(
    '/china-studies-trainer/photos/badaling-1200.webp',
  );
});

it('обходится единственной шириной, когда другой нет', () => {
  expect(photoSource('feature-qinghai-lake')).toBe(
    '/china-studies-trainer/photos/feature-qinghai-lake-640.webp',
  );
});

it('перечисляет в наборе все доступные ширины', () => {
  expect(photoSourceSet('badaling')).toBe(
    '/china-studies-trainer/photos/badaling-1200.webp 1200w, ' +
      '/china-studies-trainer/photos/badaling-640.webp 640w',
  );
});

it('в наборе из одной ширины обходится без запятой', () => {
  expect(photoSourceSet('feature-qinghai-lake')).toBe(
    '/china-studies-trainer/photos/feature-qinghai-lake-640.webp 640w',
  );
});

it('о незнакомом снимке молчит обеими функциями', () => {
  expect(photoSource('нет-такого')).toBeNull();
  expect(photoSourceSet('нет-такого')).toBeNull();
});
