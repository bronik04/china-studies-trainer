import { PHOTO_CREDITS } from '../content/photo-credits';

/**
 * Адрес одного файла снимка. Ниже нет ни одного другого места, где имя файла
 * собирается по частям: базовый путь сайта живёт здесь и больше нигде.
 */
function photoFile(photoId: string, width: number): string {
  return `${import.meta.env.BASE_URL}photos/${photoId}-${width}.webp`;
}

/**
 * Адрес файла, который браузер и покажет: самый широкий из тех, что есть.
 *
 * Отдельным модулем, а не рядом с `CollectionImage`: тот файл отдаёт
 * компонент, и посторонний экспорт рядом с ним ломает обновление на лету.
 *
 * Нужен раунду «Культура»: он обязан загрузить все снимки до первого вопроса —
 * во время раунда сети быть не должно (`AGENTS.md`), — и гадать об адресе ему
 * нельзя, иначе он прогреет не то, что покажет.
 *
 * Ширины приходят из того же генератора, что и сами файлы: узкий оригинал не
 * растягивается до 1200, и такого файла у него просто нет.
 */
export function photoSource(photoId: string): string | null {
  const credit = PHOTO_CREDITS[photoId];

  return credit === undefined
    ? null
    : photoFile(photoId, Math.max(...credit.widths));
}

/**
 * Весь `srcSet` строкой — чтобы разметка не собирала адреса сама.
 *
 * Разметке это знание ни к чему, а стоило дорого: адрес файла был записан
 * дважды, здесь и в `CollectionImage`, и базовый путь сайта пришлось бы
 * заводить в оба места.
 */
export function photoSourceSet(photoId: string): string | null {
  const credit = PHOTO_CREDITS[photoId];

  return credit === undefined
    ? null
    : credit.widths
        .map((width) => `${photoFile(photoId, width)} ${width}w`)
        .join(', ');
}
