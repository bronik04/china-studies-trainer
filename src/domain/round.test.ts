import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  answerQuestion,
  cityTarget,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  physicalTarget,
  regionTarget,
  sameTarget,
  targetKey,
  type Round,
} from './round';

const OPTIONS = {
  roundId: 'round-1',
  exerciseTypes: ['find-on-map'],
  language: 'ru',
} as const;

const targets = regions.map((region) => regionTarget(region.id));

function newRound(seed = 1): Round {
  return createRound(targets, { ...OPTIONS, random: createSeededRandom(seed) });
}

function answerCurrent(round: Round, correct: boolean): Round {
  const question = currentQuestion(round);
  const wrongId = regions.find((region) => region.id !== question.target.id)!.id;

  return answerQuestion(round, {
    answeredId: correct ? question.target.id : wrongId,
    durationMs: 1200,
    answeredAt: '2026-08-03T10:00:00.000Z',
  });
}

it('включает каждый регион ровно один раз', () => {
  const round = newRound();
  const answered = round.questions.map((question) => question.target.id);

  expect(answered).toHaveLength(34);
  expect(new Set(answered).size).toBe(34);
  expect([...answered].sort()).toEqual(regions.map((region) => region.id).sort());
});

it('даёт один и тот же порядок при одном seed', () => {
  expect(newRound(5).questions).toEqual(newRound(5).questions);
});

it('даёт разный порядок при разных seed', () => {
  expect(newRound(5).questions).not.toEqual(newRound(6).questions);
});

it('начинается с первого вопроса в состоянии готовности', () => {
  const round = newRound();

  expect(round.currentIndex).toBe(0);
  expect(round.status).toBe('ready');
  expect(round.attempts).toEqual([]);
  expect(isRoundFinished(round)).toBe(false);
});

it('записывает верный ответ', () => {
  const round = newRound();
  const question = currentQuestion(round);

  const answered = answerCurrent(round, true);

  expect(answered.status).toBe('feedback');
  expect(answered.attempts).toEqual([
    {
      questionId: question.id,
      roundId: 'round-1',
      target: question.target,
      exerciseType: 'find-on-map',
      language: 'ru',
      isCorrect: true,
      durationMs: 1200,
      answeredAt: '2026-08-03T10:00:00.000Z',
    },
  ]);
});

it('записывает неверный ответ', () => {
  const answered = answerCurrent(newRound(), false);

  expect(answered.attempts[0].isCorrect).toBe(false);
});

it('не принимает второй ответ на тот же вопрос', () => {
  const answered = answerCurrent(newRound(), true);

  expect(() => answerCurrent(answered, true)).toThrow(
    /Повторный ответ на вопрос запрещён/,
  );
});

it('не пускает к следующему вопросу без ответа', () => {
  expect(() => goToNextQuestion(newRound())).toThrow(
    /Переход к следующему вопросу возможен только после ответа/,
  );
});

it('переходит к следующему вопросу после ответа', () => {
  const next = goToNextQuestion(answerCurrent(newRound(), true));

  expect(next.currentIndex).toBe(1);
  expect(next.status).toBe('ready');
  expect(next.attempts).toHaveLength(1);
});

it('не изменяет исходный раунд', () => {
  const round = newRound();

  answerCurrent(round, true);

  expect(round.status).toBe('ready');
  expect(round.attempts).toEqual([]);
});

it('завершается после ответа на все регионы', () => {
  let round = newRound();

  for (let i = 0; i < 34; i += 1) {
    round = goToNextQuestion(answerCurrent(round, true));
  }

  expect(isRoundFinished(round)).toBe(true);
  expect(round.attempts).toHaveLength(34);
  expect(() => currentQuestion(round)).toThrow(/Раунд завершён/);
});

it('не создаёт раунд без регионов', () => {
  expect(() => createRound([], { ...OPTIONS, random: createSeededRandom(1) })).toThrow(
    /Раунд не создан: нет целей/,
  );
});

it('помечает вопросы и попытки признаком раунда', () => {
  const round = createRound(targets, {
    ...OPTIONS,
    roundId: 'round-7',
    random: createSeededRandom(1),
  });

  expect(round.questions[0].roundId).toBe('round-7');
  expect(answerCurrent(round, true).attempts[0].roundId).toBe('round-7');
});

it('чередует типы заданий, когда их несколько', () => {
  const round = createRound(targets, {
    roundId: 'round-1',
    exerciseTypes: ['find-on-map', 'name-target', 'match-pair'],
    language: 'ru',
    random: createSeededRandom(1),
  });

  expect(round.questions.slice(0, 4).map((question) => question.exerciseType)).toEqual([
    'find-on-map',
    'name-target',
    'match-pair',
    'find-on-map',
  ]);
});

it('задаёт весь раунд на одном языке', () => {
  const round = createRound(targets, {
    ...OPTIONS,
    language: 'zh',
    random: createSeededRandom(1),
  });

  expect(round.questions.every((question) => question.language === 'zh')).toBe(true);
});

it('делает целью вопроса регион с явным видом', () => {
  const round = newRound();

  expect(round.questions[0].target.kind).toBe('region');
  expect(regions.map((region) => region.id)).toContain(round.questions[0].target.id);
});

it('различает цели по виду, а не только по идентификатору', () => {
  expect(sameTarget({ kind: 'region', id: 'beijing' }, { kind: 'city', id: 'beijing' })).toBe(
    false,
  );
  expect(targetKey({ kind: 'city', id: 'beijing' })).toBe('city:beijing');
});

it('не создаёт раунд без типов заданий', () => {
  expect(() =>
    createRound(targets, {
      roundId: 'round-1',
      exerciseTypes: [],
      language: 'ru',
      random: createSeededRandom(1),
    }),
  ).toThrow(/Раунд не создан: не заданы типы заданий/);
});

/*
 * В игре «город — регион» спрашивают город, а отвечают нажатием по области:
 * сравнивать ответ с идентификатором города нечего.
 */
it('принимает ответ другого вида, когда игра его назвала', () => {
  const round = createRound([cityTarget('chengdu')], {
    ...OPTIONS,
    random: createSeededRandom(1),
  });

  const answered = answerQuestion(round, {
    answeredId: 'sichuan',
    expectedId: 'sichuan',
    durationMs: 1000,
    answeredAt: '2026-08-05T10:00:00.000Z',
  });

  expect(answered.attempts[0].isCorrect).toBe(true);
  expect(answered.attempts[0].target).toEqual({ kind: 'city', id: 'chengdu' });
});

it('физическая цель не смешивается с одноимённой целью другого вида', () => {
  expect(targetKey(physicalTarget('yangtze'))).toBe('physical:yangtze');
  expect(sameTarget(physicalTarget('gobi'), regionTarget('gobi'))).toBe(false);
});

it('раунд по физическим целям спрашивает каждую ровно один раз', () => {
  const targets = physicalFeatures.map((feature) => physicalTarget(feature.id));
  const round = createRound(targets, {
    roundId: 'r1',
    exerciseTypes: ['find-on-map'],
    language: 'ru',
    random: createSeededRandom(7),
  });

  expect(round.questions).toHaveLength(18);
  expect(new Set(round.questions.map((question) => question.target.id)).size).toBe(18);
});
