# Host Bridge Agent-facing Surfaces

## Overview

Host Bridge publishes one agent-facing architecture with three layers. The
layers follow a single direction:

```text
Mechanism (Minimum)
        -> Task (Generic)
        -> Residency (Hosted / Hermes)
```

This document is the design source for layer ownership, composition, Skill
package rules, and surface release identity. The CLI manual describes exact
mechanism invocation, the capability registry describes runtime capability
definitions, and the lifecycle document describes the embedded Host Bridge
server.

## Agent-facing language boundary

`Host Bridge` is the internal architecture name used by this repository. It is
not a discovery concept for an agent. Published Skill descriptions and
human-readable operating guidance therefore start from Zotero library access,
research tasks, Zotero-side approval, Zotero-managed state, or the public
`zotero-bridge` command. An agent must not need prior knowledge of the internal
bridge topology to decide whether a Skill applies.

Machine contracts keep their established identity. Protocol and schema values
such as `host-bridge.v1` and `host-bridge.agent-surface.v4`, `/bridge/v1/**`
routes, `ZOTERO_BRIDGE_HOST_PROFILE`, `ZOTERO_BRIDGE_HOST_HOME`, and code
identifiers are not rewritten as prose. The shared agent-language gate checks
authored surface sources, generated packages, CLI-visible strings, and the
embedded descriptor while allowing these formal identifiers.

## Ownership and composition

`host-bridge/surfaces.json` is the canonical composition manifest. It declares
each surface identity, its base surface, mounts, component ownership, and its
surface-owned version patch. The renderer resolves the graph once and rejects
cycles, duplicate component identities, and conflicting mount paths.

| Layer | Public surface | Owns | Does not own |
| --- | --- | --- | --- |
| Minimum | `zotero-bridge-cli` | CLI mechanism facts and operating contract | Research-task selection or resident automation policy |
| Generic | `zotero-library-agent` | Research-task routing, composition, and task policy | Exact CLI argument mechanics or scheduled autonomy |
| Hosted | `zotero-librarian` | Hermes resident policy, configuration, schedule, and local cache/journal operations | Lower-layer CLI or research-task policy |

Generic mounts Minimum byte-identically. Hermes mounts the complete Generic
and Minimum components byte-identically, then adds only its resident facet.
The generated surface manifest records the exact CLI identity and the digest of
every direct and inherited component.

## Minimum: mechanism contract

Minimum exposes `zotero-bridge` and the offline
`host-bridge.agent-surface.v4` descriptor. The descriptor contains only
operational facts: global options, command paths, input and output schemas,
effects, approvals, typed handles, recovery rules, targets, summaries, and
operational aliases. `surface identity`, `surface describe`, and
`surface search` therefore discover mechanism contracts without selecting a
research task.

The `zotero-bridge-cli` Skill is the complete operating contract for this
layer. Its `SKILL.md` defines the command loop, approval and handle behavior,
output recovery, and failure path without requiring a prose reference. It
directly links only the exhaustive source-generated command reference. Every
command card contains argv bindings, invocation/payload/result schemas,
pagination, effects and state-change facts, approval scope, handle
transitions, recovery, targets, aliases, and intent-search visibility.

This layer also exposes the local, read-only commands
`workflow agent-bundle inspect` and `workflow agent-result validate`. They
inspect or validate a handoff directory or ZIP without a Host Bridge
connection, approval, state change, or handle consumption. ZIP input is read
in place through bounded entry access and is never extracted into the
workspace.

## Generic: research-task contract

Generic contains the Minimum component and six independently executable
Skills:

| Skill | Responsibility |
| --- | --- |
| `zotero-library-agent` | Route one bounded request or compose a multi-stage request |
| `zotero-library-query` | Query and answer questions from the library with bounded evidence |
| `zotero-literature-acquisition` | Identify, prepare, and ingest literature through approved Host actions |
| `zotero-literature-analysis` | Produce and maintain structured literature analysis |
| `zotero-research-synthesis` | Build synthesis-oriented research outputs from verified sources |
| `zotero-library-curation` | Maintain metadata, organization, readiness, and library quality |

The coordinator selects exactly one task Skill for a single-domain request. It
orders task Skills for a multi-domain request, carries verified evidence across
the boundaries, owns Zotero-managed versus self-owned workflow policy, and
returns one final result. Its comprehensive model covers agent handoff,
Product/file/artifact evidence, and ordered research recovery. Each task Skill
obtains exact arguments, approval behavior, handles, and recovery details from
Minimum instead of duplicating them.

All six Skills produce `zotero-library-task.result.v1`. It requires `schema`,
`status`, and `summary`; `status` is `completed`, `canceled`, or `failed`.
Evidence, artifact paths, and diagnostics are optional structured arrays in
the same result. Runner final/pending envelopes remain runner transport rather
than business-result fields.

## Hosted: Hermes residency contract

Hermes adds a resident facet over Generic. Its formal entrypoint is
`scripts/zotero_librarian_service.py`, a one-pass command-line service used by
interactive operations and cron jobs. It owns the `state.sqlite` schema and
uses that database only as a rebuildable cache and journal; live Zotero and
Host Bridge state remain authoritative.

The service covers library indexing, workflow catalog refresh, watched-run
monitoring, notification synchronization, maintenance analysis, synthesis
attention, and scheduled operations. Every non-silent operation returns
`zotero-librarian.operation-receipt.v1` with `schema`, `operation`, `status`,
and `generatedAt`. Valid statuses are `unchanged`, `changed`, `attention`, and
`failed`; a failed receipt includes structured error data and exits nonzero.
A cron adapter may render an unchanged receipt as `[SILENT]`.

Default scheduled work may read, index, monitor, synchronize notifications,
analyze maintenance, and report. Workflow submission requires an interactive
request or an enabled named automation policy. Zotero apply-back continues to
require Host approval, and destructive maintenance requires a current human
decision.

The `zotero-librarian` Skill contains the executable resident workflow and
directly links three complete references: resident operations, automation
policy, and state/recovery. Resident operations documents every service
subcommand and receipt; automation policy owns provider, concurrency,
scheduling, maintenance, and interaction decisions; state/recovery owns cache
freshness, atomicity, handles, and uncertain outcomes. Its persona file
describes posture only; operating constraints stay in `SKILL.md`. Finite
research and self-owned workflow execution use inherited Generic policy.

## Governed Skill package contract

Every Skill published by the three surfaces follows the same package rule:

- Frontmatter `description` is one line, no longer than 240 Unicode code
  points, and states both capability and invocation condition.
- `SKILL.md` is the minimum complete executable contract: goal, inputs,
  workflow, hard constraints, completion condition, failure handling,
  reference-loading guidance, and—where scripts are used—LLM/script
  responsibilities plus command examples.
- Every file in `references/` is directly linked from `SKILL.md`. References
  provide complete decision domains, examples, and edge cases; they do not
  hide execution-critical constraints or consist of reminder fragments.
- Within one Skill package, every meaning has one normative owner. `SKILL.md`
  owns executable workflow and hard constraints; references extend it with
  deeper branches and examples instead of restating the same rule.
- Published instruction files describe only the current operating state.

The Host Bridge content gate checks the deterministic package structure and
reference reachability, current-state wording, and exact substantive prose
duplication. The semantic-surface review checks minimum completeness,
paraphrased duplication, reference coherence, and separation between layers.

## Semantic preservation

Large rewrites use the clean baseline pinned in the active OpenSpec change.
Repeated baseline wording is collapsed into unique semantic units, then every
goal, decision, procedure, constraint, evidence rule, completion condition,
failure path, recovery rule, example, and near miss is mapped to one current
owner or a complete generated equivalent. The redesigned effective surface
must be a semantic superset: no baseline unit may be unmapped or weakened into
a summary.

Implementation entities may be consolidated only after their behavior is
re-homed. The unified resident service therefore absorbs the former resident
helper capabilities; Generic absorbs finite self-owned workflow guidance; the
inline result contract absorbs portable task evidence; live workflow discovery
replaces a static catalog; and the generated command reference replaces
repeated command manuals while preserving all descriptor fields. Word and line
counts are not used as a proxy for semantic completeness.

## Human review mirror

`artifact/host-bridge-review/` is the Chinese human-review view of the three
surfaces. Its inventory resolves the same `host-bridge/surfaces.json` graph as
rendering and materialization. Each Markdown document is translated exactly
once under its owning surface: Minimum owns the CLI contract, Generic owns its
six research Skill packages, and Hermes owns only its profile-level documents
and resident Librarian Skill.

The mirror does not copy inherited translations. `INDEX.md` records each
surface's lineage and owned, inherited, and effective document counts, while
`PROVENANCE.json` records the manifest hash, candidate and latest-complete
release identities, source commit, per-file hashes, and protected Markdown
structure digests. Preparation freezes source bytes in an isolated staging
directory; finalization rejects source drift, validates the exact translated
set, generates the index, and atomically replaces the formal artifact. The
local release procedure requires the mirror consistency check after governed
Markdown changes and before an authorized dispatch.

## Rendering and release identity

Authored content lives in explicit source roots: `skills_src` for Skills,
`profiles_src` for Hermes, and dedicated renderer sources for generated
contracts. Generated roots, embedded descriptors, command references, and
published profiles are targets only; renderers never use a generated target as
an input template.

Each human surface version is `<CLI major>.<CLI minor>.<surface patch>`. The
surface patch belongs to its own layer. Exact bytes are identified alongside
that version by the CLI identity, transitive component digests, normalized
staged-payload digest, and release-set ID. The payload digest is calculated
from the final staged file set, with release-set metadata kept outside the
payload it identifies.

## Related documents

- [Host Bridge CLI manual](../host-bridge-cli.md): connection, command, output,
  and protocol details for the Minimum layer.
- [Capability registry](host-bridge-capability-registry.md): runtime
  capability declarations that feed Host Bridge mechanism exposure.
- [Host Bridge lifecycle and auth](host-bridge-lifecycle.md): embedded server
  lifecycle, network binding, authorization, and approval dispatch.
