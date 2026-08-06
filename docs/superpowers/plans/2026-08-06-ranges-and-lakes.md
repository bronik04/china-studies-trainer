# Хребты и озёра — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Довести физическую географию с двенадцати целей до двадцати четырёх — шесть горных хребтов и шесть озёр — и дать выбирать глубину набора перед стартом.

**Architecture:** Хребет — не новый род, а форма рельефа со значением `landform: 'range'`: контуры уже лежат в сгенерированной геометрии и рисуются подложкой, поэтому хребет становится целью одной строкой в `SHAPE_FEATURE_IDS`. Озеро — новый род `lake` с номерами `ne_id`: контур приходит новым слоем выжимки, а нажатие принимает знак по приёму городов, потому что ни одно озеро Китая до порога 24 px не дотягивает. Правило отвлекающих не меняется: `buildPhysicalChoices` группирует по `feature.kind`, и нужное разбиение получается из типов само.

**Tech Stack:** TypeScript, React, Vite, Vitest. Новых зависимостей нет.

**Спек:** `docs/superpowers/specs/2026-08-06-ranges-and-lakes-design.md`. Предусловие — все три шага спека физической карты слиты в `master`.

## Global Constraints

- Интерфейс, задания, подписи и ошибки — на русском; китайские названия в Unicode, не только пиньинем.
- Цель нажатия не меньше `MIN_TARGET_PX` = 24 px на опорной ширине 1120 (WCAG 2.2, 2.5.8). У формы её даёт собственный контур, у озера — отдельный знак.
- Смысл не несёт один только цвет: исход у формы — штриховка, у озера — кольцо вокруг знака.
- Цвета, размеры и длительности берутся только из `src/design/tokens.css`.
- Геоданные и тексты имеют источник в `docs/sources`; координаты берутся только из Natural Earth, имена набираются и сверяются вручную.
- Домен не вызывает `Math.random`: генератор передаётся снаружи.
- Миграции прогресса нет: `Target` уже носит вид в себе.
- Карта доступна с клавиатуры: `Tab`, `Enter`, `Space`, видимый фокус; на узком экране отвечает равнозначный список.
- Во время раунда сетевых запросов нет. `npm run extract:physical` сеть требует, но в сборку не входит.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. **Проверять по коду возврата, а не по шаблону в выводе:** `validate:fonts` падает сообщением, в котором нет ни слова `error`, и отфильтрованный `grep` его прячет.
- Каждая задача заканчивается коммитом. Ветка — `feat/ranges-and-lakes`, создаётся от `master`.

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/content/types.ts` | значение `'range'` у формы, род `lake` с `lakeIds` |
| `src/content/physical-features.ts` | шесть хребтов и шесть озёр |
| `scripts/data/relief-steps.ts` | привязка шести хребтов к целям |
| `scripts/extract-physical-source.ts` | третий слой выжимки — озёра |
| `scripts/data/physical-source.json` | **перезаписывается `extract:physical`**, руками не править |
| `scripts/physical-fingerprint.ts` | номера озёр входят в отпечаток |
| `scripts/generate-physical-geometry.ts` | `LAKE_SHAPES` с контуром и точкой знака |
| `src/map/physical-geometry.ts` | **перезаписывается генератором**, руками не править |
| `src/map/validate-map.ts` | контур озера в рамке, знак внутри контура |
| `src/map/lake-marks.ts` | **новый**: знаки озёр и их цели нажатия |
| `src/map/PhysicalLayer.tsx` | отрисовка озера: контур, знак, цель, кольцо исхода |
| `src/features/home/ModeStartDialog.tsx` | вторая группа обобщается до списка пар |
| `src/features/exercise/exercise-modes.ts` | наборы физических целей |
| `src/App.tsx` | пул по выбранному набору |
| `src/features/atlas/AtlasPage.tsx` | слово рода: хребет и озеро |
| `src/styles.css` | озеро, его знак и кольцо исхода |

---

### Task 1: Хребты становятся целями

**Files:**
- Modify: `src/content/types.ts`, `src/content/physical-features.ts`, `scripts/data/relief-steps.ts`, `scripts/validate-content.ts`, `src/features/atlas/AtlasPage.tsx`
- Modify (генератором): `src/map/physical-geometry.ts`, `src/assets/fonts`, `scripts/font-coverage.json`
- Test: `src/domain/physical-choices.test.ts`, `src/map/validate-map.test.ts`

**Interfaces:**
- Produces: значение `'range'` у `landform`; шесть целей `himalayas`, `kunlun`, `tian-shan`, `qinling`, `greater-khingan`, `nanling`; `physicalFeatures.length === 18`.

**Почему это одна маленькая задача.** Контуры шести хребтов уже лежат в `src/map/physical-geometry.ts` и рисуются подложкой; `PhysicalLayer` считает целью любую форму с `featureId`, а `validate:map` уже меряет вписанную окружность любой цели. Значит, работа — справочник и одна строка привязки на хребет.

- [ ] **Step 1: Написать падающие тесты**

В конец `src/domain/physical-choices.test.ts`, внутрь `describe('buildPhysicalChoices', ...)`:

```ts
  it('хребет отвлекают формами и хребтами: и то и другое — заливка', () => {
    // Правило смотрит на род, а хребет — форма рельефа. Разбиение выходит из
    // типов само: ответ не должен читаться по виду подсветки, а заливка от
    // заливки видом не отличается.
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'qinling',
      createSeededRandom(11),
    );

    expect(choices).toHaveLength(4);
    expect(choices.every((choice) => choice.kind === 'landform')).toBe(true);
    expect(choices.map((choice) => choice.id)).toContain('qinling');
  });
```

В конец `src/map/validate-map.test.ts`:

```ts
it('шесть хребтов — цели, и каждый крупнее порога нажатия', () => {
  const ranges = physicalFeatures.filter(
    (feature) => feature.kind === 'landform' && feature.landform === 'range',
  );

  expect(ranges).toHaveLength(6);

  for (const range of ranges) {
    const shape = RELIEF_SHAPES.find((item) => item.featureId === range.id);
    expect(shape, `${range.id}: нет формы с таким featureId`).toBeDefined();

    const circle = largestInscribedCircle(parseMapPath(shape!.d));
    const px = unitsToPixels(circle.radius * 2, REFERENCE_MAP_WIDTH);
    expect(px, `${range.id}: цель ${px.toFixed(1)} px`).toBeGreaterThanOrEqual(
      MIN_TARGET_PX,
    );
  }
});
```

Импорты в шапке `validate-map.test.ts` дополняются недостающими: `largestInscribedCircle` из `./svg-path`, а `MIN_TARGET_PX`, `REFERENCE_MAP_WIDTH`, `unitsToPixels` — из `./target-size`.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/domain/physical-choices.test.ts src/map/validate-map.test.ts`
Expected: FAIL — целей `qinling` и прочих нет, хребтов ноль вместо шести.

- [ ] **Step 3: Разрешить значение `range`**

В `src/content/types.ts`, в варианте формы:

```ts
    | {
        readonly kind: 'landform';
        readonly step: ReliefStep;
        /**
         * `range` — горный хребет. Он такая же форма рельефа, как плато или
         * котловина, и отличается только вытянутостью: заводить ему отдельный
         * род значило бы развести по разным группам то, что на карте
         * нарисовано одинаково, — и подсказать ответ видом подсветки.
         */
        readonly landform: 'plateau' | 'plain' | 'basin' | 'desert' | 'range';
      }
```

В `src/content/physical-features.ts` тип параметра `shape` у фабрики `landform` расширяется тем же перечислением:

```ts
  shape: 'plateau' | 'plain' | 'basin' | 'desert' | 'range',
```

- [ ] **Step 4: Добавить шесть хребтов**

В `src/content/physical-features.ts`, в конец списка `physicalFeatures`, после шести форм:

```ts
  /*
   * Хребты взяты не по высоте: шесть самых высоких лежали бы все на западе.
   * Эти шесть закрывают все четыре направления школьной классификации
   * 山脉走向, включают Циньлин — границу севера и юга — и попутно
   * распределены по всем трём ступеням, то есть сами показывают лестницу.
   */
  landform('himalayas', 'Гималаи', '喜马拉雅山脉', 'Xǐmǎlāyǎ Shānmài', 1, 'range', [
    'tibet',
  ]),
  landform('kunlun', 'Куньлунь', '昆仑山脉', 'Kūnlún Shānmài', 1, 'range', [
    'xinjiang',
    'tibet',
    'qinghai',
  ]),
  landform('tian-shan', 'Тянь-Шань', '天山', 'Tiān Shān', 2, 'range', ['xinjiang']),
  landform('qinling', 'Циньлин', '秦岭', 'Qín Lǐng', 2, 'range', [
    'shaanxi',
    'gansu',
    'henan',
  ]),
  landform(
    'greater-khingan',
    'Большой Хинган',
    '大兴安岭',
    'Dà Xīng’ān Lǐng',
    2,
    'range',
    ['inner-mongolia', 'heilongjiang'],
  ),
  landform('nanling', 'Наньлин', '南岭', 'Nán Lǐng', 3, 'range', [
    'hunan',
    'jiangxi',
    'guangdong',
    'guangxi',
  ]),
```

Списки `regionIds` — заявка, которую `validate:map` проверяет геометрией с допуском 3 единицы. Если проверка скажет, что регион не задет, регион убирается из списка, а не допуск ослабляется: правило ловит опечатку и расхождение проекции, и ослаблять его нельзя.

- [ ] **Step 5: Привязать формы к целям**

В `scripts/data/relief-steps.ts`, в `SHAPE_FEATURE_IDS`:

```ts
export const SHAPE_FEATURE_IDS: Readonly<Record<string, string>> = {
  'PLATEAU OF TIBET': 'tibetan-plateau',
  'TARIM BASIN': 'tarim-basin',
  'Loess Plateau': 'loess-plateau',
  'SICHUAN BASIN': 'sichuan-basin',
  'GOBI DESERT': 'gobi',
  'NORTH CHINA PLAIN': 'north-china-plain',
  HIMALAYAS: 'himalayas',
  'KUNLUN MOUNTAINS': 'kunlun',
  'TIAN SHAN': 'tian-shan',
  'Qinling Mountains': 'qinling',
  'GREATER KHINGAN RANGE': 'greater-khingan',
  'Nan Ling Mts.': 'nanling',
};
```

Ключи взяты из набора Natural Earth дословно, вместе с их разнобоем в регистре: он исторический, и правка «на аккуратнее» разорвала бы связь с выжимкой.

- [ ] **Step 6: Поднять ожидаемое число целей**

В `scripts/validate-content.ts`:

```ts
validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 18 });
```

- [ ] **Step 7: Уточнить слово рода в карточке атласа**

В `src/features/atlas/AtlasPage.tsx` рядом с `PHYSICAL_KIND_LABELS`:

```ts
/**
 * Слово рода в карточке. Одного `kind` мало: хребет — тоже `landform`, и
 * получил бы «Форма рельефа», хотя ученик ищет глазами именно хребет.
 */
function kindLabelOf(feature: PhysicalFeature): string {
  if (feature.kind === 'landform' && feature.landform === 'range') {
    return 'Горный хребет';
  }

  return PHYSICAL_KIND_LABELS[feature.kind];
}
```

и в разметке карточки объекта `{PHYSICAL_KIND_LABELS[selectedFeature.kind]}` заменяется на `{kindLabelOf(selectedFeature)}`. Тип `PhysicalFeature` добавляется к импорту типов из `../../content/types`.

- [ ] **Step 8: Перегенерировать геометрию и шрифты**

Run: `npm run generate:physical`
Expected: в выводе прежнее «форм 38, рек 6», но отпечаток входов **другой** — в него входит привязка форм к целям. Шесть новых целей получают `labelX`/`labelY`: генератор считает их каждой форме с `featureId`, поэтому подписи хребтов появляются сами.

Run: `npm run generate:fonts`
Expected: подмножества пересобраны. Имена хребтов приносят шесть незнакомых знаков — 仑 兴 喜 秦 脉 雅; без этого шага `validate:fonts` уронит сборку.

- [ ] **Step 9: Полная проверка**

Run: `npm run build; echo "build exit=$?"`
Expected: `build exit=0`. В выводе `validate:map` число физических целей — 18.

Run: `npx vitest run; echo "test exit=$?"`
Expected: `test exit=0`.

Если `validate:map` жалуется, что заявленный регион не задет, — убрать этот регион из `regionIds` соответствующего хребта и перезапустить.

- [ ] **Step 10: Коммит**

```bash
git add src/content/types.ts src/content/physical-features.ts scripts/data/relief-steps.ts scripts/validate-content.ts src/features/atlas/AtlasPage.tsx src/map/physical-geometry.ts src/assets/fonts scripts/font-coverage.json src/domain/physical-choices.test.ts src/map/validate-map.test.ts
git commit -m "feat: шесть горных хребтов стали целями"
```

---

### Task 2: Озёра — справочник, выжимка, геометрия

**Files:**
- Modify: `src/content/types.ts`, `src/content/physical-features.ts`, `scripts/extract-physical-source.ts`, `scripts/physical-fingerprint.ts`, `scripts/generate-physical-geometry.ts`, `src/map/validate-map.ts`, `scripts/validate-content.ts`, `docs/sources/physical.md`
- Modify (скриптами): `scripts/data/physical-source.json`, `src/map/physical-geometry.ts`, `src/assets/fonts`, `scripts/font-coverage.json`
- Test: `src/map/validate-map.test.ts`

**Interfaces:**
- Produces: род `lake` с `lakeIds: readonly number[]`; `LAKE_SHAPES: readonly { featureId, d, markX, markY }[]`; `physicalFeatures.length === 24`.

**Одной задачей, а не двумя.** Справочник без геометрии роняет `validate:map` («нет геометрии у цели»), геометрия без справочника — `validate:content`. Разрезать их значило бы оставить сборку красной между задачами.

- [ ] **Step 1: Узнать номера озёр в наборе**

Номера `ne_id` нельзя выдумать: их надо взять из самого набора. Создать `scripts/find-lakes.tmp.ts`:

```ts
const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const response = await fetch(`${BASE}/ne_10m_lakes.geojson`);
const collection = (await response.json()) as {
  features: readonly { properties: Record<string, unknown> }[];
};

/* Латинские имена набора; русские и китайские набираются вручную. */
const WANTED = ['Qinghai', 'Poyang', 'Dongting', 'Tai Hu', 'Hongze', 'Chao Hu'];

for (const feature of collection.features) {
  const name = String(feature.properties.name ?? '');
  if (WANTED.some((wanted) => name.includes(wanted))) {
    console.info(
      `${String(feature.properties.ne_id).padStart(12)}  ${name}  ` +
        `scalerank=${String(feature.properties.scalerank)}`,
    );
  }
}
```

Run: `npx tsx scripts/find-lakes.tmp.ts`
Expected: по строке на каждое озеро с его `ne_id`. Если у озера строк несколько — берутся все её номера: набор режет крупные озёра на части, и это та же история, что с отрезками рек.

Записать полученные номера, удалить файл: `rm scripts/find-lakes.tmp.ts`.

Если какое-то из шести не нашлось по латинскому имени, искать по подстроке иначе (`Hu`, `Lake`) — но **не подставлять номер наугад**: неверный номер даст на карте чужое озеро при зелёной сборке.

- [ ] **Step 2: Написать падающие тесты**

В конец `src/map/validate-map.test.ts`:

```ts
it('у каждого озера есть контур, и он лежит в рамке карты', () => {
  const lakes = physicalFeatures.filter((feature) => feature.kind === 'lake');

  expect(lakes).toHaveLength(6);

  for (const lake of lakes) {
    const shape = LAKE_SHAPES.find((item) => item.featureId === lake.id);
    expect(shape, `${lake.id}: нет контура`).toBeDefined();

    for (const [x, y] of parseMapPath(shape!.d).flat()) {
      expect(x, `${lake.id}: точка вне рамки`).toBeGreaterThanOrEqual(
        MAP_VIEWBOX_MIN_X,
      );
      expect(x).toBeLessThanOrEqual(MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH);
      expect(y).toBeGreaterThanOrEqual(MAP_VIEWBOX_MIN_Y);
      expect(y).toBeLessThanOrEqual(MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT);
    }
  }
});

it('знак озера стоит внутри своего контура, а не рядом с ним', () => {
  // Знак — то, во что целятся: контур озера меньше порога нажатия, и цель
  // строится вокруг знака. Знак вне воды означал бы, что нажимают по суше.
  for (const shape of LAKE_SHAPES) {
    expect(
      containsPoint(parseMapPath(shape.d), shape.markX, shape.markY),
      `${shape.featureId}: знак вне контура`,
    ).toBe(true);
  }
});
```

Импорт `LAKE_SHAPES` добавляется к существующему импорту из `./physical-geometry`.

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/validate-map.test.ts -t 'озер'`
Expected: FAIL — `LAKE_SHAPES` не экспортируется.

- [ ] **Step 4: Завести род `lake`**

В `src/content/types.ts`:

```ts
export type PhysicalKind = 'river' | 'landform' | 'lake';
```

и третий вариант размеченного объединения, после формы:

```ts
    | {
        readonly kind: 'lake';
        /**
         * Номера объектов в Natural Earth. Именно номера, а не имена: имена
         * там не уникальны — то же правило, по которому река задаётся
         * `rivernum`. Список, потому что крупное озеро набор режет на части.
         */
        readonly lakeIds: readonly number[];
      }
```

- [ ] **Step 5: Добавить шесть озёр**

В `src/content/physical-features.ts` — источник и фабрика рядом с двумя имеющимися:

```ts
const LAKES = ['natural-earth-lakes-5.1.2'] as const;

function lake(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  lakeIds: readonly number[],
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'lake',
    nameRu,
    nameZh,
    pinyin,
    lakeIds,
    regionIds,
    facts: [],
    sourceIds: LAKES,
  };
}
```

и шесть записей в конец `physicalFeatures`. Номера подставляются те, что напечатал шаг 1, — здесь они показаны как `NE_ID_*`, и оставить их в таком виде нельзя:

```ts
  /*
   * Пять пресных — 五大淡水湖 — в китайской школе заучивают списком целиком.
   * Цинхай добавлен шестым: без него набор не знает ни самого большого озера
   * страны, ни запада вовсе.
   */
  lake('qinghai-lake', 'Цинхай', '青海湖', 'Qīnghǎi Hú', [NE_ID_QINGHAI], [
    'qinghai',
  ]),
  lake('poyang', 'Поянху', '鄱阳湖', 'Póyáng Hú', [NE_ID_POYANG], ['jiangxi']),
  lake('dongting', 'Дунтинху', '洞庭湖', 'Dòngtíng Hú', [NE_ID_DONGTING], [
    'hunan',
  ]),
  lake('taihu', 'Тайху', '太湖', 'Tài Hú', [NE_ID_TAIHU], ['jiangsu', 'zhejiang']),
  lake('hongze', 'Хунцзэху', '洪泽湖', 'Hóngzé Hú', [NE_ID_HONGZE], ['jiangsu']),
  lake('chaohu', 'Чаоху', '巢湖', 'Cháo Hú', [NE_ID_CHAOHU], ['anhui']),
```

- [ ] **Step 6: Добавить озёра в выжимку**

В `scripts/extract-physical-source.ts`, после сбора форм:

```ts
const lakeIds = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'lake' ? feature.lakeIds : [],
  ),
);

const lakeFeatures = await load('ne_10m_lakes');
const lakes = lakeFeatures
  .filter(
    (feature) =>
      feature.geometry !== null &&
      lakeIds.has(feature.properties.ne_id as number),
  )
  .map((feature) => ({
    neId: feature.properties.ne_id as number,
    rings: polygonRings(feature.geometry as Geometry).map((ring) => ring.map(round)),
  }));

const missingLakes = [...lakeIds].filter(
  (id) => !lakes.some((item) => item.neId === id),
);
if (missingLakes.length > 0) {
  throw new Error(`Не найдены озёра: ${missingLakes.join(', ')}`);
}
```

Проверка на ненайденные обязательна и здесь: молча пропущенное озеро дало бы цель без геометрии, а её ловил бы уже `validate:map` — на шаг позже и невнятным сообщением.

Поле `lakes` добавляется в объект, который скрипт пишет в `physical-source.json`, рядом с `rivers` и `landforms`.

Run: `npm run extract:physical`
Expected: в выводе строка про `ne_10m_lakes`, выжимка перезаписана. **Нужна сеть.**

- [ ] **Step 7: Внести озёра в отпечаток входов**

В `scripts/physical-fingerprint.ts`, в сборке `catalog`:

```ts
  const catalog = features
    .map((feature) => {
      if (feature.kind === 'river') {
        return `river:${feature.id}:${[...feature.riverNums].sort((a, b) => a - b).join(',')}`;
      }

      if (feature.kind === 'lake') {
        return `lake:${feature.id}:${[...feature.lakeIds].sort((a, b) => a - b).join(',')}`;
      }

      return `landform:${feature.id}:${feature.step}`;
    })
    .sort();
```

Без этого правка номера озера прошла бы без перегенерации — ровно та тихая ошибка, ради которой отпечаток и заведён.

- [ ] **Step 8: Научить генератор писать контуры озёр**

В `scripts/generate-physical-geometry.ts` разбор выжимки дополняется полем `lakes`, и рядом со сборкой форм появляется сборка озёр: кольца проецируются `project`, упрощаются `simplifyRing` с тем же допуском, обрезаются `clipRingToFrame`, а точка знака считается `largestInscribedCircle` по получившимся кольцам — тем же способом, каким уже считается точка подписи формы.

В шаблон модуля добавляется тип и список:

```ts
export type LakeShape = {
  readonly featureId: string;
  readonly d: string;
  /**
   * Куда ставить знак: середина наибольшей вписанной окружности. Знак нужен
   * потому, что сам контур меньше порога нажатия — 24 px на опорной ширине
   * это около 120 км, а Цинхай, самое большое озеро страны, даёт около 13 px.
   */
  readonly markX: number;
  readonly markY: number;
};

export const LAKE_SHAPES: readonly LakeShape[] = [
${lakes
  .map(
    (lake) =>
      `  { featureId: ${quote(lake.featureId)}, markX: ${lake.mark.x.toFixed(2)}, ` +
      `markY: ${lake.mark.y.toFixed(2)}, d: ${quote(toPathData(lake.rings, { closed: true }))} },`,
  )
  .join('\n')}
];
```

Строка итога дополняется числом озёр: `размер …, форм 38, рек 6, озёр 6`.

Run: `npm run generate:physical`
Expected: файл перезаписан, `LAKE_SHAPES` содержит шесть записей.

- [ ] **Step 9: Проверить озёра на сборке**

В `src/map/validate-map.ts`, в `validatePhysicalGeometry`: `pointsOf` дополняется веткой озера, а после проверки рамки добавляется правило про знак — знак обязан лежать внутри своего контура. Тип `PhysicalGeometry` получает поле `lakes: Map<string, Point[][]>`, и место, которое его собирает (`validate-map.test.ts` и `scripts/validate-map.ts`), заполняет его из `LAKE_SHAPES`.

Правило про вписанную окружность к озеру **не применяется**: у него цель — знак, а не контур, и требовать 24 px от контура значило бы выкинуть все озёра Китая разом.

В `scripts/validate-content.ts`:

```ts
validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 24 });
```

В `validatePhysicalFeatures` (`src/domain/validate-catalog.ts`) добавляется проверка непустого `lakeIds` у озера — рядом с той, что уже требует непустой `riverNums` у реки.

- [ ] **Step 10: Записать источник**

В `docs/sources/physical.md` — третья таблица по образцу двух имеющихся:

```markdown
| Поле | Контуры озёр |
| --- | --- |
| Идентификатор | `natural-earth-lakes-5.1.2` |
| Исходный URL | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/ |
| Автор | Natural Earth |
| Лицензия | Public domain |
| Дата получения | 2026-08-06 |
| Изменения | Взяты шесть озёр по номерам `ne_id`, упрощены и переведены в координаты карты. Имён в наборе нет ни русских, ни китайских — только латиница; все имена набраны вручную и сверяются преподавателем. |
| Покрытие | Цинхай, Поянху, Дунтинху, Тайху, Хунцзэху, Чаоху. |
```

И абзац о том, почему озеро задаётся номером, а не именем, — рядом с таким же абзацем про отрезки рек.

- [ ] **Step 11: Перегенерировать шрифты и проверить**

Run: `npm run generate:fonts`
Expected: подмножества пересобраны. Имена озёр приносят шесть незнакомых знаков — 巢 庭 泽 洞 洪 鄱.

Run: `npm run build; echo "build exit=$?"` → `build exit=0`, физических целей 24.
Run: `npx vitest run; echo "test exit=$?"` → `test exit=0`.

- [ ] **Step 12: Коммит**

```bash
git add src/content/types.ts src/content/physical-features.ts scripts/extract-physical-source.ts scripts/data/physical-source.json scripts/physical-fingerprint.ts scripts/generate-physical-geometry.ts src/map/physical-geometry.ts src/map/validate-map.ts src/map/validate-map.test.ts src/domain/validate-catalog.ts scripts/validate-content.ts docs/sources/physical.md src/assets/fonts scripts/font-coverage.json
git commit -m "feat: шесть озёр — справочник, выжимка и геометрия"
```

---

### Task 3: Озёра на карте

**Files:**
- Create: `src/map/lake-marks.ts`, `src/map/lake-marks.test.ts`
- Modify: `src/map/PhysicalLayer.tsx`, `src/map/PhysicalLayer.test.tsx`, `src/styles.css`, `src/features/atlas/AtlasPage.tsx`

**Interfaces:**
- Consumes: `LAKE_SHAPES` (задача 2), `spreadHitTargets` и `TARGET_DIAMETER_UNITS` из `./city-hit-targets`.
- Produces: `LAKE_MARKS: readonly { featureId, x, y, hitX, hitY, radius }[]` — функция от увеличения, как у городов.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/map/lake-marks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lakeMarks } from './lake-marks';
import { LAKE_SHAPES } from './physical-geometry';
import { MIN_TARGET_PX, REFERENCE_MAP_WIDTH, unitsToPixels } from './target-size';

describe('lakeMarks', () => {
  it('даёт знак каждому озеру', () => {
    expect(lakeMarks(1)).toHaveLength(LAKE_SHAPES.length);
  });

  it('цель нажатия не меньше порога', () => {
    for (const mark of lakeMarks(1)) {
      const px = unitsToPixels(mark.radius * 2, REFERENCE_MAP_WIDTH);
      expect(px, `${mark.featureId}: ${px.toFixed(1)} px`).toBeGreaterThanOrEqual(
        MIN_TARGET_PX,
      );
    }
  });

  it('цели не накрывают друг друга', () => {
    const marks = lakeMarks(1);

    for (const left of marks) {
      for (const right of marks) {
        if (left.featureId >= right.featureId) {
          continue;
        }

        const distance = Math.hypot(left.hitX - right.hitX, left.hitY - right.hitY);
        expect(
          distance,
          `${left.featureId} и ${right.featureId} в ${distance.toFixed(1)}`,
        ).toBeGreaterThanOrEqual(left.radius + right.radius);
      }
    }
  });

  it('на увеличении цель занимает меньше единиц карты', () => {
    // Порог задан в пикселях экрана: чем сильнее увеличено, тем меньше единиц
    // карты нужно, чтобы их набрать. Правило то же, что у городов.
    expect(lakeMarks(2)[0].radius).toBeLessThan(lakeMarks(1)[0].radius);
  });
});
```

В `src/map/PhysicalLayer.test.tsx`, внутрь `describe('PhysicalLayer', ...)`:

```tsx
  it('рисует контур и знак каждого озера', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.lake-shape')).toHaveLength(6);
    expect(container.querySelectorAll('.lake-mark')).toHaveLength(6);
  });

  it('озеро названо читалке экрана и отвечает на Enter', () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const lake = screen.getByLabelText(/Поянху, 鄱阳湖/);
    fireEvent.keyDown(lake, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('poyang');
  });

  it('исход у озера помечается кольцом, а не штриховкой', () => {
    const { container } = renderLayer({ featureOutcomes: { taihu: 'incorrect' } });

    expect(
      container.querySelector('.lake-halo[data-feature-id="taihu"]'),
    ).toHaveAttribute('data-outcome', 'incorrect');
  });
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/lake-marks.test.ts src/map/PhysicalLayer.test.tsx`
Expected: FAIL — «Failed to resolve import "./lake-marks"», в слое нет ни `.lake-shape`, ни `.lake-mark`.

- [ ] **Step 3: Написать знаки озёр**

Создать `src/map/lake-marks.ts`:

```ts
/**
 * Знаки озёр и их цели нажатия.
 *
 * У озера, в отличие от формы, целью не может быть контур: 24 px на опорной
 * ширине — это около 120 км на местности, а Цинхай, самое большое озеро
 * страны, даёт вписанную окружность около 13 px. Поэтому применяется приём
 * городов: знак стоит на настоящем месте, а цель нажатия может от него отойти,
 * если соседняя ближе диаметра цели.
 */
import { spreadHitTargets, TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { LAKE_SHAPES } from './physical-geometry';

export type LakeMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
  readonly hitX: number;
  readonly hitY: number;
  readonly radius: number;
};

/**
 * Знаки при заданном увеличении. Порог задан в пикселях экрана, поэтому на
 * увеличении та же цель занимает меньше единиц карты — и озёра нижней Янцзы,
 * которые на целом виде пришлось бы разводить, встают на свои места.
 */
export function lakeMarks(zoom: number): readonly LakeMark[] {
  const targets = spreadHitTargets(
    LAKE_SHAPES.map((shape) => ({
      id: shape.featureId,
      x: shape.markX,
      y: shape.markY,
    })),
    TARGET_DIAMETER_UNITS / zoom,
  );

  return targets.map((target) => ({
    featureId: target.id,
    x: target.x,
    y: target.y,
    hitX: target.hitX,
    hitY: target.hitY,
    radius: target.radius,
  }));
}
```

Если поля `spreadHitTargets` называются иначе, чем `hitX`, `hitY`, `radius`, — читается `src/map/city-hit-targets.ts` и берутся его настоящие имена: слой городов пользуется тем же результатом.

- [ ] **Step 4: Нарисовать озёра в слое**

В `src/map/PhysicalLayer.tsx` добавляется свойство `zoom?: number` со значением по умолчанию `1` — оно нужно только целям нажатия, как у слоя городов, — и группа озёр между группой рек и группой подписей: озеро лежит поверх формы, как и река.

```tsx
      {/*
        Озеро — четыре узла. Контур заливает воду, но целью быть не может:
        24 px на опорной ширине это около 120 км, а Цинхай даёт 13 px. Целится
        ученик в знак, а невидимый круг вокруг него и принимает нажатие; когда
        круг отошёл от знака, их связывает поводок — как у города.
      */}
      <g className="lakes" clipPath={`url(#${CLIP_ID})`}>
        {lakeMarks(zoom).map((mark) => {
          const shape = LAKE_SHAPES.find(
            (item) => item.featureId === mark.featureId,
          )!;
          const label = NAME_OF.get(mark.featureId) ?? mark.featureId;
          const answers = onSelect !== undefined;

          return (
            <g key={mark.featureId} className="lake">
              <path className="lake-shape" d={shape.d} aria-hidden="true" />
              <circle
                className="lake-halo"
                cx={mark.x}
                cy={mark.y}
                r={LAKE_MARK_RADIUS * 3}
                data-feature-id={mark.featureId}
                data-outcome={featureOutcomes[mark.featureId]}
                aria-hidden="true"
              />
              {mark.hitX !== mark.x || mark.hitY !== mark.y ? (
                <line
                  className="lake-leader"
                  x1={mark.x}
                  y1={mark.y}
                  x2={mark.hitX}
                  y2={mark.hitY}
                  aria-hidden="true"
                />
              ) : null}
              <circle
                className="lake-mark"
                cx={mark.x}
                cy={mark.y}
                r={LAKE_MARK_RADIUS}
                data-selected={mark.featureId === selectedFeatureId}
                aria-hidden="true"
              />
              <circle
                className="lake-hit"
                cx={mark.hitX}
                cy={mark.hitY}
                r={mark.radius}
                data-feature-id={mark.featureId}
                role={answers ? 'button' : undefined}
                aria-label={label}
                tabIndex={answers ? 0 : -1}
                onClick={answers ? () => onSelect(mark.featureId) : undefined}
                onPointerEnter={
                  answers ? () => setHoveredNodeId(mark.featureId) : undefined
                }
                onPointerLeave={answers ? () => setHoveredNodeId(null) : undefined}
                onFocus={answers ? () => setHoveredNodeId(mark.featureId) : undefined}
                onBlur={answers ? () => setHoveredNodeId(null) : undefined}
                onKeyDown={
                  answers
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(mark.featureId);
                        }
                      }
                    : undefined
                }
              />
            </g>
          );
        })}
      </g>
```

Рядом с прочими значениями уровня модуля:

```ts
/** Радиус знака озера: виден на целом виде, но не спорит с контуром. */
const LAKE_MARK_RADIUS = 2.5;
```

Список `LABELLED` дополняется озёрами — подпись ставится у знака, а не у середины контура: у Поянху они разойдутся, контур вытянут:

```ts
  ...LAKE_SHAPES.map((shape) => ({
    featureId: shape.featureId,
    x: shape.markX,
    y: shape.markY - LABEL_OFFSET,
  })),
```

В `src/map/ChinaMap.tsx` слой получает увеличение там же, где его получает `CityLayer`:

```tsx
              <PhysicalLayer
                selectedFeatureId={selectedFeatureId}
                hoveredFeatureId={hoveredFeatureId}
                onSelect={onSelectFeature}
                showsLabels={showsPhysicalLabels}
                featureOutcomes={featureOutcomes}
                zoom={view.zoom}
              />,
```

- [ ] **Step 5: Стили озера**

В `src/styles.css`, в блоке физической карты:

```css
/*
 * Озеро заливается тоном линии реки: он уже проверен на 3:1 ко всем четырём
 * заливкам ступеней, и заводить пятую краску ради воды незачем — вода на этой
 * карте одна.
 */
.china-map .physical-layer .lake-shape {
  fill: var(--map-river);
  pointer-events: none;
  stroke: none;
}

/*
 * Знак нужен там, где контур меньше пятна: на целом виде Чаоху занимает около
 * пяти пикселей, и без знака его не видно вовсе.
 */
.china-map .physical-layer .lake-mark {
  fill: var(--map-river);
  pointer-events: none;
  stroke: var(--surface-paper-bright);
  stroke-width: 1;
}

.china-map .physical-layer .lake-hit {
  fill: transparent;
}

.china-map .physical-layer[data-interactive='true'] .lake-hit {
  cursor: pointer;
}

.china-map .physical-layer .lake-leader {
  pointer-events: none;
  stroke: var(--map-label);
  stroke-dasharray: 2 2;
  stroke-width: 0.7;
}

/*
 * Исход у озера — кольцо, а не штриховка: на пятне в пять пикселей штриховку
 * не разглядеть. Тот же приём, которым помечается спрошенный город.
 */
.china-map .physical-layer .lake-halo {
  fill: none;
  pointer-events: none;
  stroke: none;
}

.china-map .physical-layer .lake-halo[data-outcome='correct'] {
  stroke: var(--map-correct-mark);
  stroke-width: 2;
}

.china-map .physical-layer .lake-halo[data-outcome='incorrect'] {
  stroke: var(--map-incorrect-mark-relief);
  stroke-dasharray: 3 2;
  stroke-width: 2;
}

.china-map .physical-layer .lake-hit:focus-visible {
  outline: none;
}

.china-map .physical-layer .lake-hit:focus-visible + .lake-mark,
.china-map .physical-layer .lake-mark[data-selected='true'] {
  stroke: var(--focus-on-paper);
  stroke-width: 2;
}
```

- [ ] **Step 6: Слово рода в карточке атласа**

В `src/features/atlas/AtlasPage.tsx` в `PHYSICAL_KIND_LABELS` добавляется строка:

```ts
  lake: 'Озеро',
```

- [ ] **Step 7: Запустить тесты и проверить в браузере**

Run: `npx vitest run src/map; echo "exit=$?"` → `exit=0`.

Проверить в браузере на физической карте атласа: шесть озёр видны, наведение показывает имя, `Tab` доходит до каждого, при увеличении цель не уезжает от знака. Отдельно посмотреть нижнюю Янцзы: Тайху, Хунцзэху и Чаоху стоят близко, и если цели разошлись — увидеть поводки.

- [ ] **Step 8: Коммит**

```bash
git add src/map/lake-marks.ts src/map/lake-marks.test.ts src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/map/ChinaMap.tsx src/styles.css src/features/atlas/AtlasPage.tsx
git commit -m "feat: озёра на физической карте — контур, знак и цель нажатия"
```

---

### Task 4: Наборы перед стартом

**Files:**
- Modify: `src/features/home/ModeStartDialog.tsx`, `src/features/home/ModeStartDialog.test.tsx`, `src/features/home/HomePage.tsx`, `src/features/exercise/exercise-modes.ts`, `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `PhysicalSet = 'base' | 'ranges' | 'all'`; `physicalFeaturesUpTo(set): readonly PhysicalFeature[]`; у `ModeStartDialog` вместо `defaultCitySet` — обобщённые `setChoice`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/App.test.tsx`:

```tsx
it('набор перед стартом задаёт длину физического раунда', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти на физической карте/ }));
  fireEvent.click(screen.getByRole('radio', { name: /И озёра/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(screen.getByText(/Вопрос 1 из 24/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/App.test.tsx -t 'набор перед стартом'`
Expected: FAIL — строки выбора набора нет.

- [ ] **Step 3: Завести наборы**

В `src/content/physical-features.ts`, после `physicalFeatures`:

```ts
/**
 * Наборы вложены: каждый следующий включает предыдущий. Ученик выбирает,
 * докуда, а не какой один, — то же устройство, что у наборов городов. Внутри
 * раунда роды идут вперемешку: разделять их значило бы разорвать связь между
 * рельефом и течением рек, ради которой режим и сделан.
 */
export type PhysicalSet = 'base' | 'ranges' | 'all';

export function physicalFeaturesUpTo(
  set: PhysicalSet,
): readonly PhysicalFeature[] {
  if (set === 'all') {
    return physicalFeatures;
  }

  const withoutLakes = physicalFeatures.filter(
    (feature) => feature.kind !== 'lake',
  );
  if (set === 'ranges') {
    return withoutLakes;
  }

  return withoutLakes.filter(
    (feature) => feature.kind !== 'landform' || feature.landform !== 'range',
  );
}
```

- [ ] **Step 4: Обобщить окно перед стартом**

В `src/features/home/ModeStartDialog.tsx` свойство `defaultCitySet` заменяется на одно обобщённое:

```ts
  /**
   * Вторая группа окна: чем глубже набор, тем больше целей. Задана списком
   * пар, а не видом игры: наборы есть и у городов, и у физической географии,
   * и третья почти такая же группа была бы копией.
   */
  readonly setChoice?: {
    readonly legend: string;
    readonly options: readonly (readonly [string, string])[];
    readonly value: string;
  } | null;
  readonly onStart: (language: QuestionLanguage, set: string) => void;
```

Разметка второй группы:

```tsx
        {setChoice === null ? null : (
          <fieldset className="mode-dialog-language">
            <legend>{setChoice.legend}</legend>
            {setChoice.options.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="mode-dialog-set"
                  value={value}
                  checked={set === value}
                  onChange={() => setSet(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        )}
```

с состоянием `const [set, setSet] = useState(setChoice?.value ?? '')` вместо прежнего `citySet`. Подписи с числами («Только центры регионов — 34 города») собирает вызывающая сторона, а не окно: считать города окну незачем, а физические цели оно и вовсе не знает. Импорты `citiesUpTo` и `citiesWord` из окна уходят.

В `src/features/home/HomePage.tsx` набор собирается по виду карточки:

```ts
const PHYSICAL_SETS: readonly (readonly [PhysicalSet, string])[] = [
  ['base', 'Реки и формы'],
  ['ranges', 'И хребты'],
  ['all', 'И озёра'],
];

/**
 * Числа считаются из каталогов, а не пишутся руками: иначе они разойдутся с
 * ними при первом же новом объекте.
 */
function setChoiceFor(card: ModeCard) {
  if (card.kind === 'city') {
    return {
      legend: 'Какие города',
      value: 'capital',
      options: CITY_SETS.map(([value, label]) => {
        const count = citiesUpTo(value).length;

        return [value, `${label} — ${count} ${citiesWord(count)}`] as const;
      }),
    };
  }

  if (card.kind === 'physical') {
    return {
      legend: 'Какие объекты',
      value: 'base',
      options: PHYSICAL_SETS.map(([value, label]) => {
        const count = physicalFeaturesUpTo(value).length;

        return [value, `${label} — ${count} ${featuresWord(count)}`] as const;
      }),
    };
  }

  return null;
}
```

`CITY_SETS` переезжает в `HomePage` из окна вместе с его пояснением про вложенность наборов.

- [ ] **Step 5: Провести набор в App**

В `src/features/home/HomePage.tsx` функция `start` отдаёт наверх выбранный набор строкой:

```ts
    } else if (card.kind === 'physical') {
      onStartPhysicalRound(card.exerciseType, language, set as PhysicalSet);
    }
```

и то же для городов — `set as CitySet` вместо прежнего `citySet`. Свойство в `HomePageProps`:

```ts
  readonly onStartPhysicalRound: (
    exerciseType: 'find-on-map' | 'name-target',
    language: QuestionLanguage,
    set: PhysicalSet,
  ) => void;
```

В `src/App.tsx` набор превращается в пул на границе — там, где живёт остальное состояние раунда:

```ts
  function startPhysicalRound(
    exerciseType: 'find-on-map' | 'name-target',
    nextLanguage: QuestionLanguage,
    set: PhysicalSet = 'all',
  ) {
    startPhysicalPool(exerciseType, nextLanguage, physicalFeaturesUpTo(set));
  }

  /**
   * Запуск по готовому пулу. Отдельно от выбора набора, потому что «Повторить
   * ошибки» задаёт пул напрямую и никакому набору не соответствует.
   */
  function startPhysicalPool(
    exerciseType: 'find-on-map' | 'name-target',
    nextLanguage: QuestionLanguage,
    features: readonly PhysicalFeature[],
  ) {
    setPhysicalPool(features);
    setExerciseTypes([exerciseType]);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('physical-exercise');
  }
```

Ветка «Повторить ошибки» на экране итогов зовёт `startPhysicalPool` с `repeatFeatures`, ветка «Новый раунд» — `startPhysicalPool` с `physicalPool`, то есть с тем же набором, что и был. Набор отдельным полем не хранится: он выводится из пула, а второй источник правды разошёлся бы с ним.

- [ ] **Step 6: Запустить тесты**

Run: `npx vitest run; echo "exit=$?"` → `exit=0`. Прежние проверки окна и городских наборов обязаны остаться зелёными без правок по существу — только по имени свойства.

- [ ] **Step 7: Коммит**

```bash
git add src/features/home/ModeStartDialog.tsx src/features/home/ModeStartDialog.test.tsx src/features/home/HomePage.tsx src/features/exercise/exercise-modes.ts src/content/physical-features.ts src/App.tsx src/App.test.tsx
git commit -m "feat: выбор набора физических целей перед стартом"
```

---

### Task 5: Проверки набора и журнал

**Files:**
- Test: `src/features/exercise/PhysicalRound.test.tsx`
- Modify: `CHANGELOG.md`, `DECISIONS.md`

- [ ] **Step 1: Написать тесты**

В `src/features/exercise/PhysicalRound.test.tsx`:

```tsx
it('озеро отвлекают только озёрами: знак от заливки отличается видом', () => {
  renderRound('name-target', physicalFeaturesUpTo('all').filter((f) => f.kind === 'lake'));

  const options = screen.getAllByTestId('choice-option');
  const kinds = options.map(
    (option) =>
      physicalFeatures.find((feature) => feature.id === option.dataset.choiceId)!
        .kind,
  );

  expect(options).toHaveLength(4);
  expect(new Set(kinds)).toEqual(new Set(['lake']));
});

it('на 320 px список отвечает за все двадцать четыре объекта', () => {
  renderRound('find-on-map', physicalFeaturesUpTo('all'));

  const list = screen.getByRole('list', { name: 'Список объектов' });

  expect(within(list).getAllByRole('button')).toHaveLength(24);
});

it('каждый набор спрашивает свои цели ровно по разу', () => {
  for (const [set, length] of [
    ['base', 12],
    ['ranges', 18],
    ['all', 24],
  ] as const) {
    const pool = physicalFeaturesUpTo(set);
    const round = createRound(
      pool.map((feature) => physicalTarget(feature.id)),
      {
        roundId: 'r1',
        exerciseTypes: ['find-on-map'],
        language: 'ru',
        random: createSeededRandom(5),
      },
    );

    expect(round.questions, `набор ${set}`).toHaveLength(length);
    expect(new Set(round.questions.map((q) => q.target.id)).size).toBe(length);
  }
});
```

Импорты этого файла дополняются `createRound`, `physicalTarget` из `../../domain/round` и `createSeededRandom` из `../../domain/random`.

Проверка «прогресс, записанный до изменения, читается без миграции» отдельного теста не требует и требовать не должна: её несут существующие `src/domain/progress-migration.test.ts` и `progress-rules.test.ts`. Они обязаны остаться зелёными **без единой правки** — если хоть один пришлось тронуть, значит миграция всё-таки понадобилась, и это повод остановиться и позвать владельца продукта, а не чинить тест.

Импорт `physicalFeaturesUpTo` добавляется к существующему импорту из `../../content/physical-features`.

- [ ] **Step 2: Запустить тесты**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx; echo "exit=$?"` → `exit=0`. Оба теста обязаны пройти без правок кода: отвлекающие уже группируются по роду, а список уже строится по переданному пулу. Если хоть один падает — это настоящая находка, и чинится код, а не тест.

- [ ] **Step 3: Обновить журналы**

В `CHANGELOG.md`, в `## [Unreleased]` → `### Added`, первой записью — что добавилось: шесть хребтов, шесть озёр, три набора, почему у озера знак вместо контура и почему хребет не отдельный род.

В `DECISIONS.md` — строкой на каждое решение владельца продукта от 2026-08-06: состав хребтов по направлениям (а не по высоте), состав озёр (Цинхай и пять пресных), три ступени набора, группировка отвлекающих по способу отрисовки, знак вместо контура у озера с измерением, которое к этому привело.

- [ ] **Step 4: Полная проверка и коммит**

Run: `npm run build; echo "build exit=$?"` → 0
Run: `npm test; echo "test exit=$?"` → 0
Run: `npm run lint; echo "lint exit=$?"` → 0

Вручную на 1440×900 и на 320 px: три строки набора в окне, длина раунда по выбору, ответ мышью по хребту и по озеру, ответ из списка, `Tab` до объекта и `Enter`, исход у хребта штриховкой и у озера кольцом, увеличение и панорамирование, порядок отрисовки хребтов — не прикрыт ли какой соседней формой.

```bash
git add src/features/exercise/PhysicalRound.test.tsx CHANGELOG.md DECISIONS.md
git commit -m "feat: хребты и озёра — проверки набора и журнал"
```

---

## Чем закрывается спек

| Раздел спека | Где сделано |
| --- | --- |
| §1 состав целей | задачи 1 и 2 |
| §2 геометрия | задача 2 |
| §3 карта | задачи 1 (хребты рисуются сами) и 3 (озёра) |
| §4 игры | задачи 4 и 5 |
| §5 имена | задачи 1 и 2 (`docs/sources/physical.md`) |
| §6 проверки | задачи 1, 2, 5 |
