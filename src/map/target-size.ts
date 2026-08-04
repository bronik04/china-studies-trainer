/**
 * Размер цели нажатия на карте.
 *
 * Габариты контура для этого не годятся: у Ганьсу габарит 162 единицы, а сама
 * область — узкий коридор. Мерой служит диаметр наибольшей вписанной
 * окружности (см. `largestInscribedCircle`) — сколько места реально есть под
 * палец.
 */
import { REGION_PALETTE } from './region-palette';

/**
 * Поле вокруг рисунка. Обводка рисуется по центру контура и при наведении
 * уходит наружу на 0.8 единицы; без поля край viewBox срезал бы её у крайних
 * регионов, а граница — главная информация на карте (MAP_SPEC.md).
 *
 * Геометрия при этом не двигается: рамка растёт наружу, координаты путей,
 * выносок, целей нажатия и палитры остаются прежними.
 */
export const MAP_VIEWBOX_MIN_X = -16;
export const MAP_VIEWBOX_MIN_Y = -16;

/** Ширина viewBox карты: 774 единицы рисунка плюс поле с двух сторон. */
export const MAP_VIEWBOX_WIDTH = 806;

/** Высота viewBox карты. Из пары с шириной берётся пропорция `--map-aspect`. */
export const MAP_VIEWBOX_HEIGHT = 601;

/**
 * Опорная ширина карты: `.app-shell` ограничен 1120 px, карта занимает его
 * целиком. На этой ширине карта — основной способ ответа, и порог обязателен.
 */
export const REFERENCE_MAP_WIDTH = 1120;

/** Минимум WCAG 2.2 AA (2.5.8 Target Size, Minimum). */
export const MIN_TARGET_PX = 24;

/** Цель, к которой стоит стремиться (2.5.5 Target Size, AAA). */
export const COMFORTABLE_TARGET_PX = 44;

export function unitsToPixels(units: number, mapWidth: number): number {
  return (units * mapWidth) / MAP_VIEWBOX_WIDTH;
}

export function pixelsToUnits(pixels: number, mapWidth: number): number {
  return (pixels * MAP_VIEWBOX_WIDTH) / mapWidth;
}

export type UndersizedRegion = {
  readonly regionId: string;
  readonly availablePx: number;
};

/**
 * Регионы, чья собственная геометрия меньше порога на заданной ширине карты.
 * Им нужна отдельная цель нажатия — сам контур остаётся географически честным.
 */
export function undersizedRegions(
  regionIds: readonly string[],
  mapWidth: number,
  minTargetPx: number,
): readonly UndersizedRegion[] {
  return regionIds
    .flatMap((regionId) => {
      const entry = REGION_PALETTE[regionId];
      if (entry === undefined) {
        return [];
      }

      const availablePx = unitsToPixels(entry.inscribedDiameter, mapWidth);

      return availablePx < minTargetPx ? [{ regionId, availablePx }] : [];
    })
    .sort((left, right) => left.availablePx - right.availablePx);
}
