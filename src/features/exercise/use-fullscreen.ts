import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Полноэкранный режим раунда. Разворачивается корень оболочки, а не документ:
 * шапка сайта остаётся вне полного экрана (спек RoundStage). Состояние
 * читается из `fullscreenchange`, а не из ответа `requestFullscreen`: выйти
 * можно и мимо кнопки — клавишей Esc.
 *
 * `isAvailable` ложен там, где Fullscreen API нет (iPhone): кнопку тогда не
 * показывают вовсе, деградация без обещаний.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function syncState() {
      // jsdom отдаёт undefined, браузер — null
      setIsFullscreen(document.fullscreenElement != null);
    }

    document.addEventListener('fullscreenchange', syncState);

    return () => document.removeEventListener('fullscreenchange', syncState);
  }, []);

  const toggle = useCallback(() => {
    // jsdom отдаёт undefined, браузер — null
    if (document.fullscreenElement != null) {
      void document.exitFullscreen();

      return;
    }

    void target.current?.requestFullscreen();
  }, [target]);

  return {
    isAvailable: document.fullscreenEnabled === true,
    isFullscreen,
    toggle,
  };
}
