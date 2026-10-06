# Design

## Context

See proposal.md for motivation. The runner already mirrors structured reporter events and persists one manifest across HB-03, AC-05 and SR-02 process restarts. Current resume guards skip complete suites, while exit status comes from the last scaffold process.

## Goals / Non-Goals

Preserve selected case identity and terminal evidence across restarts, continue unexecuted cases, and retain bounded artifact neighbors. Keep directory membership, public mutation identities, copied-profile ownership and current-source sidecar unchanged. Release governance and CI promotion are outside this change.

## Decisions

- Declare stable metadata on real Mocha tests. The actual runner's grep selection supplies the expected set before completed tests are pruned. This avoids a second catalog or parsing titles.
- Keep completed case IDs in the outer collector and pass them into recovery. Prune completed tests before hooks so prior families are not replayed; execute the interrupted case's existing recovery branch and subsequent cases.
- Persist a selected-case summary and require terminal results plus existing family evidence for completion. Preserve failures across every process and derive entry exit status from the final manifest. Publish the selected set before execution and drain reporter events before end.
- Convert only typed per-note byte-limit errors into bounded readiness issues at the existing shared detach boundary. Keep cancellation, conflicts and unclassified failures fatal.
- Extend existing infrastructure and artifact-port tests, then run PA-02 and the default entry on Linux Zotero with the local sidecar build.

## Risks / Trade-offs

Missing reporter events or a changed selected inventory must leave the run incomplete. A declared unsupported-platform skip is terminal; arbitrary pending cases remain missing evidence. Existing stress/candidate lanes without case metadata retain their current manifest contract.
