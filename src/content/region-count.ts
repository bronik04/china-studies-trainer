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
