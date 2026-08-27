import {
  COLLECTION_GROUPS,
  type Collection,
} from '../../content/collections';
import { CollectionImage } from '../../ui/CollectionImage';
import { PhotoSlot } from '../../ui/PhotoSlot';

/**
 * Карточка коллекции. Одна на три поверхности: витрину главной, раздел
 * коллекций и блок «Смотрите также». Разное у них только подпись под
 * названием, поэтому она и приходит снаружи.
 */
export type CollectionCardProps = {
  readonly collection: Collection;
  /** Строка под названием: где это и что там есть. */
  readonly subtitle: string;
  /** Показывать ли название группы над заголовком. */
  readonly showsGroup?: boolean;
  readonly onOpen: (collectionId: string) => void;
};

export function CollectionCard({
  collection,
  subtitle,
  showsGroup = false,
  onOpen,
}: CollectionCardProps) {
  const group = COLLECTION_GROUPS.find(({ id }) => id === collection.groupId);

  return (
    <li className="collection-card">
      {/*
        Кнопка обнимает всё содержимое карточки, а не прячется под ней
        отдельной ссылкой «подробнее»: цель нажатия тогда совпадает с тем, что
        человек видит, и не приходится целиться в мелкое слово.
      */}
      <button type="button" onClick={() => onOpen(collection.id)}>
        {/*
          Первый снимок коллекции — он же лицо карточки. Если снимка нет,
          остаётся именованное место под него: карточка обязана сказать, чего
          не хватает, а не притвориться заполненной.
        */}
        {collection.photos[0] === undefined ? (
          <PhotoSlot subject={collection.nameRu} height="card" />
        ) : (
          <CollectionImage
            photo={collection.photos[0]}
            height="card"
            sizes="(min-width: 60rem) 20rem, 90vw"
          />
        )}
        <span className="collection-card-body">
          {showsGroup && group ? (
            <span className="collection-card-group">{group.title}</span>
          ) : null}
          <span className="collection-card-title">
            {collection.nameRu}{' '}
            <span lang="zh-Hans">{collection.nameZh}</span>
          </span>
          <span className="collection-card-subtitle">{subtitle}</span>
        </span>
      </button>
    </li>
  );
}
