import { lakeMarks } from './lake-marks';
import {
  MARINE_SHAPES,
  POINT_MARKS,
  RELIEF_SHAPES,
  WATER_LINES,
} from './physical-geometry';
import { parseMapPath } from './svg-path';
import { physicalTargetAt } from './physical-hit';
import { RIVER_SHAPES } from './river-hit';

/** Начало Янцзы в верховьях — оно же лежит на Тибетском нагорье. */
const yangtze = RIVER_SHAPES.find((river) => river.featureId === 'yangtze')!;
const [yangtzeX, yangtzeY] = yangtze.parts[0][0];

/*
 * Прежде побеждала форма: узел нагорья перехватывал нажатие, и правило
 * расстояния до реки до дела не доходило. Полоса реки — 8.6 единицы карты,
 * полторы единицы от линии в неё попадают.
 */
it('река побеждает форму, на которой лежит', () => {
  expect(physicalTargetAt(yangtzeX + 1.5, yangtzeY + 1.5, 1)).toBe('yangtze');
});

it('форма достаётся точке вдали от рек и озёр', () => {
  expect(physicalTargetAt(219, 360, 1)).toBe('tibetan-plateau');
});

/* Цинхай стоит на нагорье, и ни одна река не проходит через его цель. */
it('озеро побеждает форму', () => {
  const qinghai = lakeMarks(1).find((mark) => mark.featureId === 'qinghai-lake')!;

  expect(physicalTargetAt(qinghai.hitX, qinghai.hitY, 1)).toBe('qinghai-lake');
});

/*
 * Точка в Индии южнее Гималаев лежит внутри контура Тибетского нагорья: форма
 * выходит за границу страны. Маска прячет там ступени, но нажатия не
 * отсекает — без проверки суши нагорье выбиралось бы за границей.
 */
it('не отдаёт форму за границей страны', () => {
  expect(physicalTargetAt(120, 430, 1)).toBeNull();
});

/*
 * Точка на 650, 320 прежде была пустой водой, а с 2026-08-28 это Жёлтое море.
 * Пустое место ищется теперь севернее: Монголия за Гоби — ни суши Китая, ни
 * моря.
 */
it('молчит там, где нет ни воды, ни спрашиваемой формы', () => {
  expect(physicalTargetAt(400, 60, 1)).toBeNull();
});

/*
 * Пороги заданы в пикселях экрана: на увеличении те же 24 px занимают меньше
 * единиц карты, и полоса реки сужается вместе с ними. Иначе на 3× по реке
 * попадали бы за три её ширины.
 */
it('сужает полосу реки на увеличении', () => {
  const aside = [yangtzeX + 6, yangtzeY - 6] as const;

  expect(physicalTargetAt(aside[0], aside[1], 1)).toBe('yangtze');
  expect(physicalTargetAt(aside[0], aside[1], 3)).not.toBe('yangtze');
});

/*
 * Ревью 2026-08-28: правило «побеждает меньший» между формами не выполнялось.
 * Порядок проверки совпадал с порядком рисования, а рисуются крупные первыми,
 * чтобы нагорье не закрасило вложенное, — и нажатие по Куньлуню доставалось
 * Тибетскому нагорью. С клавиатуры оба отвечали верно: узел в фокусе зовёт
 * `onSelect` сам, минуя расчёт, — потому дефект и дожил до браузера.
 */
it('вложенная форма побеждает накрывающую', () => {
  const kunlun = RELIEF_SHAPES.find((shape) => shape.featureId === 'kunlun')!;

  expect(physicalTargetAt(kunlun.labelX!, kunlun.labelY!, 1)).toBe('kunlun');
});

/*
 * Страховка от дефекта Гималаев: подпись стоит там, куда целятся, и нажатие в
 * неё обязано достаться той самой цели. Проверяются все спрашиваемые формы
 * разом — новая форма попадает под проверку сама, без правки теста.
 */
it('каждая форма достаётся себе в точке своей подписи', () => {
  const asked = RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined);

  expect(asked.length).toBeGreaterThan(0);

  for (const shape of asked) {
    expect(
      physicalTargetAt(shape.labelX!, shape.labelY!, 1),
      `${shape.key}: подпись достаётся не своей цели`,
    ).toBe(shape.featureId);
  }
});

/*
 * Джомолунгма лежит внутри Гималаев, а те — внутри Тибетского нагорья. По
 * правилу «побеждает меньший» знак обязан опередить обе формы.
 */
it('крайняя точка побеждает форму, на которой стоит', () => {
  const everest = POINT_MARKS.find((mark) => mark.featureId === 'everest')!;

  expect(physicalTargetAt(everest.x, everest.y, 1)).toBe('everest');
});

/* Море — последнее в правиле, но своё место оно держать обязано. */
it('каждая морская цель достаётся себе в точке своей подписи', () => {
  for (const shape of MARINE_SHAPES) {
    expect(
      physicalTargetAt(shape.labelX, shape.labelY, 1),
      shape.featureId,
    ).toBe(shape.featureId);
  }
});

/*
 * Ущелья лежат на самой Янцзы, и обе линии стоят к точке вплотную. Побеждает
 * меньший объект — то же правило, что у вложенных форм рельефа, — и оно
 * названо, а не выведено из порядка записей в сгенерированном файле.
 */
it('на отрезке ущелий побеждает ущелье, а не река', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges')!;
  const [x, y] = parseMapPath(gorges.d).flat()[1];

  expect(physicalTargetAt(x, y, 1)).toBe('three-gorges');
});

it('сразу за концом участка Янцзы снова становится Янцзы', () => {
  const river = parseMapPath(
    WATER_LINES.find((line) => line.featureId === 'yangtze')!.d,
  ).flat();
  const gorges = parseMapPath(
    WATER_LINES.find((line) => line.featureId === 'three-gorges')!.d,
  ).flat();
  const east = gorges[gorges.length - 1];

  /*
   * Граница участка проверяется у самой границы, а не в истоке за триста
   * единиц: там спора нет вовсе, и проверка ничего не сторожила бы.
   */
  const beyond = river
    .filter((point) => point[0] > east[0])
    .sort(
      (left, right) =>
        Math.hypot(left[0] - east[0], left[1] - east[1]) -
        Math.hypot(right[0] - east[0], right[1] - east[1]),
    )[0];

  expect(Math.hypot(beyond[0] - east[0], beyond[1] - east[1])).toBeLessThan(12);
  expect(physicalTargetAt(beyond[0], beyond[1], 1)).toBe('yangtze');
});

/*
 * Канал попадает в цель так же, как река: средняя вершина северной части
 * далека и от Хуанхэ, и от озёр.
 */
it('нажатие по каналу достаётся каналу', () => {
  const canal = WATER_LINES.find((line) => line.featureId === 'grand-canal')!;
  const north = parseMapPath(canal.d)[0];
  const [x, y] = north[Math.floor(north.length / 2)];

  expect(physicalTargetAt(x, y, 1)).toBe('grand-canal');
});

/* Канал идёт восточным берегом Хунцзэху, но знак озера по-прежнему его. */
it('знак Хунцзэху канал не перехватывает', () => {
  const hongze = lakeMarks(1).find((mark) => mark.featureId === 'hongze')!;

  expect(physicalTargetAt(hongze.hitX, hongze.hitY, 1)).toBe('hongze');
});
