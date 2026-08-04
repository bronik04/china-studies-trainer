/**
 * Подмножества шрифтов. Google Fonts принимает параметр `text=` и возвращает
 * файл ровно по запрошенным знакам — это снимает и 20-мегабайтный исходник,
 * и инструмент нарезки.
 *
 * Скачивается два файла одного подмножества: woff2 для приложения и ttf для
 * проверки. Формат выбирается заголовком `User-Agent`.
 *
 * Проверять обязательно: `unicode-range` в ответе Google повторяет
 * запрошенное, а не отвечает, что вошло. Контрольный запрос трёх знаков
 * `中国А` у Prata возвращает «покрыто всё», хотя иероглифов в Prata нет.
 *
 * Сеть нужна только здесь и только когда меняется контент.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupGlyphs, readSourceText } from './font-inventory';
import { EXCEPTIONS, FONTS } from './font-manifest';
import { codePointsInTtf } from './ttf-cmap';

const WOFF2_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
/** Android 4.3 не знает woff2, и Google отдаёт ему то же подмножество в ttf. */
const TTF_UA =
  'Mozilla/5.0 (Linux; U; Android 4.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';

const FONTS_DIR = resolve(process.cwd(), 'src/assets/fonts');
const COVERAGE = resolve(process.cwd(), 'scripts/font-coverage.json');

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

  const ttf = await fetchSubset(font.family, font.weight, text, TTF_UA);
  const covered = codePointsInTtf(ttf);
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

  const woff2 = await fetchSubset(font.family, font.weight, text, WOFF2_UA);
  writeFileSync(resolve(FONTS_DIR, font.file), Buffer.from(woff2));

  coverage[font.file] = [...covered].sort((left, right) => left - right);
  totalBytes += woff2.byteLength;

  console.info(
    `${font.file}: запрошено ${[...text].length}, в шрифте ${covered.size}, ` +
      `${(woff2.byteLength / 1024).toFixed(1)} КБ`,
  );
}

writeFileSync(COVERAGE, `${JSON.stringify(coverage, null, 2)}\n`);

console.info(`Всего шрифтов: ${(totalBytes / 1024).toFixed(1)} КБ`);
