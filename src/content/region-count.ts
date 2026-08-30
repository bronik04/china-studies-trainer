/**
 * 1 регион, 2–4 региона, 5+ регионов. Число регионов в раунде переменное —
 * «Повторить ошибки» запускает раунд любой длины, — поэтому подпись не может
 * быть написана под 34.
 *
 * Живёт в `content`, а не рядом с картой: слово нужно и заголовку списка
 * регионов, и кнопке на экране итогов.
 */
export function regionsWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'регионов';
  }

  if (last === 1) {
    return 'регион';
  }

  return last >= 2 && last <= 4 ? 'региона' : 'регионов';
}

/** 1 город, 2–4 города, 5+ городов. */
export function citiesWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'городов';
  }

  if (last === 1) {
    return 'город';
  }

  return last >= 2 && last <= 4 ? 'города' : 'городов';
}

/** 1 страна, 2–4 страны, 5+ стран. */
export function countriesWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'стран';
  }

  if (last === 1) {
    return 'страна';
  }

  return last >= 2 && last <= 4 ? 'страны' : 'стран';
}

/** 1 достопримечательность, 2–4 достопримечательности, 5+ достопримечательностей. */
export function landmarksWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'достопримечательностей';
  }

  if (last === 1) {
    return 'достопримечательность';
  }

  return last >= 2 && last <= 4
    ? 'достопримечательности'
    : 'достопримечательностей';
}

/** 1 объект, 2–4 объекта, 5+ объектов. */
export function featuresWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'объектов';
  }

  if (last === 1) {
    return 'объект';
  }

  return last >= 2 && last <= 4 ? 'объекта' : 'объектов';
}

/** 1 коллекция, 2–4 коллекции, 5+ коллекций. */
export function collectionsWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'коллекций';
  }

  if (last === 1) {
    return 'коллекция';
  }

  return last >= 2 && last <= 4 ? 'коллекции' : 'коллекций';
}

/** 1 династия, 2–4 династии, 5+ династий. */
export function dynastiesWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'династий';
  }

  if (last === 1) {
    return 'династия';
  }

  return last >= 2 && last <= 4 ? 'династии' : 'династий';
}

/** 1 снимок, 2–4 снимка, 5+ снимков. */
export function photosWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'снимков';
  }

  if (last === 1) {
    return 'снимок';
  }

  return last >= 2 && last <= 4 ? 'снимка' : 'снимков';
}
