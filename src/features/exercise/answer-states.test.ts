import { regions } from '../../content/regions';
import { answerStatesFor } from './answer-states';

it('до ответа не ограничивает выбор', () => {
  expect(answerStatesFor(regions, 'sichuan', null)).toEqual({});
});

it('подсвечивает загаданный регион как верный', () => {
  const states = answerStatesFor(regions, 'sichuan', 'sichuan');

  expect(states.sichuan).toBe('correct');
});

it('отмечает неверный выбор и всё равно показывает правильный', () => {
  const states = answerStatesFor(regions, 'sichuan', 'yunnan');

  expect(states.yunnan).toBe('incorrect');
  expect(states.sichuan).toBe('correct');
});

it('закрывает остальные области после ответа', () => {
  const states = answerStatesFor(regions, 'sichuan', 'yunnan');

  expect(states.hebei).toBe('disabled');
  expect(Object.keys(states)).toHaveLength(34);
});
