import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from './target-size';

/**
 * Что видно на карте: во сколько раз увеличено и какая точка в середине.
 *
 * Увеличение делается сменой `viewBox`, а не масштабированием картинки.
 * Разница не косметическая: `viewBox` — та же система координат, в которой
 * лежат области, выноски, цели нажатия и точки городов, поэтому при сдвиге
 * они едут вместе с картой и попадают под курсор там, где нарисованы. При
 * `transform: scale` пришлось бы держать вторую систему координат и переводить
 * между ними каждое нажатие.
 */
export type MapView = {
  readonly zoom: number;
  readonly centerX: number;
  readonly centerY: number;
};

const FULL = {
  minX: MAP_VIEWBOX_MIN_X,
  minY: MAP_VIEWBOX_MIN_Y,
  width: MAP_VIEWBOX_WIDTH,
  height: MAP_VIEWBOX_HEIGHT,
} as const;

export const WHOLE_MAP: MapView = {
  zoom: 1,
  centerX: FULL.minX + FULL.width / 2,
  centerY: FULL.minY + FULL.height / 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Середина вида не уходит дальше, чем нужно, чтобы за краем карты не
 * показалась пустота: на единичном увеличении середина одна-единственная.
 */
export function clampView(view: MapView): MapView {
  const width = FULL.width / view.zoom;
  const height = FULL.height / view.zoom;

  return {
    zoom: view.zoom,
    centerX: clamp(
      view.centerX,
      FULL.minX + width / 2,
      FULL.minX + FULL.width - width / 2,
    ),
    centerY: clamp(
      view.centerY,
      FULL.minY + height / 2,
      FULL.minY + FULL.height - height / 2,
    ),
  };
}

export function viewBoxOf(view: MapView): string {
  const { zoom, centerX, centerY } = clampView(view);
  const width = FULL.width / zoom;
  const height = FULL.height / zoom;

  return `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`;
}

/** Сдвиг в единицах карты: тянут за саму карту, поэтому вид едет навстречу. */
export function panView(view: MapView, dx: number, dy: number): MapView {
  return clampView({ ...view, centerX: view.centerX + dx, centerY: view.centerY + dy });
}

/**
 * Смена увеличения сохраняет середину, а не возвращает к центру страны: место,
 * которое разглядывают, должно остаться на экране. Возврат к целому виду —
 * отдельная кнопка «Сбросить вид».
 */
export function zoomView(view: MapView, zoom: number): MapView {
  return clampView({ ...view, zoom });
}

/**
 * Сколько единиц карты приходится на пиксель экрана. Нужно, чтобы карта под
 * курсором ехала ровно за ним, а не быстрее или медленнее.
 *
 * Считается по обеим сторонам рамки, а не по одной ширине. Пока рамка держала
 * пропорцию карты, ширины хватало; в атласе рамка теперь занимает колонку
 * целиком, карта вписана в неё с полями по бокам, и счёт по ширине рамки
 * давал бы ход руки, не совпадающий с ходом карты. Правило вписывания то же,
 * что у `pointAtClient`, — `xMidYMid meet`.
 */
export function unitsPerPixel(view: MapView, rect: MapFitRect): number {
  const { zoom } = clampView(view);

  return 1 / Math.min(rect.width / (FULL.width / zoom), rect.height / (FULL.height / zoom));
}

/** Рамка показа: только те стороны, по которым карту вписывают. */
export type MapFitRect = {
  readonly width: number;
  readonly height: number;
};

/** Шаг клавиатуры — десятая часть видимого, как у прокрутки строкой. */
export function keyboardStep(view: MapView): number {
  return FULL.width / view.zoom / 10;
}

/** Прямоугольник карты на экране — та часть `DOMRect`, что здесь нужна. */
export type ScreenRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Где на карте оказалась точка экрана.
 *
 * Нужно там, где цель нажатия — не узел разметки: у реки её нет, и какая река
 * под курсором, решает расстояние (`riverAt`). Считается тут, а не через
 * `getScreenCTM`, по двум причинам: функция остаётся чистой и проверяемой, а
 * `viewBox` и так живёт в этом модуле — двух источников правды о нём быть не
 * должно.
 *
 * Поля учитываются: `preserveAspectRatio` по умолчанию (`xMidYMid meet`)
 * вписывает карту целиком и делит остаток рамки поровну. В атласе рамка
 * занимает колонку целиком и полей по бокам там как раз хватает; на других
 * поверхностях она может оказаться любой.
 */
export function pointAtClient(
  view: MapView,
  rect: ScreenRect,
  clientX: number,
  clientY: number,
): readonly [number, number] {
  const { zoom, centerX, centerY } = clampView(view);
  const boxWidth = FULL.width / zoom;
  const boxHeight = FULL.height / zoom;

  const scale = Math.min(rect.width / boxWidth, rect.height / boxHeight);
  const padX = (rect.width - boxWidth * scale) / 2;
  const padY = (rect.height - boxHeight * scale) / 2;

  return [
    centerX - boxWidth / 2 + (clientX - rect.left - padX) / scale,
    centerY - boxHeight / 2 + (clientY - rect.top - padY) / scale,
  ];
}
