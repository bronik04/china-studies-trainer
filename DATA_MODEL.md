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

type Attempt = {
  questionId: string;
  roundId: string;         // к какому раунду относится попытка
  regionId: string;
  exerciseType: 'find-on-map' | 'name-region' | 'match-capital';
  level: 1 | 2 | 3 | 4;
  isCorrect: boolean;
  durationMs: number;
  answeredAt: string;      // ISO 8601
};

type Progress = {
  schemaVersion: 1;
  attempts: Attempt[];    // последние 500
  masteredRegionIds: string[];
  unlockedLevel: 1 | 2 | 3 | 4;
};
```

`Fact` содержит `title`, `body`, `sourceIds` и опционально `imageAlt`; он не может содержать HTML. Столица указывается в учебной форме, принятой в утверждённом источнике. Данные регионов проходят проверку: уникальность `id` и `mapAreaId`, непустые переводы, существование всех `sourceIds`.

Миграции прогресса обязательны при смене `schemaVersion`. Неудачная миграция не уничтожает исходные данные: резервная копия сохраняется отдельно, пользователю предлагается сбросить только прогресс.
