import type { Ruler } from './types';

/**
 * Одиннадцать правителей — по одному на династию, кроме Троецарствия: у эпохи
 * трёх государств единственного правителя не назвать, не соврав.
 *
 * Взят не «самый великий», а тот, кем династия узнаётся в школьном курсе:
 * основатель там, где династия начинается с человека (Цинь Шихуанди, Чжу
 * Юаньчжан), и тот, при ком она сделала главное, там, где основатель
 * малоизвестен (Ян-ди с Великим каналом — решение владельца продукта).
 *
 * У двоих нет годов правления, и это не пропуск: у Юя их не даёт предание, а
 * датировку Чэн Тана «Британника» прямо называет спорной. Подставить круглые
 * числа значило бы выдать спор за факт.
 *
 * Источники — `docs/sources/dynasties.md`.
 */
export const rulers: readonly Ruler[] = [
  {
    id: 'yu-the-great',
    dynastyId: 'xia',
    nameRu: 'Юй',
    nameZh: '禹',
    pinyin: 'Yǔ',
    note: 'По преданию усмирил великий потоп и сделал власть наследственной — с него и начинают историю первой династии.',
    legendary: true,
    sourceIds: ['britannica-xia-dynasty'],
  },
  {
    id: 'cheng-tang',
    dynastyId: 'shang',
    nameRu: 'Чэн Тан',
    nameZh: '成汤',
    pinyin: 'Chéng Tāng',
    note: 'Сверг Ся и основал Шан. Годы его правления относят к XVII–XVI векам до нашей эры, и датировка эта спорна.',
    legendary: true,
    sourceIds: ['britannica-shang-founder'],
  },
  {
    id: 'wuwang',
    dynastyId: 'zhou',
    nameRu: 'У-ван',
    nameZh: '周武王',
    pinyin: 'Zhōu Wǔwáng',
    from: -1046,
    to: -1043,
    note: 'Основатель Чжоу; позднейшие конфуцианцы считали его образцом мудрого правителя.',
    sourceIds: ['britannica-wuwang'],
  },
  {
    id: 'qin-shi-huang',
    dynastyId: 'qin',
    nameRu: 'Цинь Шихуанди',
    nameZh: '秦始皇',
    pinyin: 'Qín Shǐhuáng',
    from: -221,
    to: -210,
    note: 'Объединил Китай и принял титул «первого императора»; его гробницу стережёт терракотовая армия.',
    sourceIds: ['britannica-shihuangdi'],
  },
  {
    id: 'han-wudi',
    dynastyId: 'han',
    nameRu: 'У-ди',
    nameZh: '汉武帝',
    pinyin: 'Hàn Wǔdì',
    from: -141,
    to: -87,
    note: 'Расширил власть Хань далеко за прежние пределы и сделал конфуцианство государственным учением.',
    sourceIds: ['britannica-wudi'],
  },
  {
    id: 'sui-yangdi',
    dynastyId: 'sui',
    nameRu: 'Ян-ди',
    nameZh: '隋炀帝',
    pinyin: 'Suí Yángdì',
    from: 604,
    to: 618,
    note: 'При нём прорыли Великий канал между рисовым югом и северной столицей — то, чем Суй запомнилась.',
    sourceIds: ['britannica-yangdi'],
  },
  {
    id: 'tang-taizong',
    dynastyId: 'tang',
    nameRu: 'Тай-цзун',
    nameZh: '唐太宗',
    pinyin: 'Táng Tàizōng',
    from: 626,
    to: 649,
    note: 'Второй император Тан; при нём сложились управление и экзамены, по которым набирали чиновников.',
    sourceIds: ['britannica-taizong', 'britannica-tang-dynasty'],
  },
  {
    id: 'song-taizu',
    dynastyId: 'song',
    nameRu: 'Тай-цзу',
    nameZh: '宋太祖',
    pinyin: 'Sòng Tàizǔ',
    from: 960,
    to: 976,
    note: 'Военачальник, основавший Сун и начавший собирать страну заново.',
    sourceIds: ['britannica-song-taizu'],
  },
  {
    id: 'kublai',
    dynastyId: 'yuan',
    nameRu: 'Хубилай',
    nameZh: '忽必烈',
    pinyin: 'Hūbìliè',
    from: 1260,
    to: 1294,
    note: 'Внук Чингисхана; ханом стал в 1260 году, а державу переименовал в Юань в 1271-м и сделал столицей Пекин.',
    sourceIds: ['britannica-yuan-dynasty'],
  },
  {
    id: 'zhu-yuanzhang',
    dynastyId: 'ming',
    nameRu: 'Чжу Юаньчжан',
    nameZh: '朱元璋',
    pinyin: 'Zhū Yuánzhāng',
    from: 1368,
    to: 1398,
    note: 'Из бедной крестьянской семьи — до основателя Мин; правил под девизом Хунъу.',
    sourceIds: ['britannica-hongwu', 'britannica-ming-dynasty'],
  },
  {
    id: 'kangxi',
    dynastyId: 'qing',
    nameRu: 'Канси',
    nameZh: '康熙',
    pinyin: 'Kāngxī',
    from: 1661,
    to: 1722,
    note: 'Второй император Цин; правил шестьдесят лет и закрепил границу с Россией на Амуре.',
    sourceIds: ['britannica-qing-dynasty'],
  },
];

export function rulerOfDynasty(dynastyId: string): Ruler | undefined {
  return rulers.find((ruler) => ruler.dynastyId === dynastyId);
}

export function rulerById(id: string): Ruler | undefined {
  return rulers.find((ruler) => ruler.id === id);
}
