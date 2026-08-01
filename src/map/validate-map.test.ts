import { validateMapAreaIds } from './validate-map';

it('accepts one map area for each catalog region', () => {
  expect(() => validateMapAreaIds(['sichuan'], ['sichuan'])).not.toThrow();
});

it('reports every missing and duplicate map area', () => {
  expect(() =>
    validateMapAreaIds(['sichuan', 'yunnan'], ['sichuan', 'sichuan']),
  ).toThrow(
    /Нет области карты: yunnan[\s\S]*Повторяющаяся область карты: sichuan/,
  );
});

it('reports an area that is not in the catalog', () => {
  expect(() => validateMapAreaIds(['sichuan'], ['sichuan', 'unknown'])).toThrow(
    /Неизвестная область карты: unknown/,
  );
});
