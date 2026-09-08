import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonGitDir, currentBranch, headSha } from './git.ts';
import { logPath, readLog } from './review-log.ts';

/*
 * `import.meta.dirname`, а не `fileURLToPath(import.meta.url)`: под jsdom
 * `import.meta.url` — адрес http, и разбор его как файлового пути падает.
 * Тем же способом ищет свои файлы `scripts/sources-mirror.test.ts`.
 */
const ENTRY = resolvePath(import.meta.dirname, 'review-record.ts');

/** Временный репозиторий с одним коммитом на master. */
function temporaryRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), 'review-hook-'));
  const run = (...args: string[]): void => {
    execFileSync('git', args, { cwd: directory, stdio: 'ignore' });
  };

  run('init', '-b', 'master');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'Проверка');
  writeFileSync(join(directory, 'file.txt'), 'первый\n', 'utf8');
  run('add', '.');
  run('commit', '-m', 'первый');
  return directory;
}

function callHook(payload: unknown): string {
  return execFileSync('node', [ENTRY], { input: JSON.stringify(payload), encoding: 'utf8' });
}

describe('записывающий хук', () => {
  it('записывает HEAD, ветку, число находок и уровень', () => {
    const repository = temporaryRepository();
    execFileSync('git', ['checkout', '-b', 'feat/x'], { cwd: repository, stdio: 'ignore' });

    callHook({
      cwd: repository,
      hook_event_name: 'PostToolUse',
      tool_name: 'ReportFindings',
      tool_input: {
        findings: [
          { file: 'a.ts', summary: 'раз', failure_scenario: 'падает' },
          { file: 'b.ts', summary: 'два', failure_scenario: 'падает' },
        ],
        level: 'high',
      },
    });

    const records = readLog(logPath(commonGitDir(repository) ?? ''));
    expect(records).toHaveLength(1);
    expect(records[0].sha).toBe(headSha(repository));
    expect(records[0].branch).toBe('feat/x');
    expect(records[0].findings).toBe(2);
    expect(records[0].level).toBe('high');
  });

  it('пустой список находок тоже засчитывается за ревью', () => {
    /*
     * Решение владельца от 2026-09-08: ворота проверяют факт ревью, а не его
     * итог. Ревью без находок — самое обычное ревью.
     */
    const repository = temporaryRepository();
    callHook({ cwd: repository, tool_input: { findings: [], level: 'medium' } });
    expect(readLog(logPath(commonGitDir(repository) ?? ''))).toHaveLength(1);
  });

  it('мусор на входе не роняет хук', () => {
    expect(() => execFileSync('node', [ENTRY], { input: 'не json', encoding: 'utf8' })).not.toThrow();
  });

  it('вне репозитория хук молчит', () => {
    const directory = mkdtempSync(join(tmpdir(), 'review-hook-bare-'));
    expect(() => callHook({ cwd: directory, tool_input: { findings: [] } })).not.toThrow();
  });
});

describe('обёртка над git', () => {
  it('называет текущую ветку', () => {
    expect(currentBranch(temporaryRepository())).toBe('master');
  });

  it('на несуществующем каталоге возвращает null, а не падает', () => {
    expect(currentBranch(join(tmpdir(), 'нет-такого-каталога-12345'))).toBeNull();
  });
});
