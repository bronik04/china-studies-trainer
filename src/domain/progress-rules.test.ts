import { cityTarget, physicalTarget, regionTarget, type Attempt } from './round';
import {
  bestAccuracy,
  masteredTargets,
  targetsToRepeat,
  summariseRound,
} from './progress-rules';

const NOW = new Date('2026-08-03T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    questionId: '1-sichuan',
    roundId: 'round-1',
    target: regionTarget('sichuan'),
    exerciseType: 'find-on-map',
    language: 'ru',
    isCorrect: true,
    durationMs: 1000,
    answeredAt: daysAgo(0),
    ...overrides,
  };
}

it('считает точность раунда', () => {
  const summary = summariseRound([
    attempt({ target: regionTarget('sichuan'), isCorrect: true, durationMs: 1000 }),
    attempt({ target: regionTarget('yunnan'), isCorrect: false, durationMs: 3000 }),
  ]);

  expect(summary.total).toBe(2);
  expect(summary.correct).toBe(1);
  expect(summary.accuracy).toBe(0.5);
  expect(summary.durationMs).toBe(4000);
});

it('собирает темы для повторения из ошибок раунда', () => {
  const summary = summariseRound([
    attempt({ target: regionTarget('sichuan'), isCorrect: false }),
    attempt({ target: regionTarget('yunnan'), isCorrect: true }),
  ]);

  expect(summary.targetsToReview).toEqual([regionTarget('sichuan')]);
});

it('в повтор идут все цели с ошибкой, а не первые пять', () => {
  const wrong = Array.from({ length: 8 }, (_, index) =>
    attempt({ target: regionTarget(`region-${index}`), isCorrect: false }),
  );

  expect(summariseRound(wrong).targetsToReview).toHaveLength(8);
});

/*
 * Повтор ошибок спрашивает цель дважды в одном раунде: без слияния она попала
 * бы и в список на экране, и в подпись кнопки два раза.
 */
it('не повторяет цель дважды', () => {
  const attempts = [
    attempt({ target: regionTarget('anhui'), isCorrect: false }),
    attempt({ target: regionTarget('anhui'), isCorrect: false }),
  ];

  expect(summariseRound(attempts).targetsToReview).toHaveLength(1);
});

it('без ответов даёт нулевую точность, а не деление на ноль', () => {
  expect(summariseRound([]).accuracy).toBe(0);
});

it('берёт лучшую точность среди прошлых раундов', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-1', isCorrect: false }),
    attempt({ roundId: 'round-2', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true }),
  ];

  expect(bestAccuracy(attempts)).toBe(1);
});

it('без истории рекорд равен нулю', () => {
  expect(bestAccuracy([])).toBe(0);
});

it('возвращает в повторение регионы с ошибкой за последние 14 дней', () => {
  const attempts = [
    attempt({ target: regionTarget('sichuan'), isCorrect: false, answeredAt: daysAgo(3) }),
    attempt({ target: regionTarget('yunnan'), isCorrect: false, answeredAt: daysAgo(20) }),
    attempt({ target: regionTarget('hebei'), isCorrect: true, answeredAt: daysAgo(1) }),
  ];

  expect(targetsToRepeat(attempts, NOW, 'region')).toEqual([regionTarget('sichuan')]);
});

it('не считает цель освоенной без верного ответа на иероглифах', () => {
  const attempts = [1, 2, 3].map((round) =>
    attempt({ roundId: `r${round}`, isCorrect: true, language: 'ru' }),
  );

  expect(masteredTargets(attempts, NOW, 'region')).toEqual([]);

  const withChinese = [...attempts, attempt({ roundId: 'r4', isCorrect: true, language: 'zh' })];

  expect(masteredTargets(withChinese, NOW, 'region')).toEqual([regionTarget('sichuan')]);
});

it('осваивает регион после трёх верных ответов в разных раундах', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, language: 'zh' }),
    attempt({ roundId: 'round-3', isCorrect: true }),
  ];

  expect(masteredTargets(attempts, NOW, 'region')).toEqual([regionTarget('sichuan')]);
});

it('снимает освоенность после ошибки за последние 14 дней', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, language: 'zh' }),
    attempt({ roundId: 'round-3', isCorrect: true }),
    attempt({ roundId: 'round-4', isCorrect: false, answeredAt: daysAgo(2) }),
  ];

  expect(masteredTargets(attempts, NOW, 'region')).toEqual([]);
});

it('не смешивает регионы и города в списке на повторение', () => {
  const attempts = [
    attempt({ target: { kind: 'region', id: 'gansu' }, isCorrect: false }),
    attempt({ target: { kind: 'city', id: 'lanzhou' }, isCorrect: false }),
  ];

  expect(targetsToRepeat(attempts, NOW, 'region')).toEqual([
    { kind: 'region', id: 'gansu' },
  ]);
  expect(targetsToRepeat(attempts, NOW, 'city')).toEqual([
    { kind: 'city', id: 'lanzhou' },
  ]);
});

it('не смешивает физические цели с регионами и городами', () => {
  const attempts = [
    attempt({ target: physicalTarget('yangtze'), isCorrect: false }),
    attempt({ target: regionTarget('hunan'), isCorrect: false }),
    attempt({ target: cityTarget('wuhan'), isCorrect: false }),
  ];

  expect(targetsToRepeat(attempts, NOW, 'physical')).toEqual([
    physicalTarget('yangtze'),
  ]);
  expect(targetsToRepeat(attempts, NOW, 'region')).toEqual([regionTarget('hunan')]);
});
