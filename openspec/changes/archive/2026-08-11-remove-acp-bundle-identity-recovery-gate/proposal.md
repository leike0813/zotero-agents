## Why

ACP Chat attempts to compare a persisted Host Bridge plugin Skill bundle identity before restoring a remote session. Its persistence writer never recorded that identity, so a normal restart is classified as an identity change and recovery fails. The same optional recovery gate also blocks ACP Skills after any bundle change, although the selected recovery policy is to let the ACP backend manage session compatibility.

## What Changes

- Remove Host Bridge plugin Skill bundle identity as an ACP Chat and ACP Skills recovery prerequisite.
- Remove recovery-only identity state, parsing, comparison, and structured rejection errors.
- Preserve XPI bundle validation and plugin Skill registry identity metadata.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-chat-session-management`: ACP Chat restores persisted remote sessions without a bundle identity gate.
- `acp-skills-session-recovery`: ACP Skills reconstruct recoverable runs without a bundle identity gate.

## Impact

- Affects ACP Chat session persistence and restoration, ACP Skills run persistence and recovery, the shared Host Bridge plugin Skill bundle contract, and focused recovery tests.
- No external API, dependency, or bundle-integrity validation changes.
