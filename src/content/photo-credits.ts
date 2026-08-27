/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: Викисклад через scripts/data/collection-photos.json
 * Генератор: scripts/fetch-collection-photos.ts
 *
 * Автор и лицензия каждого снимка приходят из того же ответа Викисклада, что
 * и сам файл. Поэтому подпись под фотографией не может разойтись с тем, на
 * каких условиях её разрешено показывать.
 */

export type PhotoCredit = {
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string;
  /** Страница файла на Викискладе: там же полное описание и история. */
  readonly page: string;
  /**
   * Ширины файлов, которые действительно есть. Узкий оригинал не растягивается
   * до 1200, и разметка обязана ссылаться только на то, что лежит на диске.
   */
  readonly widths: readonly number[];
};

export const PHOTO_CREDITS: Readonly<Record<string, PhotoCredit>> = {
  'badaling': {
    author: "CEphoto, Uwe Aranas",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Badaling_China_Great-Wall-of-China-01.jpg",
    widths: [1200, 640],
  },
  'changban-opera': {
    author: "陈文 https://www.flickr.com/photos/univers-finder/",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Battle_of_Changban_Peking_Opera_3.jpg",
    widths: [1200, 640],
  },
  'crescent-lake': {
    author: "N509FZ",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Crescent_Lake_from_the_Singing_Sand_Dunes_(20230918101214).jpg",
    widths: [1200, 640],
  },
  'earthen': {
    author: "Matthew Summerton",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:The_Western_Part_of_The_Great_Wall,_Ningxia_-_panoramio.jpg",
    widths: [1200, 640],
  },
  'jiayuguan': {
    author: "User:Doron",
    license: "CC BY-SA 3.0",
    licenseUrl: "http://creativecommons.org/licenses/by-sa/3.0/",
    page: "https://commons.wikimedia.org/wiki/File:JiayuguanFort.jpg",
    widths: [1200, 640],
  },
  'mutianyu': {
    author: "Arian Zwegers",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Mutianyu_Great_Wall_(6222519140).jpg",
    widths: [1200, 640],
  },
  'shanhaiguan': {
    author: "颐园新居",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    page: "https://commons.wikimedia.org/wiki/File:Great_Wall_of_Shanhaiguan_20090809.jpg",
    widths: [1200, 640],
  },
  'taklamakan-dunes': {
    author: "6-A04-W96-K38-S41-V38",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:D%C3%A9sert_du_Taklamakan.jpg",
    widths: [1200, 640],
  },
  'temple-fair': {
    author: "Ngguls",
    license: "CC0",
    licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    page: "https://commons.wikimedia.org/wiki/File:%E7%99%BD%E4%BD%9B%E5%B1%B1%E6%98%A5%E8%8A%82%E5%A4%A7%E5%BA%99%E4%BC%9A.jpg",
    widths: [1200, 640],
  },
  'terracotta-pit-1': {
    author: "Walter-Wilhelm from Deutschland",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Terracotta_Soldier_Panorama_(5258589290).jpg",
    widths: [1200, 640],
  },
  'yanmenguan': {
    author: "N509FZ",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    page: "https://commons.wikimedia.org/wiki/File:Yanmen_Pass_(20250712164217).jpg",
    widths: [1200, 640],
  },
  'yuanyang-sunrise': {
    author: "Chiu Ho-yang",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    page: "https://commons.wikimedia.org/wiki/File:Yuanyang_Hani_Rice_Terraces_at_Sunrise.jpg",
    widths: [1200, 640],
  },
};
