import { useState } from 'react';
import { regionsWord } from '../../content/region-count';
import type { Region } from '../../content/types';
import { unlockedLevelFrom } from '../../domain/progress-rules';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { MapAttribution } from '../../map/MapAttribution';
import { EXERCISE_MODES } from '../exercise/exercise-modes';
import { nextStep } from './next-step';
import { summariseProgress } from './progress-summary';

const ALL_LEVELS = [1, 2, 3, 4] as const;

export type HomePageProps = {
  readonly regions: readonly Region[];
  readonly attempts: readonly Attempt[];
  readonly onStartRound: (
    request: ExerciseType | 'mixed',
    level: Level,
    regionIds: readonly string[] | null,
  ) => void;
  readonly onStartFillRound: (level: Level) => void;
  readonly onOpenAtlas: () => void;
};

/**
 * Кабинет отвечает на «где я и что дальше».
 *
 * Один главный шаг: четыре равнозначные кнопки на прежнем экране означали, что
 * главного шага нет, а киноварь, назначенная отвечать ровно за одно, была
 * потрачена на все сразу (UI_UX.md, DESIGN_SYSTEM.md).
 */
export function HomePage({
  regions,
  attempts,
  onStartRound,
  onStartFillRound,
  onOpenAtlas,
}: HomePageProps) {
  const unlockedLevel = unlockedLevelFrom(attempts);
  const [otherModesOpen, setOtherModesOpen] = useState(false);
  const [level, setLevel] = useState<Level>(unlockedLevel);

  /*
   * `new Date()` берётся один раз на рендер и передаётся обоим правилам: они
   * зависят от окна повтора в 14 дней, и два разных «сейчас» дали бы карту и
   * кнопку, рассказывающие разное.
   */
  const now = new Date();
  const summary = summariseProgress(
    regions.map((region) => region.id),
    attempts,
    now,
  );
  const step = nextStep(attempts, now);
  const levels = ALL_LEVELS.filter((value) => value <= unlockedLevel);
  const isFirstVisit = attempts.length === 0;

  return (
    <main className="app-shell home-shell">
      <h1>Провинции и столицы Китая</h1>
      <div className="home-layout">
        <div className="home-progress">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            variant="progress"
            usage="answer"
            interactive={false}
            progressStates={summary.stateByRegionId}
          />
          {/*
            Легенда обязательна: `masteredRegionIds` возвращает список без
            пояснения, а статус в этом проекте никогда не передаётся одним
            цветом.
          */}
          <p className="home-legend" data-testid="progress-legend">
            <span data-progress-state="mastered" /> освоено
            <span data-progress-state="in-progress" /> в работе
            <span data-progress-state="untouched" /> не тронуто
          </p>
        </div>
        <div className="home-actions">
          <p className="home-status" data-testid="progress-status">
            Освоено {summary.mastered} из {summary.total} · в работе{' '}
            {summary.inProgress} · открыт уровень {unlockedLevel}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onStartRound(step.exerciseType, step.level, step.regionIds)
            }
          >
            {step.label}
          </button>
          {isFirstVisit ? (
            <p className="status-note">
              {regions.length} {regionsWord(regions.length)} · около 7 минут
            </p>
          ) : null}
          <details
            className="home-other-modes"
            open={otherModesOpen}
            onToggle={(event) => setOtherModesOpen(event.currentTarget.open)}
          >
            <summary>Другие режимы</summary>
            {/*
              Выбор уровня живёт здесь, а не на верхнем уровне экрана: пока
              открыт один уровень, это контрол без выбора.
            */}
            {levels.length > 1 ? (
              <fieldset className="level-choice">
                <legend>Уровень</legend>
                {levels.map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="level"
                      checked={level === value}
                      onChange={() => setLevel(value)}
                    />
                    Уровень {value}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <ul className="home-mode-list">
              {level === 4 ? (
                <li>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onStartRound('mixed', level, null)}
                  >
                    Смешанный раунд
                  </button>
                </li>
              ) : (
                Object.values(EXERCISE_MODES).map((mode) => (
                  <li key={mode.exerciseType}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onStartRound(mode.exerciseType, level, null)}
                    >
                      {mode.title}
                    </button>
                  </li>
                ))
              )}
              <li>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onStartFillRound(level)}
                >
                  Заполнить карту
                </button>
              </li>
            </ul>
          </details>
          <button type="button" className="text" onClick={onOpenAtlas}>
            Открыть атлас
          </button>
        </div>
      </div>
      <MapAttribution />
    </main>
  );
}
