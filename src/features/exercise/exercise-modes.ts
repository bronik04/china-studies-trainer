import type { ExerciseType, Level } from '../../domain/round';

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
  'name-region': {
    exerciseType: 'name-region',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
  },
  'match-capital': {
    exerciseType: 'match-capital',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
  },
};

export const ALL_EXERCISE_TYPES: readonly ExerciseType[] = [
  'find-on-map',
  'name-region',
  'match-capital',
];

/**
 * Карточка режима на главной. Описывает режим для того, кто ещё не пробовал:
 * что спрашивают, на каком уровне открывается и сколько это займёт.
 *
 * Заполнение карты — не `ExerciseType`: это отдельный вид раунда со своим
 * экраном и своим счётом попыток. Поэтому карточка помечена видом, а не просто
 * типом задания, и главная запускает её другим вызовом.
 *
 * Иероглиф — метка, а не украшение: 地 земля, 名 имя, 都 столица, 填 заполнять,
 * 史 история, 文 культура. Он же отличает карточки друг от друга, когда цвета
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
  | { readonly kind: 'exercise'; readonly exerciseType: ExerciseType; readonly level: Level }
  | { readonly kind: 'fill'; readonly level: Level }
  /** Режим объявлен, но ещё не написан: карточка не запускается. */
  | { readonly kind: 'planned' }
);

export const MODE_CARDS: readonly ModeCard[] = [
  {
    id: 'find-on-map',
    kind: 'exercise',
    exerciseType: 'find-on-map',
    level: 1,
    mark: '地',
    title: 'Найти на карте',
    summary:
      'Вопрос называет регион — ответ нажимается прямо на карте или выбирается из списка.',
    volume: '34 региона · около 7 минут',
  },
  {
    id: 'name-region',
    kind: 'exercise',
    exerciseType: 'name-region',
    level: 1,
    mark: '名',
    title: 'Назвать регион',
    summary:
      'Одна область подсвечена, четыре названия на выбор. Подписи выносок скрыты, чтобы карта не выдавала ответ.',
    volume: '34 региона · около 6 минут',
  },
  {
    id: 'match-capital',
    kind: 'exercise',
    exerciseType: 'match-capital',
    level: 2,
    mark: '都',
    title: 'Регион — столица',
    summary:
      'Подобрать административный центр к региону: русское название, иероглифы и пиньинь рядом.',
    volume: '34 пары · около 6 минут',
  },
  {
    id: 'fill-map',
    kind: 'fill',
    level: 3,
    mark: '填',
    title: 'Заполнить карту',
    summary:
      'Вся карта подряд, без вариантов ответа. Секундомер и разбор по числу попыток на регион.',
    volume: '34 региона · около 9 минут',
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
