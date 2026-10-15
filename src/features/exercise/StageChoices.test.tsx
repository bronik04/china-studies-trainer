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

/*
 * Слушатель стоит на документе, и под окном «Прервать раунд и перейти…?»
 * цифра отвечала бы на вопрос, которого ученик за окном не видит.
 */
it('под открытым окном цифра не отвечает', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);
  const dialog = document.createElement('dialog');
  dialog.setAttribute('open', '');
  document.body.append(dialog);

  fireEvent.keyDown(document, { key: '2' });
  expect(onChoose).not.toHaveBeenCalled();

  dialog.remove();
  fireEvent.keyDown(document, { key: '2' });
  expect(onChoose).toHaveBeenCalledWith('hunan');
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

it('⌘1 не отвечает: это переключение вкладки браузера, а не ответ', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '1', metaKey: true });

  expect(onChoose).not.toHaveBeenCalled();
});

it('Ctrl+1 не отвечает по той же причине', () => {
  const onChoose = vi.fn();
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={onChoose} />);

  fireEvent.keyDown(document, { key: '1', ctrlKey: true });

  expect(onChoose).not.toHaveBeenCalled();
});

it('кнопки называют свою клавишу для читалок экрана', () => {
  render(<StageChoices choices={CHOICES} disabled={false} onChoose={() => {}} />);

  const buttons = screen.getAllByTestId('choice-option');

  expect(buttons[0]).toHaveAttribute('aria-keyshortcuts', '1');
  expect(buttons[3]).toHaveAttribute('aria-keyshortcuts', '4');
});
