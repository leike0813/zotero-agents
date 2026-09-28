# Tasks

## 1. Process Contract

- [x] 1.1 Add a failing public-seam test for resolved input, separate bounded byte streams, stdin EOF, wait, and termination evidence; verify the targeted Node test fails before implementation and passes after.
- [x] 1.2 Implement the long-lived platform process interface and Node/Mozilla/Windows adapter selection; verify targeted platform tests and TypeScript check pass.

## 2. ACP Migration

- [x] 2.1 Add/adjust ACP transport tests for shared Windows process use, EOF, cancellation, and unknown disconnect outcome; verify targeted ACP tests pass after migration.
- [x] 2.2 Move Windows ACP onto the platform interface without changing its public transport behavior; verify ACP shard and lint pass. Record the separate Windows asset gate that blocks the full build.

## 3. Windows Broker and Packaging

- [x] 3.1 Rename the Rust broker and extend its neutral protocol for stdin EOF, terminate, and truthful exit evidence; verify Rust tests pass.
- [x] 3.2 Rename broker scripts/package references and asset checks; verify package contract tests and asset checks identify the new binary.
- [ ] 3.3 Build the new Windows binary from the renamed source, synchronize checksum, and run the Windows Zotero canary; verify a real Windows receipt before checking this task.

## 4. Integration and Documentation

- [x] 4.1 Update runtime guidance and living Pi handoff with the C09 implementation state and Windows gate; verify OpenSpec strict validation passes.
- [x] 4.2 Run applicable Node, lint, build, and Zotero gates; record exact passing and blocked results in a verification note, leaving the change active until required Windows evidence exists.
