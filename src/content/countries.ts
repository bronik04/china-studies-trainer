export type Country = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly sourceIds: readonly string[];
};

/**
 * Четырнадцать государств, с которыми у Китая сухопутная граница.
 *
 * Тайваня, Гонконга и Макао здесь нет: на нашей карте это регионы Китая, и
 * рисовать их вторым слоем значило бы спорить с собственной картой.
 *
 * Имена берутся из того же набора Natural Earth, что и геометрия: два
 * источника — один для контура, другой для подписи — однажды разошлись бы. У
 * КНДР китайское имя в наборе полное, 朝鲜民主主义人民共和国; сокращать его до
 * 朝鲜 значило бы поправить источник от себя.
 *
 * Пиньиня у стран нет намеренно: набор его не даёт, а выписывать чтения руками
 * — это уже свой справочник с собственной ответственностью за ошибки.
 */
const SOURCE = ['natural-earth-countries-5.1.2'] as const;

function country(id: string, nameRu: string, nameZh: string): Country {
  return { id, nameRu, nameZh, sourceIds: SOURCE };
}

export const countries: readonly Country[] = [
  country('russia', 'Россия', '俄罗斯'),
  country('mongolia', 'Монголия', '蒙古国'),
  country('north-korea', 'КНДР', '朝鲜民主主义人民共和国'),
  country('kazakhstan', 'Казахстан', '哈萨克斯坦'),
  country('kyrgyzstan', 'Киргизия', '吉尔吉斯斯坦'),
  country('tajikistan', 'Таджикистан', '塔吉克斯坦'),
  country('afghanistan', 'Афганистан', '阿富汗'),
  country('pakistan', 'Пакистан', '巴基斯坦'),
  country('india', 'Индия', '印度'),
  country('nepal', 'Непал', '尼泊尔'),
  country('bhutan', 'Бутан', '不丹'),
  country('myanmar', 'Мьянма', '缅甸'),
  country('laos', 'Лаос', '老挝'),
  country('vietnam', 'Вьетнам', '越南'),
];

export function countryById(id: string): Country | undefined {
  return countries.find((country) => country.id === id);
}
