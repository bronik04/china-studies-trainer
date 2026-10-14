import type { AnswerState } from '../../map/ChinaMap';

/** Всё, что правилу нужно от цели: её опознают по идентификатору. */
type Identified = { readonly id: string };

/**
 * После ответа остальные цели закрываются: второй ответ на вопрос запрещён
 * (SPEC.md), и запрет должен быть виден в интерфейсе, а не только отклоняться
 * движком. Правильная цель подсвечивается всегда, в том числе после ошибки.
 *
 * Правило одно на все карты ответа, поэтому и справочник любой: областям оно
 * досталось первым, странам — то же самое. Передавать сюда нужно весь
 * справочник, а не пул раунда: в повторе ошибок пул бывает из одной цели, а
 * нарисованы на карте все, и остальные остались бы открытыми на вид.
 */
export function answerStatesFor(
  targets: readonly Identified[],
  targetId: string,
  answeredId: string | null,
): Readonly<Record<string, AnswerState>> {
  if (answeredId === null) {
    return {};
  }

  const states: Record<string, AnswerState> = {};
  for (const target of targets) {
    states[target.id] = 'disabled';
  }

  if (answeredId !== targetId) {
    states[answeredId] = 'incorrect';
  }

  states[targetId] = 'correct';

  return states;
}

/**
 * Исход только что данного ответа для печати 对/错 под вопросом. Пока раунд
 * ждёт ответа, исхода нет. Одно правило на все игры: прежде одна и та же
 * тернарная цепочка стояла в семи раундах.
 */
export function verdictOf(round: {
  readonly status: string;
  readonly attempts: readonly { readonly isCorrect: boolean }[];
}): 'correct' | 'incorrect' | null {
  const last = round.attempts.at(-1);

  if (round.status !== 'feedback' || last === undefined) {
    return null;
  }

  return last.isCorrect ? 'correct' : 'incorrect';
}
