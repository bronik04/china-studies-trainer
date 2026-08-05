import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { Attempt } from '../../domain/round';
import { RoundProgressTrail } from './RoundProgressTrail';

function attempt(isCorrect: boolean): Attempt {
  return {
    questionId: 'q',
    roundId: 'r',
    target: { kind: 'region', id: 'hunan' },
    exerciseType: 'find-on-map',
    language: 'ru',
    isCorrect,
    durationMs: 1000,
    answeredAt: '2026-08-04T12:00:00.000Z',
  };
}

it('ставит по отметке на вопрос', () => {
  const { container } = render(
    <RoundProgressTrail total={5} attempts={[attempt(true), attempt(false)]} />,
  );

  expect(container.querySelectorAll('[data-mark]')).toHaveLength(5);
});

it('различает верно, неверно и впереди', () => {
  const { container } = render(
    <RoundProgressTrail total={3} attempts={[attempt(true), attempt(false)]} />,
  );

  const marks = [...container.querySelectorAll('[data-mark]')].map((node) =>
    node.getAttribute('data-mark'),
  );

  expect(marks).toEqual(['correct', 'wrong', 'ahead']);
});

it('несёт смысл знаком, а не только цветом', () => {
  const { container } = render(
    <RoundProgressTrail total={3} attempts={[attempt(true), attempt(false)]} />,
  );

  const glyphs = [...container.querySelectorAll('[data-mark]')].map(
    (node) => node.textContent,
  );

  expect(new Set(glyphs).size).toBe(3);
});

it('скрыта от программ чтения: строка «Вопрос N из M» уже это сообщает', () => {
  const { container } = render(<RoundProgressTrail total={3} attempts={[]} />);

  expect(container.querySelector('.round-trail')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
});
