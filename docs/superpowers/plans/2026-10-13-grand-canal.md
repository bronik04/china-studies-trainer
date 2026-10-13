# Великий канал — план реализации

> **Исполнителю-агенту:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК — `superpowers:executing-plans`
> (`superpowers:subagent-driven-development` только после явного разрешения
> владельца продукта: `AGENTS.md`, «Ветвление и ревью»). Шаги размечены
> флажками `- [ ]`.

**Цель:** Великий канал (京杭大运河) становится сорок первой целью физической
карты — линией, которая спрашивается в «Найти объект» и «Назвать объект», с
карточкой в атласе и страницей в коллекциях.

**Замысел:** линия берётся из OpenStreetMap отдельной выжимкой под ODbL
(`scripts/data/canal-source.json`), собирается генератором физической геометрии
из участков тем же `chainPieces`, что реки, и ложится в общий `WATER_LINES`:
рисуется, обходится с клавиатуры и попадает в цель так же, как река. Новый род
`canal` входит в семью линий — отвлекают его реки.

**Технологии:** TypeScript, React 19, Vite 8, vitest; генераторы на `tsx`;
API OpenStreetMap 0.6.

**Спецификация:** `docs/superpowers/specs/2026-09-08-three-gorges-and-grand-canal-design.md`
(этап 2; этап 1 — Три ущелья — слит 2026-10-13).

## Что выяснено при подготовке плана (2026-10-13)

Проверено на живых данных, а не по спецификации:

- Отношение OSM **1112801** существует: `name=京杭大运河`, `waterway=canal`,
  `wikidata=Q21042913`, версия 115 от 2026-10-07. Участков 170: 141 с ролью
  `main_stream`, 28 `side_stream` и **один без роли — это река Давэньхэ
  (大汶河)**, не канал. В линию идёт только `main_stream`.
- Overpass API в день проверки отвечал отказом по перегрузке. API OSM
  `relation/1112801/full.json` отдал всё одним ответом (1,5 МБ, 8030 точек) —
  им и пользуемся.
- Основное русло **не сшивается в одну цепь**: в OSM у канала нет звеньев
  через Хуанхэ. `chainPieces` с допуском 0.01° даёт четыре цепи: северную
  (5637 точек, Пекин → 116.20, 36.10), южную (1727 точек, 116.20, 36.00 →
  Ханчжоу) и два обрывка в 2 и 6 точек. Разрыв между северной и южной —
  0.104°, около 11,5 км. Увеличение допуска до 0.1° разрыв не закрывает.
- После упрощения с допуском генератора (1 единица) у каждой из двух цепей по
  14 точек.

## Решения, принятые при подготовке плана

Каждое расходится со спецификацией или дополняет её. Всё это записывается в
`DECISIONS.md` (задача 5).

1. **API OSM вместо Overpass.** Отношение целиком приходит одним запросом без
   языка запросов, а Overpass оказался ненадёжен.
2. **Только роль `main_stream`.** Боковые рукава — не «основной
   Пекин-Ханчжоуский канал» (раздел 10 спецификации), а безрольный участок —
   вообще река.
3. **Линия из двух кусков.** Разрыв у Хуанхэ настоящий, и рисовать мост,
   которого нет в данных, карта не будет. `WaterLine` уже допускает несколько
   кусков: так рисуются реки, разрезанные рамкой.
4. **Допуск упрощения — тот же, что у рек (`SIMPLIFY_TOLERANCE_UNITS = 1`).**
   Спецификация говорит «тем же допуском 0.4, что и реки»; число в ней устарело,
   смысл — «как у рек».
5. **Номер отношения живёт в `scripts/data/canal-relations.ts`, а не в
   справочнике.** Тот же довод, что у концов ущелий: справочник не знает
   источников геометрии, а генератор и отпечаток читают входы из
   `scripts/data`.
6. **У канала будет снимок на странице коллекции.** Ревью Трёх ущелий
   отметило, что страница без снимка — недоделка; снимок выбирает владелец по
   картинке (задача 6).

## Общие ограничения

- Ветка — `feat/grand-canal`, создана от `master`. В `master` напрямую не
  писать (`AGENTS.md`).
- Интерфейс, задания, ошибки, комментарии в коде — по-русски; китайские
  названия в Unicode, не только пиньинем.
- Геоданные и тексты имеют источник в `docs/sources`; у каждого факта —
  источник из `src/content/sources.ts`, у цели 2–3 факта.
- Сгенерированные файлы (`src/map/physical-geometry.ts`,
  `src/content/photo-credits.ts`, `scripts/data/*-source.json`,
  подмножества шрифтов) правятся только своими генераторами.
- Домен не зовёт `Math.random`; компоненты не трогают `localStorage`; карта не
  считает правильность ответа.
- Во время раунда сетевых запросов нет. Сеть нужна только извлекателю
  (`npm run extract:canal`) и `npm run fetch:photos`; в сборку они не входят.
- Новый иероглиф обязан попасть в подмножество шрифта: после правки
  справочника — `npm run generate:fonts`, иначе `validate:fonts` роняет сборку.
- ODbL: выжимка канала — отдельный файл, отделимый от выжимки Natural Earth;
  указание авторства «© участники OpenStreetMap» стоит на экране рядом с картой.
- Каждая задача заканчивается зелёными `npm run lint`, `npm test`,
  `npm run build` и своим коммитом.

## Строение файлов

| Файл | Что делает | Задача |
| --- | --- | --- |
| `scripts/canal-assembly.ts` | создаётся: `assembleCanal` — несколько цепей из участков, отбор обрывков, пределы | 1 |
| `scripts/canal-assembly.test.ts` | создаётся: тесты сборки | 1 |
| `scripts/data/canal-relations.ts` | создаётся: `CANAL_RELATIONS` — номер отношения OSM у канала | 2 |
| `scripts/extract-canal-source.ts` | создаётся: извлекатель из API OSM | 2 |
| `scripts/data/canal-source.json` | создаётся извлекателем: выжимка под ODbL | 2 |
| `scripts/canal-source.test.ts` | создаётся: форма выжимки и лицензия | 2 |
| `package.json` | изменяется: скрипт `extract:canal` | 2 |
| `src/content/types.ts` | изменяется: род `canal` | 3 |
| `src/content/physical-features.ts` | изменяется: подпись «Канал» (3); запись и факты (4) | 3, 4 |
| `src/domain/physical-choices.ts` | изменяется: канал в семье линий | 3 |
| `src/domain/validate-catalog.ts` | изменяется: ветка рода `canal` | 3 |
| `src/map/validate-map.ts` | изменяется: геометрия канала, свободная длина | 3 |
| `scripts/physical-fingerprint.ts` | изменяется: канал и его выжимка в отпечатке | 3 |
| `scripts/physical-fingerprint.test.ts` | создаётся | 3 |
| `scripts/generate-physical-geometry.ts` | изменяется: отпечаток (3), сборка канала и шапка (4) | 3, 4 |
| `scripts/validate-map.ts` | изменяется: отпечаток с выжимкой канала | 3 |
| `src/map/physical-geometry.ts` | перегенерируется | 3, 4 |
| `src/content/sources.ts`, `docs/sources/sources.md` | изменяются: два источника | 4 |
| `src/map/MapAttribution.tsx` (+ тест) | изменяется: строка об OSM | 5 |
| `docs/sources/physical.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md` | изменяются | 5 |
| `scripts/data/collection-photos.json`, `src/content/collections.ts` | изменяются: снимок | 6 |

---

### Задача 1: сборка канала из нескольких цепей

Чистая функция без сети и без файлов. Отвечает на вопрос, который у рек не
вставал: что делать, если участки складываются не в одну линию.

**Файлы:**
- Создать: `scripts/canal-assembly.ts`
- Создать: `scripts/canal-assembly.test.ts`

**Связи:**
- Берёт: `chainPieces(pieces: readonly Piece[], tolerance: number): { chain: Point[]; leftovers: Piece[] }`
  и тип `Piece = readonly Point[]` из `scripts/physical-assembly.ts`; `Point` из
  `src/map/svg-path`. `chainPieces` жадно наращивает одну цепь; кусок из одной
  точки уходит в `leftovers`; при пустом пуле возвращает `chain: []`.
- Отдаёт: `assembleCanal(pieces: readonly Piece[], limits: CanalLimits): CanalAssembly`,
  `type CanalLimits = { joinTolerance; minPartShare; maxParts; maxGap; maxDroppedShare }`
  (все `number`), `type CanalAssembly = { parts: Point[][]; total: number; dropped: number }`.
  На них опирается задача 4.

- [ ] **Шаг 1: написать падающий тест**

Создать `scripts/canal-assembly.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Point } from '../src/map/svg-path';
import { assembleCanal, type CanalLimits } from './canal-assembly';

const LIMITS: CanalLimits = {
  joinTolerance: 0.01,
  minPartShare: 0.05,
  maxParts: 2,
  maxGap: 0.15,
  maxDroppedShare: 0.15,
};

/* Отрезок из n точек вдоль параллели: долгота от `from` с шагом 0.1°. */
function run(from: number, n: number, lat = 0): Point[] {
  return Array.from({ length: n }, (_, i) => [from + i * 0.1, lat] as Point);
}

describe('assembleCanal', () => {
  it('сшивает касающиеся участки в одну цепь', () => {
    const { parts, dropped } = assembleCanal([run(0, 10), run(0.9, 10)], LIMITS);

    expect(parts).toHaveLength(1);
    expect(parts[0]).toHaveLength(19);
    expect(dropped).toBe(0);
  });

  it('оставляет две цепи, если между ними разрыв в пределах', () => {
    /* Первая кончается на 0.9, вторая начинается на 1.0: разрыв 0.1°. */
    const { parts } = assembleCanal([run(0, 10), run(1.0, 10)], LIMITS);

    expect(parts).toHaveLength(2);
  });

  it('отбрасывает обрывок и считает его точки', () => {
    const stub = [
      [50, 50],
      [50.01, 50],
    ] as Point[];
    const { parts, dropped, total } = assembleCanal(
      [run(0, 30), run(2.9, 30), stub],
      LIMITS,
    );

    expect(parts).toHaveLength(1);
    expect(dropped).toBe(2);
    expect(total).toBe(62);
  });

  it('падает, если разрыв между цепями больше предела', () => {
    expect(() => assembleCanal([run(0, 10), run(2, 10)], LIMITS)).toThrow(
      /разрыв/,
    );
  });

  it('падает, если цепей больше предела', () => {
    expect(() =>
      assembleCanal([run(0, 10), run(1.0, 10), run(2.0, 10)], LIMITS),
    ).toThrow(/распался/);
  });

  it('падает, если в обрывки ушло больше допустимой доли', () => {
    const stubs = Array.from(
      { length: 5 },
      (_, i) =>
        [
          [100 + i * 10, 0],
          [100.01 + i * 10, 0],
        ] as Point[],
    );

    /* Порог части поднят: иначе обрывки из двух точек остались бы цепями. */
    expect(() =>
      assembleCanal([run(0, 20), ...stubs], {
        ...LIMITS,
        minPartShare: 0.2,
        maxDroppedShare: 0.1,
      }),
    ).toThrow(/обрывки/);
  });

  it('не зацикливается на одних вырожденных кусках', () => {
    expect(() =>
      assembleCanal(
        [[[0, 0]] as Point[], [[1, 1]] as Point[]],
        LIMITS,
      ),
    ).toThrow(/не собрался/);
  });
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run scripts/canal-assembly.test.ts
```

Ожидается: падение импорта — модуля `./canal-assembly` нет.

- [ ] **Шаг 3: реализовать**

Создать `scripts/canal-assembly.ts`:

```ts
/**
 * Сборка канала из участков OpenStreetMap.
 *
 * Река Natural Earth собирается в одну цепь, и всё не приставшее — ошибка в
 * списке номеров. С каналом иначе: у Великого канала в OSM нет звеньев через
 * Хуанхэ — канал там идёт рекой и озером, — и основное русло распадается на
 * северную и южную цепи с разрывом около 11,5 км. Рисовать мост, которого
 * нет в данных, карта не будет. Поэтому цепей наращивается столько, сколько
 * получится, а потом проверяется, что их немного, что стоят они рядом и что
 * в обрывки ушла малая доля точек: всё остальное значит, что выжимка уже не
 * та, по которой этот код писался.
 */
import type { Point } from '../src/map/svg-path';
import { chainPieces, type Piece } from './physical-assembly';

export type CanalLimits = {
  /** Допуск склейки концов, в градусах. */
  readonly joinTolerance: number;
  /** Цепь короче этой доли всех точек — обрывок, а не часть канала. */
  readonly minPartShare: number;
  /** Сколько цепей позволено оставить. */
  readonly maxParts: number;
  /** Наибольший разрыв между цепями, в градусах. */
  readonly maxGap: number;
  /** Какая доля точек вправе уйти в обрывки. */
  readonly maxDroppedShare: number;
};

export type CanalAssembly = {
  /** Цепи от длинной к короткой. */
  readonly parts: Point[][];
  /** Сколько точек было во всех участках. */
  readonly total: number;
  /** Сколько точек ушло в обрывки и вырожденные куски. */
  readonly dropped: number;
};

function apart(left: Point, right: Point): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

/** Наименьшее расстояние между концами двух цепей. */
function endGap(left: readonly Point[], right: readonly Point[]): number {
  const ends = (chain: readonly Point[]) => [chain[0], chain[chain.length - 1]];

  return Math.min(
    ...ends(left).flatMap((a) => ends(right).map((b) => apart(a, b))),
  );
}

export function assembleCanal(
  pieces: readonly Piece[],
  limits: CanalLimits,
): CanalAssembly {
  const total = pieces.reduce((n, piece) => n + piece.length, 0);
  const chains: { chain: Point[]; points: number }[] = [];
  let rest: readonly Piece[] = pieces;
  let dropped = 0;

  while (rest.length > 0) {
    const { chain, leftovers } = chainPieces(rest, limits.joinTolerance);

    /*
     * Пустая цепь значит, что остались одни вырожденные куски: склеивать
     * нечего, и без выхода здесь цикл крутился бы вечно.
     */
    if (chain.length === 0) {
      dropped += leftovers.reduce((n, piece) => n + piece.length, 0);
      break;
    }

    /*
     * Точки считаются по кускам, а не по цепи: склейка выбрасывает общий
     * конец, и по цепи доля потерь выходила бы завышенной. Разностью, а не
     * сверкой кусков: `chainPieces` возвращает копии, и тождество не
     * сохраняется.
     */
    const count = (list: readonly Piece[]) =>
      list.reduce((n, piece) => n + piece.length, 0);
    const points = count(rest) - count(leftovers);
    chains.push({ chain, points });
    rest = leftovers;
  }

  const kept = chains.filter(({ points }) => points >= total * limits.minPartShare);
  dropped += chains
    .filter((item) => !kept.includes(item))
    .reduce((n, { points }) => n + points, 0);
  const parts = kept
    .sort((left, right) => right.points - left.points)
    .map(({ chain }) => chain);

  if (parts.length === 0) {
    throw new Error('Канал не собрался: ни одной цепи из участков');
  }

  if (dropped > total * limits.maxDroppedShare) {
    throw new Error(
      `Канал не собирается: в обрывки ушло ${dropped} точек из ${total}`,
    );
  }

  if (parts.length > limits.maxParts) {
    throw new Error(
      `Канал распался на ${parts.length} цепей при пределе ${limits.maxParts}`,
    );
  }

  for (let i = 1; i < parts.length; i += 1) {
    const gap = Math.min(...parts.slice(0, i).map((other) => endGap(other, parts[i])));
    if (gap > limits.maxGap) {
      throw new Error(
        `Между цепями канала разрыв ${gap.toFixed(3)}° при пределе ${limits.maxGap}°`,
      );
    }
  }

  return { parts, total, dropped };
}
```

- [ ] **Шаг 4: убедиться, что тесты проходят**

```bash
npx vitest run scripts/canal-assembly.test.ts
```

Ожидается: 7 passed. Если «сшивает касающиеся участки» даёт не 19 точек —
перечитать `chainPieces`: общий конец при склейке выбрасывается, 10 + 10 − 1.

- [ ] **Шаг 5: линтер, все тесты, сборка, коммит**

```bash
npm run lint && npm test && npm run build
git add scripts/canal-assembly.ts scripts/canal-assembly.test.ts
git commit -m "feat: сборка канала из нескольких цепей"
```

---

### Задача 2: выжимка канала из OpenStreetMap

**Файлы:**
- Создать: `scripts/data/canal-relations.ts`
- Создать: `scripts/extract-canal-source.ts`
- Создать: `scripts/canal-source.test.ts`
- Создать запуском: `scripts/data/canal-source.json`
- Изменить: `package.json` (раздел `scripts`)

**Связи:**
- Берёт: ничего из задачи 1.
- Отдаёт: `CANAL_RELATIONS: Readonly<Record<string, number>>` и файл
  `scripts/data/canal-source.json` вида
  `{ generatedBy, license: 'ODbL-1.0', attribution, extractedAt, canals: [{ featureId, relation, version, timestamp, name, ways: [number, number][][] }] }`.
  На них опираются задачи 3 и 4.

- [ ] **Шаг 1: написать падающий тест**

Создать `scripts/canal-source.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { expect, it } from 'vitest';
import { CANAL_RELATIONS } from './data/canal-relations';

/*
 * Выжимка — производная база данных OpenStreetMap, и ODbL требует, чтобы она
 * оставалась отделимой и названной. Тест держит это свойство: лицензия и
 * указание авторства лежат в самом файле, а не только в документации.
 */
const source = JSON.parse(
  readFileSync(resolvePath(import.meta.dirname, 'data/canal-source.json'), 'utf8'),
) as {
  license: string;
  attribution: string;
  canals: { featureId: string; relation: number; ways: [number, number][][] }[];
};

it('выжимка названа лицензией ODbL и указывает авторство', () => {
  expect(source.license).toBe('ODbL-1.0');
  expect(source.attribution).toBe('© OpenStreetMap contributors');
});

it('у каждого канала из CANAL_RELATIONS есть участки своего отношения', () => {
  for (const [featureId, relation] of Object.entries(CANAL_RELATIONS)) {
    const canal = source.canals.find((one) => one.featureId === featureId);

    expect(canal?.relation).toBe(relation);
    expect(canal?.ways.length).toBeGreaterThan(100);
  }
});

it('точки лежат на востоке Китая и записаны с пятью знаками', () => {
  for (const canal of source.canals) {
    for (const [lon, lat] of canal.ways.flat()) {
      expect(lon).toBeGreaterThan(115);
      expect(lon).toBeLessThan(121);
      expect(lat).toBeGreaterThan(30);
      expect(lat).toBeLessThan(40.5);
      expect(Number(lon.toFixed(5))).toBe(lon);
    }
  }
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run scripts/canal-source.test.ts
```

Ожидается: падение импорта `./data/canal-relations` (модуля нет).

- [ ] **Шаг 3: записать номер отношения**

Создать `scripts/data/canal-relations.ts`:

```ts
/**
 * Отношения OpenStreetMap, из которых строятся каналы физической карты.
 *
 * Великий канал — отношение 1112801 (京杭大运河, `waterway=canal`,
 * Викиданные Q21042913). Живёт здесь, а не в справочнике, по тому же доводу,
 * что концы ущелий: справочник не знает, откуда берётся геометрия, а
 * извлекатель, генератор и отпечаток читают свои входы из `scripts/data`.
 */
export const CANAL_RELATIONS: Readonly<Record<string, number>> = {
  'grand-canal': 1112801,
};
```

- [ ] **Шаг 4: написать извлекатель**

Создать `scripts/extract-canal-source.ts`:

```ts
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
  'china-studies-trainer/0.3.0 (educational; https://github.com/bronik04/china-studies-trainer)';
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
```

В `package.json`, в раздел `scripts`, рядом с `"extract:physical"` добавить:

```json
    "extract:canal": "tsx scripts/extract-canal-source.ts",
```

- [ ] **Шаг 5: запустить извлекатель**

```bash
npm run extract:canal
```

Ожидается строка вида `京杭大运河: участков 141 из 170, точек 7509, версия 115`
(версия может вырасти — отношение правят). Файл `scripts/data/canal-source.json`
около 150 КБ. Если ответ 429 или 5xx — подождать минуту и повторить один раз;
дальше — остановиться и сообщить.

- [ ] **Шаг 6: убедиться, что тесты проходят**

```bash
npx vitest run scripts/canal-source.test.ts
```

Ожидается: 3 passed.

- [ ] **Шаг 7: линтер, все тесты, сборка, коммит**

```bash
npm run lint && npm test && npm run build
git add scripts/data/canal-relations.ts scripts/extract-canal-source.ts scripts/canal-source.test.ts scripts/data/canal-source.json package.json
git commit -m "feat: выжимка Великого канала из OpenStreetMap"
```

---

### Задача 3: род `canal` в коде

Род появляется во всех местах, где код различает реки и ущелья, — но цели
этого рода в справочнике ещё нет. Сборка остаётся зелёной; меняется только
отпечаток входов, потому что в него входит выжимка канала.

**Файлы:**
- Изменить: `src/content/types.ts` (объединение `PhysicalKind` и `PhysicalFeature`)
- Изменить: `src/content/physical-features.ts:29-36` (`PHYSICAL_KIND_LABELS`)
- Изменить: `src/domain/physical-choices.ts:23-27` (`familyOf`)
- Изменить: `src/domain/validate-catalog.ts:380-394` (ветки по роду)
- Изменить: `src/map/validate-map.ts` (`pointsOf`, свободная длина)
- Изменить: `scripts/physical-fingerprint.ts`
- Создать: `scripts/physical-fingerprint.test.ts`
- Изменить: `scripts/generate-physical-geometry.ts:461` (вызов отпечатка)
- Изменить: `scripts/validate-map.ts:279-282` (вызов отпечатка)
- Изменить: `src/domain/physical-choices.test.ts`, `src/map/validate-map.test.ts`
- Перегенерировать: `src/map/physical-geometry.ts`

**Связи:**
- Берёт: `CANAL_RELATIONS` и `scripts/data/canal-source.json` из задачи 2.
- Отдаёт: вариант `{ kind: 'canal' }` в `PhysicalFeature`; подпись рода
  `'Канал'`; семью `'line'` для канала;
  `physicalInputsFingerprint(features, sourceJson: string, canalJson: string): string`.
  На них опирается задача 4.

- [ ] **Шаг 1: написать падающие тесты**

Создать `scripts/physical-fingerprint.test.ts`:

```ts
import { expect, it } from 'vitest';
import { physicalFeatures } from '../src/content/physical-features';
import { physicalInputsFingerprint } from './physical-fingerprint';

/*
 * Выжимка канала — такой же вход генератора, как выжимка Natural Earth:
 * перекачать канал и не перегенерировать значит оставить на карте прежнюю
 * линию при зелёной сборке.
 */
it('выжимка канала входит в отпечаток', () => {
  const before = physicalInputsFingerprint(physicalFeatures, '{}', '{"canals":[]}');
  const after = physicalInputsFingerprint(physicalFeatures, '{}', '{"canals":[1]}');

  expect(after).not.toBe(before);
});

it('одинаковые входы дают одинаковый отпечаток', () => {
  expect(physicalInputsFingerprint(physicalFeatures, '{}', '{}')).toBe(
    physicalInputsFingerprint(physicalFeatures, '{}', '{}'),
  );
});
```

В `src/domain/physical-choices.test.ts`:

1. В импорты добавить `import type { PhysicalFeature } from '../content/types';`
   и `import { physicalKindLabel } from '../content/physical-features';`
   (последнее — дописать к уже существующему импорту из того же модуля).
2. Тест «реку отвлекает реками» переименовать в «реку отвлекает линиями» и
   заменить проверку на

```ts
      expect(
        choices.every((choice) => ['river', 'gorge', 'canal'].includes(choice.kind)),
      ).toBe(true);
```

   (комментарий над ним оставить: линия не может быть пустыней).
3. В конец файла добавить:

```ts
/*
 * Канал — линия, нарисованная тем же пером, что река, и отвлекать его должны
 * линии. Своего рода у него одна цель, и без семьи вариант остался бы один —
 * он же ответ. Тот же довод, что у ущелий.
 */
const testCanal: PhysicalFeature = {
  id: 'test-canal',
  kind: 'canal',
  nameRu: 'Проверочный канал',
  nameZh: '测试运河',
  pinyin: 'Cèshì Yùnhé',
  regionIds: ['jiangsu'],
  facts: [],
  sourceIds: [],
};

it('у канала четыре варианта, и все — линии', () => {
  const choices = buildPhysicalChoices(
    [...physicalFeatures, testCanal],
    'test-canal',
    createSeededRandom(1),
  );

  expect(choices).toHaveLength(4);
  for (const choice of choices) {
    expect(['river', 'gorge', 'canal']).toContain(choice.kind);
  }
});

it('род канала назван словом', () => {
  expect(physicalKindLabel(testCanal)).toBe('Канал');
});
```

В `src/map/validate-map.test.ts`, внутри `describe('validatePhysicalGeometry', ...)`,
после теста «ловит две реки, идущие рядом всей длиной», добавить:

```ts
  /* Канал лежит в том же наборе линий, что реки, и проверяется теми же правилами. */
  const canal: PhysicalFeature = {
    id: 'straight-canal',
    kind: 'canal',
    nameRu: 'Прямой канал',
    nameZh: '直运河',
    pinyin: 'Zhí Yùnhé',
    regionIds: ['qinghai'],
    facts: [],
    sourceIds: [],
  };

  it('принимает канал, лежащий в заявленном регионе', () => {
    expect(() =>
      validatePhysicalGeometry(
        [canal],
        physicalGeometry({ rivers: new Map([['straight-canal', [line]]]) }),
        shapes,
      ),
    ).not.toThrow();
  });

  it('ловит канал, идущий вдоль реки всей длиной', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river, canal],
        physicalGeometry({
          rivers: new Map([
            ['straight-river', [line]],
            [
              'straight-canal',
              [
                [
                  [10, 12],
                  [90, 12],
                ] as Point[],
              ],
            ],
          ]),
        }),
        shapes,
      ),
    ).toThrow(/показать однозначно|свободн/i);
  });
```

- [ ] **Шаг 2: убедиться, что тесты падают**

```bash
npx vitest run scripts/physical-fingerprint.test.ts src/domain/physical-choices.test.ts src/map/validate-map.test.ts
```

Ожидается:
- «выжимка канала входит в отпечаток» падает: третий аргумент пока
  игнорируется, отпечатки совпадают;
- «род канала назван словом» падает: подписи для `canal` нет (`undefined`);
- «принимает канал…» падает на «Нет геометрии у цели straight-canal»:
  `pointsOf` ищет его среди форм;
- «ловит канал, идущий вдоль реки…» не бросает: канал не в подсчёте
  свободной длины.

Вариант `kind: 'canal'` в фикстурах — ошибка типов до шага 3; vitest типы не
проверяет и тесты запускает.

- [ ] **Шаг 3: род в типах и подпись**

В `src/content/types.ts` в объединение `PhysicalKind` после `| 'gorge'`
добавить `| 'canal'`, а в объединение вариантов `PhysicalFeature` после
варианта `gorge` — вариант:

```ts
    | {
        readonly kind: 'canal';
        /*
         * Своих полей у канала нет: линия приходит из OpenStreetMap по номеру
         * отношения, а номер живёт во входах генератора
         * (`scripts/data/canal-relations.ts`), как концы ущелий, — справочник
         * не знает, откуда берётся геометрия.
         */
      }
```

В `src/content/physical-features.ts` в `PHYSICAL_KIND_LABELS` после
`gorge: 'Ущелье',` добавить `canal: 'Канал',`.

- [ ] **Шаг 4: семья линий и проверка справочника**

В `src/domain/physical-choices.ts` заменить тело `familyOf` на:

```ts
function familyOf(feature: PhysicalFeature): Family {
  return feature.kind === 'river' ||
    feature.kind === 'gorge' ||
    feature.kind === 'canal'
    ? 'line'
    : feature.kind;
}
```

В `src/domain/validate-catalog.ts` перед последней веткой
`} else if (![1, 2, 3].includes(feature.step)) {` вставить:

```ts
    } else if (feature.kind === 'canal') {
      /*
       * Своих полей у канала нет: геометрия приходит по номеру отношения OSM
       * из входов генератора, и проверяет её `validate:map`. Ветка нужна,
       * чтобы канал не дошёл до проверки ступени, которой у него нет.
       */
```

- [ ] **Шаг 5: проверка карты знает канал**

В `src/map/validate-map.ts`, в `pointsOf`, сразу после ветки
`if (feature.kind === 'gorge') { ... }` добавить:

```ts
    /*
     * Канал лежит в том же наборе линий, что реки: рисуется тем же пером и
     * попадает в цель так же. Рамка и заявленные регионы достаются ему даром.
     */
    if (feature.kind === 'canal') {
      return geometry.rivers.get(feature.id);
    }
```

Там же, в подсчёте свободной длины (`const riverPoints = new Map(...)`), заменить
фильтр `.filter((feature) => feature.kind === 'river')` на

```ts
      .filter((feature) => feature.kind === 'river' || feature.kind === 'canal')
```

и над `const riverPoints` дописать в комментарий строку: «Канал считается
наравне с реками: он пересекает Янцзы и Хуанхэ, и ни ему, ни им нельзя
потерять место для однозначного нажатия».

- [ ] **Шаг 6: отпечаток знает канал и его выжимку**

В `scripts/physical-fingerprint.ts`:
- добавить импорт `import { CANAL_RELATIONS } from './data/canal-relations';`;
- сигнатуру сделать `(features: readonly PhysicalFeature[], sourceJson: string, canalJson: string): string`;
- в `.map` по целям перед последним `return` добавить
  `if (feature.kind === 'canal') { return \`canal:${feature.id}\`; }`;
- после `const ends = ...` добавить

```ts
  /*
   * Номер отношения и выжимка канала — входы того же рода, что номера отрезков
   * реки и выжимка Natural Earth.
   */
  const relations = Object.entries(CANAL_RELATIONS)
    .map(([id, relation]) => `${id}=${relation}`)
    .sort();
```

- в `update(...)` заменить список на
  `[...catalog, ...steps, ...targets, ...ends, ...relations, sourceJson, canalJson]`;
- в шапке-комментарии к «концы участков-ущелий и сама выжимка» дописать
  «, номер отношения канала и выжимка OpenStreetMap».

В `scripts/generate-physical-geometry.ts` сразу после чтения `sourceJson`
(строки 55–58) добавить

```ts
/* Выжимка канала — отдельный файл под ODbL (`scripts/extract-canal-source.ts`). */
const canalSourceJson = readFileSync(
  new URL('data/canal-source.json', import.meta.url),
  'utf8',
);
```

а вызов на строке 461 заменить на
`physicalInputsFingerprint(physicalFeatures, sourceJson, canalSourceJson)`.

В `scripts/validate-map.ts` вызов на строках 279–282 заменить на:

```ts
const expectedFingerprint = physicalInputsFingerprint(
  physicalFeatures,
  readFileSync(new URL('data/physical-source.json', import.meta.url), 'utf8'),
  readFileSync(new URL('data/canal-source.json', import.meta.url), 'utf8'),
);
```

- [ ] **Шаг 7: перегенерировать и прогнать тесты**

```bash
npm run generate:physical
git diff --stat src/map/physical-geometry.ts
npx vitest run scripts/physical-fingerprint.test.ts src/domain/physical-choices.test.ts src/map/validate-map.test.ts
```

Ожидается: в `physical-geometry.ts` поменялась одна строка —
`INPUTS_FINGERPRINT`; тесты проходят.

- [ ] **Шаг 8: линтер, все тесты, сборка, коммит**

```bash
npm run lint && npm test && npm run build
git add src/content/types.ts src/content/physical-features.ts src/domain/physical-choices.ts src/domain/physical-choices.test.ts src/domain/validate-catalog.ts src/map/validate-map.ts src/map/validate-map.test.ts scripts/physical-fingerprint.ts scripts/physical-fingerprint.test.ts scripts/generate-physical-geometry.ts scripts/validate-map.ts src/map/physical-geometry.ts
git commit -m "feat: род «канал» на физической карте"
```

---

### Задача 4: Великий канал в справочнике и на карте

**Файлы:**
- Изменить: `src/content/physical-features.ts` (факты, `FACTS`, запись, константа источника)
- Изменить: `src/content/sources.ts`, `docs/sources/sources.md`
- Изменить: `scripts/generate-physical-geometry.ts` (раздел «Каналы», `WATER_LINES`, шапка, итоговая строка)
- Перегенерировать: `src/map/physical-geometry.ts`, шрифты (`npm run generate:fonts`)
- Изменить тесты: `src/content/physical-features.test.ts`,
  `scripts/physical-geometry.test.ts`, `src/map/physical-hit.test.ts`,
  `src/map/PhysicalLayer.test.tsx`, `src/domain/physical-choices.test.ts`,
  `src/domain/round.test.ts`, `src/features/exercise/PhysicalRound.test.tsx`,
  `src/App.test.tsx`

**Связи:**
- Берёт: `assembleCanal`, `CanalLimits` (задача 1); `CANAL_RELATIONS`,
  `canal-source.json` (задача 2); род `canal`, `canalSourceJson` в генераторе
  (задача 3).
- Отдаёт: цель `grand-canal` в `physicalFeatures` и её линию в `WATER_LINES`.

- [ ] **Шаг 1: сверить факты с источником**

Открыть во встроенном браузере (не WebFetch — Britannica отдаёт 403,
`memory/content-sourcing-quirks`)
`https://www.britannica.com/topic/Grand-Canal-China` и прочитать
`get_page_text`. Сверить три утверждения спецификации:

1. длина около 1800 км, от Ханчжоу до Пекина; самый длинный рукотворный
   водный путь;
2. строился, чтобы возить зерно из долин Янцзы и Хуайхэ на север, к столицам;
3. древнейший участок — между Янцзы и Хуайинем; век постройки; перестройка в
   607 году (династия Суй).

Если статья говорит иначе — писать по статье, а расхождение со спецификацией
отметить в коммите. Если статья не упоминает ЮНЕСКО (2014) — не писать про
ЮНЕСКО в фактах. Записать фактический заголовок статьи и дату обращения: они
идут в реестр.

- [ ] **Шаг 2: написать падающие тесты**

В `src/content/physical-features.test.ts`:
- тест «целей физической карты стало сорок» переименовать в «…сорок одна» и
  ожидать `toHaveLength(41)`;
- добавить:

```ts
it('Великий канал — линия-канал с тремя фактами и шестью регионами', () => {
  const canal = physicalFeatureById('grand-canal');

  expect(canal?.kind).toBe('canal');
  expect(canal?.nameZh).toBe('京杭大运河');
  expect(canal?.facts).toHaveLength(3);
  expect(canal?.regionIds).toEqual([
    'beijing',
    'tianjin',
    'hebei',
    'shandong',
    'jiangsu',
    'zhejiang',
  ]);
  expect(physicalKindLabel(canal!)).toBe('Канал');
});
```

В `scripts/physical-geometry.test.ts` добавить в импорты
`import { cityById } from '../src/content/cities';` и в конец:

```ts
/*
 * Канал рвётся у Хуанхэ: в OpenStreetMap у него нет звеньев через реку, и
 * линия состоит из северной и южной частей. Третья часть значила бы, что
 * выжимка уже другая, — это ловит и генератор, но здесь закреплено, что
 * получилось на карте.
 */
it('канал нарисован двумя частями и доходит от Пекина до Ханчжоу', () => {
  const canal = WATER_LINES.find((line) => line.featureId === 'grand-canal');

  expect(canal).toBeDefined();

  const parts = parseMapPath(canal!.d);
  const ends = parts.flatMap((part) => [part[0], part[part.length - 1]]);
  const nearest = (lon: number, lat: number) => {
    const [x, y] = projectLonLat(lon, lat);

    return Math.min(...ends.map(([ex, ey]) => Math.hypot(ex - x, ey - y)));
  };
  const beijing = cityById('beijing')!;
  const hangzhou = cityById('hangzhou')!;

  expect(parts).toHaveLength(2);
  expect(nearest(beijing.lon, beijing.lat)).toBeLessThan(3);
  expect(nearest(hangzhou.lon, hangzhou.lat)).toBeLessThan(3);
});
```

В `src/map/physical-hit.test.ts` в конец:

```ts
/*
 * Канал попадает в цель так же, как река: средняя вершина северной части
 * далека и от Хуанхэ, и от озёр.
 */
it('нажатие по каналу достаётся каналу', () => {
  const canal = WATER_LINES.find((line) => line.featureId === 'grand-canal')!;
  const north = parseMapPath(canal.d)[0];
  const [x, y] = north[Math.floor(north.length / 2)];

  expect(physicalTargetAt(x, y, 1)).toBe('grand-canal');
});

/* Канал идёт восточным берегом Хунцзэху, но знак озера по-прежнему его. */
it('знак Хунцзэху канал не перехватывает', () => {
  const hongze = lakeMarks(1).find((mark) => mark.featureId === 'hongze')!;

  expect(physicalTargetAt(hongze.hitX, hongze.hitY, 1)).toBe('hongze');
});
```

В `src/map/PhysicalLayer.test.tsx`:
- в «рисует все формы подложки и все линии воды» ожидать `toHaveLength(8)`, а
  комментарий над строкой сделать «Шесть рек, участок одной из них — Три
  ущелья — и Великий канал.»;
- в «подпись есть у каждой цели…» ожидать `toHaveLength(41)`;
- в «декоративные формы недоступны читалке экрана, а цели названы» после
  проверки Янцзы добавить
  `expect(screen.getByLabelText(/Великий канал, 京杭大运河/)).toBeInTheDocument();`.

В `src/domain/physical-choices.test.ts` в конец:

```ts
it('у настоящего канала варианты — линии', () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'grand-canal',
      createSeededRandom(seed),
    );

    expect(choices).toHaveLength(4);
    expect(choices.every((choice) => ['river', 'gorge', 'canal'].includes(choice.kind))).toBe(true);
  }
});
```

Счётчики (канал входит в первый набор — `physicalFeaturesUpTo` отсекает
только озёра, точки, моря и хребты):
- `src/domain/round.test.ts:240-241` — `40` → `41` в обоих местах;
- `src/features/exercise/PhysicalRound.test.tsx` — `/Вопрос 1 из 40/` →
  `/Вопрос 1 из 41/`; `toHaveLength(40)` в списке кнопок → `41`; в таблице
  наборов `['base', 20]` → `['base', 21]`, `['ranges', 27]` → `['ranges', 28]`,
  `['all', 40]` → `['all', 41]`, а комментарий над ней дополнить: «Канал —
  тоже: он линия, как реки.»; заголовок теста «спрашивает тридцать девять
  объектов подряд» → «спрашивает все объекты подряд»;
- `src/App.test.tsx:364` — `/Вопрос 1 из 40/` → `/Вопрос 1 из 41/`.

- [ ] **Шаг 3: убедиться, что тесты падают**

```bash
npx vitest run src/content/physical-features.test.ts scripts/physical-geometry.test.ts src/map/physical-hit.test.ts src/map/PhysicalLayer.test.tsx src/domain/physical-choices.test.ts
```

Ожидается: падают все новые и изменённые проверки — цели `grand-canal` нет.

- [ ] **Шаг 4: источники**

В `src/content/sources.ts` рядом с записью `natural-earth-rivers-5.1.2`
добавить:

```ts
  {
    id: 'openstreetmap-grand-canal',
    title: 'OpenStreetMap: отношение 1112801 «京杭大运河»',
    organization: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/relation/1112801',
    accessedAt: '<дата из поля extractedAt в scripts/data/canal-source.json>',
    covers: ['линия Великого канала'],
  },
```

а рядом с `britannica-yangtze` — запись `britannica-grand-canal` в том же виде,
что `britannica-yangtze`: `title` — фактический заголовок статьи с шага 1,
`organization: 'Encyclopaedia Britannica'`, `shortLabel: 'Britannica'`,
`url: 'https://www.britannica.com/topic/Grand-Canal-China'`, `accessedAt` —
дата шага 1, `covers: ['длина и назначение Великого канала', 'история
постройки']`.

В `docs/sources/sources.md` — два блока в формате соседних (`## id`, затем
строки «Название», «Организация», «URL», «Дата обращения», «Лицензия»,
«Подтверждает»). Лицензия у OSM: «ODbL 1.0, © участники OpenStreetMap;
производная геометрия распространяется на тех же условиях — `physical.md`.»
У Britannica — как у `britannica-yangtze`. Тест `scripts/sources-mirror.test.ts`
сверит реестр с зеркалом.

- [ ] **Шаг 5: запись и факты**

В `src/content/physical-features.ts`:
- рядом с константами источников (`const RIVERS = …`) добавить
  `const CANALS = ['openstreetmap-grand-canal'] as const;`;
- перед `const FACTS` добавить факты, сверенные на шаге 1 (тексты ниже —
  черновик спецификации; где статья говорит иначе, писать по статье):

```ts
const grandCanalFacts: readonly Fact[] = [
  {
    title: 'Тысяча восемьсот километров',
    body: 'Канал тянется примерно на 1800 км — от Ханчжоу на юге до Пекина на севере; это самый длинный водный путь, прорытый людьми.',
    sourceIds: ['britannica-grand-canal'],
  },
  {
    title: 'Зерно для столиц',
    body: 'Его строили, чтобы везти зерно с юга — из долин Янцзы и Хуайхэ — к столицам на севере страны.',
    sourceIds: ['britannica-grand-canal'],
  },
  {
    title: 'Древнейший участок',
    body: 'Самый старый участок — между Янцзы и Хуайинем — прорыт ещё до нашей эры, а в 607 году при династии Суй перестроен и вошёл в общую систему.',
    sourceIds: ['britannica-grand-canal'],
  },
];
```

- в `FACTS` после `tarim: tarimFacts,` добавить `'grand-canal': grandCanalFacts,`;
- в `physicalFeatures` сразу после записи `river('tarim', …)` добавить:

```ts
  /*
   * Канал стоит за реками: он линия, нарисованная тем же пером, и читать
   * справочник проще, когда линии рядом. Геометрия — из OpenStreetMap по
   * номеру отношения во входах генератора (`scripts/data/canal-relations.ts`).
   */
  {
    id: 'grand-canal',
    kind: 'canal',
    nameRu: 'Великий канал',
    nameZh: '京杭大运河',
    pinyin: 'Jīng-Háng Dà Yùnhé',
    regionIds: ['beijing', 'tianjin', 'hebei', 'shandong', 'jiangsu', 'zhejiang'],
    facts: FACTS['grand-canal'] ?? [],
    sourceIds: CANALS,
  },
```

- [ ] **Шаг 6: генератор строит линию канала**

В `scripts/generate-physical-geometry.ts`:
- добавить импорты `import { assembleCanal } from './canal-assembly';` и
  `import { CANAL_RELATIONS } from './data/canal-relations';`;
- после раздела «Участки рек» (после `const gorgeLines = …;`) вставить:

```ts
// --- Каналы -----------------------------------------------------------------

/*
 * Канал собирается из участков OpenStreetMap: в Natural Earth его нет. Склейка
 * та же, что у рек, но цепей может быть несколько — у Великого канала в OSM
 * нет звеньев через Хуанхэ, и линия рвётся там на 11,5 км.
 */
const canalSource = JSON.parse(canalSourceJson) as {
  canals: { featureId: string; relation: number; ways: [number, number][][] }[];
};

/** Сколько частей позволено каналу: северная и южная. */
const MAX_CANAL_PARTS = 2;

/** Наибольший разрыв между частями, в градусах: около 17 км. */
const MAX_CANAL_GAP_DEG = 0.15;

/** Цепь меньше этой доли точек — обрывок, а не часть канала. */
const MIN_CANAL_PART_SHARE = 0.01;

/*
 * Лишний номер отношения — ошибка по тому же доводу, что лишние концы ущелий:
 * он входит в отпечаток и прячет опечатку в ключе.
 */
const canalIds = new Set(
  physicalFeatures.filter((feature) => feature.kind === 'canal').map((one) => one.id),
);
const orphanCanals = Object.keys(CANAL_RELATIONS).filter((id) => !canalIds.has(id));
if (orphanCanals.length > 0) {
  throw new Error(
    `Отношения OSM записаны для целей, которых нет в справочнике: ${orphanCanals.join(', ')}`,
  );
}

const canalLines = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'canal') {
    return [];
  }

  const relation = CANAL_RELATIONS[feature.id];
  if (relation === undefined) {
    throw new Error(
      `Нет отношения OSM у канала ${feature.id}. Впишите его в scripts/data/canal-relations.ts`,
    );
  }

  const canal = canalSource.canals.find(
    (one) => one.featureId === feature.id && one.relation === relation,
  );
  if (canal === undefined) {
    throw new Error(`Канала ${feature.id} нет в выжимке. Запустите npm run extract:canal`);
  }

  const { parts: chains, total, dropped } = assembleCanal(canal.ways, {
    joinTolerance: JOIN_TOLERANCE_DEG,
    minPartShare: MIN_CANAL_PART_SHARE,
    maxParts: MAX_CANAL_PARTS,
    maxGap: MAX_CANAL_GAP_DEG,
    maxDroppedShare: MAX_LEFTOVER_SHARE,
  });

  /* Как у рек: сначала упрощение, потом обрезка по рамке. */
  const parts = chains.flatMap((chain) =>
    clipToFrame(simplifyPath(project(chain), SIMPLIFY_TOLERANCE_UNITS), FRAME),
  );
  if (parts.length === 0) {
    throw new Error(`Канал ${feature.id} целиком за рамкой карты`);
  }

  console.info(
    `${feature.nameRu}: точек ${total} → частей ${chains.length} → в рамке ` +
      `${parts.reduce((n, part) => n + part.length, 0)}` +
      (dropped > 0 ? `, отброшено ${dropped}` : ''),
  );

  return [{ featureId: feature.id, parts, d: toPathData(parts) }];
});
```

- в шаблоне модуля строку шапки `* Источник: scripts/data/physical-source.json (Natural Earth, public domain)`
  заменить на две:

```
 * Источник: scripts/data/physical-source.json (Natural Earth, public domain);
 * линии каналов — scripts/data/canal-source.json (© участники OpenStreetMap, ODbL 1.0)
```

- массив `WATER_LINES` собирать из `[...riverLines, ...canalLines, ...gorgeLines]`
  (участок рисуется последним — он лежит поверх своей реки);
- в итоговом `console.info` после `рек ${riverLines.length}, ` добавить
  `каналов ${canalLines.length}, `.

- [ ] **Шаг 7: перегенерировать геометрию и шрифты**

```bash
npm run generate:physical
npm run generate:fonts
```

Ожидается от генератора строка вида
`Великий канал: точек 7509 → частей 2 → в рамке 28, отброшено 8`.
Шрифтам нужны новые знаки 京杭大运河 (часть уже покрыта).

- [ ] **Шаг 8: убедиться, что тесты проходят**

```bash
npx vitest run src/content/physical-features.test.ts scripts/physical-geometry.test.ts src/map/physical-hit.test.ts src/map/PhysicalLayer.test.tsx src/domain/physical-choices.test.ts src/domain/round.test.ts src/features/exercise/PhysicalRound.test.tsx scripts/sources-mirror.test.ts
```

Ожидается: всё зелёное. Если «нажатие по каналу достаётся каналу» падает —
средняя вершина северной части пришлась на знак озера или ленту другой
реки: посмотреть `physicalTargetAt` для неё и выбрать проверочную точку дальше
от них, назвав в комментарии, почему эта.

- [ ] **Шаг 9: линтер, все тесты, сборка**

```bash
npm run lint && npm test && npm run build
```

Ожидается: зелёное. `validate:map` печатает свободную длину рек — у канала,
Янцзы и Хуанхэ она должна быть не ниже 80 % (иначе сборка падает сама). Если
падает проверка регионов («Цель grand-canal заявляет регион …, но не касается
его») — открыть линию на карте и выяснить, какой регион канал не задевает;
список регионов менять только по данным, отметив в коммите.

- [ ] **Шаг 10: коммит**

```bash
git status --short
git add -A
git commit -m "feat: Великий канал — сорок первая цель физической карты"
```

---

### Задача 5: указание авторства и документы

**Файлы:**
- Изменить: `src/map/MapAttribution.tsx`, `src/map/MapAttribution.test.tsx`
- Изменить: `docs/sources/physical.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md`

- [ ] **Шаг 1: написать падающий тест**

В `src/map/MapAttribution.test.tsx` в конец теста добавить:

```ts
  /*
   * ODbL требует указать авторство OpenStreetMap там, где показана карта с
   * производной от неё линией, — и назвать лицензию.
   */
  expect(
    screen.getByRole('link', { name: 'участники OpenStreetMap' }),
  ).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  expect(screen.getByRole('link', { name: 'ODbL' })).toBeInTheDocument();
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/MapAttribution.test.tsx
```

Ожидается: не найдена ссылка «участники OpenStreetMap».

- [ ] **Шаг 3: строка об OSM**

В `src/map/MapAttribution.tsx` после фрагмента о контуре Тайваня
(`… (AntV).`) добавить:

```tsx
      {' '}
      Линия Великого канала: ©{' '}
      <a href="https://www.openstreetmap.org/copyright">участники OpenStreetMap</a>,{' '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a>.
```

- [ ] **Шаг 4: убедиться, что тест проходит**

```bash
npx vitest run src/map/MapAttribution.test.tsx
```

Ожидается: 1 passed.

- [ ] **Шаг 5: документы**

`docs/sources/physical.md` — новый раздел `## Великий канал: OpenStreetMap`
перед `## Проверки`, своими словами:
- отношение 1112801, версия и дата выгрузки (из `canal-source.json`);
- берётся роль `main_stream`, почему не берутся `side_stream` и участок без
  роли (река Давэньхэ);
- линия из двух частей: разрыв 11,5 км у Хуанхэ, его не дорисовываем;
- лицензия ODbL 1.0: выжимка `scripts/data/canal-source.json` и линия канала в
  `src/map/physical-geometry.ts` — производные базы данных и распространяются
  на условиях ODbL; авторство указано под картой (`MapAttribution`);
- обновление: `npm run extract:canal`, затем `npm run generate:physical`;
  отпечаток роняет сборку, если выжимку сменили, а генератор не запускали.

`DECISIONS.md` — строка первой в таблице (сразу под `| --- | --- | --- |`),
дата сегодняшняя, решения 1–5 из раздела «Решения, принятые при подготовке
плана» этого документа с доводами и последствиями (в одну ячейку, как соседние
строки).

`CHANGELOG.md` — в `## [Unreleased]` → `### Added` первым пунктом: Великий
канал — сорок первая цель физической карты; линия из OpenStreetMap под ODbL,
две части с разрывом у Хуанхэ; новый род «Канал», отвлекают его реки;
авторство OSM под картой.

`PLAN.md` — в пункте 14 заменить «— ущелья сделаны» на «— сделано» и абзац
«**Осталось: Великий канал.** …» на «**Сделано <дата>: Великий канал.** …» с
одной-двумя фразами о том, что линия пришла из OSM двумя частями.

- [ ] **Шаг 6: линтер, все тесты, сборка, коммит**

```bash
npm run lint && npm test && npm run build
git add src/map/MapAttribution.tsx src/map/MapAttribution.test.tsx docs/sources/physical.md DECISIONS.md CHANGELOG.md PLAN.md
git commit -m "docs: Великий канал записан в журналах, авторство OSM под картой"
```

---

### Задача 6: снимок и ручная проверка

Снимок выбирает владелец по картинке (`memory/design-review-process`), поэтому
у задачи есть стоп на его ответ.

**Файлы:**
- Изменить: `scripts/data/collection-photos.json`, `src/content/collections.ts` (`FEATURE_PHOTOS`)
- Перегенерировать: `public/photos/feature-grand-canal-*.webp`,
  `src/content/photo-credits.ts`, `docs/sources/photos.md`

- [ ] **Шаг 1: подобрать три кадра**

Запросом к API Викисклада (`categorymembers` в `Category:Grand Canal of China`
и подкатегориях по городам — Ханчжоу, Сучжоу, Уси, Янчжоу) отобрать снимки
шире 1200 px под лицензиями CC0 / CC BY / CC BY-SA / Public domain, скачать
превью 640 px в каталог для временных файлов и посмотреть их. Отобрать три,
на которых канал узнаётся как канал (вода, набережные, суда), с описанием
файла, называющим место.

- [ ] **Шаг 2: показать владельцу и дождаться выбора**

Отправить три превью владельцу с подписью: место, год, автор, лицензия. Ждать
ответа. Без выбора владельца дальше не идти.

- [ ] **Шаг 3: записать выбранный снимок**

В `scripts/data/collection-photos.json` после строки `"feature-tarim": …`
добавить `"feature-grand-canal": "File:<выбранный файл>",`.

В `src/content/collections.ts`, в `FEATURE_PHOTOS`, после записи `tarim`
добавить запись того же вида:

```ts
  'grand-canal': {
    id: 'feature-grand-canal',
    subject: '<что на снимке, коротко — для заглушки>',
    captionRu: '<подпись по описанию файла>',
    captionZh: '<если описание называет место иероглифами>',
    place: '<город, регион — по описанию файла>',
  },
```

Подписи — только по описанию файла на Викискладе, не по догадке
(комментарий над `FEATURE_PHOTOS`).

- [ ] **Шаг 4: скачать снимки**

```bash
npm run fetch:photos
git status --short
```

Ожидается: новые `public/photos/feature-grand-canal-1200.webp` и `-640.webp`,
по одному блоку в `photo-credits.ts` и `docs/sources/photos.md`; прочие снимки
не меняются. Если в подписи появился новый иероглиф — `npm run generate:fonts`.

- [ ] **Шаг 5: проверить в браузере**

`preview_start` с именем `dev` (приложение — по
`localhost:5173/china-studies-trainer/`). Проверить:
1. Атлас → «Физическая» → «Великий канал»: линия подсвечена от Пекина до
   Ханчжоу двумя частями, карточка «Канал», три факта.
2. «Найти объект» и «Назвать объект» доходят до вопроса о канале (или
   проверить через список «Назвать объект»: канал среди кнопок).
3. Коллекции → «Великий канал»: снимок, подпись автора и лицензии.
4. Под картой атласа — строка об OpenStreetMap со ссылками.
5. Консоль без ошибок.

- [ ] **Шаг 6: линтер, все тесты, сборка, коммит**

```bash
npm run lint && npm test && npm run build
git add scripts/data/collection-photos.json src/content/collections.ts src/content/photo-credits.ts docs/sources/photos.md public/photos/feature-grand-canal-1200.webp public/photos/feature-grand-canal-640.webp src/assets/fonts scripts/font-coverage.json
git commit -m "feat: снимок Великого канала на странице коллекции"
```

## Review Focus

Что спецификация подразумевает, а тесты задач не проверяют напрямую или
проверяют только на одном примере:

1. **Канал у озёр.** Он идёт берегом Хунцзэху, Гаоюху и мимо Тайху: знак озера
   обязан оставаться озеру (тест есть для Хунцзэху; Тайху и Гаоюху — глазами в
   задаче 6), а канал — находиться нажатием вне знаков.
2. **Пересечения с Янцзы и Хуанхэ.** У пересечения нажатие достаётся ближайшей
   линии; свободная длина канала, Янцзы и Хуанхэ — не ниже 80 % (сторожит
   `validate:map`, задача 3 включила канал в подсчёт).
3. **Повторная выжимка.** Отношение правят (версия 115 от 2026-10-07): новая
   выгрузка может сдвинуть разрыв, добавить цепь или сменить роли. `assembleCanal`
   обязан падать с понятной строкой, а не рисовать мусор; отпечаток — ронять
   сборку, если выжимку сменили без генератора.
4. **«Назвать объект» о канале и о реках.** Варианты — только линии; канал
   может отвлекать от реки, и это правильно.
5. **Доступность.** Линия канала в обходе с клавиатуры, названа «Великий канал,
   京杭大运河», исход показан штриховкой и словом, как у рек.
