import type { Fact, Region, RegionKind } from './types';

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
  facts: readonly Fact[],
): Region {
  return {
    id,
    kind,
    nameRu,
    nameZh,
    pinyin,
    capitalCityId,
    mapAreaId: id,
    facts,
    sourceIds,
  };
}

const beijingFacts: readonly Fact[] = [
  {
    title: 'Расположение',
    body: 'Пекин находится на северной вершине Великой Китайской равнины, на высоте 30–40 м над уровнем моря; с северо-востока и запада город обрамляют горы Яньшань (燕山, Yānshān) и Цзюньдушань (军都山, Jūndūshān).',
    sourceIds: ['britannica-beijing'],
  },
  {
    title: 'Столица с 1421 года',
    body: 'Пекин стал столицей Китая в 1421 г., когда император династии Мин Чжу Ди (朱棣, Zhū Dì) перенёс сюда двор из Нанкина; с этого времени город стал одним из главных культурных и музыкальных центров страны.',
    sourceIds: ['bre-beijing-music', 'britannica-beijing'],
  },
  {
    title: 'Хозяйство',
    body: 'Современный Пекин специализируется на нефтехимии, машиностроении и научно-исследовательских разработках; вместе с Тяньцзинем и провинцией Хэбэй он образует крупнейший на севере Китая мегалополис Цзин-Цзинь-Цзи (京津冀, Jīng-Jīn-Jì).',
    sourceIds: ['bre-beijing-economy'],
  },
];

const tianjinFacts: readonly Fact[] = [
  {
    title: 'Расположение',
    body: 'Тяньцзинь стоит на месте слияния рек Юндин (永定河, Yǒngdìng Hé) и Цзыя (子牙河, Zǐyá Hé) с Великим каналом; отсюда река Хайхэ (海河, Hǎihé) течёт на восток, в залив Бохайвань. Центр города лежит менее чем в 5 м над уровнем моря.',
    sourceIds: ['britannica-tianjin'],
  },
  {
    title: 'Няньхуа Янлюцина',
    body: 'В посёлке Янлюцин (杨柳青, Yángliǔqīng) на окраине Тяньцзиня с XVII века печатают няньхуа (年画, niánhuà) — новогодние лубочные картины с деревянных досок; это один из двух главных центров такого промысла на севере Китая.',
    sourceIds: ['bre-nianhua'],
  },
  {
    title: 'Город центрального подчинения',
    body: 'В 1967 г. Тяньцзинь вновь получил статус города центрального подчинения (直辖市, zhíxiáshì) — высшую ступень административного деления Китая, подчинённую напрямую Госсовету КНР, как Пекин и Шанхай.',
    sourceIds: ['bre-municipality-status', 'britannica-tianjin'],
  },
];

const hebeiFacts: readonly Fact[] = [
  {
    title: 'Равнина и горы',
    body: 'Хэбэй состоит из двух частей: равнины на востоке, орошаемой притоками реки Хайхэ, и горных хребтов Яньшань и Тайханшань (太行山, Tàiháng Shān) на севере и западе; по гребню Яньшань проходит Великая Китайская стена.',
    sourceIds: ['britannica-hebei'],
  },
  {
    title: 'Таншаньское землетрясение',
    body: '28 июля 1976 г. в городе Таншань (唐山, Tángshān) произошло землетрясение магнитудой 7,5 — одно из самых разрушительных в истории; погибло около 240 тыс. человек.',
    sourceIds: ['bre-earthquake-forecast', 'britannica-tangshan-earthquake'],
  },
  {
    title: 'Уцянские няньхуа',
    body: 'Уезд Уцян (武强, Wǔqiáng) в Хэбэй с XVII века — один из центров печати няньхуа (年画, niánhuà), китайских новогодних народных картин, наравне с Янлюцином под Тяньцзинем.',
    sourceIds: ['bre-nianhua'],
  },
];

const shanxiFacts: readonly Fact[] = [
  {
    title: 'Лёссовое плато',
    body: 'Название Шаньси (山西, «к западу от гор») означает положение западнее хребта Тайханшань; большая часть провинции лежит на Лёссовом плато, а на западе её границу образует река Хуанхэ.',
    sourceIds: ['britannica-shanxi'],
  },
  {
    title: 'Деревянная пагода Инсянь',
    body: 'В уезде Инсянь (应县, Yìngxiàn) стоит пагода Шицзята (释迦塔, Shìjiātǎ) монастыря Фогунсы (佛宫寺, Fógōngsì) — построенная в 1056 г. девятиярусная деревянная пагода высотой 67 м, одна из старейших сохранившихся построек такого рода в Китае.',
    sourceIds: ['bre-pagoda', 'britannica-shanxi'],
  },
  {
    title: 'Угольный край',
    body: 'Шаньси — главный угледобывающий регион Китая: залежи угля и железной руды стали основой тяжёлой промышленности провинции, сосредоточенной вокруг Тайюаня.',
    sourceIds: ['britannica-shanxi-economy'],
  },
];

const innerMongoliaFacts: readonly Fact[] = [
  {
    title: 'Плато полумесяцем',
    body: 'Внутренняя Монголия растянулась дугой почти на 2400 км вдоль северной границы Китая; это плато на высоте около 1000 м, на северо-западе переходящее в пустыню Гоби, а Хуанхэ образует на юге большую излучину — плато Ордос (鄂尔多斯, È’ěrduōsī).',
    sourceIds: ['britannica-inner-mongolia'],
  },
  {
    title: 'Белая пагода Хух-Хото',
    body: 'В городе Хух-Хото (呼和浩特, Hūhéhàotè) сохранилась Белая пагода (白塔, Báitǎ) — буддийская постройка эпохи Ляо, перестройка которой была завершена в 1162 г.',
    sourceIds: ['bre-buddhist-art-china'],
  },
  {
    title: 'Баяньобо',
    body: 'Возле города Баотоу (包头, Bāotóu) расположено месторождение Баяньобо (白云鄂博, Báiyún Èbó) — один из крупнейших в мире источников редкоземельных элементов и железной руды.',
    sourceIds: ['bre-bastnasite', 'britannica-inner-mongolia-economy'],
  },
];

const liaoningFacts: readonly Fact[] = [
  {
    title: 'Ляодунский полуостров',
    body: 'Провинция получила имя от реки Ляохэ (辽河, Liáo Hé), которая пересекает центральную равнину у Шэньяна; на юге в Жёлтое море выступает гористый Ляодунский полуостров (辽东半岛, Liáodōng bàndǎo).',
    sourceIds: ['britannica-liaoning'],
  },
  {
    title: 'Маньчжуры',
    body: 'В Ляонине живёт больше маньчжуров (满族, mǎnzú), чем в любой другой провинции Китая; здесь расположено несколько маньчжурских автономных уездов, включая Синьбинь (新宾, Xīnbīn) и Куаньдянь (宽甸, Kuāndiàn).',
    sourceIds: ['bre-manchu'],
  },
  {
    title: 'Магнезит Хайчэна',
    body: 'Возле города Хайчэн (海城, Hǎichéng) добывают магнезит — сырьё для огнеупорного кирпича; это один из известных в мире районов залегания этого минерала.',
    sourceIds: ['bre-magnesite', 'britannica-liaoning-economy'],
  },
];

const heilongjiangFacts: readonly Fact[] = [
  {
    title: 'Самая северная провинция',
    body: 'Хэйлунцзян — самая северная провинция Китая, на севере и востоке граничащая с Россией по рекам Амур и Уссури (乌苏里江, Wūsūlǐ Jiāng); название провинции происходит от китайского имени Амура — Хэйлунцзян (黑龙江, Hēilóngjiāng).',
    sourceIds: ['britannica-heilongjiang'],
  },
  {
    title: 'Корейские переселенцы',
    body: 'С середины XIX века юго-восток Хэйлунцзяна заселяли крестьяне-переселенцы из Кореи, превратившие заболоченные земли в рисовые чеки; сегодня здесь сохраняются корейские автономные волости.',
    sourceIds: ['britannica-heilongjiang'],
  },
  {
    title: 'Дацинская нефть',
    body: 'Дацинское нефтяное месторождение (大庆油田, Dàqìng Yóutián) на западе Хэйлунцзяна — один из главных источников сырой нефти в Китае, до сих пор дающий основную часть провинциальной добычи.',
    sourceIds: ['britannica-heilongjiang'],
  },
];

const jilinFacts: readonly Fact[] = [
  {
    title: 'Чанбайшань',
    body: 'На границе с КНДР в горах Чанбайшань (长白山, Chángbái Shān) находится вулканический массив с кратерным озером на вершине — здесь расположены самые высокие точки северо-восточного Китая; отсюда берёт начало река Сунгари (松花江, Sōnghuā Jiāng).',
    sourceIds: ['britannica-jilin'],
  },
  {
    title: 'Яньбянь',
    body: 'На востоке Гирина, у границы с КНДР, расположен Яньбянь-Корейский автономный округ (延边朝鲜族自治州, yánbiān cháoxiǎnzú zìzhìzhōu) — один из главных рисоводческих районов севера Китая с крупной общиной этнических корейцев.',
    sourceIds: ['britannica-jilin'],
  },
  {
    title: 'Промышленность',
    body: 'Основная часть тяжёлой промышленности Гирина, включая производство автомобилей, машин и химическую продукцию, сосредоточена в Чанчуне и городе Цзилинь (吉林市, Jílín Shì).',
    sourceIds: ['britannica-jilin'],
  },
];

const shanghaiFacts: readonly Fact[] = [
  {
    title: 'Дельта Янцзы',
    body: 'Шанхай расположен в дельте реки Янцзы (长江, Cháng Jiāng), между её устьем на севере и заливом Ханчжоувань (杭州湾, Hángzhōu Wān) на юге; материковая часть города лежит на аллювиальной равнине высотой 3–5 м над уровнем моря и пересечена рекой Хуанпу (黄浦江, Huángpǔ Jiāng).',
    sourceIds: ['britannica-shanghai'],
  },
  {
    title: 'Открытый порт',
    body: 'Шанхай стал одним из первых китайских портов, открытых для западной торговли в середине XIX века; в городе возникли английская, французская и позднее японская концессии, определившие облик исторического центра.',
    sourceIds: ['britannica-shanghai-history'],
  },
  {
    title: 'Фондовая биржа',
    body: 'Шанхайская фондовая биржа (上海证券交易所, Shànghǎi Zhèngquàn Jiāoyì Suǒ) — крупнейшая по капитализации фондовая биржа материкового Китая.',
    sourceIds: ['bre-shanghai-stock-exchange'],
  },
];

const jiangsuFacts: readonly Fact[] = [
  {
    title: 'Самая плоская провинция',
    body: 'Цзянсу — самая низкая и плоская из провинций Китая: почти всю её площадь занимает аллювиальная равнина дельты Янцзы (长江, Cháng Jiāng), а средняя высота над уровнем моря не превышает 45 м; с севера на юг провинцию пересекает Великий канал (大运河, Dà Yùnhé).',
    sourceIds: ['britannica-jiangsu'],
  },
  {
    title: 'Сады Сучжоу',
    body: 'Классические сады Сучжоу (苏州古典园林, Sūzhōu gǔdiǎn yuánlín) в 1997 году включены в список Всемирного наследия ЮНЕСКО как образец паркового искусства эпох Мин и Цин.',
    sourceIds: ['britannica-jiangsu-culture', 'unesco-suzhou-gardens-813'],
  },
  {
    title: 'Промышленный лидер',
    body: 'Цзянсу — один из ведущих промышленных регионов Китая, ежегодно входящий в число лидеров по объёму промышленного производства; ведущие отрасли — машиностроение, электроника, нефтехимия и текстильная промышленность.',
    sourceIds: ['britannica-jiangsu-culture'],
  },
];

const zhejiangFacts: readonly Fact[] = [
  {
    title: 'Приливная бора',
    body: 'На реке Цяньтан (钱塘江, Qiántáng Jiāng), впадающей в залив Ханчжоувань (杭州湾, Hángzhōu Wān), наблюдается одна из самых мощных приливных бор в мире — стена воды, идущая вверх по течению; лучше всего это явление видно осенью, в конце сентября — начале октября.',
    sourceIds: ['britannica-zhejiang'],
  },
  {
    title: 'Селадон Лунцюаня',
    body: 'В печах Лунцюаня (龙泉, Lóngquán) на юго-востоке Чжэцзяна с эпохи Сун изготавливают фарфор-селадон цинцы (青瓷, qīngcí) с характерной серо-зелёной глазурью; технология его изготовления включена в список нематериального культурного наследия ЮНЕСКО.',
    sourceIds: ['bre-seladon'],
  },
  {
    title: 'Чай и шёлк',
    body: 'Чжэцзян лидирует в Китае по производству чая и уступает только провинции Сычуань по шелководству — разведению шелкопряда для получения сырцового шёлка.',
    sourceIds: ['britannica-zhejiang'],
  },
];

const anhuiFacts: readonly Fact[] = [
  {
    title: 'Хуайхэ и Янцзы',
    body: 'Аньхой делится реками Хуайхэ (淮河, Huái Hé) и Янцзы (长江, Cháng Jiāng) на равнинный север, часть Великой Китайской равнины, и гористый юг с хребтом Дабешань (大别山, Dàbié Shān); бассейн Хуайхэ подвержен разрушительным паводкам.',
    sourceIds: ['britannica-anhui'],
  },
  {
    title: 'Хуаншань',
    body: 'Горы Хуаншань (黄山, Huáng Shān) на юго-востоке Аньхоя в 1990 году включены в список Всемирного наследия ЮНЕСКО за гранитные пики, сосны и облачные моря.',
    sourceIds: ['britannica-anhui-culture', 'unesco-huangshan-547'],
  },
  {
    title: 'Чай Аньхоя',
    body: 'Аньхой известен чаем: цимэньский чёрный чай (祁门红茶, Qímén hóngchá) и туньсийский зелёный чай (屯溪绿茶, Túnxī lǜchá) высоко ценятся в Китае и идут на экспорт.',
    sourceIds: ['britannica-anhui-culture'],
  },
];

export const regions = [
  region('anhui', 'province', 'Аньхой', '安徽省', 'Ānhuī shěng', 'hefei', anhuiFacts),
  region('fujian', 'province', 'Фуцзянь', '福建省', 'Fújiàn shěng', 'fuzhou', []),
  region('gansu', 'province', 'Ганьсу', '甘肃省', 'Gānsù shěng', 'lanzhou', []),
  region('guangdong', 'province', 'Гуандун', '广东省', 'Guǎngdōng shěng', 'guangzhou', []),
  region('guizhou', 'province', 'Гуйчжоу', '贵州省', 'Guìzhōu shěng', 'guiyang', []),
  region('hainan', 'province', 'Хайнань', '海南省', 'Hǎinán shěng', 'haikou', []),
  region('hebei', 'province', 'Хэбэй', '河北省', 'Héběi shěng', 'shijiazhuang', hebeiFacts),
  region('heilongjiang', 'province', 'Хэйлунцзян', '黑龙江省', 'Hēilóngjiāng shěng', 'harbin', heilongjiangFacts),
  region('henan', 'province', 'Хэнань', '河南省', 'Hénán shěng', 'zhengzhou', []),
  region('hubei', 'province', 'Хубэй', '湖北省', 'Húběi shěng', 'wuhan', []),
  region('hunan', 'province', 'Хунань', '湖南省', 'Húnán shěng', 'changsha', []),
  region('jiangsu', 'province', 'Цзянсу', '江苏省', 'Jiāngsū shěng', 'nanjing', jiangsuFacts),
  region('jiangxi', 'province', 'Цзянси', '江西省', 'Jiāngxī shěng', 'nanchang', []),
  region('jilin', 'province', 'Гирин', '吉林省', 'Jílín shěng', 'changchun', jilinFacts),
  region('liaoning', 'province', 'Ляонин', '辽宁省', 'Liáoníng shěng', 'shenyang', liaoningFacts),
  region('qinghai', 'province', 'Цинхай', '青海省', 'Qīnghǎi shěng', 'xining', []),
  region('shaanxi', 'province', 'Шэньси', '陕西省', 'Shǎnxī shěng', 'xian', []),
  region('shandong', 'province', 'Шаньдун', '山东省', 'Shāndōng shěng', 'jinan', []),
  region('shanxi', 'province', 'Шаньси', '山西省', 'Shānxī shěng', 'taiyuan', shanxiFacts),
  region('sichuan', 'province', 'Сычуань', '四川省', 'Sìchuān shěng', 'chengdu', []),
  region('yunnan', 'province', 'Юньнань', '云南省', 'Yúnnán shěng', 'kunming', []),
  region('zhejiang', 'province', 'Чжэцзян', '浙江省', 'Zhèjiāng shěng', 'hangzhou', zhejiangFacts),
  region('taiwan', 'province', 'Тайвань', '台湾省', 'Táiwān shěng', 'taipei', []),
  region('guangxi', 'autonomous-region', 'Гуанси-Чжуанский автономный район', '广西壮族自治区', 'Guǎngxī Zhuàngzú zìzhìqū', 'nanning', []),
  region('inner-mongolia', 'autonomous-region', 'Автономный район Внутренняя Монголия', '内蒙古自治区', 'Nèi Měnggǔ zìzhìqū', 'hohhot', innerMongoliaFacts),
  region('ningxia', 'autonomous-region', 'Нинся-Хуэйский автономный район', '宁夏回族自治区', 'Níngxià Huízú zìzhìqū', 'yinchuan', []),
  region('xinjiang', 'autonomous-region', 'Синьцзян-Уйгурский автономный район', '新疆维吾尔自治区', 'Xīnjiāng Wéiwú’ěr zìzhìqū', 'urumqi', []),
  region('tibet', 'autonomous-region', 'Тибетский автономный район', '西藏自治区', 'Xīzàng zìzhìqū', 'lhasa', []),
  region('beijing', 'municipality', 'Пекин', '北京市', 'Běijīng shì', 'beijing', beijingFacts),
  region('chongqing', 'municipality', 'Чунцин', '重庆市', 'Chóngqìng shì', 'chongqing', []),
  region('shanghai', 'municipality', 'Шанхай', '上海市', 'Shànghǎi shì', 'shanghai', shanghaiFacts),
  region('tianjin', 'municipality', 'Тяньцзинь', '天津市', 'Tiānjīn shì', 'tianjin', tianjinFacts),
  region('hong-kong', 'sar', 'Гонконг', '香港特别行政区', 'Xiānggǎng tèbié xíngzhèngqū', 'hong-kong', []),
  region('macao', 'sar', 'Макао', '澳门特别行政区', 'Àomén tèbié xíngzhèngqū', 'macao', []),
] as const satisfies readonly Region[];
