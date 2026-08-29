# Достопримечательности и гроздь-лупа: план

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: возьмите superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans и ведите задачи по одной. Шаги помечены `- [ ]`.

**Цель:** добавить каталог из 38 достопримечательностей со звездой на карте, тремя играми и страницами — и вместе с ним общий приём карты: гроздь, раскрывающуюся лупой, которая заменяет нынешнее разведение целей у городов.

**Устройство:** механика грозди приезжает первой и на готовом каталоге городов — тогда её проверяет уже написанный набор тестов. Дальше появляется каталог достопримечательностей, слой, проверки и игры, и только потом наполняется содержание: тринадцать записей за задачу, каждая оставляет сборку зелёной.

**Инструменты:** React 19, TypeScript, Vite (rolldown), Vitest 4, Testing Library. Роутера нет: экраны — конечный автомат в `src/App.tsx`.

**Спек:** `docs/superpowers/specs/2026-08-28-landmarks-design.md`.

## Общие требования

Они действуют в каждой задаче, повторять их в шагах не будем.

- Интерфейс, задания и ошибки — по-русски; китайские названия в Unicode, не только пиньинем.
- Каждый факт и каждая координата ссылается на запись в `src/content/sources.ts`, отражённую в `docs/sources/sources.md`.
- Домен не зовёт `Math.random`, компоненты не трогают `localStorage`, UI не знает ключей SVG.
- Цвета, размеры и длительности — только из `src/design/tokens.css`.
- «Британника», БРЭ и ЮНЕСКО читаются браузером: `WebFetch` получает от них 403.
- Новый иероглиф в `src` роняет `validate:fonts` — после наполнения каталога `npm run generate:fonts`.
- Готовность задачи: `npm run lint`, `npm test` и `npm run build` завершаются кодом 0. Проверять именно код возврата (`npm run build; echo $?`), а не наличие слова в выводе.
- Ветка одна на всю работу: `feature/landmarks`. Коммит на задачу.

## Что где лежит

| Файл | За что отвечает |
| --- | --- |
| `src/map/cluster.ts` | чистая механика грозди: группировка, коэффициент, места в лупе |
| `src/map/ClusterLens.tsx` | разметка грозди: свёрнутый знак, раскрытая лупа, клавиатура |
| `src/map/CityLayer.tsx` | переезжает с `spreadHitTargets` на гроздь |
| `src/content/landmarks.ts` | справочник из 38 записей |
| `src/content/landmark-sets.ts` | вложенные наборы по роду |
| `src/map/landmark-points.ts` | проекция каталога в координаты карты |
| `src/map/LandmarkLayer.tsx` | слой звёзд поверх карты |
| `src/domain/landmark-choices.ts` | отвлекающие того же рода |
| `src/features/exercise/LandmarkRound.tsx` | экран раунда |
| `src/map/validate-map.ts` | звезда внутри своего региона, радиус лупы в пределе |
| `src/content/collections.ts` | порождение страниц, `aboutLandmarkId`, слияние двойников |

---

### Задача 1: механика грозди

**Файлы:**
- Создать: `src/map/cluster.ts`
- Тест: `src/map/cluster.test.ts`

**Связи:**
- Берёт: `TARGET_DIAMETER_UNITS` из `src/map/city-hit-targets.ts`.
- Даёт: `clusterPlaceables(points, diameter?) → ClusterLayout`, типы `Placeable`, `LensMember`, `MapCluster`, `ClusterLayout`, постоянные `LENS_MARGIN_UNITS`, `MAX_LENS_RADIUS_UNITS`.

- [ ] **Шаг 1: написать падающий тест**

`src/map/cluster.test.ts`:

```ts
import { expect, it } from 'vitest';
import { clusterPlaceables } from './cluster';

const D = 17.28;

it('оставляет одиночкой того, у кого нет соседа ближе диаметра', () => {
  const layout = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 40, y: 0 },
    ],
    D,
  );

  expect(layout.clusters).toHaveLength(0);
  expect(layout.singles.map((point) => point.id)).toEqual(['a', 'b']);
});

/*
 * Крайние в цепочке дальше диаметра друг от друга, но гроздь обязана быть
 * одна: иначе средний объект попал бы в две грозди сразу.
 */
it('собирает цепочку в одну гроздь', () => {
  const layout = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 12, y: 0 },
      { id: 'c', x: 24, y: 0 },
    ],
    D,
  );

  expect(layout.clusters).toHaveLength(1);
  expect(layout.clusters[0].members.map((member) => member.id)).toEqual(['a', 'b', 'c']);
});

it('разводит ближайшую пару ровно на диаметр цели', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 102, y: 100 },
      { id: 'c', x: 100, y: 105 },
    ],
    D,
  ).clusters;

  const nearest = Math.min(
    ...cluster.members.flatMap((one, index) =>
      cluster.members
        .slice(index + 1)
        .map((other) => Math.hypot(one.lensX - other.lensX, one.lensY - other.lensY)),
    ),
  );

  expect(nearest).toBeCloseTo(D, 6);
});

/* Лупа увеличивает, а не переставляет: отношения расстояний сохраняются. */
it('сохраняет взаимное расположение', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 2, y: 0 },
      { id: 'c', x: 6, y: 0 },
    ],
    D,
  ).clusters;

  const [a, b, c] = cluster.members;

  expect(b.lensX - a.lensX).toBeCloseTo((c.lensX - a.lensX) / 3, 6);
  expect(a.lensY).toBeCloseTo(b.lensY, 6);
});

it('вмещает крайнюю цель в радиус лупы', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 3, y: 0 },
      { id: 'c', x: 0, y: 4 },
    ],
    D,
  ).clusters;

  for (const member of cluster.members) {
    const reach = Math.hypot(member.lensX - cluster.x, member.lensY - cluster.y);

    expect(reach + D / 2).toBeLessThanOrEqual(cluster.radius);
  }
});

/* Карта не должна переставлять грозди между перерисовками. */
it('не зависит от порядка входа', () => {
  const points = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 3, y: 0 },
    { id: 'c', x: 60, y: 0 },
  ];

  const straight = clusterPlaceables(points, D);
  const reversed = clusterPlaceables([...points].reverse(), D);

  expect(reversed.clusters[0].members.map((member) => member.id).sort()).toEqual(
    straight.clusters[0].members.map((member) => member.id).sort(),
  );
  expect(reversed.clusters[0].radius).toBeCloseTo(straight.clusters[0].radius, 6);
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/cluster.test.ts
```

Ожидается: FAIL, «Failed to resolve import "./cluster"».

- [ ] **Шаг 3: написать `src/map/cluster.ts`**

```ts
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';

/**
 * Гроздь: что делать с объектами, стоящими ближе цели нажатия друг к другу.
 *
 * Прежний ответ — развести цели по кольцам вокруг знака (`spreadHitTargets`):
 * знак оставался на месте, а цель уезжала и связывалась поводком. Чем теснее
 * объекты, тем хуже это читается: у трёх пекинских достопримечательностей
 * знаки сливаются в один пиксель, и на карте остаётся клякса с тремя усами.
 *
 * Новый ответ — лупа. Скучившиеся собираются в одну цель с числом, а раскрытая
 * гроздь показывает их в круге, увеличив окрестность ровно во столько раз,
 * чтобы ближайшая пара разошлась на диаметр цели. Взаимное расположение при
 * этом настоящее: лупа увеличивает, а не переставляет, — иначе «найти на
 * карте» внутри неё перестало бы быть вопросом про место.
 */

export type Placeable = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

export type LensMember = Placeable & {
  readonly lensX: number;
  readonly lensY: number;
};

export type MapCluster = {
  /** Зовётся первым своим объектом: порядок входа задан каталогом. */
  readonly id: string;
  /** Середина грозди: место свёрнутого знака и якоря раскрытой лупы. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly scale: number;
  readonly members: readonly LensMember[];
};

export type ClusterLayout = {
  readonly singles: readonly Placeable[];
  readonly clusters: readonly MapCluster[];
};

/** Запас между крайней целью и краем лупы. */
export const LENS_MARGIN_UNITS = 2;

/**
 * Предел радиуса лупы. Больше — сборка падает: круг шириной в десятую часть
 * карты означает, что каталог просит другого решения, и принимать его должен
 * человек. Самая крупная в обоих каталогах — пекинская, 55,4 единицы.
 */
export const MAX_LENS_RADIUS_UNITS = 80;

/**
 * Наименьшее расстояние, с которым считается коэффициент. Два объекта в одной
 * точке дали бы бесконечное увеличение; такой каталог не пройдёт `validate:map`,
 * но слой обязан дожить до проверки, а не упасть при отрисовке.
 */
const MIN_PAIR_UNITS = 0.05;

function distance(one: Placeable, other: Placeable): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

/**
 * Связные компоненты графа «ближе диаметра». Именно компоненты, а не попарное
 * слипание: три объекта в ряд с шагом в две трети диаметра обязаны попасть в
 * одну гроздь, хотя крайние друг от друга дальше неё.
 */
function groupsOf(
  points: readonly Placeable[],
  diameter: number,
): Placeable[][] {
  const groups: Placeable[][] = [];
  const seen = new Set<number>();

  points.forEach((point, index) => {
    if (seen.has(index)) {
      return;
    }

    const queue = [index];
    const found = [index];
    seen.add(index);

    while (queue.length > 0) {
      const current = queue.shift() as number;

      points.forEach((other, otherIndex) => {
        if (!seen.has(otherIndex) && distance(points[current], other) < diameter) {
          seen.add(otherIndex);
          queue.push(otherIndex);
          found.push(otherIndex);
        }
      });
    }

    /* Порядок внутри грозди — порядок каталога, а не обхода. */
    groups.push(found.sort((left, right) => left - right).map((at) => points[at]));
  });

  return groups;
}

export function clusterPlaceables(
  points: readonly Placeable[],
  diameter: number = TARGET_DIAMETER_UNITS,
): ClusterLayout {
  const singles: Placeable[] = [];
  const clusters: MapCluster[] = [];

  for (const group of groupsOf(points, diameter)) {
    if (group.length === 1) {
      singles.push(group[0]);
      continue;
    }

    const x = group.reduce((sum, point) => sum + point.x, 0) / group.length;
    const y = group.reduce((sum, point) => sum + point.y, 0) / group.length;

    let nearest = Infinity;

    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        nearest = Math.min(nearest, distance(group[i], group[j]));
      }
    }

    const scale = diameter / Math.max(nearest, MIN_PAIR_UNITS);
    const members = group.map((point) => ({
      ...point,
      lensX: x + (point.x - x) * scale,
      lensY: y + (point.y - y) * scale,
    }));
    const reach = Math.max(
      ...members.map((member) => Math.hypot(member.lensX - x, member.lensY - y)),
    );

    clusters.push({
      id: `cluster:${group[0].id}`,
      x,
      y,
      scale,
      radius: reach + diameter / 2 + LENS_MARGIN_UNITS,
      members,
    });
  }

  return { singles, clusters };
}
```

- [ ] **Шаг 4: тесты проходят**

```bash
npx vitest run src/map/cluster.test.ts
```

Ожидается: 6 passed.

- [ ] **Шаг 5: коммит**

```bash
git add src/map/cluster.ts src/map/cluster.test.ts && git commit -m "feat: механика грозди-лупы"
```

---

### Задача 2: разметка грозди и клавиатура

**Файлы:**
- Создать: `src/map/ClusterLens.tsx`, `src/map/ClusterLens.test.tsx`
- Изменить: `src/styles.css` (новые правила в конце раздела карты)

**Связи:**
- Берёт: `MapCluster` из `src/map/cluster.ts`.
- Даёт: `<ClusterLens cluster open label? mark onOpen? onClose? children />`. Знак рисует не она, а слой: род знака — дело слоя.

- [ ] **Шаг 1: написать падающий тест**

`src/map/ClusterLens.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { ClusterLens } from './ClusterLens';
import type { MapCluster } from './cluster';

const cluster: MapCluster = {
  id: 'cluster:a',
  x: 100,
  y: 100,
  radius: 40,
  scale: 8,
  members: [
    { id: 'a', x: 100, y: 99, lensX: 100, lensY: 92 },
    { id: 'b', x: 100, y: 101, lensX: 100, lensY: 108 },
  ],
};

function Harness({ label }: { readonly label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <svg>
      <ClusterLens
        cluster={cluster}
        open={open}
        label={label}
        hitRadius={8.64}
        mark={<circle className="test-mark" cx={cluster.x} cy={cluster.y} r={3} />}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      >
        {cluster.members.map((member) => (
          <circle
            key={member.id}
            data-cluster-member={member.id}
            cx={member.lensX}
            cy={member.lensY}
            r={4}
            role="button"
            aria-label={member.id}
            tabIndex={0}
          />
        ))}
      </ClusterLens>
    </svg>
  );
}

it('свёрнутая гроздь называет число объектов', () => {
  render(<Harness label="Гроздь из двух городов: a, b" />);

  expect(screen.getByRole('button', { name: 'Гроздь из двух городов: a, b' })).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
});

it('раскрывается по Enter и уводит фокус внутрь', async () => {
  const user = userEvent.setup();
  render(<Harness label="Гроздь из двух городов: a, b" />);

  await user.tab();
  await user.keyboard('{Enter}');

  expect(screen.getByRole('button', { name: 'a' })).toHaveFocus();
});

it('сворачивается по Esc и возвращает фокус на гроздь', async () => {
  const user = userEvent.setup();
  render(<Harness label="Гроздь из двух городов: a, b" />);

  await user.tab();
  await user.keyboard('{Enter}');
  await user.keyboard('{Escape}');

  expect(screen.getByRole('button', { name: 'Гроздь из двух городов: a, b' })).toHaveFocus();
});

/*
 * Слой без нажатия — атлас и «назвать»: гроздь там показывает, а не отвечает.
 * Остановки Tab у неё быть не должно, иначе на карте появятся десятки узлов,
 * которые ничего не делают.
 */
it('не отвечает и не берёт фокус без подписи', async () => {
  const user = userEvent.setup();
  render(<Harness />);

  expect(screen.queryByRole('button')).not.toBeInTheDocument();

  await user.tab();

  expect(document.body).toHaveFocus();
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/ClusterLens.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "./ClusterLens"».

- [ ] **Шаг 3: написать `src/map/ClusterLens.tsx`**

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import type { MapCluster } from './cluster';

/**
 * Гроздь на карте: свёрнутая — один знак и число, раскрытая — лупа.
 *
 * Знак рисует слой и передаёт сюда: род знака — его дело, а не грозди. Здесь
 * только поведение, общее для городов и достопримечательностей.
 *
 * `label` — и подпись, и признак: пока его нет, гроздь не отвечает на нажатие
 * и не берёт фокус. То же правило, что у городов: разметка называет цель ровно
 * тогда, когда в неё можно попасть.
 */

export type ClusterLensProps = {
  readonly cluster: MapCluster;
  readonly open: boolean;
  readonly label?: string;
  /**
   * Радиус цели нажатия свёрнутой грозди. Приходит снаружи, потому что задан в
   * пикселях экрана и делится на увеличение: гроздь не знает ни того, ни
   * другого, а WCAG 2.2 (2.5.8) требует 24 px независимо от вида карты.
   */
  readonly hitRadius: number;
  /** Знак свёрнутой грозди — рисуется в её середине. */
  readonly mark: ReactNode;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  /** Содержимое раскрытой лупы: знаки на местах `lensX`, `lensY`. */
  readonly children: ReactNode;
};

/** Кружок с числом отходит от знака вверх-вправо. */
const BADGE_OFFSET = 5;
const BADGE_RADIUS = 3.6;

export function ClusterLens({
  cluster,
  open,
  label,
  hitRadius,
  mark,
  onOpen,
  onClose,
  children,
}: ClusterLensProps) {
  const hit = useRef<SVGCircleElement>(null);
  const group = useRef<SVGGElement>(null);
  /*
   * Фокус возвращается на гроздь только после Esc. При уходе по Tab гроздь
   * тоже сворачивается, но возвращать туда фокус нельзя: это заперло бы
   * ученика в грозди, из которой он как раз выходил.
   */
  const returnsFocus = useRef(false);

  useEffect(() => {
    if (open) {
      group.current
        ?.querySelector<SVGElement>('[data-cluster-member]')
        ?.focus();

      return;
    }

    if (returnsFocus.current) {
      returnsFocus.current = false;
      hit.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <g className="map-cluster" data-cluster-id={cluster.id}>
        {mark}
        <circle
          className="cluster-badge"
          cx={cluster.x + BADGE_OFFSET}
          cy={cluster.y - BADGE_OFFSET}
          r={BADGE_RADIUS}
          aria-hidden="true"
        />
        <text
          className="cluster-count"
          x={cluster.x + BADGE_OFFSET}
          y={cluster.y - BADGE_OFFSET + BADGE_RADIUS * 0.36}
          textAnchor="middle"
          aria-hidden="true"
        >
          {cluster.members.length}
        </text>
        <circle
          ref={hit}
          className="cluster-hit"
          cx={cluster.x}
          cy={cluster.y}
          r={hitRadius}
          role={label === undefined ? undefined : 'button'}
          aria-label={label}
          aria-hidden={label === undefined ? 'true' : undefined}
          tabIndex={label === undefined ? -1 : 0}
          onClick={label === undefined ? undefined : onOpen}
          onKeyDown={
            label === undefined
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen?.();
                  }
                }
          }
        />
      </g>
    );
  }

  return (
    <g
      ref={group}
      className="map-cluster"
      data-cluster-id={cluster.id}
      data-open="true"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          returnsFocus.current = true;
          onClose?.();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose?.();
        }
      }}
    >
      <circle
        className="cluster-lens"
        cx={cluster.x}
        cy={cluster.y}
        r={cluster.radius}
        aria-hidden="true"
      />
      <circle
        className="cluster-anchor"
        cx={cluster.x}
        cy={cluster.y}
        r={1}
        aria-hidden="true"
      />
      {children}
    </g>
  );
}
```

- [ ] **Шаг 4: добавить правила в `src/styles.css`**

Вставить после блока `.china-map .city-hit`:

```css
/*
 * Гроздь и лупа. Свёрнутая гроздь — знак своего слоя и киноварный кружок с
 * числом; раскрытая — круг тоном яркой бумаги поверх карты и киноварный якорь
 * на настоящем месте. Длительность берётся из токенов: там же она обнуляется
 * при `prefers-reduced-motion`, и второго правила для этого не нужно.
 */
.china-map .cluster-hit {
  fill: transparent;
}

.china-map .cluster-badge {
  fill: var(--accent);
  stroke: var(--surface-paper-bright);
  stroke-width: 0.8;
}

.china-map .cluster-count {
  fill: var(--map-outcome-ink);
  font-family: var(--t-family-text);
  font-size: 5px;
  font-weight: var(--t-weight-bold);
}

.china-map .cluster-lens {
  fill: var(--surface-paper-bright);
  fill-opacity: 0.93;
  stroke: var(--map-coast);
  stroke-width: 0.8;
  transition: r var(--duration-quick) ease-out;
}

.china-map .cluster-anchor {
  fill: var(--accent);
}

.china-map .cluster-hit:focus-visible {
  outline: var(--focus-width) solid var(--focus-ring);
  outline-offset: 2px;
}
```

Перед вставкой сверить имена `--focus-width` и `--focus-ring` с `src/design/tokens.css`; если они зовутся иначе, взять те, что уже используются у `.city-hit:focus-visible`.

- [ ] **Шаг 5: тесты проходят**

```bash
npx vitest run src/map/ClusterLens.test.tsx && npm run lint
```

Ожидается: 4 passed, линтер молчит.

- [ ] **Шаг 6: коммит**

```bash
git add src/map/ClusterLens.tsx src/map/ClusterLens.test.tsx src/styles.css && git commit -m "feat: разметка грозди и лупы"
```

---

### Задача 3: города переезжают на гроздь

**Файлы:**
- Изменить: `src/map/CityLayer.tsx`, `src/map/CityLayer.test.tsx`, `src/styles.css` (убрать `.city-leader`)
- Изменить: `src/map/city-hit-targets.ts` — дописать шапку о том, что разведение осталось за озёрами и точками

**Связи:**
- Берёт: `clusterPlaceables` из задачи 1, `ClusterLens` из задачи 2.
- Даёт: у `CityLayer` те же свойства, что были; поводков и отъехавших целей больше нет.

- [ ] **Шаг 1: дописать тест в `src/map/CityLayer.test.tsx`**

```tsx
/*
 * Дельта Янцзы — самая тесная часть каталога: между Шанхаем и Сучжоу пять
 * единиц карты при цели в семнадцать. Прежде цели разъезжались по кольцам и
 * связывались поводками; теперь города собираются в гроздь.
 */
it('собирает тесные города в гроздь вместо поводков', () => {
  const { container } = render(
    <svg>
      <CityLayer onSelect={() => {}} />
    </svg>,
  );

  expect(container.querySelector('.city-leader')).toBeNull();
  expect(container.querySelectorAll('.map-cluster').length).toBeGreaterThan(0);
});

it('раскрывает гроздь городов и отдаёт нажатие городу внутри', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(
    <svg>
      <CityLayer onSelect={onSelect} />
    </svg>,
  );

  await user.click(screen.getByRole('button', { name: /Гроздь из/ }));
  await user.click(screen.getByRole('button', { name: /Шанхай/ }));

  expect(onSelect).toHaveBeenCalledWith('shanghai');
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/CityLayer.test.tsx
```

Ожидается: FAIL — `.city-leader` в разметке есть, грозди нет.

- [ ] **Шаг 3: переписать тело `CityLayer`**

Заменить вычисление `targets` и возвращаемую разметку:

```tsx
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      clusterPlaceables(
        points.map((point) => ({ id: point.city.id, x: point.x, y: point.y })),
        TARGET_DIAMETER_UNITS / zoom,
      ),
    [points, zoom],
  );
```

Знак города вынести в местную функцию, чтобы одна и та же разметка рисовалась и у одиночки, и внутри лупы:

```tsx
  function cityMark(cityId: string, x: number, y: number, inLens: boolean) {
    const city = cityById.get(cityId) as City;
    const onEasternHalf = x > MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH * 0.75;
    const label = `${city.nameRu}, ${city.nameZh}`;

    return (
      <g
        key={city.id}
        className="city"
        data-city-id={city.id}
        data-city-set={city.set}
        data-selected={city.id === selectedCityId}
      >
        <circle className="city-mark" cx={x} cy={y} r={MARK_RADIUS} aria-hidden="true" />
        <circle
          className="city-halo"
          cx={x}
          cy={y}
          r={MARK_RADIUS * 3.5}
          fill="none"
          stroke="none"
          aria-hidden="true"
        />
        <text
          className="city-label"
          x={x + (onEasternHalf ? -LABEL_OFFSET : LABEL_OFFSET)}
          y={y}
          textAnchor={onEasternHalf ? 'end' : 'start'}
          aria-hidden="true"
        >
          {city.nameRu}
        </text>
        <circle
          className="city-hit"
          cx={x}
          cy={y}
          r={TARGET_DIAMETER_UNITS / zoom / 2}
          data-city-id={city.id}
          data-cluster-member={inLens ? city.id : undefined}
          role={onSelect ? 'button' : undefined}
          aria-label={onSelect ? label : undefined}
          aria-hidden={onSelect ? undefined : 'true'}
          tabIndex={onSelect ? 0 : -1}
          onClick={onSelect ? () => onSelect(city.id) : undefined}
          onKeyDown={
            onSelect
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(city.id);
                  }
                }
              : undefined
          }
        />
      </g>
    );
  }
```

Разметка слоя:

```tsx
    <g className="city-layer" data-interactive={onSelect !== undefined} data-labels={showsLabels}>
      {layout.singles.map((single) => cityMark(single.id, single.x, single.y, false))}
      {layout.clusters.map((cluster) => {
        const names = cluster.members
          .map((member) => (cityById.get(member.id) as City).nameRu)
          .join(', ');

        return (
          <ClusterLens
            key={cluster.id}
            cluster={cluster}
            open={openClusterId === cluster.id}
            hitRadius={TARGET_DIAMETER_UNITS / zoom / 2}
            label={onSelect ? `Гроздь из ${cluster.members.length} городов: ${names}` : undefined}
            mark={
              <circle
                className="city-mark"
                cx={cluster.x}
                cy={cluster.y}
                r={MARK_RADIUS}
                aria-hidden="true"
              />
            }
            onOpen={() => setOpenClusterId(cluster.id)}
            onClose={() => setOpenClusterId(null)}
          >
            {cluster.members.map((member) => cityMark(member.id, member.lensX, member.lensY, true))}
          </ClusterLens>
        );
      })}
    </g>
```

Дописать импорты: `useState`, `clusterPlaceables`, `ClusterLens`.

- [ ] **Шаг 4: убрать поводок из стилей**

Удалить правило `.china-map .city-leader` из `src/styles.css` — рисовать его больше нечему.

- [ ] **Шаг 5: дописать шапку `city-hit-targets.ts`**

Добавить абзац: разведение осталось за озёрами и крайними точками (`lake-marks.ts`, `point-marks.ts`), где объекты не сталкиваются; города и достопримечательности перешли на гроздь.

- [ ] **Шаг 6: закрепить, что озёра и точки остались без гроздей**

Дописать в `src/map/lake-marks.test.ts` и `src/map/point-marks.test.ts`:

```ts
/*
 * Разведение целей осталось здесь намеренно: шесть озёр и две крайние точки
 * друг с другом не спорят, и гроздь им не нужна. Проверка стоит на случай,
 * когда каталог пополнят и объекты вдруг окажутся рядом.
 */
it('гроздей не образует', () => {
  expect(
    clusterPlaceables(
      lakeMarks(1).map((mark) => ({ id: mark.featureId, x: mark.x, y: mark.y })),
    ).clusters,
  ).toEqual([]);
});
```

- [ ] **Шаг 7: прогнать весь набор**

```bash
npm test; echo $?
```

Ожидается: 0. Если падают старые проверки `CityRound` или `App`, разобраться, что именно они утверждали о поводке, и переписать утверждение, а не отключить тест.

- [ ] **Шаг 8: проверить в браузере**

Поднять `npm run dev`, открыть «Найти город», выбрать набор со значимыми городами, найти дельту Янцзы: гроздь раскрывается нажатием и с клавиатуры, Esc возвращает фокус, ответ засчитывается по городу внутри.

- [ ] **Шаг 9: коммит**

```bash
git add src/map src/styles.css && git commit -m "feat: города переезжают на гроздь"
```

---

### Задача 4: справочник достопримечательностей и первые тринадцать

**Файлы:**
- Создать: `src/content/landmarks.ts`, `src/content/landmarks.test.ts`
- Изменить: `src/content/sources.ts`, `docs/sources/sources.md`
- Создать: `docs/sources/landmarks.md`

**Связи:**
- Даёт: тип `Landmark`, `LandmarkKind`, массив `landmarks`, `landmarkById(id)`.

Первые тринадцать — север и Шёлковый путь. Среди них три пекинских: они дают гроздь, на которой лупа проверяется настоящими данными, а не выдуманными.

Запретный город, Храм Неба, Летний дворец, Чэндэ, Мукденский дворец, Когурё, Шанду, Юньган, Пинъяо, гробницы Западной Ся, Могао, Гаочан, Потала.

- [ ] **Шаг 1: написать падающий тест**

`src/content/landmarks.test.ts`:

```ts
import { expect, it } from 'vitest';
import { landmarks } from './landmarks';
import { regions } from './regions';
import { sources } from './sources';

it('у каждой записи есть регион из справочника', () => {
  const known = new Set(regions.map((region) => region.id));

  for (const landmark of landmarks) {
    expect(known.has(landmark.regionId), `${landmark.id}: неизвестный регион`).toBe(true);
  }
});

it('у каждой записи есть источник и хотя бы один факт', () => {
  const known = new Set(sources.map((source) => source.id));

  for (const landmark of landmarks) {
    expect(landmark.sourceIds.length, `${landmark.id}: нет источника`).toBeGreaterThan(0);
    expect(landmark.facts.length, `${landmark.id}: нет фактов`).toBeGreaterThan(0);

    for (const id of [...landmark.sourceIds, ...landmark.facts.flatMap((fact) => fact.sourceIds)]) {
      expect(known.has(id), `${landmark.id}: источник ${id} не в реестре`).toBe(true);
    }
  }
});

it('идентификаторы и китайские названия не повторяются', () => {
  expect(new Set(landmarks.map((one) => one.id)).size).toBe(landmarks.length);
  expect(new Set(landmarks.map((one) => one.nameZh)).size).toBe(landmarks.length);
});

it('координаты лежат в пределах страны', () => {
  for (const landmark of landmarks) {
    expect(landmark.lon, landmark.id).toBeGreaterThan(73);
    expect(landmark.lon, landmark.id).toBeLessThan(135);
    expect(landmark.lat, landmark.id).toBeGreaterThan(18);
    expect(landmark.lat, landmark.id).toBeLessThan(54);
  }
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/content/landmarks.test.ts
```

Ожидается: FAIL, «Failed to resolve import "./landmarks"».

- [ ] **Шаг 3: собрать содержание в браузере**

Для каждой из тринадцати записей открыть страницу объекта на `whc.unesco.org` и статью «Британники» (`WebFetch` от них получает 403 — только браузер), выписать: русское и китайское написание, пиньинь, координаты из Викиданных, один факт с числом или датой, который на странице **действительно есть**. Если числа на странице нет — переписать факт под то, что там есть; выдумывать «крупнейшее из них» нельзя (полевой урок Чаоху, `docs/sources/physical.md`).

Записать ход поиска в `docs/sources/landmarks.md`: что искали, что нашли, где источника не оказалось.

- [ ] **Шаг 4: пополнить реестр источников**

В `src/content/sources.ts` — по записи на объект плюс одна на выгрузку координат:

```ts
  {
    id: 'wikidata-landmarks-2026-08-28',
    title: 'Координаты достопримечательностей',
    organization: 'Wikidata',
    shortLabel: 'Викиданные',
    url: 'https://www.wikidata.org/',
    accessedAt: '2026-08-28',
    covers: ['координаты достопримечательностей'],
  },
  {
    id: 'unesco-imperial-palaces',
    title: 'Imperial Palaces of the Ming and Qing Dynasties in Beijing and Shenyang',
    organization: 'UNESCO World Heritage Centre',
    shortLabel: 'ЮНЕСКО',
    url: 'https://whc.unesco.org/en/list/439/',
    accessedAt: '2026-08-28',
    covers: ['Запретный город', 'Мукденский дворец'],
  },
```

То же добавить в `docs/sources/sources.md` — реестр и документ обязаны совпадать, это проверяет `sources.test.ts`.

- [ ] **Шаг 5: написать `src/content/landmarks.ts`**

Шапка объясняет устройство, дальше — построитель и записи:

```ts
import type { Fact } from './types';

export type LandmarkKind = 'monument' | 'nature' | 'modern';

export type Landmark = {
  readonly id: string;
  readonly regionId: string;
  readonly kind: LandmarkKind;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /** Градусы, как у городов: проекцию применяет слой, а не каталог. */
  readonly lon: number;
  readonly lat: number;
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};

function landmark(
  id: string,
  regionId: string,
  kind: LandmarkKind,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  lon: number,
  lat: number,
  facts: readonly Fact[],
  sourceIds: readonly string[],
): Landmark {
  return { id, regionId, kind, nameRu, nameZh, pinyin, lon, lat, facts, sourceIds };
}
```

Форма записи (числа и заголовок факта — с открытой страницы источника, не отсюда):

```ts
  landmark(
    'forbidden-city',
    'beijing',
    'monument',
    'Запретный город',
    '故宫',
    'Gùgōng',
    116.397, 39.917,
    [
      {
        title: 'Дворец двух династий',
        body: '…одно предложение с числом или датой со страницы источника…',
        sourceIds: ['unesco-imperial-palaces'],
      },
    ],
    ['wikidata-landmarks-2026-08-28', 'unesco-imperial-palaces'],
  ),
```

- [ ] **Шаг 6: тесты и сборка**

```bash
npx vitest run src/content/landmarks.test.ts && npm run generate:fonts && npm run build; echo $?
```

Ожидается: 0. `generate:fonts` обязателен: тринадцать записей приносят десятки новых иероглифов, и без пересборки подмножеств `validate:fonts` уронит сборку.

- [ ] **Шаг 7: коммит**

```bash
git add src/content docs/sources src/assets/fonts scripts/font-coverage.json && git commit -m "content: справочник достопримечательностей, север и Шёлковый путь"
```

---

### Задача 5: слой звёзд

**Файлы:**
- Создать: `src/map/landmark-points.ts`, `src/map/LandmarkLayer.tsx`, `src/map/LandmarkLayer.test.tsx`
- Изменить: `src/styles.css`, `src/map/ChinaMap.tsx`

**Связи:**
- Берёт: `landmarks`, `projectLonLat`, `clusterPlaceables`, `ClusterLens`.
- Даёт: `LANDMARK_POINTS`, `landmarkPointsOf(ids)`, компонент `<LandmarkLayer points? selectedLandmarkId? onSelect? showsLabels? zoom? />`; у `ChinaMap` — свойства `showsLandmarks`, `selectedLandmarkId`, `onSelectLandmark`, `showsLandmarkLabels`.

- [ ] **Шаг 1: написать падающий тест**

`src/map/LandmarkLayer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { LandmarkLayer } from './LandmarkLayer';
import { LANDMARK_POINTS } from './landmark-points';

it('рисует звезду каждой достопримечательности вне гроздей', () => {
  const { container } = render(
    <svg>
      <LandmarkLayer points={LANDMARK_POINTS.slice(0, 1)} />
    </svg>,
  );

  expect(container.querySelectorAll('.landmark-mark')).toHaveLength(1);
});

it('отдаёт нажатие своей достопримечательности', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const point = LANDMARK_POINTS[0];

  render(
    <svg>
      <LandmarkLayer points={[point]} onSelect={onSelect} />
    </svg>,
  );

  await user.click(screen.getByRole('button', { name: new RegExp(point.landmark.nameRu) }));

  expect(onSelect).toHaveBeenCalledWith(point.landmark.id);
});

/* Три пекинских объекта стоят в полутора единицах друг от друга. */
it('собирает пекинские объекты в гроздь', () => {
  const { container } = render(
    <svg>
      <LandmarkLayer points={LANDMARK_POINTS} />
    </svg>,
  );

  expect(container.querySelectorAll('.map-cluster').length).toBeGreaterThan(0);
});

it('без нажатия не даёт ни ролей, ни остановок Tab', () => {
  render(
    <svg>
      <LandmarkLayer points={LANDMARK_POINTS} />
    </svg>,
  );

  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/LandmarkLayer.test.tsx
```

Ожидается: FAIL, «Failed to resolve import "./LandmarkLayer"».

- [ ] **Шаг 3: написать `src/map/landmark-points.ts`**

```ts
import { landmarks } from '../content/landmarks';
import type { Landmark } from '../content/landmarks';
import { projectLonLat } from './projection';

/**
 * Каталог в координатах карты. Отдельно от слоя по той же причине, что у
 * городов: проекция — дело карты, а не разметки, и считается один раз.
 */
export type LandmarkPoint = {
  readonly landmark: Landmark;
  readonly x: number;
  readonly y: number;
};

export const LANDMARK_POINTS: readonly LandmarkPoint[] = landmarks.map((landmark) => {
  const [x, y] = projectLonLat(landmark.lon, landmark.lat);

  return { landmark, x, y };
});

export function landmarkPointsOf(ids: readonly string[]): readonly LandmarkPoint[] {
  const wanted = new Set(ids);

  return LANDMARK_POINTS.filter((point) => wanted.has(point.landmark.id));
}
```

- [ ] **Шаг 4: написать `src/map/LandmarkLayer.tsx`**

Устройство — как у `CityLayer` после задачи 3: местная функция рисует знак, слой раскладывает одиночек и грозди. Звезда:

```tsx
/** Луч звезды: 1.55 радиуса наружу, 0.65 внутрь — при 3.4 читается с 6 px. */
const MARK_RADIUS = 3.4;

function starPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 10 }, (unused, index) => {
    const reach = index % 2 === 0 ? radius * 1.55 : radius * 0.65;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;

    return `${x + reach * Math.cos(angle)},${y + reach * Math.sin(angle)}`;
  }).join(' ');
}
```

Подпись, кольцо выбора, цель нажатия и обработчики повторяют городские: `aria-label` ставится только при `onSelect`, `data-cluster-member` — только внутри лупы, подпись прячется признаком `data-labels` на слое.

- [ ] **Шаг 5: стили звезды в `src/styles.css`**

```css
/*
 * Звезда достопримечательности. Форма, а не цвет: цвет на этой карте занят
 * заливкой региона, и различать ею род объекта нельзя.
 */
.china-map .landmark-mark {
  fill: var(--map-label);
  stroke: var(--map-sea);
  stroke-width: 1;
}

.china-map .landmark[data-selected='true'] .landmark-mark {
  fill: var(--accent);
  stroke: var(--surface-paper-bright);
  stroke-width: 2;
}

.china-map .landmark-hit {
  fill: transparent;
}

.china-map .landmark-label {
  fill: var(--map-label);
  font-family: var(--t-family-text);
  font-size: var(--map-label-size);
  font-weight: var(--t-weight-bold);
  opacity: 0;
  paint-order: stroke;
  stroke: var(--surface-paper-bright);
  stroke-width: 3;
}

.china-map .landmark:hover .landmark-label,
.china-map .landmark:focus-within .landmark-label,
.china-map .landmark[data-selected='true'] .landmark-label {
  opacity: 1;
}

.china-map .landmark-layer[data-labels='false'] .landmark-label {
  display: none;
}
```

- [ ] **Шаг 6: подключить слой к `ChinaMap`**

Рядом с `<CityLayer>` добавить `<LandmarkLayer>` под теми же условиями: рисуется, когда `showsLandmarks`; свойства прокидываются из новых полей `ChinaMapProps`. По умолчанию `showsLandmarks` — ложь: в атласе звёзд нет.

- [ ] **Шаг 7: тесты и сборка**

```bash
npx vitest run src/map && npm run build; echo $?
```

Ожидается: 0.

- [ ] **Шаг 8: коммит**

```bash
git add src/map src/styles.css && git commit -m "feat: слой достопримечательностей"
```

---

### Задача 6: проверки карты

**Файлы:**
- Изменить: `src/map/validate-map.ts`, `src/map/validate-map.test.ts`

**Связи:**
- Берёт: `LANDMARK_POINTS`, `clusterPlaceables`, `MAX_LENS_RADIUS_UNITS`, готовую проверку принадлежности точки региону (та, что меряет города, с допуском на кромке).

- [ ] **Шаг 1: написать падающий тест**

```ts
it('каждая звезда лежит в своём регионе', () => {
  expect(landmarkPlacementProblems()).toEqual([]);
});

it('ни одна лупа не выходит за предел', () => {
  expect(oversizedLenses()).toEqual([]);
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/map/validate-map.test.ts
```

Ожидается: FAIL — функций нет.

- [ ] **Шаг 3: дописать проверки в `validate-map.ts`**

`landmarkPlacementProblems()` повторяет городскую проверку: точка внутри контура заявленного региона, допуск на кромке тот же (`CITY_BOUNDARY_TOLERANCE`), сообщение называет объект и регион.

`oversizedLenses()` считает грозди обоих каталогов на увеличении 1 и возвращает те, у кого `radius > MAX_LENS_RADIUS_UNITS`, с именем грозди и её радиусом.

- [ ] **Шаг 4: тесты проходят**

```bash
npm run validate:map && npx vitest run src/map/validate-map.test.ts
```

Ожидается: обе команды кодом 0; вывод `validate:map` печатает число проверенных звёзд.

- [ ] **Шаг 5: коммит**

```bash
git add src/map && git commit -m "feat: проверка звёзд и предела лупы"
```

---

### Задача 7: наборы и отвлекающие

**Файлы:**
- Создать: `src/content/landmark-sets.ts`, `src/content/landmark-sets.test.ts`
- Создать: `src/domain/landmark-choices.ts`, `src/domain/landmark-choices.test.ts`

**Связи:**
- Даёт: `LandmarkSet`, `LANDMARK_SETS`, `landmarksUpTo(set)`; `landmarkChoices(target, pool, random)` — четыре варианта, где отвлекающие того же рода.

- [ ] **Шаг 1: написать падающие тесты**

```ts
it('наборы вложены: каждый следующий включает предыдущий', () => {
  const monuments = landmarksUpTo('monuments');
  const nature = landmarksUpTo('nature');

  expect(nature.slice(0, monuments.length)).toEqual(monuments);
  expect(landmarksUpTo('all').length).toBe(landmarks.length);
});

it('отвлекают объекты того же рода', () => {
  const target = landmarks.find((one) => one.kind === 'nature')!;
  const choices = landmarkChoices(target, landmarks, createSeededRandom(1));

  expect(choices).toHaveLength(4);
  expect(choices.every((choice) => choice.kind === 'nature')).toBe(true);
  expect(choices).toContain(target);
});
```

- [ ] **Шаг 2: убедиться, что тесты падают**

```bash
npx vitest run src/content/landmark-sets.test.ts src/domain/landmark-choices.test.ts
```

Ожидается: FAIL — модулей нет.

- [ ] **Шаг 3: написать модули**

`landmark-sets.ts` повторяет устройство `culture-sets.ts`: три вложенных набора по роду, порядок — памятники, природа, современное.

`landmark-choices.ts` повторяет `physical-choices.ts`: цель плюс три отвлекающих того же рода, перемешивание — переданным генератором, никакого `Math.random`. Если объектов того же рода меньше четырёх, добор идёт из соседних родов — и это записано комментарием, потому что «современных» всего четыре.

- [ ] **Шаг 4: тесты проходят и коммит**

```bash
npx vitest run src/content/landmark-sets.test.ts src/domain/landmark-choices.test.ts && git add src/content src/domain && git commit -m "feat: наборы и отвлекающие достопримечательностей"
```

---

### Задача 8: раунд и главная

**Файлы:**
- Создать: `src/features/exercise/LandmarkRound.tsx`, `src/features/exercise/LandmarkRound.test.tsx`
- Изменить: `src/features/exercise/exercise-modes.ts`, `src/App.tsx`, `src/App.test.tsx`

**Связи:**
- Берёт: `landmarksUpTo`, `landmarkChoices`, `LandmarkLayer` через `ChinaMap`, обвязку `RoundStage`.
- Даёт: три карточки в группе `landmarks`, вид раунда `'landmark'` в `App.tsx`.

- [ ] **Шаг 1: дописать группу и карточки в `exercise-modes.ts`**

К `ModeGroupId` добавить `'landmarks'`, в `MODE_GROUPS` — запись с подписью «набор выбирается перед стартом». В `ModeCard` — ветвь `{ kind: 'landmark'; exerciseType: ExerciseType }`. Три карточки со знаками 胜, 塔 и 迹.

- [ ] **Шаг 2: написать падающий тест раунда**

Свойства — те же, что у `CityRound`: список целей приходит снаружи, набор
выбирает `App.tsx`.

```tsx
function renderRound(overrides: Partial<LandmarkRoundProps> = {}) {
  return render(
    <LandmarkRound
      landmarks={landmarksUpTo('monuments')}
      exerciseType="find-on-map"
      language="ru"
      roundId="test"
      seed={1}
      onFinish={() => {}}
      onExit={() => {}}
      {...overrides}
    />,
  );
}

it('засчитывает верную звезду и идёт к следующему вопросу', async () => {
  const user = userEvent.setup();
  renderRound();

  const asked = screen.getByRole('heading', { level: 2 }).textContent as string;
  await user.click(screen.getByRole('button', { name: new RegExp(asked) }));

  expect(await screen.findByText(/Верно/)).toBeInTheDocument();
});

/*
 * Нажатие по свёрнутой грозди — раскрытие, а не попытка: иначе ученик терял бы
 * ответ на том, что три пекинских объекта не помещаются в один пиксель.
 */
it('не считает попыткой нажатие по грозди', async () => {
  const user = userEvent.setup();
  const onFinish = vi.fn();
  renderRound({ onFinish });

  await user.click(screen.getByRole('button', { name: /Гроздь из/ }));

  expect(screen.queryByText(/Неверно/)).not.toBeInTheDocument();
});
```

- [ ] **Шаг 3: убедиться, что тест падает**

```bash
npx vitest run src/features/exercise/LandmarkRound.test.tsx
```

Ожидается: FAIL — модуля нет.

- [ ] **Шаг 4: написать `LandmarkRound`**

Копия устройства `CityRound` с тремя отличиями: цели берутся из `landmarksUpTo`, карта зовётся с чистыми настройками (`showsCities={false}`, `showsPhysical={false}`, `showsLandmarks`), а в «достопримечательность — регион» звёзды скрыты вовсе.

- [ ] **Шаг 5: подключить к `App.tsx`**

Добавить `startLandmarkRound`, вид раунда `'landmark'`, окно выбора набора перед стартом и ветку отрисовки — рядом с `startCityRound`.

- [ ] **Шаг 6: весь набор и браузер**

```bash
npm test; echo $?
```

Пройти раунд руками: «Найти достопримечательность» с набором «Памятники», в Пекине раскрыть гроздь, ответить на объект внутри, дойти до итогов.

- [ ] **Шаг 7: коммит**

```bash
git add src/features src/App.tsx src/App.test.tsx && git commit -m "feat: игры по достопримечательностям"
```

---

### Задача 9: памятники, часть вторая

**Файлы:** `src/content/landmarks.ts`, `src/content/sources.ts`, `docs/sources/sources.md`, `docs/sources/landmarks.md`

Тринадцать записей: терракотовая армия, Лунмэнь, Шаолинь, Цюйфу, сады Сучжоу, Западное озеро, тулоу, исторический центр Макао, Дацзу, Дуцзянъянь, Лэшаньский Будда, террасы хани, Лицзян.

- [ ] **Шаг 1: собрать содержание в браузере** — тем же порядком, что в задаче 4: страница ЮНЕСКО и статья «Британники» на объект, координаты из Викиданных, факт только из того, что на странице есть.
- [ ] **Шаг 2: пополнить реестр источников и `docs/sources/sources.md`.**
- [ ] **Шаг 3: дописать записи в `landmarks.ts`.**
- [ ] **Шаг 4: пересобрать шрифты и проверить**

```bash
npm run generate:fonts && npm run build; echo $?
```

Ожидается: 0. `validate:map` при этом проверит, что новые звёзды попали в свои регионы, а грозди Лунмэнь—Шаолинь и Тайшань—Цюйфу не вышли за предел лупы.

- [ ] **Шаг 5: коммит**

```bash
git add src/content docs/sources src/assets/fonts scripts/font-coverage.json && git commit -m "content: памятники востока, юга и запада"
```

---

### Задача 10: природные места

**Файлы:** те же, что в задаче 9.

Восемь записей: Тайшань, Хуаншань, Лушань, Улинъюань, карст Гуйлиня, Фаньцзиншань, Цзючжайгоу, Кукушили.

- [ ] **Шаг 1: собрать содержание в браузере.** У природных объектов проверить отдельно: не совпадает ли объект с уже спрашиваемым на физической карте. Совпадений быть не должно — там хребты и котловины, здесь виды; если совпадение найдётся, объект в каталог не идёт, и это записывается в `docs/sources/landmarks.md`.
- [ ] **Шаг 2: реестр источников и документ.**
- [ ] **Шаг 3: записи с `kind: 'nature'`.**
- [ ] **Шаг 4: `npm run generate:fonts && npm run build; echo $?` — ожидается 0.**
- [ ] **Шаг 5: коммит** — `content: природные достопримечательности`.

---

### Задача 11: современное

**Файлы:** те же.

Четыре записи: Бунд с Шанхайской башней, плотина «Три ущелья», гавань Виктория, мост Гонконг—Чжухай—Макао.

- [ ] **Шаг 1: собрать содержание.** Объектов Всемирного наследия здесь нет — источником служит «Британника»; где статьи нет, объект в каталог не идёт. Ссылка, которую нельзя открыть и прочитать глазами, источником не считается (полевой урок Хэсийского коридора).
- [ ] **Шаг 2: реестр и документ.**
- [ ] **Шаг 3: записи с `kind: 'modern'`.**
- [ ] **Шаг 4: `npm run generate:fonts && npm run build; echo $?` — ожидается 0.**
- [ ] **Шаг 5: коммит** — `content: современные достопримечательности`.

---

### Задача 12: страницы и правило «один предмет — одна страница»

**Файлы:**
- Изменить: `src/content/collections.ts`, `src/content/collections.test.ts`, `src/content/culture-sets.ts`, `src/content/culture-sets.test.ts`, `src/domain/validate-catalog.ts`

**Связи:**
- Даёт: `Collection.aboutLandmarkId`, страницы `landmark-<id>`, новый род отвлекающих в «Узнать по фотографии», проверку на двойников.

- [ ] **Шаг 1: написать падающий тест**

```ts
/*
 * Дефект 2026-08-28: страниц о Такла-Макане было две — написанная руками и
 * порождённая из объекта физической карты. Обе со снимком, обе в наборе «И
 * регионы»: ученик получал два вопроса об одной пустыне.
 */
it('об одном предмете не бывает двух страниц', () => {
  const byChinese = new Map<string, string[]>();

  for (const collection of collections) {
    byChinese.set(collection.nameZh, [...(byChinese.get(collection.nameZh) ?? []), collection.id]);
  }

  const doubled = [...byChinese.entries()].filter(([, ids]) => ids.length > 1);

  expect(doubled).toEqual([]);
});

it('у страницы один предмет', () => {
  for (const collection of collections) {
    const about = [collection.aboutRegionId, collection.aboutFeatureId, collection.aboutLandmarkId];

    expect(about.filter((one) => one !== undefined).length, collection.id).toBeLessThan(2);
  }
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

```bash
npx vitest run src/content/collections.test.ts
```

Ожидается: FAIL — два `塔克拉玛干`.

- [ ] **Шаг 3: слить двойника Такла-Макана**

Перенести вводку, заметки, источники и снимок рукописной записи `taklamakan` в `FEATURE_COLLECTION_EXTRAS` ключом `taklamakan`; рукописную запись удалить. Ничего из написанного текста не терять.

- [ ] **Шаг 4: перевести терракотовую армию и террасы Юаньян в каталог**

Рукописные записи `terracotta-army` и `yuanyang-terraces` удалить; их вводки, заметки и снимки перенести в дописки достопримечательностей (`LANDMARK_COLLECTION_EXTRAS`, устроенные как `FEATURE_COLLECTION_EXTRAS`). Проверить `relatedIds` у соседей: `silk-road` ссылается на `taklamakan`, ссылки обязаны продолжать работать.

- [ ] **Шаг 5: добавить поле в тип `Collection`**

Рядом с `aboutRegionId` и `aboutFeatureId` — `aboutLandmarkId?: string`, с
комментарием: у страницы один предмет, и три поля вместе не ставятся. Проверку
на это уже пишет тест из шага 1.

- [ ] **Шаг 6: порождать страницы достопримечательностей**

`landmarkCollection(landmark)` по образцу `featureCollection`: `id: landmark-<id>`, группа `geography`, `aboutLandmarkId`, род — слово по `kind` («памятник», «природное место», «сооружение»).

- [ ] **Шаг 7: добавить род в «Узнать по фотографии»**

В `culture-sets.ts` завести `LANDMARKS` рядом с `CULTURE`, `NATURE` и `REGIONS`; `sameKindAs` для страницы с `aboutLandmarkId` возвращает `LANDMARKS`.

- [ ] **Шаг 8: тесты и сборка**

```bash
npm test; echo $?
npm run build; echo $?
```

Ожидается: 0 и 0.

- [ ] **Шаг 9: коммит**

```bash
git add src/content src/domain && git commit -m "fix: один предмет — одна страница"
```

---

### Задача 13: снимки и шрифты

**Файлы:**
- Изменить: `scripts/data/collection-photos.json`, `src/content/photo-credits.ts`, `docs/sources/photos.md`, `public/photos`

- [ ] **Шаг 1: подобрать снимки.** По одному на объект, файл с Викисклада; для каждого проверить, что на кадре именно этот объект, а не соседний.
- [ ] **Шаг 2: дописать слоты в `collection-photos.json`** — ключ слота, значение `File:…`.
- [ ] **Шаг 3: скачать и записать лицензии**

```bash
npm run fetch:photos
```

Лицензия, автор и ссылка берутся из API самим генератором — руками их не писать.

- [ ] **Шаг 4: подписи к снимкам** — `subject`, `captionRu`, `captionZh`, `place` в дописках коллекций.
- [ ] **Шаг 5: шрифты и сборка**

```bash
npm run generate:fonts && npm run build; echo $?
```

Ожидается: 0.

- [ ] **Шаг 6: коммит** — `content: снимки достопримечательностей`.

---

### Задача 14: документы

**Файлы:** `CHANGELOG.md`, `DECISIONS.md`, `MVP.md`, `ROADMAP.md`, `README.md`

- [ ] **Шаг 1: `DECISIONS.md`** — четыре записи от 2026-08-28: широкая граница предмета и внешний отбор по Всемирному наследию; объём 38 ради покрытия регионов; гроздь-лупа вместо разведения целей, с доводом про взаимное расположение и с числами предела; правило «один предмет — одна страница» и починенный двойник Такла-Макана.
- [ ] **Шаг 2: `CHANGELOG.md`** — что появилось у ученика: три игры, 38 объектов, чистая карта в раундах, гроздь у городов вместо поводков.
- [ ] **Шаг 3: `MVP.md`** — в пункт 3 дописать три игры по достопримечательностям, в пункт 4 — третий каталог целей.
- [ ] **Шаг 4: `ROADMAP.md`** — снять из этапа 2 задачу про нажатие по маркеру выноски, если гроздь её закрыла; если не закрыла — записать, чем именно отличается.
- [ ] **Шаг 5: полная проверка**

```bash
npm run lint && npm test && npm run build; echo $?
```

Ожидается: 0.

- [ ] **Шаг 6: коммит** — `docs: достопримечательности в журнале и решениях`.

---

## Порядок и точки остановки

Задачи 1–3 дают работающую гроздь на готовом каталоге городов: после них имеет смысл остановиться и проверить руками, что городские раунды не сломались. Задачи 4–8 дают играбельный режим на тринадцати объектах. Задачи 9–11 — только содержание, каждая оставляет сборку зелёной. Задачи 12–14 закрывают страницы, снимки и документы.

Останавливаться и спрашивать, а не гадать, если: источник не подтверждает факт; объект природной группы совпал с уже спрашиваемым на физической карте; радиус лупы вышел за предел; тест городских раундов упал по причине, которую не удаётся объяснить одним предложением.
