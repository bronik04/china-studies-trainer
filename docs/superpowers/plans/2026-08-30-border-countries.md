# Страны-соседи — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:subagent-driven-development`
> (рекомендуется) или `superpowers:executing-plans` — выполнять задача за
> задачей. Шаги помечены чекбоксами (`- [ ]`).

**Цель.** Слой из четырнадцати сопредельных стран за границей Китая и две игры
по ним: «Найти страну» и «Назвать страну».

**Устройство.** Геометрия извлекается из Natural Earth по сети отдельной
командой, кладётся выжимкой в репозиторий и превращается генератором в
сгенерированный модуль путей — тот же приём, что у физической карты. Слой
рисуется порталом внутрь карты и включается только в двух играх. Справочник
имён живёт в `src/content`, геометрия — в `src/map`.

**Стек.** TypeScript, React 19, Vite, vitest + @testing-library/react. Проверки:
`npm run lint`, `npm test`, `npm run build`.

Спецификация: `docs/superpowers/specs/2026-08-30-border-countries-design.md`.

## Общие ограничения

- Сеть — только в командах `extract:*`. Ни сборка, ни раунд сетевых запросов не
  делают.
- Геоданные и тексты имеют источник в `docs/sources` и запись в реестре
  `src/content/sources.ts`.
- Домен не знает React и DOM; карта не считает правильность ответа.
- Исход и состояние не передаются одним лишь цветом.
- Значения — только токенами из `src/design/tokens.css`.
- Сгенерированные файлы руками не правятся, у каждого отпечаток входов, сверяемый
  в `validate:map`.
- Новые иероглифы (имена стран по-китайски) обязаны попасть в подмножество
  шрифта: `npm run generate:fonts`.
- Коммиты частые, по одной задаче, сообщения по-русски.

---

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `scripts/extract-countries-source.ts` | скачивает два набора Natural Earth, оставляет нужное, пишет выжимку |
| `scripts/data/countries-source.json` | выжимка: 14 стран и спорные участки в градусах |
| `scripts/generate-country-geometry.ts` | переводит в координаты карты, обрезает по кадру, упрощает, пишет модуль |
| `src/map/country-geometry.ts` | сгенерированные пути стран и спорных участков, отпечаток |
| `src/content/countries.ts` | справочник: id, русское и китайское имя, источник |
| `src/map/CountryLayer.tsx` | слой: заливки стран, штриховка спорных участков, подписи |
| `src/map/ChinaMap.tsx` | признак `showsCountries` и портал слоя |
| `src/domain/country-choices.ts` | четыре варианта для «назвать страну» |
| `src/features/exercise/CountryRound.tsx` | экран обеих игр |
| `src/features/exercise/CountryAnswerList.tsx` | равнозначный список стран |
| `src/App.tsx`, `exercise-modes.ts`, `HomePage.tsx` | карточки и запуск |

---

### Task 1: Справочник стран

**Файлы:**
- Создать: `src/content/countries.ts`
- Создать: `src/content/countries.test.ts`
- Изменить: `src/content/sources.ts`
- Создать: `docs/sources/countries.md`

**Интерфейсы:**
- Отдаёт: `type Country = { id, nameRu, nameZh, sourceIds }` и
  `countries: readonly Country[]` (14 записей). На них опираются задачи 2–7.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/content/countries.test.ts`:

```ts
import { countries } from './countries';
import { sources } from './sources';

it('знает четырнадцать сухопутных соседей', () => {
  expect(countries).toHaveLength(14);
  expect(countries.map((country) => country.id).sort()).toEqual([
    'afghanistan',
    'bhutan',
    'india',
    'kazakhstan',
    'kyrgyzstan',
    'laos',
    'mongolia',
    'myanmar',
    'nepal',
    'north-korea',
    'pakistan',
    'russia',
    'tajikistan',
    'vietnam',
  ]);
});

it('не содержит Тайвань, Гонконг и Макао: на нашей карте это регионы Китая', () => {
  const ids = countries.map((country) => country.id);

  for (const own of ['taiwan', 'hong-kong', 'macao']) {
    expect(ids).not.toContain(own);
  }
});

it('у каждой страны есть имя на двух языках и известный источник', () => {
  const known = new Set(sources.map((source) => source.id));

  for (const country of countries) {
    expect(country.nameRu.trim().length).toBeGreaterThan(0);
    expect(country.nameZh.trim().length).toBeGreaterThan(0);
    expect(country.sourceIds.length).toBeGreaterThan(0);
    for (const sourceId of country.sourceIds) {
      expect(known.has(sourceId)).toBe(true);
    }
  }
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/content/countries.test.ts`
Ожидается: FAIL — модуля `./countries` нет.

- [ ] **Шаг 3: Написать справочник**

Создать `src/content/countries.ts`. Имена взяты из полей `NAME_RU` и `NAME_ZH`
набора Natural Earth дословно:

```ts
export type Country = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly sourceIds: readonly string[];
};

/**
 * Четырнадцать государств, с которыми у Китая сухопутная граница.
 *
 * Тайваня, Гонконга и Макао здесь нет: на нашей карте это регионы Китая, и
 * рисовать их вторым слоем значило бы спорить с собственной картой.
 *
 * Имена — из того же набора Natural Earth, что и геометрия: два источника для
 * контура и подписи разошлись бы. У КНДР китайское имя полное
 * (朝鲜民主主义人民共和国) — источник поправлен не будет, сокращать его от себя
 * не наше дело.
 */
const SOURCE = ['natural-earth-countries-5.1.2'] as const;

function country(id: string, nameRu: string, nameZh: string): Country {
  return { id, nameRu, nameZh, sourceIds: SOURCE };
}

export const countries: readonly Country[] = [
  country('russia', 'Россия', '俄罗斯'),
  country('mongolia', 'Монголия', '蒙古国'),
  country('north-korea', 'КНДР', '朝鲜民主主义人民共和国'),
  country('kazakhstan', 'Казахстан', '哈萨克斯坦'),
  country('kyrgyzstan', 'Киргизия', '吉尔吉斯斯坦'),
  country('tajikistan', 'Таджикистан', '塔吉克斯坦'),
  country('afghanistan', 'Афганистан', '阿富汗'),
  country('pakistan', 'Пакистан', '巴基斯坦'),
  country('india', 'Индия', '印度'),
  country('nepal', 'Непал', '尼泊尔'),
  country('bhutan', 'Бутан', '不丹'),
  country('myanmar', 'Мьянма', '缅甸'),
  country('laos', 'Лаос', '老挝'),
  country('vietnam', 'Вьетнам', '越南'),
];

export function countryById(id: string): Country | undefined {
  return countries.find((country) => country.id === id);
}
```

- [ ] **Шаг 4: Записать источники**

В `src/content/sources.ts` добавить две записи рядом с прочими наборами Natural
Earth (взять их поля за образец): `natural-earth-countries-5.1.2` (набор
`ne_50m_admin_0_countries`, покрывает «границы и имена сопредельных государств»)
и `natural-earth-disputed-areas-5.1.2` (набор
`ne_10m_admin_0_disputed_areas`, покрывает «спорные участки границы»).

Создать `docs/sources/countries.md` по образцу `docs/sources/physical.md`: что за
наборы, откуда скачаны, какой лицензией (public domain), какие поля взяты
(`NAME_RU`, `NAME_ZH`, `NOTE_BRK`), когда получены.

- [ ] **Шаг 5: Пересобрать шрифты и проверить**

Запустить: `npm run generate:fonts && npx vitest run src/content/countries.test.ts && npm run build`
Ожидается: подмножество пополнилось иероглифами имён, тесты зелёные, сборка
проходит.

- [ ] **Шаг 6: Коммит**

```bash
git add src/content/countries.ts src/content/countries.test.ts src/content/sources.ts docs/sources/countries.md src/assets/fonts scripts/font-coverage.json
git commit -m "feat: справочник четырнадцати сопредельных государств"
```

---

### Task 2: Извлечение геометрии по сети

**Файлы:**
- Создать: `scripts/extract-countries-source.ts`
- Создать (командой): `scripts/data/countries-source.json`
- Изменить: `package.json`

**Интерфейсы:**
- Берёт из задачи 1: `countries` (какие страны оставлять).
- Отдаёт: выжимку `{ countries: [{ id, rings }], disputed: [{ id, nameRu, note, rings }] }`
  в градусах, координаты с пятью знаками. На неё опирается задача 3.

- [ ] **Шаг 1: Написать скрипт**

Создать `scripts/extract-countries-source.ts` по образцу
`scripts/extract-physical-source.ts` (шапка, `load`, обрезка точности):

```ts
/**
 * Выжимка из Natural Earth для слоя сопредельных государств.
 *
 * Полные наборы весят мегабайты и в репозиторий не кладутся, а без них
 * генератор невоспроизводим. Скрипт берёт только 14 стран и относящиеся к
 * сухопутной границе Китая спорные участки.
 *
 * Нужна сеть. В сборку не входит.
 *
 * Запуск: npm run extract:countries
 */
import { writeFileSync } from 'node:fs';
import { countries } from '../src/content/countries';

const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const OUT = new URL('data/countries-source.json', import.meta.url);
const PRECISION = 5;

/** Имя набора в Natural Earth → наш идентификатор. */
const ADMIN_TO_ID: Readonly<Record<string, string>> = {
  Russia: 'russia',
  Mongolia: 'mongolia',
  'North Korea': 'north-korea',
  Kazakhstan: 'kazakhstan',
  Kyrgyzstan: 'kyrgyzstan',
  Tajikistan: 'tajikistan',
  Afghanistan: 'afghanistan',
  Pakistan: 'pakistan',
  India: 'india',
  Nepal: 'nepal',
  Bhutan: 'bhutan',
  Myanmar: 'myanmar',
  Laos: 'laos',
  Vietnam: 'vietnam',
};

/*
 * Спорные участки берутся по имени, а не по признаку «упоминается Китай»:
 * набор помечает так и морские споры, а игра о сухопутной границе.
 */
const DISPUTED_NAMES: readonly string[] = [
  'Aksai Chin',
  'Arunachal Pradesh',
  'Shaksam Valley',
  'Demchok',
  'Samdu Valleys',
  'Tirpani Valleys',
  'Bara Hotii Valleys',
  'Bhutan (northwest valleys)',
  'Bhutan (Chumbi salient)',
  'Siachen Glacier',
];
```

Дальше: `load('ne_50m_admin_0_countries')` и
`load('ne_10m_admin_0_disputed_areas')`, разбор `Polygon`/`MultiPolygon` в
список колец, округление координат до `PRECISION`, запись JSON. У спорного
участка сохраняются `NAME_RU` и `NOTE_BRK` — подпись берётся из источника, а не
пишется от себя.

Скрипт обязан упасть с внятным сообщением, если какой-то страны или участка в
наборе не нашлось: молчаливая потеря соседа — худшее, что тут может случиться.

- [ ] **Шаг 2: Завести команду**

В `package.json`, рядом с `extract:physical`:

```json
    "extract:countries": "tsx scripts/extract-countries-source.ts",
```

- [ ] **Шаг 3: Прогнать**

Запустить: `npm run extract:countries`
Ожидается: сообщение о числе объектов и файл `scripts/data/countries-source.json`
с четырнадцатью странами и десятью спорными участками.

- [ ] **Шаг 4: Коммит**

```bash
git add scripts/extract-countries-source.ts scripts/data/countries-source.json package.json
git commit -m "feat: выжимка Natural Earth для слоя стран"
```

---

### Task 3: Генератор геометрии

**Файлы:**
- Создать: `scripts/generate-country-geometry.ts`
- Создать (командой): `src/map/country-geometry.ts`
- Создать: `src/map/country-geometry.test.ts`
- Изменить: `package.json`, `scripts/validate-map.ts`

**Интерфейсы:**
- Отдаёт: `COUNTRY_SHAPES: readonly { id: string; d: string }[]`,
  `DISPUTED_SHAPES: readonly { id: string; nameRu: string; note: string; d: string }[]`,
  `COUNTRIES_INPUTS_FINGERPRINT: string`. На них опираются задачи 4–6.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/map/country-geometry.test.ts`:

```ts
import { countries } from '../content/countries';
import { COUNTRY_SHAPES, DISPUTED_SHAPES } from './country-geometry';
import { parseMapPath } from './svg-path';
import { regionContours } from '../../scripts/palette-fingerprint';
import { readFileSync } from 'node:fs';

it('рисует все четырнадцать стран', () => {
  expect(COUNTRY_SHAPES.map((shape) => shape.id).sort()).toEqual(
    countries.map((country) => country.id).sort(),
  );
});

it('каждая страна подходит к границе Китая вплотную', () => {
  const svg = readFileSync('public/maps/china-provinces.svg', 'utf8');
  const china = regionContours(svg).flatMap((contour) =>
    parseMapPath(contour.d).flat(),
  );

  for (const shape of COUNTRY_SHAPES) {
    const points = parseMapPath(shape.d).flat();
    let best = Infinity;
    for (const [x, y] of points) {
      for (const [cx, cy] of china) {
        best = Math.min(best, Math.hypot(x - cx, y - cy));
      }
    }

    /* Замерено на исходных данных: у всех соседей меньше 0.5, у ближайшего
       не-соседа 11.8. Порог посередине — набор собран не из тех данных, если
       он не выполняется. */
    expect(best).toBeLessThan(2);
  }
});

it('знает спорные участки и подписывает их словами источника', () => {
  expect(DISPUTED_SHAPES.length).toBeGreaterThanOrEqual(9);

  const aksai = DISPUTED_SHAPES.find((shape) => shape.id === 'aksai-chin');
  expect(aksai?.nameRu).toBe('Аксайчин');
  expect(aksai?.note).toMatch(/Китаем/);
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/map/country-geometry.test.ts`
Ожидается: FAIL — модуля нет.

- [ ] **Шаг 3: Написать генератор**

Создать `scripts/generate-country-geometry.ts` по образцу
`generate-physical-geometry.ts`. Порядок работы:

1. прочитать выжимку `scripts/data/countries-source.json`;
2. перевести каждое кольцо в координаты карты `projectLonLat`;
3. обрезать по кадру карты `clipRingToFrame` с рамкой из
   `MAP_VIEWBOX_MIN_X/MIN_Y/WIDTH/HEIGHT` (`src/map/target-size.ts`);
4. выбросить кольца, от которых после обрезки осталось меньше трёх точек или
   площадь меньше единицы (`ringArea`): это мусор на кромке;
5. упростить `simplifyRing` с тем же допуском, что у физических форм;
6. записать путями `toPathData`;
7. посчитать для каждой страны середину наибольшей вписанной окружности
   (`largestInscribedCircle`) — это точка подписи и заодно мера нажимаемости,
   которую печатает `validate:map`;
8. посчитать отпечаток входов по содержимому выжимки (по образцу
   `physicalInputsFingerprint`) и записать его в файл.

Спорные участки проходят тот же путь и пишутся отдельным списком вместе с
`nameRu` и `note` из выжимки.

- [ ] **Шаг 4: Завести команду и прогнать**

```json
    "generate:countries": "tsx scripts/generate-country-geometry.ts",
```

Запустить: `npm run generate:countries && npx vitest run src/map/country-geometry.test.ts`
Ожидается: сообщение о числе стран и участков, тесты зелёные.

- [ ] **Шаг 5: Поставить сторожа**

В `scripts/validate-map.ts` — рядом с отпечатками палитры и соседства —
проверить, что `COUNTRIES_INPUTS_FINGERPRINT` совпадает с отпечатком нынешней
выжимки, и уронить сборку с указанием `npm run generate:countries`.

Там же напечатать в отчёт, сколько стран мельче порога нажатия: мера — диаметр
наибольшей вписанной окружности (`largestInscribedCircle`), как у регионов.
Число не роняет сборку — оно объясняет, почему Афганистан отвечается из списка.

- [ ] **Шаг 6: Коммит**

```bash
git add scripts/generate-country-geometry.ts src/map/country-geometry.ts src/map/country-geometry.test.ts scripts/validate-map.ts package.json
git commit -m "feat: геометрия стран в координатах карты"
```

---

### Task 4: Слой стран на карте

**Файлы:**
- Создать: `src/map/CountryLayer.tsx`, `src/map/CountryLayer.test.tsx`
- Изменить: `src/map/ChinaMap.tsx`, `src/styles.css`

**Интерфейсы:**
- Отдаёт: признаки `showsCountries?: boolean`, `selectedCountryId?: string | null`,
  `onSelectCountry?: (id: string) => void`,
  `countryStates?: Readonly<Record<string, AnswerState>>`,
  `showsCountryLabels?: boolean` у `ChinaMap`.

**Почему нет отдельного правила попадания.** У физической карты есть
`physical-hit.ts`, потому что формы вложены друг в друга: Такла-Макан лежит
внутри Таримской впадины, и нажатие обязано достаться меньшей. Страны не
вложены — они смежные, — поэтому нажатие берёт сам контур, как у городов и
достопримечательностей, и второе правило заводить незачем.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/map/CountryLayer.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { countries } from '../content/countries';
import { CountryLayer } from './CountryLayer';

function renderLayer(onSelect = () => {}) {
  return render(
    <svg>
      <CountryLayer
        selectedCountryId={null}
        onSelect={onSelect}
        showsLabels
        countryStates={{}}
      />
    </svg>,
  );
}

it('рисует все четырнадцать стран и называет каждую', () => {
  renderLayer();

  expect(screen.getAllByRole('button')).toHaveLength(countries.length);
  expect(
    screen.getByRole('button', { name: 'Монголия, 蒙古国' }),
  ).toBeInTheDocument();
});

it('отдаёт нажатие по стране', () => {
  const onSelect = vi.fn();
  renderLayer(onSelect);

  fireEvent.click(screen.getByRole('button', { name: 'Непал, 尼泊尔' }));

  expect(onSelect).toHaveBeenCalledWith('nepal');
});

it('спорный участок — не цель: ни роли, ни фокуса', () => {
  const { container } = renderLayer();
  const disputed = container.querySelectorAll('[data-disputed-id]');

  expect(disputed.length).toBeGreaterThanOrEqual(9);
  for (const shape of disputed) {
    expect(shape.getAttribute('role')).toBeNull();
    expect(shape.getAttribute('tabindex')).toBeNull();
  }
});

it('называет спорный участок словами источника', () => {
  renderLayer();

  expect(screen.getByText(/Аксайчин/)).toBeInTheDocument();
  expect(screen.getByText(/управляется Китаем/i)).toBeInTheDocument();
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/map/CountryLayer.test.tsx`
Ожидается: FAIL — компонента нет.

- [ ] **Шаг 3: Написать слой**

`src/map/CountryLayer.tsx` по образцу `PhysicalLayer.tsx` — рисуется порталом,
координаты и увеличение достаются от самой карты:

```tsx
export function CountryLayer({
  selectedCountryId,
  onSelect,
  showsLabels,
  countryStates = {},
}: CountryLayerProps) {
  return (
    <g className="country-layer">
      {COUNTRY_SHAPES.map((shape) => {
        const country = countryById(shape.id)!;

        return (
          <path
            key={shape.id}
            d={shape.d}
            className="country"
            data-country-id={shape.id}
            data-selected={String(shape.id === selectedCountryId)}
            data-answer-state={countryStates[shape.id]}
            role="button"
            tabIndex={0}
            aria-label={`${country.nameRu}, ${country.nameZh}`}
            onClick={() => onSelect(shape.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(shape.id);
              }
            }}
          />
        );
      })}
      {/*
        Спорные участки идут поверх заливок и целью не бывают: страна — цель,
        а спор — обстоятельство. Роли и фокуса у них нет, иначе читалка экрана
        объявила бы управление, которое ничего не делает.
      */}
      {DISPUTED_SHAPES.map((shape) => (
        <path
          key={shape.id}
          d={shape.d}
          className="country-disputed"
          data-disputed-id={shape.id}
          aria-hidden="true"
        />
      ))}
      {showsLabels
        ? COUNTRY_SHAPES.map((shape) => renderLabel(shape))
        : null}
      {/*
        Подписи спорных участков — текстом, а не только штриховкой: узор
        читалке экрана недоступен. Список стоит рядом со слоем и назван.
      */}
      <foreignObject width="0" height="0" aria-hidden="false">
        <ul className="visually-hidden">
          {DISPUTED_SHAPES.map((shape) => (
            <li key={shape.id}>
              {shape.nameRu} — спорная территория: {shape.note}
            </li>
          ))}
        </ul>
      </foreignObject>
    </g>
  );
}
```

Подпись страны ставится в середину наибольшей вписанной окружности её обрезанного
контура — та же мера, что у регионов; считает её генератор в задаче 3 и кладёт
рядом с путём.

- [ ] **Шаг 4: Нарисовать состояния**

В `src/styles.css` рядом с блоком физической карты:

```css
/*
 * Соседние государства. Заливка нейтральная — это фон вопроса, а не ответ;
 * выбранная страна берёт тот же киноварный тон, что и выбранный регион, чтобы
 * язык выбора на карте остался один.
 *
 * Спорный участок закрыт штриховкой поверх заливки: он не перекрашивает
 * страну, а показывает, что здесь спор. Узор читается в оттенках серого.
 */
.china-map .country {
  fill: var(--map-locked);
  stroke: var(--map-border);
  stroke-width: var(--map-border-width);
}

.china-map .country[data-selected='true'] {
  fill: var(--map-selected);
}

.china-map .country-disputed {
  fill: url('#map-hatch-second-try');
  pointer-events: none;
}
```

Токены брать существующие, новых значений не заводить: `validate-tokens.test.ts`
проверит пары по WCAG.

- [ ] **Шаг 5: Подключить к карте**

В `ChinaMap.tsx` добавить признаки и портал по образцу `CityLayer` (строка 925):
слой рисуется только при `showsCountries`.

- [ ] **Шаг 6: Прогнать тесты**

Запустить: `npx vitest run src/map scripts/validate-tokens.test.ts`
Ожидается: PASS.

- [ ] **Шаг 7: Коммит**

```bash
git add src/map src/styles.css
git commit -m "feat: слой сопредельных государств на карте"
```

---

### Task 5: Экран раунда

**Файлы:**
- Создать: `src/domain/country-choices.ts`, `src/domain/country-choices.test.ts`
- Создать: `src/features/exercise/CountryRound.tsx`, `CountryRound.test.tsx`
- Создать: `src/features/exercise/CountryAnswerList.tsx`
- Изменить: `src/domain/round.ts` (вид цели `country`)

**Интерфейсы:**
- Отдаёт: `countryTarget(id)`, `buildCountryChoices(countries, targetId, random)`,
  компонент `CountryRound` со свойствами как у `CityRound`.

- [ ] **Шаг 1: Написать падающий тест вариантов**

```ts
import { countries } from '../content/countries';
import { createSeededRandom } from './random';
import { buildCountryChoices } from './country-choices';

it('даёт четыре варианта, среди них верный, без повторов', () => {
  const choices = buildCountryChoices(countries, 'nepal', createSeededRandom(1));

  expect(choices).toHaveLength(4);
  expect(choices.map((country) => country.id)).toContain('nepal');
  expect(new Set(choices.map((country) => country.id)).size).toBe(4);
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/domain/country-choices.test.ts`
Ожидается: FAIL — модуля нет.

- [ ] **Шаг 3: Написать выбор вариантов**

`buildCountryChoices` по образцу `src/domain/choices.ts`: верный плюс три
отвлекающих из тех же четырнадцати, порядок случаен. Отдельного правила
близости не заводить: все четырнадцать и так соседи Китая, и «страна с другого
конца света» здесь невозможна по составу.

- [ ] **Шаг 4: Завести вид цели**

В `src/domain/round.ts` добавить `'country'` в `TargetKind` и функцию
`countryTarget(id)` с доводом в комментарии: «не знает, где Казахстан» — не то
же, что «не знает, где Синьцзян».

- [ ] **Шаг 5: Написать экран**

`CountryRound.tsx` по образцу `CityRound.tsx`: две формы вопроса на одном
экране, `RoundStage`, карта с `showsCountries`, список `CountryAnswerList` в
панели. Отличия от образца:

- в «найти страну» подписи стран видны, в «назвать страну» скрыты;
- в «назвать страну» подсвечена спрошенная страна, а ответ выбирается кнопкой;
- разбор — общее правило темпа: верно — полсекунды, ошибка — две, кнопки
  «Далее» нет.

- [ ] **Шаг 6: Прогнать тесты**

Запустить: `npx vitest run src/domain/country-choices.test.ts src/features/exercise/CountryRound.test.tsx`
Ожидается: PASS.

- [ ] **Шаг 7: Коммит**

```bash
git add src/domain/country-choices.ts src/domain/country-choices.test.ts src/domain/round.ts src/features/exercise/CountryRound.tsx src/features/exercise/CountryRound.test.tsx src/features/exercise/CountryAnswerList.tsx
git commit -m "feat: экран игр по сопредельным государствам"
```

---

### Task 6: Карточки на главной и подключение

**Файлы:**
- Изменить: `src/features/exercise/exercise-modes.ts`, `src/features/home/HomePage.tsx`,
  `src/App.tsx`, `src/screens.ts`
- Тест: `src/features/home/HomePage.test.tsx`, `src/App.test.tsx`

- [ ] **Шаг 1: Написать падающий тест**

```ts
it('запускает игру про страны с главной', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /Найти страну/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));
  await settle();

  expect(screen.getByText(/Вопрос 1 из 14/)).toBeInTheDocument();
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/App.test.tsx -t 'страны'`
Ожидается: FAIL — карточки нет.

- [ ] **Шаг 3: Завести группу и карточки**

В `exercise-modes.ts` добавить группу `countries` («Соседние государства»,
пояснение «четырнадцать стран сухопутной границы») и две карточки со знаками
邻 занят игрой соседей, поэтому взять 国 и 界:

```ts
  {
    id: 'find-country',
    kind: 'country',
    exerciseType: 'find-on-map',
    mark: '国',
    title: 'Найти страну',
    summary:
      'Названа страна — нажать её на карте или выбрать из списка. Страны видны ободом вокруг Китая: кадр карты обрезан по нему, и у Афганистана в него заходит только Ваханский коридор — его берут из списка.',
    volume: '14 стран · около 5 минут',
    groupId: 'countries',
  },
  {
    id: 'name-country',
    kind: 'country',
    exerciseType: 'name-target',
    mark: '界',
    title: 'Назвать страну',
    summary:
      'Подсвечена страна — выбрать имя из четырёх. Подписи на карте скрыты: подпись подсвеченной страны и есть ответ.',
    volume: '14 стран · около 4 минут',
    groupId: 'countries',
  },
```

- [ ] **Шаг 4: Подключить экран**

В `screens.ts` добавить загрузчик `country`, в `HomePage.tsx` — свойство
`onStartCountryRound(exerciseType, language)` и ветку в `start()`, в `App.tsx` —
экран `country-exercise`, запуск и запись попыток через `commitAttempts`.

- [ ] **Шаг 5: Прогнать весь набор**

Запустить: `npm test`
Ожидается: зелено. Тесты, считающие карточки, обновить с 16 на 18.

- [ ] **Шаг 6: Коммит**

```bash
git add src/features src/App.tsx src/screens.ts
git commit -m "feat: игры по странам запускаются с главной"
```

---

### Task 7: Итоги и повтор ошибок

**Файлы:**
- Изменить: `src/App.tsx`, `src/content/region-count.ts`
- Тест: `src/content/region-count.test.ts`

- [ ] **Шаг 1: Написать падающий тест склонения**

```ts
it('склоняет страны', () => {
  expect(countriesWord(1)).toBe('страна');
  expect(countriesWord(2)).toBe('страны');
  expect(countriesWord(5)).toBe('стран');
  expect(countriesWord(11)).toBe('стран');
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/content/region-count.test.ts`
Ожидается: FAIL — функции нет.

- [ ] **Шаг 3: Написать склонение и подключить итоги**

В `region-count.ts` добавить `countriesWord` по образцу `citiesWord`. В
`App.tsx` на экране итогов завести `isCountryRound`, отдать `targets={countries}`
и `countWord={countriesWord}`, а в «Повторить ошибки» — ветку, запускающую ту же
игру по ошибочным странам (пул, как у физической карты).

- [ ] **Шаг 4: Прогнать**

Запустить: `npm test`
Ожидается: зелено.

- [ ] **Шаг 5: Коммит**

```bash
git add src/App.tsx src/content/region-count.ts src/content/region-count.test.ts
git commit -m "feat: итоги и повтор ошибок для игр по странам"
```

---

### Task 8: Документы и ручная проверка

**Файлы:**
- Изменить: `EXERCISES.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md`, `ROADMAP.md`

- [ ] **Шаг 1: Описать игры в EXERCISES.md**

Раздел «Игры по сопредельным государствам»: что спрашивают, почему четырнадцать,
почему страны видны ободом, как отвечать из списка, что спорные участки
показаны штриховкой и целью не бывают.

- [ ] **Шаг 2: Записать решения в DECISIONS.md**

Дата 2026-08-30: слой стран включается только в двух играх; кадр не
расширяется; спорные участки подписываются словами источника, морские споры не
показываются; имена берутся дословно, включая длинное китайское имя КНДР.

- [ ] **Шаг 3: Пополнить CHANGELOG.md и отметить PLAN.md**

В `Unreleased → Added` — две игры и слой. В `PLAN.md` пункт 13 отметить
сделанным, в `ROADMAP.md` снять оговорку «встаёт в очередь, когда решение
есть»: решение принято и работа сделана.

- [ ] **Шаг 4: Ручная проверка в браузере**

Запустить `npm run dev` и пройти:

1. «Найти страну» — раунд целиком; проверить, что Монголия и Россия видны
   ободом, а подписи на месте;
2. Афганистан ответить **из списка**: на карте у него только Ваханский коридор;
3. «Назвать страну» — подписи на карте скрыты, четыре варианта работают;
4. спорные участки: штриховка видна, нажатие по ним ничего не выбирает;
5. атлас, «Найти на карте» и физическая карта — за границей по-прежнему пусто;
6. итоги и повтор ошибок.

- [ ] **Шаг 5: Полная проверка**

Запустить: `npm run lint && npm test && npm run build`
Ожидается: зелено.

- [ ] **Шаг 6: Коммит**

```bash
git add EXERCISES.md DECISIONS.md CHANGELOG.md PLAN.md ROADMAP.md
git commit -m "docs: игры по сопредельным государствам записаны"
```

---

## Готово, когда

- выжимка и генератор написаны, слой сгенерирован, отпечаток сторожится сборкой;
- обе игры запускаются с главной и проходятся целиком;
- спорные участки видны штриховкой, подписаны и не отвечают на нажатие;
- прочие поверхности карты не изменились;
- ответить можно из списка, без указателя;
- попытки идут в прогресс с видом `country`, повтор ошибок работает;
- `npm run lint`, `npm test`, `npm run build` проходят;
- шесть сценариев ручной проверки пройдены;
- источники записаны в `docs/sources`, документы обновлены.
