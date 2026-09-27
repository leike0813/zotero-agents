## Why

The Dashboard Host is a deep process-wide module, but its implementation is concentrated in a roughly 5,000-line historical Task Manager file. Snapshot projection, refresh governance, action routing, and frame lifecycle change for different reasons, so keeping them together obscures ownership and makes behavioral testing depend on source text.

## What Changes

- Rename the root owner and all active Task Manager identifiers to Dashboard Host / Task Dashboard terminology.
- **BREAKING** Remove the unused legacy hook event and expose the canonical direct host exports without compatibility forwarding paths.
- Keep one root Dashboard Host interface while moving four private implementation clusters under `src/modules/dashboard/`.
- Replace Dashboard source-text assertions with behavior tests through the host and page interfaces.
- Update the glossary, active documentation, current specs, localization identifiers, and governance paths; archived OpenSpec records remain immutable.

## Capabilities

No capability requirements change. This change opts out of delta specs because Dashboard wire behavior, user-visible behavior, persistence, and host ownership contracts remain unchanged.

## Impact

The change affects the Dashboard Host imports and test cleanup dependency, Dashboard localization identifiers and DOM ownership identifiers, Dashboard tests and their shared harness, active architecture documentation, and path-sensitive diagnostics governance. It adds no dependency and changes no persisted or wire data.
