import type { PhysicalFeature, ReliefStep } from './types';

/**
 * Двенадцать целей физической географии: шесть рек и шесть форм рельефа.
 * Состав утверждён владельцем продукта 2026-08-05.
 *
 * Реки взяты не по одной длине, а по типам бассейнов: тихоокеанский сток,
 * северная граница с Россией, трансграничная река и бессточный запад. Формы —
 * по одной-две на каждую ступень рельефа.
 *
 * Координат здесь нет и не будет: справочник не зависит от файла карты.
 * Геометрия живёт в `src/map/physical-geometry.ts`, её пишет генератор.
 *
 * `regionIds` перечисляет только те регионы, по которым объект проходит явно.
 * Пограничные случаи — Янцзы вдоль межи Хубэя и Хунани, Наньпаньцзян по меже
 * Юньнани и Гуйчжоу — не заявляются: `validate:map` требует, чтобы каждый
 * заявленный регион был действительно задет, а генерализованная линия у самой
 * межи может лечь по любую её сторону.
 */

const RIVERS = ['natural-earth-rivers-5.1.2'] as const;
const LANDFORMS = ['natural-earth-geography-regions-5.1.2'] as const;

function river(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  riverNums: readonly number[],
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'river',
    nameRu,
    nameZh,
    pinyin,
    riverNums,
    regionIds,
    facts: [],
    sourceIds: RIVERS,
  };
}

function landform(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  step: ReliefStep,
  shape: 'plateau' | 'plain' | 'basin' | 'desert',
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'landform',
    nameRu,
    nameZh,
    pinyin,
    step,
    landform: shape,
    regionIds,
    facts: [],
    sourceIds: LANDFORMS,
  };
}

export const physicalFeatures: readonly PhysicalFeature[] = [
  river('yangtze', 'Янцзы', '长江', 'Cháng Jiāng', [11, 13, 15, 18, 1], [
    'qinghai',
    'sichuan',
    'yunnan',
    'chongqing',
    'hubei',
    'anhui',
    'jiangsu',
  ]),
  river('yellow-river', 'Хуанхэ', '黄河', 'Huáng Hé', [66, 95], [
    'qinghai',
    'gansu',
    'ningxia',
    'inner-mongolia',
    'shaanxi',
    'shanxi',
    'henan',
    'shandong',
  ]),
  river('heilongjiang', 'Хэйлунцзян', '黑龙江', 'Hēilóng Jiāng', [74, 84, 93, 72], [
    'inner-mongolia',
    'heilongjiang',
  ]),
  river('pearl-river', 'Чжуцзян', '珠江', 'Zhū Jiāng', [128, 147, 148, 149, 96], [
    'yunnan',
    'guangxi',
    'guangdong',
  ]),
  river('lancang', 'Ланьцанцзян', '澜沧江', 'Láncāng Jiāng', [35, 40], [
    'qinghai',
    'tibet',
    'yunnan',
  ]),
  river('tarim', 'Тарим', '塔里木河', 'Tǎlǐmù Hé', [242, 349], ['xinjiang']),

  landform(
    'tibetan-plateau',
    'Тибетское нагорье',
    '青藏高原',
    'Qīngzàng Gāoyuán',
    1,
    'plateau',
    ['tibet', 'qinghai'],
  ),
  landform('tarim-basin', 'Таримская впадина', '塔里木盆地', 'Tǎlǐmù Péndì', 2, 'basin', [
    'xinjiang',
  ]),
  landform('loess-plateau', 'Лёссовое плато', '黄土高原', 'Huángtǔ Gāoyuán', 2, 'plateau', [
    'shanxi',
    'shaanxi',
    'gansu',
  ]),
  landform(
    'sichuan-basin',
    'Сычуаньская котловина',
    '四川盆地',
    'Sìchuān Péndì',
    2,
    'basin',
    ['sichuan', 'chongqing'],
  ),
  landform('gobi', 'Гоби', '戈壁', 'Gēbì', 2, 'desert', ['inner-mongolia']),
  landform(
    'north-china-plain',
    'Великая Китайская равнина',
    '华北平原',
    'Huáběi Píngyuán',
    3,
    'plain',
    ['hebei', 'henan', 'shandong'],
  ),
];
