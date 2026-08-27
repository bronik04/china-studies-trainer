/**
 * Династии и сроки их правления — содержание режима «История».
 *
 * Двенадцать записей, а не полный список: между Хань и Суй Китай четыре века
 * распадался и собирался заново, и перечислять все два десятка царств значило
 * бы подменить школьную ленту научной. Эпоха раздробленности стоит здесь одной
 * записью — Троецарствием, с которого она началась.
 *
 * Годы числами, а не строкой: до нашей эры — отрицательные. Подпись срока
 * собирает `spanLabel`, и написать её руками нельзя — иначе «221–207 до н. э.»
 * однажды разойдётся с числами, по которым режим строит отвлекающие варианты.
 *
 * Приблизительность отмечена у каждого конца отдельно. У Ся условны оба: она
 * известна по преданиям. У Шан условно только начало — конец подтверждён
 * письменными памятниками.
 */
import type { Dynasty } from './types';

export const dynasties: readonly Dynasty[] = [
  {
    id: 'xia',
    nameRu: 'Ся',
    nameZh: '夏',
    pinyin: 'Xià',
    from: -2070,
    to: -1600,
    approximateFrom: true,
    approximateTo: true,
    note: 'Известна по преданиям: основателем называют Юя, усмирителя великого потопа. Он же, по преданию, сделал власть наследственной.',
    sourceIds: ['britannica-xia-dynasty'],
  },
  {
    id: 'shang',
    nameRu: 'Шан',
    nameZh: '商',
    pinyin: 'Shāng',
    from: -1600,
    to: -1046,
    approximateFrom: true,
    note: 'Первая династия, подтверждённая и письменными памятниками, и раскопками. При ней начала складываться китайская письменность, а бронзовое литьё Шан известно до сих пор.',
    sourceIds: ['britannica-shang-dynasty'],
  },
  {
    id: 'zhou',
    nameRu: 'Чжоу',
    nameZh: '周',
    pinyin: 'Zhōu',
    from: -1046,
    to: -256,
    note: 'Самая долгая династия Китая — около восьми веков. При ней появились железо, плуг с волами, арбалет и верховая езда, а на Великой Китайской равнине развернули большие оросительные работы.',
    sourceIds: ['britannica-zhou-dynasty'],
  },
  {
    id: 'qin',
    nameRu: 'Цинь',
    nameZh: '秦',
    pinyin: 'Qín',
    from: -221,
    to: -207,
    note: 'Первая династия единой империи и самая короткая в этом списке — четырнадцать лет. От её имени происходит слово «Китай» в европейских языках, а её границы и устройство управления следующие династии повторяли два тысячелетия.',
    sourceIds: ['britannica-qin-dynasty'],
  },
  {
    id: 'han',
    nameRu: 'Хань',
    nameZh: '汉',
    pinyin: 'Hàn',
    from: -206,
    to: 220,
    note: 'Вторая великая имперская династия. Её устройство управления, культуру и ремёсла перенимали все, кто правил после; самоназвание большинства населения Китая — ханьцы — идёт отсюда.',
    sourceIds: ['britannica-han-dynasty'],
  },
  {
    id: 'three-kingdoms',
    nameRu: 'Троецарствие',
    nameZh: '三国',
    pinyin: 'Sānguó',
    from: 220,
    to: 280,
    note: 'В 220 году последний император Хань уступил престол, и держава распалась на три центра силы. С Троецарствия начинаются четыре века раздробленности, которые кончит только Суй.',
    sourceIds: ['britannica-six-dynasties'],
  },
  {
    id: 'sui',
    nameRu: 'Суй',
    nameZh: '隋',
    pinyin: 'Suí',
    from: 581,
    to: 618,
    note: 'Короткая династия, снова собравшая страну после четырёх веков раздробленности, когда север и юг разошлись слишком далеко. Её столицей был Дасин — при Тан он стал называться Чанъань.',
    sourceIds: ['britannica-sui-dynasty'],
  },
  {
    id: 'tang',
    nameRu: 'Тан',
    nameZh: '唐',
    pinyin: 'Táng',
    from: 618,
    to: 907,
    note: 'Золотой век: при Тан сложилось удачное управление, а искусство и словесность расцвели так, что этот расцвет считают вершиной китайской культуры.',
    sourceIds: ['britannica-tang-dynasty'],
  },
  {
    id: 'song',
    nameRu: 'Сун',
    nameZh: '宋',
    pinyin: 'Sòng',
    from: 960,
    to: 1279,
    note: 'Время хозяйственного и культурного подъёма. Делится надвое: с 1127 года, потеряв север, династия правила только южным Китаем — это Южная Сун.',
    sourceIds: ['britannica-song-dynasty'],
  },
  {
    id: 'yuan',
    nameRu: 'Юань',
    nameZh: '元',
    pinyin: 'Yuán',
    from: 1271,
    to: 1368,
    note: 'Монгольская династия: в 1271 году держава была переименована в Юань, а в 1279-м монголы покорили и юг. Столицу перенесли в Пекин, Великий канал отстроили заново.',
    sourceIds: ['britannica-yuan-dynasty'],
  },
  {
    id: 'ming',
    nameRu: 'Мин',
    nameZh: '明',
    pinyin: 'Míng',
    from: 1368,
    to: 1644,
    note: 'Промежуток собственно китайского правления между монголами и маньчжурами. Основал её Чжу Юаньчжан, человек простого происхождения; при Мин достроили Великую стену в том виде, в каком её знают сейчас.',
    sourceIds: ['britannica-ming-dynasty', 'britannica-great-wall-ming'],
  },
  {
    id: 'qing',
    nameRu: 'Цин',
    nameZh: '清',
    pinyin: 'Qīng',
    from: 1644,
    to: 1912,
    note: 'Последняя имперская династия, маньчжурская по происхождению. Её конец датируют 1911–1912 годами: Синьхайская революция свергла монархию.',
    sourceIds: ['britannica-qing-dynasty', 'britannica-chinese-revolution-1911'],
  },
];

/** Год словами: отрицательные — до нашей эры. */
function yearLabel(year: number, approximate: boolean | undefined): string {
  return `${approximate ? 'ок. ' : ''}${Math.abs(year)}`;
}

/**
 * Срок правления одной строкой: «221–207 до н. э.», «206 до н. э. — 220 н. э.»,
 * «1368–1644».
 *
 * Собирается из чисел, а не пишется в справочнике: подпись и числа обязаны
 * говорить одно и то же, а режим строит отвлекающие варианты по числам.
 */
export function spanLabel(dynasty: Dynasty): string {
  const from = yearLabel(dynasty.from, dynasty.approximateFrom);
  const to = yearLabel(dynasty.to, dynasty.approximateTo);

  if (dynasty.from < 0 && dynasty.to < 0) {
    return `${from}–${to} до н. э.`;
  }

  if (dynasty.from < 0) {
    return `${from} до н. э. — ${to} н. э.`;
  }

  return `${from}–${to}`;
}

/** Сколько лет правила династия. Нулевого года нет, но на длине это не сказывается. */
export function spanYears(dynasty: Dynasty): number {
  return dynasty.to - dynasty.from;
}

export function dynastyById(id: string): Dynasty | undefined {
  return dynasties.find((dynasty) => dynasty.id === id);
}

/** Начало самой ранней и конец самой поздней: границы ленты. */
export const TIMELINE_FROM = Math.min(...dynasties.map(({ from }) => from));
export const TIMELINE_TO = Math.max(...dynasties.map(({ to }) => to));
