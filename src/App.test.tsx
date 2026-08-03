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

it('показывает итог после раунда и возвращает к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));

  for (let index = 0; index < 34; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${asked} \\(`) }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 33 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'К теме' }));

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
}, 30_000);

it('повторяет все ошибки, а не только показанные пять', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));

  for (let index = 0; index < 34; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    const wrong = screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.textContent?.includes('(') &&
          !button.textContent.startsWith(`${asked} (`) &&
          button.closest('.map-alternative') !== null,
      );
    fireEvent.click(wrong!);
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 33 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(screen.getByText('0%')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Повторить ошибки' }));

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
}, 30_000);
