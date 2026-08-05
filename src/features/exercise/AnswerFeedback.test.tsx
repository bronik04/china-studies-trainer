import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { AnswerFeedback } from './AnswerFeedback';

const sichuan = regions.find((region) => region.id === 'sichuan')!;

it('поддерживает при ошибке и называет правильный ответ', () => {
  render(
    <AnswerFeedback targetRegion={sichuan} isLastQuestion={false} onNext={() => {}} />,
  );

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
  expect(screen.getByText(/Чэнду/)).toBeInTheDocument();
});

it('передаёт результат не только цветом', () => {
  render(
    <AnswerFeedback targetRegion={sichuan} isLastQuestion={false} onNext={() => {}} />,
  );

  expect(
    screen.getByRole('img', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
});

it('называет последнее действие раунда', () => {
  render(<AnswerFeedback targetRegion={sichuan} isLastQuestion onNext={() => {}} />);

  expect(screen.getByRole('button', { name: 'Завершить раунд' })).toBeInTheDocument();
});

it('переходит к следующему вопросу', () => {
  const next = vi.fn();
  render(<AnswerFeedback targetRegion={sichuan} isLastQuestion={false} onNext={next} />);

  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(next).toHaveBeenCalledOnce();
});

it('переводит фокус на заголовок результата', () => {
  render(
    <AnswerFeedback targetRegion={sichuan} isLastQuestion={false} onNext={() => {}} />,
  );

  expect(document.activeElement).toBe(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  );
});
