## 1. CLI v3 and observable contracts

- [x] 1.1 Add failing tests for v3 identity/meta parity, workflowRunId, notification wait, JSON usage errors, parameter groups, localized search, examples, and real result DTO schemas.
- [x] 1.2 Centralize Host Bridge identity and observable command contracts; make Rust identity/output and Host manifest consume the current v3 facts.
- [x] 1.3 Replace public runId aliases, repair notification wait, convert Clap failures to JSON, enforce typed handles/argument groups, and rename file handle argv to `--file-id`.
- [x] 1.4 Generate Agent Surface result/invocation schemas, effects, handles, examples, recovery, and search from explicit contracts instead of heuristics.

## 2. Durable operations and agent apply

- [x] 2.1 Add failing tests for operation replay/conflict/unknown response outcomes and the read-only operation receipt endpoint.
- [x] 2.2 Add transactional PluginStateStore CAS support and implement the 30-day `host-bridge-operations` durable store.
- [x] 2.3 Add CLI operation ids and `operation get`, wire state-changing endpoints through idempotent execution, and emit v3 tri-state recovery fields.
- [x] 2.4 Add failing tests for concurrent apply, per-request journal, restart recovery, renew/abandon, expiry, and 30-day cleanup.
- [x] 2.5 Replace the in-memory agent-run store with a durable CAS state machine and expose apply/status/renew/abandon DTOs and commands.

## 3. Trusted locality and auto-approval grants

- [x] 3.1 Add socket and capability tests for remote-local spoofing, unknown peers, conservative downgrade, grant replay, revocation, and redaction.
- [x] 3.2 Pass trusted transport/principal context through Host Bridge request handling and remove authorization reliance on the connection-mode header.
- [x] 3.3 Replace permanent write-auto-approval scopes with random expiring run grants and lifecycle revocation.

## 4. Release identity and recovery

- [x] 4.1 Add release v2 schema, canonical identity, seven-platform byte, complete surface, payload digest, partial receipt, resume, and runtime binary gate tests.
- [x] 4.2 Implement strict release-set/surface/receipt v2 schemas and validators while retaining historical v1 readers only.
- [x] 4.3 Add the explicit build-only content-addressed prebuild workflow and make final release preparation require a verified prebuild before releaseSetId generation.
- [x] 4.4 Move publication state into a testable controller that continuously writes v2 receipts and resumes from remote facts; simplify the formal workflow around it.

## 5. Semantic surfaces and review mirror

- [x] 5.1 Update current-state OpenSpec purposes and Host Bridge semantic sources for identity, recovery, resolver routing, stage-specific cards, handles, effects, and command evidence.
- [x] 5.2 Update Rust inventory and renderers for conditional argv, explicit DTO/effect/handle contracts, parser-gated examples, localized search parity, summary columns, and smaller command cards.
- [x] 5.3 Add review mirror inventory/check/finalize tooling and update the project skill to use isolated staging, provenance, protected-structure validation, and machine-contract summaries.
- [x] 5.4 Run semantic review, render content-only targets, refresh the Chinese review mirror, and verify generated source alignment.

## 6. Verification

- [x] 6.1 Run focused Host Bridge Mocha tests and the complete Rust CLI test suite.
- [x] 6.2 Run TypeScript, formatting, lint, OpenSpec validation, doc sync, content checks, and mirror validation; record any remaining release-only checks without dispatching.
