import { citiesWord } from './region-count';

it.each([
  [1, 'город'],
  [3, 'города'],
  [11, 'городов'],
  [21, 'город'],
  [57, 'городов'],
])('склоняет %i город(а/ов)', (count, word) => {
  expect(citiesWord(count)).toBe(word);
});
