import type { Source } from './types';

export const sources = [
  {
    id: 'prc-administrative-divisions-2022',
    title: '中华人民共和国行政区划',
    organization: '中国政府网',
    url: 'https://www.locpg.gov.cn/2022-06/07/c_1211652713.htm',
    accessedAt: '2026-08-01',
    covers: ['уровни административного деления', '34 единицы провинциального уровня'],
  },
  {
    id: 'china-internet-information-center-2003',
    title: 'Administrative Divisions of China',
    organization: 'China Internet Information Center',
    url: 'https://www.china.org.cn/e-Internet/GQ/HTM/1-1.htm',
    accessedAt: '2026-08-01',
    covers: ['названия единиц провинциального уровня', 'места размещения правительств'],
  },
  {
    id: 'natural-earth-populated-places-5.1.2',
    title: 'Natural Earth 10m Populated Places, версия 5.1.2',
    organization: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
    accessedAt: '2026-08-05',
    covers: ['координаты городов', 'русские и китайские названия городов для сверки'],
  },
  {
    id: 'wikidata-coordinates-2026-08-05',
    title: 'Викиданные, свойство P625 «координаты»',
    organization: 'Wikimedia Foundation',
    url: 'https://www.wikidata.org/wiki/Property:P625',
    accessedAt: '2026-08-05',
    covers: ['координаты городов, которых нет в Natural Earth'],
  },
] as const satisfies readonly Source[];
