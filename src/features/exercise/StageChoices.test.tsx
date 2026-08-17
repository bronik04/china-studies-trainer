import { fireEvent, render, screen } from '@testing-library/react';
import { StageChoices } from './StageChoices';

const CHOICES = [
  { id: 'sichuan', label: 'Сычуань' },
  { id: 'hunan', label: 'Хунань' },
  { id: 'guizhou', label: 'Гуйчжоу' },
  { id: 'yunnan', label: 'Юньнань' },
] as const;

it('рисует кнопку с ярлыком клавиши для каждого варианта', () => {
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={() => {}} />);

  const buttons = screen.getAllByTestId('choice-option');
  expect(buttons).toHaveLength(4);
  expect(buttons[0].textContent).toBe('1Сычуань');
  expect(buttons[3].textContent).toBe('4Юньнань');
});

it('нажатие кнопки отдаёт id варианта', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.click(screen.getAllByTestId('choice-option')[1]);

  expect(onChoose).toHaveBeenCalledWith('hunan');
});

it('цифра с клавиатуры отвечает тем же вариантом', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '3' });

  expect(onChoose).toHaveBeenCalledWith('guizhou');
});

it('цифра без варианта и не-цифра игнорируются', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '5' });
  fireEvent.keyDown(document, { key: 'a' });

  expect(onChoose).not.toHaveBeenCalled();
});

it('выключенная полоса не слушает ни мышь, ни клавиши', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled onChoose={onChoose} />);

  fireEvent.click(screen.getAllByTestId('choice-option')[0]);
  fireEvent.keyDown(document, { key: '1' });

  expect(onChoose).not.toHaveBeenCalled();
});
