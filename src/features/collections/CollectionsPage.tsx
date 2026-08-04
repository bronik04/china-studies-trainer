import { collectionCardSubtitle } from '../../content/collection-scope';
import {
  COLLECTION_GROUPS,
  collections,
  collectionsInGroup,
} from '../../content/collections';
import type { Region } from '../../content/types';
import { SiteFooter } from '../../ui/SiteFooter';
import { CollectionCard } from '../home/CollectionCard';

export type CollectionsPageProps = {
  readonly regions: readonly Region[];
  readonly onOpenCollection: (collectionId: string) => void;
};

/**
 * Раздел коллекций. Три группы — это три способа смотреть на один и тот же
 * материал: по объекту на карте, по региону целиком, по явлению.
 *
 * Группы разложены сразу, без фильтра: их три, и на одном экране они видны
 * все. Фильтр стоит на главной, где под витрину отведено четыре карточки.
 */
export function CollectionsPage({
  regions,
  onOpenCollection,
}: CollectionsPageProps) {
  return (
    <main className="site-main">
      <div className="page-head">
        <div>
          <p className="eyebrow">Коллекции</p>
          <h1>Места и явления, к которым привязаны вопросы</h1>
          <p className="lead">
            Фотографии, короткая справка и регион на карте. Из коллекции можно
            сразу собрать раунд по её регионам.
          </p>
        </div>
        <p className="page-head-count">
          {collections.length} коллекций · {COLLECTION_GROUPS.length} группы
        </p>
      </div>

      {COLLECTION_GROUPS.map((group) => {
        const inGroup = collectionsInGroup(group.id);

        return (
          <section key={group.id} className="landing-section">
            <div className="landing-section-head">
              <h2>{group.title}</h2>
              <p className="group-hint">
                {group.hint} · {inGroup.length}
              </p>
            </div>
            <ul className="collection-grid">
              {inGroup.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  subtitle={collectionCardSubtitle(collection, regions)}
                  onOpen={onOpenCollection}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {/*
        Подвал называет правило, а не состояние. «Каждая коллекция ссылается на
        проверенный источник» было бы неправдой: пока это черновики без
        источников, и на самих карточках так и написано.
      */}
      <SiteFooter
        left="Коллекция считается готовой, когда у неё есть проверенный источник · спорные вопросы маркируются нейтрально"
        right="Фотографии подбирает учитель"
      />
    </main>
  );
}
