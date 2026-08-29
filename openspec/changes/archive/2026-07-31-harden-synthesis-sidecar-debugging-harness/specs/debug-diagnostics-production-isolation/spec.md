## ADDED Requirements

### Requirement: Synthesis Sidecar diagnostics SHALL be build-exclusive

The shared production-isolation manifest SHALL cover the Synthesis Sidecar
debug recorder, store, projection, subscriptions, Dashboard executable
surface, native launch enablement, and source-specific runtime markers.
Production builds and source-disabled debug builds SHALL retain no executable
Synthesis diagnostic surface or successful-boundary instrumentation.

#### Scenario: Production plugin and Dashboard are audited
- **WHEN** the real plugin and Dashboard entries are compiled with `__debug_mode__` false
- **THEN** Synthesis debug-exclusive modules contribute zero output bytes
- **AND** no Synthesis debug page renderer, store, subscription, schema, or successful-boundary marker occurs in executable output

#### Scenario: Synthesis diagnostic source is disabled
- **WHEN** a debug bundle is compiled with the independent Synthesis source switch false
- **THEN** its executable output satisfies the same exclusive-module and marker assertions

#### Scenario: Production operation succeeds
- **WHEN** a native sidecar request completes successfully with diagnostics disabled
- **THEN** native and plugin code construct, serialize, write, parse, retain, and publish no debug event
