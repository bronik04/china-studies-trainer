import type { ExerciseType, Level } from './round';

export type Representation = 'name-ru' | 'name-zh' | 'pinyin' | 'capital';

/** SPEC.md: сложность растёт от русского названия к смешанному режиму. */
export const REPRESENTATIONS_BY_LEVEL: Readonly<
  Record<Level, readonly Representation[]>
> = {
  1: ['name-ru'],
  2: ['name-zh'],
  3: ['pinyin', 'capital'],
  4: ['name-ru', 'name-zh', 'pinyin', 'capital'],
};

/**
 * Всё, что нужно ярлыку: три имени и, у региона, столица. Домен не знает
 * каталога контента — иначе город пришлось бы объявлять регионом.
 */
export type Nameable = {
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  readonly capitalRu?: string;
};

export function labelOf(named: Nameable, representation: Representation): string {
  switch (representation) {
    case 'name-ru':
      return named.nameRu;
    case 'name-zh':
      return named.nameZh;
    case 'pinyin':
      return named.pinyin;
    case 'capital':
      /*
       * Столица есть только у региона. Представление `capital` выдаётся лишь
       * играм по регионам, поэтому пустая строка сюда не доходит; она стоит
       * здесь как честное значение, а не как заглушка поведения.
       */
      return named.capitalRu ?? '';
  }
}

/**
 * Язык представления. Без него `<h1>` с иероглифами не получает китайский
 * шрифт: правило языка в `styles.css` цепляется за `lang`, а `labelOf` отдаёт
 * голую строку.
 *
 * Пиньинь помечается тем же китайским: его диакритику (`ǎ ǔ ā ē ī ō ū`) несёт
 * только Noto Serif SC — проверено разбором `cmap`, см. спецификацию
 * типографики.
 */
export function langOf(representation: Representation): string | undefined {
  switch (representation) {
    case 'name-zh':
      return 'zh-Hans';
    case 'pinyin':
      return 'zh-Latn-pinyin';
    case 'name-ru':
    case 'capital':
      return undefined;
  }
}

/**
 * В задании «регион — столица» ответ и есть столица, поэтому показывать её
 * в вопросе нельзя. Для остальных заданий доступны все представления уровня.
 */
export function representationsFor(
  level: Level,
  exerciseType: ExerciseType,
): readonly Representation[] {
  const available = REPRESENTATIONS_BY_LEVEL[level];

  return exerciseType === 'match-pair'
    ? available.filter((representation) => representation !== 'capital')
    : available;
}
