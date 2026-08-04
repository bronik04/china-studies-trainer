import { regionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import type { RoundSummary } from '../../domain/progress-rules';
import { formatDuration } from './format-duration';

export type RoundResultsPageProps = {
  readonly summary: RoundSummary;
  readonly regions: readonly Region[];
  readonly bestAccuracy: number;
  readonly isProgressSaved: boolean;
  /**
   * Ровно тот набор, который запустит `onRepeatMistakes`: все ошибки за
   * последние 14 дней (EXERCISES.md). Он шире списка на экране — тот показывает
   * не больше `MAX_REVIEW_TOPICS` тем этого раунда, — и приходит извне, чтобы
   * подпись кнопки не могла разойтись с тем, что кнопка делает.
   */
  readonly regionIdsToRepeat: readonly string[];
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function RoundResultsPage({
  summary,
  regions,
  bestAccuracy,
  isProgressSaved,
  regionIdsToRepeat,
  onRepeatMistakes,
  onNewRound,
  onExit,
}: RoundResultsPageProps) {
  const reviewRegions = summary.regionIdsToReview.flatMap(
    (regionId) => regions.find((region) => region.id === regionId) ?? [],
  );
  const repeatCount = regionIdsToRepeat.length;
  const isRepeatWider = repeatCount > reviewRegions.length;

  return (
    <main className="app-shell">
      <header className="hero results-hero">
        <p className="eyebrow">Итог раунда</p>
        <h1>{formatPercent(summary.accuracy)}</h1>
        <p>
          {summary.correct} из {summary.total}
        </p>
      </header>
      <section aria-labelledby="results-heading">
        <div className="section-heading">
          <h2 id="results-heading">Что получилось</h2>
          <p>Личный рекорд: {formatPercent(bestAccuracy)}</p>
        </div>
        <p>Время: {formatDuration(summary.durationMs)}</p>
        {isProgressSaved ? null : (
          <p className="status-note" role="status">
            Прогресс не сохранится: хранилище недоступно.
          </p>
        )}
        {reviewRegions.length === 0 ? (
          <p>Ошибок нет.</p>
        ) : (
          <>
            <h3>Стоит повторить</h3>
            <ul className="review-list">
              {reviewRegions.map((region) => (
                <li key={region.id}>
                  {region.nameRu} <span lang="zh-Hans">{region.nameZh}</span>
                </li>
              ))}
            </ul>
            {/*
              Список обрезан до пяти тем этого раунда, а повтор берёт все ошибки
              за 14 дней. Без этой строки экран говорил «пять», а делал «двадцать
              семь».
            */}
            {isRepeatWider ? (
              <p>
                Здесь ошибки этого раунда. В повтор войдут все {repeatCount}{' '}
                {regionsWord(repeatCount)} с ошибками за последние 14 дней.
              </p>
            ) : null}
          </>
        )}
        <div className="results-actions">
          {reviewRegions.length === 0 ? null : (
            <button type="button" className="primary" onClick={onRepeatMistakes}>
              Повторить ошибки: {repeatCount} {regionsWord(repeatCount)}
            </button>
          )}
          <button type="button" className="secondary" onClick={onNewRound}>
            Новый раунд
          </button>
          <button type="button" className="secondary" onClick={onExit}>
            В кабинет
          </button>
        </div>
      </section>
    </main>
  );
}
