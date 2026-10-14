import { expect, it } from 'vitest';
import { groupGlyphs } from './font-inventory';

it('делит знаки на четыре группы', () => {
  const groups = groupGlyphs('安徽省 Sìchuān shěng ● ✓ Провинция «А» — 34');

  expect([...groups.han].sort().join('')).toBe('安徽省');
  // Порядок — по кодовым точкам: ì (U+00EC) раньше ā (U+0101) и ě (U+011B).
  expect([...groups.pinyin].sort().join('')).toBe('ìāě');
  expect([...groups.symbol].sort().join('')).toBe('●✓');
  expect(groups.rest).toContain('П');
  expect(groups.rest).toContain('«');
  expect(groups.rest).toContain('3');
  expect(groups.rest).toContain('—');
});

it('не тащит в инвентарь управляющие знаки', () => {
  const groups = groupGlyphs('а\nб\tв');

  expect(groups.rest).not.toContain('\n');
  expect(groups.rest).not.toContain('\t');
});

it('каждый знак попадает ровно в одну группу', () => {
  const source = '安 ā ✓ П';
  const groups = groupGlyphs(source);
  const total =
    groups.han.length +
    groups.pinyin.length +
    groups.symbol.length +
    groups.rest.length;

  expect(total).toBe(new Set([...source]).size);
});

it('множительный знак — не буква и остаётся в общей группе', () => {
  // `×` живёт в Latin-1, но это знак операции: спрашивать его с китайского
  // шрифта незачем, его несут и Cormorant Garamond, и Onest.
  const groups = groupGlyphs('×·»');

  expect(groups.pinyin).toBe('');
  expect([...groups.rest].sort().join('')).toBe('·»×');
});
