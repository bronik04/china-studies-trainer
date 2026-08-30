/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-neighbours.ts
 */

/**
 * Отпечаток контуров, из которых граф собран. Сверяется в `validate:map`:
 * правка контура без `npm run generate:neighbours` оставила бы соседство
 * прежним при зелёной сборке.
 */
export const NEIGHBOURS_INPUTS_FINGERPRINT = '907b5a57d5c9a2da';

/** Порог соприкосновения, при котором граф посчитан (единицы viewBox). */
export const NEIGHBOURS_EPSILON = 0.5;

export const REGION_NEIGHBOURS: Readonly<Record<string, readonly string[]>> = {
  'anhui': ['henan', 'hubei', 'jiangsu', 'jiangxi', 'shandong', 'zhejiang'],
  'beijing': ['hebei', 'tianjin'],
  'chongqing': ['guizhou', 'hubei', 'hunan', 'shaanxi', 'sichuan'],
  'fujian': ['guangdong', 'jiangxi', 'zhejiang'],
  'gansu': ['inner-mongolia', 'ningxia', 'qinghai', 'shaanxi', 'sichuan', 'xinjiang'],
  'guangdong': ['fujian', 'guangxi', 'hong-kong', 'hunan', 'jiangxi', 'macao'],
  'guangxi': ['guangdong', 'guizhou', 'hunan', 'yunnan'],
  'guizhou': ['chongqing', 'guangxi', 'hunan', 'sichuan', 'yunnan'],
  'hainan': [],
  'hebei': ['beijing', 'henan', 'inner-mongolia', 'liaoning', 'shandong', 'shanxi', 'tianjin'],
  'heilongjiang': ['inner-mongolia', 'jilin'],
  'henan': ['anhui', 'hebei', 'hubei', 'shaanxi', 'shandong', 'shanxi'],
  'hong-kong': ['guangdong'],
  'hubei': ['anhui', 'chongqing', 'henan', 'hunan', 'jiangxi', 'shaanxi'],
  'hunan': ['chongqing', 'guangdong', 'guangxi', 'guizhou', 'hubei', 'jiangxi'],
  'inner-mongolia': ['gansu', 'hebei', 'heilongjiang', 'jilin', 'liaoning', 'ningxia', 'shaanxi', 'shanxi'],
  'jiangsu': ['anhui', 'shandong', 'shanghai', 'zhejiang'],
  'jiangxi': ['anhui', 'fujian', 'guangdong', 'hubei', 'hunan', 'zhejiang'],
  'jilin': ['heilongjiang', 'inner-mongolia', 'liaoning'],
  'liaoning': ['hebei', 'inner-mongolia', 'jilin'],
  'macao': ['guangdong'],
  'ningxia': ['gansu', 'inner-mongolia', 'shaanxi'],
  'qinghai': ['gansu', 'sichuan', 'tibet', 'xinjiang'],
  'shaanxi': ['chongqing', 'gansu', 'henan', 'hubei', 'inner-mongolia', 'ningxia', 'shanxi', 'sichuan'],
  'shandong': ['anhui', 'hebei', 'henan', 'jiangsu'],
  'shanghai': ['jiangsu', 'zhejiang'],
  'shanxi': ['hebei', 'henan', 'inner-mongolia', 'shaanxi'],
  'sichuan': ['chongqing', 'gansu', 'guizhou', 'qinghai', 'shaanxi', 'tibet', 'yunnan'],
  'taiwan': [],
  'tianjin': ['beijing', 'hebei'],
  'tibet': ['qinghai', 'sichuan', 'xinjiang', 'yunnan'],
  'xinjiang': ['gansu', 'qinghai', 'tibet'],
  'yunnan': ['guangxi', 'guizhou', 'sichuan', 'tibet'],
  'zhejiang': ['anhui', 'fujian', 'jiangsu', 'jiangxi', 'shanghai'],
};
