import { createHash } from 'node:crypto';

/**
 * Отпечаток входов генератора полос — затем же, зачем `physicalInputsFingerprint`:
 * забытый генератор не должен проходить сборку. Наличие путей в
 * `relief-bands.ts` ничего не значит — заменить выжимку и не перегенерировать
 * значит оставить на карте прежний рельеф при зелёной сборке. Отпечаток
 * отвечает на другой вопрос: получены ли эти полосы из тех порогов и той
 * выжимки, что лежат в репозитории сейчас.
 */
export function reliefInputsFingerprint(
  thresholds: readonly number[],
  sourceJson: string,
): string {
  return createHash('sha256')
    .update([[...thresholds].sort((a, b) => a - b).join(','), sourceJson].join('\n'))
    .digest('hex')
    .slice(0, 16);
}
