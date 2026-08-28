import { useEffect, useState } from 'react';
import { photoSource } from '../../ui/photo-source';

/**
 * Загрузить все снимки раунда до первого вопроса.
 *
 * Иначе режим «Культура» нарушал бы то, что обещают `MVP.md` и `AGENTS.md`:
 * во время раунда сети нет. Снимок — сам вопрос, и загружаемый по ходу он
 * значит, что на восьмом вопросе при упавшем Wi-Fi спрашивать станет нечем.
 *
 * По событиям `load` и `error`, а не по `decode()`. Первая попытка была на
 * `decode()` — он дожидается не только байтов, но и разбора кадра, — и
 * замерена в браузере: 31 снимок скачался, 2 МБ пришли, а раунд остался в
 * ожидании. У неприсоединённого `Image` обещание `decode()` может не
 * завершиться вовсе, и ждать его значит не начать раунд никогда.
 *
 * Ошибка снимка раунд не останавливает: один сломанный кадр лучше
 * несостоявшегося урока. По той же причине есть и общий предел ожидания —
 * зависший запрос не должен запирать ученика в «готовим снимки».
 *
 * Кэш браузера делает повторный прогон мгновенным, поэтому «Повторить ошибки»
 * не заставляет ждать снова.
 */

/** Дольше этого не ждём: раунд важнее полноты прогрева. */
const PRELOAD_LIMIT_MS = 20_000;

export function usePhotoPreload(photoIds: readonly string[]): boolean {
  const [ready, setReady] = useState(photoIds.length === 0);

  useEffect(() => {
    if (photoIds.length === 0) {
      return;
    }

    let alive = true;
    const finish = () => {
      if (alive) {
        setReady(true);
      }
    };

    const sources = photoIds
      .map((id) => photoSource(id))
      .filter((source): source is string => source !== null);

    const timer = window.setTimeout(finish, PRELOAD_LIMIT_MS);

    void Promise.all(
      sources.map(
        (source) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = source;
          }),
      ),
    ).then(finish);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [photoIds]);

  return ready;
}
