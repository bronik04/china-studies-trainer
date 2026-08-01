# Accessible Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add an offline, licensed, keyboard-accessible SVG map of 34 Chinese provincial-level regions.

**Architecture:** The map asset is a local SVG with stable region IDs. Map code translates pointer/keyboard actions into region IDs; the existing content catalog remains the source of labels. A pure asset validator guarantees one SVG area for every Region.mapAreaId.

**Tech Stack:** React, TypeScript, SVG, Vitest, Testing Library, CSS.

## Global Constraints

- All learner-facing text is Russian; Chinese names remain Unicode.
- No map request occurs during an exercise; SVG ships with the bundle.
- The local asset documents CC BY-SA 4.0 attribution and has no script, font, or external URL.
- The map has 34 selectable regions, keyboard controls and a text-list alternative.
- Work remains in feat/accessible-map and merges to master only after review.

---

## File structure

| File | Purpose |
| --- | --- |
| public/maps/china-provinces.svg | Sanitized local SVG; exactly 34 data-region-id areas |
| docs/sources/map.md | Source, author, license, date, changes and attribution |
| src/map/validate-map.ts | Pure catalog-to-SVG-ID integrity checker |
| src/map/validate-map.test.ts | Checker tests |
| src/map/ChinaMap.tsx | SVG interaction and result announcement |
| src/map/MapControls.tsx | Zoom/reset controls |
| src/map/ChinaMap.test.tsx | Keyboard, accessible-name and selection tests |
| scripts/validate-map.ts | Build-time map validation |
| src/App.tsx, src/styles.css | Render the map with the existing list alternative |

### Task 1: Acquire, sanitize and validate the licensed SVG asset

**Files:**
- Create: public/maps/china-provinces.svg, src/map/validate-map.ts, src/map/validate-map.test.ts, scripts/validate-map.ts
- Modify: docs/sources/map.md, package.json, CHANGELOG.md

**Interfaces:**

    export function validateMapAreaIds(
      regionIds: readonly string[],
      mapAreaIds: readonly string[],
    ): void;

- [ ] **Step 1: Write failing integrity tests**

    it('accepts one map area for each catalog region', () => {
      expect(() => validateMapAreaIds(['sichuan'], ['sichuan'])).not.toThrow();
    });

    it('rejects missing and duplicate map areas', () => {
      expect(() => validateMapAreaIds(['sichuan', 'yunnan'], ['sichuan', 'sichuan'])).toThrow(
        /Нет области карты: yunnan[\s\S]*Повторяющаяся область карты: sichuan/,
      );
    });

- [ ] **Step 2: Run the test**

Run: npm test -- src/map/validate-map.test.ts
Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement the validator and asset gate**

Implement a Russian-error validator that reports every missing, unknown and duplicate ID. Add a validate:map script that reads region mapAreaId values and the SVG data-region-id values, then calls the validator. Add validate:map before validate:content in the build script.

Download the approved Commons SVG, remove labels, legend, scripts, external references and decorative non-region paths. Give every selectable path an id and data-region-id equal to the catalog ID, tabindex=0, role=button and aria-label in Russian and Chinese. Use aria-hidden=true for decorative paths.

Document the Commons file, SilverStar54, CC BY-SA 4.0, 2026-08-01, local sanitization and an attribution line in map.md.

- [ ] **Step 4: Verify and commit**

Run: npm test -- src/map/validate-map.test.ts && npm run validate:map
Expected: PASS and reports 34 areas.

    git add public/maps/china-provinces.svg src/map scripts/validate-map.ts docs/sources/map.md package.json CHANGELOG.md
    git commit -m "feat: add licensed map asset"

### Task 2: Implement accessible map selection and zoom controls

**Files:**
- Create: src/map/ChinaMap.tsx, src/map/MapControls.tsx, src/map/ChinaMap.test.tsx
- Modify: src/App.tsx, src/styles.css, CHANGELOG.md

**Interfaces:**

    type ChinaMapProps = {
      readonly regions: readonly Region[];
      readonly selectedRegionId: string | null;
      readonly onSelect: (regionId: string) => void;
    };

- [ ] **Step 1: Write failing component tests**

    it('selects Sichuan with Enter and announces it', async () => {
      const select = vi.fn();
      render(<ChinaMap regions={regions} selectedRegionId={null} onSelect={select} />);
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      expect(select).toHaveBeenCalledWith('sichuan');
    });

    it('renders a named text alternative with 34 items', () => {
      render(<ChinaMap regions={regions} selectedRegionId={null} onSelect={() => {}} />);
      expect(screen.getByRole('list', { name: 'Список регионов карты' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(34);
    });

- [ ] **Step 2: Run tests**

Run: npm test -- src/map/ChinaMap.test.tsx
Expected: FAIL because ChinaMap does not exist.

- [ ] **Step 3: Implement map behavior**

Render the local SVG inline so each area receives click, keydown and selected-state handlers. Enter and Space call onSelect once; Escape clears selection through an onClear callback. Render the text list alternative as buttons that call onSelect. Use an aria-live result: «Выбрано: Сычуань (四川省)».

MapControls maintains zoom values 1, 1.25, 1.5 and exposes buttons «Увеличить», «Уменьшить», «Сбросить вид». Disable controls at bounds and apply transform scale to the SVG viewport.

Wire selectedRegionId into App with useState. Preserve the existing topic heading and list.

- [ ] **Step 4: Verify and commit**

Run: npm test && npm run lint && npm run build
Expected: PASS.

    git add src/map src/App.tsx src/styles.css CHANGELOG.md
    git commit -m "feat: add accessible interactive map"

### Task 3: Manual verification and review handoff

- [ ] **Step 1: Run quality gate**

    npm run validate:content
    npm run validate:map
    npm test
    npm run lint
    npm run build
    git diff --check master...HEAD

Expected: all commands exit 0.

- [ ] **Step 2: Manually verify**

At 320 px, confirm no loss of map or list actions. Select an area by click, keyboard Enter and Space; confirm focus visibility, text announcement and Escape clearing. Use each zoom button and reset. Confirm the browser makes no request for a map asset after the initial bundle load.

- [ ] **Step 3: Request review**

Report feat/accessible-map, results, map attribution and known limitation: exercises still do not evaluate map selections. Do not merge without approval.

## Plan self-review

Task 1 covers license, asset sanitation and 34-ID integrity. Task 2 covers selection, keyboard, focus, zoom, announcement and list alternative. Task 3 covers the required manual and automated checks plus review gate.

