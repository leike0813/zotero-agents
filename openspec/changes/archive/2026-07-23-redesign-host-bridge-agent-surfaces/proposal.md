## Why

The three Host Bridge agent-facing release surfaces are individually usable but do not share a coherent ownership model: CLI mechanism facts, research-task policy, resident automation policy, and release identity are duplicated or coupled across generated outputs. The next major plugin release is the right boundary for a current-state redesign that makes each layer independently understandable and mechanically composable.

## What Changes

- **BREAKING** Upgrade the embedded Agent Surface descriptor from v3 to a mechanism-only v4 contract and remove research guidance and the workflow catalog from the CLI build fingerprint.
- Define a manifest-driven `minimum-core -> generic-agent -> hosted/hermes` inheritance model with byte-identical lower-layer components and payload-based release identity.
- Replace the monolithic Generic bundle with one coordinator Skill and five bounded research-task Skills that share one inline-evidence result contract.
- Remove the Generic evidence helper and move the two reusable agent bundle/result inspection operations into the Rust CLI.
- Replace the Hermes profile's three implicitly coupled Python services with one resident service, one SQLite schema owner, one operation receipt contract, and explicit automation authority rules.
- Enforce a minimum-complete `SKILL.md`, direct reachability of every comprehensive reference, and concise trigger descriptions for every Skill published by the three surfaces.
- Preserve the clean pre-redesign instruction set as a semantic subset of the new surfaces after duplicate baseline statements are collapsed, while assigning every rule one owner inside each Skill package.
- Replace target-as-template rendering with explicit semantic/template sources, then update the architecture documentation after implementation.
- Replace the legacy three-copy review artifact with a manifest-driven ownership mirror that translates each owned Markdown source once, records inherited effective composition, and verifies its frozen source snapshot before replacement.
- Replace project-internal `Host Bridge` prose on agent-facing surfaces with Zotero task language while preserving formal protocol, schema, environment-variable, and code identifiers.

## Capabilities

### New Capabilities

- `host-bridge-agent-surfaces`: Defines the three-layer ownership, composition, Skill package, and payload identity contracts.

### Modified Capabilities

- `host-bridge-cli-interface`: Changes the public Agent Surface schema and adds local agent bundle/result inspection commands.
- `zotero-library-agent-bundle`: Replaces the single broad policy package with a coordinator plus five task Skills and one shared result schema.
- `zotero-librarian-profile`: Makes the profile a hosted facet over Generic and consolidates resident operations and state.
- `host-bridge-workflow-control`: Exposes read-only local validation of agent handoff/result bundles without consuming handles or applying writes.
- `host-bridge-operation-receipts`: Adds a stable resident-service operation receipt while keeping runner business results separate.
- `host-bridge-release-pipeline`: Changes surface composition, validation, digest, and version identity inputs.
- `host-bridge-review-mirror`: Governs the Chinese human-review mirror, its source inventory, provenance, structural preservation, and atomic refresh workflow.

## Impact

- Affects the Rust CLI Agent Surface descriptor and workflow command families, Host Bridge render/materialize/release scripts, built-in Skills, the Hermes profile, Host Bridge schemas, release checks, and architecture documentation.
- Adds one shared language gate over the three surfaces so Skill descriptions are triggered by Zotero library needs rather than prior knowledge of the bridge architecture.
- The review artifact layout and provenance schema change; inherited Markdown is no longer duplicated under every downstream surface.
- Public Skill IDs `zotero-bridge-cli`, `zotero-library-agent`, and `zotero-librarian` remain stable; the Agent Surface v4 and Generic business-result schema are breaking contracts.
- The CLI uses the Rust `zip` crate with only its DEFLATE reader backend enabled; it does not require an external archive executable. The resident service continues to use Python standard-library SQLite and subprocess facilities.
