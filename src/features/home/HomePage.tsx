import { useState } from 'react';
import { citiesUpTo } from '../../content/cities';
import { collectionCardSubtitle } from '../../content/collection-scope';
import {
  physicalFeaturesUpTo,
  type PhysicalSet,
} from '../../content/physical-features';
import { citiesWord, featuresWord } from '../../content/region-count';
import {
  COLLECTION_GROUPS,
  collections,
  type CollectionGroupId,
} from '../../content/collections';
import type { CitySet, Region } from '../../content/types';
import type { QuestionLanguage } from '../../domain/question-language';
import type { Attempt, ExerciseType } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { SiteFooter } from '../../ui/SiteFooter';
import { MODE_CARDS, type ModeCard } from '../exercise/exercise-modes';
import { CollectionCard } from './CollectionCard';
import { ModeStartDialog } from './ModeStartDialog';
import { nextStep } from './next-step';

export type HomePageProps = {
  readonly regions: readonly Region[];
  readonly attempts: readonly Attempt[];
  readonly onStartRound: (
    request: ExerciseType,
    language: QuestionLanguage,
    regionIds: readonly string[] | null,
  ) => void;
  readonly onStartFillRound: (language: QuestionLanguage) => void;
  readonly onStartHistoryRound: (language: QuestionLanguage) => void;
  readonly onStartPhysicalRound: (
    exerciseType: 'find-on-map' | 'name-target',
    language: QuestionLanguage,
    set: PhysicalSet,
  ) => void;
  readonly onStartCityRound: (
    exerciseType: ExerciseType,
    language: QuestionLanguage,
    citySet: CitySet,
  ) => void;
  readonly onOpenAtlas: () => void;
  readonly onOpenCollections: () => void;
  readonly onOpenCollection: (collectionId: string) => void;
};

/** «Все 12» плюс три группы. Ничего не выбрано — показаны все коллекции. */
type CollectionFilter = CollectionGroupId | 'all';

const SHOWCASE_LIMIT = 4;

/**
 * Главная. Отвечает на «что это такое» и «что делать дальше» одним экраном:
 * герой с картой и единственным призывом, затем игры, витрина коллекций и
 * происхождение содержания.
 *
 * Главный шаг ровно один и он единственный набран киноварью. Карточки режимов
 * и коллекций стоят на бумаге и запускают то же самое другим путём — для тех,
 * кто уже знает, чего хочет.
 */
/**
 * Наборы вложены: значимые включают столицы, приграничные — и то и другое;
 * хребты включают реки и формы, озёра — всё. Ученик выбирает, докуда, а не
 * какой один. Числа считаются из каталогов, а не пишутся руками, — иначе они
 * разойдутся с ними при первом же новом объекте.
 */
const CITY_SETS: readonly (readonly [CitySet, string])[] = [
  ['capital', 'Только центры регионов'],
  ['notable', 'И значимые города'],
  ['border', 'И приграничные с Россией'],
];

const PHYSICAL_SETS: readonly (readonly [PhysicalSet, string])[] = [
  ['base', 'Реки и формы'],
  ['ranges', 'И хребты'],
  ['all', 'И озёра'],
];

function setChoiceFor(card: ModeCard) {
  if (card.kind === 'city') {
    return {
      legend: 'Какие города',
      value: 'capital',
      options: CITY_SETS.map(([value, label]) => {
        const count = citiesUpTo(value).length;

        return [value, `${label} — ${count} ${citiesWord(count)}`] as const;
      }),
    };
  }

  if (card.kind === 'physical') {
    return {
      legend: 'Какие объекты',
      value: 'base',
      options: PHYSICAL_SETS.map(([value, label]) => {
        const count = physicalFeaturesUpTo(value).length;

        return [value, `${label} — ${count} ${featuresWord(count)}`] as const;
      }),
    };
  }

  return null;
}

export function HomePage({
  regions,
  attempts,
  onStartRound,
  onStartFillRound,
  onStartCityRound,
  onStartHistoryRound,
  onStartPhysicalRound,
  onOpenAtlas,
  onOpenCollections,
  onOpenCollection,
}: HomePageProps) {
  const [filter, setFilter] = useState<CollectionFilter>('all');

  const step = nextStep(attempts, new Date());

  /*
   * Карточка не запускает раунд сразу: сначала спрашивается язык. Открытая
   * карточка живёт в состоянии целиком, а не одним признаком, — окну нужны и
   * название, и объём, и то, каким вызовом её запускать.
   */
  const [startingCard, setStartingCard] = useState<ModeCard | null>(null);

  function start(card: ModeCard, language: QuestionLanguage, set: string) {
    setStartingCard(null);
    if (card.kind === 'exercise') {
      onStartRound(card.exerciseType, language, null);
    } else if (card.kind === 'fill') {
      onStartFillRound(language);
    } else if (card.kind === 'city') {
      onStartCityRound(card.exerciseType, language, set as CitySet);
    } else if (card.kind === 'physical') {
      onStartPhysicalRound(card.exerciseType, language, set as PhysicalSet);
    } else if (card.kind === 'history') {
      onStartHistoryRound(language);
    }
  }

  const shown =
    filter === 'all'
      ? collections
      : collections.filter((collection) => collection.groupId === filter);

  return (
    <main className="site-main site-landing">
      <section className="landing-hero">
        <div className="landing-hero-text">
          <p className="eyebrow">Тренажёр к уроку</p>
          {/*
            Цель перехода по названию в шапке. Фокус переводится на заголовок,
            а не на весь герой: кольцо вокруг полосы во весь кадр читалось бы
            как ошибка вёрстки, а вокруг заголовка — как индикатор фокуса. Он
            же и называет, куда попали.
          */}
          <h1 id="top" tabIndex={-1}>
            Китай на карте, а не в списке
          </h1>
          <p className="lead">
            34 единицы провинциального уровня, столицы, иероглифы, места и
            явления. Короткий раунд на 5–15 минут, разбор после ошибки и повтор
            того, что не запомнилось.
          </p>
          <div className="landing-hero-actions">
            <button
              type="button"
              className="primary"
              onClick={() =>
                onStartRound(step.exerciseType, step.language, step.regionIds)
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

            Зума у неё поэтому нет. Управление показывает `ChinaMap` только
            интерактивной карте, и передавать сюда `onZoomChange` больше нечем.
          */}
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            interactive={false}
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
            одним правилам: весь набор в каждом раунде, разбор ошибок на итогах,
            повтор ошибок за последние 14 дней.
          </p>
        </div>
        <ul className="mode-card-grid">
          {MODE_CARDS.map((card) => {
            const isPlanned = card.kind === 'planned';

            return (
              <li key={card.id} className="mode-card" data-planned={isPlanned}>
                <button
                  type="button"
                  disabled={isPlanned}
                  onClick={() => setStartingCard(card)}
                >
                  <span className="mode-card-head">
                    <span lang="zh-Hans" className="mode-card-mark">
                      {card.mark}
                    </span>
                    {/*
                      Строка справа отвечает, почему карточка не нажимается.
                      Причина осталась одна — режим ещё не написан: заслужить
                      игру нельзя, все открыты сразу. У работающих карточек
                      строки нет: писать «доступно» на том, что и так
                      нажимается, незачем.
                    */}
                    {isPlanned ? (
                      <span className="mode-card-status">Готовится</span>
                    ) : null}
                  </span>
                  <span className="mode-card-title">{card.title}</span>
                  <span className="mode-card-summary">{card.summary}</span>
                  <span className="mode-card-volume">{card.volume}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {startingCard === null ? null : (
          <ModeStartDialog
            title={startingCard.title}
            volume={startingCard.volume}
            defaultLanguage={step.language}
            setChoice={setChoiceFor(startingCard)}
            onStart={(language, set) => start(startingCard, language, set)}
            onClose={() => setStartingCard(null)}
          />
        )}
      </section>

      {/*
        Полоса не поднятая: секции чередуют две поверхности доски, а после
        снятия «Уровней и прогресса» две поднятые оказались бы подряд и слились
        бы в одну.
      */}
      <section className="landing-section">
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
