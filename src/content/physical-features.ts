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
const LAKES = ['natural-earth-lakes-5.1.2'] as const;

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
  shape: 'plateau' | 'plain' | 'basin' | 'desert' | 'range',
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

function lake(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  lakeIds: readonly number[],
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'lake',
    nameRu,
    nameZh,
    pinyin,
    lakeIds,
    regionIds,
    facts: [],
    sourceIds: LAKES,
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

  /*
   * Хребты взяты не по высоте: шесть самых высоких лежали бы все на западе, и
   * восточная половина карты осталась бы пустой. Эти шесть закрывают все
   * четыре направления школьной классификации 山脉走向, включают Циньлин —
   * границу севера и юга — и попутно распределены по всем трём ступеням, то
   * есть сами показывают ту лестницу, ради которой режим и сделан.
   */
  landform('himalayas', 'Гималаи', '喜马拉雅山脉', 'Xǐmǎlāyǎ Shānmài', 1, 'range', [
    'tibet',
  ]),
  landform('kunlun', 'Куньлунь', '昆仑山脉', 'Kūnlún Shānmài', 1, 'range', [
    'xinjiang',
    'tibet',
    'qinghai',
  ]),
  landform('tian-shan', 'Тянь-Шань', '天山', 'Tiān Shān', 2, 'range', ['xinjiang']),
  landform('qinling', 'Циньлин', '秦岭', 'Qín Lǐng', 2, 'range', [
    'shaanxi',
    'gansu',
    'henan',
  ]),
  landform(
    'greater-khingan',
    'Большой Хинган',
    '大兴安岭',
    'Dà Xīng’ān Lǐng',
    2,
    'range',
    ['inner-mongolia', 'heilongjiang'],
  ),
  landform('nanling', 'Наньлин', '南岭', 'Nán Lǐng', 3, 'range', [
    'hunan',
    'jiangxi',
    'guangdong',
    'guangxi',
  ]),

  /*
   * Пять пресных — 五大淡水湖 — в китайской школе заучивают списком целиком, и
   * разрывать его ради географического разброса значило бы менять готовый
   * учебный предмет на собственную выдумку. Цинхай добавлен шестым: без него
   * набор не знает ни самого большого озера страны, ни запада вовсе.
   *
   * Номера получены из самого набора, а не набраны по памяти: неверный номер
   * дал бы на карте чужое озеро при зелёной сборке.
   */
  lake('qinghai-lake', 'Цинхай', '青海湖', 'Qīnghǎi Hú', [1159126725], [
    'qinghai',
  ]),
  lake('poyang', 'Поянху', '鄱阳湖', 'Póyáng Hú', [1159114015], ['jiangxi']),
  lake('dongting', 'Дунтинху', '洞庭湖', 'Dòngtíng Hú', [1159116351], ['hunan']),
  lake('taihu', 'Тайху', '太湖', 'Tài Hú', [1159113611], ['jiangsu', 'zhejiang']),
  lake('hongze', 'Хунцзэху', '洪泽湖', 'Hóngzé Hú', [1159113359], ['jiangsu']),
  lake('chaohu', 'Чаоху', '巢湖', 'Cháo Hú', [1159115069], ['anhui']),
];
