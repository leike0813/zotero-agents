## Purpose

Defines executable, candidate-bound evidence that must be complete before the Built-in Pi Agent Runtime is handed to the existing publication workflow.

## ADDED Requirements

### Requirement: Acceptance report preserves candidate identity and attempts

The report SHALL identify source commit, clean state, formal XPI SHA-256, version, environment and configuration. Each required item SHALL expose passed, failed, missing or not_applicable independently of blocking policy and retain failures and reruns. A missing, failed or not_applicable mandatory item SHALL block acceptance. Dirty or mismatching candidate evidence SHALL not certify a final candidate. Production or test-definition changes SHALL invalidate previous evidence; documentation-only reuse SHALL require explicit unchanged XPI and test-definition evidence. Report projections SHALL omit secrets and absolute user paths.

#### Scenario: Candidate changes after smoke

- **WHEN** a manual receipt refers to a different candidate XPI
- **THEN** it remains visible as a mismatching attempt and does not satisfy the required item

#### Scenario: A required service is unavailable

- **WHEN** live smoke cannot run because a required service is unavailable
- **THEN** acceptance remains blocked with missing or failed evidence

### Requirement: Same-source bundle budgets require explicit exceptions

Measurement SHALL compare enabled and Pi-entry-excluded builds with the same source, lock and settings, preserving shared modules and Broker. Raw Pi entry delta SHALL be at most 20 MiB, gzip delta at most 1.5 MiB and formal XPI delta at most 2 MiB, unless a candidate-bound human exception is recorded. The excluded control SHALL be measurement-only. Browser runtime inspection SHALL reject newly reachable Node/Bun builtins and retain only the previously approved exact unreachable provider-env guard.

#### Scenario: Complete catalog fits the bundle budgets

- **WHEN** a valid clean candidate measurement has a raw delta of 20 MiB or less, a gzip delta of 1.5 MiB or less and an XPI delta of 2 MiB or less
- **THEN** the bundle item passes without a human size exception

#### Scenario: Size exceeds budget

- **WHEN** a measured delta exceeds its threshold
- **THEN** the report retains the actual bytes and blocks unless an explicit matching exception is present

### Requirement: Real-host capacity selection precedes final certification

Capacities 4, 6, 8 and 12 SHALL be explored on Windows/Linux Zotero 10. The highest jointly passing capacity SHALL be committed as the fixed default with two foreground slots reserved. The final XPI SHALL then run a 15-minute mixed production Conversation/Skill Run workload on both platforms after warmup and idle baseline and before settling, without forced GC. Gates SHALL enforce event-loop p95 <=100 ms, maximum stall <=1 s, foreground admission <=1 s when reserved capacity exists, peak RSS <=baseline+1 GiB, settled RSS <=baseline+256 MiB, and no loss, starvation, overcapacity or unexplained failures. Exploration SHALL not certify a final candidate.

#### Scenario: Lowest explored capacity fails

- **WHEN** capacity four fails a mandatory performance gate
- **THEN** acceptance remains blocked until the implementation is fixed

### Requirement: Fixed live smoke inventory remains manual and blocking

Candidate-bound, redacted receipts SHALL identify confirmer and Zotero 10 environment for API-key streaming; ChatGPT browser login, official discovery, observed scope/plan state, streaming, namespaced function/result continuation, actual completed/usage, refresh/reuse, logout, unavailable-after-clear and reconnect; Exa; Brave or Perplexity BYOK; OpenAI Web Search through API key and ChatGPT (actual completed and supplied citations); the accepted Anthropic search replacing DeepSeek search; and anonymous public fetch. Source/search evidence SHALL prove actual relevant results rather than merely HTTP success. Windows packaged stdio ownership canary and existing security, persistence and Workspace identity suites SHALL remain required. Scripts SHALL not fabricate manual passes or collect credentials. Existing release coordinator SHALL consume this evidence while retaining its other gates; publication SHALL remain a separately authorized action.

#### Scenario: All scripts exist but receipts are absent

- **WHEN** infrastructure is implemented without passing required live evidence
- **THEN** the candidate is not acceptance-ready

### Requirement: Complete upgraded candidate requires installed catalog and cleanup evidence

The final candidate SHALL include matched Pi core/ai 1.0.0, independent official catalog and the ChatGPT replacement. Each normative mainBehavior host SHALL provide candidate-bound formal installed-XPI catalog and synthetic-development-cleanup evidence with its actual host ID/version matching the matrix. Missing fields, mismatching hosts, temporary add-on observations or failed observations SHALL not pass. Old stage receipts SHALL remain visible without certifying the new candidate.

Catalog evidence SHALL identify distinct A/B revisions and one fixed runtime; prove new supported models and applicable metadata affect new turns while active turns remain frozen; preserve unknown capabilities, configured bindings, seed/cache, failed update/recovery, account isolation and late-result rejection; and include actual-host official HTTP. It SHALL retain actual usage completeness for main, compaction and title invocations, with historical usage/pricing frozen to its original selection. The installed candidate XPI SHALL stay unchanged across A-to-B. Synthetic cleanup SHALL observe at least two installed startups removing only retired Codex credentials/configuration/account cache/default references while preserving other configuration/defaults/history/workspaces/effect receipts and refusing unknown-effect replay. It SHALL not replace the fixed v0.9.0 baseline chain.

#### Scenario: Stage observations omit formal installation

- **WHEN** directory or cleanup observations were collected from a temporary add-on or another actual host version
- **THEN** the matching formal installed evidence item remains failed

#### Scenario: New gates are absent from an old report

- **WHEN** a report contains only the previous C20 required items
- **THEN** installed catalog and development-cleanup remain missing and block acceptance
