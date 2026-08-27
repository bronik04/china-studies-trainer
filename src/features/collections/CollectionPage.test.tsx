import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { collectionById, type Collection } from '../../content/collections';
import { physicalFeatures } from '../../content/physical-features';
import { regions } from '../../content/regions';
import { CollectionPage } from './CollectionPage';

function byId(id: string): Collection {
  const collection = collectionById(id);
  if (collection === undefined) {
    throw new Error(`Нет коллекции ${id}`);
  }

  return collection;
}

function renderPage(id: string) {
  return renderCollection(byId(id));
}

function renderCollection(collection: Collection) {
  const handlers = {
    onOpenCollections: vi.fn(),
    onOpenCollection: vi.fn(),
    onTrainRegions: vi.fn(),
  };

  render(
    <CollectionPage
      collection={collection}
      regions={regions}
      {...handlers}
    />,
  );

  return handlers;
}

/**
 * Черновиков в каталоге больше нет — у всех коллекций есть источники. Эти
 * тесты проверяют экран черновика как таковой, а не какую-то конкретную
 * запись каталога, поэтому фикстура собрана прямо здесь, а не позаимствована
 * у настоящей коллекции.
 */
const draftCollection: Collection = {
  id: 'draft-fixture',
  groupId: 'culture',
  nameRu: 'Черновая коллекция',
  nameZh: '草稿',
  pinyin: 'cǎogǎo',
  kind: 'явление',
  lead: '',
  regionIds: ['beijing'],
  notes: [],
  photos: [],
  sourceIds: [],
  relatedIds: [],
};

it('называет коллекцию по-русски, иероглифами и пиньинем', () => {
  const { container } = render(
    <CollectionPage
      collection={byId('great-wall')}
      regions={regions}
      onOpenCollections={vi.fn()}
      onOpenCollection={vi.fn()}
      onTrainRegions={vi.fn()}
    />,
  );

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Великая стена',
  );
  expect(container.querySelector('[lang="zh-Hans"]')).toHaveTextContent('长城');
  expect(container.querySelector('[lang="zh-Latn-pinyin"]')).toHaveTextContent(
    'Chángchéng',
  );
});

it('перечисляет регионы коллекции списком, а не только заливкой на карте', () => {
  renderPage('great-wall');

  const list = document.querySelector('.member-list');

  expect(list).not.toBeNull();
  expect(list?.querySelectorAll('li')).toHaveLength(9);
  expect(list).toHaveTextContent('Ляонин');
});

it('легенда карты коллекции называет оба состояния словами', () => {
  renderPage('great-wall');

  expect(screen.getByText(/входит в коллекцию/)).toBeInTheDocument();
  expect(screen.getByText(/остальные/)).toBeInTheDocument();
});

it('«спросить эти регионы» запускает раунд ровно по ним', () => {
  const { onTrainRegions } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: 'Спросить эти регионы' }));

  expect(onTrainRegions).toHaveBeenCalledWith(byId('great-wall').regionIds);
});

it('черновик признаётся черновиком, пока у него нет источника', () => {
  renderCollection(draftCollection);

  expect(screen.getByTestId('draft-note')).toHaveTextContent(
    'содержание этой коллекции ещё не проверено по источникам',
  );
});

it('ненаписанная справка названа ненаписанной, а раздел не исчезает', () => {
  renderCollection(draftCollection);

  expect(
    screen.getByRole('heading', { level: 2, name: 'Что стоит знать' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Справка ещё не написана/)).toBeInTheDocument();
});

it('отсутствие снимков объявлено, а не спрятано', () => {
  renderCollection(draftCollection);

  expect(
    screen.getByText(/Пока их нет, коллекция работает как список регионов/),
  ).toBeInTheDocument();
  expect(screen.getByText('снимков пока нет')).toBeInTheDocument();
});

it('коллекция без привязки к регионам не показывает карту и кнопку раунда', () => {
  renderPage('spring-festival');

  expect(
    screen.queryByRole('button', { name: 'Спросить эти регионы' }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Вся страна/)).toBeInTheDocument();
});

it('хлебные крошки возвращают в раздел', () => {
  const { onOpenCollections } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: 'Коллекции' }));

  expect(onOpenCollections).toHaveBeenCalled();
});

it('«смотрите также» ведёт в соседнюю коллекцию', () => {
  const { onOpenCollection } = renderPage('great-wall');

  fireEvent.click(screen.getByRole('button', { name: /Шёлковый путь/ }));

  expect(onOpenCollection).toHaveBeenCalledWith('silk-road');
});

it('называет источники именами, а не идентификаторами', () => {
  renderPage('great-wall');

  const panel = screen.getByText('Источники').closest('section')!;

  expect(panel).toHaveTextContent('ЮНЕСКО');
  expect(panel).not.toHaveTextContent('unesco-great-wall-438');
});

/*
 * У коллекции «по регионам» имя, иероглифы и пиньинь дословно совпадают с
 * регионом — их уже говорит заголовок страницы. Место под фотографию, которой
 * нет, здесь занимала заглушка, тогда как справочник о регионе давно написан:
 * центр, факты с источниками, города. Она и встаёт на это место.
 */
it('показывает справку региона вместо места под фотографию', () => {
  renderPage('region-yunnan');

  expect(
    document.querySelector('.photo-slot[data-photo-height="hero"]'),
  ).toBeNull();
  expect(screen.getByText(/Административный центр: Куньмин/)).toBeInTheDocument();
  expect(screen.getByText('Ботанический рекордсмен')).toBeInTheDocument();
  expect(screen.getByText(/Источники: /)).toBeInTheDocument();
});

/*
 * Имя не повторяется: его уже несёт заголовок страницы. В хлебных крошках и в
 * списке регионов коллекции слово «Юньнань» стоит законно, поэтому считаются
 * заголовки, а не вхождения текста.
 */
it('не повторяет имя региона вторым заголовком', () => {
  renderPage('region-yunnan');

  expect(screen.getAllByRole('heading', { name: 'Юньнань' })).toHaveLength(1);
});

/*
 * Коллекция не о регионе, а о месте: её нельзя подменять справкой того
 * региона, в котором место стоит. Там место под фотографию остаётся.
 */
it('оставляет место под фотографию у коллекции о месте', () => {
  renderPage('yuanyang-terraces');

  expect(
    document.querySelector('.photo-slot[data-photo-height="hero"]'),
  ).not.toBeNull();
});

/*
 * У региона без дописок справка приходит из справочника и стоит на странице
 * целиком. Пометки «описание ещё не написано» и «справка ещё не написана» под
 * ней были бы прямой неправдой.
 */
it('не объявляет пустой страницу региона, у которой есть справка', () => {
  renderPage('region-hainan');

  expect(screen.getByText(/Административный центр: Хайкоу/)).toBeInTheDocument();
  expect(screen.queryByText(/Описание ещё не написано/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Справка ещё не написана/)).not.toBeInTheDocument();
  expect(screen.queryByTestId('draft-note')).not.toBeInTheDocument();
});

/* Дописки не пропадают: у Юньнани раздел «Что стоит знать» остаётся. */
it('оставляет дописанную справку там, где её написали', () => {
  renderPage('region-yunnan');

  expect(
    screen.getByRole('heading', { level: 2, name: 'Что стоит знать' }),
  ).toBeInTheDocument();
});

/*
 * Страница объекта показывает те же факты, что карточка атласа: справка
 * написана один раз в справочнике объектов. Регионы объекта сюда не идут —
 * они справа, у карты, и второй раз списком не повторяются.
 *
 * Проверяется инвариант, а не сегодняшнее состояние каталога: пустого тела у
 * страницы не бывает. Есть факты — стоят факты; нет — страница вслух говорит,
 * что справка не написана. Ветка переключится сама, когда факты напишут.
 */
it('называет вслух оба состояния справки об объекте', () => {
  const feature = physicalFeatures.find(({ id }) => id === 'yangtze');
  renderPage('feature-yangtze');

  if (feature !== undefined && feature.facts.length > 0) {
    expect(screen.getByText(feature.facts[0].title)).toBeInTheDocument();
    expect(
      document.querySelector('.photo-slot[data-photo-height="hero"]'),
    ).toBeNull();
  } else {
    expect(screen.getByText(/Справка ещё не написана/)).toBeInTheDocument();
  }
});

/* Охват объекта берётся из дописки, а не из проверяемого картой списка. */
it('перечисляет регионы объекта так, как их называет коллекция', () => {
  renderPage('feature-yellow-river');

  const list = document.querySelector('.member-list');

  expect(list?.querySelectorAll('li')).toHaveLength(9);
  expect(list).toHaveTextContent('Сычуань');
});
