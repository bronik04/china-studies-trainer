# Столицы и правители династий — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Две новые игры по истории — «Династия — столица» и «Династия — правитель» — на двух новых справочниках, сверенных по Britannica.

**Architecture:** Цель раунда остаётся династией (`Target { kind: 'history' }`), а верным ответом считается город или правитель: для этого в домене уже есть `AnswerInput.expectedId` — «чем считать верный ответ, когда он не того же вида, что цель». Поэтому обе игры живут в том же `HistoryRound` под признаком `kind`, освоенность и «повторить ошибки» работают без правок, а итоги по-прежнему перечисляют династии. Лента в этих играх — не поверхность ответа, а подсказка о месте во времени: спрошенная полоса обводится и подписывается, и ответа это не выдаёт — спрашивают город, а не срок.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library. Новых зависимостей нет.

**Область.** Это **шаг 2 из трёх** в `docs/superpowers/specs/2026-08-28-dynasty-modes-design.md` — разделы 5 и 6 спека. Шаг 1 сделан и слит (`efcc941`): исход на ленте, ответ нажатием, игра по годам. Шаг 3 — «расставить по порядку» и пять групп режимов — пойдёт своим планом.

**Решения владельца продукта (2026-08-28).**

- Уточнения в вопросе о столицах приняты: «Столица Западной Хань», «Столица Северной Сун».
- Правитель Суй — **Ян-ди** (隋炀帝), при котором прорыли Великий канал.
- **Троецарствие исключено** из игры о правителях: у эпохи трёх государств нет единственного правителя. Одиннадцать записей вместо двенадцати.
- По одному правителю на династию.

**Решение исполнителя, требующее вашего взгляда при ревью.** Спек описывал таблицу столиц как список вопросов — по строке на перенос столицы. Так нельзя: цель раунда — династия, а `createRound` спрашивает каждую цель ровно один раз, и две строки на Хань дали бы один вопрос дважды. Поэтому строки делятся на **спрашиваемые** (по одной на династию) и **справочные** (Восточная Хань, Южная Сун, ранняя Мин). Справочные не пропадают: они дают отвлекающие варианты — без них у семи вопросов было бы всего три разных ответа, — и они же называются в разборе, где и рассказывают о переносе столицы.

## Global Constraints

- Интерфейс, задания, подписи и ошибки — на русском; китайские названия в Unicode, не только пиньинем.
- У геоданных и текстов источник в `docs/sources`; у каждой строки справочника непустой `sourceIds`, и источник обязан подтверждать именно это утверждение.
- Смысл не несёт один только цвет.
- Цвета, размеры и длительности — только из `src/design/tokens.css`.
- Цель нажатия — 44 px (`--target-min`).
- Домен не вызывает `Math.random`: генератор передаётся снаружи.
- Во время раунда сетевых запросов нет.
- Новые иероглифы в `src` требуют `npm run generate:fonts`, иначе `validate:fonts` уронит сборку.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. Каждая задача заканчивается коммитом. Ветка — `feat/dynasty-content`, создаётся от `master`.

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `docs/sources/dynasties.md` | **новый**: откуда взяты сроки, столицы и правители |
| `src/content/sources.ts` | расширенные `covers` у одиннадцати статей Britannica, новые статьи о правителях |
| `src/content/dynasty-capitals.ts` | **новый**: справочник столиц |
| `src/content/rulers.ts` | **новый**: справочник правителей |
| `src/content/types.ts` | типы `DynastyCapital` и `Ruler` |
| `src/domain/validate-catalog.ts` | `validateDynasties`: династии, столицы, правители |
| `scripts/validate-content.ts` | вызов нового валидатора |
| `src/domain/dynasty-pair-choices.ts` | **новый**: отвлекающие для обеих игр |
| `src/features/exercise/DynastyTimeline.tsx` | метка `asked`: обводка и подпись без заливки |
| `src/features/exercise/HistoryRound.tsx` | два новых значения `kind` |
| `src/features/exercise/exercise-modes.ts` | описания игр, карточки 京 и 帝 |
| `src/App.tsx` | запуск двух новых игр |
| `src/styles.css` | вид метки `asked` |
| `DECISIONS.md`, `CHANGELOG.md`, `EXERCISES.md` | запись решения и изменения |

---

### Task 1: Сверить содержание по Britannica

Работа с источниками, а не с кодом: ни одна строка справочников не пишется по памяти. Одиннадцать статей о династиях в `src/content/sources.ts` уже есть — у них расширяется `covers`; там, где статья о династии не называет правителя или его срок, берётся отдельная статья о нём.

**Files:**
- Create: `docs/sources/dynasties.md`
- Modify: `src/content/sources.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: идентификаторы источников, на которые будут ссылаться задачи 2 и 3.

- [ ] **Step 1: Открыть статьи и выписать факты**

Через браузер (Britannica отдаёт содержимое только так) открыть по очереди:

| Статья | Что проверяем |
| --- | --- |
| `https://www.britannica.com/topic/Han-dynasty` | Чанъань как столица Западной Хань, Лоян — Восточной |
| `https://www.britannica.com/topic/Sui-dynasty` | Дасин (Чанъань); Ян-ди и Великий канал; годы правления Ян-ди |
| `https://www.britannica.com/topic/Tang-dynasty-Chinese-history` | Чанъань; Тай-цзун и годы его правления |
| `https://www.britannica.com/topic/Song-dynasty` | Бяньцзин (Кайфэн) у Северной Сун, Линьань (Ханчжоу) у Южной; Тай-цзу |
| `https://www.britannica.com/topic/Yuan-dynasty` | Даду (Пекин); Хубилай и годы правления |
| `https://www.britannica.com/topic/Ming-dynasty-Chinese-history` | Нанкин до 1421, Пекин после; Чжу Юаньчжан (Хунъу) |
| `https://www.britannica.com/topic/Qing-dynasty` | Пекин; Канси и годы правления |
| `https://www.britannica.com/topic/Xia-dynasty` | Юй как основатель по преданию |
| `https://www.britannica.com/topic/Shang-dynasty` | Чэн Тан как основатель |
| `https://www.britannica.com/topic/Zhou-dynasty` | У-ван как основатель |
| `https://www.britannica.com/topic/Qin-dynasty` | Цинь Шихуанди и годы правления |

Записывать в черновик: русское имя, китайское, пиньинь, годы, одну строку «чем известен» и то, какая статья это подтверждает.

**Стоп-правило.** Если статья о династии не подтверждает годы правления правителя — не додумывать: открыть отдельную статью о нём (`https://www.britannica.com/biography/...`) и добавить её отдельным источником. Если и она не даёт срока — вынести вопрос владельцу продукта, а строку не писать.

- [ ] **Step 2: Расширить `covers` у существующих статей**

Для каждой статьи добавить в `covers` то, что она теперь подтверждает. Пример для Тан:

```ts
    covers: [
      'срок правления династии Тан',
      'расцвет культуры и торговли по Шёлковому пути',
      'столица Чанъань',
      'правление Тай-цзуна',
    ],
```

`covers` — не украшение: по нему проверяют, что источник действительно отвечает за строку справочника. Дописывать в него можно только то, что в статье прочитано.

- [ ] **Step 3: Добавить статьи о правителях, если нужно**

Для каждого правителя, чей срок не назван в статье о династии, добавить в `src/content/sources.ts`:

```ts
  {
    id: 'britannica-kangxi',
    title: 'Kangxi',
    organization: 'Encyclopaedia Britannica',
    shortLabel: 'Britannica',
    url: 'https://www.britannica.com/biography/Kangxi',
    accessedAt: '2026-08-28',
    covers: ['годы правления императора Канси'],
  },
```

`accessedAt` — день, когда статью действительно открыли, а не день правки файла.

- [ ] **Step 4: Написать `docs/sources/dynasties.md`**

По образцу `docs/sources/cities.md`: что за каталоги, сколько записей, откуда имена, откуда годы, что проверяется на сборке. Обязательно назвать три вещи, которые иначе выглядят произволом:

- почему у Ся и Шан правитель помечен преданием;
- почему Троецарствие не участвует в игре о правителях;
- почему столиц в каталоге больше, чем вопросов в игре.

- [ ] **Step 5: Проверка и коммит**

Run: `npm run build`
Expected: `validate:content` проходит (новых ссылок на источники пока нет, проверяется прежнее).

```bash
git add docs/sources/dynasties.md src/content/sources.ts
git commit -m "docs: источники по столицам и правителям династий"
```

---

### Task 2: Справочник столиц

**Files:**
- Create: `src/content/dynasty-capitals.ts`
- Modify: `src/content/types.ts`
- Modify: `src/domain/validate-catalog.ts`
- Modify: `scripts/validate-content.ts`
- Test: `src/content/dynasty-capitals.test.ts` (создать)

**Interfaces:**
- Consumes: источники из задачи 1; `cities` из `src/content/cities.ts`; `dynasties`.
- Produces:
  ```ts
  export type DynastyCapital = {
    readonly id: string;
    readonly dynastyId: string;
    readonly qualifier?: string;
    readonly cityId: string;
    readonly historicNameRu: string;
    readonly historicNameZh: string;
    readonly pinyin: string;
    readonly asked: boolean;
    readonly note?: string;
    readonly sourceIds: readonly string[];
  };

  export const dynastyCapitals: readonly DynastyCapital[];
  export function askedCapitals(): readonly DynastyCapital[];
  export function capitalOfDynasty(dynastyId: string): DynastyCapital | undefined;
  export function validateDynasties(
    dynasties: readonly Dynasty[],
    capitals: readonly DynastyCapital[],
    cities: readonly City[],
    sources: readonly Source[],
  ): void;
  ```
  Задача 3 добавит в него четвёртым доводом `rulers`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/content/dynasty-capitals.test.ts`:

```ts
import { expect, it } from 'vitest';
import { cities } from './cities';
import { dynasties } from './dynasties';
import {
  askedCapitals,
  capitalOfDynasty,
  dynastyCapitals,
} from './dynasty-capitals';

it('каждая столица ссылается на город каталога и на династию', () => {
  for (const capital of dynastyCapitals) {
    expect(cities.some((city) => city.id === capital.cityId)).toBe(true);
    expect(dynasties.some((dynasty) => dynasty.id === capital.dynastyId)).toBe(
      true,
    );
    expect(capital.sourceIds.length).toBeGreaterThan(0);
  }
});

/*
 * Цель раунда — династия, а `createRound` спрашивает каждую ровно один раз:
 * две спрашиваемые строки на Хань дали бы один вопрос дважды.
 */
it('на династию приходится не больше одной спрашиваемой столицы', () => {
  const asked = askedCapitals().map((capital) => capital.dynastyId);

  expect(new Set(asked).size).toBe(asked.length);
});

/*
 * Отвлекающие берутся из городов этого же справочника. Четыре варианта
 * требуют хотя бы четырёх разных городов, иначе вопрос собрать не из чего.
 */
it('разных городов хватает на четыре варианта', () => {
  const distinct = new Set(dynastyCapitals.map((capital) => capital.cityId));

  expect(distinct.size).toBeGreaterThanOrEqual(4);
});

it('столицу династии можно найти по её идентификатору', () => {
  expect(capitalOfDynasty('tang')?.cityId).toBe('xian');
  expect(capitalOfDynasty('three-kingdoms')).toBeUndefined();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/content/dynasty-capitals.test.ts`
Expected: FAIL — модуля `dynasty-capitals` нет.

- [ ] **Step 3: Тип в справочнике типов**

В `src/content/types.ts` рядом с `City`:

```ts
/**
 * Столица династии. Строка, а не поле у династии: столицы переносили, и одно
 * поле заставило бы выбрать между Чанъанем и Лояном, соврав про вторую
 * половину срока.
 *
 * `asked` отделяет вопрос от справки. Спрашивается по одной строке на
 * династию — цель раунда одна, и спросить её дважды нельзя; остальные строки
 * дают отвлекающие варианты и рассказывают о переносе в разборе.
 */
export type DynastyCapital = {
  readonly id: string;
  readonly dynastyId: string;
  /** «Западной Хань», «Северной Сун» — когда у династии столица не одна. */
  readonly qualifier?: string;
  /** Город из каталога: связь проверяется на сборке. */
  readonly cityId: string;
  readonly historicNameRu: string;
  readonly historicNameZh: string;
  readonly pinyin: string;
  readonly asked: boolean;
  /** Строка разбора: чем эта столица важна и куда её переносили. */
  readonly note?: string;
  readonly sourceIds: readonly string[];
};
```

- [ ] **Step 4: Написать справочник**

Создать `src/content/dynasty-capitals.ts`. Значения — из черновика задачи 1; ниже показана форма и первые две строки, остальные заполняются так же.

```ts
import type { DynastyCapital } from './types';

/**
 * Столицы династий. Из двенадцати записей ленты сюда попали семь: у Ся, Шан,
 * Чжоу, Цинь и Троецарствия столицы — Эрлитоу, Инь, Хао, Сяньян и сразу три
 * города — в каталоге городов отсутствуют, а заводить их ради одной игры
 * значило бы переоткрывать состав каталога, утверждённый 2026-08-28.
 *
 * Строк больше, чем вопросов: Восточная Хань, Южная Сун и ранняя Мин не
 * спрашиваются (`asked: false`), но дают отвлекающие варианты и называются в
 * разборе. Без них у семи вопросов было бы три разных ответа на всех.
 */
export const dynastyCapitals: readonly DynastyCapital[] = [
  {
    id: 'han-west',
    dynastyId: 'han',
    qualifier: 'Западной Хань',
    cityId: 'xian',
    historicNameRu: 'Чанъань',
    historicNameZh: '长安',
    pinyin: 'Cháng’ān',
    asked: true,
    note: 'При Восточной Хань столицу перенесли восточнее — в Лоян.',
    sourceIds: ['britannica-han-dynasty'],
  },
  {
    id: 'han-east',
    dynastyId: 'han',
    qualifier: 'Восточной Хань',
    cityId: 'luoyang',
    historicNameRu: 'Лоян',
    historicNameZh: '洛阳',
    pinyin: 'Luòyáng',
    asked: false,
    sourceIds: ['britannica-han-dynasty'],
  },
];
```

Остальные строки:

| `id` | `dynastyId` | `qualifier` | Столица | `cityId` | `asked` |
| --- | --- | --- | --- | --- | --- |
| `sui` | `sui` | — | Дасин 大兴 | `xian` | да |
| `tang` | `tang` | — | Чанъань 长安 | `xian` | да |
| `song-north` | `song` | Северной Сун | Бяньцзин 汴京 | `kaifeng` | да |
| `song-south` | `song` | Южной Сун | Линьань 临安 | `hangzhou` | нет |
| `yuan` | `yuan` | — | Даду 大都 | `beijing` | да |
| `ming-early` | `ming` | ранней Мин | Интянь 应天 | `nanjing` | нет |
| `ming-late` | `ming` | Мин после 1421 года | Пекин 北京 | `beijing` | да |
| `qing` | `qing` | — | Пекин 北京 | `beijing` | да |

Спрашиваемых строк семь, справочных три. Разных городов шесть — на четыре
варианта хватает с запасом.

Ниже — три функции:

```ts
/** Столицы, о которых спрашивают: ровно по одной на династию. */
export function askedCapitals(): readonly DynastyCapital[] {
  return dynastyCapitals.filter((capital) => capital.asked);
}

export function capitalOfDynasty(
  dynastyId: string,
): DynastyCapital | undefined {
  return dynastyCapitals.find(
    (capital) => capital.asked && capital.dynastyId === dynastyId,
  );
}

export function capitalById(id: string): DynastyCapital | undefined {
  return dynastyCapitals.find((capital) => capital.id === id);
}
```

- [ ] **Step 5: Пересобрать шрифты**

Новые иероглифы в `src`: 长安, 洛阳, 大兴, 汴京, 临安, 大都, 应天, 北京. Часть из них уже встречается в названиях городов, часть — нет.

Run: `npm run generate:fonts`
Expected: перезаписаны `src/assets/fonts` и `scripts/font-coverage.json`; в выводе видно, сколько знаков добавилось.

- [ ] **Step 6: Валидатор**

В `src/domain/validate-catalog.ts` добавить:

```ts
/**
 * Династии, их столицы и правители. Прежде лента не проверялась вовсе: её
 * `sourceIds` никто не сверял с каталогом источников, и опечатка в
 * идентификаторе дожила бы до экрана.
 */
export function validateDynasties(
  dynasties: readonly Dynasty[],
  capitals: readonly DynastyCapital[],
  cities: readonly City[],
  sources: readonly Source[],
): void {
  const errors: string[] = [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const dynastyIds = new Set(dynasties.map((dynasty) => dynasty.id));
  const cityIds = new Set(cities.map((city) => city.id));
  const askedByDynasty = new Map<string, number>();

  for (const dynasty of dynasties) {
    if (dynasty.from >= dynasty.to) {
      errors.push(`Срок династии ${dynasty.id} идёт вспять`);
    }

    if (dynasty.sourceIds.length === 0) {
      errors.push(`У династии ${dynasty.id} нет источника`);
    }

    for (const sourceId of dynasty.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }
  }

  for (const capital of capitals) {
    if (!dynastyIds.has(capital.dynastyId)) {
      errors.push(`Столица ${capital.id} ссылается на чужую династию`);
    }

    if (!cityIds.has(capital.cityId)) {
      errors.push(`Столица ${capital.id} ссылается на город вне каталога`);
    }

    if (capital.sourceIds.length === 0) {
      errors.push(`У столицы ${capital.id} нет источника`);
    }

    for (const sourceId of capital.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }

    if (capital.asked) {
      const seen = askedByDynasty.get(capital.dynastyId) ?? 0;
      askedByDynasty.set(capital.dynastyId, seen + 1);
    }
  }

  for (const [dynastyId, count] of askedByDynasty) {
    if (count > 1) {
      errors.push(
        `У династии ${dynastyId} ${count} спрашиваемых столиц: цель раунда ` +
          'спрашивается ровно один раз',
      );
    }
  }

  const distinctCities = new Set(capitals.map((capital) => capital.cityId));
  if (distinctCities.size < CHOICE_COUNT) {
    errors.push(
      `Разных городов среди столиц ${distinctCities.size}, а вариантов в ` +
        `вопросе ${CHOICE_COUNT}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
```

Импорт `CHOICE_COUNT` — из `./choices`, типы `DynastyCapital`, `Dynasty` — из `../content/types`.

В `scripts/validate-content.ts` добавить вызов:

```ts
validateDynasties(dynasties, dynastyCapitals, cities, sources);
```

- [ ] **Step 7: Прогнать проверки**

Run: `npx vitest run src/content/dynasty-capitals.test.ts && npm run build`
Expected: тесты проходят, сборка зелёная, `validate:fonts` доволен после пересборки шрифтов.

- [ ] **Step 8: Коммит**

```bash
git add src/content/dynasty-capitals.ts src/content/dynasty-capitals.test.ts src/content/types.ts src/domain/validate-catalog.ts scripts/validate-content.ts src/assets/fonts scripts/font-coverage.json
git commit -m "feat: справочник столиц династий"
```

---

### Task 3: Справочник правителей

**Files:**
- Create: `src/content/rulers.ts`
- Modify: `src/content/types.ts`
- Modify: `src/domain/validate-catalog.ts`
- Modify: `scripts/validate-content.ts`
- Test: `src/content/rulers.test.ts` (создать)

**Interfaces:**
- Consumes: источники из задачи 1; `dynasties`.
- Produces:
  ```ts
  export type Ruler = {
    readonly id: string;
    readonly dynastyId: string;
    readonly nameRu: string;
    readonly nameZh: string;
    readonly pinyin: string;
    readonly from: number;
    readonly to: number;
    readonly note: string;
    readonly legendary?: boolean;
    readonly sourceIds: readonly string[];
  };

  export const rulers: readonly Ruler[];
  export function rulerOfDynasty(dynastyId: string): Ruler | undefined;
  ```

- [ ] **Step 1: Написать падающий тест**

Создать `src/content/rulers.test.ts`:

```ts
import { expect, it } from 'vitest';
import { dynasties } from './dynasties';
import { rulers, rulerOfDynasty } from './rulers';

it('на династию приходится не больше одного правителя', () => {
  const ids = rulers.map((ruler) => ruler.dynastyId);

  expect(new Set(ids).size).toBe(ids.length);
});

it('каждый правитель ссылается на династию и на источник', () => {
  for (const ruler of rulers) {
    expect(dynasties.some((dynasty) => dynasty.id === ruler.dynastyId)).toBe(
      true,
    );
    expect(ruler.sourceIds.length).toBeGreaterThan(0);
    expect(ruler.nameZh.length).toBeGreaterThan(0);
  }
});

/*
 * Троецарствие — эпоха трёх государств сразу, единственного правителя у неё
 * нет. Решение владельца продукта 2026-08-28: в игру она не идёт.
 */
it('у Троецарствия правителя нет', () => {
  expect(rulerOfDynasty('three-kingdoms')).toBeUndefined();
  expect(rulers).toHaveLength(dynasties.length - 1);
});

/* Правление правителя не может выходить за срок его династии. */
it('правление лежит внутри срока династии', () => {
  for (const ruler of rulers) {
    const dynasty = dynasties.find((item) => item.id === ruler.dynastyId)!;

    expect(ruler.from).toBeGreaterThanOrEqual(dynasty.from);
    expect(ruler.to).toBeLessThanOrEqual(dynasty.to);
  }
});

/* Легендарность произносится словом — как уже сделано с датами Ся и Шан. */
it('легендарные правители помечены', () => {
  expect(rulerOfDynasty('xia')?.legendary).toBe(true);
  expect(rulerOfDynasty('qin')?.legendary).toBeUndefined();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/content/rulers.test.ts`
Expected: FAIL — модуля `rulers` нет.

- [ ] **Step 3: Тип**

В `src/content/types.ts`:

```ts
/**
 * Правитель династии — по одному на запись ленты (решение владельца продукта,
 * 2026-08-28). У Троецарствия его нет: это эпоха трёх государств сразу, и
 * назвать единственного правителя нельзя, не соврав.
 */
export type Ruler = {
  readonly id: string;
  readonly dynastyId: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  readonly from: number;
  readonly to: number;
  /** Чем известен — строка разбора. */
  readonly note: string;
  /**
   * Известен по преданиям, а не по документам. Говорится словом на экране: у
   * Ся и Шан так же помечены даты.
   */
  readonly legendary?: boolean;
  readonly sourceIds: readonly string[];
};
```

- [ ] **Step 4: Написать справочник**

Создать `src/content/rulers.ts`; значения — из черновика задачи 1. Форма первых двух записей:

```ts
import type { Ruler } from './types';

/**
 * Одиннадцать правителей — по одному на династию, кроме Троецарствия.
 *
 * Взят не «самый великий», а тот, кем династия узнаётся в школьном курсе:
 * основатель там, где династия начинается с человека (Цинь Шихуанди, Чжу
 * Юаньчжан), и тот, при ком она сделала главное, там, где основатель
 * малоизвестен (Ян-ди с Великим каналом — решение владельца продукта).
 */
export const rulers: readonly Ruler[] = [
  {
    id: 'yu-the-great',
    dynastyId: 'xia',
    nameRu: 'Юй Великий',
    nameZh: '大禹',
    pinyin: 'Dà Yǔ',
    from: -2070,
    to: -2025,
    note: 'По преданию усмирил великий потоп и сделал власть наследственной.',
    legendary: true,
    sourceIds: ['britannica-xia-dynasty'],
  },
  {
    id: 'qin-shi-huang',
    dynastyId: 'qin',
    nameRu: 'Цинь Шихуанди',
    nameZh: '秦始皇',
    pinyin: 'Qín Shǐhuáng',
    from: -221,
    to: -210,
    note: 'Объединил Китай и принял титул «первого императора»; при нём начали соединять стены северных царств.',
    sourceIds: ['britannica-qin-dynasty'],
  },
];

export function rulerOfDynasty(dynastyId: string): Ruler | undefined {
  return rulers.find((ruler) => ruler.dynastyId === dynastyId);
}

export function rulerById(id: string): Ruler | undefined {
  return rulers.find((ruler) => ruler.id === id);
}
```

Остальные девять: Шан — Чэн Тан 成汤; Чжоу — У-ван 周武王; Хань — У-ди 汉武帝; Суй — Ян-ди 隋炀帝; Тан — Тай-цзун 唐太宗; Сун — Тай-цзу 宋太祖; Юань — Хубилай 忽必烈; Мин — Чжу Юаньчжан 朱元璋; Цин — Канси 康熙. Годы правления — те, что прочитаны в задаче 1, и только они.

- [ ] **Step 5: Расширить валидатор**

В `validateDynasties` добавить довод `rulers` и проверки:

```ts
  const rulerDynasties = new Set<string>();
  for (const ruler of rulers) {
    if (!dynastyIds.has(ruler.dynastyId)) {
      errors.push(`Правитель ${ruler.id} ссылается на чужую династию`);
    }

    if (rulerDynasties.has(ruler.dynastyId)) {
      errors.push(`У династии ${ruler.dynastyId} больше одного правителя`);
    }

    rulerDynasties.add(ruler.dynastyId);

    const dynasty = dynasties.find((item) => item.id === ruler.dynastyId);
    if (dynasty !== undefined && (ruler.from < dynasty.from || ruler.to > dynasty.to)) {
      errors.push(
        `Правление ${ruler.id} выходит за срок династии ${dynasty.id}`,
      );
    }

    if (ruler.sourceIds.length === 0) {
      errors.push(`У правителя ${ruler.id} нет источника`);
    }

    for (const sourceId of ruler.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }
  }
```

И обновить вызов в `scripts/validate-content.ts`:

```ts
validateDynasties(dynasties, dynastyCapitals, rulers, cities, sources);
```

- [ ] **Step 6: Пересобрать шрифты и проверить**

Новые иероглифы: 大禹, 秦始皇, 成汤, 周武王, 汉武帝, 隋炀帝, 唐太宗, 宋太祖, 忽必烈, 朱元璋, 康熙.

Run: `npm run generate:fonts && npx vitest run src/content/rulers.test.ts && npm run build`
Expected: всё зелёное.

- [ ] **Step 7: Коммит**

```bash
git add src/content/rulers.ts src/content/rulers.test.ts src/content/types.ts src/domain/validate-catalog.ts scripts/validate-content.ts src/assets/fonts scripts/font-coverage.json
git commit -m "feat: справочник правителей династий"
```

---

### Task 4: Отвлекающие для обеих игр

**Files:**
- Create: `src/domain/dynasty-pair-choices.ts`
- Test: `src/domain/dynasty-pair-choices.test.ts`

**Interfaces:**
- Consumes: `dynastyCapitals`, `rulers`, `dynasties`, `CHOICE_COUNT` из `./choices`, `shuffle` из `./random`.
- Produces:
  ```ts
  export function buildCapitalChoices(
    capitals: readonly DynastyCapital[],
    dynasties: readonly Dynasty[],
    targetDynastyId: string,
    random: () => number,
  ): readonly DynastyCapital[];

  export function buildRulerChoices(
    rulers: readonly Ruler[],
    dynasties: readonly Dynasty[],
    targetDynastyId: string,
    random: () => number,
  ): readonly Ruler[];
  ```
  Обе возвращают `CHOICE_COUNT` записей, первая из которых не обязательно верная: порядок перемешан.

- [ ] **Step 1: Написать падающий тест**

Создать `src/domain/dynasty-pair-choices.test.ts`:

```ts
import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { dynastyCapitals } from '../content/dynasty-capitals';
import { rulers } from '../content/rulers';
import { CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';
import { buildCapitalChoices, buildRulerChoices } from './dynasty-pair-choices';

it('в вариантах столиц ровно четыре разных города и среди них верный', () => {
  const choices = buildCapitalChoices(
    dynastyCapitals,
    dynasties,
    'tang',
    createSeededRandom(1),
  );

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(new Set(choices.map((choice) => choice.cityId)).size).toBe(
    CHOICE_COUNT,
  );
  expect(choices.some((choice) => choice.cityId === 'xian')).toBe(true);
});

/*
 * Отвлекающие — соседние по времени столицы: спутать Тан с Сун ошибка по
 * существу, спутать Тан с Цин — промах наугад.
 */
it('отвлекающие столицы берутся у соседей по времени', () => {
  const choices = buildCapitalChoices(
    dynastyCapitals,
    dynasties,
    'song',
    createSeededRandom(2),
  );
  const dynastyIds = choices.map((choice) => choice.dynastyId);

  expect(dynastyIds).toContain('song');
  expect(dynastyIds.some((id) => ['tang', 'yuan', 'ming'].includes(id))).toBe(
    true,
  );
});

it('в вариантах правителей четверо разных и среди них верный', () => {
  const choices = buildRulerChoices(
    rulers,
    dynasties,
    'qing',
    createSeededRandom(3),
  );

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(new Set(choices.map((choice) => choice.id)).size).toBe(CHOICE_COUNT);
  expect(choices.some((choice) => choice.dynastyId === 'qing')).toBe(true);
});

it('повторяются по сиду', () => {
  expect(
    buildRulerChoices(rulers, dynasties, 'tang', createSeededRandom(7)),
  ).toEqual(buildRulerChoices(rulers, dynasties, 'tang', createSeededRandom(7)));
});

it('неизвестная династия — ошибка', () => {
  expect(() =>
    buildCapitalChoices(
      dynastyCapitals,
      dynasties,
      'атлантида',
      createSeededRandom(1),
    ),
  ).toThrow(/Неизвестная династия/);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/dynasty-pair-choices.test.ts`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Написать модуль**

Создать `src/domain/dynasty-pair-choices.ts`:

```ts
import type { Dynasty, DynastyCapital, Ruler } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/** Середина срока: по расстоянию между серединами меряется соседство. */
function middle(dynasty: Dynasty): number {
  return (dynasty.from + dynasty.to) / 2;
}

function dynastyOf(
  dynasties: readonly Dynasty[],
  dynastyId: string,
): Dynasty {
  const dynasty = dynasties.find((item) => item.id === dynastyId);
  if (dynasty === undefined) {
    throw new Error(`Неизвестная династия: ${dynastyId}`);
  }

  return dynasty;
}

/**
 * Ближайшие по времени, но каждый ответ — свой.
 *
 * Соседство считается по династиям, а не по самим ответам: у столицы времени
 * нет, у правителя оно своё, и мерить надо тем, о чём спрашивают. Отсев
 * одинаковых ответов обязателен: Юань, Мин и Цин правили из Пекина, и без
 * него вопрос предложил бы «Пекин» трижды.
 */
function nearest<T extends { readonly dynastyId: string }>(
  items: readonly T[],
  dynasties: readonly Dynasty[],
  target: Dynasty,
  keyOf: (item: T) => string,
  random: () => number,
): readonly T[] {
  const targetMiddle = middle(target);
  const seen = new Set<string>();

  /*
   * Перемешивание до сортировки: у нескольких записей расстояние совпадает, и
   * без него порядок задавал бы справочник — одни и те же отвлекающие в каждом
   * раунде. Тот же приём, что в `buildDynastyChoices`.
   */
  return shuffle([...items], random)
    .sort(
      (left, right) =>
        Math.abs(middle(dynastyOf(dynasties, left.dynastyId)) - targetMiddle) -
        Math.abs(middle(dynastyOf(dynasties, right.dynastyId)) - targetMiddle),
    )
    .filter((item) => {
      const key = keyOf(item);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
}

export function buildCapitalChoices(
  capitals: readonly DynastyCapital[],
  dynasties: readonly Dynasty[],
  targetDynastyId: string,
  random: () => number,
): readonly DynastyCapital[] {
  const target = dynastyOf(dynasties, targetDynastyId);
  const correct = capitals.find(
    (capital) => capital.asked && capital.dynastyId === targetDynastyId,
  );

  if (correct === undefined) {
    throw new Error(`У династии ${targetDynastyId} нет спрашиваемой столицы`);
  }

  const others = nearest(
    capitals.filter((capital) => capital.cityId !== correct.cityId),
    dynasties,
    target,
    (capital) => capital.cityId,
    random,
  ).slice(0, CHOICE_COUNT - 1);

  return shuffle([correct, ...others], random);
}

export function buildRulerChoices(
  rulers: readonly Ruler[],
  dynasties: readonly Dynasty[],
  targetDynastyId: string,
  random: () => number,
): readonly Ruler[] {
  const target = dynastyOf(dynasties, targetDynastyId);
  const correct = rulers.find((ruler) => ruler.dynastyId === targetDynastyId);

  if (correct === undefined) {
    throw new Error(`У династии ${targetDynastyId} нет правителя`);
  }

  const others = nearest(
    rulers.filter((ruler) => ruler.id !== correct.id),
    dynasties,
    target,
    (ruler) => ruler.id,
    random,
  ).slice(0, CHOICE_COUNT - 1);

  return shuffle([correct, ...others], random);
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/domain/dynasty-pair-choices.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/domain/dynasty-pair-choices.ts src/domain/dynasty-pair-choices.test.ts
git commit -m "feat: отвлекающие для игр о столицах и правителях"
```

---

### Task 5: Метка «спрошенная» на ленте

В играх о столицах и правителях лента не отвечает, но показывает место во времени: спрошенная полоса обводится и подписывается. Ответа это не выдаёт — спрашивают город или человека, а не срок.

**Files:**
- Modify: `src/features/exercise/DynastyTimeline.tsx`
- Modify: `src/styles.css`
- Test: `src/features/exercise/DynastyTimeline.test.tsx`

**Interfaces:**
- Consumes: `TimelineMark` из шага 1.
- Produces: `TimelineMark.kind` получает третье значение `'asked'`.

- [ ] **Step 1: Написать падающий тест**

В `src/features/exercise/DynastyTimeline.test.tsx` добавить:

```tsx
/*
 * В играх о столицах и правителях лента не отвечает, а показывает место во
 * времени. Подпись здесь не утечка: спрашивают город, а не срок.
 */
it('спрошенная полоса обведена и подписана, но не залита исходом', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'asked' }]}
      showsNames={false}
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('asked');
  expect(screen.getByText('Тан')).toBeInTheDocument();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx -t 'спрошенная'`
Expected: FAIL — `'asked'` не входит в тип метки, подписи нет.

- [ ] **Step 3: Третье значение метки**

В `src/features/exercise/DynastyTimeline.tsx`:

```tsx
export type TimelineMark = {
  readonly dynastyId: string;
  /**
   * `correct` и `wrong` — исход ответа. `asked` — «вот эта династия»: её
   * показывают в играх, где спрашивают не о времени, и подпись там не утечка.
   */
  readonly kind: 'correct' | 'wrong' | 'asked';
};
```

В строке подписей условие показа расширяется: подписывается и спрошенная полоса, даже когда имена скрыты.

```tsx
          const mark = markOf(dynasty.id);
          const isAnswer = mark === 'correct';
          const isAsked = mark === 'asked';

          if (!showsNames && !isAsked) {
            return null;
          }

          if (!isAnswer && !isAsked && width < LABEL_MIN_SHARE) {
            return null;
          }
```

и `data-mark={isAnswer || isAsked ? mark : undefined}` у подписи, чтобы выделенная бумага стояла и под ней.

- [ ] **Step 4: Стиль**

В `src/styles.css` рядом с прочими метками:

```css
/*
 * Спрошенная полоса: обводка без заливки. Заливка означала бы исход, а исхода
 * ещё нет — вопрос открыт.
 */
.timeline-span[data-mark='asked'] {
  box-shadow: 0 0 0 2px var(--timeline-span-outline);
  z-index: 1;
}
```

Правило подписи расширить на обе метки:

```css
.timeline-name[data-mark='correct'],
.timeline-name[data-mark='asked'] {
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/DynastyTimeline.tsx src/features/exercise/DynastyTimeline.test.tsx src/styles.css
git commit -m "feat: метка «спрошенная» на ленте — обводка без заливки"
```

---

### Task 6: Игра «Династия — столица»

**Files:**
- Modify: `src/features/exercise/HistoryRound.tsx`
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/App.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Test: `src/features/exercise/HistoryRound.test.tsx`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: `buildCapitalChoices`, `capitalOfDynasty`, `cityById`, метка `asked`.
- Produces: `HistoryRoundProps.kind` получает значение `'capital'`; `HISTORY_CAPITAL_MODE`; карточка `history-capital` с меткой 京 и `historyKind: 'capital'`.

- [ ] **Step 1: Написать падающий тест**

В `src/features/exercise/HistoryRound.test.tsx`:

```tsx
import { capitalOfDynasty } from '../../content/dynasty-capitals';
import { cityById } from '../../content/cities';

function renderCapitalRound(seed = 5) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <HistoryRound
      kind="capital"
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

it('спрашивает столицу династии и предлагает четыре города', () => {
  renderCapitalRound();

  const asked = screen.getByTestId('exercise-target').textContent ?? '';
  const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;

  expect(capitalOfDynasty(dynasty.id)).toBeDefined();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

/* Уточнение произносится вопросом: у «столицы Хань» два верных ответа. */
it('вопрос называет время, когда столица менялась', () => {
  renderCapitalRound();

  const asked = screen.getByTestId('exercise-target').textContent ?? '';
  const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;
  const capital = capitalOfDynasty(dynasty.id)!;

  if (capital.qualifier !== undefined) {
    expect(asked).toContain(capital.qualifier);
  }
});

it('верным считается город, а цель раунда остаётся династией', () => {
  const { onFinish } = renderCapitalRound();

  const asked = screen.getByTestId('exercise-target').textContent ?? '';
  const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;
  const capital = capitalOfDynasty(dynasty.id)!;
  const city = cityById(capital.cityId)!;

  const option = screen
    .getAllByTestId('choice-option')
    .find((item) => item.textContent?.includes(city.nameRu))!;
  fireEvent.click(option);

  expect(option).toHaveAttribute('data-result', 'correct');
});

/* Лента здесь не отвечает: спрашивают город, нажимать по времени нечего. */
it('в игре о столицах лента не принимает нажатие', () => {
  renderCapitalRound();

  const timeline = document.querySelector('.dynasty-timeline') as HTMLElement;

  expect(within(timeline).queryAllByRole('button')).toHaveLength(0);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/HistoryRound.test.tsx -t 'столиц'`
Expected: FAIL — `kind="capital"` не поддержан.

- [ ] **Step 3: Описание игры и карточка**

В `src/features/exercise/exercise-modes.ts`:

```ts
/**
 * «Династия — столица». Единственный мост между историей и картой, который не
 * врёт о границах: город стоит там же, где стоял, а границы империй с нынешними
 * не совпадают (решение 2026-08-27 о том, что карты в истории нет).
 */
export const HISTORY_CAPITAL_MODE: ExerciseMode = {
  exerciseType: 'match-pair',
  title: 'История: династия — столица',
  eyebrow: 'Где была столица',
};
```

Карточка в `MODE_CARDS` после `history-year`:

```ts
  {
    id: 'history-capital',
    kind: 'history',
    historyKind: 'capital',
    mark: '京',
    title: 'Династия — столица',
    summary:
      'Названа династия — выбрать город, откуда она правила. Разбор называет и старое имя, и нынешнее: Чанъань — это Сиань. Где столицу переносили, вопрос называет время: «столица Западной Хань».',
    volume: '7 династий · около 3 минут',
    groupId: 'humanities',
  },
```

Тип признака расширяется: `historyKind: 'when' | 'who' | 'capital'`.

- [ ] **Step 4: Пул раунда и вопрос**

В `src/features/exercise/HistoryRound.tsx`:

```tsx
  readonly kind?: 'when' | 'who' | 'capital';
```

Пул: в игре о столицах спрашиваются только те династии, у которых столица есть.

```tsx
  const pool = useMemo(
    () =>
      kind === 'capital'
        ? dynasties.filter(
            (dynasty) => capitalOfDynasty(dynasty.id) !== undefined,
          )
        : dynasties,
    [dynasties, kind],
  );
```

и `createRound` строится по `pool`, а не по `dynasties`.

Варианты:

```tsx
  const capitalChoices = useMemo(() => {
    if (kind !== 'capital') {
      return [];
    }

    const random = createSeededRandom(seed + 3);

    return round.questions.map((item) =>
      buildCapitalChoices(dynastyCapitals, allDynasties, item.target.id, random),
    );
  }, [kind, round.questions, seed]);
```

Подписи вариантов — русское имя города из каталога; идентификатор варианта — `cityId`, и он же передаётся в `expectedId`:

```tsx
  const expectedId =
    kind === 'capital' ? capitalOfDynasty(target.id)?.cityId : undefined;
```

В `answer()` довод `expectedId` передаётся в `answerQuestion` — механизм уже есть и используется игрой «город — регион».

Вопрос. Строка справочника достаётся по цели:

```tsx
  const capital =
    kind === 'capital' ? capitalOfDynasty(target.id) : undefined;
```

```tsx
      <h1 className="stage-target" data-testid="exercise-target">
        {capital?.qualifier ?? target.nameRu}
      </h1>
```

При `qualifier` вопрос читается «Западной Хань» под надзаголовком «Где была
столица»; без него — просто «Тан».

Разбор называет оба имени:

```tsx
            Столица {capital.qualifier ?? target.nameRu} — {capital.historicNameRu}{' '}
            (<span lang="zh-Hans">{capital.historicNameZh}</span>), нынешний{' '}
            {cityById(capital.cityId)?.nameRu}.{capital.note !== undefined ? ` ${capital.note}` : ''}
```

Лента: `marks={[{ dynastyId: target.id, kind: 'asked' }]}` пока вопрос открыт, `onAnswer` не передаётся.

- [ ] **Step 5: Запуск игры**

В `src/App.tsx` тип `historyKind` расширяется до `'when' | 'who' | 'capital'`; больше ничего не меняется — карточка уже несёт признак, а `startHistoryRound` его принимает.

В `src/features/home/HomePage.tsx` тип признака `onStartHistoryRound` расширяется тем же объединением.

- [ ] **Step 6: Тест главной**

В `src/features/home/HomePage.test.tsx`:

```tsx
it('карточка столиц запускает игру о столицах', () => {
  const { onStartHistoryRound } = renderHome();

  openCard(/Династия — столица/);
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartHistoryRound).toHaveBeenCalledWith('ru', undefined, 'capital');
});
```

- [ ] **Step 7: Полная проверка**

Run: `npm run lint && npm test && npm run build`
Expected: всё зелёное.

- [ ] **Step 8: Проверить в браузере**

Открыть предпросмотр, запустить «Династия — столица». Убедиться: вопрос называет уточнение там, где столицу переносили; на ленте обведена и подписана спрошенная династия; лента не нажимается; разбор называет старое и нынешнее имя города.

- [ ] **Step 9: Коммит**

```bash
git add src/features/exercise/HistoryRound.tsx src/features/exercise/HistoryRound.test.tsx src/features/exercise/exercise-modes.ts src/App.tsx src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx
git commit -m "feat: игра «Династия — столица»"
```

---

### Task 7: Игра «Династия — правитель»

**Files:**
- Modify: `src/features/exercise/HistoryRound.tsx`
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/App.tsx`, `src/features/home/HomePage.tsx`
- Test: `src/features/exercise/HistoryRound.test.tsx`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: `buildRulerChoices`, `rulerOfDynasty`.
- Produces: `kind` получает значение `'ruler'`; `HISTORY_RULER_MODE`; карточка `history-ruler` с меткой 帝.

- [ ] **Step 1: Написать падающий тест**

```tsx
import { rulerOfDynasty } from '../../content/rulers';

function renderRulerRound(seed = 5) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <HistoryRound
      kind="ruler"
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

it('спрашивает правителя династии и предлагает четыре имени', () => {
  renderRulerRound();

  const asked = screen.getByTestId('exercise-target').textContent ?? '';
  const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;

  expect(rulerOfDynasty(dynasty.id)).toBeDefined();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

/* Троецарствие исключено: у эпохи трёх государств правителя не назвать. */
it('Троецарствие в игре о правителях не спрашивается', () => {
  const { onFinish } = renderRulerRound();

  vi.useFakeTimers();
  try {
    for (let index = 0; index < rulers.length; index += 1) {
      const asked = screen.getByTestId('exercise-target').textContent ?? '';
      const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;
      const ruler = rulerOfDynasty(dynasty.id)!;
      fireEvent.click(
        screen
          .getAllByTestId('choice-option')
          .find((item) => item.textContent?.includes(ruler.nameRu))!,
      );
      act(() => {
        vi.advanceTimersByTime(CORRECT_PAUSE_MS + WRONG_PAUSE_MS);
      });
    }
  } finally {
    vi.useRealTimers();
  }

  const askedIds = onFinish.mock.calls[0][0].map(
    (attempt: Attempt) => attempt.target.id,
  );

  expect(askedIds).not.toContain('three-kingdoms');
  expect(askedIds).toHaveLength(rulers.length);
});

/* Легендарность произносится словом, а не молчит. */
it('у легендарного правителя разбор говорит о предании', () => {
  renderRulerRound(1);

  const asked = screen.getByTestId('exercise-target').textContent ?? '';
  const dynasty = dynasties.find((item) => asked.includes(item.nameRu))!;
  const ruler = rulerOfDynasty(dynasty.id)!;

  fireEvent.click(
    screen
      .getAllByTestId('choice-option')
      .find((item) => !item.textContent?.includes(ruler.nameRu))!,
  );

  if (ruler.legendary === true) {
    expect(document.querySelector('.history-note')!.textContent).toMatch(
      /предани/i,
    );
  }
});
```

Импорт `Attempt` — из `../../domain/round`, `rulers` — из `../../content/rulers`.

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/HistoryRound.test.tsx -t 'правител'`
Expected: FAIL — `kind="ruler"` не поддержан.

- [ ] **Step 3: Описание игры и карточка**

```ts
/**
 * «Династия — правитель». По одному правителю на династию: не «самый
 * великий», а тот, кем династия узнаётся в школьном курсе.
 */
export const HISTORY_RULER_MODE: ExerciseMode = {
  exerciseType: 'match-pair',
  title: 'История: династия — правитель',
  eyebrow: 'Кто её прославил',
};
```

```ts
  {
    id: 'history-ruler',
    kind: 'history',
    historyKind: 'ruler',
    mark: '帝',
    title: 'Династия — правитель',
    summary:
      'Названа династия — выбрать правителя, которым она известна. У Ся и Шан правитель легендарный, и разбор говорит об этом прямо. Троецарствие не спрашивается: у эпохи трёх государств единственного правителя нет.',
    volume: '11 династий · около 4 минут',
    groupId: 'humanities',
  },
```

- [ ] **Step 4: Пул, варианты, разбор**

В `HistoryRound.tsx` `kind` расширяется до `'when' | 'who' | 'capital' | 'ruler'`; пул для правителей — династии, у которых правитель есть:

```tsx
        kind === 'ruler'
          ? dynasties.filter((dynasty) => rulerOfDynasty(dynasty.id) !== undefined)
          : dynasties
```

Варианты считаются `buildRulerChoices`, подпись — `nameRu`, идентификатор — `ruler.id`, `expectedId` — `rulerOfDynasty(target.id)?.id`.

Разбор:

```tsx
            {ruler.nameRu} (<span lang="zh-Hans">{ruler.nameZh}</span>),{' '}
            {ruler.legendary === true ? 'по преданию правил' : 'правил'}{' '}
            {spanOfYears(ruler.from, ruler.to)}. {ruler.note}
```

где `spanOfYears` — маленькая чистая функция рядом с `askedYearLabel` в `src/content/dynasties.ts`:

```ts
/** «618–626» и «221–210 до н. э.»: срок правления одной строкой. */
export function spanOfYears(from: number, to: number): string {
  if (from < 0 && to < 0) {
    return `${-from}–${-to} до н. э.`;
  }

  return `${askedYearLabel(from)}–${askedYearLabel(to)}`;
}
```

- [ ] **Step 5: Тест главной**

```tsx
it('карточка правителей запускает игру о правителях', () => {
  const { onStartHistoryRound } = renderHome();

  openCard(/Династия — правитель/);
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartHistoryRound).toHaveBeenCalledWith('ru', undefined, 'ruler');
});
```

- [ ] **Step 6: Полная проверка и браузер**

Run: `npm run lint && npm test && npm run build`
Expected: всё зелёное.

В браузере: запустить игру, проверить, что Троецарствие не спрашивается, что у Ся разбор говорит о предании, что имена набраны иероглифами и не квадратиками (иначе шрифты не пересобраны).

- [ ] **Step 7: Коммит**

```bash
git add src/features/exercise/HistoryRound.tsx src/features/exercise/HistoryRound.test.tsx src/features/exercise/exercise-modes.ts src/content/dynasties.ts src/App.tsx src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx
git commit -m "feat: игра «Династия — правитель»"
```

---

### Task 8: Записать решение и изменение

**Files:**
- Modify: `DECISIONS.md`, `CHANGELOG.md`, `EXERCISES.md`, `docs/sources/README.md`

- [ ] **Step 1: Решение**

Строкой сверху таблицы `DECISIONS.md`:

```
| 2026-08-28 | Столицы и правители: по одному вопросу на династию, справочных строк больше | Решение владельца продукта: уточнения в вопросе о столицах приняты, правитель Суй — Ян-ди, Троецарствие из игры о правителях исключено. Столицы переносили, и одно поле у династии заставило бы выбрать между Чанъанем и Лояном, соврав про вторую половину срока; поэтому столица — строка справочника. Но цель раунда одна на династию, и две спрашиваемые строки на Хань дали бы один вопрос дважды: спрашивается по одной, остальные дают отвлекающие и называются в разборе. Без них у семи вопросов было бы три разных ответа на всех — Сиань, Кайфэн и Пекин. В игру идут семь династий: у Ся, Шан, Чжоу, Цинь и Троецарствия столицы (Эрлитоу, Инь, Хао, Сяньян и сразу три города) в каталоге городов отсутствуют, а заводить их ради одной игры значило бы переоткрывать состав каталога, утверждённый в тот же день. Правителей одиннадцать: у эпохи трёх государств единственного правителя не назвать, не соврав; у Ся и Шан правитель легендарный, и разбор говорит это словом — как уже сделано с их датами. Всё сверено по статьям Britannica о династиях; где статья не называет годы правления, взята отдельная биография. |
```

- [ ] **Step 2: Изменение**

В `CHANGELOG.md`, в `## [Unreleased]`, раздел `### Added`:

```markdown
- Игра «Династия — столица»: названа династия — выбрать город, откуда она
  правила. Разбор называет старое имя и нынешнее: Чанъань — это Сиань. Где
  столицу переносили, вопрос называет время: «столица Западной Хань».
- Игра «Династия — правитель»: одиннадцать имён, по одному на династию.
  Троецарствие не спрашивается — у эпохи трёх государств единственного
  правителя нет; у Ся и Шан разбор говорит, что правитель легендарный.
- Справочники столиц и правителей и проверка `validateDynasties`: у ленты
  династий не было проверки вовсе — её `sourceIds` никто не сверял с каталогом
  источников.
```

- [ ] **Step 3: Описание игр**

В `EXERCISES.md`, в раздел «Игры по династиям», дописать:

```markdown
«Династия — столица»: названа династия — выбрать город из четырёх. Спрашивают
семь династий — те, чья столица есть в каталоге городов. Где столицу
переносили, вопрос называет время: у «столицы Хань» два верных ответа —
Чанъань у Западной и Лоян у Восточной. Отвлекающие берутся из столиц соседних
по времени династий, а не из случайных городов: случайный Урумчи отсеивался бы
догадкой «это вообще не столица».

«Династия — правитель»: названа династия — выбрать того, кем она известна.
Одиннадцать вопросов: Троецарствие не спрашивается, потому что у эпохи трёх
государств единственного правителя нет. У Ся и Шан правитель легендарный, и
разбор говорит об этом прямо — как о датах этих же династий.
```

- [ ] **Step 4: Список источников**

В `docs/sources/README.md` добавить строку о `dynasties.md`, если там перечислены файлы.

- [ ] **Step 5: Полная проверка и коммит**

Run: `npm run lint && npm test && npm run build`

```bash
git add DECISIONS.md CHANGELOG.md EXERCISES.md docs/sources/README.md
git commit -m "docs: столицы и правители династий"
```

---

## Проверка плана на спек

| Раздел спека | Задача |
| --- | --- |
| §5 Династия — столица (справочник) | 1 (источники), 2 (каталог), 4 (отвлекающие) |
| §5 Династия — столица (игра) | 6 |
| §6 Династия — правитель (справочник) | 1, 3, 4 |
| §6 Династия — правитель (игра) | 7 |
| §9 Проверки | `validateDynasties` в 2 и 3, тесты в каждой задаче |
| §7 Расставить по порядку | шаг 3, отдельный план |
| §8 Пять групп режимов | шаг 3, отдельный план |

Открытый вопрос, который решится по ходу задачи 1: если Britannica не называет годы правления кого-то из одиннадцати, для него берётся отдельная статья-биография; если и она молчит — правитель выносится владельцу продукта, а строка не пишется.
