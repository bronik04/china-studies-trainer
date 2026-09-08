/*
 * Хук PreToolUse на Bash: не пускает в master то, что не проходило ревью.
 *
 * Правило из AGENTS.md — «до слияния в главную ветку изменения проходят
 * ревью» — до сих пор держалось на памяти. Проверки (линтер, тесты, сборка)
 * закреплены CI; ревью не было закреплено ничем.
 *
 * Отказ здесь — не запрет: команду, набранную владельцем в собственном
 * терминале, хук не видит вовсе. Это и есть выход для экстренного
 * исправления, которое AGENTS.md допускает по решению владельца.
 */
import { readFileSync } from 'node:fs';
import { commonGitDir, currentBranch, resolveCommit } from './git.ts';
import { isMasterBranch, parseMergeCommand } from './merge-command.ts';
import { findReview, logPath, readLog } from './review-log.ts';

type Payload = {
  readonly cwd?: unknown;
  readonly tool_input?: { readonly command?: unknown };
};

function deny(reason: string): void {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })}\n`,
  );
}

function main(): void {
  let payload: Payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8')) as Payload;
  } catch {
    return;
  }

  const command = payload.tool_input?.command;
  if (typeof command !== 'string' || command === '') return;

  const cwd = typeof payload.cwd === 'string' && payload.cwd !== '' ? payload.cwd : process.cwd();

  const merge = parseMergeCommand(command, currentBranch(cwd));
  if (merge === null || !isMasterBranch(merge.target)) return;

  const directory = commonGitDir(cwd);
  if (directory === null) return;
  const records = readLog(logPath(directory));

  const missing: string[] = [];
  for (const ref of merge.refs) {
    if (isMasterBranch(ref)) continue;
    const sha = resolveCommit(cwd, ref);
    /* Не разрешилось в коммит — сливать нечего, и мешать незачем. */
    if (sha === null) continue;
    if (findReview(records, sha) !== undefined) continue;
    missing.push(`${ref} (${sha.slice(0, 7)})`);
  }

  if (missing.length === 0) return;

  deny(
    `Слияние в ${merge.target} остановлено: у ${missing.join(', ')} нет записи о ревью. ` +
      'Запустите /code-review в этой ветке — запись появится сама, — затем повторите слияние. ' +
      'Правило из AGENTS.md: до слияния в главную ветку изменения проходят ревью.',
  );
}

try {
  main();
} catch {
  /* Хук не мешает работать из-за собственной поломки. */
}
