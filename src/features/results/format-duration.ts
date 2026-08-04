/** Время подаётся как факт, без оценки скорости (UI_UX.md). */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes === 0 ? `${seconds} с` : `${minutes} мин ${seconds} с`;
}
