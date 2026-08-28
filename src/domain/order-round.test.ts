import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { createSeededRandom } from './random';
import {
  createOrderRound,
  isOrderRoundFinished,
  MAX_ATTEMPTS_PER_NAME,
  placeName,
  type OrderMove,
  type OrderRound,
} from './order-round';

function newRound(seed = 1): OrderRound {
  return createOrderRound(dynasties, {
    roundId: 'round-1',
    language: 'ru',
    random: createSeededRandom(seed),
  });
}

const AT = '2026-08-28T10:00:00.000Z';

it('делит ленту на круги по четыре имени', () => {
  const round = newRound();

  expect(round.circles.flat()).toHaveLength(dynasties.length);
  expect(round.circles[0]).toHaveLength(4);
  expect(new Set(round.circles.flat()).size).toBe(dynasties.length);
});

it('верная постановка закрывает имя и пишет попытку', () => {
  const round = newRound();
  const nameId = round.pending[0];

  const { round: next, move } = placeName(round, {
    nameId,
    bandId: nameId,
    durationMs: 1000,
    answeredAt: AT,
  });

  expect(move).toEqual({
    kind: 'placed',
    dynastyId: nameId,
    outcome: 'first-try',
    wasFound: true,
  });
  expect(next.pending).not.toContain(nameId);
  expect(next.attempts).toHaveLength(1);
  expect(next.attempts[0].target).toEqual({ kind: 'history', id: nameId });
  expect(next.attempts[0].isCorrect).toBe(true);
});

/* Промах, пока попытки есть: имя возвращается в набор, попытка списывается. */
it('ошибка возвращает имя в набор', () => {
  const round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;

  const { round: next, move } = placeName(round, {
    nameId,
    bandId: wrongBand,
    durationMs: 1000,
    answeredAt: AT,
  });

  expect(move).toEqual({ kind: 'retry', attemptsLeft: 2 });
  expect(next.pending).toContain(nameId);
  expect(next.attemptsByName[nameId]).toBe(1);
  expect(next.attempts).toHaveLength(0);
});

/* На третьей ошибке имя ставится само и помечается несданным. */
it('после трёх ошибок имя ставится само', () => {
  let round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;
  let move: OrderMove | undefined;

  for (let index = 0; index < MAX_ATTEMPTS_PER_NAME; index += 1) {
    ({ round, move } = placeName(round, {
      nameId,
      bandId: wrongBand,
      durationMs: 500,
      answeredAt: AT,
    }));
  }

  expect(move).toEqual({
    kind: 'placed',
    dynastyId: nameId,
    outcome: 'failed',
    wasFound: false,
  });
  expect(round.outcomes[nameId]).toBe('failed');
  expect(round.attempts[0].isCorrect).toBe(false);
});

/* «Освоил» значит «взял с первой»: вторая попытка попадает в повтор. */
it('верный ответ со второй попытки не считается освоенным', () => {
  let round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;

  ({ round } = placeName(round, {
    nameId,
    bandId: wrongBand,
    durationMs: 500,
    answeredAt: AT,
  }));
  const { round: next } = placeName(round, {
    nameId,
    bandId: nameId,
    durationMs: 500,
    answeredAt: AT,
  });

  expect(next.outcomes[nameId]).toBe('second-try');
  expect(next.attempts[0].isCorrect).toBe(false);
});

it('пустой круг открывает следующий, а последний заканчивает раунд', () => {
  let round = newRound();

  while (!isOrderRoundFinished(round)) {
    const nameId = round.pending[0];
    ({ round } = placeName(round, {
      nameId,
      bandId: nameId,
      durationMs: 100,
      answeredAt: AT,
    }));
  }

  expect(round.attempts).toHaveLength(dynasties.length);
  expect(round.currentCircle).toBe(round.circles.length);
});

it('раунд повторяется по сиду', () => {
  expect(newRound(7).circles).toEqual(newRound(7).circles);
});

it('постановка имени не из круга — ошибка', () => {
  const round = newRound();
  const outsider = round.circles[1][0];

  expect(() =>
    placeName(round, {
      nameId: outsider,
      bandId: outsider,
      durationMs: 100,
      answeredAt: AT,
    }),
  ).toThrow(/не в этом круге/);
});

/*
 * Ревью 2026-08-28: счётчик попыток жил на раунде, а имён в круге четыре, и
 * ученик волен переключаться между ними. Ошибка по одному имени укорачивала
 * запас другому — и верный ответ по нему записывался как «со второй».
 */
it('попытки считаются на имя, а не на раунд', () => {
  let round = newRound();
  const [first, second] = round.pending;
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== first)!.id;

  ({ round } = placeName(round, {
    nameId: first,
    bandId: wrongBand,
    durationMs: 100,
    answeredAt: AT,
  }));

  const { round: next, move } = placeName(round, {
    nameId: second,
    bandId: second === wrongBand ? first : wrongBand,
    durationMs: 100,
    answeredAt: AT,
  });

  expect(move).toEqual({ kind: 'retry', attemptsLeft: 2 });
  expect(next.attemptsByName[first]).toBe(1);
  expect(next.attemptsByName[second]).toBe(1);
});

it('верный ответ по нетронутому имени остаётся освоенным', () => {
  let round = newRound();
  const [first, second] = round.pending;
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== first)!.id;

  ({ round } = placeName(round, {
    nameId: first,
    bandId: wrongBand,
    durationMs: 100,
    answeredAt: AT,
  }));
  const { round: next } = placeName(round, {
    nameId: second,
    bandId: second,
    durationMs: 100,
    answeredAt: AT,
  });

  expect(next.outcomes[second]).toBe('first-try');
  expect(next.attempts[0].isCorrect).toBe(true);
});
