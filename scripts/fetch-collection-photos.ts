/**
 * Снимки коллекций с Викисклада.
 *
 * Почему Викисклад. Нужны свободные лицензии и проверяемое происхождение, и
 * нужны они на каждый снимок отдельно. Викисклад отдаёт файл и его лицензию,
 * автора и адрес страницы одним запросом, поэтому запись в `docs/sources`
 * получается из того же ответа, что и сам файл, и разойтись с ним не может.
 * Фотобанки вроде Unsplash дают разрешение своими условиями пользования, а не
 * публичной лицензией, и китайской натуры вроде Яньмэньгуаня у них нет.
 *
 * Что делает: скачивает оригинал, сводит его в два WebP — 1200 px под крупный
 * кадр и 640 px под карточку, — и переписывает `src/content/photo-credits.ts`
 * и `docs/sources/photos.md`.
 *
 * В сборку не входит: нужна сеть. Запуск — `npm run fetch:photos`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* Только ASCII: заголовок запроса кириллицу не принимает. */
const AGENT =
  'china-studies-trainer/0.3.0 (educational, not distributed; bronik004@gmail.com)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OUTPUT_DIR = 'public/photos';
const CREDITS_FILE = 'src/content/photo-credits.ts';
const SOURCES_FILE = 'docs/sources/photos.md';

/**
 * Крупный кадр и карточка. Крупный нужен именно таким: в «Узнать по
 * фотографии» снимок идёт во всю ширину (`sizes="100vw"`), и обрезать его
 * значило бы мылить сам вопрос.
 */
const WIDTHS = [1200, 640] as const;

/**
 * Качество и потолок веса.
 *
 * Средний снимок при q68 весит около сотни килобайт, и трогать его незачем.
 * Но детальные кадры — листва, кладка, толпа — при том же качестве доходят до
 * трёхсот с лишним, а весь каталог лежит в репозитории. Поэтому качество
 * понижается только там, где вес вышел за потолок, и только до пола: лучше
 * кадр помягче, чем страница в треть мегабайта.
 */
const QUALITY = 68;
const QUALITY_FLOOR = 50;
const SIZE_CAP_BYTES: Readonly<Record<number, number>> = { 1200: 200_000, 640: 70_000 };

type Manifest = { readonly photos: Readonly<Record<string, string>> };

/**
 * Ответ Викисклада — ровно те поля, которые спрошены. Описан явно, а не
 * `any`: имя поля, набранное с опечаткой, должно ловиться компилятором, а не
 * превращаться в «автор не указан» в готовом файле.
 */
type MetaValue = { readonly value?: string };

type ImageInfo = {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly descriptionurl: string;
  readonly extmetadata?: {
    readonly LicenseShortName?: MetaValue;
    readonly LicenseUrl?: MetaValue;
    readonly Artist?: MetaValue;
    readonly Restrictions?: MetaValue;
  };
};

type CommonsPage = {
  readonly title: string;
  readonly imageinfo?: readonly ImageInfo[];
};

type CommonsResponse = {
  readonly query: {
    readonly pages: Readonly<Record<string, CommonsPage>>;
    readonly normalized?: readonly { readonly from: string; readonly to: string }[];
  };
};

type Credit = {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly page: string;
  readonly width: number;
  readonly height: number;
  /** Ширины, которые действительно легли в public/photos. */
  readonly widths: readonly number[];
};

function stripHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Викисклад принимает не больше пятидесяти заголовков за раз. */
const TITLES_PER_REQUEST = 40;

async function imageInfo(
  titles: readonly string[],
): Promise<Map<string, CommonsPage>> {
  const byTitle = new Map<string, CommonsPage>();

  for (let from = 0; from < titles.length; from += TITLES_PER_REQUEST) {
    const batch = titles.slice(from, from + TITLES_PER_REQUEST);
    const url = `${API}?${new URLSearchParams({
      format: 'json',
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Restrictions',
    })}`;
    const response = await fetch(url, { headers: { 'User-Agent': AGENT } });

    if (!response.ok) {
      throw new Error(`Викисклад ответил ${response.status}`);
    }

    const data = (await response.json()) as CommonsResponse;

    for (const page of Object.values(data.query.pages)) {
      byTitle.set(page.title, page);
    }

    /*
     * API приводит заголовки к своему виду — подчёркивания в пробелы. Обратное
     * соответствие берётся из его же ответа, иначе манифест пришлось бы писать
     * ровно в том написании, которое выберет Викисклад.
     */
    for (const item of data.query.normalized ?? []) {
      const page = byTitle.get(item.to);
      if (page !== undefined) {
        byTitle.set(item.from, page);
      }
    }
  }

  return byTitle;
}

const manifest: Manifest = JSON.parse(
  readFileSync('scripts/data/collection-photos.json', 'utf8'),
);
const entries = Object.entries(manifest.photos);
const info = await imageInfo(entries.map(([, title]) => title));

mkdirSync(OUTPUT_DIR, { recursive: true });
const scratch = mkdirSync(join(tmpdir(), 'collection-photos'), {
  recursive: true,
});
const credits: Credit[] = [];

for (const [id, title] of entries) {
  const page = info.get(title);
  const image = page?.imageinfo?.[0];

  if (page === undefined || image === undefined) {
    throw new Error(`Викисклад не знает файла ${title}`);
  }

  const meta = image.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  const restrictions = stripHtml(meta.Restrictions?.value);

  /*
   * Несвободная лицензия или оговорка об использовании роняют прогон: снимок,
   * который нельзя показывать, лучше не иметь вовсе, чем иметь и не заметить.
   */
  if (!/^(CC0|CC BY|Public domain)/i.test(license)) {
    throw new Error(`${title}: лицензия «${license}» не свободная`);
  }
  if (restrictions.length > 0) {
    throw new Error(`${title}: оговорка «${restrictions}»`);
  }

  const original = join(scratch ?? tmpdir(), `${id}-original`);
  const source = image.url.split('?')[0];
  const bytes = await fetch(source, { headers: { 'User-Agent': AGENT } });

  if (!bytes.ok) {
    throw new Error(`${title}: файл не скачался (${bytes.status})`);
  }

  writeFileSync(original, Buffer.from(await bytes.arrayBuffer()));

  /*
   * Ширина не задирается выше исходной: пикселей, которых в снимке нет,
   * увеличение не создаст, а вес поднимет. Снимок 772 px так и останется
   * 772 px, и это честнее размытого 1200.
   */
  const widths = [...new Set(WIDTHS.map((width) => Math.min(width, image.width)))];

  for (const width of widths) {
    const target = join(OUTPUT_DIR, `${id}-${width}.webp`);
    const cap = SIZE_CAP_BYTES[width] ?? Infinity;

    /*
     * Качество понижается шагами, пока кадр не уложится в потолок. Шаг в пять
     * единиц: мельче — незаметно на весе, крупнее — заметно на глаз.
     */
    for (let quality = QUALITY; ; quality -= 5) {
      execFileSync('cwebp', [
        '-quiet',
        '-m',
        '6',
        '-resize',
        String(width),
        '0',
        '-q',
        String(quality),
        original,
        '-o',
        target,
      ]);

      if (statSync(target).size <= cap || quality <= QUALITY_FLOOR) {
        break;
      }
    }
  }

  credits.push({
    id,
    title: page.title.replace(/^File:/, ''),
    author: stripHtml(meta.Artist?.value) || 'автор не указан',
    license,
    licenseUrl: stripHtml(meta.LicenseUrl?.value),
    page: image.descriptionurl,
    width: image.width,
    height: image.height,
    widths,
  });

  console.info(`${id}: ${license}, ${image.width}×${image.height}`);
}

credits.sort((left, right) => left.id.localeCompare(right.id));

const creditsFile = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: Викисклад через scripts/data/collection-photos.json
 * Генератор: scripts/fetch-collection-photos.ts
 *
 * Автор и лицензия каждого снимка приходят из того же ответа Викисклада, что
 * и сам файл. Поэтому подпись под фотографией не может разойтись с тем, на
 * каких условиях её разрешено показывать.
 */

export type PhotoCredit = {
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  /** Страница файла на Викискладе: там же полное описание и история. */
  readonly page: string;
  /**
   * Ширины файлов, которые действительно есть. Узкий оригинал не растягивается
   * до 1200, и разметка обязана ссылаться только на то, что лежит на диске.
   */
  readonly widths: readonly number[];
};

export const PHOTO_CREDITS: Readonly<Record<string, PhotoCredit>> = {
${credits
  .map(
    (credit) =>
      `  '${credit.id}': {\n` +
      `    author: ${JSON.stringify(credit.author)},\n` +
      `    license: ${JSON.stringify(credit.license)},\n` +
      `    licenseUrl: ${JSON.stringify(credit.licenseUrl)},\n` +
      `    page: ${JSON.stringify(credit.page)},\n` +
      `    widths: [${credit.widths.join(', ')}],\n` +
      `  },`,
  )
  .join('\n')}
};
`;

writeFileSync(CREDITS_FILE, creditsFile);

const sourcesFile = `# Снимки коллекций

Файл сгенерирован \`npm run fetch:photos\` из ответа Викисклада. Править руками
незачем: следующий прогон перезапишет.

Все снимки — под свободными лицензиями; генератор роняет прогон, если лицензия
не начинается с CC0, CC BY или Public domain, а также если у файла есть
оговорка об использовании. Каждый снимок сведён в два WebP — 1200 px и 640 px,
качество ${QUALITY} с понижением до ${QUALITY_FLOOR} на тяжёлых кадрах — и лежит
в \`public/photos\`. Оригиналы в репозиторий не
кладутся.

Показ обязывает назвать автора и лицензию: подпись под кадром берёт их из
\`src/content/photo-credits.ts\`, то есть из этого же ответа.

${credits
  .map(
    (credit) =>
      `## ${credit.id}\n\n` +
      `- Файл: ${credit.title}\n` +
      `- Автор: ${credit.author}\n` +
      `- Лицензия: ${credit.license}${credit.licenseUrl ? ` (${credit.licenseUrl})` : ''}\n` +
      `- Страница: ${credit.page}\n` +
      `- Оригинал: ${credit.width}×${credit.height}\n` +
      `- Ширины в репозитории: ${credit.widths.join(', ')}\n`,
  )
  .join('\n')}`;

writeFileSync(SOURCES_FILE, sourcesFile);

console.info(`Снимков: ${credits.length}.`);
