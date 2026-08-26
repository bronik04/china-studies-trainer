/**
 * Выжимка высот для физической карты.
 *
 * Источник — ETOPO1 Global Relief Model (NOAA NCEI, public domain), отдаётся
 * сервером ERDDAP в CSV по прямоугольнику координат. Полная модель весит
 * гигабайты и в репозиторий не кладётся; берётся сетка 0.1° по области, в
 * которую Китай входит с запасом.
 *
 * Нужна сеть. В сборку не входит: во время сборки и во время раунда проект
 * сетевых запросов не делает.
 *
 * Запуск: npm run extract:relief
 */
import { writeFileSync } from 'node:fs';

const OUT = new URL('data/relief-source.json', import.meta.url);

/** Область с запасом вокруг Китая: сам он лежит в 73.5–135° в. д., 18–53.6° с. ш. */
const LAT0 = 15;
const LAT1 = 55;
const LON0 = 72;
const LON1 = 137;
const STEP = 0.1;

/** Шаг сетки ETOPO1 — одна угловая минута; 0.1° это каждая шестая точка. */
const STRIDE = 6;

const ROWS = Math.round((LAT1 - LAT0) / STEP) + 1;
const COLS = Math.round((LON1 - LON0) / STEP) + 1;

const REQUEST =
  'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv' +
  `?altitude%5B(${LAT0}):${STRIDE}:(${LAT1})%5D%5B(${LON0}):${STRIDE}:(${LON1})%5D`;

const response = await fetch(REQUEST);
if (!response.ok) {
  throw new Error(`ETOPO1: ${response.status} ${response.statusText}`);
}

const text = await response.text();

/*
 * Сетка заполняется по координатам из самого ответа, а не по порядку строк:
 * порядок сервер не обещает, а промах на одну строку сдвинул бы весь рельеф на
 * десять километров — и выглядело бы это правдоподобно.
 */
const altitude = new Array<number | null>(ROWS * COLS).fill(null);
const lines = text.split('\n');

for (let index = 2; index < lines.length; index += 1) {
  const line = lines[index];
  if (line.length === 0) continue;

  const [latText, lonText, altText] = line.split(',');
  const row = Math.round((Number(latText) - LAT0) / STEP);
  const col = Math.round((Number(lonText) - LON0) / STEP);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

  altitude[row * COLS + col] = Math.round(Number(altText));
}

const holes = altitude.filter((value) => value === null).length;
if (holes > 0) {
  throw new Error(
    `В сетке ${holes} пустых узлов из ${ROWS * COLS}. Ответ ERDDAP неполон, ` +
      'повторите запуск',
  );
}

/*
 * Пометка первым ключом: комментариев в JSON нет, а сказать «руками не
 * править» файл обязан сам — иначе правку в нём потеряет первый же запуск.
 */
writeFileSync(
  OUT,
  `${JSON.stringify({
    generatedBy:
      'scripts/extract-relief-source.ts (npm run extract:relief) — не править руками',
    source: 'ETOPO1 Global Relief Model, NOAA NCEI, public domain',
    lat0: LAT0,
    lon0: LON0,
    step: STEP,
    rows: ROWS,
    cols: COLS,
    altitude,
  })}\n`,
);

console.info(`Выжимка высот записана: узлов ${ROWS * COLS} (${ROWS}×${COLS})`);
