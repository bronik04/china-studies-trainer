import type { ExerciseType, Level } from '../../domain/round';

/**
 * `level` — не ступень лестницы, а собственные правила игры: какими
 * представлениями она спрашивает (`REPRESENTATIONS_BY_LEVEL`). Лестницы нет,
 * закрытых игр нет, и снаружи это число не показывается никогда.
 */
export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
  readonly level: Level;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
    level: 1,
  },
  'name-target': {
    exerciseType: 'name-target',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
    level: 1,
  },
  'match-pair': {
    exerciseType: 'match-pair',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
    level: 2,
  },
};

export const ALL_EXERCISE_TYPES: readonly ExerciseType[] = [
  'find-on-map',
  'name-target',
  'match-pair',
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
    id: 'name-target',
    kind: 'exercise',
    exerciseType: 'name-target',
    level: 1,
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
