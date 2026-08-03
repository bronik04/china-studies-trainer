import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Round,
} from './round';

const OPTIONS = {
  exerciseType: 'find-on-map',
  level: 1,
} as const;

function newRound(seed = 1): Round {
  return createRound(regions, { ...OPTIONS, random: createSeededRandom(seed) });
}

function answerCurrent(round: Round, correct: boolean): Round {
  const question = currentQuestion(round);
  const wrongId = regions.find((region) => region.id !== question.regionId)!.id;

  return answerQuestion(round, {
    answeredRegionId: correct ? question.regionId : wrongId,
    durationMs: 1200,
    answeredAt: '2026-08-03T10:00:00.000Z',
  });
}

it('включает каждый регион ровно один раз', () => {
  const round = newRound();
  const regionIds = round.questions.map((question) => question.regionId);

  expect(regionIds).toHaveLength(34);
  expect(new Set(regionIds).size).toBe(34);
  expect([...regionIds].sort()).toEqual(regions.map((region) => region.id).sort());
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
      regionId: question.regionId,
      exerciseType: 'find-on-map',
      level: 1,
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
    /Раунд не создан: нет регионов/,
  );
});
