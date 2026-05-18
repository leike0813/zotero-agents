# Tasks

## 1. OpenSpec

- [x] Add proposal, design, tasks, and delta specs for review-oriented
  cross-paper synthesis.

## 2. Schemas and Runtime Validation

- [x] Enhance paper analysis schemas with validated paper-unit fields.
- [x] Add cross-paper evidence map and new final section schemas.
- [x] Update runtime validation for paper units, evidence map, and final
  section evidence-map references.
- [x] Generate `runtime/views/cross-paper-evidence-index.json` after per-paper
  analysis persistence.

## 3. Skill Contract

- [x] Update create/update SKILL and runner prompts for Stage 4 paper-level
  extraction and Stage 5 evidence aggregation.
- [x] Update paper analysis and section authoring references.
- [x] Update gate flow so evidence-map validation precedes final section
  authoring.

## 4. Host and Review Input

- [x] Update topic structured artifact validation and rendering to include new
  sections.
- [x] Update topic detail and review input DTOs to expose review-oriented
  structures.

## 5. Tests and Verification

- [x] Add/update paper analysis, evidence map, final artifact, skill contract,
  and review input tests.
- [x] Run `npm run test:node:core`.
- [x] Run `npm run build`.
- [x] Run `openspec validate refine-cross-paper-synthesis-for-review-workflow --strict`.
