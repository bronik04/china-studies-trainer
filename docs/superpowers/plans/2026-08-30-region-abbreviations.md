# Сокращения регионов (一字简称) — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:subagent-driven-development`
> (рекомендуется) или `superpowers:executing-plans` — выполнять задача за
> задачей. Шаги помечены чекбоксами (`- [ ]`).

**Цель.** Научить тренажёр спрашивать регион его однобуквенным сокращением:
показан 蜀 — найти Сычуань на карте, и наоборот.

**Устройство.** Нового экрана нет ни одного. `QuestionLanguage` получает третье
значение `abbr`, и знак работает в обе стороны там, где уже работают русское имя
и иероглифы. Чтобы сокращение нельзя было спросить у города, у которого его нет,
язык делится на два типа: широкий `QuestionLanguage` для игр по регионам и узкий
`NameLanguage` для всех остальных.

**Стек.** TypeScript, React 19, Vite, vitest + @testing-library/react. Проверки:
`npm run lint`, `npm test`, `npm run build` (три валидатора → `tsc -b` → сборка).

Спецификация: `docs/superpowers/specs/2026-08-30-region-abbreviations-design.md`.

## Общие ограничения

- Интерфейс, задания и ошибки — по-русски; китайские названия в Unicode, а не
  только пиньинем (`AGENTS.md`).
- У каждого текста контента есть источник в реестре `src/content/sources.ts` и
  запись в `docs/sources` (`AGENTS.md`). Выдумывать этимологию нельзя: нет
  источника — нет происхождения.
- Домен не вызывает `Math.random` и не знает React и DOM.
- Компоненты не трогают `localStorage` напрямую.
- Значения цветов и размеров — только токенами из `src/design/tokens.css`.
- Новые иероглифы обязаны попасть в подмножество шрифта:
  `npm run generate:fonts`, иначе `validate:fonts` роняет сборку. Генератору
  нужен `pyftsubset` (`pipx install fonttools && pipx inject fonttools brotli`);
  если его нет на машине — остановиться и сказать владельцу, а не обходить
  проверку.
- Версия схемы прогресса не меняется: записи со значениями `ru` и `zh`
  остаются законными, `abbr` встречается только в новых попытках, миграция не
  нужна (`PROGRESS_SCHEMA_VERSION` остаётся 3).
- Коммиты частые, по одной задаче; сообщение по-русски, как в истории
  репозитория.

---

## Карта файлов

| Файл | Что делает после работы |
| --- | --- |
| `src/content/types.ts` | тип `RegionAbbreviation`, поле `abbreviation` у `Region` |
| `src/content/regions.ts` | знак, чтение, второй знак и происхождение у 34 единиц |
| `src/domain/validate-catalog.ts` | три правила: знак есть, знаки уникальны, у происхождения есть источник |
| `src/domain/question-language.ts` | `QuestionLanguage` со знаком, `NameLanguage` без него, `regionLabel` |
| `src/domain/progress-rules.ts` | комментарий о том, что `abbr` не считается ответом иероглифами (код не меняется) |
| `src/features/home/ModeStartDialog.tsx` | признак `languages`: какие варианты показывать |
| `src/features/home/HomePage.tsx` | три варианта у трёх игр по регионам, два у остальных |
| `src/App.tsx` | сужение языка на входе в раунды других каталогов |
| `src/features/exercise/ExerciseRound.tsx` | вопрос знаком, варианты знаками, разбор с происхождением |
| `src/features/exercise/FillMapRound.tsx` | вопрос знаком |
| `src/ui/RegionReference.tsx` | знак в справке региона — сразу в атласе и в коллекции |

---

### Task 1: Знак и чтение у 34 регионов

**Файлы:**
- Изменить: `src/content/types.ts`
- Изменить: `src/content/regions.ts`
- Изменить: `src/domain/validate-catalog.ts:24-118`
- Тест: `src/domain/validate-catalog.test.ts`

**Интерфейсы:**
- Отдаёт наружу: тип `RegionAbbreviation` (`sign`, `pinyin`, `alt?`, `origin?`);
  поле `Region.abbreviation: RegionAbbreviation`. На него опираются задачи 3, 6,
  7 и 8.

- [ ] **Шаг 1: Написать падающий тест**

В `src/domain/validate-catalog.test.ts` фикстура региона уже есть (`const
region`). Добавить в неё поле и три проверки:

```ts
// в фикстуру region, после pinyin:
  abbreviation: { sign: '川', pinyin: 'Chuān', alt: '蜀' },

it('rejects a region without an abbreviation sign', () => {
  expect(() =>
    validateCatalog(
      [{ ...region, abbreviation: { ...region.abbreviation, sign: ' ' } }],
      [source],
    ),
  ).toThrow(/Пустой знак сокращения у региона: sichuan/);
});

it('rejects two regions with the same sign', () => {
  const other = {
    ...region,
    id: 'chongqing',
    mapAreaId: 'chongqing',
    nameRu: 'Чунцин',
  };

  expect(() => validateCatalog([region, other], [source])).toThrow(
    /Повторяющийся знак сокращения: 川/,
  );
});

it('rejects an origin without a source', () => {
  expect(() =>
    validateCatalog(
      [
        {
          ...region,
          abbreviation: {
            ...region.abbreviation,
            origin: { body: 'От древнего царства Шу.', sourceIds: [] },
          },
        },
      ],
      [source],
    ),
  ).toThrow(/Регион sichuan: происхождение знака без источника/);
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/domain/validate-catalog.test.ts`
Ожидается: падение на типе — `Object literal may only specify known
properties, and 'abbreviation' does not exist in type 'Region'`.

- [ ] **Шаг 3: Завести тип**

В `src/content/types.ts`, перед `export type Region`:

```ts
/**
 * Откуда взялся знак: 蜀 — от древнего царства, 滇 — от озера Дянь. Без
 * источника не показывается и не пишется: выдуманная этимология — та же
 * ложь, что выдуманная граница.
 */
export type AbbreviationOrigin = {
  readonly body: string;
  readonly sourceIds: readonly string[];
};

/**
 * Однобуквенное сокращение региона (一字简称) — то, что стоит на
 * автомобильном номере, в имени поезда 京沪高铁 и в названии кухни 川菜.
 *
 * `sign` спрашивается, `alt` только показывается: у пяти регионов знака два
 * (川 и 蜀, 贵 и 黔, 云 и 滇, 陕 и 秦, 甘 и 陇), и спросить оба значило бы
 * завести у Сычуани две цели вместо одной.
 */
export type RegionAbbreviation = {
  readonly sign: string;
  readonly pinyin: string;
  readonly alt?: string;
  readonly origin?: AbbreviationOrigin;
};
```

И поле в `Region`, сразу после `pinyin`:

```ts
  readonly abbreviation: RegionAbbreviation;
```

- [ ] **Шаг 4: Написать правила валидатора**

В `src/domain/validate-catalog.ts` завести множество знаков рядом с
`mapAreaIds` (строка 30):

```ts
  const abbreviationSigns = new Set<string>();
```

и внутри цикла `for (const region of regions)`, после блока проверки пустых
полей, добавить:

```ts
    /*
     * Знак — цель вопроса, а не украшение: два одинаковых знака дали бы
     * вопросу два верных ответа. Второй знак проверяется наравне с первым.
     */
    for (const sign of [region.abbreviation.sign, region.abbreviation.alt]) {
      if (sign === undefined) {
        continue;
      }
      if (sign.trim().length === 0) {
        errors.push(`Пустой знак сокращения у региона: ${region.id}`);
        continue;
      }
      if (abbreviationSigns.has(sign)) {
        errors.push(`Повторяющийся знак сокращения: ${sign}`);
      }
      abbreviationSigns.add(sign);
    }

    if (region.abbreviation.pinyin.trim().length === 0) {
      errors.push(`Пустое чтение знака у региона: ${region.id}`);
    }

    const origin = region.abbreviation.origin;
    if (origin !== undefined) {
      if (origin.body.trim().length === 0) {
        errors.push(`Регион ${region.id}: пустое происхождение знака`);
      }
      if (origin.sourceIds.length === 0) {
        errors.push(`Регион ${region.id}: происхождение знака без источника`);
      }
      for (const sourceId of origin.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          errors.push(`Неизвестный источник: ${sourceId}`);
        }
      }
    }
```

- [ ] **Шаг 5: Расширить создатель региона**

В `src/content/regions.ts` добавить параметр в `region()` — седьмым, после
`capitalCityId`:

```ts
function region(
  id: string,
  kind: RegionKind,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  capitalCityId: string,
  abbreviation: RegionAbbreviation,
  facts: readonly Fact[],
): Region {
  return {
    id,
    kind,
    nameRu,
    nameZh,
    pinyin,
    capitalCityId,
    abbreviation,
    mapAreaId: id,
    facts,
    sourceIds,
  };
}
```

Не забыть импорт типа: `import type { Fact, Region, RegionAbbreviation, RegionKind } from './types';`

- [ ] **Шаг 6: Заполнить 34 региона**

Значения ниже — то, что вводится; источник проверяется на шаге 7, и если
справочник расходится с таблицей, прав справочник, а не таблица.

| id региона | sign | pinyin | alt |
| --- | --- | --- | --- |
| `beijing` | 京 | Jīng | |
| `tianjin` | 津 | Jīn | |
| `hebei` | 冀 | Jì | |
| `shanxi` | 晋 | Jìn | |
| `inner-mongolia` | 蒙 | Měng | |
| `liaoning` | 辽 | Liáo | |
| `jilin` | 吉 | Jí | |
| `heilongjiang` | 黑 | Hēi | |
| `shanghai` | 沪 | Hù | |
| `jiangsu` | 苏 | Sū | |
| `zhejiang` | 浙 | Zhè | |
| `anhui` | 皖 | Wǎn | |
| `fujian` | 闽 | Mǐn | |
| `jiangxi` | 赣 | Gàn | |
| `shandong` | 鲁 | Lǔ | |
| `henan` | 豫 | Yù | |
| `hubei` | 鄂 | È | |
| `hunan` | 湘 | Xiāng | |
| `guangdong` | 粤 | Yuè | |
| `guangxi` | 桂 | Guì | |
| `hainan` | 琼 | Qióng | |
| `chongqing` | 渝 | Yú | |
| `sichuan` | 川 | Chuān | 蜀 |
| `guizhou` | 贵 | Guì | 黔 |
| `yunnan` | 云 | Yún | 滇 |
| `tibet` | 藏 | Zàng | |
| `shaanxi` | 陕 | Shǎn | 秦 |
| `gansu` | 甘 | Gān | 陇 |
| `qinghai` | 青 | Qīng | |
| `ningxia` | 宁 | Níng | |
| `xinjiang` | 新 | Xīn | |
| `taiwan` | 台 | Tái | |
| `hong-kong` | 港 | Gǎng | |
| `macao` | 澳 | Ào | |

Вызов выглядит так (Сычуань):

```ts
  region('sichuan', 'province', 'Сычуань', '四川', 'Sìchuān', 'chengdu',
    { sign: '川', pinyin: 'Chuān', alt: '蜀' }, sichuanFacts),
```

Происхождение на этом шаге не заполняется — оно целиком в задаче 2.

- [ ] **Шаг 7: Записать источник на сам список знаков**

Проверить, называют ли сокращения уже зарегистрированные
`prc-administrative-divisions-2022` и `china-internet-information-center-2003`.
Если да — ничего не добавлять. Если нет — завести одну запись в
`src/content/sources.ts` и строку в `docs/sources/` рядом с остальными
реестрами: у списка знаков один источник на все 34, это не факт о регионе, а
справочная таблица.

- [ ] **Шаг 8: Прогнать тесты**

Запустить: `npx vitest run src/domain/validate-catalog.test.ts`
Ожидается: PASS, все три новых теста зелёные.

- [ ] **Шаг 9: Пересобрать подмножества шрифтов**

Запустить: `npm run generate:fonts`
Ожидается: в `scripts/font-coverage.json` знаков стало больше на десять
(晋 沪 皖 豫 湘 渝 蜀 黔 滇 陇 — остальные 29 уже встречались в `src`).

Затем: `npm run build`
Ожидается: `validate:map`, `validate:content`, `validate:fonts` и сборка
проходят.

- [ ] **Шаг 10: Коммит**

```bash
git add src/content/types.ts src/content/regions.ts src/domain/validate-catalog.ts src/domain/validate-catalog.test.ts src/assets/fonts scripts/font-coverage.json
git commit -m "feat: знак сокращения у каждого из 34 регионов"
```

---

### Task 2: Происхождение знака с источниками

**Файлы:**
- Изменить: `src/content/regions.ts`
- Изменить: `src/content/sources.ts` (по мере надобности)
- Изменить: `docs/sources/` (запись о каждом новом источнике)

**Интерфейсы:**
- Берёт из задачи 1: `RegionAbbreviation.origin`, правило валидатора «есть
  происхождение — есть источник».
- Отдаёт: заполненное поле `origin` у части регионов. Задача 6 показывает его в
  разборе, задача 8 — в справке.

- [ ] **Шаг 1: Собрать происхождение по источникам**

Для каждого из 34 регионов найти, откуда взялся знак, в источнике, который
можно записать. Первым делом смотреть те, что уже в реестре: у большинства
регионов есть статья Britannica или БРЭ (`britannica-sichuan`,
`britannica-hunan` и подобные). Новый источник заводится по образцу соседей:
`id`, `title`, `organization`, `url`, `accessedAt`, `covers`.

Что искать (проверить, а не переписать отсюда): 蜀 — древнее царство Шу;
滇 — озеро Дянь; 湘 — река Сян; 赣 — река Ганьцзян; 鲁 — царство Лу;
豫 — древняя область Юйчжоу; 晋 — царство Цзинь; 陇 — горы Луншань;
沪 — старое имя устья, где ставили рыболовную снасть.

**Правило, которое нельзя обойти:** источника нет — поля `origin` нет.
Регион остаётся со знаком и чтением, и это законное состояние. Прецедент:
у озера Чаоху два факта вместо трёх.

- [ ] **Шаг 2: Записать найденное**

```ts
  region('sichuan', 'province', 'Сычуань', '四川', 'Sìchuān', 'chengdu',
    {
      sign: '川',
      pinyin: 'Chuān',
      alt: '蜀',
      origin: {
        body: 'Знак 蜀 — от древнего царства Шу, стоявшего в Сычуаньской котловине.',
        sourceIds: ['britannica-sichuan'],
      },
    },
    sichuanFacts),
```

- [ ] **Шаг 3: Проверить сборкой**

Запустить: `npm run build`
Ожидается: `validate:content` молчит. Если он говорит «происхождение знака без
источника» — источник не записан, а поле заполнено; исправить, а не удалять
проверку.

- [ ] **Шаг 4: Посчитать покрытие**

Запустить:

```bash
node --input-type=module -e "import('./src/content/regions.ts')" 2>/dev/null || npx tsx -e "import {regions} from './src/content/regions'; console.log(regions.filter(r => r.abbreviation.origin).length, 'из', regions.length)"
```

Ожидается: число, которое пойдёт в итоговое сообщение. «Почти у всех» — не
ответ, в отчёте стоит цифра.

- [ ] **Шаг 5: Коммит**

```bash
git add src/content/regions.ts src/content/sources.ts docs/sources
git commit -m "content: откуда взялись знаки регионов"
```

---

### Task 3: Третье значение языка и узкий тип для остальных каталогов

**Файлы:**
- Изменить: `src/domain/question-language.ts`
- Изменить: `src/App.tsx:558,574,590,606,626,642`
- Изменить: `src/features/exercise/CityRound.tsx`, `LandmarkRound.tsx`,
  `PhysicalRound.tsx`, `CultureRound.tsx`, `HistoryRound.tsx`, `OrderRound.tsx`,
  `CityAnswerList.tsx`, `LandmarkAnswerList.tsx`, `PhysicalAnswerList.tsx`
- Тест: `src/domain/question-language.test.ts` (создать)

**Интерфейсы:**
- Берёт из задачи 1: `Region.abbreviation.sign`.
- Отдаёт: `type QuestionLanguage = 'ru' | 'zh' | 'abbr'`;
  `type NameLanguage = Exclude<QuestionLanguage, 'abbr'>`;
  `regionLabel(named: Abbreviable, language: QuestionLanguage): string`;
  `nameLanguageOf(language: QuestionLanguage): NameLanguage`;
  `langOf(language: QuestionLanguage): string | undefined`. На них опираются
  задачи 5, 6 и 7.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/domain/question-language.test.ts`:

```ts
import { labelOf, langOf, nameLanguageOf, regionLabel } from './question-language';

const sichuan = {
  nameRu: 'Сычуань',
  nameZh: '四川',
  abbreviation: { sign: '川' },
};

it('называет регион знаком при 简称', () => {
  expect(regionLabel(sichuan, 'abbr')).toBe('川');
});

it('называет регион полным именем при ru и zh', () => {
  expect(regionLabel(sichuan, 'ru')).toBe('Сычуань');
  expect(regionLabel(sichuan, 'zh')).toBe('四川');
});

it('знак — китайское письмо, и разметка это говорит', () => {
  expect(langOf('abbr')).toBe('zh-Hans');
  expect(langOf('zh')).toBe('zh-Hans');
  expect(langOf('ru')).toBeUndefined();
});

it('сужает язык для каталогов, где знака нет', () => {
  expect(nameLanguageOf('abbr')).toBe('zh');
  expect(nameLanguageOf('ru')).toBe('ru');
  expect(nameLanguageOf('zh')).toBe('zh');
});

it('labelOf остаётся при своих двух значениях', () => {
  expect(labelOf({ nameRu: 'Чэнду', nameZh: '成都' }, 'zh')).toBe('成都');
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/domain/question-language.test.ts`
Ожидается: FAIL — `regionLabel` и `nameLanguageOf` не существуют.

- [ ] **Шаг 3: Написать домен языка**

Переписать `src/domain/question-language.ts`:

```ts
/**
 * Каким названием игра спрашивает. Выбирает ученик перед стартом.
 *
 * Третье значение появилось вместе с сокращениями регионов: 蜀 — не второе
 * имя Сычуани, а отдельная единица речи, которую не вывести из полного
 * имени.
 */
export type QuestionLanguage = 'ru' | 'zh' | 'abbr';

/**
 * Язык там, где сокращения нет и быть не может: города, объекты физической
 * карты, достопримечательности, династии, коллекции и игра «регион —
 * столица», где ответ — город. Узкий тип — не придирка: без него
 * `labelOf(city, 'abbr')` скомпилировался бы и вернул неправду.
 */
export type NameLanguage = Exclude<QuestionLanguage, 'abbr'>;

/** Всё, что нужно ярлыку. Домен не знает каталога контента. */
export type Nameable = {
  readonly nameRu: string;
  readonly nameZh: string;
};

/** То же плюс знак. Структурно, чтобы домен не тянул тип региона. */
export type Abbreviable = Nameable & {
  readonly abbreviation: { readonly sign: string };
};

export function labelOf(named: Nameable, language: NameLanguage): string {
  return language === 'zh' ? named.nameZh : named.nameRu;
}

/** Ярлык региона: знает все три значения, потому что знак есть у региона. */
export function regionLabel(named: Abbreviable, language: QuestionLanguage): string {
  return language === 'abbr' ? named.abbreviation.sign : labelOf(named, language);
}

/**
 * Сужение для каталогов без знака. 简称 переходит в 中文, а не в русское:
 * ученик, игравший знаками, остаётся в китайском письме.
 */
export function nameLanguageOf(language: QuestionLanguage): NameLanguage {
  return language === 'abbr' ? 'zh' : language;
}

/**
 * Язык разметки. Без него `<h1>` с иероглифами не получает китайский шрифт:
 * правило в `styles.css` цепляется за `lang`, а ярлык отдаёт голую строку.
 */
export function langOf(language: QuestionLanguage): string | undefined {
  return language === 'ru' ? undefined : 'zh-Hans';
}
```

- [ ] **Шаг 4: Прогнать тест**

Запустить: `npx vitest run src/domain/question-language.test.ts`
Ожидается: PASS.

- [ ] **Шаг 5: Сузить тип у раундов других каталогов**

Запустить: `npx tsc -b`
Ожидается: ошибки во всех местах, где `QuestionLanguage` уходит в `labelOf`.

В каждом из файлов `CityRound.tsx`, `LandmarkRound.tsx`, `PhysicalRound.tsx`,
`CultureRound.tsx`, `HistoryRound.tsx`, `OrderRound.tsx`, `CityAnswerList.tsx`,
`LandmarkAnswerList.tsx`, `PhysicalAnswerList.tsx` заменить в объявлении
свойств:

```ts
  readonly language: NameLanguage;
```

и импорт — на `import { labelOf, langOf, type NameLanguage } from '../../domain/question-language';`
(в `src/map/*` путь на уровень короче).

- [ ] **Шаг 6: Сузить язык на входе в эти раунды**

В `src/App.tsx` импортировать `nameLanguageOf` и заменить `language={language}`
на `language={nameLanguageOf(language)}` у шести экранов: `CityRound` (558),
`LandmarkRound` (574), `PhysicalRound` (590), `OrderRound` (606),
`HistoryRound` (626), `CultureRound` (642). У `ExerciseRound` (542) и
`FillMapRound` (506) — оставить как есть: это игры по регионам.

- [ ] **Шаг 7: Прогнать сборку и весь набор**

Запустить: `npx tsc -b && npm test`
Ожидается: компиляция без ошибок, все тесты зелёные (в них язык `'ru'` и
`'zh'`, оба остаются законными).

- [ ] **Шаг 8: Коммит**

```bash
git add src/domain/question-language.ts src/domain/question-language.test.ts src/App.tsx src/features/exercise src/map
git commit -m "feat: язык вопроса знает знак, остальные каталоги — нет"
```

---

### Task 4: Освоенность не засчитывает знак

**Файлы:**
- Изменить: `src/domain/progress-rules.ts:95-99` (только комментарий)
- Тест: `src/domain/progress-rules.test.ts`

**Интерфейсы:**
- Берёт из задачи 3: значение `'abbr'` у `Attempt.language`.
- Ничего не отдаёт: правило уже написано буквально (`attempt.language === 'zh'`),
  задача закрепляет его тестом, чтобы будущая правка не смягчила его молча.

- [ ] **Шаг 1: Написать тест**

Добавить в `src/domain/progress-rules.test.ts`. Помощник `attempt(overrides)`
и `regionTarget` в файле уже есть — новых заводить не нужно:

```ts
it('три верных ответа знаками не дают освоенности', () => {
  const attempts = [
    attempt({ target: regionTarget('sichuan'), roundId: 'r1', language: 'abbr', isCorrect: true }),
    attempt({ target: regionTarget('sichuan'), roundId: 'r2', language: 'abbr', isCorrect: true }),
    attempt({ target: regionTarget('sichuan'), roundId: 'r3', language: 'abbr', isCorrect: true }),
  ];

  expect(masteredTargets(attempts, new Date(), 'region')).toHaveLength(0);
});

it('знак, знак и иероглифы — дают', () => {
  const attempts = [
    attempt({ target: regionTarget('sichuan'), roundId: 'r1', language: 'abbr', isCorrect: true }),
    attempt({ target: regionTarget('sichuan'), roundId: 'r2', language: 'abbr', isCorrect: true }),
    attempt({ target: regionTarget('sichuan'), roundId: 'r3', language: 'zh', isCorrect: true }),
  ];

  expect(masteredTargets(attempts, new Date(), 'region')).toHaveLength(1);
});
```

- [ ] **Шаг 2: Прогнать тест**

Запустить: `npx vitest run src/domain/progress-rules.test.ts`
Ожидается: PASS сразу — правило уже такое. Если падает, значит проверка в
`masteredTargets` не буквальная; чинить проверку, а не тест.

- [ ] **Шаг 3: Дописать довод в комментарий**

В `src/domain/progress-rules.ts`, в комментарии над `masteredTargets`, после
фразы про разное знание добавить:

```
 * Ответ по сокращению этим «хотя бы одним» не считается (решение владельца от
 * 2026-08-30): знать 京 — не то же, что прочитать 北京, и иначе ученик закрыл
 * бы карту, ни разу не встретив полного имени.
```

- [ ] **Шаг 4: Коммит**

```bash
git add src/domain/progress-rules.ts src/domain/progress-rules.test.ts
git commit -m "test: знак не заменяет иероглифы при подсчёте освоенности"
```

---

### Task 5: Третий переключатель в окне перед стартом

**Файлы:**
- Изменить: `src/features/home/ModeStartDialog.tsx:30-32,91-106`
- Изменить: `src/features/home/HomePage.tsx:211-227,412-421`
- Тест: `src/features/home/HomePage.test.tsx`

**Интерфейсы:**
- Берёт из задачи 3: `QuestionLanguage`, `langOf`.
- Отдаёт: признак `languages?: readonly QuestionLanguage[]` у
  `ModeStartDialogProps` (по умолчанию `['ru', 'zh']`).

- [ ] **Шаг 1: Написать падающий тест**

В `src/features/home/HomePage.test.tsx` (как рендерится страница — взять из
соседних тестов файла):

```ts
it('предлагает знак в играх по регионам', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /Найти на карте/ }));

  expect(screen.getByRole('radio', { name: '简称' })).toBeTruthy();
});

it('не предлагает знак там, где ответ не регион', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /Регион — столица/ }));

  expect(screen.queryByRole('radio', { name: '简称' })).toBeNull();
});

it('не предлагает знак в играх по городам', () => {
  renderHome();
  fireEvent.click(screen.getByRole('button', { name: /Найти город/ }));

  expect(screen.queryByRole('radio', { name: '简称' })).toBeNull();
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/home/HomePage.test.tsx`
Ожидается: FAIL — переключателя `简称` нет ни у одной игры.

- [ ] **Шаг 3: Научить окно показывать заданный набор**

В `src/features/home/ModeStartDialog.tsx` заменить константу `LANGUAGES`:

```ts
const LANGUAGE_LABELS: Readonly<Record<QuestionLanguage, string>> = {
  ru: 'Русское название',
  zh: '中文',
  abbr: '简称',
};

const DEFAULT_LANGUAGES: readonly QuestionLanguage[] = ['ru', 'zh'];
```

Добавить признак в `ModeStartDialogProps`:

```ts
  /**
   * Какие варианты показывать. Задаёт вызывающая сторона: сокращение есть
   * только у региона, и окно не знает, какая игра его открыла.
   */
  readonly languages?: readonly QuestionLanguage[];
```

Принять его в сигнатуре (`languages = DEFAULT_LANGUAGES,`) и заменить
отрисовку списка:

```tsx
          {languages.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="mode-dialog-language"
                value={value}
                checked={language === value}
                onChange={() => setLanguage(value)}
              />
              <span lang={langOf(value)}>{LANGUAGE_LABELS[value]}</span>
            </label>
          ))}
```

Начальное значение защитить от языка, которого в наборе нет:

```ts
  const [language, setLanguage] = useState<QuestionLanguage>(
    languages.includes(defaultLanguage) ? defaultLanguage : languages[0],
  );
```

Импортировать `langOf`: `import { langOf, type QuestionLanguage } from '../../domain/question-language';`

- [ ] **Шаг 4: Сказать окну, какая игра его открыла**

В `src/features/home/HomePage.tsx`, рядом с `setChoiceFor`:

```ts
/**
 * Сокращение предлагается там, где и вопрос, и ответ — регион. В «регион —
 * столица» ответ город, у города знака нет.
 */
function languagesFor(card: ModeCard): readonly QuestionLanguage[] {
  const asksRegion =
    card.kind === 'fill' ||
    (card.kind === 'exercise' && card.exerciseType !== 'match-pair');

  return asksRegion ? ['ru', 'zh', 'abbr'] : ['ru', 'zh'];
}
```

И передать в окно (строка 412):

```tsx
          <ModeStartDialog
            title={startingCard.title}
            summary={startingCard.summary}
            volume={startingCard.volume}
            defaultLanguage={step.language}
            languages={languagesFor(startingCard)}
            setChoice={setChoiceFor(startingCard)}
            onStart={(language, set) => start(startingCard, language, set)}
            onClose={() => setStartingCard(null)}
          />
```

- [ ] **Шаг 5: Прогнать тесты**

Запустить: `npx vitest run src/features/home`
Ожидается: PASS, включая три новых теста.

- [ ] **Шаг 6: Коммит**

```bash
git add src/features/home
git commit -m "feat: 简称 третьим вариантом в окне перед стартом"
```

---

### Task 6: Вопрос знаком, варианты знаками, разбор с происхождением

**Файлы:**
- Изменить: `src/features/exercise/ExerciseRound.tsx:137-200`
- Тест: `src/features/exercise/ExerciseRound.test.tsx`

**Интерфейсы:**
- Берёт из задачи 3: `regionLabel`, `langOf`.
- Берёт из задач 1 и 2: `region.abbreviation.sign`, `region.abbreviation.origin`.

- [ ] **Шаг 1: Написать падающий тест**

В `src/features/exercise/ExerciseRound.test.tsx` (`renderRound` уже есть в
файле и принимает язык вторым доводом):

```ts
it('спрашивает знаком при 简称', () => {
  renderRound(['find-on-map'], 'abbr', () => {}, SHORT_POOL);

  const target = screen.getByTestId('exercise-target');
  expect(SHORT_POOL.map((region) => region.abbreviation.sign)).toContain(
    target.textContent,
  );
  expect(target.getAttribute('lang')).toBe('zh-Hans');
});

it('подписывает варианты знаками при 简称', () => {
  renderRound(['name-target'], 'abbr', () => {}, SHORT_POOL);

  const signs = SHORT_POOL.map((region) => region.abbreviation.sign);
  const buttons = screen.getAllByTestId('choice-option');
  for (const button of buttons) {
    expect(signs).toContain(button.textContent?.trim());
  }
});

it('равнозначный список знака не показывает', () => {
  renderRound(['find-on-map'], 'abbr', () => {}, SHORT_POOL);
  openAnswerList();

  for (const region of SHORT_POOL) {
    expect(screen.queryByRole('button', { name: region.abbreviation.sign })).toBeNull();
  }
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/exercise/ExerciseRound.test.tsx`
Ожидается: FAIL — в заголовке стоит русское имя, а не знак.

- [ ] **Шаг 3: Заменить ярлык на региональный**

В `src/features/exercise/ExerciseRound.tsx` заменить импорт:

```ts
import { langOf, regionLabel, type QuestionLanguage } from '../../domain/question-language';
```

Строка 144 (подпись варианта) и строка 200 (заголовок вопроса) — заменить
`labelOf(...)` на `regionLabel(...)` с теми же доводами. В `match-pair` ничего
не меняется: там подпись берётся из справочника городов.

- [ ] **Шаг 4: Добавить разбор со знаком**

В `answerLabel` (строка ~158) оставить как есть, а под заголовком разбора
добавить строку про знак — она рисуется только при `abbr`:

```tsx
  const abbreviationNote =
    question.language === 'abbr' ? (
      <p className="stage-hint">
        Сокращение <span lang="zh-Hans">{targetRegion.abbreviation.sign}</span>{' '}
        <span lang="zh-Latn-pinyin">{targetRegion.abbreviation.pinyin}</span>
        {targetRegion.abbreviation.origin === undefined
          ? null
          : ` — ${targetRegion.abbreviation.origin.body}`}
      </p>
    ) : null;
```

И вставить его в разбор:

```tsx
  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">{answerEyebrow}</p>
      <h1 className="stage-target" data-testid="exercise-target">
        {answerLabel}
      </h1>
      {abbreviationNote}
    </>
  ) : (
```

- [ ] **Шаг 5: Прогнать тесты**

Запустить: `npx vitest run src/features/exercise/ExerciseRound.test.tsx src/domain/choices.test.ts`
Ожидается: PASS. Правило отвлекающих не менялось — `choices.test.ts` обязан
остаться зелёным без правок.

- [ ] **Шаг 6: Коммит**

```bash
git add src/features/exercise/ExerciseRound.tsx src/features/exercise/ExerciseRound.test.tsx
git commit -m "feat: раунд по регионам спрашивает знаком и разбирает его"
```

---

### Task 7: Заполнить карту знаком

**Файлы:**
- Изменить: `src/features/exercise/FillMapRound.tsx:13,200-204`
- Тест: `src/features/exercise/FillMapRound.test.tsx`

**Интерфейсы:**
- Берёт из задачи 3: `regionLabel`, `langOf`.

- [ ] **Шаг 1: Написать падающий тест**

Помощник `renderRound()` в файле языка не принимает — добавить довод:

```ts
function renderRound(language: QuestionLanguage = 'ru') {
  return render(
    <FillMapRound
      regions={regions}
      language={language}
      roundId="r1"
      seed={1}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
}
```

и сам тест:

```ts
it('спрашивает знаком при 简称', () => {
  renderRound('abbr');

  const target = screen.getByTestId('fill-target');
  expect(regions.map((region) => region.abbreviation.sign)).toContain(
    target.textContent?.trim(),
  );
});
```

Помощник `askedRegion()` в этом же файле ищет регион по русскому имени и на
`简称` не сработает — в новом тесте он не используется, менять его не нужно.

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Ожидается: FAIL.

- [ ] **Шаг 3: Заменить ярлык**

```ts
import { langOf, regionLabel, type QuestionLanguage } from '../../domain/question-language';
```

и на строке 204 — `regionLabel(targetRegion, question!.language)`.

- [ ] **Шаг 4: Прогнать тесты**

Запустить: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Ожидается: PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add src/features/exercise/FillMapRound.tsx src/features/exercise/FillMapRound.test.tsx
git commit -m "feat: заполнение карты спрашивает знаком"
```

---

### Task 8: Знак в справке региона

**Файлы:**
- Изменить: `src/ui/RegionReference.tsx:78-100`
- Тест: `src/features/atlas/AtlasPage.test.tsx` и
  `src/features/collections/CollectionPage.test.tsx`

**Интерфейсы:**
- Берёт из задач 1 и 2: `region.abbreviation`.
- Одна правка закрывает две поверхности: карточка атласа и страница коллекции
  о регионе рисуют один и тот же `RegionReference`.

- [ ] **Шаг 1: Написать падающий тест**

В `src/features/atlas/AtlasPage.test.tsx`:

```ts
it('показывает знак сокращения у выбранного региона', () => {
  renderAtlas('sichuan');

  expect(screen.getByText('川')).toBeTruthy();
  expect(screen.getByText(/Chuān/)).toBeTruthy();
});
```

`renderAtlas(selectedRegionId)` в файле уже есть и открывает карточку сразу.

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/atlas/AtlasPage.test.tsx`
Ожидается: FAIL — знака на карточке нет.

- [ ] **Шаг 3: Показать знак**

В `src/ui/RegionReference.tsx`, в начале возвращаемой разметки, перед строкой
об административном центре:

```tsx
      <p>
        Сокращение: <span lang="zh-Hans">{region.abbreviation.sign}</span>{' '}
        <span lang="zh-Latn-pinyin">{region.abbreviation.pinyin}</span>
        {region.abbreviation.alt === undefined ? null : (
          <>
            {' · также '}
            <span lang="zh-Hans">{region.abbreviation.alt}</span>
          </>
        )}
      </p>
      {region.abbreviation.origin === undefined ? null : (
        <p>{region.abbreviation.origin.body}</p>
      )}
```

Происхождение стоит отдельной строкой, а не внутри `CardFacts`: там 2–3 факта
по правилу валидатора, и четвёртый сломал бы проверку.

- [ ] **Шаг 4: Прогнать тесты обеих поверхностей**

Запустить: `npx vitest run src/features/atlas src/features/collections`
Ожидается: PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ui/RegionReference.tsx src/features/atlas src/features/collections
git commit -m "feat: знак и его происхождение в справке региона"
```

---

### Task 9: Документы и ручная проверка

**Файлы:**
- Изменить: `EXERCISES.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md`

- [ ] **Шаг 1: Описать игру в EXERCISES.md**

В разделе «Назови регион» и «Найди на карте» сказать, что язык вопроса теперь
третий: русское имя, иероглифы или сокращение; что сокращение предлагается
только там, где и вопрос, и ответ — регион; что равнозначный список знака не
показывает.

- [ ] **Шаг 2: Записать решение**

Строка в `DECISIONS.md` (сверху, дата 2026-08-30): сокращение — третий язык
вопроса, а не отдельная карточка; спрашивается знак с автомобильного номера,
второй знак живёт в справке; ответ по сокращению не засчитывается как ответ
иероглифами, и почему.

- [ ] **Шаг 3: Пополнить CHANGELOG.md**

Раздел `Unreleased` → `Added`: игра спрашивает регион сокращением, у скольких
регионов записано происхождение (число из задачи 2), сколько знаков добавилось
в подмножество шрифта.

- [ ] **Шаг 4: Отметить работу в PLAN.md**

Пункт 11 получает `[x]` и абзац «Сделано» по образцу соседних: что вышло, где
разошлось с замыслом, что осталось.

- [ ] **Шаг 5: Ручная проверка в браузере**

Запустить: `npm run dev`

Пройти целиком:
1. Главная → «Найти на карте» → в окне выбрать `简称` → раунд от начала до
   конца. Знак виден и не квадратом; разбор ошибки называет знак и
   происхождение.
2. «Назвать регион» на `简称`: варианты — знаки, подсветка работает.
3. «Заполнить карту» на `简称`: три попытки, раскраска, секундомер.
4. «Регион — столица» и «Найти город»: третьего переключателя нет.
5. Атлас → Сычуань: знак, чтение, второй знак, происхождение.
6. Экран итогов: повтор ошибок из раунда на `简称` работает.

- [ ] **Шаг 6: Полная проверка**

Запустить: `npm run lint && npm test && npm run build`
Ожидается: линтер молчит, все тесты зелёные, три валидатора и сборка проходят.

- [ ] **Шаг 7: Коммит**

```bash
git add EXERCISES.md DECISIONS.md CHANGELOG.md PLAN.md
git commit -m "docs: сокращения регионов записаны в спецификации и журналах"
```

---

## Готово, когда

- у всех 34 регионов есть знак и чтение, знаки уникальны, у происхождения есть
  источник, а число регионов с происхождением названо цифрой;
- `简称` работает в «Найти на карте», «Назвать регион» и «Заполнить карту» в обе
  стороны;
- в «Регион — столица» и в играх по другим каталогам третьего варианта нет, и
  передать туда `abbr` нельзя по типам;
- освоенность по-прежнему требует ответа иероглифами — закреплено тестом;
- `npm run generate:fonts` выполнен, `npm run lint`, `npm test`,
  `npm run build` проходят;
- шесть сценариев ручной проверки пройдены в браузере;
- `EXERCISES.md`, `DECISIONS.md`, `CHANGELOG.md` и `PLAN.md` обновлены.
