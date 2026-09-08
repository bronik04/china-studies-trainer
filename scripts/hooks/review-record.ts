/*
 * Хук PostToolUse на инструмент ReportFindings: им заканчивается /code-review.
 * Записывает в журнал, что коммит, на котором стоит HEAD, отревьюен.
 *
 * Sha берётся у HEAD, а не у того, что ревью разбирало: если ревью смотрело
 * чужую ветку или PR, запись окажется не о том — но ворота от этого строже не
 * станут, а обычный случай (ревью своей ветки перед сливом) она закрывает
 * точно.
 */
import { readFileSync } from 'node:fs';
import { commonGitDir, currentBranch, headSha } from './git.ts';
import { appendReview, logPath } from './review-log.ts';

type Payload = {
  readonly cwd?: unknown;
  readonly tool_input?: { readonly findings?: unknown; readonly level?: unknown };
};

function main(): void {
  let payload: Payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8')) as Payload;
  } catch {
    return;
  }

  const cwd = typeof payload.cwd === 'string' && payload.cwd !== '' ? payload.cwd : process.cwd();
  const sha = headSha(cwd);
  const directory = commonGitDir(cwd);
  if (sha === null || directory === null) return;

  /*
   * Через локальные, а не по цепочке: `typeof payload.tool_input?.level`
   * сужает одно выражение, а `payload.tool_input.level` — уже другое, и
   * компилятор справедливо говорит, что оно может быть undefined.
   */
  const input = payload.tool_input;
  const rawFindings = input?.findings;
  const rawLevel = input?.level;
  const findings = Array.isArray(rawFindings) ? rawFindings.length : 0;
  const level = typeof rawLevel === 'string' ? rawLevel : null;

  appendReview(logPath(directory), {
    sha,
    branch: currentBranch(cwd),
    findings,
    level,
    at: new Date().toISOString(),
  });

  process.stdout.write(`Ревью записано: ${sha.slice(0, 7)}, замечаний ${findings}.\n`);
}

try {
  main();
} catch {
  /* Хук не мешает работать из-за собственной поломки. */
}
