import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { countries } from '../src/content/countries';
import { COUNTRY_SHAPES, DISPUTED_SHAPES } from '../src/map/country-geometry';
import { parseMapPath } from '../src/map/svg-path';
import { regionContours } from './palette-fingerprint';

it('рисует все четырнадцать стран', () => {
  expect(COUNTRY_SHAPES.map((shape) => shape.id).sort()).toEqual(
    countries.map((country) => country.id).sort(),
  );
});

it('каждая страна подходит к границе Китая вплотную', () => {
  const svg = readFileSync('public/maps/china-provinces.svg', 'utf8');
  /*
   * Каждая третья вершина: контуров Китая около десяти тысяч точек, а проверка
   * квадратична. Прореживание меняет замер на сотые доли, а порог здесь — двойка.
   */
  const china = regionContours(svg)
    .flatMap((contour) => parseMapPath(contour.d).flat())
    .filter((_, index) => index % 3 === 0);

  for (const shape of COUNTRY_SHAPES) {
    const points = parseMapPath(shape.d).flat();
    let best = Infinity;
    for (const [x, y] of points) {
      for (const [cx, cy] of china) {
        best = Math.min(best, Math.hypot(x - cx, y - cy));
      }
    }

    /*
     * Замерено на исходных данных: у всех четырнадцати соседей меньше 0.5, у
     * ближайшего не-соседа (Бангладеш) — 11.8. Порог посередине: если проверка
     * упала, слой собран не из тех данных, а не «немного разъехался».
     */
    expect({ id: shape.id, near: best < 2 }).toEqual({ id: shape.id, near: true });
  }
});

it('у каждой страны есть место для подписи внутри кадра', () => {
  for (const shape of COUNTRY_SHAPES) {
    const [x, y] = shape.label;

    expect(x).toBeGreaterThan(-16);
    expect(x).toBeLessThan(790);
    expect(y).toBeGreaterThan(-16);
    expect(y).toBeLessThan(585);
    expect(shape.diameter).toBeGreaterThan(0);
  }
});

it('знает спорные участки и подписывает их словами источника', () => {
  expect(DISPUTED_SHAPES.length).toBeGreaterThanOrEqual(9);

  const aksai = DISPUTED_SHAPES.find((shape) => shape.id === 'aksai-chin');

  expect(aksai?.nameRu).toBe('Аксайчин');
  expect(aksai?.note).toMatch(/China/);
});
