# Оболочка RoundStage: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Единый картоцентричный экран для всех четырёх видов раундов: карта почти во весь кадр, плашка вопроса поверх неё, тёмные кнопки-варианты с клавишами 1–4 в полосе под картой, служебная строка с секундомером и настоящий полноэкранный режим; пауза-разбор ошибки заменяется показом верного ответа на карте с автопереходом.

**Architecture:** Новый компонент `RoundStage` владеет компоновкой и полноэкранностью; раунды-владельцы (`ExerciseRound`, `CityRound`, `PhysicalRound`, `FillMapRound`) сохраняют свою логику и отдают оболочке содержимое слотов (плашка, счёт, варианты, список). Домен (`src/domain`) не меняется: машина `feedback → goToNextQuestion` уже есть, меняется только источник перехода — таймер вместо кнопки «Далее».

**Tech Stack:** React 18 + TypeScript, vitest + @testing-library/react (глобальные `it`/`vi`/`expect`), CSS-токены в `src/design/tokens.css`.

**Спек:** `docs/superpowers/specs/2026-08-17-round-stage-design.md` — читать перед началом.

## Global Constraints

- Ветка: `feature/round-stage` (уже создана, спек в ней).
- Интерфейс, задания и сообщения — по-русски; китайские названия в Unicode.
- `src/domain` не трогать. Карта не знает правильных ответов, UI — ключей SVG.
- Компоненты не пишут цвета/размеры значениями — только токены из `src/design/tokens.css`.
- Новых иероглифов не появляется — `generate:fonts` не нужен.
- Сетевых запросов во время раунда нет.
- Сообщения коммитов по-русски, вид `feat|fix|docs: …`, в конце строка
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Прогон одного файла тестов: `npx vitest run <путь>`; весь набор: `npm test`.

## Карта файлов

| Файл | Действие | Ответственность |
| --- | --- | --- |
| `src/features/exercise/round-pace.ts` | создать | константы темпа: паузы после верного и неверного ответа |
| `src/features/exercise/use-fullscreen.ts` | создать | хук Fullscreen API: доступность, состояние, переключение |
| `src/features/exercise/StageChoices.tsx` (+ тест) | создать | полоса вариантов: тёмные кнопки, клавиши 1–4 |
| `src/features/exercise/RoundStage.tsx` (+ тест) | создать | компоновка экрана: плашка, карта, полоса, служебная строка, панель списка, полноэкранность |
| `src/features/exercise/CityAnswerList.tsx` | изменить | `presentation: 'disclosure' \| 'inline'` |
| `src/features/exercise/PhysicalAnswerList.tsx` | изменить | то же |
| `src/features/exercise/ExerciseRound.tsx` (+ тест) | переписать возврат | миграция на RoundStage, автопереход после ошибки |
| `src/features/exercise/CityRound.tsx` (+ тест) | переписать возврат | то же |
| `src/features/exercise/PhysicalRound.tsx` (+ тест) | переписать возврат | то же |
| `src/features/exercise/FillMapRound.tsx` (+ тест) | переписать возврат | то же (свой темп и счёт сохраняются) |
| `src/features/exercise/AnswerFeedback.tsx` (+ тест) | удалить | панели разбора больше нет |
| `src/styles.css` | изменить | новый блок `.round-stage`, удаление мёртвых блоков |
| `src/design/tokens.css` | изменить | токен тени `--shadow-float` |
| `DECISIONS.md`, `CHANGELOG.md` | дополнить | решения и запись изменения |

---

### Task 1: Темп раундов и полноэкранный хук

**Files:**
- Create: `src/features/exercise/round-pace.ts`
- Create: `src/features/exercise/use-fullscreen.ts`
- Test: `src/features/exercise/use-fullscreen.test.tsx`

**Interfaces:**
- Produces: `CORRECT_PAUSE_MS = 500`, `WRONG_PAUSE_MS = 2000` (числа, мс);
  `useFullscreen(target: RefObject<HTMLElement | null>): { isAvailable: boolean; isFullscreen: boolean; toggle(): void }`.

- [ ] **Step 1: Написать падающий тест хука**

Файл `src/features/exercise/use-fullscreen.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useFullscreen } from './use-fullscreen';

/** Пробный компонент: хук нельзя вызвать вне рендера. */
function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(ref);

  return (
    <div ref={ref} data-testid="stage">
      {fullscreen.isAvailable ? (
        <button type="button" onClick={fullscreen.toggle}>
          {fullscreen.isFullscreen ? 'Свернуть' : 'Во весь экран'}
        </button>
      ) : (
        <p>кнопки нет</p>
      )}
    </div>
  );
}

afterEach(() => {
  // jsdom не знает Fullscreen API: свойства ставятся тестом и убираются им же.
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document, 'fullscreenElement');
});

it('без Fullscreen API кнопка не показывается', () => {
  render(<Probe />);

  expect(screen.getByText('кнопки нет')).toBeTruthy();
});

it('разворачивает корень и слушает fullscreenchange', () => {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  });
  const request = vi.fn().mockResolvedValue(undefined);
  HTMLElement.prototype.requestFullscreen = request;

  render(<Probe />);
  fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }));

  expect(request).toHaveBeenCalledTimes(1);

  // Браузер отвечает событием — состояние читается из него, не из вызова.
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: screen.getByTestId('stage'),
  });
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });

  expect(screen.getByRole('button', { name: 'Свернуть' })).toBeTruthy();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/use-fullscreen.test.tsx`
Expected: FAIL — `Cannot find module './use-fullscreen'`.

- [ ] **Step 3: Написать хук и константы**

Файл `src/features/exercise/round-pace.ts`:

```ts
/**
 * Темп раундов, общий для всех игр (спек RoundStage, 2026-08-17).
 *
 * Верный ответ виден полсекунды: подтверждается успех, нового не сообщается.
 * После ошибки плашка вопроса показывает верный ответ вчетверо дольше —
 * ученик читает название и находит штриховку на карте, — затем раунд едет
 * дальше сам. Кнопки «Далее» больше нет: пауза-разбор отменена решением
 * владельца продукта (DECISIONS.md, 2026-08-17).
 */
export const CORRECT_PAUSE_MS = 500;
export const WRONG_PAUSE_MS = 2000;
```

Файл `src/features/exercise/use-fullscreen.ts`:

```ts
import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Полноэкранный режим раунда. Разворачивается корень оболочки, а не документ:
 * шапка сайта остаётся вне полного экрана (спек RoundStage). Состояние
 * читается из `fullscreenchange`, а не из ответа `requestFullscreen`: выйти
 * можно и мимо кнопки — клавишей Esc.
 *
 * `isAvailable` ложен там, где Fullscreen API нет (iPhone): кнопку тогда не
 * показывают вовсе, деградация без обещаний.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function syncState() {
      setIsFullscreen(document.fullscreenElement !== null);
    }

    document.addEventListener('fullscreenchange', syncState);

    return () => document.removeEventListener('fullscreenchange', syncState);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement !== null) {
      void document.exitFullscreen();

      return;
    }

    void target.current?.requestFullscreen();
  }, [target]);

  return {
    isAvailable: document.fullscreenEnabled === true,
    isFullscreen,
    toggle,
  };
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run src/features/exercise/use-fullscreen.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/round-pace.ts src/features/exercise/use-fullscreen.ts src/features/exercise/use-fullscreen.test.tsx
git commit -m "feat: темп раундов и полноэкранный хук для оболочки RoundStage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Полоса вариантов StageChoices

**Files:**
- Create: `src/features/exercise/StageChoices.tsx`
- Test: `src/features/exercise/StageChoices.test.tsx`

**Interfaces:**
- Produces:
  `StageChoice = { id: string; label: string; lang?: string; result?: 'correct' | 'incorrect' }`;
  `StageChoices({ choices, disabled, onChoose }: { choices: readonly StageChoice[]; disabled: boolean; onChoose(choiceId: string): void })`.
  Кнопки несут `data-testid="choice-option"` и `data-choice-id` — тесты раундов зависят от этого.

- [ ] **Step 1: Написать падающий тест**

Файл `src/features/exercise/StageChoices.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { StageChoices } from './StageChoices';

const CHOICES = [
  { id: 'sichuan', label: 'Сычуань' },
  { id: 'hunan', label: 'Хунань' },
  { id: 'guizhou', label: 'Гуйчжоу' },
  { id: 'yunnan', label: 'Юньнань' },
] as const;

it('рисует кнопку с ярлыком клавиши для каждого варианта', () => {
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={() => {}} />);

  const buttons = screen.getAllByTestId('choice-option');
  expect(buttons).toHaveLength(4);
  expect(buttons[0].textContent).toBe('1Сычуань');
  expect(buttons[3].textContent).toBe('4Юньнань');
});

it('нажатие кнопки отдаёт id варианта', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.click(screen.getAllByTestId('choice-option')[1]);

  expect(onChoose).toHaveBeenCalledWith('hunan');
});

it('цифра с клавиатуры отвечает тем же вариантом', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '3' });

  expect(onChoose).toHaveBeenCalledWith('guizhou');
});

it('цифра без варианта и не-цифра игнорируются', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '5' });
  fireEvent.keyDown(document, { key: 'a' });

  expect(onChoose).not.toHaveBeenCalled();
});

it('выключенная полоса не слушает ни мышь, ни клавиши', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled onChoose={onChoose} />);

  fireEvent.click(screen.getAllByTestId('choice-option')[0]);
  fireEvent.keyDown(document, { key: '1' });

  expect(onChoose).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/StageChoices.test.tsx`
Expected: FAIL — `Cannot find module './StageChoices'`.

- [ ] **Step 3: Написать компонент**

Файл `src/features/exercise/StageChoices.tsx`:

```tsx
import { useEffect, type MouseEvent } from 'react';

export type StageChoice = {
  readonly id: string;
  readonly label: string;
  /** Язык подписи, когда он не русский: иероглифы объявляются китайскими. */
  readonly lang?: string;
  readonly result?: 'correct' | 'incorrect';
};

export type StageChoicesProps = {
  readonly choices: readonly StageChoice[];
  readonly disabled: boolean;
  readonly onChoose: (choiceId: string) => void;
};

/**
 * Полоса вариантов под картой: тёмные кнопки с ярлыками клавиш «1»–«4»
 * (спек RoundStage). Ответ нажимается и цифрой с клавиатуры — ярлык на кнопке
 * называет клавишу.
 *
 * Слушатель живёт на документе, пока полоса включена: фокус во время игры
 * гуляет между картой и кнопками, и вешать его на саму полосу значило бы
 * требовать фокус в ней. Полей ввода на экране раунда нет, перехватывать
 * цифры не у кого.
 */
export function StageChoices({ choices, disabled, onChoose }: StageChoicesProps) {
  useEffect(() => {
    if (disabled) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      const index = Number.parseInt(event.key, 10) - 1;
      const choice = Number.isNaN(index) ? undefined : choices[index];
      if (choice !== undefined) {
        onChoose(choice.id);
      }
    }

    document.addEventListener('keydown', handleKey);

    return () => document.removeEventListener('keydown', handleKey);
  }, [choices, disabled, onChoose]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const choiceId = event.currentTarget.dataset.choiceId ?? '';
    if (choiceId !== '') {
      onChoose(choiceId);
    }
  }

  return (
    <ul className="stage-choices" aria-label="Варианты ответа">
      {choices.map((choice, index) => (
        <li key={choice.id}>
          <button
            type="button"
            data-testid="choice-option"
            data-choice-id={choice.id}
            data-result={choice.result}
            disabled={disabled}
            onClick={handleClick}
          >
            <kbd aria-hidden="true">{index + 1}</kbd>
            <span lang={choice.lang}>{choice.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run src/features/exercise/StageChoices.test.tsx`
Expected: PASS (5 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/StageChoices.tsx src/features/exercise/StageChoices.test.tsx
git commit -m "feat: полоса вариантов с клавишами 1–4

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Оболочка RoundStage и её стили

**Files:**
- Create: `src/features/exercise/RoundStage.tsx`
- Test: `src/features/exercise/RoundStage.test.tsx`
- Modify: `src/design/tokens.css` (токен `--shadow-float` — добавить рядом с `--radius-*`)
- Modify: `src/styles.css` (новый блок в конце файла)

**Interfaces:**
- Consumes: `useFullscreen` (Task 1), `RoundStopwatch` (существует).
- Produces:
  ```
  RoundStageProps = {
    prompt: ReactNode;                 // содержимое плашки
    promptState: 'question' | 'answer';
    startedAt: number;                 // performance.now() старта раунда
    progress: ReactNode;               // счёт и след в служебной строке
    choices?: ReactNode;               // полоса под картой; нет — карта выше
    answerList?: ReactNode;            // содержимое панели «Ответить из списка»
    onExit: () => void;
    children: ReactNode;               // карта
  }
  ```
  Кнопки строки: «Ответить из списка» (aria-expanded), «Прервать раунд», «Во весь экран»/«Свернуть».

- [ ] **Step 1: Написать падающий тест**

Файл `src/features/exercise/RoundStage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { RoundStage } from './RoundStage';

function renderStage(overrides: Partial<Parameters<typeof RoundStage>[0]> = {}) {
  return render(
    <RoundStage
      prompt={<p>Сычуань</p>}
      promptState="question"
      startedAt={0}
      progress={<p>Вопрос 1 из 34</p>}
      onExit={() => {}}
      {...overrides}
    >
      <p>тут карта</p>
    </RoundStage>,
  );
}

afterEach(() => {
  Reflect.deleteProperty(document, 'fullscreenEnabled');
});

it('ставит плашку, карту и счёт по своим местам', () => {
  renderStage();

  expect(screen.getByText('Сычуань')).toBeTruthy();
  expect(screen.getByText('тут карта')).toBeTruthy();
  expect(screen.getByText('Вопрос 1 из 34')).toBeTruthy();
});

it('плашка объявляет смену содержимого читалке', () => {
  renderStage();

  const prompt = screen.getByText('Сычуань').closest('[aria-live]');
  expect(prompt?.getAttribute('aria-live')).toBe('polite');
  expect(prompt?.getAttribute('data-state')).toBe('question');
});

it('без слота вариантов полосы нет', () => {
  const { container } = renderStage();

  expect(container.querySelector('.stage-choices-band')).toBeNull();
});

it('со слотом вариантов полоса есть', () => {
  const { container } = renderStage({ choices: <p>кнопки</p> });

  expect(container.querySelector('.stage-choices-band')).toBeTruthy();
});

it('«Прервать раунд» отдаёт выход наверх', () => {
  const onExit = vi.fn();
  renderStage({ onExit });

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));

  expect(onExit).toHaveBeenCalledTimes(1);
});

it('без Fullscreen API кнопки полного экрана нет', () => {
  renderStage();

  expect(screen.queryByRole('button', { name: 'Во весь экран' })).toBeNull();
});

it('с Fullscreen API кнопка разворачивает оболочку', () => {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  });
  const request = vi.fn().mockResolvedValue(undefined);
  HTMLElement.prototype.requestFullscreen = request;

  renderStage();
  fireEvent.click(screen.getByRole('button', { name: 'Во весь экран' }));

  expect(request).toHaveBeenCalledTimes(1);
});

it('панель списка открывается кнопкой, закрывается Esc с возвратом фокуса', () => {
  renderStage({ answerList: <p>список целей</p> });

  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByText('список целей')).toBeNull();

  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const panel = screen.getByRole('group', { name: 'Ответ из списка' });
  expect(screen.getByText('список целей')).toBeTruthy();
  expect(document.activeElement).toBe(panel);

  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(screen.queryByText('список целей')).toBeNull();
  expect(document.activeElement).toBe(toggle);
});

it('без слота списка кнопки «Ответить из списка» нет', () => {
  renderStage();

  expect(screen.queryByRole('button', { name: 'Ответить из списка' })).toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/RoundStage.test.tsx`
Expected: FAIL — `Cannot find module './RoundStage'`.

- [ ] **Step 3: Написать компонент**

Файл `src/features/exercise/RoundStage.tsx`:

```tsx
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { RoundStopwatch } from './RoundStopwatch';
import { useFullscreen } from './use-fullscreen';

export type RoundStageProps = {
  /** Содержимое плашки: вопрос или показ верного ответа после ошибки. */
  readonly prompt: ReactNode;
  readonly promptState: 'question' | 'answer';
  /** Отметка `performance.now()` старта раунда — секундомеру строки. */
  readonly startedAt: number;
  /** Счёт и след раунда в служебной строке. */
  readonly progress: ReactNode;
  /** Полоса вариантов под картой; не передана — полосы нет, карта выше. */
  readonly choices?: ReactNode;
  /** Содержимое панели «Ответить из списка»; не передано — кнопки нет. */
  readonly answerList?: ReactNode;
  readonly onExit: () => void;
  /** Карта. */
  readonly children: ReactNode;
};

/**
 * Компоновка игрового экрана — одна на все четыре вида раундов (спек
 * RoundStage, 2026-08-17): плашка вопроса поверх карты, полоса вариантов и
 * служебная строка под ней. Порядок DOM — вопрос, карта, варианты, строка;
 * поверх карты плашку ставит только CSS.
 *
 * Плашка — aria-live: смена вопроса и показ верного ответа объявляются
 * читалке. Раньше это делал перевод фокуса на заголовок разбора — самого
 * разбора больше нет.
 *
 * Полноэкранная кнопка разворачивает корень оболочки: шапка сайта остаётся
 * вне полного экрана, решение 2026-08-05 о шапке не отменяется.
 */
export function RoundStage({
  prompt,
  promptState,
  startedAt,
  progress,
  choices,
  answerList,
  onExit,
  children,
}: RoundStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const fullscreen = useFullscreen(stageRef);

  // Фокус уходит в открытую панель: следующий Tab — уже по списку.
  useEffect(() => {
    if (isListOpen) {
      panelRef.current?.focus();
    }
  }, [isListOpen]);

  function closeList() {
    setIsListOpen(false);
    listButtonRef.current?.focus();
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      closeList();
    }
  }

  return (
    <main className="round-stage" ref={stageRef}>
      <div className="stage-prompt" data-state={promptState} aria-live="polite">
        {prompt}
      </div>
      <div className="stage-map">
        {children}
        {answerList !== undefined && isListOpen ? (
          <div
            className="stage-answer-panel"
            ref={panelRef}
            tabIndex={-1}
            role="group"
            aria-label="Ответ из списка"
            onKeyDown={handlePanelKeyDown}
          >
            {answerList}
          </div>
        ) : null}
      </div>
      {choices !== undefined ? (
        <div className="stage-choices-band">{choices}</div>
      ) : null}
      <footer className="stage-strip">
        <RoundStopwatch startedAt={startedAt} />
        {progress}
        <div className="stage-strip-actions">
          {answerList !== undefined ? (
            <button
              type="button"
              className="stage-strip-button"
              ref={listButtonRef}
              aria-expanded={isListOpen}
              onClick={() => (isListOpen ? closeList() : setIsListOpen(true))}
            >
              Ответить из списка
            </button>
          ) : null}
          <button type="button" className="stage-strip-button" onClick={onExit}>
            Прервать раунд
          </button>
          {fullscreen.isAvailable ? (
            <button
              type="button"
              className="stage-strip-button"
              onClick={fullscreen.toggle}
            >
              {fullscreen.isFullscreen ? 'Свернуть' : 'Во весь экран'}
            </button>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run src/features/exercise/RoundStage.test.tsx`
Expected: PASS (9 тестов).

- [ ] **Step 5: Токен тени**

В `src/design/tokens.css`, сразу после блока `--radius-*`, добавить:

```css
  /* Тень плавающих плашек поверх карты: чернила с прозрачностью. */
  --shadow-float: 0 4px 18px rgb(20 17 16 / 35%);
```

- [ ] **Step 6: Стили оболочки**

В конец `src/styles.css` добавить блок:

```css
/* --- Экран раунда: оболочка RoundStage ---------------------------------- */

/*
 * Кадр раунда: карта забирает остаток колонки, плашка вопроса плавает поверх
 * неё, полоса вариантов и служебная строка стоят под картой и её не
 * перекрывают (спек RoundStage, 2026-08-17).
 */
.round-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-block-size: 0;
  position: relative;
}

/* Полный экран отдаёт кадр оболочке: фон обязан быть её, а не прозрачным. */
.round-stage:fullscreen {
  background: var(--surface-ground);
}

.stage-prompt {
  background: var(--surface-raised);
  border: var(--border-hair) solid var(--line-on-ground);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  inset-block-start: var(--s-3);
  inset-inline-start: 50%;
  max-inline-size: min(90%, 40rem);
  padding: var(--s-2) var(--s-5) var(--s-3);
  position: absolute;
  text-align: center;
  transform: translateX(-50%);
  z-index: 2;
}

.stage-prompt .eyebrow {
  margin-bottom: var(--s-1);
}

/* Показ верного ответа отмечен кромкой, а не только текстом. */
.stage-prompt[data-state='answer'] {
  border-inline-start: var(--border-solid) solid var(--accent-on-ground);
}

/* Название цели: то же слово-вопрос, что было в колонке. */
.stage-target {
  color: var(--text-on-ground-strong);
  font-family: var(--t-family-display);
  font-size: var(--t-size-question);
  line-height: 1.2;
  margin: 0;
}

.stage-target [lang='zh-Hans'] {
  color: var(--text-on-ground-muted);
}

.stage-map {
  background: var(--map-sea);
  flex: 1;
  min-block-size: 0;
  position: relative;
}

.stage-map .map-section {
  block-size: 100%;
  margin-bottom: 0;
}

/*
 * Пропорция живёт на рамке, а не на карте: рамка — система координат зума
 * (правило перенесено из прежнего .round-map).
 */
.stage-map .china-map-frame {
  aspect-ratio: var(--map-aspect);
  block-size: 100%;
  inline-size: auto;
  margin-inline: auto;
  max-inline-size: 100%;
}

.stage-map .china-map {
  block-size: 100%;
}

.stage-map .china-map svg {
  block-size: 100%;
}

/* Панель «Ответить из списка»: поверх карты у правого края, со своей прокруткой. */
.stage-answer-panel {
  background: var(--surface-ground);
  border-inline-start: var(--border-hair) solid var(--line-on-ground);
  box-shadow: var(--shadow-float);
  inline-size: min(24rem, 90%);
  inset-block: 0;
  inset-inline-end: 0;
  overflow-y: auto;
  padding: var(--s-3) var(--s-4);
  position: absolute;
  z-index: 3;
}

.stage-choices-band {
  background: var(--surface-ground);
  border-block-start: var(--border-hair) solid var(--line-on-ground);
  padding: var(--s-3) var(--s-4);
}

.stage-choices {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.stage-choices button {
  align-items: center;
  background: var(--surface-raised);
  border: var(--border-hair) solid var(--line-on-ground-strong);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground-strong);
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: var(--s-2);
  min-height: var(--target-min);
  padding: var(--s-2) var(--s-3);
  transition: border-color var(--duration-quick) var(--ease-out);
}

.stage-choices button:hover:enabled {
  border-color: var(--accent-on-ground);
}

.stage-choices kbd {
  background: var(--surface-ground);
  border: var(--border-hair) solid var(--line-on-ground);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground-muted);
  font-family: var(--t-family-text);
  font-size: var(--t-size-caption);
  padding: 0 var(--s-1);
}

/*
 * Исход — как у ленты следа: верный набран нефритом для доски и жирным,
 * ошибочный — киноварью и пунктиром. Не только цвет: жирность и штрих.
 */
.stage-choices button[data-result='correct'] {
  border-color: var(--state-correct-on-ground);
  color: var(--state-correct-on-ground);
  font-weight: var(--t-weight-bold);
}

.stage-choices button[data-result='incorrect'] {
  border-color: var(--accent-on-ground);
  border-style: dashed;
}

.stage-strip {
  align-items: center;
  background: var(--surface-ground);
  border-block-start: var(--border-hair) solid var(--line-on-ground);
  color: var(--text-on-ground-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--t-size-caption);
  gap: var(--s-2) var(--s-4);
  padding: var(--s-2) var(--s-4);
}

.stage-strip .exercise-progress,
.stage-strip .fill-status {
  margin: 0;
}

.stage-strip .round-trail {
  margin-block-start: 0;
}

.stage-strip-actions {
  align-items: center;
  display: flex;
  gap: var(--s-3);
  margin-inline-start: auto;
}

.stage-strip-button {
  background: none;
  border: var(--border-hair) solid var(--line-on-ground-strong);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground);
  cursor: pointer;
  font: inherit;
  padding: var(--s-1) var(--s-3);
  transition: border-color var(--duration-quick) var(--ease-out);
}

.stage-strip-button:hover {
  border-color: var(--accent-on-ground);
}
```

Примечание: `--ease-out`, `--target-min`, `--map-aspect` уже существуют в
`tokens.css` (используются нынешними стилями). Если имя расходится — взять
то, которым пользуется `.choice-list` / `.round-map` рядом.

- [ ] **Step 7: Проверить валидатор токенов**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS. Если тест перечисляет пары «текст–фон» явным списком и падает
на новой паре — добавить пары по образцу соседних:
`--text-on-ground-strong` на `--surface-raised` (уже есть у шапки),
`--state-correct-on-ground` на `--surface-raised`.

- [ ] **Step 8: Коммит**

```bash
git add src/features/exercise/RoundStage.tsx src/features/exercise/RoundStage.test.tsx src/styles.css src/design/tokens.css
git commit -m "feat: оболочка RoundStage — плашка, полоса вариантов, служебная строка

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `presentation='inline'` у списков городов и объектов

**Files:**
- Modify: `src/features/exercise/CityAnswerList.tsx`
- Modify: `src/features/exercise/PhysicalAnswerList.tsx`

**Interfaces:**
- Produces: оба компонента получают проп
  `presentation?: 'disclosure' | 'inline'` (по умолчанию `'disclosure'` —
  поведение не меняется). `inline` отдаёт голый `<ul className="map-alternative">`
  без `<details>`: в панели RoundStage раскрытием управляет оболочка, второй
  раскрыватель внутри — двойная дверь.

- [ ] **Step 1: Изменить CityAnswerList**

В `src/features/exercise/CityAnswerList.tsx`: добавить проп и вынести список в
переменную. Тип и начало компонента:

```tsx
export type CityAnswerListProps = {
  readonly cities: readonly City[];
  readonly language: QuestionLanguage;
  readonly targetId: string;
  readonly answeredId: string | null;
  readonly disabled: boolean;
  readonly onSelect: (cityId: string) => void;
  /** `disclosure` — свёрнутый блок; `inline` — голый список для панели. */
  readonly presentation?: 'disclosure' | 'inline';
};
```

В теле компонента (параметр `presentation = 'disclosure'`) обернуть текущий
`<ul>…</ul>` в переменную `const list = (…)` без изменений разметки, затем:

```tsx
  if (presentation === 'inline') {
    return list;
  }

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({cities.length} {citiesWord(cities.length)})
      </summary>
      {list}
    </details>
  );
```

- [ ] **Step 2: То же в PhysicalAnswerList**

Симметрично: проп `presentation?: 'disclosure' | 'inline'` со значением по
умолчанию `'disclosure'`, `const list = (<ul className="map-alternative" aria-label="Список объектов">…</ul>)`,
ранний `return list` при `inline`, `<details>` со `<summary>Ответить из списка ({features.length} {featuresWord(features.length)})</summary>{list}</details>` иначе.

- [ ] **Step 3: Убедиться, что ничего не сломано**

Run: `npx vitest run src/features/exercise/CityRound.test.tsx src/features/exercise/PhysicalRound.test.tsx`
Expected: PASS — поведение по умолчанию не изменилось.

- [ ] **Step 4: Коммит**

```bash
git add src/features/exercise/CityAnswerList.tsx src/features/exercise/PhysicalAnswerList.tsx
git commit -m "feat: голый режим списков городов и объектов для панели оболочки

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Миграция ExerciseRound

**Files:**
- Modify: `src/features/exercise/ExerciseRound.tsx`
- Test: `src/features/exercise/ExerciseRound.test.tsx`

**Interfaces:**
- Consumes: `RoundStage`, `StageChoices`/`StageChoice`, `CORRECT_PAUSE_MS`,
  `WRONG_PAUSE_MS`, `RegionAnswerList presentation="inline"`.
- Поведение: после ошибки плашка показывает «Это {регион} {汉字}», карта
  штрихует оба региона, через `WRONG_PAUSE_MS` раунд сам идёт дальше;
  «Регион — столица» получает карту с подсвеченным регионом вопроса
  (неинтерактивную) — единый макет, подсветка ничего не выдаёт: спрашивается
  столица, а не место.

- [ ] **Step 1: Обновить тесты**

В `src/features/exercise/ExerciseRound.test.tsx`:

1. Добавить помощник после `renderRound` и звать его из
   `answerCorrectly`/`answerWrongly` больше не нужно — список теперь в панели.
   Добавить помощник и переписать оба:

```tsx
/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}

function answerCorrectly() {
  openAnswerList();
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );
}

function answerWrongly() {
  openAnswerList();
  const target = askedRegion();
  const other = regions.find((region) => region.id !== target.id)!;

  fireEvent.click(
    screen.getByRole('button', { name: `${other.nameRu} (${other.nameZh})` }),
  );
}
```

2. Тест `'останавливается на ошибке и ждёт «Далее»'` заменить целиком:

```tsx
it('после ошибки называет верный ответ и едет дальше сам', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const target = askedRegion();

    answerWrongly();

    expect(screen.getByText('Этот регион стоит повторить')).toBeTruthy();
    expect(asked()).toContain(target.nameRu);
    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Этот регион стоит повторить')).toBeNull();
    expect(asked()).not.toContain(target.nameRu);
  } finally {
    vi.useRealTimers();
  }
});
```

3. Остальные тесты: везде, где ответ давался списком без явного открытия,
   помощники уже открывают панель. Тесты, читающие `asked()` сразу после
   ошибки, обновить по образцу выше (после ошибки `exercise-target` содержит
   «Это {имя} {иероглифы}»). Тесты про «Далее» и разбор — удалить или
   заменить, кнопки больше нет. Прогнать файл и починить каждое падение по
   этим правилам — других причин падений быть не должно.

- [ ] **Step 2: Убедиться, что новые тесты падают**

Run: `npx vitest run src/features/exercise/ExerciseRound.test.tsx`
Expected: FAIL — «Ответить из списка» не кнопка (пока `<summary>`), «Далее»
ещё существует.

- [ ] **Step 3: Переписать ExerciseRound**

Заменить содержимое `src/features/exercise/ExerciseRound.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { cityById } from '../../content/cities';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  regionTarget,
  type Attempt,
  type ExerciseType,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { RegionAnswerList } from '../../map/RegionAnswerList';
import { answerStatesFor } from './answer-states';
import { EXERCISE_MODES } from './exercise-modes';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';
import { RoundProgressTrail } from './RoundProgressTrail';
import { RoundStage } from './RoundStage';
import { StageChoices, type StageChoice } from './StageChoices';

export type ExerciseRoundProps = {
  readonly regions: readonly Region[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

function resultOf(
  choiceId: string,
  targetId: string,
  answeredRegionId: string | null,
): 'correct' | 'incorrect' | undefined {
  if (answeredRegionId === null) {
    return undefined;
  }

  if (choiceId === targetId) {
    return 'correct';
  }

  return choiceId === answeredRegionId ? 'incorrect' : undefined;
}

/**
 * Один контейнер на все задания: типы могут чередоваться внутри раунда,
 * поэтому вид вопроса решается на каждом вопросе, а не на экране.
 *
 * Паузы-разбора больше нет (спек RoundStage): после ошибки плашка вопроса
 * называет верный ответ, карта штрихует оба региона, и раунд идёт дальше сам.
 */
export function ExerciseRound({
  regions,
  exerciseTypes,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: ExerciseRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      regions.map((region) => regionTarget(region.id)),
      {
        roundId,
        exerciseTypes,
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());
  const [startedAt] = useState(() => performance.now());

  /*
   * Таймер живёт в ссылке: уход с экрана посреди паузы не должен переводить
   * раунд, которого уже нет.
   */
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  // Варианты считаются один раз на раунд: иначе перерисовка тасовала бы их
  // прямо под курсором.
  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildChoices(regions, question.target.id, random),
    );
  }, [regions, round.questions, seed]);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.target.id)!;
  const mode = EXERCISE_MODES[question.exerciseType];
  const isMapAnswer = question.exerciseType === 'find-on-map';
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsAnswer = round.status === 'feedback' && lastAttempt?.isCorrect === false;

  const answerStates = useMemo(
    () =>
      isMapAnswer ? answerStatesFor(regions, question.target.id, answeredRegionId) : {},
    [isMapAnswer, regions, question.target.id, answeredRegionId],
  );

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  function answer(regionId: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredRegionId(regionId);
    const answered = answerQuestion(round, {
      answeredId: regionId,
      durationMs: Math.round(performance.now() - askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    const isCorrect = answered.attempts[answered.attempts.length - 1].isCorrect;
    advanceTimer.current = window.setTimeout(
      () => {
        advanceTimer.current = null;
        goNext(answered);
      },
      isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS,
    );
  }

  const stageChoices: readonly StageChoice[] = isMapAnswer
    ? []
    : choicesByQuestion[round.currentIndex].map((choice) => ({
        id: choice.id,
        label:
          question.exerciseType === 'match-pair'
            ? (cityById(choice.capitalCityId)?.nameRu ?? '')
            : labelOf(choice, question.language),
        lang:
          question.exerciseType === 'match-pair'
            ? undefined
            : langOf(question.language),
        result: resultOf(choice.id, question.target.id, answeredRegionId),
      }));

  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">Этот регион стоит повторить</p>
      <p className="stage-target" data-testid="exercise-target">
        Это {targetRegion.nameRu} <span lang="zh-Hans">{targetRegion.nameZh}</span>
      </p>
    </>
  ) : (
    <>
      <p className="eyebrow">{mode.eyebrow}</p>
      <p
        className="stage-target"
        data-testid="exercise-target"
        lang={
          question.exerciseType === 'name-target'
            ? undefined
            : langOf(question.language)
        }
      >
        {question.exerciseType === 'name-target'
          ? 'Регион на карте'
          : labelOf(targetRegion, question.language)}
      </p>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={showsAnswer ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress">
            Вопрос {round.currentIndex + 1} из {round.questions.length}
          </p>
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </>
      }
      choices={
        isMapAnswer ? undefined : (
          <StageChoices
            choices={stageChoices}
            disabled={round.status !== 'ready'}
            onChoose={answer}
          />
        )
      }
      answerList={
        isMapAnswer ? (
          <RegionAnswerList
            presentation="inline"
            regions={regions}
            selectedRegionId={answeredRegionId}
            onSelect={answer}
            answerStates={answerStates}
          />
        ) : undefined
      }
      onExit={onExit}
    >
      {/*
        Карта теперь на всех трёх заданиях. В «регион — столица» она была бы
        лишней колонкой при старом макете; в едином кадре она показывает
        спрошенный регион — столицу подсветка не выдаёт.
      */}
      <ChinaMap
        regions={regions}
        selectedRegionId={isMapAnswer ? answeredRegionId : question.target.id}
        onSelect={isMapAnswer ? answer : () => {}}
        onClear={() => {}}
        answerStates={answerStates}
        interactive={isMapAnswer && round.status === 'ready'}
        usage="answer"
      />
    </RoundStage>
  );
}
```

- [ ] **Step 4: Прогнать тесты файла**

Run: `npx vitest run src/features/exercise/ExerciseRound.test.tsx`
Expected: PASS. Падения разбирать по правилам шага 1.3.

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/ExerciseRound.tsx src/features/exercise/ExerciseRound.test.tsx
git commit -m "feat: раунд регионов на оболочке RoundStage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Миграция CityRound

**Files:**
- Modify: `src/features/exercise/CityRound.tsx`
- Test: `src/features/exercise/CityRound.test.tsx`

**Interfaces:**
- Consumes: те же, плюс `CityAnswerList presentation="inline"`.
- Особенности: зум карты сохраняется (`zoom`/`onZoomChange`); в
  «город — регион» списка нет (области крупные), в «найти город» список
  городов уходит в панель; встроенная секция разбора (`showsFeedback`)
  удаляется так же, как в ExerciseRound.

- [ ] **Step 1: Обновить тесты**

В `src/features/exercise/CityRound.test.tsx`:

1. Добавить помощник и звать его перед каждым ответом через список:

```tsx
/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}
```

2. Тест разбора с «Далее» заменить тестом «называет верный ответ и едет
   дальше сам»: после неверного ответа ожидать текст «Этот город стоит
   повторить» и «Это {nameRu} {nameZh}» в плашке, отсутствие кнопки «Далее»,
   затем `act(() => vi.advanceTimersByTime(2000))` — и следующий вопрос.
3. Остальные упоминания «Далее» и секции разбора удалить.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/CityRound.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Переписать возврат CityRound**

Логика ответа — как в Task 5: `answer()` ставит один таймер
(`isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS`), локальная константа
`CORRECT_PAUSE_MS` удаляется в пользу импорта из `./round-pace`, `handleNext`
и `isLastQuestion` удаляются, добавляется `const [startedAt] = useState(() => performance.now())`.
Импорты `RoundStage`, `StageChoices`, `RoundProgressTrail` остаётся,
`CITY_MODES` остаётся. Возврат компонента:

```tsx
  const showsAnswer = round.status === 'feedback' && lastAttempt?.isCorrect === false;

  const stageChoices: readonly StageChoice[] = showsChoices
    ? choicesByQuestion[round.currentIndex].map((choice) => ({
        id: choice.id,
        label: labelOf(choice, question.language),
        lang: langOf(question.language),
        result:
          answeredId === null
            ? undefined
            : choice.id === targetCity.id
              ? 'correct'
              : choice.id === answeredId
                ? 'incorrect'
                : undefined,
      }))
    : [];

  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">Этот город стоит повторить</p>
      <p className="stage-target" data-testid="exercise-target">
        Это {targetCity.nameRu} <span lang="zh-Hans">{targetCity.nameZh}</span>
      </p>
    </>
  ) : (
    <>
      <p className="eyebrow">{mode.eyebrow}</p>
      <p
        className="stage-target"
        data-testid="exercise-target"
        lang={showsChoices ? undefined : langOf(question.language)}
      >
        {showsChoices ? 'Город на карте' : labelOf(targetCity, question.language)}
      </p>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={showsAnswer ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress">
            Вопрос {round.currentIndex + 1} из {round.questions.length}
          </p>
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </>
      }
      choices={
        showsChoices ? (
          <StageChoices
            choices={stageChoices}
            disabled={round.status !== 'ready'}
            onChoose={answer}
          />
        ) : undefined
      }
      answerList={
        exerciseType === 'find-on-map' ? (
          <CityAnswerList
            presentation="inline"
            cities={cities}
            language={question.language}
            answeredId={answeredId}
            targetId={targetCity.id}
            disabled={round.status !== 'ready'}
            onSelect={handleCitySelect}
          />
        ) : undefined
      }
      onExit={onExit}
    >
      <ChinaMap
        regions={regions}
        selectedRegionId={answersWithRegion ? answeredId : null}
        onSelect={handleRegionSelect}
        onClear={() => {}}
        interactive={answersWithRegion}
        zoom={zoom}
        onZoomChange={setZoom}
        usage="answer"
        showsCities={!answersWithRegion}
        selectedCityId={showsChoices ? targetCity.id : answeredId}
        showsCityLabels={false}
        onSelectCity={exerciseType === 'find-on-map' ? handleCitySelect : undefined}
      />
    </RoundStage>
  );
```

Комментарий про скрытые точки и подписи с прежнего места сохранить над
`<ChinaMap>`. Блок `showsFeedback`-секции и `regionOfTarget` удалить
(`regionOfTarget` больше не нужен — регион в плашке не называется, разбор
живёт на итогах).

- [ ] **Step 4: Прогнать тесты файла**

Run: `npx vitest run src/features/exercise/CityRound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/CityRound.tsx src/features/exercise/CityRound.test.tsx
git commit -m "feat: раунд городов на оболочке RoundStage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Миграция PhysicalRound

**Files:**
- Modify: `src/features/exercise/PhysicalRound.tsx`
- Test: `src/features/exercise/PhysicalRound.test.tsx`

**Interfaces:**
- Consumes: те же, плюс `PhysicalAnswerList presentation="inline"`.

- [ ] **Step 1: Обновить тесты**

В `src/features/exercise/PhysicalRound.test.tsx`:

1. Добавить помощник и звать его перед каждым ответом через список:

```tsx
/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}
```

2. Тест разбора заменить автопереходом: после неверного ответа — «Этот
   объект стоит повторить» и «Это {nameRu} {nameZh}» в плашке, нет кнопки
   «Далее», затем `act(() => vi.advanceTimersByTime(2000))` — следующий
   вопрос.
3. Остальные упоминания «Далее» и секции разбора удалить.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Переписать возврат PhysicalRound**

Как в Task 6: единый таймер с паузами из `./round-pace`, `startedAt`,
удаление `handleNext`/`isLastQuestion`/секции разбора. Возврат:

```tsx
  const showsAnswer = round.status === 'feedback' && lastAttempt?.isCorrect === false;

  const stageChoices: readonly StageChoice[] = showsChoices
    ? choicesByQuestion[round.currentIndex].map((choice) => ({
        id: choice.id,
        label: labelOf(choice, question.language),
        lang: langOf(question.language),
        result:
          answeredId === null
            ? undefined
            : choice.id === targetFeature.id
              ? 'correct'
              : choice.id === answeredId
                ? 'incorrect'
                : undefined,
      }))
    : [];

  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">Этот объект стоит повторить</p>
      <p className="stage-target" data-testid="exercise-target">
        Это {targetFeature.nameRu}{' '}
        <span lang="zh-Hans">{targetFeature.nameZh}</span>
      </p>
    </>
  ) : (
    <>
      <p className="eyebrow">{mode.eyebrow}</p>
      <p
        className="stage-target"
        data-testid="exercise-target"
        lang={showsChoices ? undefined : langOf(question.language)}
      >
        {showsChoices
          ? 'Объект на карте'
          : labelOf(targetFeature, question.language)}
      </p>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={showsAnswer ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress">
            Вопрос {round.currentIndex + 1} из {round.questions.length}
          </p>
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </>
      }
      choices={
        showsChoices ? (
          <StageChoices
            choices={stageChoices}
            disabled={round.status !== 'ready'}
            onChoose={answer}
          />
        ) : undefined
      }
      answerList={
        exerciseType === 'find-on-map' ? (
          <PhysicalAnswerList
            presentation="inline"
            features={features}
            language={question.language}
            answeredId={answeredId}
            targetId={targetFeature.id}
            disabled={round.status !== 'ready'}
            onSelect={handleFeatureSelect}
          />
        ) : undefined
      }
      onExit={onExit}
    >
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
    </RoundStage>
  );
```

Комментарий про скрытые подписи сохранить над `<ChinaMap>`.

- [ ] **Step 4: Прогнать тесты файла**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/PhysicalRound.tsx src/features/exercise/PhysicalRound.test.tsx
git commit -m "feat: раунд физической географии на оболочке RoundStage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Миграция FillMapRound

**Files:**
- Modify: `src/features/exercise/FillMapRound.tsx`
- Test: `src/features/exercise/FillMapRound.test.tsx`

**Interfaces:**
- Consumes: `RoundStage`, `RegionAnswerList presentation="inline"`.
- Поведение раунда не меняется: свой темп (`REVEAL_MS`, `MISS_FLASH_MS`),
  свой счёт попыток, свой показ неугаданного региона. Меняется только
  компоновка.

- [ ] **Step 1: Обновить тесты**

В `src/features/exercise/FillMapRound.test.tsx` добавить помощник и звать его
перед каждым ответом через список:

```tsx
/** Список — в панели оболочки: перед ответом её нужно открыть. */
function openAnswerList() {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }
}
```

Других изменений не ожидается: разбора и «Далее» здесь не было.

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: FAIL — «Ответить из списка» пока `<summary>`, а не кнопка панели.

- [ ] **Step 3: Переписать возврат FillMapRound**

Вся логика до `return` не меняется. Возврат:

```tsx
  const prompt = (
    <>
      <p className="eyebrow">Найдите на карте</p>
      <p
        className="stage-target"
        data-testid="fill-target"
        lang={question === null ? undefined : langOf(question.language)}
      >
        {targetRegion === null
          ? 'Карта заполнена'
          : labelOf(targetRegion, question!.language)}
      </p>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={isRevealing ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress" data-testid="fill-progress">
            Закрашено {closed} из {round.order.length}
          </p>
          <p className="attempt-dots">
            <span aria-hidden="true">
              {'●'.repeat(attemptsLeft)}
              {'○'.repeat(round.usedAttempts)}
            </span>
            <span className="visually-hidden">
              Попытка {round.usedAttempts + 1} из {MAX_ATTEMPTS_PER_REGION}
            </span>
          </p>
          <p className="fill-status" role="status" aria-live="polite">
            {statusText()}
          </p>
        </>
      }
      answerList={
        <RegionAnswerList
          presentation="inline"
          regions={regions}
          selectedRegionId={null}
          onSelect={handleSelect}
          outcomes={round.outcomes}
          interactive={!finished}
          paused={isRevealing}
        />
      }
      onExit={onExit}
    >
      <ChinaMap
        regions={regions}
        selectedRegionId={null}
        onSelect={handleSelect}
        onClear={() => {}}
        variant="fill"
        usage="answer"
        outcomes={round.outcomes}
        highlight={mapHighlight}
        interactive={!finished}
        paused={isRevealing}
      />
    </RoundStage>
  );
```

Импорт `RoundStopwatch` из FillMapRound удалить (секундомер теперь у
оболочки), импорт `RoundStage` и `RegionAnswerList` оставить/добавить.

- [ ] **Step 4: Прогнать тесты файла**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/features/exercise/FillMapRound.tsx src/features/exercise/FillMapRound.test.tsx
git commit -m "feat: заполнение карты на оболочке RoundStage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Снос разбора, мёртвого CSS и документы

**Files:**
- Delete: `src/features/exercise/AnswerFeedback.tsx`, `src/features/exercise/AnswerFeedback.test.tsx`
- Modify: `src/styles.css` (удаление мёртвых блоков)
- Modify: `DECISIONS.md`, `CHANGELOG.md`

- [ ] **Step 1: Удалить AnswerFeedback**

```bash
git rm src/features/exercise/AnswerFeedback.tsx src/features/exercise/AnswerFeedback.test.tsx
```

- [ ] **Step 2: Найти и снести мёртвый CSS**

Проверить, что классы больше нигде не используются:

```bash
grep -rn 'round-shell\|round-layout\|round-prompt\|round-map\|round-footer\|choice-list\|answer-feedback' src --include='*.tsx' --include='*.ts'
```

Expected: пусто (упоминания только в `styles.css`). Затем удалить из
`src/styles.css` осиротевшие блоки: `.round-shell` (и его grid-медиа),
`.round-prompt`, `.round-layout`, `.round-prompt-column`, `.round-map`,
`.round-footer`, `.choice-list`, `.answer-feedback`,
`.answer-feedback-icon` — вместе с их медиазапросами и комментариями.
Правила `.round-trail`, `.exercise-progress`, `.fill-status`,
`.attempt-dots`, `.region-answer-list`, `.map-alternative` НЕ трогать — они
живут в новой оболочке. Если grep показал живое использование класса —
блок оставить.

- [ ] **Step 3: Прогнать всё**

```bash
npm run lint && npm test && npm run build
```

Expected: без ошибок. `validate:map`, `validate:content`, `validate:fonts`
проходят — контент не менялся.

- [ ] **Step 4: Записать решения**

В `DECISIONS.md` добавить (формат — как у соседних записей: дата, контекст,
решение, последствия):

```markdown
## 2026-08-17 — Единая оболочка RoundStage и отказ от паузы-разбора

Контекст: владелец продукта дал референсы (ekvis — города, motovskikh —
регионы) и попросил переосмыслить экраны раундов: карта как сцена,
полноэкранный режим. Спек: docs/superpowers/specs/2026-08-17-round-stage-design.md.

Решения:
1. Все четыре вида раундов рисуются одной оболочкой RoundStage: плашка
   вопроса поверх карты, тёмные кнопки-варианты с клавишами 1–4 в полосе под
   картой, служебная строка с секундомером.
2. Пауза-разбор после ошибки отменена: плашка на ~2 с называет верный ответ,
   карта штрихует оба региона, раунд идёт дальше сам. Полный разбор — на
   итогах. Кнопки «Далее» больше нет.
3. Полноэкранный режим — кнопкой поверх Fullscreen API на корне оболочки.
   Решение 2026-08-05 «шапка на всех экранах» не отменяется: шапка стоит в
   обычном режиме и остаётся вне полного экрана.
4. «Регион — столица» получил карту с подсвеченным регионом вопроса:
   единый макет; столицу подсветка не выдаёт.

Последствия: AnswerFeedback удалён; ответ цифрами 1–4 с клавиатуры; список
«Ответить из списка» стал панелью поверх карты.
```

В `CHANGELOG.md` добавить запись по образцу соседних (дата 2026-08-17):
новый экран раундов — карта во весь кадр, клавиши 1–4, полноэкранный режим,
показ верного ответа вместо паузы-разбора.

- [ ] **Step 5: Ручная проверка сценария**

Запустить дев-сервер и пройти вручную:
1. «Найти на карте»: ответ по карте; ответ через панель списка; ошибка —
   плашка называет верный ответ и раунд едет дальше; ⛶ разворачивает и Esc
   возвращает; «Прервать раунд» выходит на главную.
2. «Назвать регион»: ответ мышью и клавишей `2`; исход виден на кнопках.
3. «Регион — столица»: карта подсвечивает спрошенный регион.
4. «Найти город» с зумом, «Заполнить карту» с показом неугаданного.
Проверить, что шапка стоит на месте в обычном режиме и исчезает в полном
экране.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat: снос паузы-разбора и мёртвых стилей, записи решений

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Самопроверка плана против спека

- Единый макет четырёх раундов — Tasks 3, 5–8. ✓
- Тёмные кнопки с клавишами 1–4 в полосе под картой — Tasks 2–3. ✓
- Отказ от разбора, автопереход ~2 с — Tasks 1, 5–7, 9. ✓
- Полноэкранная кнопка, шапка на месте — Tasks 1, 3. ✓
- Секундомер во всех раундах — Task 3 (строка) + 5–8 (`startedAt`). ✓
- «Ответить из списка» панелью с фокусом и Esc — Tasks 3–4, 5–8. ✓
- Доступность: aria-live плашки, порядок DOM, штрих+жирность у исходов,
  клавиши — Tasks 2, 3. ✓
- Домен не меняется; итоги, главная, атлас не трогаются. ✓
- DECISIONS/CHANGELOG — Task 9. ✓
