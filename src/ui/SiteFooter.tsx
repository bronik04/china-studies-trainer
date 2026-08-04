import type { ReactNode } from 'react';

/**
 * Подвал сайта. Две реплики: слева — про содержание страницы, справа — про
 * правило, действующее на ней. Обе стоят внизу намеренно: это сведения, а не
 * шаг обучения, и им незачем быть первыми остановками Tab.
 */
export type SiteFooterProps = {
  readonly left: ReactNode;
  readonly right: ReactNode;
};

export function SiteFooter({ left, right }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-left">{left}</div>
      <div className="site-footer-right">{right}</div>
    </footer>
  );
}
