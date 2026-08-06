import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { physicalFeatures } from '../../content/physical-features';
import { PhysicalRound } from './PhysicalRound';

function renderRound(
  exerciseType: 'find-on-map' | 'name-target',
  features: readonly (typeof physicalFeatures)[number][] = physicalFeatures,
) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  const { container } = render(
    <PhysicalRound
      features={features}
      exerciseType={exerciseType}
      language="ru"
      roundId="r1"
      seed={11}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { container, onFinish, onExit };
}

it('спрашивает двадцать четыре объекта подряд', () => {
  renderRound('find-on-map');

  expect(screen.getByText(/Вопрос 1 из 24/)).toBeInTheDocument();
});

it('в «найти» вопрос называет объект, а карта его не подписывает', () => {
  const { container } = renderRound('find-on-map');

  expect(screen.getByTestId('exercise-target')).not.toHaveTextContent(
    'Объект на карте',
  );
  expect(container.querySelector('.physical-layer')).toHaveAttribute(
    'data-labels',
    'false',
  );
});

it('в «назвать» даёт четыре имени того же вида', () => {
  renderRound('name-target');

  const options = screen.getAllByTestId('choice-option');
  const kinds = options.map(
    (option) =>
      physicalFeatures.find((feature) => feature.id === option.dataset.choiceId)!
        .kind,
  );

  expect(options).toHaveLength(4);
  expect(new Set(kinds).size).toBe(1);
});

/*
 * Имя объекта есть и у формы на карте, и у кнопки равнозначного списка — это
 * два способа ответить на один вопрос, как у городов. Поэтому список
 * спрашивается отдельно, а не общим поиском по имени.
 */
function answerFromList(nameRu: string) {
  const list = screen.getByRole('list', { name: 'Список объектов' });

  fireEvent.click(within(list).getByRole('button', { name: nameRu }));
}

it('верный ответ из списка ведёт к следующему вопросу', () => {
  renderRound('find-on-map');

  const asked = screen.getByTestId('exercise-target').textContent!;

  answerFromList(asked);

  expect(screen.getByText(/Вопрос 1 из 24/)).toBeInTheDocument();
});

it('неверный ответ показывает разбор с правильным именем', () => {
  renderRound('find-on-map');

  const asked = screen.getByTestId('exercise-target').textContent!;
  const wrong = physicalFeatures.find((feature) => feature.nameRu !== asked)!;

  answerFromList(wrong.nameRu);

  // Разбор — единственное место, где имя объекта звучит как ответ, а не как
  // вопрос или как кнопка списка; его и спрашиваем.
  const feedback = screen.getByRole('heading', { name: /стоит повторить/ })
    .parentElement!;

  expect(within(feedback).getByText(new RegExp(asked))).toBeInTheDocument();
});

it('даёт прервать раунд', () => {
  const { onExit } = renderRound('name-target');

  fireEvent.click(screen.getByRole('button', { name: /Прервать раунд/ }));

  expect(onExit).toHaveBeenCalled();
});

it('сузившийся пул не сужает выбор: отвлекающие берутся из всех двенадцати', () => {
  // Так выглядит «Повторить ошибки» после двух промахов — по реке и по форме.
  // Своими же отвлекающими на вопросе про реку остался бы один вариант.
  const pool = physicalFeatures.filter(
    (feature) => feature.id === 'yangtze' || feature.id === 'gobi',
  );

  renderRound('name-target', pool);

  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});
