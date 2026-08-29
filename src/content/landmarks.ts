import type { Fact } from './types';

/**
 * Справочник достопримечательностей. Третий каталог учебных целей рядом с
 * регионами и городами.
 *
 * Отбор внешний, а не вкусовой: костяк — объекты Всемирного наследия, к ним
 * добавлены четыре современных сооружения, которых в этом списке нет и быть не
 * может. Отдельного поля «входит в наследие» нет: это свойство источника, а не
 * объекта, и читается по `sourceIds`.
 *
 * Координаты — в градусах и из Викиданных (CC0), как у трёх городов, которых
 * нет в Natural Earth. Проекцию применяет слой карты: если карта заменится,
 * звёзды переедут пересчётом, а не станут молча неверными.
 *
 * Род (`kind`) режет наборы и отбирает отвлекающие. Он же говорит, чем объект
 * сделан: рукотворное, природное место или современное сооружение. На карте
 * род не виден — знак у всех один, звезда, — иначе вид знака сужал бы выбор
 * прежде, чем ученик прочитает варианты.
 */

export type LandmarkKind = 'monument' | 'nature' | 'modern';

export type Landmark = {
  readonly id: string;
  readonly regionId: string;
  readonly kind: LandmarkKind;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /** Градусы, как у городов: проекцию применяет слой, а не каталог. */
  readonly lon: number;
  readonly lat: number;
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};

const WIKIDATA = 'wikidata-landmarks-2026-08-28';

function landmark(
  id: string,
  regionId: string,
  kind: LandmarkKind,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  lon: number,
  lat: number,
  facts: readonly Fact[],
  sourceIds: readonly string[],
): Landmark {
  return {
    id,
    regionId,
    kind,
    nameRu,
    nameZh,
    pinyin,
    lon,
    lat,
    facts,
    sourceIds: [WIKIDATA, ...sourceIds],
  };
}

export const landmarks: readonly Landmark[] = [
  landmark(
    'forbidden-city',
    'beijing',
    'monument',
    'Запретный город',
    '故宫',
    'Gùgōng',
    116.39083,
    39.91583,
    [
      {
        title: 'Престол двух династий',
        body:
          'Дворец строили с 1406 по 1420 год при минском императоре Чжу Ди. За следующие 505 лет здесь взошли на престол 14 минских и 10 цинских императоров.',
        sourceIds: ['unesco-imperial-palaces-439'],
      },
    ],
    ['unesco-imperial-palaces-439'],
  ),
  landmark(
    'temple-of-heaven',
    'beijing',
    'monument',
    'Храм Неба',
    '天坛',
    'Tiāntán',
    116.4066,
    39.8822,
    [
      {
        title: 'Где просили урожая',
        body:
          'Храм основан в первой половине XV века. С юга на север по одной оси стоят круглый жертвенник под открытым небом, Императорский свод небес и трёхъярусный Зал моления о богатом урожае.',
        sourceIds: ['unesco-temple-of-heaven-881'],
      },
    ],
    ['unesco-temple-of-heaven-881'],
  ),
  landmark(
    'summer-palace',
    'beijing',
    'monument',
    'Летний дворец',
    '颐和园',
    'Yíhéyuán',
    116.2689,
    39.9975,
    [
      {
        title: 'Сад, построенный дважды',
        body:
          'Заложен в 1750 году как Сад чистой ряби, разрушен в войну 1860 года и восстановлен на прежних основаниях в 1886-м. Основа замысла — озеро Куньминху и гора Долголетия.',
        sourceIds: ['unesco-summer-palace-880'],
      },
    ],
    ['unesco-summer-palace-880'],
  ),
  landmark(
    'chengde',
    'hebei',
    'monument',
    'Горная резиденция в Чэндэ',
    '避暑山庄',
    'Bìshǔ Shānzhuāng',
    117.9375,
    40.9875,
    [
      {
        title: 'Летняя столица Цин',
        body:
          'Резиденцию строили с 1703 по 1792 год. Вместе с окрестными храмами она занимает 611,2 гектара — это крупнейший сохранившийся императорский дворцово-парковый и храмовый ансамбль Китая.',
        sourceIds: ['unesco-chengde-703'],
      },
    ],
    ['unesco-chengde-703'],
  ),
  landmark(
    'mukden-palace',
    'liaoning',
    'monument',
    'Мукденский дворец',
    '沈阳故宫',
    'Shěnyáng Gùgōng',
    123.45,
    41.79583,
    [
      {
        title: 'Дворец до Пекина',
        body:
          '114 зданий, построенных между 1625–26 и 1783 годами. Отсюда правили предки цинского дома, пока в 1644 году не утвердились в Пекине; после этого дворец стал запасным.',
        sourceIds: ['unesco-imperial-palaces-439'],
      },
    ],
    ['unesco-imperial-palaces-439'],
  ),
  landmark(
    'koguryo',
    'jilin',
    'monument',
    'Столицы Когурё',
    '高句丽王城',
    'Gāogōulí Wángchéng',
    126.15711,
    41.14653,
    [
      {
        title: 'Три города и сорок гробниц',
        body:
          'Памятник объединяет три городища и 40 гробниц — 14 царских и 26 знатных. Звезда стоит на городище Ваньду близ Цзиани, одной из столиц царства Когурё, правившего с 277 года до н. э. по 668 год н. э.',
        sourceIds: ['unesco-koguryo-1135'],
      },
    ],
    ['unesco-koguryo-1135'],
  ),
  landmark(
    'xanadu',
    'inner-mongolia',
    'monument',
    'Шанду',
    '元上都',
    'Yuán Shàngdū',
    116.18516,
    42.35802,
    [
      {
        title: 'Столица Хубилая',
        body:
          'Город спланировал в 1256 году советник Хубилая Лю Бинчжун. На 25 тысячах гектаров сошлись кочевой монгольский и оседлый ханьский уклады; отсюда пошла династия Юань.',
        sourceIds: ['unesco-xanadu-1389'],
      },
    ],
    ['unesco-xanadu-1389'],
  ),
  landmark(
    'yungang',
    'shanxi',
    'monument',
    'Гроты Юньган',
    '云冈石窟',
    'Yúngāng Shíkū',
    113.12222,
    40.10972,
    [
      {
        title: 'Пятьдесят одна тысяча изваяний',
        body:
          '252 пещеры и ниши, 51 тысяча статуй на 18 тысячах квадратных метров резьбы. Гроты вырубали с середины V до начала VI века.',
        sourceIds: ['unesco-yungang-1039'],
      },
    ],
    ['unesco-yungang-1039'],
  ),
  landmark(
    'pingyao',
    'shanxi',
    'monument',
    'Древний город Пинъяо',
    '平遥古城',
    'Píngyáo Gǔchéng',
    112.17667,
    37.19889,
    [
      {
        title: 'Банковская столица',
        body:
          'Город основан в XIV веке и сохранил облик имперской эпохи. В XIX и начале XX века Пинъяо был главным банковским центром всего Китая.',
        sourceIds: ['unesco-pingyao-812'],
      },
    ],
    ['unesco-pingyao-812'],
  ),
  landmark(
    'western-xia-tombs',
    'ningxia',
    'monument',
    'Гробницы Западной Ся',
    '西夏陵',
    'Xīxià Líng',
    105.98717,
    38.43503,
    [
      {
        title: 'Некрополь исчезнувшего царства',
        body:
          'У подножия гор Хэланьшань стоят девять императорских мавзолеев, 271 подчинённая гробница и 32 противопаводковых сооружения. Государство Западная Ся основали тангуты в 1038 году; в 1227-м оно пало под ударом войск Чингисхана.',
        sourceIds: ['unesco-xixia-tombs-1736'],
      },
    ],
    ['unesco-xixia-tombs-1736'],
  ),
  landmark(
    'mogao',
    'gansu',
    'monument',
    'Пещеры Могао',
    '莫高窟',
    'Mògāo Kū',
    94.80417,
    40.03722,
    [
      {
        title: 'Тысяча лет росписи',
        body:
          'Первую пещеру вырубили в 366 году. Сохранились 492 пещеры: около 45 тысяч квадратных метров росписей и более двух тысяч раскрашенных скульптур.',
        sourceIds: ['unesco-mogao-440'],
      },
    ],
    ['unesco-mogao-440'],
  ),
  landmark(
    'gaochang',
    'xinjiang',
    'monument',
    'Городище Гаочан',
    '高昌故城',
    'Gāochāng Gùchéng',
    89.52059,
    42.8468,
    [
      {
        title: 'Город, который сокрушила Тан',
        body:
          'В 450 году здесь возникло государство Гаочан. В 640-м западные походы династии Тан сокрушили его силу, хотя мелкие владения держались тут ещё несколько веков.',
        sourceIds: ['britannica-turfan'],
      },
    ],
    ['britannica-turfan'],
  ),
  landmark(
    'potala',
    'tibet',
    'monument',
    'Дворец Потала',
    '布达拉宫',
    'Bùdálā Gōng',
    91.11694,
    29.65778,
    [
      {
        title: 'Дворец на Красной горе',
        body:
          'Зимняя резиденция далай-лам с VII века. Белый и Красный дворцы с пристройками стоят на Красной горе посреди Лхасской долины, на высоте 3700 метров.',
        sourceIds: ['unesco-potala-707'],
      },
    ],
    ['unesco-potala-707'],
  ),
];

const landmarkIndex = new Map(landmarks.map((one) => [one.id, one]));

export function landmarkById(id: string): Landmark | undefined {
  return landmarkIndex.get(id);
}
