/**
 * Коллекции — места и явления, к которым привязаны вопросы культурного режима.
 *
 * Содержание пока черновое: подтверждён только справочник регионов, всё
 * остальное ждёт проверки по источникам. Признак черновика не отдельный флаг,
 * а пустой `sourceIds`: когда учитель принесёт источник, пометка исчезнет сама,
 * а не останется висеть забытой константой.
 *
 * Фотографий в репозитории нет. Снимок описывается местом и подписью, а
 * `PhotoSlot` рисует на его месте именованную заглушку: разметка и подписи
 * готовы, файлы подставляются позже. Число снимков нигде не пишется руками —
 * иначе карточка обещала бы шесть фотографий, которых нет ни одной.
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

export const collections = [
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
        captionRu: 'Земляной участок',
        place: 'Нинся',
      },
    ],
    sourceIds: [
      'unesco-great-wall-438',
      'britannica-great-wall',
      'britannica-great-wall-ming',
      'stats-china-great-wall-length-2012',
    ],
    relatedIds: ['silk-road', 'shaanxi', 'terracotta-army'],
  },
  {
    id: 'yuanyang-terraces',
    groupId: 'geography',
    nameRu: 'Террасы Юаньян',
    nameZh: '元阳梯田',
    pinyin: 'Yuányáng tītián',
    kind: 'ландшафт',
    lead:
      'Каскад рисовых террас на южных склонах гор Айлаошань (哀牢山, Āiláo Shān) в уезде Юаньян ' +
      'на юге Юньнани — ирригационная система, которую народ хани (哈尼族, Hānízú) создаёт на ' +
      'протяжении более 1300 лет. Вода стекает с горных лесов по сети каналов к чекам над рекой ' +
      'Хунхэ (红河, Hónghé); в 2013 году ЮНЕСКО включила ландшафт в список Всемирного наследия ' +
      'под названием «Культурный ландшафт рисовых террас Хунхэ-Хани».',
    regionIds: ['yunnan'],
    notes: [
      'Народ хани создаёт систему рисовых террас и каналов на склонах Айлаошань уже более 1300 лет; воду с горных лесов к чекам разводят четыре магистральных канала и 392 отвода общей протяжённостью 445,83 км.',
      'В 2013 году ЮНЕСКО включила ландшафт в список Всемирного наследия: охраняемая территория — 16603 га, буферная зона — ещё 29501 га.',
      'На террасах ведут комплексное хозяйство: рисовые чеки совмещают с разведением буйволов, уток, рыбы и угря, а основной культурой служит красный рис.',
      '82 деревни стоят между лесом на вершинах и террасами; традиционные дома хани возводят с высокой соломенной крышей характерной формы, которую называют «грибной».',
    ],
    photos: [],
    sourceIds: ['unesco-honghe-hani-1111'],
    relatedIds: ['yunnan'],
  },
  {
    id: 'yellow-river',
    groupId: 'geography',
    nameRu: 'Хуанхэ',
    nameZh: '黄河',
    pinyin: 'Huánghé',
    kind: 'река',
    lead:
      'Хуанхэ — вторая по длине река Китая: она берёт начало в горах Баян-Хара-Ула (巴颜喀拉山, ' +
      'Bāyán Kālā Shān) на Тибетском нагорье в провинции Цинхай и впадает в залив Бохай Жёлтого ' +
      'моря, пересекая по пути девять регионов — от Цинхая на западе до Шаньдуна на востоке. ' +
      'Бассейн реки считается колыбелью китайской цивилизации, а жёлтый цвет воде придают ' +
      'лёссовые наносы, которые Хуанхэ несёт с Лёссового плато.',
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
    notes: [
      'Хуанхэ берёт начало в горах Баян-Хара-Ула на Тибетском нагорье и впадает в залив Бохай Жёлтого моря; длина реки — 5464 км, это вторая по протяжённости река Китая после Янцзы.',
      'На пути к морю Хуанхэ пересекает девять регионов — от Цинхая на западе до Шаньдуна на востоке, включая автономные районы Нинся и Внутренняя Монголия.',
      'Хуанхэ ежегодно выносит в море в среднем около 1300 млн т взвешенных наносов — больше любой другой реки в мире; жёлтый цвет воде придают частицы лёсса, вынесенные с Лёссового плато (黄土高原, Huángtǔ Gāoyuán), отсюда и название реки.',
      'Из-за частых катастрофических разливов на Северо-Китайской равнине реку издавна называют «Горем Китая»; при этом её бассейн считается колыбелью китайской цивилизации, а вдоль русла стоят одни из старейших городов страны — Ланьчжоу, Сиань, Чжэнчжоу и Цзинань.',
    ],
    photos: [],
    sourceIds: [
      'britannica-yellow-river',
      'bre-sediment-runoff',
      'stats-china-yellow-river-provinces',
    ],
    relatedIds: ['great-wall'],
  },
  {
    id: 'taklamakan',
    groupId: 'geography',
    nameRu: 'Такла-Макан',
    nameZh: '塔克拉玛干',
    pinyin: 'Tǎkèlāmǎgān',
    kind: 'пустыня',
    lead:
      'Такла-Макан — одна из крупнейших песчаных пустынь мира: она занимает Таримскую котловину ' +
      'в Синьцзян-Уйгурском автономном районе между хребтами Тянь-Шань, Куньлунь и Памир. Вдоль ' +
      'её северной и западной окраин проходил Великий шёлковый путь, соединявший Китай со Средней ' +
      'Азией и Европой.',
    regionIds: ['xinjiang'],
    notes: [
      'Площадь пустыни — около 320 тыс. км², она вытянута на 960 км с запада на восток; это одна из крупнейших песчаных (не каменистых) пустынь мира.',
      'Поверхность покрывают эоловые песчаные гряды высотой от 30 до 150 м, а самые высокие пирамидальные дюны поднимаются на 200–300 м.',
      'Осадков здесь выпадает от 10 до 38 мм в год; реки, стекающие с гор Куньлунь (昆仑山, Kūnlún Shān), углубляются в пески на 100–200 км и высыхают, не достигая центра пустыни.',
      'В конце XIX века шведский исследователь Свен Гедин, а затем британский археолог Аурел Стайн нашли в песках занесённые пустыней буддийские города первого тысячелетия н. э.',
    ],
    photos: [],
    sourceIds: ['britannica-takla-makan'],
    relatedIds: ['silk-road'],
  },
  {
    id: 'shaanxi',
    groupId: 'by-region',
    nameRu: 'Шэньси',
    nameZh: '陕西省',
    pinyin: 'Shǎnxī shěng',
    kind: 'провинция',
    lead: '',
    regionIds: ['shaanxi'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['terracotta-army', 'great-wall'],
  },
  {
    id: 'yunnan',
    groupId: 'by-region',
    nameRu: 'Юньнань',
    nameZh: '云南省',
    pinyin: 'Yúnnán shěng',
    kind: 'провинция',
    lead: '',
    regionIds: ['yunnan'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['yuanyang-terraces'],
  },
  {
    id: 'guangdong',
    groupId: 'by-region',
    nameRu: 'Гуандун',
    nameZh: '广东省',
    pinyin: 'Guǎngdōng shěng',
    kind: 'провинция',
    lead: '',
    regionIds: ['guangdong'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: [],
  },
  {
    id: 'tibet',
    groupId: 'by-region',
    nameRu: 'Тибет',
    nameZh: '西藏自治区',
    pinyin: 'Xīzàng zìzhìqū',
    kind: 'автономный район',
    lead: '',
    regionIds: ['tibet'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: [],
  },
  {
    id: 'spring-festival',
    groupId: 'culture',
    nameRu: 'Праздник весны',
    nameZh: '春节',
    pinyin: 'Chūnjié',
    kind: 'явление',
    lead: '',
    regionIds: [],
    scopeLabel: 'Вся страна',
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: [],
  },
  {
    id: 'beijing-opera',
    groupId: 'culture',
    nameRu: 'Пекинская опера',
    nameZh: '京剧',
    pinyin: 'Jīngjù',
    kind: 'явление',
    lead: '',
    regionIds: ['beijing'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: [],
  },
  {
    id: 'terracotta-army',
    groupId: 'culture',
    nameRu: 'Терракотовая армия',
    nameZh: '兵马俑',
    pinyin: 'Bīngmǎyǒng',
    kind: 'памятник',
    lead: '',
    regionIds: ['shaanxi'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['shaanxi', 'great-wall'],
  },
  {
    id: 'silk-road',
    groupId: 'culture',
    nameRu: 'Шёлковый путь',
    nameZh: '丝绸之路',
    pinyin: 'Sīchóu zhī lù',
    kind: 'событие',
    lead: '',
    regionIds: ['shaanxi', 'gansu', 'ningxia', 'qinghai', 'xinjiang'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['great-wall', 'taklamakan'],
  },
] as const satisfies readonly Collection[];

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
