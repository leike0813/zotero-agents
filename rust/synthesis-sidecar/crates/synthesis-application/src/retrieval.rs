//! Optional semantic retrieval over existing eligible sources.
//!
//! The application owns one local derived index per data root. It reads
//! library sources through the existing EvidenceSourcePort, canonical Topic
//! sections through TopicCanonicalPort, and never resolves Zotero identity or
//! local file paths itself. Vectors arrive from the Host through
//! RetrievalEmbeddingPort; this module keeps the original little-endian
//! float32 values as the ranking authority and persists them through the
//! repository's local derived retrieval facts.
//!
//! Ranking is exact cosine recomputed from original float32 values with
//! sequential float64 accumulation cast back to float32. Best fragment per
//! portable identity is aggregated before fusion, and stable identity breaks
//! ties. Original vectors, source versions, UTF-16 ranges and fragment
//! identity are durable; no normalized acceleration is stored here.

use crate::evidence_search::{EvidenceSourcePort, ItemRef, SourceKind};
use crate::ports::{RepositoryPort, TopicCanonicalPort};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::CanonicalTopicSearchMember;
use synthesis_repository::{
    RetrievalFragmentRecord, RetrievalGroupRecord, RetrievalPromotion, RetrievalPublicationRecord,
};

/// Largest accepted encoding dimension. Research model maxima are smaller;
/// this is a transport bound, not a claimed model capacity.
pub const RETRIEVAL_MAX_VECTOR_DIMENSIONS: usize = 16_384;
/// One fragment's bound in UTF-16 code units. Splitting never crosses a
/// surrogate pair.
pub const RETRIEVAL_MAX_FRAGMENT_UTF16: usize = 2_048;
/// Bound for one scoped invalidation request, matching the shared
/// `RetrievalInvalidateRequest.paperRefs` schema.
pub const RETRIEVAL_MAX_SCOPED_IDS: usize = 256;
/// Bound for one full catalog sweep. The Host pages to completion; this only
/// stops a runaway enumeration.
const RETRIEVAL_MAX_SOURCES: usize = 100_000;
/// Fragments encoded per Host batch.
const RETRIEVAL_ENCODE_BATCH: usize = 32;
const RETRIEVAL_FRAGMENT_QUERY_BATCH: usize = 256;
const RETRIEVAL_MAX_MODEL_ID_UTF16: usize = 512;
const RETRIEVAL_MAX_PREFIX_UTF16: usize = 256;
const RETRIEVAL_MAX_MODEL_BYTES: usize = 262_144;
const RETRIEVAL_QUERY_LIFETIME_MS: u64 = 30_000;
const RETRIEVAL_BUILD_LIFETIME_MS: u64 = 60_000;

/// Reverse-Host embedding capability. Describe performs no network call and
/// reports the identity only after an explicit synthetic connection test;
/// encode receives bounded text and returns bounded original vectors. Both use
/// the shared wire contract definitions, not private Rust types.
pub trait RetrievalEmbeddingPort: Send + Sync {
    fn describe(&self) -> Result<Value, String>;
    fn encode(&self, request: Value) -> Result<Value, String>;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RetrievalBuildMode {
    /// Explicit full build/rebuild: a fresh or compatible staging target is
    /// completed before an atomic publication.
    Full,
    /// Scoped incremental update of the current active publication. Unchanged
    /// ready groups stay available.
    Increment,
}

/// Wire encoding identity. Address, credentials and connection identity never
/// bind vectors.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EncodingIdentity {
    pub model_id: String,
    pub dimensions: usize,
    pub query_prefix: String,
    pub document_prefix: String,
}

impl EncodingIdentity {
    fn validate(&self) -> Result<(), String> {
        // modelId follows the shared identifier pattern (no control
        // characters). Prefixes are ordinary bounded text: instruction-tuned
        // models use prefixes that contain newlines, so only the UTF-16 bound
        // applies to them.
        let identifier = |value: &str| {
            !value.is_empty()
                && !value.chars().any(char::is_control)
                && value.encode_utf16().count() <= RETRIEVAL_MAX_MODEL_ID_UTF16
        };
        let prefix = |value: &str| value.encode_utf16().count() <= RETRIEVAL_MAX_PREFIX_UTF16;
        if !identifier(&self.model_id)
            || self.dimensions == 0
            || self.dimensions > RETRIEVAL_MAX_VECTOR_DIMENSIONS
            || !prefix(&self.query_prefix)
            || !prefix(&self.document_prefix)
        {
            return Err("invalid_request".into());
        }
        Ok(())
    }
}

/// Hard retrieval scope. Topics are separate from the Evidence vocabulary and
/// controlled by includeTopics.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RetrievalScope {
    pub library_ids: Vec<u64>,
    pub source_kinds: Vec<SourceKind>,
    pub include_topics: bool,
}

impl RetrievalScope {
    fn validate(&self) -> Result<(), String> {
        let mut libraries = BTreeSet::new();
        let mut kinds = BTreeSet::new();
        if self.library_ids.len() > 100
            || self
                .library_ids
                .iter()
                .any(|id| *id == 0 || *id > 9_007_199_254_740_991)
            || !self.library_ids.iter().all(|id| libraries.insert(*id))
            // `sourceKinds` is a closed, nonempty set: an empty array is a
            // malformed request, never an implicit "all kinds".
            || self.source_kinds.is_empty()
            || self.source_kinds.len() > 3
            || !self.source_kinds.iter().all(|kind| kinds.insert(*kind))
            || self.library_ids.is_empty() && !self.include_topics
        {
            return Err("invalid_request".into());
        }
        Ok(())
    }

    fn evidence_kinds(&self) -> Vec<SourceKind> {
        self.source_kinds.clone()
    }
}

/// One ranked evidence fragment over the current active publication. Carries
/// the full portable identity plus its original UTF-16 range. Exactly one of
/// `item_ref` and `topic` is present: Topic sections are not Zotero items and
/// are never given a fabricated portable identity.
#[derive(Clone, Debug, PartialEq)]
pub struct ScoredFragment {
    pub item_ref: Option<ItemRef>,
    pub topic: Option<RetrievalTopicRef>,
    pub item_identity: String,
    pub library_id: i64,
    pub group_id: String,
    pub fragment_id: String,
    pub source_json: String,
    pub source_version: String,
    pub range_start: i64,
    pub range_end: i64,
    pub location_json: String,
    pub score: f32,
}

/// Canonical Topic section reference. Topics are not Zotero items, so query
/// results carry typed fields instead of a fabricated portable `ItemRef`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetrievalTopicRef {
    pub topic_id: String,
    pub path_id: String,
    pub section: String,
}

/// One ranked Topic section fragment over the current active publication.
#[derive(Clone, Debug, PartialEq)]
pub struct ScoredTopicFragment {
    pub topic: RetrievalTopicRef,
    pub item_identity: String,
    pub group_id: String,
    pub fragment_id: String,
    pub source_json: String,
    pub source_version: String,
    pub range_start: i64,
    pub range_end: i64,
    pub location_json: String,
    pub score: f32,
}

/// Ranked best-fragment result bound to one active publication basis.
#[derive(Clone, Debug, PartialEq)]
pub struct RetrievalQueryOutcome {
    pub publication: String,
    pub results: Vec<ScoredFragment>,
    pub issues: Vec<Value>,
    pub limited: bool,
}

pub struct RetrievalApplication {
    pub(crate) repository: Arc<RepositoryPort>,
    pub(crate) sources: Arc<dyn EvidenceSourcePort>,
    pub(crate) embeddings: Arc<dyn RetrievalEmbeddingPort>,
    pub(crate) canonical: Arc<dyn TopicCanonicalPort>,
    pub(crate) clock: Arc<dyn Fn() -> String + Send + Sync>,
}

impl RetrievalApplication {
    pub fn new(
        repository: Arc<RepositoryPort>,
        sources: Arc<dyn EvidenceSourcePort>,
        embeddings: Arc<dyn RetrievalEmbeddingPort>,
        canonical: Arc<dyn TopicCanonicalPort>,
    ) -> Self {
        Self {
            repository,
            sources,
            embeddings,
            canonical,
            clock: Arc::new(synthesis_protocol::utc_now_iso8601),
        }
    }

    /// Override the wall clock used for publication timestamps (tests only).
    pub fn with_clock(mut self, clock: Arc<dyn Fn() -> String + Send + Sync>) -> Self {
        self.clock = clock;
        self
    }

    /// retrieval.getState: observable nonsecret state and progress.
    pub fn state(&self) -> Result<Value, String> {
        let state = self
            .repository
            .with_reader(|repository| repository.get_retrieval_state())?
            .unwrap_or_default();
        let target = if !state.pending_publication_id.is_empty() {
            state.pending_publication_id.clone()
        } else {
            state.active_publication_id.clone()
        };
        let counts = if target.is_empty() {
            BTreeMap::new()
        } else {
            self.repository
                .with_reader(|repository| repository.count_retrieval_group_statuses(&target))?
        };
        let completed_groups = counts.get("ready").copied().unwrap_or_default();
        let failed_groups = counts.get("failed").copied().unwrap_or_default();
        let missing_groups = counts.get("missing").copied().unwrap_or_default();
        let total_groups = counts.values().copied().sum::<i64>();
        // Counts only: state polling must never materialize stored vectors.
        let completed_fragments = if target.is_empty() {
            0
        } else {
            self.repository
                .with_reader(|repository| repository.count_retrieval_fragments(&target))?
        };
        // The Host owns live embedding availability. Its absence disables
        // enhancement without deleting the durable index, so report the
        // disabled fallback instead of failing the read.
        let host_ready = self
            .embeddings
            .describe()
            .ok()
            .and_then(|described| described.get("enabled").and_then(Value::as_bool))
            .unwrap_or(false);
        let mut issues = Vec::new();
        if !host_ready && !state.active_publication_id.is_empty() {
            issues.push(json!({"code": "vector_unavailable", "sourceKind": Value::Null, "affectedCount": 1}));
        }
        let parse = |text: &str| -> Option<Value> {
            if text.is_empty() {
                None
            } else {
                serde_json::from_str(text).ok()
            }
        };
        let publication = if state.status == "ready" {
            self.publication_basis()?
                .map(Value::String)
                .unwrap_or(Value::Null)
        } else if state.active_publication_id.is_empty() {
            Value::Null
        } else {
            json!(state.active_publication_id)
        };
        Ok(json!({
            "enabled": host_ready,
            "status": state.status,
            "activeIdentity": parse(&state.active_identity_json),
            "pendingIdentity": parse(&state.pending_identity_json),
            "activeScope": parse(&state.active_scope_json),
            "pendingScope": parse(&state.pending_scope_json),
            "publication": publication,
            "progress": {
                "completedGroups": completed_groups,
                "totalGroups": total_groups,
                "completedFragments": completed_fragments,
                "failedGroups": failed_groups,
                "missingGroups": missing_groups,
            },
            "updatedAt": if state.updated_at.is_empty() {
                Value::Null
            } else {
                json!(state.updated_at)
            },
            "issues": issues,
        }))
    }

    /// retrieval.build / retrieval.rebuild: explicit full maintenance.
    pub fn build(
        &self,
        request: Value,
        mode: RetrievalBuildMode,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        self.execute(request, mode, checkpoint)
    }

    /// retrieval.update: scoped incremental maintenance of the active index.
    pub fn update(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        self.build(request, RetrievalBuildMode::Increment, checkpoint)
    }

    /// Native maintenance entry point. `kind` is `build`, `rebuild` or
    /// `update`. Success reports `{status, issues}` where `status` is
    /// `promoted` (a publication was committed or rotated) or `unchanged` (no
    /// durable change). A failed build is an error, never a paused success.
    pub fn maintain(
        &self,
        kind: &str,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let mode = match kind {
            "build" | "rebuild" => RetrievalBuildMode::Full,
            "update" => RetrievalBuildMode::Increment,
            _ => return Err("invalid_request".into()),
        };
        self.execute(request, mode, checkpoint)
    }

    /// retrieval.getState: observable nonsecret state and progress.
    pub fn get_state(&self) -> Result<Value, String> {
        self.state()
    }

    /// Round-continuation basis: the exact publication token a caller froze.
    /// Consumers bind their cursor to this without encoding anything.
    pub fn publication_basis(&self) -> Result<Option<String>, String> {
        let described = self.embeddings.describe().ok();
        self.repository.with_reader(|repository| {
            let state = repository.get_retrieval_state()?.unwrap_or_default();
            if !state.enabled
                || state.status != "ready"
                || state.active_publication_id.is_empty()
                || described
                    .as_ref()
                    .and_then(|value| value["enabled"].as_bool())
                    != Some(true)
            {
                return Ok(None);
            }
            let groups = repository.list_retrieval_groups(&state.active_publication_id)?;
            let groups = groups
                .iter()
                .map(|group| json!([group.group_id, group.source_version, group.status]))
                .collect::<Vec<_>>();
            Ok(Some(hash(&json!([
                state.active_publication_id,
                state.active_identity_json,
                state.active_scope_json,
                state.updated_at,
                groups,
                true
            ]))))
        })
    }

    /// Suspend one already-published source group so Evidence can stop serving
    /// a source it observed changing, without a scan or any encoding.
    pub fn suspend_group(&self, publication: &str, group_id: &str) -> Result<Value, String> {
        if publication.is_empty() || group_id.is_empty() {
            return Err("invalid_request".into());
        }
        self.repository.with_writer(|repository| {
            let state = repository.get_retrieval_state()?.unwrap_or_default();
            if state.active_publication_id != publication {
                return Err("basis_mismatch".into());
            }
            repository.set_retrieval_group_status(publication, group_id, "suspended")
        })?;
        Ok(json!({"status": "suspended"}))
    }

    /// retrieval.invalidate: suspend only the named portable identities. No
    /// source scan and no encoding happen here.
    pub fn invalidate(&self, request: Value) -> Result<Value, String> {
        let request: InvalidateRequest = parse_request(request)?;
        if request.paper_refs.is_empty()
            || request.paper_refs.len() > RETRIEVAL_MAX_SCOPED_IDS
            || request.paper_refs.iter().any(|item| !valid_item_ref(item))
            || request.paper_refs.iter().collect::<BTreeSet<_>>().len() != request.paper_refs.len()
        {
            return Err("invalid_request".into());
        }
        let state = self
            .repository
            .with_reader(|repository| repository.get_retrieval_state())?
            .unwrap_or_default();
        let publication = if !state.active_publication_id.is_empty() {
            state.active_publication_id.clone()
        } else {
            state.pending_publication_id.clone()
        };
        if publication.is_empty() {
            return Ok(json!({"invalidatedGroups": 0}));
        }
        let mut identities = request
            .paper_refs
            .iter()
            .map(|item| format!("{}:{}", item.library_id, item.key))
            .collect::<Vec<_>>();
        identities.sort();
        identities.dedup();
        let suspended = self.repository.with_writer(|repository| {
            repository.suspend_retrieval_groups_for_items(&publication, &identities)
        })?;
        Ok(json!({"invalidatedGroups": suspended}))
    }

    /// retrieval.cleanup: explicit required tail after publication. A cleanup
    /// failure keeps the new index available and leaves the replaced facts
    /// removable later.
    pub fn cleanup(&self, checkpoint: &dyn Fn() -> Result<(), String>) -> Result<Value, String> {
        checkpoint()?;
        let pending = self
            .repository
            .with_reader(|repository| repository.list_retrieval_cleanup_pending())?;
        let mut cleaned = 0usize;
        let mut issues = Vec::new();
        for publication in pending {
            if checkpoint().is_err() {
                push_issue(&mut issues, "vector_unavailable", None);
                break;
            }
            match self
                .repository
                .with_writer(|repository| repository.finalize_retrieval_cleanup(&publication))
            {
                Ok(()) => cleaned += 1,
                Err(_) => push_issue(&mut issues, "vector_unavailable", None),
            }
        }
        Ok(json!({"status": "cleaned", "cleaned": cleaned, "issues": issues}))
    }

    fn execute(
        &self,
        request: Value,
        mode: RetrievalBuildMode,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let request: MaintenanceRequest = parse_request(request)?;
        request.identity.validate()?;
        request.scope.validate()?;
        let identity_json =
            serde_json::to_string(&request.identity).map_err(|_| "invalid_request".to_owned())?;
        let scope_json =
            serde_json::to_string(&request.scope).map_err(|_| "invalid_request".to_owned())?;
        let now = (self.clock)();
        match mode {
            RetrievalBuildMode::Full => {
                self.run_full(&request, &identity_json, &scope_json, &now, checkpoint)
            }
            RetrievalBuildMode::Increment => {
                self.run_increment(&request, &identity_json, &scope_json, &now, checkpoint)
            }
        }
    }

    /// Scored best-fragment query over the current active publication basis.
    /// Returns retrieval_unavailable when no compatible ready index exists so
    /// the caller keeps its independent lexical behavior. Evidence fragments
    /// and, when `includeTopics` is set, Topic section fragments are scored in
    /// one pass; a Topic fragment carries typed identity, never a fabricated
    /// portable `ItemRef`.
    pub fn query(&self, request: Value) -> Result<RetrievalQueryOutcome, String> {
        self.query_with_checkpoint(request, &|| Ok(()))
    }

    /// Cancellable, deadline-bounded form of `query`. The checkpoint is polled
    /// between scoring steps so a caller can stop a long exact scan.
    pub fn query_with_checkpoint(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<RetrievalQueryOutcome, String> {
        self.query_eligible(request, None, checkpoint)
    }

    /// Private scoped form used by the Library and Evidence owners. Identities
    /// outside `eligible` are intersected before any scoring, so the hard scope
    /// is complete without rebuilding refs into the bounded public DTO. The
    /// public query DTO bounds are unchanged and only one encode happens.
    pub(crate) fn query_scoped(
        &self,
        request: Value,
        eligible: &BTreeSet<String>,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<RetrievalQueryOutcome, String> {
        self.query_eligible(request, Some(eligible), checkpoint)
    }

    fn query_eligible(
        &self,
        request: Value,
        eligible: Option<&BTreeSet<String>>,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<RetrievalQueryOutcome, String> {
        let request: QueryRequest = parse_request(request)?;
        request.validate()?;
        let state = self
            .repository
            .with_reader(|repository| repository.get_retrieval_state())?
            .unwrap_or_default();
        if !state.enabled || state.status != "ready" || state.active_publication_id.is_empty() {
            return Err("retrieval_unavailable".into());
        }
        let Ok(identity) = serde_json::from_str::<EncodingIdentity>(&state.active_identity_json)
        else {
            return Err("retrieval_unavailable".into());
        };
        // The Host describes the live embedding capability. When enhancement is
        // disabled, do not encode. Encode selects a compatible service for the
        // active identity, independently of the Host's pending target.
        let described = self
            .embeddings
            .describe()
            .map_err(|_| "retrieval_unavailable".to_owned())?;
        if described.get("enabled").and_then(Value::as_bool) != Some(true) {
            return Err("retrieval_unavailable".into());
        }
        let deadline = request
            .deadline_at_ms
            .unwrap_or_else(|| now_millis() + RETRIEVAL_QUERY_LIFETIME_MS);
        checkpoint()?;
        if now_millis() > deadline {
            return Err("operation_timeout".into());
        }
        let query_vector = self.encode_query(&identity, &request.query, deadline)?;
        let publication = state.active_publication_id.clone();

        // Hard scope first: distinct ready evidence groups for the requested
        // libraries/kinds, plus Topic groups only when requested. No fragment
        // is ever loaded for a group that is out of scope.
        let active_scope: Option<RetrievalScope> =
            serde_json::from_str(&state.active_scope_json).ok();
        let library_ids = request
            .library_ids
            .clone()
            .or_else(|| active_scope.as_ref().map(|scope| scope.library_ids.clone()))
            .unwrap_or_default();
        let kinds = request.source_kinds.clone().unwrap_or_else(|| {
            vec![
                SourceKind::Metadata,
                SourceKind::Fulltext,
                SourceKind::Analysis,
            ]
        });
        let include_topics = request.include_topics.unwrap_or(false);
        let mut groups = Vec::new();
        let mut seen_groups = BTreeSet::new();
        if !library_ids.is_empty() && !kinds.is_empty() {
            let library_ids = library_ids.iter().map(|id| *id as i64).collect::<Vec<_>>();
            let kind_names = kinds
                .iter()
                .map(|kind| kind_token(*kind))
                .collect::<Vec<_>>();
            let scoped = self.repository.with_reader(|repository| {
                repository.list_retrieval_scope_groups(&publication, &library_ids, &kind_names)
            })?;
            for group in scoped {
                if seen_groups.insert(group.group_id.clone()) {
                    groups.push(group);
                }
            }
        }
        if include_topics {
            for group in self
                .repository
                .with_reader(|repository| repository.list_retrieval_groups(&publication))?
            {
                let source: Value = serde_json::from_str(&group.source_json).unwrap_or(Value::Null);
                if request.topic_ids.as_ref().is_some_and(|ids| {
                    source["topicId"]
                        .as_str()
                        .is_none_or(|id| !ids.iter().any(|wanted| wanted == id))
                }) || request.sections.as_ref().is_some_and(|sections| {
                    source["section"]
                        .as_str()
                        .is_none_or(|section| !sections.iter().any(|wanted| wanted == section))
                }) {
                    continue;
                }
                if source_kind_of(&group.source_json).as_deref() == Some("topic")
                    && seen_groups.insert(group.group_id.clone())
                {
                    groups.push(group);
                }
            }
        }
        let item_filter = request.item_refs.as_ref().map(|refs| {
            refs.iter()
                .map(|item| format!("{}:{}", item.library_id, item.key))
                .collect::<BTreeSet<_>>()
        });
        if let Some(items) = &item_filter {
            groups.retain(|group| items.contains(&group.item_identity));
        }
        if let Some(excluded) = request.exclude_item_refs.as_ref() {
            let excluded = excluded
                .iter()
                .map(|item| format!("{}:{}", item.library_id, item.key))
                .collect::<BTreeSet<_>>();
            groups.retain(|group| !excluded.contains(&group.item_identity));
        }
        // Hard scope: only identities the caller declared eligible may be
        // loaded or scored, so a complete scope never depends on how many refs
        // the bounded public DTO could carry.
        if let Some(eligible) = eligible {
            groups.retain(|group| eligible.contains(&group.item_identity));
        }
        let unavailable = groups
            .iter()
            .filter(|group| !matches!(group.status.as_str(), "ready" | "missing"))
            .count();
        let identities = groups
            .iter()
            .filter(|group| group.status == "ready")
            .map(|group| group.item_identity.clone())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let ready_groups = groups
            .iter()
            .filter(|group| group.status == "ready")
            .map(|group| group.group_id.clone())
            .collect::<BTreeSet<_>>();
        let fragments = self.load_fragments(&publication, &identities)?;

        let mut best: BTreeMap<String, ScoredFragment> = BTreeMap::new();
        for fragment in fragments {
            checkpoint()?;
            if now_millis() > deadline {
                return Err("operation_timeout".into());
            }
            if !ready_groups.contains(&fragment.group_id) {
                continue;
            }
            let Some(score) = cosine_from_original(&fragment.vector, &query_vector) else {
                continue;
            };
            let replace = match best.get(&fragment.item_identity) {
                None => true,
                Some(current) => {
                    score > current.score
                        || (score == current.score && fragment.fragment_id < current.fragment_id)
                }
            };
            if !replace {
                continue;
            }
            let source: Value = serde_json::from_str(&fragment.source_json).unwrap_or(Value::Null);
            let (item_ref, topic) =
                if source_kind_of(&fragment.source_json).as_deref() == Some("topic") {
                    (
                        None,
                        Some(RetrievalTopicRef {
                            topic_id: source
                                .get("topicId")
                                .and_then(Value::as_str)
                                .unwrap_or_default()
                                .to_owned(),
                            path_id: source
                                .get("pathId")
                                .and_then(Value::as_str)
                                .unwrap_or_default()
                                .to_owned(),
                            section: source
                                .get("section")
                                .and_then(Value::as_str)
                                .unwrap_or_default()
                                .to_owned(),
                        }),
                    )
                } else {
                    match item_ref_from_identity(&fragment.item_identity) {
                        Some(item_ref) => (Some(item_ref), None),
                        None => continue,
                    }
                };
            best.insert(
                fragment.item_identity.clone(),
                ScoredFragment {
                    item_ref,
                    topic,
                    item_identity: fragment.item_identity.clone(),
                    library_id: fragment.library_id,
                    group_id: fragment.group_id,
                    fragment_id: fragment.fragment_id,
                    source_json: fragment.source_json,
                    source_version: fragment.source_version,
                    range_start: fragment.range_start,
                    range_end: fragment.range_end,
                    location_json: fragment.location_json,
                    score,
                },
            );
        }
        let mut results = best.into_values().collect::<Vec<_>>();
        results.sort_by(|left, right| {
            right
                .score
                .total_cmp(&left.score)
                .then_with(|| left.item_identity.cmp(&right.item_identity))
                .then_with(|| left.fragment_id.cmp(&right.fragment_id))
        });
        let truncated = results.len() > request.max_results();
        if truncated {
            results.truncate(request.max_results());
        }
        let current = self.repository.with_reader(|repository| {
            let state = repository.get_retrieval_state()?.unwrap_or_default();
            Ok((state, repository.list_retrieval_groups(&publication)?))
        })?;
        let current_groups = current
            .1
            .iter()
            .map(|group| (group.group_id.as_str(), group))
            .collect::<BTreeMap<_, _>>();
        if current.0.status != "ready"
            || current.0.active_publication_id != publication
            || groups.iter().any(|group| {
                current_groups
                    .get(group.group_id.as_str())
                    .is_none_or(|current| {
                        current.status != group.status
                            || current.source_version != group.source_version
                    })
            })
        {
            return Err("basis_mismatch".into());
        }
        let mut issues = Vec::new();
        for (status, code) in [
            ("suspended", "source_changed"),
            ("failed", "vector_unavailable"),
        ] {
            let count = groups.iter().filter(|group| group.status == status).count();
            if count > 0 {
                issues.push(json!({"code":code,"sourceKind":Value::Null,
                    "affectedCount":count}));
            }
        }
        if truncated {
            issues.push(
                json!({"code":"result_budget_exhausted","sourceKind":Value::Null,
                "affectedCount":1}),
            );
        }
        Ok(RetrievalQueryOutcome {
            publication,
            results,
            issues,
            limited: unavailable > 0 || truncated,
        })
    }

    /// Topic-only typed results for the Topic search path. Canonical sections
    /// are not Zotero items, so no portable `ItemRef` is fabricated.
    pub fn query_topics(&self, request: Value) -> Result<Vec<ScoredTopicFragment>, String> {
        let mut request = request;
        if let Some(object) = request.as_object_mut() {
            object.insert("includeTopics".into(), Value::Bool(true));
            object.insert("libraryIds".into(), json!([]));
            object.insert("sourceKinds".into(), json!([]));
            object.remove("itemRefs");
        }
        Ok(self
            .query(request)?
            .results
            .into_iter()
            .filter_map(|fragment| {
                let topic = fragment.topic?;
                Some(ScoredTopicFragment {
                    topic,
                    item_identity: fragment.item_identity,
                    group_id: fragment.group_id,
                    fragment_id: fragment.fragment_id,
                    source_json: fragment.source_json,
                    source_version: fragment.source_version,
                    range_start: fragment.range_start,
                    range_end: fragment.range_end,
                    location_json: fragment.location_json,
                    score: fragment.score,
                })
            })
            .collect())
    }

    /// Bounded, chunked fragment load for a scoped identity list. A whole
    /// library is never materialized.
    fn load_fragments(
        &self,
        publication: &str,
        identities: &[String],
    ) -> Result<Vec<RetrievalFragmentRecord>, String> {
        let mut fragments = Vec::new();
        for batch in identities.chunks(RETRIEVAL_FRAGMENT_QUERY_BATCH) {
            let mut loaded = self.repository.with_reader(|repository| {
                repository.list_retrieval_fragments_for_items(publication, batch)
            })?;
            fragments.append(&mut loaded);
        }
        Ok(fragments)
    }

    fn run_full(
        &self,
        request: &MaintenanceRequest,
        identity_json: &str,
        scope_json: &str,
        now: &str,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let staging = self.repository.with_writer(|repository| {
            let existing = repository.list_retrieval_publications("staging")?;
            if let Some(publication) = existing.first() {
                let record = repository.get_retrieval_publication(publication)?;
                if record.as_ref().is_some_and(|record| {
                    record.identity_json == identity_json && record.scope_json == scope_json
                }) {
                    return Ok(publication.clone());
                }
                repository.delete_retrieval_publication(publication)?;
            }
            let publication = fresh_publication();
            repository.insert_retrieval_publication(&RetrievalPublicationRecord {
                publication_id: publication.clone(),
                role: "staging".into(),
                identity_json: identity_json.to_owned(),
                scope_json: scope_json.to_owned(),
                created_at: now.to_owned(),
                updated_at: now.to_owned(),
            })?;
            Ok(publication)
        })?;
        self.begin_paused(identity_json, scope_json, &staging, now)?;
        let outcome = self.index_into(request, identity_json, &staging, checkpoint)?;
        if outcome.failed {
            return Err(outcome
                .failure_code
                .unwrap_or_else(|| "source_read_failed".into()));
        }
        checkpoint()?;
        self.repository.with_writer(|repository| {
            repository.promote_retrieval_publication(&RetrievalPromotion {
                publication_id: staging.clone(),
                identity_json: identity_json.to_owned(),
                scope_json: scope_json.to_owned(),
                updated_at: now.to_owned(),
            })
        })?;
        // Runtime owns the required cleanup/discovery tail using its distinct
        // after-promotion checkpoint. Publication itself remains successful.
        Ok(json!({"status":"promoted","issues":outcome.issues}))
    }

    fn run_increment(
        &self,
        request: &MaintenanceRequest,
        identity_json: &str,
        scope_json: &str,
        _now: &str,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let state = self
            .repository
            .with_reader(|repository| repository.get_retrieval_state())?
            .unwrap_or_default();
        if state.active_publication_id.is_empty() || state.status != "ready" {
            return Err("retrieval_missing".into());
        }
        if state.active_identity_json != identity_json {
            return Err("retrieval_identity_mismatch".into());
        }
        if state.active_scope_json != scope_json {
            return Err("retrieval_scope_mismatch".into());
        }
        let active = state.active_publication_id.clone();
        let outcome = self.index_into(request, identity_json, &active, checkpoint)?;
        if outcome.failed {
            return Err(outcome
                .failure_code
                .unwrap_or_else(|| "source_read_failed".into()));
        }
        if outcome.changed {
            checkpoint()?;
            let next = fresh_publication();
            self.repository.with_writer(|repository| {
                repository.rotate_retrieval_publication(&active, &next, &(self.clock)())
            })?;
        }
        Ok(
            json!({"status":if outcome.changed {"promoted"} else {"unchanged"},"issues":outcome.issues}),
        )
    }

    fn begin_paused(
        &self,
        identity_json: &str,
        scope_json: &str,
        staging: &str,
        now: &str,
    ) -> Result<(), String> {
        self.repository.with_writer(|repository| {
            let mut state = repository.get_retrieval_state()?.unwrap_or_default();
            state.enabled = true;
            state.status = "paused".into();
            state.pending_publication_id = staging.to_owned();
            state.pending_identity_json = identity_json.to_owned();
            state.pending_scope_json = scope_json.to_owned();
            state.updated_at = now.to_owned();
            repository.put_retrieval_state(&state)
        })
    }

    fn index_into(
        &self,
        request: &MaintenanceRequest,
        identity_json: &str,
        target: &str,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<IndexOutcome, String> {
        let identity: EncodingIdentity =
            serde_json::from_str(identity_json).map_err(|_| "invalid_request".to_owned())?;
        let existing = self
            .repository
            .with_reader(|repository| repository.list_retrieval_groups(target))?
            .into_iter()
            .map(|group| (group.group_id, (group.source_version, group.status)))
            .collect::<BTreeMap<_, _>>();
        let mut seen = BTreeSet::new();
        let mut issues = Vec::new();
        let mut failed = false;
        let mut failure_code = None;
        let mut changed = false;

        if !request.scope.library_ids.is_empty() {
            let kinds = request.scope.evidence_kinds();
            let (descriptors, resolved_scope) = self.catalog(&request.scope, &kinds, checkpoint)?;
            let catalog_basis = hash(&json!(&descriptors));
            for descriptor in descriptors {
                checkpoint()?;
                let wire: DescriptorWire =
                    match serde_json::from_value::<DescriptorWire>(descriptor.clone()) {
                        Ok(wire)
                            if valid_item_ref(&wire.item_ref)
                                && wire.valid()
                                && request
                                    .scope
                                    .library_ids
                                    .contains(&wire.item_ref.library_id)
                                && kinds
                                    .iter()
                                    .any(|kind| wire.source["kind"] == kind_token(*kind)) =>
                        {
                            wire
                        }
                        _ => {
                            failed = true;
                            failure_code.get_or_insert_with(|| "invalid_source".to_owned());
                            push_issue(&mut issues, "invalid_source", None);
                            continue;
                        }
                    };
                let item_identity = format!("{}:{}", wire.item_ref.library_id, wire.item_ref.key);
                let source_json =
                    serde_json::to_string(&wire.source).map_err(|_| "invalid_source".to_owned())?;
                let group_id = group_id(&item_identity, &source_json);
                seen.insert(group_id.clone());
                if let Some((version, status)) = existing.get(&group_id) {
                    if status == "ready" && version == &wire.source_version {
                        continue;
                    }
                    if status == "suspended" && version == &wire.source_version {
                        // A canceled, never-completed group also has this
                        // state. Reuse only an existing complete fragment set.
                        let complete = self.repository.with_reader(|repository| {
                            Ok(repository
                                .list_retrieval_fragments_for_items(
                                    target,
                                    std::slice::from_ref(&item_identity),
                                )?
                                .iter()
                                .any(|fragment| {
                                    fragment.group_id == group_id
                                        && fragment.source_version == wire.source_version
                                }))
                        })?;
                        if complete {
                            if let Err(code) = self.read_source(&resolved_scope, &descriptor, &wire)
                            {
                                self.repository.with_writer(|repository| {
                                    repository
                                        .set_retrieval_group_status(target, &group_id, "failed")
                                })?;
                                return Err(code);
                            }
                            checkpoint()?;
                            self.repository.with_writer(|repository| {
                                repository.set_retrieval_group_status(target, &group_id, "ready")
                            })?;
                            changed = true;
                            continue;
                        }
                    }
                }
                changed = true;
                self.repository.with_writer(|repository| {
                    repository.set_retrieval_group_status(target, &group_id, "suspended")
                })?;
                match self.index_group(
                    &identity,
                    target,
                    &group_id,
                    &item_identity,
                    &source_json,
                    &resolved_scope,
                    &descriptor,
                    &wire,
                    checkpoint,
                ) {
                    Ok(()) => {}
                    Err(code) => {
                        if matches!(
                            code.as_str(),
                            "operation_canceled" | "operation_cancelled" | "operation_timeout"
                        ) {
                            return Err(code);
                        }
                        failed = true;
                        failure_code.get_or_insert_with(|| code.clone());
                        push_issue(&mut issues, &code, Some(&wire.source));
                    }
                }
            }
            let (current, current_scope) = self.catalog(&request.scope, &kinds, checkpoint)?;
            if current_scope != resolved_scope || hash(&json!(current)) != catalog_basis {
                return Err("source_changed".into());
            }
        }

        if request.scope.include_topics {
            let before = self
                .repository
                .with_reader(|repository| repository.list_retrieval_groups(target))?;
            match self.index_topics(&identity, target, &mut seen, checkpoint) {
                Ok(mut topic_issues) => issues.append(&mut topic_issues),
                Err(code) => {
                    if matches!(
                        code.as_str(),
                        "operation_canceled" | "operation_cancelled" | "operation_timeout"
                    ) {
                        return Err(code);
                    }
                    failed = true;
                    failure_code.get_or_insert_with(|| code.clone());
                    push_issue(&mut issues, &code, None);
                }
            }
            changed |= before
                != self
                    .repository
                    .with_reader(|repository| repository.list_retrieval_groups(target))?;
        }

        if failed {
            return Ok(IndexOutcome {
                failed,
                failure_code,
                changed,
                issues,
            });
        }
        checkpoint()?;
        changed |= self.repository.with_writer(|repository| {
            let mut removed = false;
            for group in repository.list_retrieval_groups(target)? {
                if !seen.contains(&group.group_id) && group.status != "missing" {
                    repository.set_retrieval_group_status(target, &group.group_id, "missing")?;
                    removed = true;
                }
            }
            Ok(removed)
        })?;
        Ok(IndexOutcome {
            failed,
            failure_code,
            changed,
            issues,
        })
    }

    #[allow(clippy::too_many_arguments)]
    fn index_group(
        &self,
        identity: &EncodingIdentity,
        target: &str,
        group_id: &str,
        item_identity: &str,
        source_json: &str,
        scope: &Value,
        descriptor: &Value,
        wire: &DescriptorWire,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<(), String> {
        let group = RetrievalGroupRecord {
            publication_id: target.to_owned(),
            group_id: group_id.to_owned(),
            item_identity: item_identity.to_owned(),
            library_id: wire.item_ref.library_id as i64,
            source_json: source_json.to_owned(),
            source_version: wire.source_version.clone(),
            status: "ready".into(),
        };
        self.put_group(&group, "suspended")?;
        let content = match self.read_source(scope, descriptor, wire) {
            Ok(content) => content,
            Err(code) => {
                self.put_group(&group, "failed")?;
                return Err(code);
            }
        };
        if content.trim().is_empty() {
            self.put_group(&group, "missing")?;
            return Ok(());
        }
        let units = split_fragments(&content, &wire.source);
        if units.is_empty() {
            self.put_group(&group, "missing")?;
            return Ok(());
        }
        let mut records = Vec::with_capacity(units.len());
        for batch in units.chunks(RETRIEVAL_ENCODE_BATCH) {
            checkpoint()?;
            let inputs = batch
                .iter()
                .map(|unit| content[unit.byte_start..unit.byte_end].to_owned())
                .collect::<Vec<_>>();
            let vectors = match self.encode_documents(identity, &inputs) {
                Ok(vectors) => vectors,
                Err(code) => {
                    self.put_group(&group, "failed")?;
                    return Err(code);
                }
            };
            for (unit, vector) in batch.iter().zip(vectors) {
                records.push(RetrievalFragmentRecord {
                    publication_id: target.to_owned(),
                    group_id: group_id.to_owned(),
                    fragment_id: format!("{group_id}#{}", unit.utf16_start),
                    item_identity: item_identity.to_owned(),
                    library_id: wire.item_ref.library_id as i64,
                    source_json: source_json.to_owned(),
                    source_version: wire.source_version.clone(),
                    range_start: unit.utf16_start as i64,
                    range_end: unit.utf16_end as i64,
                    location_json: serde_json::to_string(&unit.location)
                        .map_err(|_| "invalid_source".to_owned())?,
                    vector,
                });
            }
        }
        match self.read_source(scope, descriptor, wire) {
            Ok(current) if current == content => {}
            Ok(_) => {
                self.put_group(&group, "failed")?;
                return Err("source_changed".into());
            }
            Err(code) => {
                self.put_group(&group, "failed")?;
                return Err(code);
            }
        }
        checkpoint()?;
        self.repository.with_writer(|repository| {
            repository.replace_retrieval_group_fragments(&group, &records)
        })
    }

    fn index_topics(
        &self,
        identity: &EncodingIdentity,
        target: &str,
        seen: &mut BTreeSet<String>,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Vec<Value>, String> {
        let snapshot = self
            .canonical
            .search_topics(4_096, 64 * 1024 * 1024)
            .map_err(|error| error.code().to_owned())?;
        if !snapshot.complete {
            return Err("scan_budget_exhausted".into());
        }
        let membership_hash = snapshot.membership_hash.clone();
        let existing = self
            .repository
            .with_reader(|repository| repository.list_retrieval_groups(target))?
            .into_iter()
            .map(|group| (group.group_id.clone(), group))
            .collect::<BTreeMap<_, _>>();
        let issues = Vec::new();
        for member in snapshot.members {
            checkpoint()?;
            let (topic_id, path_id, content_hash, view) = match member {
                CanonicalTopicSearchMember::Ready {
                    topic_id,
                    path_id,
                    content_hash,
                    view,
                    ..
                } => (topic_id, path_id, content_hash, view),
                CanonicalTopicSearchMember::Unavailable { path_id, .. } => {
                    self.repository.with_writer(|repository| {
                        for group in existing
                            .values()
                            .filter(|group| group.item_identity == format!("topic:{path_id}"))
                        {
                            repository.set_retrieval_group_status(
                                target,
                                &group.group_id,
                                "failed",
                            )?;
                        }
                        Ok(())
                    })?;
                    return Err("source_unavailable".into());
                }
            };
            let item_identity = format!("topic:{path_id}");
            for (section, text) in &view.markdown {
                if text.trim().is_empty() {
                    continue;
                }
                let source = json!({
                    "kind": "topic",
                    "topicId": topic_id,
                    "pathId": path_id,
                    "section": section,
                });
                let source_json =
                    serde_json::to_string(&source).map_err(|_| "invalid_source".to_owned())?;
                let group_id = group_id(&item_identity, &source_json);
                seen.insert(group_id.clone());
                if existing.get(&group_id).is_some_and(|group| {
                    group.status == "ready" && group.source_version == content_hash
                }) {
                    continue;
                }
                let group = RetrievalGroupRecord {
                    publication_id: target.to_owned(),
                    group_id: group_id.clone(),
                    item_identity: item_identity.clone(),
                    library_id: 0,
                    source_json: source_json.clone(),
                    source_version: content_hash.clone(),
                    status: "ready".into(),
                };
                self.put_group(&group, "suspended")?;
                let mut records = Vec::new();
                for unit in split_fragments(text, &source) {
                    checkpoint()?;
                    let input = text[unit.byte_start..unit.byte_end].to_owned();
                    let vectors = match self.encode_documents(identity, &[input]) {
                        Ok(vectors) => vectors,
                        Err(code) => {
                            self.put_group(&group, "failed")?;
                            return Err(code);
                        }
                    };
                    records.push(RetrievalFragmentRecord {
                        publication_id: target.to_owned(),
                        group_id: group_id.clone(),
                        fragment_id: format!("{group_id}#{}", unit.utf16_start),
                        item_identity: item_identity.clone(),
                        library_id: 0,
                        source_json: source_json.clone(),
                        source_version: content_hash.clone(),
                        range_start: unit.utf16_start as i64,
                        range_end: unit.utf16_end as i64,
                        location_json: serde_json::to_string(&unit.location)
                            .map_err(|_| "invalid_source".to_owned())?,
                        vector: vectors.into_iter().next().unwrap_or_default(),
                    });
                }
                let current = self
                    .canonical
                    .search_topics(4096, 64 * 1024 * 1024)
                    .map_err(|error| error.code().to_owned())?;
                if !current.complete
                    || !current.members.iter().any(|member| {
                        matches!(member,
                    CanonicalTopicSearchMember::Ready{topic_id:id,path_id:path,content_hash:hash,..}
                    if id == &topic_id && path == &path_id && hash == &content_hash)
                    })
                {
                    self.put_group(&group, "failed")?;
                    return Err("source_changed".into());
                }
                checkpoint()?;
                self.repository.with_writer(|repository| {
                    repository.replace_retrieval_group_fragments(&group, &records)
                })?;
            }
        }
        let current = self
            .canonical
            .search_topics(4096, 64 * 1024 * 1024)
            .map_err(|error| error.code().to_owned())?;
        if !current.complete || current.membership_hash != membership_hash {
            return Err("source_changed".into());
        }
        Ok(issues)
    }

    fn put_group(&self, group: &RetrievalGroupRecord, status: &str) -> Result<(), String> {
        let mut record = group.clone();
        record.status = status.to_owned();
        self.repository
            .with_writer(|repository| repository.put_retrieval_group(&record))
    }

    fn catalog(
        &self,
        scope: &RetrievalScope,
        kinds: &[SourceKind],
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<(Vec<Value>, Value), String> {
        let mut input = json!({"scope": {"libraryIds": scope.library_ids}, "limit": 100});
        if !kinds.is_empty() {
            input["sourceKinds"] = json!(kinds);
        }
        let mut descriptors = Vec::new();
        let mut resolved: Option<Value> = None;
        let mut cursors = BTreeSet::new();
        let mut pages = 0usize;
        loop {
            checkpoint()?;
            pages += 1;
            if pages > 10_000 {
                return Err("retrieval_scan_exceeded".into());
            }
            let page =
                self.sources
                    .list_sources(input.clone())
                    .map_err(|code| match code.as_str() {
                        "invalid_request" | "basis_mismatch" | "conflict" => code,
                        _ => "source_unavailable".to_owned(),
                    })?;
            let current = page
                .get("scope")
                .filter(|value| value.is_object())
                .cloned()
                .ok_or_else(|| "invalid_source".to_owned())?;
            if resolved.as_ref().is_some_and(|value| value != &current) {
                return Err("basis_mismatch".into());
            }
            resolved = Some(current.clone());
            input["scope"] = current;
            let rows = page
                .get("descriptors")
                .and_then(Value::as_array)
                .ok_or_else(|| "invalid_source".to_owned())?;
            if rows.len() > 100 {
                return Err("invalid_source".into());
            }
            if page["issues"]
                .as_array()
                .is_none_or(|issues| !issues.is_empty())
            {
                return Err("source_unavailable".into());
            }
            for row in rows {
                if descriptors.len() >= RETRIEVAL_MAX_SOURCES {
                    return Err("retrieval_scan_exceeded".into());
                }
                descriptors.push(row.clone());
            }
            match (
                page.get("hasMore").and_then(Value::as_bool),
                page.get("nextCursor").and_then(Value::as_str),
            ) {
                (Some(false), _) => break,
                (Some(true), Some(cursor))
                    if !cursor.is_empty() && cursors.insert(cursor.to_owned()) =>
                {
                    input["cursor"] = json!(cursor);
                }
                _ => return Err("invalid_source".into()),
            }
        }
        Ok((
            descriptors,
            resolved.unwrap_or_else(|| json!({"libraryIds": scope.library_ids})),
        ))
    }

    pub(crate) fn read_source(
        &self,
        scope: &Value,
        descriptor: &Value,
        wire: &DescriptorWire,
    ) -> Result<String, String> {
        if !wire.valid() || !valid_item_ref(&wire.item_ref) {
            return Err("invalid_source".into());
        }
        let read = self
            .sources
            .read_source(json!({"scope": scope, "descriptor": descriptor}))
            .map_err(|code| match code.as_str() {
                "operation_timeout" => "operation_timeout".to_owned(),
                _ => "source_read_failed".to_owned(),
            })?;
        match read.get("outcome").and_then(Value::as_str) {
            Some("available") => {}
            Some("source_changed") => return Err("source_changed".into()),
            Some("source_unavailable") => return Err("source_unavailable".into()),
            _ => return Err("source_read_failed".into()),
        }
        let object = read
            .as_object()
            .ok_or_else(|| "invalid_source".to_owned())?;
        if object.len() != 7
            || read["itemRef"] != descriptor["itemRef"]
            || read["source"] != descriptor["source"]
            || read["format"] != descriptor["format"]
            || read["sourceVersion"] != descriptor["sourceVersion"]
        {
            return Err("source_changed".into());
        }
        let content = read
            .get("content")
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_source".to_owned())?;
        let range = &read["location"]["range"];
        let start = range.get("start").and_then(Value::as_u64);
        let end = range.get("end").and_then(Value::as_u64);
        if start != Some(0)
            || end != Some(wire.content_length as u64)
            || content.encode_utf16().count() != wire.content_length
        {
            return Err("source_changed".into());
        }
        Ok(content.to_owned())
    }

    fn encode_documents(
        &self,
        identity: &EncodingIdentity,
        inputs: &[String],
    ) -> Result<Vec<Vec<f32>>, String> {
        let deadline = now_millis() + RETRIEVAL_BUILD_LIFETIME_MS;
        let response = self.embeddings.encode(json!({
            "identity": identity,
            "purpose": "document",
            "inputs": inputs,
            "deadlineAtMs": deadline,
        }))?;
        validate_vectors(response, identity, inputs.len())
    }

    fn encode_query(
        &self,
        identity: &EncodingIdentity,
        query: &str,
        deadline: u64,
    ) -> Result<Vec<f32>, String> {
        let response = self.embeddings.encode(json!({
            "identity": identity,
            "purpose": "query",
            "inputs": [query],
            "deadlineAtMs": deadline,
        }))?;
        let mut vectors = validate_vectors(response, identity, 1)?;
        Ok(vectors.pop().unwrap_or_default())
    }
}

struct IndexOutcome {
    failed: bool,
    failure_code: Option<String>,
    changed: bool,
    issues: Vec<Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MaintenanceRequest {
    identity: EncodingIdentity,
    scope: RetrievalScope,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InvalidateRequest {
    paper_refs: Vec<ItemRef>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryRequest {
    query: String,
    #[serde(default)]
    limit: Option<usize>,
    #[serde(default)]
    max_results: Option<usize>,
    #[serde(default)]
    library_ids: Option<Vec<u64>>,
    #[serde(default)]
    item_refs: Option<Vec<ItemRef>>,
    #[serde(default)]
    exclude_item_refs: Option<Vec<ItemRef>>,
    #[serde(default)]
    source_kinds: Option<Vec<SourceKind>>,
    #[serde(default)]
    include_topics: Option<bool>,
    #[serde(default)]
    deadline_at_ms: Option<u64>,
    #[serde(default)]
    topic_ids: Option<Vec<String>>,
    #[serde(default)]
    sections: Option<Vec<String>>,
}

impl QueryRequest {
    fn validate(&self) -> Result<(), String> {
        if self.query.trim().is_empty()
            || self.query.encode_utf16().count() > 4_096
            || self.limit.is_some_and(|limit| limit == 0 || limit > 100)
            || self
                .max_results
                .is_some_and(|limit| limit == 0 || limit > 500)
            || self.library_ids.as_ref().is_some_and(|ids| {
                ids.len() > 100 || ids.iter().any(|id| *id == 0 || *id > 9_007_199_254_740_991)
            })
            || self.item_refs.as_ref().is_some_and(|refs| {
                refs.len() > RETRIEVAL_MAX_SOURCES || refs.iter().any(|item| !valid_item_ref(item))
            })
            || self.exclude_item_refs.as_ref().is_some_and(|refs| {
                refs.len() > RETRIEVAL_MAX_SOURCES || refs.iter().any(|item| !valid_item_ref(item))
            })
            || self
                .source_kinds
                .as_ref()
                .is_some_and(|kinds| kinds.len() > 3)
            || self.topic_ids.as_ref().is_some_and(|ids| {
                ids.len() > 4096
                    || ids
                        .iter()
                        .any(|id| id.is_empty() || id.encode_utf16().count() > 512)
            })
            || self.sections.as_ref().is_some_and(|sections| {
                sections.len() > 100
                    || sections
                        .iter()
                        .any(|section| section.is_empty() || section.encode_utf16().count() > 256)
            })
            || self
                .deadline_at_ms
                .is_some_and(|deadline| deadline > 9_007_199_254_740_991)
        {
            return Err("invalid_request".into());
        }
        Ok(())
    }

    fn max_results(&self) -> usize {
        self.max_results.unwrap_or(100)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DescriptorWire {
    item_ref: ItemRef,
    source: Value,
    source_version: String,
    #[serde(default)]
    format: Value,
    content_length: usize,
}

impl DescriptorWire {
    fn valid(&self) -> bool {
        !self.source_version.is_empty()
            && self.source_version.encode_utf16().count() <= 256
            && self.content_length <= RETRIEVAL_MAX_MODEL_BYTES
            && self.source_valid()
            && matches!(self.format.as_str(), Some("text" | "markdown"))
    }

    fn source_valid(&self) -> bool {
        let Some(object) = self.source.as_object() else {
            return false;
        };
        let valid_ref = |field: &str| {
            serde_json::from_value::<ItemRef>(self.source[field].clone()).is_ok_and(|item| {
                valid_item_ref(&item) && item.library_id == self.item_ref.library_id
            })
        };
        match self.source["kind"].as_str() {
            Some("metadata") => {
                object.len() == 2
                    && matches!(
                        self.source["field"].as_str(),
                        Some(
                            "title" | "abstract" | "creator" | "tags" | "date" | "publicationTitle"
                        )
                    )
            }
            Some("fulltext") => object.len() == 2 && valid_ref("attachmentRef"),
            Some("analysis") => {
                object.len() == 3
                    && valid_ref("noteRef")
                    && matches!(
                        self.source["artifactType"].as_str(),
                        Some("digest" | "references" | "citation-analysis" | "literature-score")
                    )
            }
            _ => false,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EncodeResultWire {
    identity: EncodingIdentity,
    vectors: Vec<Vec<f32>>,
}

fn parse_request<T: for<'de> Deserialize<'de>>(value: Value) -> Result<T, String> {
    if value
        .as_object()
        .is_none_or(|object| object.values().any(Value::is_null))
    {
        return Err("invalid_request".into());
    }
    serde_json::from_value(value).map_err(|_| "invalid_request".to_owned())
}

fn valid_item_ref(item: &ItemRef) -> bool {
    item.library_id > 0
        && item.library_id <= 9_007_199_254_740_991
        && !item.key.is_empty()
        && item.key.len() <= 64
        && item
            .key
            .chars()
            .all(|character| character.is_ascii_alphanumeric())
}

fn validate_vectors(
    response: Value,
    identity: &EncodingIdentity,
    expected: usize,
) -> Result<Vec<Vec<f32>>, String> {
    let parsed: EncodeResultWire =
        serde_json::from_value(response).map_err(|_| "embedding_response_invalid".to_owned())?;
    if &parsed.identity != identity || parsed.vectors.len() != expected {
        return Err("embedding_response_invalid".into());
    }
    for vector in &parsed.vectors {
        if vector.len() != identity.dimensions
            || vector.iter().any(|value| !value.is_finite())
            || vector.iter().all(|value| *value == 0.0)
        {
            return Err("embedding_response_invalid".into());
        }
    }
    Ok(parsed.vectors)
}

pub(crate) fn item_ref_from_identity(identity: &str) -> Option<ItemRef> {
    let (library, key) = identity.split_once(':')?;
    Some(ItemRef {
        library_id: library.parse().ok()?,
        key: key.to_owned(),
    })
}

fn group_id(item_identity: &str, source_json: &str) -> String {
    format!("{item_identity}#{}", &hash(&json!(source_json))[..32])
}

fn kind_token(kind: SourceKind) -> &'static str {
    match kind {
        SourceKind::Metadata => "metadata",
        SourceKind::Fulltext => "fulltext",
        SourceKind::Analysis => "analysis",
    }
}

fn source_kind_of(source_json: &str) -> Option<String> {
    serde_json::from_str::<Value>(source_json)
        .ok()?
        .get("kind")?
        .as_str()
        .map(str::to_owned)
}

fn fresh_publication() -> String {
    static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let serial = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or_default();
    format!("retrieval-{timestamp:x}-{serial:x}")
}

fn push_issue(issues: &mut Vec<Value>, code: &str, source: Option<&Value>) {
    let code = match code {
        "source_unavailable"
        | "source_changed"
        | "source_read_failed"
        | "invalid_source"
        | "scan_budget_exhausted"
        | "passage_budget_exhausted"
        | "result_budget_exhausted"
        | "vector_unavailable" => code,
        _ => "vector_unavailable",
    };
    let kind = source
        .and_then(|value| value.get("kind"))
        .filter(|kind| matches!(kind.as_str(), Some("metadata" | "fulltext" | "analysis")))
        .cloned()
        .unwrap_or(Value::Null);
    if let Some(issue) = issues
        .iter_mut()
        .find(|issue| issue["code"] == json!(code) && issue["sourceKind"] == kind)
    {
        issue["affectedCount"] =
            json!((issue["affectedCount"].as_u64().unwrap_or_default() + 1).min(1_000_000));
    } else if issues.len() < 8 {
        issues.push(json!({"code": code, "sourceKind": kind, "affectedCount": 1}));
    }
}

fn hash(value: &Value) -> String {
    format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(value).unwrap_or_default())
    )
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or_default()
}

/// Exact cosine recomputed from original float32 values. Accumulation is
/// sequential float64 and only the final quotient is cast to float32. A zero
/// norm or a dimension mismatch yields None.
pub fn cosine_from_original(left: &[f32], right: &[f32]) -> Option<f32> {
    if left.is_empty()
        || left.len() != right.len()
        || left.iter().chain(right).any(|value| !value.is_finite())
    {
        return None;
    }
    let mut dot = 0.0f64;
    let mut left_norm = 0.0f64;
    let mut right_norm = 0.0f64;
    for (left, right) in left.iter().zip(right) {
        let left = f64::from(*left);
        let right = f64::from(*right);
        dot += left * right;
        left_norm += left * left;
        right_norm += right * right;
    }
    if left_norm <= 0.0 || right_norm <= 0.0 {
        return None;
    }
    Some((dot / (left_norm.sqrt() * right_norm.sqrt())) as f32)
}

/// One fragment over original text. Byte offsets index the source string;
/// UTF-16 offsets are the durable, documented range.
#[derive(Clone, Debug, PartialEq)]
pub struct FragmentUnit {
    pub byte_start: usize,
    pub byte_end: usize,
    pub utf16_start: usize,
    pub utf16_end: usize,
    pub location: Value,
}

/// Split source text into bounded fragments. Paragraphs and lines are the
/// primary boundaries; a longer unit is split again only at a Unicode-safe
/// boundary, so no surrogate pair is ever cut.
pub fn split_fragments(content: &str, source: &Value) -> Vec<FragmentUnit> {
    let kind = source.get("kind").and_then(Value::as_str).unwrap_or("");
    let mut units: Vec<(usize, usize, &'static str, Option<String>)> = Vec::new();
    match kind {
        "metadata" => {
            let field = source
                .get("field")
                .and_then(Value::as_str)
                .unwrap_or("content")
                .to_owned();
            units.push((0, content.len(), "field", Some(field)));
        }
        "analysis" => {
            for (start, end, _) in paragraph_ranges(content) {
                units.push((start, end, "analysis_field", Some("content".to_owned())));
            }
        }
        "topic" => {
            let section = source
                .get("section")
                .and_then(Value::as_str)
                .unwrap_or("content")
                .to_owned();
            units.push((0, content.len(), "topicSection", Some(section)));
        }
        _ => {
            for (start, end, unit) in paragraph_ranges(content) {
                units.push((start, end, unit, None));
            }
        }
    }

    let mut fragments = Vec::new();
    let mut byte_cursor = 0usize;
    let mut utf16_cursor = 0usize;
    for (start, end, unit, field) in units {
        let text = &content[start..end];
        if text.trim().is_empty() {
            continue;
        }
        for (inner_start, inner_end) in split_long(text) {
            let absolute_start = start + inner_start;
            let absolute_end = start + inner_end;
            utf16_cursor += content[byte_cursor..absolute_start].encode_utf16().count();
            let utf16_start = utf16_cursor;
            let utf16_end =
                utf16_start + content[absolute_start..absolute_end].encode_utf16().count();
            byte_cursor = absolute_end;
            utf16_cursor = utf16_end;
            let mut location = Map::new();
            location.insert("unit".into(), json!(unit));
            location.insert("field".into(), json!(field));
            location.insert(
                "range".into(),
                json!({"start": utf16_start, "end": utf16_end}),
            );
            fragments.push(FragmentUnit {
                byte_start: absolute_start,
                byte_end: absolute_end,
                utf16_start,
                utf16_end,
                location: Value::Object(location),
            });
        }
    }
    fragments
}

fn paragraph_ranges(content: &str) -> Vec<(usize, usize, &'static str)> {
    let mut ranges = Vec::new();
    let mut paragraph_start = 0usize;
    let mut paragraph_end = 0usize;
    let mut current_name = "paragraph";
    let mut open = false;
    let mut line_cursor = 0usize;
    for line in content.split_inclusive('\n') {
        let line_start = line_cursor;
        let line_end = line_start + line.len();
        line_cursor = line_end;
        let text = line.trim_end_matches(['\r', '\n']);
        if text.trim().is_empty() {
            if open && paragraph_end > paragraph_start {
                ranges.push((paragraph_start, paragraph_end, current_name));
            }
            open = false;
            paragraph_start = line_end;
            paragraph_end = line_end;
            continue;
        }
        if !open {
            open = true;
            paragraph_start = line_start;
            current_name = unit_name(text.trim_start());
        }
        paragraph_end = line_start + text.len();
    }
    if open && paragraph_end > paragraph_start {
        ranges.push((paragraph_start, paragraph_end, current_name));
    }
    ranges
}

fn unit_name(line: &str) -> &'static str {
    if line.starts_with('|') {
        "table_row"
    } else if line.starts_with("- ") || line.starts_with("* ") || line.starts_with("+ ") {
        "list_item"
    } else {
        "paragraph"
    }
}

fn split_long(text: &str) -> Vec<(usize, usize)> {
    let mut ranges = Vec::new();
    let mut start = 0usize;
    while start < text.len() {
        let mut count = 0usize;
        let mut cut = None;
        let mut whitespace = None;
        for (offset, character) in text[start..].char_indices() {
            let width = character.len_utf16();
            if count + width > RETRIEVAL_MAX_FRAGMENT_UTF16 {
                cut = Some(start + offset);
                break;
            }
            count += width;
            if character.is_whitespace() {
                whitespace = Some(start + offset + character.len_utf8());
            }
        }
        let end = match cut {
            None => text.len(),
            Some(boundary) => whitespace
                .filter(|whitespace| *whitespace > start && *whitespace <= boundary)
                .unwrap_or(boundary),
        };
        let end = if end > start {
            end
        } else {
            start + text[start..].chars().next().map_or(1, char::len_utf8)
        };
        ranges.push((start, end));
        start = end;
    }
    ranges
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use synthesis_canonical_store::{
        CanonicalError, CanonicalReceipt, CanonicalTopicSearchSnapshot, CanonicalTopicState,
        CanonicalTopicView, PreparedCanonicalPromotion,
    };
    use synthesis_repository::{Repository, RepositoryIdentity};
    use synthesis_test_support::TestRoot;

    fn identity(dimensions: usize) -> EncodingIdentity {
        EncodingIdentity {
            model_id: "test-model".into(),
            dimensions,
            query_prefix: "q:".into(),
            document_prefix: "d:".into(),
        }
    }

    fn scope() -> RetrievalScope {
        RetrievalScope {
            library_ids: vec![1],
            source_kinds: vec![SourceKind::Metadata],
            include_topics: false,
        }
    }

    struct FakeSources {
        rows: Vec<(Value, String)>,
    }

    impl EvidenceSourcePort for FakeSources {
        fn list_sources(&self, request: Value) -> Result<Value, String> {
            let descriptors = self
                .rows
                .iter()
                .map(|(descriptor, _)| descriptor.clone())
                .collect::<Vec<_>>();
            Ok(json!({
                "scope": request["scope"].clone(),
                "descriptors": descriptors,
                "issues": [],
                "hasMore": false,
                "nextCursor": null,
            }))
        }

        fn read_source(&self, request: Value) -> Result<Value, String> {
            let descriptor = &request["descriptor"];
            let Some((stored, content)) = self
                .rows
                .iter()
                .find(|(row, _)| row["itemRef"] == descriptor["itemRef"])
            else {
                return Ok(json!({"outcome": "source_unavailable"}));
            };
            Ok(json!({
                "outcome": "available",
                "itemRef": stored["itemRef"].clone(),
                "content": content,
                "format": stored["format"].clone(),
                "source": stored["source"].clone(),
                "sourceVersion": stored["sourceVersion"].clone(),
                "location": {"range": {"start": 0, "end": content.encode_utf16().count()}},
            }))
        }
    }

    struct FakeEmbeddings;

    #[derive(Default)]
    struct CountingEmbeddings(std::sync::atomic::AtomicUsize);

    impl RetrievalEmbeddingPort for CountingEmbeddings {
        fn describe(&self) -> Result<Value, String> {
            FakeEmbeddings.describe()
        }
        fn encode(&self, request: Value) -> Result<Value, String> {
            if request["purpose"] == "document" {
                self.0.fetch_add(
                    request["inputs"].as_array().unwrap().len(),
                    std::sync::atomic::Ordering::SeqCst,
                );
            }
            FakeEmbeddings.encode(request)
        }
    }

    #[test]
    fn canceled_build_reuses_completed_groups_and_notification_update_does_not_encode() {
        let mut fixture = fixture(
            "resume",
            vec![
                (descriptor("AAAA", "title", "v1", 5), "alpha".into()),
                (descriptor("BBBB", "title", "v1", 4), "beta".into()),
            ],
        );
        let encoder = Arc::new(CountingEmbeddings::default());
        fixture.application.embeddings = encoder.clone();
        let cancel = || {
            if fixture.application.state()?["progress"]["completedGroups"]
                .as_u64()
                .unwrap_or_default()
                > 0
            {
                Err("operation_canceled".into())
            } else {
                Ok(())
            }
        };
        assert_eq!(
            fixture
                .application
                .build(maintenance(), RetrievalBuildMode::Full, &cancel)
                .unwrap_err(),
            "operation_canceled"
        );
        assert_eq!(fixture.application.state().unwrap()["status"], "paused");
        assert_eq!(encoder.0.load(std::sync::atomic::Ordering::SeqCst), 1);
        fixture
            .application
            .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
            .unwrap();
        assert_eq!(encoder.0.load(std::sync::atomic::Ordering::SeqCst), 2);
        let publication = fixture.application.state().unwrap()["publication"].clone();
        fixture
            .application
            .invalidate(json!({"paperRefs":[{"libraryId":1,"key":"AAAA"}]}))
            .unwrap();
        fixture
            .application
            .update(maintenance(), &checkpoint())
            .unwrap();
        assert_eq!(encoder.0.load(std::sync::atomic::Ordering::SeqCst), 2);
        assert_ne!(
            fixture.application.state().unwrap()["publication"],
            publication
        );
        assert_eq!(
            fixture
                .application
                .query(json!({"query":"alpha"}))
                .unwrap()
                .results
                .len(),
            2
        );
    }

    #[test]
    fn source_changes_after_encoding_block_group_publication() {
        struct ChangingSource {
            inner: FakeSources,
            reads: std::sync::atomic::AtomicUsize,
        }
        impl EvidenceSourcePort for ChangingSource {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                self.inner.list_sources(request)
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                if self.reads.fetch_add(1, std::sync::atomic::Ordering::SeqCst) > 0 {
                    Ok(json!({"outcome":"source_changed"}))
                } else {
                    self.inner.read_source(request)
                }
            }
        }
        let mut fixture = fixture("source-change", vec![]);
        fixture.application.sources = Arc::new(ChangingSource {
            inner: FakeSources {
                rows: vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
            },
            reads: std::sync::atomic::AtomicUsize::new(0),
        });
        assert!(
            fixture
                .application
                .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
                .is_err()
        );
        let state = fixture.application.state().unwrap();
        assert_eq!(state["status"], "paused");
        assert_eq!(state["progress"]["failedGroups"], 1);
        assert_eq!(state["progress"]["completedFragments"], 0);
    }

    #[test]
    fn disabled_host_and_expired_query_do_not_return_semantic_results() {
        struct Disabled;
        impl RetrievalEmbeddingPort for Disabled {
            fn describe(&self) -> Result<Value, String> {
                Ok(json!({"enabled":false,"identity":null}))
            }
            fn encode(&self, _: Value) -> Result<Value, String> {
                panic!("disabled Host must not encode")
            }
        }
        let mut fixture = fixture(
            "disabled-query",
            vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
        );
        fixture
            .application
            .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
            .unwrap();
        assert!(
            fixture
                .application
                .query(json!({"query":"alpha","deadlineAtMs":0}))
                .is_err()
        );
        fixture.application.embeddings = Arc::new(Disabled);
        assert!(fixture.application.query(json!({"query":"alpha"})).is_err());
        assert_eq!(fixture.application.publication_basis().unwrap(), None);
        let state = fixture.application.state().unwrap();
        assert_eq!(state["enabled"], false);
        assert_eq!(state["status"], "ready");
        assert_eq!(state["activeIdentity"], json!(identity(4)));
    }

    #[test]
    fn invalid_embedding_response_is_atomic_and_preserves_failed_staging() {
        struct InvalidVectors;
        impl RetrievalEmbeddingPort for InvalidVectors {
            fn describe(&self) -> Result<Value, String> {
                FakeEmbeddings.describe()
            }
            fn encode(&self, request: Value) -> Result<Value, String> {
                let mut response = FakeEmbeddings.encode(request)?;
                response["identity"]["documentPrefix"] = json!("different");
                Ok(response)
            }
        }
        let mut fixture = fixture(
            "invalid-response",
            vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
        );
        fixture.application.embeddings = Arc::new(InvalidVectors);
        assert_eq!(
            fixture
                .application
                .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
                .unwrap_err(),
            "embedding_response_invalid"
        );
        let state = fixture.application.state().unwrap();
        assert_eq!(state["status"], "paused");
        assert_eq!(state["progress"]["failedGroups"], 1);
        assert_eq!(state["progress"]["completedFragments"], 0);
        fixture.application.embeddings = Arc::new(FakeEmbeddings);
        assert_eq!(
            fixture
                .application
                .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
                .unwrap()["status"],
            "promoted"
        );
    }

    impl RetrievalEmbeddingPort for FakeEmbeddings {
        fn describe(&self) -> Result<Value, String> {
            Ok(json!({"enabled": true, "identity": identity(4)}))
        }

        fn encode(&self, request: Value) -> Result<Value, String> {
            let dimensions = request["identity"]["dimensions"].as_u64().unwrap_or(0) as usize;
            let inputs = request["inputs"].as_array().cloned().unwrap_or_default();
            let vectors = inputs
                .iter()
                .map(|input| {
                    let text = input.as_str().unwrap_or("");
                    let mut vector = vec![0.5f32; dimensions];
                    for character in text.chars() {
                        vector[(character as usize) % dimensions.max(1)] += 1.0;
                    }
                    vector
                })
                .collect::<Vec<_>>();
            Ok(json!({"identity": request["identity"].clone(), "vectors": vectors}))
        }
    }

    struct EmptyCanonical;

    impl TopicCanonicalPort for EmptyCanonical {
        fn read_topic(&self, _topic_id: &str) -> Result<CanonicalTopicState, CanonicalError> {
            Err(CanonicalError::from_code("unavailable".into()))
        }

        fn search_topics(
            &self,
            _limit: usize,
            _max_bytes: usize,
        ) -> Result<CanonicalTopicSearchSnapshot, CanonicalError> {
            Ok(CanonicalTopicSearchSnapshot {
                members: Vec::new(),
                complete: true,
                membership_hash: String::new(),
            })
        }

        fn promote(
            &self,
            _promotion: PreparedCanonicalPromotion,
        ) -> Result<CanonicalReceipt, CanonicalError> {
            Err(CanonicalError::from_code("unavailable".into()))
        }

        fn archive_current(
            &self,
            _topic_id: &str,
            _deleted_path_id: &str,
        ) -> Result<bool, CanonicalError> {
            Err(CanonicalError::from_code("unavailable".into()))
        }

        fn restore_deleted(
            &self,
            _topic_id: &str,
            _deleted_path_id: &str,
        ) -> Result<bool, CanonicalError> {
            Err(CanonicalError::from_code("unavailable".into()))
        }

        fn purge_deleted(&self, _deleted_path_id: &str) -> Result<bool, CanonicalError> {
            Err(CanonicalError::from_code("unavailable".into()))
        }
    }

    struct Fixture {
        application: RetrievalApplication,
        _root: TestRoot,
    }

    fn descriptor(key: &str, field: &str, version: &str, content_length: usize) -> Value {
        json!({
            "itemRef": {"libraryId": 1, "key": key},
            "source": {"kind": "metadata", "field": field},
            "sourceVersion": version,
            "format": "text",
            "contentLength": content_length,
        })
    }

    fn fixture(label: &str, rows: Vec<(Value, String)>) -> Fixture {
        let root = TestRoot::new(&format!("synthesis-retrieval-{label}"));
        let repository = Repository::open(
            root.path(),
            RepositoryIdentity {
                profile_id: "profile:retrieval".into(),
                data_root_id: "data:retrieval".into(),
            },
        )
        .expect("repository");
        let application = RetrievalApplication::new(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository)))),
            Arc::new(FakeSources { rows }),
            Arc::new(FakeEmbeddings),
            Arc::new(EmptyCanonical),
        )
        .with_clock(Arc::new(|| "2026-10-07T00:00:00.000Z".into()));
        Fixture {
            application,
            _root: root,
        }
    }

    fn maintenance() -> Value {
        json!({"identity": identity(4), "scope": scope()})
    }

    #[test]
    fn enhancement_timeout_preserves_lexical_results_but_cancellation_propagates() {
        use std::sync::atomic::{AtomicBool, Ordering};

        struct StopAfterQuery(Arc<AtomicBool>);
        struct SearchSources;
        impl EvidenceSourcePort for SearchSources {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                FakeSources {
                    rows: vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
                }
                .list_sources(request)
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                let mut read = FakeSources {
                    rows: vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
                }
                .read_source(request.clone())?;
                read["location"] = request.get("location").cloned().unwrap_or_else(
                    || json!({"unit":"field","field":"title","range":{"start":0,"end":5}}),
                );
                Ok(read)
            }
        }
        impl RetrievalEmbeddingPort for StopAfterQuery {
            fn describe(&self) -> Result<Value, String> {
                FakeEmbeddings.describe()
            }
            fn encode(&self, request: Value) -> Result<Value, String> {
                if request["purpose"] == "query" {
                    self.0.store(true, Ordering::SeqCst);
                }
                FakeEmbeddings.encode(request)
            }
        }

        for library in [false, true] {
            for code in ["operation_timeout", "operation_canceled"] {
                let mut fixture = fixture(
                    "enhancement-stop",
                    vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
                );
                fixture
                    .application
                    .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
                    .unwrap();
                let stopped = Arc::new(AtomicBool::new(false));
                fixture.application.embeddings = Arc::new(StopAfterQuery(Arc::clone(&stopped)));
                let evidence =
                    crate::evidence_search::EvidenceSearchApplication::new(Arc::new(SearchSources))
                        .with_retrieval(Arc::new(fixture.application));
                let checkpoint = || {
                    if stopped.load(Ordering::SeqCst) {
                        Err(code.to_owned())
                    } else {
                        Ok(())
                    }
                };
                let result = if library {
                    evidence
                        .search_library_items_with_retrieval(
                            json!({"query":"alpha", "libraryIds":[1]}),
                            &checkpoint,
                        )
                        .map(|execution| execution["result"].clone())
                } else {
                    evidence.search(json!({"query":"alpha", "libraryIds":[1]}), &checkpoint)
                };
                if code == "operation_canceled" {
                    assert_eq!(result.unwrap_err(), code);
                } else {
                    let result =
                        result.expect("verified lexical results survive enhancement timeout");
                    assert_eq!(result["method"], "lexical");
                    assert_eq!(result["status"], "limited");
                    assert_eq!(result["total"], Value::Null);
                    assert!(!result["results"].as_array().unwrap().is_empty());
                    assert!(
                        result["issues"]
                            .as_array()
                            .unwrap()
                            .iter()
                            .any(|issue| issue["code"] == "scan_budget_exhausted")
                    );
                }
            }
        }
    }

    #[test]
    fn rebuild_rotates_basis_and_unchanged_update_preserves_it() {
        let fixture = fixture(
            "rebuild-basis",
            vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
        );
        fixture
            .application
            .maintain("build", maintenance(), &checkpoint())
            .unwrap();
        let first = fixture.application.publication_basis().unwrap().unwrap();
        assert_eq!(
            fixture
                .application
                .maintain("update", maintenance(), &checkpoint())
                .unwrap()["status"],
            "unchanged"
        );
        assert_eq!(
            fixture.application.publication_basis().unwrap().as_deref(),
            Some(first.as_str())
        );
        fixture
            .application
            .maintain("rebuild", maintenance(), &checkpoint())
            .unwrap();
        assert_ne!(
            fixture.application.publication_basis().unwrap().unwrap(),
            first
        );
        let mut different_scope = maintenance();
        different_scope["scope"]["sourceKinds"] = json!(["fulltext"]);
        assert!(
            fixture
                .application
                .update(different_scope, &checkpoint())
                .is_err()
        );
        let before = fixture.application.publication_basis().unwrap();
        let group = fixture.application.query(json!({"query":"alpha"})).unwrap();
        fixture
            .application
            .suspend_group(&group.publication, &group.results[0].group_id)
            .unwrap();
        assert_ne!(fixture.application.publication_basis().unwrap(), before);
    }

    #[test]
    fn malformed_maintenance_is_rejected_without_creating_index() {
        let fixture = fixture("invalid-input", vec![]);
        for scope in [
            json!({"libraryIds":[1],"sourceKinds":[],"includeTopics":false}),
            json!({"libraryIds":[1,1],"sourceKinds":["metadata"],"includeTopics":false}),
        ] {
            assert!(
                fixture
                    .application
                    .maintain(
                        "build",
                        json!({"identity":identity(4),"scope":scope}),
                        &checkpoint()
                    )
                    .is_err()
            );
        }
        assert_eq!(fixture.application.state().unwrap()["status"], "missing");
        let mut configured = identity(4);
        configured.query_prefix = "Instruct: retrieve\nQuery: ".into();
        assert!(configured.validate().is_ok());
        assert!(
            fixture
                .application
                .invalidate(json!({"paperRefs":vec![json!({"libraryId":1,"key":"AAAA"});257]}))
                .is_err()
        );
    }

    fn checkpoint() -> impl Fn() -> Result<(), String> {
        || Ok(())
    }

    #[test]
    fn cosine_uses_original_vectors_and_rejects_degenerate_inputs() {
        let score = cosine_from_original(&[1.0, 0.0], &[1.0, 0.0]).unwrap();
        assert!((score - 1.0).abs() < 1e-6);
        assert_eq!(cosine_from_original(&[1.0], &[1.0, 2.0]), None);
        assert_eq!(cosine_from_original(&[0.0, 0.0], &[1.0, 0.0]), None);
        // Sequential float64 accumulation differs from a naive f32 sum.
        let left = vec![1.0e8f32, 1.0, -1.0e8f32];
        let right = vec![1.0f32, 1.0, 1.0];
        let score = cosine_from_original(&left, &right).unwrap();
        assert!(score > 4.0e-9 && score < 4.1e-9);
    }

    #[test]
    fn fragments_never_split_a_surrogate_pair() {
        let emoji = "\u{1f600}".repeat(3_000);
        let units = split_fragments(&emoji, &json!({"kind": "metadata", "field": "title"}));
        assert!(!units.is_empty());
        for unit in &units {
            let text = &emoji[unit.byte_start..unit.byte_end];
            assert!(text.chars().all(|character| character == '\u{1f600}'));
            assert!(unit.utf16_end - unit.utf16_start <= RETRIEVAL_MAX_FRAGMENT_UTF16);
            assert_eq!(
                unit.utf16_end - unit.utf16_start,
                text.encode_utf16().count()
            );
        }
        assert_eq!(units[0].utf16_start, 0);
        assert_eq!(
            units.last().unwrap().utf16_end,
            emoji.encode_utf16().count()
        );
    }

    #[test]
    fn fragments_track_original_utf16_ranges_across_paragraphs() {
        let content = "first line\n\nsecond line\n";
        let units = split_fragments(content, &json!({"kind": "fulltext"}));
        assert_eq!(units.len(), 2);
        assert_eq!(units[0].utf16_start, 0);
        assert_eq!(units[0].utf16_end, 10);
        assert_eq!(units[1].utf16_start, 12);
        assert_eq!(units[1].utf16_end, 23);
        assert_eq!(units[0].location["unit"], json!("paragraph"));
    }

    #[test]
    fn full_build_publishes_and_query_ranks_best_fragment() {
        let rows = vec![
            (descriptor("AAAA", "title", "v1", 5), "alpha".to_owned()),
            (descriptor("BBBB", "title", "v1", 4), "beta".to_owned()),
        ];
        let fixture = fixture("build", rows);
        let outcome = fixture
            .application
            .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
            .expect("build");
        assert_eq!(outcome["status"], json!("promoted"));
        assert_eq!(
            fixture.application.state().unwrap()["progress"]["completedGroups"],
            json!(2)
        );

        let scored = fixture
            .application
            .query(json!({"query": "alpha", "maxResults": 10}))
            .expect("query");
        assert_eq!(scored.results.len(), 2);
        assert_eq!(scored.results[0].item_ref.as_ref().unwrap().key, "AAAA");
        assert!(scored.results[0].score >= scored.results[1].score);
    }

    #[test]
    fn reads_do_not_build_and_missing_index_is_unavailable() {
        let rows = vec![(descriptor("AAAA", "title", "v1", 5), "alpha".to_owned())];
        let fixture = fixture("no-read-build", rows);
        assert_eq!(
            fixture
                .application
                .query(json!({"query": "alpha"}))
                .unwrap_err(),
            "retrieval_unavailable"
        );
        assert_eq!(
            fixture.application.state().unwrap()["status"],
            json!("missing")
        );
    }

    #[test]
    fn query_hard_scope_intersects_library_item_and_kind() {
        let rows = vec![
            (descriptor("AAAA", "title", "v1", 5), "alpha".to_owned()),
            (descriptor("BBBB", "abstract", "v1", 4), "beta".to_owned()),
        ];
        let fixture = fixture("scope", rows);
        fixture
            .application
            .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
            .expect("build");
        let scored = fixture
            .application
            .query(json!({"query": "alpha beta", "itemRefs": [{"libraryId": 1, "key": "BBBB"}]}))
            .expect("query");
        assert_eq!(scored.results.len(), 1);
        assert_eq!(scored.results[0].item_ref.as_ref().unwrap().key, "BBBB");
        assert!(
            fixture
                .application
                .query(json!({"query":"alpha","sourceKinds":[]}))
                .unwrap()
                .results
                .is_empty()
        );
        assert!(
            fixture
                .application
                .query(json!({"query":"alpha","itemRefs":[]}))
                .unwrap()
                .results
                .is_empty()
        );
    }

    #[test]
    fn topic_scope_is_applied_before_top_k_and_does_not_fabricate_item_refs() {
        struct Topics;
        impl TopicCanonicalPort for Topics {
            fn read_topic(&self, id: &str) -> Result<CanonicalTopicState, CanonicalError> {
                EmptyCanonical.read_topic(id)
            }
            fn search_topics(
                &self,
                _: usize,
                _: usize,
            ) -> Result<CanonicalTopicSearchSnapshot, CanonicalError> {
                let members = ["topic-A", "topic-B"].into_iter().map(|id| {
                    let mut view:CanonicalTopicView = serde_json::from_value(json!({
                        "topicId":id,"pathId":id,"manifest":{},"artifact":{},"metadata":{},"sections":{},
                        "markdown":{"overview":"alpha","discussion":"beta"}
                    })).unwrap();
                    view.basis.artifact_hash = format!("artifact:{id}");
                    CanonicalTopicSearchMember::Ready {topic_id:id.into(),path_id:id.into(),
                        basis:view.basis.clone(),content_hash:format!("content:{id}"),view:Box::new(view)}
                }).collect();
                Ok(CanonicalTopicSearchSnapshot {
                    members,
                    complete: true,
                    membership_hash: "membership".into(),
                })
            }
            fn promote(
                &self,
                p: PreparedCanonicalPromotion,
            ) -> Result<CanonicalReceipt, CanonicalError> {
                EmptyCanonical.promote(p)
            }
            fn archive_current(&self, id: &str, path: &str) -> Result<bool, CanonicalError> {
                EmptyCanonical.archive_current(id, path)
            }
            fn restore_deleted(&self, id: &str, path: &str) -> Result<bool, CanonicalError> {
                EmptyCanonical.restore_deleted(id, path)
            }
            fn purge_deleted(&self, path: &str) -> Result<bool, CanonicalError> {
                EmptyCanonical.purge_deleted(path)
            }
        }
        let mut fixture = fixture(
            "topics-filter",
            vec![(descriptor("AAAA", "title", "v1", 5), "alpha".into())],
        );
        fixture.application.canonical = Arc::new(Topics);
        let mut request = maintenance();
        request["scope"]["includeTopics"] = json!(true);
        fixture
            .application
            .build(request, RetrievalBuildMode::Full, &checkpoint())
            .unwrap();
        let hits=fixture.application.query_topics(json!({"query":"alpha","maxResults":1,"topicIds":["topic-B"],"sections":["discussion"]})).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].topic.topic_id, "topic-B");
        assert_eq!(hits[0].topic.section, "discussion");
        let combined = fixture
            .application
            .query(json!({"query":"alpha","libraryIds":[],"sourceKinds":[],"includeTopics":true}))
            .unwrap();
        assert_eq!(combined.results.len(), 2);
        assert!(
            combined
                .results
                .iter()
                .all(|hit| hit.item_ref.is_none() && hit.topic.is_some())
        );
        let publication = combined.publication.clone();
        let group = fixture
            .application
            .repository
            .with_reader(|repository| {
                Ok(repository
                    .list_retrieval_groups(&publication)?
                    .into_iter()
                    .find(|group| {
                        let source: Value = serde_json::from_str(&group.source_json).unwrap();
                        source["topicId"] == "topic-A" && source["section"] == "overview"
                    })
                    .unwrap())
            })
            .unwrap();
        fixture
            .application
            .suspend_group(&publication, &group.group_id)
            .unwrap();
        for (topic_ids, sections, limited) in [
            (json!(["topic-B"]), json!(["discussion"]), false),
            (json!(["topic-A"]), json!(["discussion"]), false),
            (json!(["topic-A"]), json!(["overview"]), true),
        ] {
            let outcome = fixture
                .application
                .query(json!({"query":"alpha",
                "libraryIds":[],"sourceKinds":[],"includeTopics":true,
                "topicIds":topic_ids,"sections":sections}))
                .unwrap();
            assert_eq!(outcome.limited, limited);
        }
    }

    #[test]
    fn invalidate_suspends_only_named_groups() {
        let rows = vec![
            (descriptor("AAAA", "title", "v1", 5), "alpha".to_owned()),
            (descriptor("BBBB", "title", "v1", 4), "beta".to_owned()),
        ];
        let fixture = fixture("invalidate", rows);
        fixture
            .application
            .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
            .expect("build");
        let basis = fixture.application.publication_basis().unwrap();
        let result = fixture
            .application
            .invalidate(json!({"paperRefs": [{"libraryId": 1, "key": "AAAA"}]}))
            .expect("invalidate");
        assert_eq!(result["invalidatedGroups"], json!(1));
        assert_ne!(fixture.application.publication_basis().unwrap(), basis);
        let scored = fixture
            .application
            .query(json!({"query": "alpha beta"}))
            .expect("query");
        assert_eq!(scored.results.len(), 1);
        assert_eq!(scored.results[0].item_ref.as_ref().unwrap().key, "BBBB");
        assert!(scored.limited);
        let publication = scored.publication;
        fixture
            .application
            .repository
            .with_writer(|repository| {
                for (group_id, item_identity, library_id, kind) in [
                    ("failed-library", "2:CCCC", 2, "metadata"),
                    ("failed-kind", "1:DDDD", 1, "fulltext"),
                ] {
                    repository.put_retrieval_group(&RetrievalGroupRecord {
                        publication_id: publication.clone(),
                        group_id: group_id.into(),
                        item_identity: item_identity.into(),
                        library_id,
                        source_json: json!({"kind":kind}).to_string(),
                        source_version: "v1".into(),
                        status: "failed".into(),
                    })?;
                }
                Ok(())
            })
            .unwrap();
        for (library_ids, kinds, items, excluded, limited) in [
            (
                json!([1]),
                json!(["metadata"]),
                json!([{"libraryId":1,"key":"BBBB"}]),
                json!([]),
                false,
            ),
            (
                json!([1]),
                json!(["metadata"]),
                Value::Null,
                json!([]),
                true,
            ),
            (
                json!([1]),
                json!(["metadata"]),
                Value::Null,
                json!([{"libraryId":1,"key":"AAAA"}]),
                false,
            ),
            (
                json!([2]),
                json!(["metadata"]),
                Value::Null,
                json!([]),
                true,
            ),
            (
                json!([1]),
                json!(["fulltext"]),
                Value::Null,
                json!([]),
                true,
            ),
            (
                json!([3]),
                json!(["metadata"]),
                Value::Null,
                json!([]),
                false,
            ),
            (json!([1]), json!([]), Value::Null, json!([]), false),
        ] {
            let outcome = fixture
                .application
                .query({
                    // A null optional field is rejected by the request trust
                    // boundary, so an absent filter is omitted, not nulled.
                    let mut request = json!({
                        "query":"alpha beta",
                        "libraryIds":library_ids,
                        "sourceKinds":kinds,
                    });
                    if !items.is_null() {
                        request["itemRefs"] = items.clone();
                    }
                    if !excluded.is_null() {
                        request["excludeItemRefs"] = excluded.clone();
                    }
                    request
                })
                .unwrap();
            assert_eq!(outcome.limited, limited);
        }
        fixture
            .application
            .repository
            .with_writer(|repository| {
                let group = repository
                    .list_retrieval_groups(&publication)?
                    .into_iter()
                    .find(|group| group.item_identity == "1:AAAA")
                    .unwrap();
                repository.set_retrieval_group_status(&publication, &group.group_id, "missing")
            })
            .unwrap();
        let missing = fixture
            .application
            .query(json!({"query":"alpha beta",
            "libraryIds":[1],"sourceKinds":["metadata"]}))
            .unwrap();
        assert!(!missing.limited);
        assert!(missing.issues.is_empty());
    }

    #[test]
    fn failed_source_read_blocks_publication_and_keeps_pause() {
        struct PartialSources {
            inner: FakeSources,
            broken: String,
        }
        impl EvidenceSourcePort for PartialSources {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                self.inner.list_sources(request)
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                if request["descriptor"]["itemRef"]["key"] == json!(self.broken) {
                    return Ok(json!({"outcome": "source_unavailable"}));
                }
                self.inner.read_source(request)
            }
        }
        let root = TestRoot::new("synthesis-retrieval-failed-read");
        let repository = Repository::open(
            root.path(),
            RepositoryIdentity {
                profile_id: "profile:retrieval".into(),
                data_root_id: "data:retrieval".into(),
            },
        )
        .expect("repository");
        let application = RetrievalApplication::new(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository)))),
            Arc::new(PartialSources {
                inner: FakeSources {
                    rows: vec![
                        (descriptor("AAAA", "title", "v1", 5), "alpha".to_owned()),
                        (descriptor("BBBB", "title", "v1", 4), "beta".to_owned()),
                    ],
                },
                broken: "BBBB".into(),
            }),
            Arc::new(FakeEmbeddings),
            Arc::new(EmptyCanonical),
        )
        .with_clock(Arc::new(|| "2026-10-07T00:00:00.000Z".into()));
        assert!(
            application
                .build(maintenance(), RetrievalBuildMode::Full, &checkpoint())
                .is_err()
        );
        let state = application.state().unwrap();
        assert_eq!(state["status"], json!("paused"));
        assert!(
            state["progress"]["failedGroups"]
                .as_i64()
                .unwrap_or_default()
                >= 1
        );
        assert!(application.query(json!({"query": "alpha"})).is_err());
    }

    #[test]
    fn canonical_topic_view_round_trips_for_section_fragments() {
        // Guards the view shape the topic indexing path reads (markdown).
        let view: CanonicalTopicView = serde_json::from_value(json!({
            "topicId": "topic-1",
            "pathId": "topic-1",
            "manifest": {},
            "artifact": {},
            "metadata": {},
            "sections": {},
            "markdown": {"overview": "hello topic"},
        }))
        .expect("view");
        assert_eq!(
            view.markdown.get("overview").map(String::as_str),
            Some("hello topic")
        );
    }
}
