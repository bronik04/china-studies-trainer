/**
 * Добавляет в карту выноски для регионов, которые невозможно нажать, и
 * снимает интерактивность с их исходных контуров.
 *
 * С контура снимаются только интерактивные атрибуты: `data-region-id`,
 * `tabindex`, `role` и `aria-label`. `data-region-kind` остаётся — контур
 * по-прежнему описывает территорию, просто перестаёт быть целью выбора.
 *
 * Скрипт идемпотентен: блок выносок ограничен комментариями-метками и при
 * повторном запуске заменяется целиком.
 *
 * Запуск: npx tsx scripts/generate-callouts.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  CALLOUT_TARGETS,
  LABEL_OFFSET,
  MARKER_RADIUS,
  type CalloutTarget,
} from '../src/map/callout-targets';

const MAP_FILE = 'public/maps/china-provinces.svg';
const BLOCK_START = '<!-- callouts:start -->';
const BLOCK_END = '<!-- callouts:end -->';

function makeDecorative(svg: string, regionId: string): string {
  const pattern = new RegExp(`<path\\s[^>]*\\bid="${regionId}"[^>]*>`, 's');
  const match = pattern.exec(svg);
  if (!match) {
    throw new Error(`В карте нет области: ${regionId}`);
  }

  const cleaned = match[0]
    // `aria-hidden` и `pointer-events` снимаются вместе с остальными, чтобы
    // повторный прогон не дописывал их второй раз.
    .replace(
      /\s(data-region-id|tabindex|role|aria-label|aria-hidden|pointer-events)="[^"]*"/g,
      '',
    )
    .replace('<path', '<path aria-hidden="true" pointer-events="none"')
    // Удаление атрибутов оставляет за собой пустые строки и висячие пробелы,
    // на которые ругается `git diff --check`.
    .replace(/[ \t]+$/gm, '')
    .replace(/\n\s*\n/g, '\n');

  return svg.replace(match[0], () => cleaned);
}

function renderCallout(target: CalloutTarget): string {
  const [anchorX, anchorY] = target.anchor;
  const [markerX, markerY] = target.marker;

  return [
    '\t<g class="map-callout">',
    `\t\t<line x1="${anchorX}" y1="${anchorY}" x2="${markerX}" y2="${markerY}" aria-hidden="true" pointer-events="none" />`,
    `\t\t<circle id="callout-${target.regionId}" data-region-id="${target.regionId}" data-region-kind="${target.regionKind}" cx="${markerX}" cy="${markerY}" r="${MARKER_RADIUS}" tabindex="0" role="button" aria-label="${target.label}" />`,
    `\t\t<text x="${markerX}" y="${markerY + LABEL_OFFSET}" text-anchor="middle" aria-hidden="true" pointer-events="none">${target.shortLabel}</text>`,
    '\t</g>',
  ].join('\n');
}

let svg = readFileSync(MAP_FILE, 'utf8');

for (const target of CALLOUT_TARGETS) {
  svg = makeDecorative(svg, target.regionId);
}

const block = [
  `\t${BLOCK_START}`,
  ...CALLOUT_TARGETS.map(renderCallout),
  `\t${BLOCK_END}`,
  '',
].join('\n');

const existing = new RegExp(`\\t?${BLOCK_START}.*?${BLOCK_END}\\n`, 's');
svg = existing.test(svg)
  ? svg.replace(existing, () => block)
  : svg.replace('</svg>', `${block}</svg>`);

writeFileSync(MAP_FILE, svg);
console.info(`Добавлено выносок: ${CALLOUT_TARGETS.length}`);
