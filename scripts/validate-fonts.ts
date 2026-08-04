/**
 * Проверка покрытия на сборке. Сравнивает инвентарь знаков с тем, что реально
 * вошло в подмножества: добавили регион с новым иероглифом и не
 * перегенерировали шрифты — сборка падает, а не выпускает квадратик.
 *
 * Сети и самих шрифтов не требует: сравниваются два списка.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { missingGlyphs } from './font-coverage';
import { groupGlyphs, readSourceText } from './font-inventory';
import { EXCEPTIONS, FONTS } from './font-manifest';

const coverage = JSON.parse(
  readFileSync(resolve(process.cwd(), 'scripts/font-coverage.json'), 'utf8'),
) as Record<string, number[]>;

const groups = groupGlyphs(readSourceText(resolve(process.cwd(), 'src')));
const missing = missingGlyphs(
  groups,
  coverage,
  FONTS,
  EXCEPTIONS.map(({ char }) => char),
);

if (missing.length > 0) {
  throw new Error(
    `${missing
      .map(
        ({ char, codePoint, family }) =>
          `Знак вне подмножества: ${char} (U+${codePoint
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}), нужен шрифту ${family}.`,
      )
      .join('\n')}\nЗапустите npm run generate:fonts`,
  );
}

console.info(
  `Знаков в инвентаре: 汉字 ${groups.han.length}, пиньинь ${groups.pinyin.length}, ` +
    `значки ${groups.symbol.length}, прочих ${groups.rest.length}. ` +
    `Исключений: ${EXCEPTIONS.length}.`,
);
