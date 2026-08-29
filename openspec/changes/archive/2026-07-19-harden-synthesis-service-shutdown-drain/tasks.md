## 1. Establish behavioral regression boundaries

- [x] 1.1 Extend Core 206 with concurrent admitted Topic apply drain and post-stop admission rejection, then record the failing baseline.
- [x] 1.2 Extend Core 205 with runtime cleanup continuation and listen rollback error preservation, then record the failing baseline.

## 2. Implement lifecycle closure

- [x] 2.1 Add active apply tracking and idempotent drain shutdown to the environment-neutral Topic application interface.
- [x] 2.2 Replace duplicate service cleanup chains with shared staged failure isolation, redacted failure logs, and unconditional HTTP stopped finalization.
- [x] 2.3 Run Core 205 and 206 and confirm all new behavior tests pass.

## 3. Verify service and package behavior

- [x] 3.1 Run application, service, and root TypeScript checks plus the Synthesis service build.
- [x] 3.2 Run Core 193 and 195, service-boundary checks, and Synthesis invariants while preserving `108 methods / 1 direct consumer`.

## 4. Close focused quality gates

- [x] 4.1 Run focused ESLint and Prettier, `git diff --check`, strict OpenSpec validation, and final scope review; record the known Core 213 source-order failure without changing it.
