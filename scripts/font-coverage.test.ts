import { expect, it } from 'vitest';
import { missingGlyphs } from './font-coverage';
import type { FontSpec } from './font-manifest';

/* `latin` — прочая диакритика: её несёт текстовый шрифт, а не китайский. */
const GROUPS = { han: '安', pinyin: 'ā', symbol: '✓', latin: 'ř', rest: 'А' };
const FONTS: readonly FontSpec[] = [
  {
    file: 'latin.woff2',
    family: 'Golos Text',
    weight: 400,
    requires: ['rest', 'latin'],
  },
  {
    file: 'han.woff2',
    family: 'Noto Serif SC',
    weight: 400,
    requires: ['han', 'pinyin', 'symbol'],
  },
];

const points = (chars: string) => [...chars].map((c) => c.codePointAt(0)!);

it('пропускает, когда всё покрыто', () => {
  const coverage = {
    'latin.woff2': points('Аř'),
    'han.woff2': points('安ā✓'),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, [])).toEqual([]);
});

it('называет знак, шрифт и кодовую точку', () => {
  const coverage = {
    'latin.woff2': points('Аř'),
    'han.woff2': points('安ā'),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, [])).toEqual([
    { char: '✓', codePoint: 0x2713, family: 'Noto Serif SC' },
  ]);
});

it('молчит о знаке из списка исключений', () => {
  const coverage = {
    'latin.woff2': points('Аř'),
    'han.woff2': points('安ā'),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, ['✓'])).toEqual([]);
});

it('падает, если для шрифта нет записи о покрытии', () => {
  expect(() => missingGlyphs(GROUPS, {}, FONTS, [])).toThrow(/latin\.woff2/);
});

it('не спрашивает с латинского шрифта того, что он не набирает', () => {
  // У латинского шрифта нет `ā`, но пиньинь уходит в китайский шрифт по `lang`.
  const coverage = {
    'latin.woff2': points('Аř'),
    'han.woff2': points('安ā✓'),
  };

  expect(missingGlyphs(GROUPS, coverage, FONTS, [])).toEqual([]);
});
