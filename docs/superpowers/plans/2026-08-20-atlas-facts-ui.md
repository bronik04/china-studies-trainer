# План: справка в карточке атласа и имена источников

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Цель:** карточка атласа показывает справку (факты + строка источников) по утверждённому макету «вариант А», а страница коллекции называет источники именами вместо голых id.

**Архитектура:** данные уже готовы (`region.facts`, `feature.facts`, реестр источников). Добавляются: поле `shortLabel` у `Source`, чистый помощник `sourceById`, блок `CardFacts` в `AtlasPage`, замена рендера id на странице коллекции. Домен не тронут.

**Стек:** React + TypeScript, vitest + @testing-library/react.

## Глобальные ограничения

- Утверждённый макет: `docs/screens/04-atlas-card-facts-v1.html`, вариант А. Варианты Б (сноски) и В (свёртки) отклонены владельцем.
- Компоненты пользуются только семантическим слоем токенов (`--text-*`, `--line-*`); примитивы `--c-*` в styles.css не писать. Тело факта поэтому набирается `--text-on-paper` (в макете стоял примитив ink-700 — осознанное отступление в пользу правила токенов).
- Никаких новых интерактивных элементов: блок — обычный поток текста, порядок Tab не меняется.
- Данные фактов и реестра не редактируются (кроме добавления `shortLabel`); `docs/sources/sources.md` НЕ трогаем — `shortLabel` поле интерфейсное, в реестре-документе его нет.
- Ветка `feature/atlas-facts-ui` (создана, спека и макет в ней).
- Коммиты завершаются строкой `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Задача 1: `shortLabel` и `sourceById` в контент-слое

**Файлы:**
- Изменить: `src/content/types.ts` (тип `Source`)
- Изменить: `src/content/sources.ts` (поле у записей + помощник)
- Тест: `src/content/sources.test.ts` (новый)

**Интерфейсы:**
- Производит: `Source.shortLabel?: string`; `sourceById(id: string): Source | undefined` — задачи 2 и 3 используют оба.

- [ ] **Шаг 1: падающие тесты**

Создать `src/content/sources.test.ts`:

```ts
import { sourceById, sources } from './sources';

it('находит запись реестра по id', () => {
  expect(sourceById('prc-administrative-divisions-2022')?.organization).toBe(
    '中国政府网',
  );
});

it('возвращает undefined для неизвестного id', () => {
  expect(sourceById('missing')).toBeUndefined();
});

it('короткие имена крупных организаций фактов заданы', () => {
  expect(sourceById('britannica-sichuan')?.shortLabel).toBe('Britannica');
  expect(sourceById('bre-earthquake')?.shortLabel).toBe('БРЭ');
  expect(sourceById('unesco-sichuan-panda-1213')?.shortLabel).toBe('ЮНЕСКО');
});

/*
 * Одна организация — одно короткое имя. Иначе строка карточки могла бы
 * назвать одну и ту же организацию двумя словами.
 */
it('организация несёт один и тот же shortLabel во всех записях', () => {
  const byOrganization = new Map<string, string | undefined>();
  for (const source of sources) {
    if (byOrganization.has(source.organization)) {
      expect(source.shortLabel).toBe(byOrganization.get(source.organization));
    } else {
      byOrganization.set(source.organization, source.shortLabel);
    }
  }
});
```

- [ ] **Шаг 2: прогон — падают**

`npx vitest run src/content/sources.test.ts` — FAIL: `sourceById` не экспортирован (и `shortLabel` не заполнен).

- [ ] **Шаг 3: реализация**

В `src/content/types.ts`, тип `Source`, после поля `organization`:

```ts
  /** Короткое имя организации для строк интерфейса («Britannica», «БРЭ»). */
  readonly shortLabel?: string;
```

Заполнение реестра — механически, одной командой (вставляет `shortLabel`
после каждой строки `organization` четырёх организаций; ~110 записей):

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('src/content/sources.ts')
text = p.read_text()
MAP = {
    'Encyclopaedia Britannica': 'Britannica',
    'Большая российская энциклопедия': 'БРЭ',
    'UNESCO World Heritage Centre': 'ЮНЕСКО',
    'UNESCO Intangible Cultural Heritage': 'ЮНЕСКО',
}
for org, short in MAP.items():
    old = f"organization: '{org}',"
    new = old + f"\n    shortLabel: '{short}',"
    assert old in text, org
    text = text.replace(old, new)
p.write_text(text)
EOF
```

Остальные организации (`Natural Earth`, `中国政府网` и др.) короткого имени
не получают — их полное имя короткое либо они не встречаются в строке
карточки.

Помощник — в конец `src/content/sources.ts`:

```ts
const sourceIndex = new Map<string, Source>(
  sources.map((source) => [source.id, source]),
);

/** Запись реестра по id; undefined — источник неизвестен. */
export function sourceById(id: string): Source | undefined {
  return sourceIndex.get(id);
}
```

(Импорт типа `Source` в файле уже есть.)

- [ ] **Шаг 4: прогон — зелёные**

`npx vitest run src/content/sources.test.ts` — PASS 4/4. Затем `npx tsc -b` — чисто.

- [ ] **Шаг 5: коммит**

```bash
git add src/content/types.ts src/content/sources.ts src/content/sources.test.ts
git commit -m "feat: короткие имена организаций и sourceById в реестре"
```

### Задача 2: блок «Справка» в карточке атласа

**Файлы:**
- Изменить: `src/features/atlas/AtlasPage.tsx`
- Изменить: `src/styles.css` (после блока «--- Атлас ---», рядом со стилями карточки)
- Тест: `src/features/atlas/AtlasPage.test.tsx`

**Интерфейсы:**
- Потребляет: `sourceById`, `Source.shortLabel` из задачи 1; `Fact` из `src/content/types.ts`.
- Производит: блок `CardFacts` — внутренний для AtlasPage, наружу не экспортируется.

- [ ] **Шаг 1: падающие тесты**

В `src/features/atlas/AtlasPage.test.tsx` добавить (стиль файла — хелпер `renderAtlas`, выбор реки клавишей Enter):

```tsx
it('карточка региона показывает справку с темами и строкой источников', () => {
  renderAtlas('sichuan');

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Справка');
  expect(card).toHaveTextContent('Убежище большой панды');
  expect(card).toHaveTextContent(/Источники: /);
  expect(card).toHaveTextContent('Britannica');
  expect(card).toHaveTextContent('ЮНЕСКО');
  // В строке — короткие имена; полное имя организации не печатается.
  expect(card).not.toHaveTextContent('Encyclopaedia Britannica');
});

/*
 * У физических объектов facts пока пусты (контентные ветки наполняли регионы
 * и коллекции) — блок обязан молча не рендериться, а не показывать пустую
 * «Справку». Когда факты объектов наполнят, компонент заработает без правок,
 * и этот тест нужно будет заменить позитивным.
 */
it('пустая справка физического объекта не рендерится', () => {
  renderAtlas();

  fireEvent.click(screen.getByRole('radio', { name: 'Физическая' }));
  fireEvent.keyDown(screen.getByLabelText(/Хуанхэ/), { key: 'Enter' });

  const card = screen.getByTestId('atlas-region-card');

  expect(card).toHaveTextContent('Хуанхэ');
  expect(card).not.toHaveTextContent('Справка');
});
```

- [ ] **Шаг 2: прогон — падают**

`npx vitest run src/features/atlas/AtlasPage.test.tsx` — два новых FAIL («Справка» не находится), остальные PASS.

- [ ] **Шаг 3: реализация**

В `src/features/atlas/AtlasPage.tsx`:

Импорты: добавить `Fact` в импорт типов из `../../content/types`; добавить
`import { sourceById } from '../../content/sources';`.

Над компонентом `AtlasPage` — два помощника:

```tsx
/**
 * Строка «Источники: …». Дедупликация — по показанному имени, а не по
 * организации: два подразделения ЮНЕСКО в реестре должны схлопнуться в одно
 * слово.
 */
function factSourcesLine(facts: readonly Fact[]): string | null {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const fact of facts) {
    for (const sourceId of fact.sourceIds) {
      const source = sourceById(sourceId);
      if (source === undefined) {
        continue;
      }
      const label = source.shortLabel ?? source.organization;
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
  }

  return labels.length === 0 ? null : labels.join(' · ');
}

/**
 * Справка карточки: темы и тела фактов, внизу — строка источников. Блок один
 * для региона и физического объекта (утверждённый макет
 * docs/screens/04-atlas-card-facts-v1.html, вариант А).
 */
function CardFacts({ facts }: { readonly facts: readonly Fact[] }) {
  if (facts.length === 0) {
    return null;
  }

  const sourcesLine = factSourcesLine(facts);

  return (
    <section className="atlas-facts" aria-label="Справка">
      <p className="eyebrow">Справка</p>
      {facts.map((fact) => (
        <div className="atlas-fact" key={fact.title}>
          <h3>{fact.title}</h3>
          <p>{fact.body}</p>
        </div>
      ))}
      {sourcesLine === null ? null : (
        <p className="atlas-sources">Источники: {sourcesLine}</p>
      )}
    </section>
  );
}
```

Вставки в разметку карточки:
- ветка региона: после `<p>Административный центр: …</p>`, перед списком городов — `<CardFacts facts={selected.facts} />`;
- ветка физического объекта: после `</ul>` списка регионов — `<CardFacts facts={selectedFeature.facts} />`.

В `src/styles.css`, в раздел атласа (после правил `.atlas-region-card p`):

```css
/*
 * Справка карточки: утверждённый макет docs/screens/04-atlas-card-facts-v1,
 * вариант А. Тело факта набрано основным тоном бумаги: примитив потемнее из
 * макета нарушил бы правило «компоненты пользуются семантическим слоем».
 */
.atlas-facts {
  border-top: var(--border-hair) solid var(--line-on-paper);
  margin-block-start: var(--s-4);
  padding-block-start: var(--s-3);
}

.atlas-fact {
  margin-block-end: var(--s-3);
}

.atlas-fact h3 {
  font-size: var(--t-size-body);
  font-weight: var(--t-weight-medium);
  margin-block-end: var(--s-1);
}

.atlas-fact p {
  color: var(--text-on-paper);
  font-size: 0.9375rem;
}

.atlas-sources {
  border-top: var(--border-hair) solid var(--line-on-paper);
  color: var(--text-on-paper-muted);
  font-size: var(--t-size-caption);
  margin-block-start: var(--s-3);
  padding-block-start: var(--s-2);
}
```

- [ ] **Шаг 4: прогон — зелёные**

`npx vitest run src/features/atlas/AtlasPage.test.tsx` — PASS весь файл. Затем `npm run build` — зелёный (иероглифы фактов уже в подмножествах шрифтов — контент не менялся).

- [ ] **Шаг 5: коммит**

```bash
git add src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/styles.css
git commit -m "feat: справка с фактами и источниками в карточке атласа"
```

### Задача 3: имена источников на странице коллекции, документы, проверки

**Файлы:**
- Изменить: `src/features/collections/CollectionPage.tsx` (список в панели «Источники»)
- Тест: `src/features/collections/CollectionPage.test.tsx`
- Изменить: `UI_UX.md` (п. 2), `MVP.md` (п. 5), `DECISIONS.md`, `CHANGELOG.md`

**Интерфейсы:**
- Потребляет: `sourceById`, `shortLabel` из задачи 1.

- [ ] **Шаг 1: падающий тест**

В `src/features/collections/CollectionPage.test.tsx` (хелпер `renderPage(id)` в файле уже есть):

```tsx
it('называет источники именами, а не идентификаторами', () => {
  renderPage('great-wall');

  const panel = screen.getByText('Источники').closest('section')!;

  expect(panel).toHaveTextContent('ЮНЕСКО');
  expect(panel).not.toHaveTextContent('unesco-great-wall-438');
});
```

- [ ] **Шаг 2: прогон — падает**

`npx vitest run src/features/collections/CollectionPage.test.tsx` — новый тест FAIL (в панели голые id), остальные PASS.

- [ ] **Шаг 3: реализация**

В `src/features/collections/CollectionPage.tsx` добавить импорт
`import { sourceById } from '../../content/sources';` и заменить тело списка
источников (сейчас `<li key={sourceId}>{sourceId}</li>`):

```tsx
<ul className="rule-list">
  {collection.sourceIds.map((sourceId) => {
    const source = sourceById(sourceId);

    return (
      <li key={sourceId}>
        {source === undefined
          ? sourceId
          : `${source.title} — ${source.shortLabel ?? source.organization}`}
      </li>
    );
  })}
</ul>
```

(Неизвестный id валидатор не пропускает; голый id остаётся защитной веткой.)

- [ ] **Шаг 4: прогон — зелёный, документы**

`npx vitest run src/features/collections/CollectionPage.test.tsx` — PASS.

Правки документов:

1. `UI_UX.md`, п. 2 заменить на:

```markdown
2. Атлас: карта во весь кадр, справа панель с карточкой выбранного региона — название, пиньинь, тип, административный центр, справка из 2–3 фактов со строкой источников — и списком с поиском. Зум — в углу самой карты.
```

2. `MVP.md`, п. 5 заменить на:

```markdown
5. Карточка региона с краткой проверенной справкой.
```

(пометка «**Не выполнено…**» снимается — данные и интерфейс готовы).
В `ACCEPTANCE_CRITERIA.md` правок нет: отдельного чекбокса про карточку там
не существует, спека в этом месте ссылалась на пункт MVP.

3. `DECISIONS.md`, строка сверху таблицы:

```markdown
| 2026-08-20 | Справка карточки атласа — вариант А: темы и строка источников | Владелец выбрал из трёх макетов высокой точности на настоящей карте (docs/screens/04-atlas-card-facts-v1.html). Каждый факт — тема и тело; источники — одной приглушённой строкой коротких имён организаций («Britannica · БРЭ · ЮНЕСКО»), без пофактных сносок (вариант Б отклонён) и без свёрток (вариант В отклонён). Города остаются открытым списком. Короткое имя — поле `shortLabel` записи реестра; дедупликация строки — по показанному имени, чтобы два подразделения ЮНЕСКО схлопывались в одно слово. |
```

4. `CHANGELOG.md`, `[Unreleased]` → `### Added`:

```markdown
- Карточка атласа показывает справку: 2–3 факта региона с темами и строкой
  источников (утверждённый макет — вариант А,
  docs/screens/04-atlas-card-facts-v1.html); карточка физического объекта
  покажет её той же разметкой, когда факты объектов будут наполнены.
  Страница коллекции называет источники именами статей и организаций вместо
  голых идентификаторов. Пункт 5 MVP «карточка с краткой проверенной
  справкой» закрыт.
```

- [ ] **Шаг 5: полные проверки**

`npx vitest run`, `npm run lint`, `npm run build` — все зелёные; итоги — в отчёт.

- [ ] **Шаг 6: коммит**

```bash
git add src/features/collections/CollectionPage.tsx src/features/collections/CollectionPage.test.tsx UI_UX.md MVP.md DECISIONS.md CHANGELOG.md
git commit -m "feat: имена источников на странице коллекции, документы о справке"
```

Дальше — ручная проверка в браузере (атлас: Сычуань и Хуанхэ; коллекция: стена), финальное сквозное ревью ветки и слияние (контролёр).
