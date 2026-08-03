import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { AnswerFeedback } from './AnswerFeedback';

const sichuan = regions.find((region) => region.id === 'sichuan')!;

it('сообщает о верном ответе и показывает связь с материалом', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
  expect(screen.getByText(/Чэнду/)).toBeInTheDocument();
});

it('поддерживает при ошибке и называет правильный ответ', () => {
  render(
    <AnswerFeedback
      isCorrect={false}
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
});

it('передаёт результат не только цветом', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('img', { name: 'Верно' })).toBeInTheDocument();
});

it('называет последнее действие раунда', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('button', { name: 'Завершить раунд' })).toBeInTheDocument();
});

it('переходит к следующему вопросу', () => {
  const next = vi.fn();
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={next}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(next).toHaveBeenCalledOnce();
});

it('переводит фокус на заголовок результата', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Верно' }));
});
