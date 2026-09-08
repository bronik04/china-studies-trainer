# Ворота ревью: план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ ПОДСКИЛЛ: выполняйте план по задачам через
> superpowers:subagent-driven-development (рекомендуется) или
> superpowers:executing-plans. Шаги помечены `- [ ]` для отметок.

**Цель:** `git merge` в master не проходит через Claude Code, пока для
сливаемого коммита нет записи о пройденном `/code-review`.

**Устройство:** два хука Claude Code в `.claude/settings.json`. `PostToolUse`
на `ReportFindings` записывает sha HEAD в журнал, `PreToolUse` на `Bash`
разбирает команду и отказывает, если сливаемой ветки в журнале нет. Журнал —
`review-log.json` в общем каталоге git, один на все рабочие деревья. Логика
разведена на чистый разбор строки, работу с журналом, обёртку над git и две
тонкие точки входа.

**Стек:** TypeScript, исполняемый Node 26 напрямую (снятие типов встроено),
vitest, POSIX sh для быстрого отсева.

Спецификация: `docs/superpowers/specs/2026-09-08-review-gate-hook-design.md`.

## Общие ограничения

- Интерфейс, задания и сообщения об ошибках — по-русски (`AGENTS.md`). Текст
  отказа хука — тоже: его читает владелец.
- Комментарии в коде — по-русски, как во всех файлах `scripts/`. Объясняют
  причину, а не пересказывают код.
- Точки входа хуков **обязаны** импортировать соседние модули с расширением
  `.ts` (`import { git } from './git.ts'`): без расширения Node не найдёт
  файл. Это расходится с соседями по `scripts/`, где расширения нет, — там
  импорт разрешает Vite, а здесь запускает `node`. `allowImportingTsExtensions`
  в `tsconfig.node.json` уже включён, `tsc` и vitest такой импорт принимают.
- Ни один хук не смеет упасть: любая неудача — тихий выход с нулём. Хук,
  блокирующий работу из-за собственной поломки, снимают в тот же день.
- `tsconfig.node.json` уже включает `scripts`, значит `npm run build` проверит
  новые файлы типами. Отдельной настройки не нужно.
- Мастер-ветками считаются `master` и `main` — список константой в коде.
- Каждая задача заканчивается коммитом. Ветка `feat/review-gate-hook`.

---

### Задача 1: Разбор командной строки

**Файлы:**
- Создать: `scripts/hooks/merge-command.ts`
- Тест: `scripts/hooks/merge-command.test.ts`

**Интерфейсы:**
- Потребляет: ничего.
- Отдаёт: `parseMergeCommand(command: string, currentBranch: string | null):
  MergeCommand | null`, где `MergeCommand = { target: string | null; refs:
  readonly string[] }`; `isMasterBranch(branch: string | null): boolean`;
  константу `MASTER_BRANCHES`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `scripts/hooks/merge-command.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isMasterBranch, parseMergeCommand } from './merge-command.ts';

describe('parseMergeCommand', () => {
  it('видит переход на master в той же командной строке', () => {
    /*
     * Ради этого случая всё и делается: типичный слив выглядит так, и на
     * момент хука текущая ветка — ещё feat/x. Проверка «я сейчас на master»
     * промахнулась бы ровно здесь.
     */
    expect(parseMergeCommand('git checkout master && git merge --no-ff feat/x', 'feat/x')).toEqual({
      target: 'master',
      refs: ['feat/x'],
    });
  });

  it('берёт текущую ветку, когда перехода в строке нет', () => {
    expect(parseMergeCommand('git merge feat/x', 'master')).toEqual({
      target: 'master',
      refs: ['feat/x'],
    });
  });

  it('не принимает сообщение -m за ссылку', () => {
    expect(parseMergeCommand('git merge --no-ff -m "merge: соседи; правки" feat/x', 'master')).toEqual({
      target: 'master',
      refs: ['feat/x'],
    });
  });

  it('пропускает значения флагов стратегии', () => {
    expect(parseMergeCommand('git merge -s ort -X ours feat/x', 'master')?.refs).toEqual(['feat/x']);
  });

  it('оставляет список ссылок пустым у --abort, --continue и --quit', () => {
    for (const flag of ['--abort', '--continue', '--quit']) {
      expect(parseMergeCommand(`git merge ${flag}`, 'master')).toEqual({ target: 'master', refs: [] });
    }
  });

  it('понимает switch наравне с checkout', () => {
    expect(parseMergeCommand('git switch master; git merge feat/x', 'feat/x')?.target).toBe('master');
  });

  it('слияние master в ветку остаётся слиянием в ветку', () => {
    expect(parseMergeCommand('git merge master', 'feat/x')).toEqual({
      target: 'feat/x',
      refs: ['master'],
    });
  });

  it('не принимает пути после -- за имя ветки', () => {
    expect(parseMergeCommand('git checkout -- . && git merge feat/x', 'master')?.target).toBe('master');
  });

  it('видит несколько сливаемых веток', () => {
    expect(parseMergeCommand('git merge feat/a feat/b', 'master')?.refs).toEqual(['feat/a', 'feat/b']);
  });

  it('видит ветку, созданную через checkout -b', () => {
    expect(parseMergeCommand('git checkout -b main && git merge feat/x', 'feat/x')?.target).toBe('main');
  });

  it('возвращает null, когда слияния в команде нет', () => {
    expect(parseMergeCommand('npm test && git status', 'master')).toBeNull();
  });

  it('не спотыкается о разделитель внутри кавычек', () => {
    expect(parseMergeCommand('git merge -m "правки; и ещё && вот" feat/x', 'master')?.refs).toEqual(['feat/x']);
  });
});

describe('isMasterBranch', () => {
  it('узнаёт master и main', () => {
    expect(isMasterBranch('master')).toBe(true);
    expect(isMasterBranch('main')).toBe(true);
  });

  it('не считает главной похожее имя и отсутствие ветки', () => {
    expect(isMasterBranch('feat/master')).toBe(false);
    expect(isMasterBranch(null)).toBe(false);
  });
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run scripts/hooks/merge-command.test.ts`
Ожидается: провал с сообщением о том, что модуль `./merge-command.ts` не найден.

- [ ] **Шаг 3: Написать модуль**

Создать `scripts/hooks/merge-command.ts`:

```ts
/*
 * Разбор командной строки Bash для ворот ревью: куда сливают и что сливают.
 *
 * Модуль не знает ни про git, ни про файловую систему. На входе строка и имя
 * текущей ветки, на выходе — цель слияния и токены, похожие на ссылки.
 * Разрешать их в коммиты будет вызывающий: так разбор проверяется таблицей
 * входов и выходов, без временного репозитория.
 */

/** Ветки, вход в которые закрыт воротами. */
export const MASTER_BRANCHES = ['master', 'main'] as const;

export type MergeCommand = {
  /** Ветка, на которой окажется git к моменту `git merge`. */
  readonly target: string | null;
  /** Токены после `git merge`, не являющиеся флагами и значениями флагов. */
  readonly refs: readonly string[];
};

type Token = { readonly text: string; readonly operator: boolean };

/** Глобальные флаги git, забирающие следующий токен. */
const GIT_VALUE_FLAGS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

/** Флаги checkout и switch, после которых идёт имя новой ветки. */
const NEW_BRANCH_FLAGS = new Set(['-b', '-B', '-c', '-C', '--orphan']);

/** Флаги checkout и switch, забирающие значение, которое веткой не является. */
const CHECKOUT_VALUE_FLAGS = new Set(['-t', '--track', '--start-point']);

/*
 * Флаги `git merge`, обязательно забирающие следующий токен. Флаги с
 * необязательным значением (--gpg-sign, --log) сюда не входят намеренно:
 * их значение пишут через `=`, а угаданное лишнее слово всё равно не
 * разрешится в коммит.
 */
const MERGE_VALUE_FLAGS = new Set([
  '-m', '--message', '-F', '--file', '-s', '--strategy',
  '-X', '--strategy-option', '--into-name', '--cleanup',
]);

/*
 * Разбор на токены со своими кавычками. Наивное деление по пробелам сломалось
 * бы на `-m "merge: правки; и ещё"`: точка с запятой внутри сообщения
 * оборвала бы команду, и слияние осталось бы незамеченным.
 */
function tokenize(command: string): Token[] {
  const tokens: Token[] = [];
  let text = '';
  let started = false;

  const flush = (): void => {
    if (!started) return;
    tokens.push({ text, operator: false });
    text = '';
    started = false;
  };

  for (let i = 0; i < command.length; i += 1) {
    const character = command[i];

    if (character === '\\' && i + 1 < command.length) {
      text += command[i + 1];
      started = true;
      i += 1;
      continue;
    }

    if (character === "'") {
      const end = command.indexOf("'", i + 1);
      const stop = end === -1 ? command.length : end;
      text += command.slice(i + 1, stop);
      started = true;
      i = stop;
      continue;
    }

    if (character === '"') {
      let j = i + 1;
      while (j < command.length && command[j] !== '"') {
        if (command[j] === '\\' && j + 1 < command.length) {
          text += command[j + 1];
          j += 2;
          continue;
        }
        text += command[j];
        j += 1;
      }
      started = true;
      i = j;
      continue;
    }

    if (character === ' ' || character === '\t') {
      flush();
      continue;
    }

    const pair = command.slice(i, i + 2);
    if (pair === '&&' || pair === '||') {
      flush();
      tokens.push({ text: pair, operator: true });
      i += 1;
      continue;
    }

    if (character === ';' || character === '|' || character === '\n' || character === '(' || character === ')') {
      flush();
      tokens.push({ text: character, operator: true });
      continue;
    }

    text += character;
    started = true;
  }

  flush();
  return tokens;
}

/** Деление на команды по разделителям. */
function segments(tokens: readonly Token[]): string[][] {
  const result: string[][] = [];
  let current: string[] = [];

  for (const token of tokens) {
    if (token.operator) {
      if (current.length > 0) result.push(current);
      current = [];
      continue;
    }
    current.push(token.text);
  }

  if (current.length > 0) result.push(current);
  return result;
}

/** Подкоманда git и её аргументы, либо null, если это не вызов git. */
function gitCall(segment: readonly string[]): { name: string; rest: string[] } | null {
  if (segment[0] !== 'git') return null;

  let i = 1;
  while (i < segment.length && segment[i].startsWith('-')) {
    i += GIT_VALUE_FLAGS.has(segment[i]) ? 2 : 1;
  }

  if (i >= segment.length) return null;
  return { name: segment[i], rest: segment.slice(i + 1) };
}

/** Ветка, на которую переходит checkout или switch. Пути после `--` — не ветка. */
function checkoutTarget(rest: readonly string[]): string | null {
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--') return null;
    if (NEW_BRANCH_FLAGS.has(token)) return rest[i + 1] ?? null;
    if (CHECKOUT_VALUE_FLAGS.has(token)) {
      i += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    return token;
  }
  return null;
}

/** Токены-кандидаты в сливаемые ссылки. */
function mergeRefs(rest: readonly string[]): string[] {
  const refs: string[] = [];
  let afterDoubleDash = false;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];

    if (!afterDoubleDash) {
      if (token === '--') {
        afterDoubleDash = true;
        continue;
      }
      if (MERGE_VALUE_FLAGS.has(token)) {
        i += 1;
        continue;
      }
      if (token.startsWith('-')) continue;
    }

    if (token.length > 0) refs.push(token);
  }

  return refs;
}

/**
 * Цель слияния и сливаемые ссылки, либо null, если слияния в команде нет.
 * Цель — последний checkout или switch в той же строке, иначе текущая ветка.
 */
export function parseMergeCommand(command: string, currentBranch: string | null): MergeCommand | null {
  let branch = currentBranch;

  for (const segment of segments(tokenize(command))) {
    const call = gitCall(segment);
    if (call === null) continue;

    if (call.name === 'checkout' || call.name === 'switch') {
      const target = checkoutTarget(call.rest);
      if (target !== null) branch = target;
      continue;
    }

    if (call.name === 'merge') {
      return { target: branch, refs: mergeRefs(call.rest) };
    }
  }

  return null;
}

export function isMasterBranch(branch: string | null): boolean {
  return branch !== null && (MASTER_BRANCHES as readonly string[]).includes(branch);
}
```

- [ ] **Шаг 4: Убедиться, что тест проходит**

Запустить: `npx vitest run scripts/hooks/merge-command.test.ts`
Ожидается: 14 тестов пройдены.

- [ ] **Шаг 5: Проверить линтером**

Запустить: `npm run lint`
Ожидается: без ошибок.

- [ ] **Шаг 6: Коммит**

```bash
git add scripts/hooks/merge-command.ts scripts/hooks/merge-command.test.ts
git commit -m "feat: разбор командной строки для ворот ревью"
```

---

### Задача 2: Журнал ревью

**Файлы:**
- Создать: `scripts/hooks/review-log.ts`
- Тест: `scripts/hooks/review-log.test.ts`

**Интерфейсы:**
- Потребляет: ничего.
- Отдаёт: тип `ReviewRecord = { sha: string; branch: string | null; findings:
  number; level: string | null; at: string }`; `LOG_LIMIT: number`;
  `logPath(commonGitDir: string): string`; `readLog(path: string):
  ReviewRecord[]`; `findReview(records: readonly ReviewRecord[], sha: string):
  ReviewRecord | undefined`; `appendReview(path: string, record: ReviewRecord):
  void`.

- [ ] **Шаг 1: Написать падающий тест**

Создать `scripts/hooks/review-log.test.ts`:

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOG_LIMIT, appendReview, findReview, logPath, readLog } from './review-log.ts';

function temporaryLog(): string {
  return logPath(mkdtempSync(join(tmpdir(), 'review-log-')));
}

function record(sha: string): Parameters<typeof appendReview>[1] {
  return { sha, branch: 'feat/x', findings: 0, level: 'medium', at: '2026-09-08T00:00:00.000Z' };
}

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

describe('журнал ревью', () => {
  it('отсутствующий файл читается как пустой журнал', () => {
    expect(readLog(temporaryLog())).toEqual([]);
  });

  it('дописанная запись становится первой', () => {
    const path = temporaryLog();
    appendReview(path, record(SHA_A));
    appendReview(path, record(SHA_B));
    expect(readLog(path).map((item) => item.sha)).toEqual([SHA_B, SHA_A]);
  });

  it('повторное ревью того же коммита не задваивается', () => {
    const path = temporaryLog();
    appendReview(path, record(SHA_A));
    appendReview(path, { ...record(SHA_A), findings: 3 });
    const records = readLog(path);
    expect(records).toHaveLength(1);
    expect(records[0].findings).toBe(3);
  });

  it('хвост обрезается до предела', () => {
    const path = temporaryLog();
    for (let i = 0; i <= LOG_LIMIT; i += 1) {
      appendReview(path, record(String(i).padStart(40, '0')));
    }
    expect(readLog(path)).toHaveLength(LOG_LIMIT);
  });

  it('испорченный файл читается как пустой и не мешает записи', () => {
    /*
     * Терять здесь нечего: журнал восстановим следующим ревью. Падение
     * вместо пустого списка закрыло бы ворота молча и навсегда.
     */
    const path = temporaryLog();
    writeFileSync(path, '{ это не json', 'utf8');
    expect(readLog(path)).toEqual([]);
    appendReview(path, record(SHA_A));
    expect(readLog(path).map((item) => item.sha)).toEqual([SHA_A]);
  });

  it('запись без sha отбрасывается', () => {
    const path = temporaryLog();
    writeFileSync(path, JSON.stringify({ version: 1, reviews: [{ at: 'когда-то' }, record(SHA_A)] }), 'utf8');
    expect(readLog(path).map((item) => item.sha)).toEqual([SHA_A]);
  });

  it('findReview ищет по sha', () => {
    const records = readLog(temporaryLog());
    expect(findReview(records, SHA_A)).toBeUndefined();
    expect(findReview([record(SHA_A)], SHA_A)?.branch).toBe('feat/x');
  });
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run scripts/hooks/review-log.test.ts`
Ожидается: провал с сообщением о том, что модуль `./review-log.ts` не найден.

- [ ] **Шаг 3: Написать модуль**

Создать `scripts/hooks/review-log.ts`:

```ts
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
```

- [ ] **Шаг 4: Убедиться, что тест проходит**

Запустить: `npx vitest run scripts/hooks/review-log.test.ts`
Ожидается: 7 тестов пройдены.

- [ ] **Шаг 5: Коммит**

```bash
git add scripts/hooks/review-log.ts scripts/hooks/review-log.test.ts
git commit -m "feat: журнал пройденных ревью в общем каталоге git"
```

---

### Задача 3: Обёртка над git и записывающий хук

**Файлы:**
- Создать: `scripts/hooks/git.ts`
- Создать: `scripts/hooks/review-record.ts`
- Тест: `scripts/hooks/review-record.test.ts`

**Интерфейсы:**
- Потребляет: `appendReview`, `logPath` из `./review-log.ts` (задача 2).
- Отдаёт из `git.ts`: `git(cwd: string, args: readonly string[]): string |
  null`; `currentBranch(cwd: string): string | null`; `resolveCommit(cwd:
  string, ref: string): string | null`; `headSha(cwd: string): string | null`;
  `commonGitDir(cwd: string): string | null`. Все возвращают `null` при любой
  неудаче.
- Отдаёт из `review-record.ts`: точку входа, читающую полезную нагрузку
  `PostToolUse` со стандартного ввода.

- [ ] **Шаг 1: Написать падающий тест**

Создать `scripts/hooks/review-record.test.ts`:

```ts
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
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run scripts/hooks/review-record.test.ts`
Ожидается: провал — модуль `./git.ts` не найден.

- [ ] **Шаг 3: Написать обёртку над git**

Создать `scripts/hooks/git.ts`:

```ts
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

/** Общий каталог git — один на основной каталог и все рабочие деревья. */
export function commonGitDir(cwd: string): string | null {
  const directory = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return directory === null || directory === '' ? null : directory;
}
```

- [ ] **Шаг 4: Написать записывающий хук**

Создать `scripts/hooks/review-record.ts`:

```ts
/*
 * Хук PostToolUse на инструмент ReportFindings: им заканчивается /code-review.
 * Записывает в журнал, что коммит, на котором стоит HEAD, отревьюен.
 *
 * Sha берётся у HEAD, а не у того, что ревью разбирало: если ревью смотрело
 * чужую ветку или PR, запись окажется не о том — но ворота от этого только
 * строже не станут, а обычный случай (ревью своей ветки перед сливом) она
 * закрывает точно.
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
```

- [ ] **Шаг 5: Убедиться, что тесты проходят**

Запустить: `npx vitest run scripts/hooks/review-record.test.ts`
Ожидается: 6 тестов пройдены.

- [ ] **Шаг 6: Коммит**

```bash
git add scripts/hooks/git.ts scripts/hooks/review-record.ts scripts/hooks/review-record.test.ts
git commit -m "feat: хук записывает пройденное ревью в журнал"
```

---

### Задача 4: Ворота

**Файлы:**
- Создать: `scripts/hooks/review-gate.ts`
- Создать: `scripts/hooks/review-gate.sh`
- Тест: `scripts/hooks/review-gate.test.ts`

**Интерфейсы:**
- Потребляет: `parseMergeCommand`, `isMasterBranch` из `./merge-command.ts`
  (задача 1); `readLog`, `findReview`, `logPath`, `appendReview` из
  `./review-log.ts` (задача 2); `currentBranch`, `resolveCommit`,
  `commonGitDir`, `headSha` из `./git.ts` (задача 3).
- Отдаёт: точку входа `PreToolUse`, печатающую в stdout решение об отказе, и
  шелл-обёртку с быстрым отсевом.

- [ ] **Шаг 1: Написать падающий тест**

Создать `scripts/hooks/review-gate.test.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonGitDir, headSha } from './git.ts';
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

function reviewBranch(repository: string, branch: string): void {
  const sha = execFileSync('git', ['rev-parse', branch], { cwd: repository, encoding: 'utf8' }).trim();
  appendReview(logPath(commonGitDir(repository) ?? ''), {
    sha,
    branch,
    findings: 0,
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
    const repository = repositoryWithBranch();
    const sha = execFileSync('git', ['rev-parse', 'feat/x'], { cwd: repository, encoding: 'utf8' }).trim();
    appendReview(logPath(commonGitDir(repository) ?? ''), {
      sha, branch: 'feat/x', findings: 4, level: 'high', at: new Date().toISOString(),
    });
    expect(callGate(bashPayload(repository, 'git merge feat/x'))).toBe('');
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
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run scripts/hooks/review-gate.test.ts`
Ожидается: провал — модуль `./review-gate.ts` не найден.

- [ ] **Шаг 3: Написать ворота**

Создать `scripts/hooks/review-gate.ts`:

```ts
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
```

- [ ] **Шаг 4: Написать быстрый отсев**

Создать `scripts/hooks/review-gate.sh`:

```sh
#!/bin/sh
# Быстрый отсев перед воротами ревью (review-gate.ts).
#
# Хук висит на каждой команде Bash, а разбирать надо одну из сотни. Запуск
# Node со снятием типов стоит около 150 мс, эта проверка — единицы
# миллисекунд. Отсев нарочно грубый: решает всё равно разбор в
# merge-command.ts.
#
# Код возврата не глушится намеренно. Ворота сами гасят любую свою ошибку и
# выходят с нулём; ненулевой код здесь означает, что не запустился сам Node,
# и такое лучше увидеть. Слияние это всё равно не остановит: блокирует только
# код 2.
payload=$(cat)

case "$payload" in
  *merge*) printf '%s' "$payload" | node "$(dirname "$0")/review-gate.ts" ;;
esac
```

Сделать исполняемым:

```bash
chmod +x scripts/hooks/review-gate.sh
```

- [ ] **Шаг 5: Убедиться, что тесты проходят**

Запустить: `npx vitest run scripts/hooks/review-gate.test.ts`
Ожидается: 11 тестов пройдены.

- [ ] **Шаг 6: Прогнать весь набор и линтер**

Запустить: `npm test && npm run lint`
Ожидается: весь набор зелёный, линтер молчит.

- [ ] **Шаг 7: Коммит**

```bash
git add scripts/hooks/review-gate.ts scripts/hooks/review-gate.sh scripts/hooks/review-gate.test.ts
git commit -m "feat: ворота не пускают в master неотревьюенное"
```

---

### Задача 5: Подключение и живой прогон

**Файлы:**
- Создать: `.claude/settings.json`
- Изменить: `.gitignore:3`

**Интерфейсы:**
- Потребляет: `scripts/hooks/review-gate.sh` и `scripts/hooks/review-record.ts`
  (задачи 3 и 4).
- Отдаёт: работающий заслон.

- [ ] **Шаг 1: Разигнорить настройку**

Заменить в `.gitignore` строку `.claude/` на две строки:

```gitignore
.claude/*
!.claude/settings.json
```

Остальные строки файла не трогать. Точечное исключение нужно потому, что
`git` не умеет разыгнорить файл внутри игнорируемого каталога: сам каталог
должен остаться видимым, а игнорироваться — его содержимое.

- [ ] **Шаг 2: Проверить, что файл перестал игнорироваться**

Запустить: `git check-ignore -v .claude/settings.json; echo "код: $?"`
Ожидается: `код: 1` — правила, скрывающего файл, больше нет. Личное
(`launch.json`, `worktrees/`, `settings.local.json`) по-прежнему скрыто:

Запустить: `git check-ignore .claude/launch.json`
Ожидается: `.claude/launch.json`

- [ ] **Шаг 3: Написать настройку**

Создать `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "sh \"$CLAUDE_PROJECT_DIR/scripts/hooks/review-gate.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "ReportFindings",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hooks/review-record.ts\""
          }
        ]
      }
    ]
  }
}
```

`$CLAUDE_PROJECT_DIR` указывает на корень той копии, в которой идёт сессия, —
для рабочего дерева из `.worktrees/` на само дерево. Скрипты лежат рядом с
кодом, значит находятся в любой копии.

- [ ] **Шаг 4: Коммит**

```bash
git add .gitignore .claude/settings.json
git commit -m "chore: хуки ревью подключены и едут вместе с репозиторием"
```

- [ ] **Шаг 5: Живой прогон — проверка главного допущения**

Шаг с участием владельца: хуки читаются при старте сессии, и новый хук требует
подтверждения. Попросить владельца перезапустить Claude Code в этом каталоге.

Проверяется естественным ходом самой этой ветки, без выдуманных веток и
выброшенных коммитов. Порядок обязателен — сначала отказ, потом разрешение,
иначе первая половина уже не проверяема.

**А. Ворота закрыты.** Ветка `feat/review-gate-hook` ревью ещё не проходила.
Попросить агента выполнить:

```bash
git -C "$(git rev-parse --path-format=absolute --git-common-dir)/.." merge --no-ff feat/review-gate-hook
```

Ожидается: команда отклонена, в тексте отказа — имя ветки, её короткий sha и
слова про `/code-review`. Само слияние не произошло.

**Б. Запись появляется.** Выполнить `/code-review` в этой ветке, затем:

```bash
cat "$(git rev-parse --path-format=absolute --git-common-dir)/review-log.json"
```

Ожидается: JSON с одной записью, где `sha` равен выводу `git rev-parse HEAD`, а
`branch` — `feat/review-gate-hook`.

**В. Ворота открылись.** Повторить команду из пункта А. Ожидается: отказа нет.
Слияние на этом шаге можно и не доводить — важно, что хук молчит.

- [ ] **Шаг 6: Если записи нет — остановиться**

Записи не появилось означает, что `ReportFindings` вызывается внутри
субагента и до хуков сессии не доходит. Это худший исход: ворота закрыты
навсегда. В этом случае **немедленно** убрать `PreToolUse` из
`.claude/settings.json` (записывающий хук оставить), закоммитить это
отдельно, сообщить владельцу и предложить другой сигнал — `Stop`-хук,
читающий стенограмму. Не изобретать ручную команду-обход: владелец её уже
отклонил 2026-09-08.

---

### Задача 6: Документы и полная проверка

**Файлы:**
- Изменить: `CLAUDE.md` (новый раздел перед «Что помнить при изменениях»)
- Изменить: `CHANGELOG.md` (в `## [Unreleased]`, раздел `### Added`)
- Изменить: `DECISIONS.md` (новая строка сверху таблицы)

- [ ] **Шаг 1: Записать решение**

Добавить в `DECISIONS.md` строкой сразу под шапкой таблицы:

```markdown
| 2026-09-08 | Слияние в master закрыто хуком Claude Code: ревью обязательно, запись о нём автоматическая | Решения владельца. Хук именно Claude Code, а не git: ловить надо агента, а слив, сделанный владельцем руками в терминале, проходит без вопросов — это и есть выход для экстренного исправления, которое AGENTS.md допускает. Хук — привратник: линтер, тесты и сборку уже гоняет CI на каждый пуш, дублировать минуту ожидания на каждый слив незачем. Запись о ревью появляется сама, хуком `PostToolUse` на `ReportFindings`, которым заканчивается `/code-review`; ручной команды-обхода нет намеренно — её легко штамповать не глядя. Ревью с находками ворота открывает: хук проверяет факт ревью, а не итог, что делать с замечаниями — решает владелец; исправили, sha сменился, нужен короткий повторный прогон. Журнал лежит в общем каталоге git, а не в `.claude/`: ревью делается в ветке, часто в отдельном рабочем дереве, а слив — в основном каталоге, и у каждой копии был бы свой журнал. Ловится только `git merge` с целью master: пуш и `gh pr merge` не закрываются, в этом репозитории так не сливают. Допущение, на котором всё держится и которое проверено живым прогоном: `ReportFindings` вызывается в сессии, а не внутри субагента. |
```

- [ ] **Шаг 2: Записать изменение**

Добавить в `CHANGELOG.md` первым пунктом раздела `### Added` внутри
`## [Unreleased]`:

```markdown
- Ворота ревью перед сливом в master: два хука Claude Code закрепляют правило
  из `AGENTS.md`, которое до сих пор держалось на памяти. `/code-review`
  оставляет запись о просмотренном коммите, `git merge` в master без такой
  записи отклоняется с объяснением. Журнал лежит в общем каталоге git — один
  на основной каталог и все рабочие деревья. Проверки (линтер, тесты, сборка)
  хук не гоняет: их и без того гоняет CI на каждый пуш. Слив, сделанный руками
  в терминале, хук не видит — экстренное исправление по решению владельца
  проходит.
```

- [ ] **Шаг 3: Описать хук в CLAUDE.md**

Добавить в `CLAUDE.md` раздел перед «## Что помнить при изменениях»:

```markdown
## Хуки: ворота ревью перед сливом в master

`.claude/settings.json` — единственный файл в `.claude/`, который ведётся в
git (остальное скрыто `.claude/*`). В нём два хука:

| Хук | Когда | Что делает |
| --- | --- | --- |
| `PostToolUse` на `ReportFindings` | конец `/code-review` | пишет sha HEAD, ветку, число находок и уровень в журнал |
| `PreToolUse` на `Bash` | каждая команда | если команда сливает в master ветку без записи — отказ с объяснением |

Журнал — `review-log.json` в общем каталоге git (`git rev-parse
--git-common-dir`), один на основной каталог и все рабочие деревья: ревью
делается в ветке, слив — в основном каталоге.

**Ворота открывает факт ревью, а не его итог.** Ревью с находками — тоже
ревью. Исправили находки — sha сменился, нужен короткий повторный прогон.

**Отказ — не запрет.** Хук видит только команды, которые запускает агент;
слив, набранный в терминале руками, проходит. Экстренное исправление по
решению владельца (`AGENTS.md`) этим и делается.

Разбор командной строки живёт в `scripts/hooks/merge-command.ts` и не знает ни
про git, ни про файлы — потому и проверяется таблицей входов и выходов.
Скрипты запускает `node` напрямую: Node снимает типы сам, и это втрое дешевле
`tsx` на каждой команде Bash. Из-за `node` соседние модули импортируются **с
расширением** `.ts` — в отличие от прочих файлов в `scripts/`.
```

- [ ] **Шаг 4: Полная проверка**

Запустить: `npm run lint && npm test && npm run build`
Ожидается: линтер молчит, весь набор зелёный, сборка проходит все три
валидатора и компиляцию.

- [ ] **Шаг 5: Коммит**

```bash
git add CLAUDE.md CHANGELOG.md DECISIONS.md
git commit -m "docs: ворота ревью описаны в CLAUDE.md, решении и истории"
```

---

## Готовность

Изменение готово, когда: `npm run lint`, `npm test` и `npm run build` проходят;
живой прогон из задачи 5 подтвердил, что запись появляется, а слияние без
записи отклоняется; `CHANGELOG.md`, `DECISIONS.md` и `CLAUDE.md` обновлены.
