import { citiesWord, regionsWord } from './region-count';

it.each([
  [1, 'город'],
  [3, 'города'],
  [11, 'городов'],
  [21, 'город'],
  [57, 'городов'],
])('склоняет %i город(а/ов)', (count, word) => {
  expect(citiesWord(count)).toBe(word);
});

it.each([
  [1, 'регион'],
  [11, 'регионов'],
  [25, 'регионов'],
  [34, 'региона'],
])('склоняет %i регион(а/ов)', (count, word) => {
  expect(regionsWord(count)).toBe(word);
});
