import { collectionCardSubtitle } from '../../content/collection-scope';
import {
  COLLECTION_GROUPS,
  collections,
  collectionsInGroup,
} from '../../content/collections';
import { collectionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import { SiteFooter } from '../../ui/SiteFooter';
import { CollectionCard } from '../home/CollectionCard';

/** Номера групп — те же главы иероглифами, что у режимов на главной. */
const GROUP_NUMERALS = ['一', '二', '三', '四', '五'] as const;

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
        <div className="page-head-aside">
          <p className="page-head-count">
            <span className="page-head-number">{collections.length}</span>
            <span>
              {collectionsWord(collections.length)} · {COLLECTION_GROUPS.length}{' '}
              группы
            </span>
          </p>
          {/*
            Подпись раздела по-китайски — «достопримечательности и местные
            явления». Знак, а не текст: скрыта от читалки, заголовок слева
            уже назвал раздел.
          */}
          <p className="page-head-scroll" lang="zh-Hans" aria-hidden="true">
            名胜与风物
          </p>
        </div>
      </div>

      {/*
        Переход к группе. Раздел вырос с двенадцати карточек до шестидесяти
        пяти — это почти шесть тысяч пикселей прокрутки, — и «по регионам»
        оказалось посреди неё. Якоря, а не фильтр: фильтр прячет остальное, а
        здесь всё показано намеренно (см. вводку раздела ниже), и человеку
        нужно не отсеять, а попасть.
      */}
      <nav className="group-jump" aria-label="Группы коллекций">
        {COLLECTION_GROUPS.map((group, index) => (
          <a key={group.id} className="chip chip-pill" href={`#group-${group.id}`}>
            <span className="chip-numeral" lang="zh-Hans" aria-hidden="true">
              {GROUP_NUMERALS[index]}
            </span>
            {group.title}{' '}
            <span className="chip-count">
              {collectionsInGroup(group.id).length}
            </span>
          </a>
        ))}
      </nav>

      {COLLECTION_GROUPS.map((group, index) => {
        const inGroup = collectionsInGroup(group.id);

        return (
          <section
            key={group.id}
            className="landing-section collection-group"
            id={`group-${group.id}`}
          >
            <div className="collection-group-head">
              <span
                className="mode-chapter-numeral"
                lang="zh-Hans"
                aria-hidden="true"
              >
                {GROUP_NUMERALS[index]}
              </span>
              <div>
                <h2>{group.title}</h2>
                <p className="group-hint">
                  {group.hint} · {inGroup.length}
                </p>
              </div>
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
