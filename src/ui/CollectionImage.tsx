import type { CollectionPhoto } from '../content/collections';
import { PHOTO_CREDITS } from '../content/photo-credits';
import { PhotoSlot } from './PhotoSlot';

/**
 * Снимок коллекции — или место под него, если снимка ещё нет.
 *
 * Признак «снимок есть» не пишется в контенте отдельным полем: снимок есть
 * ровно тогда, когда он лежит в `PHOTO_CREDITS`, а тот файл пишет генератор по
 * тому, что действительно скачал. Поле в каталоге пришлось бы держать в
 * согласии с папкой руками, и однажды оно бы соврало — карточка обещала бы
 * фотографию и показывала пустоту.
 *
 * Подпись об авторе и лицензии обязательна, а не украшение: CC BY и CC BY-SA
 * разрешают показ при условии, что автор назван. Она идёт вместе со снимком, а
 * не сноской внизу страницы, — иначе при первой же перевёрстке разъедется.
 */

export type CollectionImageProps = {
  readonly photo: CollectionPhoto;
  readonly height: 'card' | 'hero' | 'thumb';
  /**
   * Ширина кадра в вёрстке — для выбора размера файла браузером. У карточки и
   * миниатюры хватает 640 px, крупному кадру нужен 1200.
   */
  readonly sizes: string;
};

export function CollectionImage({ photo, height, sizes }: CollectionImageProps) {
  const credit = PHOTO_CREDITS[photo.id];

  if (credit === undefined) {
    return <PhotoSlot subject={photo.subject} height={height} />;
  }

  /*
   * Ссылки только на то, что лежит на диске: узкий оригинал не растягивается
   * до 1200, и такого файла у него просто нет. Ширины приходят из того же
   * генератора, что и сами файлы.
   */
  const widest = Math.max(...credit.widths);

  return (
    <figure className="collection-photo" data-photo-height={height}>
      <img
        alt={photo.captionRu}
        /*
         * Ленивая загрузка: на странице коллекций снимки стоят в сетке из
         * десятков карточек, и грузить их все сразу незачем.
         */
        loading="lazy"
        decoding="async"
        sizes={sizes}
        src={`/photos/${photo.id}-${widest}.webp`}
        srcSet={credit.widths
          .map((width) => `/photos/${photo.id}-${width}.webp ${width}w`)
          .join(', ')}
      />
      <figcaption>
        {credit.author} · {credit.license}
      </figcaption>
    </figure>
  );
}
