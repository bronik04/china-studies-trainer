import type { DynastyCapital } from './types';

/**
 * Столицы династий.
 *
 * Из двенадцати записей ленты сюда попали семь: у Ся, Шан, Чжоу, Цинь и
 * Троецарствия столицы — Эрлитоу, Инь, Хао, Сяньян и сразу три города — в
 * каталоге городов отсутствуют, а заводить их ради одной игры значило бы
 * переоткрывать состав каталога, утверждённый 2026-08-28.
 *
 * Строк больше, чем вопросов: Восточная Хань, Южная Сун и ранняя Мин не
 * спрашиваются (`asked: false`), но дают отвлекающие варианты и называются в
 * разборе. Без них у семи вопросов было бы три разных ответа на всех — Сиань,
 * Кайфэн и Пекин, — и четвёртый вариант брать было бы неоткуда.
 *
 * Источники — `docs/sources/dynasties.md`.
 */
export const dynastyCapitals: readonly DynastyCapital[] = [
  {
    id: 'han-west',
    dynastyId: 'han',
    qualifier: 'Западной Хань',
    cityId: 'xian',
    historicNameRu: 'Чанъань',
    historicNameZh: '长安',
    pinyin: 'Cháng’ān',
    asked: true,
    note: 'При Восточной Хань столицу перенесли восточнее — в Лоян.',
    sourceIds: ['britannica-han-dynasty'],
  },
  {
    id: 'han-east',
    dynastyId: 'han',
    qualifier: 'Восточной Хань',
    cityId: 'luoyang',
    historicNameRu: 'Лоян',
    historicNameZh: '洛阳',
    pinyin: 'Luòyáng',
    asked: false,
    sourceIds: ['britannica-han-dynasty'],
  },
  {
    id: 'sui',
    dynastyId: 'sui',
    cityId: 'xian',
    historicNameRu: 'Дасин',
    historicNameZh: '大兴',
    pinyin: 'Dàxīng',
    asked: true,
    note: 'При Тан город переименовали в Чанъань — это нынешний Сиань.',
    sourceIds: ['britannica-sui-dynasty'],
  },
  {
    id: 'tang',
    dynastyId: 'tang',
    cityId: 'xian',
    historicNameRu: 'Чанъань',
    historicNameZh: '长安',
    pinyin: 'Cháng’ān',
    asked: true,
    note: 'Второй столицей на востоке был Лоян.',
    sourceIds: ['britannica-tang-dynasty'],
  },
  {
    id: 'song-north',
    dynastyId: 'song',
    qualifier: 'Северной Сун',
    cityId: 'kaifeng',
    historicNameRu: 'Бяньцзин',
    historicNameZh: '汴京',
    pinyin: 'Biànjīng',
    asked: true,
    note: 'После 1127 года Сун ушла на юг, и столицей стал Линьань — нынешний Ханчжоу.',
    sourceIds: ['britannica-song-dynasty'],
  },
  {
    id: 'song-south',
    dynastyId: 'song',
    qualifier: 'Южной Сун',
    cityId: 'hangzhou',
    historicNameRu: 'Линьань',
    historicNameZh: '临安',
    pinyin: 'Lín’ān',
    asked: false,
    sourceIds: ['britannica-song-dynasty'],
  },
  {
    id: 'yuan',
    dynastyId: 'yuan',
    cityId: 'beijing',
    historicNameRu: 'Даду',
    historicNameZh: '大都',
    pinyin: 'Dàdū',
    asked: true,
    note: 'Юань первой сделала столицей Пекин, перенеся её из Каракорума.',
    sourceIds: ['britannica-yuan-dynasty'],
  },
  {
    id: 'ming-early',
    dynastyId: 'ming',
    qualifier: 'ранней Мин',
    cityId: 'nanjing',
    historicNameRu: 'Нанкин',
    historicNameZh: '南京',
    pinyin: 'Nánjīng',
    asked: false,
    sourceIds: ['britannica-beijing'],
  },
  {
    id: 'ming-late',
    dynastyId: 'ming',
    qualifier: 'поздней Мин',
    cityId: 'beijing',
    historicNameRu: 'Пекин',
    historicNameZh: '北京',
    pinyin: 'Běijīng',
    asked: true,
    note: 'Первые полвека столицей был Нанкин; третий император Мин вернул её на север и дал городу нынешнее имя.',
    sourceIds: ['britannica-ming-dynasty', 'britannica-beijing'],
  },
  {
    id: 'qing',
    dynastyId: 'qing',
    cityId: 'beijing',
    historicNameRu: 'Пекин',
    historicNameZh: '北京',
    pinyin: 'Běijīng',
    asked: true,
    note: 'Маньчжуры заняли Пекин в 1644 году и оставили столицу там же.',
    sourceIds: ['britannica-qing-dynasty'],
  },
];

/** Столицы, о которых спрашивают: ровно по одной на династию. */
export function askedCapitals(): readonly DynastyCapital[] {
  return dynastyCapitals.filter((capital) => capital.asked);
}

export function capitalOfDynasty(
  dynastyId: string,
): DynastyCapital | undefined {
  return dynastyCapitals.find(
    (capital) => capital.asked && capital.dynastyId === dynastyId,
  );
}

export function capitalById(id: string): DynastyCapital | undefined {
  return dynastyCapitals.find((capital) => capital.id === id);
}
