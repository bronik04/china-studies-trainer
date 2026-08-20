import { collectionCardSubtitle } from '../../content/collection-scope';
import {
  COLLECTION_GROUPS,
  collectionById,
  isDraft,
  type Collection,
} from '../../content/collections';
import { regionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import { sourceById } from '../../content/sources';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import { PhotoSlot } from '../../ui/PhotoSlot';
import { SiteFooter } from '../../ui/SiteFooter';
import { CollectionCard } from '../home/CollectionCard';

export type CollectionPageProps = {
  readonly collection: Collection;
  readonly regions: readonly Region[];
  readonly onOpenCollections: () => void;
  readonly onOpenCollection: (collectionId: string) => void;
  /** Раунд по регионам коллекции. Отсюда и берётся её польза на уроке. */
  readonly onTrainRegions: (regionIds: readonly string[]) => void;
};

/**
 * Страница коллекции. Слева — что это, справа — где это на карте и как
 * спросить об этом класс.
 *
 * Пустые места названы вслух. Коллекции пока черновые: справка не написана,
 * фотографий нет, источник не проставлен. Экран, который в этом случае просто
 * не показывает раздел, выглядит сломанным; экран, который говорит «справка
 * ещё не написана», выглядит незаполненным — и это правда.
 */
export function CollectionPage({
  collection,
  regions,
  onOpenCollections,
  onOpenCollection,
  onTrainRegions,
}: CollectionPageProps) {
  const group = COLLECTION_GROUPS.find(({ id }) => id === collection.groupId);
  const memberRegions = collection.regionIds
    .map((id) => regions.find((region) => region.id === id))
    .filter((region): region is Region => region !== undefined);
  const related = collection.relatedIds
    .map((id) => collectionById(id))
    .filter((item): item is Collection => item !== undefined);
  const draft = isDraft(collection);

  return (
    <main className="site-main">
      <nav className="breadcrumb" aria-label="Путь к странице">
        <button type="button" className="text" onClick={onOpenCollections}>
          Коллекции
        </button>
        {group ? <span aria-hidden="true"> · </span> : null}
        {group ? <span>{group.title}</span> : null}
        <span aria-hidden="true"> · </span>
        <span aria-current="page">{collection.nameRu}</span>
      </nav>

      <div className="collection-layout">
        <article className="collection-main">
          <p className="eyebrow">
            {group ? `${group.title} · ` : ''}
            {collection.kind}
          </p>
          <h1>{collection.nameRu}</h1>
          <p lang="zh-Hans" className="collection-name-zh">
            {collection.nameZh}
          </p>
          <p lang="zh-Latn-pinyin" className="collection-pinyin">
            {collection.pinyin}
          </p>

          {collection.lead === '' ? (
            <p className="empty-note">
              Описание ещё не написано. Пока коллекция держит только привязку к
              регионам — по ней уже можно собрать раунд.
            </p>
          ) : (
            <p className="lead">{collection.lead}</p>
          )}

          <PhotoSlot subject={collection.nameRu} height="hero" />

          <section className="collection-block">
            <h2>Что стоит знать</h2>
            {collection.notes.length === 0 ? (
              <p className="empty-note">
                Справка ещё не написана: её пишет учитель и подтверждает
                источником.
              </p>
            ) : (
              <ul className="rule-list">
                {collection.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="collection-block">
            <div className="landing-section-head">
              <h2>Фотографии</h2>
              <p className="group-hint">
                {collection.photos.length === 0
                  ? 'снимков пока нет'
                  : `мест под съёмку: ${collection.photos.length} · подпись у каждого`}
              </p>
            </div>
            {collection.photos.length === 0 ? (
              <p className="empty-note">
                Фотографии подбирает учитель. Пока их нет, коллекция работает
                как список регионов.
              </p>
            ) : (
              <ul className="photo-grid">
                {collection.photos.map((photo) => (
                  <li key={photo.id}>
                    <PhotoSlot subject={photo.subject} height="thumb" />
                    <p className="caption">
                      {photo.captionRu}
                      {photo.captionZh ? (
                        <>
                          {' '}
                          <span lang="zh-Hans">{photo.captionZh}</span>
                        </>
                      ) : null}{' '}
                      · {photo.place}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>

        <aside className="collection-aside">
          <section className="paper-panel">
            <p className="panel-title">Регионы коллекции</p>
            {memberRegions.length === 0 ? (
              <p className="empty-note">
                Коллекция не привязана к отдельным регионам: {collection.scopeLabel ?? 'охват не указан'}.
              </p>
            ) : (
              <>
                <ChinaMap
                  regions={regions}
                  selectedRegionId={null}
                  onSelect={() => {}}
                  onClear={() => {}}
                  variant="membership"
                  usage="answer"
                  interactive={false}
                  memberRegionIds={collection.regionIds}
                />
                <p className="membership-legend">
                  <span data-membership="member" /> входит в коллекцию
                  <span data-membership="outside" /> остальные
                </p>
                {/*
                  Список — не дубль карты, а равнозначный ей способ прочитать
                  тот же ответ: заливку на мелких областях не разглядеть, а
                  читалке экрана карта без списка ничего не перечислит.
                */}
                <ul className="member-list">
                  {memberRegions.map((region) => (
                    <li key={region.id}>{region.nameRu}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onTrainRegions(collection.regionIds)}
                >
                  Спросить эти регионы
                </button>
                <p className="status-note">
                  {memberRegions.length} {regionsWord(memberRegions.length)} ·
                  игра «найти на карте»
                </p>
              </>
            )}
          </section>

          <section className="outline-panel">
            <p className="panel-title">Источники</p>
            {draft ? (
              <p className="draft-note" data-testid="draft-note">
                Черновик: содержание этой коллекции ещё не проверено по
                источникам. Подтверждён только справочник регионов — названия,
                иероглифы и административные центры.
              </p>
            ) : (
              <ul className="rule-list">
                {collection.sourceIds.map((sourceId) => {
                  const source = sourceById(sourceId);

                  return (
                    <li key={sourceId}>
                      {source === undefined
                        ? sourceId
                        : `${source.title} — ${source.shortLabel ?? source.organization}`}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="landing-section raised">
          <h2>Смотрите также</h2>
          <ul className="collection-grid">
            {related.map((item) => (
              <CollectionCard
                key={item.id}
                collection={item}
                subtitle={collectionCardSubtitle(item, regions)}
                showsGroup
                onOpen={onOpenCollection}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <SiteFooter left={<MapAttribution />} right="Фотографии подбирает учитель" />
    </main>
  );
}
