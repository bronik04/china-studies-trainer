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
  capitalRu: string,
  capitalZh: string,
): Region {
  return {
    id,
    kind,
    nameRu,
    nameZh,
    pinyin,
    capitalRu,
    capitalZh,
    mapAreaId: id,
    facts: [],
    sourceIds,
  };
}

export const regions = [
  region('anhui', 'province', 'Аньхой', '安徽省', 'Ānhuī shěng', 'Хэфэй', '合肥'),
  region('fujian', 'province', 'Фуцзянь', '福建省', 'Fújiàn shěng', 'Фучжоу', '福州'),
  region('gansu', 'province', 'Ганьсу', '甘肃省', 'Gānsù shěng', 'Ланьчжоу', '兰州'),
  region('guangdong', 'province', 'Гуандун', '广东省', 'Guǎngdōng shěng', 'Гуанчжоу', '广州'),
  region('guizhou', 'province', 'Гуйчжоу', '贵州省', 'Guìzhōu shěng', 'Гуйян', '贵阳'),
  region('hainan', 'province', 'Хайнань', '海南省', 'Hǎinán shěng', 'Хайкоу', '海口'),
  region('hebei', 'province', 'Хэбэй', '河北省', 'Héběi shěng', 'Шицзячжуан', '石家庄'),
  region('heilongjiang', 'province', 'Хэйлунцзян', '黑龙江省', 'Hēilóngjiāng shěng', 'Харбин', '哈尔滨'),
  region('henan', 'province', 'Хэнань', '河南省', 'Hénán shěng', 'Чжэнчжоу', '郑州'),
  region('hubei', 'province', 'Хубэй', '湖北省', 'Húběi shěng', 'Ухань', '武汉'),
  region('hunan', 'province', 'Хунань', '湖南省', 'Húnán shěng', 'Чанша', '长沙'),
  region('jiangsu', 'province', 'Цзянсу', '江苏省', 'Jiāngsū shěng', 'Нанкин', '南京'),
  region('jiangxi', 'province', 'Цзянси', '江西省', 'Jiāngxī shěng', 'Наньчан', '南昌'),
  region('jilin', 'province', 'Гирин', '吉林省', 'Jílín shěng', 'Чанчунь', '长春'),
  region('liaoning', 'province', 'Ляонин', '辽宁省', 'Liáoníng shěng', 'Шэньян', '沈阳'),
  region('qinghai', 'province', 'Цинхай', '青海省', 'Qīnghǎi shěng', 'Синин', '西宁'),
  region('shaanxi', 'province', 'Шэньси', '陕西省', 'Shǎnxī shěng', 'Сиань', '西安'),
  region('shandong', 'province', 'Шаньдун', '山东省', 'Shāndōng shěng', 'Цзинань', '济南'),
  region('shanxi', 'province', 'Шаньси', '山西省', 'Shānxī shěng', 'Тайюань', '太原'),
  region('sichuan', 'province', 'Сычуань', '四川省', 'Sìchuān shěng', 'Чэнду', '成都'),
  region('yunnan', 'province', 'Юньнань', '云南省', 'Yúnnán shěng', 'Куньмин', '昆明'),
  region('zhejiang', 'province', 'Чжэцзян', '浙江省', 'Zhèjiāng shěng', 'Ханчжоу', '杭州'),
  region('taiwan', 'province', 'Тайвань', '台湾省', 'Táiwān shěng', 'Тайбэй', '台北'),
  region('guangxi', 'autonomous-region', 'Гуанси-Чжуанский автономный район', '广西壮族自治区', 'Guǎngxī Zhuàngzú zìzhìqū', 'Наньнин', '南宁'),
  region('inner-mongolia', 'autonomous-region', 'Автономный район Внутренняя Монголия', '内蒙古自治区', 'Nèi Měnggǔ zìzhìqū', 'Хух-Хото', '呼和浩特'),
  region('ningxia', 'autonomous-region', 'Нинся-Хуэйский автономный район', '宁夏回族自治区', 'Níngxià Huízú zìzhìqū', 'Иньчуань', '银川'),
  region('xinjiang', 'autonomous-region', 'Синьцзян-Уйгурский автономный район', '新疆维吾尔自治区', 'Xīnjiāng Wéiwú’ěr zìzhìqū', 'Урумчи', '乌鲁木齐'),
  region('tibet', 'autonomous-region', 'Тибетский автономный район', '西藏自治区', 'Xīzàng zìzhìqū', 'Лхаса', '拉萨'),
  region('beijing', 'municipality', 'Пекин', '北京市', 'Běijīng shì', 'Пекин', '北京'),
  region('chongqing', 'municipality', 'Чунцин', '重庆市', 'Chóngqìng shì', 'Чунцин', '重庆'),
  region('shanghai', 'municipality', 'Шанхай', '上海市', 'Shànghǎi shì', 'Шанхай', '上海'),
  region('tianjin', 'municipality', 'Тяньцзинь', '天津市', 'Tiānjīn shì', 'Тяньцзинь', '天津'),
  region('hong-kong', 'sar', 'Гонконг', '香港特别行政区', 'Xiānggǎng tèbié xíngzhèngqū', 'Гонконг', '香港'),
  region('macao', 'sar', 'Макао', '澳门特别行政区', 'Àomén tèbié xíngzhèngqū', 'Макао', '澳门'),
] as const satisfies readonly Region[];
