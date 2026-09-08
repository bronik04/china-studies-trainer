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
