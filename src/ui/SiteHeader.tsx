/**
 * Шапка сайта. Появилась вместе с главной-лендингом: пока поверхностей было
 * три и кабинет служил хабом, постоянная навигация была лишней, а на четырёх
 * (главная, атлас, коллекции, страница коллекции) возврат кнопкой из подвала
 * перестал держаться.
 *
 * На экранах ответа шапки нет: раунд занимает ровно кадр и не прокручивается,
 * а 76 px полосы отняли бы высоту у карты (UI_UX.md).
 */

export type SiteSection = 'modes' | 'atlas' | 'collections';

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

export function SiteHeader({ current, onNavigate }: SiteHeaderProps) {
  return (
    /*
     * Полоса во всю ширину, содержимое — в колонке страницы: черта под шапкой
     * идёт от края до края кадра, а название и навигация стоят ровно над
     * содержанием. Без внутренней обёртки навигация упиралась в край экрана.
     */
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-mark">
          <span className="site-header-name">Китай</span>
          <span lang="zh-Hans" className="site-header-tagline">
            中国 · страноведение
          </span>
        </div>
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
