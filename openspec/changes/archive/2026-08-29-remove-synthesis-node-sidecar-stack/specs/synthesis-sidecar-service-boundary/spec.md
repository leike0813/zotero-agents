## ADDED Requirements

### Requirement: Rust executable SHALL be the sole Synthesis service implementation after R9b

After R9b, the repository and product build SHALL contain no Node or plugin-side
Synthesis service implementation. The Rust executable SHALL own all Synthesis
production application, repository, canonical, compute-worker, lifecycle, and
RPC service responsibilities. The plugin SHALL retain the public client, UI,
lifecycle supervision, and bounded Zotero/Host adapters, and Rust MUST NOT gain
direct access to Zotero DB, credentials, UI objects, or unbounded Host
authority.

#### Scenario: Final service inventory is inspected
- **WHEN** source, workspace, build, package, workflow, and XPI inventories run after R9b
- **THEN** exactly one Synthesis service implementation class remains: `rust-native`
- **AND** plugin-owned Host/UI authority remains outside the service

#### Scenario: Native service is unavailable
- **WHEN** the sole Rust service cannot reach verified production readiness
- **THEN** Synthesis callers fail through stable maintenance/unavailable/incompatible/repair-required behavior
- **AND** no deleted Node or plugin service is reconstructed
