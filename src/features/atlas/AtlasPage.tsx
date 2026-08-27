import { useState } from 'react';
import { otherCollectionsOfRegion } from '../../content/collections';
import { REGION_KIND_LABELS } from '../../content/regions';
import {
  physicalFeatures,
  physicalKindLabel,
} from '../../content/physical-features';
import { featuresWord, regionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import { ChinaMap } from '../../map/ChinaMap';
import { CardFacts, RegionReference } from '../../ui/RegionReference';
import { MapAttribution } from '../../map/MapAttribution';
import type { MapZoom } from '../../map/MapControls';

/**
 * Шкала высот. Полосой, а не списком плашек: шкала непрерывна, и прежние
 * подписи («выше 4000», «1000–2000», «ниже 500») оставляли в ней дыры —
 * полосы 500–1000 и 2000–4000 не назывались вообще. Смысл не в одном цвете:
 * границы полос названы числами.
 */
const RELIEF_TICKS = [200, 500, 1000, 2000, 3000, 4000] as const;
const RELIEF_BAND_TONES = [0, ...RELIEF_TICKS] as const;

/**
 * Те же полосы и те же пороги сверху вниз: шкала стоит столбиком, и высокое в
 * ней выше низкого. Порядок задан здесь, а не разворотом в разметке: развернуть
 * пришлось бы оба списка, и однажды развернули бы только один.
 */
const SCALE_TOP_DOWN = [...RELIEF_BAND_TONES].reverse();
const SCALE_TICKS_TOP_DOWN = [...RELIEF_TICKS].reverse();

const MAP_KINDS = [
  ['political', 'Политическая'],
  ['physical', 'Физическая'],
] as const;

type MapKind = (typeof MAP_KINDS)[number][0];

export type AtlasPageProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom: MapZoom;
  readonly onZoomChange: (zoom: MapZoom) => void;
  readonly onTrain: () => void;
  readonly onOpenCollection: (collectionId: string) => void;
};

/**
 * Атлас: карта и справочник на одной поверхности. Заменяет прежнюю секцию
 * «Интерактивная карта» и сетку из 34 карточек, которая занимала 2317 px —
 * половину стартовой страницы.
 *
 * Сетка та же, что у раунда, и карта справа в обоих случаях: ученик ходит
 * между атласом и тренировкой, и карта не должна прыгать со стороны на сторону.
 */
export function AtlasPage({
  regions,
  selectedRegionId,
  onSelect,
  onClear,
  zoom,
  onZoomChange,
  onTrain,
  onOpenCollection,
}: AtlasPageProps) {
  /*
   * Вид карты живёт здесь, а не в `App`: он не меняет ни прогресса, ни раунда
   * и нужен одной этой поверхности.
   */
  const [mapKind, setMapKind] = useState<MapKind>('political');
  /*
   * Выбранный объект физической географии. Живёт рядом с видом карты и вместе
   * с ним сбрасывается: на политической карте рек нет, и оставленный выбор
   * пережил бы то, что его породило.
   */
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const selected = regions.find((region) => region.id === selectedRegionId);
  /*
   * Объект перебивает регион, пока показан физический вид: рассказывать
   * карточка может об одном, а выбрали последним объект — регион под ним
   * остался от прошлого вида.
   */
  const selectedFeature =
    mapKind === 'physical' && selectedFeatureId !== null
      ? physicalFeatures.find((feature) => feature.id === selectedFeatureId)
      : undefined;

  /*
   * Регион и объект — два ответа на один вопрос карточки, поэтому выбор
   * одного снимает другой. Регион держит `App`, объект — эта страница, и
   * согласовать их можно только здесь.
   */
  function selectRegion(regionId: string) {
    setSelectedFeatureId(null);
    onSelect(regionId);
  }

  function selectFeature(featureId: string) {
    setSelectedFeatureId(featureId);
    onClear();
  }

  /*
   * Легенда — только у физического вида: на политической тип региона назван
   * словом в карточке слева, а ступень рельефа назвать негде — форма не
   * выбирается и карточки у неё нет.
   *
   * Стоит она на листе карты, а не полосой под ним: карта внутри своей
   * колонки центрирована по пропорции, и шкала под ней получалась вдвое шире
   * самой карты — 844 px против 426 px.
   */
  const reliefScale =
    mapKind === 'physical' ? (
      <figure className="relief-scale" aria-label="Высота, м над уровнем моря">
        <figcaption>Высота, м</figcaption>
        {/*
          Шкала стоит столбиком, а не полосой. Полосой семь долей на ширине
          врезки давали по 30 px, а «4000» занимает 32: подписи 2000, 3000 и
          4000 сходились вплотную. Столбику ширина подписи не мешает вовсе, и
          направление он показывает сам — вверх выше, как на любой карте.
        */}
        {/*
          Слова у концов стоят над столбиком и под ним, а не отдельной
          колонкой сбоку: колонка давала врезке 144 px ширины, и та накрывала
          Гималаи — цель игры. Столбиком врезка укладывается в 92 px и встаёт
          в нижний правый угол, где под ней 0 % суши (замер по контурам).
        */}
        <p className="relief-scale-end">нагорье</p>
        <div className="relief-scale-body">
          <div className="relief-scale-bar" aria-hidden="true">
            {SCALE_TOP_DOWN.map((band) => (
              <span key={band} data-band={band} />
            ))}
          </div>
          {/*
            Долей столько же, сколько полос: подпись стоит на нижнем краю
            своей доли и сдвинута вниз на половину строки — то есть ровно на
            границе между полосами. Первая доля пуста: у верхней полосы
            верхней границы нет.
          */}
          <div className="relief-scale-ticks">
            <span aria-hidden="true" />
            {SCALE_TICKS_TOP_DOWN.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </div>
        <p className="relief-scale-end">равнины</p>
      </figure>
    ) : undefined;

  return (
    <main className="atlas-shell">
      <div className="atlas-layout">
        {/*
          Колонка прокручивается сама (см. `.atlas-panel` в styles.css), а
          фокусируемого внутри с уходом списка регионов не осталось: без
          `tabindex` справка длинного региона была бы недостижима с клавиатуры.
          Раз колонка стала остановкой Tab, у неё есть и роль, и имя.
        */}
        <div
          className="atlas-panel"
          role="region"
          aria-label="Карточка атласа"
          tabIndex={0}
        >
          <div className="atlas-region-card" data-testid="atlas-region-card">
            {selectedFeature ? (
              <>
                <h1>
                  {selectedFeature.nameRu}{' '}
                  <span lang="zh-Hans">{selectedFeature.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selectedFeature.pinyin}</p>
                <p className="status-note">
                  {physicalKindLabel(selectedFeature)}
                </p>
                {/*
                  Регионы перечислены словами: по какой земле проходит река —
                  ровно то, ради чего её ищут на карте страноведения, а обвести
                  её по заливке глазом нельзя.
                */}
                <ul className="region-city-list">
                  {selectedFeature.regionIds.map((regionId) => (
                    <li key={regionId}>
                      {regions.find((region) => region.id === regionId)?.nameRu ??
                        regionId}
                    </li>
                  ))}
                </ul>
                <CardFacts facts={selectedFeature.facts} />
              </>
            ) : selected ? (
              <>
                <h1>
                  {selected.nameRu} <span lang="zh-Hans">{selected.nameZh}</span>
                </h1>
                <p lang="zh-Latn-pinyin">{selected.pinyin}</p>
                <p className="status-note">{REGION_KIND_LABELS[selected.kind]}</p>
                <RegionReference region={selected} />
                {/*
                  Коллекции региона — не новая сущность, а та же привязка
                  `regionIds`, прочитанная с другой стороны: со страницы
                  коллекции виден её регион, из атласа — коллекции региона.
                  Пустой список — законное состояние, блок тогда не рисуется.
                */}
                {otherCollectionsOfRegion(selected.id).length === 0 ? null : (
                  <nav className="atlas-collections" aria-label="Коллекции региона">
                    <p className="eyebrow">Коллекции</p>
                    <ul>
                      {otherCollectionsOfRegion(selected.id).map((collection) => (
                        <li key={collection.id}>
                          <button
                            type="button"
                            className="text"
                            onClick={() => onOpenCollection(collection.id)}
                          >
                            {collection.nameRu}{' '}
                            <span lang="zh-Hans">{collection.nameZh}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </>
            ) : (
              <>
                {/*
                  До выбора колонка не пустует: пустая половина экрана рядом с
                  картой читается как поломка, а не как приглашение. Здесь
                  сказано, что покажет карточка и что лежит в каждом виде
                  карты, — числа считаются из справочников, а не пишутся
                  руками, иначе разойдутся с ними при первом же пополнении.
                */}
                <h1>Атлас</h1>
                <p className="atlas-lede">
                  Справочник по карте. Выберите единицу — карточка назовёт её
                  по-русски и иероглифами, даст пиньинь, тип, административный
                  центр и короткую справку с источниками.
                </p>
                <dl className="atlas-contents">
                  <div>
                    <dt>Политическая</dt>
                    <dd>
                      {regions.length} {regionsWord(regions.length)}{' '}
                      провинциального уровня, их центры и города
                    </dd>
                  </div>
                  <div>
                    <dt>Физическая</dt>
                    <dd>
                      {physicalFeatures.length}{' '}
                      {featuresWord(physicalFeatures.length)}: реки, формы
                      рельефа и озёра; заливка означает высоту
                    </dd>
                  </div>
                </dl>
                <p className="status-note">Выберите регион на карте.</p>
              </>
            )}
          </div>
        </div>
        {/*
          `usage="answer"` намеренно: собственный заголовок карты, подсказка,
          строка выбора и вложенный список здесь только удвоили бы панель.
          О выбранном регионе рассказывает карточка слева.
        */}
        <div className="atlas-map">
          <fieldset className="atlas-map-kind">
            <legend>Вид карты</legend>
            {/*
              Обёртка нужна разметке: `legend` в гибком контейнере становится
              его первой строкой, и два слова без неё не поставить в ряд под
              подписью группы.
            */}
            <div className="atlas-map-kind-switch">
              {MAP_KINDS.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="atlas-map-kind"
                    value={value}
                    checked={mapKind === value}
                    onChange={() => {
                      setMapKind(value);
                      setSelectedFeatureId(null);
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <ChinaMap
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelect={selectRegion}
            onClear={onClear}
            zoom={zoom}
            onZoomChange={onZoomChange}
            usage="answer"
            variant={mapKind === 'physical' ? 'physical' : 'reference'}
            /*
             * Города прячутся вместе с политическим видом не ради чистоты
             * картинки: слой ступеней рисуется после слоя городов и заливкой
             * закрыл бы их знаки — остались бы подписи без точек.
             */
            showsCities={mapKind === 'political'}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={selectFeature}
            mapInset={reliefScale}
          />
        </div>
      </div>
      {/*
        Выхода в подвале нет: на главную ведёт шапка — название слева и
        «Режимы», — а второй такой же путь внизу экрана только называл бы её
        другим словом. В подвале остаётся одно действие, ради которого сюда и
        приходят с карты.
      */}
      <footer className="atlas-footer">
        <button type="button" className="primary" onClick={onTrain}>
          Тренировать
        </button>
        <MapAttribution />
      </footer>
    </main>
  );
}
