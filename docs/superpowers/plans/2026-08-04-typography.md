# Типографика — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение везёт три шрифта с собой и выглядит одинаково на любой
машине, а 汉字 и пиньинь набраны 宋体, а не тем, что нашлось в системе.

**Architecture:** Подмножества скачиваются у Google Fonts по параметру
`text=`, покрытие проверяется разбором `cmap` у ttf-версии того же
подмножества, woff2 кладётся в репозиторий. Заголовок вопроса получает `lang`,
и китайский шрифт достаётся 汉字 и пиньиню по языку, а не по угадыванию.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, обычный CSS.
Новых зависимостей нет.

Спецификация: `docs/superpowers/specs/2026-08-04-typography-design.md`.

## Global Constraints

- Компоненты не записывают цвета, размеры и семейства напрямую — только через
  токены из `src/design/tokens.css`.
- Сеть нужна только генератору. Приложение, тесты и сборка работают без неё.
- Новых зависимостей не добавляется.
- Узловые API (`node:fs`, `fetch` в скриптах) живут в `scripts/`, а не в
  `src/`: `tsconfig.app.json` не должен получить типы Node.
- Интерфейсные строки и комментарии — по-русски.
- Ветка `feat/typography` уже создана.
- После каждой задачи: `npx vitest run`, `npx eslint .` — обе чистые.

**Измерено и не подлежит переугадыванию** (разбор `cmap`, см. спецификацию):

| шрифт | чего нет из инвентаря |
|---|---|
| Prata 400 | `Ā ā ē ě ī ō ū ǎ ǔ` и `→ ↻ ≈ ○ ● ✓` |
| Golos Text 400/500/700 | `ǎ ǔ` и `↻ ○ ● ✓` |
| Noto Serif SC 400 | только `↻` |

---

## Структура файлов

| файл | ответственность |
|---|---|
| `src/domain/representations.ts` | `langOf` рядом с `labelOf` |
| `scripts/ttf-cmap.ts` | разбор `cmap`, форматы 4 и 12 |
| `scripts/font-inventory.ts` | деление знаков на `han`/`pinyin`/`symbol`/`rest` |
| `scripts/font-manifest.ts` | какой шрифт что обязан покрывать |
| `scripts/generate-fonts.ts` | скачать, проверить, записать |
| `scripts/validate-fonts.ts` | проверка покрытия на сборке |
| `src/design/fonts.css` | `@font-face` |
| `src/assets/fonts/*.woff2` | пять подмножеств |

---

### Task 1: Язык у заголовка вопроса

`labelOf` отдаёт голую строку, `<h1>` не несёт `lang`, и правило
`:where([lang='zh-Hans'])` до него не достаёт. На втором уровне самые крупные
иероглифы на экране набраны не тем шрифтом.

**Files:**
- Modify: `src/domain/representations.ts`
- Modify: `src/features/exercise/ExerciseRound.tsx`, `FillMapRound.tsx`
- Test: `src/domain/representations.test.ts`,
  `src/features/exercise/ExerciseRound.test.tsx`

**Interfaces:**
- Produces: `langOf(representation: Representation): string | undefined`

- [ ] **Step 1: Написать падающие тесты**

В `src/domain/representations.test.ts` дописать импорт `langOf` и:

```ts
it('помечает языком только китайские представления', () => {
  expect(langOf('name-zh')).toBe('zh-Hans');
  expect(langOf('pinyin')).toBe('zh-Latn-pinyin');
  expect(langOf('name-ru')).toBeUndefined();
  expect(langOf('capital')).toBeUndefined();
});
```

В `src/features/exercise/ExerciseRound.test.tsx` дописать:

```tsx
it('заголовок вопроса помечен языком, когда спрашивают иероглифами', () => {
  renderRound(['find-on-map'], 2);

  expect(screen.getByTestId('exercise-target')).toHaveAttribute('lang', 'zh-Hans');
});

it('на первом уровне заголовок вопроса языком не помечен', () => {
  renderRound();

  expect(screen.getByTestId('exercise-target')).not.toHaveAttribute('lang');
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/domain/representations.test.ts src/features/exercise/ExerciseRound.test.tsx`
Expected: FAIL — `langOf` не экспортируется, у заголовка нет `lang`.

- [ ] **Step 3: Написать `langOf`**

В `src/domain/representations.ts` после `labelOf`:

```ts
/**
 * Язык представления. Без него `<h1>` с иероглифами не получает китайский
 * шрифт: правило языка в `styles.css` цепляется за `lang`, а `labelOf` отдаёт
 * голую строку.
 *
 * Пиньинь помечается тем же китайским: его диакритику (`ǎ ǔ ā ē ī ō ū`)
 * несёт только Noto Serif SC — проверено разбором `cmap`, см. спецификацию
 * типографики.
 */
export function langOf(representation: Representation): string | undefined {
  switch (representation) {
    case 'name-zh':
      return 'zh-Hans';
    case 'pinyin':
      return 'zh-Latn-pinyin';
    case 'name-ru':
    case 'capital':
      return undefined;
  }
}
```

- [ ] **Step 4: Разметить заголовки**

В `src/features/exercise/ExerciseRound.tsx` добавить `langOf` в импорт из
`../../domain/representations` и заменить заголовок:

```tsx
            <h1
              data-testid="exercise-target"
              lang={
                question.exerciseType === 'name-region'
                  ? undefined
                  : langOf(question.representation)
              }
            >
              {question.exerciseType === 'name-region'
                ? 'Регион на карте'
                : labelOf(targetRegion, question.representation)}
            </h1>
```

В `src/features/exercise/FillMapRound.tsx` добавить `langOf` в импорт и
заменить заголовок:

```tsx
            <h1
              data-testid="fill-target"
              lang={question === null ? undefined : langOf(question.representation)}
            >
              {targetRegion === null
                ? 'Карта заполнена'
                : labelOf(targetRegion, question!.representation)}
            </h1>
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/domain/representations.ts src/domain/representations.test.ts src/features/exercise/ExerciseRound.tsx src/features/exercise/ExerciseRound.test.tsx src/features/exercise/FillMapRound.tsx
git commit -m "feat: mark the question heading with its language"
```

---

### Task 2: Разбор таблицы cmap

Покрытие проверяется по настоящему файлу шрифта, а не по ответу сервера:
контрольный запрос показал, что `unicode-range` у Google Fonts повторяет
запрошенное, а не отвечает, что вошло.

**Files:**
- Create: `scripts/ttf-cmap.ts`
- Test: `scripts/ttf-cmap.test.ts`

**Interfaces:**
- Produces: `codePointsInTtf(buffer: ArrayBuffer): ReadonlySet<number>`

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/ttf-cmap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { codePointsInTtf } from './ttf-cmap';

/** Минимальный sfnt с единственной таблицей `cmap`. */
function ttf(subtable: Uint8Array): ArrayBuffer {
  const header = new Uint8Array(12 + 16);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 1);
  header.set([0x63, 0x6d, 0x61, 0x70], 12); // 'cmap'
  view.setUint32(12 + 8, header.length); // смещение таблицы
  view.setUint32(12 + 12, subtable.length + 4);

  const cmap = new Uint8Array(4 + 8 + subtable.length);
  const cmapView = new DataView(cmap.buffer);
  cmapView.setUint16(0, 0); // версия
  cmapView.setUint16(2, 1); // одна подтаблица
  cmapView.setUint16(4, 3); // platformID
  cmapView.setUint16(6, 1); // encodingID
  cmapView.setUint32(8, 12); // смещение подтаблицы от начала cmap
  cmap.set(subtable, 12);

  const out = new Uint8Array(header.length + cmap.length);
  out.set(header, 0);
  out.set(cmap, header.length);

  return out.buffer;
}

/** Формат 4: один рабочий сегмент плюс обязательный завершающий 0xFFFF. */
function format4(from: number, to: number): Uint8Array {
  const bytes = new Uint8Array(14 + 2 * 2 + 2 + 2 * 2 + 2 * 2 + 2 * 2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 4);
  view.setUint16(2, bytes.length);
  view.setUint16(4, 0);
  view.setUint16(6, 4); // segCountX2 при двух сегментах
  view.setUint16(14, to);
  view.setUint16(16, 0xffff);
  view.setUint16(18, 0); // reservedPad
  view.setUint16(20, from);
  view.setUint16(22, 0xffff);

  return bytes;
}

/** Формат 12: одна группа. */
function format12(from: number, to: number): Uint8Array {
  const bytes = new Uint8Array(16 + 12);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 12);
  view.setUint32(4, bytes.length);
  view.setUint32(12, 1); // одна группа
  view.setUint32(16, from);
  view.setUint32(20, to);
  view.setUint32(24, 1); // начальный идентификатор глифа

  return bytes;
}

describe('разбор cmap', () => {
  it('читает формат 4 — его дают латинские шрифты', () => {
    const covered = codePointsInTtf(ttf(format4(0x0410, 0x0412)));

    expect(covered.has(0x0410)).toBe(true);
    expect(covered.has(0x0412)).toBe(true);
    expect(covered.has(0x0413)).toBe(false);
  });

  it('читает формат 12 — его дают шрифты с иероглифами', () => {
    const covered = codePointsInTtf(ttf(format12(0x4e00, 0x4e02)));

    expect(covered.has(0x4e00)).toBe(true);
    expect(covered.has(0x4e02)).toBe(true);
    expect(covered.has(0x4e03)).toBe(false);
  });

  it('сообщает, если таблицы cmap нет: молча вернуть пусто нельзя', () => {
    expect(() => codePointsInTtf(new ArrayBuffer(12))).toThrow(/cmap/);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/ttf-cmap.test.ts`
Expected: FAIL — `Failed to resolve import "./ttf-cmap"`.

- [ ] **Step 3: Написать разбор**

Создать `scripts/ttf-cmap.ts`:

```ts
/**
 * Кодовые точки, которые шрифт действительно умеет рисовать.
 *
 * Проверка идёт по ttf, а не по woff2: woff2 сжат brotli и потребовал бы
 * распаковщика ради того же результата. Google Fonts отдаёт ttf того же
 * подмножества, если попросить его заголовком `User-Agent` старого браузера.
 *
 * Читаются форматы 4 и 12 — этого хватает: латинские шрифты дают формат 4,
 * шрифты с иероглифами — формат 12.
 */
export function codePointsInTtf(buffer: ArrayBuffer): ReadonlySet<number> {
  const view = new DataView(buffer);
  const cmapOffset = findTable(view, 'cmap');

  if (cmapOffset === null) {
    throw new Error('В файле шрифта нет таблицы cmap');
  }

  const subtables = view.getUint16(cmapOffset + 2);
  const covered = new Set<number>();

  for (let index = 0; index < subtables; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const subtable = cmapOffset + view.getUint32(record + 4);

    readSubtable(view, subtable, covered);
  }

  return covered;
}

function findTable(view: DataView, tag: string): number | null {
  if (view.byteLength < 12) {
    return null;
  }

  const tables = view.getUint16(4);

  for (let index = 0; index < tables; index += 1) {
    const record = 12 + index * 16;
    if (record + 16 > view.byteLength) {
      return null;
    }

    const name = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3),
    );

    if (name === tag) {
      return view.getUint32(record + 8);
    }
  }

  return null;
}

function readSubtable(
  view: DataView,
  subtable: number,
  covered: Set<number>,
): void {
  const format = view.getUint16(subtable);

  if (format === 4) {
    const segmentsX2 = view.getUint16(subtable + 6);
    const ends = subtable + 14;
    const starts = ends + segmentsX2 + 2;

    for (let segment = 0; segment < segmentsX2 / 2; segment += 1) {
      const end = view.getUint16(ends + segment * 2);
      const start = view.getUint16(starts + segment * 2);

      // Последний сегмент 0xFFFF обязателен по спецификации и глифов не несёт.
      if (start === 0xffff) {
        continue;
      }

      for (let code = start; code <= end; code += 1) {
        covered.add(code);
      }
    }

    return;
  }

  if (format === 12) {
    const groups = view.getUint32(subtable + 12);

    for (let group = 0; group < groups; group += 1) {
      const record = subtable + 16 + group * 12;
      const start = view.getUint32(record);
      const end = view.getUint32(record + 4);

      for (let code = start; code <= end; code += 1) {
        covered.add(code);
      }
    }
  }
}
```

- [ ] **Step 4: Проверить тест**

Run: `npx vitest run scripts/ttf-cmap.test.ts`
Expected: PASS, три проверки.

- [ ] **Step 5: Коммит**

```bash
git add scripts/ttf-cmap.ts scripts/ttf-cmap.test.ts
git commit -m "feat: read the coverage of a font from its cmap"
```

---

### Task 3: Инвентарь знаков и требования к шрифтам

**Files:**
- Create: `scripts/font-inventory.ts`, `scripts/font-manifest.ts`
- Test: `scripts/font-inventory.test.ts`

**Interfaces:**
- Produces:
  - `type GlyphGroup = 'han' | 'pinyin' | 'symbol' | 'rest'`
  - `groupGlyphs(source: string): Readonly<Record<GlyphGroup, string>>`
  - `readSourceText(root: string): string`
  - `FONTS: readonly FontSpec[]`, где
    `FontSpec = { file: string; family: string; weight: number; requires: readonly GlyphGroup[] }`
  - `EXCEPTIONS: readonly { char: string; reason: string }[]`

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/font-inventory.test.ts`:

```ts
import { expect, it } from 'vitest';
import { groupGlyphs } from './font-inventory';

it('делит знаки на четыре группы', () => {
  const groups = groupGlyphs('安徽省 Sìchuān shěng ● ✓ Провинция «А» — 34');

  expect(groups.han).toBe('安徽省');
  expect([...groups.pinyin].sort().join('')).toBe('ìāě');
  expect([...groups.symbol].sort().join('')).toBe('✓●');
  expect(groups.rest).toContain('П');
  expect(groups.rest).toContain('«');
  expect(groups.rest).toContain('3');
});

it('не тащит в инвентарь управляющие знаки', () => {
  const groups = groupGlyphs('а\nб\tв');

  expect(groups.rest).not.toContain('\n');
  expect(groups.rest).not.toContain('\t');
});

it('каждый знак попадает ровно в одну группу', () => {
  const source = '安 ā ✓ П';
  const groups = groupGlyphs(source);
  const total =
    groups.han.length + groups.pinyin.length + groups.symbol.length + groups.rest.length;

  expect(total).toBe(new Set([...source]).size);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/font-inventory.test.ts`
Expected: FAIL — `Failed to resolve import "./font-inventory"`.

- [ ] **Step 3: Написать инвентарь**

Создать `scripts/font-inventory.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type GlyphGroup = 'han' | 'pinyin' | 'symbol' | 'rest';

const HAN = /[一-鿿]/;
/** Стрелки, математика и геометрические фигуры: `→ ↻ ≈ ○ ● ✓`. */
const SYMBOL = /[←-⯿]/;
const LATIN_LETTER = /\p{Script=Latin}/u;

/**
 * Деление не косметическое: от него зависит, какой шрифт что обязан покрывать.
 * Пиньинь и значки уходят в китайский шрифт — латинские их не несут
 * (см. спецификацию типографики).
 */
export function groupGlyphs(
  source: string,
): Readonly<Record<GlyphGroup, string>> {
  const groups: Record<GlyphGroup, Set<string>> = {
    han: new Set(),
    pinyin: new Set(),
    symbol: new Set(),
    rest: new Set(),
  };

  for (const char of source) {
    const code = char.codePointAt(0)!;

    if (code < 0x20 || (code >= 0x7f && code < 0xa0)) {
      continue; // управляющие
    }

    if (HAN.test(char)) {
      groups.han.add(char);
    } else if (SYMBOL.test(char)) {
      groups.symbol.add(char);
    } else if (code > 0x7f && LATIN_LETTER.test(char)) {
      groups.pinyin.add(char);
    } else {
      groups.rest.add(char);
    }
  }

  return {
    han: [...groups.han].sort().join(''),
    pinyin: [...groups.pinyin].sort().join(''),
    symbol: [...groups.symbol].sort().join(''),
    rest: [...groups.rest].sort().join(''),
  };
}

/** Весь текст приложения без тестов: инвентарь выводится, а не пишется руками. */
export function readSourceText(root: string): string {
  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        files.push(path);
      }
    }
  };

  walk(root);

  return files.map((file) => readFileSync(file, 'utf8')).join('');
}
```

- [ ] **Step 4: Записать, кто что обязан покрывать**

Создать `scripts/font-manifest.ts`:

```ts
import type { GlyphGroup } from './font-inventory';

export type FontSpec = {
  readonly file: string;
  readonly family: string;
  readonly weight: number;
  /** Группы знаков, которые этот шрифт обязан покрывать. */
  readonly requires: readonly GlyphGroup[];
};

/*
 * Требование выводится из того, где шрифт применяется. Пиньинь и значки
 * уходят в Noto Serif SC — по `lang` и по цепочке фолбэка, — поэтому с
 * латинских шрифтов они не спрашиваются. Проверено разбором cmap:
 * у Prata нет всей диакритики пиньиня, у Golos Text нет `ǎ ǔ`.
 */
export const FONTS: readonly FontSpec[] = [
  { file: 'prata-400.woff2', family: 'Prata', weight: 400, requires: ['rest'] },
  { file: 'golos-text-400.woff2', family: 'Golos Text', weight: 400, requires: ['rest'] },
  { file: 'golos-text-500.woff2', family: 'Golos Text', weight: 500, requires: ['rest'] },
  { file: 'golos-text-700.woff2', family: 'Golos Text', weight: 700, requires: ['rest'] },
  {
    file: 'noto-serif-sc-400.woff2',
    family: 'Noto Serif SC',
    weight: 400,
    requires: ['han', 'pinyin', 'symbol'],
  },
];

/**
 * Знаки, которых нет ни в одном из трёх шрифтов и которые сознательно берутся
 * из системы. Список явный: «взяли из системы» должно быть решением, а не
 * случайностью.
 */
export const EXCEPTIONS: readonly { readonly char: string; readonly reason: string }[] = [
  {
    char: '↻',
    reason:
      'значок «стоит повторить» на карточке ответа. Нет ни в Prata, ни в Golos Text, ни в Noto Serif SC. Смысл несёт aria-label и заголовок словами рядом.',
  },
];
```

- [ ] **Step 5: Проверить тест**

Run: `npx vitest run scripts/font-inventory.test.ts`
Expected: PASS, три проверки.

- [ ] **Step 6: Коммит**

```bash
git add scripts/font-inventory.ts scripts/font-inventory.test.ts scripts/font-manifest.ts
git commit -m "feat: derive the glyph inventory from the source"
```

---

### Task 4: Генератор подмножеств

**Files:**
- Create: `scripts/generate-fonts.ts`, `src/assets/fonts/` (пять woff2),
  `scripts/font-coverage.json`
- Modify: `package.json`

- [ ] **Step 1: Написать генератор**

Создать `scripts/generate-fonts.ts`:

```ts
/**
 * Подмножества шрифтов. Google Fonts принимает параметр `text=` и возвращает
 * файл ровно по запрошенным знакам — это снимает и 20-мегабайтный исходник,
 * и инструмент нарезки.
 *
 * Скачивается два файла одного подмножества: woff2 для приложения и ttf для
 * проверки. Формат выбирается заголовком `User-Agent`.
 *
 * Проверять обязательно: `unicode-range` в ответе Google повторяет
 * запрошенное, а не отвечает, что вошло. Контрольный запрос трёх знаков
 * `中国А` у Prata возвращает «покрыто всё», хотя иероглифов в Prata нет.
 *
 * Сеть нужна только здесь и только когда меняется контент.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupGlyphs, readSourceText, type GlyphGroup } from './font-inventory';
import { EXCEPTIONS, FONTS } from './font-manifest';
import { codePointsInTtf } from './ttf-cmap';

const WOFF2_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
/** Android 4.3 не знает woff2, и Google отдаёт ему то же подмножество в ttf. */
const TTF_UA =
  'Mozilla/5.0 (Linux; U; Android 4.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

const FONTS_DIR = resolve(process.cwd(), 'src/assets/fonts');
const COVERAGE = resolve(process.cwd(), 'scripts/font-coverage.json');

async function fetchSubset(
  family: string,
  weight: number,
  text: string,
  userAgent: string,
): Promise<ArrayBuffer> {
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${family}:wght@${weight}`);
  url.searchParams.set('text', text);

  const sheet = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!sheet.ok) {
    throw new Error(`Google Fonts ответил ${sheet.status} на ${family} ${weight}`);
  }

  const href = /url\((https:[^)]+)\)/.exec(await sheet.text())?.[1];
  if (href === undefined) {
    throw new Error(`В ответе для ${family} ${weight} нет ссылки на файл`);
  }

  const file = await fetch(href, { headers: { 'User-Agent': userAgent } });

  return file.arrayBuffer();
}

const groups = groupGlyphs(readSourceText(resolve(process.cwd(), 'src')));
const exceptions = new Set(EXCEPTIONS.map(({ char }) => char.codePointAt(0)!));

mkdirSync(FONTS_DIR, { recursive: true });

const coverage: Record<string, number[]> = {};
let totalBytes = 0;

for (const font of FONTS) {
  const text = font.requires
    .map((group: GlyphGroup) => groups[group])
    .join('');

  const ttf = await fetchSubset(font.family, font.weight, text, TTF_UA);
  const covered = codePointsInTtf(ttf);
  const missing = [...text].filter(
    (char) => !covered.has(char.codePointAt(0)!) && !exceptions.has(char.codePointAt(0)!),
  );

  if (missing.length > 0) {
    console.warn(
      `${font.family} ${font.weight}: нет знаков ${missing.join(' ')}. ` +
        'Либо внесите их в EXCEPTIONS с причиной, либо смените шрифт',
    );
  }

  const woff2 = await fetchSubset(font.family, font.weight, text, WOFF2_UA);
  writeFileSync(resolve(FONTS_DIR, font.file), Buffer.from(woff2));

  coverage[font.file] = [...covered].sort((left, right) => left - right);
  totalBytes += woff2.byteLength;

  console.info(
    `${font.file}: запрошено ${[...text].length}, в шрифте ${covered.size}, ` +
      `${(woff2.byteLength / 1024).toFixed(1)} КБ`,
  );
}

writeFileSync(COVERAGE, `${JSON.stringify(coverage, null, 2)}\n`);

console.info(`Всего шрифтов: ${(totalBytes / 1024).toFixed(1)} КБ`);
```

- [ ] **Step 2: Добавить команду**

В `package.json` в `scripts` добавить:

```json
    "generate:fonts": "tsx scripts/generate-fonts.ts",
```

- [ ] **Step 3: Запустить генератор**

Run: `npm run generate:fonts`
Expected: пять строк вида `prata-400.woff2: запрошено 186, в шрифте 186, 13.6 КБ`,
предупреждений о недостающих знаках нет (все они либо не запрошены, либо в
`EXCEPTIONS`), итог `Всего шрифтов:` меньше 100 КБ.

Если предупреждение появилось — не подгонять `EXCEPTIONS` молча: прочитать,
какой знак и в каком шрифте, и решить осознанно.

- [ ] **Step 4: Коммит**

```bash
git add scripts/generate-fonts.ts scripts/font-coverage.json src/assets/fonts package.json
git commit -m "feat: generate the font subsets from the inventory"
```

---

### Task 5: Проверка покрытия на сборке

**Files:**
- Create: `scripts/validate-fonts.ts`, `scripts/font-coverage.ts`
- Test: `scripts/font-coverage.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `missingGlyphs(groups, coverage, fonts, exceptions): readonly Missing[]`,
  где `Missing = { char: string; codePoint: number; family: string }`

- [ ] **Step 1: Написать падающий тест**

Создать `scripts/font-coverage.test.ts`:

```ts
import { expect, it } from 'vitest';
import { missingGlyphs } from './font-coverage';

const GROUPS = { han: '安', pinyin: 'ā', symbol: '✓', rest: 'А' };
const FONTS = [
  { file: 'latin.woff2', family: 'Golos Text', weight: 400, requires: ['rest'] as const },
  {
    file: 'han.woff2',
    family: 'Noto Serif SC',
    weight: 400,
    requires: ['han', 'pinyin', 'symbol'] as const,
  },
];

it('пропускает, когда всё покрыто', () => {
  const coverage = {
    'latin.woff2': ['А'.codePointAt(0)!],
    'han.woff2': ['安', 'ā', '✓'].map((c) => c.codePointAt(0)!),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, [])).toEqual([]);
});

it('называет знак, шрифт и кодовую точку', () => {
  const coverage = {
    'latin.woff2': ['А'.codePointAt(0)!],
    'han.woff2': ['安', 'ā'].map((c) => c.codePointAt(0)!),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, [])).toEqual([
    { char: '✓', codePoint: 0x2713, family: 'Noto Serif SC' },
  ]);
});

it('молчит о знаке из списка исключений', () => {
  const coverage = {
    'latin.woff2': ['А'.codePointAt(0)!],
    'han.woff2': ['安', 'ā'].map((c) => c.codePointAt(0)!),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, ['✓'])).toEqual([]);
});

it('падает, если для шрифта нет записи о покрытии', () => {
  expect(() => missingGlyphs(GROUPS, {}, FONTS, [])).toThrow(/latin\.woff2/);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/font-coverage.test.ts`
Expected: FAIL — `Failed to resolve import "./font-coverage"`.

- [ ] **Step 3: Написать сравнение**

Создать `scripts/font-coverage.ts`:

```ts
import type { GlyphGroup } from './font-inventory';
import type { FontSpec } from './font-manifest';

export type Missing = {
  readonly char: string;
  readonly codePoint: number;
  readonly family: string;
};

/**
 * Чистое сравнение двух списков: инвентаря и того, что реально вошло в файлы.
 * Сети и шрифтов не требует, поэтому годится для сборки.
 */
export function missingGlyphs(
  groups: Readonly<Record<GlyphGroup, string>>,
  coverage: Readonly<Record<string, readonly number[]>>,
  fonts: readonly FontSpec[],
  exceptions: readonly string[],
): readonly Missing[] {
  const allowed = new Set(exceptions.map((char) => char.codePointAt(0)!));
  const missing: Missing[] = [];

  for (const font of fonts) {
    const covered = coverage[font.file];

    if (covered === undefined) {
      throw new Error(
        `Нет записи о покрытии для ${font.file}. Запустите npm run generate:fonts`,
      );
    }

    const inFont = new Set(covered);

    for (const group of font.requires) {
      for (const char of groups[group]) {
        const codePoint = char.codePointAt(0)!;

        if (!inFont.has(codePoint) && !allowed.has(codePoint)) {
          missing.push({ char, codePoint, family: font.family });
        }
      }
    }
  }

  return missing;
}
```

- [ ] **Step 4: Написать проверку сборки**

Создать `scripts/validate-fonts.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { missingGlyphs } from './font-coverage';
import { groupGlyphs, readSourceText } from './font-inventory';
import { EXCEPTIONS, FONTS } from './font-manifest';

const coverage = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/font-coverage.json'), 'utf8'),
) as Record<string, number[]>;

const groups = groupGlyphs(readSourceText(resolve(process.cwd(), 'src')));
const missing = missingGlyphs(
  groups,
  coverage,
  FONTS,
  EXCEPTIONS.map(({ char }) => char),
);

if (missing.length > 0) {
  throw new Error(
    `${missing
      .map(
        ({ char, codePoint, family }) =>
          `Знак вне подмножества: ${char} (U+${codePoint
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}), нужен шрифту ${family}.`,
      )
      .join('\n')}\nЗапустите npm run generate:fonts`,
  );
}

console.info(
  `Знаков в инвентаре: 汉字 ${groups.han.length}, пиньинь ${groups.pinyin.length}, ` +
    `значки ${groups.symbol.length}, прочих ${groups.rest.length}. ` +
    `Исключений: ${EXCEPTIONS.length}.`,
);
```

- [ ] **Step 5: Встроить в сборку**

В `package.json`:

```json
    "validate:fonts": "tsx scripts/validate-fonts.ts",
    "build": "npm run validate:map && npm run validate:content && npm run validate:fonts && tsc -b && vite build",
```

- [ ] **Step 6: Проверить**

Run: `npx vitest run scripts/font-coverage.test.ts`
Expected: PASS, четыре проверки.

Run: `npm run validate:fonts`
Expected: строка вида `Знаков в инвентаре: 汉字 110, пиньинь 20, значки 6, прочих 160. Исключений: 1.`

- [ ] **Step 7: Коммит**

```bash
git add scripts/font-coverage.ts scripts/font-coverage.test.ts scripts/validate-fonts.ts package.json
git commit -m "feat: fail the build on a glyph outside the subsets"
```

---

### Task 6: Подключение шрифтов

**Files:**
- Create: `src/design/fonts.css`
- Modify: `src/design/tokens.css`, `src/styles.css`
- Test: `scripts/validate-tokens.test.ts`

- [ ] **Step 1: Написать падающий тест**

В `scripts/validate-tokens.test.ts` в блок `describe('шкалы', …)` дописать:

```ts
  it('семейства начинаются с наших шрифтов и сохраняют системный фолбэк', () => {
    expect(resolve(tokens, '--t-family-display')).toMatch(/^'Prata'.*serif$/);
    expect(resolve(tokens, '--t-family-text')).toMatch(/^'Golos Text'/);
    expect(resolve(tokens, '--t-family-han')).toMatch(/^'Noto Serif SC'/);
  });

  it('латинские шрифты уступают китайскому знаки, которых у них нет', () => {
    // `● ○ ✓ → ≈` есть только в Noto Serif SC, поэтому он стоит вторым.
    expect(resolve(tokens, '--t-family-display')).toContain("'Noto Serif SC'");
    expect(resolve(tokens, '--t-family-text')).toContain("'Noto Serif SC'");
  });
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: FAIL — `--t-family-display` не объявлен, `--t-family-text`
начинается с `Inter`.

- [ ] **Step 3: Объявить шрифты**

Создать `src/design/fonts.css`:

```css
/*
 * Подмножества, нарезанные под знаки этого приложения:
 * `npm run generate:fonts`, состав — в scripts/font-coverage.json.
 *
 * `swap`, а не `block`: файлы локальные и мелкие, а `block` дал бы риск
 * пустого экрана на медленной машине.
 */
@font-face {
  font-family: 'Prata';
  font-style: normal;
  font-weight: 400;
  src: url('../assets/fonts/prata-400.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'Golos Text';
  font-style: normal;
  font-weight: 400;
  src: url('../assets/fonts/golos-text-400.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'Golos Text';
  font-style: normal;
  font-weight: 500;
  src: url('../assets/fonts/golos-text-500.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'Golos Text';
  font-style: normal;
  font-weight: 700;
  src: url('../assets/fonts/golos-text-700.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'Noto Serif SC';
  font-style: normal;
  font-weight: 400;
  src: url('../assets/fonts/noto-serif-sc-400.woff2') format('woff2');
  font-display: swap;
}
```

- [ ] **Step 4: Обновить токены**

В `src/design/tokens.css` заменить блок семейств:

```css
  /*
   * Шрифты везутся с собой и не загружаются по сети во время работы:
   * приложение должно работать в школьном классе без интернета.
   *
   * Пиньинь и значки `● ○ ✓ → ≈` набирает китайский шрифт: у Prata нет всей
   * диакритики пиньиня, у Golos Text нет `ǎ ǔ`, значков нет ни у того ни у
   * другого. Проверено разбором cmap, см. scripts/generate-fonts.ts.
   */
  --t-family-display:
    'Prata', 'Noto Serif SC', Georgia, 'Times New Roman', serif;
  --t-family-text:
    'Golos Text', 'Noto Serif SC', ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --t-family-han:
    'Noto Serif SC', 'Songti SC', SimSun, STSong, 'Source Han Serif SC', serif;
```

Там же, рядом с `--t-size-title`:

```css
  /*
   * Слово-вопрос. Меньше `--t-size-display`, потому что живёт в колонке
   * 300 px: 48 px разорвали бы «Синьцзян-Уйгурский автономный район»
   * на пять строк.
   */
  --t-size-question: clamp(1.75rem, 2.4vw, 2.5rem);
```

- [ ] **Step 5: Применить в стилях**

В `src/styles.css` добавить импорт первой строкой после существующего:

```css
@import './design/tokens.css';
@import './design/fonts.css';
```

Заменить правило языка (было `:where([lang='zh-Hans'])`):

```css
/*
 * Селектор без `:where` намеренно: у заголовков появилось семейство
 * дисплейного шрифта, и нулевая специфичность `:where` ему проиграла бы.
 * Пиньинь набирается тем же китайским шрифтом — только он несёт `ǎ ǔ ā ē ī ō ū`.
 */
[lang='zh-Hans'],
[lang='zh-Latn-pinyin'] {
  font-family: var(--t-family-han);
}
```

Заменить правило `h1`:

```css
/*
 * Заголовки набираются дисплейным шрифтом. Вес задан явно: у Prata одно
 * начертание, а `font-synthesis: none` не даст браузеру подделать жирное —
 * без этой строки заголовок молча остался бы светлым при `font-weight: bold`.
 */
h1 {
  font-family: var(--t-family-display);
  font-size: var(--t-size-title);
  font-weight: var(--t-weight-regular);
  line-height: var(--t-leading-tight);
  margin-bottom: var(--s-3);
}

.round-prompt h1 {
  font-size: var(--t-size-question);
}

.results-hero h1 {
  font-size: var(--t-size-display);
}
```

В `src/features/results/RoundResultsPage.tsx` и `FillMapResultsPage.tsx`
заменить `className="hero"` на `className="hero results-hero"`.

- [ ] **Step 6: Проверить**

Run: `npx vitest run`
Expected: PASS.

Run: `npx eslint . && npm run build`
Expected: чисто, сборка проходит.

- [ ] **Step 7: Коммит**

```bash
git add src/design/fonts.css src/design/tokens.css src/styles.css scripts/validate-tokens.test.ts src/features/results
git commit -m "feat: ship the three typefaces with the app"
```

---

### Task 7: Проверка вживую и документация

- [ ] **Step 1: Запустить приложение**

Запустить сервер разработки через инструмент предпросмотра (не через Bash),
конфигурация `china-studies-trainer`, порт 5173.

- [ ] **Step 2: Проверить, что шрифты загрузились**

Выполнить в странице:

```js
({
  loaded: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`),
  body: getComputedStyle(document.body).fontFamily.split(',')[0],
})
```

Expected: пять начертаний, все `loaded`; `body` — `"Golos Text"`.

- [ ] **Step 3: Проверить иероглифы и пиньинь**

Начать раунд «Найти на карте» на втором уровне и выполнить:

```js
(() => {
  const h1 = document.querySelector('h1');
  const pinyin = document.querySelector('[lang="zh-Latn-pinyin"]');
  return {
    questionLang: h1.getAttribute('lang'),
    questionFont: getComputedStyle(h1).fontFamily.split(',')[0],
    pinyinFont: pinyin ? getComputedStyle(pinyin).fontFamily.split(',')[0] : 'нет на экране',
  };
})()
```

Expected: `questionLang` — `zh-Hans`, `questionFont` — `"Noto Serif SC"`.
Пиньинь проверить на экране темы: там он есть в каждой карточке региона.

- [ ] **Step 4: Проверить длинное название**

На экране раунда первого уровня дождаться «Синьцзян-Уйгурский автономный
район» (или подставить его в заголовок через DevTools) и убедиться, что он
помещается в колонку и не выдавливает карту. Если разрывается больше чем на
три строки — уменьшить верхнюю границу `--t-size-question` и перепроверить.

- [ ] **Step 5: Проверить значки**

Начать «Заполнить карту» и убедиться, что точки попыток `●●●` видны, а после
неверного ответа на экране упражнения виден `✓` у правильного варианта.

- [ ] **Step 6: Снять вес шрифтов в сборке**

Run: `npm run build && du -ch dist/assets/*.woff2 | tail -1`
Expected: не больше 100 КБ.

- [ ] **Step 7: Записать источники**

Создать `docs/sources/fonts.md`:

```markdown
# Шрифты

Три семейства под SIL Open Font License 1.1. В репозитории лежат подмножества,
нарезанные под знаки этого приложения, — полные файлы не хранятся.

| шрифт | автор | источник |
| --- | --- | --- |
| Prata | Cyreal | https://fonts.google.com/specimen/Prata |
| Golos Text | Paratype | https://fonts.google.com/specimen/Golos+Text |
| Noto Serif SC | Google | https://fonts.google.com/noto/specimen/Noto+Serif+SC |

Дата получения: 2026-08-04.

## Как перегенерировать

npm run generate:fonts

Скрипт запрашивает у Google Fonts подмножество по параметру `text=`, проверяет
покрытие разбором таблицы `cmap` и кладёт woff2 в `src/assets/fonts/`. Нужен
интернет; приложение и сборка без него работают.

Если сборка упала с «Знак вне подмножества» — в контенте появился знак,
которого нет в файлах. Перегенерировать и закоммитить и шрифты, и
`scripts/font-coverage.json`.
```

- [ ] **Step 8: Обновить документацию**

В `DESIGN_SYSTEM.md` заменить раздел «Типографика»:

```markdown
## Типографика

Шрифты везутся с собой и не загружаются по сети во время работы: приложение
должно работать в классе без интернета.

Три семейства, все под SIL OFL, все нарезаны под знаки этого приложения
(`npm run generate:fonts`, около 80 КБ на все пять начертаний):

- `--t-family-display` — Prata 400: заголовки.
- `--t-family-text` — Golos Text 400/500/700: текст и интерфейс.
- `--t-family-han` — Noto Serif SC 400: 汉字, пиньинь и значки `● ○ ✓ → ≈`.

Пиньинь набирается китайским шрифтом не от безысходности: у Prata нет всей
диакритики, у Golos Text нет `ǎ ǔ`, а латиница CJK-шрифта нарисована ровно под
тональные знаки. Разметку даёт `langOf` — заголовок вопроса несёт `lang`, и
шрифт достаётся ему по языку, а не по угадыванию.

Размер текста 16 px, слово-вопрос `--t-size-question` (28–40 px), итог раунда
`--t-size-display` (32–48 px), межстрочный интервал 1.5. Отступы — шкала
`--s-1`…`--s-8`.

`npm run validate:fonts` роняет сборку, если в контенте появился знак вне
подмножеств. Единственное исключение — `↻`, его нет ни в одном из трёх
шрифтов; значок продублирован `aria-label`.
```

В `DECISIONS.md` добавить строки в начало таблицы:

```markdown
| 2026-08-04 | Шрифты везутся с собой подмножествами | На машине без Inter приложение выглядело иначе, чем на машине разработчика, а на ChromeOS и Linux 汉字 отдавались гротеску: системный 宋体 есть только в macOS и Windows. Полные файлы не хранятся — только нарезка под знаки контента, около 80 КБ. |
| 2026-08-04 | Пиньинь набирается китайским шрифтом | Разбор cmap: у Prata нет `Ā ā ē ě ī ō ū ǎ ǔ`, у Golos Text нет `ǎ ǔ`. Noto Serif SC несёт пиньинь целиком — латиница CJK-шрифта для того и нарисована. Отсюда `langOf` и `lang` у заголовка вопроса. |
| 2026-08-04 | Покрытие проверяется разбором cmap, а не ответом сервера | `unicode-range` у Google Fonts повторяет запрошенное: контрольный запрос `中国А` у Prata возвращает «покрыто всё», хотя иероглифов в ней нет. Проверка идёт по ttf того же подмножества — woff2 сжат brotli и потребовал бы распаковщика. |
```

В `CHANGELOG.md` добавить запись в том же виде, что и предыдущие.

- [ ] **Step 9: Коммит**

```bash
git add docs/sources/fonts.md DESIGN_SYSTEM.md DECISIONS.md CHANGELOG.md
git commit -m "docs: describe the typography"
```

- [ ] **Step 10: Завершение ветки**

**REQUIRED SUB-SKILL:** Использовать superpowers:finishing-a-development-branch.

---

## Самопроверка плана

**Покрытие спецификации.** Разметка языком — Task 1. Разбор cmap — Task 2.
Инвентарь и правило «кто что обязан покрывать» — Task 3. Генератор и источник
файлов — Task 4. Проверка на сборке и список исключений — Task 5. Семейства,
фолбэк, кегли, `@font-face` — Task 6. Проверка вживую, `docs/sources/fonts.md`
и документация — Task 7.

**Согласованность имён.** `langOf`, `GlyphGroup`, `groupGlyphs`,
`readSourceText`, `FontSpec`, `FONTS`, `EXCEPTIONS`, `codePointsInTtf`,
`missingGlyphs`, `Missing`, токены `--t-family-display`, `--t-family-text`,
`--t-family-han`, `--t-size-question`, классы `results-hero` — во всех задачах
написаны одинаково.

**Порядок задач.** Каждая оставляет набор тестов зелёным. `validate:fonts`
встаёт в `build` только в Task 5, то есть после того, как в Task 4 появились
и шрифты, и `font-coverage.json`.
