import type { Region, RegionKind } from './types';

const sourceIds = [
  'prc-administrative-divisions-2022',
  'china-internet-information-center-2003',
] as const;

function region(
  id: string,
  kind: RegionKind,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  capitalCityId: string,
): Region {
  return {
    id,
    kind,
    nameRu,
    nameZh,
    pinyin,
    capitalCityId,
    mapAreaId: id,
    facts: [],
    sourceIds,
  };
}

export const regions = [
  region('anhui', 'province', 'Аньхой', '安徽省', 'Ānhuī shěng', 'hefei'),
  region('fujian', 'province', 'Фуцзянь', '福建省', 'Fújiàn shěng', 'fuzhou'),
  region('gansu', 'province', 'Ганьсу', '甘肃省', 'Gānsù shěng', 'lanzhou'),
  region('guangdong', 'province', 'Гуандун', '广东省', 'Guǎngdōng shěng', 'guangzhou'),
  region('guizhou', 'province', 'Гуйчжоу', '贵州省', 'Guìzhōu shěng', 'guiyang'),
  region('hainan', 'province', 'Хайнань', '海南省', 'Hǎinán shěng', 'haikou'),
  region('hebei', 'province', 'Хэбэй', '河北省', 'Héběi shěng', 'shijiazhuang'),
  region('heilongjiang', 'province', 'Хэйлунцзян', '黑龙江省', 'Hēilóngjiāng shěng', 'harbin'),
  region('henan', 'province', 'Хэнань', '河南省', 'Hénán shěng', 'zhengzhou'),
  region('hubei', 'province', 'Хубэй', '湖北省', 'Húběi shěng', 'wuhan'),
  region('hunan', 'province', 'Хунань', '湖南省', 'Húnán shěng', 'changsha'),
  region('jiangsu', 'province', 'Цзянсу', '江苏省', 'Jiāngsū shěng', 'nanjing'),
  region('jiangxi', 'province', 'Цзянси', '江西省', 'Jiāngxī shěng', 'nanchang'),
  region('jilin', 'province', 'Гирин', '吉林省', 'Jílín shěng', 'changchun'),
  region('liaoning', 'province', 'Ляонин', '辽宁省', 'Liáoníng shěng', 'shenyang'),
  region('qinghai', 'province', 'Цинхай', '青海省', 'Qīnghǎi shěng', 'xining'),
  region('shaanxi', 'province', 'Шэньси', '陕西省', 'Shǎnxī shěng', 'xian'),
  region('shandong', 'province', 'Шаньдун', '山东省', 'Shāndōng shěng', 'jinan'),
  region('shanxi', 'province', 'Шаньси', '山西省', 'Shānxī shěng', 'taiyuan'),
  region('sichuan', 'province', 'Сычуань', '四川省', 'Sìchuān shěng', 'chengdu'),
  region('yunnan', 'province', 'Юньнань', '云南省', 'Yúnnán shěng', 'kunming'),
  region('zhejiang', 'province', 'Чжэцзян', '浙江省', 'Zhèjiāng shěng', 'hangzhou'),
  region('taiwan', 'province', 'Тайвань', '台湾省', 'Táiwān shěng', 'taipei'),
  region('guangxi', 'autonomous-region', 'Гуанси-Чжуанский автономный район', '广西壮族自治区', 'Guǎngxī Zhuàngzú zìzhìqū', 'nanning'),
  region('inner-mongolia', 'autonomous-region', 'Автономный район Внутренняя Монголия', '内蒙古自治区', 'Nèi Měnggǔ zìzhìqū', 'hohhot'),
  region('ningxia', 'autonomous-region', 'Нинся-Хуэйский автономный район', '宁夏回族自治区', 'Níngxià Huízú zìzhìqū', 'yinchuan'),
  region('xinjiang', 'autonomous-region', 'Синьцзян-Уйгурский автономный район', '新疆维吾尔自治区', 'Xīnjiāng Wéiwú’ěr zìzhìqū', 'urumqi'),
  region('tibet', 'autonomous-region', 'Тибетский автономный район', '西藏自治区', 'Xīzàng zìzhìqū', 'lhasa'),
  region('beijing', 'municipality', 'Пекин', '北京市', 'Běijīng shì', 'beijing'),
  region('chongqing', 'municipality', 'Чунцин', '重庆市', 'Chóngqìng shì', 'chongqing'),
  region('shanghai', 'municipality', 'Шанхай', '上海市', 'Shànghǎi shì', 'shanghai'),
  region('tianjin', 'municipality', 'Тяньцзинь', '天津市', 'Tiānjīn shì', 'tianjin'),
  region('hong-kong', 'sar', 'Гонконг', '香港特别行政区', 'Xiānggǎng tèbié xíngzhèngqū', 'hong-kong'),
  region('macao', 'sar', 'Макао', '澳门特别行政区', 'Àomén tèbié xíngzhèngqū', 'macao'),
] as const satisfies readonly Region[];
