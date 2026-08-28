import { lakeMarks } from './lake-marks';
import { RELIEF_SHAPES } from './physical-geometry';
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

it('молчит там, где нет ни реки, ни озера, ни спрашиваемой формы', () => {
  expect(physicalTargetAt(650, 320, 1)).toBeNull();
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
