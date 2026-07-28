## Context

The Host Bridge capability registry currently mixes handler functions with descriptive input schemas. The Rust CLI separately implements payload construction in `commands.rs`, while a large JSON command registry and TypeScript AST parser reconstruct those same facts for `--schema`, Agent Surface descriptors, and command cards. Normal CLI execution does not consume that registry. This lets parser behavior, payload adapters, approval metadata, output boundaries, and generated guidance evolve independently.

The concrete `library item search` drift is one instance: the Host capability and command card use `query`, while a Rust adapter expected `text` and renamed it to `query`. The audit found 125 canonical commands, including 57 structured or composed command paths that can suffer the same class of mismatch.

## Goals / Non-Goals

**Goals:**

- Give every public field, route binding, effect, approval policy, and result boundary one executable owner.
- Make accidental one-sided changes fail before authorization, network I/O, success output, or publication.
- Keep the real Clap parser authoritative for argv while making command descriptions exact derivatives of it.
- Return structured, actionable, redacted parameter failures across every CLI input boundary.
- Preserve all unaffected Host Bridge agent guidance at its fixed semantic baseline.

**Non-Goals:**

- Prove that a domain handler implements the intended business meaning of a valid request.
- Add compatibility aliases for `text`, Host Bridge v1, or the v1 command registry.
- Change Generic research-task policy or Hermes resident automation policy.
- Build, publish, or synchronize Host Bridge release artifacts.

## Decisions

### Use two language-neutral executable contracts with non-overlapping ownership

`host-bridge/contracts/capabilities.v2.json` owns capability input and output JSON Schemas, effect, and approval policy. `host-bridge/contracts/cli-commands.v2.json` owns CLI-to-Host targets, binding algebra, CLI result boundaries, handles, recovery, and examples. The command contract references capability IDs and argument IDs instead of copying their fields. Clap remains the only argv grammar.

TypeScript imports the capability JSON directly. Rust embeds both JSON files with `include_str!`. No committed TypeScript or Rust contract snapshot sits between those consumers and the canonical files.

Alternative rejected: generate Rust constants or TypeScript registries. A generated snapshot can itself become stale and needs another synchronization rule.

### Put all remote execution behind one contract executor

The CLI executor resolves a canonical command, parses structured sources, and applies executable composition declared by the command contract. `passthrough` selects the contract's sole structured source; `overlay` starts from that object and applies declared constants and argument mappings; `object` constructs a new object from declared constants and argument mappings; `none` and `raw` remain closed special cases. A mapping may use only the contract's closed transform set (`identity`, `trim-string`, `path-string`, `context-ref`, or `context-ref-array`). The executor validates the resulting capability input, calls transport, validates the Host result, and validates the CLI result before stdout. Low-level transport methods become private to this executor.

Command handlers provide values keyed only by real Clap argument IDs. They do not name capability targets, payload fields, operation discriminators, readiness filters, or transforms. Contract validation rejects composition entries that reference an unknown parser argument, omit a value required to build the payload, write the same target field twice, or use a transform outside the closed set.

Host registration binds private handler functions to contract IDs. The dispatcher validates input before permission evaluation, obtains effect and approval policy from the contract, invokes the handler, and validates output before creating a success envelope.

Alternative rejected: architecture tests alone around direct calls. Tests can detect known bypasses, but private module boundaries remove the bypass from normal source code.

### Validate Draft 2020-12 schemas in both runtimes

Host Bridge uses the repository's Ajv 8 dependency in 2020 mode. Rust adds `jsonschema 0.49.2` with default network, file, and TLS resolution features disabled. Contract documents are meta-schema validated and reference-checked before registration or command execution. Inputs are closed by default; deliberately open schemas require an explicit rationale field.

### Make protocol v2 a hard boundary

The Host API moves to `/bridge/v2` and advertises `host-bridge.v2`. CLI 0.5.0 requires that protocol and endpoint namespace. No v1 route, alias, or payload compatibility layer is added in the new source.

### Build Agent Surface from runtime authorities

Rust constructs the descriptor from the real Clap command tree plus the two executable contracts. `surface describe`, `surface search`, and `surface identity` use that builder directly. An offline Rust exporter exposes identical bytes to the Node renderer. Node no longer parses Rust AST or owns command target/binding maps.

Materialized command cards remain tracked release content, but runtime code never reads them. Content, PR, and release gates diff them against the exporter and fail on stale output.

### Use one structured parameter-error model

The CLI maps Clap error kinds to stable codes and represents JSON source, syntax, schema, payload, and result violations with `host-bridge.argument-error.v1`. Violations are sorted, capped at eight, and redacted. Tests assert codes and semantic fields rather than complete prose.

## Risks / Trade-offs

- [Large initial contract extraction] → Mechanically migrate the existing registry first, then require exact handler/command parity and remove old maps only after tests consume the new contracts.
- [Strict schemas reveal previously tolerated inputs] → Treat these as intentional v2 failures with precise violations; do not add aliases.
- [Handler business semantics can still be wrong] → Keep focused domain integration tests for observable results; boundary schemas do not claim formal semantic proof.
- [Generated Skill content may be temporarily stale in a working tree] → Runtime ignores it, and deterministic content/release gates prevent publication.
- [Protocol v2 breaks installed CLI 0.4 clients] → Coordinate CLI, plugin Host, and all three agent-facing surfaces in a later explicitly authorized release set.

## Reopened audit record

The implementation audit reopened this change because the first completion of task 3.2 left semantic payload adapters in `commands.rs`. In particular, eleven mutation commands injected operation discriminators or renamed arguments, while three readiness commands injected `checks` and `missingOnly`; the command contract's string-valued `binding` property did not own those facts. Generated schemas therefore described the generic target capability rather than the command-specific payload.

The fixed semantic baseline remains `de4bcf12a3589776f79c985d13a8500b1eea59ce`. The affected consumer materializations have the following `(lines, substantive instruction lines, normalized prose characters)` metrics under the same algorithm as the package-depth gate. Current files retain their terminal newline, which contributes one entry to the reported line count:

| Materialized file | Baseline metric | Post-implementation metric | Prose retained |
| --- | ---: | ---: | ---: |
| `debug-host-bridge-connectivity-probe/SKILL.md` | `(97, 50, 1768)` | `(115, 66, 2558)` | `144.68%` |
| `create-topic-synthesis-prepare/SKILL.md` | `(445, 236, 12032)` | `(465, 252, 11934)` | `99.19%` |
| `update-topic-synthesis-prepare/SKILL.md` | `(379, 203, 11073)` | `(399, 219, 10975)` | `99.11%` |
| `topic-synthesis-core-enrichment/SKILL.md` | `(510, 187, 10131)` | `(530, 203, 9954)` | `98.25%` |
| `topic-synthesis-finalize/SKILL.md` | `(320, 174, 8701)` | `(340, 190, 8524)` | `97.97%` |
| `tag-bootstrapper/SKILL.md` | `(252, 119, 8232)` | `(263, 129, 8724)` | `105.98%` |
| `manuscript-literature-framing/SKILL.md` | `(239, 133, 5450)` | `(256, 146, 6059)` | `111.17%` |
| `literature-search-ingest/SKILL.md` | `(603, 249, 12372)` | `(634, 275, 13508)` | `109.18%` |
| `literature-search-ingest/references/ingest-output-recovery.md` | `(441, 157, 5029)` | `(489, 185, 6172)` | `122.73%` |

All 125 generated minimum-core command cards were regenerated because the closed descriptor now exposes composition explicitly, including `null` for commands without a field-mapping program. Their current line counts range from 240 to 2,398. The baseline-relative package gate has no hard depth failure. Its 26 advisory depth warnings are accepted because each warned file is a complete renderer-owned command contract rather than manually shortened guidance.

The approved explicit deletion inventory is:

1. Obsolete pointers to `references/host-bridge-cli.md`.
2. The duplicated handwritten topic-synthesis command-family catalog, after replacing it with the generated command-catalog route.
3. Host Bridge v1 identities and obsolete root-level `status` / `manifest` command names in the connectivity probe.
4. Mixed raw capability and MCP operation names in the CLI-governed manuscript instructions, where canonical semantic CLI commands exist.

No other semantic instruction may be deleted, compressed, merged, reordered, or rewritten more thinly in this follow-up.

The post-implementation semantic review recorded `unmapped = 0`, `downgraded = 0`, `unauthorized dropped = 0`, and `intra-package duplicate = 0`. Every removed unit matches one of the four approved inventory entries above; all other minimum-core, Generic, and Hermes guidance remains mapped through the governed ownership chain.
