# Три поверхности — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Стартовый экран перестаёт быть свитком: вместо одной страницы — три
поверхности, у каждой одна работа.

**Architecture:** Кабинет показывает прогресс картой освоенности и один
следующий шаг. Атлас забирает карту и справочник в оболочку `100dvh` с той же
сеткой, что у раунда. Раунд получает ленту хода в пустующую колонку. Рамка
`viewBox` расширяется, чтобы границы регионов перестали обрезаться. Правила
(«следующий шаг», «состояние региона», «поиск») живут чистыми функциями
отдельно от разметки — их проверяют без рендера.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4 + Testing Library,
обычный CSS на кастомных свойствах.

Спецификация: `docs/superpowers/specs/2026-08-04-three-surfaces-design.md`.

## Global Constraints

- Компоненты не записывают цвета, размеры и длительности напрямую — только
  через токены из `src/design/tokens.css`.
- Порог двух колонок — `1024px`, он же `TWO_COLUMN_QUERY` из
  `src/design/breakpoints.ts`.
- Минимальная цель нажатия — `var(--target-min)`, 44 px.
- Статус никогда не передаётся одним цветом: у каждого состояния есть второй
  канал — форма, штриховка или слово.
- Интерфейсные строки, комментарии и названия тестов — по-русски.
- Китайские названия показываются в Unicode, не только в пиньине.
- Сетевых запросов во время упражнения нет.
- Ветка `feat/three-surfaces` уже создана, работа идёт в ней.
- После каждой задачи: `npx vitest run` и `npx eslint .` — обе чистые.

---

## Структура файлов

**Создаются:**

| файл | ответственность |
|---|---|
| `src/map/region-progress.ts` | словарь состояний освоенности: тип и подписи. Живёт в слое карты рядом с `region-selection.ts` и `outcome-labels.ts` — карта не должна импортировать типы из `features` |
| `src/features/home/progress-summary.ts` | состояние каждого региона и счёт «освоено / в работе / не тронуто» |
| `src/features/home/next-step.ts` | подпись и параметры единственной главной кнопки |
| `src/features/home/HomePage.tsx` | кабинет |
| `src/features/atlas/region-search.ts` | фильтр списка регионов |
| `src/features/atlas/AtlasPage.tsx` | атлас |
| `src/features/exercise/RoundProgressTrail.tsx` | лента хода раунда |
| тесты рядом с каждым из них | их проверки |

**Меняются:**

| файл | что |
|---|---|
| `public/maps/china-provinces.svg` | `viewBox` |
| `src/map/target-size.ts` | размеры и начало координат `viewBox` |
| `src/map/validate-map.ts` | `validateViewBox` проверяет начало координат |
| `src/design/tokens.css` | `--map-aspect`, токены освоенности |
| `src/map/MapDefs.tsx` | образец штриховки «в работе» |
| `src/map/ChinaMap.tsx` | `variant='progress'`, зум внутри коробки карты |
| `src/map/MapControls.tsx` | оформление в углу карты |
| `src/map/RegionAnswerList.tsx` | представление `'panel'` с поиском |
| `src/features/exercise/ExerciseRound.tsx` | лента хода |
| `src/App.tsx` | маршруты `'home'` и `'atlas'` |
| `src/styles.css` | раскладка всех трёх поверхностей |
| `scripts/validate-tokens.test.ts` | новые заливки в списке проверяемых |

**Удаляется:**

| файл | почему |
|---|---|
| `src/features/topic-selection/TopicSelectionPage.tsx` и его тест | работа разошлась по кабинету и атласу |

**Порядок.** Атлас (задачи 3–5) появляется раньше кабинета, но подключается к
маршруту только в задаче 10. До неё он проверяется тестами и в приложении
недоступен — это ожидаемое промежуточное состояние, а не недоделка.

---

### Task 1: Поле вокруг карты

Замерено в браузере: `viewBox="0 0 774 569"`, габарит содержимого —
`0.3 0.3 773.5 568.7`. Обводка рисуется по центру контура, наружу уходит 0.3
единицы при обычной ширине и 0.8 при наведении, и всё это срезается краем
`viewBox`. У крайних регионов половина границы отсутствует.

**Files:**
- Modify: `public/maps/china-provinces.svg:3`
- Modify: `src/map/target-size.ts:11-15`
- Modify: `src/map/validate-map.ts:37-55`
- Modify: `src/design/tokens.css`
- Test: `src/map/validate-map.test.ts`

**Interfaces:**
- Produces: `MAP_VIEWBOX_MIN_X`, `MAP_VIEWBOX_MIN_Y`, `MAP_VIEWBOX_WIDTH`,
  `MAP_VIEWBOX_HEIGHT` — все `number` из `src/map/target-size.ts`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/map/validate-map.test.ts`:

```ts
it('сверяет начало координат viewBox: в нём живёт поле вокруг рисунка', () => {
  expect(() => validateViewBox('0 0 806 601')).toThrow(
    /Начало координат viewBox/,
  );
});

it('принимает карту с полем', () => {
  expect(() => validateViewBox('-16 -16 806 601')).not.toThrow();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/validate-map.test.ts`
Expected: FAIL — `validateViewBox('0 0 806 601')` ничего не бросает.

- [ ] **Step 3: Обновить константы**

В `src/map/target-size.ts` заменить блок констант размеров:

```ts
/**
 * Поле вокруг рисунка. Обводка рисуется по центру контура и при наведении
 * уходит наружу на 0.8 единицы; без поля край viewBox срезал бы её у крайних
 * регионов, а граница — главная информация на карте (MAP_SPEC.md).
 *
 * Геометрия при этом не двигается: рамка растёт наружу, координаты путей,
 * выносок, целей нажатия и палитры остаются прежними.
 */
export const MAP_VIEWBOX_MIN_X = -16;
export const MAP_VIEWBOX_MIN_Y = -16;

/** Ширина viewBox карты: 774 единицы рисунка плюс поле с двух сторон. */
export const MAP_VIEWBOX_WIDTH = 806;

/** Высота viewBox карты. Из пары с шириной берётся пропорция `--map-aspect`. */
export const MAP_VIEWBOX_HEIGHT = 601;
```

- [ ] **Step 4: Проверять начало координат**

В `src/map/validate-map.ts` добавить импорты `MAP_VIEWBOX_MIN_X` и
`MAP_VIEWBOX_MIN_Y` к существующим из `./target-size` и дописать проверку
в начало тела `validateViewBox`, до проверок ширины и высоты:

```ts
export function validateViewBox(viewBox: string | null): void {
  const parts = viewBox?.trim().split(/\s+/) ?? [];
  const minX = Number(parts[0]);
  const minY = Number(parts[1]);
  const width = Number(parts[2]);
  const height = Number(parts[3]);

  if (minX !== MAP_VIEWBOX_MIN_X || minY !== MAP_VIEWBOX_MIN_Y) {
    throw new Error(
      `Начало координат viewBox ${minX} ${minY} не совпадает с ` +
        `${MAP_VIEWBOX_MIN_X} ${MAP_VIEWBOX_MIN_Y}. В нём живёт поле вокруг ` +
        'рисунка: без него обводка крайних регионов обрезается',
    );
  }

  // дальше без изменений: проверки ширины и высоты
```

- [ ] **Step 5: Расширить рамку в самой карте**

В `public/maps/china-provinces.svg` заменить строку 3:

```
	viewBox="-16 -16 806 601"
```

Пути не трогать: рамка растёт наружу, координаты остаются прежними.

- [ ] **Step 6: Обновить пропорцию в токенах**

В `src/design/tokens.css` в блоке карты:

```css
  /*
   * Пропорция карты: 806×601 в единицах viewBox — 774×569 рисунка плюс поле
   * по 16 единиц с каждой стороны. Сверяется с MAP_VIEWBOX_WIDTH и
   * MAP_VIEWBOX_HEIGHT в scripts/validate-tokens.test.ts.
   */
  --map-aspect: 806 / 601;
```

- [ ] **Step 7: Проверить тесты и сборку**

Run: `npx vitest run && npm run validate:map`
Expected: тесты проходят; `validate:map` не падает.

В выводе `validate:map` записать новые числа регионов ниже 24 px и ниже 44 px.
Прежние — 28 и 11.

**Правило отступления:** если ниже 24 px **впервые** ушёл хотя бы один регион,
которого там раньше не было, — поменять `-16 -16 806 601` на `-8 -8 790 585`,
константы на `790`/`601 − 16 = 585` и `MIN_X`/`MIN_Y` на `-8`, токен на
`790 / 585`, и повторить замер. Регионы, бывшие ниже порога и до правки, не
считаются: их закрывают увеличенные цели нажатия.

- [ ] **Step 8: Коммит**

```bash
git add public/maps/china-provinces.svg src/map/target-size.ts src/map/validate-map.ts src/map/validate-map.test.ts src/design/tokens.css
git commit -m "fix: give the map viewBox room so borders stop being clipped"
```

---

### Task 2: Зум внутри коробки карты

Сейчас `MapControls` стоит до карты тремя кнопками и весит больше неё. Место в
углу карты освободилось в задаче 1.

**Files:**
- Modify: `src/map/ChinaMap.tsx:217`
- Modify: `src/map/MapControls.tsx:16`
- Modify: `src/styles.css:381-409`
- Test: `src/map/MapControls.test.tsx`

**Interfaces:**
- Consumes: `--map-aspect` из Task 1.
- Produces: `MapControls` рендерится внутри `.china-map-frame`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/map/MapControls.test.tsx`:

```tsx
it('стоит внутри коробки карты, а не до неё', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
    />,
  );

  const controls = screen.getByLabelText('Масштаб карты');
  expect(controls.closest('.china-map-frame')).not.toBeNull();
});
```

Импорты `ChinaMap` и `regions` добавить к существующим в файле.

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/MapControls.test.tsx`
Expected: FAIL — `.china-map-frame` не существует.

- [ ] **Step 3: Обернуть карту рамкой и внести в неё зум**

В `src/map/ChinaMap.tsx` заменить строки от `{onZoomChange ? <MapControls …` до
закрывающего `/>` блока `<div className="china-map" …>` на:

```tsx
      <MapDefs />
      <div className="china-map-frame">
        <div
          className="china-map"
          data-map-variant={variant}
          ref={mapRef}
          onClick={(event) => selectTarget(event.target)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onClear();
              return;
            }

            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectTarget(event.target);
            }
          }}
          dangerouslySetInnerHTML={{ __html: mapMarkup }}
        />
        {onZoomChange ? <MapControls zoom={zoom} onZoomChange={onZoomChange} /> : null}
      </div>
```

Зум идёт после карты в разметке: сначала предмет, потом управление им.

- [ ] **Step 4: Оформить кнопки как лежащие на бумаге**

В `src/styles.css` заменить блок `.map-controls` и правила его кнопок:

```css
/*
 * Рамка держит карту и зум в одной системе координат: зум лежит на бумаге,
 * а не на доске, и потому рисуется тушью, а не светлым по тёмному.
 */
.china-map-frame {
  position: relative;
}

.map-controls {
  bottom: var(--s-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  position: absolute;
  right: var(--s-3);
}

.map-controls button {
  background: var(--surface-paper-bright);
  border: var(--border-hair) solid var(--line-on-paper);
  border-radius: var(--radius-sm);
  color: var(--text-on-paper);
  cursor: pointer;
  font: inherit;
  min-height: var(--target-min);
  min-width: var(--target-min);
  padding: var(--s-2) var(--s-3);
}

.map-controls button:hover:not(:disabled) {
  border-color: var(--focus-on-paper);
}

.map-controls button:disabled {
  color: var(--text-on-paper-muted);
  cursor: not-allowed;
}

.map-controls button:focus-visible {
  outline: var(--border-focus) solid var(--focus-on-paper);
  outline-offset: 2px;
}
```

Правила `.map-alternative button` из прежнего общего селектора остаются как
были — вынести их в отдельный блок с теми же значениями:

```css
.map-alternative button {
  background: var(--surface-raised);
  border: var(--border-hair) solid var(--line-on-ground);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground);
  cursor: pointer;
  font: inherit;
  min-height: var(--target-min);
  padding: var(--s-2) var(--s-3);
}

.map-alternative button:hover:not(:disabled) {
  border-color: var(--focus-on-ground);
}

.map-alternative button:disabled {
  color: var(--text-on-ground-muted);
  cursor: not-allowed;
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний.

- [ ] **Step 6: Коммит**

```bash
git add src/map/ChinaMap.tsx src/map/MapControls.test.tsx src/styles.css
git commit -m "feat: move the zoom controls onto the map itself"
```

---

### Task 3: Поиск по регионам

34 строки списка нужно уметь фильтровать. Правило чистое и проверяется без
рендера.

**Files:**
- Create: `src/features/atlas/region-search.ts`
- Test: `src/features/atlas/region-search.test.ts`

**Interfaces:**
- Produces: `searchRegions(regions: readonly Region[], query: string): readonly Region[]`
  из `src/features/atlas/region-search.ts`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/atlas/region-search.test.ts`:

```ts
import { expect, it } from 'vitest';
import { regions } from '../../content/regions';
import { searchRegions } from './region-search';

const find = (query: string) => searchRegions(regions, query).map((r) => r.id);

it('пустой запрос возвращает все регионы', () => {
  expect(searchRegions(regions, '   ')).toHaveLength(regions.length);
});

it('находит по русскому названию без учёта регистра', () => {
  expect(find('хунань')).toContain('hunan');
});

it('находит по пиньиню, набранному без тонов', () => {
  expect(find('hunan')).toContain('hunan');
});

it('находит по иероглифам', () => {
  expect(find('湖南')).toContain('hunan');
});

it('находит по названию административного центра', () => {
  expect(find('чанша')).toContain('hunan');
});

it('не различает е и ё', () => {
  const withYo = find('ё');
  const withYe = find('е');
  expect(withYo.every((id) => withYe.includes(id))).toBe(true);
});

it('на бессмысленном запросе возвращает пусто', () => {
  expect(find('щщщ')).toEqual([]);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/atlas/region-search.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать модуль**

Создать `src/features/atlas/region-search.ts`:

```ts
import type { Region } from '../../content/types';

/**
 * Приводит строку к виду, в котором её сравнивают. Разложение NFD с удалением
 * комбинирующих знаков снимает и тона пиньиня (`Húnán` → `hunan`), и точки
 * над `ё` — оба случая решает одно правило, отдельная замена `ё` не нужна.
 */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('ru')
    .trim();
}

/**
 * Поля для поиска: как регион называют по-русски, как он пишется и звучит
 * по-китайски и какой у него центр. Ученик ищет по тому, что помнит, а помнит
 * он разное.
 */
function haystack(region: Region): string {
  return normalise(
    [region.nameRu, region.pinyin, region.nameZh, region.capitalRu].join(' '),
  );
}

/** Пустой запрос — не фильтр: список остаётся полным. */
export function searchRegions(
  regions: readonly Region[],
  query: string,
): readonly Region[] {
  const needle = normalise(query);
  if (needle === '') {
    return regions;
  }

  return regions.filter((region) => haystack(region).includes(needle));
}
```

- [ ] **Step 4: Проверить тесты**

Run: `npx vitest run src/features/atlas/region-search.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/features/atlas/region-search.ts src/features/atlas/region-search.test.ts
git commit -m "feat: add region search across name, pinyin, hanzi and capital"
```

---

### Task 4: Список регионов в панели

Атласу нужен тот же список из 34 кнопок, но с полем поиска и собственной
прокруткой. Разметку кнопок описывать заново незачем.

**Files:**
- Modify: `src/map/RegionAnswerList.tsx`
- Modify: `src/styles.css`
- Test: `src/map/RegionAnswerList.test.tsx`

**Interfaces:**
- Consumes: `searchRegions` из Task 3.
- Produces: `presentation?: 'inline' | 'disclosure' | 'panel'` у
  `RegionAnswerListProps`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/map/RegionAnswerList.test.tsx`:

```tsx
it('в панели показывает поле поиска и сужает список по запросу', async () => {
  const user = userEvent.setup();
  render(
    <RegionAnswerList
      presentation="panel"
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );

  expect(screen.getAllByRole('button')).toHaveLength(regions.length);

  await user.type(screen.getByLabelText('Найти регион'), 'хунань');

  const found = screen.getAllByRole('button');
  expect(found).toHaveLength(1);
  expect(found[0]).toHaveTextContent('Хунань');
});

it('в панели сообщает, что по запросу ничего нет', async () => {
  const user = userEvent.setup();
  render(
    <RegionAnswerList
      presentation="panel"
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );

  await user.type(screen.getByLabelText('Найти регион'), 'щщщ');

  expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
```

Если `userEvent` в файле ещё не импортирован — добавить
`import userEvent from '@testing-library/user-event';`.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/RegionAnswerList.test.tsx`
Expected: FAIL — поля «Найти регион» нет.

- [ ] **Step 3: Добавить представление**

В `src/map/RegionAnswerList.tsx`:

Добавить импорты:

```ts
import { useId, useState } from 'react';
import { searchRegions } from '../features/atlas/region-search';
```

(`useState` уже импортирован — дописать `useId` к нему.)

Расширить тип параметра:

```ts
  /**
   * `inline` — экран темы, `disclosure` — экран раунда, `panel` — атлас:
   * список с поиском и собственной прокруткой.
   */
  readonly presentation?: 'inline' | 'disclosure' | 'panel';
```

В теле компонента, сразу после `const [open, setOpen] = useState(defaultOpen);`:

```ts
  const [query, setQuery] = useState('');
  const searchId = useId();
  /*
   * Фильтр применяется только в панели: в раунде список — равнозначный способ
   * ответа, и скрывать из него варианты значило бы прятать часть ответов.
   */
  const shown = presentation === 'panel' ? searchRegions(regions, query) : regions;
```

Заменить `regions.map((region) => {` на `shown.map((region) => {`.

Перед `if (presentation === 'inline')` добавить ветку панели:

```tsx
  if (presentation === 'panel') {
    return (
      <div className="region-panel-list">
        <label className="region-panel-search" htmlFor={searchId}>
          Найти регион
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        {shown.length === 0 ? (
          <p className="status-note" role="status">
            Ничего не найдено. Попробуйте другое написание — например, пиньинь.
          </p>
        ) : (
          list
        )}
      </div>
    );
  }
```

- [ ] **Step 4: Добавить стили панели**

В `src/styles.css` после блока `.region-answer-list`:

```css
/*
 * Список в атласе прокручивается внутри себя: страница атласа занимает ровно
 * кадр, и 34 кнопки не должны её растить.
 */
.region-panel-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  min-block-size: 0;
}

.region-panel-search {
  color: var(--text-on-ground-muted);
  font-size: var(--t-size-caption);
}

.region-panel-list input {
  background: var(--surface-raised);
  border: var(--border-hair) solid var(--line-on-ground);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground);
  font: inherit;
  min-height: var(--target-min);
  padding: var(--s-2) var(--s-3);
}

.region-panel-list .map-alternative {
  min-block-size: 0;
  overflow-y: auto;
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний. Прежние тесты `inline` и `disclosure` не
меняются.

- [ ] **Step 6: Коммит**

```bash
git add src/map/RegionAnswerList.tsx src/map/RegionAnswerList.test.tsx src/styles.css
git commit -m "feat: add a searchable panel presentation to the region list"
```

---

### Task 5: Экран атласа

Заменяет секцию «Интерактивная карта» и сетку из 34 карточек. Пока не
подключён к маршруту — это делает Task 10.

**Files:**
- Create: `src/features/atlas/AtlasPage.tsx`
- Modify: `src/styles.css`
- Test: `src/features/atlas/AtlasPage.test.tsx`

**Interfaces:**
- Consumes: `RegionAnswerList` с `presentation='panel'` из Task 4; `ChinaMap`
  с зумом внутри рамки из Task 2.
- Produces: `AtlasPage` с параметрами
  `{ regions, selectedRegionId, onSelect, onClear, zoom, onZoomChange, onExit, onTrain }`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/atlas/AtlasPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { regions } from '../../content/regions';
import { AtlasPage } from './AtlasPage';

function renderAtlas(selectedRegionId: string | null = null) {
  const onSelect = vi.fn();
  const onExit = vi.fn();
  const onTrain = vi.fn();

  const { container } = render(
    <AtlasPage
      regions={regions}
      selectedRegionId={selectedRegionId}
      onSelect={onSelect}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
      onExit={onExit}
      onTrain={onTrain}
    />,
  );

  return { container, onSelect, onExit, onTrain };
}

it('без выбора приглашает выбрать регион, а не отчитывается о пустоте', () => {
  renderAtlas();

  expect(
    screen.getByText(/Выберите регион на карте или найдите в списке/),
  ).toBeInTheDocument();
});

it('показывает карточку выбранного региона со всеми формами названия', () => {
  renderAtlas('hunan');

  const card = screen.getByTestId('atlas-region-card');
  expect(card).toHaveTextContent('Хунань');
  expect(card).toHaveTextContent('湖南');
  expect(card).toHaveTextContent('Чанша');
  expect(card).toHaveTextContent('长沙');
});

it('выбор строки списка отдаётся наверх', async () => {
  const user = userEvent.setup();
  const { onSelect } = renderAtlas();

  await user.click(screen.getByRole('button', { name: /Хунань/ }));

  expect(onSelect).toHaveBeenCalledWith('hunan');
});

it('выбор области карты отдаётся наверх тем же обработчиком', async () => {
  const user = userEvent.setup();
  const { container, onSelect } = renderAtlas();

  await user.click(container.querySelector('[data-region-id="hunan"]')!);

  expect(onSelect).toHaveBeenCalledWith('hunan');
});

it('даёт выход в кабинет и в тренировку', async () => {
  const user = userEvent.setup();
  const { onExit, onTrain } = renderAtlas();

  await user.click(screen.getByRole('button', { name: /В кабинет/ }));
  await user.click(screen.getByRole('button', { name: /Тренировать/ }));

  expect(onExit).toHaveBeenCalled();
  expect(onTrain).toHaveBeenCalled();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать компонент**

Создать `src/features/atlas/AtlasPage.tsx`:

```tsx
import type { Region } from '../../content/types';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import type { MapZoom } from '../../map/MapControls';
import { RegionAnswerList } from '../../map/RegionAnswerList';

const KIND_LABELS: Readonly<Record<Region['kind'], string>> = {
  province: 'Провинция',
  'autonomous-region': 'Автономный район',
  municipality: 'Город центрального подчинения',
  sar: 'Специальный административный район',
};

export type AtlasPageProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom: MapZoom;
  readonly onZoomChange: (zoom: MapZoom) => void;
  readonly onExit: () => void;
  readonly onTrain: () => void;
};

/**
 * Атлас: карта и справочник на одной поверхности. Сетка та же, что у раунда, —
 * карта справа и там, и там: ученик ходит между атласом и тренировкой, и карта
 * не должна прыгать со стороны на сторону.
 */
export function AtlasPage({
  regions,
  selectedRegionId,
  onSelect,
  onClear,
  zoom,
  onZoomChange,
  onExit,
  onTrain,
}: AtlasPageProps) {
  const selected = regions.find((region) => region.id === selectedRegionId);
  const ordered = [...regions].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <main className="atlas-shell">
      <div className="atlas-layout">
        <div className="atlas-panel">
          <div className="atlas-region-card" data-testid="atlas-region-card">
            {selected ? (
              <>
                <h1>
                  {selected.nameRu} <span lang="zh-Hans">{selected.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selected.pinyin}</p>
                <p className="status-note">{KIND_LABELS[selected.kind]}</p>
                <p>
                  Административный центр: {selected.capitalRu}{' '}
                  <span lang="zh-Hans">({selected.capitalZh})</span>
                </p>
              </>
            ) : (
              <>
                <h1>Атлас</h1>
                <p className="status-note">
                  Выберите регион на карте или найдите в списке.
                </p>
              </>
            )}
          </div>
          <RegionAnswerList
            presentation="panel"
            regions={ordered}
            selectedRegionId={selectedRegionId}
            onSelect={onSelect}
          />
        </div>
        <div className="atlas-map">
          <ChinaMap
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={onSelect}
            onClear={onClear}
            zoom={zoom}
            onZoomChange={onZoomChange}
            usage="answer"
          />
        </div>
      </div>
      <footer className="atlas-footer">
        <button type="button" className="secondary" onClick={onExit}>
          ← В кабинет
        </button>
        <button type="button" className="primary" onClick={onTrain}>
          Тренировать →
        </button>
        <MapAttribution />
      </footer>
    </main>
  );
}
```

`usage="answer"` намеренно: у карты в атласе не должно быть ни собственного
заголовка «Интерактивная карта», ни второго списка внутри — список стоит в
панели. Подписи выносок при этом скрываются, как и в раунде; названия Гонконга
и Макао ученик читает в панели.

- [ ] **Step 4: Добавить стили атласа**

В `src/styles.css` после блока экрана раунда:

```css
/* --- Атлас -------------------------------------------------------------- */

.atlas-shell {
  inline-size: min(100% - 2 * var(--s-4), 1600px);
  margin-inline: auto;
  padding-block: var(--s-6);
}

.atlas-panel {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  min-block-size: 0;
}

.atlas-region-card h1 {
  font-size: var(--t-size-title);
  margin-bottom: var(--s-1);
}

.atlas-region-card p {
  margin-bottom: var(--s-1);
}

.atlas-footer {
  align-items: center;
  border-top: var(--border-hair) solid var(--line-on-ground);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3) var(--s-5);
  margin-block-start: var(--s-5);
  padding-block-start: var(--s-4);
}

.atlas-footer .map-attribution {
  margin: 0;
  margin-inline-start: auto;
  max-inline-size: 48ch;
}

/*
 * Тот же порог и та же сетка, что у раунда. Оболочка занимает ровно кадр и
 * делится на две строки: колонки и подвал. Карта забирает остаток первой.
 */
@media (min-width: 1024px) {
  .atlas-shell {
    block-size: 100dvh;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .atlas-layout {
    display: grid;
    gap: var(--s-5);
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
    min-block-size: 0;
  }

  .atlas-map {
    min-block-size: 0;
  }

  .atlas-map .map-section,
  .atlas-map .china-map-frame {
    block-size: 100%;
  }

  .atlas-map .china-map {
    aspect-ratio: var(--map-aspect);
    block-size: 100%;
    inline-size: auto;
    margin-inline: auto;
    max-inline-size: 100%;
  }

  .atlas-map .china-map svg {
    block-size: 100%;
  }
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний.

- [ ] **Step 6: Коммит**

```bash
git add src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/styles.css
git commit -m "feat: add the atlas surface with map and reference panel"
```

---

### Task 6: Состояния освоенности

Правило чистое и проверяется без рендера. Состояние «в работе» обязательно:
`masteredRegionIds` требует верного ответа на уровне не ниже второго, поэтому
до открытия второго уровня освоенных регионов не бывает вообще, и без
промежуточного состояния карта была бы сплошь серой.

**Files:**
- Create: `src/map/region-progress.ts`
- Create: `src/features/home/progress-summary.ts`
- Test: `src/features/home/progress-summary.test.ts`

**Interfaces:**
- Produces: тип `RegionProgressState = 'mastered' | 'in-progress' | 'untouched'`
  и `PROGRESS_STATE_LABELS` из `src/map/region-progress.ts`;
  тип `ProgressSummary` и
  `summariseProgress(regionIds: readonly string[], attempts: readonly Attempt[], now: Date): ProgressSummary`
  из `src/features/home/progress-summary.ts`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/home/progress-summary.test.ts`:

```ts
import { expect, it } from 'vitest';
import type { Attempt, Level } from '../../domain/round';
import { summariseProgress } from './progress-summary';

const IDS = ['hunan', 'hubei', 'sichuan'] as const;
const NOW = new Date('2026-08-04T12:00:00.000Z');

function attempt(
  regionId: string,
  roundId: string,
  isCorrect: boolean,
  level: Level = 1,
): Attempt {
  return {
    questionId: `${roundId}-${regionId}`,
    roundId,
    regionId,
    exerciseType: 'find-on-map',
    level,
    isCorrect,
    durationMs: 1000,
    answeredAt: NOW.toISOString(),
  };
}

it('без истории все регионы не тронуты', () => {
  const summary = summariseProgress(IDS, [], NOW);

  expect(summary.mastered).toBe(0);
  expect(summary.inProgress).toBe(0);
  expect(summary.untouched).toBe(3);
  expect(summary.stateByRegionId.hunan).toBe('untouched');
});

it('верные ответы только на первом уровне дают «в работе», а не «освоено»', () => {
  const attempts = [
    attempt('hunan', 'r1', true),
    attempt('hunan', 'r2', true),
    attempt('hunan', 'r3', true),
  ];

  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.stateByRegionId.hunan).toBe('in-progress');
  expect(summary.mastered).toBe(0);
  expect(summary.inProgress).toBe(1);
});

it('три верных раунда с одним на втором уровне дают «освоено»', () => {
  const attempts = [
    attempt('hunan', 'r1', true),
    attempt('hunan', 'r2', true),
    attempt('hunan', 'r3', true, 2),
  ];

  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.stateByRegionId.hunan).toBe('mastered');
  expect(summary.mastered).toBe(1);
});

it('регион с одними ошибками всё равно в работе, а не не тронут', () => {
  const summary = summariseProgress(IDS, [attempt('hubei', 'r1', false)], NOW);

  expect(summary.stateByRegionId.hubei).toBe('in-progress');
  expect(summary.untouched).toBe(2);
});

it('счёт всегда сходится к общему числу регионов', () => {
  const attempts = [attempt('hunan', 'r1', true), attempt('hubei', 'r1', false)];
  const summary = summariseProgress(IDS, attempts, NOW);

  expect(summary.mastered + summary.inProgress + summary.untouched).toBe(
    summary.total,
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/home/progress-summary.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Завести словарь состояний в слое карты**

Создать `src/map/region-progress.ts`:

```ts
/**
 * Состояние региона на карте освоенности.
 *
 * Промежуточное `in-progress` — не для полноты картины. Освоенность по
 * `progress-rules.ts` требует трёх верных ответов в разных раундах и хотя бы
 * одного на уровне не ниже второго; пока второй уровень не открыт, освоенных
 * регионов не существует, и без этого состояния карта оставалась бы сплошь
 * серой ровно тогда, когда движение важнее всего.
 *
 * `in-progress` означает «регион уже трогали», а не «отвечали верно»: регион с
 * одними ошибками тоже в работе. Иначе он выглядел бы нетронутым, а ученик
 * потерял бы след собственных попыток.
 *
 * Словарь живёт в слое карты, рядом с `region-selection.ts` и
 * `outcome-labels.ts`: карта рисует эти состояния и не должна ради их названий
 * импортировать что-либо из `features`.
 */
export type RegionProgressState = 'mastered' | 'in-progress' | 'untouched';

/** Статус никогда не передаётся одним цветом: у каждого состояния есть слово. */
export const PROGRESS_STATE_LABELS: Readonly<
  Record<RegionProgressState, string>
> = {
  mastered: 'освоен',
  'in-progress': 'в работе',
  untouched: 'ещё не тронут',
};
```

- [ ] **Step 4: Написать модуль счёта**

Создать `src/features/home/progress-summary.ts`:

```ts
import { masteredRegionIds } from '../../domain/progress-rules';
import type { Attempt } from '../../domain/round';
import type { RegionProgressState } from '../../map/region-progress';

export type ProgressSummary = {
  readonly stateByRegionId: Readonly<Record<string, RegionProgressState>>;
  readonly mastered: number;
  readonly inProgress: number;
  readonly untouched: number;
  readonly total: number;
};

export function summariseProgress(
  regionIds: readonly string[],
  attempts: readonly Attempt[],
  now: Date,
): ProgressSummary {
  const mastered = new Set(masteredRegionIds(attempts, now));
  const touched = new Set(attempts.map((attempt) => attempt.regionId));

  const stateByRegionId: Record<string, RegionProgressState> = {};
  let masteredCount = 0;
  let inProgressCount = 0;
  let untouchedCount = 0;

  for (const regionId of regionIds) {
    if (mastered.has(regionId)) {
      stateByRegionId[regionId] = 'mastered';
      masteredCount += 1;
    } else if (touched.has(regionId)) {
      stateByRegionId[regionId] = 'in-progress';
      inProgressCount += 1;
    } else {
      stateByRegionId[regionId] = 'untouched';
      untouchedCount += 1;
    }
  }

  return {
    stateByRegionId,
    mastered: masteredCount,
    inProgress: inProgressCount,
    untouched: untouchedCount,
    total: regionIds.length,
  };
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run src/features/home/progress-summary.test.ts`
Expected: PASS, 5 тестов.

- [ ] **Step 6: Коммит**

```bash
git add src/map/region-progress.ts src/features/home/progress-summary.ts src/features/home/progress-summary.test.ts
git commit -m "feat: derive per-region mastery state for the progress map"
```

---

### Task 7: Карта освоенности

**Files:**
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/map/MapDefs.tsx`
- Modify: `src/design/tokens.css`
- Modify: `src/styles.css`
- Modify: `scripts/validate-tokens.test.ts`
- Test: `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Consumes: `RegionProgressState` из Task 6.
- Produces: `variant='progress'` и `progressStates?: Readonly<Record<string, RegionProgressState>>`
  у `ChinaMapProps`; токены `--map-progress-mastered`,
  `--map-progress-in-progress`, `--map-progress-untouched`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/map/ChinaMap.test.tsx`:

```tsx
it('в режиме освоенности размечает области состоянием и называет его словом', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="progress"
      usage="answer"
      interactive={false}
      progressStates={{ hunan: 'mastered', hubei: 'in-progress' }}
    />,
  );

  const hunan = container.querySelector('[data-region-id="hunan"]')!;
  const hubei = container.querySelector('[data-region-id="hubei"]')!;
  const sichuan = container.querySelector('[data-region-id="sichuan"]')!;

  expect(hunan.getAttribute('data-progress-state')).toBe('mastered');
  expect(hunan.getAttribute('aria-label')).toContain('освоен');
  expect(hubei.getAttribute('data-progress-state')).toBe('in-progress');
  expect(sichuan.getAttribute('data-progress-state')).toBe('untouched');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: FAIL — атрибута `data-progress-state` нет.

- [ ] **Step 3: Принять состояния в карте**

В `src/map/ChinaMap.tsx`:

Добавить импорт:

```ts
import {
  PROGRESS_STATE_LABELS,
  type RegionProgressState,
} from './region-progress';
```

Рядом с `NO_OUTCOMES` добавить:

```ts
const NO_PROGRESS_STATES: Readonly<Record<string, RegionProgressState>> = {};
```

Расширить `variant` и добавить параметр:

```ts
  /**
   * `reference` — справочная карта: цвет означает тип региона.
   * `fill` — игровая: все регионы серые, цвет появляется только как исход.
   * `progress` — карта освоенности в кабинете: цвет означает, что ученик уже
   * успел с этим регионом.
   */
  readonly variant?: 'reference' | 'fill' | 'progress';
  readonly progressStates?: Readonly<Record<string, RegionProgressState>>;
```

В сигнатуре компонента добавить `progressStates = NO_PROGRESS_STATES,`.

Внутри `areas?.forEach((area) => {` после блока `outcome` добавить:

```ts
      const progressState =
        variant === 'progress'
          ? (progressStates[regionId] ?? 'untouched')
          : undefined;
      if (progressState) {
        area.dataset.progressState = progressState;
      } else {
        delete area.dataset.progressState;
      }
```

Заменить установку `aria-label`:

```ts
      const label = labelsByMapAreaId.get(regionId);
      if (label) {
        const suffix = outcome
          ? OUTCOME_LABELS[outcome]
          : progressState
            ? PROGRESS_STATE_LABELS[progressState]
            : null;
        area.setAttribute('aria-label', suffix ? `${label} — ${suffix}` : label);
      }
```

Добавить `progressStates` и `variant` в массив зависимостей `useEffect`.

- [ ] **Step 4: Добавить образец штриховки «в работе»**

В `src/map/MapDefs.tsx` добавить константу рядом с прежними:

```ts
const IN_PROGRESS_PATTERN_ID = 'map-hatch-in-progress';
```

и образец внутрь `<defs>`:

```tsx
        {/*
          Освоенность различается не только цветом. Шаг тот же, что у «верно со
          второй попытки», но земля своя: там амбра исхода, здесь охра «в
          работе» — образцы делят геометрию, а не заливку.
        */}
        <pattern
          id={IN_PROGRESS_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--map-progress-in-progress)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--map-border)"
            strokeWidth="1"
          />
        </pattern>
```

- [ ] **Step 5: Добавить токены**

В `src/design/tokens.css` в слой карты, после блока игровой палитры:

```css
  /*
   * Карта освоенности в кабинете. Три состояния, и каждое несёт второй канал:
   * сплошная заливка, штриховка, пустой тон. Оттенки взяты из уже проверенных
   * заливок — контраст тушью поверх них подтверждён тестом.
   */
  --map-progress-mastered: var(--c-jade-500);
  --map-progress-in-progress: var(--c-land-1);
  --map-progress-untouched: var(--c-grey-unplayed);
```

- [ ] **Step 6: Раскрасить карту**

В `src/styles.css` после правил `.china-map[data-map-variant='fill']`:

```css
/*
 * Карта освоенности только показывает: области не выбираются, курсор обычный.
 */
.china-map[data-map-variant='progress'] [data-region-id] {
  cursor: default;
  fill: var(--map-progress-untouched);
}

.china-map[data-map-variant='progress'] [data-progress-state='mastered'] {
  fill: var(--map-progress-mastered);
}

.china-map[data-map-variant='progress'] [data-progress-state='in-progress'] {
  fill: url('#map-hatch-in-progress');
}
```

- [ ] **Step 7: Внести новые заливки в контракт контраста**

В `scripts/validate-tokens.test.ts` дополнить список `MAP_FILLS`:

```ts
/** Все заливки, поверх которых карта когда-либо рисует границу или подпись. */
const MAP_FILLS = [
  ...LAND_TONES,
  '--map-locked',
  '--map-sea',
  '--map-progress-mastered',
  '--map-progress-in-progress',
  '--map-progress-untouched',
] as const;
```

- [ ] **Step 8: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний. Если контраст тушью поверх
`--map-progress-mastered` не набирает 3:1 — не подбирать цвет вслепую, а
взять `--c-jade-500`, который уже служит `--map-first-try` и проверен там же.

- [ ] **Step 9: Коммит**

```bash
git add src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx src/map/MapDefs.tsx src/design/tokens.css src/styles.css scripts/validate-tokens.test.ts
git commit -m "feat: add a mastery variant to the map"
```

---

### Task 8: Следующий шаг

Подпись кнопки и её действие обязаны считаться в одном месте: иначе кнопка
скажет «Повторить 6 регионов», а запустит раунд по всем 34. Так уже сделано с
`regionIdsToRepeat` в `App.tsx`.

**Files:**
- Create: `src/features/home/next-step.ts`
- Test: `src/features/home/next-step.test.ts`

**Interfaces:**
- Produces: тип `NextStep`;
  `nextStep(attempts: readonly Attempt[], now: Date): NextStep`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/home/next-step.test.ts`:

```ts
import { expect, it } from 'vitest';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { nextStep } from './next-step';

const NOW = new Date('2026-08-04T12:00:00.000Z');

function attempt(
  regionId: string,
  roundId: string,
  isCorrect: boolean,
  exerciseType: ExerciseType = 'find-on-map',
  level: Level = 1,
  answeredAt: string = NOW.toISOString(),
): Attempt {
  return {
    questionId: `${roundId}-${regionId}`,
    roundId,
    regionId,
    exerciseType,
    level,
    isCorrect,
    durationMs: 1000,
    answeredAt,
  };
}

it('без истории предлагает начать с поиска на карте по всем регионам', () => {
  const step = nextStep([], NOW);

  expect(step.label).toBe('Начать: найти на карте');
  expect(step.exerciseType).toBe('find-on-map');
  expect(step.level).toBe(1);
  expect(step.regionIds).toBeNull();
});

it('при свежих ошибках предлагает повторить именно их', () => {
  const attempts = [
    attempt('hunan', 'r1', false),
    attempt('hubei', 'r1', false),
    attempt('sichuan', 'r1', true),
  ];

  const step = nextStep(attempts, NOW);

  expect(step.label).toBe('Повторить 2 региона');
  expect(step.regionIds).toEqual(['hunan', 'hubei']);
});

it('без ошибок продолжает режимом последнего раунда', () => {
  const attempts = [
    attempt('hunan', 'r1', true, 'find-on-map'),
    attempt('hubei', 'r2', true, 'match-capital'),
  ];

  const step = nextStep(attempts, NOW);

  expect(step.label).toBe('Продолжить: уровень 1 · регион — столица');
  expect(step.exerciseType).toBe('match-capital');
  expect(step.regionIds).toBeNull();
});

it('ошибки старше окна повтора не тянут назад', () => {
  const old = new Date('2026-06-01T12:00:00.000Z').toISOString();
  const attempts = [
    attempt('hunan', 'r1', false, 'find-on-map', 1, old),
    attempt('hubei', 'r2', true, 'find-on-map'),
  ];

  const step = nextStep(attempts, NOW).label;

  expect(step).toMatch(/^Продолжить/);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/home/next-step.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать модуль**

Создать `src/features/home/next-step.ts`:

```ts
import { regionsWord } from '../../content/region-count';
import { regionIdsToRepeat, unlockedLevelFrom } from '../../domain/progress-rules';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

/**
 * Единственный главный шаг кабинета: подпись и параметры раунда считаются
 * вместе. Разъехавшись, они дали бы кнопку, которая обещает одно, а запускает
 * другое.
 */
export type NextStep = {
  readonly label: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  /** `null` — раунд по всем регионам темы. */
  readonly regionIds: readonly string[] | null;
};

/** «Назвать регион» посреди предложения пишется со строчной. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('ru') + text.slice(1);
}

function lastExerciseType(attempts: readonly Attempt[]): ExerciseType {
  return attempts.at(-1)?.exerciseType ?? 'find-on-map';
}

export function nextStep(attempts: readonly Attempt[], now: Date): NextStep {
  const level = unlockedLevelFrom(attempts);
  const exerciseType = lastExerciseType(attempts);

  const toRepeat = regionIdsToRepeat(attempts, now);
  if (toRepeat.length > 0) {
    return {
      label: `Повторить ${toRepeat.length} ${regionsWord(toRepeat.length)}`,
      exerciseType,
      level,
      regionIds: toRepeat,
    };
  }

  if (attempts.length === 0) {
    return {
      label: `Начать: ${lowerFirst(EXERCISE_MODES['find-on-map'].title)}`,
      exerciseType: 'find-on-map',
      level: 1,
      regionIds: null,
    };
  }

  return {
    label: `Продолжить: уровень ${level} · ${lowerFirst(
      EXERCISE_MODES[exerciseType].title,
    )}`,
    exerciseType,
    level,
    regionIds: null,
  };
}
```

- [ ] **Step 4: Проверить тесты**

Run: `npx vitest run src/features/home/next-step.test.ts`
Expected: PASS, 4 теста.

- [ ] **Step 5: Коммит**

```bash
git add src/features/home/next-step.ts src/features/home/next-step.test.ts
git commit -m "feat: derive the single next step for the home surface"
```

---

### Task 9: Экран кабинета

**Files:**
- Create: `src/features/home/HomePage.tsx`
- Modify: `src/styles.css`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: `summariseProgress` (Task 6), `nextStep` (Task 8),
  `variant='progress'` (Task 7).
- Produces: `HomePage` с параметрами
  `{ regions, attempts, onStartRound, onStartFillRound, onOpenAtlas }`, где
  `onStartRound(exerciseType | 'mixed', level, regionIds: readonly string[] | null)`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/home/HomePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { regions } from '../../content/regions';
import type { Attempt } from '../../domain/round';
import { HomePage } from './HomePage';

function renderHome(attempts: readonly Attempt[] = []) {
  const onStartRound = vi.fn();
  const onStartFillRound = vi.fn();
  const onOpenAtlas = vi.fn();

  render(
    <HomePage
      regions={regions}
      attempts={attempts}
      onStartRound={onStartRound}
      onStartFillRound={onStartFillRound}
      onOpenAtlas={onOpenAtlas}
    />,
  );

  return { onStartRound, onStartFillRound, onOpenAtlas };
}

it('на экране ровно одна главная кнопка', () => {
  renderHome();

  const primary = screen
    .getAllByRole('button')
    .filter((button) => button.classList.contains('primary'));

  expect(primary).toHaveLength(1);
});

it('главная кнопка называет следующий шаг и запускает его', async () => {
  const user = userEvent.setup();
  const { onStartRound } = renderHome();

  await user.click(screen.getByRole('button', { name: 'Начать: найти на карте' }));

  expect(onStartRound).toHaveBeenCalledWith('find-on-map', 1, null);
});

it('строка состояния называет счёт словами и числами', () => {
  renderHome();

  expect(screen.getByTestId('progress-status')).toHaveTextContent(
    'Освоено 0 из 34',
  );
});

it('легенда называет все три состояния карты словами', () => {
  renderHome();

  const legend = screen.getByTestId('progress-legend');
  expect(legend).toHaveTextContent('освоено');
  expect(legend).toHaveTextContent('в работе');
  expect(legend).toHaveTextContent('не тронуто');
});

it('выбор уровня не стоит на верхнем уровне экрана', () => {
  renderHome();

  expect(screen.queryByRole('group', { name: 'Уровень' })).not.toBeInTheDocument();
});

it('другие режимы доступны и запускают свой раунд', async () => {
  const user = userEvent.setup();
  const { onStartRound, onStartFillRound } = renderHome();

  await user.click(screen.getByText(/Другие режимы/));
  await user.click(screen.getByRole('button', { name: 'Регион — столица' }));
  expect(onStartRound).toHaveBeenCalledWith('match-capital', 1, null);

  await user.click(screen.getByRole('button', { name: 'Заполнить карту' }));
  expect(onStartFillRound).toHaveBeenCalledWith(1);
});

it('ведёт в атлас', async () => {
  const user = userEvent.setup();
  const { onOpenAtlas } = renderHome();

  await user.click(screen.getByRole('button', { name: /Открыть атлас/ }));

  expect(onOpenAtlas).toHaveBeenCalled();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/home/HomePage.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать компонент**

Создать `src/features/home/HomePage.tsx`:

```tsx
import { useState } from 'react';
import { regionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import { unlockedLevelFrom } from '../../domain/progress-rules';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import { EXERCISE_MODES } from '../exercise/exercise-modes';
import { nextStep } from './next-step';
import { summariseProgress } from './progress-summary';

const ALL_LEVELS = [1, 2, 3, 4] as const;

export type HomePageProps = {
  readonly regions: readonly Region[];
  readonly attempts: readonly Attempt[];
  readonly onStartRound: (
    request: ExerciseType | 'mixed',
    level: Level,
    regionIds: readonly string[] | null,
  ) => void;
  readonly onStartFillRound: (level: Level) => void;
  readonly onOpenAtlas: () => void;
};

/**
 * Кабинет отвечает на «где я и что дальше». Один главный шаг: четыре
 * равнозначные кнопки на прежнем экране означали, что главного шага нет, а
 * киноварь, отвечающая ровно за одно, была потрачена на все сразу.
 */
export function HomePage({
  regions,
  attempts,
  onStartRound,
  onStartFillRound,
  onOpenAtlas,
}: HomePageProps) {
  const [otherModesOpen, setOtherModesOpen] = useState(false);
  const [level, setLevel] = useState<Level>(() => unlockedLevelFrom(attempts));

  /*
   * `new Date()` берётся один раз на рендер и передаётся правилам: обе они
   * зависят от окна повтора в 14 дней, и два разных «сейчас» дали бы кнопку и
   * карту, рассказывающие разное.
   */
  const now = new Date();
  const summary = summariseProgress(
    regions.map((region) => region.id),
    attempts,
    now,
  );
  const step = nextStep(attempts, now);
  const unlockedLevel = unlockedLevelFrom(attempts);
  const levels = ALL_LEVELS.filter((value) => value <= unlockedLevel);
  const isFirstVisit = attempts.length === 0;

  return (
    <main className="app-shell home-shell">
      <h1>Провинции и столицы Китая</h1>
      <div className="home-layout">
        <div className="home-progress">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            variant="progress"
            usage="answer"
            interactive={false}
            progressStates={summary.stateByRegionId}
          />
          <p className="home-legend" data-testid="progress-legend">
            <span data-progress-state="mastered" /> освоено{' '}
            <span data-progress-state="in-progress" /> в работе{' '}
            <span data-progress-state="untouched" /> не тронуто
          </p>
        </div>
        <div className="home-actions">
          <p className="home-status" data-testid="progress-status">
            Освоено {summary.mastered} из {summary.total} · в работе{' '}
            {summary.inProgress} · открыт уровень {unlockedLevel}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => onStartRound(step.exerciseType, step.level, step.regionIds)}
          >
            {step.label}
          </button>
          {isFirstVisit ? (
            <p className="status-note">
              {regions.length} {regionsWord(regions.length)} · около 7 минут
            </p>
          ) : null}
          <details
            className="home-other-modes"
            open={otherModesOpen}
            onToggle={(event) => setOtherModesOpen(event.currentTarget.open)}
          >
            <summary>Другие режимы</summary>
            {levels.length > 1 ? (
              <fieldset className="level-choice">
                <legend>Уровень</legend>
                {levels.map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="level"
                      checked={level === value}
                      onChange={() => setLevel(value)}
                    />
                    Уровень {value}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <ul className="home-mode-list">
              {level === 4 ? (
                <li>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onStartRound('mixed', level, null)}
                  >
                    Смешанный раунд
                  </button>
                </li>
              ) : (
                Object.values(EXERCISE_MODES).map((mode) => (
                  <li key={mode.exerciseType}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onStartRound(mode.exerciseType, level, null)}
                    >
                      {mode.title}
                    </button>
                  </li>
                ))
              )}
              <li>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onStartFillRound(level)}
                >
                  Заполнить карту
                </button>
              </li>
            </ul>
          </details>
          <button type="button" className="text" onClick={onOpenAtlas}>
            Открыть атлас →
          </button>
        </div>
      </div>
      <MapAttribution />
    </main>
  );
}
```

- [ ] **Step 4: Добавить стили кабинета**

В `src/styles.css` после блока оболочки:

```css
/* --- Кабинет ------------------------------------------------------------ */

.home-shell h1 {
  margin-bottom: var(--s-6);
}

.home-layout {
  display: grid;
  gap: var(--s-6);
}

.home-actions {
  align-items: start;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.home-status {
  color: var(--text-on-ground-muted);
  margin: 0;
}

/*
 * Легенда обязательна: `masteredRegionIds` возвращает список без пояснения, а
 * статус в этом проекте никогда не передаётся одним цветом.
 */
.home-legend {
  align-items: center;
  color: var(--text-on-ground-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--t-size-caption);
  gap: var(--s-2);
  margin-block-start: var(--s-3);
}

.home-legend span {
  block-size: var(--s-3);
  border: var(--border-hair) solid var(--map-border);
  display: inline-block;
  inline-size: var(--s-4);
}

.home-legend span[data-progress-state='mastered'] {
  background: var(--map-progress-mastered);
}

.home-legend span[data-progress-state='in-progress'] {
  background: var(--map-progress-in-progress);
}

.home-legend span[data-progress-state='untouched'] {
  background: var(--map-progress-untouched);
}

.home-other-modes summary {
  cursor: pointer;
  min-height: var(--target-min);
  padding-block: var(--s-2);
}

.home-mode-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

@media (min-width: 1024px) {
  .home-layout {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  }
}
```

Добавить оформление кнопки-ссылки, если `button.text` в проекте ещё нет:

```css
button.text {
  background: none;
  border: none;
  color: var(--accent-on-ground);
  cursor: pointer;
  min-height: var(--target-min);
  padding: 0;
  text-align: start;
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний.

- [ ] **Step 6: Коммит**

```bash
git add src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx src/styles.css
git commit -m "feat: add the home surface with a mastery map and one next step"
```

---

### Task 10: Маршрутизация и удаление экрана темы

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/features/topic-selection/TopicSelectionPage.tsx`
- Delete: `src/features/topic-selection/TopicSelectionPage.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `HomePage` (Task 9), `AtlasPage` (Task 5).
- Produces: `Screen = 'home' | 'atlas' | 'exercise' | 'results' | 'fill' | 'fill-results'`.

- [ ] **Step 1: Написать падающий тест**

В конец `src/App.test.tsx`:

```tsx
it('открывается кабинетом, а не свитком со всем сразу', () => {
  render(<App />);

  expect(screen.getByTestId('progress-status')).toBeInTheDocument();
});

it('ведёт из кабинета в атлас и обратно', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /Открыть атлас/ }));
  expect(screen.getByTestId('atlas-region-card')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /В кабинет/ }));
  expect(screen.getByTestId('progress-status')).toBeInTheDocument();
});

it('главная кнопка кабинета запускает раунд', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: /^Начать/ }));

  expect(screen.getByTestId('exercise-target')).toBeInTheDocument();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — кабинета нет, экран открывается прежним `TopicSelectionPage`.

- [ ] **Step 3: Переписать маршруты**

В `src/App.tsx`:

Заменить импорт `TopicSelectionPage` на:

```ts
import { AtlasPage } from './features/atlas/AtlasPage';
import { HomePage } from './features/home/HomePage';
```

Заменить тип экрана:

```ts
type Screen = 'home' | 'atlas' | 'exercise' | 'results' | 'fill' | 'fill-results';
```

Заменить начальное состояние `useState<Screen>('topic')` на `useState<Screen>('home')`.

Расширить `startRound`, чтобы он принимал набор регионов:

```ts
  function startRound(
    request: ExerciseType | 'mixed',
    nextLevel: Level,
    regionIds: readonly string[] | null,
  ) {
    setRoundPool(
      regionIds === null
        ? regions
        : regions.filter((region) => regionIds.includes(region.id)),
    );
    setExerciseTypes(request === 'mixed' ? ALL_EXERCISE_TYPES : [request]);
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }
```

Обновить вызовы на экране итогов: `startRound(request, level, repeatRegionIds)`
для «Повторить ошибки» и `startRound(request, level, null)` для нового раунда.
Прежний `setRoundPool(pool)` первым параметром больше не нужен — набор
считается внутри.

Заменить каждое `setScreen('topic')` на `setScreen('home')`.

Добавить ветку атласа перед последним `return`:

```tsx
  if (screen === 'atlas') {
    return (
      <AtlasPage
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={setSelectedRegionId}
        onClear={() => setSelectedRegionId(null)}
        zoom={zoom}
        onZoomChange={setZoom}
        onExit={() => setScreen('home')}
        onTrain={() =>
          startRound('find-on-map', unlockedLevelFrom(progress.attempts), null)
        }
      />
    );
  }
```

Заменить финальный `return` целиком:

```tsx
  return (
    <HomePage
      regions={regions}
      attempts={progress.attempts}
      onStartRound={startRound}
      onStartFillRound={startFillRound}
      onOpenAtlas={() => setScreen('atlas')}
    />
  );
```

- [ ] **Step 4: Удалить экран темы**

```bash
git rm src/features/topic-selection/TopicSelectionPage.tsx src/features/topic-selection/TopicSelectionPage.test.tsx
```

Проверить, что на него никто не ссылается:

Run: `grep -rn "TopicSelectionPage" src/`
Expected: пусто.

- [ ] **Step 5: Проверить тесты и сборку**

Run: `npx vitest run && npx eslint . && npm run build`
Expected: PASS, ноль замечаний, сборка проходит.

- [ ] **Step 6: Коммит**

```bash
git add -A src/App.tsx src/App.test.tsx src/features/topic-selection
git commit -m "feat: route between home, atlas and round; drop the topic screen"
```

---

### Task 11: Лента хода раунда и вес атрибуции

На 1280×720 под блоком вопроса пустует около 490 px из 690, а атрибуция карты
занимает три строки и весит как ответ.

**Files:**
- Create: `src/features/exercise/RoundProgressTrail.tsx`
- Modify: `src/features/exercise/ExerciseRound.tsx`
- Modify: `src/styles.css`
- Test: `src/features/exercise/RoundProgressTrail.test.tsx`

**Interfaces:**
- Produces: `RoundProgressTrail` с параметрами `{ total: number, attempts: readonly Attempt[] }`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/exercise/RoundProgressTrail.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { Attempt } from '../../domain/round';
import { RoundProgressTrail } from './RoundProgressTrail';

function attempt(isCorrect: boolean): Attempt {
  return {
    questionId: 'q',
    roundId: 'r',
    regionId: 'hunan',
    exerciseType: 'find-on-map',
    level: 1,
    isCorrect,
    durationMs: 1000,
    answeredAt: '2026-08-04T12:00:00.000Z',
  };
}

it('ставит по отметке на вопрос', () => {
  const { container } = render(
    <RoundProgressTrail total={5} attempts={[attempt(true), attempt(false)]} />,
  );

  expect(container.querySelectorAll('[data-mark]')).toHaveLength(5);
});

it('различает верно, неверно и впереди', () => {
  const { container } = render(
    <RoundProgressTrail total={3} attempts={[attempt(true), attempt(false)]} />,
  );

  const marks = [...container.querySelectorAll('[data-mark]')].map(
    (node) => node.getAttribute('data-mark'),
  );

  expect(marks).toEqual(['correct', 'wrong', 'ahead']);
});

it('скрыта от программ чтения: строка «Вопрос N из M» уже это сообщает', () => {
  const { container } = render(<RoundProgressTrail total={3} attempts={[]} />);

  expect(container.querySelector('.round-trail')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/RoundProgressTrail.test.tsx`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Написать компонент**

Создать `src/features/exercise/RoundProgressTrail.tsx`:

```tsx
import type { Attempt } from '../../domain/round';

export type RoundProgressTrailProps = {
  readonly total: number;
  readonly attempts: readonly Attempt[];
};

/**
 * Ход раунда одной лентой. Знаки `✓ ● ○` уже входят в подмножество
 * `Noto Serif SC` (DESIGN_SYSTEM.md), добавлять в шрифт нечего.
 *
 * `aria-hidden`: строка «Вопрос 7 из 34» сообщает то же самое словами, а 34
 * значка подряд в обходе бесполезны. Смысл несут сами знаки, а не цвет.
 */
export function RoundProgressTrail({ total, attempts }: RoundProgressTrailProps) {
  return (
    <p className="round-trail" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => {
        const attempt = attempts[index];
        const mark =
          attempt === undefined ? 'ahead' : attempt.isCorrect ? 'correct' : 'wrong';
        const glyph = { ahead: '○', correct: '✓', wrong: '●' }[mark];

        return (
          <span key={index} data-mark={mark}>
            {glyph}
          </span>
        );
      })}
    </p>
  );
}
```

- [ ] **Step 4: Поставить ленту в колонку вопроса**

В `src/features/exercise/ExerciseRound.tsx` добавить импорт:

```ts
import { RoundProgressTrail } from './RoundProgressTrail';
```

и вставить компонент последним в `.round-prompt-column`, сразу после блока
`{round.status === 'feedback' ? … : null}`:

```tsx
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
```

- [ ] **Step 5: Оформить ленту и приглушить атрибуцию**

В `src/styles.css` после блока `.round-footer`:

```css
/*
 * Лента хода занимает колонку вопроса, которая иначе пустует: на 1280×720 под
 * блоком вопроса оставалось около 490 px из 690.
 *
 * Знаки живут в китайском шрифте: `✓ ● ○` есть только в нём (DESIGN_SYSTEM.md).
 */
.round-trail {
  display: flex;
  flex-wrap: wrap;
  font-family: var(--t-family-han);
  gap: var(--s-1);
  line-height: 1;
  margin-block-start: var(--s-5);
}

.round-trail span[data-mark='ahead'] {
  color: var(--text-on-ground-muted);
}

.round-trail span[data-mark='correct'] {
  color: var(--state-correct);
}

.round-trail span[data-mark='wrong'] {
  color: var(--accent-on-ground);
}

/*
 * Узкий экран: высота дороже, а «Вопрос N из M» и так стоит в липком блоке.
 */
@media (max-width: 1023px) {
  .round-trail {
    display: none;
  }
}

/*
 * CC BY требует атрибуции, но не равного веса с ответом. Ссылки внутри
 * сохраняют свой цвет и проверенный контраст.
 */
.round-footer .map-attribution {
  color: var(--text-on-ground-muted);
  font-size: var(--t-size-caption);
}
```

- [ ] **Step 6: Проверить тесты**

Run: `npx vitest run && npx eslint .`
Expected: PASS, ноль замечаний. Контраст `--state-correct` на
`--surface-ground` проверяется тестом токенов; если он не проходит — взять
`--map-first-try`, который светлее и уже служит на тёмном.

- [ ] **Step 7: Коммит**

```bash
git add src/features/exercise/RoundProgressTrail.tsx src/features/exercise/RoundProgressTrail.test.tsx src/features/exercise/ExerciseRound.tsx src/styles.css
git commit -m "feat: fill the round prompt column with a progress trail"
```

---

### Task 12: Проверка вживую и документация

Раскладку в jsdom не проверить: у него нет ни размеров, ни медиазапросов.
Числа берутся из браузера.

**Files:**
- Modify: `DESIGN_SYSTEM.md`, `UI_UX.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
  `DECISIONS.md`

- [ ] **Step 1: Запустить приложение**

Run: `npm run dev`

Открыть `http://localhost:5173`.

- [ ] **Step 2: Снять размеры на 1280×720**

В консоли браузера на каждой поверхности:

```js
({ doc: document.documentElement.scrollHeight, frame: innerHeight })
```

Ожидается: кабинет и атлас — `doc` не больше `frame`. Прежний экран темы давал
4351 при 720.

- [ ] **Step 3: Проверить 1366×768 и 375×812**

На 1366×768 атлас в кадре, карта целиком видна. На 375×812 горизонтальной
прокрутки нет ни на одной поверхности:

```js
document.documentElement.scrollWidth <= innerWidth
```

- [ ] **Step 4: Проверить поле вокруг карты**

```js
const svg = document.querySelector('.china-map svg');
const b = svg.getBBox();
const [x, y, w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
({ left: b.x - x, top: b.y - y, right: x + w - (b.x + b.width), bottom: y + h - (b.y + b.height) })
```

Ожидается: все четыре не меньше `0.8` — половины `--map-border-width-strong`.

- [ ] **Step 5: Проверить масштаб текста 200 %**

В браузере увеличить масштаб до 200 % и пройти все три поверхности: ничего не
обрезано, горизонтальной прокрутки нет. Это же условие обслуживает будущий
проекторный режим.

- [ ] **Step 6: Обновить документы**

- `DESIGN_SYSTEM.md` — раздел о карте: третий режим `progress` и его три
  состояния; в разделе «Экран раунда» — что оболочка `100dvh` теперь общая с
  атласом; в разделе о целях нажатия — новые числа из `validate:map`.
- `UI_UX.md` — список основных экранов: кабинет, атлас, раунд, обратная связь,
  итог.
- `ARCHITECTURE.md` — новые каталоги `src/features/home` и
  `src/features/atlas`, исчезнувший `topic-selection`.
- `DECISIONS.md` — запись за 2026-08-04: контекст (экран темы 4351 px, четыре
  равные кнопки, прогресс не виден, обводка обрезается), решение (три
  поверхности, карта освоенности, поле в `viewBox`), последствия (рисунок на
  4 % мельче, `TopicSelectionPage` удалён).
- `CHANGELOG.md` — по образцу прежних записей.

- [ ] **Step 7: Финальная проверка**

Run: `npx vitest run && npx eslint . && npm run build`
Expected: PASS, ноль замечаний, сборка проходит.

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "docs: record the three-surface layout"
```

---

## Готовность

- Кабинет, атлас и раунд помещаются в кадр на 1280×720 без прокрутки.
- На кабинете одна кнопка `primary`, и её подпись называет конкретный
  следующий шаг.
- Прогресс виден: ученик с историей и без неё видят разные экраны.
- Границы регионов не обрезаются ни в одном состоянии, включая наведение.
- Зум не стоит между заголовком и картой.
- `npx eslint .` чисто, все тесты проходят, `npm run build` собирается.
