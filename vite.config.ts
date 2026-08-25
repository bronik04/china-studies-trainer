import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
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
  },
});
