import type { Region } from '../../content/types';
import { regionsWord } from '../../content/region-count';
import { summariseFillRound, type FillRound } from '../../domain/fill-round';
import { ChinaMap } from '../../map/ChinaMap';
import { formatDuration } from './format-duration';

export type FillMapResultsPageProps = {
  readonly round: FillRound;
  readonly regions: readonly Region[];
  readonly isProgressSaved: boolean;
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};

/**
 * Итог — сама заполненная карта. Числовая разбивка рядом не украшает: три
 * цвета исхода не могут попарно давать 3:1 (см. tokens.css), и текст —
 * равнозначная подача того же результата без цвета.
 */
export function FillMapResultsPage({
  round,
  regions,
  isProgressSaved,
  onRepeatMistakes,
  onNewRound,
  onExit,
}: FillMapResultsPageProps) {
  const summary = summariseFillRound(round);
  const reviewRegions = summary.regionIdsToReview.flatMap(
    (regionId) => regions.find((region) => region.id === regionId) ?? [],
  );

  /*
   * Подпись кнопки считается из того же списка, что показан рядом. Прежде
   * набор приходил извне и был шире: экран говорил «пять», а кнопка запускала
   * все ошибки за две недели (решение владельца от 2026-08-25).
   */
  const repeatCount = reviewRegions.length;

  return (
    <main className="app-shell">
      <header className="hero results-hero">
        <p className="eyebrow">Карта заполнена</p>
        <h1>{formatDuration(summary.durationMs)}</h1>
        <ul className="fill-breakdown" data-testid="fill-breakdown">
          <li>С первого раза: {summary.firstTry}</li>
          <li>Со второго: {summary.secondTry}</li>
          <li>Не угадано: {summary.failed}</li>
        </ul>
      </header>
      {/*
        Карта слева, разбор справа: кнопка повтора стоит у списка, который она
        повторит. На узком экране колонки складываются в одну.
      */}
      <div className="results-split">
        <div className="results-map">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            variant="fill"
            outcomes={round.outcomes}
            interactive={false}
          />
        </div>
        <section className="results-review" aria-labelledby="fill-results-heading">
        <h2 id="fill-results-heading">Что получилось</h2>
        {isProgressSaved ? null : (
          <p className="status-note" role="status">
            Прогресс не сохранится: хранилище недоступно.
          </p>
        )}
        {reviewRegions.length === 0 ? (
          <p>Вся карта взята с первой попытки.</p>
        ) : (
          <>
            <h3>Стоит повторить</h3>
            {/*
              Исход назван словом: на карте «со второго раза» и «не угадано»
              различаются цветом и штриховкой, и без подписи этот разбор
              пропал бы для того, кто карту не видит.
            */}
            <ul className="review-list" aria-label="Стоит повторить">
              {reviewRegions.map((region) => (
                <li key={region.id}>
                  {region.nameRu} <span lang="zh-Hans">{region.nameZh}</span> —{' '}
                  {round.outcomes[region.id] === 'second-try'
                    ? 'со второго раза'
                    : 'не угадано'}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="results-actions">
          {reviewRegions.length === 0 ? null : (
            <button type="button" className="primary" onClick={onRepeatMistakes}>
              Повторить ошибки: {repeatCount} {regionsWord(repeatCount)}
            </button>
          )}
          <button
            type="button"
            className={reviewRegions.length === 0 ? 'primary' : 'secondary'}
            onClick={onNewRound}
          >
            Заполнить заново
          </button>
          {/*
            «К режимам», а не «На главную»: кнопка ведёт на секцию, из которой
            раунд и запускали.
          */}
          <button type="button" className="secondary" onClick={onExit}>
            К режимам
          </button>
        </div>
        </section>
      </div>
    </main>
  );
}
