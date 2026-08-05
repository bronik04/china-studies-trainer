/**
 * Каким названием игра спрашивает. Выбирает ученик перед стартом.
 *
 * Раньше это решало число `level`, и ученик не мог ни увидеть его, ни
 * изменить. Уровней в продукте нет; пиньинь и столица перестали быть тем,
 * чем спрашивают, — пиньинь остался в разборе и атласе, а столица это
 * отдельная игра, а не язык.
 */
export type QuestionLanguage = 'ru' | 'zh';

/** Всё, что нужно ярлыку. Домен не знает каталога контента. */
export type Nameable = {
  readonly nameRu: string;
  readonly nameZh: string;
};

export function labelOf(named: Nameable, language: QuestionLanguage): string {
  return language === 'zh' ? named.nameZh : named.nameRu;
}

/**
 * Язык разметки. Без него `<h1>` с иероглифами не получает китайский шрифт:
 * правило в `styles.css` цепляется за `lang`, а `labelOf` отдаёт голую строку.
 */
export function langOf(language: QuestionLanguage): string | undefined {
  return language === 'zh' ? 'zh-Hans' : undefined;
}
