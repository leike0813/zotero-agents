# Topics and Discovery

Topics are user-facing synthesis artifacts. They should remain stable unless the user updates them or their recorded sources fail source check.

Before an artifact exists, Topic Planner may create a Planned Topic in the Topic Graph. This placeholder has a stable identity, definition, aliases, scope, resolver, revision, basis, provenance, and `planned` or `stale` lifecycle. It has no provisional paper-membership snapshot and is not a topic artifact. Active Planned Topics can be materialized by Create Topic Synthesis; the workflow reruns the stored resolver and keeps the same Topic ID. Stale Planned Topics remain visible to planning reads but are excluded from the Create workflow selector.

An ad-hoc Create seed also resolves against the complete topic inventory before a new identity is created. A materialized same-identity Topic cancels the run; otherwise, the best active Planned Topic whose definition and scope directly match the seed is materialized automatically. Related, broader, narrower, stale, or scope-incompatible Topics are not substitutes. Runtime re-reads the selected Planned Topic before resolver execution and cancels on concurrent lifecycle or definition loss instead of falling back to a duplicate ad-hoc Topic.

Planner reconciliation covers the whole current library and applies all placeholder and relation changes atomically against the Topic Graph hash. A concurrent graph change rejects the whole plan. A library-index change can leave the graph reconciliation valid while marking its coverage result stale. Materialized Topics are read-only to Planner; update recommendations go through Update Topic Synthesis. Separate materialization runs may execute in parallel after the shared plan has established their identities and relation proposals.

## Topic Artifacts

A topic artifact owns:

- topic definition and scope;
- structured synthesis content;
- manifest and sidecar references;
- source dependency records;
- source check result;
- user review and override state relevant to the topic.

Topic create/update reads Zotero Library and derived artifacts directly through the workflow/Host Bridge path. Citation graph metrics may be included as optional context, but graph availability and cache freshness must not be required for topic generation.

## Workflow Manifest and Sidecars

Topic synthesis apply uses the final analysis manifest as the canonical sidecar index. The final result bundle should point to `analysis_manifest_path`; host apply reads `manifest.sidecars` from there.

Canonical sidecars:

- `topic_interest_metadata`: discovery profile; not a human-readable topic section.
- `concept_cards_proposal`: Concept KB proposal input.
- `topic_graph_relation_proposals`: Topic Graph review proposal input.

Legacy top-level sidecar path fields may be tolerated for old runs, but new contracts should prefer manifest sidecar entries. Topic apply should also record the topic source manifest / dependency baseline that later source checks compare against current library and artifact state.

## Source Check and Freshness

Source check compares a topic artifact’s recorded source dependencies with current Zotero Library / source artifact hashes and availability. It must use direct reads or a source facade that reads current Zotero/artifact state, not a sidecar index row as truth.

- Fresh means the recorded sources still match.
- Changed means at least one recorded source changed, disappeared, or became unreadable.
- Reference sidecar refresh or graph cache refresh alone does not mark a topic changed if library and artifacts did not change.
- Deleted or merged papers do not silently rewrite topic content. They may produce diagnostics or review items.
- The comparison boundary is the saved source manifest / dependency baseline versus the current Host Library / Artifact Facade output.
- Source check is explicit user, maintenance, or debug work. Cache refresh and graph refresh must not silently run it.

## Research Coverage

Research coverage is diagnostic. It answers what the topic artifact used and omitted at generation time. It should not be confused with discovery or source-material readiness.

Examples:

- A topic may be fresh but have narrow research coverage because it was intentionally scoped.
- A topic may have discovery hints while still fresh.
- A topic may have changed source-check diagnostics because a used source artifact changed, even if discovery has no new candidates.

## Source Materials

`Source Materials` is the topic-list readiness metric for source artifacts. It is a read-model diagnostic, not stored topic prose, not research coverage, and not topic content completeness.

- `source_materials_status` is dependency artifact readiness (`digest`, `references`, `citation_analysis`) for the topic source set.
- `source_materials_percent` is the percentage of current topic paper refs whose required source artifacts are complete. If the topic has no paper refs, a complete source-material state maps to `100`, otherwise missing/partial source-material state maps to `0`.
- `freshness` is source-check freshness. It compares the saved dependency baseline with the current Zotero/artifact state and does not depend on reference sidecar or graph cache freshness.
- `discovery_status` and `candidate_count` summarize open discovery hints after the topic graph cascade described below.

The topic update action is always labeled `Update` in the UI. Its intent may still carry `updateScope`, `updateMode`, and `updateReason` such as `source_materials_incomplete`, `dirty`, or `discovery_candidates`, but the user-facing action label must not switch between `Update`, `Complete`, and `Repair/Rebuild`. A discovery-driven intent uses `update_full`, because candidate acceptance changes the persisted source-paper set rather than one isolated content section.

### Persisted Artifact State

The native Topic application owns source readiness in the Topic projection row in `state/synthesis.db`. The projection records the saved/current paper refs, the required `digest`, `references`, and `citation_analysis` availability and hashes, the baseline/current dependency hashes, and scan timestamps. `freshness`, `source_materials_status`, and `source_materials_percent` are derived from those facts for Home and Topics; they are not independent facts and are not supplied by Workbench defaults.

Topic apply establishes a new baseline after the Topic aggregate commits. Bounded Topic reads compare current Reference artifact facts with that baseline without writing repository state. Existing Topic rows that predate the native readiness projection use the current complete dependency set as a deterministic read-only baseline; incomplete evidence is reported as dirty with `readiness_baseline_missing` until the next successful Topic apply establishes a persisted baseline.

`sidecar/artifact-state.json` is legacy migration input only. Production Workbench and Topic update routing do not read or write it.

This migration applies only to topic source readiness read-model state. It must not rename or rewrite:

- topic artifact research coverage sections such as `sections/coverage.json` or `artifact.json.coverage`;
- manifest section entries named `coverage`;
- Index / Registry artifact coverage fields such as `artifactCoverage` or `literature-registry-index.json` row coverage.

## Discovery

Discovery is best effort. It helps users notice possibly relevant new or changed literature, but it is not a correctness guarantee.

The default direction is apply-time token overlap. Discovery does not require a fully synchronized library index:

- When a literature digest artifact is applied, the plugin computes lightweight topic-discovery hints for that literature against existing topics.
- Matching uses topic interest metadata and literature matching metadata as unbounded LLM-generated semantic descriptors.
- The v1 matcher is `discovery.apply_time_token_overlap.v1`: lightweight, permissive, explainable token/phrase overlap over the existing metadata fields.
- Embeddings, BM25, semantic search providers, and LLM pairwise judges are not part of the default path.
- The system must not run global n x m LLM judging.

### Topic Graph Candidate Cascade

Discovery candidate counts are topic-graph aware in the read model. A higher-level topic includes candidates from lower-level topics only through confirmed hierarchy relations:

- A hierarchy edge is `broader_than`.
- The edge direction is `source_topic_id broader_than target_topic_id`; source is the broader parent and target is the narrower child.
- Only `status = confirmed` hierarchy edges participate in discovery cascade.
- `suggested`, `rejected`, `stale`, `deleted`, and non-hierarchy relations do not contribute to parent candidate counts.
- Cascade is transitive. A parent counts candidates from its confirmed children, grandchildren, and deeper descendants.
- Candidate counting is deduplicated by `literature_item_id` across the parent and all participating descendants.
- If the same literature is open for both parent and child, it counts once.
- An open hint wins over a rejected duplicate for the same literature identity when deriving aggregate `discovery_status`.

Topic Graph projection placement is a separate rebuildable concern. The
environment-neutral Topic Graph index engine derives sorted root and unplaced
topic identifiers from bounded node/edge DTOs. It does not own this confirmed
hierarchy cascade, proposal/review decisions, graph mutations, or Workbench
search and neighborhood filtering.

The cascade affects:

- Topics/Home list `candidate_count` and `discovery_status`;
- Topic Detail discovery hint list, which uses the same descendant scope and deduplicates by literature identity;
- persisted artifact discovery state refresh, including ancestor topics when a child topic's hints change.

Accepting a suggested topic graph relation as `confirmed` may therefore change discovery counts for the accepted edge's source topic and its confirmed ancestors. Rejecting a relation must not add descendant candidates to a parent.

Discovery cascade does not imply that parent topic content has consumed child candidates. It only exposes possible update work. Topic update remains an explicit workflow action.

The Rust production Topic Graph application owns graph/review facts, the
last-good index, and the discovery cascade. It coordinates Topic and Concept
updates in the production repository while current Zotero/artifact facts remain
Host-owned and enter through bounded reverse-Host reads.

Topic create/update materialization uses the bounded Topic Structured Artifact
engine for manifest validation, section-patch CAS/merge, artifact assembly, and
deep content validation. The engine does not read run-workspace files, resolve
digest locators against current literature artifacts, compute canonical hashes,
write topic current assets, or apply Concept KB, Topic Graph, interest metadata,
or discovery effects. Those application-owned steps run only after strict
engine result rebuilding succeeds.

### Update Source Membership

Update preparation treats open discovery hints as a separate, bounded membership channel:

- at most 25 deduplicated candidates enter one run; remaining open hints stay available for later updates;
- the stored/proposed topic resolver is resolved unchanged as the base set;
- candidate paper refs are resolved independently with a `paper_refs` union resolver, so the base resolver's intersection mode cannot suppress candidate triage;
- Stage 30 reads the combined workset and admits candidate papers classified `core` or `related`;
- `external`, `irrelevant`, and `unknown` candidates are screened out, while every base-resolver paper remains in the effective set;
- the resolver manifest records base refs, candidate hint IDs and bases, unresolved refs, triage outcomes, accepted additions, screened refs, and effective refs.

Host apply commits these exact hint outcomes only after topic validation, CAS checks, and canonical writes succeed. A conflict or failed apply leaves discovery rows unchanged.

## Metadata Snapshot Semantics

Discovery reads committed metadata snapshots:

- `literature_matching_metadata` is written by literature-analysis apply before discovery scoring for that literature starts.
- `topic_interest_metadata` is written by topic create/update apply before future digest apply matching can see it.
- If topic update and digest apply interleave, discovery uses whichever committed topic metadata version is visible when the discovery transaction reads. It must not read half-written topic metadata.
- If topic metadata changes during a digest apply match, the current match may finish against the older committed topic version; the next digest apply or explicit discovery repair can use the newer version.
- Topic metadata version/hash should be recorded on each discovery hint so the UI/debug view can explain which topic profile produced the hint.

Topic update does not backscan old literature. If users want old literature rechecked after a topic profile change, they must run explicit bounded discovery repair.

Sidecar/cache freshness does not change discovery semantics. A stale graph or reference cache may hide optional graph metrics, but it must not open, reject, or reopen discovery hints by itself.

## Apply-Time Token Overlap

The matcher consumes semantic metadata that was already generated by the digest/topic workflows. The semantic work is in the metadata generation step; discovery itself stays cheap.

Default policy: `discovery.apply_time_token_overlap.v1`.

### Normalization

All fields use the same normalization:

- Unicode NFKC;
- lowercase;
- strip punctuation, hyphen noise, and extra spaces;
- preserve phrase boundaries;
- drop very short tokens and policy stopwords. Default global stopwords include cross-domain generic words such as `model`, `method`, `learning`, and `analysis`; domain-specific stopwords belong to the policy version.

### Field Sets

Topic metadata:

- `T_required = must_have_terms`
- `T_include = include_terms`
- `T_methods = methods`
- `T_exclude = exclude_terms`
- `T_seed = seed_source_refs`

Literature metadata:

- `L_terms = key_terms`
- `L_methods = methods`
- `L_problems = problems`
- `L_datasets = datasets`
- `L_title_tags = title + tags`
- `L_exclude = exclude_terms`

### Hard Rejects

Do not write a hint when:

1. `T_exclude` hits `L_terms/L_methods/L_problems/L_datasets/L_title_tags`;
2. `L_exclude` hits `T_required/T_include/T_methods`;
3. `T_required` is non-empty and no required term, method, or seed relation matches.

### Score Formula

Let `hit(A, B)` count deduplicated normalized phrase hits from A in B, capped by the denominator below.

```text
must_score    = hit(T_required, L_terms + L_problems + L_title_tags) / max(1, min(|T_required|, 3))
include_score = hit(T_include,  L_terms + L_problems)                / max(1, min(|T_include|, 8))
method_score  = hit(T_methods,  L_methods)                           / max(1, min(|T_methods|, 4))
weak_score    = hit(T_include + T_methods, L_datasets + L_title_tags) / max(1, min(|T_include| + |T_methods|, 8))

score =
  2.0 * must_score
+ 1.5 * include_score
+ 1.2 * method_score
+ 0.8 * weak_score

normalized_score = score / active_weight_sum
```

`active_weight_sum` is:

```text
(T_required non-empty ? 2.0 : 0)
+ (T_include non-empty ? 1.5 : 0)
+ (T_methods non-empty ? 1.2 : 0)
+ (weak_component_active ? 0.8 : 0)

weak_component_active =
  (T_include or T_methods non-empty)
  and policy enables weak component
  and literature has comparable L_datasets or L_title_tags
```

If a topic only has `include_terms` and the target literature has no comparable weak fields, `active_weight_sum = 1.5`; if weak fields are available, it is `2.3`. Debug output and experiment reports must record active components so a score is explainable.

Seed literature does not bypass exclude hard rejects. If a pair is not hard-rejected and the literature is a topic seed, `normalized_score` is raised to at least `policy.seed_min_score`, default `0.8`.

### Thresholds and Limits

- `normalized_score >= policy.min_open_score`: write an `open` discovery hint. Default `min_open_score = 0.25`.
- `< 0.25`: do not write a hint.
- Per literature-analysis apply, write at most `policy.top_per_literature` topic hints. Default `5`.
- Per topic UI, show at most `policy.top_per_topic_ui` open hints by default. Default `20`.
- Store at most 3 short user-facing reasons, such as `matched required term: object tracking`.

Changing weights, thresholds, stopwords, or top-k requires a new policy version and fixture/manual review evidence. It does not change the metadata persistence contract.

Normal digest apply is `O(T)` for one literature item against active topics. `O(T * N)` discovery repair is explicit debug/maintenance work only. Topic create/update changes future matching metadata but does not backscan old literature. Low-score matches are ignored, not sent to review.

If literature matching metadata is missing, the system may use title/tags/digest summary as a low-confidence fallback. This fallback should be conservative, clearly marked with `fallback_metadata=true`, and bounded separately:

- fallback hints use at most half the normal `min_open_score` relaxation budget; the default remains `min_open_score = 0.25`, so fallback should not open below `0.25`;
- fallback hints must carry a reason such as `fallback:title_tags_summary`;
- fallback noise should be measured in fixture/manual review when available;
- if fallback produces too many noisy hints, disable fallback for that artifact type rather than raising global discovery thresholds.

## Discovery Candidate Lifecycle

Discovery hints may be:

- `open`: visible suggestion not yet acted on;
- `accepted`: a successful topic apply admitted the candidate into source membership;
- `screened_out`: Stage 30 excluded the candidate under a recorded evidence basis and triage reason;
- `rejected`: user explicitly rejected it and does not want it resurfaced casually;
- `superseded`: the target identity disappeared, was redirected, or the hint basis is no longer meaningful.

`accepted` and `rejected` are durable terminal states. `screened_out` remains terminal while its basis is unchanged; a changed topic metadata hash, literature metadata hash, discovery profile, or policy basis reopens it for semantic triage. Cache-only freshness changes do not affect this basis.

Allowed reopen conditions:

- user explicitly restores or resets a rejected hint;
- the evidence basis of a screened-out hint changes;
- explicit debug/maintenance repair runs with a force option.

## Review and Overrides

User decisions should solve practical information-loss anxiety, not become an enterprise audit ledger.

- Keep durable effects directly understandable: rejected hint, user-confirmed source, user-ignored source.
- Store enough evidence to explain the decision in UI.
- Avoid requiring users to inspect hashes or low-level precondition blobs.
- If the target object disappears, show a compact review item or diagnostic instead of silently discarding the user decision.
