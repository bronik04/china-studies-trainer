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
] as const satisfies readonly Source[];
