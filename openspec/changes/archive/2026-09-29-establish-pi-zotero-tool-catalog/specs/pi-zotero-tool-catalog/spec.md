# Spec Delta

## Purpose

Zotero Native Tools expose reviewed canonical broker capabilities to the Built-in Pi Agent Runtime through its Tool Gateway without transferring Zotero host objects or duplicating broker semantics.

## ADDED Requirements

### Requirement: Native catalog exposes only reviewed broker capabilities
The catalog SHALL bind to an explicitly supplied complete Zotero capability broker and SHALL expose `context.get_current_view` as `zotero_context_get_current_view` with a strict empty-object input and `bounded-read` effect. It SHALL NOT resolve a global broker or substitute a direct Zotero call when its broker is incomplete.

#### Scenario: Valid current-view call
- **WHEN** an admitted Pi turn calls `zotero_context_get_current_view` with `{}`
- **THEN** the call invokes only the injected broker's `context.getCurrentView` and returns its strict-JSON DTO unchanged inside the Gateway result

#### Scenario: Malformed input or missing capability
- **WHEN** a call has an extra input field or the broker does not provide the required member
- **THEN** the call fails without invoking a Zotero runtime fallback

### Requirement: Native tool errors remain structured and safe
The current-view tool SHALL preserve `code`, `retryable`, and strict-JSON `details` from a Zotero capability error as a bounded structured tool failure. Unknown exceptions SHALL become `internal_error` without exposing a native cause, stack, raw reference, or host object.

#### Scenario: Canonical broker error
- **WHEN** the injected broker raises a Zotero capability error
- **THEN** the Pi tool failure retains its stable code, retryability, and details

#### Scenario: Unknown broker exception
- **WHEN** the injected broker raises an unknown exception
- **THEN** the tool returns a safe `internal_error` failure with no native diagnostic payload

### Requirement: Gateway controls native capability admission and evidence
The Gateway SHALL select the native definition by the turn's available canonical capability IDs, freeze its catalog identity, and retain both the canonical capability ID and Pi tool name in durable attempt evidence. The catalog SHALL NOT own separate authorization, digest, receipt, or lifecycle state.

#### Scenario: Current-view capability unavailable
- **WHEN** a turn's runtime capability receipt omits `context.get_current_view`
- **THEN** the current-view Pi tool is absent and cannot be executed

#### Scenario: Current-view capability admitted
- **WHEN** a turn admits and executes the current-view tool
- **THEN** its attempt evidence contains `context.get_current_view` and `zotero_context_get_current_view`
