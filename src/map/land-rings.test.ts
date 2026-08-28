import { expect, it } from 'vitest';
import { parseLandRings } from './land-rings';

it('берёт кольца из всех контуров разметки', () => {
  const markup = `
    <svg>
      <path id="a" d="M 0 0 L 10 0 L 10 10 Z" />
      <path id="b" d="M 20 20 L 30 20 L 30 30 Z" />
      <circle cx="5" cy="5" r="2" />
    </svg>
  `;

  expect(parseLandRings(markup)).toHaveLength(2);
});

/* Выноски Макао и Гонконга — кружки и линии, сушей они не являются. */
it('не берёт ничего, кроме контуров', () => {
  const markup = '<svg><circle cx="5" cy="5" r="2" /></svg>';

  expect(parseLandRings(markup)).toEqual([]);
});
