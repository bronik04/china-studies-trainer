import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { MAP_VIEW_BOX } from './projection';
import { REGION_PALETTE } from './region-palette';
import {
  CALLOUT_TARGETS,
  LABEL_DESCENDER,
  LABEL_OFFSET,
  MARKER_RADIUS,
} from './callout-targets';
import {
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  unitsToPixels,
} from './target-size';

type Target = { readonly regionId: string; readonly targetPx: number };

/**
 * Сколько места под палец у каждой из 34 областей на опорной ширине карты.
 *
 * Мера — диаметр наибольшей вписанной окружности, а не габарит контура
 * (решение от 2026-08-03): у Ганьсу габарит 162 единицы, а сама область —
 * узкий коридор, и габаритная мера пропускала пять таких. Прежде этот файл
 * мерил именно габаритом, и порог у него стоял вдвое ниже настоящего —
 * проверка проходила, ничего не проверяя.
 *
 * Цель у области может быть не одна: у Пекина, Тяньцзиня, Шанхая и Тайваня к
 * контуру добавлен невидимый круг, у Макао и Гонконга — маркер выноски.
 * Берётся наибольшая: рука целится в ту, которая крупнее.
 */
function interactiveTargets(): Target[] {
  const units = new Map<string, number>();

  for (const [regionId, entry] of Object.entries(REGION_PALETTE)) {
    units.set(regionId, entry.inscribedDiameter);
  }

  for (const element of mapMarkup.match(/<circle\s[^>]*>/gs) ?? []) {
    const regionId =
      /data-region-id="([^"]+)"/.exec(element)?.[1] ??
      /data-hit-region-id="([^"]+)"/.exec(element)?.[1];
    const radius = Number(/\sr="([\d.]+)"/.exec(element)?.[1]);

    if (regionId === undefined || !Number.isFinite(radius)) {
      continue;
    }

    units.set(regionId, Math.max(units.get(regionId) ?? 0, radius * 2));
  }

  return [...units].map(([regionId, diameter]) => ({
    regionId,
    targetPx: unitsToPixels(diameter, REFERENCE_MAP_WIDTH),
  }));
}

it('оставляет ровно 34 выбираемых области', () => {
  const ids = interactiveTargets().map((target) => target.regionId);

  expect(new Set(ids).size).toBe(34);
  expect(ids).toHaveLength(34);
});

it('делает каждую область достаточно крупной для выбора указателем', () => {
  const tooSmall = interactiveTargets()
    .filter((target) => target.targetPx < MIN_TARGET_PX)
    .map((target) => `${target.regionId}: ${target.targetPx.toFixed(1)} px`);

  expect(tooSmall).toEqual([]);
});

it('выносит Макао и Гонконг маркерами нужного размера', () => {
  for (const target of CALLOUT_TARGETS) {
    const marker = new RegExp(
      `<circle[^>]*data-region-id="${target.regionId}"[^>]*>`,
      's',
    ).exec(mapMarkup);

    expect(marker, `нет маркера для ${target.regionId}`).not.toBeNull();
    expect(marker?.[0]).toContain(`r="${MARKER_RADIUS}"`);
    expect(marker?.[0]).toContain('role="button"');
    expect(marker?.[0]).toContain(`aria-label="${target.label}"`);
  }
});

it('умещает маркер вместе с подписью внутри карты', () => {
  for (const target of CALLOUT_TARGETS) {
    const [markerX, markerY] = target.marker;

    expect(markerX - MARKER_RADIUS, `${target.regionId} выходит слева`).toBeGreaterThanOrEqual(0);
    expect(markerX + MARKER_RADIUS, `${target.regionId} выходит справа`).toBeLessThanOrEqual(
      MAP_VIEW_BOX.width,
    );
    expect(markerY - MARKER_RADIUS, `${target.regionId} выходит сверху`).toBeGreaterThanOrEqual(0);
    expect(
      markerY + LABEL_OFFSET + LABEL_DESCENDER,
      `подпись ${target.regionId} обрезается нижним краем`,
    ).toBeLessThanOrEqual(MAP_VIEW_BOX.height);
  }
});

it('делает вынесенные контуры декоративными', () => {
  for (const target of CALLOUT_TARGETS) {
    const path = new RegExp(`<path[^>]*\\bid="${target.regionId}"[^>]*>`, 's').exec(
      mapMarkup,
    );

    expect(path?.[0]).toContain('aria-hidden="true"');
    expect(path?.[0]).not.toContain('tabindex');
    expect(path?.[0]).not.toContain('data-region-id');
  }
});

/** Генератор запускается повторно, поэтому атрибуты не должны накапливаться. */
it('не задваивает атрибуты при повторном запуске генератора', () => {
  for (const target of CALLOUT_TARGETS) {
    const path = new RegExp(`<path[^>]*\\bid="${target.regionId}"[^>]*>`, 's').exec(
      mapMarkup,
    );

    expect(path?.[0].match(/aria-hidden=/g), target.regionId).toHaveLength(1);
    expect(path?.[0].match(/pointer-events=/g), target.regionId).toHaveLength(1);
  }
});
