import {
  COLLECTION_GROUPS,
  type Collection,
} from '../../content/collections';
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
        <PhotoSlot subject={collection.nameRu} height="card" />
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
