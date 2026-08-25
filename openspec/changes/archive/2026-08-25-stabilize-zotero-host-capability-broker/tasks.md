## 1. Canonical broker seam

- [x] 1.1 Add the fail-closed typed broker test harness and a failing public-seam test for strict JSON DTOs, portable refs, navigation separation, and coded safe errors; verify the focused broker suite fails for the intended missing behavior.
- [x] 1.2 Define the canonical stateless broker interface, factory, resolver, portable reference types, strict JSON payload validation, normalized serializers, navigation family, and coded error class; verify the focused broker suite passes.

## 2. Workflow projection

- [x] 2.1 Add a failing test that observes the exact unordered public v11 broker member set and raw-reference compatibility through `WorkflowHostApi`; verify whole-family attachment currently exposes undeclared members.
- [x] 2.2 Implement the explicit member-level workflow projection and raw-reference normalization without changing `WORKFLOW_HOST_API_VERSION`; verify the workflow/broker tests and TypeScript pass.

## 3. Host Bridge and MCP adapters

- [x] 3.1 Add failing Host Bridge tests proving attachment reads and `item.attachFile` mutation results omit host-local paths while returning opaque or unavailable access metadata.
- [x] 3.2 Migrate Host Bridge registry/server to the canonical broker resolver, navigation family, coded errors, and shared remote attachment projection; verify Host Bridge server tests pass.
- [x] 3.3 Migrate MCP tests and runtime to the typed broker resolver and sole Host Bridge mirror, then remove `resolveHostApi`, manual workflow projection, unreachable legacy tool registry, and exclusive helpers; verify MCP protocol and mirror suites pass without `as any` broker injections.

## 4. Contracts and documentation

- [x] 4.1 Tighten the Host Bridge v2 attachment output contract without changing its major version; verify the capability and CLI contract checks accept the projected result.
- [x] 4.2 Update `AGENTS.md`, `CONTEXT.md`, broker SSOT, and capability registry documentation to record current ownership, v11 projection, JSON/locality distinction, and single MCP path; verify documentation references use canonical terminology.

## 5. Governed review and completion

- [x] 5.1 Run the Host Bridge semantic-surface review against baseline `b5193e0c4674f02a6a294c2b47a53a1d0c1576df`, render/check only governed generated content when required, and verify unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts are all zero.
- [x] 5.2 Run focused tests, TypeScript, targeted formatting/lint, Host Bridge surface gates, OpenSpec validation, and OpenSpec verification; resolve every task-scoped failure and record final evidence.
