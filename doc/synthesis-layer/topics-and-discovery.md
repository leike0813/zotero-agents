# Topics and Discovery

Topics are user-facing synthesis artifacts. They should remain stable unless the user updates them or their recorded sources fail source check.

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
- `discovery_status` and `candidate_count` summarize open/rejected discovery hints after the topic graph cascade described below.

The topic update action is always labeled `Update` in the UI. Its intent may still carry `updateScope`, `updateMode`, and `updateReason` such as `source_materials_incomplete`, `dirty`, or `discovery_candidates`, but the user-facing action label must not switch between `Update`, `Complete`, and `Repair/Rebuild`.

### Persisted Artifact State

Topic source readiness is persisted in `sidecar/artifact-state.json` under `data.topics[*].source_materials_status`. New writes must not write the old topic-row `coverage` field for source readiness.

Legacy artifact-state rows may contain `data.topics[*].coverage` from before the hard cut. Readers may map that legacy value to `source_materials_status` during migration or compatibility reads, but the next persisted state should contain only `source_materials_status`.

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

The cascade affects:

- Topics/Home list `candidate_count` and `discovery_status`;
- Topic Detail discovery hint list, which uses the same descendant scope and deduplicates by literature identity;
- persisted artifact discovery state refresh, including ancestor topics when a child topic's hints change.

Accepting a suggested topic graph relation as `confirmed` may therefore change discovery counts for the accepted edge's source topic and its confirmed ancestors. Rejecting a relation must not add descendant candidates to a parent.

Discovery cascade does not imply that parent topic content has consumed child candidates. It only exposes possible update work. Topic update remains an explicit workflow action.

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
- `rejected`: user explicitly rejected it and does not want it resurfaced casually;
- `superseded`: the target identity disappeared, was redirected, or the hint basis is no longer meaningful.

Rejected hints are durable suppressions. Digest rerun, metadata hash drift, cache refresh, or adding a minor key term must not automatically reopen the same topic-literature pair.

Discovery hints do not model topic update consumption. Topic update has its own source-selection and workflow apply mechanism. If an update later uses literature that also had an open hint, the hint may remain open until the hint basis is repaired or superseded; it must not be treated as proof that the topic artifact consumed that source.

Allowed reopen conditions:

- user explicitly restores a rejected hint;
- user resets rejected hints;
- explicit debug/maintenance repair runs with a force option.

## Review and Overrides

User decisions should solve practical information-loss anxiety, not become an enterprise audit ledger.

- Keep durable effects directly understandable: rejected hint, user-confirmed source, user-ignored source.
- Store enough evidence to explain the decision in UI.
- Avoid requiring users to inspect hashes or low-level precondition blobs.
- If the target object disappears, show a compact review item or diagnostic instead of silently discarding the user decision.
