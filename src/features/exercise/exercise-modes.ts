import type { ExerciseType } from '../../domain/round';

/**
 * Описание игры для экрана раунда. Числа сложности здесь нет: чем спрашивать,
 * выбирает ученик, а не игра.
 */
export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
  },
  'name-target': {
    exerciseType: 'name-target',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
  },
  'match-pair': {
    exerciseType: 'match-pair',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
  },
};

/**
 * Группы карточек. Не выдумка ради порядка: это ровно те справочники, из
 * которых берутся цели, и ученик выбирает сначала предмет, а потом форму
 * вопроса. Пока игр было четыре, сетка равных карточек работала; на
 * одиннадцати между «Заполнить карту» и «Найти город» не осталось никакой
 * видимой границы, хотя это разные предметы.
 *
 * История и культура стоят вместе: у обеих по одной игре и общий признак —
 * карты в них нет.
 */
export type ModeGroupId = 'regions' | 'cities' | 'physical' | 'humanities';

export const MODE_GROUPS: readonly {
  readonly id: ModeGroupId;
  readonly title: string;
  /** Чем группа отличается от соседней — одной строкой под названием. */
  readonly note: string;
}[] = [
  {
    id: 'regions',
    title: 'Регионы',
    note: '34 единицы провинциального уровня',
  },
  { id: 'cities', title: 'Города', note: 'набор выбирается перед стартом' },
  {
    id: 'physical',
    title: 'Физическая карта',
    note: 'реки, формы рельефа и озёра',
  },
  { id: 'humanities', title: 'История и культура', note: 'без карты' },
];

/**
 * Карточка режима на главной. Описывает игру для того, кто ещё не пробовал:
 * что спрашивают и сколько это займёт.
 *
 * Игры равноправны и открыты все сразу: это разные занятия, а не ступени
 * одной лестницы, и запирать одно за другим значило бы решать за ученика, что
 * ему сейчас интересно. Закрытой карточка бывает только пока режим не написан.
 *
 * Заполнение карты — не `ExerciseType`: это отдельный вид раунда со своим
 * экраном и своим счётом попыток. Поэтому карточка помечена видом, а не просто
 * типом задания, и главная запускает её другим вызовом.
 *
 * Иероглиф — метка, а не украшение: 地 земля, 名 имя, 都 столица, 填 заполнять,
 * 市 город, 认 узнавать, 属 принадлежать, 山 гора, 河 река, 史 история,
 * 文 культура. Он же отличает карточки друг от друга, когда цвета
 * на бумаге у них одинаковые.
 */
export type ModeCard = {
  readonly id: string;
  readonly mark: string;
  readonly title: string;
  /**
   * Чем эта игра отличается от соседней. На карточке её нет: одиннадцать
   * абзацев подряд — это одиннадцать абзацев, которые нужно прочитать, чтобы
   * выбрать. Её место — окно перед стартом, где ученик уже решил играть
   * именно в эту игру и спрашивает «а как тут спрашивают».
   */
  readonly summary: string;
  /** Что спрашивают и сколько: «34 региона · около 7 минут». */
  readonly volume: string;
  readonly groupId: ModeGroupId;
} & (
  | { readonly kind: 'exercise'; readonly exerciseType: ExerciseType }
  /** Игра по городам: цели берутся из справочника городов, а не регионов. */
  | { readonly kind: 'city'; readonly exerciseType: ExerciseType }
  /** Игра по физической географии: цели берутся из справочника объектов. */
  | { readonly kind: 'physical'; readonly exerciseType: 'find-on-map' | 'name-target' }
  /** Игра по династиям: цели берутся из ленты, а карта в ней не участвует. */
  | { readonly kind: 'history' }
  /** Игра по снимкам коллекций: вопрос — сама фотография. */
  | { readonly kind: 'culture' }
  | { readonly kind: 'fill' }
  /** Режим объявлен, но ещё не написан: карточка не запускается. */
  | { readonly kind: 'planned' }
);

/**
 * Города спрашиваются теми же тремя формами, что и регионы, поэтому у игр те
 * же `exerciseType`. Различают их вид карточки и экран: `CityRound`.
 */
export const CITY_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти город',
    eyebrow: 'Найдите город на карте',
  },
  'name-target': {
    exerciseType: 'name-target',
    title: 'Назвать город',
    eyebrow: 'Какой город подсвечен',
  },
  'match-pair': {
    exerciseType: 'match-pair',
    title: 'Город — регион',
    eyebrow: 'В каком регионе этот город',
  },
};

/**
 * Две игры по физической географии. `match-pair` здесь нет и не будет: у реки
 * нет второго каталога, с которым её связывают.
 */
export const PHYSICAL_MODES: Readonly<
  Record<'find-on-map' | 'name-target', ExerciseMode>
> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на физической карте',
    eyebrow: 'Найдите объект на карте',
  },
  'name-target': {
    exerciseType: 'name-target',
    title: 'Назвать объект',
    eyebrow: 'Какой объект подсвечен',
  },
};

/**
 * «История» — одна игра, а не три: у династии нет ни места на карте, ни
 * второго каталога, с которым её связывают. Спрашивают имя, отвечают сроком.
 */
export const HISTORY_MODE: ExerciseMode = {
  exerciseType: 'match-pair',
  title: 'История: династии и даты',
  eyebrow: 'Когда правила эта династия',
};

/**
 * «Культура» — одна игра: показан снимок, выбрать название. Формы `find-on-map`
 * у неё нет и быть не может — снимок не место на карте.
 */
export const CULTURE_MODE: ExerciseMode = {
  exerciseType: 'name-target',
  title: 'Культура: узнать по фотографии',
  eyebrow: 'Узнайте по фотографии',
};

/*
 * Названия карточек короче названий самих игр: предмет называет группа, и
 * повторять его в каждой карточке — значит писать «Физическая карта · Найти
 * на физической карте». На экране раунда названия остаются полными
 * (`PHYSICAL_MODES`, `HISTORY_MODE`, `CULTURE_MODE`): там группы рядом нет.
 */
export const MODE_CARDS: readonly ModeCard[] = [
  {
    id: 'find-on-map',
    kind: 'exercise',
    exerciseType: 'find-on-map',
    mark: '地',
    title: 'Найти на карте',
    summary:
      'Вопрос называет регион — ответ нажимается прямо на карте или выбирается из списка.',
    volume: '34 региона · около 7 минут',
    groupId: 'regions',
  },
  {
    id: 'name-target',
    kind: 'exercise',
    exerciseType: 'name-target',
    mark: '名',
    title: 'Назвать регион',
    summary:
      'Одна область подсвечена, четыре названия на выбор. Подписи выносок скрыты, чтобы карта не выдавала ответ.',
    volume: '34 региона · около 6 минут',
    groupId: 'regions',
  },
  {
    id: 'match-pair',
    kind: 'exercise',
    exerciseType: 'match-pair',
    mark: '都',
    title: 'Регион — столица',
    summary:
      'Подобрать административный центр к региону: русское название, иероглифы и пиньинь рядом.',
    volume: '34 пары · около 6 минут',
    groupId: 'regions',
  },
  {
    id: 'fill-map',
    kind: 'fill',
    mark: '填',
    title: 'Заполнить карту',
    summary:
      'Вся карта подряд, без вариантов ответа. Секундомер и разбор по числу попыток на регион.',
    volume: '34 региона · около 9 минут',
    groupId: 'regions',
  },
  {
    id: 'find-city',
    kind: 'city',
    exerciseType: 'find-on-map',
    mark: '市',
    title: 'Найти город',
    summary:
      'Вопрос называет город — ответ нажимается по точке на карте или выбирается из списка.',
    volume: 'Набор выбирается перед стартом · около 10 минут',
    groupId: 'cities',
  },
  {
    id: 'name-city',
    kind: 'city',
    exerciseType: 'name-target',
    mark: '认',
    title: 'Назвать город',
    summary:
      'Одна точка подсвечена, четыре имени на выбор. Отвлекающие берутся из соседей, а не с другого конца страны.',
    volume: 'Набор выбирается перед стартом · около 9 минут',
    groupId: 'cities',
  },
  {
    id: 'city-region',
    kind: 'city',
    exerciseType: 'match-pair',
    mark: '属',
    title: 'Город — регион',
    summary:
      'Назван город — нажать регион, в котором он стоит. Точки на карте скрыты, иначе они и есть ответ.',
    volume: 'Без городов центрального подчинения · около 9 минут',
    groupId: 'cities',
  },
  {
    id: 'find-physical',
    kind: 'physical',
    exerciseType: 'find-on-map',
    mark: '山',
    title: 'Найти объект',
    summary:
      'Вопрос называет реку или форму рельефа — ответ нажимается на карте или выбирается из списка. Реки и формы вперемешку: рельеф и течение рек связаны.',
    volume: '12 объектов · около 5 минут',
    groupId: 'physical',
  },
  {
    id: 'name-physical',
    kind: 'physical',
    exerciseType: 'name-target',
    mark: '河',
    title: 'Назвать объект',
    summary:
      'Один объект подсвечен, четыре имени на выбор. Реку отвлекают реками, форму — формами, иначе ответ читался бы по виду подсветки.',
    volume: '12 объектов · около 4 минут',
    groupId: 'physical',
  },
  {
    id: 'history',
    kind: 'history',
    mark: '史',
    title: 'Династии и даты',
    summary:
      'Названа династия — выбрать её срок из четырёх. Отвлекают сроки соседних по времени династий, а под вопросом идёт лента: длина каждой полосы — её настоящий век.',
    volume: '12 династий · около 4 минут',
    groupId: 'humanities',
  },
  {
    id: 'culture',
    kind: 'culture',
    mark: '文',
    title: 'Узнать по фотографии',
    summary:
      'Показан снимок — выбрать, что на нём, из четырёх названий. Отвлекают названия того же рода: памятник памятниками, гора горами, иначе ответ читался бы по виду кадра.',
    volume: 'Набор выбирается перед стартом · около 5 минут',
    groupId: 'humanities',
  },
];
