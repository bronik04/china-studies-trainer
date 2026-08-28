import { useMemo, useState } from 'react';
import { dynasties as allDynasties, spanLabel } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';
import { buildDynastyChoices } from '../../domain/dynasty-choices';
import {
  labelOf,
  langOf,
  type QuestionLanguage,
} from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  historyTarget,
  isRoundFinished,
  type Attempt,
  type Round,
} from '../../domain/round';
import { DynastyTimeline, type TimelineMark } from './DynastyTimeline';
import { HISTORY_MODE } from './exercise-modes';
import { RoundProgressTrail } from './RoundProgressTrail';
import { RoundStage } from './RoundStage';
import { StageChoices, type StageChoice } from './StageChoices';
import { useAutoAdvance } from './use-auto-advance';

/*
 * Часы раунда живут в модуле, а не в теле компонента: `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента
 * вызовом во время отрисовки. Тот же приём в `CityRound` и `PhysicalRound`.
 */
function startClock(): number {
  return performance.now();
}

export type HistoryRoundProps = {
  /**
   * Пул раунда. По умолчанию вся лента; «Повторить ошибки» задаёт его
   * напрямую, и никакому набору он не соответствует.
   */
  readonly dynasties?: readonly Dynasty[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * «История: династии и даты».
 *
 * Карты здесь нет — и это решение, а не упущение. Карта в тренажёре
 * административная и современная; границы Тан и Юань с нынешними провинциями
 * не совпадают, и вопрос о династии на этой карте учил бы соответствию,
 * которого нет. Там, где история всё же ложится на сегодняшнюю карту, о ней
 * уже спрашивают: Сиань и Лоян стоят в игре «город — регион», терракотовая
 * армия — в коллекциях со своим регионом.
 *
 * Вместо карты — лента: полоса времени, пропорциональная годам. На ней и
 * видно то, чего не даёт список, — что Чжоу правила восемь веков, а Цинь
 * четырнадцать лет.
 *
 * Вопрос один: названа династия, выбрать её срок. Отвлекающие — сроки соседних
 * по времени династий (`buildDynastyChoices`), поэтому вопрос решается знанием
 * даты, а не отсевом нелепого.
 */
export function HistoryRound({
  dynasties = allDynasties,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: HistoryRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(
      dynasties.map((dynasty) => historyTarget(dynasty.id)),
      {
        roundId,
        /*
         * `match-pair`: спрашивают одно (имя династии), отвечают другим
         * (сроком). Той же формы, что «регион — столица».
         */
        exerciseTypes: ['match-pair'],
        language,
        random: createSeededRandom(seed),
      },
    ),
  );
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [startedAt] = useState(startClock);
  const [askedAt, setAskedAt] = useState(startClock);
  const { schedule } = useAutoAdvance();

  const question = currentQuestion(round);

  /*
   * Варианты считаются один раз на весь раунд: пересчёт на каждый рендер
   * тасовал бы кнопки под рукой ученика. Тот же приём в остальных играх.
   *
   * Отвлекающие берутся из полной ленты, а не из пула: в повторе ошибок пул
   * бывает из двух династий, и четвёртому варианту неоткуда взяться.
   */
  const choicesByQuestion = useMemo(
    () => {
      const random = createSeededRandom(seed + 1);

      return round.questions.map((item) =>
        buildDynastyChoices(allDynasties, item.target.id, random),
      );
    },
    [round.questions, seed],
  );

  const target = allDynasties.find(
    (dynasty) => dynasty.id === question.target.id,
  ) as Dynasty;
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsAnswer = round.status === 'feedback' && lastAttempt?.isCorrect === false;

  /*
   * Метки ленты. При верном ответе одна — верная полоса; при ошибке две:
   * верная и выбранная. Расстояние между ними и есть величина промаха, и
   * увидеть его на ленте важнее, чем прочитать «неверно». Прежде полоса
   * красилась киноварью при любом ответе, и верный ответ читался как ошибка.
   */
  const marks: readonly TimelineMark[] =
    round.status !== 'feedback' || answeredId === null
      ? []
      : answeredId === target.id
        ? [{ dynastyId: target.id, kind: 'correct' }]
        : [
            { dynastyId: target.id, kind: 'correct' },
            { dynastyId: answeredId, kind: 'wrong' },
          ];

  const answeredDynasty = allDynasties.find(
    (dynasty) => dynasty.id === answeredId,
  );

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);

      return;
    }

    setRound(next);
    setAnsweredId(null);
    setAskedAt(startClock());
  }

  function answer(dynastyId: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredId(dynastyId);
    const answered = answerQuestion(round, {
      answeredId: dynastyId,
      durationMs: Math.round(startClock() - askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    const isCorrect = answered.attempts[answered.attempts.length - 1].isCorrect;
    schedule(isCorrect, () => goNext(answered));
  }

  /*
   * Исход показывается только у нажатой кнопки и у верной: подсвечивать все
   * четыре значило бы отвечать на вопрос вместо ученика.
   */
  function resultOf(choiceId: string): StageChoice['result'] {
    if (answeredId === null) {
      return undefined;
    }

    if (choiceId === target.id) {
      return 'correct';
    }

    return choiceId === answeredId ? 'incorrect' : undefined;
  }

  const choices: readonly StageChoice[] = choicesByQuestion[
    round.currentIndex
  ].map((choice) => ({
    id: choice.id,
    label: spanLabel(choice),
    result: resultOf(choice.id),
  }));

  const prompt = showsAnswer ? (
    <>
      <p className="eyebrow">Эту дату стоит повторить</p>
      <h1 className="stage-target" data-testid="exercise-target">
        <span lang={langOf(language)}>{labelOf(target, language)}</span> —{' '}
        {spanLabel(target)}
      </h1>
    </>
  ) : (
    <>
      <p className="eyebrow">{HISTORY_MODE.eyebrow}</p>
      {/*
        Язык вопроса тот же, что и в остальных играх: русское имя или одни
        иероглифы. Иероглифическая династия — та же задача на шаг труднее, и
        отнимать её у истории незачем.
      */}
      <h1
        className="stage-target"
        data-testid="exercise-target"
        lang={langOf(language)}
      >
        {labelOf(target, language)}
      </h1>
    </>
  );

  return (
    <RoundStage
      prompt={prompt}
      promptState={showsAnswer ? 'answer' : 'question'}
      startedAt={startedAt}
      progress={
        <>
          <p className="exercise-progress">
            Вопрос {round.currentIndex + 1} из {round.questions.length}
          </p>
          <RoundProgressTrail
            total={round.questions.length}
            attempts={round.attempts}
          />
        </>
      }
      choices={
        <StageChoices
          choices={choices}
          disabled={round.status !== 'ready'}
          onChoose={answer}
        />
      }
      onExit={onExit}
    >
      <div className="history-stage">
        {/*
          Лента молчит, пока вопрос открыт: подписанная, она и была бы
          ответом. Имена и срок появляются вместе с разбором — тогда видно не
          только какая дата верна, но и куда она попадает во времени.
        */}
        <DynastyTimeline
          dynasties={allDynasties}
          marks={marks}
          showsNames={round.status === 'feedback'}
        />
        {round.status === 'feedback' ? (
          <p className="history-note">
            {/*
              Выбранную по ошибке называет строка разбора, а не подпись на
              ленте: две выделенные подписи рядом налезают друг на друга, а у
              Тан и Сун они рядом.
            */}
            {answeredDynasty !== undefined && answeredDynasty.id !== target.id ? (
              <>
                Вы показали {answeredDynasty.nameRu} — {spanLabel(answeredDynasty)}.{' '}
              </>
            ) : null}
            {target.note}
          </p>
        ) : (
          <p className="history-hint">
            Полоса показывает четыре тысячи лет: длина каждой династии — её
            настоящий срок.
          </p>
        )}
      </div>
    </RoundStage>
  );
}
