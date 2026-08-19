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
    body: 'На востоке Гирина, у границы с КНДР, расположен Яньбянь-Корейский автономный округ (延边朝鲜族自治州, Yánbiān Cháoxiǎnzú zìzhìzhōu) — известный рисоводческий район севера Китая с крупной общиной этнических корейцев.',
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
    body: 'На реке Цяньтан (钱塘江, Qiántáng Jiāng), впадающей в залив Ханчжоувань (杭州湾, Hángzhōu Wān), приливная бора поднимается вверх по течению высокой стеной воды с громким рёвом и славится как туристическая достопримечательность; лучше всего она видна осенью, в конце сентября — начале октября.',
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

const shandongFacts: readonly Fact[] = [
  {
    title: 'Полуостров и Тайшань',
    body: 'Шаньдун состоит из равнины бассейна Хуанхэ (黄河, Huáng Hé) на западе и Шаньдунского полуострова (山东半岛, Shāndōng bàndǎo) на востоке, выступающего в море между заливом Бохай и Жёлтым морем; в холмистой части провинции поднимается гора Тайшань (泰山, Tài Shān) высотой 1534 м — самая известная из пяти священных гор Китая.',
    sourceIds: ['britannica-shandong'],
  },
  {
    title: 'Родина Конфуция',
    body: 'Шаньдун — родина Конфуция (孔子, Kǒngzǐ): в 1994 году его храм, кладбище и родовая усадьба семьи Кун в городе Цюйфу (曲阜, Qūfù) включены в список Всемирного наследия ЮНЕСКО.',
    sourceIds: ['britannica-shandong-culture', 'unesco-qufu-704'],
  },
  {
    title: 'Нефть Шэнли',
    body: 'Нефтяное месторождение Шэнли (胜利油田, Shènglì Yóutián) в устье Хуанхэ на побережье залива Бохай — одно из крупнейших нефтедобывающих месторождений Китая.',
    sourceIds: ['britannica-shandong-economy'],
  },
];

const henanFacts: readonly Fact[] = [
  {
    title: 'Название «к югу от реки»',
    body: 'Название Хэнань (河南, Hénán) означает «к югу от реки», хотя Хуанхэ (黄河, Huáng Hé) делит провинцию неравномерно: лишь около одной шестой её площади лежит к северу от реки, а пять шестых — к югу.',
    sourceIds: ['britannica-henan'],
  },
  {
    title: 'Монастырь Шаолинь',
    body: 'На склонах горы Суншань (嵩山, Sōng Shān), одной из пяти священных гор Китая, стоит монастырь Шаолинь (少林寺, Shàolín Sì), который считается местом зарождения китайских боевых искусств.',
    sourceIds: ['britannica-henan-culture'],
  },
  {
    title: 'Житница пшеницы',
    body: 'Хэнань занимает первое место среди провинций Китая по сбору пшеницы, а также входит в число крупнейших производителей табака и кунжута.',
    sourceIds: ['britannica-henan-economy'],
  },
];

const fujianFacts: readonly Fact[] = [
  {
    title: 'Горы Уишань',
    body: 'Почти вся территория Фуцзяня гориста, если не считать узких прибрежных равнин; вдоль границы с Цзянси тянется хребет Уишань (武夷山, Wǔyí Shān) высотой около 1800 м — водораздел между бассейнами рек Миньцзян и Ганьцзян.',
    sourceIds: ['britannica-fujian'],
  },
  {
    title: 'Дома тулоу',
    body: 'На юго-западе Фуцзяня сохранились глинобитные дома тулоу (土楼, tǔlóu) — несколько десятков круглых построек, которые в 2008 году включены в список Всемирного наследия ЮНЕСКО.',
    sourceIds: ['britannica-fujian-culture', 'unesco-fujian-tulou-1113'],
  },
  {
    title: 'Чай Фуцзяня',
    body: 'Фуцзянь остаётся крупной чаеводческой провинцией, снабжающей значительную часть внутреннего рынка чая Китая; в Фучжоу также производят ароматизированный цветочный чай.',
    sourceIds: ['britannica-fujian-economy'],
  },
];

const jiangxiFacts: readonly Fact[] = [
  {
    title: 'Озеро Поянху',
    body: 'Озеро Поянху (鄱阳湖, Póyáng Hú) на севере Цзянси — крупнейшее пресноводное озеро Китая; оно принимает воды реки Ганьцзян (赣江, Gàn Jiāng) и впадает в Янцзы (长江, Cháng Jiāng) у города Хукоу (湖口, Húkǒu).',
    sourceIds: ['britannica-poyang-lake'],
  },
  {
    title: 'Фарфор Цзиндэчжэня',
    body: 'Город Цзиндэчжэнь (景德镇, Jǐngdézhèn) на северо-востоке Цзянси со времён империи Сун — центр китайского фарфора: уже десять веков здесь делают фарфоровые изделия для внутреннего рынка и на экспорт.',
    sourceIds: ['britannica-jiangxi'],
  },
  {
    title: 'Вольфрам Даю',
    body: 'Район вокруг города Даю (大余, Dàyú) на юге Цзянси — центр добычи вольфрама в провинции; руда здесь содержит около 60% вольфрама, а также олово, висмут и молибден.',
    sourceIds: ['britannica-jiangxi'],
  },
];

const hubeiFacts: readonly Fact[] = [
  {
    title: 'Три ущелья',
    body: 'У города Ичан (宜昌, Yíchāng) Янцзы (长江, Cháng Jiāng) выходит из Трёх ущелий (三峡, Sānxiá) на равнину; построенная здесь плотина Санься (三峡大坝, Sānxiá Dàbà) значительно снизила сезонные наводнения в низовьях реки.',
    sourceIds: ['britannica-hubei'],
  },
  {
    title: 'Начало революции 1911 года',
    body: 'Синьхайская революция (辛亥革命, Xīnhài Gémìng), свергнувшая цинскую монархию, началась 10 октября 1911 года в Хубэе: восставшие солдаты заняли города Ханькоу (汉口, Hànkǒu), Ханьян (汉阳, Hànyáng) и Учан (武昌, Wǔchāng) — три части современного Уханя.',
    sourceIds: ['britannica-hubei-culture', 'britannica-chinese-revolution-1911'],
  },
  {
    title: 'Между севером и югом',
    body: 'Хубэй лежит в переходной зоне между пшеничным севером и рисовым югом Китая и остаётся одной из ведущих рисоводческих провинций страны; хлопок — её главная товарная культура.',
    sourceIds: ['britannica-hubei'],
  },
];

const hunanFacts: readonly Fact[] = [
  {
    title: 'Озеро Дунтинху',
    body: 'Название Хунань (湖南, Húnán) означает «к югу от озера» — имеется в виду Дунтинху (洞庭湖, Dòngtíng Hú) на севере провинции; это второе по площади пресноводное озеро Китая после Поянху в Цзянси.',
    sourceIds: ['britannica-hunan'],
  },
  {
    title: 'Заповедник Улинъюань',
    body: 'Заповедник Улинъюань (武陵源, Wǔlíngyuán) возле города Чжанцзяцзе (张家界, Zhāngjiājiè) с более чем тремя тысячами песчаниковых столбов-останцов в 1992 году включён в список Всемирного наследия ЮНЕСКО.',
    sourceIds: ['britannica-hunan-culture', 'unesco-wulingyuan-640'],
  },
  {
    title: 'Первый рис Китая',
    body: 'Хунань стабильно занимает первое место среди провинций Китая по сбору риса и вывозит его излишки в другие регионы страны.',
    sourceIds: ['britannica-hunan'],
  },
];

export const regions = [
  region('anhui', 'province', 'Аньхой', '安徽省', 'Ānhuī shěng', 'hefei', anhuiFacts),
  region('fujian', 'province', 'Фуцзянь', '福建省', 'Fújiàn shěng', 'fuzhou', fujianFacts),
  region('gansu', 'province', 'Ганьсу', '甘肃省', 'Gānsù shěng', 'lanzhou', []),
  region('guangdong', 'province', 'Гуандун', '广东省', 'Guǎngdōng shěng', 'guangzhou', []),
  region('guizhou', 'province', 'Гуйчжоу', '贵州省', 'Guìzhōu shěng', 'guiyang', []),
  region('hainan', 'province', 'Хайнань', '海南省', 'Hǎinán shěng', 'haikou', []),
  region('hebei', 'province', 'Хэбэй', '河北省', 'Héběi shěng', 'shijiazhuang', hebeiFacts),
  region('heilongjiang', 'province', 'Хэйлунцзян', '黑龙江省', 'Hēilóngjiāng shěng', 'harbin', heilongjiangFacts),
  region('henan', 'province', 'Хэнань', '河南省', 'Hénán shěng', 'zhengzhou', henanFacts),
  region('hubei', 'province', 'Хубэй', '湖北省', 'Húběi shěng', 'wuhan', hubeiFacts),
  region('hunan', 'province', 'Хунань', '湖南省', 'Húnán shěng', 'changsha', hunanFacts),
  region('jiangsu', 'province', 'Цзянсу', '江苏省', 'Jiāngsū shěng', 'nanjing', jiangsuFacts),
  region('jiangxi', 'province', 'Цзянси', '江西省', 'Jiāngxī shěng', 'nanchang', jiangxiFacts),
  region('jilin', 'province', 'Гирин', '吉林省', 'Jílín shěng', 'changchun', jilinFacts),
  region('liaoning', 'province', 'Ляонин', '辽宁省', 'Liáoníng shěng', 'shenyang', liaoningFacts),
  region('qinghai', 'province', 'Цинхай', '青海省', 'Qīnghǎi shěng', 'xining', []),
  region('shaanxi', 'province', 'Шэньси', '陕西省', 'Shǎnxī shěng', 'xian', []),
  region('shandong', 'province', 'Шаньдун', '山东省', 'Shāndōng shěng', 'jinan', shandongFacts),
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
