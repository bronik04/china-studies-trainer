import { useState } from 'react';
import { collectionCardSubtitle } from '../../content/collection-scope';
import {
  COLLECTION_GROUPS,
  collections,
  type CollectionGroupId,
} from '../../content/collections';
import type { Region } from '../../content/types';
import { unlockedLevelFrom } from '../../domain/progress-rules';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import type { MapZoom } from '../../map/MapControls';
import { SiteFooter } from '../../ui/SiteFooter';
import { MODE_CARDS } from '../exercise/exercise-modes';
import { CollectionCard } from './CollectionCard';
import { LEVEL_LADDER } from './level-ladder';
import { nextStep } from './next-step';
import { summariseProgress } from './progress-summary';

export type HomePageProps = {
  readonly regions: readonly Region[];
  readonly attempts: readonly Attempt[];
  readonly onStartRound: (
    request: ExerciseType | 'mixed',
    level: Level,
    regionIds: readonly string[] | null,
  ) => void;
  readonly onStartFillRound: (level: Level) => void;
  readonly onOpenAtlas: () => void;
  readonly onOpenCollections: () => void;
  readonly onOpenCollection: (collectionId: string) => void;
};

/** «Все 12» плюс три группы. Ничего не выбрано — показаны все коллекции. */
type CollectionFilter = CollectionGroupId | 'all';

const SHOWCASE_LIMIT = 4;

/**
 * Главная. Отвечает на «что это такое» и «что делать дальше» одним экраном:
 * герой с картой и единственным призывом, затем режимы, уровни с картой
 * освоенности, витрина коллекций и происхождение содержания.
 *
 * Главный шаг ровно один и он единственный набран киноварью. Карточки режимов
 * и коллекций стоят на бумаге и запускают то же самое другим путём — для тех,
 * кто уже знает, чего хочет.
 */
export function HomePage({
  regions,
  attempts,
  onStartRound,
  onStartFillRound,
  onOpenAtlas,
  onOpenCollections,
  onOpenCollection,
}: HomePageProps) {
  const unlockedLevel = unlockedLevelFrom(attempts);
  const [filter, setFilter] = useState<CollectionFilter>('all');
  const [zoom, setZoom] = useState<MapZoom>(1);

  /*
   * `new Date()` берётся один раз на рендер и передаётся обоим правилам: они
   * зависят от окна повтора в 14 дней, и два разных «сейчас» дали бы карту и
   * кнопку, рассказывающие разное.
   */
  const now = new Date();
  const summary = summariseProgress(
    regions.map((region) => region.id),
    attempts,
    now,
  );
  const step = nextStep(attempts, now);

  const shown =
    filter === 'all'
      ? collections
      : collections.filter((collection) => collection.groupId === filter);

  return (
    <main className="site-main">
      <section className="landing-hero">
        <div className="landing-hero-text">
          <p className="eyebrow">Тренажёр к уроку</p>
          <h1>Китай на карте, а не в списке</h1>
          <p className="lead">
            34 единицы провинциального уровня, столицы, иероглифы, места и
            явления. Короткий раунд на 5–15 минут, разбор после каждого ответа и
            повтор того, что не запомнилось.
          </p>
          <div className="landing-hero-actions">
            <button
              type="button"
              className="primary"
              onClick={() =>
                onStartRound(step.exerciseType, step.level, step.regionIds)
              }
            >
              {step.label}
            </button>
            <button type="button" className="text" onClick={onOpenAtlas}>
              Открыть атлас →
            </button>
          </div>
          <p className="status-note">
            Без регистрации. Прогресс хранится на этом компьютере, работает без
            интернета — в классе и дома.
          </p>
        </div>
        <div className="landing-hero-map">
          {/*
            Карта в герое только показывает: разглядывают и выбирают регион в
            атласе, и второй интерактивной карте на этой же странице
            понадобился бы второй равнозначный список на 34 пункта.
          */}
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            interactive={false}
            zoom={zoom}
            onZoomChange={setZoom}
          />
          <p className="caption">
            Цвет означает тип единицы, а не конкретный регион: по заливке нельзя
            выучить провинцию и получить преимущество в игре.
          </p>
        </div>
      </section>

      {/*
        `tabIndex={-1}` — чтобы «Режимы» в шапке не только прокручивали
        страницу, но и переводили сюда фокус: иначе Tab после нажатия
        продолжился бы от шапки, а читалка экрана не сказала бы, куда попали.
      */}
      <section className="landing-section raised" id="modes" tabIndex={-1}>
        <div className="landing-section-head">
          <h2>Режимы</h2>
          <p>
            Карта — только начало. География, история и культура спрашиваются по
            одним правилам: три попытки, разбор после каждого ответа, повтор
            ошибок через день.
          </p>
        </div>
        <ul className="mode-card-grid">
          {MODE_CARDS.map((card) => {
            const isPlanned = card.kind === 'planned';
            const isLocked = !isPlanned && card.level > unlockedLevel;

            return (
              <li key={card.id} className="mode-card" data-planned={isPlanned}>
                <button
                  type="button"
                  disabled={isPlanned || isLocked}
                  onClick={() => {
                    if (card.kind === 'exercise') {
                      onStartRound(card.exerciseType, card.level, null);
                    } else if (card.kind === 'fill') {
                      onStartFillRound(card.level);
                    }
                  }}
                >
                  <span className="mode-card-head">
                    <span lang="zh-Hans" className="mode-card-mark">
                      {card.mark}
                    </span>
                    {/*
                      Строка справа отвечает, почему карточка не нажимается:
                      «Готовится» — режима ещё нет, «Откроется на уровне N» —
                      есть, но не заслужен. Без неё выключенная кнопка молчит.
                    */}
                    <span className="mode-card-level">
                      {isPlanned
                        ? 'Готовится'
                        : isLocked
                          ? `Откроется на уровне ${card.level}`
                          : `Уровень ${card.level}`}
                    </span>
                  </span>
                  <span className="mode-card-title">{card.title}</span>
                  <span className="mode-card-summary">{card.summary}</span>
                  <span className="mode-card-volume">{card.volume}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="landing-section landing-levels">
        <div>
          <h2>Уровни и прогресс</h2>
          <p className="landing-section-lead">
            Сложность растёт постепенно, а не выбирается наугад. Уровень
            открывается результатом, и ученик всегда видит, что именно осталось.
          </p>
          <ol className="level-ladder">
            {LEVEL_LADDER.map((rung) => (
              <li key={rung.level} data-open={rung.level <= unlockedLevel}>
                <span className="level-ladder-number">{rung.level}</span>
                <span className="level-ladder-body">
                  <b>{rung.title}</b>
                  <span>{rung.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="landing-progress">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            variant="progress"
            usage="answer"
            interactive={false}
            progressStates={summary.stateByRegionId}
          />
          {/*
            Легенда обязательна: статус в этом проекте никогда не передаётся
            одним цветом, а карта освоенности только цветом и говорит.
          */}
          <p className="home-legend" data-testid="progress-legend">
            <span data-progress-state="mastered" /> освоено
            <span data-progress-state="in-progress" /> в работе
            <span data-progress-state="untouched" /> не тронуто
          </p>
          <p className="home-status" data-testid="progress-status">
            Освоено {summary.mastered} из {summary.total} · в работе{' '}
            {summary.inProgress} · открыт уровень {unlockedLevel}
          </p>
          <p className="caption">
            Состояние никогда не передаётся одним цветом: у каждого есть второй
            канал — заливка, штриховка или слово.
          </p>
        </div>
      </section>

      <section className="landing-section raised">
        <div className="landing-section-head landing-section-head-split">
          <div>
            <h2>Коллекции</h2>
            <p>
              Места и явления к темам урока: фотографии, короткая справка и
              регион, к которому это относится. Отсюда же берутся вопросы
              культурного режима.
            </p>
          </div>
          <button type="button" className="text" onClick={onOpenCollections}>
            Все коллекции →
          </button>
        </div>
        <div className="collection-filters">
          {/*
            Группа выбирается кнопками с `aria-pressed`, а не ссылками: список
            под ними меняется на месте, адрес страницы при этом не меняется.
          */}
          <button
            type="button"
            className="chip"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Все {collections.length}
          </button>
          {COLLECTION_GROUPS.map((group) => {
            const count = collections.filter(
              (collection) => collection.groupId === group.id,
            ).length;

            return (
              <button
                key={group.id}
                type="button"
                className="chip"
                aria-pressed={filter === group.id}
                onClick={() => setFilter(group.id)}
              >
                {group.title} {count}
              </button>
            );
          })}
        </div>
        <ul className="collection-grid">
          {shown.slice(0, SHOWCASE_LIMIT).map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              subtitle={collectionCardSubtitle(collection, regions)}
              showsGroup
              onOpen={onOpenCollection}
            />
          ))}
        </ul>
      </section>

      <section className="landing-section landing-provenance">
        <div>
          <h2>Содержание</h2>
          <ul className="rule-list">
            <li>
              34 единицы провинциального уровня: провинции, автономные районы,
              города центрального подчинения и специальные административные
              районы.
            </li>
            <li>
              Названия — по школьной программе; рядом иероглифы и пиньинь с
              тонами.
            </li>
            <li>
              Спорные вопросы маркируются нейтрально и рассматриваются только по
              утверждённой программе.
            </li>
            <li>
              Контраст каждой пары цветов проверяется по WCAG 2.2 на каждой
              сборке, а не заявляется.
            </li>
          </ul>
        </div>
        <div>
          <h2>Источники</h2>
          <ul className="rule-list">
            <li>Административное деление КНР, 2022.</li>
            <li>China Internet Information Center, справочник регионов.</li>
            <li>
              Геометрия 33 регионов:{' '}
              <a href="https://www.npmjs.com/package/@svg-maps/china">
                @svg-maps/china
              </a>{' '}
              (Victor Cazanave, на основе MapSVG),{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/">
                CC BY 4.0
              </a>
              .
            </li>
            <li>
              Контур Тайваня:{' '}
              <a href="https://github.com/antvis/china-geojson">china-geojson</a>{' '}
              (AntV).
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter
        left="Тренажёр страноведения Китая · для школьников 12–18 лет и учителя"
        right="Прогресс не выгружается наружу: персональных данных нет"
      />
    </main>
  );
}
