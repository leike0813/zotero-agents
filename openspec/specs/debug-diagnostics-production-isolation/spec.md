# debug-diagnostics-production-isolation Specification

## Purpose
TBD - created by syncing change harden-debug-diagnostics-production-isolation. Update Purpose after archive.

## Requirements

### Requirement: Runtime diagnostics use one production-isolation manifest

The build SHALL use one shared manifest as the single source of truth for debug-exclusive modules, esbuild side-effect classification, forbidden production runtime markers, and narrow static allowlists. Build configuration and release-elision verification SHALL consume that manifest without maintaining parallel module or marker lists.

#### Scenario: Production bundle is audited

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** every debug-exclusive ACP and SkillRunner module in the shared manifest SHALL contribute zero output bytes
- **AND** no forbidden runtime marker from the manifest SHALL occur in executable production output.

#### Scenario: Diagnostic source is disabled

- **WHEN** a debug bundle is built with an independent diagnostic source switch disabled
- **THEN** modules exclusive to that diagnostic source SHALL contribute zero output bytes
- **AND** its source-disabled output SHALL contain no source-specific forbidden runtime marker.

### Requirement: Static diagnostic surfaces are narrowly allowlisted

Production-isolation checks SHALL distinguish executable diagnostics from intentionally retained static Dashboard templates, locale strings, hidden routing keys, and type-only DTOs. The allowlist SHALL identify exact asset or marker classes and SHALL NOT exempt runtime branches, state, imports, calls, property reads, or synthetic helpers.

#### Scenario: Static Dashboard shell remains packaged

- **WHEN** a production bundle retains an inactive diagnostics template or localized label used by the static Dashboard shell
- **THEN** the release-elision gate SHALL accept the allowlisted static content
- **AND** the corresponding diagnostic runtime module and executable marker SHALL remain absent.

#### Scenario: Runtime marker resembles allowlisted text

- **WHEN** an allowlisted route or template marker also appears in executable plugin code
- **THEN** the executable occurrence SHALL fail the release-elision gate.

### Requirement: Production acceptance is artifact-based

Release acceptance SHALL inspect compiled output from real plugin entry points and SHALL treat zero-byte exclusive-module contribution and absence of forbidden runtime markers as the primary contract. Equality between non-debug source-on and source-off output MAY be used only as an auxiliary assertion and SHALL NOT replace artifact inspection.

#### Scenario: Source toggles produce equal production output

- **WHEN** non-debug source-on and source-off builds are byte-equivalent but an exclusive module contributes output
- **THEN** the production-isolation gate SHALL fail.

### Requirement: ACP and SkillRunner share the same release gate

The production-isolation gate SHALL cover ACP semantic trace, ACP Replay and profiler, and SkillRunner audit diagnostics. Existing SkillRunner governor instrumentation layout SHALL remain unchanged while its audit store, projection, and recorder calls are required to be compiled out.

#### Scenario: SkillRunner production bundle is audited

- **WHEN** the real plugin entry is built for production
- **THEN** SkillRunner audit modules SHALL contribute zero output bytes
- **AND** governor hot paths SHALL contain no audit recorder call or runtime marker.
