/**
 * Добавляет на карту невидимые цели нажатия для регионов, которые меньше
 * порога WCAG 2.2 (2.5.8). Контуры не меняются: география остаётся честной,
 * увеличивается только область, принимающая нажатие.
 *
 * Цель ставится в центр наибольшей вписанной окружности региона и заходит на
 * территорию соседа. Это осознанный размен: у Шанхая под палец есть 12.5 px,
 * у соседней Цзянсу — 38.5, и потеря диска в 24 px ей ничего не стоит. Тот,
 * кто целится в Шанхай, хочет Шанхай.
 *
 * Цели помечены `data-hit-region-id`, а не `data-region-id`: доступное имя,
 * фокус и состояния остаются на самом контуре, поэтому в дереве доступности и
 * в обходе по Tab регион по-прежнему один.
 *
 * Скрипт идемпотентен: блок ограничен комментариями-метками.
 *
 * Запуск: npx tsx scripts/generate-hit-targets.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { CALLOUT_TARGETS } from '../src/map/callout-targets';
import { REGION_PALETTE } from '../src/map/region-palette';
import {
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  pixelsToUnits,
  undersizedRegions,
} from '../src/map/target-size';

const MAP_FILE = 'public/maps/china-provinces.svg';
const BLOCK_START = '<!-- hit-targets:start -->';
const BLOCK_END = '<!-- hit-targets:end -->';

const svg = readFileSync(MAP_FILE, 'utf8');

/**
 * Регионы, вынесенные маркерами, здесь не нужны: цель нажатия у них — сам
 * маркер радиусом MARKER_RADIUS, а исходный контур уже декоративный. Круг на
 * их прежнем месте не помог бы, а только отобрал бы нажатия у Гуандуна.
 */
const calloutIds = new Set(CALLOUT_TARGETS.map((target) => target.regionId));
const interactiveIds = [...svg.matchAll(/data-region-id="([^"]+)"/g)]
  .map(([, id]) => id)
  .filter((id) => REGION_PALETTE[id] !== undefined && !calloutIds.has(id));

const targetUnits = pixelsToUnits(MIN_TARGET_PX, REFERENCE_MAP_WIDTH);
const undersized = undersizedRegions(
  interactiveIds,
  REFERENCE_MAP_WIDTH,
  MIN_TARGET_PX,
);

const circles = undersized.map(({ regionId }) => {
  const [x, y] = REGION_PALETTE[regionId].label;

  return `\t\t<circle class="map-hit" data-hit-region-id="${regionId}" cx="${x}" cy="${y}" r="${(
    targetUnits / 2
  ).toFixed(2)}" fill="transparent" aria-hidden="true" />`;
});

const block = [
  `\t${BLOCK_START}`,
  '\t<g class="map-hit-targets">',
  ...circles,
  '\t</g>',
  `\t${BLOCK_END}`,
  '',
].join('\n');

const existing = new RegExp(`\\t?${BLOCK_START}.*?${BLOCK_END}\\n`, 's');
const updated = existing.test(svg)
  ? svg.replace(existing, () => block)
  : svg.replace('</svg>', `${block}</svg>`);

writeFileSync(MAP_FILE, updated);
console.info(
  `Целей нажатия добавлено: ${undersized.length} (${undersized
    .map((region) => `${region.regionId} ${region.availablePx.toFixed(1)}px`)
    .join(', ')})`,
);
