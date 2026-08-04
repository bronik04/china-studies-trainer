import {
  isRegionClosed,
  isRegionSelectable,
  type RegionSelectionRules,
} from './region-selection';

const OPEN: RegionSelectionRules = {
  interactive: true,
  paused: false,
  answerStates: {},
  outcomes: {},
};

it('открытый регион выбираем', () => {
  expect(isRegionClosed(OPEN, 'sichuan')).toBe(false);
  expect(isRegionSelectable(OPEN, 'sichuan')).toBe(true);
});

it('отвеченный регион закрыт', () => {
  const rules = { ...OPEN, answerStates: { sichuan: 'correct' } } as const;

  expect(isRegionClosed(rules, 'sichuan')).toBe(true);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('закрашенный регион закрыт', () => {
  const rules = { ...OPEN, outcomes: { sichuan: 'first-try' } } as const;

  expect(isRegionClosed(rules, 'sichuan')).toBe(true);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('пауза снимает выбираемость, но не закрывает регион', () => {
  // Различие важно: `disabled` на кнопке, где стоит фокус, сбрасывает его.
  const rules = { ...OPEN, paused: true };

  expect(isRegionClosed(rules, 'sichuan')).toBe(false);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('неинтерактивная карта не выбирает ничего', () => {
  expect(isRegionSelectable({ ...OPEN, interactive: false }, 'sichuan')).toBe(
    false,
  );
});
