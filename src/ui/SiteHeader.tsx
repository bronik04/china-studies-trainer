import { useLayoutEffect, useRef } from 'react';

/**
 * Шапка сайта. Появилась вместе с главной-лендингом: пока поверхностей было
 * три и кабинет служил хабом, постоянная навигация была лишней, а на четырёх
 * возврат кнопкой из подвала перестал держаться.
 *
 * Полоса закреплена и стоит на всех поверхностях, включая экраны ответа.
 * Прежде её там не было — кадр отдавался карте целиком; решение владельца
 * продукта отменяет это (DECISIONS.md, 2026-08-05).
 */

/**
 * `home` — вся главная, а не её раздел: на неё ведёт название слева, и по ней
 * же считается отметка «вы здесь». `modes` — раздел внутри главной.
 */
export type SiteSection = 'home' | 'modes' | 'atlas' | 'collections';

export type SiteHeaderProps = {
  /** Какой раздел сейчас открыт. `null` — ни один, шапка без отметки. */
  readonly current: SiteSection | null;
  readonly onNavigate: (section: SiteSection) => void;
};

const NAV: readonly { readonly id: SiteSection; readonly title: string }[] = [
  { id: 'modes', title: 'Режимы' },
  { id: 'atlas', title: 'Атлас' },
  { id: 'collections', title: 'Коллекции' },
];

/**
 * Высота шапки достаётся разметке через `--header-height`: секции лендинга
 * занимают ровно экран под ней, а прокрутка к якорю останавливается не под
 * закреплённой полосой.
 *
 * Высоту измеряет браузер, а не константа: на узком экране шапка переносится в
 * две строки, и записанное число разошлось бы с ней. `ResizeObserver`, а не
 * разовое измерение, — при смене ширины и при масштабировании текста до 200 %
 * высота меняется.
 */
function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const header = ref.current;
    if (header === null) {
      return;
    }

    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty(
        '--header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    };

    /*
     * Сначала измерение, потом наблюдение. Колбэк `ResizeObserver` приходит
     * перед кадром отрисовки, а не в момент подписки: положись мы только на
     * него — первый кадр показывал бы секции на высоту шапки выше экрана, а на
     * невидимой вкладке, где кадров нет вовсе, они такими бы и остались.
     */
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);

    return () => {
      observer.disconnect();
      /* Шапки на экране больше нет — секции считают экран целиком. */
      root.style.removeProperty('--header-height');
    };
  }, []);

  return ref;
}

export function SiteHeader({ current, onNavigate }: SiteHeaderProps) {
  const ref = useHeaderHeight();

  return (
    /*
     * Полоса во всю ширину, содержимое — в колонке страницы: черта под шапкой
     * идёт от края до края кадра, а название и навигация стоят ровно над
     * содержанием. Без внутренней обёртки навигация упиралась в край экрана.
     */
    <header className="site-header" ref={ref}>
      <div className="site-header-inner">
        {/*
          Марка ведёт на главную. Пока её не было, попасть на неё было нечем:
          «Режимы» — якорь на раздел внутри страницы, и герой, единственный
          главный шаг и карта освоенности навигацией не доставались вовсе.

          Прежде здесь стояло «Китай 中国 · страноведение» — три фрагмента в
          трёх письменностях на одной строке, где точка-разделитель попадала
          между именем страны и родом занятий сайта и склеивала их в одно.
          Решение владельца продукта (DECISIONS.md, 2026-08-28): печать и одно
          слово. С 2026-10-17 слово — название сайта «Поднебесная», а печать
          двойная, 天下.

          Пояснение «на главную» скрыто от глаза, но входит в доступное имя:
          кнопка, названная «Поднебесная», не говорит, что она делает.
          Видимая подпись при этом входит в имя целиком — этого требует
          WCAG 2.5.3.
        */}
        <button
          type="button"
          className="site-header-mark"
          aria-current={current === 'home' ? 'page' : undefined}
          onClick={() => onNavigate('home')}
        >
          {/*
            Печать — знак, а не слово: читалке экрана она сказала бы «тянь ся»
            перед подписью кнопки. Каждый знак — в своём элементе: печать
            двойная, и каждый оттиск — отдельный квадрат. Язык на ней всё равно помечен — иначе
            иероглиф наберёт не тот шрифт (у Cormorant Garamond и Onest его нет).
          */}
          <span className="site-header-seal" lang="zh-Hans" aria-hidden="true">
            <span>天</span>
            <span>下</span>
          </span>
          {/*
            Пробел задан текстовым узлом, а не только промежутком в раскладке:
            `gap` разводит подписи для глаза, а доступное имя склеивалось в
            «Поднебесная— на главную».
          */}
          <span className="site-header-name">Поднебесная</span>{' '}
          <span className="visually-hidden">— на главную</span>
        </button>
        <nav className="site-nav" aria-label="Разделы сайта">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              /*
               * Кнопки, а не ссылки: маршрутизатора нет, поверхность меняется
               * состоянием. Ссылка с `href="#"` обещала бы адрес, которого нет.
               *
               * Открытый раздел помечен и словом (`aria-current`), и чертой
               * под ним: одной киноварью статус в этом проекте не передаётся.
               */
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
