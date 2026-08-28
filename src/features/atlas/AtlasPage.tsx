import { useEffect, useRef, useState } from 'react';
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
   * Атлас во весь кадр. Своим слоем поверх страницы, а не родным
   * `requestFullscreen`: выход по Esc, возврат фокуса и скрытие шапки всё
   * равно пришлось бы написать самим, а родного полноэкранного режима в jsdom
   * нет — проверять было бы нечем.
   */
  const [isExpanded, setExpanded] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
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

  const hasSelection = selected !== undefined || selectedFeature !== undefined;

  /*
   * Esc в полноэкранном виде отменяет последнее: сначала снимает выбор, и
   * только на пустой карте сворачивает вид. Иначе одно нажатие делало бы два
   * дела сразу — карта и так снимает выбор по Esc, когда фокус на ней, и
   * ученик, закрывавший карточку, вылетал бы из полноэкранного вида заодно.
   *
   * Слушатель на документе, а не на листе: рука может быть где угодно, а
   * фокус — на карточке или в управлении масштабом.
   */
  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (hasSelection) {
        clearSelection();

        return;
      }

      setExpanded(false);
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
    /*
     * Без списка зависимостей намеренно: слушателю нужен свежий ответ на
     * вопрос «есть ли что снимать», а он меняется с каждым выбором. Подписка
     * стоит один `addEventListener` на отрисовку — дешевле, чем ref-костыль
     * ради того же самого.
     */
  });

  function clearSelection() {
    setSelectedFeatureId(null);
    onClear();
  }

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
   * Стоит она на листе карты, а не полосой под ним: полосой она получалась
   * вдвое шире самой карты — 844 px против 426 px.
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

  /*
   * Переключатель вида стоит на листе, а не полосой над ним. Полосой он
   * оказывался в пустоте: колонка под карту — 1004 px, лист — 781, и
   * переключатель, прижатый к левому краю колонки, стоял в 111 px слева от
   * листа и в 84 px над ним. Управление картой должно лежать на карте.
   *
   * Подпись группы скрыта от глаза, но не от читалки экрана: два слова
   * рядом с зумом и так читаются видами карты, а группе нужно имя.
   */
  const mapOverlay = (
    <>
      <fieldset className="atlas-map-kind">
        <legend className="visually-hidden">Вид карты</legend>
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
      </fieldset>
      {reliefScale}
    </>
  );

  /*
   * Разворот на весь кадр. Кнопка-переключатель: `aria-pressed` говорит
   * состояние, а имя — что произойдёт. Стрелки, а не уголки: уголки уже
   * заняты «сбросить вид», и два одинаковых знака в одном столбике означали
   * бы разное.
   */
  const expandButton = (
    <button
      type="button"
      ref={expandRef}
      aria-pressed={isExpanded}
      aria-label={isExpanded ? 'Свернуть карту' : 'Развернуть карту на весь экран'}
      onClick={() => setExpanded((expanded) => !expanded)}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {isExpanded ? (
          <path d="M13 7H9V3M9 7l4-4M3 9h4v4M7 9l-4 4" />
        ) : (
          <path d="M9 3h4v4M13 3l-4 4M7 13H3v-4M3 13l4-4" />
        )}
      </svg>
    </button>
  );

  return (
    <main className="atlas-shell" data-expanded={isExpanded}>
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
          /*
            Пусто ли в карточке. Нужно полноэкранному виду: там панель
            всплывает поверх карты, и приглашение «выберите регион» закрывало
            бы ту самую карту, ради которой вид и разворачивали.
          */
          data-empty={!hasSelection}
        >
          {/*
            Закрыть карточку. Только в полноэкранном виде и только когда есть
            что закрывать: в обычном карточка стоит своей колонкой и ничего не
            загораживает, а закрывать колонку незачем.
          */}
          {isExpanded && hasSelection ? (
            <button
              type="button"
              className="atlas-panel-close"
              aria-label="Закрыть карточку"
              onClick={clearSelection}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          ) : null}
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
            mapInset={mapOverlay}
            mapControlsExtra={expandButton}
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
        {/*
          Подсказка про Esc стоит в подвале, а не плашкой на карте: на карте
          она заняла бы угол, а углов на листе всего четыре и все заняты.
        */}
        {isExpanded ? (
          <p className="atlas-escape-hint">Esc — выйти из полноэкранного вида</p>
        ) : null}
        <MapAttribution />
      </footer>
    </main>
  );
}
