## Context

SkillRunner refresh publishes a store change synchronously. The shared runtime
observes a new owner and starts initialization without awaiting it; activation
then calls initialization explicitly. Both paths reach the same publication
function. The shell also records each successful bridge, action, ACK, and render
step in the persistent log when diagnostics are enabled.

The sidecar already owns discovery through `RuntimeOwnership`, but acquisition
does not reconcile a file left by a dead previous owner. Windows release builds
use panic abort and did not retain matching symbols outside ephemeral Actions
artifacts.

## Decisions

### Initialization is one deep runtime operation

`AssistantWorkspacePublicationRuntime` keeps at most one successful or in-flight
baseline per source. Its identity is document generation plus selected owner.
Calls with the same identity share the same promise; the first cause controls
publication semantics. A changed identity increments an epoch. Every async
boundary and publication checks that epoch, generation, activity, and selected
owner before continuing. Failure clears the record so retry remains possible;
deactivation and reset invalidate it.

### Persistent logging records lifecycle and failure only

Successful `ready` remains info once per shell/child generation. Successful tab,
ACK, render-observation, page, details, handshake, pulse, and snapshot activity
does not enter persistent runtime logs. Existing warnings/errors and the bounded
in-memory shell trace remain available. No sink classifier, sampling policy, or
new log store is introduced.

### Lock ownership precedes stale cleanup

`RuntimeOwnership::acquire` opens and wins `synthesis.lock` before removing
`discovery.json`. Missing discovery succeeds. Any other removal error returns
`stale_discovery_cleanup_failed`; returning drops the local file handle and
releases the lock. The existing ownership destructor remains the terminal
cleanup owner.

### Symbols are an immutable sibling

The Windows job emits debug information, gzip-compresses the PDB deterministically,
and writes a strict manifest containing source/build identity plus executable,
raw PDB, and compressed PDB digests and sizes. The prebuild publisher uses its
existing copy-or-verify rule for
`symbols/<buildFingerprint>/win32-x64/` in the same commit as
`sets/<aggregate>/`. Actions artifacts only move bytes between jobs. The runtime
set and release result contracts stay unchanged.

## Risks

- A matching-symbol requirement turns old Windows cache artifacts into misses;
  the next authorized prebuild rebuilds Windows once.
- The observed deployed abort was not reproduced by the new parent-input
  process test. This change improves recovery and future symbolication without
  claiming a root-cause fix for that unknown panic.
