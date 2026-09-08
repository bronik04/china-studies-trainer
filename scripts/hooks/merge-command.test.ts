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
