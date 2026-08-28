# Моря, залив и пролив — план шага 3

> **Для исполнителя:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:executing-plans`.

**Цель:** завести род «морской объект» и пять целей — Жёлтое, Восточно-Китайское
и Южно-Китайское моря, Бохайский залив и Тайваньский пролив. Целей станет 39,
и физическая карта наконец перестанет молчать о воде за берегом.

**Устройство:** морской контур рисуется вне маски суши — маска прячет ступени
за границей Китая, а море за границей и живёт. Постоянных границ между морями
нет (решение владельца продукта, вариант В макета): вода остаётся ровной, и на
карте не появляется ни одной линии, которой нет в природе. Контур моря
показывается при наведении, фокусе и выборе — тем же правилом, что подпись, и
той же обводкой, что у формы рельефа.

**Инструменты:** TypeScript, React 19, Vite, Vitest 4. Геометрия — Natural Earth,
набор `ne_10m_geography_marine_polys`; выжимка обновляется
`npm run extract:physical` (нужна сеть).

## Общие ограничения

- Интерфейс и задания по-русски, китайские названия в Unicode.
- Каждый факт — с источником в `src/content/sources.ts` и записью в
  `docs/sources/sources.md`.
- Сгенерированные файлы правятся только генератором.
- После правки контента — `npm run generate:fonts` (из знаков новых имён
  подмножеству недостаёт одного: 渤).
- Ветка `feat/physical-marine`; перед слиянием — `npm run lint`, `npm test`,
  `npm run build`, и **по коду выхода**, а не по строке в выводе.
- Спек: `docs/superpowers/specs/2026-08-28-physical-objects-design.md`, раздел
  «3. Пять морей».

## Числа, посчитанные заранее

Геометрия проверена на настоящих данных 2026-08-28: пять тел, обрезанных по
рамке карты, дают цель и подпись внутри листа.

| `id` | Имя | `ne_id` | Род | Цель, px | Подпись | Омываемые регионы |
| --- | --- | --- | --- | --- | --- | --- |
| `yellow-sea` | Жёлтое море 黄海 | 1159115999 | `sea` | 95,3 | 625, 334 | Ляонин, Шаньдун, Цзянсу |
| `east-china-sea` | Восточно-Китайское море 东海 | 1159116027 | `sea` | 129,8 | 663, 407 | Цзянсу, Шанхай, Чжэцзян, Фуцзянь, Тайвань |
| `south-china-sea` | Южно-Китайское море 南海 | 1159115273 | `sea` | 116,2 | 559, 543 | Гуандун, Хайнань, Фуцзянь, Тайвань |
| `bohai` | Бохайский залив 渤海 | 1159117171 | `sea` | 41,8 | 586, 273 | Ляонин, Хэбэй, Тяньцзинь, Шаньдун |
| `taiwan-strait` | Тайваньский пролив 台湾海峡 | 1159116947 | `strait` | 31,9 | 581, 486 | Фуцзянь, Тайвань |

Бохайский залив в наборе помечен `sea`, а не `gulf`: род в справочнике ставится
по существу («Залив»), а не по полю набора, и это надо записать комментарием —
иначе первый же читатель решит, что перепутано.

Тела почти не перекрываются: у Тайваньского пролива 3 % вершин лежат в соседних
морях, у Бохайского залива 5 % — в Жёлтом. Это общие кромки, а не вложенность,
но порядок проверки всё равно берётся по площади вверх — тем же правилом, что у
форм.

## Файлы

| Файл | Ответственность |
| --- | --- |
| `src/content/types.ts` | род `marine` и его ветвь |
| `src/content/physical-features.ts` | пять записей, факты, слова рода, набор |
| `scripts/extract-physical-source.ts` | морские тела в выжимке |
| `scripts/generate-physical-geometry.ts` | `MARINE_SHAPES` с подписями |
| `src/map/marine-hit.ts` | порядок среди морей — новый |
| `src/map/physical-hit.ts` | море проверяется последним и только вне суши |
| `src/map/PhysicalLayer.tsx` | морской слой вне маски, обводка при наведении |
| `src/map/validate-map.ts` | подпись в воде, порог цели, знак родов |
| `src/features/atlas/AtlasPage.tsx`, `src/features/home/HomePage.tsx` | перечисление родов и набор |

---

### Задача 1: Род морского объекта в справочнике

**Файлы:** `src/content/types.ts`, `src/content/physical-features.ts`,
`src/content/physical-features.test.ts`, `src/content/sources.ts`,
`docs/sources/sources.md`, `src/domain/validate-catalog.ts`

- [ ] **Шаг 1: Расширить тип**

```ts
export type PhysicalKind = 'river' | 'landform' | 'lake' | 'point' | 'marine';
```

и ветвь рядом с точкой:

```ts
    | {
        readonly kind: 'marine';
        /**
         * Море, залив или пролив. Род ставится по существу, а не по полю
         * набора: Бохайский залив Natural Earth помечает `sea`.
         */
        readonly marine: 'sea' | 'gulf' | 'strait';
        /** Номер объекта в Natural Earth — как у озера и крайней точки. */
        readonly neId: number;
      }
```

- [ ] **Шаг 2: Написать падающий тест слов рода**

В `src/content/physical-features.test.ts`:

```ts
it('море, залив и пролив называются по-своему', () => {
  expect(physicalKindLabel(physicalFeatureById('yellow-sea')!)).toBe('Море');
  expect(physicalKindLabel(physicalFeatureById('bohai')!)).toBe('Залив');
  expect(physicalKindLabel(physicalFeatureById('taiwan-strait')!)).toBe(
    'Пролив',
  );
});
```

- [ ] **Шаг 3: Слова рода и конструктор**

`PHYSICAL_KIND_LABELS` получает `marine: 'Море'`, а `physicalKindLabel` — ветвь:

```ts
  if (feature.kind === 'marine') {
    if (feature.marine === 'gulf') {
      return 'Залив';
    }

    return feature.marine === 'strait' ? 'Пролив' : 'Море';
  }
```

Конструктор рядом с `point`:

```ts
const MARINE = ['natural-earth-marine-polys-5.1.2'] as const;

/**
 * Морской объект: море, залив или пролив. Контур есть, но лежит он вне суши,
 * и маска карты его не касается — маска прячет ступени за границей Китая, а
 * море за границей и живёт.
 */
function marine(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  kindOfMarine: 'sea' | 'gulf' | 'strait',
  neId: number,
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'marine',
    nameRu,
    nameZh,
    pinyin,
    marine: kindOfMarine,
    neId,
    regionIds,
    facts: FACTS[id] ?? [],
    sourceIds: MARINE,
  };
}
```

- [ ] **Шаг 4: Запись набора в реестр источников**

В `src/content/sources.ts` — по образцу соседних наборов Natural Earth:

```ts
  {
    id: 'natural-earth-marine-polys-5.1.2',
    title: 'Natural Earth 10m Geography Marine Polys, версия 5.1.2',
    organization: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/',
    accessedAt: '2026-08-28',
    covers: ['контуры морей, заливов и проливов у берегов Китая'],
  },
```

и такой же блок в `docs/sources/sources.md`.

- [ ] **Шаг 5: Проверка каталога знает новый род**

В `src/domain/validate-catalog.ts` ветвь `feature.kind === 'point'` уже
проверяет целость номера; допишите рядом такую же для `marine` — иначе
`feature.step` снова окажется у рода, которого у него нет, и сборка упадёт
типами (так и случилось на шаге 2):

```ts
    } else if (feature.kind === 'marine') {
      if (!Number.isInteger(feature.neId)) {
        errors.push(
          `Номер объекта не целое число у морской цели ${feature.id}: ${feature.neId}`,
        );
      }
    } else if (![1, 2, 3].includes(feature.step)) {
```

Тем же обходом проверьте `scripts/physical-fingerprint.ts`: там перебор родов
заканчивается `feature.step`, и новому роду нужна своя строка отпечатка —
`marine:${feature.id}:${feature.neId}`.

- [ ] **Шаг 6: Факты и пять записей**

Факты пишутся по прочитанным статьям. Адреса для проверки (у «Британники» они
открываются только браузером):

| Цель | Первый адрес | Если статьи нет |
| --- | --- | --- |
| `yellow-sea` | `https://www.britannica.com/place/Yellow-Sea` | `https://www.britannica.com/place/China/Drainage` |
| `east-china-sea` | `https://www.britannica.com/place/East-China-Sea` | статья о Жёлтом море описывает соседа |
| `south-china-sea` | `https://www.britannica.com/place/South-China-Sea` | — |
| `bohai` | `https://www.britannica.com/place/Bo-Hai` | статья о Жёлтом море |
| `taiwan-strait` | `https://www.britannica.com/place/Taiwan-Strait` | `https://www.britannica.com/place/Fujian` |

Записи (регионы посчитаны по геометрии тем же правилом, которым их проверяет
`validate:map`):

```ts
  marine('yellow-sea', 'Жёлтое море', '黄海', 'Huáng Hǎi', 'sea', 1159115999, [
    'liaoning',
    'shandong',
    'jiangsu',
  ]),
  marine(
    'east-china-sea',
    'Восточно-Китайское море',
    '东海',
    'Dōng Hǎi',
    'sea',
    1159116027,
    ['jiangsu', 'shanghai', 'zhejiang', 'fujian'],
  ),
  marine(
    'south-china-sea',
    'Южно-Китайское море',
    '南海',
    'Nán Hǎi',
    'sea',
    1159115273,
    ['guangdong', 'hainan', 'fujian'],
  ),
  marine('bohai', 'Бохайский залив', '渤海', 'Bó Hǎi', 'gulf', 1159117171, [
    'liaoning',
    'hebei',
    'tianjin',
    'shandong',
  ]),
  marine(
    'taiwan-strait',
    'Тайваньский пролив',
    '台湾海峡',
    'Táiwān Hǎixiá',
    'strait',
    1159116947,
    ['fujian', 'taiwan'],
  ),
```

Тайвань в списках регионов не заявлен намеренно: он в каталоге есть, но
приписывать ему берега двух морей в школьном тренажёре — отдельное решение,
которого владелец продукта не принимал. Если проверка потребует, обсудите, а не
дописывайте молча.

- [ ] **Шаг 7: Набор и счётчики**

Морские цели идут последним набором вместе со знаками; подпись набора в
`src/features/home/HomePage.tsx` становится `['all', 'И озёра, точки и моря']`.
В `physicalFeaturesUpTo` добавьте `feature.kind !== 'marine'` к тому же фильтру,
что отсекает озёра и точки.

Счётчики в тестах: 34 → 39 (`scripts/validate-content.ts`,
`src/domain/validate-physical.test.ts`, `src/domain/round.test.ts`,
`src/App.test.tsx`, `src/features/exercise/PhysicalRound.test.tsx`,
`src/features/atlas/AtlasPage.test.tsx`). Наборы: base и ranges не меняются,
`all` — 39.

- [ ] **Шаг 8: Проверить и закоммитить**

```bash
npx vitest run src/content src/domain
npm run generate:fonts
git add src scripts docs/sources/sources.md
git commit -m "content: род морских целей и пять записей"
```

---

### Задача 2: Геометрия морей

**Файлы:** `scripts/extract-physical-source.ts`,
`scripts/generate-physical-geometry.ts`, `src/map/physical-geometry.ts`
(генератором)

- [ ] **Шаг 1: Добавить набор в выжимку**

В `scripts/extract-physical-source.ts`, рядом с озёрами и точками:

```ts
const marineIds = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'marine' ? [feature.neId] : [],
  ),
);

const marineFeatures = await load('ne_10m_geography_marine_polys');
const marine = marineFeatures
  .filter(
    (feature) =>
      feature.geometry !== null &&
      marineIds.has(feature.properties.ne_id as number),
  )
  .map((feature) => ({
    neId: feature.properties.ne_id as number,
    rings: polygonRings(feature.geometry as Geometry).map((ring) =>
      ring.map(round),
    ),
  }));

const missingMarine = [...marineIds].filter(
  (id) => !marine.some((item) => item.neId === id),
);
if (missingMarine.length > 0) {
  throw new Error(`Не найдены морские тела: ${missingMarine.join(', ')}`);
}
```

`marine` — в объект записи и в итоговую строку счёта.

- [ ] **Шаг 2: Обновить выжимку**

```bash
npm run extract:physical
```

Ожидается: строка со счётом, морских тел 5. Нужна сеть. Выжимка вырастет
примерно на 60 КБ — у Южно-Китайского моря 987 точек.

- [ ] **Шаг 3: Научить генератор**

Тип разбора получает `marine: { neId: number; rings: [number, number][][] }[]`.
Сборка — рядом с озёрами, но с двумя отличиями: кольца обрезаются по рамке (у
Южно-Китайского моря середина за листом), а подпись считается свободным кругом,
который обязан стоять в воде и вне чужих целей:

```ts
const marineById = new Map<number, [number, number][][]>(
  source.marine.map((item) => [item.neId, item.rings]),
);

const marineShapes = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'marine') {
    return [];
  }

  const rings = (marineById.get(feature.neId) ?? [])
    .map((ring) =>
      clipRingToFrame(simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS), FRAME),
    )
    .filter((ring) => ring.length > 3);

  if (rings.length === 0) {
    throw new Error(
      `Нет колец у морской цели ${feature.id}. Запустите npm run extract:physical`,
    );
  }

  /*
   * Подпись обязана стоять в воде: на суше её перехватила бы форма рельефа или
   * регион, а в ленте реки — река. Правило то же, что у формы, только суша тут
   * запрещена, а не обязательна.
   */
  const label = largestFreeCircle(rings, {
    isAllowed: (x, y) => !containsPoint(landRings, x, y) && isFreeOfWater(x, y),
  });

  return [{ featureId: feature.id, rings, label }];
});
```

Запись — как у озёр, с типом:

```ts
export type MarineShape = {
  readonly featureId: string;
  readonly d: string;
  /** Куда ставить подпись: середина свободного круга в воде. */
  readonly labelX: number;
  readonly labelY: number;
};

export const MARINE_SHAPES: readonly MarineShape[] = [ ... ];
```

- [ ] **Шаг 4: Перегенерировать и сверить с числами**

```bash
npm run generate:physical
```

Ожидается: пять записей `MARINE_SHAPES`; подписи около значений из таблицы
выше (625, 334 у Жёлтого; 559, 543 у Южно-Китайского — внутри листа, руками
ставить ничего не нужно).

- [ ] **Шаг 5: Коммит**

```bash
git add scripts src/map/physical-geometry.ts
git commit -m "feat: геометрия морей, залива и пролива"
```

---

### Задача 3: Правило попадания

**Файлы:** создать `src/map/marine-hit.ts`, `src/map/marine-hit.test.ts`;
изменить `src/map/physical-hit.ts`, `src/map/physical-hit.test.ts`

- [ ] **Шаг 1: Написать падающий тест**

`src/map/marine-hit.test.ts`:

```ts
import { expect, it } from 'vitest';
import { MARINE_SHAPES } from './physical-geometry';
import { marineAt } from './marine-hit';

it('точка в море достаётся своему морю', () => {
  for (const shape of MARINE_SHAPES) {
    expect(marineAt(shape.labelX, shape.labelY)).toBe(shape.featureId);
  }
});

/* Общая кромка достаётся меньшему: пролив уже моря, залив уже моря. */
it('на общей кромке побеждает меньший', () => {
  const strait = MARINE_SHAPES.find(
    (shape) => shape.featureId === 'taiwan-strait',
  )!;

  expect(marineAt(strait.labelX, strait.labelY)).toBe('taiwan-strait');
});

it('суша морю не достаётся', () => {
  expect(marineAt(400, 300)).toBeNull();
});
```

- [ ] **Шаг 2: Написать модуль**

`src/map/marine-hit.ts` — по образцу `physical-hit.ts`: разбор путей один раз,
габарит, сортировка по площади вверх, `containsPoint`.

```ts
/**
 * Какое море под точкой.
 *
 * Порядок — по площади вверх, как у форм: у Тайваньского пролива и Бохайского
 * залива с соседями общие кромки, и на них побеждает меньший.
 */
export function marineAt(x: number, y: number): string | null
```

- [ ] **Шаг 3: Поставить море в общее правило**

В `src/map/physical-hit.ts`, после форм и до возврата `null`:

```ts
  /*
   * Море проверяется последним и только вне суши: морские контуры местами
   * заходят на берег — генерализация, — и без проверки суши море перехватывало
   * бы нажатие по приморской области.
   */
  if (!isOnLand(x, y)) {
    return marineAt(x, y);
  }

  return null;
```

Правило в шапке модуля дописать словами.

- [ ] **Шаг 4: Тест в общем правиле**

В `src/map/physical-hit.test.ts`:

```ts
it('каждая морская цель достаётся себе в точке своей подписи', () => {
  for (const shape of MARINE_SHAPES) {
    expect(physicalTargetAt(shape.labelX, shape.labelY, 1)).toBe(
      shape.featureId,
    );
  }
});
```

- [ ] **Шаг 5: Проверить и закоммитить**

```bash
npx vitest run src/map
git add src/map
git commit -m "feat: море под точкой — правило попадания"
```

---

### Задача 4: Морской слой

**Файлы:** `src/map/PhysicalLayer.tsx`, `src/map/PhysicalLayer.test.tsx`,
`src/styles.css`

- [ ] **Шаг 1: Написать падающий тест**

```ts
it('моря нарисованы вне маски суши и без постоянных границ', () => {
  const { container } = renderLayer();

  const seas = container.querySelectorAll('.sea-shape');

  expect(seas).toHaveLength(5);
  expect(container.querySelector('.seas')?.getAttribute('mask')).toBeNull();
});

it('морская цель названа читалке экрана', () => {
  const { container } = renderLayer({ onSelect: () => {} });

  const sea = container.querySelector('.sea-shape[data-feature-id="yellow-sea"]');

  expect(sea?.getAttribute('role')).toBe('button');
  expect(sea?.getAttribute('aria-label')).toMatch(/Жёлтое море/);
});
```

- [ ] **Шаг 2: Нарисовать слой**

Группа `.seas` — до подписей и без маски. Каждый контур: `fill: transparent`,
`pointer-events: none` (цель считает карта), `tabIndex`, `aria-label`,
`onKeyDown` — как у формы рельефа. Подписи морей добавляются в `LABELLED`
из `MARINE_SHAPES`.

Стили в `src/styles.css`:

```css
/*
 * Море рисуется без постоянной границы: вода остаётся ровной, и на карте не
 * появляется ни одной линии, которой нет в природе (решение владельца
 * продукта, вариант В макета). Контур показывается при наведении, фокусе и
 * выборе — тем же правилом, что подпись, и той же обводкой, что у формы.
 */
.china-map .physical-layer .sea-shape {
  fill: transparent;
  pointer-events: none;
  stroke: none;
}

.china-map .physical-layer .sea-shape:focus-visible,
.china-map .physical-layer .sea-shape[data-hovered='true'],
.china-map .physical-layer .sea-shape[data-selected='true'] {
  stroke: var(--map-highlight);
  stroke-width: 1.6;
}
```

Исход ответа показывается так же, как у формы: `[data-outcome]` со штриховкой —
возьмите правило соседней `.relief-shape` и повторите его для `.sea-shape`.

- [ ] **Шаг 3: Проверить и закоммитить**

```bash
npx vitest run src/map/PhysicalLayer.test.tsx
git add src/map src/styles.css
git commit -m "feat: морской слой на физической карте"
```

---

### Задача 5: Проверки карты

**Файлы:** `src/map/validate-map.ts`, `src/map/validate-map.test.ts`,
`scripts/validate-map.ts`

- [ ] **Шаг 1: Расширить геометрию проверки**

`PhysicalGeometry` получает `marine: ReadonlyMap<string, Point[][]>` и
`marineLabels: ReadonlyMap<string, Point>`; `pointsOf` для `kind === 'marine'`
отдаёт кольца моря — тогда общие проверки (рамка, касание заявленных регионов)
работают без правок.

- [ ] **Шаг 2: Написать проверки и тесты**

Для морской цели:

- геометрия есть, иначе «Нет геометрии у цели …» (общая проверка уже это
  делает);
- подпись есть, лежит внутри контура и **не на суше** — зеркало правила формы;
- свободный круг у подписи не меньше `MIN_TARGET_PX`;
- подпись не в цели воды — тем же `nearestWater`, что уже написан для форм.

Тест — по образцу «ловит подпись формы вне суши», только наоборот: подпись моря
на суше должна ронять проверку.

- [ ] **Шаг 3: Передать из скрипта и проверить**

```bash
npm run build; echo "код выхода: $?"
```

Ожидается: 0 и строка «Проверено физических целей: 39».

- [ ] **Шаг 4: Коммит**

```bash
git add src/map scripts/validate-map.ts
git commit -m "feat: проверка морских целей"
```

---

### Задача 6: Атлас, снимки, проверка глазами и документы

- [ ] **Шаг 1: Перечисление родов**

`src/features/atlas/AtlasPage.tsx`: «реки, формы рельефа, озёра, крайние точки и
моря». Поправьте ожидание в тесте атласа.

- [ ] **Шаг 2: Снимки пяти коллекций**

Пять новых страниц коллекций (`feature-yellow-sea` и далее) тянут пять кадров.
Выберите заглавные снимки статей Википедии, посмотрите каждый глазами — у
морей заглавным часто стоит карта или спутниковый снимок, и такой кадр ученику
ничего не показывает; в этом случае берите вид берега или пролива. Затем:

```bash
npm run fetch:photos
```

и подписи в `FEATURE_PHOTOS` по описаниям файлов.

- [ ] **Шаг 3: Проверка глазами**

```bash
npm run dev
```

Атлас → «Физическая»:

1. Вода ровная: постоянных границ между морями нет.
2. Наведение обводит море и называет его; в игре подпись скрыта, обводка
   остаётся.
3. Нажатие в каждое из пяти открывает свою карточку.
4. Нажатие по приморской области достаётся области, а не морю.
5. Обход с клавиатуры доходит до каждой морской цели.

- [ ] **Шаг 4: Документы**

`CHANGELOG.md` — о пяти целях и новом роде; `DECISIONS.md` — о варианте В и о
том, почему у моря нет постоянной границы; `docs/sources/physical.md` — о
наборе морских тел и о том, что Бохай в наборе помечен морем, а назван заливом.

- [ ] **Шаг 5: Полная проверка**

```bash
npm run lint; echo "линтер: $?"
npm test
npm run build; echo "сборка: $?"
```

- [ ] **Шаг 6: Коммит**

```bash
git add -A
git commit -m "docs: моря на физической карте"
```

---

## После плана

Спек «Новые объекты физической географии» закрыт целиком: 39 целей, пять родов,
правило попадания названо словами и выполняется на каждом из них.
