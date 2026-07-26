## Why

ACP Skills conversation recovery creates a fresh ACP process but does not rebuild the run-scoped Host Bridge CLI environment used by initial execution. Recovered agents can therefore resolve an older system `zotero-bridge`, lose the profile and token, and fail otherwise valid Host Bridge operations; additionally, the generated POSIX shim is not executable.

## What Changes

- Require recovery to reconstruct the original run's Zotero host-access policy and rematerialize its Host Bridge CLI profile, token environment, and PATH before dependency probing or adapter creation.
- Keep explicit `zotero_host_access.required: false` effective during recovery and preserve the existing least-privilege fallback when the original request is unavailable.
- Reuse one Host Bridge preparation path for initial execution and recovery so their environment behavior cannot drift.
- Make the generated POSIX `zotero-bridge` shell shim executable through the existing cross-runtime filesystem abstraction.
- Persist and publish only the masked Host Bridge summary; never persist the recovered plaintext token.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skills-session-recovery`: Define recovery-time reconstruction and application of run-scoped Host Bridge CLI access before a recovered ACP process starts.
- `host-bridge-cli-interface`: Require generated POSIX run shims to be executable while retaining direct CLI-directory PATH fallback.

## Impact

The change affects ACP Skills orchestration, Host Bridge CLI run materialization, and focused recovery/materialization tests. It does not change public APIs, persisted run schema, Host Bridge wire protocol, CLI binaries, or Windows `.cmd` shim behavior.
