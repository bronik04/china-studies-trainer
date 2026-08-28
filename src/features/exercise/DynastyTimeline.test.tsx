import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { dynasties } from '../../content/dynasties';
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
