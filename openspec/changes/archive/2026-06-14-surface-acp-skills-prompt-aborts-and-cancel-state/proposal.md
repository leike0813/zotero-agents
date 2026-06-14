# Change: Surface ACP Skills Prompt Aborts And Cancel State

## Why

ACP Skills recovered runs can observe a backend prompt turn as `end_turn` after
the user has already interrupted it. Some ACP backends may also expose prompt
stream failures through JSON-RPC errors or `session/update` diagnostics. When
these signals are not represented in the plugin state machine, the UI can keep
showing a busy cancel action even though no prompt turn is active.

## What Changes

- Treat user-interrupted prompt turns as interrupted even when the backend later
  returns `end_turn`.
- Classify ACP-visible backend prompt errors before output validation and repair,
  limited to request errors and explicit prompt-level provider diagnostics.
- Surface high-signal prompt failure diagnostics in ACP Skills transcripts.
- Keep backend-private transcripts and databases out of runtime decisions.

## Impact

This change does not modify workflow contracts, skill output schemas,
`applyResult` contracts, ACP backend presets, or backend-private storage.
