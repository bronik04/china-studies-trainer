import type { City, CitySet } from './types';

/**
 * Справочник городов. Второй набор учебных целей рядом с регионами.
 *
 * Координаты — в градусах и из Natural Earth (public domain): набор даёт и
 * долготу с широтой, и русское с китайским написанием для сверки. Четырёх
 * городов в нём нет — Пинъяо, Цюйфу, Яньань и Суйфэньхэ мельче его порога, —
 * и они взяты из Викиданных (CC0). Источник у каждого города свой, а не общий
 * на файл: иначе первая же замена одного города соврала бы про остальные.
 *
 * Русские и китайские имена столиц берутся из `regions.ts`, где они уже
 * сверены по двум источникам, и здесь не переписываются заново.
 */

const NATURAL_EARTH = ['natural-earth-populated-places-5.1.2'] as const;
const WIKIDATA = ['wikidata-coordinates-2026-08-05'] as const;

function city(
  id: string,
  regionId: string,
  set: CitySet,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  lon: number,
  lat: number,
  sourceIds: readonly string[] = NATURAL_EARTH,
): City {
  return { id, regionId, set, nameRu, nameZh, pinyin, lon, lat, sourceIds };
}

/**
 * Административные центры 34 единиц провинциального уровня — по одному на
 * регион. У муниципалитетов и САР город и регион совпадают именем: это две
 * разные цели в одной точке, поэтому вид входит в саму цель (`Target`).
 */
const capitals: readonly City[] = [
  city('hefei', 'anhui', 'capital', 'Хэфэй', '合肥', 'Héféi', 117.278068, 31.851977),
  city('fuzhou', 'fujian', 'capital', 'Фучжоу', '福州', 'Fúzhōu', 119.2981, 26.081942),
  city('lanzhou', 'gansu', 'capital', 'Ланьчжоу', '兰州', 'Lánzhōu', 103.790054, 36.057974),
  city('guangzhou', 'guangdong', 'capital', 'Гуанчжоу', '广州', 'Guǎngzhōu', 113.323064, 23.146927),
  city('guiyang', 'guizhou', 'capital', 'Гуйян', '贵阳', 'Guìyáng', 106.718093, 26.581989),
  city('haikou', 'hainan', 'capital', 'Хайкоу', '海口', 'Hǎikǒu', 110.320026, 20.050002),
  city('shijiazhuang', 'hebei', 'capital', 'Шицзячжуан', '石家庄', 'Shíjiāzhuāng', 114.478033, 38.051961),
  city('harbin', 'heilongjiang', 'capital', 'Харбин', '哈尔滨', 'Hā’ěrbīn', 126.648039, 45.75193),
  city('zhengzhou', 'henan', 'capital', 'Чжэнчжоу', '郑州', 'Zhèngzhōu', 113.663147, 34.756942),
  city('wuhan', 'hubei', 'capital', 'Ухань', '武汉', 'Wǔhàn', 114.268071, 30.581977),
  city('changsha', 'hunan', 'capital', 'Чанша', '长沙', 'Chángshā', 112.968047, 28.201916),
  city('nanjing', 'jiangsu', 'capital', 'Нанкин', '南京', 'Nánjīng', 118.778029, 32.051965),
  city('nanchang', 'jiangxi', 'capital', 'Наньчан', '南昌', 'Nánchāng', 115.87805, 28.681938),
  city('changchun', 'jilin', 'capital', 'Чанчунь', '长春', 'Chángchūn', 125.338042, 43.866954),
  city('shenyang', 'liaoning', 'capital', 'Шэньян', '沈阳', 'Shěnyáng', 123.448028, 41.806925),
  city('xining', 'qinghai', 'capital', 'Синин', '西宁', 'Xīníng', 101.768059, 36.621945),
  city('xian', 'shaanxi', 'capital', 'Сиань', '西安', 'Xī’ān', 108.89305, 34.276971),
  city('jinan', 'shandong', 'capital', 'Цзинань', '济南', 'Jǐnán', 116.993073, 36.676928),
  city('taiyuan', 'shanxi', 'capital', 'Тайюань', '太原', 'Tàiyuán', 112.543112, 37.876958),
  city('chengdu', 'sichuan', 'capital', 'Чэнду', '成都', 'Chéngdū', 104.068074, 30.671946),
  city('kunming', 'yunnan', 'capital', 'Куньмин', '昆明', 'Kūnmíng', 102.678029, 25.071926),
  city('hangzhou', 'zhejiang', 'capital', 'Ханчжоу', '杭州', 'Hángzhōu', 120.168073, 30.25192),
  city('taipei', 'taiwan', 'capital', 'Тайбэй', '台北', 'Táiběi', 121.568333, 25.035833),
  city('nanning', 'guangxi', 'capital', 'Наньнин', '南宁', 'Nánníng', 108.318099, 22.821934),
  city('hohhot', 'inner-mongolia', 'capital', 'Хух-Хото', '呼和浩特', 'Hūhéhàotè', 111.65805, 40.821921),
  city('yinchuan', 'ningxia', 'capital', 'Иньчуань', '银川', 'Yínchuān', 106.271092, 38.46992),
  city('urumqi', 'xinjiang', 'capital', 'Урумчи', '乌鲁木齐', 'Wūlǔmùqí', 87.57306, 43.806958),
  city('lhasa', 'tibet', 'capital', 'Лхаса', '拉萨', 'Lāsà', 91.10001, 29.645024),
  city('beijing', 'beijing', 'capital', 'Пекин', '北京', 'Běijīng', 116.38634, 39.930838),
  city('chongqing', 'chongqing', 'capital', 'Чунцин', '重庆', 'Chóngqìng', 106.593036, 29.566923),
  city('shanghai', 'shanghai', 'capital', 'Шанхай', '上海', 'Shànghǎi', 121.434559, 31.218398),
  city('tianjin', 'tianjin', 'capital', 'Тяньцзинь', '天津', 'Tiānjīn', 117.198073, 39.131972),
  city('hong-kong', 'hong-kong', 'capital', 'Гонконг', '香港', 'Xiānggǎng', 114.183064, 22.306927),
  city('macao', 'macao', 'capital', 'Макао', '澳门', 'Àomén', 113.545048, 22.202998),
];

/** Города, которые всё равно всплывают на уроке: экономика, история, природа. */
const notable: readonly City[] = [
  city('shenzhen', 'guangdong', 'notable', 'Шэньчжэнь', '深圳', 'Shēnzhèn', 114.120177, 22.554316),
  city('suzhou', 'jiangsu', 'notable', 'Сучжоу', '苏州', 'Sūzhōu', 120.618071, 31.302424),
  city('wuxi', 'jiangsu', 'notable', 'Уси', '无锡', 'Wúxī', 120.298039, 31.581942),
  city('qingdao', 'shandong', 'notable', 'Циндао', '青岛', 'Qīngdǎo', 120.328063, 36.091925),
  city('dalian', 'liaoning', 'notable', 'Далянь', '大连', 'Dàlián', 121.627885, 38.924784),
  city('xiamen', 'fujian', 'notable', 'Сямэнь', '厦门', 'Xiàmén', 118.078071, 24.451938),
  city('ningbo', 'zhejiang', 'notable', 'Нинбо', '宁波', 'Níngbō', 121.548092, 29.881917),
  city('sanya', 'hainan', 'notable', 'Санья', '三亚', 'Sānyà', 109.504032, 18.259105),
  city('luoyang', 'henan', 'notable', 'Лоян', '洛阳', 'Luòyáng', 112.468129, 34.681934),
  city('kaifeng', 'henan', 'notable', 'Кайфэн', '开封', 'Kāifēng', 114.348066, 34.851949),
  city('datong', 'shanxi', 'notable', 'Датун', '大同', 'Dàtóng', 113.298053, 40.081966),
  city('pingyao', 'shanxi', 'notable', 'Пинъяо', '平遥', 'Píngyáo', 112.176667, 37.198889, WIKIDATA),
  city('qufu', 'shandong', 'notable', 'Цюйфу', '曲阜', 'Qūfù', 116.983333, 35.6, WIKIDATA),
  city('yanan', 'shaanxi', 'notable', 'Яньань', '延安', 'Yán’ān', 109.48628, 36.59523, WIKIDATA),
  city('dunhuang', 'gansu', 'notable', 'Дуньхуан', '敦煌', 'Dūnhuáng', 94.662015, 40.142678),
  city('turpan', 'xinjiang', 'notable', 'Турфан', '吐鲁番', 'Tǔlǔfān', 89.165038, 42.935375),
  city('kashgar', 'xinjiang', 'notable', 'Кашгар', '喀什', 'Kāshí', 75.969926, 39.476336),
  city('lijiang', 'yunnan', 'notable', 'Лицзян', '丽江', 'Lìjiāng', 100.266582, 26.800004),
  city('guilin', 'guangxi', 'notable', 'Гуйлинь', '桂林', 'Guìlín', 110.278082, 25.281939),
  city('shigatse', 'tibet', 'notable', 'Шигадзе', '日喀则', 'Rìkāzé', 88.88335, 29.250009),
];

/**
 * Города на границе с Россией. Отдельным набором, а не внутри значимых: их
 * ценность для русскоязычного класса особая, и включать их отдельно — решение
 * ученика, а не составителя каталога.
 */
const border: readonly City[] = [
  city('heihe', 'heilongjiang', 'border', 'Хэйхэ', '黑河', 'Hēihé', 127.446009, 50.250019),
  city('suifenhe', 'heilongjiang', 'border', 'Суйфэньхэ', '绥芬河', 'Suífēnhé', 131.15629, 44.39447, WIKIDATA),
  city('manzhouli', 'inner-mongolia', 'border', 'Маньчжурия', '满洲里', 'Mǎnzhōulǐ', 117.429979, 49.599982),
];

export const cities: readonly City[] = [...capitals, ...notable, ...border];

export function cityById(id: string): City | undefined {
  return cities.find((item) => item.id === id);
}

/**
 * Города набора и всех наборов до него: «значимые» включают столицы, а
 * «приграничные» — и то и другое. Ученик выбирает, докуда, а не какой один.
 */
const SETS_UP_TO: Readonly<Record<CitySet, readonly CitySet[]>> = {
  capital: ['capital'],
  notable: ['capital', 'notable'],
  border: ['capital', 'notable', 'border'],
};

export function citiesUpTo(set: CitySet): readonly City[] {
  const included = SETS_UP_TO[set];

  return cities.filter((item) => included.includes(item.set));
}
