# Модель данных

Идентификаторы стабильны, в kebab-case и не зависят от отображаемого имени.

```ts
type Region = {
  id: string;              // sichuan
  kind: 'province' | 'autonomous-region' | 'municipality' | 'sar';
  nameRu: string;
  nameZh: string;
  pinyin: string;
  capitalCityId: string;   // chengdu
  mapAreaId: string;       // id элемента SVG
  facts: Fact[];
  sourceIds: string[];
};

type City = {
  id: string;              // chengdu
  regionId: string;        // sichuan
  set: 'capital' | 'notable' | 'border';
  nameRu: string;
  nameZh: string;
  pinyin: string;
  lon: number;             // градусы, не единицы карты
  lat: number;
  sourceIds: string[];
};

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

type Target = {
  kind: 'region' | 'city' | 'physical';
  id: string;              // sichuan | chengdu
};

type Attempt = {
  questionId: string;
  roundId: string;         // к какому раунду относится попытка
  target: Target;
  exerciseType: 'find-on-map' | 'name-target' | 'match-pair';
  language: 'ru' | 'zh';
  isCorrect: boolean;
  durationMs: number;
  answeredAt: string;      // ISO 8601
};

type Progress = {
  schemaVersion: 3;
  attempts: Attempt[];    // последние 500
  masteredTargets: Target[];
};
```

`Fact` содержит `title`, `body`, `sourceIds` и опционально `imageAlt`; он не может содержать HTML. Столица указывается в учебной форме, принятой в утверждённом источнике. Данные регионов проходят проверку: уникальность `id` и `mapAreaId`, непустые переводы, существование всех `sourceIds`.

Столица — ссылка `capitalCityId` в справочник городов, а не пара имён у региона: у Чэнду иначе два места правды. Поле `set` у города говорит, откуда он взялся в каталоге, и оно же задаёт объём партии — ученик выбирает набор в окне перед стартом. Координаты хранятся в градусах: проекция применяется на границе с картой (`src/map/city-points.ts`), поэтому замена карты переносит города пересчётом, а не оставляет их молча неверными.

Вид цели входит в саму цель, а не выводится из идентификатора: `beijing` существует и как регион, и как город, и по одной строке их не различить. `exerciseType` называет форму вопроса — найти по имени, назвать по месту, связать с другим каталогом, — а не то, что спрашивают: формы одинаковы для регионов и городов.

Пустой `sourceIds` у коллекции — признак черновика (решение 2026-08-04): пометка снимается сама, когда у коллекции появляются источники.

Попытка хранит язык вопроса, а не уровень: уровней в продукте нет. Переход со второй версии на третью отбрасывает сохранённое поле уровня и проставляет русский — восстановить по нему язык нельзя, не вернув понятие, от которого отказались.

Миграции прогресса обязательны при смене `schemaVersion`. Неудачная миграция не уничтожает исходные данные: резервная копия сохраняется отдельно, пользователю предлагается сбросить только прогресс. Переход с первой версии на вторую переводит `regionId` в цель-регион и переименовывает типы упражнений.
