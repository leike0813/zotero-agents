# Proposal

## Why

Legacy Topic migration treated a failed export cache or one incomplete Topic snapshot as a service-wide startup failure. Profiles containing otherwise valid Topics could not open the Synthesis sidecar, and a runtime content defect could remove unrelated Topics from list and search results.

## What Changes

- Recognize the legacy rendered export under a historical Topic assets directory, preserve those files, and promote only the validated Topic content.
- Isolate Topic-level source, identity, snapshot, and projection failures. Record pending repairs durably, continue startup and reads for independent Topics, and retry retained sources on later startup.
- Keep Topic list, workbench, and search pagination moving past unavailable rows while preserving the existing detail diagnostic.
- Reserve whole-operation termination for shared repository, canonical-store, ownership, transaction, cancellation, and complete bundle publication failures.

## Capabilities

### New Capabilities

### Modified Capabilities

- `synthesis-topic-path-identity`: historical Topic migration accepts retained legacy exports, and invalid authoritative Topic content becomes unavailable per Topic while startup continues.
- `synthesis-legacy-production-migration`: recognized canonical-bearing Topics can be recorded as pending repair without discarding valid graph and canonical facts.

## Impact

Affects the Rust canonical store, legacy repository migration, Synthesis startup supervision, Topic application reads, durable bundle publication, protocol diagnostics, and existing legacy migration regression fixtures. No wire field or database schema version is added. Pending Topic state is stored as private repository metadata.
