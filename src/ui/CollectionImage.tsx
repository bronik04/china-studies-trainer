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
 *
 * Кроме карточки в сетке. Там подписи нет по трём причинам сразу, и первая —
 * не про вёрстку: карточка целиком кнопка, её доступное имя собирается из
 * содержимого, и подпись читалась первой — «CEphoto, Uwe Aranas · CC BY-SA 3.0
 * Великая стена». Вторая: на 300 px имя вроде «6-A04-W96-K38-S41-V38» —
 * нечитаемый мусор поверх снимка. Третья: `figure` внутри `button` — не то
 * содержимое, которое кнопке разрешено. Лицензии это не нарушает: она требует
 * назвать автора способом, разумным для среды, и ссылка на страницу, где
 * подпись стоит, таким способом считается. Карточка и есть ссылка на неё.
 */

export type CollectionImageProps = {
  readonly photo: CollectionPhoto;
  readonly height: 'card' | 'hero' | 'thumb' | 'stage';
  /**
   * Подписывать ли автора и лицензию прямо на кадре. Не подписывается только
   * карточка в сетке — она ведёт на страницу, где подпись стоит.
   */
  readonly credited?: boolean;
  /**
   * Ширина кадра в вёрстке — для выбора размера файла браузером. У карточки и
   * миниатюры хватает 640 px, крупному кадру нужен 1200.
   */
  readonly sizes: string;
};

export function CollectionImage({
  photo,
  height,
  sizes,
  credited = true,
}: CollectionImageProps) {
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

  const image = (
    <img
      /*
       * Без подписи снимок стоит внутри кнопки-карточки, где он украшение:
       * что на нём, говорит заголовок рядом, и второе имя в доступном имени
       * кнопки только мешало бы.
       */
      alt={credited ? photo.captionRu : ''}
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
  );

  if (!credited) {
    return (
      <div className="collection-photo" data-photo-height={height}>
        {image}
      </div>
    );
  }

  return (
    <figure className="collection-photo" data-photo-height={height}>
      {image}
      <figcaption>
        {credit.author} · {credit.license}
      </figcaption>
    </figure>
  );
}
