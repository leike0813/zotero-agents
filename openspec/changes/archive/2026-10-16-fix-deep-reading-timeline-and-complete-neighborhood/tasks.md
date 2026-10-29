# Tasks

## 1. Topic associations

- [x] 1.1 Add a failing application regression for empty resolved membership with saved source refs; implement bounded repository/application union and verify topic tests pass.
- [x] 1.2 Document source-association lookup in the existing Topic documentation and verify match-source semantics agree with the regression.

## 2. Citation reads and shared layout

- [x] 2.1 Add a failing neighborhood regression, implement depth-aware bounded traversal and matching slice/layout selection, and verify direction, bounds, closure, and basis tests.
- [x] 2.2 Add a failing shared-layout coverage regression, include single external nodes without widening overview visibility, update layout version, and verify layout/readiness tests.
- [x] 2.3 Update graph runtime/registry documentation and project constraints to describe expanded layout coverage and unchanged overview visibility.

## 3. Deep-reading rendering

- [x] 3.1 Add failing visibility-mode tests, implement optional standalone neighborhood projection across WebGL/SVG and interaction, and verify existing overview tests stay green.
- [x] 3.2 Add failing runtime focus/two-hop tests, normalize deep-reading depth and portable focus identity, synchronize generated Skill, and verify the deep-reading tooling shard (Windows mapped-output limitation and isolated equivalent verification recorded in validation.md).
- [x] 3.3 Update deep-reading instructions and documentation for two-hop neighborhood rendering; verify generated artifacts and strict OpenSpec validation.

## 4. Integration acceptance

- [x] 4.1 Run relevant Rust, production RPC, browser, type, lint, formatting, and cross-language checks; record results and any environment limitations.
- [x] 4.2 Copy the three run inputs and Synthesis state consistently into an isolated acceptance directory, regenerate shared layout with current-source sidecar, regenerate HTML, and verify associated timelines, two-hop bounded topology, external nodes, and focus without modifying originals.

## Workflow follow-up

- Packaged plugin delivery requires build preflight and governed runtime/content synchronization; publication and Git commits require separate authorization.
