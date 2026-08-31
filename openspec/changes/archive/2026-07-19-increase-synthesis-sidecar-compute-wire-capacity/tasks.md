## 1. Contracts and test baseline

- [x] 1.1 Add contracts-owned general/system and compute byte/structure limits plus the stable oversized-response error.
- [x] 1.2 Add Core 196 integration coverage for 8 MiB compute envelopes, unchanged 1 MiB non-compute envelopes, structure limits, and symmetric response enforcement.
- [x] 1.3 Extend existing sidecar tests for pre-dispatch rejection, lazy-spawn/queue isolation, abort handling, and unchanged worker fault accounting.

## 2. Service request and response enforcement

- [x] 2.1 Parameterize request collection and JSON validation with explicit byte, depth, string, and structure limits.
- [x] 2.2 Add valid `Content-Length` early rejection, cumulative chunked overflow termination, and body-collection disconnect cleanup.
- [x] 2.3 Apply capability-specific 1 MiB or 8 MiB limits after parsing the shared call envelope and before dispatch.
- [x] 2.4 Bound serialized compute response envelopes at 8 MiB with HTTP 502 `response_body_too_large` without affecting pool fault counters.

## 3. Compute client enforcement

- [x] 3.1 Serialize compute requests once and reject UTF-8 envelopes over 8 MiB before opening HTTP.
- [x] 3.2 Bound compute response bytes before JSON parsing and map local or service overflow to `response_body_too_large`.
- [x] 3.3 Preserve deadline and AbortSignal behavior while terminating oversized response reads promptly.

## 4. Governance and documentation

- [x] 4.1 Update sidecar boundary, invariant, performance, and packaging/fingerprint checks for the capacity constants without adding authority or dependencies.
- [x] 4.2 Update Synthesis runtime, packaging, performance, README, and Stage 1 progress docs with the 8 MiB wire contract and unchanged production routing.
- [x] 4.3 Confirm migration inventory remains `108 methods / 1 direct consumer`, layout remains `production_worker: false`, and `mutationEnabled` remains false.

## 5. Verification

- [x] 5.1 Run contracts/engine/service/root TypeScript and focused Core 192-196 tests.
- [x] 5.2 Run service boundary, Synthesis invariants, formatting, lint, help-doc, packaging/fingerprint, and production build checks.
- [x] 5.3 Run `git diff --check` and strict OpenSpec validation, then confirm all tasks complete without archiving or publishing prebuilds.
