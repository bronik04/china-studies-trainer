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
      'Ближайший к Пекину открытый участок — Бадалин, около 70 км от центра города.',
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
    sourceIds: [],
    relatedIds: ['silk-road', 'shaanxi', 'terracotta-army'],
  },
  {
    id: 'yuanyang-terraces',
    groupId: 'geography',
    nameRu: 'Террасы Юаньян',
    nameZh: '元阳梯田',
    pinyin: 'Yuányáng tītián',
    kind: 'ландшафт',
    lead: '',
    regionIds: ['yunnan'],
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['yunnan'],
  },
  {
    id: 'yellow-river',
    groupId: 'geography',
    nameRu: 'Хуанхэ',
    nameZh: '黄河',
    pinyin: 'Huánghé',
    kind: 'река',
    lead: '',
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
    notes: [],
    photos: [],
    sourceIds: [],
    relatedIds: ['great-wall'],
  },
  {
    id: 'taklamakan',
    groupId: 'geography',
    nameRu: 'Такла-Макан',
    nameZh: '塔克拉玛干',
    pinyin: 'Tǎkèlāmǎgān',
    kind: 'пустыня',
    lead: '',
    regionIds: ['xinjiang'],
    notes: [],
    photos: [],
    sourceIds: [],
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
