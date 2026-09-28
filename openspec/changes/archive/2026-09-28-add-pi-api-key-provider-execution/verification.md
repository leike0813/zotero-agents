# C04 verification

## Scope and result

The frozen C03 selection now produces a native Pi text stream through `createPiApiKeyModelSource`. The selected encrypted API key is read per invocation; keyless OpenAI-compatible endpoints remove authorization before fetch. Local endpoints require an explicit caller preflight. `PiRuntime` keeps known, redacted Provider failure codes in its single terminal. Backend Manager stores and clears keys through typed actions and runs a short, request-correlated connection test only after a click.

The new browser guard admits only the exact `provider-env.js → node:fs` import. The production bundle and a real Zotero core fixture confirm that the imported Provider path runs without a Node runtime. The core and UI fixture tests make no public API request.

## Evidence

| Gate | Result |
| --- | --- |
| Red/green TDD for Provider, failure/cancel, build guard, and UI actions | Red before implementation; targeted suites green after implementation |
| `npx mocha --require tsx --require tests/setup/zotero-mock.ts tests/runtime/246-pi-api-key-provider-execution.test.ts tests/runtime/240-pi-runtime.test.ts tests/dashboard/251-dashboard-backend-manager.test.ts tests/tooling/246-pi-provider-env-guard.test.ts` | 31 passed |
| `ZOTERO_TEST_GREP='Pi API-key Provider in real Zotero' timeout 180s npm run test:zotero:core` | 1 passed on Linux Zotero after completing the fixture's `finish_reason` event |
| `ZOTERO_TEST_GREP='Built-in Agent Backend Manager page in real Zotero' timeout 180s npm run test:zotero:ui` | 1 passed on Linux Zotero; encrypted key written through the page without changing Backend Profiles |
| `npx tsc --noEmit` | Passed |
| `npm run lint:check` | Passed; the final two redaction cases also passed targeted Prettier and ESLint |
| `npm run build`; final `npx zotero-plugin build` after the last Provider guard | Passed, including production browser bundle and all TypeScript projects |
| `openspec validate add-pi-api-key-provider-execution --strict` before archive; strict validation of each of the three synced main specs; `git diff --check` | Passed |

## OpenSpec verification

| Dimension | Assessment |
| --- | --- |
| Completeness | 8/8 implementation tasks after final verification; all three delta capabilities have source and test evidence |
| Correctness | Selection, credential binding, keyless authorization removal, local preflight, typed failures, cancellation, explicit UI action, and exact build guard match the scenarios |
| Coherence | Follows the C01 model-source seam, C03 credential/selection contracts, existing Backend Manager wire and Preact page, and browser-only production bundle |

No critical spec gap was found. The Google Generative AI native adapter rejects custom `fetch`, so its opaque SDK failures currently map to `provider_stream_error`; the explicit HTTP-status classifications are verified on the OpenAI-compatible fetch path. No live Provider, CORS/proxy, or Windows Zotero call was made in C04. Those integrations require their own credentials and host evidence when the Conversation/Skill Run owner is connected.

Repo-wide `openspec validate --specs --strict` remains red on 155 unrelated legacy capabilities with placeholder Purpose sections; all three C04 affected main specs validate strictly after sync. The existing Backend Manager Purpose was replaced with its actual scope during sync.
