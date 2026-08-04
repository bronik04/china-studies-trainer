import {
  validateLandTones,
  validateMapAreaIds,
  validateTargetSizes,
} from './validate-map';

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

it('пропускает мелкую область, у которой есть цель нажатия', () => {
  expect(() =>
    validateTargetSizes(['shanghai'], ['shanghai'], []),
  ).not.toThrow();
});

it('пропускает мелкую область, вынесенную маркером', () => {
  expect(() => validateTargetSizes(['macao'], [], ['macao'])).not.toThrow();
});

it('сообщает о мелкой области без цели нажатия', () => {
  expect(() => validateTargetSizes(['shanghai'], [], [])).toThrow(
    /Область меньше 24 px и не имеет цели нажатия: shanghai/,
  );
});

it('пропускает область, которой хватает собственной геометрии', () => {
  expect(() => validateTargetSizes(['xinjiang'], [], [])).not.toThrow();
});

it('требует тон заливки для каждой области', () => {
  expect(() => validateLandTones(['sichuan'])).not.toThrow();
  expect(() => validateLandTones(['atlantis'])).toThrow(/Нет тона заливки/);
});
