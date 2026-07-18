# Agent-Owned Handoff

Use this journey only when `executionModes.agentOwned.supported` is true and the calling agent will execute the downloaded request contract locally.

## Prepare

Read `workflow describe` first. Agent-owned handoff cannot carry Host-owned workflow options or provider profiles. Call `workflow agent-run` with explicit selection or `--none` and a controlled output directory. Preserve `agentRunId`, every `agentRequestId`, bundle path, and checksum.

## Execute

Open each request bundle and read its input and output contracts before doing work. Validate every result bundle locally. Do not invent filenames or result schemas, and do not apply a partially prepared request merely because another request is ready.

## Apply and audit

Submit the complete mapping with `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`. Host Bridge preflights all bundles before approval or handle consumption. Once apply execution starts, treat the `agentRunId` as one-shot.

If the call fails or returns mixed outcomes, run `workflow agent-apply-status <agentRunId>`. The persisted receipt is the authority for preflight failure, applied requests, failed requests, state change, consumption, and recoverability. Do not use `run get`, `run cancel`, active tasks, or notifications for agent-owned handoffs.

## Completion evidence

Return the request ids, bundle checksums, validation result, approval outcome, receipt status, and any live Zotero objects produced by successful apply-back.
