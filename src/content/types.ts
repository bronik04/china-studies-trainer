export type RegionKind =
  | 'province'
  | 'autonomous-region'
  | 'municipality'
  | 'sar';

export type Fact = {
  readonly title: string;
  readonly body: string;
  readonly sourceIds: readonly string[];
  readonly imageAlt?: string;
};

export type Source = {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
  readonly accessedAt: string;
  readonly covers: readonly string[];
};

/**
 * Набор, в который город входит. Это и происхождение города в каталоге, и
 * объём партии: ученик выбирает набор в окне перед стартом — только столицы,
 * столицы и значимые города или всё вместе с приграничными.
 *
 * `capital` не флаг «столица ли»: он выводился бы из региона. Это ответ на
 * «откуда взялся этот город в списке», и потому лежит рядом с двумя другими.
 */
export type CitySet = 'capital' | 'notable' | 'border';

export type City = {
  readonly id: string;         // chengdu
  readonly regionId: string;   // sichuan
  readonly set: CitySet;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /**
   * Градусы, а не единицы viewBox: проекция применяется генератором слоя. Если
   * карта заменится, города переедут пересчётом, а не станут молча неверными —
   * как уже случилось с прежним контуром Тайваня.
   */
  readonly lon: number;
  readonly lat: number;
  readonly sourceIds: readonly string[];
};

export type Region = {
  readonly id: string;
  readonly kind: RegionKind;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /**
   * Административный центр — ссылка в справочник городов, а не пара имён.
   * Иначе у Чэнду два места правды, и они разъедутся при первой же правке.
   */
  readonly capitalCityId: string;
  readonly mapAreaId: string;
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};
