# Proposal

## Why

A whole-operation deadline can interrupt a healthy vector build after 30 minutes, forcing users to resume large libraries manually. The Workbench has its own observer deadline and can lose track of accepted work.

## What Changes

- Bound individual I/O while allowing accepted build, rebuild and update operations to finish.
- Reattach Workbench views to the durable maintenance receipt after navigation.

## Capabilities

### Modified Capabilities

- `synthesis-maintenance` covers retrieval execution budgets, exclusive ownership and Workbench reattachment.

## Impact

Synthesis production routing, persisted operation receipts, Workbench maintenance state and focused regression tests.
