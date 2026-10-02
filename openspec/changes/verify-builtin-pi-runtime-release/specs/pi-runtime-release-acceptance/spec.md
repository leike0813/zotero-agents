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

Candidate-bound, redacted receipts SHALL identify confirmer and Zotero 10 environment for API-key streaming; Codex login, streaming, refresh/reuse, logout, unavailable-after-clear and reconnect; Exa; Brave or Perplexity BYOK; OpenAI Web Search through API key and Codex; the accepted Anthropic search replacing DeepSeek search; and anonymous public fetch. Source/search evidence SHALL prove actual relevant results rather than merely HTTP success. Windows packaged stdio ownership canary and existing security, persistence and Workspace identity suites SHALL remain required. Scripts SHALL not fabricate manual passes or collect credentials. Existing release coordinator SHALL consume this evidence while retaining its other gates; publication SHALL remain a separately authorized action.

#### Scenario: All scripts exist but receipts are absent

- **WHEN** infrastructure is implemented without passing required live evidence
- **THEN** the candidate is not acceptance-ready
