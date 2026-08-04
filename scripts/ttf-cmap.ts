/**
 * Кодовые точки, которые шрифт действительно умеет рисовать.
 *
 * Проверка идёт по ttf, а не по woff2: woff2 сжат brotli и потребовал бы
 * распаковщика ради того же результата. Google Fonts отдаёт ttf того же
 * подмножества, если попросить его заголовком `User-Agent` старого браузера.
 *
 * Читаются форматы 4 и 12 — этого хватает: латинские шрифты дают формат 4,
 * шрифты с иероглифами — формат 12.
 */
export function codePointsInTtf(buffer: ArrayBuffer): ReadonlySet<number> {
  const view = new DataView(buffer);
  const cmapOffset = findTable(view, 'cmap');

  if (cmapOffset === null) {
    throw new Error('В файле шрифта нет таблицы cmap');
  }

  const subtables = view.getUint16(cmapOffset + 2);
  const covered = new Set<number>();

  for (let index = 0; index < subtables; index += 1) {
    const record = cmapOffset + 4 + index * 8;
    const subtable = cmapOffset + view.getUint32(record + 4);

    readSubtable(view, subtable, covered);
  }

  return covered;
}

function findTable(view: DataView, tag: string): number | null {
  if (view.byteLength < 12) {
    return null;
  }

  const tables = view.getUint16(4);

  for (let index = 0; index < tables; index += 1) {
    const record = 12 + index * 16;
    if (record + 16 > view.byteLength) {
      return null;
    }

    const name = String.fromCharCode(
      view.getUint8(record),
      view.getUint8(record + 1),
      view.getUint8(record + 2),
      view.getUint8(record + 3),
    );

    if (name === tag) {
      return view.getUint32(record + 8);
    }
  }

  return null;
}

function readSubtable(
  view: DataView,
  subtable: number,
  covered: Set<number>,
): void {
  const format = view.getUint16(subtable);

  if (format === 4) {
    const segmentsX2 = view.getUint16(subtable + 6);
    const ends = subtable + 14;
    const starts = ends + segmentsX2 + 2;

    for (let segment = 0; segment < segmentsX2 / 2; segment += 1) {
      const end = view.getUint16(ends + segment * 2);
      const start = view.getUint16(starts + segment * 2);

      // Последний сегмент 0xFFFF обязателен по спецификации и глифов не несёт.
      if (start === 0xffff) {
        continue;
      }

      for (let code = start; code <= end; code += 1) {
        covered.add(code);
      }
    }

    return;
  }

  if (format === 12) {
    const groups = view.getUint32(subtable + 12);

    for (let group = 0; group < groups; group += 1) {
      const record = subtable + 16 + group * 12;
      const start = view.getUint32(record);
      const end = view.getUint32(record + 4);

      for (let code = start; code <= end; code += 1) {
        covered.add(code);
      }
    }
  }
}
