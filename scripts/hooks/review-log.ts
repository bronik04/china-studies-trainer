/*
 * Журнал пройденных ревью.
 *
 * Файл лежит в общем каталоге git — том, что отдаёт `git rev-parse
 * --git-common-dir`. Для основного каталога это `.git/`, для рабочего дерева
 * из `.worktrees/` — тот же самый `.git/` основного репозитория. Место
 * выбрано не для красоты: ревью делается в ветке, часто в отдельном дереве, а
 * слив — в основном каталоге, и журнал внутри `.claude/` был бы у каждой
 * копии свой. Внутри `.git/` файл к тому же не попадает в индекс сам по себе.
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type ReviewRecord = {
  readonly sha: string;
  readonly branch: string | null;
  /** Число находок ревью. На решение ворот не влияет — видно в отказе. */
  readonly findings: number;
  readonly level: string | null;
  readonly at: string;
};

/** Сколько записей хранится. Дальше хвост отрезается. */
export const LOG_LIMIT = 50;

export function logPath(commonGitDir: string): string {
  return join(commonGitDir, 'review-log.json');
}

function toRecord(value: unknown): ReviewRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.sha !== 'string' || raw.sha.length === 0) return null;

  return {
    sha: raw.sha,
    branch: typeof raw.branch === 'string' ? raw.branch : null,
    findings: typeof raw.findings === 'number' ? raw.findings : 0,
    level: typeof raw.level === 'string' ? raw.level : null,
    at: typeof raw.at === 'string' ? raw.at : '',
  };
}

/** Записи от новых к старым. Любая беда с файлом — пустой журнал. */
export function readLog(path: string): ReviewRecord[] {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const reviews = (parsed as { reviews?: unknown } | null)?.reviews;
    if (!Array.isArray(reviews)) return [];
    return reviews.map(toRecord).filter((item): item is ReviewRecord => item !== null);
  } catch {
    return [];
  }
}

export function findReview(records: readonly ReviewRecord[], sha: string): ReviewRecord | undefined {
  return records.find((record) => record.sha === sha);
}

/** Запись через временный файл и переименование: журнал не бывает наполовину. */
export function appendReview(path: string, record: ReviewRecord): void {
  const kept = [record, ...readLog(path).filter((item) => item.sha !== record.sha)].slice(0, LOG_LIMIT);
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({ version: 1, reviews: kept }, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}
