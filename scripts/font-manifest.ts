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
 * Шрифты редизайна «Тушь и киноварь» (DECISIONS.md, 2026-10-14): Cormorant
 * Garamond — заголовки, Onest — текст и интерфейс. Заголовки на макетах только
 * жирные, поэтому у Cormorant одно начертание, 700. Китайский — в двух весах:
 * 700 у крупного иероглифа вопроса и глав, 400 у иероглифов в строке текста.
 *
 * Группа `latin` — прочая диакритика, имена фотографов: `č ł ř Ž`. Она
 * спрашивается только с текстовым шрифтом: имя автора стоит в подписи под
 * кадром, которую набирает он.
 */
export const FONTS: readonly FontSpec[] = [
  {
    file: 'cormorant-garamond-700.woff2',
    family: 'Cormorant Garamond',
    weight: 700,
    requires: ['rest'],
  },
  { file: 'onest-400.woff2', family: 'Onest', weight: 400, requires: ['rest', 'latin'] },
  { file: 'onest-500.woff2', family: 'Onest', weight: 500, requires: ['rest', 'latin'] },
  { file: 'onest-600.woff2', family: 'Onest', weight: 600, requires: ['rest', 'latin'] },
  { file: 'onest-700.woff2', family: 'Onest', weight: 700, requires: ['rest', 'latin'] },
  {
    file: 'noto-serif-sc-400.woff2',
    family: 'Noto Serif SC',
    weight: 400,
    requires: ['han', 'pinyin', 'symbol'],
  },
  {
    file: 'noto-serif-sc-700.woff2',
    family: 'Noto Serif SC',
    weight: 700,
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
      'значок «стоит повторить» на карточке ответа. Нет в Noto Serif SC, ' +
      'которым набираются значки, а в подмножества латинских шрифтов значки ' +
      'не входят. Смысл несут aria-label значка и заголовок словами рядом.',
  },
];
