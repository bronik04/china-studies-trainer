import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonGitDir } from './git.ts';
import { appendReview, logPath } from './review-log.ts';

const ENTRY = resolvePath(import.meta.dirname, 'review-gate.ts');
const SHELL_ENTRY = resolvePath(import.meta.dirname, 'review-gate.sh');

/** Временный репозиторий: master и ветка feat/x со своим коммитом. */
function repositoryWithBranch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'review-gate-'));
  const run = (...args: string[]): void => {
    execFileSync('git', args, { cwd: directory, stdio: 'ignore' });
  };

  run('init', '-b', 'master');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'Проверка');
  writeFileSync(join(directory, 'file.txt'), 'первый\n', 'utf8');
  run('add', '.');
  run('commit', '-m', 'первый');

  run('checkout', '-b', 'feat/x');
  writeFileSync(join(directory, 'file.txt'), 'второй\n', 'utf8');
  run('commit', '-am', 'второй');
  run('checkout', 'master');
  return directory;
}

function callGate(payload: unknown, entry: string = ENTRY): string {
  const command = entry.endsWith('.sh') ? 'sh' : 'node';
  return execFileSync(command, [entry], { input: JSON.stringify(payload), encoding: 'utf8' });
}

function bashPayload(cwd: string, command: string): unknown {
  return { cwd, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

function reviewBranch(repository: string, branch: string, findings = 0): void {
  const sha = execFileSync('git', ['rev-parse', branch], { cwd: repository, encoding: 'utf8' }).trim();
  appendReview(logPath(commonGitDir(repository) ?? ''), {
    sha,
    branch,
    findings,
    level: 'medium',
    at: new Date().toISOString(),
  });
}

describe('ворота ревью', () => {
  it('без записи о ревью слияние в master отклоняется', () => {
    const repository = repositoryWithBranch();
    const output = callGate(bashPayload(repository, 'git checkout master && git merge --no-ff feat/x'));
    const decision = JSON.parse(output);

    expect(decision.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(decision.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(decision.hookSpecificOutput.permissionDecisionReason).toContain('feat/x');
    expect(decision.hookSpecificOutput.permissionDecisionReason).toContain('/code-review');
  });

  it('с записью о ревью слияние проходит молча', () => {
    const repository = repositoryWithBranch();
    reviewBranch(repository, 'feat/x');
    expect(callGate(bashPayload(repository, 'git checkout master && git merge --no-ff feat/x'))).toBe('');
  });

  it('ревью с находками ворота открывает', () => {
    /* Решение владельца от 2026-09-08: проверяется факт ревью, а не его итог. */
    const repository = repositoryWithBranch();
    reviewBranch(repository, 'feat/x', 4);
    expect(callGate(bashPayload(repository, 'git merge feat/x'))).toBe('');
  });

  it('чистка дерева перед слиянием ворота не отключает', () => {
    /*
     * Дыра, найденная ревью 2026-09-08: `git checkout .` разбирался как
     * переход на ветку «.», цель переставала быть master, и неотревьюенная
     * ветка уезжала в master молча.
     */
    const repository = repositoryWithBranch();
    const output = callGate(bashPayload(repository, 'git checkout . && git merge --no-ff feat/x'));
    expect(JSON.parse(output).hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('ветка с именем main без ревью в master не проходит', () => {
    /*
     * Вторая дыра оттуда же: пропуск был написан как «любое имя из
     * MASTER_BRANCHES», и main проходил как «слияние master в самого себя».
     * Теперь пропускается только то, что уже содержится в цели.
     */
    const repository = repositoryWithBranch();
    execFileSync('git', ['branch', 'main', 'feat/x'], { cwd: repository, stdio: 'ignore' });
    const output = callGate(bashPayload(repository, 'git checkout master && git merge main'));
    expect(JSON.parse(output).hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('уже слитая ветка проходит: сливать нечего', () => {
    const repository = repositoryWithBranch();
    execFileSync('git', ['branch', 'уже-слито', 'master'], { cwd: repository, stdio: 'ignore' });
    expect(callGate(bashPayload(repository, 'git merge уже-слито'))).toBe('');
  });

  it('слияние master в ветку не трогается', () => {
    const repository = repositoryWithBranch();
    execFileSync('git', ['checkout', 'feat/x'], { cwd: repository, stdio: 'ignore' });
    expect(callGate(bashPayload(repository, 'git merge master'))).toBe('');
  });

  it('чужая команда не трогается', () => {
    const repository = repositoryWithBranch();
    expect(callGate(bashPayload(repository, 'npm test'))).toBe('');
  });

  it('git merge --abort проходит', () => {
    const repository = repositoryWithBranch();
    expect(callGate(bashPayload(repository, 'git merge --abort'))).toBe('');
  });

  it('несуществующая ссылка не отклоняет команду', () => {
    const repository = repositoryWithBranch();
    expect(callGate(bashPayload(repository, 'git merge такой-ветки-нет'))).toBe('');
  });

  it('мусор на входе не роняет хук', () => {
    expect(() => execFileSync('node', [ENTRY], { input: 'не json', encoding: 'utf8' })).not.toThrow();
  });

  it('вне репозитория ворота молчат', () => {
    const directory = mkdtempSync(join(tmpdir(), 'review-gate-bare-'));
    expect(callGate(bashPayload(directory, 'git merge feat/x'))).toBe('');
  });
});

describe('быстрый отсев', () => {
  it('пропускает команду без слова merge, ничего не печатая', () => {
    const repository = repositoryWithBranch();
    expect(callGate(bashPayload(repository, 'npm run build'), SHELL_ENTRY)).toBe('');
  });

  it('доводит слияние до ворот', () => {
    const repository = repositoryWithBranch();
    const output = callGate(bashPayload(repository, 'git merge feat/x'), SHELL_ENTRY);
    expect(JSON.parse(output).hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
