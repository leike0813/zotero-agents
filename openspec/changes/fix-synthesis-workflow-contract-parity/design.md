# Design

## Context

See proposal.md for the regression and scope. v12 accepts closed JSON DTOs; hooks already have resultContext and bundleReader. The production protocol registry currently maps 135 capabilities and 15 workers but does not require corpus evidence per entry.

## Goals / Non-Goals

Keep v12 signatures and native ownership intact. Reuse existing package modules, schema generation, process harnesses and Zotero E2E runner. No dependency installation, historical conversion, replay or plugin publication. Preserve pre-existing native binary changes before the user-authorized seven-platform development synchronization. The authorized Content Package publication is limited to one dev patch.

## Decisions

- Extract TopicPlanPayload inside the canonical wire schema. TS requests rebuild it directly. Content generation materializes standalone Skill schemas with local references and the existing supported dialect.
- Move Topic file materialization from the host client into synthesis-layer/lib. The hook owns artifact access; Host receives only bundle/assets and optional control. Retain 256 assets, 5 MiB each and 50 MiB aggregate limits.
- Project the existing RegularItemDetailDto in the shared digest helper. Optional fields are absent rather than undefined/null. Preserve notes on failure and derive retries only from Host retryable.
- Keep field-level public diagnostics within the existing error taxonomy; record a bounded allowlisted diagnostic at the owner before normalization discards details.
- Enumerate coverage obligations from registry/schema graphs, never from manually maintained percentages. Reuse shared schema cases; separately require execution evidence through production implementations and actual workflow producers. Expand existing 218/229/239, worker parity examples and full Zotero cases. A report with uncovered obligations is not a completion receipt.
- TDD slices use real hooks, Host facade and native client, then native mutation and isolated Zotero persistence evidence. Public production APIs are not widened for tests.
- Worker graph sections use the worker PageDescriptor (`section`), with shared graph row definitions; transfer descriptors keep their separate `kind` contract. Real worker output must pass the production TS receiver before a slot is covered.
- Aggregate graph `mentionCount` preserves the sum of positive reference weights, including fractions and values beyond the safe integer range. Wire, engine and transfer rebuilding accept finite positive numbers; role occurrence counts remain integers.
- Execution receipts bind the contract, implementation, workflow producers, test sources, evidence writer and current native executable. Shared schema samples can satisfy reachable obligations without adding to the production denominator; skipped resource-heavy probes remain uncovered.
- Reverse Host errors retain their transported `{code, details?}` envelope. The registry references that envelope directly; TypeScript validates it before sending, and Rust strictly decodes it before extracting a stable reason. Error samples are never projected into a different DTO for parity checks. HTTP completion alone is not evidence of successful application decoding.
- Union branch constraints are checked against the exact branch fragment when a sibling accepts the mutation. Those receipts retain their fragment reference and value; successful whole-request validation and branch reach remain separate obligations.
- The structure scanner can stream a witness with its complete seed request, mutation and independently validated root verdict. Native replay first checks the original seed's native admission, then credits a rejection only when the whole request is invalid and the root validator attributes the same keyword and instance path. A domain-invalid seed or local predicate rejection never implies mutation-caused root rejection. Large probes remain in the denominator when this bounded replay cannot send them.
- Native request replay uses the existing production process route and observes public domain rejection results for resolver/topic apply. The paired replay covers inline routes; asynchronous maintenance remains with tests that await its terminal, because a pending receipt only proves admission. Evidence identity includes the scanner and checker sources as well as the implementations they exercise.
- Production handshake and discovery enumerate the current operational roster; production repository mode is `production`. The retired shadow handshake's `mutationEnabled` field is not part of the production envelope. The checker compares capability enums and cardinality with the production roster.

## Risks / Trade-offs

Cross-language structural obligations retain the same schema-derived ids as the TypeScript axis. Each needs a current native-process `verified` receipt; slot-level acceptance/rejection never substitutes for recursive evidence, and a divergence invalidates that obligation. Private domain error reasons remain in bounded details while public codes belong to the shared schema enum.

- Full recursive parity exposes unrelated protocol drift: repair at the owner and retain uncovered obligations until verified.
- Schema dialect differs between Skills and wire: generated local-reference schemas retain supported validation semantics and are checked through the real final-output validator.
- Runtime/content identity may block a plugin build: preflight remains required and acceptance stays unfinished rather than bypassing it.

## Migration Plan

Generate workflow content and install it with the matching plugin using existing governed workflows when authorized. Existing failed result files remain untouched; users rerun after the fix. No persistent data migration is needed.
