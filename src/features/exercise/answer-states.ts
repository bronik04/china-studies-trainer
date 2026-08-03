import type { Region } from '../../content/types';
import type { AnswerState } from '../../map/ChinaMap';

/**
 * После ответа остальные области закрываются: второй ответ на вопрос
 * запрещён (SPEC.md), и запрет должен быть виден в интерфейсе, а не только
 * отклоняться движком. Правильная область подсвечивается всегда, в том
 * числе после ошибки.
 */
export function answerStatesFor(
  regions: readonly Region[],
  targetRegionId: string,
  answeredRegionId: string | null,
): Readonly<Record<string, AnswerState>> {
  if (answeredRegionId === null) {
    return {};
  }

  const states: Record<string, AnswerState> = {};
  for (const region of regions) {
    states[region.id] = 'disabled';
  }

  if (answeredRegionId !== targetRegionId) {
    states[answeredRegionId] = 'incorrect';
  }

  states[targetRegionId] = 'correct';

  return states;
}
