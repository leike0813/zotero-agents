# Change: Split ACP Skill Run Request From SkillRunner Job

## Why

ACP Skills currently dispatches workflow skill runs through `skillrunner.job.v1`.
That leaks the remote SkillRunner upload contract into local ACP runs, so agents
receive paths such as `inputs/source_path/file.md` even though ACP does not
unpack files into that workspace layout.

## What Changes

- Add an ACP-only request kind, `acp.skill.run.v1`.
- Keep `skillrunner.job.v1` exclusive to the remote SkillRunner provider.
- Convert SkillRunner-style workflow requests to ACP skill run requests at the
  execution boundary when the selected backend is ACP.
- Use local absolute file paths in ACP prompt/input manifest data.

## Impact

- Specs: provider adapter and ACP skill runner request contracts.
- Code: provider request contracts, ACP provider dispatch, workflow preparation,
  and ACP runner request assertion.
- Tests: provider contract, ACP request adaptation, execution preparation, and
  prompt/input manifest path rendering.
