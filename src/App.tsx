import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { citiesUpTo } from './content/cities';
import { collectionById } from './content/collections';
import {
  physicalFeatures,
  physicalFeaturesUpTo,
  type PhysicalSet,
} from './content/physical-features';
import { regions } from './content/regions';
import { citiesWord, featuresWord } from './content/region-count';
import type { City, CitySet, PhysicalFeature, Region } from './content/types';
import { addAttempts } from './domain/progress';
import {
  bestAccuracy,
  masteredTargets,
  summariseRound,
} from './domain/progress-rules';
import { summariseFillRound, type FillRound } from './domain/fill-round';
import { createProgressStore } from './domain/progress-storage';
import type { QuestionLanguage } from './domain/question-language';
import { outcomesByTarget } from './domain/round-outcomes';
import type { Attempt, ExerciseType } from './domain/round';
import { HomePage } from './features/home/HomePage';
import {
  AtlasPage,
  CityRound,
  CollectionPage,
  CollectionsPage,
  ExerciseRound,
  FillMapResultsPage,
  FillMapRound,
  PhysicalRound,
  prefetchScreens,
  RoundResultsPage,
} from './screens';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';
import { SiteHeader, type SiteSection } from './ui/SiteHeader';

type RoundRequest = ExerciseType;

type Screen =
  | 'home'
  | 'atlas'
  | 'collections'
  | 'collection'
  | 'exercise'
  | 'city-exercise'
  | 'physical-exercise'
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
      {/*
        Ожидание куска экрана. Оболочка и шапка уже нарисованы, поэтому
        подменяется только содержимое — страница не прыгает. Видно это редко:
        куски дотягиваются в простое сразу после первого экрана.
      */}
      <Suspense
        fallback={
          <p className="empty-note" role="status">
            Экран загружается.
          </p>
        }
      >
        {children}
      </Suspense>
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
  const [cityPool, setCityPool] = useState<readonly City[]>([]);
  /*
   * Двенадцать целей всегда; сужается пул только «Повторить ошибки». Набор
   * перед стартом не выбирается: реки и формы спрашиваются вперемешку одним
   * раундом.
   */
  const [physicalPool, setPhysicalPool] =
    useState<readonly PhysicalFeature[]>(physicalFeatures);
  const [exerciseTypes, setExerciseTypes] = useState<readonly ExerciseType[]>([
    'find-on-map',
  ]);
  const [language, setLanguage] = useState<QuestionLanguage>('ru');
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
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
  /*
   * Остальные экраны дотягиваются в простое сразу после первого. Без этого
   * деление на куски отняло бы обещание работать без сети после
   * первоначальной загрузки (`AGENTS.md`): атлас в классе с упавшим Wi-Fi не
   * открылся бы вовсе.
   */
  useEffect(prefetchScreens, []);

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

  /**
   * Выход из режима. Ведёт на секцию «Режимы», а не на верх главной: оттуда
   * режим и запускали, и возвращать оттуда — значит не заставлять прокручивать
   * страницу заново после каждого раунда.
   *
   * Приём тот же, что у перехода из шапки: якорь в `pendingAnchor`, счётчик
   * будит эффект. Своей копии эффекта здесь нет и быть не должно — навигация в
   * приложении одна.
   */
  function exitToModes() {
    setScreen('home');
    pendingAnchor.current = 'modes';
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
    nextLanguage: QuestionLanguage,
    regionIds: readonly string[] | null,
  ) {
    setRoundPool(
      regionIds === null
        ? regions
        : regions.filter((region) => regionIds.includes(region.id)),
    );
    setExerciseTypes([request]);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  /**
   * Города-муниципалитеты и САР не попадают в «город — регион»: спрашивать, в
   * каком регионе стоит Шанхай, значит спрашивать, в каком регионе стоит
   * Шанхай. Свойство выводится из каталога, а не ставится флагом.
   */
  function cityPoolFor(exerciseType: ExerciseType, citySet: CitySet): readonly City[] {
    const chosen = citiesUpTo(citySet);
    if (exerciseType !== 'match-pair') {
      return chosen;
    }

    const singleCityKinds = new Set(
      regions
        .filter((region) => region.kind === 'municipality' || region.kind === 'sar')
        .map((region) => region.id),
    );

    return chosen.filter((city) => !singleCityKinds.has(city.regionId));
  }

  function startCityRound(
    exerciseType: ExerciseType,
    nextLanguage: QuestionLanguage,
    citySet: CitySet,
  ) {
    setCityPool(cityPoolFor(exerciseType, citySet));
    setExerciseTypes([exerciseType]);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('city-exercise');
  }

  function startPhysicalRound(
    exerciseType: 'find-on-map' | 'name-target',
    nextLanguage: QuestionLanguage,
    set: PhysicalSet = 'all',
  ) {
    startPhysicalPool(exerciseType, nextLanguage, physicalFeaturesUpTo(set));
  }

  /**
   * Запуск по готовому пулу. Отдельно от выбора набора, потому что «Повторить
   * ошибки» задаёт пул напрямую и никакому набору не соответствует.
   */
  function startPhysicalPool(
    exerciseType: 'find-on-map' | 'name-target',
    nextLanguage: QuestionLanguage,
    features: readonly PhysicalFeature[],
  ) {
    setPhysicalPool(features);
    setExerciseTypes([exerciseType]);
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('physical-exercise');
  }

  function startFillRound(nextLanguage: QuestionLanguage) {
    setLanguage(nextLanguage);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setFillRound(null);
    setScreen('fill');
  }

  /**
   * Освоенность выводится из истории попыток. В прогрессе она всё же
   * сохраняется: этого требует DATA_MODEL.md, — но для показа всегда
   * вычисляется заново, чтобы отставшее поле не заперло ученика.
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

  /**
   * Завершение раунда по целям, которые не регионы: города и объекты
   * физической географии. Вид берётся из самих попыток — раунд пишет цели
   * своего вида, и второй источник правды разошёлся бы с ними.
   */
  function finishTargetRound(attempts: readonly Attempt[]) {
    commitAttempts(attempts);
    setLastAttempts(attempts);
    setScreen('results');
  }

  function finishRound(attempts: readonly Attempt[]) {
    commitAttempts(attempts);
    setLastAttempts(attempts);
    setScreen('results');
  }

  if (screen === 'fill') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <FillMapRound
          regions={regions}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishFillRound}
          onExit={exitToModes}
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
          onRepeatMistakes={() =>
            startRound(
              'find-on-map',
              language,
              summariseFillRound(fillRound).regionIdsToReview,
            )
          }
          onNewRound={() => startFillRound(language)}
          onExit={exitToModes}
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
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishRound}
          onExit={exitToModes}
        />
      </AppFrame>
    );
  }

  if (screen === 'city-exercise') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <CityRound
          cities={cityPool}
          exerciseType={exerciseTypes[0]}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishTargetRound}
          onExit={exitToModes}
        />
      </AppFrame>
    );
  }

  if (screen === 'physical-exercise') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <PhysicalRound
          features={physicalPool}
          exerciseType={exerciseTypes[0] as 'find-on-map' | 'name-target'}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishTargetRound}
          onExit={exitToModes}
        />
      </AppFrame>
    );
  }

  if (screen === 'results') {
    const summary = summariseRound(lastAttempts);
    /*
     * Итог одинаков для регионов и городов; различает их только то, чем
     * называть цели и как склонять их число. Вид берётся из самих попыток, а
     * не из отдельного признака: раунд по городам пишет городские цели, и
     * второй источник правды разошёлся бы с ними.
     */
    const roundKind = lastAttempts[0]?.target.kind ?? 'region';
    const isCityRound = roundKind === 'city';
    const isPhysicalRound = roundKind === 'physical';
    /*
     * Набор повтора — ошибки этого раунда, те же, что показаны списком
     * (решение владельца от 2026-08-25). Отдельного источника у кнопки нет:
     * разойтись со списком ей теперь нечем.
     */
    const repeatIds = summary.targetsToReview.map((target) => target.id);
    const repeatCities = cityPool.filter((city) => repeatIds.includes(city.id));
    const repeatFeatures = physicalPool.filter((feature) =>
      repeatIds.includes(feature.id),
    );

    /*
     * Карта итога есть у раундов по регионам. У раунда по городам исход по
     * точке карта пока не показывает, у физических целей это отдельная
     * работа; такой итог показывается одной колонкой — пустая рамка была бы
     * хуже отсутствующей.
     */
    const roundMap =
      isCityRound || isPhysicalRound ? undefined : (
        <ChinaMap
          regions={regions}
          selectedRegionId={null}
          onSelect={() => {}}
          onClear={() => {}}
          interactive={false}
          usage="answer"
          variant="fill"
          outcomes={outcomesByTarget(lastAttempts)}
        />
      );

    return (
      <AppFrame fillsFrame={false} current={null} onNavigate={navigate}>
        <RoundResultsPage
          summary={summary}
          targets={isCityRound ? cityPool : isPhysicalRound ? physicalPool : regions}
          countWord={
            isCityRound ? citiesWord : isPhysicalRound ? featuresWord : undefined
          }
          bestAccuracy={bestAccuracy(progress.attempts)}
          isProgressSaved={store.isAvailable}
          roundMap={roundMap}
          onRepeatMistakes={() => {
            if (isCityRound) {
              setCityPool(repeatCities);
              setScreen('city-exercise');
              setRoundId(newRoundId());
              setSeed(Math.floor(Math.random() * 2 ** 31));
              return;
            }

            if (isPhysicalRound) {
              startPhysicalPool(
                exerciseTypes[0] as 'find-on-map' | 'name-target',
                language,
                repeatFeatures,
              );
              return;
            }

            startRound(exerciseTypes[0], language, repeatIds);
          }}
          onNewRound={() => {
            if (isCityRound) {
              startCityRound(exerciseTypes[0], language, 'capital');
              return;
            }

            if (isPhysicalRound) {
              /* Тот же набор, что и был: он выводится из пула, а второй
                 источник правды разошёлся бы с ним. */
              startPhysicalPool(
                exerciseTypes[0] as 'find-on-map' | 'name-target',
                language,
                physicalPool,
              );
              return;
            }

            startRound(exerciseTypes[0], language, null);
          }}
          onExit={exitToModes}
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
   * И атлас, и страница коллекции ведут в «найти на карте» по-русски: выбирать
   * язык там негде, а переключатель стоит на карточке игры.
   */
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
          onTrain={() => startRound('find-on-map', 'ru', null)}
          onOpenCollection={openCollection}
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
            startRound('find-on-map', 'ru', regionIds)
          }
        />
      ) : (
        <HomePage
          regions={regions}
          attempts={progress.attempts}
          onStartRound={startRound}
          onStartFillRound={startFillRound}
          onStartCityRound={startCityRound}
          onStartPhysicalRound={startPhysicalRound}
          onOpenAtlas={() => setScreen('atlas')}
          onOpenCollections={() => setScreen('collections')}
          onOpenCollection={openCollection}
        />
      )}
    </AppFrame>
  );
}
