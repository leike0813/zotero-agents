## Context

Host Bridge currently publishes a CLI bundle, a Generic Library Agent bundle, and a Hermes Librarian profile. Generic physically includes the CLI bundle, but Hermes independently re-renders command cards and policy instead of extending Generic. High-level task guidance and the built-in workflow catalog are embedded in `agent-surface.json`, so research-policy changes can alter the CLI build fingerprint. Several generated targets are also read back as renderer templates, and the Hermes resident scripts share one SQLite file without a single schema owner.

The public names `zotero-bridge-cli`, `zotero-library-agent`, and `zotero-librarian` remain stable. This design targets the next major plugin release and can change the descriptor and package layouts directly.

## Goals / Non-Goals

**Goals:**

- Establish one ownership rule: mechanism facts belong to Minimum, bounded research policy belongs to Generic, and resident autonomy belongs to Hosted facets.
- Make `minimum-core -> generic-agent -> hosted/hermes` a declared, byte-identical composition chain.
- Make every published Skill independently executable from its `SKILL.md`, with comprehensive directly linked references and concise descriptions.
- Make the redesigned guidance a semantic superset of the clean pre-redesign baseline without retaining duplicate statements inside a Skill package.
- Separate CLI build identity from Generic workflow/task prose while retaining exact downstream component identity.
- Give Hermes one deterministic resident-service entrypoint, one state-store owner, stable receipts, and explicit authority limits.
- Remove source/target inversion and duplicate semantic facts.

**Non-Goals:**

- Do not change Zotero Host Bridge REST semantics or approval authority.
- Do not add a daemon, external scheduler, Python dependency, release dispatch, or Gitee integration.
- Do not add compatibility prose or migration instructions to published Skills.
- Do not redesign unrelated built-in Skills or workflows.

## Decisions

### Three layers compose by manifest

Add `host-bridge/surfaces.json` as the topology and version-patch source. Minimum has no base, Generic extends Minimum, and Hermes extends Generic. The renderer resolves the transitive graph once, rejects cycles or duplicate mounts, and materializes inherited components without rewriting them. A generated surface manifest records the exact CLI identity and component digests.

This replaces implicit copy lists because one declared graph makes ownership, impact propagation, and release validation inspectable. The alternative of retaining three independent renderers would preserve the current semantic drift.

### The embedded Agent Surface becomes mechanism-only v4

`host-bridge.agent-surface.v4` retains global options and exact command records: argv, schemas, effects, approvals, handles, recovery, targets, summaries, and operational aliases. It omits task guidance and the workflow catalog. `surface search` indexes only those operational fields. The CLI fingerprint includes the v4 descriptor, while Generic task prose and workflow-catalog rendering stay outside the CLI release inputs.

Two read-only local commands absorb the useful non-Generic parts of the Python helper: `workflow agent-bundle inspect` and `workflow agent-result validate`. They read directories directly and index ZIP entries in place through the Rust `zip` crate with only the DEFLATE reader backend enabled; they reject unsafe paths, symbolic links, duplicate files, excessive entry counts, oversized JSON, malformed archives, and unsupported compression without extracting the archive. Provider-profile validation continues through the existing CLI command; no file-preparation helper remains.

### Generic uses one coordinator and five bounded task Skills

The coordinator routes single tasks and composes multi-stage requests. Query, acquisition, analysis, synthesis, and curation own only their research decision processes. They depend on the bundled Minimum Skill for exact invocation and use live `workflow list/describe` for current availability.

All six Skills use one generated business-result schema. Evidence is an inline array and artifacts remain explicit paths; there is no second evidence envelope or helper validator. Runner final/pending wrapping remains outside this business schema.

Generic Skills are Tier 2 reference-backed plus automation-facing. Minimum and Hermes are Tier 3 script-assisted; Hermes uses SQLite internally for resident cache/journal state but is not exposed as a gate-driven research Skill.

### Skill packages have a deterministic structural contract

Every published Skill uses a one-line description of at most 240 Unicode code points in the form `<capability>. Use when <trigger>.` Its `SKILL.md` contains goal, inputs, workflow, hard constraints, completion, failure handling, references, and—when scripts exist—LLM/script responsibilities and command examples.

The validator requires direct links from `SKILL.md` to every file under `references/`, rejects orphan or missing references, checks current-state-only wording, and rejects exact substantive prose duplicated between package documents. It does not impose content-length thresholds. The semantic review gate decides whether `SKILL.md` is minimum-complete, whether references are coherent rather than fragmented, and whether paraphrased rules have more than one owner.

The clean baseline is pinned by commit in `semantic-parity.md`. Its repeated instructions are collapsed into unique semantic units covering goals, decisions, procedures, constraints, evidence, completion, failure, recovery, examples, and near misses. Every unit names one current owner or a complete generated equivalent. An implementation replacement is valid only when the current guidance preserves the same capability, authority boundary, completion evidence, and recovery behavior; no unit may be silently dropped or weakened into a summary.

Within one Skill package, `SKILL.md` owns normative execution and hard constraints. References assume that contract is loaded and add deeper domain decisions, full branches, examples, and recovery analysis without restating the same rule. This reconciles minimum-complete execution with progressive disclosure.

### Minimum keeps one comprehensive generated reference

The complete CLI operating contract lives in `zotero-bridge-cli/SKILL.md`. The only reference is the source-generated command inventory. Each command card renders every public v4 descriptor field: argv and bindings, invocation/payload/result schemas, pagination, effects and state change, approval scope, handle transitions, recovery, targets, aliases, and intent-search visibility. Topic-specific command manuals and a second prose operating contract are unnecessary duplicate owners.

### Hermes uses one resident service and one receipt

`zotero_librarian_service.py` owns index, workflow catalog, watched runs, notifications, maintenance, synthesis attention, and scheduled-job operations. It is a one-pass CLI invoked by cron, not a daemon. It owns `state.sqlite`; the database is a cache/journal and never replaces live Zotero/Host Bridge truth.

Every operation constructs `zotero-librarian.operation-receipt.v1`. Cron may explicitly adapt `unchanged` to `[SILENT]`; failed operations emit a structured error and nonzero exit. Default scheduled jobs can read, index, monitor, and report but cannot submit workflows. Submission requires an interactive request or an enabled named automation policy; apply-back and Zotero mutations retain Host approval.

### Release identity separates human version from exact payload

Each surface version remains `<CLI major>.<CLI minor>.<surface patch>`. A CLI patch or inherited-component change does not itself change a downstream surface patch; exact CLI identity, transitive component digests, payload digest, and release-set ID distinguish the bytes. CLI major/minor changes reset surface patches to zero.

Payload identity is computed from the normalized staged file set. Release-set copies are not embedded back into each payload, avoiding self-referential hashing. Content-addressed publication prevents a stable human version from overwriting different bytes.

### Sources and generated targets are one-way

Authored Skill content lives under `skills_src`, Hermes content under `profiles_src`, and renderer templates under explicit source paths. `skills_builtin`, `profiles`, the embedded descriptor, command references, and CLI documentation are generated targets only. The renderer never reads a generated target as its template.

### The review mirror follows ownership rather than expanded payload layout

The Chinese review mirror resolves `host-bridge/surfaces.json` and translates each Markdown document from its owning surface exactly once. Minimum owns its CLI Skill documents, Generic owns the six research Skill packages, and Hermes owns its profile-level documents plus the Librarian Skill. The generated index and provenance expand the declared lineage to show each surface's effective document set without copying inherited translations into downstream directories.

`prepare` freezes the resolved inventory and source bytes in an isolated staging directory. `finalize` rejects any source or manifest change since preparation, validates the exact translated file set and protected Markdown structure, renders the index from structured summaries, writes verifiable provenance, and atomically replaces the formal artifact. This keeps translation judgment with the agent while making discovery, composition, validation, and publication deterministic.

### Agent-facing language starts from Zotero tasks

Published descriptions and operational prose name the user's intent first: Zotero library access, research tasks, Zotero-side approval, Zotero-managed state, or the `zotero-bridge` command. They do not require an agent to understand the repository's internal `Host Bridge` name before deciding whether to load a Skill.

Formal identifiers remain unchanged because they are machine contracts rather than explanatory prose. This includes `host-bridge.v1`, `host-bridge.agent-surface.v4`, `host-bridge.*` schema identifiers, `/bridge/v1/**`, `ZOTERO_BRIDGE_HOST_PROFILE`, `ZOTERO_BRIDGE_HOST_HOME`, and code identifiers. One shared language checker owns the prose rule across authored Skill/Profile sources, generated governed Markdown, the embedded descriptor, and CLI-visible strings.

## Risks / Trade-offs

- **Agent Surface v4 breaks v3 consumers** -> Release only at the planned major boundary and keep public command names stable.
- **A coordinator plus task Skills can repeat policy** -> Give each task one owner and validate that exact CLI mechanics occur only in Minimum.
- **A single resident script can grow too large** -> Keep one public entrypoint and organize internals by command domain with shared state/bridge primitives; split internal modules only if tests demonstrate a cohesive boundary.
- **No length threshold leaves reference quality partly semantic** -> Combine deterministic reachability and exact-duplicate checks with a pinned semantic-parity matrix and mandatory reference-depth review.
- **Stable surface versions can describe different inherited payloads** -> Make release-set ID and payload digest mandatory artifact coordinates and prohibit byte overwrite.
- **Fresh resident state starts empty** -> Treat it as rebuildable cache/journal, initialize transactionally, and live-confirm facts before writes or user-facing freshness claims.

## Migration Plan

1. Land schemas and failing contract tests.
2. Cut the CLI descriptor to v4 and add local inspection commands.
3. Render Minimum and the six Generic Skills from explicit sources.
4. Cut Hermes to the unified resident service and new state store.
5. Switch materialization, validation, and release-set calculation to the manifest graph.
6. Re-home every valid semantic unit, then remove duplicate or replaced renderers, helpers, references, and generated-target sources.
7. Render governed outputs, run focused/full checks, then update `doc/` to the implemented current state.
8. Refresh the ownership-based Chinese review mirror and require its local consistency check before an approved release dispatch.

The implementation does not publish. If validation fails after cutover, generated outputs are re-rendered from the new sources; no runtime data rollback is required because resident state is rebuildable.

## Open Questions

None. Public IDs, task topology, v4 strategy, validation model, evidence model, hosted runtime, and version binding are confirmed.
