## MODIFIED Requirements

### Requirement: CI gating behavior SHALL define blocking semantics
The CI strategy SHALL define blocking vs warning behavior for each gate job. Pull requests SHALL block on the Windows x64 and Linux x64 Zotero 7.0.32, 9.0.6, and 10.0.1 `lite` behavioral matrix. Main and release runs SHALL block on the corresponding `full` behavioral matrix and formal-XPI smoke matrix. macOS Intel and ARM64 Zotero 10 formal-XPI smoke SHALL report evidence without blocking until separately promoted.

#### Scenario: Blocking gate failure
- **WHEN** any selected Windows/Linux compatibility target fails its required behavioral or formal-XPI run
- **THEN** the corresponding pipeline is marked failed

#### Scenario: Non-blocking informational job failure
- **WHEN** a macOS evidence target or another explicitly non-gating informational job fails
- **THEN** it is reported as warning without overriding mandatory gate results

