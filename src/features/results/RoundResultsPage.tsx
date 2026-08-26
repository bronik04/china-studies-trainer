import type { ReactNode } from 'react';
import { regionsWord } from '../../content/region-count';
import type { RoundSummary } from '../../domain/progress-rules';
import { formatDuration } from './format-duration';

/**
 * Всё, что экрану итогов нужно от цели: назвать её. Регион и город подходят
 * оба — экран одинаков для игр по тем и другим, а различает их слово в
 * подписи кнопки (`countWord`).
 */
export type NamedTarget = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
};

export type RoundResultsPageProps = {
  readonly summary: RoundSummary;
  readonly targets: readonly NamedTarget[];
  readonly bestAccuracy: number;
  readonly isProgressSaved: boolean;
  /**
   * Карта раунда. Приходит готовой, а не собирается здесь: какая карта
   * подходит раунду — по регионам, по городам или по физическим объектам, —
   * знает `App`, единственное место навигации. Не задана — итог показывается
   * одной колонкой, и это законное состояние, а не недоделка: у раунда по
   * городам исход по точке карта пока не показывает.
   */
  readonly roundMap?: ReactNode;
  /** Как склонять число в подписи «Повторить ошибки». */
  readonly countWord?: (count: number) => string;
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function RoundResultsPage({
  summary,
  targets,
  bestAccuracy,
  isProgressSaved,
  roundMap,
  countWord = regionsWord,
  onRepeatMistakes,
  onNewRound,
  onExit,
}: RoundResultsPageProps) {
  const reviewTargets = summary.targetsToReview.flatMap(
    (target) => targets.find((named) => named.id === target.id) ?? [],
  );
  /*
   * Подпись кнопки считается из того же списка, что показан рядом. Прежде
   * набор приходил извне и был шире: экран говорил «пять», а кнопка запускала
   * все ошибки за две недели, и расхождение приходилось объяснять отдельным
   * предложением (решение владельца от 2026-08-25).
   */
  const repeatCount = reviewTargets.length;

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
        {/*
          Карта слева, разбор справа: кнопка повтора стоит у списка, который
          она повторит. На узком экране колонки складываются в одну — карта,
          затем разбор, затем действия, тем же порядком, что и в разметке.
        */}
        <div className="results-split">
          {roundMap === undefined ? null : (
            <div className="results-map">{roundMap}</div>
          )}
          <div className="results-review">
            {reviewTargets.length === 0 ? (
              <p>Ошибок нет.</p>
            ) : (
              <>
                <h3>Стоит повторить</h3>
                <ul className="review-list">
                  {reviewTargets.map((target) => (
                    <li key={target.id}>
                      {target.nameRu} <span lang="zh-Hans">{target.nameZh}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="results-actions">
              {reviewTargets.length === 0 ? null : (
                <button type="button" className="primary" onClick={onRepeatMistakes}>
                  Повторить ошибки: {repeatCount} {countWord(repeatCount)}
                </button>
              )}
              <button type="button" className="secondary" onClick={onNewRound}>
                Новый раунд
              </button>
              <button type="button" className="secondary" onClick={onExit}>
                На главную
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
