# Design: Workflow Dynamic Parameter Options

## Overview

Dynamic workflow options are resolved by trusted host code, not by workflow
hooks. A workflow parameter may declare `optionsSource`; the settings model
resolves that source into UI option DTOs before rendering.

The UI must show `label` and submit `value`. For Zotero collections, labels use
collection paths such as `Parent / Child`, while values use stable collection
refs such as `1:ABCD1234`.

## Interfaces

`WorkflowParameterOptionsSource` supports:

- `kind`: built-in resolver id. v1 supports `zotero.collections`.
- `library`: `current`, `user`, or numeric library id.
- `includeEmpty`: add a default-library option.
- `valueFormat`: v1 uses `collectionRef`.
- `labelFormat`: v1 uses `path`.
- `allowStale`: reserved for future cached sources.

`WorkflowParameterOption` contains:

- `value`: submitted string.
- `label`: user-visible label.
- `description`: optional secondary text.
- `meta`: optional structured host metadata.

## Failure Behavior

If a dynamic source cannot be resolved, the descriptor records diagnostics and
the UI falls back to a normal text input. Final validity remains enforced by the
host/MCP tool that consumes the parameter.
