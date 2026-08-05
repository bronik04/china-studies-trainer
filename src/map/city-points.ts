import { cities } from '../content/cities';
import type { City } from '../content/types';
import { projectLonLat } from './projection';

/**
 * Точки городов в координатах карты.
 *
 * Каталог хранит градусы, карта рисует единицы viewBox, и перевод живёт
 * здесь — на границе между ними, рядом с самой проекцией.
 *
 * Файл не сгенерирован, в отличие от `region-palette.ts` и контура Тайваня.
 * Тем нужен генератор, потому что их значения нельзя получить без разбора
 * SVG; здесь же всё считает `projectLonLat` — чистая функция из трёх строк.
 * Сгенерированный файл добавил бы единственное, чего тут нет: возможность
 * забыть его перегенерировать и разойтись с каталогом.
 */

export type CityPoint = {
  readonly city: City;
  readonly x: number;
  readonly y: number;
};

function pointOf(city: City): CityPoint {
  const [x, y] = projectLonLat(city.lon, city.lat);

  return { city, x, y };
}

export const CITY_POINTS: readonly CityPoint[] = cities.map(pointOf);

const BY_ID = new Map(CITY_POINTS.map((point) => [point.city.id, point]));

export function cityPoint(cityId: string): CityPoint | undefined {
  return BY_ID.get(cityId);
}
