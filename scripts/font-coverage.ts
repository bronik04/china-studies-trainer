import type { GlyphGroup } from './font-inventory';
import type { FontSpec } from './font-manifest';

export type Missing = {
  readonly char: string;
  readonly codePoint: number;
  readonly family: string;
};

/**
 * Чистое сравнение двух списков: инвентаря и того, что реально вошло в файлы.
 * Ни сети, ни самих шрифтов не требует, поэтому годится для сборки.
 */
export function missingGlyphs(
  groups: Readonly<Record<GlyphGroup, string>>,
  coverage: Readonly<Record<string, readonly number[]>>,
  fonts: readonly FontSpec[],
  exceptions: readonly string[],
): readonly Missing[] {
  const allowed = new Set(exceptions.map((char) => char.codePointAt(0)!));
  const missing: Missing[] = [];

  for (const font of fonts) {
    const covered = coverage[font.file];

    if (covered === undefined) {
      throw new Error(
        `Нет записи о покрытии для ${font.file}. Запустите npm run generate:fonts`,
      );
    }

    const inFont = new Set(covered);

    for (const group of font.requires) {
      for (const char of groups[group]) {
        const codePoint = char.codePointAt(0)!;

        if (!inFont.has(codePoint) && !allowed.has(codePoint)) {
          missing.push({ char, codePoint, family: font.family });
        }
      }
    }
  }

  return missing;
}
