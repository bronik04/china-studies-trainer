# Лента династий: цвет, исход, ответ по ленте — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Лента перестаёт врать цветом (при верном ответе она красит полосу киноварью) и становится вторым способом ответить; на этой механике появляется зеркальная игра «Кто правил в этом году».

**Architecture:** `DynastyTimeline` меняет признак `highlightedId` на список меток с исходом (`correct` / `wrong`) и получает необязательный `onAnswer`. Пока колбэка нет, лента остаётся картинкой с `aria-hidden` — ровно как сейчас; с колбэком полосы становятся кнопками, названными **сроком, а не именем династии**. Узкие полосы получают невидимую цель нажатия в 44 px, разведённую с соседями, — тот же приём, что у точек городов, только в одном измерении. Новая игра живёт в том же `HistoryRound` под признаком `kind`, потому что раунд, цель, отвлекающие и лента у неё те же; отличаются вопрос и подписи вариантов.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library. Новых зависимостей нет.

**Область.** Это **шаг 1 из трёх** в `docs/superpowers/specs/2026-08-28-dynasty-modes-design.md` — разделы 1, 2, 3 и 4 спека. Шаг 2 (справочники столиц и правителей, две игры) и шаг 3 («расставить по порядку», пять групп режимов) пойдут своими планами: у них своё содержание и свои источники, а этот шаг обязан лечь первым — на его механику опираются оба.

**Решения владельца продукта, принятые для этого плана (2026-08-28).**

- Верный ответ — нефрит, ошибочный — киноварь.
- Лента становится вторым способом ответить, кнопки вариантов остаются.
- Игра «Кто правил в этом году» входит в набор.
- Иероглиф-метка новой карточки — **年**. Знак уже встречается в `src`, `npm run generate:fonts` не нужен.

## Global Constraints

- Интерфейс, задания, подписи и ошибки — на русском; китайские названия в Unicode, не только пиньинем.
- Смысл не несёт один только цвет: верная полоса обведена сплошной тушью и подписана, ошибочная — пунктиром и названа строкой разбора (`DESIGN_SYSTEM.md`, спек §2).
- Цвета, размеры и длительности берутся только из `src/design/tokens.css`; компоненты не пишут значения напрямую.
- Порог контраста графики — 3:1 по WCAG 2.2; пары проверяет `scripts/validate-tokens.test.ts`.
- Цель нажатия — 44 px (`--target-min`).
- Имя интерактивной полосы для клавиатуры и читалки экрана — **срок** («206 до н. э. — 220»), никогда не имя династии: имя и есть ответ.
- Домен не вызывает `Math.random`: генератор передаётся снаружи (`createSeededRandom`, mulberry32). Сид создаётся в `App.tsx`.
- Во время раунда сетевых запросов нет.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. Каждая задача заканчивается коммитом. Ветка — `feat/dynasty-modes` (уже создана, в ней лежит спек).

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/design/tokens.css` | примитив `--c-ink-300`; токены полосы и исхода |
| `scripts/validate-tokens.test.ts` | контракт: тушь вместо сланца, обе заливки исхода, обводка |
| `src/features/exercise/DynastyTimeline.tsx` | метки исхода, кнопки-полосы, подпись под лентой |
| `src/features/exercise/DynastyTimeline.test.tsx` | **новый**: поведение ленты отдельно от раунда |
| `src/features/exercise/timeline-hit.ts` | **новый**: цели нажатия — чистая функция |
| `src/features/exercise/timeline-hit.test.ts` | **новый**: тесты целей нажатия |
| `src/domain/dynasty-years.ts` | **новый**: годы, у которых ровно один ответ |
| `src/domain/dynasty-years.test.ts` | **новый** |
| `src/features/exercise/HistoryRound.tsx` | метки по исходу, ответ по ленте, две игры под признаком `kind` |
| `src/features/exercise/exercise-modes.ts` | `HISTORY_YEAR_MODE`, карточка 年 |
| `src/App.tsx` | запуск игры по годам, повтор ошибок в той же игре |
| `src/styles.css` | заливки исхода, кнопки-полосы, строка под лентой |
| `DECISIONS.md`, `CHANGELOG.md`, `EXERCISES.md` | запись решения и изменения |

---

### Task 1: Тон полос — тушь вместо сланца

**Files:**
- Modify: `src/design/tokens.css`
- Test: `scripts/validate-tokens.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: примитив `--c-ink-300: #78736a`; `--timeline-span` указывает на него.

- [ ] **Step 1: Написать падающий тест**

В `scripts/validate-tokens.test.ts`, в блок `describe` с проверками ленты (рядом с тестом «полосы ленты династий видны на бумаге»), добавить:

```ts
  /*
   * Полоса набрана тушью, а не сланцем: холодный серо-зелёный был
   * единственным местом в проекте, где чужой листу тон занимал такую площадь.
   * Сила выбрана по контрасту, а не на глаз: тушь в 55 % даёт 3.94 к бумаге,
   * в 45 % — 2.94, то есть порога графики не проходит.
   */
  it('полосы ленты набраны тушью, а не сланцем', () => {
    expect(color('--timeline-span')).toBe(color('--c-ink-300'));
  });
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run scripts/validate-tokens.test.ts -t 'тушью'`
Expected: FAIL — `--c-ink-300` в файле нет, `resolve` бросает «Неизвестный токен» либо сравнение даёт `#6c7c79`.

- [ ] **Step 3: Добавить примитив**

В `src/design/tokens.css`, в семейство туши (рядом с `--c-ink-500`):

```css
  /*
   * Тушь вполсилы — 55 % чёрного по бумаге. Не декоративный тон: это тот же
   * цвет, что у линий и подписей листа, только слабее, и лента перестаёт быть
   * отдельным цветом на экране.
   *
   * Сила задана контрастом, а не глазом: 3.94 к бумаге при пороге 3. Первая
   * проба в 30 % давала 1.95, в 45 % — 2.94; обе завалили бы проверку токенов.
   */
  --c-ink-300: #78736a;
```

- [ ] **Step 4: Перевести полосу на тушь**

В том же файле заменить объявление и переписать комментарий над ним:

```css
  /*
   * Лента печатается на бумаге, и полоса — значимая графика: по её длине и
   * месту ученик читает время. Отсюда порог 3:1.
   *
   * Прежде здесь стоял сланец (`--c-slate-500`, 3.66 к бумаге) — холодный
   * серо-зелёный, единственный в проекте занимавший такую площадь на тёплом
   * листе. Решение владельца продукта (DECISIONS.md, 2026-08-28): тушь
   * вполсилы, 3.94.
   */
  --timeline-span: var(--c-ink-300);
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS, включая прежний тест «полосы ленты династий видны на бумаге».

- [ ] **Step 6: Коммит**

```bash
git add src/design/tokens.css scripts/validate-tokens.test.ts
git commit -m "style: полосы ленты династий набраны тушью, а не сланцем"
```

---

### Task 2: Исход на ленте знает, верно ли ответили

**Files:**
- Modify: `src/design/tokens.css`
- Modify: `src/features/exercise/DynastyTimeline.tsx`
- Modify: `src/features/exercise/HistoryRound.tsx`
- Modify: `src/styles.css`
- Test: `scripts/validate-tokens.test.ts`
- Test: `src/features/exercise/DynastyTimeline.test.tsx` (создать)
- Test: `src/features/exercise/HistoryRound.test.tsx`

**Interfaces:**
- Consumes: `--c-ink-300` из задачи 1.
- Produces:
  ```ts
  export type TimelineMark = {
    readonly dynastyId: string;
    readonly kind: 'correct' | 'wrong';
  };

  export type DynastyTimelineProps = {
    readonly dynasties: readonly Dynasty[];
    readonly marks?: readonly TimelineMark[];
    readonly showsNames: boolean;
  };
  ```
  Токены `--timeline-span-correct`, `--timeline-span-wrong`; `--timeline-span-current` исчезает.

- [ ] **Step 1: Написать падающий тест компонента**

Создать `src/features/exercise/DynastyTimeline.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { dynasties } from '../../content/dynasties';
import { DynastyTimeline } from './DynastyTimeline';

/** Полоса династии: у неё нет доступного имени, пока лента не отвечает. */
function spanOf(dynastyId: string): HTMLElement {
  const span = document.querySelector(`[data-dynasty-id='${dynastyId}']`);
  if (span === null) {
    throw new Error(`На ленте нет полосы ${dynastyId}`);
  }

  return span as HTMLElement;
}

it('верный ответ помечает полосу нефритом, а не киноварью', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'correct' }]}
      showsNames
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('correct');
});

/*
 * При ошибке видно и верный срок, и величину промаха: выбранная полоса
 * помечена рядом с верной, и расстояние между ними — это и есть промах.
 */
it('при ошибке помечены обе полосы: верная и выбранная', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[
        { dynastyId: 'tang', kind: 'correct' },
        { dynastyId: 'song', kind: 'wrong' },
      ]}
      showsNames
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('correct');
  expect(spanOf('song').dataset.mark).toBe('wrong');
});

it('без меток лента молчит и скрыта от читалки экрана', () => {
  const { container } = render(
    <DynastyTimeline dynasties={dynasties} showsNames={false} />,
  );

  expect(container.querySelector('[data-mark]')).toBeNull();
  expect(screen.queryByText('Тан')).toBeNull();
  expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx`
Expected: FAIL — у компонента нет признака `marks`, у полос нет `data-dynasty-id` и `data-mark`; TypeScript ругается на неизвестное свойство.

- [ ] **Step 3: Заменить признак в компоненте**

В `src/features/exercise/DynastyTimeline.tsx` заменить объявление признаков:

```tsx
/**
 * Помеченная полоса. Метка несёт исход, а не факт «о ней спрашивали»: прежде
 * лента красила спрошенную киноварью при любом ответе, и верный ответ читался
 * как ошибка (решение владельца продукта, DECISIONS.md, 2026-08-28).
 */
export type TimelineMark = {
  readonly dynastyId: string;
  readonly kind: 'correct' | 'wrong';
};

export type DynastyTimelineProps = {
  readonly dynasties: readonly Dynasty[];
  /**
   * Верный ответ — одна метка. Ошибка — две: верная полоса и выбранная, и
   * расстояние между ними показывает величину промаха.
   */
  readonly marks?: readonly TimelineMark[];
  /**
   * Показывать ли имена. В вопросе лента молчит — иначе она и есть ответ; имя
   * появляется вместе с разбором.
   */
  readonly showsNames: boolean;
};
```

В теле компонента заменить сигнатуру и завести поиск метки:

```tsx
export function DynastyTimeline({
  dynasties,
  marks = [],
  showsNames,
}: DynastyTimelineProps) {
  const span = TIMELINE_TO - TIMELINE_FROM;
  const shareOf = (year: number) => (year - TIMELINE_FROM) / span;
  const markOf = (dynastyId: string) =>
    marks.find((mark) => mark.dynastyId === dynastyId)?.kind;
```

- [ ] **Step 4: Перевести полосы и подписи на метки**

Полосы (`.timeline-band`):

```tsx
      <div className="timeline-band">
        {dynasties.map((dynasty) => {
          const left = shareOf(dynasty.from);
          const width = shareOf(dynasty.to) - left;

          return (
            <div
              key={dynasty.id}
              className="timeline-span"
              data-dynasty-id={dynasty.id}
              data-mark={markOf(dynasty.id)}
              style={{ left: percent(left), width: percent(width) }}
            />
          );
        })}
      </div>
```

Подписи (`.timeline-names`): выделенная подпись со сроком — только у верной полосы; ошибочную называет строка разбора.

```tsx
      <div className="timeline-names">
        {dynasties.map((dynasty) => {
          const left = shareOf(dynasty.from);
          const width = shareOf(dynasty.to) - left;
          const mark = markOf(dynasty.id);
          const isAnswer = mark === 'correct';
          /*
           * Имя ставится там, где помещается, — либо у верной династии, где бы
           * она ни была. У Цинь полоса в четырнадцать лет: подпись под ней
           * налезла бы на соседей, и вместо ленты вышла бы каша.
           */
          if (!showsNames || (!isAnswer && width < LABEL_MIN_SHARE)) {
            return null;
          }

          return (
            <span
              key={dynasty.id}
              className="timeline-name"
              data-mark={isAnswer ? 'correct' : undefined}
              style={{ left: percent(left + width / 2) }}
            >
              {dynasty.nameRu}
              {isAnswer ? (
                <span className="timeline-name-years">{spanLabel(dynasty)}</span>
              ) : null}
            </span>
          );
        })}
      </div>
```

- [ ] **Step 5: Токены исхода**

В `src/design/tokens.css` заменить `--timeline-span-current` на два токена и переписать комментарий:

```css
  /*
   * Исход на ленте. Нефрит взят тот же, что у освоенного региона на карте:
   * глубокий `--c-jade-700` не годится — обводка тушью даёт к нему 2.17 и
   * пропадает, а полоса тогда опознавалась бы одним цветом.
   *
   * Одним цветом исход и не опознаётся: верная полоса обведена сплошной
   * тушью и подписана, ошибочная — пунктиром и названа строкой разбора.
   */
  --timeline-span-correct: var(--c-jade-500);
  --timeline-span-wrong: var(--c-cinnabar-600);
  --timeline-span-outline: var(--c-ink-900);
```

- [ ] **Step 6: Обновить контракт палитры**

В `scripts/validate-tokens.test.ts` заменить два теста ленты:

```ts
  it('полосы ленты династий видны на бумаге', () => {
    expectAtLeast('--timeline-span', '--surface-paper', GRAPHIC_CONTRAST);
    expectAtLeast('--timeline-span-correct', '--surface-paper', GRAPHIC_CONTRAST);
    expectAtLeast('--timeline-span-wrong', '--surface-paper', GRAPHIC_CONTRAST);
  });

  /*
   * Помеченная полоса не должна опознаваться одним цветом: заливки исхода и
   * тушь-полоса различаются между собой слабо. Различает их обводка — она
   * обязана быть видна и на самой полосе, и на соседних.
   */
  it('обводка помеченной полосы видна на обеих заливках исхода', () => {
    expectAtLeast('--timeline-span-outline', '--timeline-span-correct', GRAPHIC_CONTRAST);
    expectAtLeast('--timeline-span-outline', '--timeline-span-wrong', GRAPHIC_CONTRAST);
    expectAtLeast('--timeline-span-outline', '--timeline-span', GRAPHIC_CONTRAST);
  });
```

- [ ] **Step 7: Стили**

В `src/styles.css` заменить правило `.timeline-span[data-highlighted='true']` на два и обновить подпись:

```css
.timeline-span[data-mark='correct'] {
  background: var(--timeline-span-correct);
  box-shadow: 0 0 0 2px var(--timeline-span-outline);
  z-index: 1;
}

/*
 * Ошибочная — пунктиром: исход не передаётся одним цветом, и штрих здесь тот
 * же, что у ошибочной кнопки варианта.
 */
.timeline-span[data-mark='wrong'] {
  background: var(--timeline-span-wrong);
  outline: 2px dashed var(--timeline-span-outline);
  outline-offset: -1px;
  z-index: 1;
}
```

и в правиле подписи заменить селектор `.timeline-name[data-highlighted='true']` на `.timeline-name[data-mark='correct']`.

- [ ] **Step 8: Прогнать тесты компонента и палитры**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx scripts/validate-tokens.test.ts`
Expected: PASS.

- [ ] **Step 9: Написать падающий тест раунда**

В `src/features/exercise/HistoryRound.test.tsx` добавить:

```tsx
/*
 * Прежде лента красила спрошенную полосу киноварью при любом ответе, и верный
 * ответ читался как ошибка. Теперь метка несёт исход.
 */
it('верный ответ помечает полосу верной, а не ошибочной', () => {
  renderRound();

  const target = askedDynasty();
  fireEvent.click(choiceWith(spanLabel(target)));

  const span = document.querySelector(`[data-dynasty-id='${target.id}']`);
  expect((span as HTMLElement).dataset.mark).toBe('correct');
});

it('ошибка помечает и выбранную полосу, и верную', () => {
  renderRound();

  const target = askedDynasty();
  const wrong = dynasties.find((dynasty) => dynasty.id !== target.id)!;
  const wrongChoice = screen
    .getAllByTestId('choice-option')
    .find((item) => item.textContent?.includes(spanLabel(wrong)));

  if (wrongChoice === undefined) {
    /* Отвлекающие берутся по соседству: если этой династии среди них нет,
       берём первую попавшуюся ошибочную кнопку. */
    const other = screen
      .getAllByTestId('choice-option')
      .find((item) => !item.textContent?.includes(spanLabel(target)))!;
    fireEvent.click(other);
  } else {
    fireEvent.click(wrongChoice);
  }

  const marks = [...document.querySelectorAll('[data-mark]')].map(
    (node) => (node as HTMLElement).dataset.mark,
  );

  expect(marks).toContain('correct');
  expect(marks).toContain('wrong');
});
```

- [ ] **Step 10: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/HistoryRound.test.tsx -t 'помечает'`
Expected: FAIL — `HistoryRound` всё ещё передаёт `highlightedId`, `data-mark` нет.

- [ ] **Step 11: Считать метки в раунде**

В `src/features/exercise/HistoryRound.tsx` заменить вызов ленты. Рядом с `showsAnswer` добавить:

```tsx
  /*
   * Метки ленты. При верном ответе одна: верная полоса. При ошибке две —
   * верная и выбранная; расстояние между ними и есть величина промаха, и
   * увидеть его на ленте важнее, чем прочитать «неверно».
   */
  const marks: readonly TimelineMark[] =
    round.status !== 'feedback' || answeredId === null
      ? []
      : answeredId === target.id
        ? [{ dynastyId: target.id, kind: 'correct' }]
        : [
            { dynastyId: target.id, kind: 'correct' },
            { dynastyId: answeredId, kind: 'wrong' },
          ];
```

Импорт: `import { DynastyTimeline, type TimelineMark } from './DynastyTimeline';`

Разметку ленты заменить на:

```tsx
        <DynastyTimeline
          dynasties={allDynasties}
          marks={marks}
          showsNames={round.status === 'feedback'}
        />
```

- [ ] **Step 12: Назвать выбранную полосу словами**

Там же, в разборе под лентой, заменить `<p className="history-note">{target.note}</p>` на:

```tsx
        {round.status === 'feedback' ? (
          <p className="history-note">
            {answeredId !== null && answeredId !== target.id ? (
              <>
                Вы показали{' '}
                {allDynasties.find((dynasty) => dynasty.id === answeredId)?.nameRu}
                {' — '}
                {spanLabel(
                  allDynasties.find((dynasty) => dynasty.id === answeredId)!,
                )}
                .{' '}
              </>
            ) : null}
            {target.note}
          </p>
        ) : (
          <p className="history-hint">
            Полоса показывает четыре тысячи лет: длина каждой династии — её
            настоящий срок.
          </p>
        )}
```

- [ ] **Step 13: Прогнать весь набор**

Run: `npm test`
Expected: PASS. Прежние тесты `HistoryRound` про подпись спрошенной династии остаются зелёными: подпись со сроком по-прежнему у верной полосы.

- [ ] **Step 14: Коммит**

```bash
git add src/design/tokens.css src/styles.css scripts/validate-tokens.test.ts src/features/exercise/DynastyTimeline.tsx src/features/exercise/DynastyTimeline.test.tsx src/features/exercise/HistoryRound.tsx src/features/exercise/HistoryRound.test.tsx
git commit -m "feat: исход на ленте династий — нефрит при верном ответе, киноварь при ошибке"
```

---

### Task 3: Цели нажатия у узких полос

**Files:**
- Create: `src/features/exercise/timeline-hit.ts`
- Test: `src/features/exercise/timeline-hit.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  ```ts
  export type TimelineSpan = { readonly id: string; readonly left: number; readonly width: number };
  export function hitAreas(
    spans: readonly TimelineSpan[],
    minShare: number,
  ): readonly TimelineSpan[];
  export function minHitShare(widthPx: number, count: number): number;
  ```
  Доли, а не пиксели: лента резиновая, и разводка обязана считаться в той же системе, в какой полосы нарисованы.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/exercise/timeline-hit.test.ts`:

```ts
import { expect, it } from 'vitest';
import { hitAreas, minHitShare, type TimelineSpan } from './timeline-hit';

const SPANS: readonly TimelineSpan[] = [
  { id: 'a', left: 0, width: 0.4 },
  /* Полоса Цинь: четырнадцать лет из четырёх тысяч. */
  { id: 'b', left: 0.4, width: 0.004 },
  { id: 'c', left: 0.404, width: 0.3 },
];

it('узкая полоса получает цель не меньше порога', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits.find((hit) => hit.id === 'b')!.width).toBeGreaterThanOrEqual(0.05);
});

it('цели не накладываются и идут в том же порядке', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits.map((hit) => hit.id)).toEqual(['a', 'b', 'c']);
  for (let index = 1; index < hits.length; index += 1) {
    expect(hits[index].left).toBeGreaterThanOrEqual(
      hits[index - 1].left + hits[index - 1].width - 1e-9,
    );
  }
});

it('цели не выходят за ленту', () => {
  const hits = hitAreas(SPANS, 0.05);

  expect(hits[0].left).toBeGreaterThanOrEqual(0);
  expect(hits.at(-1)!.left + hits.at(-1)!.width).toBeLessThanOrEqual(1 + 1e-9);
});

/*
 * На узком экране двенадцать целей по 44 px не помещаются — тогда порог
 * опускается до равной доли, а гарантированным путём остаются кнопки
 * вариантов. Обещать 44 px там, где их нет, значило бы соврать в проверке.
 */
it('порог опускается, когда 44 px на всех не хватает', () => {
  expect(minHitShare(1024, 12)).toBeCloseTo(44 / 1024, 5);
  expect(minHitShare(375, 12)).toBeCloseTo(1 / 12, 5);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/timeline-hit.test.ts`
Expected: FAIL — модуля `timeline-hit` нет.

- [ ] **Step 3: Написать модуль**

Создать `src/features/exercise/timeline-hit.ts`:

```ts
/**
 * Цели нажатия для полос ленты.
 *
 * Полоса Цинь — четырнадцать лет из четырёх тысяч: на ленте шириной 1024 px
 * это 3.6 px, а правило проекта — 44 px (`--target-min`). Поэтому цель
 * отделена от полосы: полоса остаётся нарисованной честно, цель расширяется и
 * разъезжается с соседями. Тот же приём, что у точек городов на карте, только
 * в одном измерении, и потому разводка здесь сходится всегда: цели идут слева
 * направо и не могут обогнать друг друга.
 */
export type TimelineSpan = {
  readonly id: string;
  /** Доля ширины ленты: 0 — левый край, 1 — правый. */
  readonly left: number;
  readonly width: number;
};

/**
 * Порог в долях ширины. Когда 44 px на всех не хватает — а на 375 px их надо
 * 528 при ленте в 375, — порог опускается до равной доли: обещать недостижимое
 * нельзя, а гарантированный путь к ответу и так есть, это кнопки вариантов.
 */
export function minHitShare(widthPx: number, count: number): number {
  return Math.min(44 / widthPx, 1 / count);
}

export function hitAreas(
  spans: readonly TimelineSpan[],
  minShare: number,
): readonly TimelineSpan[] {
  const hits: TimelineSpan[] = [];
  let cursor = 0;

  /* Проход слева направо: цель не начинается раньше конца предыдущей. */
  for (const [index, span] of spans.entries()) {
    const width = Math.max(span.width, minShare);
    const wanted = span.left + span.width / 2 - width / 2;
    /* Сколько места обязаны оставить тем, кто правее. */
    const tailShare = spans
      .slice(index + 1)
      .reduce((sum, next) => sum + Math.max(next.width, minShare), 0);
    const left = Math.min(Math.max(wanted, cursor), 1 - tailShare - width);

    hits.push({ id: span.id, left, width });
    cursor = left + width;
  }

  return hits;
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/features/exercise/timeline-hit.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Проверить на настоящей ленте**

Добавить в тот же файл проверку на настоящем справочнике:

```ts
import { dynasties, TIMELINE_FROM, TIMELINE_TO } from '../../content/dynasties';

/* Настоящая лента: двенадцать полос, две из них короче полупроцента. */
it('на настоящей ленте все двенадцать целей достигают 44 px при 1024 px', () => {
  const span = TIMELINE_TO - TIMELINE_FROM;
  const spans = dynasties.map((dynasty) => ({
    id: dynasty.id,
    left: (dynasty.from - TIMELINE_FROM) / span,
    width: (dynasty.to - dynasty.from) / span,
  }));

  const minShare = minHitShare(1024, spans.length);
  const hits = hitAreas(spans, minShare);

  expect(minShare).toBeCloseTo(44 / 1024, 5);
  for (const hit of hits) {
    expect(hit.width * 1024).toBeGreaterThanOrEqual(44 - 1e-6);
  }
});
```

Run: `npx vitest run src/features/exercise/timeline-hit.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/timeline-hit.ts src/features/exercise/timeline-hit.test.ts
git commit -m "feat: цели нажатия для полос ленты — 44 px с разводкой"
```

---

### Task 4: Лента отвечает нажатием

**Files:**
- Modify: `src/features/exercise/DynastyTimeline.tsx`
- Modify: `src/features/exercise/HistoryRound.tsx`
- Modify: `src/styles.css`
- Test: `src/features/exercise/DynastyTimeline.test.tsx`
- Test: `src/features/exercise/HistoryRound.test.tsx`

**Interfaces:**
- Consumes: `hitAreas`, `minHitShare` из задачи 3; `TimelineMark` из задачи 2.
- Produces: у `DynastyTimelineProps` появляются
  ```ts
  readonly onAnswer?: (dynastyId: string) => void;
  readonly hint?: ReactNode;
  ```
  Пока `onAnswer` нет, лента остаётся `aria-hidden` картинкой.

- [ ] **Step 1: Написать падающий тест**

В `src/features/exercise/DynastyTimeline.test.tsx` добавить:

```tsx
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { spanLabel } from '../../content/dynasties';

/*
 * Полоса называется сроком, а не именем: имя династии и есть ответ, и назвать
 * его читалке экрана значило бы отдать ответ тому, кто не видит ленты. Тот же
 * довод, что у скрытых подписей городов и выносок Макао.
 */
it('полоса названа сроком, а не именем династии', () => {
  const onAnswer = vi.fn();
  render(
    <DynastyTimeline dynasties={dynasties} showsNames={false} onAnswer={onAnswer} />,
  );

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;

  expect(screen.getByRole('button', { name: spanLabel(tang) })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Тан/ })).toBeNull();
});

it('нажатие по полосе отвечает', () => {
  const onAnswer = vi.fn();
  render(
    <DynastyTimeline dynasties={dynasties} showsNames={false} onAnswer={onAnswer} />,
  );

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;
  fireEvent.click(screen.getByRole('button', { name: spanLabel(tang) }));

  expect(onAnswer).toHaveBeenCalledWith('tang');
});

it('без колбэка полос-кнопок нет', () => {
  render(<DynastyTimeline dynasties={dynasties} showsNames={false} />);

  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx -t 'полоса названа'`
Expected: FAIL — кнопок на ленте нет.

- [ ] **Step 3: Мерить ширину ленты**

В `src/features/exercise/DynastyTimeline.tsx` добавить измерение (лента резиновая, порог целей считается от настоящей ширины):

```tsx
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { hitAreas, minHitShare } from './timeline-hit';

/**
 * Ширина ленты в пикселях. Нужна одному — порогу целей нажатия: 44 px на
 * узком экране не помещаются двенадцать раз, и порог обязан это знать.
 * `ResizeObserver`, а не разовый замер: ленту тянет ширина кадра.
 */
function useRibbonWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const apply = () => setWidth(node.getBoundingClientRect().width);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
```

- [ ] **Step 4: Сделать полосы кнопками**

В том же файле: принять новые признаки и нарисовать слой целей поверх полос.

```tsx
export type DynastyTimelineProps = {
  readonly dynasties: readonly Dynasty[];
  readonly marks?: readonly TimelineMark[];
  readonly showsNames: boolean;
  /**
   * Ответ нажатием по ленте. Пока его нет, лента — картинка: она ничего не
   * делает, и читалке экрана о ней говорить нечего.
   */
  readonly onAnswer?: (dynastyId: string) => void;
  /** Строка под лентой. Наведение на полосу подменяет её сроком. */
  readonly hint?: ReactNode;
};
```

В теле:

```tsx
  const [ribbonRef, ribbonWidth] = useRibbonWidth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const answers = onAnswer !== undefined;

  const hits =
    !answers || ribbonWidth === 0
      ? []
      : hitAreas(
          dynasties.map((dynasty) => ({
            id: dynasty.id,
            left: shareOf(dynasty.from),
            width: shareOf(dynasty.to) - shareOf(dynasty.from),
          })),
          minHitShare(ribbonWidth, dynasties.length),
        );

  const hovered = dynasties.find((dynasty) => dynasty.id === hoveredId);
```

Корень: `aria-hidden` только пока лента не отвечает.

```tsx
    <div
      className="dynasty-timeline"
      ref={ribbonRef}
      aria-hidden={answers ? undefined : true}
    >
```

Слой целей ставится **внутрь** `.timeline-band` — она уже
`position: relative`, и цели совпадут с полосами без вычисления отступа под
шкалой:

```tsx
      {answers ? (
        <div className="timeline-hits">
          {hits.map((hit) => {
            const dynasty = dynasties.find((item) => item.id === hit.id)!;

            return (
              <button
                key={hit.id}
                type="button"
                className="timeline-hit"
                data-dynasty-id={hit.id}
                style={{ left: percent(hit.left), width: percent(hit.width) }}
                onPointerEnter={() => setHoveredId(hit.id)}
                onPointerLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(hit.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => onAnswer?.(hit.id)}
              >
                {/* Имя кнопки — срок: имя династии и есть ответ. */}
                <span className="visually-hidden">{spanLabel(dynasty)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
```

Наведённая полоса подсвечивается через ту же метку, что и исход:

```tsx
              data-mark={markOf(dynasty.id) ?? (hoveredId === dynasty.id ? 'hover' : undefined)}
```

Строка под лентой — последней в компоненте:

```tsx
      {hint === undefined && hovered === undefined ? null : (
        <div className="timeline-hint">
          {hovered === undefined ? (
            hint
          ) : (
            <p className="history-hint">
              {spanLabel(hovered)} · нажмите, чтобы ответить
            </p>
          )}
        </div>
      )}
```

- [ ] **Step 5: Стили целей и наведения**

В `src/styles.css` добавить рядом с правилами ленты:

```css
/*
 * Слой целей нажатия. Цели прозрачны и лежат поверх полос внутри самой ленты:
 * полоса нарисована честно, по годам, а нажимать её надо пальцем — 44 px
 * против 3.6 px у Цинь.
 */
.timeline-hits {
  inset: 0;
  position: absolute;
  z-index: 2;
}

.timeline-hit {
  background: none;
  block-size: 100%;
  border: 0;
  cursor: pointer;
  inset-block-start: 0;
  padding: 0;
  position: absolute;
}

.timeline-hit:focus-visible {
  outline: var(--border-focus) solid var(--focus-on-paper);
  outline-offset: calc(-1 * var(--border-focus));
}

/* Наведение и фокус: полоса светлеет, обводка киноварью. */
.timeline-span[data-mark='hover'] {
  background: var(--surface-paper-bright);
  box-shadow: 0 0 0 2px var(--accent);
  z-index: 1;
}
```

Токены взяты существующие: `--border-focus` (3px) и `--focus-on-paper` — те
же, что у фокуса на всех бумажных поверхностях; `--accent` — киноварь.
Отступ фокуса внутрь, а не наружу: цели стоят вплотную друг к другу, и кольцо
наружу перекрыло бы соседнюю.

- [ ] **Step 6: Раунд передаёт колбэк**

В `src/features/exercise/HistoryRound.tsx`:

```tsx
        <DynastyTimeline
          dynasties={allDynasties}
          marks={marks}
          showsNames={round.status === 'feedback'}
          onAnswer={round.status === 'ready' ? answer : undefined}
          hint={
            round.status === 'feedback' ? (
              <p className="history-note">
                {answeredId !== null && answeredId !== target.id ? (
                  <>
                    Вы показали{' '}
                    {
                      allDynasties.find((dynasty) => dynasty.id === answeredId)
                        ?.nameRu
                    }
                    {' — '}
                    {spanLabel(
                      allDynasties.find((dynasty) => dynasty.id === answeredId)!,
                    )}
                    .{' '}
                  </>
                ) : null}
                {target.note}
              </p>
            ) : (
              <p className="history-hint">
                Нажмите по ленте или выберите срок ниже.
              </p>
            )
          }
        />
```

Разбор и подсказка переезжают внутрь `hint`, поэтому прежний блок `{round.status === 'feedback' ? … : …}` из `.history-stage` убирается — иначе текст будет в двух местах.

- [ ] **Step 7: Тест раунда**

В `src/features/exercise/HistoryRound.test.tsx` добавить:

```tsx
it('на вопрос можно ответить нажатием по ленте', () => {
  renderRound();

  const target = askedDynasty();
  fireEvent.click(screen.getByRole('button', { name: spanLabel(target) }));

  const span = document.querySelector(`[data-dynasty-id='${target.id}']`);
  expect((span as HTMLElement).dataset.mark).toBe('correct');
});
```

- [ ] **Step 8: Прогнать весь набор**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Проверить в браузере**

Открыть предпросмотр (`preview_start` с именем `dev`), запустить «Династии и даты», навести на полосу, ответить нажатием, пройти вопрос с ошибкой. Убедиться: подпись под лентой меняется на срок при наведении; полоса под курсором светлеет; `Tab` обходит полосы и называет сроки; после верного ответа полоса нефритовая, после ошибки — две полосы.

- [ ] **Step 10: Коммит**

```bash
git add src/features/exercise/DynastyTimeline.tsx src/features/exercise/DynastyTimeline.test.tsx src/features/exercise/HistoryRound.tsx src/features/exercise/HistoryRound.test.tsx src/styles.css
git commit -m "feat: на ленте династий отвечают нажатием, полоса названа сроком"
```

---

### Task 5: Годы, у которых ровно один ответ

**Files:**
- Create: `src/domain/dynasty-years.ts`
- Test: `src/domain/dynasty-years.test.ts`

**Interfaces:**
- Consumes: `Dynasty` из `src/content/types`.
- Produces:
  ```ts
  export function answerableYears(dynasties: readonly Dynasty[]): readonly number[];
  export function yearsOf(dynasties: readonly Dynasty[], dynastyId: string): readonly number[];
  export function pickYear(
    dynasties: readonly Dynasty[],
    dynastyId: string,
    random: () => number,
  ): number;
  ```

- [ ] **Step 1: Написать падающий тест**

Создать `src/domain/dynasty-years.test.ts`:

```ts
import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { createSeededRandom } from './random';
import { answerableYears, pickYear, yearsOf } from './dynasty-years';

const years = answerableYears(dynasties);

/*
 * Юань основана в 1271, Сун пала в 1279: восемь лет лента знает две династии
 * сразу. Вопрос «кто правил в 1275» имел бы два верных ответа.
 */
it('годы перекрытия Сун и Юань не спрашиваются', () => {
  for (let year = 1271; year <= 1279; year += 1) {
    expect(years).not.toContain(year);
  }
});

/* С 280 по 581 единой державы не было — спрашивать не о чем. */
it('годы раздробленности не спрашиваются', () => {
  expect(years).not.toContain(400);
  expect(years).not.toContain(500);
});

/* Стык: 220 — последний год Хань и первый год Троецарствия. */
it('год на стыке двух записей не спрашивается', () => {
  expect(years).not.toContain(220);
});

it('обычный год внутри династии спрашивается', () => {
  expect(years).toContain(700);
  expect(yearsOf(dynasties, 'tang')).toContain(700);
});

it('год выбирается из своей династии и воспроизводится по сиду', () => {
  const first = pickYear(dynasties, 'tang', createSeededRandom(3));
  const again = pickYear(dynasties, 'tang', createSeededRandom(3));

  expect(first).toBe(again);
  expect(yearsOf(dynasties, 'tang')).toContain(first);
});

/* У каждой записи ленты должен остаться хоть один спрашиваемый год. */
it('ни одна династия не осталась без года', () => {
  for (const dynasty of dynasties) {
    expect(yearsOf(dynasties, dynasty.id).length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/dynasty-years.test.ts`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Написать модуль**

Создать `src/domain/dynasty-years.ts`:

```ts
import type { Dynasty } from '../content/types';

/**
 * Годы, о которых можно спросить «кто правил».
 *
 * Спрашивать можно не о всяком годе. Два множества выпадают:
 *
 * — **разрывы**: с 280 по 581 единой державы не было, и у вопроса нет ответа;
 * — **перекрытия**: Юань основана в 1271, Сун пала в 1279 — восемь лет лента
 *   знает две династии сразу, и у вопроса два верных ответа. Столько же стоят
 *   стыки: 220 — последний год Хань и первый год Троецарствия.
 *
 * Множество считается из справочника, а не пишется руками: первая же правка
 * сроков разошлась бы со списком, а разошедшийся список выдал бы вопрос, у
 * которого верных ответов два.
 */
export function answerableYears(
  dynasties: readonly Dynasty[],
): readonly number[] {
  const from = Math.min(...dynasties.map((dynasty) => dynasty.from));
  const to = Math.max(...dynasties.map((dynasty) => dynasty.to));
  const years: number[] = [];

  for (let year = from; year <= to; year += 1) {
    const owners = dynasties.filter(
      (dynasty) => year >= dynasty.from && year <= dynasty.to,
    );

    if (owners.length === 1) {
      years.push(year);
    }
  }

  return years;
}

export function yearsOf(
  dynasties: readonly Dynasty[],
  dynastyId: string,
): readonly number[] {
  const dynasty = dynasties.find((item) => item.id === dynastyId);
  if (dynasty === undefined) {
    throw new Error(`Неизвестная династия: ${dynastyId}`);
  }

  return answerableYears(dynasties).filter(
    (year) => year >= dynasty.from && year <= dynasty.to,
  );
}

/** Год для вопроса. Генератор передаётся снаружи: домен не знает случайности. */
export function pickYear(
  dynasties: readonly Dynasty[],
  dynastyId: string,
  random: () => number,
): number {
  const years = yearsOf(dynasties, dynastyId);
  if (years.length === 0) {
    throw new Error(`У династии ${dynastyId} нет однозначных годов`);
  }

  return years[Math.floor(random() * years.length)];
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/domain/dynasty-years.test.ts`
Expected: PASS (6 тестов).

Если упал тест «ни одна династия не осталась без года» — это находка, а не помеха: значит, у какой-то записи все годы заняты соседями. Записать её в план и вынести владельцу продукта, а не подгонять правило.

- [ ] **Step 5: Коммит**

```bash
git add src/domain/dynasty-years.ts src/domain/dynasty-years.test.ts
git commit -m "feat: годы ленты, у которых ровно один верный ответ"
```

---

### Task 6: Игра «Кто правил в этом году»

**Files:**
- Modify: `src/features/exercise/HistoryRound.tsx`
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/App.tsx`
- Test: `src/features/exercise/HistoryRound.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `pickYear` из задачи 5; лента с `onAnswer` из задачи 4.
- Produces: `HistoryRoundProps.kind: 'when' | 'who'` (по умолчанию `'when'`); `HISTORY_YEAR_MODE`; карточка `history-year` с меткой 年; `onStartHistoryRound(language, pool?, kind?)`.

- [ ] **Step 1: Написать падающий тест**

В `src/features/exercise/HistoryRound.test.tsx` добавить:

```tsx
import { answerableYears } from '../../domain/dynasty-years';

function renderYearRound(seed = 5) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <HistoryRound
      kind="who"
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

it('спрашивает год и предлагает четыре имени', () => {
  renderYearRound();

  const asked = Number(screen.getByTestId('exercise-target').textContent);

  expect(answerableYears(dynasties)).toContain(asked);
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);

  const names = dynasties.map((dynasty) => dynasty.nameRu);
  for (const option of screen.getAllByTestId('choice-option')) {
    expect(names.some((name) => option.textContent?.includes(name))).toBe(true);
  }
});

it('на год отвечают и нажатием по ленте', () => {
  renderYearRound();

  const asked = Number(screen.getByTestId('exercise-target').textContent);
  const target = dynasties.find(
    (dynasty) => asked >= dynasty.from && asked <= dynasty.to,
  )!;

  fireEvent.click(screen.getByRole('button', { name: spanLabel(target) }));

  const span = document.querySelector(`[data-dynasty-id='${target.id}']`);
  expect((span as HTMLElement).dataset.mark).toBe('correct');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/HistoryRound.test.tsx -t 'год'`
Expected: FAIL — у `HistoryRound` нет признака `kind`.

- [ ] **Step 3: Описание игры**

В `src/features/exercise/exercise-modes.ts` рядом с `HISTORY_MODE`:

```ts
/**
 * «Кто правил в этом году» — зеркальная к «Династиям и датам»: там названа
 * династия и спрашивают срок, здесь назван год и спрашивают династию. Цель,
 * лента и отвлекающие те же, поэтому это признак раунда, а не второй экран.
 */
export const HISTORY_YEAR_MODE: ExerciseMode = {
  exerciseType: 'match-pair',
  title: 'История: кто правил в этом году',
  eyebrow: 'Кто правил в этом году',
};
```

В `MODE_CARDS` после карточки `history`:

```ts
  {
    id: 'history-year',
    kind: 'history',
    historyKind: 'who',
    mark: '年',
    title: 'Кто правил в этом году',
    summary:
      'Назван год — выбрать династию из четырёх или нажать её полосу на ленте. Годы, которые лента знает надвое, не спрашиваются: в 1275 году Сун и Юань существовали разом.',
    volume: '12 династий · около 4 минут',
    groupId: 'humanities',
  },
```

Карточку `history` дополнить полем `historyKind: 'when'`, а в типе `ModeCard` заменить ветвь:

```ts
  /** Игра по династиям: цели берутся из ленты, а карта в ней не участвует. */
  | { readonly kind: 'history'; readonly historyKind: 'when' | 'who' }
```

- [ ] **Step 4: Признак игры в раунде**

В `src/features/exercise/HistoryRound.tsx`:

```tsx
export type HistoryRoundProps = {
  /**
   * Что спрашивают: `when` — срок названной династии, `who` — династию
   * названного года. Раунд, цель, лента и отвлекающие у них общие.
   */
  readonly kind?: 'when' | 'who';
  /**
   * Пул раунда. По умолчанию вся лента; «Повторить ошибки» задаёт его
   * напрямую, и никакому набору он не соответствует.
   */
  readonly dynasties?: readonly Dynasty[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};
```

В теле, рядом с `choicesByQuestion`:

```tsx
  /*
   * Год на вопрос считается один раз на раунд, как и варианты: пересчёт на
   * каждый рендер менял бы вопрос под рукой ученика.
   */
  const yearByQuestion = useMemo(() => {
    if (kind !== 'who') {
      return [];
    }

    const random = createSeededRandom(seed + 2);

    return round.questions.map((item) =>
      pickYear(allDynasties, item.target.id, random),
    );
  }, [kind, round.questions, seed]);
```

Подписи вариантов:

```tsx
  const choices: readonly StageChoice[] = choicesByQuestion[
    round.currentIndex
  ].map((choice) => ({
    id: choice.id,
    label: kind === 'who' ? choice.nameRu : spanLabel(choice),
    result: resultOf(choice.id),
  }));
```

Вопрос:

```tsx
  const mode = kind === 'who' ? HISTORY_YEAR_MODE : HISTORY_MODE;
  const askedYear = kind === 'who' ? yearByQuestion[round.currentIndex] : null;
```

и в разметке вопроса вместо имени династии показывать `askedYear`, когда `kind === 'who'`:

```tsx
      <h1 className="stage-target" data-testid="exercise-target">
        {kind === 'who' ? (
          yearLabel(askedYear!)
        ) : (
          <span lang={langOf(language)}>{labelOf(target, language)}</span>
        )}
      </h1>
```

Импорты в `HistoryRound.tsx`: `yearLabel` из `../../content/dynasties`,
`pickYear` из `../../domain/dynasty-years`, `HISTORY_YEAR_MODE` из
`./exercise-modes`.

Вспомогательная подпись года — рядом со `spanLabel` в `src/content/dynasties.ts`:

```ts
/** «1275» и «221 до н. э.»: у года до нашей эры знак не минус, а слова. */
export function yearLabel(year: number): string {
  return year < 0 ? `${-year} до н. э.` : String(year);
}
```

- [ ] **Step 5: Запуск игры из главной**

В `src/App.tsx`: хранить вид игры и передавать его.

```tsx
  const [historyKind, setHistoryKind] = useState<'when' | 'who'>('when');

  function startHistoryRound(
    nextLanguage: QuestionLanguage = language,
    pool: readonly Dynasty[] = dynasties,
    kind: 'when' | 'who' = 'when',
  ) {
    setHistoryPool(pool);
    setHistoryKind(kind);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('history-exercise');
  }
```

В экране `history-exercise` добавить признак первой строкой:

```tsx
        <HistoryRound
          kind={historyKind}
          dynasties={historyPool}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishTargetRound}
          onExit={goToModes}
        />
```

В повторе ошибок (`startHistoryRound(language, repeatDynasties)`) передать `historyKind` третьим доводом: повтор обязан идти в той же игре, где ошиблись.

В `HomePage` карточка вида `history` запускается так:

```tsx
    } else if (card.kind === 'history') {
      onStartHistoryRound(language, undefined, card.historyKind);
```

Признак `onStartHistoryRound` в `HomePageProps` дополнить третьим доводом.

- [ ] **Step 6: Прогнать тесты**

Run: `npm test`
Expected: PASS. Тест `src/App.test.tsx`, считающий карточки, обновить на новое число, если он есть.

- [ ] **Step 7: Тест главной**

В `src/features/home/HomePage.test.tsx` добавить:

```tsx
it('карточка года запускает игру «кто правил»', () => {
  const { onStartHistoryRound } = renderHome();

  openCard(/Кто правил в этом году/);
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartHistoryRound).toHaveBeenCalledWith('ru', undefined, 'who');
});
```

- [ ] **Step 8: Полная проверка**

Run: `npm run lint && npm test && npm run build`
Expected: всё зелёное. `validate:fonts` проходит без пересборки шрифтов: знак 年 уже встречается в `src`.

- [ ] **Step 9: Коммит**

```bash
git add src/features/exercise/HistoryRound.tsx src/features/exercise/HistoryRound.test.tsx src/features/exercise/exercise-modes.ts src/content/dynasties.ts src/App.tsx src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx
git commit -m "feat: игра «Кто правил в этом году»"
```

---

### Task 7: Записать решение и изменение

**Files:**
- Modify: `DECISIONS.md`
- Modify: `CHANGELOG.md`
- Modify: `EXERCISES.md`

**Interfaces:**
- Consumes: всё сделанное выше.
- Produces: записи, которых требует `AGENTS.md`.

- [ ] **Step 1: Решение**

В `DECISIONS.md` строкой сверху таблицы:

```
| 2026-08-28 | Лента династий несёт исход ответа и сама отвечает | Решение владельца продукта по макету. Прежде спрошенная полоса красилась киноварью при любом ответе: красное пятно во всю ленту крупнее зелёной обводки на кнопке, и верный ответ читался как ошибка. Теперь метка несёт исход — нефрит при верном, киноварь при ошибке, — и при ошибке помечены обе полосы: видно не только верный срок, но и величину промаха. Полосы переведены со сланца на тушь вполсилы: сила выбрана контрастом, 3.94 к бумаге при пороге 3, тогда как первая проба в 30 % давала 1.95. Нефрит взят jade-500: к глубокому jade-700 обводка тушью даёт 2.17 и пропадает. Лента стала вторым способом ответить, кнопки остались: полоса называется сроком, а не именем династии, — имя и есть ответ. У полос уже 44 px появилась невидимая цель нажатия с разводкой, как у точек городов: у Цинь полоса 3.6 px на ленте в 1024. |
```

- [ ] **Step 2: Изменение**

В `CHANGELOG.md`, в `## [Unreleased]`:

```markdown
### Added

- Игра «Кто правил в этом году»: назван год — выбрать династию из четырёх или
  нажать её полосу на ленте. Годы, которые лента знает надвое, не
  спрашиваются: в 1275 году Сун и Юань существовали разом, а с 280 по 581
  единой державы не было вовсе.
- На ленте династий теперь отвечают нажатием. Кнопки вариантов остались:
  два пути к одному ответу, как карта и «ответить из списка» в играх по
  регионам. Полоса названа сроком, а не именем династии, — иначе читалка
  экрана называла бы ответ.

### Changed

- Исход на ленте династий: нефрит при верном ответе, киноварь при ошибке.
  Прежде спрошенная полоса красилась киноварью в обоих случаях, и верный
  ответ читался как ошибка. При ошибке помечены обе полосы — видно и верный
  срок, и величину промаха.
- Полосы ленты набраны тушью вполсилы вместо холодного сланца.
```

- [ ] **Step 3: Описание игр**

В `EXERCISES.md`, в раздел об истории, дописать после описания «Династий и дат»:

```markdown
Вторая игра зеркальна первой: назван год — выбрать династию. Годы берутся не
подряд. Из них выброшены разрывы (с 280 по 581 единой державы не было) и
перекрытия: Юань основана в 1271, Сун пала в 1279, и восемь лет лента знает
две династии сразу — у такого вопроса два верных ответа. Стыки сроков
выброшены по той же причине: 220 — последний год Хань и первый год
Троецарствия.

В обеих играх отвечают двумя способами: кнопкой из четырёх вариантов или
нажатием прямо по ленте. Для клавиатуры и читалки экрана полоса называется
сроком — «206 до н. э. — 220», — а не именем династии: имя и есть ответ. У
полос короче 44 px есть невидимая цель нажатия, разведённая с соседями, — у
Цинь полоса шириной 3.6 px на ленте в 1024 px.
```

- [ ] **Step 4: Полная проверка и коммит**

Run: `npm run lint && npm test && npm run build`
Expected: всё зелёное.

```bash
git add DECISIONS.md CHANGELOG.md EXERCISES.md
git commit -m "docs: лента династий — исход, ответ нажатием, игра по годам"
```

---

## Проверка плана на спек

| Раздел спека | Задача |
| --- | --- |
| §1 Тон ленты | 1 |
| §2 Исход знает, верно ли ответили | 2 |
| §3 Лента как способ ответа | 4 (цели нажатия — 3) |
| §4 Кто правил в этом году | 5 (годы), 6 (игра) |
| §5, §6 Столицы и правители | шаг 2, отдельный план |
| §7 Расставить по порядку | шаг 3, отдельный план |
| §8 Раздел режимов на пять групп | шаг 3, отдельный план |
| §9 Проверки | внутри задач 1–6 |

Незакрытых разделов, относящихся к шагу 1, не осталось.
