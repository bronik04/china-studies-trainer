# Физическая карта: вид, реки и ступени — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать физическую карту: заливку по трём ступеням рельефа, шесть рек поверх неё, подписи и нажатие по ближайшей реке — и дать переключить её в атласе.

**Architecture:** Слой рисуется порталом внутрь уже вставленной разметки карты, как `CityLayer`: система координат и увеличение достаются ему от самой карты. Обрезка по границе Китая — `clipPath` из `<use>` на те же 34 контура региона, без второй копии геометрии. Нажатие по реке разрешается расстоянием: обработчик слоя переводит положение курсора в единицы карты и зовёт чистую функцию `riverAt`; с клавиатуры отвечают самой линией.

**Tech Stack:** TypeScript, React, Vite, Vitest. Новых зависимостей нет.

**Область.** Это **шаг 2 из трёх** в `docs/superpowers/specs/2026-08-05-physical-map-design.md`. Игр и карточек на главной здесь нет — они шаг 3. После этого плана физическую карту можно разглядывать в атласе, но нельзя по ней играть.

**Что уже измерено и решено.** Четвёртая пара красок помещается: связывающее ограничение — линия реки против самой тёмной ступени, и при линии светлотой 0,045 заливка допустима до светлоты 0,234. Под три ступени остаётся отрезок 0,234…0,683, то есть 1,79:1 между соседними — больше, чем нынешние тона типов региона отличаются друг от друга (1,26 и 1,08). Штриховка, которую спек держал про запас, не нужна: ступени различаются светлотой, а называются словом в легенде — как уже устроены типы регионов.

## Global Constraints

- Интерфейс, подписи и легенда — на русском; китайские названия в Unicode.
- Смысл не несёт один только цвет: каждая ступень названа словом в легенде, каждый объект — в `aria-label` (`MAP_SPEC.md`, `DESIGN_SYSTEM.md`).
- Цвета берутся только из `src/design/tokens.css`; компоненты не пишут значения напрямую.
- Цель нажатия не меньше `MIN_TARGET_PX` = 24 px на опорной ширине 1120; половина ленты реки считается от текущего масштаба, как у городов.
- Карта доступна с клавиатуры: `Tab`, `Enter`, `Space`, видимый фокус.
- Домен не вызывает `Math.random`; сетевых запросов во время работы нет.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. Каждая задача заканчивается коммитом. Ветка — `feat/physical-map-view` (уже создана).

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/design/tokens.css` | четыре заливки ступеней, цвет линии реки, толщины |
| `scripts/validate-tokens.test.ts` | линия реки даёт 3:1 к каждой ступени; граница и подпись — к ним же |
| `src/map/river-hit.ts` | **новый**: `riverAt` — ближайшая река к точке, чистая функция |
| `src/map/PhysicalLayer.tsx` | **новый**: заливка ступеней, линии рек, подписи, обрезка по границе |
| `src/map/ChinaMap.tsx` | `variant='physical'`, показ слоя, перевод координат нажатия |
| `src/styles.css` | стили слоя: заливки по ступеням, линия, подпись, фокус |
| `src/features/atlas/AtlasPage.tsx` | переключатель «Политическая / Физическая» и легенда ступеней |

---

### Task 1: Токены ступеней и линии реки

**Files:**
- Modify: `src/design/tokens.css`
- Test: `scripts/validate-tokens.test.ts`

**Interfaces:**
- Produces: `--map-relief-step-1`, `--map-relief-step-2`, `--map-relief-step-3`, `--map-relief-rest`, `--map-river`, `--map-river-width`, `--map-river-width-strong`.

- [ ] **Step 1: Написать падающий тест контраста**

В `scripts/validate-tokens.test.ts`, в `describe('карта', ...)`, после теста «подпись региона читается на любой заливке суши»:

```ts
  /**
   * Ступени рельефа. Линия реки идёт поверх всех четырёх заливок, и ей, как
   * всякой графике, несущей смысл, WCAG 2.2 (1.4.11) требует 3:1. Это
   * связывающее ограничение всей палитры: чем темнее ступень, тем темнее
   * обязана быть линия, а темнее туши она быть не может.
   */
  const RELIEF_FILLS = [
    '--map-relief-step-1',
    '--map-relief-step-2',
    '--map-relief-step-3',
    '--map-relief-rest',
  ] as const;

  it('линия реки видна на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-river', fill, GRAPHIC_CONTRAST);
    }
  });

  it('граница региона видна на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-border', fill, GRAPHIC_CONTRAST);
    }
  });

  it('подпись объекта читается на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-label', fill, TEXT_CONTRAST);
    }
  });

  it('соседние ступени различимы по светлоте', () => {
    // Не требование WCAG: смысл несёт ещё и слово в легенде. Но ступени —
    // главное, что говорит эта карта, и сливаться им нельзя. Измеренный
    // предел при линии светлотой 0.045 — около 1.79 между соседними.
    for (const [darker, lighter] of [
      ['--map-relief-step-1', '--map-relief-step-2'],
      ['--map-relief-step-2', '--map-relief-step-3'],
    ] as const) {
      const ratio = contrastRatioRounded(color(darker), color(lighter));
      expect(ratio, `${darker} против ${lighter}: ${ratio}:1`).toBeGreaterThan(1.3);
    }
  });
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: FAIL — «Не цвет: undefined» или подобное: токенов ещё нет.

- [ ] **Step 3: Добавить токены**

В `src/design/tokens.css`, в примитивы рядом с `--c-land-*`:

```css
  /*
   * Ступени рельефа. Светлота падает с востока на запад так же, как растёт
   * высота: нижняя ступень — светлая зелень равнин, верхняя — тёмная охра
   * нагорья. Отрезок светлоты выбран не на глаз: снизу его держит линия реки,
   * которой нужно 3:1 к самой тёмной ступени, сверху — нейтральный тон.
   */
  --c-relief-high: #b58f52;
  --c-relief-mid: #d8bd88;
  --c-relief-low: #cbd8ae;
  --c-relief-rest: #ded7c9;

  /* Река. Глубокая синь: светлее она не даёт 3:1 к верхней ступени. */
  --c-river-700: #0f3f5e;
```

И в группу карты, после `--map-kind-sar`:

```css
  /*
   * Физическая карта. Заливка означает ступень рельефа, а не тип региона:
   * решение от 2026-08-05. Каждая ступень названа словом в легенде — цвет
   * здесь такой же несамостоятельный канал, как у типов региона.
   */
  --map-relief-step-1: var(--c-relief-high);
  --map-relief-step-2: var(--c-relief-mid);
  --map-relief-step-3: var(--c-relief-low);
  /* Территории, которых нет ни в одной названной форме: 27.8 % суши. */
  --map-relief-rest: var(--c-relief-rest);

  --map-river: var(--c-river-700);
  --map-river-width: 1.8;
  --map-river-width-strong: 3.2;
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS. Если «линия реки видна на каждой ступени» падает — верхняя ступень слишком тёмная; её светлота не должна опускаться ниже 0.234.

- [ ] **Step 5: Коммит**

```bash
git add src/design/tokens.css scripts/validate-tokens.test.ts
git commit -m "feat: токены ступеней рельефа и линии реки"
```

---

### Task 2: Ближайшая река к точке

**Files:**
- Create: `src/map/river-hit.ts`
- Test: `src/map/river-hit.test.ts`

**Interfaces:**
- Consumes: `RIVER_LINES` из `src/map/physical-geometry.ts`, `distanceToPolylines` из `src/map/polyline.ts`, `parseMapPath` из `src/map/svg-path.ts`.
- Produces: `RIVER_SHAPES: readonly { featureId: string; parts: Point[][] }[]`, `riverAt(x: number, y: number, maxDistance: number): string | null`.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/map/river-hit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { RIVER_SHAPES, riverAt } from './river-hit';

/** Точка на самой линии реки: берём её из настоящей геометрии. */
function pointOn(featureId: string) {
  const shape = RIVER_SHAPES.find((river) => river.featureId === featureId);
  const points = shape?.parts.flat() ?? [];

  return points[Math.floor(points.length / 2)];
}

describe('riverAt', () => {
  it('разбирает все шесть рек', () => {
    expect(RIVER_SHAPES).toHaveLength(
      physicalFeatures.filter((feature) => feature.kind === 'river').length,
    );
  });

  it('находит реку в точке на её линии', () => {
    for (const river of RIVER_SHAPES) {
      const [x, y] = pointOn(river.featureId);
      expect(riverAt(x, y, 8)).toBe(river.featureId);
    }
  });

  it('молчит там, где рек нет', () => {
    // Северо-западный угол рамки: суши там нет вовсе.
    expect(riverAt(-10, -10, 8)).toBeNull();
  });

  it('не отвечает рекой, до которой дальше порога', () => {
    const [x, y] = pointOn('tarim');
    expect(riverAt(x + 100, y, 8)).toBeNull();
  });

  it('на участке параллельных рек отдаёт точку ближайшей', () => {
    // Янцзы и Ланьцанцзян сходятся до 4 единиц: у точки на самой Янцзы
    // ответ обязан быть «Янцзы», а не «та, что нашлась первой».
    const [x, y] = pointOn('yangtze');
    expect(riverAt(x, y, 8)).toBe('yangtze');
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/river-hit.test.ts`
Expected: FAIL — «Failed to resolve import "./river-hit"».

- [ ] **Step 3: Написать модуль**

Создать `src/map/river-hit.ts`:

```ts
/**
 * Какая река под курсором.
 *
 * У рек нет цели нажатия: лента в 24 px вокруг каждой линии невыполнима —
 * Янцзы и Ланьцанцзян сближаются до 4 единиц карты (решение от 2026-08-05).
 * Точка достаётся ближайшей реке, если та ближе порога: цели по построению не
 * спорят, и у каждой точки карты ответ ровно один.
 */
import { RIVER_LINES } from './physical-geometry';
import { distanceToPolylines } from './polyline';
import { parseMapPath, type Point } from './svg-path';

export type RiverShape = {
  readonly featureId: string;
  /**
   * Куски линии. Именно куски, а не общий список точек: обрезка по рамке
   * разрывает реку, и склеенные точки дали бы звено через всю карту.
   */
  readonly parts: Point[][];
};

export const RIVER_SHAPES: readonly RiverShape[] = RIVER_LINES.map((line) => ({
  featureId: line.featureId,
  parts: parseMapPath(line.d),
}));

/** Ближайшая река к точке карты или `null`, если все дальше порога. */
export function riverAt(x: number, y: number, maxDistance: number): string | null {
  let nearestId: string | null = null;
  let nearest = maxDistance;

  for (const river of RIVER_SHAPES) {
    const distance = distanceToPolylines(x, y, river.parts);
    if (distance <= nearest) {
      nearest = distance;
      nearestId = river.featureId;
    }
  }

  return nearestId;
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map/river-hit.test.ts`
Expected: PASS, 5 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/map/river-hit.ts src/map/river-hit.test.ts
git commit -m "feat: ближайшая река к точке карты"
```

---

### Task 3: Слой физической карты

**Files:**
- Create: `src/map/PhysicalLayer.tsx`
- Test: `src/map/PhysicalLayer.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `RELIEF_SHAPES` из `physical-geometry.ts`, `RIVER_SHAPES` из `river-hit.ts`, `physicalFeatures` из `src/content/physical-features.ts`, `regions` из `src/content/regions.ts`.
- Produces: `PhysicalLayer` со свойствами `{ selectedFeatureId?: string | null; onSelect?: (featureId: string) => void; showsLabels?: boolean }`.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/map/PhysicalLayer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhysicalLayer } from './PhysicalLayer';

function renderLayer(props: Parameters<typeof PhysicalLayer>[0] = {}) {
  return render(
    <svg viewBox="-16 -16 806 601">
      <PhysicalLayer {...props} />
    </svg>,
  );
}

describe('PhysicalLayer', () => {
  it('рисует все формы подложки и все реки', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.relief-shape')).toHaveLength(38);
    expect(container.querySelectorAll('.river-line')).toHaveLength(6);
  });

  it('формы фона недоступны читалке экрана, а реки названы', () => {
    const { container } = renderLayer();

    for (const shape of container.querySelectorAll('.relief-shape')) {
      expect(shape).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByLabelText(/Янцзы, 长江/)).toBeInTheDocument();
  });

  it('без обработчика реки не получают фокус: слой только показывает', () => {
    const { container } = renderLayer();

    for (const line of container.querySelectorAll('.river-line')) {
      expect(line).toHaveAttribute('tabindex', '-1');
    }
  });

  it('с обработчиком река отвечает на Enter', async () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const river = screen.getByLabelText(/Хуанхэ/);
    river.focus();
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.keyDown(river, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('yellow-river');
  });

  it('подписи скрываются по требованию: в игре имя объекта и есть ответ', () => {
    const { container } = renderLayer({ showsLabels: false });

    expect(container.querySelector('.physical-layer')).toHaveAttribute(
      'data-labels',
      'false',
    );
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: FAIL — «Failed to resolve import "./PhysicalLayer"».

- [ ] **Step 3: Написать слой**

Создать `src/map/PhysicalLayer.tsx`:

```tsx
import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import { RELIEF_SHAPES, RIVER_LINES } from './physical-geometry';
import { RIVER_SHAPES } from './river-hit';

/**
 * Физическая карта: заливка по ступеням рельефа и шесть рек поверх.
 *
 * Рисуется порталом внутрь уже вставленной разметки карты — как слой городов,
 * и по той же причине: система координат и увеличение достаются ему от самой
 * карты, а не подгоняются вторым `svg` поверх.
 *
 * Обрезка по границе Китая делается `clipPath` из `<use>` на те же 34 контура
 * региона. Копировать их геометрию сюда не нужно и вредно: копия разошлась бы
 * с картой при первой же её правке.
 */
const NAME_OF = new Map(
  physicalFeatures.map((feature) => [
    feature.id,
    `${feature.nameRu}, ${feature.nameZh}`,
  ]),
);

const CLIP_ID = 'china-land-clip';

export type PhysicalLayerProps = {
  readonly selectedFeatureId?: string | null;
  /**
   * Задан — объекты отвечают на нажатие и получают фокус. Не задан — слой
   * только показывает: в атласе шесть новых остановок `Tab` оправданы, а на
   * чужой поверхности — нет.
   */
  readonly onSelect?: (featureId: string) => void;
  /** Ложь — подписи скрыты: в игре подпись объекта и есть ответ. */
  readonly showsLabels?: boolean;
};

export function PhysicalLayer({
  selectedFeatureId = null,
  onSelect,
  showsLabels = true,
}: PhysicalLayerProps) {
  return (
    <g
      className="physical-layer"
      data-interactive={onSelect !== undefined}
      data-labels={showsLabels}
    >
      <defs>
        <clipPath id={CLIP_ID}>
          {regions.map((region) => (
            <use key={region.mapAreaId} href={`#${region.mapAreaId}`} />
          ))}
        </clipPath>
      </defs>

      <g className="relief" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.map((shape) => (
          <path
            key={shape.key}
            className="relief-shape"
            d={shape.d}
            data-step={shape.step}
            data-feature-id={shape.featureId}
            aria-hidden="true"
          />
        ))}
      </g>

      <g className="rivers" clipPath={`url(#${CLIP_ID})`}>
        {RIVER_LINES.map((line) => {
          const label = NAME_OF.get(line.featureId) ?? line.featureId;
          const [labelX, labelY] = LABEL_POINTS.get(line.featureId) ?? [0, 0];

          return (
            <g key={line.featureId} className="river">
              <path
                className="river-line"
                d={line.d}
                data-feature-id={line.featureId}
                data-selected={line.featureId === selectedFeatureId}
                role={onSelect ? 'button' : undefined}
                aria-label={onSelect ? label : undefined}
                aria-hidden={onSelect ? undefined : 'true'}
                tabIndex={onSelect ? 0 : -1}
                onClick={onSelect ? () => onSelect(line.featureId) : undefined}
                onKeyDown={
                  onSelect
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(line.featureId);
                        }
                      }
                    : undefined
                }
              />
              <text
                className="physical-label"
                x={labelX}
                y={labelY - LABEL_OFFSET}
                textAnchor="middle"
                aria-hidden="true"
              >
                {NAME_RU_OF.get(line.featureId)}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}
```

Вспомогательные значения объявляются рядом с `NAME_OF`, на уровне модуля —
считать их на каждой отрисовке незачем, геометрия не меняется:

```ts
const NAME_RU_OF = new Map(
  physicalFeatures.map((feature) => [feature.id, feature.nameRu]),
);

/** Подпись отходит от линии вверх, иначе буквы садятся на саму реку. */
const LABEL_OFFSET = 4;

/**
 * Точка подписи — середина самого длинного куска линии. У реки, разрезанной
 * рамкой карты, середина общего списка точек попала бы в разрыв.
 */
const LABEL_POINTS = new Map(
  RIVER_SHAPES.map((river) => {
    const longest = river.parts.reduce(
      (best, part) => (part.length > best.length ? part : best),
      river.parts[0] ?? [],
    );

    return [river.featureId, longest[Math.floor(longest.length / 2)] ?? [0, 0]];
  }),
);
```

Импорт слоя берёт из `./physical-geometry` и `RELIEF_SHAPES`, и `RIVER_LINES`:
первое даёт формы подложки, второе — готовые пути рек. `RIVER_SHAPES` из
`./river-hit` нужен здесь только ради точки подписи, а его настоящая работа —
поиск ближайшей реки.

- [ ] **Step 4: Стили слоя**

В `src/styles.css`, рядом с блоком `.city-layer`:

```css
.physical-layer .relief-shape {
  stroke: none;
}

.physical-layer .relief-shape[data-step='1'] {
  fill: var(--map-relief-step-1);
}

.physical-layer .relief-shape[data-step='2'] {
  fill: var(--map-relief-step-2);
}

.physical-layer .relief-shape[data-step='3'] {
  fill: var(--map-relief-step-3);
}

.physical-layer .river-line {
  fill: none;
  stroke: var(--map-river);
  stroke-width: var(--map-river-width);
  stroke-linejoin: round;
  stroke-linecap: round;
}

.physical-layer[data-interactive='true'] .river-line {
  cursor: pointer;
}

.physical-layer .river-line[data-selected='true'],
.physical-layer .river-line:hover,
.physical-layer .river-line:focus-visible {
  stroke-width: var(--map-river-width-strong);
}

.physical-layer .river-line:focus-visible {
  outline: none;
  stroke: var(--focus-on-paper);
}

.physical-layer[data-labels='false'] .physical-label {
  display: none;
}
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: PASS, 5 тестов.

- [ ] **Step 6: Коммит**

```bash
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/styles.css
git commit -m "feat: слой физической карты — ступени, реки, подписи"
```

---

### Task 4: Вид карты `physical`

**Files:**
- Modify: `src/map/ChinaMap.tsx`
- Test: `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Produces: `variant='physical'` у `ChinaMap`; свойства `selectedFeatureId`, `onSelectFeature`, `showsPhysicalLabels`.

- [ ] **Step 1: Написать падающий тест**

В `src/map/ChinaMap.test.tsx`:

```tsx
it('вид physical показывает ступени рельефа и реки', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="physical"
    />,
  );

  expect(container.querySelector('.physical-layer')).toBeInTheDocument();
  expect(container.querySelectorAll('.river-line')).toHaveLength(6);
});

it('в остальных видах физического слоя нет', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(container.querySelector('.physical-layer')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/map/ChinaMap.test.tsx -t 'physical'`
Expected: FAIL — слоя нет.

- [ ] **Step 3: Добавить вид**

В `src/map/ChinaMap.tsx`:

1. В типе `variant` добавить `'physical'` и описать его в том же комментарии: «`physical` — физическая: заливка означает ступень рельефа, поверх неё реки».
2. Добавить свойства:

```ts
  readonly selectedFeatureId?: string | null;
  readonly onSelectFeature?: (featureId: string) => void;
  readonly showsPhysicalLabels?: boolean;
```

3. Рядом с порталом слоя городов — портал слоя физической карты:

```tsx
      {variant === 'physical' && citySvg
        ? createPortal(
            <PhysicalLayer
              selectedFeatureId={selectedFeatureId}
              onSelect={onSelectFeature}
              showsLabels={showsPhysicalLabels}
            />,
            citySvg,
          )
        : null}
```

4. В эффекте, который правит области, при `variant === 'physical'` снять с областей собственную заливку: они становятся подложкой под ступени. Это делается атрибутом `data-map-variant` на контейнере — он уже ставится, — и правилом в `src/styles.css`:

```css
.china-map[data-map-variant='physical'] [data-region-id] {
  fill: var(--map-relief-rest);
}
```

Порядок важен: области рисуются первыми и дают нейтральный тон тем 27.8 % суши, которых нет ни в одной названной форме; поверх них ложится слой со ступенями, обрезанный по границе.

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: PASS, включая прежние тесты вида.

- [ ] **Step 5: Коммит**

```bash
git add src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx src/styles.css
git commit -m "feat: вид карты physical"
```

---

### Task 5: Переключатель и легенда в атласе

**Files:**
- Modify: `src/features/atlas/AtlasPage.tsx`
- Test: `src/features/atlas/AtlasPage.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Написать падающий тест**

В `src/features/atlas/AtlasPage.test.tsx`:

```tsx
it('переключает карту между политической и физической', async () => {
  const user = userEvent.setup();
  const { container } = renderAtlas();

  expect(container.querySelector('.physical-layer')).not.toBeInTheDocument();

  await user.click(screen.getByRole('radio', { name: 'Физическая' }));

  expect(container.querySelector('.physical-layer')).toBeInTheDocument();
  expect(screen.getByText('Нагорье')).toBeInTheDocument();
  expect(screen.getByText('Плато и котловины')).toBeInTheDocument();
  expect(screen.getByText('Равнины')).toBeInTheDocument();
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx -t 'переключает'`
Expected: FAIL — переключателя нет.

- [ ] **Step 3: Добавить переключатель и легенду**

В `AtlasPage.tsx` — состояние `const [mapKind, setMapKind] = useState<'political' | 'physical'>('political')`, радиогруппа над картой и легенда под ней:

```tsx
const RELIEF_LEGEND = [
  { step: 1, title: 'Нагорье', hint: 'выше 4000 м' },
  { step: 2, title: 'Плато и котловины', hint: '1000–2000 м' },
  { step: 3, title: 'Равнины', hint: 'ниже 500 м' },
] as const;
```

Легенда обязательна: ступень — главное, что говорит эта карта, и цвет не может быть единственным её каналом. Каждая строка легенды показывает образец заливки и называет ступень словом.

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Полная проверка и коммит**

Run: `npm run build && npm test && npm run lint`
Expected: всё зелёное.

Проверить в браузере: переключение видов, наведение на реку, `Tab` до реки и `Enter`, увеличение и панорамирование на физической карте, 320 px.

```bash
git add src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/styles.css CHANGELOG.md
git commit -m "feat: переключатель физической карты и легенда ступеней в атласе"
```

---

## Что остаётся шагу 3

- третье значение `'physical'` у `TargetKind`;
- две игры и карточки на главной;
- отвлекающие того же вида в «Назвать объект»;
- равнозначный список из двенадцати кнопок на узком экране.
