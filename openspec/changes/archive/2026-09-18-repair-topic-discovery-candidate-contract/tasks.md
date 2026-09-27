# Tasks

## 1. Close the public contract

- [x] 1.1 Add failing cross-language/schema cases for strict Topic discovery candidates, command results, Topic Detail arrays, and removal of opaque projection hints; verify the targeted contract test fails for the expected contract gap
- [x] 1.2 Define the shared TypeScript, JSON Schema, and Rust candidate/detail DTOs and remove public `TopicProjection.discovery.hints`; verify the targeted contract test passes

## 2. Project candidates in the Topic application

- [x] 2.1 Add a failing repository projection test for confirmed-descendant scope, literature deduplication, open precedence, deterministic ranking, and independent 20-row bounds; implement the minimal internal projection correction and verify the repository test passes
- [x] 2.2 Add a failing Topic application detail test for strict discovery output and summary-only list records; implement the detail mapper and typed command result reuse, then verify the application tests pass

## 3. Adapt the native Workbench surface

- [x] 3.1 Add failing production-route tests for Topic Detail and reject/restore schema-valid results; adapt the existing routes without adding endpoints and verify the native route tests pass

## 4. Consume candidates in Topic Detail

- [x] 4.1 Add a failing Reader component test for open/rejected rows, literature-ID title fallback, standalone-disabled actions, and reject/restore payloads; add the Discovery section and verify the component test passes
- [x] 4.2 Update Topic discovery and Workbench UI documentation to describe the public candidate/internal record split and verify referenced field names match the contract

## 5. Integration verification

- [x] 5.1 Run the focused Rust, TypeScript component, contract, typecheck, and formatting checks; resolve only regressions introduced by this change
- [x] 5.2 Run `npm run test:synthesis-native:stage1`; when it passes, mark Change 02 task 2.4 complete and verify both OpenSpec changes report the expected progress
