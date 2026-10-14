import { regions } from '../../content/regions';
import { hasUnaskedTargets } from './has-unasked';

const asked = (id: string) => ({ target: { id } });

it('после полного раунда несыгранных нет', () => {
  expect(hasUnaskedTargets(regions.map((region) => asked(region.id)), regions)).toBe(
    false,
  );
});

it('после повтора ошибок несыгранные есть', () => {
  expect(hasUnaskedTargets([asked('hunan'), asked('hubei')], regions)).toBe(true);
});

/* Две попытки по одной цели — одна цель, а не две. */
it('считает цели, а не попытки', () => {
  const tries = regions.slice(0, 33).flatMap((region) => [
    asked(region.id),
    asked(region.id),
  ]);

  expect(hasUnaskedTargets(tries, regions)).toBe(true);
});
