import type { GlyphGroup } from './font-inventory';

export type FontSpec = {
  readonly file: string;
  readonly family: string;
  readonly weight: number;
  /** Группы знаков, которые этот шрифт обязан покрывать. */
  readonly requires: readonly GlyphGroup[];
};

/*
 * Требование выводится из того, где шрифт применяется. Пиньинь и значки
 * уходят в Noto Serif SC — по `lang` и по цепочке фолбэка, — поэтому с
 * латинских шрифтов они не спрашиваются.
 *
 * Проверено разбором cmap: у Prata нет `Ā ā ē ě ī ō ū ǎ ǔ` и `→ ↻ ≈ ○ ● ✓`,
 * у Golos Text нет `ǎ ǔ` и `↻ ○ ● ✓`.
 *
 * Группа `latin` — прочая диакритика, имена фотографов: `č ł ř Ž`. Она
 * спрашивается только с Golos Text: у него эти знаки есть, у Prata и у Noto
 * Serif SC нет, а имя автора стоит в подписи под кадром, которую набирает
 * текстовый шрифт.
 */
export const FONTS: readonly FontSpec[] = [
  { file: 'prata-400.woff2', family: 'Prata', weight: 400, requires: ['rest'] },
  {
    file: 'golos-text-400.woff2',
    family: 'Golos Text',
    weight: 400,
    requires: ['rest', 'latin'],
  },
  {
    file: 'golos-text-500.woff2',
    family: 'Golos Text',
    weight: 500,
    requires: ['rest', 'latin'],
  },
  {
    file: 'golos-text-700.woff2',
    family: 'Golos Text',
    weight: 700,
    requires: ['rest', 'latin'],
  },
  {
    file: 'noto-serif-sc-400.woff2',
    family: 'Noto Serif SC',
    weight: 400,
    requires: ['han', 'pinyin', 'symbol'],
  },
];

/**
 * Знаки, которых нет ни в одном из трёх шрифтов и которые сознательно берутся
 * из системы. Список явный: «взяли из системы» должно быть решением, а не
 * случайностью.
 */
export const EXCEPTIONS: readonly {
  readonly char: string;
  readonly reason: string;
}[] = [
  {
    char: '↻',
    reason:
      'значок «стоит повторить» на карточке ответа. Нет ни в Prata, ни в ' +
      'Golos Text, ни в Noto Serif SC. Смысл несут aria-label значка и ' +
      'заголовок словами рядом.',
  },
];
