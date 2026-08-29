# synthesis-native-production-activation Specification

## Purpose

Defines publication of the native production client after current-session
readiness.

## Requirements

### Requirement: Production publication SHALL follow current-session readiness

The plugin SHALL publish the native production composition only after session
discovery, authenticated health, and authenticated handshake succeed for the
launched service. There SHALL be no separate activation RPC, smoke digest, or
durable mutation-admission gate.

#### Scenario: Current-session checks succeed
- **WHEN** discovery, health, handshake, storage, and capability roster are
  ready
- **THEN** the native client becomes available and startup reconcile runs

#### Scenario: A current-session check fails
- **WHEN** launch identity, health, handshake, or storage readiness fails
- **THEN** no production client is published

### Requirement: Production consumers SHALL share one native composition

Default-client, Workflow, Workbench, Host Bridge, MCP, startup reconciliation,
invalidation, and shutdown SHALL use the same ready native connection and SHALL
NOT fall back to a plugin/Node production owner.

#### Scenario: Plugin shutdown begins
- **WHEN** the production owner is active
- **THEN** client acquisition is invalidated, the sidecar is stopped, and the
  reverse Host endpoint is closed
