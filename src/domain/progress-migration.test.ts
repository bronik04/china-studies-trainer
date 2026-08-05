import { migrateProgress } from './progress-migration';

const v1 = {
  schemaVersion: 1,
  attempts: [
    {
      questionId: '1-sichuan',
      roundId: 'round-1',
      regionId: 'sichuan',
      exerciseType: 'find-on-map',
      level: 1,
      isCorrect: true,
      durationMs: 1000,
      answeredAt: '2026-08-03T10:00:00.000Z',
    },
  ],
  masteredRegionIds: ['sichuan'],
  unlockedLevel: 2,
};

it('переводит попытки и освоенное на цели-регионы', () => {
  expect(migrateProgress(v1)).toEqual({
    schemaVersion: 3,
    attempts: [
      {
        questionId: '1-sichuan',
        roundId: 'round-1',
        target: { kind: 'region', id: 'sichuan' },
        exerciseType: 'find-on-map',
        level: 1,
        isCorrect: true,
        durationMs: 1000,
        answeredAt: '2026-08-03T10:00:00.000Z',
      },
    ],
    masteredTargets: [{ kind: 'region', id: 'sichuan' }],
  });
});

it('пропускает прогресс текущей версии без изменений', () => {
  const v3 = { schemaVersion: 3, attempts: [], masteredTargets: [] };

  expect(migrateProgress(v3)).toEqual(v3);
});

it('не понимает чужие и будущие данные', () => {
  expect(migrateProgress({ schemaVersion: 99 })).toBeNull();
  expect(migrateProgress('строка')).toBeNull();
  expect(migrateProgress({ schemaVersion: 1, attempts: 'не массив' })).toBeNull();
  expect(migrateProgress({ schemaVersion: 1, attempts: [{ нет: 'региона' }] })).toBeNull();
});

it('переименовывает типы упражнений первой версии', () => {
  const migrated = migrateProgress({
    schemaVersion: 1,
    attempts: [
      { ...v1.attempts[0], exerciseType: 'name-region' },
      { ...v1.attempts[0], exerciseType: 'match-capital' },
      { ...v1.attempts[0], exerciseType: 'find-on-map' },
    ],
    masteredRegionIds: [],
  });

  expect(migrated?.attempts.map((attempt) => attempt.exerciseType)).toEqual([
    'name-target',
    'match-pair',
    'find-on-map',
  ]);
});
