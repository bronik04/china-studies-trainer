import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { collectionById } from './content/collections';
import { regions } from './content/regions';
import type { Region } from './content/types';
import { addAttempts } from './domain/progress';
import {
  bestAccuracy,
  masteredTargets,
  targetsToRepeat,
  summariseRound,
} from './domain/progress-rules';
import type { FillRound } from './domain/fill-round';
import { createProgressStore } from './domain/progress-storage';
import type { Attempt, ExerciseType, Level } from './domain/round';
import { ExerciseRound } from './features/exercise/ExerciseRound';
import { FillMapRound } from './features/exercise/FillMapRound';
import {
  ALL_EXERCISE_TYPES,
  EXERCISE_MODES,
} from './features/exercise/exercise-modes';
import { FillMapResultsPage } from './features/results/FillMapResultsPage';
import { RoundResultsPage } from './features/results/RoundResultsPage';
import { AtlasPage } from './features/atlas/AtlasPage';
import { CollectionPage } from './features/collections/CollectionPage';
import { CollectionsPage } from './features/collections/CollectionsPage';
import { HomePage } from './features/home/HomePage';
import type { MapZoom } from './map/MapControls';
import { SiteHeader, type SiteSection } from './ui/SiteHeader';

/** «mixed» — смешанный раунд четвёртого уровня, где типы заданий чередуются. */
type RoundRequest = ExerciseType | 'mixed';

type Screen =
  | 'home'
  | 'atlas'
  | 'collections'
  | 'collection'
  | 'exercise'
  | 'results'
  | 'fill'
  | 'fill-results';

/**
 * Кадр приложения: закреплённая шапка и поверхность в одной колонке.
 *
 * Шапка живёт здесь, а не у каждого экрана: она стоит на всех поверхностях, и
 * список «где она есть» пришлось бы держать в согласии с пятью разбросанными
 * по функции возвратами. Прежде экраны ответа её не получали — кадр отдавался
 * карте целиком; решение владельца продукта это отменяет (DECISIONS.md,
 * 2026-08-05).
 *
 * `fillsFrame` — поверхность занимает ровно экран и не прокручивается: атлас,
 * раунд, заполнение карты. Кадру при этом нужна определённая высота, иначе
 * оболочка внутри берёт естественную и строка `1fr` под карту не разрешается
 * (см. `.app-frame` в styles.css). Итоги и прокручиваемые поверхности признака
 * не получают: список ошибок бывает длиннее кадра.
 */
function AppFrame({
  fillsFrame,
  current,
  onNavigate,
  children,
}: {
  readonly fillsFrame: boolean;
  readonly current: SiteSection | null;
  readonly onNavigate: (section: SiteSection) => void;
  readonly children: ReactNode;
}) {
  return (
    <div className="app-frame" data-fills-frame={fillsFrame}>
      <SiteHeader current={current} onNavigate={onNavigate} />
      {children}
    </div>
  );
}

/**
 * Какой пункт шапки отмечен открытым. Главная отмечается на названии слева, а
 * не на «Режимах»: «Режимы» — её раздел, а не отдельная поверхность, и отметка
 * «вы здесь» на нём означала бы, что из главной уже никуда не уйти.
 */
const ACTIVE_SECTION: Partial<Record<Screen, SiteSection>> = {
  home: 'home',
  atlas: 'atlas',
  collections: 'collections',
  collection: 'collections',
};

/** Хранилище может быть запрещено политикой браузера — обращение к нему бросает. */
function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function newRoundId(): string {
  return `round-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function App() {
  const store = useMemo(() => createProgressStore(readStorage()), []);
  const [progress, setProgress] = useState(() => store.read());
  const [screen, setScreen] = useState<Screen>('home');
  const [roundPool, setRoundPool] = useState<readonly Region[]>(regions);
  const [exerciseTypes, setExerciseTypes] = useState<readonly ExerciseType[]>([
    'find-on-map',
  ]);
  const [level, setLevel] = useState<Level>(1);
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
  const [repeatRegionIds, setRepeatRegionIds] = useState<readonly string[]>([]);
  const [fillRound, setFillRound] = useState<FillRound | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  /*
   * Переход на раздел главной из шапки. Прокрутка живёт в эффекте, а не в
   * обработчике нажатия: раздела ещё нет в документе, пока React не отрисовал
   * главную. Фокус переводится вместе с прокруткой — иначе Tab после нажатия
   * продолжился бы от шапки, а читалка экрана промолчала бы о переходе.
   *
   * Сам якорь лежит в ссылке, а счётчик только будит эффект: нажатие на
   * «Режимы», когда главная уже открыта, обязано сработать второй раз, а
   * состояние с прежним значением эффект бы не перезапустило.
   */
  const [anchorRequests, setAnchorRequests] = useState(0);
  const pendingAnchor = useRef<string | null>(null);

  /*
   * Новая поверхность открывается сверху. Без этого переход со дна главной в
   * коллекцию попадал на середину её страницы, и человек видел не заголовок, а
   * обрывок абзаца.
   *
   * Эффект объявлен до якорного намеренно: когда переход как раз и ведёт на
   * раздел главной, прокрутка наверх обязана случиться раньше, а не отменить
   * его.
   */
  useEffect(() => {
    if (pendingAnchor.current === null) {
      window.scrollTo(0, 0);
    }
  }, [screen, collectionId]);

  useEffect(() => {
    const anchorId = pendingAnchor.current;
    if (anchorId === null) {
      return;
    }

    pendingAnchor.current = null;
    const target = document.getElementById(anchorId);
    /*
     * Сначала фокус без прокрутки, потом прокрутка. `focus()` сам подтягивает
     * элемент в кадр по кратчайшему пути, а раздел выше кадра — и раздел
     * вставал нижним краем экрана вместо верхнего.
     */
    target?.focus({ preventScroll: true });

    /*
     * Заголовок главной — первое, что на странице есть, и подтягивать его «в
     * кадр» нельзя: он встал бы к верхней кромке, спрятав шапку над собой.
     * Наверх страницы — значит в ноль.
     */
    if (anchorId === 'top') {
      window.scrollTo(0, 0);
      return;
    }

    target?.scrollIntoView();
  }, [anchorRequests]);

  function navigate(section: SiteSection) {
    if (section === 'atlas') {
      setScreen('atlas');
      return;
    }

    if (section === 'collections') {
      setScreen('collections');
      return;
    }

    /*
     * Оба перехода ведут на главную, но в разные её места, поэтому якорь у них
     * разный. Запрос считается и тогда, когда главная уже открыта: нажатие по
     * названию с середины страницы обязано вернуть наверх, а смены экрана при
     * этом не происходит и эффект прокрутки сам бы не сработал.
     */
    setScreen('home');
    pendingAnchor.current = section === 'home' ? 'top' : 'modes';
    setAnchorRequests((count) => count + 1);
  }

  function openCollection(id: string) {
    setCollectionId(id);
    setScreen('collection');
  }

  /**
   * `regionIds === null` — раунд по всем регионам темы. Набор считается здесь,
   * а не у вызывающего: подпись кнопки и её действие приходят из одного
   * правила (`nextStep`), и разделять их снова незачем.
   */
  function startRound(
    request: RoundRequest,
    nextLevel: Level,
    regionIds: readonly string[] | null,
  ) {
    setRoundPool(
      regionIds === null
        ? regions
        : regions.filter((region) => regionIds.includes(region.id)),
    );
    setExerciseTypes(request === 'mixed' ? ALL_EXERCISE_TYPES : [request]);
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  function startFillRound(nextLevel: Level) {
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setFillRound(null);
    setScreen('fill');
  }

  /**
   * Освоенность и открытый уровень выводятся из истории попыток. В прогрессе
   * они всё же сохраняются: этого требует DATA_MODEL.md, — но для показа
   * всегда вычисляются заново, чтобы отставшее поле не заперло ученика.
   *
   * Общая для всех режимов: раунд-заполнение пишет по одной попытке на
   * регион, поэтому правила применяются к нему без изменений.
   */
  function commitAttempts(attempts: readonly Attempt[]) {
    const withAttempts = addAttempts(progress, attempts);
    const updated = {
      ...withAttempts,
      masteredTargets: masteredTargets(withAttempts.attempts, new Date(), 'region'),
    };
    setProgress(updated);
    store.write(updated);

    return updated;
  }

  function finishFillRound(round: FillRound) {
    commitAttempts(round.attempts);
    setFillRound(round);
    setScreen('fill-results');
  }

  function finishRound(attempts: readonly Attempt[]) {
    const updated = commitAttempts(attempts);
    setLastAttempts(attempts);
    /*
     * Набор для повтора считается здесь, а не при отрисовке итогов: `new Date()`
     * в теле компонента — нечистый вызов. Заодно подпись кнопки и её действие
     * получают один и тот же список, а не два вычисления одного правила.
     */
    setRepeatRegionIds(
      targetsToRepeat(updated.attempts, new Date(), 'region').map((target) => target.id),
    );
    setScreen('results');
  }

  if (screen === 'fill') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <FillMapRound
          regions={regions}
          level={level}
          roundId={roundId}
          seed={seed}
          onFinish={finishFillRound}
          onExit={() => setScreen('home')}
        />
      </AppFrame>
    );
  }

  if (screen === 'fill-results' && fillRound !== null) {
    return (
      <AppFrame fillsFrame={false} current={null} onNavigate={navigate}>
        <FillMapResultsPage
          round={fillRound}
          regions={regions}
          isProgressSaved={store.isAvailable}
          onNewRound={() => startFillRound(level)}
          onExit={() => setScreen('home')}
        />
      </AppFrame>
    );
  }

  if (screen === 'exercise') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <ExerciseRound
          regions={roundPool}
          exerciseTypes={exerciseTypes}
          level={level}
          roundId={roundId}
          seed={seed}
          onFinish={finishRound}
          onExit={() => setScreen('home')}
        />
      </AppFrame>
    );
  }

  if (screen === 'results') {
    const summary = summariseRound(lastAttempts);

    return (
      <AppFrame fillsFrame={false} current={null} onNavigate={navigate}>
        <RoundResultsPage
          summary={summary}
          regions={regions}
          bestAccuracy={bestAccuracy(progress.attempts)}
          isProgressSaved={store.isAvailable}
          regionIdsToRepeat={repeatRegionIds}
          onRepeatMistakes={() => {
            startRound(
              exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
              level,
              repeatRegionIds,
            );
          }}
          onNewRound={() =>
            startRound(
              exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
              level,
              null,
            )
          }
          onExit={() => setScreen('home')}
        />
      </AppFrame>
    );
  }

  /*
   * Дальше идут поверхности с шапкой. Она общая, поэтому стоит здесь, а не
   * повторяется внутри каждой страницы: иначе «Коллекции» отмечались бы
   * открытыми в двух местах и однажды разошлись бы.
   */
  /*
   * И атлас, и страница коллекции ведут в «найти на карте»: уровень берётся у
   * самой игры, а не у ученика — открытых и закрытых уровней не существует.
   */
  const findOnMapLevel = EXERCISE_MODES['find-on-map'].level;
  const collection =
    collectionId === null ? null : (collectionById(collectionId) ?? null);
  /*
   * Неизвестная коллекция возвращает на главную. Отметка в шапке считается по
   * этому же значению, иначе «Коллекции» остались бы подчёркнутыми над
   * главной.
   */
  const activeScreen: Screen =
    screen === 'collection' && collection === null ? 'home' : screen;

  return (
    <AppFrame
      fillsFrame={activeScreen === 'atlas'}
      current={ACTIVE_SECTION[activeScreen] ?? null}
      onNavigate={navigate}
    >
      {activeScreen === 'atlas' ? (
        <AtlasPage
          regions={regions}
          selectedRegionId={selectedRegionId}
          onSelect={setSelectedRegionId}
          onClear={() => setSelectedRegionId(null)}
          zoom={zoom}
          onZoomChange={setZoom}
          onExit={() => setScreen('home')}
          onTrain={() => startRound('find-on-map', findOnMapLevel, null)}
        />
      ) : activeScreen === 'collections' ? (
        <CollectionsPage regions={regions} onOpenCollection={openCollection} />
      ) : activeScreen === 'collection' && collection !== null ? (
        <CollectionPage
          collection={collection}
          regions={regions}
          onOpenCollections={() => setScreen('collections')}
          onOpenCollection={openCollection}
          onTrainRegions={(regionIds) =>
            startRound('find-on-map', findOnMapLevel, regionIds)
          }
        />
      ) : (
        <HomePage
          regions={regions}
          attempts={progress.attempts}
          onStartRound={startRound}
          onStartFillRound={startFillRound}
          onOpenAtlas={() => setScreen('atlas')}
          onOpenCollections={() => setScreen('collections')}
          onOpenCollection={openCollection}
        />
      )}
    </AppFrame>
  );
}
