/**
 * Контраст по WCAG 2.2. Используется тестом дизайн-системы: каждая пара цветов,
 * на которую опирается интерфейс, проверяется автоматически, поэтому палитру
 * нельзя ухудшить незаметно.
 *
 * Формулы: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

/** Порог для обычного текста (WCAG 1.4.3). */
export const TEXT_CONTRAST = 4.5;

/**
 * Порог для границ, состояний и графики, без которой контент не понять
 * (WCAG 1.4.11). Тот же порог требует MAP_SPEC.md от обводки и фокуса.
 */
export const GRAPHIC_CONTRAST = 3;

function channel(value: number): number {
  const ratio = value / 255;

  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** Принимает `#rgb` и `#rrggbb`; регистр не важен. */
export function parseHex(hex: string): readonly [number, number, number] {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Не цвет: ${hex}`);
  }

  const number = Number.parseInt(full, 16);

  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex);

  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

/*
 * Не наружу: снаружи нужен только округлённый вниз результат, а сырое число
 * приглашает сравнить его с порогом самому — и получить 2.995 за проходное 3.
 */
function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Округление вниз до сотых: округление вверх выдало бы 2.995 за проходное 3.0. */
export function contrastRatioRounded(
  foreground: string,
  background: string,
): number {
  return Math.floor(contrastRatio(foreground, background) * 100) / 100;
}
