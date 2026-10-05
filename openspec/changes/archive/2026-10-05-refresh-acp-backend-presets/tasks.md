# Tasks

## 1. ACP preset catalog and documentation

- [x] 1.1 Update existing Gemini, Qwen, and Qoder launch metadata and the five new isolation rules using red/green public-builder tests in the backend-manager regression suite.
- [x] 1.2 Add the 13 agreed presets and ID types; verify the 28-entry catalog, local/npx commands, defaults, and families with parameterized public-builder tests.
- [x] 1.3 Verify managed isolation roots, OpenHands conversation paths, native/adapter Cursor separation, and preservation of saved backend fields through existing manager persistence tests.
- [x] 1.4 Update developer ACP preset documentation and site ACP documentation in English and all eight translations, including stale Backend Manager preset references; verify launch tables, installation prerequisites, source links, bounded isolation scope, and the unchanged real-agent-tested list.
- [x] 1.5 Generate embedded help with npm run build:help-docs and verify npm run check:help-docs and npm run check:localization-governance.

## 2. Launch consumer integration

- [x] 2.1 Extend the existing Dashboard preview/add-action suite to verify MiniMax explicit-package argv and OpenHands two-directory isolation match host-created profiles without mutating existing draft rows.
- [x] 2.2 Extend the existing npx cache suite to verify the MiniMax generated launch identifies @minimax-ai/code@latest as its package; retain the existing parser and run that suite.

## 3. Final integration checks

- [x] 3.1 Run the three affected test suites together, TypeScript checks, changed-file lint/format checks, strict OpenSpec validation, and git diff --check; review the final diff and record results without committing or archiving.

## Verification results

- The backend-manager regression, Dashboard backend-manager, and npx launch-cache suites passed together: **54 passing**. The existing-launch and expanded-catalog public-builder tests failed before their metadata changes and passed afterward.
- `node_modules/.bin/tsc --noEmit` and `node_modules/.bin/tsc --noEmit -p tsconfig.dashboard.json` passed.
- ESLint passed for the preset module and the three changed test files. Prettier checks passed for all changed source, documentation, and OpenSpec artifacts.
- `npm run build:help-docs` and `npm run check:help-docs` passed: 504 documents, 53 assets, **6,277,059 bytes**, within the existing 6 MiB limit. Table alignment padding was reduced without removing content or changing the build budget.
- `npm run check:localization-governance` passed. All 18 source/embedded ACP catalogs across nine locales matched the 28 generated default launch commands.
- `openspec validate refresh-acp-backend-presets --strict` and `git diff --check` passed.
- No new dependencies were installed, no real-agent authentication or inference tests were run, and no commit or archive was performed.
