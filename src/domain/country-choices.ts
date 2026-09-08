import type { Country } from '../content/countries';
import { shuffle } from './random';
import { CHOICE_COUNT } from './choices';

/**
 * Четыре варианта для «назвать страну»: верный и три отвлекающих.
 *
 * Правила близости здесь нет и не нужно: все четырнадцать и так соседи Китая,
 * и «страна с другого конца света», которую отсеивают у городов, тут
 * невозможна по составу набора.
 */
export function buildCountryChoices(
  countries: readonly Country[],
  targetId: string,
  random: () => number,
): readonly Country[] {
  const target = countries.find((country) => country.id === targetId);
  if (!target) {
    throw new Error(`Неизвестная страна: ${targetId}`);
  }

  const others = shuffle(
    countries.filter((country) => country.id !== target.id),
    random,
  );

  return shuffle([target, ...others.slice(0, CHOICE_COUNT - 1)], random);
}
