import { useState } from 'react';
import { dynasties as allDynasties } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';
import {
  createOrderRound,
  isOrderRoundFinished,
  MAX_ATTEMPTS_PER_NAME,
  placeName,
  type OrderMove,
  type OrderRound as OrderRoundState,
} from '../../domain/order-round';
import type { QuestionLanguage } from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import type { Attempt } from '../../domain/round';
import { DynastyTimeline, type TimelineMark } from './DynastyTimeline';
import { RoundStage } from './RoundStage';

/*
 * Часы раунда живут в модуле, а не в теле компонента: `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента вызовом
 * во время отрисовки. Тот же приём в остальных играх.
 */
function startClock(): number {
  return performance.now();
}

export type OrderRoundProps = {
  /**
   * Пул раунда. По умолчанию вся лента; «Повторить ошибки» задаёт его напрямую,
   * и тогда круг бывает неполным.
   */
  readonly dynasties?: readonly Dynasty[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * «Расставить по порядку»: имена династий кладутся на ленту времени.
 *
 * Кладут на целую ленту, а не в вырезанные проёмы: проём выдавал бы длину
 * династии, то есть половину ответа, а на целой ленте выбор идёт из двенадцати
 * мест и пропорция остаётся честной (уточнение к решению владельца продукта,
 * DECISIONS.md, 2026-08-28).
 *
 * Ход в два нажатия: выбрать имя, нажать полосу. Перетаскивания нет — оно
 * недоступно с клавиатуры и плохо живёт на касании, а два нажатия работают
 * одинаково мышью, пальцем и с клавиатуры.
 */
export function OrderRound({
  dynasties = allDynasties,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: OrderRoundProps) {
  const [round, setRound] = useState<OrderRoundState>(() =>
    createOrderRound(dynasties, {
      roundId,
      language,
      random: createSeededRandom(seed),
    }),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [move, setMove] = useState<OrderMove | null>(null);
  const [startedAt] = useState(startClock);
  const [askedAt, setAskedAt] = useState(startClock);

  const nameOf = (dynastyId: string) =>
    allDynasties.find((dynasty) => dynasty.id === dynastyId)?.nameRu ?? '';

  /* Поставленные имена занимают свои полосы: их видно и нажимать нельзя. */
  const marks: readonly TimelineMark[] = Object.keys(round.outcomes).map(
    (dynastyId) => ({ dynastyId, kind: 'taken' }),
  );

  function place(bandId: string) {
    if (selectedId === null || isOrderRoundFinished(round)) {
      return;
    }

    const result = placeName(round, {
      nameId: selectedId,
      bandId,
      durationMs: Math.round(startClock() - askedAt),
      answeredAt: new Date().toISOString(),
    });

    setRound(result.round);
    setMove(result.move);

    if (result.move.kind === 'placed') {
      setSelectedId(null);
      setAskedAt(startClock());
    }

    if (isOrderRoundFinished(result.round)) {
      onFinish(result.round.attempts);
    }
  }

  const attemptsLeft = MAX_ATTEMPTS_PER_NAME - round.usedAttempts;

  const hint =
    move?.kind === 'retry' ? (
      <p className="history-hint">
        Не это место. Осталось попыток: {move.attemptsLeft}.
      </p>
    ) : move?.kind === 'placed' && !move.wasFound ? (
      <p className="history-note">
        {nameOf(move.dynastyId)} стоит здесь — попытки кончились.
      </p>
    ) : (
      <p className="history-hint">
        {selectedId === null
          ? 'Выберите династию, потом нажмите её место на ленте.'
          : `Где на ленте ${nameOf(selectedId)}?`}
      </p>
    );

  return (
    <RoundStage
      prompt={
        <>
          <p className="eyebrow">Расставьте по порядку</p>
          <h1 className="stage-target" data-testid="exercise-target">
            Круг {Math.min(round.currentCircle + 1, round.circles.length)} из{' '}
            {round.circles.length}
          </h1>
        </>
      }
      promptState="question"
      startedAt={startedAt}
      progress={
        <p className="exercise-progress">
          Поставлено {Object.keys(round.outcomes).length} из{' '}
          {round.circles.flat().length}
        </p>
      }
      choices={
        <ul className="order-tiles" aria-label="Династии круга">
          {round.pending.map((dynastyId) => (
            <li key={dynastyId}>
              <button
                type="button"
                className="order-tile"
                /*
                 * Нажатие по выбранному снимает выбор: иначе выбранное имя
                 * нельзя было бы отменить, не поставив его куда-нибудь.
                 */
                aria-pressed={selectedId === dynastyId}
                onClick={() =>
                  setSelectedId(selectedId === dynastyId ? null : dynastyId)
                }
              >
                {nameOf(dynastyId)}
              </button>
            </li>
          ))}
        </ul>
      }
      onExit={onExit}
    >
      <div className="history-stage">
        <DynastyTimeline
          dynasties={allDynasties}
          marks={marks}
          showsNames={false}
          onAnswer={place}
          hint={hint}
        />
        {/*
          Исход хода словами: на ленте он виден заливкой и подписью, а тому,
          кто ленты не видит, об этом надо сказать.
        */}
        <p className="visually-hidden" aria-live="polite">
          {move?.kind === 'placed'
            ? `${nameOf(move.dynastyId)} поставлена`
            : move?.kind === 'retry'
              ? `Не это место, осталось попыток: ${attemptsLeft}`
              : ''}
        </p>
      </div>
    </RoundStage>
  );
}
