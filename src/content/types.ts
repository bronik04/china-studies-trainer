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

/**
 * Династия и срок её правления. Годы числами: до нашей эры — отрицательные,
 * подпись собирает `spanLabel`. Приблизительность отмечается у каждого конца
 * отдельно: у Ся условны оба, у Шан — только начало.
 */
export type Dynasty = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  readonly from: number;
  readonly to: number;
  readonly approximateFrom?: boolean;
  readonly approximateTo?: boolean;
  /** Одна-две фразы: чем эта династия запомнилась. Показывается после ответа. */
  readonly note: string;
  readonly sourceIds: readonly string[];
};

export type Source = {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  /** Короткое имя организации для строк интерфейса («Britannica», «БРЭ»). */
  readonly shortLabel?: string;
  readonly url: string;
  readonly accessedAt: string;
  readonly covers: readonly string[];
};

/**
 * Набор, в который город входит. Это и происхождение города в каталоге, и
 * объём партии: ученик выбирает набор в окне перед стартом — только столицы
 * или столицы вместе со значимыми городами.
 *
 * `capital` не флаг «столица ли»: он выводился бы из региона. Это ответ на
 * «откуда взялся этот город в списке», и потому лежит рядом со вторым.
 */
export type CitySet = 'capital' | 'notable';

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

/**
 * Ступень рельефа Китая (三级阶梯). Первая — Тибетское нагорье, вторая —
 * плато и котловины, третья — восточные равнины. Понятие школьной географии:
 * в Natural Earth такого поля нет, разметка живёт входом генератора.
 */
export type ReliefStep = 1 | 2 | 3;

export type PhysicalKind = 'river' | 'landform' | 'lake';

type PhysicalCommon = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /**
   * Регионы, которых объект касается. Не украшение: `validate:map` проверяет
   * каждый заявленный регион геометрией и ловит этим и опечатку в номере
   * отрезка, и неверную привязку, и расхождение проекции.
   */
  readonly regionIds: readonly string[];
  /**
   * Длина реки и куда она впадает — факты со своими источниками, а не поля.
   * `lengthKm: number` пришлось бы заполнить числом без источника: у Амура
   * «длина» означает то 2824 км, то 4444 — смотря считать ли Аргунь.
   */
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};

export type PhysicalFeature = PhysicalCommon &
  (
    | {
        readonly kind: 'river';
        /**
         * Номера отрезков в Natural Earth. Именно номера: имена там не
         * уникальны — `Quan` есть и в Гуанси, и в Хэнани.
         */
        readonly riverNums: readonly number[];
      }
    | {
        readonly kind: 'landform';
        readonly step: ReliefStep;
        /**
         * `range` — горный хребет. Он такая же форма рельефа, как плато или
         * котловина, и отличается только вытянутостью: заводить ему отдельный
         * род значило бы развести по разным группам то, что на карте
         * нарисовано одинаково, — и подсказать ответ видом подсветки.
         */
        readonly landform: 'plateau' | 'plain' | 'basin' | 'desert' | 'range';
      }
    | {
        readonly kind: 'lake';
        /**
         * Номера объектов в Natural Earth. Именно номера, а не имена: имена
         * там не уникальны — то же правило, по которому река задаётся
         * `rivernum`. Список, потому что крупное озеро набор режет на части.
         */
        readonly lakeIds: readonly number[];
      }
  );
