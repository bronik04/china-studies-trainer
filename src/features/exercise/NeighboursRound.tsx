import { useEffect, useRef, useState } from 'react';
import type { Region } from '../../content/types';
import {
  createNeighboursRound,
  currentNeighboursQuestion,
  isNeighboursRoundFinished,
  submitNeighbours,
  toggleMark,
  type NeighboursRound as Round,
  type NeighboursVerdict,
} from '../../domain/neighbours-round';
import { createSeededRandom } from '../../domain/random';
import {
  labelOf,
  langOf,
  type QuestionLanguage,
} from '../../domain/question-language';
import { ChinaMap } from '../../map/ChinaMap';
import type { NeighbourState } from '../../map/outcome-labels';
import { RegionAnswerList } from '../../map/RegionAnswerList';
import { CORRECT_PAUSE_MS, WRONG_PAUSE_MS } from './round-pace';
import { RoundStage } from './RoundStage';

export type NeighboursRoundProps = {
  readonly regions: readonly Region[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (round: Round) => void;
  readonly onExit: () => void;
};

/**
 * Игра «соседи региона»: назван регион — отметить все, что с ним граничат.
 *
 * Кнопки «Далее» здесь нет по общему правилу темпа (решение владельца от
 * 2026-08-17): верный ответ виден полсекунды, разбор ошибки — вдвое дольше
 * прочих игр не делается, раунд едет дальше сам.
 */
export function NeighboursRound({
  regions,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: NeighboursRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createNeighboursRound(regions, {
      roundId,
      language,
      random: createSeededRandom(seed),
    }),
  );
  /** Разбор показан: `null` — вопрос ещё открыт. */
  const [verdict, setVerdict] = useState<NeighboursVerdict | null>(null);
  /** Раунд, который встанет на место нынешнего, когда разбор досмотрят. */
  const [pending, setPending] = useState<Round | null>(null);
  const [startedAt] = useState(() => performance.now());
  const questionStartedAt = useRef<number | null>(null);

  /*
   * `onFinish` объявлена в теле родителя и меняет идентичность на каждый его
   * рендер; в зависимостях эффекта она перезаводила бы таймер разбора. Ссылка
   * держит свежий обработчик, не входя в зависимости, — тот же приём, что в
   * `FillMapRound`.
   */
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (verdict === null || pending === null) {
      return;
    }

    const timer = setTimeout(
      () => {
        setVerdict(null);
        setRound(pending);
        setPending(null);
        questionStartedAt.current = performance.now();

        if (isNeighboursRoundFinished(pending)) {
          onFinishRef.current(pending);
        }
      },
      verdict.isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS,
    );

    return () => clearTimeout(timer);
  }, [pending, verdict]);

  const finished = isNeighboursRoundFinished(round);
  const question = finished ? null : currentNeighboursQuestion(round);
  const targetRegion =
    question === null
      ? null
      : regions.find((region) => region.id === question.regionId)!;

  /*
   * До ответа на карте видны только отметки: цвет здесь — ответ, и показывать
   * исход каждого нажатия значило бы дать перебрать соседей наугад.
   */
  const neighbourStates: Record<string, NeighbourState> = {};
  if (verdict === null) {
    for (const id of round.marked) {
      neighbourStates[id] = 'marked';
    }
  } else {
    for (const id of verdict.found) {
      neighbourStates[id] = 'found';
    }
    for (const id of verdict.missed) {
      neighbourStates[id] = 'missed';
    }
    for (const id of verdict.extra) {
      neighbourStates[id] = 'extra';
    }
  }

  function handleSelect(regionId: string) {
    /*
     * Спрошенный регион отметить нельзя: он не сосед сам себе, и нажатие по
     * нему — промах указателя, а не ответ. Засчитывать его лишним значило бы
     * наказывать за попадание в саму цель вопроса.
     */
    if (verdict !== null || finished || regionId === question?.regionId) {
      return;
    }

    setRound(toggleMark(round, regionId));
  }

  function handleDone() {
    if (verdict !== null || finished) {
      return;
    }

    const answered = submitNeighbours(round, {
      durationMs: Math.round(
        performance.now() - (questionStartedAt.current ?? startedAt),
      ),
      answeredAt: new Date().toISOString(),
    });

    setVerdict(answered.verdict);
    setPending(answered.round);
  }

  function statusText(): string {
    if (question === null) {
      return 'Раунд пройден.';
    }

    if (verdict === null) {
      return `Отмечено регионов: ${round.marked.length}.`;
    }

    if (verdict.isCorrect) {
      return 'Верно: все соседи и ничего лишнего.';
    }

    return (
      `Найдено ${verdict.found.length} из ${question.neighbourIds.length}, ` +
      `пропущено ${verdict.missed.length}, лишних ${verdict.extra.length}.`
    );
  }

  const prompt = (
    <>
      <p className="eyebrow">Нажмите всех соседей</p>
      <h1
        className="stage-target"
        data-testid="neighbours-target"
        lang={question === null ? undefined : langOf(question.language)}
      >
        {targetRegion === null
          ? 'Раунд пройден'
          : labelOf(targetRegion, question!.language)}
      </h1>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={verdict !== null && !verdict.isCorrect ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress" data-testid="neighbours-progress">
            Вопрос {Math.min(round.currentIndex + 1, round.order.length)} из{' '}
            {round.order.length}
          </p>
          <p className="fill-status" role="status" aria-live="polite">
            {statusText()}
          </p>
        </>
      }
      choices={
        <div className="stage-choices-band">
          <button
            type="button"
            className="primary"
            onClick={handleDone}
            disabled={verdict !== null || finished}
          >
            Готово
          </button>
        </div>
      }
      answerList={
        <RegionAnswerList
          regions={regions}
          selectedRegionId={null}
          onSelect={handleSelect}
          neighbourStates={neighbourStates}
          interactive={!finished}
          paused={verdict !== null}
        />
      }
      onExit={onExit}
    >
      <ChinaMap
        regions={regions}
        selectedRegionId={null}
        onSelect={handleSelect}
        onClear={() => {}}
        variant="neighbours"
        usage="answer"
        neighbourStates={neighbourStates}
        highlight={
          question === null
            ? null
            : { regionId: question.regionId, kind: 'reveal' }
        }
        interactive={!finished}
        paused={verdict !== null}
      />
    </RoundStage>
  );
}
