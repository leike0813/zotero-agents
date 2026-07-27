## REMOVED Requirements

### Requirement: In-process adapter preserves current workflow behavior

**Reason**: Production workflow routing moves to the single native owner in R9a; retaining the migration adapter in production would create a forbidden fallback.

**Migration**: Isolated oracle tests may retain direct legacy composition until R9b, while every production workflow call uses the grouped native client and reverse-Host ports.

## MODIFIED Requirements

### Requirement: Active documentation describes the narrow current API

Current workflow API documentation SHALL identify `WorkflowSynthesisApi`, list the supported methods, and state that the default implementation uses the native production `SynthesisClient`.

#### Scenario: Workflow API docs are generated
- **WHEN** documentation consistency checks run
- **THEN** active source and generated workflow host documentation SHALL no longer advertise `SynthesisService` or an in-process default

## ADDED Requirements

### Requirement: Native workflow routing SHALL preserve controlled Host boundaries

Workflow Topic assets SHALL still be materialized by the plugin before the client boundary, and native workflow applications SHALL use only declared reverse-Host ports for Zotero, delivery, or WebDAV effects.

#### Scenario: Workflow mutation executes after cutover
- **WHEN** a workflow invokes a grouped Synthesis mutation
- **THEN** the request crosses the typed native client boundary
- **AND** any Host effect returns through its preconditioned receipt contract

