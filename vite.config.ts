import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  /*
   * Порт берётся из окружения, когда он назначен снаружи (предпросмотр
   * Claude Code поднимает второй сервер рядом с уже занятым 5173). Без
   * переменной Vite ведёт себя как прежде.
   */
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    /*
     * `.claude` — служебный каталог Claude Code: в `.claude/worktrees` живут
     * копии всего проекта со своими тестами. Без игнора vitest гоняет и их, а
     * читают они файлы из корня — старый тест против нового `tokens.css`
     * падал, ничего не говоря о самом проекте. Тот же довод, что у игнора в
     * eslint.config.js.
     */
    exclude: [...configDefaults.exclude, '.claude/**'],
    /*
     * Предел теста поднят с умолчания в пять секунд. Экраны приезжают
     * отдельными кусками сборки, и на полном прогоне, где файлы идут parallel,
     * ожидание куска доходит до нескольких секунд — ждём мы не экрана, а
     * свободного процессора. Внутри `App.test.tsx` ожидание кадра ограничено
     * восемью секундами, и предел теста обязан быть больше: иначе вместо
     * внятного «экран не загрузился» тест падал бы по своему таймауту.
     */
    testTimeout: 20_000,
  },
});
