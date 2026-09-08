/*
 * Тонкая обёртка над теми командами git, которые нужны хукам.
 *
 * Любая неудача — `null`, а не исключение. Хук, который начинает мешать
 * работе из-за того, что у него самого что-то сломалось, снимают в тот же
 * день, и вместе с ним пропадает польза.
 */
import { execFileSync } from 'node:child_process';

export function git(cwd: string, args: readonly string[]): string | null {
  try {
    return execFileSync('git', [...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

/** Имя текущей ветки. Отсоединённый HEAD — тоже null: ветки нет. */
export function currentBranch(cwd: string): string | null {
  const name = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return name === null || name === '' || name === 'HEAD' ? null : name;
}

/** Sha коммита, в который разрешается ссылка, либо null. */
export function resolveCommit(cwd: string, ref: string): string | null {
  const sha = git(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  return sha === null || sha === '' ? null : sha;
}

export function headSha(cwd: string): string | null {
  return resolveCommit(cwd, 'HEAD');
}

/** Есть ли такая локальная ветка. Отличает `git checkout X` от пути. */
export function branchExists(cwd: string, name: string): boolean {
  return git(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]) !== null;
}

/*
 * Содержится ли ссылка в цели целиком. Именно это и значит «сливать нечего»:
 * сравнение имён отсекало любую ветку, названную master или main, и слияние
 * main в master проходило мимо ворот без всякой записи о ревью.
 */
export function isAncestor(cwd: string, ref: string, target: string): boolean {
  return git(cwd, ['merge-base', '--is-ancestor', ref, target]) !== null;
}

/** Общий каталог git — один на основной каталог и все рабочие деревья. */
export function commonGitDir(cwd: string): string | null {
  const directory = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return directory === null || directory === '' ? null : directory;
}
