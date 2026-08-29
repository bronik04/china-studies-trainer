/**
 * Подмножества шрифтов. Файл скачивается с Google Fonts, а режется на месте —
 * `pyftsubset` из fonttools.
 *
 * Раньше нарезку делал сам Google по параметру `text=`, и инструмент был не
 * нужен. С 2026-08-29 для китайских шрифтов это перестало работать: запрос на
 * два иероглифа возвращает весь шрифт — 6,15 МБ в woff2 и 14,8 МБ в ttf,
 * — а `unicode-range` в ответе по-прежнему повторяет запрошенное. Сборка
 * этого не замечала: `validate:fonts` проверяет покрытие, а полный шрифт
 * покрывает всё, и в репозиторий уехал шрифт на 30 928 знаков вместо 477.
 *
 * Отсюда правило: что вошло в файл, решаем мы, а не отвечающая сторона.
 * Ответ Google остаётся источником — лицензия и происхождение те же, — но
 * подмножество вырезается локально и проверяется по вырезанному.
 *
 * Нужен `pyftsubset` с поддержкой woff2. Ставится один раз:
 * `pipx install fonttools && pipx inject fonttools brotli`.
 *
 * Сеть нужна только здесь и только когда меняется контент.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { groupGlyphs, readSourceText } from './font-inventory';
import { EXCEPTIONS, FONTS } from './font-manifest';
import { codePointsInTtf } from './ttf-cmap';

/* Заголовок современного браузера: под него Google отдаёт woff2. */
const WOFF2_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const FONTS_DIR = resolve(process.cwd(), 'src/assets/fonts');
const COVERAGE = resolve(process.cwd(), 'scripts/font-coverage.json');

/**
 * Режет скачанный файл по списку знаков. Формат задаётся `flavor`: woff2 идёт
 * приложению, ttf — проверке покрытия, и оба вырезаны из одного источника,
 * поэтому разойтись не могут.
 */
function subset(source: Buffer, text: string, flavor: 'woff2' | 'ttf'): Buffer {
  const stem = join(tmpdir(), `font-${process.pid}-${flavor}`);
  const input = `${stem}.in`;
  const output = `${stem}.out`;

  writeFileSync(input, source);

  try {
    execFileSync(
      'pyftsubset',
      [
        input,
        `--text=${text}`,
        ...(flavor === 'woff2' ? ['--flavor=woff2'] : []),
        `--output-file=${output}`,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );

    return readFileSync(output);
  } catch (error) {
    throw new Error(
      'Не удалось нарезать шрифт. Нужен pyftsubset с поддержкой woff2: ' +
        '`pipx install fonttools && pipx inject fonttools brotli`',
      { cause: error },
    );
  } finally {
    rmSync(input, { force: true });
    rmSync(output, { force: true });
  }
}

async function fetchSubset(
  family: string,
  weight: number,
  text: string,
  userAgent: string,
): Promise<ArrayBuffer> {
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${family}:wght@${weight}`);
  url.searchParams.set('text', text);

  const sheet = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!sheet.ok) {
    throw new Error(`Google Fonts ответил ${sheet.status} на ${family} ${weight}`);
  }

  const href = /url\((https:[^)]+)\)/.exec(await sheet.text())?.[1];
  if (href === undefined) {
    throw new Error(`В ответе для ${family} ${weight} нет ссылки на файл`);
  }

  const file = await fetch(href, { headers: { 'User-Agent': userAgent } });
  if (!file.ok) {
    throw new Error(`Файл ${family} ${weight} не скачался: ${file.status}`);
  }

  return file.arrayBuffer();
}

const groups = groupGlyphs(readSourceText(resolve(process.cwd(), 'src')));
const exceptions = new Set(EXCEPTIONS.map(({ char }) => char.codePointAt(0)!));

mkdirSync(FONTS_DIR, { recursive: true });

const coverage: Record<string, number[]> = {};
let totalBytes = 0;

for (const font of FONTS) {
  const text = font.requires.map((group) => groups[group]).join('');

  /*
   * Скачивается один файл на шрифт — тот, что отдаёт Google. Для латиницы это
   * уже подмножество, для китайского — весь шрифт; и то и другое режется
   * дальше одинаково.
   */
  const source = Buffer.from(
    await fetchSubset(font.family, font.weight, text, WOFF2_UA),
  );
  const ttf = subset(source, text, 'ttf');
  const covered = codePointsInTtf(
    ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength) as ArrayBuffer,
  );
  const missing = [...text].filter((char) => {
    const code = char.codePointAt(0)!;

    return !covered.has(code) && !exceptions.has(code);
  });

  if (missing.length > 0) {
    console.warn(
      `${font.family} ${font.weight}: нет знаков ${missing.join(' ')}. ` +
        'Либо внесите их в EXCEPTIONS с причиной, либо смените шрифт',
    );
  }

  const woff2 = subset(source, text, 'woff2');
  writeFileSync(resolve(FONTS_DIR, font.file), woff2);

  coverage[font.file] = [...covered].sort((left, right) => left - right);
  totalBytes += woff2.byteLength;

  console.info(
    `${font.file}: запрошено ${[...text].length}, в шрифте ${covered.size}, ` +
      `${(woff2.byteLength / 1024).toFixed(1)} КБ`,
  );
}

writeFileSync(COVERAGE, `${JSON.stringify(coverage, null, 2)}\n`);

console.info(`Всего шрифтов: ${(totalBytes / 1024).toFixed(1)} КБ`);
