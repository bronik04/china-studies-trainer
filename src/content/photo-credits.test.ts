import { expect, it } from 'vitest';
import { collections } from './collections';
import { PHOTO_CREDITS } from './photo-credits';

/**
 * Каждый объявленный снимок должен быть скачан и подписан.
 *
 * Слот описывается в каталоге, а файл и лицензия приезжают отдельно —
 * `npm run fetch:photos`. Пока их нет, страница честно показывает именованную
 * заглушку, и это законное состояние для страницы. Но не для раунда: «Узнать
 * по фотографии» берёт цели по наличию слота, а не файла, и объявленный без
 * снимка слот превращается в вопрос с пустым кадром.
 */
it('у каждого объявленного снимка есть лицензия и автор', () => {
  const declared = collections.flatMap((collection) =>
    collection.photos.map((photo) => photo.id),
  );

  expect(declared.filter((id) => PHOTO_CREDITS[id] === undefined)).toEqual([]);
});

it('лишних записей о снимках не остаётся', () => {
  const declared = new Set(
    collections.flatMap((collection) =>
      collection.photos.map((photo) => photo.id),
    ),
  );

  expect(
    Object.keys(PHOTO_CREDITS).filter((id) => !declared.has(id)),
  ).toEqual([]);
});
