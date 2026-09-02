## 1. Shared contract and red tests

- [x] 1.1 Add independent ASCII, mixed-Unicode, all-Unicode, current-16, and historical-9 path vectors to the durable foundation corpus and verify the corpus remains valid
- [x] 1.2 Add a TypeScript contract test consuming the shared vectors and verify the all-Unicode helper fails before the implementation fix
- [x] 1.3 Add Rust canonical-store tests for current/legacy path derivation and verify the legacy read case fails before resolver implementation

## 2. Canonical identity implementation

- [x] 2.1 Correct `canonicalSynthesisTopicPathId` to return 16 digest characters for non-sluggable Topic IDs and verify the TypeScript contract test passes
- [x] 2.2 Add the bounded canonical/legacy current-path resolver and route inspect, read, capture, legacy preflight, and archive through it; verify Rust unit tests pass
- [x] 2.3 Keep promotion on the current path and verify a legacy read followed by update writes the 16-character directory

## 3. Production regression and documentation

- [x] 3.1 Add a real native `serve` startup fixture with a historical 9-character snapshot and verify discovery, migration, Topic read, update, archive, shutdown, and byte preservation
- [x] 3.2 Document current path identity and historical read-only compatibility in `doc/synthesis-layer/persistence-and-files.md` and verify the documentation diff is scoped
- [x] 3.3 Run targeted Node/Rust tests, TypeScript checks, Rust format, cross-language contract checks, and strict OpenSpec validation
