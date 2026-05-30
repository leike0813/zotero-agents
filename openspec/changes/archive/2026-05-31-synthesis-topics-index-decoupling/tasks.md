## 1. OpenSpec Artifacts

- [x] 1.1 Create the `synthesis-topics-index-decoupling` change.
- [x] 1.2 Add proposal, design, and spec artifacts describing the decoupling contract.

## 2. Human-Readable Governance Documents

- [x] 2.1 Update the Synthesis domain map and diagrams so Topics read the Host Library / Artifact Facade as primary input and only use Citation Graph metrics optionally.
- [x] 2.2 Update domain governance so Paper Registry Cache no longer appears as the normal driver of Topics.
- [x] 2.3 Update freshness/coverage/discovery semantics so topic freshness becomes explicit source-check diagnostics.
- [x] 2.4 Update trigger, event, rebuild, UI, and state catalog docs to remove registry-cache-driven topic work from the target contract.

## 3. Engineering Contracts

- [x] 3.1 Update engineering event contracts and `events.yaml` so registry cache dirty events do not fan out to topic freshness/discovery.
- [x] 3.2 Update engineering sequences and runbooks so registry/graph cache rebuild does not plan topic work.
- [x] 3.3 Update rebuild contracts YAML and invariants YAML with topic/index decoupling guardrails.

## 4. Verification

- [x] 4.1 Run OpenSpec validation for `synthesis-topics-index-decoupling`.
- [x] 4.2 Run formatting checks for touched Markdown, DOT, PlantUML, YAML, and OpenSpec files.
- [x] 4.3 Run source-text checks for old target-contract phrases that imply registry cache rebuild drives topic freshness/discovery.
