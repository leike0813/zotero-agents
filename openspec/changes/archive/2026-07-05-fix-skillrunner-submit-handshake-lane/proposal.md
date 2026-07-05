## Why

SkillRunner job submission can fail before the backend receives the capability
handshake. The local connection governor treats the handshake as a health
probe, so it may skip the request while the backend is busy or degraded even
though the handshake is part of the foreground submission path.

## What Changes

- Route provider execution preflight handshakes through the submission
  connection lane.
- Preserve the existing low-priority skip behavior for background health
  probes and maintenance work.
- Preserve model cache refresh behavior, which uses direct catalog fetches and
  is not part of this failure path.
- Ensure legacy fallback reachability checks inherit the execution lane when
  the handshake endpoint is missing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skillrunner-handshake-protocol`: execution preflight handshakes must use the
  submission lane and must not be skipped as low-priority health probes.

## Impact

- Affected code: SkillRunner handshake resolver and provider execution preflight.
- Affected tests: SkillRunner handshake/provider regression coverage.
- No backend protocol, dependency, model cache, or connection governor policy
  changes.
