import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  /*
   * `.claude` — служебный каталог Claude Code: в `.claude/worktrees` живут
   * копии всего проекта, и без игнора eslint из корня спотыкается об их
   * tsconfig («multiple candidate TSConfigRootDirs»).
   *
   * `.worktrees` — то же самое, но от другого инструмента: рабочие копии веток
   * git. Обе папки перечислены в `.gitignore`, то есть проектом не считаются;
   * линтеру и тестам об этом надо сказать отдельно — `.gitignore` они не
   * читают. Прогон из корня иначе проверяет проект дважды и падает на чужой
   * копии.
   */
  { ignores: ['dist', 'coverage', '.claude', '.worktrees'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022 },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
