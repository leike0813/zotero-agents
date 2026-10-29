# Design

## Context

The existing gate runner already sequences shared checks and Node/native/host
commands. Its Node stage calls `test`, so changing only package.json would
recurse. The complete host wrapper already runs core, UI, workflow and E2E in
separate processes. Compatibility jobs derive cells from one planner and carry
explicit family selection into the shared runner.

## Goals / Non-Goals

Provide one complete routine test entrypoint and required offline WF evidence
in CI, PR and release gates. Preserve explicit narrow test commands and all
existing promoted compatibility identities. Special stress, real-service live
capture, publication and repository branch-protection settings remain separate.

## Decisions

- Add a full gate mode to the existing orchestrator. Node calls `test:node`;
  full includes native Rust tests and the existing complete Zotero wrapper.
  Shared governance and native stage1 keep their existing single ownership.
- Isolate WF in dedicated compatibility cells. PR selects Linux 10; main and
  release select Linux 7/9/10. The user explicitly requests these new required
  gates; historical Phase 1 promotions and Windows close-lifecycle policy keep
  their existing identities and validation.
- Direct PR gate runs critical Zotero guards plus WF; release/full host execution
  already includes WF. CI compatibility jobs independently prove exact pinned
  targets using the pre-staged current-source candidate.
- Reuse the existing Python command helper for Node peers. Local shared uv
  environments remain supported; CI uses its explicitly prepared Python.
- Set offline mode at routine gate/CI boundaries and remove inherited live
  capture inputs. Partial case selection must not silently shrink full runs.
- Preserve source-based test membership. Validate process sequencing and first
  failure propagation at the runner boundary; extend existing matrix/family
  behavior tests rather than snapshot YAML or test-source text.

## Risks / Trade-offs

Full routine tests take longer and require Zotero, Rust and the declared Skill
Python runtime. CI jobs must prepare those prerequisites and initialize pinned
skill submodules. Dedicated WF jobs add runtime while keeping existing Phase 1
calibration identities intact. Local validation does not claim remote GitHub
execution or repository branch-protection changes.
