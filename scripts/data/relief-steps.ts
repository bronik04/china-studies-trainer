import type { ReliefStep } from '../../src/content/types';

/**
 * Ступень рельефа для каждой формы, которую Natural Earth называет на
 * территории Китая. Это разметка чужого набора, а не учебный справочник,
 * поэтому она лежит входом генератора, а не в `src/content`.
 *
 * Границы ступеней — школьные: первая отделяется от второй линией
 * Куньлунь — Циляньшань — Хэндуаньшань, вторая от третьей — линией
 * Большой Хинган — Тайханшань — Ушань — Сюэфэншань. Разметка сверяется
 * преподавателем (открытый вопрос спека), координат не задаёт и на
 * правильность ответа не влияет: ею выбирается только цвет заливки.
 *
 * Ключ — поле `NAME` набора, как оно записано там: заглавными у крупных форм,
 * вперемешку у мелких. Приводить его к одному виду нельзя — по нему идёт
 * сопоставление.
 */
export const RELIEF_STEPS: Readonly<Record<string, ReliefStep>> = {
  // Первая ступень: Тибетское нагорье и обрамляющие его хребты.
  'PLATEAU OF TIBET': 1,
  HIMALAYAS: 1,
  'KARAKORAM RA.': 1,
  'KUNLUN MOUNTAINS': 1,
  'ALTUN MTS.': 1,
  'QUILIAN MOUNTAINS': 1,
  'Qaidam Basin': 1,

  // Вторая ступень: плато, котловины и пустыни.
  'TARIM BASIN': 2,
  'TAKLIMAKAN DESERT': 2,
  'Junggar Basin': 2,
  'TIAN SHAN': 2,
  'ALTAY MOUNTAINS': 2,
  'Borohoro Mts.': 2,
  'Alataw Mts.': 2,
  'Hexi Corridor': 2,
  'MONGOLIAN PLATEAU': 2,
  'GOBI DESERT': 2,
  'Mu Us Desert': 2,
  'Loess Plateau': 2,
  'Lüliang Mts.': 2,
  'Taihang Mts.': 2,
  'Yin Mts.': 2,
  'Qinling Mountains': 2,
  'SICHUAN BASIN': 2,
  'YUNGUI PLATEAU': 2,
  'Dalou Mts.': 2,
  'GREATER KHINGAN RANGE': 2,

  // Третья ступень: равнины, холмы востока и острова.
  'NORTH CHINA PLAIN': 3,
  'MANCHURIAN PLAIN': 3,
  'Lesser Khingan Range': 3,
  'Dabie Mts.': 3,
  'Nan Ling Mts.': 3,
  'Wuyi Mts.': 3,
  'Shandong Pen.': 3,
  'Liaodong Pen.': 3,
  'Leizhou Pen.': 3,
  HAINAN: 3,
  TAIWAN: 3,
};

/**
 * Формы, которые не только заливают фон, но и спрашиваются. Ключ — имя в
 * наборе, значение — `id` в справочнике. Остальные тридцать две формы
 * декоративны: у них на экране нет имени, и сверять их незачем.
 */
export const SHAPE_FEATURE_IDS: Readonly<Record<string, string>> = {
  'PLATEAU OF TIBET': 'tibetan-plateau',
  'TARIM BASIN': 'tarim-basin',
  'Loess Plateau': 'loess-plateau',
  'SICHUAN BASIN': 'sichuan-basin',
  'GOBI DESERT': 'gobi',
  'NORTH CHINA PLAIN': 'north-china-plain',
};
