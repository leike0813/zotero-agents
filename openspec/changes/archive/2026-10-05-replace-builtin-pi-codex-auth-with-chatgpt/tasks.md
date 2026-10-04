# Tasks

## 1. Contract and development-data replacement

- [x] 1.1 Draft the approved proposal/design/deltas, record public test seams and verify strict OpenSpec validation.
- [x] 1.2 Replace shared credential/auth types and implement narrow idempotent Codex cleanup; verify credential CAS/identity and unrelated configuration/history preservation tests.

## 2. Profile-owned ChatGPT authentication

- [x] 2.1 Implement stable host/registrations and attempt-bound native browser callback with PKCE and verified ID tokens; replace old auth tests with login/state/client/signature/scope/duplicate/cancel behavior tests.
- [x] 2.2 Implement owner-held single-flight rotation, late-write invalidation, revocation/sign-out/remove and shared deadline cleanup; verify rotation/canceled-waiter/logout/shutdown tests and document current authentication lifecycle.
- [x] 2.3 Implement durable registration quota pause and single explicit recovery permit; verify restart, registration isolation, concurrent probe and failed-probe tests without periodic inference.

## 3. Directory and official Responses execution

- [x] 3.1 Replace account discovery with official SIWC models and isolated target metadata/configuration binding; verify valid-empty/last-good/switch/stale/unknown-capability and ordinary API-key selection tests.
- [x] 3.2 Implement final SIWC wire and namespace tool mapping over Pi hooks, preserving explicit API-key policy; verify actual request limits/forbidden fields, full context and function-result continuation tests.
- [x] 3.3 Gate success/tools on actual completed evidence and retain partial/unknown usage and safe failures; verify completed/incomplete/failed/absent terminal, invalid tool batch and partial text tests.
- [x] 3.4 Implement bounded pre-output 503 retries with separate canonical invocation evidence and original frozen deadline/lease; verify attempt cap, after-output refusal, usage deduplication and canceled physical-settlement tests.

## 4. Existing owner, search and UI integration

- [x] 4.1 Integrate canonical task-scoped restart consent and current registration admission into existing Skill Run startup/continue actions; verify consent/account changes, reservations, budgets and unknown-effect no-replay tests.
- [x] 4.2 Integrate incomplete-message context/projection and actual usage completeness in Conversation/Skill/main/compaction/title; verify owner accounting, preparation/CAS and failure propagation tests.
- [x] 4.3 Migrate only Codex native search to shared SIWC parsing and sealed OpenAI network operation; verify completed search/citations, one source dispatch, safe errors and other-source/network regressions.
- [x] 4.4 Replace Backend Manager login/device-code UI with registration/plan controls, welcome confirmation, usage links and explicit probe actions; verify request ownership, preserved drafts and unrelated DOM identity.
- [x] 4.5 Replace old core/E2E auth entrypoints and live inventory IDs, update all locale/help sources, AGENTS and ADR 0003; verify localization/help checks and acceptance inventory tests without altering matrix or baselines.

## 5. Candidate verification and C20 handoff

UI dependency: complete `redesign-zotero-agent-settings` in full, including installed-host interface verification, before the user resumes tasks 5.2 and 5.3 from the new settings window. This dependency uses the implemented authentication/runtime code and does not require this change's real-account gates to pass first. UI evidence cannot substitute for SIWC service evidence; final handoff must bind to the final candidate.

- [x] 5.1 Run relevant Node domains, type/format/lint/browser/build checks and directed installed Zotero cases; record commands and results in verification.md.
- [x] 5.2 Obtain redacted real-host/account evidence for browser authorization, official discovery, text, function call/result continuation, actual completed/usage and native search/citations; missing necessary SIWC metadata or service capability remains an unpassed gate.
- [x] 5.3 Update existing C20 handoff with candidate-bound evidence and narrow synthetic old-Codex cleanup upgrade sample; verify acceptance validator rejects missing/failing evidence and retain fixed six-host matrix, baseline, capacity and numerical thresholds.
