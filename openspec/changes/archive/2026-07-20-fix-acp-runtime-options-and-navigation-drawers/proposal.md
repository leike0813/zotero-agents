## Why

ACP Chat and ACP Skills currently derive runtime options from different combinations of live session state, backend cache, and stored run state. This can hide valid independent reasoning choices, restore stale selections, and expose inconsistent editability; the shared navigation drawer also projects empty backend groups and task lifecycle sections into Chat, while switching Chat to an empty backend temporarily removes the selected conversation owner.

## What Changes

- Establish one canonical ACP runtime-option resolver with explicit source precedence and internal reasoning provenance.
- Preserve independent `thought_level` state across attach, cache restoration, model changes, and Skills run refreshes; align model and reasoning editability.
- Project Chat and Skills navigation drawers according to their source semantics and omit backend groups with no visible cards.
- Make Chat backend switching atomically select or prepare a reusable local placeholder conversation without publishing an owner-less intermediate state.
- Document the runtime-option, drawer, and owner-selection invariants and lock them with focused regression tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skills-runtime-options`: Define canonical runtime-option precedence, independent reasoning capability, provenance, and synchronized model/reasoning editability.
- `acp-chat-session-manager-drawer`: Define source-aware Chat session grouping and atomic empty-backend selection through a reusable local placeholder.
- `assistant-sidebar-ui`: Define visible drawer projection, stable signature inputs, and shared managed-region identity invariants.

## Impact

The change affects ACP session configuration normalization, backend probing, Chat session management, ACP Skills run refresh/setters, shared Assistant drawer projection/rendering, focused unit/UI tests, and Assistant Workspace SSOT documentation. Workspace wire schemas, action names, persisted transcript formats, dependencies, and remote session creation contracts remain unchanged.
