# Tasks

## 1. Gateway and path authority

- [x] 1.1 Add a failing C07 async classifier test, implement compatible await, and pass the targeted Gateway test.
- [x] 1.2 Add failing canonical path tests, implement runtime path inspection for Node and Zotero, and pass targeted path tests.

## 2. Native tool catalog

- [x] 2.1 Add failing file-tool tests, implement `read`, `edit`, and `write` with canonical claims and bounded results, and pass targeted tests.
- [x] 2.2 Add failing restricted search tests, implement `grep`, `find`, and `ls` with ignore rules and hard bounds, and pass targeted tests.
- [x] 2.3 Add failing runtime receipt and Shell tests, implement sealed Shell launch, conservative classification, timeout and output evidence, and pass targeted tests.

## 3. Owner files and integration

- [x] 3.1 Add failing manifest tests, implement atomic `materializeOrReuse` and generated-output commit with quotas, and pass targeted tests.
- [ ] 3.2 Add real Zotero C08 tests and pass Linux and Windows targeted canaries.
- [x] 3.3 Update C08 handoff, constraints and shard wiring; pass targeted Node, lint, build and strict OpenSpec validation, and record the approved full-suite exception.
