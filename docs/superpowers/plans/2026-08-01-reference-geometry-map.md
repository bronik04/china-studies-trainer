# Reference Geometry Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the schematic SVG with the licensed reference map’s real provincial boundaries and colour categories.

**Architecture:** The local SVG remains the only map asset and has 34 accessible paths. It keeps the approved Commons geometry but removes its labels and legend. `ChinaMap` retains its `data-region-id` event delegation; CSS uses `data-region-kind` for source-style categories.

**Tech Stack:** SVG, React, TypeScript, Vitest, Testing Library, CSS.

## Global Constraints

- Use `@svg-maps/china` (Victor Cazanave, based on MapSVG, CC BY 4.0) for the real geometry of 33 regions. Retain the previously documented SilverStar54 CC BY-SA 4.0 resource only for the interim Taiwan contour. Do not include `/Users/bronik04/Downloads/china.svg` because its provenance is undocumented.
- Retain real boundaries and four division-type colour categories; remove labels, legend, editor metadata, scripts, fonts and external URLs.
- Keep exactly 34 paths, each with unique `id` and `data-region-id` equal to `Region.mapAreaId`.
- Preserve Russian UI, Chinese Unicode, mouse/touch/Enter/Space/Escape, focus, text list, zoom, and offline use.
- Work stays in `feat/accessible-map`; no merge to `master` before owner review.

---

### Task 1: Import and sanitize the approved real-boundary SVG

**Files:**
- Modify: `public/maps/china-provinces.svg`, `docs/sources/map.md`, `src/map/validate-map.test.ts`, `scripts/validate-map.ts`

**Interfaces:**

```ts
export function validateMapAreaIds(
  regionIds: readonly string[],
  mapAreaIds: readonly string[],
): void;
```

- [ ] **Step 1: Write the failing source-safety test**

In `src/map/validate-map.test.ts`, read `public/maps/china-provinces.svg`. Assert 34 `data-region-id` values and reject `<text`, `<script`, `href=`, `font-family`, `mapsvg:`. Name it `rejects labels, external references and plugin metadata in the production map`.

- [ ] **Step 2: Run the focused test**

Run `npm test -- src/map/validate-map.test.ts`. Expect failure until the local asset has the revised source contract.

- [ ] **Step 3: Build the local asset from Commons geometry**

Download the documented Commons original using its `Special:FilePath` URL. Retain only province-level boundary paths and their original geometry. Remove all labels, numbered callouts, legend/frame/decorative layers, Inkscape/Sodipodi metadata and external namespaces. Every retained region gets the following contract:

```xml
<path id="sichuan" data-region-id="sichuan" data-region-kind="province"
  tabindex="0" role="button" aria-label="Сычуань, 四川省" d="…" />
```

`data-region-kind` is one of `province`, `autonomous-region`, `municipality`, `sar`. Tiny regions may have transparent focusable hit paths that do not replace their visible original outline. Update `map.md` to record retained real geometry and explicitly state that the unlicensed MapsSVG file was not used.

- [ ] **Step 4: Verify and commit**

Run `npm test -- src/map/validate-map.test.ts` and `npm run validate:map`; expect 34 areas. Then:

```bash
git add public/maps/china-provinces.svg docs/sources/map.md src/map/validate-map.test.ts scripts/validate-map.ts
git commit -m "feat: use real map boundaries"
```

### Task 2: Preserve interaction and apply reference categories

**Files:**
- Modify: `src/styles.css`, `src/map/ChinaMap.test.tsx`, `CHANGELOG.md`

**Interfaces:**

```ts
type RegionKind = 'province' | 'autonomous-region' | 'municipality' | 'sar';
```

- [ ] **Step 1: Write failing category assertions**

Extend `ChinaMap.test.tsx` to find the imported SVG path for Sichuan with `data-region-kind="province"` and Beijing with `data-region-kind="municipality"`. Keep Enter, Space, Escape and text-list tests unchanged.

- [ ] **Step 2: Run the focused test**

Run `npm test -- src/map/ChinaMap.test.tsx`. Expect failure until the real-boundary paths have category attributes.

- [ ] **Step 3: Apply the colour system**

Replace the one orange rule in `src/styles.css` with four `[data-region-kind]` fill rules. Keep selected and `:focus-visible` outlines high contrast and preserve text status/list feedback. Do not change `ChinaMap` event delegation.

- [ ] **Step 4: Verify and commit**

Run `npm test -- src/map/ChinaMap.test.tsx`; expect keyboard and list coverage green. Then:

```bash
git add src/styles.css src/map/ChinaMap.test.tsx CHANGELOG.md
git commit -m "style: match reference map categories"
```

### Task 3: Quality gate and owner review

- [ ] **Step 1: Run checks**

Run `npm run validate:content`, `npm run validate:map`, `npm test`, `npm run lint`, `npm run build`, and `git diff --check master...HEAD`. Every command must exit 0.

- [ ] **Step 2: Manual inspection**

Compare the local outline and category colours with Commons; exercise click, Enter, Space, Escape, zoom/reset, focus and text list. At 320 px ensure map/list controls remain usable without horizontal loss.

- [ ] **Step 3: Review handoff**

Report branch, commits, Commons attribution and evidence. Do not merge before owner review.

## Plan self-review

Task 1 covers provenance, sanitation, real geometry and 34 paths. Task 2 maintains interaction while using reference categories. Task 3 covers acceptance checks and review.
