import {
  landmarks,
  type Landmark,
  type LandmarkKind,
} from './landmarks';
import {
  physicalFeatures,
  physicalKindLabel,
} from './physical-features';
import { REGION_KIND_LABELS, regions } from './regions';
import type { PhysicalFeature, Region } from './types';

/**
 * Коллекции — места и явления, к которым привязаны вопросы культурного режима.
 *
 * Признак черновика не отдельный флаг, а пустой `sourceIds`: если у коллекции
 * появится содержание без проверенного источника, экран честно назовёт её
 * черновиком, а как только источники добавят — пометка исчезнет сама, без
 * отдельной правки этого файла.
 *
 * Фотографий в репозитории нет. Снимок описывается местом и подписью, а
 * `PhotoSlot` рисует на его месте именованную заглушку: разметка и подписи
 * готовы, файлы подставляются позже. Число снимков нигде не пишется руками —
 * иначе карточка обещала бы шесть фотографий, которых нет ни одной.
 *
 * Идентификаторы. Написанная руками коллекция зовётся своим именем; выведенная
 * несёт приставку того справочника, из которого взята: `region-yunnan`,
 * `feature-yangtze`. Приставка не украшение — два справочника уже столкнулись
 * именами: `heilongjiang` есть и у провинции, и у реки Амур. Без пространств
 * имён одна страница молча закрыла бы другую.
 */

export type CollectionGroupId = 'geography' | 'by-region' | 'culture';

export type CollectionGroup = {
  readonly id: CollectionGroupId;
  readonly title: string;
  /** Чем группа отличается от соседних: это способ смотреть, а не рубрика. */
  readonly hint: string;
};

export const COLLECTION_GROUPS = [
  {
    id: 'geography',
    title: 'География',
    /*
     * Не «природные объекты»: Великая стена — сооружение, и она в этой же
     * группе. Группу объединяет то, что объект лежит на карте, а не то, что
     * его никто не строил.
     */
    hint: 'объекты на карте',
  },
  {
    id: 'by-region',
    title: 'По регионам',
    hint: 'всё об одной единице',
  },
  {
    id: 'culture',
    title: 'Культура и история',
    hint: 'явления, памятники, события',
  },
] as const satisfies readonly CollectionGroup[];

export type CollectionPhoto = {
  readonly id: string;
  /** Что должно быть на снимке. Показывается в заглушке вместо фотографии. */
  readonly subject: string;
  readonly captionRu: string;
  readonly captionZh?: string;
  readonly place: string;
};

export type Collection = {
  readonly id: string;
  readonly groupId: CollectionGroupId;
  /**
   * Регион, о котором коллекция. Не то же, что единственный `regionIds`: у
   * коллекции о месте регион тоже один, но она не о нём. Тело такой страницы
   * — справка из справочника регионов, а не написанное здесь; отсюда и
   * послабление в проверке контента: вводки и заметок у неё может не быть.
   */
  readonly aboutRegionId?: string;
  /**
   * Объект физической географии, о котором коллекция, — то же устройство, что
   * у `aboutRegionId`, и вместе с ним не ставится: у страницы один предмет.
   */
  readonly aboutFeatureId?: string;
  /**
   * Достопримечательность, о которой коллекция. Третье поле того же рода, и с
   * двумя предыдущими оно тоже не сочетается: предмет у страницы один. Это не
   * формальность — из-за двух страниц об одной пустыне ученик мог получить два
   * вопроса об одном предмете за раунд (дефект 2026-08-28).
   */
  readonly aboutLandmarkId?: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /** Слово после названия группы в надзаголовке: «памятник», «явление». */
  readonly kind: string;
  readonly lead: string;
  readonly regionIds: readonly string[];
  /**
   * Подпись вместо перечисления регионов там, где их слишком много, чтобы
   * счёт что-то значил: «Вся страна» вместо «34 региона».
   */
  readonly scopeLabel?: string;
  /** «Что стоит знать». Пусто — справка ещё не написана, экран это скажет. */
  readonly notes: readonly string[];
  readonly photos: readonly CollectionPhoto[];
  /** Пусто — содержание не проверено, экран покажет пометку черновика. */
  readonly sourceIds: readonly string[];
  readonly relatedIds: readonly string[];
};
const geographyCollections = [
  {
    id: 'great-wall',
    groupId: 'geography',
    nameRu: 'Великая стена',
    nameZh: '长城',
    pinyin: 'Chángchéng',
    kind: 'памятник',
    lead:
      'Система укреплений вдоль северной границы, строившаяся с III века до н. э. ' +
      'и достроенная при династии Мин. Проходит через девять единиц ' +
      'провинциального уровня — от Ляонина на востоке до Ганьсу на западе.',
    regionIds: [
      'liaoning',
      'hebei',
      'tianjin',
      'beijing',
      'shanxi',
      'shaanxi',
      'ningxia',
      'gansu',
      'inner-mongolia',
    ],
    notes: [
      'Общая протяжённость всех участков — около 21 тысячи км по обмеру Государственного управления геодезии КНР, 2012.',
      'Сохранившиеся кирпичные участки относятся в основном к династии Мин, 1368–1644.',
      'Самый известный и посещаемый участок стены — Бадалин, около 70 км от центра Пекина.',
      'В список Всемирного наследия ЮНЕСКО включена в 1987 году.',
    ],
    photos: [
      {
        id: 'badaling',
        subject: 'Бадалин',
        captionRu: 'Бадалин',
        captionZh: '八达岭',
        place: 'Пекин',
      },
      {
        id: 'mutianyu',
        subject: 'Мутяньюй',
        captionRu: 'Мутяньюй',
        captionZh: '慕田峪',
        place: 'Пекин',
      },
      {
        id: 'shanhaiguan',
        subject: 'Шаньхайгуань',
        captionRu: 'Шаньхайгуань',
        captionZh: '山海关',
        place: 'Хэбэй',
      },
      {
        id: 'jiayuguan',
        subject: 'Цзяюйгуань',
        captionRu: 'Цзяюйгуань',
        captionZh: '嘉峪关',
        place: 'Ганьсу',
      },
      {
        id: 'yanmenguan',
        subject: 'Яньмэньгуань',
        captionRu: 'Яньмэньгуань',
        captionZh: '雁门关',
        place: 'Шаньси',
      },
      {
        id: 'earthen',
        subject: 'земляной участок стены',
        captionRu: 'Западный, земляной участок стены',
        place: 'Нинся',
      },
    ],
    sourceIds: [
      'unesco-great-wall-438',
      'britannica-great-wall',
      'britannica-great-wall-ming',
      'stats-china-great-wall-length-2012',
    ],
    relatedIds: ['silk-road', 'region-shaanxi', 'landmark-terracotta-army'],
  },] as const satisfies readonly Collection[];

const cultureCollections = [
  {
    id: 'spring-festival',
    groupId: 'culture',
    nameRu: 'Праздник весны',
    nameZh: '春节',
    pinyin: 'Chūnjié',
    kind: 'явление',
    lead:
      'Праздник весны (春节, Chūnjié) — важнейший традиционный праздник Китая, встреча Нового года по ' +
      'лунному календарю, который отмечают по всей стране, а не в одном регионе. Дата подвижная: ' +
      'праздник начинается в новолуние и продолжается 15 дней, до ближайшего полнолуния. В 2024 году ' +
      'ЮНЕСКО включила его социальные практики в Представительный список нематериального культурного ' +
      'наследия человечества.',
    regionIds: [],
    scopeLabel: 'Вся страна',
    notes: [
      'Праздник весны начинается в новолуние, которое приходится на период с 21 января по 20 февраля по григорианскому календарю, и продолжается 15 дней — до ближайшего полнолуния, когда отмечают Праздник фонарей (元宵节, Yuánxiāojié).',
      'В 2024 году ЮНЕСКО включила социальные практики китайского народа по случаю традиционного Нового года в Представительный список нематериального культурного наследия человечества.',
      'С середины 1990-х годов жителям Китая на Праздник весны дают семь выходных дней подряд; эту неделю официально называют «Праздником весны» — отсюда и второе имя китайского Нового года.',
      'Праздник встречают семейным ужином в канун Нового года, хлопушками и фейерверками, отпугивающими злых духов, и красными конвертами хунбао (红包, hóngbāo) с деньгами, которые взрослые дарят детям.',
    ],
    photos: [
      {
        id: 'temple-fair',
        subject: 'храмовая ярмарка на праздник весны',
        captionRu: 'Храмовая ярмарка на праздник весны',
        captionZh: '春节庙会',
        place: 'Байфошань, Шаньдун',
      },
    ],
    sourceIds: ['unesco-spring-festival-02126', 'britannica-chinese-new-year'],
    relatedIds: [],
  },
  {
    id: 'beijing-opera',
    groupId: 'culture',
    nameRu: 'Пекинская опера',
    nameZh: '京剧',
    pinyin: 'Jīngjù',
    kind: 'явление',
    lead:
      'Пекинская опера (京剧, Jīngjù) — музыкальный театр, который сложился в Пекине к середине XIX века ' +
      'и соединил пение, речитатив, актёрскую игру и боевые искусства. Спектакли идут на пекинском ' +
      'диалекте, отличаются нарочито условной манерой игры, яркими костюмами и гримом, который сразу ' +
      'называет характер персонажа. В 2010 году ЮНЕСКО включила Пекинскую оперу в Представительный ' +
      'список нематериального культурного наследия человечества.',
    regionIds: ['beijing'],
    notes: [
      'Жанр цзинцзюй («столичный спектакль») сложился в Пекине к середине XIX века на основе нескольких региональных школ музыкальной драмы — трупп из Аньхоя и Хубэя, а также более старой куньцюй (昆曲, Kūnqǔ).',
      'В 2010 году ЮНЕСКО включила Пекинскую оперу в Представительный список нематериального культурного наследия человечества.',
      'Грим раскрывает характер персонажа ещё до реплики, а движения на сцене нарочито условны и часто акробатичны; аккомпанирует небольшой оркестр — главный мелодический инструмент в нём цзинху (京胡, jīnghú), двухструнная скрипка, — вместе с духовыми инструментами и барабаном.',
      'Долгое время женские роли на сцене Пекинской оперы играли мужчины, а актрисы вышли на сцену только в конце XX века; самым знаменитым артистом жанра стал Мэй Ланьфан (梅兰芳, Méi Lánfāng) — в первой половине XX века он показал Пекинскую оперу публике Японии, США и СССР.',
    ],
    photos: [
      {
        id: 'changban-opera',
        subject: 'сцена пекинской оперы',
        captionRu: 'Сцена «Битва при Чанбань»',
        captionZh: '长坂坡',
        place: 'Пекин',
      },
    ],
    sourceIds: ['bre-china-music-culture', 'britannica-jingxi', 'britannica-jinghu', 'unesco-peking-opera-00418'],
    relatedIds: [],
  },
  {
    id: 'silk-road',
    groupId: 'culture',
    nameRu: 'Шёлковый путь',
    nameZh: '丝绸之路',
    pinyin: 'Sīchóu zhī lù',
    kind: 'событие',
    lead:
      'Шёлковый путь (丝绸之路, Sīchóu zhī lù) — сеть караванных маршрутов, которая с древности связывала ' +
      'Китай со Средней Азией и Средиземноморьем. Один из главных маршрутов начинался в Чанъани ' +
      '(长安, Cháng’ān; соврем. Сиань, Шэньси), пересекал северо-запад Китая через коридор Хэси ' +
      '(河西走廊, Héxī Zǒuláng) в Ганьсу и обходил пустыню Такла-Макан по оазисам Синьцзяна, а дальше ' +
      'вёл через горы Памир (帕米尔, Pàmǐ’ěr) на запад. В 2014 году ЮНЕСКО включила часть этой сети — ' +
      'коридор Чанъань — Тяньшань, проходящий по территории Китая, Казахстана и Киргизии, — в список ' +
      'Всемирного наследия.',
    regionIds: ['shaanxi', 'gansu', 'ningxia', 'qinghai', 'xinjiang'],
    notes: [
      'Путь начинался в Чанъани и тянулся на 6400 км (4000 миль) вдоль Великой стены на северо-запад, в обход пустыни Такла-Макан, дальше через горы Памир и Афганистан до Леванта — оттуда товары везли морем через Средиземное море.',
      'На запад по Шёлковому пути шёл шёлк, на восток — шерсть, золото и серебро; вместе с товарами в Китай пришли буддизм из Индии и несторианское христианство.',
      'В 2014 году ЮНЕСКО включила в список Всемирного наследия участок «Шёлковые пути: сеть маршрутов коридора Чанъань — Тяньшань» — около 5000 км дорог с 33 объектами на территории Китая, Казахстана и Киргизии, сложившимися между II веком до н. э. и I веком н. э.',
      'Из-за утраты Римом владений в Азии и усиления арабов на Ближнем Востоке путь опустел; в XIII–XIV веках его возродили монголы, и по этой дороге в Китай добрался венецианец Марко Поло.',
    ],
    photos: [
      {
        id: 'crescent-lake',
        subject: 'оазис на пути каравана',
        captionRu: 'Озеро Юэяцюань среди поющих песков',
        captionZh: '月牙泉',
        place: 'Дуньхуан, Ганьсу',
      },
    ],
    sourceIds: ['britannica-silk-road', 'unesco-silk-roads-changan-tianshan-1442'],
    relatedIds: ['great-wall', 'feature-taklamakan'],
  },] as const satisfies readonly Collection[];

/**
 * Дописанное вручную к коллекции об объекте физической географии — то же, что
 * у региона: вводка, заметки, источники этих заметок и соседние коллекции.
 *
 * Плюс `regionIds`. Список у объекта в справочнике служит другой цели: его
 * сверяет `validate:map`, и там перечислены только регионы, которых
 * генерализованная линия действительно касается. Хуанхэ географически течёт
 * по девяти регионам, а линия задевает восемь — Сычуань она обходит. На карте
 * права геометрия, в тексте — география, и переписывать ради текста
 * проверяемый список нельзя.
 */
type CollectionExtras = {
  readonly lead?: string;
  readonly notes?: readonly string[];
  readonly regionIds?: readonly string[];
  readonly photos?: readonly CollectionPhoto[];
  readonly sourceIds?: readonly string[];
  readonly relatedIds?: readonly string[];
};

const FEATURE_COLLECTION_EXTRAS: Readonly<
  Record<string, CollectionExtras>
> = {
  /*
   * Досталось от рукописной страницы «Такла-Макан», которая жила рядом с этой
   * порождённой до 2026-08-28: две страницы об одной пустыне попадали в один
   * набор вопросов. Содержание перенесено целиком, страница осталась одна.
   */
  taklamakan: {
    lead:
      'Такла-Макан — одна из крупнейших песчаных пустынь мира: она занимает Таримскую котловину ' +
      'в Синьцзян-Уйгурском автономном районе между хребтами Тянь-Шань, Куньлунь и Памир. Вдоль ' +
      'её северной и западной окраин проходил Великий шёлковый путь, соединявший Китай со Средней ' +
      'Азией и Европой.',
    notes: [
      'Площадь пустыни — около 320 тыс. км², она вытянута на 960 км с запада на восток; это одна из крупнейших песчаных (не каменистых) пустынь мира.',
      'Поверхность покрывают эоловые песчаные гряды высотой от 30 до 150 м, а самые высокие пирамидальные дюны поднимаются на 200–300 м.',
      'Осадков здесь выпадает от 10 до 38 мм в год; реки, стекающие с гор Куньлунь (昆仑山, Kūnlún Shān), углубляются в пески на 100–200 км и высыхают, не достигая центра пустыни.',
      'В конце XIX века шведский исследователь Свен Гедин, а затем британский археолог Аурель Стейн нашли в песках занесённые пустыней буддийские города первого тысячелетия н. э.',
    ],
    /*
     * Снимка два: у рукописной страницы и у порождённой были разные кадры, и
     * при слиянии оба остались — файлы уже скачаны, лицензии записаны.
     */
    photos: [
      {
        id: 'taklamakan-dunes',
        subject: 'песчаные гряды пустыни',
        captionRu: 'Песчаные гряды Такла-Макана',
        captionZh: '塔克拉玛干沙漠',
        place: 'Синьцзян',
      },
      {
        id: 'feature-taklamakan',
        subject: 'дюны',
        captionRu: 'Дюны Такла-Макана с высоты',
        place: 'Синьцзян',
      },
    ],
    sourceIds: ['britannica-takla-makan'],
    relatedIds: ['silk-road'],
  },
  'yellow-river': {
    /*
     * Вводка укоротилась: исток, устье, девять регионов и наносы ушли в
     * справку и стоят строкой ниже. Оставленное здесь — то, чего в справке
     * нет, иначе страница дважды говорила бы одно и то же.
     */
    lead:
      'Бассейн Хуанхэ считается колыбелью китайской цивилизации: вдоль реки стоят древнейшие ' +
      'города страны, а её разливы веками определяли жизнь Великой Китайской равнины.',
    /*
     * Заметок здесь больше нет: те же четыре сюжета — длина и исток, девять
     * регионов, наносы и «Горе Китая» — теперь стоят справкой в справочнике
     * объектов, а значит, видны и в карточке атласа. Оставить их и тут значило
     * бы напечатать одно и то же дважды на одной странице.
     */
    regionIds: [
      'qinghai',
      'sichuan',
      'gansu',
      'ningxia',
      'inner-mongolia',
      'shaanxi',
      'shanxi',
      'henan',
      'shandong',
    ],
    sourceIds: [
      'britannica-yellow-river',
      'bre-sediment-runoff',
      'stats-china-yellow-river-provinces',
    ],
    relatedIds: ['great-wall'],
  },};

/**
 * Объект физической географии, прочитанный как коллекция. Устроено так же,
 * как у региона, и по той же причине: имя, иероглифы, пиньинь, род и справка
 * лежат в справочнике объектов, и второго их экземпляра быть не должно.
 *
 * Отсюда же и то, ради чего это сделано: факты об объекте пишутся один раз и
 * видны сразу на обеих поверхностях — в карточке атласа и на странице
 * коллекции.
 */
/**
 * Снимок в список из одного или пустой список. Отдельной функцией, чтобы у
 * обоих выводов было одно правило: снимка нет — списка нет, а не список с
 * дырой.
 */
function photosOf(photo: CollectionPhoto | undefined): readonly CollectionPhoto[] {
  return photo === undefined ? [] : [photo];
}

/**
 * Снимок объекта физической географии. Подписи написаны по описаниям файлов на
 * Викискладе, а не по догадке о том, что на кадре: подпись к снимку, которого
 * не видел, учит вернее всего неверному.
 *
 * У каждого объекта один снимок: галерея ему не нужна, страница держится
 * справкой, а кадр показывает, как объект выглядит на самом деле.
 */
const FEATURE_PHOTOS: Readonly<Record<string, CollectionPhoto>> = {
  yangtze: {
    id: 'feature-yangtze',
    subject: 'первый изгиб Янцзы',
    captionRu: 'Первый изгиб Янцзы у посёлка Шигу',
    captionZh: '长江第一湾',
    place: 'Юньнань',
  },
  'yellow-river': {
    id: 'feature-yellow-river',
    subject: 'Хуанхэ в городе',
    captionRu: 'Хуанхэ в Ланьчжоу',
    place: 'Ланьчжоу, Ганьсу',
  },
  heilongjiang: {
    id: 'feature-heilongjiang',
    subject: 'острова в протоке',
    captionRu: 'Острова в протоке Амура',
    place: 'Хабаровский край, Россия',
  },
  'pearl-river': {
    id: 'feature-pearl-river',
    subject: 'закат на реке',
    captionRu: 'Закат на Сицзяне у Учжоу',
    captionZh: '西江',
    place: 'Учжоу, Гуанси',
  },
  lancang: {
    id: 'feature-lancang',
    subject: 'река в Юньнани',
    captionRu: 'Ланьцанцзян в Юньнани',
    captionZh: '澜沧江',
    place: 'Юньнань',
  },
  tarim: {
    id: 'feature-tarim',
    subject: 'переправа через реку',
    captionRu: 'Пустынное шоссе пересекает Тарим',
    place: 'Синьцзян',
  },
  'tibetan-plateau': {
    id: 'feature-tibetan-plateau',
    subject: 'нагорье',
    captionRu: 'Тибетское нагорье',
    captionZh: '青藏高原',
    place: 'Тибет',
  },
  'tarim-basin': {
    id: 'feature-tarim-basin',
    subject: 'пески внутри впадины',
    captionRu: 'Пески Такла-Макана в Таримской впадине',
    captionZh: '塔克拉玛干沙漠',
    place: 'Синьцзян',
  },
  'loess-plateau': {
    id: 'feature-loess-plateau',
    subject: 'лёссовый ландшафт',
    captionRu: 'Лёссовый ландшафт близ Хуньюаня',
    place: 'Датун, Шаньси',
  },
  'sichuan-basin': {
    id: 'feature-sichuan-basin',
    subject: 'дно котловины',
    captionRu: 'Цзытун с горы Волуншань',
    place: 'Мяньян, Сычуань',
  },
  gobi: {
    id: 'feature-gobi',
    subject: 'песчаные дюны',
    captionRu: 'Песчаные дюны Гоби',
    captionZh: '戈壁',
    place: 'Гоби',
  },
  'north-china-plain': {
    id: 'feature-north-china-plain',
    subject: 'равнина зимой',
    captionRu: 'Великая Китайская равнина зимой',
    captionZh: '华北平原',
    place: 'север Китая',
  },
  himalayas: {
    id: 'feature-himalayas',
    subject: 'северная стена Джомолунгмы',
    captionRu: 'Северная стена Джомолунгмы со стороны базового лагеря',
    captionZh: '珠穆朗玛峰',
    place: 'Тибет',
  },
  kunlun: {
    id: 'feature-kunlun',
    subject: 'хребет с дороги',
    captionRu: 'Западный Куньлунь с Тибетско-Синьцзянского шоссе',
    captionZh: '昆仑山脉',
    place: 'Синьцзян',
  },
  'tian-shan': {
    id: 'feature-tian-shan',
    subject: 'луга и снежные вершины',
    captionRu: 'Альпийские луга и снежные вершины у Хан-Тенгри',
    captionZh: '天山',
    place: 'Тянь-Шань',
  },
  qinling: {
    id: 'feature-qinling',
    subject: 'вершина хребта',
    captionRu: 'Западная вершина Хуашаня',
    captionZh: '华山',
    place: 'Шэньси',
  },
  'greater-khingan': {
    id: 'feature-greater-khingan',
    subject: 'река в горах',
    captionRu: 'Река Ялухэ в Большом Хингане',
    captionZh: '大兴安岭',
    place: 'Большой Хинган',
  },
  nanling: {
    id: 'feature-nanling',
    subject: 'красные скалы',
    captionRu: 'Ландшафт данься у горы Даньсяшань',
    captionZh: '丹霞山',
    place: 'Шаогуань, Гуандун',
  },
  'qinghai-lake': {
    id: 'feature-qinghai-lake',
    subject: 'озеро в горах',
    captionRu: 'Озеро Цинхай',
    captionZh: '青海湖',
    place: 'Цинхай',
  },
  poyang: {
    id: 'feature-poyang',
    subject: 'птицы на озере',
    captionRu: 'Гуси, лебеди, колпицы и журавли на Поянху',
    captionZh: '鄱阳湖',
    place: 'Цзянси',
  },
  dongting: {
    id: 'feature-dongting',
    subject: 'мост через озеро',
    captionRu: 'Мост через Дунтинху в Юэяне',
    captionZh: '洞庭湖大桥',
    place: 'Юэян, Хунань',
  },
  taihu: {
    id: 'feature-taihu',
    subject: 'берег озера',
    captionRu: 'Берег Тайху в парке Троецарствия',
    captionZh: '太湖',
    place: 'Уси, Цзянсу',
  },
  hongze: {
    id: 'feature-hongze',
    subject: 'водно-болотные угодья',
    captionRu: 'Водно-болотный парк Сыхун на Хунцзэху',
    captionZh: '洪泽湖',
    place: 'Сыхун, Цзянсу',
  },
  'mongolian-plateau': {
    id: 'feature-mongolian-plateau',
    subject: 'степь плато',
    captionRu: 'Степь Хулун-Буира у посёлка Хакэ',
    place: 'Хулун-Буир, Внутренняя Монголия',
  },
  'yungui-plateau': {
    id: 'feature-yungui-plateau',
    subject: 'карстовые останцы',
    captionRu: 'Каменный лес Шилинь',
    captionZh: '石林',
    place: 'Шилинь, Юньнань',
  },
  'junggar-basin': {
    id: 'feature-junggar-basin',
    subject: 'яданги котловины',
    captionRu: '«Город дьявола» у Урхо с высоты',
    place: 'Урхо, Синьцзян',
  },
  'qaidam-basin': {
    id: 'feature-qaidam-basin',
    subject: 'солончак',
    captionRu: 'Солончак у Улана',
    place: 'Улан, Хайси, Цинхай',
  },
  'northeast-plain': {
    id: 'feature-northeast-plain',
    subject: 'поля равнины',
    captionRu: 'Кукуруза и соя на полях у Цзяохэ',
    place: 'Цзяохэ, Гирин',
  },
  taklamakan: {
    id: 'feature-taklamakan',
    subject: 'дюны',
    captionRu: 'Дюны Такла-Макана',
    place: 'Синьцзян',
  },
  taihang: {
    id: 'feature-taihang',
    subject: 'скалы хребта',
    captionRu: 'Скалы Тайханшаня в тумане',
    place: 'Тайханшань',
  },
  'hexi-corridor': {
    id: 'feature-hexi-corridor',
    subject: 'крепость в коридоре',
    captionRu: 'Крепость Цзяюйгуань в Хэсийском коридоре',
    place: 'Цзяюйгуань, Ганьсу',
  },
  'yellow-sea': {
    id: 'feature-yellow-sea',
    subject: 'наносы с высоты',
    captionRu: 'Наносы рек в Бохайском заливе и Жёлтом море — снимок из космоса',
    place: 'Жёлтое море',
  },
  'east-china-sea': {
    id: 'feature-east-china-sea',
    subject: 'острова архипелага',
    captionRu: 'Чжоушаньский архипелаг на закате',
    place: 'Чжоушань, Чжэцзян',
  },
  'south-china-sea': {
    id: 'feature-south-china-sea',
    subject: 'берег моря',
    captionRu: 'Бухта Ялунвань на юге Хайнаня',
    place: 'Санья, Хайнань',
  },
  bohai: {
    id: 'feature-bohai',
    subject: 'берег залива',
    captionRu: 'Гора Бицзяшань у Цзиньчжоу в прилив',
    place: 'Цзиньчжоу, Ляонин',
  },
  'taiwan-strait': {
    id: 'feature-taiwan-strait',
    subject: 'остров в проливе',
    captionRu: 'Остров Сяосян у Пиндана, снятый с парома',
    place: 'Пиндань, Фуцзянь',
  },
  everest: {
    id: 'feature-everest',
    subject: 'северная стена',
    captionRu: 'Северная стена Джомолунгмы с дороги к базовому лагерю, долина Ронгбук',
    place: 'Тибетский автономный район',
  },
  'turpan-depression': {
    id: 'feature-turpan-depression',
    subject: 'низшая точка страны',
    captionRu: 'Стела у высохшего озера Айдин — низшей точки Китая',
    captionZh: '艾丁湖',
    place: 'Турфанская впадина, Синьцзян',
  },
  chaohu: {
    id: 'feature-chaohu',
    subject: 'озеро с высоты',
    captionRu: 'Чаоху с вершины горы Гуйшань',
    captionZh: '巢湖',
    place: 'Чаоху, Аньхой',
  },
};

function featureCollection(feature: PhysicalFeature): Collection {
  const extras = FEATURE_COLLECTION_EXTRAS[feature.id] ?? {};
  const factSourceIds = feature.facts.flatMap((fact) => fact.sourceIds);

  return {
    id: `feature-${feature.id}`,
    groupId: 'geography',
    aboutFeatureId: feature.id,
    nameRu: feature.nameRu,
    nameZh: feature.nameZh,
    pinyin: feature.pinyin,
    kind: kindWord(physicalKindLabel(feature)),
    lead: extras.lead ?? '',
    regionIds: extras.regionIds ?? feature.regionIds,
    notes: extras.notes ?? [],
    photos: extras.photos ?? photosOf(FEATURE_PHOTOS[feature.id]),
    sourceIds: [
      ...new Set([
        ...(extras.sourceIds ?? []),
        ...factSourceIds,
        ...feature.sourceIds,
      ]),
    ],
    relatedIds: extras.relatedIds ?? [],
  };
}

/**
 * Дописанное вручную к коллекции достопримечательности. Устроено как дописки
 * физических объектов: имя, иероглифы, пиньинь, род и факты с источниками
 * берутся из справочника и здесь не повторяются.
 *
 * Двум записям содержание досталось от рукописных страниц, живших до
 * 2026-08-28 отдельно от каталога: «Терракотовая армия» и «Террасы Юаньян».
 * После переезда объект и страница у них общие — это и есть правило «один
 * предмет — одна страница».
 */
const LANDMARK_COLLECTION_EXTRAS: Readonly<
  Record<string, CollectionExtras>
> = {
  'terracotta-army': {
    lead:
      'Терракотовая армия (兵马俑, Bīngmǎyǒng) — часть погребального комплекса первого императора ' +
      'объединённого Китая Цинь Шихуана (秦始皇, Qín Shǐhuáng) у города Сиань в провинции Шэньси. ' +
      'Планировка комплекса повторяет план тогдашней столицы империи Цинь — города Сяньян (咸阳, ' +
      'Xiányáng): императорский дворец обнесён стенами, а те — ещё одной. Сегодня это крупнейший ' +
      'археологический памятник такого рода в Китае и объект Всемирного наследия ЮНЕСКО.',
    notes: [
      'Мавзолей начали строить в 246 году до н. э., когда на престол царства Цинь взошёл будущий Цинь Шихуан; по свидетельству историка Сыма Цяня (司马迁, Sīmǎ Qiān), работы не останавливались до самой смерти императора в 210 году до н. э.',
      'Курган над гробницей и сегодня возвышается на 51,3 м; вместе с почти 200 сопровождающими ямами и другими постройками — более 600 объектов — комплекс занимает охраняемую территорию 56,25 км².',
      'Кроме главной ямы, рядом раскопаны ещё три: во второй нашли свыше 1300 фигур пехотинцев, колесниц и конницы, в третьей — 68 фигур, вероятно, командного состава, а четвёртая оказалась пустой.',
      'Каждую фигуру собирали из отдельно обожжённых частей, но лицо ей давали неповторимое — одинаковых воинов среди них нет; рядом лежало настоящее бронзовое оружие — мечи, копья, наконечники стрел, отлитые из необычного тринадцатикомпонентного сплава, который не потускнел до сих пор.',
    ],
    photos: [
      {
        id: 'terracotta-pit-1',
        subject: 'первый раскоп с шеренгами воинов',
        captionRu: 'Первый раскоп: шеренги воинов',
        captionZh: '兵马俑一号坑',
        place: 'Сиань, Шэньси',
      },
    ],
    sourceIds: ['britannica-terracotta-army'],
    relatedIds: ['region-shaanxi', 'great-wall'],
  },
  'hani-terraces': {
    lead:
      'Каскад рисовых террас на южных склонах гор Айлаошань (哀牢山, Āiláo Shān) в уезде Юаньян ' +
      'на юге Юньнани — ирригационная система, которую народ хани (哈尼族, Hānízú) создаёт на ' +
      'протяжении более 1300 лет. Вода стекает с горных лесов по сети каналов к чекам над рекой ' +
      'Хунхэ (红河, Hónghé); в 2013 году ЮНЕСКО включила ландшафт в список Всемирного наследия ' +
      'под названием «Культурный ландшафт рисовых террас Хунхэ-Хани».',
    notes: [
      'Народ хани создаёт систему рисовых террас и каналов на склонах Айлаошань уже более 1300 лет; воду с горных лесов к чекам разводят четыре магистральных канала и 392 отвода общей протяжённостью 445,83 км.',
      'В 2013 году ЮНЕСКО включила ландшафт в список Всемирного наследия: охраняемая территория — 16603 га, буферная зона — ещё 29501 га.',
      'На террасах ведут комплексное хозяйство: рисовые чеки совмещают с разведением буйволов, уток, рыбы и угря, а основной культурой служит красный рис.',
    ],
    photos: [
      {
        id: 'yuanyang-sunrise',
        subject: 'террасы на рассвете',
        captionRu: 'Рисовые террасы хани на рассвете',
        captionZh: '元阳梯田',
        place: 'Юаньян, Юньнань',
      },
    ],
    sourceIds: ['unesco-honghe-hani-1111'],
    relatedIds: ['region-yunnan'],
  },
};

/**
 * Снимок достопримечательности. Подписи написаны по описаниям файлов на
 * Викискладе — по тому же правилу, что у физических объектов: подпись к
 * снимку, которого не видел, учит вернее всего неверному.
 *
 * Файлы выбраны не поиском наугад: у каждого объекта взят заглавный снимок из
 * Викиданных (свойство P18), а где он оказался мелким для крупного кадра —
 * замена из категории того же объекта.
 */
const LANDMARK_PHOTOS: Readonly<Record<string, CollectionPhoto>> = {
  'forbidden-city': {
    id: 'landmark-forbidden-city',
    subject: 'главный зал дворца',
    captionRu: 'Зал высшей гармонии',
    captionZh: '太和殿',
    place: 'Пекин',
  },
  'temple-of-heaven': {
    id: 'landmark-temple-of-heaven',
    subject: 'зал моления',
    captionRu: 'Зал моления о богатом урожае',
    captionZh: '祈年殿',
    place: 'Пекин',
  },
  'summer-palace': {
    id: 'landmark-summer-palace',
    subject: 'гора над озером',
    captionRu: 'Гора Долголетия в Летнем дворце',
    captionZh: '万寿山',
    place: 'Пекин',
  },
  chengde: {
    id: 'landmark-chengde',
    subject: 'парк резиденции',
    captionRu: 'Горная резиденция в Чэндэ',
    place: 'Чэндэ, Хэбэй',
  },
  'mukden-palace': {
    id: 'landmark-mukden-palace',
    subject: 'дворец с высоты',
    captionRu: 'Мукденский дворец с высоты птичьего полёта',
    place: 'Шэньян, Ляонин',
  },
  koguryo: {
    id: 'landmark-koguryo',
    subject: 'стена горной крепости',
    captionRu: 'Стена горной крепости Ваньду',
    place: 'Цзиань, Гирин',
  },
  xanadu: {
    id: 'landmark-xanadu',
    subject: 'развалины города',
    captionRu: 'Развалины Шанду, летней столицы Хубилая',
    place: 'Внутренняя Монголия',
  },
  yungang: {
    id: 'landmark-yungang',
    subject: 'изваяния в пещере',
    captionRu: 'Гроты Юньган в Датуне',
    captionZh: '云冈石窟',
    place: 'Датун, Шаньси',
  },
  pingyao: {
    id: 'landmark-pingyao',
    subject: 'улица старого города',
    captionRu: 'Старый город Пинъяо',
    place: 'Пинъяо, Шаньси',
  },
  'western-xia-tombs': {
    id: 'landmark-western-xia-tombs',
    subject: 'курган гробницы',
    captionRu: 'Третья гробница Западной Ся под Иньчуанем',
    place: 'Иньчуань, Нинся',
  },
  mogao: {
    id: 'landmark-mogao',
    subject: 'обрыв с пещерами',
    captionRu: 'Пещеры Могао в Дуньхуане',
    captionZh: '莫高窟',
    place: 'Дуньхуан, Ганьсу',
  },
  gaochang: {
    id: 'landmark-gaochang',
    subject: 'развалины храма',
    captionRu: 'Юго-западный буддийский храм городища Гаочан',
    place: 'Турфан, Синьцзян',
  },
  potala: {
    id: 'landmark-potala',
    subject: 'дворец на горе',
    captionRu: 'Потала со склона горы Чагпори',
    captionZh: '布达拉宫',
    place: 'Лхаса, Тибет',
  },
  longmen: {
    id: 'landmark-longmen',
    subject: 'изваяния в скале',
    captionRu: 'Пещеры Лунмэнь над рекой И',
    captionZh: '龙门石窟',
    place: 'Лоян, Хэнань',
  },
  shaolin: {
    id: 'landmark-shaolin',
    subject: 'постройки монастыря',
    captionRu: 'Шаолиньский монастырь',
    captionZh: '少林寺',
    place: 'Дэнфэн, Хэнань',
  },
  'qufu-confucius': {
    id: 'landmark-qufu-confucius',
    subject: 'главный зал храма',
    captionRu: 'Зал Дачэн в храме Конфуция',
    captionZh: '大成殿',
    place: 'Цюйфу, Шаньдун',
  },
  'suzhou-gardens': {
    id: 'landmark-suzhou-gardens',
    subject: 'камни и вода сада',
    captionRu: 'Сад Львиная роща в Сучжоу',
    captionZh: '狮子林',
    place: 'Сучжоу, Цзянсу',
  },
  'west-lake': {
    id: 'landmark-west-lake',
    subject: 'пагода над озером',
    captionRu: 'Пагода Лэйфэн над Западным озером',
    captionZh: '雷峰塔',
    place: 'Ханчжоу, Чжэцзян',
  },
  'fujian-tulou': {
    id: 'landmark-fujian-tulou',
    subject: 'группа земляных домов',
    captionRu: 'Группа тулоу Тяньлокэн',
    captionZh: '田螺坑土楼群',
    place: 'Фуцзянь',
  },
  'macao-historic-centre': {
    id: 'landmark-macao-historic-centre',
    subject: 'фасад собора',
    captionRu: 'Руины собора Святого Павла',
    captionZh: '大三巴牌坊',
    place: 'Макао',
  },
  dazu: {
    id: 'landmark-dazu',
    subject: 'наскальные рельефы',
    captionRu: 'Наскальные рельефы Дацзу',
    captionZh: '大足石刻',
    place: 'Чунцин',
  },
  dujiangyan: {
    id: 'landmark-dujiangyan',
    subject: 'водораздел системы',
    captionRu: 'Дуцзянъянь на Миньцзяне',
    captionZh: '都江堰',
    place: 'Дуцзянъянь, Сычуань',
  },
  'leshan-buddha': {
    id: 'landmark-leshan-buddha',
    subject: 'статуя в скале',
    captionRu: 'Лэшаньский Будда',
    captionZh: '乐山大佛',
    place: 'Лэшань, Сычуань',
  },
  lijiang: {
    id: 'landmark-lijiang',
    subject: 'крыши старого города',
    captionRu: 'Старый город Лицзян',
    captionZh: '丽江古城',
    place: 'Лицзян, Юньнань',
  },
  taishan: {
    id: 'landmark-taishan',
    subject: 'вершина горы',
    captionRu: 'Пик Жигуань на Тайшане',
    captionZh: '日观峰',
    place: 'Тайань, Шаньдун',
  },
  huangshan: {
    id: 'landmark-huangshan',
    subject: 'гранитные пики',
    captionRu: 'Пики Хуаншаня',
    captionZh: '黄山',
    place: 'Аньхой',
  },
  lushan: {
    id: 'landmark-lushan',
    subject: 'рассвет в горах',
    captionRu: 'Рассвет на Лушане',
    captionZh: '庐山',
    place: 'Цзянси',
  },
  wulingyuan: {
    id: 'landmark-wulingyuan',
    subject: 'песчаниковые столбы',
    captionRu: 'Кварцитовые столбы Хуаншичжая',
    captionZh: '武陵源',
    place: 'Чжанцзяцзе, Хунань',
  },
  'guilin-karst': {
    id: 'landmark-guilin-karst',
    subject: 'карстовые пики над рекой',
    captionRu: 'Река Ли у Яншо',
    captionZh: '漓江',
    place: 'Гуйлинь, Гуанси',
  },
  fanjingshan: {
    id: 'landmark-fanjingshan',
    subject: 'скала над лесом',
    captionRu: 'Фаньцзиншань',
    captionZh: '梵净山',
    place: 'Гуйчжоу',
  },
  jiuzhaigou: {
    id: 'landmark-jiuzhaigou',
    subject: 'водопад',
    captionRu: 'Водопад Нуожилан в Цзючжайгоу',
    captionZh: '诺日朗瀑布',
    place: 'Сычуань',
  },
  'hoh-xil': {
    id: 'landmark-hoh-xil',
    subject: 'высокогорная степь',
    captionRu: 'Кукушили в августе',
    captionZh: '可可西里',
    place: 'Цинхай',
  },
  'shanghai-tower': {
    id: 'landmark-shanghai-tower',
    subject: 'три башни Луцзяцзуя',
    captionRu: 'Шанхайская башня рядом с Цзиньмао и Всемирным финансовым центром',
    captionZh: '上海中心大厦',
    place: 'Шанхай',
  },
  'three-gorges-dam': {
    id: 'landmark-three-gorges-dam',
    subject: 'плотина на реке',
    captionRu: 'Плотина «Три ущелья» на Янцзы',
    captionZh: '三峡大坝',
    place: 'Ичан, Хубэй',
  },
  'hzm-bridge': {
    id: 'landmark-hzm-bridge',
    subject: 'мост над водой',
    captionRu: 'Западный участок моста Гонконг — Чжухай — Макао',
    captionZh: '港珠澳大桥',
    place: 'Дельта Чжуцзяна',
  },
};

/** Слово рода на странице: «памятник», «природное место», «сооружение». */
const LANDMARK_KIND_WORDS: Readonly<Record<LandmarkKind, string>> = {
  monument: 'памятник',
  nature: 'природное место',
  modern: 'сооружение',
};

function landmarkCollection(landmark: Landmark): Collection {
  const extras = LANDMARK_COLLECTION_EXTRAS[landmark.id] ?? {};
  const factSourceIds = landmark.facts.flatMap((fact) => fact.sourceIds);

  return {
    id: `landmark-${landmark.id}`,
    groupId: 'geography',
    aboutLandmarkId: landmark.id,
    nameRu: landmark.nameRu,
    nameZh: landmark.nameZh,
    pinyin: landmark.pinyin,
    kind: LANDMARK_KIND_WORDS[landmark.kind],
    lead: extras.lead ?? '',
    regionIds: extras.regionIds ?? [landmark.regionId],
    notes: extras.notes ?? [],
    photos: extras.photos ?? photosOf(LANDMARK_PHOTOS[landmark.id]),
    sourceIds: [
      ...new Set([
        ...(extras.sourceIds ?? []),
        ...factSourceIds,
        ...landmark.sourceIds,
      ]),
    ],
    relatedIds: extras.relatedIds ?? [],
  };
}

/**
 * Дописанное вручную к коллекции региона: вводка, заметки «что стоит знать»,
 * источники этих заметок и соседние коллекции. Всё остальное — имя,
 * иероглифы, пиньинь, род, справка с источниками, города — берётся из
 * справочника регионов и здесь не повторяется.
 *
 * Дописки есть у четырёх регионов. Остальные тридцать живут одной справкой, и
 * это законное состояние, а не черновик: справка написана и подтверждена
 * источниками.
 */
type RegionCollectionExtras = {
  readonly lead?: string;
  readonly notes?: readonly string[];
  readonly sourceIds?: readonly string[];
  readonly relatedIds?: readonly string[];
};

const REGION_COLLECTION_EXTRAS: Readonly<
  Record<string, RegionCollectionExtras>
> = {
  shaanxi: {
    lead:
      'Шэньси лежит в среднем течении Хуанхэ: на юге провинцию отделяют от центрального Китая горы ' +
      'Циньлин (秦岭, Qín Lǐng), а на севере простирается лёссовое плато — один из древнейших очагов ' +
      'китайской государственности. Столица провинции Сиань (西安, Xī’ān), в древности — Чанъань ' +
      '(长安, Cháng’ān), была столицей нескольких китайских династий и восточным концом Великого ' +
      'шёлкового пути, который связывал Китай со Средиземноморьем.',
    notes: [
      'Сиань стал столицей Западной Хань в 202 году до н. э.; позже, при династиях Суй (581–618) и Тан (618–907), город разросся в один из крупнейших и богатейших городов тогдашнего мира.',
      'В Сиане сохранилась Большая мечеть (西安大清真寺, Xī’ān Dà Qīngzhēnsì): она основана в 742 году, а большинство её нынешних построек возведено в XIV веке.',
      'Вокруг старого города Сианя стоит хорошо сохранившаяся городская стена (西安城墙, Xī’ān Chéngqiáng), а внутри неё — построенные при династии Мин Барабанная (鼓楼, Gǔlóu) и Колокольная (钟楼, Zhōnglóu) башни.',
    ],
    sourceIds: ['britannica-shaanxi', 'britannica-xian'],
    relatedIds: ['landmark-terracotta-army', 'great-wall'],
  },
  yunnan: {
    lead:
      'Юньнань — горная и плоскогорная провинция на юго-западе Китая, вытянутая от границы с Тибетом ' +
      'до рубежей с Мьянмой, Лаосом и Вьетнамом. Разница высот — от тропических каньонов на западе ' +
      'до альпийских лугов — сделала её самой богатой по числу видов растений и животных провинцией ' +
      'Китая. Не меньше пестрит и население: по разнообразию народов и языков Юньнани в стране нет равных.',
    notes: [
      'Юньнань — самая многонациональная провинция Китая: свыше 50 официально признанных национальных меньшинств составляют более трети её населения, при этом ни один уезд провинции не населён только одной национальностью.',
      'Старый город Лицзян (丽江古城, Lìjiāng Gǔchéng) с XII века был перевалочным пунктом торговли между Сычуанью, Юньнанью и Тибетом — здесь южная ветвь Шёлкового пути смыкалась с Чайно-конной дорогой (茶马古道, Chámǎ Gǔdào); в 1997 году ЮНЕСКО включила исторический город в список Всемирного наследия.',
      'Каменный лес Шилинь (石林, Shílín) в Юньнани — часть серийного объекта Всемирного наследия ЮНЕСКО «Карст Южного Китая», включённого в список в 2007 году; его известняковые пики считаются мировым эталоном столбчатого карста.',
      'Несмотря на субтропические широты, восточное плато Юньнани отличается на редкость ровным климатом: в Куньмине средняя температура держится около 22 °C летом и 9 °C зимой, а вегетационный период длится до 10 месяцев в году.',
    ],
    sourceIds: ['britannica-yunnan', 'unesco-lijiang-811', 'unesco-south-china-karst-1248'],
    relatedIds: ['landmark-hani-terraces'],
  },
  guangdong: {
    lead:
      'Гуандун — самая южная из материковых провинций Китая: она выходит широкой дугой к Южно-Китайскому ' +
      'морю и обрамляет с суши Гонконг и Макао. Порт Гуанчжоу (广州, Guǎngzhōu) в устье Чжуцзяна веками ' +
      'служил Китаю воротами для внешней торговли, а с XVII века — и очагом эмиграции: сегодня Гуандун ' +
      'считается родиной значительной части китайцев, живущих за рубежом, — хуацяо (华侨, huáqiáo).',
    notes: [
      'С конца XVII века из-за быстрого роста населения Гуандун стал источником эмиграции: сначала люди переселялись в соседние Гуанси, Сычуань и на Тайвань, а с середины XIX века — в Юго-Восточную Азию и Северную Америку.',
      'С Гуандуном связана целая плеяда реформаторов и революционеров Китая Нового времени — от предводителя восстания тайпинов Хун Сюцюаня (洪秀全, Hóng Xiùquán) до Сунь Ятсена (孙中山, Sūn Zhōngshān), возглавившего Синьхайскую революцию 1911–1912 годов.',
      'В уезде Кайпин (开平, Kāipíng) сохранились дяолоу (碉楼, diāolóu) — многоэтажные сторожевые башни начала XX века, которые вернувшиеся из эмиграции хуацяо строили в смешанном китайско-западном стиле для защиты от бандитов; в 2007 году комплекс включили в список Всемирного наследия ЮНЕСКО.',
      'Помимо кантонского, в Гуандуне говорят на хакка (客家话, Kèjiāhuà) — на севере и северо-востоке провинции, и на южноминьском диалекте (闽南话, Mǐnnánhuà) — на восточном побережье у города Шаньтоу (汕头, Shàntóu).',
    ],
    sourceIds: ['britannica-guangdong', 'britannica-guangdong-history', 'unesco-kaiping-diaolou-1112'],
    relatedIds: [],
  },
  tibet: {
    lead:
      'Тибетский автономный район занимает большую часть Тибетского нагорья на юго-западе Китая — ' +
      'обширного плоскогорья, которое называют «крышей мира». Столица Лхаса (拉萨, Lāsà) веками остаётся ' +
      'духовным центром тибетского буддизма, а само нагорье, богатое реками и озёрами, служит истоком ' +
      'для нескольких крупнейших рек Азии.',
    notes: [
      'Тибетское нагорье — исток главных рек Восточной, Юго-Восточной и Южной Азии: здесь берут начало Инд, Сатледж, Салуин, Меконг, Янцзы и Брахмапутра (в Тибете — Ярлунг-Цангпо, 雅鲁藏布江, Yǎlǔ Zàngbù Jiāng).',
      'Храм Джоканг (大昭寺, Dàzhāosì) в старом городе Лхасы основан в VII веке; в 2000 году ЮНЕСКО расширила объект дворца Потала, включив в него и этот храм.',
      'На юго-востоке Тибета, у пика Намчабарва, находится Большой каньон реки Ярлунг-Цангпо (雅鲁藏布江大峡谷, Yǎlǔ Zàngbù Jiāng Dà Xiágǔ) — почти 500 км в длину и около 5000 м в самой глубокой части, один из глубочайших каньонов мира.',
      'Тибетская письменность создана на основе индийского письма гупта около 600 года н. э.; в её слоговом алфавите 30 согласных и 5 гласных букв.',
    ],
    sourceIds: ['britannica-tibet', 'unesco-potala-707', 'britannica-tibet-economy', 'britannica-tibet-people'],
    relatedIds: [],
  },};

/**
 * Род словом в надзаголовке: «По регионам · провинция», «География · река».
 * Подпись в карточке атласа стоит отдельной строкой и потому начинается с
 * заглавной — вторых списков родов ради одной буквы не заводим.
 */
function kindWord(label: string): string {
  return label.slice(0, 1).toLowerCase() + label.slice(1);
}

/**
 * Регион, прочитанный как коллекция. Ни имя, ни справка не пишутся здесь
 * второй раз: иначе у Юньнани два места правды, и они разъедутся при первой
 * же правке — ровно то, от чего справочник уже уберегли, сославшись на центр
 * города вместо пары имён.
 */
/**
 * Снимок региона. Подписи написаны по описаниям файлов на Викискладе: подпись
 * к снимку, которого не видел, учит вернее всего неверному.
 *
 * Выбраны заглавные снимки статей Википедии — те, что редакторы статьи сочли
 * самыми узнаваемыми, — кроме шести, где заглавным стояли флаг, карта или
 * спорное место. Их подобрали отдельно; довод — в `DECISIONS.md`.
 */
const REGION_PHOTOS: Readonly<Record<string, CollectionPhoto>> = {
  anhui: { id: 'region-anhui', subject: 'культурный парк у Цзюхуашаня', captionRu: 'Культурный парк Даюань у горы Цзюхуашань', captionZh: '九华山大愿文化园', place: 'Чичжоу, Аньхой' },
  fujian: { id: 'region-fujian', subject: 'река в горах Уишань', captionRu: 'Река в горах Уишань', captionZh: '武夷山', place: 'Наньпин, Фуцзянь' },
  gansu: { id: 'region-gansu', subject: 'цветные скалы данься', captionRu: 'Останцы в геопарке Чжанъе Данься', captionZh: '张掖丹霞', place: 'Чжанъе, Ганьсу' },
  guangdong: { id: 'region-guangdong', subject: 'водопад', captionRu: 'Водопад Хуанманьчжай', place: 'Цзеси, Гуандун' },
  guizhou: { id: 'region-guizhou', subject: 'храм на вершине', captionRu: 'Зал Дхармы монастыря Чэнъэнь на горе Фаньцзиншань', captionZh: '梵净山', place: 'Цзянкоу, Гуйчжоу' },
  hainan: { id: 'region-hainan', subject: 'морской берег', captionRu: 'Побережье в парке Дасяодунтянь у Санья', captionZh: '大小洞天', place: 'Санья, Хайнань' },
  hebei: { id: 'region-hebei', subject: 'участок Великой стены', captionRu: 'Великая стена у Цзиньшаньлина', captionZh: '金山岭长城', place: 'Чэндэ, Хэбэй' },
  heilongjiang: { id: 'region-heilongjiang', subject: 'собор в Харбине', captionRu: 'Софийский собор в Харбине', captionZh: '哈尔滨圣索菲亚教堂', place: 'Харбин, Хэйлунцзян' },
  henan: { id: 'region-henan', subject: 'монастырь в горах', captionRu: 'Буддийская академия Суншань и скалы вокруг', captionZh: '嵩山', place: 'Дэнфэн, Хэнань' },
  hubei: { id: 'region-hubei', subject: 'ущелье на Янцзы', captionRu: 'Ущелье Силин ниже плотины «Три ущелья»', captionZh: '西陵峡', place: 'Ичан, Хубэй' },
  hunan: { id: 'region-hunan', subject: 'кварцитовые столбы', captionRu: 'Пик «Пять пальцев» в Хуаншичжае, Улинъюань', captionZh: '武陵源', place: 'Чжанцзяцзе, Хунань' },
  jiangsu: { id: 'region-jiangsu', subject: 'озеро в городе', captionRu: 'Озеро Сюаньу в Нанкине', captionZh: '玄武湖', place: 'Нанкин, Цзянсу' },
  jiangxi: { id: 'region-jiangxi', subject: 'горные вершины', captionRu: 'Горы Саньциншань', captionZh: '三清山', place: 'Шанжао, Цзянси' },
  jilin: { id: 'region-jilin', subject: 'озеро в кратере', captionRu: 'Озеро Тяньчи в кратере Чанбайшаня', captionZh: '长白山天池', place: 'Байшань, Гирин' },
  liaoning: { id: 'region-liaoning', subject: 'нефритовый Будда', captionRu: 'Дворец нефритового Будды в Аньшане', captionZh: '玉佛苑', place: 'Аньшань, Ляонин' },
  qinghai: { id: 'region-qinghai', subject: 'высокогорная железная дорога', captionRu: 'Цинхай-Тибетская железная дорога', captionZh: '青藏铁路', place: 'Цинхай' },
  shaanxi: { id: 'region-shaanxi', subject: 'статуи у гробницы', captionRu: 'Каменные стражи на пути духов гробницы Цяньлин', captionZh: '乾陵', place: 'Сяньян, Шэньси' },
  shandong: { id: 'region-shandong', subject: 'священная гора', captionRu: 'Гора Тайшань', captionZh: '泰山', place: 'Тайань, Шаньдун' },
  shanxi: { id: 'region-shanxi', subject: 'застава на стене', captionRu: 'Великая стена у заставы Яньмэньгуань', captionZh: '雁门关', place: 'Синьчжоу, Шаньси' },
  sichuan: { id: 'region-sichuan', subject: 'осенние лиственницы', captionRu: 'Лиственницы Потанина в осеннем уборе, озеро Хулухай', captionZh: '葫芦海', place: 'Ганьцзы, Сычуань' },
  yunnan: { id: 'region-yunnan', subject: 'три пагоды', captionRu: 'Три пагоды монастыря Чуншэн в отражении пруда', captionZh: '崇圣寺三塔', place: 'Дали, Юньнань' },
  zhejiang: { id: 'region-zhejiang', subject: 'озеро и пагода', captionRu: 'Западное озеро и пагода Лэйфэн в Ханчжоу', captionZh: '西湖', place: 'Ханчжоу, Чжэцзян' },
  taiwan: { id: 'region-taiwan', subject: 'горное озеро', captionRu: 'Озеро Жиюэтань', captionZh: '日月潭', place: 'Наньтоу, Тайвань' },
  guangxi: { id: 'region-guangxi', subject: 'карстовые холмы у реки', captionRu: 'Карст на реке Лицзян у Яншо', captionZh: '漓江', place: 'Гуйлинь, Гуанси' },
  'inner-mongolia': { id: 'region-inner-mongolia', subject: 'мавзолей в степи', captionRu: 'Мавзолей Чингисхана в Ордосе', captionZh: '成吉思汗陵', place: 'Ордос, Внутренняя Монголия' },
  ningxia: { id: 'region-ningxia', subject: 'гробница в пустыне', captionRu: 'Гробницы государства Западное Ся', captionZh: '西夏王陵', place: 'Иньчуань, Нинся' },
  xinjiang: { id: 'region-xinjiang', subject: 'ледник и каньон', captionRu: 'Каньон Шата и ледник Музарт', captionZh: '夏塔大峡谷', place: 'Или, Синьцзян' },
  tibet: { id: 'region-tibet', subject: 'дворец на холме', captionRu: 'Дворец Потала в Лхасе', captionZh: '布达拉宫', place: 'Лхаса, Тибет' },
  beijing: { id: 'region-beijing', subject: 'городской горизонт', captionRu: 'Горизонт района Чаоян', captionZh: '朝阳区', place: 'Пекин' },
  chongqing: { id: 'region-chongqing', subject: 'город на холмах', captionRu: 'Чунцин', captionZh: '重庆', place: 'Чунцин' },
  shanghai: { id: 'region-shanghai', subject: 'небоскрёбы Пудуна', captionRu: 'Панорама Пудуна', captionZh: '浦东', place: 'Шанхай' },
  tianjin: { id: 'region-tianjin', subject: 'колесо обозрения на мосту', captionRu: 'Колесо обозрения «Глаз Тяньцзиня» и город', captionZh: '天津之眼', place: 'Тяньцзинь' },
  'hong-kong': { id: 'region-hong-kong', subject: 'ночной горизонт', captionRu: 'Ночная панорама с пика Виктория', captionZh: '維多利亞港', place: 'Гонконг' },
  macao: { id: 'region-macao', subject: 'фасад собора', captionRu: 'Руины собора Святого Павла', captionZh: '大三巴牌坊', place: 'Макао' },
};

function regionCollection(region: Region): Collection {
  const extras = REGION_COLLECTION_EXTRAS[region.id] ?? {};
  const factSourceIds = region.facts.flatMap((fact) => fact.sourceIds);

  return {
    id: `region-${region.id}`,
    groupId: 'by-region',
    aboutRegionId: region.id,
    nameRu: region.nameRu,
    nameZh: region.nameZh,
    pinyin: region.pinyin,
    kind: kindWord(REGION_KIND_LABELS[region.kind]),
    lead: extras.lead ?? '',
    regionIds: [region.id],
    notes: extras.notes ?? [],
    photos: photosOf(REGION_PHOTOS[region.id]),
    /*
     * Источники страницы — источники всего, что на ней написано. Справка
     * региона стоит на ней целиком, поэтому её источники здесь же, а не
     * только строкой под фактами.
     */
    sourceIds: [
      ...new Set([
        ...(extras.sourceIds ?? []),
        ...factSourceIds,
        ...region.sourceIds,
      ]),
    ],
    relatedIds: extras.relatedIds ?? [],
  };
}

/**
 * Порядок каталога: сначала три написанных вручную объекта на карте — стена,
 * террасы и пустыня, которых нет среди учебных целей, — потом 24 цели
 * физической географии в порядке своего справочника, потом все 34 региона в
 * порядке своего. Явления — последними. Тот же порядок ученик видит на
 * странице коллекций, и два разных порядка у одного набора он бы заметил.
 */
export const collections: readonly Collection[] = [
  ...geographyCollections,
  ...physicalFeatures.map(featureCollection),
  ...landmarks.map(landmarkCollection),
  ...regions.map(regionCollection),
  ...cultureCollections,
];


export function collectionById(id: string): Collection | undefined {
  return collections.find((collection) => collection.id === id);
}

export function collectionsInGroup(
  groupId: CollectionGroupId,
): readonly Collection[] {
  return collections.filter((collection) => collection.groupId === groupId);
}

/** Черновик — тот, у кого ещё нет источника. Отдельного флага нет намеренно. */
export function isDraft(collection: Collection): boolean {
  return collection.sourceIds.length === 0;
}

/**
 * Коллекции, в которые входит регион, в порядке каталога.
 *
 * Привязка уже есть — `regionIds` у каждой коллекции, — и второго списка
 * заводить не нужно: он разошёлся бы с первым при первом же пополнении.
 * Отсюда же и направление чтения: со страницы коллекции виден её регион, из
 * атласа — коллекции региона.
 */
export function collectionsOfRegion(regionId: string): readonly Collection[] {
  return collections.filter((collection) =>
    collection.regionIds.includes(regionId),
  );
}

/**
 * Коллекции, в которые регион входит помимо своей собственной.
 *
 * Разделено на две функции намеренно. `collectionsOfRegion` отвечает на
 * вопрос о привязке и обязана видеть все коллекции — на этом стоит инвариант
 * каталога. Здесь же вопрос другой: что ещё почитать про этот регион, и
 * «Юньнань» в ответе на него ученик прочтёт как ошибку, а не как ссылку.
 */
export function otherCollectionsOfRegion(
  regionId: string,
): readonly Collection[] {
  return collectionsOfRegion(regionId).filter(
    (collection) => collection.aboutRegionId !== regionId,
  );
}
