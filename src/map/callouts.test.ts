import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { boundingBox, parseMapPath } from './svg-path';
import { MAP_VIEW_BOX } from './projection';
import {
  CALLOUT_TARGETS,
  LABEL_DESCENDER,
  LABEL_OFFSET,
  MARKER_RADIUS,
  MIN_TARGET_UNITS,
} from './callout-targets';

type Target = { readonly regionId: string; readonly minSide: number };

function interactiveTargets(): Target[] {
  const targets: Target[] = [];

  for (const element of mapMarkup.match(/<(path|circle)\s[^>]*>/gs) ?? []) {
    const regionId = /data-region-id="([^"]+)"/.exec(element)?.[1];
    if (!regionId) {
      continue;
    }

    const pathData = /\sd="([^"]+)"/.exec(element)?.[1];
    if (pathData) {
      const box = boundingBox(parseMapPath(pathData));
      targets.push({
        regionId,
        minSide: Math.min(box.maxX - box.minX, box.maxY - box.minY),
      });
      continue;
    }

    const radius = Number(/\sr="([\d.]+)"/.exec(element)?.[1]);
    targets.push({ regionId, minSide: radius * 2 });
  }

  return targets;
}

it('оставляет ровно 34 выбираемых области', () => {
  const ids = interactiveTargets().map((target) => target.regionId);

  expect(new Set(ids).size).toBe(34);
  expect(ids).toHaveLength(34);
});

it('делает каждую область достаточно крупной для выбора указателем', () => {
  const tooSmall = interactiveTargets().filter(
    (target) => target.minSide < MIN_TARGET_UNITS,
  );

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
