import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

it('shows the topic page', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});

it('shows the interactive map and keeps its selection in the page state', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Интерактивная карта' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань (四川省)' }));

  expect(screen.getByRole('status')).toHaveTextContent('Выбрано: Сычуань (四川省)');
});

it('открывает упражнение и возвращается к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));
  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));
  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});
