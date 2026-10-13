import { expect, it } from 'vitest';
import { photoSource, photoSourceSet } from './photo-source';

it('отдаёт самый широкий файл, какой есть', () => {
  expect(photoSource('badaling')).toBe('/photos/badaling-1200.webp');
});

it('обходится единственной шириной, когда другой нет', () => {
  expect(photoSource('feature-qinghai-lake')).toBe(
    '/photos/feature-qinghai-lake-640.webp',
  );
});

it('перечисляет в наборе все доступные ширины', () => {
  expect(photoSourceSet('badaling')).toBe(
    '/photos/badaling-1200.webp 1200w, /photos/badaling-640.webp 640w',
  );
});

it('в наборе из одной ширины обходится без запятой', () => {
  expect(photoSourceSet('feature-qinghai-lake')).toBe(
    '/photos/feature-qinghai-lake-640.webp 640w',
  );
});

it('о незнакомом снимке молчит обеими функциями', () => {
  expect(photoSource('нет-такого')).toBeNull();
  expect(photoSourceSet('нет-такого')).toBeNull();
});
