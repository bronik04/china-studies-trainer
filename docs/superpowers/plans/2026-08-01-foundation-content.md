# Foundation Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the first runnable, offline foundation: a sourced catalog of 34 provincial-level regions and an accessible topic screen.

**Architecture:** Content modules provide immutable regions and sources. A React-independent domain validator checks them before the production build. The topic-selection feature renders the prepared catalog as a text alternative to the future SVG map.

**Tech Stack:** TypeScript, React, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Interface and errors are Russian; Chinese is Unicode and pinyin has tone marks.
- The learner flow uses no network request.
- Exactly 34 regions, every record has documented sources.
- No map, exercises, progress persistence, accounts, teacher data, or visual map placeholder.
- Semantic HTML, focus, no colour-only meaning, usable from 320 CSS px.
- Work in feat/foundation-content; merge to master only after review and checks.

---

## File structure

| File | Purpose |
| --- | --- |
| .gitignore, package.json, TypeScript/Vite/ESLint config | Toolchain and commands |
| src/content/types.ts | Region, Fact and Source contracts |
| src/content/sources.ts and docs/sources/sources.md | Evidence register |
| src/content/regions.ts | 34 region records |
| src/domain/validate-catalog.ts | Pure integrity checker |
| src/domain/validate-catalog.test.ts | Contract tests |
| scripts/validate-content.ts | Build-time validation |
| src/features/topic-selection/TopicSelectionPage.tsx | Accessible topic page |
| src/features/topic-selection/TopicSelectionPage.test.tsx | UI regression tests |
| src/App.tsx, src/main.tsx, src/styles.css | App assembly and styles |

### Task 1: Baseline, feature branch and client toolchain

**Files:**
- Create: .gitignore, package.json, tsconfig.json, tsconfig.app.json, tsconfig.node.json, vite.config.ts, eslint.config.js, index.html, src/main.tsx, src/App.tsx, src/styles.css, src/test/setup.ts, src/App.test.tsx
- Modify: CHANGELOG.md

**Produces:** npm run dev, npm run validate:content, npm run lint, npm test, npm run build.

- [ ] **Step 1: Commit the documentation baseline and create the feature branch**

    git add . ':!.DS_Store'
    git commit -m "docs: add project foundation"
    git switch -c feat/foundation-content

Expected: master has the documentation baseline; branch output is feat/foundation-content.

- [ ] **Step 2: Write the failing smoke test**

Create src/App.test.tsx:

    import { render, screen } from '@testing-library/react';
    import App from './App';

    it('shows the application heading', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: 'Тренажёр по страноведению Китая' })).toBeInTheDocument();
    });

Add scripts:

    {
      "scripts": {
        "dev": "vite",
        "validate:content": "tsx scripts/validate-content.ts",
        "build": "npm run validate:content && tsc -b && vite build",
        "lint": "eslint .",
        "test": "vitest run"
      }
    }

Install React, React DOM, TypeScript, Vite, @vitejs/plugin-react, Vitest, jsdom, Testing Library, @testing-library/jest-dom, ESLint, TypeScript ESLint packages, React ESLint plugins, and tsx.

- [ ] **Step 3: Verify it fails**

Run: npm test -- src/App.test.tsx

Expected: FAIL because App and Vitest jsdom setup do not exist.

- [ ] **Step 4: Implement the minimal shell**

Configure Vite/Vitest:

    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' },
    });

Create src/test/setup.ts:

    import '@testing-library/jest-dom/vitest';

Create src/App.tsx:

    export default function App() {
      return <main className="app-shell"><h1>Тренажёр по страноведению Китая</h1></main>;
    }

Use createRoot and React Strict Mode in src/main.tsx; add root to index.html; enable strict TypeScript. Ignore node_modules, dist, coverage, .DS_Store, and *.local.

- [ ] **Step 5: Verify and commit**

Run: npm test -- src/App.test.tsx && npm run lint && npx tsc -b

Expected: PASS.

Add «Настроен клиентский каркас React/TypeScript с автоматическими проверками.» to CHANGELOG.md.

    git add .gitignore package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js index.html src CHANGELOG.md
    git commit -m "feat: scaffold learning trainer"

### Task 2: Content contract and validation

**Files:**
- Create: src/content/types.ts, src/content/sources.ts, src/domain/validate-catalog.ts, src/domain/validate-catalog.test.ts, scripts/validate-content.ts

**Produces:**

    export type RegionKind = 'province' | 'autonomous-region' | 'municipality' | 'sar';
    export type Fact = { readonly title: string; readonly body: string; readonly sourceIds: readonly string[]; readonly imageAlt?: string };
    export type Source = { readonly id: string; readonly title: string; readonly organization: string; readonly url: string; readonly accessedAt: string; readonly covers: readonly string[] };
    export type Region = { readonly id: string; readonly kind: RegionKind; readonly nameRu: string; readonly nameZh: string; readonly pinyin: string; readonly capitalRu: string; readonly capitalZh: string; readonly mapAreaId: string; readonly facts: readonly Fact[]; readonly sourceIds: readonly string[] };
    export function validateCatalog(regions: readonly Region[], sources: readonly Source[], options?: { expectedRegionCount?: number }): void;

- [ ] **Step 1: Write failing unit tests**

Use complete Sichuan and source fixtures. Test a valid catalog, duplicate region ID, duplicate map ID, blank nameRu/nameZh/pinyin/capitalRu/capitalZh, empty sourceIds, unknown region/fact source, and wrong expected count:

    expect(() => validateCatalog([region, { ...region }], [source])).toThrow(/Повторяющийся id региона: sichuan/);
    expect(() => validateCatalog([{ ...region, sourceIds: ['missing'] }], [source])).toThrow(/Неизвестный источник: missing/);
    expect(() => validateCatalog([region], [source], { expectedRegionCount: 34 })).toThrow(/Ожидалось регионов: 34; получено: 1/);

- [ ] **Step 2: Verify failure**

Run: npm test -- src/domain/validate-catalog.test.ts

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement types and pure validator**

Implement ContentValidationError extending Error and collecting all Russian messages. The validator checks blank fields, duplicate IDs, all source references, and expected count without importing React.

Add this government source record:

    {
      id: 'prc-administrative-divisions-2022',
      title: '中华人民共和国行政区划',
      organization: '中国政府网',
      url: 'https://www.locpg.gov.cn/2022-06/07/c_1211652713.htm',
      accessedAt: '2026-08-01',
      covers: ['уровни административного деления', '34 единицы провинциального уровня'],
    }

Before the catalog commit, research an independent, permanent government, educational, academic, museum, or library source that supports names and administrative centres. Add its real URL to sources.ts and docs/sources/sources.md. Do not commit invented URLs or unverified content.

Create scripts/validate-content.ts:

    import { regions } from '../src/content/regions';
    import { sources } from '../src/content/sources';
    import { validateCatalog } from '../src/domain/validate-catalog';

    validateCatalog(regions, sources, { expectedRegionCount: 34 });
    console.info('Проверено регионов: ' + regions.length);

- [ ] **Step 4: Test and commit**

Run: npm test -- src/domain/validate-catalog.test.ts

Expected: PASS. The script runs after regions.ts is added in Task 3.

    git add src/content/types.ts src/content/sources.ts src/domain/validate-catalog.ts src/domain/validate-catalog.test.ts scripts/validate-content.ts
    git commit -m "feat: validate educational catalog"

### Task 3: Sourced catalog of 34 regions

**Files:**
- Create: src/content/regions.ts, docs/sources/sources.md
- Modify: src/content/sources.ts, src/domain/validate-catalog.test.ts, CHANGELOG.md

**Produces:** readonly Region[] with 34 records, mapAreaId equal to id, facts: [], and both final source IDs.

- [ ] **Step 1: Write the failing production-catalog test**

    import { regions } from '../content/regions';
    import { sources } from '../content/sources';

    it('validates all 34 production regions', () => {
      expect(() => validateCatalog(regions, sources, { expectedRegionCount: 34 })).not.toThrow();
      expect(regions).toHaveLength(34);
    });

Run: npm test -- src/domain/validate-catalog.test.ts

Expected: FAIL because regions.ts does not exist.

- [ ] **Step 2: Implement all records and verify each spelling with two sources**

Use stable IDs:

    anhui, fujian, gansu, guangdong, guizhou, hainan, hebei, heilongjiang,
    henan, hubei, hunan, jiangsu, jiangxi, jilin, liaoning, qinghai, shaanxi,
    shandong, shanxi, sichuan, yunnan, zhejiang, taiwan, guangxi,
    inner-mongolia, ningxia, xinjiang, tibet, beijing, chongqing, shanghai,
    tianjin, hong-kong, macao.

The 23 provinces are: Аньхой 安徽省—Хэфэй 合肥; Фуцзянь 福建省—Фучжоу 福州; Ганьсу 甘肃省—Ланьчжоу 兰州; Гуандун 广东省—Гуанчжоу 广州; Гуйчжоу 贵州省—Гуйян 贵阳; Хайнань 海南省—Хайкоу 海口; Хэбэй 河北省—Шицзячжуан 石家庄; Хэйлунцзян 黑龙江省—Харбин 哈尔滨; Хэнань 河南省—Чжэнчжоу 郑州; Хубэй 湖北省—Ухань 武汉; Хунань 湖南省—Чанша 长沙; Цзянсу 江苏省—Нанкин 南京; Цзянси 江西省—Наньчан 南昌; Гирин 吉林省—Чанчунь 长春; Ляонин 辽宁省—Шэньян 沈阳; Цинхай 青海省—Синин 西宁; Шэньси 陕西省—Сиань 西安; Шаньдун 山东省—Цзинань 济南; Шаньси 山西省—Тайюань 太原; Сычуань 四川省—Чэнду 成都; Юньнань 云南省—Куньмин 昆明; Чжэцзян 浙江省—Ханчжоу 杭州; Тайвань 台湾省—Тайбэй 台北.

The autonomous regions are: Гуанси-Чжуанский 广西壮族自治区—Наньнин 南宁; Внутренняя Монголия 内蒙古自治区—Хух-Хото 呼和浩特; Нинся-Хуэйский 宁夏回族自治区—Иньчуань 银川; Синьцзян-Уйғурский 新疆维吾尔自治区—Урумчи 乌鲁木齐; Тибетский 西藏自治区—Лхаса 拉萨.

The municipalities and SARs are: Пекин 北京市—Пекин 北京; Чунцин 重庆市—Чунцин 重庆; Шанхай 上海市—Шанхай 上海; Тяньцзинь 天津市—Тяньцзинь 天津; Гонконг 香港特别行政区—Гонконг 香港; Макао 澳门特别行政区—Макао 澳门.

Use matching tone-marked pinyin and the four kinds. The UI label is «Административный центр» for all entries, including municipalities/SARs.

- [ ] **Step 3: Document sources and verify**

Create sections named prc-administrative-divisions-2022 and for each researched
regional-government source. Every section contains its exact published title,
publisher, permanent URL, date accessed (2026-08-01), the statement «ссылка
используется как источник данных; текст и изображения не копируются», and the
specific region fields it verifies.

Run: npm run validate:content && npm test

Expected: reports 34 and passes.

- [ ] **Step 4: Record and commit**

Add «Добавлен проверяемый справочник 34 единиц провинциального уровня с реестром источников.» to CHANGELOG.md.

    git add src/content/regions.ts src/content/sources.ts src/domain/validate-catalog.test.ts docs/sources/sources.md CHANGELOG.md
    git commit -m "feat: add sourced region catalog"

### Task 4: Accessible responsive topic screen

**Files:**
- Create: src/features/topic-selection/TopicSelectionPage.tsx, src/features/topic-selection/TopicSelectionPage.test.tsx
- Modify: src/App.tsx, src/App.test.tsx, src/styles.css, CHANGELOG.md

**Produces:** TopicSelectionPage accepting readonly regions.

- [ ] **Step 1: Write failing component tests**

    it('shows the available topic and all 34 regions', () => {
      render(<TopicSelectionPage regions={regions} />);
      expect(screen.getByRole('heading', { name: 'Провинции и столицы Китая' })).toBeInTheDocument();
      expect(screen.getByText('34 региона')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(34);
    });

    it('shows all study forms for Sichuan', () => {
      render(<TopicSelectionPage regions={regions} />);
      const region = screen.getByRole('listitem', { name: /Сычуань/ });
      expect(region).toHaveTextContent('四川省');
      expect(region).toHaveTextContent('Sìchuān shěng');
      expect(region).toHaveTextContent('Административный центр: Чэнду (成都)');
    });

Run: npm test -- src/features/topic-selection/TopicSelectionPage.test.tsx

Expected: FAIL.

- [ ] **Step 2: Implement semantic page**

    export function TopicSelectionPage({ regions }: { readonly regions: readonly Region[] }) {
      const orderedRegions = [...regions].sort((a, b) => a.nameRu.localeCompare(b.nameRu, 'ru'));
      return (
        <main className="app-shell">
          <header className="hero"><p className="eyebrow">Тема</p><h1>Провинции и столицы Китая</h1><p>Познакомьтесь с регионами до первого тренировочного раунда.</p></header>
          <section aria-labelledby="regions-heading">
            <div className="section-heading"><h2 id="regions-heading">Регионы</h2><p>34 региона</p></div>
            <p className="status-note" role="status">Интерактивная карта и упражнения появятся в следующем обновлении.</p>
            <ul className="region-list" aria-label="Текстовый список регионов">{orderedRegions.map((region) => <li key={region.id} aria-label={region.nameRu}><article className="region-card"><h3>{region.nameRu} <span lang="zh-Hans">{region.nameZh}</span></h3><p lang="zh-Latn-pinyin">{region.pinyin}</p><p>Административный центр: {region.capitalRu} <span lang="zh-Hans">({region.capitalZh})</span></p></article></li>)}</ul>
          </section>
        </main>
      );
    }

Render it from App. Use #FFFDF8, #1F2937, #B42318, #175CD3, #D0D5DD; 16 px text and 1.5 line-height; maximum width 1120 px; one list column to 719 px, two at 720 px+. Do not add an inert button, clickable card, image, SVG, or map placeholder.

- [ ] **Step 3: Verify and commit**

Run: npm test && npm run lint && npm run build

Expected: PASS. With npm run dev -- --host 127.0.0.1 manually confirm one h1, 34 entries, visible Chinese glyphs, one column/no horizontal scroll at 320 px, and no hidden/inert focus target. Reload after initial load with network offline: the catalog remains visible.

Add «Добавлен доступный стартовый экран темы со списком 34 регионов.» to CHANGELOG.md.

    git add src/App.tsx src/App.test.tsx src/features/topic-selection src/main.tsx src/styles.css CHANGELOG.md
    git commit -m "feat: add accessible topic screen"

### Task 5: Quality gate and review, without merge

**Files:**
- Modify: CHANGELOG.md only if a verification-related user-visible change was made.

- [ ] **Step 1: Run quality gate**

    npm run validate:content
    npm test
    npm run lint
    npm run build
    git diff --check master...HEAD

Expected: all exit 0; 34 validated and no whitespace errors.

- [ ] **Step 2: Audit branch scope**

    git status --short
    git log --oneline master..HEAD
    git diff --name-only master...HEAD

Expected: clean worktree; files limited to this plan; no SVG/map asset.

- [ ] **Step 3: Submit feature for review**

Provide branch feat/foundation-content, command results, manual-check result, and source register. State: «Интерактивная SVG-карта ещё не включена, потому что её лицензированный источник не выбран.» Ask for approval before any merge into master.

## Plan self-review

| Requirement | Task |
| --- | --- |
| Toolchain and offline shell | 1 |
| Pure contract and tests | 2 |
| 34 records and evidence | 3 |
| Accessible 320 px text alternative | 4 |
| Automated/manual checks and review | 5 |

The plan defines producer interfaces before consumers, keeps map work out of scope, and treats source verification as a release gate.
