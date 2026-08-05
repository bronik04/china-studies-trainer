import { cities } from '../content/cities';
import { CITY_POINTS, cityPoint } from './city-points';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from './target-size';

it('переводит каждый город каталога и ни одного лишнего', () => {
  expect(CITY_POINTS).toHaveLength(cities.length);
  expect(CITY_POINTS.map((point) => point.city.id).sort()).toEqual(
    cities.map((city) => city.id).sort(),
  );
});

it('держит все точки внутри поля карты', () => {
  for (const point of CITY_POINTS) {
    expect(point.x, point.city.id).toBeGreaterThanOrEqual(MAP_VIEWBOX_MIN_X);
    expect(point.x, point.city.id).toBeLessThanOrEqual(
      MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
    );
    expect(point.y, point.city.id).toBeGreaterThanOrEqual(MAP_VIEWBOX_MIN_Y);
    expect(point.y, point.city.id).toBeLessThanOrEqual(
      MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
    );
  }
});

/*
 * Подмену осей и потерянный знак ловит порядок, а не расстояние: восточнее
 * значит правее, севернее значит выше. Расстояние до точки подписи региона
 * для этого не годится — у Ганьсу вписанная окружность лежит на западе
 * коридора, а Ланьчжоу на его юго-восточном конце, и 118 единиц между ними
 * ничего не означают.
 *
 * Что город стоит в своём регионе, проверяет `validate:map` по самой
 * геометрии карты.
 */
it('сохраняет порядок городов с востока на запад и с севера на юг', () => {
  const byLon = [...CITY_POINTS].sort((a, b) => a.city.lon - b.city.lon);
  const byLat = [...CITY_POINTS].sort((a, b) => b.city.lat - a.city.lat);

  expect(byLon.map((point) => point.city.id)).toEqual(
    [...CITY_POINTS].sort((a, b) => a.x - b.x).map((point) => point.city.id),
  );
  expect(byLat.map((point) => point.city.id)).toEqual(
    [...CITY_POINTS].sort((a, b) => a.y - b.y).map((point) => point.city.id),
  );
});

it('находит точку по идентификатору города', () => {
  expect(cityPoint('chengdu')?.city.nameRu).toBe('Чэнду');
  expect(cityPoint('атлантида')).toBeUndefined();
});
