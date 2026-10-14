import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { dynasties, spanLabel } from '../../content/dynasties';
import { DynastyTimeline } from './DynastyTimeline';

/**
 * Полоса династии. Доступного имени у неё нет, пока лента не отвечает, —
 * поэтому ищем по признаку разметки, а не по роли.
 */
function spanOf(dynastyId: string): HTMLElement {
  const span = document.querySelector(`[data-dynasty-id='${dynastyId}']`);
  if (span === null) {
    throw new Error(`На ленте нет полосы ${dynastyId}`);
  }

  return span as HTMLElement;
}

/*
 * Прежде лента красила спрошенную полосу киноварью при любом ответе, и верный
 * ответ читался как ошибка: красное пятно во всю ленту крупнее зелёной
 * обводки на кнопке.
 */
it('верный ответ помечает полосу нефритом, а не киноварью', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'correct' }]}
      showsNames
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('correct');
});

/*
 * При ошибке видно и верный срок, и величину промаха: расстояние между двумя
 * метками на ленте и есть промах — три века, а не «неверно».
 */
it('при ошибке помечены обе полосы: верная и выбранная', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[
        { dynastyId: 'tang', kind: 'correct' },
        { dynastyId: 'song', kind: 'wrong' },
      ]}
      showsNames
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('correct');
  expect(spanOf('song').dataset.mark).toBe('wrong');
});

it('без меток лента молчит и скрыта от читалки экрана', () => {
  const { container } = render(
    <DynastyTimeline dynasties={dynasties} showsNames={false} />,
  );

  expect(container.querySelector('[data-mark]')).toBeNull();
  expect(screen.queryByText('Тан')).toBeNull();
  expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
});

/*
 * Полоса называется сроком, а не именем: имя династии и есть ответ, и назвать
 * его читалке экрана значило бы отдать ответ тому, кто не видит ленты. Тот же
 * довод, что у скрытых подписей городов и выносок Макао.
 */
it('полоса названа сроком, а не именем династии', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      showsNames={false}
      onAnswer={vi.fn()}
    />,
  );

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;

  expect(screen.getByRole('button', { name: spanLabel(tang) })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Тан/ })).toBeNull();
});

it('нажатие по полосе отвечает', () => {
  const onAnswer = vi.fn();
  render(
    <DynastyTimeline
      dynasties={dynasties}
      showsNames={false}
      onAnswer={onAnswer}
    />,
  );

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;
  fireEvent.click(screen.getByRole('button', { name: spanLabel(tang) }));

  expect(onAnswer).toHaveBeenCalledWith('tang');
});

it('без колбэка полос-кнопок нет', () => {
  render(<DynastyTimeline dynasties={dynasties} showsNames={false} />);

  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

/*
 * Лента идёт змейкой: на поворотах — Шан, Хань и Тан. Помеченная династия на
 * повороте красит и сам поворот: время через рубеж не прерывается.
 */
it('поворот змейки несёт метку династии, которая через него идёт', () => {
  const { container } = render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'correct' }]}
      showsNames
    />,
  );

  const turns = [...container.querySelectorAll('.timeline-turn')] as HTMLElement[];

  expect(turns.map((turn) => turn.dataset.turnDynastyId)).toEqual([
    'shang',
    'han',
    'tang',
  ]);
  expect(turns[2].dataset.mark).toBe('correct');
  expect(turns[0].dataset.mark).toBeUndefined();
});

/*
 * Династия, разрезанная поворотом, — одна цель: кнопка с её сроком одна, а
 * второй отрезок нажимается, но скрыт от читалки.
 */
it('у династии на повороте одна кнопка с её сроком', () => {
  const onAnswer = vi.fn();
  const { container } = render(
    <DynastyTimeline dynasties={dynasties} showsNames={false} onAnswer={onAnswer} />,
  );

  const han = dynasties.find((dynasty) => dynasty.id === 'han')!;

  expect(screen.getAllByRole('button', { name: spanLabel(han) })).toHaveLength(1);

  const hidden = container.querySelector(
    "[data-hit-dynasty-id='han'][aria-hidden='true']",
  ) as HTMLElement;
  fireEvent.click(hidden);

  expect(onAnswer).toHaveBeenCalledWith('han');
});

/*
 * В играх о столицах и правителях лента не отвечает, а показывает место во
 * времени. Подпись здесь не утечка: спрашивают город или человека, а не срок.
 */
it('спрошенная полоса обведена и подписана, но не залита исходом', () => {
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'asked' }]}
      showsNames={false}
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('asked');
  expect(screen.getByText('Тан')).toBeInTheDocument();
  /* Остальные молчат: подписана только спрошенная. */
  expect(screen.queryByText('Сун')).toBeNull();
});

/*
 * В расстановке поставленное имя занимает свою полосу: она подписана и больше
 * не принимает нажатия — целиться в закрытое место незачем.
 */
it('занятая полоса подписана и не нажимается', () => {
  const onAnswer = vi.fn();
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'taken' }]}
      showsNames={false}
      onAnswer={onAnswer}
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('taken');
  expect(screen.getByText('Тан')).toBeInTheDocument();

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;
  fireEvent.click(screen.getByRole('button', { name: spanLabel(tang) }));

  expect(onAnswer).not.toHaveBeenCalled();
});
