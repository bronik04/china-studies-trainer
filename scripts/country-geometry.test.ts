import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { countries } from '../src/content/countries';
import { COUNTRY_SHAPES, DISPUTED_SHAPES } from '../src/map/country-geometry';
import { parseMapPath } from '../src/map/svg-path';
import {
  COUNTRY_FRAME_OUTSET,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  unitsToPixels,
} from '../src/map/target-size';
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

it('мельче порога нажатия остаётся один Бутан', () => {
  /*
   * Мера — диаметр наибольшей вписанной окружности, как у регионов, а счёт
   * идёт по расширенному кадру: в него влезает в 1.3 раза больше единиц, и та
   * же страна на экране во столько же раз мельче. По обычному кадру проверка
   * говорила бы, что порог берут все.
   *
   * Бутан не берёт его и на широком кадре — 20.8 px против 24, — и это не
   * дефект карты, а его размер: он отвечается из равнозначного списка, как
   * Гонконг и Макао. Проверка сторожит, чтобы таких стран не стало больше.
   */
  const small = COUNTRY_SHAPES.filter(
    (shape) =>
      unitsToPixels(shape.diameter, REFERENCE_MAP_WIDTH, COUNTRY_FRAME_OUTSET) <
      MIN_TARGET_PX,
  );

  expect(small.map((shape) => shape.id)).toEqual(['bhutan']);
});

/*
 * Справочник стран выписан руками, а имена в нём — из выжимки. Два списка
 * одного и того же расходятся молча: правка в выжимке не тронет справочник, и
 * на карте останется имя, которого источник больше не говорит.
 */
it('имена справочника — те же, что в выжимке', () => {
  const source = JSON.parse(
    readFileSync('scripts/data/countries-source.json', 'utf8'),
  ) as {
    readonly countries: readonly {
      readonly id: string;
      readonly nameRu: string;
      readonly nameZh: string;
    }[];
  };

  for (const country of countries) {
    const extracted = source.countries.find((one) => one.id === country.id);

    expect({ id: country.id, ru: country.nameRu, zh: country.nameZh }).toEqual({
      id: country.id,
      ru: extracted?.nameRu,
      zh: extracted?.nameZh,
    });
  }
});

it('знает спорные участки и подписывает их словами источника', () => {
  expect(DISPUTED_SHAPES.length).toBeGreaterThanOrEqual(9);

  const aksai = DISPUTED_SHAPES.find((shape) => shape.id === 'aksai-chin');

  expect(aksai?.nameRu).toBe('Аксайчин');
  expect(aksai?.note).toMatch(/China/);
});
