## ADDED Requirements

### Requirement: Native workload exceptions SHALL be closed and owner-private
The only production filesystem exceptions outside ordinary runtime-persistence operations SHALL be synchronous ChromeWorker indexed reads, Gecko ZIP, native script loading, SQLite initialization, bounded Components streaming, OS reveal/file URI/Zotero attachment creation/picker interaction, and explicit raw adapter diagnostics. Each exception SHALL have one owner and stable interface-level evidence.

#### Scenario: New exception is proposed during implementation
- **WHEN** a caller cannot be migrated through the ordinary filesystem interface
- **THEN** implementation stops for architecture review rather than adding an unrecorded allowlist entry

### Requirement: Workflow runtime adaptation SHALL not leak native values
Workflow runtime, loader, and host composition SHALL not expose filesystem adapters, native streams, Windows, or runtime globals through the Workflow Host interface or hook scope.

#### Scenario: Hook uses an approved file operation
- **WHEN** a hook reads a declared workflow input
- **THEN** it uses the Workflow Host file or resource member and cannot observe the underlying adapter
