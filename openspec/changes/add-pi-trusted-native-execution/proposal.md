# Proposal

## Why

Built-in Pi already has a policy Gateway and turn preparation, but no project-owned executor catalog for workspace files and native commands. C08 supplies the bounded native execution surface required by the later owner and UI changes in issue #26.

## What Changes

- Add Trusted Native and Restricted Broker tool definitions with bounded results, conservative policy claims, and a runtime capability receipt.
- Add verified workspace path identity, managed-file materialization and generated-output commit under one owner.
- Add a sealed-environment native Shell path with explicit timeout, output limits and uncertain-termination evidence.
- Allow the C07 Gateway classifier to complete asynchronous path inspection before policy and resource scheduling.

## Capabilities

### New Capabilities

- `pi-trusted-native-execution`: Built-in Pi native and broker tool execution, workspace file ownership, and runtime availability.

### Modified Capabilities

- `pi-tool-gateway-policy`: Classification may be asynchronous and must settle before policy decisions or execution.

## Impact

Touches the Pi Gateway, runtime persistence path inspection, new C08 executor module, Node and real-Zotero tests, `ignore` production dependency, and Built-in Pi handoff and runtime documentation. Native tools remain unavailable where required path or subprocess proof is absent.
