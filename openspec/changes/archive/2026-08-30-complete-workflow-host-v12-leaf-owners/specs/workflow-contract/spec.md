## ADDED Requirements

### Requirement: Workflow Host leaf identity SHALL be closed and late-bound
The staged Workflow Host leaf owners SHALL expose addon identity as exactly `addonName`, `addonRef`, and `addonVersion`, and environment information as exactly `zoteroVersion`, `platform`, and `locale`. Environment facts MUST be read on every call, normalized to closed portable values, and MUST NOT be used as capability discovery.

#### Scenario: Runtime facts change between calls
- **WHEN** the runtime version, platform candidate, or locale source changes after an owner was composed
- **THEN** the next environment read uses the current runtime facts
- **AND** unavailable fields fall back to `"unknown"`, `"unknown"`, or `"en-US"` as applicable without exposing runtime objects

#### Scenario: Addon identity is requested
- **WHEN** a caller reads addon identity
- **THEN** the result contains only addon name, reference, and version
- **AND** it does not expose a preference prefix or general configuration bag

### Requirement: Workflow clipboard SHALL preserve plain-text flavor semantics
The clipboard owner SHALL expose bounded `readText`, `writeText`, `hasText`, and `clear` operations. It MUST distinguish an absent text flavor from an empty text flavor, enforce a 16 MiB UTF-8 limit without disclosing clipboard content in errors, and keep identical member shape across interactive and non-interactive adapters.

#### Scenario: Clipboard contains an empty text flavor
- **WHEN** the clipboard contains text with value `""`
- **THEN** `readText` returns `""` and `hasText` returns `true`
- **AND** `clear` removes the flavor so a subsequent read returns `null`

#### Scenario: Clipboard is unavailable in a non-interactive host
- **WHEN** any clipboard operation is invoked through the non-interactive adapter
- **THEN** the operation fails with stable `interaction_required` data
- **AND** the clipboard member remains present

#### Scenario: Clipboard input exceeds its hard limit
- **WHEN** a caller attempts to read or write more than 16 MiB of UTF-8 text
- **THEN** the operation fails with `resource_limited`
- **AND** the failure contains no clipboard content

