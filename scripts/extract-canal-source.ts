/**
 * Выжимка из OpenStreetMap для линий каналов.
 *
 * Канала нет в Natural Earth — проверено, среди 1455 линий рек есть Суэцкий и
 * Панамский, но не 京杭大运河 (`DECISIONS.md`, 2026-09-08). Линия берётся из
 * OpenStreetMap вместе с обязательствами ODbL: выжимка — производная база
 * данных, поэтому она лежит отдельным файлом, а не подмешана в выжимку
 * Natural Earth, и несёт в себе лицензию и указание авторства.
 *
 * Почему API OSM, а не Overpass. Отношение целиком — участки, точки и роли —
 * приходит одним запросом `relation/{id}/full`, без языка запросов. Overpass
 * при подготовке плана (2026-10-13) отвечал отказом по перегрузке.
 *
 * Берётся только роль `main_stream`. Боковые рукава — не основной
 * Пекин-Ханчжоуский канал, а у отношения есть и участок без роли — это река
 * Давэньхэ, а не канал.
 *
 * Нужна сеть. В сборку не входит. Запуск: npm run extract:canal
 */
import { writeFileSync } from 'node:fs';
import { CANAL_RELATIONS } from './data/canal-relations';

/* Только ASCII: заголовок запроса кириллицу не принимает. */
const AGENT =
  'podnebesnaya/0.3.0 (educational; https://github.com/bronik04/podnebesnaya)';
const API = 'https://api.openstreetmap.org/api/0.6';
const OUT = new URL('data/canal-source.json', import.meta.url);
const PRECISION = 5;
const ROLE = 'main_stream';

type OsmNode = { type: 'node'; id: number; lon: number; lat: number };
type OsmWay = { type: 'way'; id: number; nodes: number[] };
type OsmRelation = {
  type: 'relation';
  id: number;
  version: number;
  timestamp: string;
  tags?: Record<string, string>;
  members: { type: string; ref: number; role: string }[];
};
type OsmElement = OsmNode | OsmWay | OsmRelation;

const round = (value: number) => Number(value.toFixed(PRECISION));

async function load(featureId: string, relation: number) {
  const response = await fetch(`${API}/relation/${relation}/full.json`, {
    headers: { 'User-Agent': AGENT },
  });
  if (!response.ok) {
    throw new Error(`Отношение ${relation}: ${response.status} ${response.statusText}`);
  }

  const { elements } = (await response.json()) as { elements: OsmElement[] };
  const nodes = new Map(
    elements
      .filter((item): item is OsmNode => item.type === 'node')
      .map((node) => [node.id, node]),
  );
  const ways = new Map(
    elements
      .filter((item): item is OsmWay => item.type === 'way')
      .map((way) => [way.id, way]),
  );
  const head = elements.find(
    (item): item is OsmRelation => item.type === 'relation' && item.id === relation,
  );
  if (head === undefined) {
    throw new Error(`В ответе нет самого отношения ${relation}`);
  }

  const refs = head.members
    .filter((member) => member.type === 'way' && member.role === ROLE)
    .map((member) => member.ref);
  if (refs.length === 0) {
    throw new Error(`У отношения ${relation} нет участков с ролью ${ROLE}`);
  }

  const lines = refs.map((ref) => {
    const way = ways.get(ref);
    if (way === undefined) {
      throw new Error(`Участка ${ref} нет в ответе на отношение ${relation}`);
    }

    return way.nodes.map((id): [number, number] => {
      const node = nodes.get(id);
      if (node === undefined) {
        throw new Error(`Точки ${id} участка ${ref} нет в ответе`);
      }

      return [round(node.lon), round(node.lat)];
    });
  });

  console.info(
    `${head.tags?.name ?? relation}: участков ${refs.length} из ${head.members.length}, ` +
      `точек ${lines.reduce((n, line) => n + line.length, 0)}, версия ${head.version}`,
  );

  return {
    featureId,
    relation,
    version: head.version,
    timestamp: head.timestamp,
    name: head.tags?.name ?? '',
    ways: lines,
  };
}

const canals = [];
for (const [featureId, relation] of Object.entries(CANAL_RELATIONS)) {
  canals.push(await load(featureId, relation));
}

/*
 * Запись компактная, как у выжимки Natural Earth: семь тысяч точек с отступом
 * дают десятки тысяч строк, читать которые некому.
 */
writeFileSync(
  OUT,
  `${JSON.stringify({
    generatedBy: 'scripts/extract-canal-source.ts (npm run extract:canal) — не править руками',
    license: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors',
    extractedAt: new Date().toISOString().slice(0, 10),
    canals,
  })}\n`,
);
