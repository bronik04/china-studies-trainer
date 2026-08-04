/**
 * Чтение токенов из `tokens.css`. CSS остаётся единственным источником
 * значений: тест разбирает тот же файл, который грузит приложение, поэтому
 * контракт не может разойтись с реальностью.
 *
 * Модуль только для тестов и скриптов: приложению он не нужен, оно подключает
 * `tokens.css` напрямую. Импорт `?raw` здесь не годится — сборщик обрабатывает
 * CSS раньше и отдаёт пустую строку, поэтому файл читается с диска. Путь
 * считается от корня проекта: и Vitest, и `npx tsx` запускаются оттуда.
 */
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

const TOKENS_FILE = resolvePath(process.cwd(), 'src/design/tokens.css');

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

export function readTokens(): ReadonlyMap<string, string> {
  const block = readRootBlock(readFileSync(TOKENS_FILE, 'utf8'));
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
