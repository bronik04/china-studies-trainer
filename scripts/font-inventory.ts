import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type GlyphGroup = 'han' | 'pinyin' | 'symbol' | 'rest';

const HAN = /[一-鿿]/;
/** Стрелки, математика и геометрические фигуры: `→ ↻ ≈ ○ ● ✓`. */
const SYMBOL = /[←-⯿]/;
const LATIN_LETTER = /\p{Script=Latin}/u;

/**
 * Деление не косметическое: от него зависит, какой шрифт что обязан покрывать.
 * Пиньинь и значки уходят в китайский шрифт — латинские их не несут: у Prata
 * нет всей диакритики, у Golos Text нет `ǎ ǔ`, значков нет ни у одного из
 * двух. Проверено разбором cmap, см. спецификацию типографики.
 */
export function groupGlyphs(
  source: string,
): Readonly<Record<GlyphGroup, string>> {
  const groups: Record<GlyphGroup, Set<string>> = {
    han: new Set(),
    pinyin: new Set(),
    symbol: new Set(),
    rest: new Set(),
  };

  for (const char of source) {
    const code = char.codePointAt(0)!;

    // Управляющие: перевод строки и табуляция глифов не требуют.
    if (code < 0x20 || (code >= 0x7f && code < 0xa0)) {
      continue;
    }

    if (HAN.test(char)) {
      groups.han.add(char);
    } else if (SYMBOL.test(char)) {
      groups.symbol.add(char);
    } else if (code > 0x7f && LATIN_LETTER.test(char)) {
      groups.pinyin.add(char);
    } else {
      groups.rest.add(char);
    }
  }

  return {
    han: [...groups.han].sort().join(''),
    pinyin: [...groups.pinyin].sort().join(''),
    symbol: [...groups.symbol].sort().join(''),
    rest: [...groups.rest].sort().join(''),
  };
}

/** Весь текст приложения без тестов: инвентарь выводится, а не пишется руками. */
export function readSourceText(root: string): string {
  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        files.push(path);
      }
    }
  };

  walk(root);

  return files.map((file) => readFileSync(file, 'utf8')).join('');
}
