# Модель данных

Идентификаторы стабильны, в kebab-case и не зависят от отображаемого имени.

```ts
type Region = {
  id: string;              // sichuan
  kind: 'province' | 'autonomous-region' | 'municipality' | 'sar';
  nameRu: string;
  nameZh: string;
  pinyin: string;
  capitalRu: string;
  capitalZh: string;
  mapAreaId: string;       // id элемента SVG
  facts: Fact[];
  sourceIds: string[];
};

type Target = {
  kind: 'region' | 'city';
  id: string;              // sichuan | chengdu
};

type Attempt = {
  questionId: string;
  roundId: string;         // к какому раунду относится попытка
  target: Target;
  exerciseType: 'find-on-map' | 'name-target' | 'match-pair';
  level: 1 | 2 | 3 | 4;
  isCorrect: boolean;
  durationMs: number;
  answeredAt: string;      // ISO 8601
};

type Progress = {
  schemaVersion: 2;
  attempts: Attempt[];    // последние 500
  masteredTargets: Target[];
};
```

`Fact` содержит `title`, `body`, `sourceIds` и опционально `imageAlt`; он не может содержать HTML. Столица указывается в учебной форме, принятой в утверждённом источнике. Данные регионов проходят проверку: уникальность `id` и `mapAreaId`, непустые переводы, существование всех `sourceIds`.

Вид цели входит в саму цель, а не выводится из идентификатора: `beijing` существует и как регион, и как город, и по одной строке их не различить. `exerciseType` называет форму вопроса — найти по имени, назвать по месту, связать с другим каталогом, — а не то, что спрашивают: формы одинаковы для регионов и городов.

Миграции прогресса обязательны при смене `schemaVersion`. Неудачная миграция не уничтожает исходные данные: резервная копия сохраняется отдельно, пользователю предлагается сбросить только прогресс. Переход с первой версии на вторую переводит `regionId` в цель-регион и переименовывает типы упражнений.
