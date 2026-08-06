# Физическая карта: две игры и карточки на главной — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать играть по физической географии: третий вид цели, две игры на двенадцать объектов, карточки на главной — и довести физическую карту до поверхности ответа.

**Architecture:** Третье значение `TargetKind` не требует миграции: `Target` уже носит вид в себе, а освоенность и повторение уже фильтруют по виду. Шесть форм-целей становятся узлами нажатия в том же `PhysicalLayer`, который их рисует; тридцать две декоративные остаются фоном. Экран раунда — отдельный `PhysicalRound` рядом с `CityRound`, по той же причине, по которой города не свели с регионами: другой ответ, другие отвлекающие, свои состояния карты.

**Tech Stack:** TypeScript, React, Vite, Vitest. Новых зависимостей нет.

**Область.** Это **шаг 3 из трёх** в `docs/superpowers/specs/2026-08-05-physical-map-design.md` — последний. Шаги 1 и 2 сделаны: справочник, геометрия, валидаторы, вид карты `physical`, переключатель в атласе, нажатие по реке расстоянием. После этого плана спек закрыт целиком.

**Решения владельца продукта, принятые для этого плана.**

- Иероглифы-метки: **山** — «Найти на физической карте», **河** — «Назвать объект» (2026-08-06). Оба знака уже есть в подмножестве шрифта (пришли из 山西省, 山东省 и 黄河), `npm run generate:fonts` не нужен.
- Имена всех двенадцати объектов сверены и записаны в шаге 1; открытые вопросы 2 и 3 спека закрыты там же.

**Осознанное отступление от спека.** Спек (§5) требует подписей «у одной цели за раз, при наведении, фокусе и выборе, как у городов». Довод там — полсотни городов, чьи подписи не помещаются одновременно. Целей двенадцать, и подписи рек, поставленные шагом 2 постоянными, читаются: это проверено на 1440×900. Поэтому подписи остаются постоянными в атласе и скрываются целиком в играх (`showsLabels={false}`), как спек и требует для игр. Отступление фиксируется в `DECISIONS.md` задачей 4.

## Global Constraints

- Интерфейс, задания, подписи и ошибки — на русском; китайские названия в Unicode, не только пиньинем.
- Смысл не несёт один только цвет: цветовой канал физической карты занят тремя ступенями, поэтому исход ответа у формы помечается штриховкой, у реки — толщиной и штрихом линии (`MAP_SPEC.md`, `DESIGN_SYSTEM.md`, спек §5).
- Цвета, размеры и длительности берутся только из `src/design/tokens.css`; компоненты не пишут значения напрямую.
- Отвлекающие — того же вида: реку отвлекают реками, форму — формами (спек §6). Четыре варианта из шести — это предел набора, и он достаточен.
- Раунд один на двенадцать целей, реки и формы вперемешку (спек §6).
- Домен не вызывает `Math.random`: генератор передаётся снаружи (`createSeededRandom`, mulberry32). Сид создаётся в `App.tsx`.
- Компоненты не трогают `localStorage` — только через `createProgressStore`.
- Миграции прогресса нет: прогресс, записанный до изменения, читается как есть.
- Карта доступна с клавиатуры: `Tab`, `Enter`, `Space`, видимый фокус. На узком экране ответ даётся равнозначным списком.
- Во время раунда сетевых запросов нет.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. Каждая задача заканчивается коммитом. Ветка — `feat/physical-map-games` (уже создана).

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/domain/round.ts` | третье значение `TargetKind`, `physicalTarget` |
| `src/content/region-count.ts` | счётное слово «объект / объекта / объектов» |
| `src/domain/physical-choices.ts` | **новый**: четыре имени того же вида |
| `scripts/generate-physical-geometry.ts` | точка подписи у шести форм-целей |
| `src/map/physical-geometry.ts` | **перезаписывается генератором**, руками не править |
| `src/map/PhysicalLayer.tsx` | формы-цели отвечают на нажатие и фокус; подписи форм; исход ответа |
| `src/map/ChinaMap.tsx` | разрешение нажатия по форме узлом, проброс исходов |
| `src/map/MapDefs.tsx` | штриховки исхода для формы |
| `src/features/exercise/PhysicalRound.tsx` | **новый**: две игры одним экраном |
| `src/features/exercise/PhysicalAnswerList.tsx` | **новый**: равнозначный список из двенадцати кнопок |
| `src/features/exercise/exercise-modes.ts` | `PHYSICAL_MODES`, две карточки в `MODE_CARDS` |
| `src/App.tsx` | экран `physical-exercise`, запуск раунда, итоги |
| `src/styles.css` | исход ответа на физической карте, подпись формы |

---

### Task 1: Третий вид цели

**Files:**
- Modify: `src/domain/round.ts`
- Modify: `src/content/region-count.ts`
- Test: `src/domain/round.test.ts`
- Test: `src/domain/progress-rules.test.ts`

**Interfaces:**
- Produces: `TargetKind` со значением `'physical'`; `physicalTarget(id: string): Target`; `featuresWord(count: number): string`.

- [ ] **Step 1: Написать падающие тесты**

В конец `src/domain/round.test.ts`:

```ts
it('физическая цель не смешивается с одноимённой целью другого вида', () => {
  // `tarim` существует и как река, и как впадина `tarim-basin`; но проверять
  // надо именно то, что вид входит в ключ, а не выводится из идентификатора.
  expect(targetKey(physicalTarget('yangtze'))).toBe('physical:yangtze');
  expect(sameTarget(physicalTarget('gobi'), regionTarget('gobi'))).toBe(false);
});

it('раунд по физическим целям спрашивает каждую ровно один раз', () => {
  const targets = physicalFeatures.map((feature) => physicalTarget(feature.id));
  const round = createRound(targets, {
    roundId: 'r1',
    exerciseTypes: ['find-on-map'],
    language: 'ru',
    random: createSeededRandom(7),
  });

  expect(round.questions).toHaveLength(12);
  expect(new Set(round.questions.map((question) => question.target.id)).size).toBe(12);
});
```

Импорты в шапке того же файла дополняются: `physicalTarget` из `./round`, `physicalFeatures` из `../content/physical-features`. `createSeededRandom`, `createRound`, `targetKey`, `sameTarget`, `regionTarget` там уже есть — если какого-то нет, добавить.

В конец `src/domain/progress-rules.test.ts` (помощник `attempt` и константа `NOW` там уже объявлены, новых заводить не нужно; импорт первой строки дополняется до `import { cityTarget, physicalTarget, regionTarget, type Attempt } from './round';`):

```ts
it('не смешивает физические цели с регионами и городами', () => {
  const attempts = [
    attempt({ target: physicalTarget('yangtze'), isCorrect: false }),
    attempt({ target: regionTarget('hunan'), isCorrect: false }),
    attempt({ target: cityTarget('wuhan'), isCorrect: false }),
  ];

  expect(targetsToRepeat(attempts, NOW, 'physical')).toEqual([
    physicalTarget('yangtze'),
  ]);
  expect(targetsToRepeat(attempts, NOW, 'region')).toEqual([regionTarget('hunan')]);
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/domain/round.test.ts src/domain/progress-rules.test.ts`
Expected: FAIL — `physicalTarget` не экспортируется.

- [ ] **Step 3: Добавить вид цели**

В `src/domain/round.ts` заменить объявление `TargetKind` и добавить конструктор после `cityTarget`:

```ts
/**
 * Вид цели. Регионы, города и объекты физической географии — разные наборы:
 * «путает Ланьчжоу с Синином» не должно смешиваться ни с «не знает Ганьсу»,
 * ни с «не знает Хуанхэ», поэтому вид входит в саму цель, а не выводится из
 * идентификатора. `beijing` существует и как регион, и как город; `tarim` —
 * и как река, и как часть имени впадины.
 */
export type TargetKind = 'region' | 'city' | 'physical';
```

```ts
export function physicalTarget(id: string): Target {
  return { kind: 'physical', id };
}
```

- [ ] **Step 4: Добавить счётное слово**

В конец `src/content/region-count.ts`:

```ts
/** 1 объект, 2–4 объекта, 5+ объектов. */
export function featuresWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'объектов';
  }

  if (last === 1) {
    return 'объект';
  }

  return last >= 2 && last <= 4 ? 'объекта' : 'объектов';
}
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/domain`
Expected: PASS. Прогресс, записанный до изменения, читается без миграции — это подтверждают уже существующие тесты `progress-migration.test.ts`, они обязаны остаться зелёными без правок.

- [ ] **Step 6: Коммит**

```bash
git add src/domain/round.ts src/domain/round.test.ts src/domain/progress-rules.test.ts src/content/region-count.ts
git commit -m "feat: третий вид цели — физическая география"
```

---

### Task 2: Отвлекающие того же вида

**Files:**
- Create: `src/domain/physical-choices.ts`
- Test: `src/domain/physical-choices.test.ts`

**Interfaces:**
- Consumes: `CHOICE_COUNT` из `./choices`, `shuffle` из `./random`, `PhysicalFeature` из `../content/types`.
- Produces: `buildPhysicalChoices(features: readonly PhysicalFeature[], targetId: string, random: () => number): readonly PhysicalFeature[]`.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/physical-choices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { buildPhysicalChoices } from './physical-choices';
import { createSeededRandom } from './random';

describe('buildPhysicalChoices', () => {
  it('даёт четыре варианта, среди них правильный', () => {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'yangtze',
      createSeededRandom(1),
    );

    expect(choices).toHaveLength(4);
    expect(choices.map((choice) => choice.id)).toContain('yangtze');
  });

  it('реку отвлекает реками', () => {
    // Если к подсвеченной линии предложить «Гоби», ответ читается по форме
    // подсветки, а не по знанию: линия не может быть пустыней.
    for (const river of physicalFeatures.filter((f) => f.kind === 'river')) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        river.id,
        createSeededRandom(2),
      );

      expect(choices.every((choice) => choice.kind === 'river')).toBe(true);
    }
  });

  it('форму отвлекает формами', () => {
    for (const landform of physicalFeatures.filter((f) => f.kind === 'landform')) {
      const choices = buildPhysicalChoices(
        physicalFeatures,
        landform.id,
        createSeededRandom(3),
      );

      expect(choices.every((choice) => choice.kind === 'landform')).toBe(true);
    }
  });

  it('не повторяет вариант дважды', () => {
    const choices = buildPhysicalChoices(
      physicalFeatures,
      'gobi',
      createSeededRandom(4),
    );

    expect(new Set(choices.map((choice) => choice.id)).size).toBe(4);
  });

  it('одинаковый сид даёт одинаковый набор', () => {
    const first = buildPhysicalChoices(physicalFeatures, 'tarim', createSeededRandom(5));
    const second = buildPhysicalChoices(physicalFeatures, 'tarim', createSeededRandom(5));

    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });

  it('падает на неизвестной цели, а не молча даёт три варианта', () => {
    expect(() =>
      buildPhysicalChoices(physicalFeatures, 'himalayas', createSeededRandom(6)),
    ).toThrow(/himalayas/);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/domain/physical-choices.test.ts`
Expected: FAIL — «Failed to resolve import "./physical-choices"».

- [ ] **Step 3: Написать модуль**

Создать `src/domain/physical-choices.ts`:

```ts
import type { PhysicalFeature } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре имени к подсвеченному объекту: правильное и три отвлекающих.
 *
 * Отвлекающие берутся только того же вида — реку отвлекают реками, форму
 * формами. Иначе вопрос решается не знанием, а формой подсветки: линия не
 * может оказаться пустыней, и три из четырёх вариантов отпадают, не будучи
 * прочитанными.
 *
 * Своих ровно шесть, значит четыре варианта — предел набора, и добирать из
 * чужого вида нельзя: это и есть та самая подсказка. Отсюда и объём режима в
 * спеке: двенадцать целей, по шесть на вид.
 */
export function buildPhysicalChoices(
  features: readonly PhysicalFeature[],
  targetId: string,
  random: () => number,
): readonly PhysicalFeature[] {
  const target = features.find((feature) => feature.id === targetId);
  if (!target) {
    throw new Error(`Неизвестный объект: ${targetId}`);
  }

  const sameKind = shuffle(
    features.filter(
      (feature) => feature.kind === target.kind && feature.id !== target.id,
    ),
    random,
  );

  return shuffle([target, ...sameKind.slice(0, CHOICE_COUNT - 1)], random);
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/domain/physical-choices.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/domain/physical-choices.ts src/domain/physical-choices.test.ts
git commit -m "feat: отвлекающие физической игры того же вида"
```

---

### Task 3: Точка подписи у формы-цели

**Files:**
- Modify: `scripts/generate-physical-geometry.ts`
- Modify (генератором, не руками): `src/map/physical-geometry.ts`
- Test: `src/map/validate-map.test.ts`

**Interfaces:**
- Produces: у `ReliefShape` появляются необязательные `labelX: number` и `labelY: number` — они есть ровно у тех форм, у которых есть `featureId`.

**Почему в генераторе, а не на отрисовке.** `largestInscribedCircle` — перебор по сетке в три прохода; для региона его уже считают на сборке (`generate-region-palette.ts`), а не в браузере. У формы задача та же, и ответ тот же: считается на сборке, в файл кладётся число.

- [ ] **Step 1: Написать падающий тест**

В конец `src/map/validate-map.test.ts`:

```ts
it('у каждой формы-цели есть точка подписи, и она лежит внутри контура', () => {
  const targets = RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined);

  expect(targets).toHaveLength(6);

  for (const shape of targets) {
    expect(shape.labelX, `${shape.key}: нет labelX`).toBeTypeOf('number');
    expect(shape.labelY, `${shape.key}: нет labelY`).toBeTypeOf('number');
    expect(
      containsPoint(parseMapPath(shape.d), shape.labelX!, shape.labelY!),
      `${shape.key}: точка подписи вне контура`,
    ).toBe(true);
  }
});

it('декоративная форма точки подписи не несёт: её никто не подписывает', () => {
  for (const shape of RELIEF_SHAPES.filter((s) => s.featureId === undefined)) {
    expect(shape.labelX, `${shape.key}`).toBeUndefined();
  }
});
```

Импорты в шапке файла дополняются: `RELIEF_SHAPES` из `./physical-geometry`, `containsPoint` и `parseMapPath` из `./svg-path` — те, которых там ещё нет.

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/map/validate-map.test.ts -t 'точка подписи'`
Expected: FAIL — `labelX` не существует (ошибка типов или `undefined`).

- [ ] **Step 3: Научить генератор считать точку**

В `scripts/generate-physical-geometry.ts` добавить `largestInscribedCircle` к импорту из `../src/map/svg-path` (рядом с `toPathData` и остальными).

Там, где собирается объект формы (около строки 179, `{ key: landform.key, step: ..., featureId: ... }`), добавить точку подписи только для целей:

```ts
      key: landform.key,
      step: RELIEF_STEPS[landform.key],
      featureId: SHAPE_FEATURE_IDS[landform.key],
      label:
        SHAPE_FEATURE_IDS[landform.key] === undefined
          ? undefined
          : largestInscribedCircle(landform.rings),
```

В объявлении типа внутри шаблона модуля (около строки 212) `ReliefShape` дополняется:

```ts
export type ReliefShape = {
  /** Имя формы в наборе Natural Earth: по нему идёт сверка с разметкой. */
  readonly key: string;
  readonly step: ReliefStep;
  readonly d: string;
  /** Задан — форма не только заливает фон, но и спрашивается. */
  readonly featureId?: string;
  /**
   * Куда ставить подпись: середина наибольшей вписанной окружности. Есть
   * ровно у тех форм, у которых есть `featureId`, — декоративные не
   * подписываются. Габаритная середина не годится: у формы-подковы она
   * оказалась бы вне контура.
   */
  readonly labelX?: number;
  readonly labelY?: number;
};
```

И строка вывода формы (около строки 238) — числа округляются до сотых, как и координаты путей:

```ts
      `  { key: ${quote(shape.key)}, step: ${shape.step}, ${
        shape.featureId ? `featureId: ${quote(shape.featureId)}, ` : ''
      }${
        shape.label
          ? `labelX: ${shape.label.x.toFixed(2)}, labelY: ${shape.label.y.toFixed(2)}, `
          : ''
      }d: ${quote(toPathData(shape.rings, { closed: true }))} },`,
```

Тип промежуточного значения (тот, что собирается перед выводом) дополняется полем `label?: InscribedCircle` — `InscribedCircle` импортируется из `../src/map/svg-path` типом.

- [ ] **Step 4: Перегенерировать геометрию**

Run: `npm run generate:physical`
Expected: файл перезаписан, в выводе прежний отпечаток входов. Отпечаток считается по справочнику, разметке ступеней и выжимке — выход в него не входит, поэтому новое поле его не меняет и `validate:map` остаётся зелёным. Сети команда не требует: выжимка `scripts/data/physical-source.json` лежит в репозитории.

- [ ] **Step 5: Запустить проверки**

Run: `npm run build && npx vitest run src/map`
Expected: PASS, включая новые два теста.

- [ ] **Step 6: Коммит**

```bash
git add scripts/generate-physical-geometry.ts src/map/physical-geometry.ts src/map/validate-map.test.ts
git commit -m "feat: точка подписи у шести форм-целей"
```

---

### Task 4: Формы-цели отвечают на нажатие, фокус и подпись

**Files:**
- Modify: `src/map/PhysicalLayer.tsx`
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/styles.css`
- Modify: `DECISIONS.md`
- Test: `src/map/PhysicalLayer.test.tsx`
- Test: `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Consumes: `RELIEF_SHAPES` с `labelX`/`labelY` из задачи 3.
- Produces: у формы-цели `role="button"`, `tabIndex=0`, `aria-label`, обработчик `Enter`/`Space`; `ChinaMap` разрешает нажатие по форме узлом после того, как не нашлась река.

**Порядок разрешения нажатия.** Река идёт первой и перехватывает: она нарисована поверх формы, и это география, а не дефект — Хуанхэ идёт через Лёссовое плато (спек §5). Промах по реке при вопросе о плато честно считается промахом. Форма находится узлом `[data-feature-id]`, а не расстоянием: у неё есть контур, и вписанная окружность каждой из шести уже проверена на сборке — цель не мельче 24 px.

- [ ] **Step 1: Написать падающие тесты**

В `src/map/PhysicalLayer.test.tsx` — заменить тест «формы фона недоступны читалке экрана, а реки названы» на два и добавить остальные:

```tsx
  it('декоративные формы недоступны читалке экрана, а цели названы', () => {
    const { container } = renderLayer();

    const decorative = container.querySelectorAll('.relief-shape:not([data-feature-id])');
    const targets = container.querySelectorAll('.relief-shape[data-feature-id]');

    expect(decorative).toHaveLength(32);
    expect(targets).toHaveLength(6);
    for (const shape of decorative) {
      expect(shape).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByLabelText(/Тибетское нагорье, 青藏高原/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Янцзы, 长江/)).toBeInTheDocument();
  });

  it('без обработчика ни одна цель не получает фокус: слой только показывает', () => {
    const { container } = renderLayer();

    for (const node of container.querySelectorAll(
      '.river-line, .relief-shape[data-feature-id]',
    )) {
      expect(node).toHaveAttribute('tabindex', '-1');
    }
  });

  it('с обработчиком форма отвечает на Enter и на Space', () => {
    const onSelect = vi.fn();
    renderLayer({ onSelect });

    const shape = screen.getByLabelText(/Гоби/);
    fireEvent.keyDown(shape, { key: 'Enter' });
    fireEvent.keyDown(shape, { key: ' ' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 'gobi');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'gobi');
  });

  it('подпись есть у каждой из двенадцати целей и ни у одной декоративной', () => {
    const { container } = renderLayer();

    expect(container.querySelectorAll('.physical-label')).toHaveLength(12);
  });
```

В `src/map/ChinaMap.test.tsx` — в конец:

```tsx
it('в физическом виде нажатие по форме отвечает формой', () => {
  const onSelectFeature = vi.fn();
  const { container } = renderPhysical(onSelectFeature);

  const tibet = container.querySelector('[data-feature-id="tibetan-plateau"]')!;
  fireEvent.click(tibet, { clientX: 0, clientY: 0 });

  expect(onSelectFeature).toHaveBeenCalledWith('tibetan-plateau');
});

it('река перехватывает нажатие у формы, через которую идёт', () => {
  // Хуанхэ идёт через Лёссовое плато. Промах по реке при вопросе о плато —
  // честный промах, а не дефект: молча пропускать его значило бы подсказывать.
  const onSelectFeature = vi.fn();
  const { map, at } = renderPhysical(onSelectFeature);

  fireEvent.click(map, at(pointOnRiver('yellow-river')));

  expect(onSelectFeature).toHaveBeenCalledWith('yellow-river');
});
```

`renderPhysical`, `at` и `pointOnRiver` уже объявлены в этом файле шагом 2 — новые тесты пользуются ими, а не заводят свои.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx src/map/ChinaMap.test.tsx`
Expected: FAIL — у формы нет ни `aria-label`, ни `tabindex`, ни подписи; нажатие по форме не отвечает.

- [ ] **Step 3: Сделать формы-цели узлами ответа**

В `src/map/PhysicalLayer.tsx` заменить группу `.relief` целиком:

```tsx
      <g className="relief" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.map((shape) => {
          /*
           * Спрашиваются шесть форм из тридцати восьми. Остальные тридцать две
           * заливают фон и молчат: имён у них на экране нет, иначе пришлось бы
           * сверять тридцать восемь имён вместо шести ради подложки (спек §2).
           */
          const isTarget = shape.featureId !== undefined;
          const answers = isTarget && onSelect !== undefined;

          return (
            <path
              key={shape.key}
              className="relief-shape"
              d={shape.d}
              data-step={shape.step}
              data-feature-id={shape.featureId}
              data-selected={isTarget && shape.featureId === selectedFeatureId}
              role={answers ? 'button' : undefined}
              aria-label={isTarget ? NAME_OF.get(shape.featureId!) : undefined}
              aria-hidden={isTarget ? undefined : 'true'}
              tabIndex={answers ? 0 : -1}
              onKeyDown={
                answers
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(shape.featureId!);
                      }
                    }
                  : undefined
              }
            />
          );
        })}
      </g>
```

Подписи форм добавляются отдельной группой сразу после группы рек, чтобы буквы не оказались под линией:

```tsx
      <g className="landform-labels" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => (
          <text
            key={shape.key}
            className="physical-label"
            x={shape.labelX}
            y={shape.labelY}
            textAnchor="middle"
            aria-hidden="true"
          >
            {NAME_RU_OF.get(shape.featureId!)}
          </text>
        ))}
      </g>
```

- [ ] **Step 4: Вернуть границы регионов поверх ступеней**

Спек (§5) перечисляет слои снизу вверх: заливка ступеней → **границы регионов
тонкой чертой** → формы-цели → реки → подписи. «Границы остаются: без них
школьник не поймёт, где он, а сама карта перестанет связывать новый материал
со старым». Сейчас они пропадают: области нарисованы до слоя, и непрозрачная
заливка ступени их закрывает — видны они только на тех 27,8 % суши, где формы
нет.

Второй копии геометрии для этого не нужно — те же `<use>` на те же 34 контура,
что уже собраны в `clipPath`. Группа объявляется в `PhysicalLayer` сразу после
группы `.relief`, до рек:

```tsx
      {/*
        Границы регионов поверх ступеней. Без них физическая карта перестаёт
        связывать новый материал со старым: ученик видит рельеф, но не видит,
        где он. Геометрия та же, что у clipPath, — `<use>` на те же контуры,
        второй копии путей на карте не появляется.
      */}
      <g className="region-outlines" clipPath={`url(#${CLIP_ID})`} aria-hidden="true">
        {regions.map((region) => (
          <use key={region.mapAreaId} href={`#${region.mapAreaId}`} />
        ))}
      </g>
```

Стиль — в `src/styles.css`, в блоке физической карты:

```css
/*
 * Заливка снимается с копии, а не наследуется: правило области ставит ей тон
 * `--map-relief-rest`, но CSS документа не достаёт внутрь клона `<use>`, и
 * `fill` клон берёт наследованием от самого `<use>`. Отсюда `fill: none`
 * здесь — единственный способ получить только черту.
 */
.china-map .physical-layer .region-outlines use {
  fill: none;
  pointer-events: none;
  stroke: var(--map-border);
  stroke-width: var(--map-border-width, 0.5);
}
```

Если токена ширины границы с таким именем нет, взять то значение, которым
`src/styles.css` уже рисует границу области на прочих видах, — искать по
`--map-border` в том же файле, а не заводить новое число.

- [ ] **Step 5: Научить карту разрешать нажатие по форме**

В `src/map/ChinaMap.tsx` рядом с `getRegionId` добавить:

```ts
/**
 * Какой объект физической географии под узлом. В отличие от реки, у формы
 * есть контур, и цель нажатия у неё — он сам: вписанная окружность каждой из
 * шести проверена на сборке и не мельче 24 px.
 */
function getFeatureId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<SVGElement>('[data-feature-id]')?.dataset.featureId ?? null;
}
```

И в `selectTarget` — в ветку физических целей, после поиска реки:

```ts
    if (resolvesFeatures && point !== undefined) {
      const featureId =
        featureAtClient(point.clientX, point.clientY) ?? getFeatureId(target);
      if (featureId !== null) {
        onSelectFeature?.(featureId);
        return;
      }
    }
```

Ветка целиком остаётся под условием `point !== undefined` намеренно: с клавиатуры отвечает сам узел своим `onKeyDown`, и если разрешать цели ещё и здесь, `Enter` на форме вызвал бы обработчик дважды — событие всплывает до карты.

- [ ] **Step 6: Стили формы-цели и подписи**

В `src/styles.css`, в блоке физической карты, заменить правило `.relief-shape`:

```css
/*
 * Декоративная форма не цель нажатия, а заливка: цель ищется по
 * `[data-region-id]` и `[data-feature-id]`, и у декоративной нет ни того, ни
 * другого. Без этого 66 % суши перестали бы отвечать: нажатие приходилось бы
 * в заливку, под которой лежит невыбираемый регион.
 */
.china-map .physical-layer .relief-shape {
  pointer-events: none;
  stroke: none;
}

/* Шесть спрашиваемых форм — цели, и нажатие им нужно. */
.china-map
  .physical-layer[data-interactive='true']
  .relief-shape[data-feature-id] {
  cursor: pointer;
  pointer-events: auto;
}

/*
 * Выбранная форма обведена, а не перекрашена: цветовой канал занят тремя
 * ступенями, и перекрасить её значило бы соврать про ступень.
 */
.china-map .physical-layer .relief-shape[data-selected='true'],
.china-map .physical-layer .relief-shape:focus-visible {
  stroke: var(--focus-on-paper);
  stroke-width: 2;
}

.china-map .physical-layer .relief-shape:focus-visible {
  outline: none;
}
```

- [ ] **Step 7: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map`
Expected: PASS.

Отдельно проверить в браузере, что границы регионов видны поверх заливки — на
Тибетском нагорье, самой крупной форме: правило `<use>` опирается на то, что
CSS документа не достаёт внутрь клона, и это стоит увидеть, а не вывести.

- [ ] **Step 8: Записать решения**

В `DECISIONS.md`, новыми строками сразу после строки заголовка таблицы:

```
| 2026-08-06 | Шесть форм-целей отвечают на нажатие и в игре, и в атласе; тридцать две остаются фоном | Шаг 2 сделал все тридцать восемь форм подложкой — тогда о них не спрашивали. Теперь спрашивают, и цель у формы появляется вместе с вопросом: её контур, чья вписанная окружность проверена на сборке. Признак цели один и тот же в игре и в атласе — `featureId` у формы, — поэтому в атласе нажатие по Тибетскому нагорью теперь открывает карточку нагорья, а не региона под ним. Это не побочный эффект: без атласа объекты можно было бы тренировать, но нельзя разглядывать, — тот же довод, по которому в атлас попали города. Тридцать две декоративные формы остаются `aria-hidden` и `pointer-events: none`: показать их имена значило бы сверять тридцать восемь имён вместо шести ради фона. |
| 2026-08-06 | Подписи двенадцати объектов постоянны в атласе и скрыты в играх | Спек требовал подписи «у одной цели за раз, при наведении, фокусе и выборе, как у городов». Довод там — полсотни городов, чьи подписи одновременно не помещаются. Целей двенадцать, и постоянные подписи рек, поставленные шагом 2, читаются: проверено на 1440×900. Правило спека применяется там, где его довод действует, — в играх подпись скрыта целиком, потому что она и есть ответ. |
```

- [ ] **Step 9: Коммит**

```bash
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx src/styles.css DECISIONS.md
git commit -m "feat: формы-цели отвечают на нажатие, фокус и подпись"
```

---

### Task 5: Исход ответа на физической карте

**Files:**
- Modify: `src/map/MapDefs.tsx`
- Modify: `src/map/PhysicalLayer.tsx`
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/styles.css`
- Test: `src/map/PhysicalLayer.test.tsx`

**Interfaces:**
- Produces: `PhysicalLayer` и `ChinaMap` принимают `featureOutcomes?: Readonly<Record<string, 'correct' | 'incorrect'>>`; узел объекта получает `data-outcome`.

**Почему не цветом.** Цветовой канал физической карты занят тремя ступенями: перекрасить форму значило бы соврать про её ступень. Поэтому исход у формы — штриховка поверх её собственной заливки, у реки — толщина и штрих линии (спек §5).

- [ ] **Step 1: Написать падающие тесты**

В `src/map/PhysicalLayer.test.tsx`:

```tsx
  it('исход ответа помечает и форму, и реку', () => {
    const { container } = renderLayer({
      featureOutcomes: { gobi: 'incorrect', yangtze: 'correct' },
    });

    expect(
      container.querySelector('.relief-shape[data-feature-id="gobi"]'),
    ).toHaveAttribute('data-outcome', 'incorrect');
    expect(
      container.querySelector('.river-line[data-feature-id="yangtze"]'),
    ).toHaveAttribute('data-outcome', 'correct');
  });

  it('без исходов признака нет ни у кого', () => {
    const { container } = renderLayer();

    expect(container.querySelector('[data-outcome]')).toBeNull();
  });
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx -t 'исход'`
Expected: FAIL — признака `data-outcome` нет.

- [ ] **Step 3: Штриховки исхода**

В `src/map/MapDefs.tsx` рядом с прочими идентификаторами:

```ts
const PHYSICAL_CORRECT_PATTERN_ID = 'map-hatch-physical-correct';
const PHYSICAL_INCORRECT_PATTERN_ID = 'map-hatch-physical-incorrect';
```

И два образца внутри `<defs>`, после существующих:

```tsx
        {/*
          Исход на физической карте. Фона у образца нет намеренно: под ним
          остаётся заливка ступени, и она обязана просвечивать — перекрасить
          форму значило бы соврать про её ступень. Различает исходы наклон и
          частота штриха, а не только цвет: пара «верно — неверно» одной
          светлоты неразличима при дальтонизме.
        */}
        <pattern
          id={PHYSICAL_CORRECT_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--map-correct-mark)"
            strokeWidth="2"
          />
        </pattern>
        <pattern
          id={PHYSICAL_INCORRECT_PATTERN_ID}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            stroke="var(--map-incorrect-mark)"
            strokeWidth="2"
          />
        </pattern>
```

Если токена `--map-correct-mark` в `src/design/tokens.css` нет, а есть только `--map-incorrect-mark`, добавить парный рядом с ним, тем же приёмом и с комментарием о том, что это метка исхода, а не заливка:

```css
  --map-correct-mark: var(--c-jade-700);
```

Значение подбирается так, чтобы `scripts/validate-tokens.test.ts` проходил: метке нужно 3:1 к каждой из четырёх заливок ступеней. Добавить туда же проверку — рядом с тестом «линия реки видна на каждой ступени рельефа»:

```ts
  it('метки исхода видны на каждой ступени рельефа', () => {
    for (const fill of RELIEF_FILLS) {
      expectAtLeast('--map-correct-mark', fill, GRAPHIC_CONTRAST);
      expectAtLeast('--map-incorrect-mark', fill, GRAPHIC_CONTRAST);
    }
  });
```

- [ ] **Step 4: Провести исходы через слой и карту**

В `src/map/PhysicalLayer.tsx` — новое свойство и его применение:

```tsx
  /**
   * Чем кончился ответ по объекту. Пусто до ответа: на физической карте
   * состояние не бывает цветом, и до ответа помечать нечего.
   */
  readonly featureOutcomes?: Readonly<Record<string, 'correct' | 'incorrect'>>;
```

Значение по умолчанию объявляется на уровне модуля рядом с `CLIP_ID` — литерал `{}` в параметрах создавал бы новый объект на каждой отрисовке:

```ts
const NO_OUTCOMES: Readonly<Record<string, 'correct' | 'incorrect'>> = {};
```

У формы-цели и у линии реки добавляется признак:

```tsx
              data-outcome={featureOutcomes[shape.featureId ?? '']}
```

```tsx
                data-outcome={featureOutcomes[line.featureId]}
```

В `src/map/ChinaMap.tsx` — свойство `featureOutcomes` того же типа с тем же значением по умолчанию, и проброс в `PhysicalLayer` рядом с `selectedFeatureId`.

- [ ] **Step 5: Копия контура под штриховку**

Заливка нарисованной формы заменяется целиком: поставь ей `fill: url(#…)` — и
ступень исчезнет, а между штрихами покажется не она, а область региона под
слоем. Поэтому форма с исходом рисуется дважды: сама форма остаётся со своей
ступенью, а поверх ложится копия контура, у которой заливка — прозрачная между
штрихами штриховка. Копий не больше двух за вопрос: правильный объект и,
если ученик промахнулся, выбранный.

Группа объявляется в `PhysicalLayer` сразу после подписей форм — над формами,
но под реками: река идёт поверх формы, и штриховка не должна её перечёркивать.

```tsx
      <g className="relief-outcomes" clipPath={`url(#${CLIP_ID})`}>
        {RELIEF_SHAPES.filter(
          (shape) =>
            shape.featureId !== undefined &&
            featureOutcomes[shape.featureId] !== undefined,
        ).map((shape) => (
          <path
            key={shape.key}
            className="relief-outcome"
            d={shape.d}
            data-outcome={featureOutcomes[shape.featureId!]}
            aria-hidden="true"
          />
        ))}
      </g>
```

Копия молчит для читалки экрана (`aria-hidden`) и не берёт нажатие: имя и цель
остаются у самой формы, а исход — это отметка на ней, а не второй объект.

- [ ] **Step 6: Стили исхода**

В `src/styles.css`, в блоке физической карты:

```css
/*
 * Исход у формы — штриховка поверх её ступени, у реки — толщина и штрих.
 * Второй канал обязателен: цвет здесь занят тремя ступенями, и перекрасить
 * форму значило бы соврать про её ступень.
 */
.china-map .physical-layer .relief-outcome {
  pointer-events: none;
  stroke: none;
}

.china-map .physical-layer .relief-outcome[data-outcome='correct'] {
  fill: url('#map-hatch-physical-correct');
}

.china-map .physical-layer .relief-outcome[data-outcome='incorrect'] {
  fill: url('#map-hatch-physical-incorrect');
}

.china-map .physical-layer .river-line[data-outcome] {
  stroke-width: var(--map-river-width-strong);
}

.china-map .physical-layer .river-line[data-outcome='correct'] {
  stroke: var(--map-correct-mark);
}

.china-map .physical-layer .river-line[data-outcome='incorrect'] {
  stroke: var(--map-incorrect-mark);
  stroke-dasharray: 6 3;
}
```

`data-outcome` стоит в двух местах и это намеренно: на самой форме — по нему
ищет тест и по нему же слой отвечает на вопрос «чем кончилось»; на копии — по
нему ложится штриховка.

- [ ] **Step 7: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map scripts/validate-tokens.test.ts`
Expected: PASS.

- [ ] **Step 8: Коммит**

```bash
git add src/map/MapDefs.tsx src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/map/ChinaMap.tsx src/design/tokens.css scripts/validate-tokens.test.ts src/styles.css
git commit -m "feat: исход ответа на физической карте — штриховкой и штрихом"
```

---

### Task 6: Экран раунда и равнозначный список

**Files:**
- Create: `src/features/exercise/PhysicalRound.tsx`
- Create: `src/features/exercise/PhysicalAnswerList.tsx`
- Modify: `src/features/exercise/exercise-modes.ts`
- Test: `src/features/exercise/PhysicalRound.test.tsx`

**Interfaces:**
- Consumes: `buildPhysicalChoices` (задача 2), `physicalTarget` (задача 1), `featuresWord` (задача 1), `featureOutcomes` у `ChinaMap` (задача 5).
- Produces: `PhysicalRound` со свойствами `{ features, exerciseType, language, roundId, seed, onFinish, onExit }`; `PHYSICAL_MODES: Readonly<Record<'find-on-map' | 'name-target', ExerciseMode>>`.

- [ ] **Step 1: Описать игры**

В `src/features/exercise/exercise-modes.ts`, после `CITY_MODES`:

```ts
/**
 * Две игры по физической географии. `match-pair` здесь нет и не будет: у реки
 * нет второго каталога, с которым её связывают (спек §6).
 */
export const PHYSICAL_MODES: Readonly<
  Record<'find-on-map' | 'name-target', ExerciseMode>
> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на физической карте',
    eyebrow: 'Найдите объект на карте',
  },
  'name-target': {
    exerciseType: 'name-target',
    title: 'Назвать объект',
    eyebrow: 'Какой объект подсвечен',
  },
};
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/features/exercise/PhysicalRound.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { physicalFeatures } from '../../content/physical-features';
import { PhysicalRound } from './PhysicalRound';

function renderRound(exerciseType: 'find-on-map' | 'name-target') {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  const { container } = render(
    <PhysicalRound
      features={physicalFeatures}
      exerciseType={exerciseType}
      language="ru"
      roundId="r1"
      seed={11}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { container, onFinish, onExit };
}

it('спрашивает двенадцать объектов подряд', () => {
  renderRound('find-on-map');

  expect(screen.getByText(/Вопрос 1 из 12/)).toBeInTheDocument();
});

it('в «найти» вопрос называет объект, а карта его не подписывает', () => {
  const { container } = renderRound('find-on-map');

  expect(screen.getByTestId('exercise-target')).not.toHaveTextContent(
    'Объект на карте',
  );
  expect(container.querySelector('.physical-layer')).toHaveAttribute(
    'data-labels',
    'false',
  );
});

it('в «назвать» даёт четыре имени того же вида', () => {
  renderRound('name-target');

  const options = screen.getAllByTestId('choice-option');
  const kinds = options.map(
    (option) =>
      physicalFeatures.find(
        (feature) => feature.id === option.dataset.choiceId,
      )!.kind,
  );

  expect(options).toHaveLength(4);
  expect(new Set(kinds).size).toBe(1);
});

it('верный ответ из списка ведёт к следующему вопросу', () => {
  renderRound('find-on-map');

  const asked = screen.getByTestId('exercise-target').textContent!;
  const target = physicalFeatures.find((feature) => feature.nameRu === asked)!;

  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(target.nameRu) }),
  );

  expect(screen.getByText(/Вопрос 1 из 12/)).toBeInTheDocument();
});

it('неверный ответ показывает разбор с правильным именем', () => {
  renderRound('find-on-map');

  const asked = screen.getByTestId('exercise-target').textContent!;
  const wrong = physicalFeatures.find((feature) => feature.nameRu !== asked)!;

  fireEvent.click(screen.getByRole('button', { name: new RegExp(wrong.nameRu) }));

  expect(screen.getByText(/стоит повторить/)).toBeInTheDocument();
  expect(screen.getByText(new RegExp(asked))).toBeInTheDocument();
});

it('даёт прервать раунд', () => {
  const { onExit } = renderRound('name-target');

  fireEvent.click(screen.getByRole('button', { name: /Прервать раунд/ }));

  expect(onExit).toHaveBeenCalled();
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Expected: FAIL — «Failed to resolve import "./PhysicalRound"».

- [ ] **Step 4: Написать равнозначный список**

Создать `src/features/exercise/PhysicalAnswerList.tsx`:

```tsx
import { useState } from 'react';
import { featuresWord } from '../../content/region-count';
import type { PhysicalFeature } from '../../content/types';
import { TWO_COLUMN_QUERY } from '../../design/breakpoints';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';

/**
 * Начальное состояние блока — то же правило, что у списков регионов и
 * городов: в jsdom `matchMedia` нет, и его отсутствие читается как узкий
 * экран, чтобы проверки ответа не зависели от вёрстки.
 */
function defaultOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia(TWO_COLUMN_QUERY).matches;
}

export type PhysicalAnswerListProps = {
  readonly features: readonly PhysicalFeature[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (featureId: string) => void;
};

/**
 * Равнозначный список объектов — второй способ ответить в «Найти на
 * физической карте».
 *
 * Нужен не только на узком экране: река шириной в волос не цель ни при каком
 * разведении на 320 px (спек §6), а ответить с клавиатуры и через читалку
 * экрана нужно всегда. Разметка и стили общие со списками регионов и городов.
 *
 * Порядок — алфавитный по русскому имени, реки и формы вперемешку: разделять
 * их значило бы подсказывать вид ответа.
 */
export function PhysicalAnswerList({
  features,
  language,
  targetId,
  answeredId,
  disabled,
  onSelect,
}: PhysicalAnswerListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ordered = [...features].sort((left, right) =>
    left.nameRu.localeCompare(right.nameRu, 'ru'),
  );

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({features.length} {featuresWord(features.length)})
      </summary>
      <ul className="map-alternative" aria-label="Список объектов">
        {ordered.map((feature) => (
          <li key={feature.id}>
            <button
              type="button"
              data-feature-id={feature.id}
              data-result={
                answeredId === null
                  ? undefined
                  : feature.id === targetId
                    ? 'correct'
                    : feature.id === answeredId
                      ? 'incorrect'
                      : undefined
              }
              aria-disabled={disabled ? 'true' : undefined}
              onClick={() => {
                if (!disabled) {
                  onSelect(feature.id);
                }
              }}
            >
              <span lang={langOf(language)}>{labelOf(feature, language)}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
```

- [ ] **Step 5: Написать экран раунда**

Создать `src/features/exercise/PhysicalRound.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { regions } from '../../content/regions';
import type { PhysicalFeature } from '../../content/types';
import { buildPhysicalChoices } from '../../domain/physical-choices';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  physicalTarget,
  type Attempt,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import type { MapZoom } from '../../map/MapControls';
import { PHYSICAL_MODES } from './exercise-modes';
import { PhysicalAnswerList } from './PhysicalAnswerList';
import { RoundProgressTrail } from './RoundProgressTrail';

/** Столько же, сколько в раундах по регионам и городам: ритм у игр общий. */
const CORRECT_PAUSE_MS = 500;

/*
 * Часы раунда живут в модуле, а не в теле компонента. `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента
 * вызовом во время отрисовки, хотя оба вызова происходят в обработчиках
 * событий. Тот же приём в `CityRound`.
 */
function startClock(): number {
  return performance.now();
}

function elapsedSince(start: number): number {
  return Math.round(startClock() - start);
}

export type PhysicalRoundProps = {
  readonly features: readonly PhysicalFeature[];
  readonly exerciseType: 'find-on-map' | 'name-target';
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * Две игры по физической географии одним экраном.
 *
 * Отдельно от `CityRound` и `ExerciseRound` по той же причине, по которой они
 * отдельны друг от друга: другой ответ (река разрешается расстоянием, форма —
 * контуром), другие отвлекающие (того же вида, а не того же типа единицы) и
 * свои состояния карты, где цвет занят ступенями.
 *
 * | Игра | Вопрос | Ответ |
 * | --- | --- | --- |
 * | `find-on-map` | имя объекта | нажатие по реке или форме |
 * | `name-target` | подсвеченный объект | одно из четырёх имён |
 *
 * Раунд один на двенадцать целей, реки и формы вперемешку: разделять их на
 * два раунда по шесть значило бы разорвать ту самую связь между рельефом и
 * течением рек, ради которой режим и делается.
 */
export function PhysicalRound({
  features,
  exerciseType,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: PhysicalRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      features.map((feature) => physicalTarget(feature.id)),
      {
        roundId,
        exerciseTypes: [exerciseType],
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  /*
   * Увеличение с панорамированием: на участке параллельных рек — Цзиньша,
   * Ланьцан и Ну идут рядом полтысячи километров — показать Янцзы, не рискуя
   * попасть в Ланьцанцзян, можно только увеличив карту (спек §5).
   */
  const [zoom, setZoom] = useState<MapZoom>(1);
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(startClock);
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildPhysicalChoices(features, question.target.id, random),
    );
  }, [features, round.questions, seed]);

  const question = currentQuestion(round);
  const targetFeature = features.find((feature) => feature.id === question.target.id)!;
  const mode = PHYSICAL_MODES[exerciseType];
  const isLastQuestion = round.currentIndex === round.questions.length - 1;
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsFeedback = round.status === 'feedback' && lastAttempt?.isCorrect === false;
  const showsChoices = exerciseType === 'name-target';

  /*
   * Исход показывается на самой карте: после ответа видно и то, что выбрал
   * ученик, и то, где был правильный объект. До ответа помечать нечего.
   */
  const featureOutcomes = useMemo(() => {
    if (answeredId === null) {
      return {};
    }

    const outcomes: Record<string, 'correct' | 'incorrect'> = {
      [targetFeature.id]: 'correct',
    };
    if (answeredId !== targetFeature.id) {
      outcomes[answeredId] = 'incorrect';
    }

    return outcomes;
  }, [answeredId, targetFeature.id]);

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredId(null);
    setAskedAt(startClock());
  }

  function answer(id: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredId(id);
    const answered = answerQuestion(round, {
      answeredId: id,
      durationMs: elapsedSince(askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    if (answered.attempts[answered.attempts.length - 1].isCorrect) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        goNext(answered);
      }, CORRECT_PAUSE_MS);
    }
  }

  function handleChoice(event: MouseEvent<HTMLButtonElement>) {
    answer(event.currentTarget.dataset.choiceId ?? '');
  }

  /*
   * Обработчики объявлены именами, а не стрелками прямо в разметке: стрелка в
   * свойстве JSX создаётся на рендере, и проверка чистоты считает вызов из неё
   * вызовом во время отрисовки. Тот же приём в `CityRound`.
   */
  function handleFeatureSelect(featureId: string) {
    if (!showsChoices) {
      answer(featureId);
    }
  }

  function handleNext() {
    goNext(round);
  }

  return (
    <main className="round-shell">
      <div className="round-layout" data-columns="two">
        <div className="round-prompt-column">
          <header className="round-prompt">
            <p className="eyebrow">{mode.eyebrow}</p>
            <h1
              data-testid="exercise-target"
              lang={showsChoices ? undefined : langOf(question.language)}
            >
              {showsChoices
                ? 'Объект на карте'
                : labelOf(targetFeature, question.language)}
            </h1>
            <p className="exercise-progress">
              Вопрос {round.currentIndex + 1} из {round.questions.length}
            </p>
          </header>
          {showsChoices ? (
            <ul className="choice-list" aria-label="Варианты ответа">
              {choicesByQuestion[round.currentIndex].map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    data-testid="choice-option"
                    data-choice-id={choice.id}
                    data-result={
                      answeredId === null
                        ? undefined
                        : choice.id === targetFeature.id
                          ? 'correct'
                          : choice.id === answeredId
                            ? 'incorrect'
                            : undefined
                    }
                    disabled={round.status !== 'ready'}
                    onClick={handleChoice}
                  >
                    {labelOf(choice, question.language)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showsFeedback ? (
            <section
              className="answer-feedback"
              data-result="incorrect"
              aria-labelledby="physical-feedback-heading"
            >
              <p className="answer-feedback-icon" role="img" aria-label="Стоит повторить">
                ↻
              </p>
              <h3 id="physical-feedback-heading" tabIndex={-1}>
                Этот объект стоит повторить
              </h3>
              <p>
                Правильный ответ: {targetFeature.nameRu}{' '}
                <span lang="zh-Hans">{targetFeature.nameZh}</span>.
              </p>
              <button type="button" className="primary" onClick={handleNext}>
                {isLastQuestion ? 'Завершить раунд' : 'Далее'}
              </button>
            </section>
          ) : null}
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </div>
        <div className="round-map">
          {/*
            Подписи скрыты в обеих играх: в «назвать объект» подпись
            подсвеченной реки и есть ответ, в «найти» она выдала бы объект
            наведением курсора. Та же утечка, что у выносок Макао и Гонконга.
            Области при этом не отвечают: ответ здесь — объект, а не регион.
          */}
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            interactive={false}
            zoom={zoom}
            onZoomChange={setZoom}
            usage="answer"
            variant="physical"
            selectedFeatureId={showsChoices ? targetFeature.id : answeredId}
            onSelectFeature={showsChoices ? undefined : handleFeatureSelect}
            showsPhysicalLabels={false}
            featureOutcomes={featureOutcomes}
          />
        </div>
      </div>
      {/*
        Равнозначный список: река шириной в волос не цель ни при каком
        разведении на 320 px, и с клавиатуры карта отвечает не всем.
      */}
      {exerciseType === 'find-on-map' ? (
        <PhysicalAnswerList
          features={features}
          language={question.language}
          answeredId={answeredId}
          targetId={targetFeature.id}
          disabled={round.status !== 'ready'}
          onSelect={handleFeatureSelect}
        />
      ) : null}
      <footer className="round-footer">
        <button type="button" className="secondary" onClick={onExit}>
          Прервать раунд
        </button>
      </footer>
    </main>
  );
}
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Expected: PASS, 6 тестов. Если «в «назвать» даёт четыре имени того же вида» падает на длине — проверить, что `buildPhysicalChoices` берёт `features`, а не `physicalFeatures` напрямую.

- [ ] **Step 7: Коммит**

```bash
git add src/features/exercise/PhysicalRound.tsx src/features/exercise/PhysicalRound.test.tsx src/features/exercise/PhysicalAnswerList.tsx src/features/exercise/exercise-modes.ts
git commit -m "feat: экран раунда по физической географии"
```

---

### Task 7: Карточки на главной, запуск и итоги

**Files:**
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/App.tsx`
- Modify: `CHANGELOG.md`
- Test: `src/features/home/HomePage.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `PhysicalRound` (задача 6), `physicalFeatures`, `featuresWord` (задача 1).
- Produces: экран `'physical-exercise'`; две карточки в `MODE_CARDS` с видом `kind: 'physical'`.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/home/HomePage.test.tsx` — в конец:

```tsx
it('показывает обе игры по физической географии', () => {
  renderHome();

  expect(
    screen.getByRole('button', { name: /Найти на физической карте/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Назвать объект/ })).toBeInTheDocument();
});
```

`renderHome` — помощник, объявленный в этом файле строкой 12; он же дополняется полем `onStartPhysicalRound` на шаге 3.

В `src/App.test.tsx` — в конец:

```tsx
it('запускает раунд по физической географии с главной', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти на физической карте/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Начать/ }));

  expect(screen.getByText(/Вопрос 1 из 12/)).toBeInTheDocument();
});
```

Кнопка старта в окне названа так же, как в уже существующих проверках этого файла: `screen.getByRole('button', { name: /^Начать/ })` — окно одно на все режимы.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/features/home/HomePage.test.tsx src/App.test.tsx`
Expected: FAIL — карточек нет.

- [ ] **Step 3: Добавить карточки**

В `src/features/exercise/exercise-modes.ts` — в размеченное объединение `ModeCard` добавить вид:

```ts
  /** Игра по физической географии: цели берутся из справочника объектов. */
  | { readonly kind: 'physical'; readonly exerciseType: 'find-on-map' | 'name-target' }
```

Комментарий над `ModeCard` про иероглифы дополняется: `山 гора, 河 река`.

И две карточки в `MODE_CARDS` — сразу после `city-region`, перед `history`:

```ts
  {
    id: 'find-physical',
    kind: 'physical',
    exerciseType: 'find-on-map',
    mark: '山',
    title: 'Найти на физической карте',
    summary:
      'Вопрос называет реку или форму рельефа — ответ нажимается на карте или выбирается из списка. Реки и формы вперемешку: рельеф и течение рек связаны.',
    volume: '12 объектов · около 5 минут',
  },
  {
    id: 'name-physical',
    kind: 'physical',
    exerciseType: 'name-target',
    mark: '河',
    title: 'Назвать объект',
    summary:
      'Один объект подсвечен, четыре имени на выбор. Реку отвлекают реками, форму — формами, иначе ответ читался бы по виду подсветки.',
    volume: '12 объектов · около 4 минут',
  },
```

- [ ] **Step 4: Подключить экран**

В `src/App.tsx`:

1. В тип `Screen` добавить `| 'physical-exercise'` после `'city-exercise'`.
2. Импортировать `PhysicalRound` из `./features/exercise/PhysicalRound`, `physicalFeatures` из `./content/physical-features` и `featuresWord` из `./content/region-count` (рядом с `citiesWord`).
3. Рядом с `startCityRound` добавить запуск:

```ts
  /**
   * Двенадцать целей всегда, набор не выбирается: реки и формы спрашиваются
   * вперемешку одним раундом (спек §6). Окно перед стартом спрашивает только
   * язык — второго переключателя, как у городов, здесь нет.
   */
  function startPhysicalRound(
    exerciseType: 'find-on-map' | 'name-target',
    nextLanguage: QuestionLanguage,
    features: readonly PhysicalFeature[] = physicalFeatures,
  ) {
    setPhysicalPool(features);
    setExerciseTypes([exerciseType]);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('physical-exercise');
  }
```

Состояние `physicalPool` объявляется рядом с `cityPool`:

```ts
  const [physicalPool, setPhysicalPool] = useState<readonly PhysicalFeature[]>(
    physicalFeatures,
  );
```

4. Возврат экрана — рядом с `city-exercise`:

```tsx
  if (screen === 'physical-exercise') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <PhysicalRound
          features={physicalPool}
          exerciseType={exerciseTypes[0] as 'find-on-map' | 'name-target'}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishCityRound}
          onExit={() => setScreen('home')}
        />
      </AppFrame>
    );
  }
```

`finishCityRound` переиспользуется намеренно: он записывает попытки и уводит на итоги, а вид цели берётся из самих попыток. Если его имя говорит только о городах, переименовать его в `finishTargetRound` одним движением по всем вызовам — но не менять поведение.

5. На экране итогов вид раунда уже выводится из попыток. Добавить третью ветку рядом с `isCityRound`:

```tsx
    const roundKind = lastAttempts[0]?.target.kind ?? 'region';
    const namedTargets =
      roundKind === 'city' ? cityPool : roundKind === 'physical' ? physicalPool : regions;
    const countWord =
      roundKind === 'city' ? citiesWord : roundKind === 'physical' ? featuresWord : undefined;
```

и передавать `targets={namedTargets}`, `countWord={countWord}`. В `onRepeatMistakes` — ветка для физических целей рядом с городской:

```tsx
            if (roundKind === 'physical') {
              startPhysicalRound(
                exerciseTypes[0] as 'find-on-map' | 'name-target',
                language,
                physicalPool.filter((feature) =>
                  repeatRegionIds.includes(feature.id),
                ),
              );
              return;
            }
```

и в `onNewRound` — ветка `roundKind === 'physical'` вызовом `startPhysicalRound(exerciseTypes[0] as 'find-on-map' | 'name-target', language)`.

6. Главная. В `src/App.tsx`, там где `HomePage` получает `onStartCityRound`, добавить строкой ниже:

```tsx
          onStartPhysicalRound={startPhysicalRound}
```

В `src/features/home/HomePage.tsx` — свойство рядом с `onStartCityRound` (около строки 27):

```ts
  readonly onStartPhysicalRound: (
    exerciseType: 'find-on-map' | 'name-target',
    language: QuestionLanguage,
  ) => void;
```

Его же добавить в разбор параметров рядом с `onStartCityRound` (около строки 56). В функции `start` (около строки 74) — ветка после городской:

```ts
    } else if (card.kind === 'physical') {
      onStartPhysicalRound(card.exerciseType, language);
    }
```

Окно перед стартом набор не спрашивает: условие `defaultCitySet` (около строки 202) остаётся как есть — `startingCard.kind === 'city' ? 'capital' : null`, и физическая карточка попадает в `null`. Это не совпадение, а то, чего требует спек: «Второго переключателя, как у городов, нет: набор целей один».

В `src/features/home/HomePage.test.tsx` помощник `renderHome` (строка 12) дополняется полем `onStartPhysicalRound: vi.fn(),` рядом с `onStartCityRound`, и тем же полем — прямой вызов `HomePage` около строки 162.

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run`
Expected: PASS — весь набор, включая прежние тесты главной и итогов.

- [ ] **Step 6: Обновить журнал изменений**

В `CHANGELOG.md`, в `## [Unreleased]` → `### Added`, первой записью:

```markdown
- Две игры по физической географии: «Найти на физической карте» (имя → нажатие
  по реке или форме) и «Назвать объект» (подсвечен объект → четыре имени).
  Двенадцать целей одним раундом, реки и формы вперемешку: разделять их значило
  бы разорвать ту связь между рельефом и течением рек, ради которой режим и
  сделан. Отвлекающие того же вида — реку отвлекают реками, форму формами,
  иначе ответ читался бы по виду подсветки, а не по знанию. Миграции прогресса
  нет: `Target` уже носил вид в себе, а освоенность и повторение уже
  фильтровали по нему, поэтому «не знает Хуанхэ» не смешивается ни с «не знает
  Ганьсу», ни с «путает Ланьчжоу с Синином».
- Шесть форм рельефа стали целями нажатия — и в игре, и в атласе. Цель у формы
  — её собственный контур: вписанная окружность каждой из шести проверена на
  сборке и не мельче 24 px. Тридцать две декоративные формы остались фоном.
- Исход ответа на физической карте показан не цветом: цветовой канал занят
  тремя ступенями рельефа. У формы это штриховка поверх её ступени, у реки —
  толщина и штрих линии.
```

- [ ] **Step 7: Полная проверка и коммит**

Run: `npm run build && npm test && npm run lint`
Expected: всё зелёное.

Проверить в браузере на 1440×900 и на 320 px: обе карточки на главной, окно перед стартом спрашивает только язык, в «найти» ответ мышью по реке и по форме, ответ из списка, `Tab` до объекта и `Enter`, в «назвать» четыре имени того же вида, исход после ответа виден на карте, увеличение и панорамирование, `Escape` и «Прервать раунд», итоги и «Повторить ошибки».

```bash
git add src/features/exercise/exercise-modes.ts src/App.tsx src/App.test.tsx src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx CHANGELOG.md
git commit -m "feat: две игры по физической географии на главной"
```

---

## Чем закрывается спек

| Раздел спека | Где сделано |
| --- | --- |
| §1 состав целей | шаг 1 (справочник на двенадцать объектов) |
| §2 подложка шире набора | шаг 2 (38 форм заливкой), задача 4 (шесть отвечают, тридцать две молчат) |
| §3 геометрия | шаг 1 (генератор, выжимка, обрезка `clipPath`) |
| §4 каталог и домен | шаг 1 (`physical-features.ts`), задача 1 (`TargetKind`) |
| §5 карта | шаг 2 (вид, ступени, реки, расстояние), задачи 3–5 (формы, подписи, исходы) |
| §6 игры | задачи 2, 6, 7 |
| §7 имена | шаг 1 (сверены, в `docs/sources/physical.md`) |
| §8 проверки | шаг 1 (`validate:map`, `validate:content`, шрифты), задачи 1–3, 5 (токены, точка подписи, виды целей) |
