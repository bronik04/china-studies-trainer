import { createHash } from 'node:crypto';

/**
 * Отпечаток входов генератора палитры — затем же, зачем отпечатки у геометрии
 * и полос рельефа: забытый генератор не должен проходить сборку.
 *
 * `validateRegionPalette` спрашивает, есть ли запись у каждого региона, и на
 * этот вопрос стёртый контур ответит «да»: запись останется прежней. А из
 * палитры берутся точки подписей и диаметры вписанных окружностей — мера
 * нажимаемости целей, — и по ним же `generate:hit-targets` расставляет
 * невидимые цели. Правка контура без `npm run generate:palette` оставила бы
 * подпись и цель на старом месте при зелёной сборке.
 *
 * В отпечаток входят только контуры регионов — то, что генератор и читает.
 * Выноски и цели нажатия лежат в том же файле кружками, их правят два других
 * генератора, и палитре они безразличны: считать отпечаток по всему файлу
 * значило бы требовать перегенерации там, где ничего не изменилось.
 */

export type RegionContour = {
  readonly id: string;
  readonly d: string;
};

/**
 * Контуры регионов из разметки карты. Читает и генератор, и отпечаток — иначе
 * два одинаковых разбора однажды разойдутся, и отпечаток начнёт сторожить не
 * то, из чего палитра собрана.
 */
export function regionContours(svg: string): readonly RegionContour[] {
  const contours: RegionContour[] = [];

  for (const [, attributes] of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
    const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
    const d = /\sd="([\s\S]*?)"/.exec(attributes)?.[1];

    if (id === undefined || d === undefined) {
      throw new Error(`Контур без id или данных: ${attributes.slice(0, 80)}`);
    }

    contours.push({ id, d });
  }

  return contours;
}

export function paletteInputsFingerprint(svg: string): string {
  /*
   * Порядок фиксируется сортировкой: перестановка контуров в файле палитру не
   * меняет — записи в ней и так сортируются по идентификатору.
   */
  const contours = regionContours(svg)
    .map((contour) => `${contour.id}:${contour.d}`)
    .sort();

  return createHash('sha256')
    .update(contours.join('\n'))
    .digest('hex')
    .slice(0, 16);
}
