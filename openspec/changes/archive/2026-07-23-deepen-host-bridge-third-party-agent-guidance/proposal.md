## Why

The three agent-facing Zotero surfaces are operationally usable but still assume too much project context. Generic and hosted agents need complete guidance for translating vague natural-language research requests into bounded Zotero CLI and workflow operations, while minimum-core needs a command catalog that works before an agent knows any command names.

## What Changes

- Add a generated, intent-oriented command catalog to minimum-core while retaining detailed partitioned command references.
- Deepen the Generic coordinator, five task Skills, their playbooks, and the built-in workflow catalog so an unfamiliar agent can clarify, route, execute, verify, recover, and report a research task.
- Make `zotero-library-task.result.v1` discoverable as the Runner-validated business result contract, with one shared JSON Schema, field semantics, status examples, and an explicit transport-envelope boundary.
- Deepen the Hermes Librarian Skill and its three references for resident supervision, library questions, workflow monitoring, authority boundaries, and recovery.
- Correct hosted workflow planning and submission so selections are validated against live workflow contracts and immutable plans are identity-bound, one-shot, and recoverable.
- Enforce hard and advisory instruction-depth gates alongside semantic coverage and package-local duplication review.
- Refresh the architecture documentation, governed outputs, and Chinese review mirror.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-agent-surfaces`: Add intent-first command discovery, materialized instruction-depth gates, and explicit semantic coverage requirements.
- `zotero-library-agent-bundle`: Define natural-language task intake, complete task guidance, and the Runner-validated `zotero-library-task.result.v1` contract.
- `zotero-librarian-profile`: Define safe resident workflow planning, immutable plan identity, one-shot submission, and uncertain-effect recovery.

## Impact

Affected areas include the three semantic source trees, surface renderer and validator, Generic Runner assets, the Hermes resident service and SQLite state, related core tests, OpenSpec contracts, architecture documentation, generated Skill/profile outputs, and the Host Bridge review mirror. Zotero Bridge CLI command syntax and formal release execution are unchanged.
