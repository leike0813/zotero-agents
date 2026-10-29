# Tasks

## 1. One-shot subprocess ownership and evidence

- [x] 1.1 Add failing partial-output and cancellation tests, implement bounded capture and late-launch termination, and pass the runtime-platform test suite.
- [x] 1.2 Extend the existing live Zotero platform test with timeout/cancel output evidence and document the opt-in subprocess interface.

## 2. Dependency preparation scheduling

- [x] 2.1 Test and implement serial context-safe in-flight sharing, foreground priority, independent waiter deadlines/cancellation and shutdown; pass the preparation scheduler tests.
- [x] 2.2 Route uv/Python probes through the scheduler with a shared fifteen-minute budget and preserve existing retry/fallback tests.

## 3. Catalog warmup and run integration

- [x] 3.1 Reuse the workflow Skill mapper and publish catalog notifications; test the warmup owner's filtering, reconciliation, failure continuation and non-blocking startup.
- [x] 3.2 Wire warmup startup, backend changes and bounded shutdown; integrate both runner paths' setup cancellation and truthful diagnostics; pass normal/recovery runner tests.
- [x] 3.3 Update dependency preparation documentation and project constraints; verify docs and implementation describe the same defaults and ownership.

## 4. Integration acceptance

- [x] 4.1 Run relevant Node suites, TypeScript and changed-file lint/format checks, and validate the OpenSpec change.
- [x] 4.2 Run isolated real-Zotero subprocess timeout/cancel acceptance and cold-cache dependency preparation acceptance, recording receipts and any environment limitations.
