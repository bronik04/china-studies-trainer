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
 * 市 город, 认 узнавать, 属 принадлежать, 史 история, 文 культура. Он же отличает карточки друг от друга, когда цвета
 * на бумаге у них одинаковые.
 */
export type ModeCard = {
  readonly id: string;
  readonly mark: string;
  readonly title: string;
  readonly summary: string;
  /** Что спрашивают и сколько: «34 региона · около 7 минут». */
  readonly volume: string;
} & (
  | { readonly kind: 'exercise'; readonly exerciseType: ExerciseType }
  /** Игра по городам: цели берутся из справочника городов, а не регионов. */
  | { readonly kind: 'city'; readonly exerciseType: ExerciseType }
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
  },
  {
    id: 'fill-map',
    kind: 'fill',
    mark: '填',
    title: 'Заполнить карту',
    summary:
      'Вся карта подряд, без вариантов ответа. Секундомер и разбор по числу попыток на регион.',
    volume: '34 региона · около 9 минут',
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
  },
  {
    id: 'history',
    kind: 'planned',
    mark: '史',
    title: 'История: династии и даты',
    summary: 'Лента династий, ключевые даты и связь события с местом на карте.',
    volume: 'Содержание проверяется по школьной программе',
  },
  {
    id: 'culture',
    kind: 'planned',
    mark: '文',
    title: 'Культура: узнать по фотографии',
    summary:
      'Памятник, праздник или ремесло — назвать и найти регион, где это увидят.',
    volume: 'Работает вместе с коллекциями',
  },
];
