# План: сверка документов и два быстрых исправления

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Цель:** привести проект в честное состояние «MVP выполнен, кроме справок и режима учителя»: кнопка «Повторить ошибки» в итогах заполнения, правдивый текст на главной, сверенные критерии приёмки и документы, релиз 0.2.0.

**Архитектура:** домен не меняется. Кнопка повтора — правка границы App ↔ экран итогов по образцу `RoundResultsPage`. Остальное — правки текстов и документов по уже принятым решениям (спека `docs/superpowers/specs/2026-08-18-docs-sync-and-quick-fixes-design.md`).

**Стек:** React + TypeScript, vitest + @testing-library/react.

## Глобальные ограничения

- Интерфейс и документы — по-русски; китайские названия в Unicode.
- Компоненты не трогают `localStorage`; домен не вызывает `Math.random`.
- Новых иероглифов в контент не добавлять (иначе `npm run generate:fonts`); в правках этого плана их нет.
- Часть A (задачи 1–3) — ветка `feature/fill-repeat-mistakes` (уже создана, спека закоммичена в ней). Часть B (задачи 4–8) — ветка `docs/criteria-sync`, создаётся от master после слияния части A.
- Проверки: `npx vitest run <файл>` по задаче, перед слиянием — `npx vitest run`, `npm run lint`, `npm run build`.
- Коммиты завершаются строкой `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## Часть A — ветка `feature/fill-repeat-mistakes`

### Задача 1: FillMapResultsPage — кнопка «Повторить ошибки»

**Файлы:**
- Изменить: `src/features/results/FillMapResultsPage.tsx`
- Тест: `src/features/results/FillMapResultsPage.test.tsx`

**Интерфейсы:**
- Потребляет: `regionsWord(count: number): string` из `src/content/region-count.ts`; `summariseFillRound` уже используется.
- Производит: новые обязательные пропсы `idsToRepeat: readonly string[]` и `onRepeatMistakes: () => void` — задача 2 подключает их в `App.tsx`.

- [ ] **Шаг 1: написать падающие тесты**

В `src/features/results/FillMapResultsPage.test.tsx` заменить импорты и помощник `renderResults`, добавить помощник `roundWithMistake` и четыре теста:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import {
  answerFillRound,
  createFillRound,
  currentTarget,
  isFillRoundFinished,
  type FillRound,
} from '../../domain/fill-round';
import { createSeededRandom } from '../../domain/random';
import { FillMapResultsPage } from './FillMapResultsPage';
```

```tsx
/** Первый регион берётся со второй попытки: в раунде есть что повторять. */
function roundWithMistake(): FillRound {
  let round = createFillRound(regions, {
    roundId: 'r1',
    language: 'ru',
    random: createSeededRandom(1),
  });

  const asked = currentTarget(round).regionId;
  const other = regions.find((region) => region.id !== asked)!.id;
  round = answerFillRound(round, {
    answeredRegionId: other,
    durationMs: 1000,
    answeredAt: '2026-08-04T10:00:00.000Z',
  }).round;

  while (!isFillRoundFinished(round)) {
    round = answerFillRound(round, {
      answeredRegionId: currentTarget(round).regionId,
      durationMs: 1000,
      answeredAt: '2026-08-04T10:00:00.000Z',
    }).round;
  }

  return round;
}

type RenderOverrides = {
  readonly round?: FillRound;
  readonly idsToRepeat?: readonly string[];
  readonly onRepeatMistakes?: () => void;
};

function renderResults({
  round = finishedRound(),
  idsToRepeat = [],
  onRepeatMistakes = () => {},
}: RenderOverrides = {}) {
  return render(
    <FillMapResultsPage
      round={round}
      regions={regions}
      isProgressSaved
      idsToRepeat={idsToRepeat}
      onRepeatMistakes={onRepeatMistakes}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );
}
```

Существующие три теста не меняются: `renderResults()` без аргументов остаётся корректным вызовом. Новые тесты:

```tsx
it('на чистом раунде кнопки «Повторить ошибки» нет, даже если история непуста', () => {
  renderResults({ idsToRepeat: ['sichuan'] });

  expect(screen.queryByRole('button', { name: /Повторить ошибки/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Заполнить заново' })).toHaveClass(
    'primary',
  );
});

it('кнопка повтора называет число из истории и зовёт обработчик', () => {
  const onRepeatMistakes = vi.fn();
  renderResults({
    round: roundWithMistake(),
    idsToRepeat: ['a', 'b', 'c'],
    onRepeatMistakes,
  });

  const repeat = screen.getByRole('button', {
    name: 'Повторить ошибки: 3 региона',
  });
  fireEvent.click(repeat);

  expect(onRepeatMistakes).toHaveBeenCalledTimes(1);
  expect(repeat).toHaveClass('primary');
  expect(screen.getByRole('button', { name: 'Заполнить заново' })).toHaveClass(
    'secondary',
  );
});

it('говорит, что повтор шире списка этого раунда', () => {
  renderResults({ round: roundWithMistake(), idsToRepeat: ['a', 'b', 'c'] });

  expect(
    screen.getByText(
      /В повтор войдут все 3 региона с ошибками за последние 14 дней/,
    ),
  ).toBeInTheDocument();
});

it('не поясняет, когда повтор совпадает со списком раунда', () => {
  renderResults({ round: roundWithMistake(), idsToRepeat: ['a'] });

  expect(screen.queryByText(/за последние 14 дней/)).toBeNull();
});
```

- [ ] **Шаг 2: убедиться, что тесты падают**

Запустить: `npx vitest run src/features/results/FillMapResultsPage.test.tsx`
Ожидание: FAIL — у `FillMapResultsPage` нет пропса `idsToRepeat` (ошибка типов/`undefined`), новые тесты не находят кнопку.

- [ ] **Шаг 3: реализация**

В `src/features/results/FillMapResultsPage.tsx`:

Импорт: `import { regionsWord } from '../../content/region-count';`

Пропсы:

```tsx
export type FillMapResultsPageProps = {
  readonly round: FillRound;
  readonly regions: readonly Region[];
  readonly isProgressSaved: boolean;
  /**
   * Ровно тот набор, который запустит `onRepeatMistakes`: все ошибки за
   * последние 14 дней. Приходит извне по тому же доводу, что и в
   * RoundResultsPage: подпись кнопки не может разойтись с её действием.
   */
  readonly idsToRepeat: readonly string[];
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};
```

В теле компонента (после `reviewRegions`):

```tsx
const repeatCount = idsToRepeat.length;
const isRepeatWider = repeatCount > reviewRegions.length;
```

Внутри ветки `reviewRegions.length === 0 ? … : <>…</>` после `</ul>` добавить ту же поясняющую строку, что в `RoundResultsPage`:

```tsx
{isRepeatWider ? (
  <p>
    Здесь ошибки этого раунда. В повтор войдут все {repeatCount}{' '}
    {regionsWord(repeatCount)} с ошибками за последние 14 дней.
  </p>
) : null}
```

Блок действий заменить на:

```tsx
<div className="results-actions">
  {reviewRegions.length === 0 ? null : (
    <button type="button" className="primary" onClick={onRepeatMistakes}>
      Повторить ошибки: {repeatCount} {regionsWord(repeatCount)}
    </button>
  )}
  <button
    type="button"
    className={reviewRegions.length === 0 ? 'primary' : 'secondary'}
    onClick={onNewRound}
  >
    Заполнить заново
  </button>
  <button type="button" className="secondary" onClick={onExit}>
    В кабинет
  </button>
</div>
```

- [ ] **Шаг 4: тесты зелёные**

Запустить: `npx vitest run src/features/results/FillMapResultsPage.test.tsx`
Ожидание: PASS, включая три старых теста.

- [ ] **Шаг 5: коммит**

```bash
git add src/features/results/FillMapResultsPage.tsx src/features/results/FillMapResultsPage.test.tsx
git commit -m "feat: кнопка «Повторить ошибки» на итогах заполнения карты"
```

### Задача 2: App — запуск повтора из итогов заполнения

**Файлы:**
- Изменить: `src/App.tsx` (функция `finishFillRound`, ветка `screen === 'fill-results'`)
- Тест: `src/App.test.tsx`

**Интерфейсы:**
- Потребляет: пропсы `idsToRepeat`/`onRepeatMistakes` из задачи 1; `targetsToRepeat` (уже импортирован в App); `MISS_FLASH_MS` из `src/features/exercise/FillMapRound.tsx`.
- Производит: пользовательский путь «итоги заполнения → раунд по ошибкам» — на него ссылается критерий приёмки в задаче 6.

- [ ] **Шаг 1: написать падающий интеграционный тест**

В `src/App.test.tsx` дополнить импорт: `import { MISS_FLASH_MS } from './features/exercise/FillMapRound';`. Рядом с помощниками раунда столиц добавить помощников заполнения (образец — `src/features/exercise/FillMapRound.test.tsx`):

```tsx
/** В заполнении по-русски спрошенный регион назван в плашке `fill-target`. */
function askedFillRegion(): Region {
  const name = screen.getByTestId('fill-target').textContent;

  return regions.find((region) => region.nameRu === name)!;
}

function clickFillRegion(region: Region): void {
  const toggle = screen.getByRole('button', { name: 'Ответить из списка' });
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle);
  }

  // У закрытого региона к имени приписан исход, поэтому имя ищется по началу.
  fireEvent.click(
    screen.getByRole('button', {
      name: new RegExp(`^${region.nameRu} \\(${region.nameZh}\\)`),
    }),
  );
}

it('итог заполнения ведёт в раунд по ошибочным регионам', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /Заполнить карту/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  vi.useFakeTimers();
  try {
    // Первый регион берётся со второй попытки: одна ошибка уходит в историю.
    const first = askedFillRegion();
    const wrong = regions.find((region) => region.id !== first.id)!;
    clickFillRegion(wrong);
    act(() => {
      vi.advanceTimersByTime(MISS_FLASH_MS);
    });
    clickFillRegion(first);

    for (let index = 1; index < 34; index += 1) {
      clickFillRegion(askedFillRegion());
    }
  } finally {
    vi.useRealTimers();
  }

  fireEvent.click(
    screen.getByRole('button', { name: 'Повторить ошибки: 1 регион' }),
  );

  expect(screen.getByText(/Вопрос 1 из 1/)).toBeInTheDocument();
}, 20_000);
```

- [ ] **Шаг 2: убедиться, что тест падает**

Запустить: `npx vitest run src/App.test.tsx -t 'итог заполнения ведёт в раунд по ошибочным регионам'`
Ожидание: FAIL — сначала ошибка типов (у `FillMapResultsPage` не переданы обязательные пропсы), после их передачи-заглушки кнопка не находится.

- [ ] **Шаг 3: реализация**

В `src/App.tsx` `finishFillRound` считает список повтора тем же правилом, что `finishRound`:

```tsx
function finishFillRound(round: FillRound) {
  const updated = commitAttempts(round.attempts);
  setRepeatRegionIds(
    targetsToRepeat(updated.attempts, new Date(), 'region').map(
      (target) => target.id,
    ),
  );
  setFillRound(round);
  setScreen('fill-results');
}
```

Ветка `screen === 'fill-results'`:

```tsx
<FillMapResultsPage
  round={fillRound}
  regions={regions}
  isProgressSaved={store.isAvailable}
  idsToRepeat={repeatRegionIds}
  onRepeatMistakes={() =>
    startRound('find-on-map', language, repeatRegionIds)
  }
  onNewRound={() => startFillRound(language)}
  onExit={() => setScreen('home')}
/>
```

- [ ] **Шаг 4: тесты зелёные**

Запустить: `npx vitest run src/App.test.tsx`
Ожидание: PASS весь файл.

- [ ] **Шаг 5: коммит**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: повтор ошибок из итогов заполнения — раундом «Найти на карте»"
```

### Задача 3: CHANGELOG, полные проверки, ручная проверка, слияние

**Файлы:**
- Изменить: `CHANGELOG.md` (первая секция `### Added` внутри `[Unreleased]`)

- [ ] **Шаг 1: запись в CHANGELOG**

В начало первой секции `### Added` раздела `[Unreleased]` добавить:

```markdown
- Итоги «Заполнить карту»: кнопка «Повторить ошибки» запускает раунд «Найти
  на карте» по всем регионам с ошибками за последние 14 дней — как в
  остальных режимах. Раньше это был единственный режим без повтора.
```

- [ ] **Шаг 2: полные проверки**

Запустить по очереди: `npx vitest run`, `npm run lint`, `npm run build`.
Ожидание: все зелёные. Результат зафиксировать в итоговом сообщении владельцу.

- [ ] **Шаг 3: ручная проверка основного сценария**

Поднять дев-сервер (превью), пройти: главная → «Заполнить карту» → «Начать» → ошибиться на первом регионе один раз → дозаполнить карту → на итогах видна кнопка «Повторить ошибки: 1 регион» → нажать → раунд из одного вопроса → пройти → итоги повтора.

- [ ] **Шаг 4: коммит и слияние**

```bash
git add CHANGELOG.md
git commit -m "docs: запись в CHANGELOG о повторе ошибок в заполнении"
```

Слияние в master — по навыку `superpowers:finishing-a-development-branch` (варианты выбирает владелец).

---

## Часть B — ветка `docs/criteria-sync`

Создаётся после слияния части A: `git checkout master && git checkout -b docs/criteria-sync`.

### Задача 4: текст «Режимы» на главной

**Файлы:**
- Изменить: `src/features/home/HomePage.tsx` (абзац в секции `id="modes"`)

Тестов на этот текст нет (проверено грепом «три попытки»); задача — правка копирайта, TDD не применяется.

- [ ] **Шаг 1: заменить абзац**

Сейчас (строки ~217–221):

```tsx
<p>
  Карта — только начало. География, история и культура спрашиваются по
  одним правилам: три попытки, разбор после ошибки, повтор ошибок
  через день.
</p>
```

Заменить на:

```tsx
<p>
  Карта — только начало. География, история и культура спрашиваются по
  одним правилам: весь набор в каждом раунде, разбор ошибок на итогах,
  повтор ошибок за последние 14 дней.
</p>
```

- [ ] **Шаг 2: тесты главной зелёные**

Запустить: `npx vitest run src/features/home`
Ожидание: PASS.

- [ ] **Шаг 3: коммит**

```bash
git add src/features/home/HomePage.tsx
git commit -m "fix: секция «Режимы» обещает правила, которые в приложении есть"
```

### Задача 5: ACCEPTANCE_CRITERIA.md — переформулировки и отметки

**Файлы:**
- Изменить: `ACCEPTANCE_CRITERIA.md` (целиком, файл 23 строки)

- [ ] **Шаг 1: заменить содержимое файла**

```markdown
# Критерии приёмки MVP

## Контент и карта

- [x] В справочнике 34 единицы провинциального уровня, у каждой есть русское и китайское названия, пиньинь, центр и источник.
- [x] Каждому региону соответствует ровно одна интерактивная область SVG.
- [x] Карта работает мышью, касанием и клавиатурой; есть список-альтернатива.

## Учебный сценарий

- [x] Пользователь проходит раунд, где каждая цель набора спрашивается ровно один раз, в каждом игровом режиме.
- [x] После ответа видны текстовый результат и верный ответ; разбор ошибок — на итогах раунда.
- [x] Неверные ответы появляются при «Повторить ошибки» после раунда.
- [x] Все написанные игры доступны сразу и всем: закрытых по прогрессу нет.
- [x] Прогресс остаётся после перезагрузки; при ошибке хранилища упражнение не ломается.

## Качество

- [ ] Основной поток соответствует WCAG 2.2 AA: фокус, контраст, клавиатура, отсутствие опоры только на цвет. _(Живая проверка пока ручная: автопрогонов и e2e нет.)_
- [ ] На ширине 320 px нет потери основной функции. _(Открытая задача ROADMAP.md: мелкие регионы на карте непопадаемы, работает только список.)_
- [x] Сборка, линтер и автоматические тесты проходят.
- [ ] Нет блокирующих фактических ошибок и контент имеет документированные источники. _(У всех 12 коллекций `sourceIds` пуст.)_
- [x] CHANGELOG.md отражает версию и существенные изменения.
```

- [ ] **Шаг 2: коммит**

```bash
git add ACCEPTANCE_CRITERIA.md
git commit -m "docs: критерии приёмки сверены с кодом и отмечены"
```

### Задача 6: ARCHITECTURE.md, UI_UX.md, SPEC.md — снять устаревшие механики

**Файлы:**
- Изменить: `ARCHITECTURE.md` (абзац про шапку, строки 27–29)
- Изменить: `UI_UX.md` (пп. 4–5 и одно предложение в «Приоритетах»)
- Изменить: `SPEC.md` («Поток ученика», «Найди на карте», «Обратная связь», «Сложность»)

- [ ] **Шаг 1: ARCHITECTURE.md**

Абзац «Постоянная шапка стоит на главной… отняла бы высоту у карты.» заменить на:

```markdown
Постоянная шапка закреплена и стоит на всех поверхностях, включая экраны
ответа: её рисует кадр приложения (`AppFrame`), а не каждый экран. Раунд,
итоги и заполнение карты занимают кадр за вычетом шапки — высоту считает
`.app-frame` (решение владельца продукта, DECISIONS.md 2026-08-05).
```

- [ ] **Шаг 2: UI_UX.md**

Пункты 4–5 списка «Основные экраны» заменить на:

```markdown
4. Упражнение — оболочка `RoundStage`: карта занимает почти весь кадр, плашка вопроса плавает сверху по центру, тонкая служебная строка снизу (секундомер, счёт, след раунда, «Прервать раунд», «Во весь экран»). В играх с вариантами ответ выбирается из горизонтальной полосы тёмных кнопок под картой, в том числе клавишами 1–4; равнозначный список регионов открывается из панели «Ответить из списка».
5. Обратная связь: после ошибки плашка вопроса на ~2 секунды становится плашкой ответа и называет верный ответ; кнопки «Далее» нет — раунд переходит дальше сам. Полный разбор ошибок — на итогах.
```

В «Приоритетах интерфейса» предложение «Обратная связь появляется в той же колонке, где стоит вопрос, — глаз не переезжает после каждого ответа, и фокус переводится на её заголовок.» заменить на:

```markdown
Разбор ошибки показывает плашка ответа на месте плашки вопроса — глаз не переезжает после ответа.
```

- [ ] **Шаг 3: SPEC.md**

«Поток ученика» заменить на:

```markdown
Ученик открывает приложение, выбирает игру и язык вопроса, проходит раунд по всем целям набора, получает обратную связь после каждого ответа, затем видит итоги и может повторить ошибки. По умолчанию язык — русские названия, без таймера.
```

В «Найди на карте» фразу «затем отображается объяснение» заменить: «…правильная подсвечивается, затем раунд сам переходит к следующему вопросу.»

Раздел «Обратная связь» заменить на:

```markdown
## Обратная связь

После ошибки плашка вопроса на ~2 секунды становится плашкой ответа: верно/неверно и правильный ответ, затем раунд сам переходит к следующему вопросу. Только цвет не является носителем результата: используются текст и обводка. Полный разбор ошибок — на экране итогов.
```

Раздел «Сложность» заменить на:

```markdown
## Язык вопроса

Уровней сложности нет (решение 2026-08-05 «уровней не осталось нигде»): язык вопроса — русский или китайский — ученик выбирает переключателем на карточке игры, и он записывается в попытку. Освоенность цели — три верных ответа в разных раундах, хотя бы один на вопрос иероглифами.
```

- [ ] **Шаг 4: коммит**

```bash
git add ARCHITECTURE.md UI_UX.md SPEC.md
git commit -m "docs: ARCHITECTURE, UI_UX и SPEC сверены с RoundStage и снятием уровней"
```

### Задача 7: DATA_MODEL.md и MVP.md

**Файлы:**
- Изменить: `DATA_MODEL.md` (тип `Target`, новые типы, две строки прозы)
- Изменить: `MVP.md` (раздел «Входит»)

- [ ] **Шаг 1: DATA_MODEL.md**

В типе `Target` строку `kind: 'region' | 'city';` заменить на `kind: 'region' | 'city' | 'physical';`.

После блока `type City` добавить (упрощённые формы; точные — `src/content/types.ts` и `src/content/collections.ts`):

```ts
type PhysicalFeature = {
  id: string;              // yangtze
  kind: 'river' | 'landform' | 'lake';
  nameRu: string;
  nameZh: string;
  pinyin: string;
  regionIds: string[];     // каких регионов касается; проверяется геометрией
  facts: Fact[];
  sourceIds: string[];
  // river несёт riverNums, landform — step и landform, lake — lakeIds:
  // привязку к геометрии Natural Earth, см. src/content/types.ts
};

type Collection = {
  id: string;              // great-wall
  groupId: 'geography' | 'by-region' | 'culture';
  nameRu: string;
  nameZh: string;
  pinyin: string;
  kind: string;            // подпись на карточке: «Хребет», «Река»…
  lead: string;
  regionIds: string[];
  notes: string[];
  photos: CollectionPhoto[];
  sourceIds: string[];     // пустой список — признак черновика
  relatedIds: string[];
};
```

В прозу после абзаца «Вид цели входит в саму цель…» добавить:

```markdown
Пустой `sourceIds` у коллекции — признак черновика (решение 2026-08-04): пометка снимается сама, когда у коллекции появляются источники.
```

- [ ] **Шаг 2: MVP.md**

Раздел «Входит» заменить на:

```markdown
## Входит

1. Главная-лендинг с карточками игровых режимов (экран выбора темы заменён лендингом, решение 2026-08-04).
2. SVG-карта регионов провинциального уровня, масштабирование и выбор мышью, касанием или клавиатурой.
3. Игровые режимы: найти регион, назвать подсвеченный регион, «регион — столица», «Заполнить карту», три игры по городам и две по физической географии (сверх исходных трёх). «История» и «Культура» готовятся.
4. База не менее 34 единиц провинциального уровня с русским названием, китайским названием, пиньинем и административным центром; сверх того — каталоги городов и объектов физической географии.
5. Карточка региона с краткой проверенной справкой. **Не выполнено: `facts` пусты у всех регионов.**
6. Итог раунда: точность, время, ошибки, кнопка повторить ошибки.
7. Локальное сохранение прогресса без регистрации. Экспорт, импорт и сброс прогресса не сделаны.
8. Учительский просмотр: код класса/демонстрационные данные либо импорт локального результата; без облачного хранения. **Не начат.**
```

- [ ] **Шаг 3: коммит**

```bash
git add DATA_MODEL.md MVP.md
git commit -m "docs: модель данных знает физические цели и коллекции, MVP — реальный объём"
```

### Задача 8: DECISIONS.md, CHANGELOG 0.2.0, проверки, слияние

**Файлы:**
- Изменить: `DECISIONS.md` (две строки таблицы)
- Изменить: `CHANGELOG.md` (слияние секций `[Unreleased]`, релиз 0.2.0)

- [ ] **Шаг 1: записи решений**

В таблицу `DECISIONS.md` добавить сверху (формат — дата, решение, довод; как существующие строки):

```markdown
| 2026-08-18 | «Повторить ошибки» из итогов заполнения запускает раунд «Найти на карте» | Заполнение оставалось единственным режимом без повтора (пункт 6 MVP). Вариант «раунд заполнения только по ошибочным регионам» отклонён: семантика повтора разошлась бы с остальными режимами — там повтор берёт все ошибки за 14 дней, — а `FillMapRound` и карта потребовали бы доработки. Список повтора считается тем же правилом `targetsToRepeat`, что и везде; кнопка видна, только когда в этом раунде есть что повторять. |
| 2026-08-18 | Критерии приёмки сверены с кодом и переписаны под принятые решения | Чекбоксы стояли пустыми с 1 августа, а два критерия противоречили решениям. «После ответа видно объяснение» переписан под отмену паузы-разбора (2026-08-17): «текстовый результат и верный ответ; разбор — на итогах». «Раунд из 34 вопросов во всех трёх режимах» переписан под девять режимов и длину раунда как свойство темы (2026-08-03). Пустыми честно оставлены: WCAG (автопрогонов нет), 320 px (открытая задача), источники (у коллекций `sourceIds` пуст). |
```

- [ ] **Шаг 2: CHANGELOG — слить секции и выпустить 0.2.0**

Внутри `## [Unreleased]` заголовки `### Added`, `### Fixed`, `### Changed`, `### Removed`, `### Specs` встречаются по 2–3 раза (файл рос склейкой). Механика правки:

1. Для каждого дублирующегося заголовка перенести содержимое поздних вхождений под первое (порядок пунктов сохранить), лишние заголовки удалить.
2. Секцию `### Planned` (если есть пункты) перенести в новый пустой `## [Unreleased]`.
3. Строку `## [Unreleased]` заменить на `## [0.2.0] — 2026-08-18`, а над ней добавить:

```markdown
## [Unreleased]
```

Пункты из прежней секции `### Planned` переносятся в этот новый `[Unreleased]` под тем же заголовком `### Planned`; если секция пуста, новый `[Unreleased]` остаётся без подсекций.

4. В `### Changed` раздела 0.2.0 добавить пункт:

```markdown
- Документы сверены с кодом: критерии приёмки отмечены и переформулированы
  под принятые решения, ARCHITECTURE/UI_UX/SPEC описывают RoundStage и
  отсутствие уровней, DATA_MODEL знает вид цели `physical` и коллекции,
  MVP.md называет реальный объём. Секция «Режимы» на главной обещает
  правила, которые в приложении есть.
```

- [ ] **Шаг 3: полные проверки**

`npx vitest run`, `npm run lint`, `npm run build` — все зелёные. Ручная проверка: открыть приложение, убедиться, что секция «Режимы» показывает новый текст.

- [ ] **Шаг 4: коммит и слияние**

```bash
git add DECISIONS.md CHANGELOG.md
git commit -m "docs: записи решений и релиз 0.2.0"
```

Слияние — по навыку `superpowers:finishing-a-development-branch`.
