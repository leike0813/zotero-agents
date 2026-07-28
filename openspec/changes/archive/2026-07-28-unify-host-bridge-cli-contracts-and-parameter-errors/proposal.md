## Why

Host Bridge capability schemas, Zotero Bridge CLI payload adapters, and generated command descriptions currently repeat the same public fields in separate TypeScript, Rust, and JSON registries. Those copies have already drifted: `library item search --query` was rendered with `query` while the CLI adapter accepted `text`, and existing validation only compared generated examples with the shadow registry that produced them.

## What Changes

- **BREAKING** Replace the descriptive Host Bridge v1 capability registry with an executable `host-bridge.v2` contract that owns capability input, output, effect, and approval metadata.
- **BREAKING** Publish Zotero Bridge CLI 0.5.0 with `query` as the only `library item search` selector field; reject `text` and other unknown fields.
- Make the Rust CLI consume the canonical capability and command contracts directly, compose remote payloads through one contract executor, and prevent command handlers from bypassing it.
- Validate capability inputs before approval, validate handler outputs before success, and validate CLI results before stdout.
- Generate the Agent Surface and command cards from the real Clap tree plus the executable contracts; reject stale materialized output before publication.
- Return stable, structured parameter errors for argv, JSON source/syntax, command input, capability input, payload composition, and result validation failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-service`: Upgrade the public bridge protocol to v2 and enforce canonical capability input, output, effect, and approval contracts.
- `host-bridge-cli-interface`: Replace the shadow command registry with an executable command contract and strengthen structured parameter errors.
- `agent-cli-self-description`: Derive offline command descriptions from the real parser and executable contracts.
- `host-bridge-agent-surfaces`: Require generated command references to be deterministic, contract-derived, and publication-gated.
- `host-bridge-approval-prompts`: Resolve capability approval policy from the canonical capability contract after input validation.
- `host-bridge-output-boundaries`: Move command result and output-boundary declarations into the executable CLI contract.
- `host-bridge-workflow-control`: Move authenticated workflow-control routes to the v2 bridge namespace without changing their domain behavior.
- `host-bridge-file-downloads`: Move broker-issued file delivery routes to the v2 bridge namespace.
- `host-bridge-release-pipeline`: Include executable contract inputs in CLI identity and reject stale derived surfaces.

## Impact

The change affects Host Bridge protocol and capability registration, the Rust CLI parser/dispatcher/client/surface stack, command and surface renderers, Host Bridge release identity, built-in and Hermes materialized Skill packages, and their existing contract tests. Rust adds the `jsonschema` validator with network and filesystem resolution disabled. Existing Host Bridge v1 and CLI 0.4.0 artifacts remain historical release evidence; new source does not provide a v1 compatibility path.
