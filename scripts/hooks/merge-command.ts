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
