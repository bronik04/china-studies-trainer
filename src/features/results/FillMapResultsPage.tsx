import type { Region } from '../../content/types';
import { regionsWord } from '../../content/region-count';
import { summariseFillRound, type FillRound } from '../../domain/fill-round';
import { ChinaMap } from '../../map/ChinaMap';
import { formatDuration } from './format-duration';

export type FillMapResultsPageProps = {
  readonly round: FillRound;
  readonly regions: readonly Region[];
  readonly isProgressSaved: boolean;
  /**
   * Ровно тот набор, который запустит `onRepeatMistakes`: все ошибки за
   * последние 14 дней. Приходит извне по тому же доводу, что и в
   * RoundResultsPage: подпись кнопки не может разойтись с её действием.
   */
  readonly idsToRepeat: readonly string[];
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
  idsToRepeat,
  onRepeatMistakes,
  onNewRound,
  onExit,
}: FillMapResultsPageProps) {
  const summary = summariseFillRound(round);
  const reviewRegions = summary.regionIdsToReview.flatMap(
    (regionId) => regions.find((region) => region.id === regionId) ?? [],
  );

  const repeatCount = idsToRepeat.length;
  const isRepeatWider = repeatCount > reviewRegions.length;

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
      <ChinaMap
        regions={regions}
        selectedRegionId={null}
        onSelect={() => {}}
        onClear={() => {}}
        variant="fill"
        outcomes={round.outcomes}
        interactive={false}
      />
      <section aria-labelledby="fill-results-heading">
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
            <ul className="review-list">
              {reviewRegions.map((region) => (
                <li key={region.id}>
                  {region.nameRu} <span lang="zh-Hans">{region.nameZh}</span> —{' '}
                  {round.outcomes[region.id] === 'second-try'
                    ? 'со второго раза'
                    : 'не угадано'}
                </li>
              ))}
            </ul>
            {/*
              Список обрезан до пяти тем этого раунда, а повтор берёт все ошибки
              за 14 дней. Без этой строки экран говорил бы «пять», а делал «двадцать
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
          <button
            type="button"
            className={reviewRegions.length === 0 ? 'primary' : 'secondary'}
            onClick={onNewRound}
          >
            Заполнить заново
          </button>
          <button type="button" className="secondary" onClick={onExit}>
            На главную
          </button>
        </div>
      </section>
    </main>
  );
}
