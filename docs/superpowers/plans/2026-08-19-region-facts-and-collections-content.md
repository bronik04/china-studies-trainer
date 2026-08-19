# План: факты регионов и контент коллекций

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Цель:** 34 региона получают по 2–3 проверенных факта, 12 коллекций — вводку, 3–4 заметки и источники; каждый факт подтверждён статьёй реестра, сборка проверяет это автоматически.

**Архитектура:** чистый контент + валидация. Данные — `src/content/regions.ts` и `src/content/collections.ts`; реестр — `src/content/sources.ts` + `docs/sources/sources.md` (синхронно); проверки — `src/domain/validate-catalog.ts` через `scripts/validate-content.ts`. UI не трогаем (спека, решение 3).

**Стек:** TypeScript-модули контента, vitest для валидатора, WebSearch/WebFetch для сверки (только авторская фаза).

## Глобальные ограничения

- Подход «источники сначала»: факт пишется ТОЛЬКО из утверждения, прочитанного в статье реестра. Не помнишь, где прочитал, — не пишешь факт. Числовые факты — два источника и год прямо в тексте факта.
- Круг источников (решение владельца): БРЭ (bigenc.ru) — основной; Britannica — сверка; ЮНЕСКО (whc.unesco.org) — объекты наследия; stats.gov.cn и профильные ведомства КНР — числа. Другие источники — только если этих не хватило, с пометкой в отчёте задачи.
- Правила CONTENT_GUIDE.md: один факт — одно утверждение; карточка региона до 100 слов суммарно; без рейтингов, стереотипов, политических оценок; пиньинь со знаками тонов; китайские названия новых сущностей — иероглифами (AGENTS.md).
- Новые иероглифы ломают `validate:fonts`: каждый контентный таск завершается `npm run build`; при падении fonts — `npm run generate:fonts`, пересобранные файлы `src/assets/fonts` и `scripts/font-coverage.json` входят в тот же коммит.
- `sources.ts` и `docs/sources/sources.md` пополняются синхронно в одном коммите; формат записей — ниже, id в стиле существующих.
- Валидатор ужесточается ПОСЛЕДНЕЙ задачей каждой ветки — до неё сборка остаётся зелёной при частично заполненном контенте.
- Часть A — ветка `content/region-facts` (создана, спека в ней); часть B — ветка `content/collections` от master после слияния A.
- Коммиты завершаются строкой `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Форматы (общие для всех контентных задач)

**Запись реестра** — в `src/content/sources.ts` (в конец массива) и зеркально в `docs/sources/sources.md`:

```ts
{
  id: 'bre-sichuan',                    // bre-* | britannica-* | unesco-*-NNN | stats-china-*
  title: 'Сычуань',                     // заголовок статьи как в источнике
  organization: 'Большая российская энциклопедия',
  url: 'https://bigenc.ru/…',           // URL конкретной статьи
  accessedAt: '2026-08-19',             // реальная дата обращения
  covers: ['факты региона Сычуань'],
},
```

```markdown
## bre-sichuan

- Название: Сычуань
- Организация: Большая российская энциклопедия
- URL: https://bigenc.ru/…
- Дата обращения: 2026-08-19
- Лицензия: ссылка используется как источник данных; текст и изображения не копируются.
- Подтверждает: факты региона Сычуань.
```

**Факт региона** — `Fact` из `src/content/types.ts`; тело по-русски, новые китайские названия — иероглифами с пиньинем:

```ts
{
  title: 'Кухня',
  body: 'Сычуаньская кухня известна острым вкусом и перцем хуацзяо (花椒, huājiāo).',
  sourceIds: ['bre-sichuan'],
},
```

**Редакционный чек-лист каждого факта** (CONTENT_GUIDE): одно утверждение; подтверждён названной статьёй; число — с годом и вторым источником; орфография и тоны; уместно для школьника; не устареет за год без даты.

---

## Часть A — ветка `content/region-facts`

### Задача A1: фабрика `region()` + образцовый батч «Север»

**Файлы:**
- Изменить: `src/content/regions.ts` (сигнатура фабрики + 6 регионов)
- Изменить: `src/content/sources.ts`, `docs/sources/sources.md`

**Интерфейсы:**
- Производит: сигнатура `region(id, kind, nameRu, nameZh, pinyin, capitalCityId, facts)` — обязательный седьмой параметр `facts: readonly Fact[]`; задачи A2–A6 передают его для своих регионов; до задачи A7 незаполненные регионы передают `[]`.

- [ ] **Шаг 1: расширить фабрику**

В `src/content/regions.ts` добавить импорт `Fact` и параметр:

```ts
import type { Fact, Region, RegionKind } from './types';

function region(
  id: string,
  kind: RegionKind,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  capitalCityId: string,
  facts: readonly Fact[],
): Region {
  return {
    id,
    kind,
    nameRu,
    nameZh,
    pinyin,
    capitalCityId,
    mapAreaId: id,
    facts,
    sourceIds,
  };
}
```

Всем 34 вызовам добавить седьмым аргументом `[]` (механически), затем в этой задаче заполнить шесть.

- [ ] **Шаг 2: исследование и запись фактов батча**

Регионы батча: `beijing, tianjin, hebei, shanxi, inner-mongolia, liaoning`.

Для каждого региона по порядку:
1. Найти статью БРЭ (WebSearch: `<название региона> bigenc.ru`; прочитать WebFetch) и статью Britannica (`<pinyin> province Britannica`).
2. Добавить обе записи в реестр (формат выше; для региона без пригодной статьи БРЭ — второй источник ЮНЕСКО/stats по факту, отметить в отчёте).
3. Выбрать 2–3 факта по рамке: физгеография → культура/история → хозяйство/отличие. Каждый — из прочитанного текста, по чек-листу.
4. Вписать факты в вызов `region(...)`.

- [ ] **Шаг 3: проверка сборки**

`npx tsc -b && npm run build`. Если упал `validate:fonts` — `npm run generate:fonts` и включить обновлённые `src/assets/fonts/*` и `scripts/font-coverage.json` в коммит. Ожидание: сборка зелёная.

- [ ] **Шаг 4: коммит**

```bash
git add src/content/regions.ts src/content/sources.ts docs/sources/sources.md src/assets/fonts scripts/font-coverage.json
git commit -m "content: факты регионов севера — Пекин, Тяньцзинь, Хэбэй, Шаньси, Внутренняя Монголия, Ляонин"
```

### Задачи A2–A6: остальные батчи

Процедура идентична шагам 2–4 задачи A1 (фабрика уже расширена). Состав и заголовки коммитов:

| Задача | Регионы | Коммит |
| --- | --- | --- |
| A2 | heilongjiang, jilin, shanghai, jiangsu, zhejiang, anhui | `content: факты регионов северо-востока и востока — Хэйлунцзян, Цзилинь, Шанхай, Цзянсу, Чжэцзян, Аньхой` |
| A3 | shandong, henan, fujian, jiangxi, hubei, hunan | `content: факты регионов центра и юго-востока — Шаньдун, Хэнань, Фуцзянь, Цзянси, Хубэй, Хунань` |
| A4 | guangdong, guangxi, hainan, hong-kong, macao, taiwan | `content: факты регионов юга — Гуандун, Гуанси, Хайнань, Гонконг, Макао, Тайвань` |
| A5 | chongqing, sichuan, guizhou, yunnan, tibet | `content: факты регионов юго-запада — Чунцин, Сычуань, Гуйчжоу, Юньнань, Тибет` |
| A6 | shaanxi, gansu, qinghai, ningxia, xinjiang | `content: факты регионов северо-запада — Шэньси, Ганьсу, Цинхай, Нинся, Синьцзян` |

Каждая задача — свой отчёт с перечнем добавленных источников и спорных мест. Для Тайваня, Гонконга и Макао действует правило «без политических оценок» — факты географические и культурные.

### Задача A7: валидатор фактов, CHANGELOG, проверки

**Файлы:**
- Изменить: `src/domain/validate-catalog.ts` (внутри `validateCatalog`)
- Тест: `src/domain/validate-catalog.test.ts`
- Изменить: `CHANGELOG.md`

Существующее положение (не дублировать): `validateCatalog` копит ошибки в
массив и бросает `ContentValidationError` одним броском
(`validate-catalog.ts:19,80–82`); существование источников фактов УЖЕ
проверяется циклом `validate-catalog.ts:71–77` с текстом «Неизвестный
источник: …» и закрыто тестом `'rejects an unknown fact source reference'`.
Добавляются только: число фактов 2–3, непустые `title`/`body`, непустой
`sourceIds` факта, запрет HTML.

- [ ] **Шаг 1: обновить базовую фикстуру и написать падающие тесты**

Базовая фикстура `region` в `src/domain/validate-catalog.test.ts:15-25`
держит `facts: []` — с новым правилом тест `'accepts a complete catalog…'`
упадёт. Дать ей два валидных факта:

```ts
const region = {
  id: 'sichuan',
  kind: 'province' as const,
  nameRu: 'Сычуань',
  nameZh: '四川省',
  pinyin: 'Sìchuān shěng',
  capitalCityId: 'chengdu',
  mapAreaId: 'sichuan',
  facts: [
    {
      title: 'Кухня',
      body: 'Сычуань известна острой кухней.',
      sourceIds: ['example-educational-source'],
    },
    {
      title: 'Рельеф',
      body: 'Запад занимают горы, восток — Сычуаньская котловина.',
      sourceIds: ['example-educational-source'],
    },
  ],
  sourceIds: ['example-educational-source'],
};
```

Новые тесты (стиль файла — `toThrow(/…/)` по накопленной строке ошибок):

```ts
it('rejects a region with a single fact', () => {
  expect(() =>
    validateCatalog([{ ...region, facts: [region.facts[0]] }], [source]),
  ).toThrow(/Регион sichuan: фактов должно быть 2–3, сейчас 1/);
});

it('rejects a region with four facts', () => {
  const fact = region.facts[0];
  expect(() =>
    validateCatalog([{ ...region, facts: [fact, fact, fact, fact] }], [source]),
  ).toThrow(/фактов должно быть 2–3, сейчас 4/);
});

it('rejects a fact with an empty body', () => {
  expect(() =>
    validateCatalog(
      [{ ...region, facts: [{ ...region.facts[0], body: ' ' }, region.facts[1]] }],
      [source],
    ),
  ).toThrow(/пустые title или body/);
});

it('rejects a fact without sources', () => {
  expect(() =>
    validateCatalog(
      [{ ...region, facts: [{ ...region.facts[0], sourceIds: [] }, region.facts[1]] }],
      [source],
    ),
  ).toThrow(/факт «Кухня» без источника/);
});

it('rejects HTML in a fact body', () => {
  expect(() =>
    validateCatalog(
      [
        {
          ...region,
          facts: [
            { ...region.facts[0], body: 'Сычуань — <b>провинция</b>.' },
            region.facts[1],
          ],
        },
      ],
      [source],
    ),
  ).toThrow(/HTML в тексте факта «Кухня»/);
});
```

- [ ] **Шаг 2: прогон — падают**

`npx vitest run src/domain/validate-catalog.test.ts` — пять новых тестов FAIL (проверок ещё нет), остальные PASS.

- [ ] **Шаг 3: реализация**

В цикл `for (const region of regions)` в `validateCatalog`, рядом с существующим циклом по фактам (`validate-catalog.ts:71–77`), в стиле накопления ошибок:

```ts
if (region.facts.length < 2 || region.facts.length > 3) {
  errors.push(
    `Регион ${region.id}: фактов должно быть 2–3, сейчас ${region.facts.length}`,
  );
}

for (const fact of region.facts) {
  if (fact.title.trim().length === 0 || fact.body.trim().length === 0) {
    errors.push(`Регион ${region.id}: пустые title или body у факта`);
  }
  if (/<[a-z/]/i.test(fact.body)) {
    errors.push(`Регион ${region.id}: HTML в тексте факта «${fact.title}»`);
  }
  if (fact.sourceIds.length === 0) {
    errors.push(`Регион ${region.id}: факт «${fact.title}» без источника`);
  }
  for (const sourceId of fact.sourceIds) {
    if (!sourceIds.has(sourceId)) {
      errors.push(`Неизвестный источник: ${sourceId}`);
    }
  }
}
```

Существующий отдельный цикл по фактам (строки 71–77) при этом удалить — его проверка переехала в общий цикл выше, текст ошибки не изменился.

- [ ] **Шаг 4: прогон — зелёные**

`npx vitest run src/domain/validate-catalog.test.ts` — PASS все.

- [ ] **Шаг 5: CHANGELOG и полные проверки**

В `CHANGELOG.md`, `[Unreleased]` → `### Added`:

```markdown
- Факты регионов: у всех 34 единиц по 2–3 коротких проверенных факта
  (физическая география, культура, хозяйство) с источниками — статьи БРЭ и
  Britannica, для чисел — официальная статистика КНР; реестр источников
  пополнен соответственно. Сборка теперь проверяет: у региона 2–3 факта,
  у факта есть существующий источник, HTML в тексте запрещён.
```

`npx vitest run`, `npm run lint`, `npm run build` — все зелёные.

- [ ] **Шаг 6: коммит**

```bash
git add src/domain/validate-catalog.ts src/domain/validate-catalog.test.ts CHANGELOG.md
git commit -m "content: сборка требует 2–3 проверенных факта у каждого региона"
```

Дальше — финальное сквозное ревью ветки и слияние (контролёр).

---

## Часть B — ветка `content/collections`

Создаётся после слияния A: `git checkout master && git checkout -b content/collections`.

### Задачи B1–B3: контент коллекций по группам

Процедура на каждую коллекцию:
1. Источники: страница ЮНЕСКО для объектов наследия (стена — уже упомянутый в notes список 1987 года; террасы, армия, опера — проверить статус в реестре ЮНЕСКО), статья БРЭ, при числах — второй источник. Записи в `sources.ts` + `sources.md`.
2. `lead` — 2–3 предложения по образцу «Великой стены»: что это, где, чем важно; упоминаемые регионы согласованы с `regionIds`.
3. `notes` — 3–4 утверждения по чек-листу фактов (числа с годом).
4. `sourceIds` — все использованные записи; поле перестаёт быть пустым, плашка «черновик» снимается сама (это ожидаемо).
5. `npm run build`; при падении fonts — `generate:fonts` в тот же коммит.

| Задача | Коллекции | Коммит |
| --- | --- | --- |
| B1 | great-wall (только sourceIds + выверка готовых notes по ним), yuanyang-terraces, yellow-river, taklamakan | `content: коллекции географии — стена, террасы, Хуанхэ, Такла-Макан` |
| B2 | shaanxi, yunnan, guangdong, tibet | `content: коллекции «по регионам» — Шэньси, Юньнань, Гуандун, Тибет` |
| B3 | spring-festival, beijing-opera, terracotta-army, silk-road | `content: коллекции культуры — Праздник весны, опера, армия, Шёлковый путь` |

Для great-wall: каждое из четырёх готовых notes сверить с источником; не подтвердившееся — исправить по источнику (это изменение факта → отдельная строка в CHANGELOG задачи B4 с причиной).

### Задача B4: валидатор коллекций, CHANGELOG, проверки

**Файлы:**
- Изменить: `src/domain/validate-catalog.ts` (новая функция `validateCollections`)
- Тест: `src/domain/validate-catalog.test.ts`
- Изменить: `scripts/validate-content.ts`
- Изменить: `CHANGELOG.md`

- [ ] **Шаг 1: падающие тесты**

В `src/domain/validate-catalog.test.ts` — фикстура коллекции и пять тестов
(фикстуры `source` и `region` уже есть в файле):

```ts
const collection = {
  id: 'great-wall',
  groupId: 'geography' as const,
  nameRu: 'Великая стена',
  nameZh: '长城',
  pinyin: 'Chángchéng',
  kind: 'памятник',
  lead: 'Система укреплений вдоль северной границы Китая.',
  regionIds: ['sichuan'],
  notes: ['Первая заметка.', 'Вторая заметка.', 'Третья заметка.'],
  photos: [],
  sourceIds: ['example-educational-source'],
  relatedIds: [],
};

it('accepts a complete collection', () => {
  expect(() => validateCollections([collection], [source])).not.toThrow();
});

it('rejects a collection with an empty lead', () => {
  expect(() =>
    validateCollections([{ ...collection, lead: ' ' }], [source]),
  ).toThrow(/Коллекция great-wall: пустая вводка/);
});

it('rejects a collection with two notes', () => {
  expect(() =>
    validateCollections(
      [{ ...collection, notes: collection.notes.slice(0, 2) }],
      [source],
    ),
  ).toThrow(/заметок должно быть 3–4, сейчас 2/);
});

it('rejects a collection without sources', () => {
  expect(() =>
    validateCollections([{ ...collection, sourceIds: [] }], [source]),
  ).toThrow(/Коллекция great-wall: без источников/);
});

it('rejects a collection with an unknown source', () => {
  expect(() =>
    validateCollections([{ ...collection, sourceIds: ['missing'] }], [source]),
  ).toThrow(/неизвестный источник — missing/);
});
```

Импорт `validateCollections` добавить в первую строку файла.

- [ ] **Шаг 2: прогон — падают** (`npx vitest run src/domain/validate-catalog.test.ts`)

- [ ] **Шаг 3: реализация**

Новая функция в `src/domain/validate-catalog.ts`, в стиле файла — накопление
ошибок и один бросок `ContentValidationError`:

```ts
export function validateCollections(
  collections: readonly Collection[],
  sources: readonly Source[],
): void {
  const errors: string[] = [];
  const sourceIds = new Set(sources.map((source) => source.id));

  for (const collection of collections) {
    if (collection.lead.trim().length === 0) {
      errors.push(`Коллекция ${collection.id}: пустая вводка`);
    }
    if (collection.notes.length < 3 || collection.notes.length > 4) {
      errors.push(
        `Коллекция ${collection.id}: заметок должно быть 3–4, сейчас ${collection.notes.length}`,
      );
    }
    if (collection.sourceIds.length === 0) {
      errors.push(`Коллекция ${collection.id}: без источников`);
    }
    for (const sourceId of collection.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(
          `Коллекция ${collection.id}: неизвестный источник — ${sourceId}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}
```

Импорт типа `Collection` — из `../content/collections`. В `scripts/validate-content.ts` добавить импорт коллекций и вызов:

```ts
import { collections } from '../src/content/collections';
// …
validateCollections(collections, sources);
```

и дополнить итоговый `console.info` числом коллекций.

- [ ] **Шаг 4: прогон — зелёные**, затем `npx vitest run`, `npm run lint`, `npm run build`.

- [ ] **Шаг 5: CHANGELOG**

`### Added`:

```markdown
- Контент коллекций: у всех 12 — вводка, 3–4 проверенных заметки и источники
  (ЮНЕСКО, БРЭ, статистика КНР); плашка «черновик» снимается данными, а не
  правкой интерфейса. Сборка проверяет вводку, число заметок и существование
  источников у каждой коллекции.
```

Плюс отдельные строки за каждое исправленное утверждение great-wall (если были), с причиной и источником.

- [ ] **Шаг 6: коммит**

```bash
git add src/domain/validate-catalog.ts src/domain/validate-catalog.test.ts scripts/validate-content.ts CHANGELOG.md
git commit -m "content: сборка требует вводку, заметки и источники у каждой коллекции"
```

Дальше — финальное сквозное ревью ветки и слияние (контролёр).

---

## Ревью контента (для контролёра)

Ревью контентной задачи — не диф-на-диф, а выборочная перепроверка: ревьюер
берёт 2–3 факта батча, открывает названные источники и подтверждает, что
утверждение там есть; проверяет чек-лист (одно утверждение, ≤100 слов на
карточку, числа с годом, тоны в пиньине) на всех фактах батча; сверяет
синхронность `sources.ts` ↔ `sources.md`.
