/**
 * Разбор `tokens.css`. CSS остаётся единственным источником значений: проверка
 * контраста читает тот же файл, который грузит приложение, поэтому контракт не
 * может разойтись с реальностью.
 *
 * Модуль чистый: файл он не читает. Чтение с диска живёт в
 * `scripts/validate-tokens.ts` — узловые API не должны попадать в область
 * сборки приложения.
 */

/**
 * Берётся только первый блок `:root`. Второй блок лежит внутри
 * `prefers-reduced-motion` и переопределяет длительности, а не цвета.
 */
function readRootBlock(css: string): string {
  // Сборщик может отдать файл минифицированным, поэтому пробелы между
  // селектором и скобкой не фиксируются.
  const opening = /:root\s*\{/.exec(css);
  if (opening === null) {
    throw new Error('В tokens.css нет блока :root');
  }

  const start = opening.index + opening[0].length;
  const end = css.indexOf('}', start);
  if (end === -1) {
    throw new Error('Блок :root в tokens.css не закрыт');
  }

  return css.slice(start, end);
}

export function parseTokens(css: string): ReadonlyMap<string, string> {
  const block = readRootBlock(css);
  const tokens = new Map<string, string>();

  for (const [, name, value] of block.matchAll(
    /(--[a-z0-9-]+)\s*:\s*([^;]+);/g,
  )) {
    tokens.set(name, value.trim());
  }

  return tokens;
}

/** Разворачивает `var(--x)` до значения примитива. */
export function resolve(
  tokens: ReadonlyMap<string, string>,
  name: string,
  depth = 0,
): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`Нет токена: ${name}`);
  }

  if (depth > 10) {
    throw new Error(`Циклическая ссылка в токене: ${name}`);
  }

  const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);

  return reference ? resolve(tokens, reference[1], depth + 1) : value;
}
