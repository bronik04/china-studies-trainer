import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  createNeighboursRound,
  currentNeighboursQuestion,
  isNeighboursRoundFinished,
  submitNeighbours,
  toggleMark,
} from './neighbours-round';

function round() {
  return createNeighboursRound(regions, {
    roundId: 'r1',
    language: 'ru',
    random: createSeededRandom(1),
  });
}

const ANSWERED = {
  durationMs: 1000,
  answeredAt: '2026-08-30T10:00:00.000Z',
};

it('спрашивает тридцать регионов: без островов и без САР', () => {
  const created = round();

  expect(created.order).toHaveLength(30);

  const asked = created.order.map((question) => question.regionId);
  for (const excluded of ['hainan', 'taiwan', 'hong-kong', 'macao']) {
    expect(asked).not.toContain(excluded);
  }
});

it('отмечает и снимает отметку', () => {
  const marked = toggleMark(round(), 'hubei');

  expect(marked.marked).toContain('hubei');
  expect(toggleMark(marked, 'hubei').marked).not.toContain('hubei');
});

it('засчитывает только точное совпадение множества', () => {
  let created = round();
  const question = currentNeighboursQuestion(created);

  for (const id of question.neighbourIds) {
    created = toggleMark(created, id);
  }

  const { verdict } = submitNeighbours(created, ANSWERED);

  expect(verdict.isCorrect).toBe(true);
  expect(verdict.found).toHaveLength(question.neighbourIds.length);
  expect(verdict.missed).toEqual([]);
  expect(verdict.extra).toEqual([]);
});

it('считает пропущенных и лишних', () => {
  let created = round();
  const question = currentNeighboursQuestion(created);
  const [first] = question.neighbourIds;
  const stranger = regions.find(
    (region) =>
      region.id !== question.regionId &&
      !question.neighbourIds.includes(region.id),
  )!;

  created = toggleMark(created, first);
  created = toggleMark(created, stranger.id);

  const { verdict } = submitNeighbours(created, ANSWERED);

  expect(verdict.isCorrect).toBe(false);
  expect(verdict.found).toEqual([first]);
  expect(verdict.extra).toEqual([stranger.id]);
  expect(verdict.missed).toHaveLength(question.neighbourIds.length - 1);
});

it('пустой ответ — ошибка, а не пропуск вопроса', () => {
  const { verdict } = submitNeighbours(round(), ANSWERED);

  expect(verdict.isCorrect).toBe(false);
  expect(verdict.found).toEqual([]);
});

it('пишет попытку видом цели neighbours и идёт дальше', () => {
  const { round: next } = submitNeighbours(round(), ANSWERED);

  expect(next.attempts[0].target.kind).toBe('neighbours');
  expect(next.currentIndex).toBe(1);
  expect(next.marked).toEqual([]);
  expect(isNeighboursRoundFinished(next)).toBe(false);
});

it('воспроизводится по сиду', () => {
  const first = round().order.map((question) => question.regionId);
  const second = round().order.map((question) => question.regionId);

  expect(first).toEqual(second);
});
