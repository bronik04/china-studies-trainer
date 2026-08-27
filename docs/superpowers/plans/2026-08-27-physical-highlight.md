# Выделение объекта на физической карте: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать физической карте один словарь выделения — тушью, — чтобы под
курсором и в фокусе было видно, что именно выберешь, включая крупные формы
рельефа, которые сейчас не помечаются вовсе.

**Architecture:** Ничего нового не считается: цель под указателем уже даёт
`physicalTargetAt`, а `hoveredFeatureId` уже доходит до слоя. Работа в том,
чтобы довести признак наведения до формы и озера и одеть три состояния —
выделение, исход, фокус — так, чтобы порядок между ними был явным.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, SVG, CSS-токены.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — по-русски; китайские названия в
  Unicode, а не только пиньинем.
- `src/design/tokens.css` — единственный источник цветов, размеров и
  длительностей. Компоненты не пишут значения напрямую.
- Каждая пара «краска на краске», реально встречающаяся на экране, проверяется
  в `scripts/validate-tokens.test.ts` по WCAG 2.2.
- Цвет на физической карте занят семью полосами высот. Перекрасить форму —
  соврать про её высоту (решение владельца от 2026-08-25).
- Ветка работы — `feat/physical-highlight`, заведена от `master`.
- Каждая задача заканчивается зелёными `npm test` и `npm run lint`.
- Сообщения коммитов по-русски, с завершающей строкой
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Спецификация:
  `docs/superpowers/specs/2026-08-27-physical-highlight-design.md`.

---

## Файлы

| Файл | Ответственность | Задачи |
| --- | --- | --- |
| `src/design/tokens.css` | тон и толщина выделения | 1 |
| `scripts/validate-tokens.test.ts` | тушь выделения контрастна на каждой полосе | 1 |
| `src/map/MapDefs.tsx` | образец штриховки выделения | 1 |
| `src/map/PhysicalLayer.tsx` | признак наведения у формы и у озера | 2 |
| `src/styles.css` | правила выделения и порядок трёх состояний | 3 |
| `CHANGELOG.md`, `DECISIONS.md`, `MAP_SPEC.md` | запись изменения и решения | 4 |

---

## Task 1: Тон, толщина и образец штриховки

**Files:**
- Modify: `src/design/tokens.css`
- Modify: `src/map/MapDefs.tsx`
- Test: `scripts/validate-tokens.test.ts`

**Interfaces:**
- Produces:
  - токены `--map-highlight` и `--map-highlight-width`
  - образец `map-hatch-physical-highlight` в скрытом `<defs>` карты; ссылаются
    на него из `src/styles.css` литералом `url('#map-hatch-physical-highlight')`

- [ ] **Step 1: Написать падающий тест контраста**

Добавить в `scripts/validate-tokens.test.ts` внутрь `describe('шкала высот', …)`,
сразу после теста «метки исхода видны на каждой полосе»:

```ts
  /*
   * Выделение объекта под курсором и в фокусе. Тушь, а не цвет: цветовой канал
   * занят самими полосами, и перекрасить форму значило бы соврать про её
   * высоту. Штриховка и граница ложатся на любую из семи полос.
   */
  it('выделение объекта видно на каждой полосе', () => {
    for (const band of BANDS) {
      expectAtLeast('--map-highlight', band, GRAPHIC_CONTRAST);
    }
  });
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/validate-tokens.test.ts -t 'выделение объекта видно'`
Expected: FAIL — токена `--map-highlight` в файле нет.

- [ ] **Step 3: Завести токены**

В `src/design/tokens.css` заменить

```css
  --map-label: var(--c-ink-900);
  --map-label-size: 13px;
}
```

на

```css
  /*
   * Выделение объекта: что под курсором, что в фокусе, что спрошено.
   *
   * Тушь, а не цвет. Цветовой канал на этой карте занят семью полосами высот,
   * и перекрасить форму значило бы соврать про её высоту; второй синий ради
   * воды пришлось бы заводить в палитре, и он читался бы как «другая вода», а
   * не как «вот этот объект». Тушь контрастна на любой полосе с запасом.
   *
   * Отдельно от `--focus-on-paper`, хотя тон тот же: там фокус клавиатуры,
   * здесь — «вот этот объект». Разойдутся — разойдутся осмысленно.
   */
  --map-highlight: var(--c-ink-900);
  /*
   * Толще границы региона (0.6) и толще прежней обводки выбранной формы
   * (1.6): на карте шириной 542 px те 1.6 давали 1.1 px, и подсказка «какой
   * объект подсвечен» оставалась без ответа.
   */
  --map-highlight-width: 2.5;

  --map-label: var(--c-ink-900);
  --map-label-size: 13px;
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS, все тесты файла.

- [ ] **Step 5: Завести образец штриховки**

В `src/map/MapDefs.tsx` добавить идентификатор рядом с прочими:

```tsx
const PHYSICAL_HIGHLIGHT_PATTERN_ID = 'map-hatch-physical-highlight';
```

и перед закрывающим `</defs>` — сам образец:

```tsx
        {/*
          Выделение формы рельефа: что под курсором, что в фокусе, что
          спрошено. Фона у образца нет — под ним лежит полоса высоты, и она
          обязана просвечивать между штрихами: выделение говорит «вот этот
          объект», а не «вот эта высота».

          Штрих вертикальный, тогда как у исходов 45° и −45°: форма под
          курсором и форма с исходом бывают на экране рядом, и три вида
          штриховки должны различаться наклоном, а не только тоном.
        */}
        <pattern
          id={PHYSICAL_HIGHLIGHT_PATTERN_ID}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke="var(--map-highlight)"
            strokeWidth="1.2"
          />
        </pattern>
```

- [ ] **Step 6: Убедиться, что образец в разметке**

Run: `npx vitest run src/map/MapAttribution.test.tsx src/map/ChinaMap.test.tsx`
Expected: PASS. Образец пока никем не используется — это законное состояние,
правила придут в задаче 3.

- [ ] **Step 7: Проверить линтер и закоммитить**

```bash
npm run lint
git add src/design/tokens.css src/map/MapDefs.tsx scripts/validate-tokens.test.ts
git commit -m "$(printf 'feat: тон, толщина и образец штриховки выделения\n\nТушь, а не цвет: цветовой канал на физической карте занят семью полосами\nвысот. Толщина 2.5 против прежних 1.6 — на карте шириной 542 px те 1.6\nдавали 1.1 px. Штрих вертикальный, чтобы отличаться от исходов.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 2: Признак наведения у формы и у озера

**Files:**
- Modify: `src/map/PhysicalLayer.tsx`
- Test: `src/map/PhysicalLayer.test.tsx`

**Interfaces:**
- Consumes: `hovered` — уже вычисляется в `PhysicalLayer` как
  `hoveredNodeId ?? hoveredFeatureId`.
- Produces: у `.relief-shape` появляется `data-hovered`; у группы
  `<g className="lake">` появляются `data-hovered` и `data-selected`.

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/map/PhysicalLayer.test.tsx` внутрь `describe('PhysicalLayer', …)`:

```tsx
  /*
   * Крупные формы не помечались вовсе: `data-hovered` был только у линии реки
   * и у подписи. Из-за этого под курсором Таримская впадина ничем не
   * отличалась от соседней, и понять, что именно выберешь, было нельзя.
   */
  it('помечает форму под курсором', () => {
    const { container } = renderLayer({
      onSelect: () => {},
      hoveredFeatureId: 'tarim-basin',
    });

    expect(
      container.querySelector('.relief-shape[data-feature-id="tarim-basin"]'),
    ).toHaveAttribute('data-hovered', 'true');
    expect(
      container.querySelector('.relief-shape[data-feature-id="gobi"]'),
    ).toHaveAttribute('data-hovered', 'false');
  });

  /* Декоративная форма целью не бывает и помечаться не должна. */
  it('не помечает форму без имени', () => {
    const { container } = renderLayer({ hoveredFeatureId: 'tarim-basin' });

    for (const shape of container.querySelectorAll(
      '.relief-shape:not([data-feature-id])',
    )) {
      expect(shape.getAttribute('data-hovered')).not.toBe('true');
    }
  });

  it('помечает озеро под курсором', () => {
    const { container } = renderLayer({
      onSelect: () => {},
      hoveredFeatureId: 'qinghai-lake',
    });

    const lake = container
      .querySelector('.lake-hit[data-feature-id="qinghai-lake"]')
      ?.closest('.lake');

    expect(lake).toHaveAttribute('data-hovered', 'true');
  });
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx -t 'помечает форму под курсором'`
Expected: FAIL — `data-hovered` у формы нет.

- [ ] **Step 3: Довести признак до формы**

В `src/map/PhysicalLayer.tsx` в узле формы рельефа заменить

```tsx
              data-selected={isTarget && shape.featureId === selectedFeatureId}
```

на

```tsx
              data-selected={isTarget && shape.featureId === selectedFeatureId}
              data-hovered={isTarget && shape.featureId === hovered}
```

- [ ] **Step 4: Довести признак до озера**

В том же файле заменить

```tsx
            <g key={mark.featureId} className="lake">
```

на

```tsx
            {/*
              Состояние стоит на группе, а не на знаке: помечаются оба узла
              озера — контур воды и знак, — а держать один признак в двух
              местах значит однажды их развести.
            */}
            <g
              key={mark.featureId}
              className="lake"
              data-selected={mark.featureId === selectedFeatureId}
              data-hovered={mark.featureId === hovered}
            >
```

и убрать признак со знака, заменив

```tsx
              <circle
                className="lake-mark"
                cx={mark.x}
                cy={mark.y}
                r={LAKE_MARK_RADIUS}
                data-selected={mark.featureId === selectedFeatureId}
                aria-hidden="true"
              />
```

на

```tsx
              <circle
                className="lake-mark"
                cx={mark.x}
                cy={mark.y}
                r={LAKE_MARK_RADIUS}
                aria-hidden="true"
              />
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: PASS. Если упадёт тест, искавший `.lake-mark[data-selected='true']`,
— переписать его на группу: признак переехал туда вместе с правилом.

- [ ] **Step 6: Проверить весь набор и закоммитить**

```bash
npm test && npm run lint
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx
git commit -m "$(printf 'feat: признак наведения у формы рельефа и у озера\n\nБыл только у линии реки и у подписи, поэтому крупные формы под курсором\nничем не отличались от соседних. У озера состояние переезжает на группу:\nпомечаются оба узла — контур воды и знак.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 3: Правила выделения и порядок трёх состояний

**Files:**
- Modify: `src/styles.css`
- Test: `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Consumes: токены `--map-highlight`, `--map-highlight-width` (задача 1);
  образец `map-hatch-physical-highlight` (задача 1); признаки `data-hovered`
  у формы и у группы озера (задача 2).
- Produces: ничего для следующих задач.

- [ ] **Step 1: Написать падающий тест**

jsdom каскад не считает, поэтому проверяется путь до состояния, а не его вид:
наведение на середину Тибетского нагорья обязано дойти до самой формы, а не
только до подписи. Добавить в `src/map/ChinaMap.test.tsx`:

```tsx
/*
 * Прежде наведение доходило только до линии реки и до подписи: крупная форма
 * под курсором ничем не отличалась от соседней. Точка — середина Тибетского
 * нагорья, вдали и от рек, и от знаков озёр.
 */
it('наведение помечает форму рельефа, а не только подпись', () => {
  const { container, map, at } = renderPhysical(() => {});

  fireEvent.pointerMove(map, at([219, 360]));

  expect(
    container.querySelector('.relief-shape[data-feature-id="tibetan-plateau"]'),
  ).toHaveAttribute('data-hovered', 'true');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/ChinaMap.test.tsx -t 'наведение помечает форму'`
Expected: FAIL, если задача 2 ещё не сделана. Если она сделана — тест уже
проходит; это законно, он сторожит путь, а вид даёт следующий шаг.

- [ ] **Step 3: Одеть выделение формы**

В `src/styles.css` заменить

```css
/*
 * Выбранная форма обведена, а не перекрашена: цветовой канал занят тремя
 * ступенями, и перекрасить её значило бы соврать про ступень.
 */
.china-map .physical-layer .relief-shape[data-selected='true'],
.china-map .physical-layer .relief-shape:focus-visible {
  stroke: var(--focus-on-paper);
  stroke-width: var(--map-border-width-strong);
}
```

на

```css
/*
 * Выделенная форма обведена и заштрихована, а не перекрашена: цветовой канал
 * занят семью полосами высот, и перекрасить её значило бы соврать про высоту.
 * Между штрихами полоса просвечивает — выделение говорит «вот этот объект», а
 * не «вот эта высота».
 *
 * Штриховка ложится на саму форму, а не на копию контура: форма нарисована
 * поверх полос и залита прозрачным, копия нужна только исходу.
 *
 * Три признака — одно оформление. Наведение и выбор не встречаются на экране
 * вместе: наведение считается там, где выбирают (атлас и «Найти на карте»), а
 * спрошенный объект помечается там, где не выбирают («Назвать объект»).
 */
.china-map .physical-layer .relief-shape[data-selected='true'],
.china-map .physical-layer .relief-shape[data-hovered='true'],
.china-map .physical-layer .relief-shape:focus-visible {
  fill: url('#map-hatch-physical-highlight');
  stroke: var(--map-highlight);
  stroke-width: var(--map-highlight-width);
}

/*
 * У формы с исходом заливка выделения снимается. Штриховка выделения лежит на
 * самой форме, а штриховка исхода — на копии контура поверх неё, и обе
 * нарисовались бы вместе. После ответа важнее сказать «верно» или «неверно»,
 * чем «вот этот». Правило стоит после выделения: специфичность у них равная.
 */
.china-map .physical-layer .relief-shape[data-outcome] {
  fill: transparent;
}
```

- [ ] **Step 4: Одеть выделение реки**

Заменить

```css
/*
 * Толщина — второй канал у выбранной реки: одного цвета мало, а линия и есть
 * весь объект, подсветить её заливкой нечем. Наведение помечено признаком, а
 * не `:hover`: в полутора единицах ширины браузеру нечего ловить.
 */
.china-map .physical-layer .river-line[data-selected='true'],
.china-map .physical-layer .river-line[data-hovered='true'],
.china-map .physical-layer .river-line:focus-visible {
  stroke-width: var(--map-river-width-strong);
}
```

на

```css
/*
 * У выделенной реки два канала — толщина и тушь: линия и есть весь объект,
 * подсветить её заливкой нечем, а одной толщины мало, когда рядом идёт
 * вторая река той же ширины.
 *
 * Тушь, а не второй синий: тот пришлось бы заводить в палитре, и он читался
 * бы как «другая вода», а не как «вот этот объект».
 *
 * Наведение помечено признаком, а не `:hover`: в полутора единицах ширины
 * браузеру нечего ловить.
 */
.china-map .physical-layer .river-line[data-selected='true'],
.china-map .physical-layer .river-line[data-hovered='true'],
.china-map .physical-layer .river-line:focus-visible {
  stroke: var(--map-highlight);
  stroke-width: var(--map-river-width-strong);
}
```

- [ ] **Step 5: Одеть выделение озера**

Заменить

```css
.china-map .physical-layer .lake-hit:focus-visible + .lake-mark,
.china-map .physical-layer .lake-mark[data-selected='true'] {
  stroke: var(--focus-on-paper);
  stroke-width: 2;
}
```

на

```css
/*
 * Выделение озера — на обоих его узлах: контур воды обводится тушью, знак
 * получает кольцо. Одного знака мало: у Цинхая контур виден и сам, и
 * помеченным должен быть он, а не одна точка рядом.
 *
 * Кольцо исхода живёт на своём узле (`lake-halo`) и этому не мешает.
 */
.china-map .physical-layer .lake[data-selected='true'] .lake-shape,
.china-map .physical-layer .lake[data-hovered='true'] .lake-shape {
  stroke: var(--map-highlight);
  stroke-width: 1;
}

.china-map .physical-layer .lake-hit:focus-visible + .lake-mark,
.china-map .physical-layer .lake[data-selected='true'] .lake-mark,
.china-map .physical-layer .lake[data-hovered='true'] .lake-mark {
  stroke: var(--map-highlight);
  stroke-width: 2;
}
```

- [ ] **Step 6: Убедиться, что весь набор проходит**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 7: Подобрать плотность и толщину на живой карте**

Открыть превью (`preview_start` с конфигурацией `dev`), перейти в Атлас →
Физическая и навести курсор на Таримскую впадину, на Тибетское нагорье, на
Хуанхэ и на Цинхай. Снять снимок экрана каждый раз.

Смотреть на три вещи:

1. Штриховка читается как текстура, а не как заливка: полоса высоты под ней
   узнаётся. Не читается — увеличить шаг образца (`width`/`height` с 7 до 9)
   или уменьшить `strokeWidth` (с 1.2 до 1).
2. Граница формы видна на самой тёмной полосе (`--map-relief-band-4000`,
   #a8874e) и на самой светлой (`--map-relief-band-0`, #bcd493).
3. Выделенная река отличается от соседней реки без выделения.

Правки вносить в `src/map/MapDefs.tsx` и `src/design/tokens.css`, не в
`styles.css`: там значения не пишутся.

- [ ] **Step 8: Проверить, что исход не спорит с выделением**

В превью запустить «Найти на физической карте» с главной, ответить неверно и
снять снимок: у верного объекта должна быть штриховка нефритом под 45°, у
ошибочного — киноварью под −45°, и ни у того ни у другого не должно быть
вертикальной штриховки выделения.

- [ ] **Step 9: Закоммитить**

```bash
git add src/styles.css src/map/ChinaMap.test.tsx src/map/MapDefs.tsx src/design/tokens.css
git commit -m "$(printf 'feat: один словарь выделения на физической карте\n\nТушь на всех трёх видах объектов: у формы граница и штриховка, у реки\nтолщина и тушь, у озера контур и кольцо. Порядок трёх состояний задан\nявно: выделение, исход, фокус. У формы с исходом заливка выделения\nснимается — иначе две штриховки легли бы друг на друга.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 4: Документы

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `DECISIONS.md`
- Modify: `MAP_SPEC.md`

**Interfaces:** ничего не потребляет и не производит.

- [ ] **Step 1: Записать решение**

Дописать в `DECISIONS.md` первой строкой таблицы:

```
| 2026-08-27 | Выделение объекта на физической карте — один словарь, тушью | Решение владельца: «подсветка только рек и озёр, а подсветка крупных блоков по типу Таримской впадины [нет]; хочется делать подсветку по наведению, чтобы ты понимал точно, что выбираешь». Форма получает границу 2.5 и вертикальную штриховку тушью, река — толщину и тушь, озеро — контур и кольцо. Тушью, а не цветом: цветовой канал занят семью полосами высот, а второй синий ради воды читался бы как «другая вода». Наведение и выбор не встречаются вместе — в «Назвать объект» карта неинтерактивна и наведение не считается, — поэтому словарь один. Наведение работает и в раунде (решение владельца «везде»); принятая цена: в «Найти на карте» подсвечиваются только 12 спрашиваемых форм, и цель можно найти перебором курсора, не зная имени. Имя при этом не утекает — подписи в игре скрыты. |
```

- [ ] **Step 2: Записать изменение**

Дописать в `CHANGELOG.md` первым пунктом раздела `### Added` внутри
`## [Unreleased]`:

```
- Один словарь выделения на физической карте: под курсором, в фокусе и у
  спрошенного объекта форма рельефа получает границу тушью и вертикальную
  штриховку, река — толщину и тушь, озеро — обведённый контур и кольцо у
  знака. Прежде крупные формы не помечались вовсе, а подсветка спрошенного
  объекта в «Назвать объект» была штрихом в 1.1 px, хотя подсказка режима
  спрашивает «Какой объект подсвечен».
```

- [ ] **Step 3: Записать в спецификацию карты**

В `MAP_SPEC.md` в разделе «Визуальные состояния» дописать абзацем:

```
На физическом виде выделение объекта — что под курсором, что в фокусе, что спрошено — одно и то же и всегда тушью: у формы рельефа граница и вертикальная штриховка поверх её полосы высоты, у реки толщина и тушь, у озера обведённый контур и кольцо у знака. Цветом выделять нельзя: цветовой канал занят семью полосами высот. Три состояния объекта — выделение, исход, фокус — различаются наклоном штриховки (вертикальная, 45°, −45°) и порядком правил: исход побеждает выделение, фокус побеждает исход.
```

- [ ] **Step 4: Полная проверка**

```bash
npm run lint && npm test && npm run build
```

Expected: линтер без замечаний; `Test Files … passed`, `Tests … passed`;
`✓ built in …`.

- [ ] **Step 5: Ручная проверка основного сценария**

Открыть превью и пройти: Атлас → Физическая → провести курсором по
Таримской впадине, Тибетскому нагорью, Хуанхэ и Цинхаю → нажать по каждому и
убедиться, что карточка называет ровно то, что было помечено. Затем главная →
«Режимы» → «Назвать объект» → убедиться, что спрошенный объект виден сразу, без
поиска глазами.

- [ ] **Step 6: Закоммитить**

```bash
git add CHANGELOG.md DECISIONS.md MAP_SPEC.md
git commit -m "$(printf 'docs: словарь выделения объекта на физической карте\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Самопроверка плана

**Покрытие спецификации.** Словарь выделения — задачи 1 и 3; признак наведения
у формы и озера — задача 2; порядок трёх состояний и подавление заливки у формы
с исходом — задача 3; пара «тушь на полосах» в проверке контраста — задача 1;
принятая цена и решение — задача 4. Исход после ответа не трогается нигде, как
и сказано в спецификации.

**Заглушек нет.** Каждый шаг, меняющий код, показывает код целиком. Шаги 7 и 8
задачи 3 — подбор на глаз, и у них названы и предмет наблюдения, и куда вносить
правку, и в каких границах (шаг образца 7 → 9, толщина штриха 1.2 → 1).

**Согласованность имён.** `--map-highlight` и `--map-highlight-width` заводятся
в задаче 1 и используются в задаче 3. `map-hatch-physical-highlight` заводится
в задаче 1 и упоминается в `styles.css` литералом — как и все прочие образцы,
импортировать их оттуда нельзя. `data-hovered` у формы и `data-hovered` у
группы `.lake` заводятся в задаче 2 и одеваются в задаче 3.

**Известный риск.** Шаг 5 задачи 2 переносит `data-selected` со знака озера на
группу. Если на этот признак опирается существующий тест, он упадёт — шаг это
оговаривает и называет исправление.
