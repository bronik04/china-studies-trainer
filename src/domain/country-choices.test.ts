import { countries } from '../content/countries';
import { buildCountryChoices } from './country-choices';
import { createSeededRandom } from './random';

it('даёт четыре варианта, среди них верный, без повторов', () => {
  const choices = buildCountryChoices(countries, 'nepal', createSeededRandom(1));

  expect(choices).toHaveLength(4);
  expect(choices.map((country) => country.id)).toContain('nepal');
  expect(new Set(choices.map((country) => country.id)).size).toBe(4);
});

it('воспроизводится по сиду', () => {
  const first = buildCountryChoices(countries, 'laos', createSeededRandom(7));
  const second = buildCountryChoices(countries, 'laos', createSeededRandom(7));

  expect(first.map((one) => one.id)).toEqual(second.map((one) => one.id));
});

it('не знает страны — падает внятно, а не молча', () => {
  expect(() =>
    buildCountryChoices(countries, 'atlantis', createSeededRandom(1)),
  ).toThrow(/Неизвестная страна/);
});
