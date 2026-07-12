## 1. Regression Contract

- [x] 1.1 Replace the Mozilla transport's ambiguous signal argv expectations with full-PGID, explicit-terminator expectations and add fail-closed regression cases.
- [x] 1.2 Add process-control tests for opaque validated targets, invalid group rejection, and target-preserving Mozilla/Node signal requests.

## 2. Shared Process Control

- [x] 2.1 Move POSIX ownership validation into runtime process control and return a validated process-group target.
- [x] 2.2 Add the single target-preserving external signal invocation builder and structured actuation diagnostics.

## 3. ACP Transport Integration

- [x] 3.1 Update Mozilla TERM/KILL escalation to consume validated targets and fail closed without ambiguous retry.
- [x] 3.2 Update Node TERM/KILL escalation to consume the same validated target contract while retaining direct syscall delivery.
- [x] 3.3 Confirm all ACP adapter, probe, Chat, Skills, sequence, recovery, and diagnostic launch paths remain behind the shared controller.

## 4. Verification

- [x] 4.1 Run focused ACP transport, connection, backend-probe, and runtime-platform test suites.
- [x] 4.2 Run lint, build, and strict OpenSpec validation; document any unrelated failures.
