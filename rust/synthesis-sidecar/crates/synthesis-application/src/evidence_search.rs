use crate::lexical_search::{LexicalMatch, LexicalQuery};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ItemRef {
    pub library_id: u64,
    pub key: String,
}

impl ItemRef {
    fn valid(&self) -> bool {
        self.library_id > 0
            && self.library_id <= 9_007_199_254_740_991
            && !self.key.is_empty()
            && self.key.len() <= 64
            && self.key.chars().all(|c| c.is_ascii_alphanumeric())
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum SourceKind {
    Metadata,
    Fulltext,
    Analysis,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceSearchRequest {
    pub query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_results: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub library_ids: Option<Vec<u64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_refs: Option<Vec<ItemRef>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_ref: Option<ItemRef>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_kinds: Option<Vec<SourceKind>>,
}

impl EvidenceSearchRequest {
    pub fn from_value(value: Value) -> Result<Self, String> {
        if value
            .as_object()
            .is_none_or(|object| object.values().any(Value::is_null))
        {
            return Err("invalid_request".into());
        }
        let request: Self =
            serde_json::from_value(value).map_err(|_| "invalid_request".to_owned())?;
        if request.query.trim().is_empty()
            || request.query.encode_utf16().count() > 4096
            || request.limit.is_some_and(|n| n == 0 || n > 100)
            || request.max_results.is_some_and(|n| n == 0 || n > 500)
            || request
                .cursor
                .as_ref()
                .is_some_and(|s| s.is_empty() || s.encode_utf16().count() > 4096)
            || request.library_ids.as_ref().is_some_and(|ids| {
                ids.is_empty()
                    || ids.len() > 100
                    || ids.iter().any(|id| *id == 0 || *id > 9_007_199_254_740_991)
            })
            || request
                .item_refs
                .as_ref()
                .is_some_and(|refs| refs.len() > 100 || refs.iter().any(|r| !r.valid()))
            || request.collection_ref.as_ref().is_some_and(|r| !r.valid())
            || request
                .tag
                .as_ref()
                .is_some_and(|s| s.is_empty() || s.encode_utf16().count() > 256)
            || request
                .item_type
                .as_ref()
                .is_some_and(|s| s.is_empty() || s.encode_utf16().count() > 64)
            || request
                .source_kinds
                .as_ref()
                .is_some_and(|kinds| kinds.len() > 3)
            || request.limit.unwrap_or(25) > request.max_results.unwrap_or(100)
        {
            return Err("invalid_request".into());
        }
        Ok(request)
    }
}

/// The source owner supplies facts and verifies them again before publication.
/// Retrieval never resolves Zotero identity or local file paths itself.
pub trait EvidenceSourcePort: Send + Sync {
    fn list_sources(&self, request: Value) -> Result<Value, String>;
    fn read_source(&self, request: Value) -> Result<Value, String>;
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SourceDescriptor {
    item_ref: ItemRef,
    source: EvidenceSource,
    source_version: String,
    format: TextFormat,
    content_length: usize,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
enum EvidenceSource {
    Metadata {
        field: String,
    },
    Fulltext {
        #[serde(rename = "attachmentRef")]
        attachment_ref: ItemRef,
    },
    Analysis {
        #[serde(rename = "artifactType")]
        artifact_type: ArtifactType,
        #[serde(rename = "noteRef")]
        note_ref: ItemRef,
    },
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum ArtifactType {
    Digest,
    References,
    CitationAnalysis,
    LiteratureScore,
}
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum TextFormat {
    Text,
    Markdown,
}

impl EvidenceSource {
    fn kind(&self) -> SourceKind {
        match self {
            Self::Metadata { .. } => SourceKind::Metadata,
            Self::Fulltext { .. } => SourceKind::Fulltext,
            Self::Analysis { .. } => SourceKind::Analysis,
        }
    }
    fn field(&self) -> Option<&str> {
        match self {
            Self::Metadata { field } => Some(field),
            _ => None,
        }
    }
    fn valid(&self, item: &ItemRef) -> bool {
        match self {
            Self::Metadata { field } => matches!(
                field.as_str(),
                "title" | "abstract" | "creator" | "tags" | "date" | "publicationTitle"
            ),
            Self::Fulltext { attachment_ref } => {
                attachment_ref.valid() && attachment_ref.library_id == item.library_id
            }
            Self::Analysis { note_ref, .. } => {
                note_ref.valid() && note_ref.library_id == item.library_id
            }
        }
    }
}

#[derive(Clone)]
struct Candidate {
    descriptor: SourceDescriptor,
    location: Value,
    content: String,
    context: Vec<Value>,
    matched: LexicalMatch,
    identity: String,
}

#[derive(Clone)]
struct SearchRound {
    request_basis: String,
    method: &'static str,
    publication: Option<String>,
    resolved_scope: Value,
    catalog_basis: String,
    catalog_issues: Vec<Value>,
    catalog_limited: bool,
    candidates: Vec<Candidate>,
    coverage: Value,
    issues: Vec<Value>,
    total: Option<usize>,
    created: Instant,
}

struct Rounds {
    sequence: u64,
    rounds: BTreeMap<String, SearchRound>,
}

/// Bounded source facts shared by the public passage search and the private
/// item projection. Both consume identical catalog, source, budget and match
/// semantics and only differ in how candidates are ranked and projected.
struct Scan {
    kinds: Vec<SourceKind>,
    scope: Value,
    descriptors: Vec<SourceDescriptor>,
    catalog_issues: Vec<Value>,
    catalog_limited: bool,
    catalog_basis: String,
    counts: BTreeMap<SourceKind, usize>,
    issues: Vec<Value>,
    candidates: Vec<Candidate>,
    empty_scope: bool,
}

struct EvidenceCatalog<'a> {
    scope: &'a Value,
    kinds: &'a [SourceKind],
    descriptors: &'a [SourceDescriptor],
}

impl Scan {
    fn coverage(&self, counts: &BTreeMap<SourceKind, usize>, issues: &[Value]) -> Value {
        json!({"kind":"library","sources":{
            "metadata":work_coverage(SourceKind::Metadata,&self.kinds,counts,issues,self.catalog_limited),
            "fulltext":work_coverage(SourceKind::Fulltext,&self.kinds,counts,issues,self.catalog_limited),
            "analysis":work_coverage(SourceKind::Analysis,&self.kinds,counts,issues,self.catalog_limited),
        }})
    }
}

pub struct EvidenceSearchApplication {
    sources: Arc<dyn EvidenceSourcePort>,
    rounds: Mutex<Rounds>,
    retrieval: Option<Arc<crate::retrieval::RetrievalApplication>>,
}

const MAX_SOURCES: usize = 256;
const MAX_SCAN_BYTES: usize = 4 * 1024 * 1024;
const MAX_PASSAGES: usize = 4096;
const MAX_PASSAGE_UTF16: usize = 2048;
const MAX_ROUND_BYTES: usize = 512 * 1024;
/// The private execution response is bounded well below the generic RPC
/// response ceiling because it carries descriptors and every match location.
const MAX_EXECUTION_BYTES: usize = 768 * 1024;
const CURSOR_LIFETIME: Duration = Duration::from_secs(60);

impl EvidenceSearchApplication {
    pub fn new(sources: Arc<dyn EvidenceSourcePort>) -> Self {
        Self {
            sources,
            rounds: Mutex::new(Rounds {
                sequence: 0,
                rounds: BTreeMap::new(),
            }),
            retrieval: None,
        }
    }

    /// Attach the optional Retrieval owner. Without it the application keeps
    /// its independent lexical behavior; `new` remains the no-augmentation
    /// constructor.
    pub fn with_retrieval(
        mut self,
        retrieval: Arc<crate::retrieval::RetrievalApplication>,
    ) -> Self {
        self.retrieval = Some(retrieval);
        self
    }

    pub fn search(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let mut request = EvidenceSearchRequest::from_value(request)?;
        let query = LexicalQuery::new(&request.query).map_err(|_| "invalid_request".to_owned())?;
        if let Some(refs) = &mut request.item_refs {
            refs.sort();
            refs.dedup();
        }
        if let Some(ids) = &mut request.library_ids {
            ids.sort();
            ids.dedup();
        }
        if let Some(kinds) = &mut request.source_kinds {
            kinds.sort();
            kinds.dedup();
        }
        let cursor = request.cursor.take();
        let basis = hash(&json!({"algorithm":"lexical-evidence-v1","request":request}));
        let limit = request.limit.unwrap_or(25);
        if let Some(cursor) = cursor {
            let (id, offset) = cursor
                .rsplit_once(':')
                .ok_or_else(|| "basis_mismatch".to_owned())?;
            let offset = offset
                .parse::<usize>()
                .map_err(|_| "basis_mismatch".to_owned())?;
            let round = self
                .rounds
                .lock()
                .map_err(|_| "search_unavailable".to_owned())?
                .rounds
                .get(id)
                .cloned()
                .ok_or_else(|| "basis_mismatch".to_owned())?;
            if round.request_basis != basis
                || round.created.elapsed() > CURSOR_LIFETIME
                || offset >= round.candidates.len()
                || offset % limit != 0
            {
                return Err("basis_mismatch".into());
            }
            checkpoint()?;
            let (descriptors, scope, issues, limited) =
                self.catalog(&request, Some(&round.resolved_scope), checkpoint, 32)?;
            if issues != round.catalog_issues
                || limited != round.catalog_limited
                || hash(&json!({"scope":scope,"descriptors":descriptors})) != round.catalog_basis
            {
                return Err("basis_mismatch".into());
            }
            // An enhanced round also binds the retrieval publication it was
            // fused against; a replaced publication makes it stale without
            // reissuing any encoding work.
            if let Some(bound) = &round.publication {
                let current = self
                    .retrieval
                    .as_ref()
                    .and_then(|retrieval| retrieval.publication_basis().ok().flatten());
                if current.as_ref() != Some(bound) {
                    return Err("basis_mismatch".into());
                }
            }
            return self.page(&round, id, offset, limit, true, checkpoint);
        }
        checkpoint()?;
        let kinds = request.source_kinds.clone().unwrap_or_else(|| {
            vec![
                SourceKind::Metadata,
                SourceKind::Fulltext,
                SourceKind::Analysis,
            ]
        });
        let scan = self.scan(&request, &query, &kinds, None, checkpoint, 32)?;
        if scan.empty_scope {
            return Ok(json!({"results":[],"status":"completed","method":"lexical",
                "coverage":scan.coverage(&BTreeMap::new(), &[]),"issues":[],
                "nextCursor":null,"hasMore":false,"total":0}));
        }
        let scope = scan.scope;
        let catalog_issues = scan.catalog_issues;
        let catalog_limited = scan.catalog_limited;
        let catalog_basis = scan.catalog_basis;
        let counts = scan.counts;
        let mut issues = scan.issues;
        let mut candidates = scan.candidates;
        let max_results = request.max_results.unwrap_or(100);
        if candidates.len() > max_results {
            candidates.truncate(max_results);
            add_issue(&mut issues, "result_budget_exhausted", None);
        }
        let mut verified = Vec::new();
        let mut round_bytes = 0;
        for candidate in candidates {
            if let Err(code) = checkpoint() {
                if code != "operation_timeout" {
                    return Err(code);
                }
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            match self.verify(&scope, &candidate) {
                Ok(context) => {
                    round_bytes += candidate.content.len()
                        + context
                            .iter()
                            .map(|value| value["content"].as_str().unwrap_or_default().len())
                            .sum::<usize>();
                    if round_bytes > MAX_ROUND_BYTES {
                        add_issue(&mut issues, "result_budget_exhausted", None);
                        break;
                    }
                    verified.push(Candidate {
                        context,
                        ..candidate
                    });
                }
                Err(code) => add_issue(&mut issues, code, Some(candidate.descriptor.source.kind())),
            }
        }
        let method = match self.retrieval.clone() {
            Some(retrieval) => self
                .union_evidence_passages(
                    &request,
                    EvidenceCatalog {
                        scope: &scope,
                        kinds: &kinds,
                        descriptors: &scan.descriptors,
                    },
                    &mut verified,
                    &mut issues,
                    &retrieval,
                    checkpoint,
                )?
                .unwrap_or("lexical"),
            None => "lexical",
        };
        // Frozen after the union, so a suspension performed during source
        // verification is already reflected in the bound basis.
        let publication = self
            .retrieval
            .as_ref()
            .and_then(|retrieval| retrieval.publication_basis().ok().flatten());
        let coverage = json!({"kind":"library","sources":{
            "metadata": work_coverage(SourceKind::Metadata,&kinds,&counts,&issues,catalog_limited),
            "fulltext": work_coverage(SourceKind::Fulltext,&kinds,&counts,&issues,catalog_limited),
            "analysis": work_coverage(SourceKind::Analysis,&kinds,&counts,&issues,catalog_limited),
        }});
        let total = if issues.is_empty() {
            Some(verified.len())
        } else {
            None
        };
        let round = SearchRound {
            request_basis: basis,
            method,
            publication,
            resolved_scope: scope,
            catalog_basis,
            catalog_issues,
            catalog_limited,
            candidates: verified,
            coverage,
            issues,
            total,
            created: Instant::now(),
        };
        let id = {
            let mut state = self
                .rounds
                .lock()
                .map_err(|_| "search_unavailable".to_owned())?;
            state
                .rounds
                .retain(|_, round| round.created.elapsed() <= CURSOR_LIFETIME);
            while state.rounds.len() >= 8 {
                let oldest = state
                    .rounds
                    .iter()
                    .min_by_key(|(_, round)| round.created)
                    .map(|(id, _)| id.clone())
                    .unwrap();
                state.rounds.remove(&oldest);
            }
            state.sequence += 1;
            let id = format!("evidence:{}:{}", std::process::id(), state.sequence);
            if round.candidates.len() > limit {
                state.rounds.insert(id.clone(), round.clone());
            }
            id
        };
        self.page(&round, &id, 0, limit, false, checkpoint)
    }

    #[allow(clippy::too_many_arguments)]
    fn scan(
        &self,
        request: &EvidenceSearchRequest,
        query: &LexicalQuery,
        kinds: &[SourceKind],
        captured: Option<&Value>,
        checkpoint: &dyn Fn() -> Result<(), String>,
        page_budget: usize,
    ) -> Result<Scan, String> {
        let (descriptors, scope, mut issues, catalog_limited) =
            self.catalog(request, captured, checkpoint, page_budget)?;
        let empty_scope = issues.is_empty()
            && (kinds.is_empty() || request.item_refs.as_ref().is_some_and(Vec::is_empty));
        let catalog_basis = hash(&json!({"scope":scope,"descriptors":descriptors}));
        let catalog_issues = issues.clone();
        let mut counts = BTreeMap::<SourceKind, usize>::new();
        let mut candidates = Vec::new();
        let mut bytes = 0;
        let mut passages = 0;
        for descriptor in &descriptors {
            if let Err(code) = checkpoint() {
                if code != "operation_timeout" {
                    return Err(code);
                }
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            let kind = descriptor.source.kind();
            if !kinds.contains(&kind) {
                add_issue(&mut issues, "invalid_source", Some(kind));
                continue;
            }
            *counts.entry(kind).or_default() += 1;
            let read = match self
                .sources
                .read_source(json!({"scope":scope,"descriptor":descriptor}))
            {
                Ok(value) => value,
                Err(code) if code == "operation_timeout" => {
                    add_issue(&mut issues, "scan_budget_exhausted", None);
                    break;
                }
                Err(_) => {
                    add_issue(&mut issues, "source_read_failed", Some(kind));
                    continue;
                }
            };
            let Some(content) = available_content(&read, descriptor, None) else {
                add_issue(&mut issues, read_issue(&read), Some(kind));
                continue;
            };
            bytes += content.len();
            if bytes > MAX_SCAN_BYTES {
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            for (location, passage, context) in segment(&content, &descriptor.source) {
                passages += 1;
                if passages > MAX_PASSAGES {
                    add_issue(&mut issues, "passage_budget_exhausted", None);
                    break;
                }
                if let Some(matched) = query.match_text(&passage) {
                    let identity = format!(
                        "{:020}:{}:{}:{:010}",
                        descriptor.item_ref.library_id,
                        descriptor.item_ref.key,
                        hash(&json!(descriptor.source)),
                        location["range"]["start"].as_u64().unwrap_or_default()
                    );
                    candidates.push(Candidate {
                        descriptor: descriptor.clone(),
                        location,
                        content: passage,
                        context,
                        matched,
                        identity,
                    });
                }
            }
            if passages > MAX_PASSAGES {
                break;
            }
        }
        candidates.sort_by(|a, b| {
            crate::lexical_search::compare_matches(
                &a.matched,
                field_priority(&a.descriptor.source),
                &a.identity,
                &b.matched,
                field_priority(&b.descriptor.source),
                &b.identity,
            )
        });
        Ok(Scan {
            kinds: kinds.to_vec(),
            scope,
            descriptors,
            catalog_issues,
            catalog_limited,
            catalog_basis,
            counts,
            issues,
            candidates,
            empty_scope,
        })
    }

    /// Executes the private, unpaged item projection used by the Zotero Host Broker.
    pub fn search_library_items(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let mut request = EvidenceSearchRequest::from_value(request)?;
        if request.library_ids.as_ref().is_none_or(Vec::is_empty) || request.cursor.is_some() {
            return Err("invalid_request".into());
        }
        let query = LexicalQuery::new(&request.query).map_err(|_| "invalid_request".to_owned())?;
        if let Some(ids) = &mut request.library_ids {
            ids.sort_unstable();
            ids.dedup();
        }
        if let Some(refs) = &mut request.item_refs {
            refs.sort();
            refs.dedup();
        }
        if let Some(kinds) = &mut request.source_kinds {
            kinds.sort();
            kinds.dedup();
        }
        let kinds = request.source_kinds.clone().unwrap_or_else(|| {
            vec![
                SourceKind::Metadata,
                SourceKind::Fulltext,
                SourceKind::Analysis,
            ]
        });
        checkpoint()?;
        let mut scan = self.scan(&request, &query, &kinds, None, checkpoint, 8)?;
        let scope = std::mem::take(&mut scan.scope);
        let descriptors = std::mem::take(&mut scan.descriptors);
        let catalog_issues = std::mem::take(&mut scan.catalog_issues);
        let catalog_limited = scan.catalog_limited;
        let counts = std::mem::take(&mut scan.counts);
        let mut issues = std::mem::take(&mut scan.issues);
        let mut items = BTreeMap::<ItemRef, (LexicalMatch, usize, String, Vec<Value>)>::new();
        let mut verified_bytes = 0usize;
        for candidate in std::mem::take(&mut scan.candidates) {
            if let Err(code) = checkpoint() {
                if code != "operation_timeout" {
                    return Err(code);
                }
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            match self.verify(&scope, &candidate) {
                Ok(_) => {
                    verified_bytes += candidate.content.len();
                    if verified_bytes > MAX_ROUND_BYTES {
                        add_issue(&mut issues, "result_budget_exhausted", None);
                        break;
                    }
                    let reference = candidate.descriptor.item_ref.clone();
                    let priority = field_priority(&candidate.descriptor.source);
                    let terms = query.matched_terms(&candidate.content);
                    let hit = json!({
                        "source":candidate.descriptor.source,
                        "sourceVersion":candidate.descriptor.source_version,
                        "location":candidate.location,
                        "matchedTerms":terms,
                        "phraseMatch":candidate.matched.phrase
                    });
                    let entry = items.entry(reference).or_insert_with(|| {
                        (
                            candidate.matched.clone(),
                            priority,
                            candidate.identity.clone(),
                            Vec::new(),
                        )
                    });
                    if crate::lexical_search::compare_matches(
                        &candidate.matched,
                        priority,
                        &candidate.identity,
                        &entry.0,
                        entry.1,
                        &entry.2,
                    ) == std::cmp::Ordering::Less
                    {
                        entry.0 = candidate.matched;
                        entry.1 = priority;
                        entry.2 = candidate.identity;
                    }
                    entry.3.push(hit);
                }
                Err(code) => add_issue(&mut issues, code, Some(candidate.descriptor.source.kind())),
            }
        }
        let mut ranked = items.into_iter().collect::<Vec<_>>();
        ranked.sort_by(|left, right| {
            crate::lexical_search::compare_matches(
                &left.1.0, left.1.1, &left.1.2, &right.1.0, right.1.1, &right.1.2,
            )
        });
        let total_before_limit = ranked.len();
        let max_results = request.max_results.unwrap_or(100);
        if ranked.len() > max_results {
            ranked.truncate(max_results);
            add_issue(&mut issues, "result_budget_exhausted", None);
        }
        let results = ranked
            .into_iter()
            .map(|(item_ref, (_, _, _, matches))| json!({"itemRef":item_ref,"matches":matches}))
            .collect::<Vec<_>>();
        let unavailable = total_before_limit == 0
            && issues
                .iter()
                .all(|issue| issue["code"] == "source_unavailable");
        // Bounded projection: drop the weakest trailing matches, then whole
        // items, until the private response fits its own byte budget. A
        // truncated response reports `limited` and no exact total.
        let status = if issues.is_empty() {
            "completed"
        } else if unavailable {
            "unavailable"
        } else {
            "limited"
        };
        let total = issues.is_empty().then_some(total_before_limit);
        let coverage = scan.coverage(&counts, &issues);
        let mut execution = json!({"result":{"results":results,"status":status,"method":"lexical",
            "coverage":coverage,"issues":issues,"nextCursor":null,"hasMore":false,"total":total},
            "scope":scope,"descriptors":descriptors,
            "catalogIssues":catalog_issues,"catalogLimited":catalog_limited});
        let encoded_size = |value: &Value| {
            serde_json::to_vec(value)
                .map(|bytes| bytes.len())
                .map_err(|_| "worker_result_invalid".to_owned())
        };
        let mut execution_bytes = encoded_size(&execution)?;
        if execution_bytes > MAX_EXECUTION_BYTES {
            add_issue(&mut issues, "result_budget_exhausted", None);
            execution["result"]["status"] = json!("limited");
            execution["result"]["total"] = Value::Null;
            execution["result"]["issues"] = json!(issues);
            execution["result"]["coverage"] = scan.coverage(&counts, &issues);
            execution_bytes = encoded_size(&execution)?;
            let results = execution["result"]["results"]
                .as_array_mut()
                .ok_or("worker_result_invalid")?;
            while execution_bytes > MAX_EXECUTION_BYTES {
                let item_count = results.len();
                let item = results.last_mut().ok_or("response_too_large")?;
                let matches = item["matches"]
                    .as_array_mut()
                    .ok_or("worker_result_invalid")?;
                let match_count = matches.len();
                let removed = matches.pop().ok_or("worker_result_invalid")?;
                // JSON array removal deletes the encoded value and its comma.
                // Count each removed value once instead of serializing the whole
                // response after every match. Empty items leave in the same step.
                execution_bytes -= encoded_size(&removed)? + usize::from(match_count > 1);
                if matches.is_empty() {
                    let removed_item = results.pop().ok_or("worker_result_invalid")?;
                    execution_bytes -= encoded_size(&removed_item)? + usize::from(item_count > 1);
                }
            }
        }
        if !validate_library_lexical_result(&execution) {
            return Err("worker_result_invalid".into());
        }
        Ok(execution)
    }

    /// Private Library retrieval route. It keeps every lexical item and unions
    /// in scoped vector-only items, then fuses with equal-weight RRF (k=60).
    /// Only items eligible in this call's catalog participate; a vector-only
    /// item is included only after the current source is read and its original
    /// UTF-16 range verified in the same call. Retrieval absence or failure
    /// leaves the truthful lexical method in place; no score is ever exposed.
    pub fn search_library_items_with_retrieval(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let Some(retrieval) = self.retrieval.clone() else {
            return self.search_library_items(request, checkpoint);
        };
        let Ok(parsed) = EvidenceSearchRequest::from_value(request.clone()) else {
            return self.search_library_items(request, checkpoint);
        };
        let mut execution = self.search_library_items(request, checkpoint)?;
        let lexical_empty = execution["result"]["results"]
            .as_array()
            .is_none_or(Vec::is_empty);
        let scope = execution["scope"].clone();
        let descriptors = execution["descriptors"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        // Eligible identities come from this call's catalog scope, so a vector
        // hit outside the requested libraries/filters can never enter.
        let eligible = descriptors
            .iter()
            .filter_map(|descriptor| {
                Some(format!(
                    "{}:{}",
                    descriptor["itemRef"]["libraryId"].as_u64()?,
                    descriptor["itemRef"]["key"].as_str()?
                ))
            })
            .collect::<BTreeSet<_>>();
        // The Retrieval owner intersects this call's complete eligible identity
        // set before scoring, so a collection/tag/itemType hard scope is applied
        // before any result budget is spent.
        let mut query = json!({"query": parsed.query.clone(), "maxResults": 500});
        if let Some(libraries) = scope.get("libraryIds").filter(|value| value.is_array()) {
            query["libraryIds"] = libraries.clone();
        }
        if let Some(kinds) = &parsed.source_kinds {
            query["sourceKinds"] = json!(kinds);
        }
        let outcome = match retrieval.query_scoped(query, &eligible, checkpoint) {
            Ok(outcome) => outcome,
            Err(code) => {
                let issue = enhancement_failure_issue(code, checkpoint)?;
                // Enhancement was expected but failed: keep the lexical method and
                // report it truthfully. A disabled or unconfigured index stays
                // silent so a plain lexical search is not flagged.
                if retrieval_is_active(&retrieval) {
                    let mut issues = execution["result"]["issues"]
                        .as_array()
                        .cloned()
                        .unwrap_or_default();
                    add_issue(&mut issues, issue, None);
                    flush_library_issues(&mut execution, issues);
                }
                execution["publication"] = Value::Null;
                return Ok(execution);
            }
        };
        let mut results = execution["result"]["results"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        let mut vector = Vec::new();
        let mut issues = execution["result"]["issues"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        if outcome.limited {
            add_issue(&mut issues, "result_budget_exhausted", None);
        }
        for issue in &outcome.issues {
            if let Some(code) = issue.get("code").and_then(Value::as_str) {
                add_issue(&mut issues, code, None);
            }
        }
        // Lexical ranking is frozen from the original lexical result set only;
        // a semantic-only item appended below must never earn a lexical rank.
        let lexical_ids = results
            .iter()
            .map(library_item_identity)
            .collect::<BTreeSet<_>>();
        for fragment in outcome
            .results
            .iter()
            .filter(|fragment| fragment.topic.is_none())
        {
            let Some(item_ref) = fragment.item_ref.as_ref() else {
                continue;
            };
            let identity = format!("{}:{}", item_ref.library_id, item_ref.key);
            if !eligible.contains(&identity) {
                continue;
            }
            if results
                .iter()
                .any(|result| library_item_identity(result) == identity)
            {
                // A lexical item's semantic rank only counts once its indexed
                // source version and current range verify, so a stale vector
                // cannot move an already-returned item.
                match self.verify_indexed_hit_library(&scope, &descriptors, fragment) {
                    Ok(_) => vector.push((identity, fragment.score)),
                    Err(code) => {
                        let _ = retrieval.suspend_group(&outcome.publication, &fragment.group_id);
                        add_issue(&mut issues, &code, None);
                    }
                }
                continue;
            }
            match self.verify_semantic_hit(&scope, &descriptors, fragment) {
                Ok(hit) => {
                    results.push(json!({
                        "itemRef": {"libraryId": item_ref.library_id, "key": item_ref.key},
                        "matches": [hit],
                    }));
                    vector.push((identity, fragment.score));
                }
                Err(code) => {
                    let _ = retrieval.suspend_group(&outcome.publication, &fragment.group_id);
                    add_issue(&mut issues, &code, None);
                }
            }
        }
        if vector.is_empty() {
            // Surface any verification failure or truthful bound before leaving.
            flush_library_issues(&mut execution, issues);
            execution["publication"] = Value::Null;
            return Ok(execution);
        }
        execution["result"]["results"] = Value::Array(results);
        flush_library_issues(&mut execution, issues);
        apply_library_fusion(&mut execution, &vector, &lexical_ids);
        let result_count = execution["result"]["results"].as_array().unwrap().len();
        let max_results = parsed.max_results.unwrap_or(100);
        if result_count > max_results {
            execution["result"]["results"]
                .as_array_mut()
                .unwrap()
                .truncate(max_results);
            let mut issues = execution["result"]["issues"]
                .as_array()
                .cloned()
                .unwrap_or_default();
            add_issue(&mut issues, "result_budget_exhausted", None);
            flush_library_issues(&mut execution, issues);
        } else if execution["result"]["issues"]
            .as_array()
            .is_some_and(Vec::is_empty)
        {
            execution["result"]["total"] = json!(result_count);
        }
        if lexical_empty {
            execution["result"]["method"] = json!("vector");
        }
        // The frozen basis token is read after source verification, so a stale
        // suspension performed above is already reflected and cannot make this
        // freshly frozen round immediately stale. It matches getState().
        // publication, not the raw publication id.
        execution["publication"] = retrieval
            .publication_basis()
            .ok()
            .flatten()
            .map_or(Value::Null, Value::from);
        Ok(execution)
    }

    /// Read the current source for one scoped vector-only hit and verify the
    /// stored source version and original UTF-16 range in this same call.
    fn verify_semantic_hit(
        &self,
        scope: &Value,
        descriptors: &[Value],
        fragment: &crate::retrieval::ScoredFragment,
    ) -> Result<Value, String> {
        let (source, location) = self.verify_indexed_hit_library(scope, descriptors, fragment)?;
        Ok(json!({
            "source": source,
            "sourceVersion": fragment.source_version,
            "location": location,
            "matchedTerms": [],
            "phraseMatch": false,
        }))
    }

    /// Shared Library trust check. The indexed descriptor must still match the
    /// current source, source version and original range, and the read passage
    /// must pass the same `available_content` verification the lexical search
    /// relies on (outcome, itemRef, source, format, version, range).
    fn verify_indexed_hit_library(
        &self,
        scope: &Value,
        descriptors: &[Value],
        fragment: &crate::retrieval::ScoredFragment,
    ) -> Result<(Value, Value), String> {
        let item_ref = fragment
            .item_ref
            .as_ref()
            .ok_or_else(|| "invalid_source".to_owned())?;
        let source: Value =
            serde_json::from_str(&fragment.source_json).map_err(|_| "invalid_source".to_owned())?;
        let location: Value = serde_json::from_str(&fragment.location_json)
            .map_err(|_| "invalid_source".to_owned())?;
        let descriptor = descriptors
            .iter()
            .find(|descriptor| {
                descriptor["itemRef"]["libraryId"].as_u64() == Some(item_ref.library_id)
                    && descriptor["itemRef"]["key"].as_str() == Some(item_ref.key.as_str())
                    && descriptor["source"] == source
            })
            .ok_or_else(|| "source_unavailable".to_owned())?;
        let parsed: SourceDescriptor =
            serde_json::from_value(descriptor.clone()).map_err(|_| "invalid_source".to_owned())?;
        if parsed.source_version != fragment.source_version
            || fragment.range_end <= fragment.range_start
            || fragment.range_end > parsed.content_length as i64
        {
            return Err("source_changed".into());
        }
        let read = self
            .sources
            .read_source(json!({"scope": scope, "descriptor": descriptor, "location": location}))
            .map_err(|_| "source_read_failed".to_owned())?;
        available_content(&read, &parsed, Some(&location))
            .ok_or_else(|| read_issue(&read).to_owned())?;
        Ok((source, location))
    }

    fn catalog(
        &self,
        request: &EvidenceSearchRequest,
        captured: Option<&Value>,
        checkpoint: &dyn Fn() -> Result<(), String>,
        page_budget: usize,
    ) -> Result<(Vec<SourceDescriptor>, Value, Vec<Value>, bool), String> {
        let value = serde_json::to_value(request).map_err(|_| "invalid_request".to_owned())?;
        let mut scope_input = value.as_object().unwrap().clone();
        for key in ["query", "maxResults", "limit", "sourceKinds"] {
            scope_input.remove(key);
        }
        let mut input = serde_json::Map::new();
        input.insert(
            "scope".into(),
            captured.cloned().unwrap_or(Value::Object(scope_input)),
        );
        if let Some(kinds) = &request.source_kinds {
            input.insert("sourceKinds".into(), json!(kinds));
        }
        let mut descriptors = Vec::new();
        let mut scope = None;
        let mut issues = Vec::new();
        let mut seen = BTreeSet::new();
        let mut cursors = BTreeSet::new();
        let mut limited = false;
        let mut pages = 0;
        loop {
            if let Err(code) = checkpoint() {
                if code != "operation_timeout" {
                    return Err(code);
                }
                limited = true;
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            pages += 1;
            if pages > page_budget {
                limited = true;
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
            input.insert(
                "limit".into(),
                json!((MAX_SOURCES - descriptors.len()).min(100)),
            );
            let page = match self.sources.list_sources(Value::Object(input.clone())) {
                Ok(page) => page,
                Err(code)
                    if code == "invalid_request"
                        || code == "basis_mismatch"
                        || code == "conflict" =>
                {
                    return Err(code);
                }
                Err(code) if code == "operation_timeout" || code == "resource_limited" => {
                    limited = true;
                    add_issue(&mut issues, "scan_budget_exhausted", None);
                    break;
                }
                Err(_) => {
                    add_issue(&mut issues, "source_unavailable", None);
                    break;
                }
            };
            let current = page
                .get("scope")
                .filter(|v| v.is_object())
                .ok_or("invalid_source")?;
            if scope.as_ref().is_some_and(|s| s != current) {
                return Err("basis_mismatch".into());
            }
            if captured.is_some_and(|s| s != current) {
                return Err("basis_mismatch".into());
            }
            scope = Some(current.clone());
            input.insert("scope".into(), current.clone());
            if current["libraryIds"]
                .as_array()
                .is_none_or(|a| a.is_empty())
            {
                return Err("invalid_request".into());
            }
            if let Some(page_issues) = page["issues"].as_array() {
                for issue in page_issues {
                    add_issue_count(
                        &mut issues,
                        issue["code"]
                            .as_str()
                            .filter(|s| {
                                matches!(
                                    *s,
                                    "source_unavailable"
                                        | "source_changed"
                                        | "source_read_failed"
                                        | "invalid_source"
                                        | "scan_budget_exhausted"
                                        | "passage_budget_exhausted"
                                        | "result_budget_exhausted"
                                )
                            })
                            .unwrap_or("invalid_source"),
                        serde_json::from_value(issue["sourceKind"].clone()).ok(),
                        issue["affectedCount"].as_u64().unwrap_or(1) as usize,
                    );
                }
            }
            let rows = page["descriptors"].as_array().ok_or("invalid_source")?;
            if rows.len() > 100 {
                return Err("invalid_source".into());
            }
            for row in rows {
                let descriptor: SourceDescriptor = match serde_json::from_value(row.clone()) {
                    Ok(d) => d,
                    Err(_) => {
                        add_issue(&mut issues, "invalid_source", None);
                        continue;
                    }
                };
                if !descriptor.item_ref.valid()
                    || !descriptor.source.valid(&descriptor.item_ref)
                    || descriptor.source_version.is_empty()
                    || descriptor.source_version.encode_utf16().count() > 256
                    || descriptor.content_length > 262144
                    || current["libraryIds"]
                        .as_array()
                        .is_none_or(|ids| !ids.contains(&json!(descriptor.item_ref.library_id)))
                    || request
                        .item_refs
                        .as_ref()
                        .is_some_and(|refs| !refs.contains(&descriptor.item_ref))
                {
                    add_issue(
                        &mut issues,
                        "invalid_source",
                        Some(descriptor.source.kind()),
                    );
                    continue;
                }
                if seen.insert(hash(row)) {
                    descriptors.push(descriptor);
                }
            }
            match (page["hasMore"].as_bool(), page["nextCursor"].as_str()) {
                (Some(false), _) => break,
                (Some(true), Some(cursor))
                    if !cursor.is_empty() && cursors.insert(cursor.to_owned()) =>
                {
                    input.insert("cursor".into(), json!(cursor));
                }
                _ => return Err("invalid_source".into()),
            }
            if descriptors.len() >= MAX_SOURCES {
                limited = true;
                add_issue(&mut issues, "scan_budget_exhausted", None);
                break;
            }
        }
        Ok((
            descriptors,
            scope.unwrap_or_else(|| {
                captured.cloned().unwrap_or_else(
                    || json!({"libraryIds":request.library_ids.clone().unwrap_or_default()}),
                )
            }),
            issues,
            limited,
        ))
    }

    fn verify(&self, scope: &Value, candidate: &Candidate) -> Result<Vec<Value>, &'static str> {
        let read = self.sources.read_source(json!({"scope":scope,"descriptor":candidate.descriptor,"location":candidate.location})).map_err(|_|"source_read_failed")?;
        if available_content(&read, &candidate.descriptor, Some(&candidate.location)).as_ref()
            != Some(&candidate.content)
        {
            return Err(read_issue(&read));
        }
        let mut context = Vec::new();
        for supplied in &candidate.context {
            let location = &supplied["location"];
            let read = self
                .sources
                .read_source(
                    json!({"scope":scope,"descriptor":candidate.descriptor,"location":location}),
                )
                .map_err(|_| "source_read_failed")?;
            if let Some(content) = available_content(&read, &candidate.descriptor, Some(location)) {
                if supplied["content"].as_str() != Some(content.as_str()) {
                    return Err("source_changed");
                }
                context.push(json!({"content":content,"format":candidate.descriptor.format,"source":candidate.descriptor.source,"sourceVersion":candidate.descriptor.source_version,"location":location}));
            } else {
                return Err(read_issue(&read));
            }
        }
        Ok(context)
    }

    /// Union scoped vector-only passages into the verified lexical set. Each
    /// vector-only passage is read and its source version and original UTF-16
    /// range verified in this same call before it may enter the round. The
    /// result is reordered by equal-weight RRF (k=60) and truncated only after
    /// every kept passage has been verified. Returns `None` when no compatible
    /// vector contributed, so the round stays truthfully lexical.
    fn union_evidence_passages(
        &self,
        request: &EvidenceSearchRequest,
        catalog: EvidenceCatalog<'_>,
        verified: &mut Vec<Candidate>,
        issues: &mut Vec<Value>,
        retrieval: &crate::retrieval::RetrievalApplication,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Option<&'static str>, String> {
        let EvidenceCatalog {
            scope,
            kinds,
            descriptors,
        } = catalog;
        let max_results = request.max_results.unwrap_or(100);
        let lexical_empty = verified.is_empty();
        // Hard scope: the Retrieval owner intersects this call's complete
        // eligible identity set before any scoring, so no out-of-scope vector
        // can occupy the result budget and no ref list is rebuilt into the
        // bounded public DTO.
        let eligible = descriptors
            .iter()
            .map(|descriptor| {
                format!(
                    "{}:{}",
                    descriptor.item_ref.library_id, descriptor.item_ref.key
                )
            })
            .collect::<BTreeSet<_>>();
        let mut query = json!({
            "query": request.query.clone(),
            "sourceKinds": kinds,
            "maxResults": max_results.min(500),
        });
        if let Some(libraries) = scope.get("libraryIds").filter(|value| value.is_array()) {
            query["libraryIds"] = libraries.clone();
        }
        let outcome = match retrieval.query_scoped(query, &eligible, checkpoint) {
            Ok(outcome) => outcome,
            Err(code) => {
                let issue = enhancement_failure_issue(code, checkpoint)?;
                // A configured, enabled index that failed is reported; a disabled
                // index just continues lexically without noise.
                if retrieval_is_active(retrieval) {
                    add_issue(issues, issue, None);
                }
                return Ok(None);
            }
        };
        if outcome.limited {
            add_issue(issues, "result_budget_exhausted", None);
        }
        for issue in &outcome.issues {
            if let Some(code) = issue.get("code").and_then(Value::as_str) {
                add_issue(issues, code, None);
            }
        }
        // Lexical ranking is frozen from the original lexical passages only,
        // aggregated per item, before any semantic-only passage is appended. A
        // multi-fragment item occupies one rank, and a semantic-only item earns
        // no lexical contribution at all.
        let mut lexical_best: BTreeMap<String, (LexicalMatch, usize)> = BTreeMap::new();
        for candidate in verified.iter() {
            let identity = format!(
                "{}:{}",
                candidate.descriptor.item_ref.library_id, candidate.descriptor.item_ref.key
            );
            let significance = (
                candidate.matched.clone(),
                field_priority(&candidate.descriptor.source),
            );
            let replace = match lexical_best.get(&identity) {
                None => true,
                Some(current) => {
                    crate::lexical_search::compare_matches(
                        &significance.0,
                        significance.1,
                        "",
                        &current.0,
                        current.1,
                        "",
                    ) == std::cmp::Ordering::Less
                }
            };
            if replace {
                lexical_best.insert(identity, significance);
            }
        }
        let mut lexical_items = lexical_best.into_iter().collect::<Vec<_>>();
        lexical_items.sort_by(|left, right| {
            crate::lexical_search::compare_matches(
                &left.1.0, left.1.1, &left.0, &right.1.0, right.1.1, &right.0,
            )
        });
        let lexical_ranks = dense_ranks(&lexical_items, |left, right| {
            crate::lexical_search::compare_matches(
                &left.1.0, left.1.1, "", &right.1.0, right.1.1, "",
            ) == std::cmp::Ordering::Equal
        });
        let lexical = lexical_items
            .iter()
            .zip(lexical_ranks)
            .map(|((identity, _), rank)| (identity.clone(), rank))
            .collect::<Vec<_>>();
        let covered = lexical_items
            .iter()
            .map(|(identity, _)| identity.clone())
            .collect::<BTreeSet<_>>();
        let mut vector = Vec::new();
        for fragment in outcome
            .results
            .iter()
            .filter(|fragment| fragment.topic.is_none())
        {
            let Some(item_ref) = fragment.item_ref.as_ref() else {
                continue;
            };
            let identity = format!("{}:{}", item_ref.library_id, item_ref.key);
            if !eligible.contains(&identity) {
                continue;
            }
            if covered.contains(&identity) {
                // A lexical item's semantic rank only counts once its indexed
                // source version and current range verify, so a stale vector
                // cannot move an already-returned passage.
                match self.verify_indexed_hit(scope, descriptors, fragment) {
                    Ok(_) => vector.push((identity, fragment.score)),
                    Err(code) => {
                        let _ = retrieval.suspend_group(&outcome.publication, &fragment.group_id);
                        add_issue(issues, &code, None);
                    }
                }
                continue;
            }
            // A vector-only hit contributes to the ranking only after its
            // source version and original range are verified in this call.
            match self.verify_semantic_passage(scope, descriptors, fragment) {
                Ok(candidate) => {
                    verified.push(candidate);
                    vector.push((identity, fragment.score));
                }
                Err(code) => {
                    let _ = retrieval.suspend_group(&outcome.publication, &fragment.group_id);
                    add_issue(issues, &code, None);
                }
            }
        }
        if vector.is_empty() {
            return Ok(None);
        }
        let order = fuse_library_result_order(&lexical, &vector);
        let mut by_identity: BTreeMap<String, Vec<Candidate>> = BTreeMap::new();
        for candidate in std::mem::take(verified) {
            by_identity
                .entry(format!(
                    "{}:{}",
                    candidate.descriptor.item_ref.library_id, candidate.descriptor.item_ref.key
                ))
                .or_default()
                .push(candidate);
        }
        let mut reordered = Vec::new();
        for identity in order {
            if let Some(group) = by_identity.remove(&identity) {
                reordered.extend(group);
            }
        }
        for group in by_identity.into_values() {
            reordered.extend(group);
        }
        if reordered.len() > max_results {
            reordered.truncate(max_results);
            add_issue(issues, "result_budget_exhausted", None);
        }
        *verified = reordered;
        Ok(Some(if lexical_empty { "vector" } else { "hybrid" }))
    }

    /// Read the current source for one scoped vector-only passage and verify
    /// its version and original UTF-16 range in this same call.
    fn verify_semantic_passage(
        &self,
        scope: &Value,
        descriptors: &[SourceDescriptor],
        fragment: &crate::retrieval::ScoredFragment,
    ) -> Result<Candidate, String> {
        let (descriptor, location, content) =
            self.verify_indexed_hit(scope, descriptors, fragment)?;
        Ok(Candidate {
            descriptor: descriptor.clone(),
            location,
            content,
            context: Vec::new(),
            matched: LexicalMatch {
                coverage: 0,
                phrase: false,
                ranges: Vec::new(),
            },
            identity: format!(
                "{:020}:{}:{}:{:010}",
                descriptor.item_ref.library_id,
                descriptor.item_ref.key,
                "semantic",
                fragment.range_start
            ),
        })
    }

    /// Shared Evidence trust check. Locates this call's descriptor for the
    /// fragment, then verifies the source version, the original range and the
    /// read passage through `available_content` (outcome, itemRef, source,
    /// format, version, range). Returns the verified descriptor, location and
    /// passage content.
    fn verify_indexed_hit(
        &self,
        scope: &Value,
        descriptors: &[SourceDescriptor],
        fragment: &crate::retrieval::ScoredFragment,
    ) -> Result<(SourceDescriptor, Value, String), String> {
        let item_ref = fragment
            .item_ref
            .as_ref()
            .ok_or_else(|| "invalid_source".to_owned())?;
        let source: Value =
            serde_json::from_str(&fragment.source_json).map_err(|_| "invalid_source".to_owned())?;
        let location: Value = serde_json::from_str(&fragment.location_json)
            .map_err(|_| "invalid_source".to_owned())?;
        let descriptor = descriptors
            .iter()
            .find(|descriptor| {
                descriptor.item_ref.library_id == item_ref.library_id
                    && descriptor.item_ref.key == item_ref.key
                    && serde_json::to_value(&descriptor.source).ok() == Some(source.clone())
            })
            .ok_or_else(|| "source_unavailable".to_owned())?;
        if descriptor.source_version != fragment.source_version
            || fragment.range_end <= fragment.range_start
            || fragment.range_end > descriptor.content_length as i64
        {
            return Err("source_changed".into());
        }
        let descriptor_value =
            serde_json::to_value(descriptor).map_err(|_| "invalid_source".to_owned())?;
        let read = self
            .sources
            .read_source(
                json!({"scope": scope, "descriptor": descriptor_value, "location": location}),
            )
            .map_err(|_| "source_read_failed".to_owned())?;
        let content = available_content(&read, descriptor, Some(&location))
            .ok_or_else(|| read_issue(&read).to_owned())?;
        Ok((descriptor.clone(), location, content))
    }

    fn page(
        &self,
        round: &SearchRound,
        id: &str,
        offset: usize,
        limit: usize,
        reverify: bool,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let mut results = Vec::new();
        let end = (offset + limit).min(round.candidates.len());
        for candidate in &round.candidates[offset..end] {
            if reverify {
                checkpoint()?;
            }
            if reverify && self.verify(&round.resolved_scope, candidate).is_err() {
                return Err("basis_mismatch".into());
            }
            results.push(json!({"itemRef":candidate.descriptor.item_ref,"content":candidate.content,"format":candidate.descriptor.format,"source":candidate.descriptor.source,"sourceVersion":candidate.descriptor.source_version,"location":candidate.location,"context":candidate.context}));
        }
        let has_more = end < round.candidates.len();
        let status = if round.issues.is_empty() {
            "completed"
        } else if round.candidates.is_empty()
            && round
                .issues
                .iter()
                .all(|i| i["code"] == "source_unavailable")
        {
            "unavailable"
        } else {
            "limited"
        };
        let result = json!({"results":results,"status":status,"method":round.method,"coverage":round.coverage,"issues":round.issues,"nextCursor":if has_more {Some(format!("{id}:{end}"))} else {None},"hasMore":has_more,"total":round.total});
        if !validate_evidence_result(&result) {
            return Err("invalid_search_result".into());
        }
        Ok(result)
    }
}

fn hash(value: &Value) -> String {
    format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(value).unwrap_or_default())
    )
}
fn add_issue(issues: &mut Vec<Value>, code: &str, kind: Option<SourceKind>) {
    add_issue_count(issues, code, kind, 1);
}
fn add_issue_count(issues: &mut Vec<Value>, code: &str, kind: Option<SourceKind>, count: usize) {
    let kind = json!(kind);
    if let Some(issue) = issues
        .iter_mut()
        .find(|i| i["code"] == code && i["sourceKind"] == kind)
    {
        issue["affectedCount"] = json!(
            (issue["affectedCount"].as_u64().unwrap_or_default() as usize + count).min(1_000_000)
        );
    } else if issues.len() < 8 {
        issues
            .push(json!({"code":code,"sourceKind":kind,"affectedCount":count.clamp(1,1_000_000)}));
    }
}
fn read_issue(read: &Value) -> &'static str {
    match read["outcome"].as_str() {
        Some("source_changed") => "source_changed",
        Some("source_unavailable") => "source_unavailable",
        Some("source_read_failed") => "source_read_failed",
        _ => "invalid_source",
    }
}
fn available_content(
    read: &Value,
    descriptor: &SourceDescriptor,
    location: Option<&Value>,
) -> Option<String> {
    let object = read.as_object()?;
    if object.len() != 7
        || object.keys().any(|key| {
            ![
                "outcome",
                "itemRef",
                "content",
                "format",
                "source",
                "sourceVersion",
                "location",
            ]
            .contains(&key.as_str())
        })
        || read["outcome"] != "available"
        || read["itemRef"] != json!(descriptor.item_ref)
        || read["source"] != json!(descriptor.source)
        || read["format"] != json!(descriptor.format)
        || read["sourceVersion"] != descriptor.source_version
    {
        return None;
    }
    let content = read["content"].as_str()?;
    let range = &read["location"]["range"];
    let start = range["start"].as_u64()? as usize;
    let end = range["end"].as_u64()? as usize;
    if end < start
        || end > descriptor.content_length
        || end - start != content.encode_utf16().count()
    {
        return None;
    }
    if let Some(location) = location {
        if &read["location"] != location {
            return None;
        }
    } else if start != 0 || end != descriptor.content_length {
        return None;
    }
    Some(content.to_owned())
}
fn work_coverage(
    kind: SourceKind,
    kinds: &[SourceKind],
    counts: &BTreeMap<SourceKind, usize>,
    issues: &[Value],
    limited: bool,
) -> Value {
    let count = counts.get(&kind).copied().unwrap_or_default();
    let related = issues
        .iter()
        .filter(|i| i["sourceKind"].is_null() || i["sourceKind"] == json!(kind))
        .collect::<Vec<_>>();
    let status = if !kinds.contains(&kind) {
        "not_requested"
    } else if count == 0
        && !related.is_empty()
        && related.iter().all(|i| i["code"] == "source_unavailable")
    {
        "unavailable"
    } else if limited || !related.is_empty() {
        "limited"
    } else {
        "complete"
    };
    json!({"status":status,"sourcesScanned":count})
}
fn field_priority(source: &EvidenceSource) -> usize {
    match source {
        EvidenceSource::Metadata { field } if field == "title" => 0,
        EvidenceSource::Metadata { field } if field == "abstract" => 1,
        EvidenceSource::Metadata { .. } => 2,
        EvidenceSource::Fulltext { .. } => 3,
        EvidenceSource::Analysis { .. } => 4,
    }
}

/// Collapse a ranking that is already sorted by significance into dense
/// ranks. Items whose significance is equal share one rank, so equal lexical
/// relevance contributes equally to fusion. The `equal` predicate must
/// compare significance only: callers pass `compare_matches` with a constant
/// identity so the stable-identity tiebreaker never splits a tie.
pub(crate) fn dense_ranks<T>(items: &[T], equal: impl Fn(&T, &T) -> bool) -> Vec<usize> {
    let mut ranks = Vec::with_capacity(items.len());
    let mut rank = 0usize;
    for (index, item) in items.iter().enumerate() {
        if index > 0 && !equal(&items[index - 1], item) {
            rank += 1;
        }
        ranks.push(rank);
    }
    ranks
}

/// Equal-weight reciprocal-rank fusion with `k`. Each ranking already carries
/// its own dense ranks, so items tied within one method contribute the same
/// amount. Final ordering is by fused score descending, then stable identity
/// ascending; only an exact score tie is decided by identity.
pub(crate) fn reciprocal_rank_fusion(
    rankings: &[Vec<(String, usize)>],
    k: usize,
) -> Vec<(String, f64)> {
    let mut scores: BTreeMap<String, f64> = BTreeMap::new();
    for ranking in rankings {
        let mut seen = BTreeSet::new();
        for (identity, rank) in ranking {
            if !seen.insert(identity.clone()) {
                continue;
            }
            *scores.entry(identity.clone()).or_default() += 1.0 / (k as f64 + *rank as f64 + 1.0);
        }
    }
    let mut fused = scores.into_iter().collect::<Vec<_>>();
    fused.sort_by(|(left_id, left), (right_id, right)| {
        right.total_cmp(left).then_with(|| left_id.cmp(right_id))
    });
    fused
}

/// Field priority of a projected source value, matching `field_priority` so a
/// lexical result reconstructed from the wire keeps the same significance.
fn evidence_field_priority(source: &Value) -> usize {
    match source
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or_default()
    {
        "metadata" => match source
            .get("field")
            .and_then(Value::as_str)
            .unwrap_or_default()
        {
            "title" => 0,
            "abstract" => 1,
            _ => 2,
        },
        "fulltext" => 3,
        "analysis" => 4,
        _ => 5,
    }
}

/// Lexical significance of one projected library item: the best single match
/// tuple under the shared compare semantics (coverage desc, phrase desc, field
/// priority asc). Taking one real match avoids synthesizing a combination no
/// match actually has. Stable identity resolves remaining ties at fusion time.
fn library_item_significance(result: &Value) -> (usize, bool, usize) {
    let mut best: Option<(usize, bool, usize)> = None;
    for matched in result["matches"].as_array().into_iter().flatten() {
        let candidate = (
            matched["matchedTerms"].as_array().map_or(0, Vec::len),
            matched["phraseMatch"].as_bool().unwrap_or(false),
            evidence_field_priority(&matched["source"]),
        );
        let replace = match best {
            None => true,
            Some(current) => {
                candidate.0 > current.0
                    || (candidate.0 == current.0 && candidate.1 && !current.1)
                    || (candidate.0 == current.0
                        && candidate.1 == current.1
                        && candidate.2 < current.2)
            }
        };
        if replace {
            best = Some(candidate);
        }
    }
    best.unwrap_or((0, false, usize::MAX))
}

fn library_item_identity(result: &Value) -> String {
    format!(
        "{}:{}",
        result["itemRef"]["libraryId"].as_u64().unwrap_or_default(),
        result["itemRef"]["key"].as_str().unwrap_or_default()
    )
}

/// Equal-weight RRF (k=60) of a lexical significance ranking and a vector
/// score ranking. Equal lexical significance and equal vector score give equal
/// contributions because each ranking is dense-ranked before fusion.
pub(crate) fn fuse_library_result_order(
    lexical: &[(String, usize)],
    vector: &[(String, f32)],
) -> Vec<String> {
    let vector_ranked = dense_ranks(vector, |left, right| left.1 == right.1)
        .into_iter()
        .zip(vector.iter())
        .map(|(rank, (identity, _))| (identity.clone(), rank))
        .collect::<Vec<_>>();
    reciprocal_rank_fusion(&[lexical.to_vec(), vector_ranked], 60)
        .into_iter()
        .map(|(identity, _)| identity)
        .collect()
}

/// Reorder the items of a lexical Library execution by equal-weight RRF and
/// mark the executed method `hybrid`. Only items already present in the
/// lexical result set take part; vector-only identities are dropped because
/// this private route only enhances existing lexical results.
/// Whether the Retrieval owner is configured and enabled, decided from its
/// observable state. A semantic failure is only reported when enhancement was
/// actually expected, without changing any production DTO.
fn enhancement_failure_issue(
    mut code: String,
    checkpoint: &dyn Fn() -> Result<(), String>,
) -> Result<&'static str, String> {
    if matches!(code.as_str(), "operation_canceled" | "operation_cancelled") {
        return Err(code);
    }
    if let Err(stopped) = checkpoint() {
        if stopped != "operation_timeout" {
            return Err(stopped);
        }
        code = stopped;
    }
    Ok(if code == "operation_timeout" {
        "scan_budget_exhausted"
    } else {
        "vector_unavailable"
    })
}

fn retrieval_is_active(retrieval: &crate::retrieval::RetrievalApplication) -> bool {
    retrieval
        .state()
        .ok()
        .and_then(|state| state["enabled"].as_bool())
        == Some(true)
}

/// Surface a bounded private-route issue on the execution envelope before it
/// returns, so a verification failure or a truthful bound is never swallowed.
fn flush_library_issues(execution: &mut Value, issues: Vec<Value>) {
    if issues.is_empty() {
        return;
    }
    execution["result"]["status"] = json!("limited");
    execution["result"]["total"] = Value::Null;
    execution["result"]["issues"] = Value::Array(issues);
}

pub(crate) fn apply_library_fusion(
    execution: &mut Value,
    vector: &[(String, f32)],
    lexical_ids: &BTreeSet<String>,
) -> bool {
    let Some(results) = execution["result"]["results"].as_array() else {
        return false;
    };
    let results = results.clone();
    if results.is_empty() {
        return false;
    }
    // The lexical ranking is built only from the original lexical result set;
    // a semantic-only item appended by the union earns no lexical rank and
    // contributes through the vector ranking alone.
    let lexical_results = results
        .iter()
        .filter(|result| lexical_ids.contains(&library_item_identity(result)))
        .collect::<Vec<_>>();
    let significance = lexical_results
        .iter()
        .map(|result| library_item_significance(result))
        .collect::<Vec<_>>();
    let ranks = dense_ranks(&significance, |left, right| left == right);
    let lexical = lexical_results
        .iter()
        .zip(ranks)
        .map(|(result, rank)| (library_item_identity(result), rank))
        .collect::<Vec<_>>();
    let order = fuse_library_result_order(&lexical, vector);
    let mut by_identity = BTreeMap::new();
    for result in &results {
        by_identity.insert(library_item_identity(result), result.clone());
    }
    let mut reordered = Vec::with_capacity(results.len());
    for identity in order {
        if let Some(result) = by_identity.remove(&identity) {
            reordered.push(result);
        }
    }
    // A lexical item outside the fused order keeps its lexical position rather
    // than disappearing from the private route.
    for result in &results {
        let identity = library_item_identity(result);
        if let Some(remaining) = by_identity.remove(&identity) {
            reordered.push(remaining);
        }
    }
    if reordered.len() != results.len() {
        return false;
    }
    execution["result"]["results"] = Value::Array(reordered);
    execution["result"]["method"] = json!("hybrid");
    true
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResultWire {
    results: Vec<PassageWire>,
    status: ResultStatus,
    method: SearchMethod,
    coverage: CoverageWire,
    issues: Vec<IssueWire>,
    next_cursor: Option<String>,
    has_more: bool,
    total: Option<usize>,
}
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum ResultStatus {
    Completed,
    Limited,
    Unavailable,
}
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum SearchMethod {
    Lexical,
    Vector,
    Hybrid,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
enum CoverageWire {
    Library { sources: SourceCoverageWire },
    Topic { sections: Vec<SectionCoverageWire> },
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SourceCoverageWire {
    metadata: WorkCoverageWire,
    fulltext: WorkCoverageWire,
    analysis: WorkCoverageWire,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WorkCoverageWire {
    status: WorkStatus,
    sources_scanned: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SectionCoverageWire {
    section: String,
    status: WorkStatus,
}
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum WorkStatus {
    Complete,
    NotRequested,
    Limited,
    Unavailable,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct IssueWire {
    code: IssueCode,
    #[serde(deserialize_with = "required_nullable")]
    source_kind: Option<SourceKind>,
    affected_count: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum IssueCode {
    SourceUnavailable,
    SourceChanged,
    SourceReadFailed,
    InvalidSource,
    ScanBudgetExhausted,
    PassageBudgetExhausted,
    ResultBudgetExhausted,
    VectorUnavailable,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PassageWire {
    item_ref: ItemRef,
    content: String,
    format: TextFormat,
    source: EvidenceSource,
    source_version: String,
    location: LocationWire,
    context: Vec<ContextWire>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ContextWire {
    content: String,
    format: TextFormat,
    source: EvidenceSource,
    source_version: String,
    location: LocationWire,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LocationWire {
    unit: LocationUnit,
    #[serde(deserialize_with = "required_nullable")]
    field: Option<String>,
    range: RangeWire,
}
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum LocationUnit {
    Field,
    Paragraph,
    ListItem,
    TableRow,
    AnalysisField,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RangeWire {
    start: usize,
    end: usize,
}

fn required_nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}
fn valid_context(
    content: &str,
    source: &EvidenceSource,
    version: &str,
    location: &LocationWire,
) -> bool {
    let field_ok = match source {
        EvidenceSource::Metadata { field } => {
            matches!(location.unit, LocationUnit::Field)
                && location.field.as_ref().is_some_and(|f| f == field)
        }
        EvidenceSource::Fulltext { .. } => {
            matches!(
                location.unit,
                LocationUnit::Paragraph | LocationUnit::ListItem | LocationUnit::TableRow
            ) && location.field.is_none()
        }
        EvidenceSource::Analysis { .. } => {
            matches!(location.unit, LocationUnit::AnalysisField)
                && location
                    .field
                    .as_ref()
                    .is_some_and(|f| !f.trim().is_empty() && f.encode_utf16().count() <= 128)
        }
    };
    field_ok
        && content.encode_utf16().count() <= 8192
        && !version.is_empty()
        && version.encode_utf16().count() <= 256
        && location.range.end > location.range.start
        && location.range.end <= 262144
        && location.range.end - location.range.start == content.encode_utf16().count()
}
/// Strict Rust rebuilding paired with the shared protocol search corpus.
pub fn validate_evidence_result(value: &Value) -> bool {
    if !value.as_object().is_some_and(|o| {
        o.len() == 8
            && [
                "results",
                "status",
                "method",
                "coverage",
                "issues",
                "nextCursor",
                "hasMore",
                "total",
            ]
            .iter()
            .all(|key| o.contains_key(*key))
    }) {
        return false;
    }
    let result: ResultWire = match serde_json::from_value(value.clone()) {
        Ok(r) => r,
        Err(_) => return false,
    };
    let _ = (&result.status, &result.method);
    if result.results.len() > 100
        || result.issues.len() > 8
        || result.total.is_some_and(|n| n > 1_000_000)
        || result.has_more != result.next_cursor.is_some()
        || result
            .next_cursor
            .as_ref()
            .is_some_and(|s| s.is_empty() || s.encode_utf16().count() > 4096)
    {
        return false;
    }
    let coverage_ok = match &result.coverage {
        CoverageWire::Library { sources } => {
            [&sources.metadata, &sources.fulltext, &sources.analysis]
                .iter()
                .all(|c| {
                    let _ = &c.status;
                    c.sources_scanned <= 1_000_000
                })
        }
        CoverageWire::Topic { sections } => {
            sections.len() <= 100
                && sections.iter().all(|s| {
                    let _ = &s.status;
                    !s.section.is_empty() && s.section.encode_utf16().count() <= 128
                })
        }
    };
    coverage_ok
        && result.issues.iter().all(|i| {
            let _ = (&i.code, &i.source_kind);
            i.affected_count <= 1_000_000
        })
        && result.results.iter().all(|p| {
            let _ = &p.format;
            p.item_ref.valid()
                && p.source.valid(&p.item_ref)
                && valid_context(&p.content, &p.source, &p.source_version, &p.location)
                && p.context.len() <= 4
                && p.context.iter().all(|c| {
                    let _ = &c.format;
                    c.source.valid(&p.item_ref)
                        && valid_context(&c.content, &c.source, &c.source_version, &c.location)
                })
        })
}

pub fn validate_library_lexical_result(value: &Value) -> bool {
    validate_library_execution(value, false)
}

/// The same structural invariants as the lexical projection, admitting the
/// semantic methods the private retrieval route may report.
pub fn validate_library_retrieval_result(value: &Value) -> bool {
    validate_library_execution(value, true)
}

fn validate_library_execution(value: &Value, allow_semantic: bool) -> bool {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct Execution {
        result: Value,
        scope: Value,
        descriptors: Vec<SourceDescriptor>,
        catalog_issues: Vec<IssueWire>,
        catalog_limited: bool,
        #[serde(default)]
        publication: Option<String>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct SearchResult {
        results: Vec<ItemResult>,
        status: ResultStatus,
        method: SearchMethod,
        coverage: CoverageWire,
        issues: Vec<IssueWire>,
        next_cursor: Option<String>,
        has_more: bool,
        total: Option<usize>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct ItemResult {
        item_ref: ItemRef,
        matches: Vec<ItemMatch>,
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase", deny_unknown_fields)]
    struct ItemMatch {
        source: EvidenceSource,
        source_version: String,
        location: LocationWire,
        matched_terms: Vec<String>,
        phrase_match: bool,
    }
    let Ok(execution) = serde_json::from_value::<Execution>(value.clone()) else {
        return false;
    };
    let Some(scope) = execution.scope.as_object() else {
        return false;
    };
    if execution.descriptors.len() > MAX_SOURCES
        || execution.catalog_issues.len() > 8
        || (execution.catalog_limited && execution.catalog_issues.is_empty())
        || execution
            .publication
            .as_ref()
            .is_some_and(|publication| publication.is_empty() || publication.len() > 4_096)
        || !scope.contains_key("libraryIds")
        || scope.keys().any(|key| {
            !["libraryIds", "itemRefs", "collectionRef", "tag", "itemType"].contains(&key.as_str())
        })
    {
        return false;
    }
    let Some(libraries) = execution.scope["libraryIds"].as_array() else {
        return false;
    };
    if libraries.is_empty()
        || libraries.len() > 100
        || libraries.iter().any(|id| {
            id.as_u64()
                .is_none_or(|n| n == 0 || n > 9_007_199_254_740_991)
        })
    {
        return false;
    }
    let Ok(result) = serde_json::from_value::<SearchResult>(execution.result) else {
        return false;
    };
    let _ = (&result.status, &result.method);
    let CoverageWire::Library { sources } = &result.coverage else {
        return false;
    };
    let envelope_ok = result.results.len() <= 500
        && result.issues.len() <= 8
        && !result.total.is_some_and(|n| n > 1_000_000)
        && !result.has_more
        && result.next_cursor.is_none()
        && if allow_semantic {
            matches!(result.method, SearchMethod::Vector | SearchMethod::Hybrid)
        } else {
            matches!(result.method, SearchMethod::Lexical)
        }
        && ![&sources.metadata, &sources.fulltext, &sources.analysis]
            .iter()
            .any(|entry| entry.sources_scanned > 1_000_000);
    let descriptors_ok = !execution.descriptors.iter().any(|descriptor| {
        !descriptor.item_ref.valid()
            || !descriptor.source.valid(&descriptor.item_ref)
            || descriptor.source_version.is_empty()
            || descriptor.source_version.encode_utf16().count() > 256
            || descriptor.content_length > 262144
            || !libraries.contains(&json!(descriptor.item_ref.library_id))
    });
    let items_ok = result.results.iter().all(|item| {
        if !item.item_ref.valid() || item.matches.is_empty() || item.matches.len() > MAX_PASSAGES {
            return false;
        }
        item.matches.iter().all(|matched| {
            let location_valid = match &matched.source {
                EvidenceSource::Metadata { field } => {
                    matches!(matched.location.unit, LocationUnit::Field)
                        && matched.location.field.as_ref() == Some(field)
                }
                EvidenceSource::Fulltext { .. } => {
                    matches!(
                        matched.location.unit,
                        LocationUnit::Paragraph | LocationUnit::ListItem | LocationUnit::TableRow
                    ) && matched.location.field.is_none()
                }
                EvidenceSource::Analysis { .. } => {
                    matches!(matched.location.unit, LocationUnit::AnalysisField)
                        && matched.location.field.as_ref().is_some_and(|field| {
                            !field.trim().is_empty() && field.encode_utf16().count() <= 128
                        })
                }
            };
            matched.source.valid(&item.item_ref)
                && location_valid
                && matched.location.range.end > matched.location.range.start
                && matched.location.range.end <= 262144
                && !matched.source_version.is_empty()
                && matched.source_version.encode_utf16().count() <= 256
                && (allow_semantic || !matched.matched_terms.is_empty())
                && matched.matched_terms.len() <= 4096
                && !(matched.phrase_match && matched.matched_terms.is_empty())
                && matched
                    .matched_terms
                    .iter()
                    .all(|term| !term.is_empty() && term.encode_utf16().count() <= 4096)
        })
    });
    if !(envelope_ok && descriptors_ok && items_ok) {
        return false;
    }
    true
}
fn utf16_slice(text: &str, start: usize, end: usize) -> Option<String> {
    if end < start {
        return None;
    }
    let mut position = 0;
    let mut start_byte = None;
    let mut end_byte = None;
    for (byte, c) in text.char_indices() {
        if position == start {
            start_byte = Some(byte);
        }
        if position == end {
            end_byte = Some(byte);
        }
        position += c.len_utf16();
    }
    if position == start {
        start_byte = Some(text.len());
    }
    if position == end {
        end_byte = Some(text.len());
    }
    Some(text.get(start_byte?..end_byte?)?.to_owned())
}
fn segment(content: &str, source: &EvidenceSource) -> Vec<(Value, String, Vec<Value>)> {
    if matches!(source, EvidenceSource::Analysis { .. }) {
        return analysis_segments(content);
    }
    segment_text(content, source.field())
}

fn segment_text(content: &str, field: Option<&str>) -> Vec<(Value, String, Vec<Value>)> {
    let mut units = Vec::<(usize, usize, &str)>::new();
    if field.is_some() {
        units.push((0, content.encode_utf16().count(), "field"));
    } else {
        let mut position = 0;
        let mut paragraph = None;
        let mut paragraph_end = 0;
        for line in content.split_inclusive('\n') {
            let text = line.trim_end_matches(['\r', '\n']);
            let len = text.encode_utf16().count();
            let trimmed = text.trim_start();
            let special = if trimmed.starts_with('|') {
                "table_row"
            } else if trimmed.starts_with("- ")
                || trimmed.starts_with("* ")
                || trimmed.starts_with("+ ")
                || trimmed
                    .split_once(". ")
                    .is_some_and(|(n, _)| !n.is_empty() && n.chars().all(|c| c.is_ascii_digit()))
            {
                "list_item"
            } else {
                "paragraph"
            };
            if text.trim().is_empty() || special != "paragraph" {
                if let Some(start) = paragraph.take() {
                    units.push((start, paragraph_end, "paragraph"));
                }
                if !text.trim().is_empty() {
                    units.push((position, position + len, special));
                }
            } else {
                if paragraph.is_none() {
                    paragraph = Some(position);
                }
                paragraph_end = position + len;
            }
            position += line.encode_utf16().count();
        }
        if let Some(start) = paragraph {
            units.push((start, paragraph_end, "paragraph"));
        }
    }
    let mut out = Vec::new();
    let mut table_header: Option<Value> = None;
    for (start, end, unit) in units {
        let complete = utf16_slice(content, start, end).unwrap_or_default();
        if unit != "table_row" {
            table_header = None;
        }
        if unit == "table_row"
            && complete
                .chars()
                .all(|c| c.is_whitespace() || matches!(c, '|' | '-' | ':'))
        {
            continue;
        }
        let context = if unit == "table_row" {
            if let Some(header) = &table_header {
                vec![header.clone()]
            } else {
                if end - start <= MAX_PASSAGE_UTF16 {
                    table_header = Some(
                        json!({"content":complete,"location":{"unit":"table_row","field":null,"range":{"start":start,"end":end}}}),
                    );
                }
                Vec::new()
            }
        } else {
            Vec::new()
        };
        let mut at = start;
        while at < end {
            let mut stop = (at + MAX_PASSAGE_UTF16).min(end);
            while utf16_slice(content, at, stop).is_none() && stop > at {
                stop -= 1;
            }
            if stop == at {
                break;
            }
            let text = utf16_slice(content, at, stop).unwrap();
            let location = json!({"unit":unit,"field":field,"range":{"start":at,"end":stop}});
            out.push((location, text, context.clone()));
            at = stop;
        }
    }
    out
}

// Borrowed JSON leaves retain their original bytes. Locations therefore select
// the canonical source text, including JSON escaping, rather than a re-encoded
// or decoded value with unrelated offsets.
fn analysis_segments(content: &str) -> Vec<(Value, String, Vec<Value>)> {
    fn visit<'a>(
        root: &'a str,
        raw: &'a serde_json::value::RawValue,
        field: &str,
        out: &mut Vec<(Value, String, Vec<Value>)>,
    ) {
        if out.len() > MAX_PASSAGES || field.encode_utf16().count() > 128 {
            return;
        }
        let text = raw.get();
        if text.starts_with('{') {
            if let Ok(fields) =
                serde_json::from_str::<BTreeMap<String, &serde_json::value::RawValue>>(text)
            {
                for (key, value) in fields {
                    let key = key.replace('~', "~0").replace('/', "~1");
                    visit(root, value, &format!("{field}/{key}"), out);
                }
            }
        } else if text.starts_with('[') {
            if let Ok(values) = serde_json::from_str::<Vec<&serde_json::value::RawValue>>(text) {
                for (index, value) in values.into_iter().enumerate() {
                    visit(root, value, &format!("{field}/{index}"), out);
                }
            }
        } else if text != "null" && text != "true" && text != "false" {
            let start_byte = text.as_ptr() as usize - root.as_ptr() as usize;
            let start = root[..start_byte].encode_utf16().count();
            let end = start + text.encode_utf16().count();
            let mut at = start;
            while at < end {
                let mut stop = (at + MAX_PASSAGE_UTF16).min(end);
                while utf16_slice(root, at, stop).is_none() && stop > at {
                    stop -= 1;
                }
                if stop == at {
                    break;
                }
                out.push((json!({"unit":"analysis_field","field":if field.is_empty(){"$"}else{field},"range":{"start":at,"end":stop}}), utf16_slice(root, at, stop).unwrap(), Vec::new()));
                at = stop;
            }
        }
    }
    let mut out = Vec::new();
    if let Ok(raw) = serde_json::from_str::<&serde_json::value::RawValue>(content) {
        visit(content, raw, "", &mut out);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn rust_search_dtos_match_the_shared_protocol_corpus() {
        let corpus: Value = serde_json::from_str(include_str!("../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/search.json")).unwrap();
        for case in corpus["cases"].as_array().unwrap() {
            let definition = case["schemaRef"]
                .as_str()
                .unwrap()
                .rsplit('/')
                .next()
                .unwrap();
            let admitted = match definition {
                "LibraryLexicalExecutionRequest" => {
                    EvidenceSearchRequest::from_value(case["value"].clone()).is_ok_and(|request| {
                        request
                            .library_ids
                            .as_ref()
                            .is_some_and(|ids| !ids.is_empty())
                            && request.cursor.is_none()
                    })
                }
                "LibraryLexicalExecutionResult" => validate_library_lexical_result(&case["value"]),
                "SearchEvidenceRequest" => {
                    case["value"].as_object().is_some_and(|o| o.len() == 1)
                        && case["value"]["args"].as_array().is_some_and(|a| {
                            a.len() == 1 && EvidenceSearchRequest::from_value(a[0].clone()).is_ok()
                        })
                }
                "SearchEvidenceResult" => validate_evidence_result(&case["value"]),
                definition => validate_shared_dto(definition, &case["value"]),
            };
            assert_eq!(
                admitted,
                case["admitted"]
                    .as_bool()
                    .unwrap_or_else(|| case["valid"].as_bool().unwrap()),
                "{}",
                case["id"]
            );
        }
    }

    #[test]
    fn private_library_search_aggregates_items_before_max_results_and_omits_content() {
        struct Owner;
        impl EvidenceSourcePort for Owner {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                let scope = request["scope"].clone();
                Ok(json!({"scope":scope,"descriptors":[
                    {"itemRef":{"libraryId":1,"key":"ITEM0001"},"source":{"kind":"metadata","field":"title"},"sourceVersion":"m1","format":"text","contentLength":12},
                    {"itemRef":{"libraryId":1,"key":"ITEM0001"},"source":{"kind":"fulltext","attachmentRef":{"libraryId":1,"key":"FILE0001"}},"sourceVersion":"f1","format":"markdown","contentLength":21},
                    {"itemRef":{"libraryId":1,"key":"ITEM0002"},"source":{"kind":"metadata","field":"title"},"sourceVersion":"m2","format":"text","contentLength":13}
                ],"nextCursor":null,"hasMore":false,"issues":[]}))
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                let descriptor = &request["descriptor"];
                let content = match descriptor["itemRef"]["key"].as_str().unwrap() {
                    "ITEM0001" if descriptor["source"]["kind"] == "metadata" => "wind turbine",
                    "ITEM0001" => "wind turbine evidence",
                    _ => "wind evidence",
                };
                let location = request.get("location").cloned().unwrap_or_else(|| json!({
                    "unit":if descriptor["source"]["kind"] == "metadata" {"field"} else {"paragraph"},
                    "field":if descriptor["source"]["kind"] == "metadata" {Some("title")} else {None::<&str>},
                    "range":{"start":0,"end":content.encode_utf16().count()}
                }));
                Ok(
                    json!({"outcome":"available","itemRef":descriptor["itemRef"],
                    "content":content,"format":descriptor["format"],"source":descriptor["source"],
                    "sourceVersion":descriptor["sourceVersion"],"location":location}),
                )
            }
        }
        let app = EvidenceSearchApplication::new(Arc::new(Owner));
        let value = app
            .search_library_items(
                json!({
                    "query":"wind turbine", "libraryIds":[1], "limit":1, "maxResults":1
                }),
                &|| Ok(()),
            )
            .unwrap();
        assert_eq!(value["scope"]["libraryIds"], json!([1]));
        assert_eq!(value["descriptors"].as_array().unwrap().len(), 3);
        assert_eq!(value["catalogIssues"], json!([]));
        assert_eq!(value["catalogLimited"], false);
        assert_eq!(value["result"]["results"].as_array().unwrap().len(), 1);
        assert_eq!(value["result"]["results"][0]["itemRef"]["key"], "ITEM0001");
        assert_eq!(
            value["result"]["results"][0]["matches"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        assert_eq!(value["result"]["hasMore"], false);
        assert!(value["result"]["results"][0].get("content").is_none());
        assert!(value["result"]["results"][0].get("score").is_none());
        assert!(
            value["result"]["results"][0]["matches"][0]
                .get("path")
                .is_none()
        );
    }

    #[test]
    fn private_library_search_requires_resolved_scope_and_rejects_cursor() {
        struct EmptyOwner;
        impl EvidenceSourcePort for EmptyOwner {
            fn list_sources(&self, _: Value) -> Result<Value, String> {
                Ok(
                    json!({"scope":{"libraryIds":[1]},"descriptors":[],"nextCursor":null,"hasMore":false,"issues":[]}),
                )
            }
            fn read_source(&self, _: Value) -> Result<Value, String> {
                unreachable!()
            }
        }
        let app = EvidenceSearchApplication::new(Arc::new(EmptyOwner));
        assert_eq!(
            app.search_library_items(json!({"query":"wind"}), &|| Ok(()))
                .unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            app.search_library_items(
                json!({"query":"wind","libraryIds":[1],"cursor":"opaque"}),
                &|| Ok(())
            )
            .unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn private_library_search_byte_budget_never_publishes_an_item_without_matches() {
        // Every paragraph repeats the whole query, so each match carries the full
        // unit list and one added paragraph moves the response by a single large
        // match. The trailing item keeps exactly one match, so the response only
        // crosses the byte ceiling by emptying that item, which is the one state a
        // published item must never reach.
        const QUERY_UNITS: usize = 200;
        fn query() -> String {
            (0..QUERY_UNITS)
                .filter_map(|index| char::from_u32(0x4e00 + index as u32))
                .collect()
        }
        fn content(paragraphs: usize) -> String {
            vec![query(); paragraphs].join("\n\n")
        }
        struct Owner {
            leading: usize,
        }
        impl EvidenceSourcePort for Owner {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                let scope = request["scope"].clone();
                let descriptor = |key: &str, file: &str, version: &str, paragraphs: usize| {
                    json!({"itemRef":{"libraryId":1,"key":key},
                        "source":{"kind":"fulltext","attachmentRef":{"libraryId":1,"key":file}},
                        "sourceVersion":version,"format":"markdown",
                        "contentLength":content(paragraphs).encode_utf16().count()})
                };
                Ok(json!({"scope":scope,"descriptors":[
                    descriptor("ITEM0001","FILE0001","f1",self.leading),
                    descriptor("ITEM0002","FILE0002","f2",1)
                ],"nextCursor":null,"hasMore":false,"issues":[]}))
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                let descriptor = request["descriptor"].clone();
                let content = content(if descriptor["itemRef"]["key"] == "ITEM0001" {
                    self.leading
                } else {
                    1
                });
                let location = match request.get("location") {
                    Some(location) if location.is_object() => location.clone(),
                    _ => json!({"unit":"paragraph","field":null,
                        "range":{"start":0,"end":content.encode_utf16().count()}}),
                };
                let utf16 = content.encode_utf16().collect::<Vec<_>>();
                let start = location["range"]["start"].as_u64().unwrap_or_default() as usize;
                let end = location["range"]["end"].as_u64().unwrap_or_default() as usize;
                let slice =
                    String::from_utf16(&utf16[start.min(utf16.len())..end.min(utf16.len())])
                        .unwrap_or_default();
                Ok(
                    json!({"outcome":"available","itemRef":descriptor["itemRef"],
                    "content":slice,"format":descriptor["format"],"source":descriptor["source"],
                    "sourceVersion":descriptor["sourceVersion"],"location":location}),
                )
            }
        }
        let request = json!({"query":query(),"libraryIds":[1],"sourceKinds":["fulltext"]});
        let execute = |leading: usize| {
            let app = EvidenceSearchApplication::new(Arc::new(Owner { leading }));
            app.search_library_items(request.clone(), &|| Ok(()))
        };
        // 900 repeated paragraphs put the response far above the private byte
        // ceiling, so trimming has to drop hundreds of trailing matches. A
        // rejected response is a regression, not a case to skip.
        let value = execute(900).expect("bounded response must stay valid");
        assert!(serde_json::to_vec(&value).unwrap().len() <= MAX_EXECUTION_BYTES);
        let result = &value["result"];
        assert_eq!(result["status"], "limited");
        assert_eq!(result["total"], json!(null));
        assert_eq!(result["nextCursor"], json!(null));
        assert_eq!(result["hasMore"], json!(false));
        assert!(
            result["issues"].as_array().is_some_and(|issues| issues
                .iter()
                .any(|issue| issue["code"] == "result_budget_exhausted")),
            "a trimmed response must report the exhausted result budget"
        );
        assert_eq!(
            result["coverage"]["sources"]["fulltext"]["status"], "limited",
            "coverage must follow the published issue set"
        );
        for item in result["results"].as_array().expect("results array") {
            assert!(
                item["matches"]
                    .as_array()
                    .is_some_and(|matches| !matches.is_empty()),
                "a trimmed response must not publish an item without matches"
            );
        }
    }

    fn validate_shared_dto(definition: &str, value: &Value) -> bool {
        let empty_result = || {
            json!({"results":[],"status":"completed","method":"lexical",
            "coverage":{"kind":"library","sources":{
                "metadata":{"status":"complete","sourcesScanned":0},
                "fulltext":{"status":"not_requested","sourcesScanned":0},
                "analysis":{"status":"not_requested","sourcesScanned":0}}},
            "issues":[],"nextCursor":null,"hasMore":false,"total":0})
        };
        match definition {
            "SearchRequest" => {
                let Some(object) = value.as_object() else {
                    return false;
                };
                if object
                    .keys()
                    .any(|key| !["query", "limit", "maxResults", "cursor"].contains(&key.as_str()))
                {
                    return false;
                }
                EvidenceSearchRequest::from_value(value.clone()).is_ok()
            }
            "TopicRequest" => {
                crate::topic_search::TopicSearchRequest::from_value(value.clone()).is_ok()
            }
            "EvidenceRequest" => EvidenceSearchRequest::from_value(value.clone()).is_ok(),
            "EvidenceResult" => validate_evidence_result(value),
            "SearchCoverage" | "SearchIssue" => {
                let mut result = empty_result();
                if definition == "SearchCoverage" {
                    result["coverage"] = value.clone();
                } else {
                    result["issues"] = json!([value]);
                }
                validate_evidence_result(&result)
            }
            "EvidenceContext" => {
                let Ok(context) = serde_json::from_value::<ContextWire>(value.clone()) else {
                    return false;
                };
                let source_item = match &context.source {
                    EvidenceSource::Fulltext { attachment_ref } => attachment_ref.clone(),
                    EvidenceSource::Analysis { note_ref, .. } => note_ref.clone(),
                    EvidenceSource::Metadata { .. } => ItemRef {
                        library_id: 1,
                        key: "ITEM1".into(),
                    },
                };
                context.source.valid(&source_item)
                    && valid_context(
                        &context.content,
                        &context.source,
                        &context.source_version,
                        &context.location,
                    )
            }
            "TopicResult" => crate::topic_search::validate_topic_search_result(value),
            _ => panic!("unmapped search DTO: {definition}"),
        }
    }

    #[test]
    fn search_request_preserves_empty_source_and_item_scope_and_rejects_open_shapes() {
        let request = EvidenceSearchRequest::from_value(json!({
            "query": "研究 evidence", "sourceKinds": [], "itemRefs": []
        }))
        .expect("closed request");
        assert_eq!(request.source_kinds, Some(Vec::new()));
        assert_eq!(request.item_refs, Some(Vec::new()));
        for value in [
            json!({"query":"  "}),
            json!({"query":"evidence","libraryIds":[]}),
            json!({"query":"evidence","limit":101}),
            json!({"query":"evidence","path":"secret"}),
            json!({"query":"evidence","sourceKinds":null}),
            json!({"query":"evidence","itemRefs":[{"libraryId":1,"key":"ABCDEFGH","id":1}]}),
        ] {
            assert!(EvidenceSearchRequest::from_value(value).is_err());
        }
    }

    struct SourceOwner {
        content: String,
        change_on_verification: bool,
    }

    impl EvidenceSourcePort for SourceOwner {
        fn list_sources(&self, request: Value) -> Result<Value, String> {
            if request["sourceKinds"] == json!([]) || request["scope"]["itemRefs"] == json!([]) {
                return Ok(
                    json!({"scope":{"libraryIds":[1]},"descriptors":[],"nextCursor":null,"hasMore":false,"issues":[]}),
                );
            }
            Ok(json!({"scope":{"libraryIds":[1]},"descriptors":[{
                "itemRef":{"libraryId":1,"key":"ABCDEFGH"},
                "source":{"kind":"fulltext","attachmentRef":{"libraryId":1,"key":"MARKDOWN"}},
                "sourceVersion":"owner-version:one", "format":"markdown",
                "contentLength":self.content.encode_utf16().count()
            }],"nextCursor":null,"hasMore":false,"issues":[]}))
        }

        fn read_source(&self, request: Value) -> Result<Value, String> {
            if request.get("location").is_some() && self.change_on_verification {
                return Ok(json!({"outcome":"source_changed"}));
            }
            let location = request.get("location").cloned().unwrap_or_else(|| {
                json!({
                    "unit":"paragraph","field":null,
                    "range":{"start":0,"end":self.content.encode_utf16().count()}
                })
            });
            let content = utf16_slice(
                &self.content,
                location["range"]["start"].as_u64().unwrap() as usize,
                location["range"]["end"].as_u64().unwrap() as usize,
            )
            .expect("valid range");
            Ok(
                json!({"outcome":"available", "itemRef":request["descriptor"]["itemRef"],
                "content":content,"format":"markdown","source":request["descriptor"]["source"],
                "sourceVersion":"owner-version:one","location":location}),
            )
        }
    }

    #[test]
    fn verified_passages_preserve_unicode_ranges_and_basis_bound_paging() {
        let app = EvidenceSearchApplication::new(std::sync::Arc::new(SourceOwner {
            content: "😀 first evidence\n\nSecond evidence".into(),
            change_on_verification: false,
        }));
        let first = app
            .search(json!({"query":"evidence","limit":1}), &|| Ok(()))
            .expect("first");
        assert_eq!(first["status"], "completed");
        assert_eq!(first["total"], 2);
        assert_eq!(first["results"][0]["content"], "😀 first evidence");
        assert_eq!(
            first["results"][0]["location"]["range"],
            json!({"start":0,"end":17})
        );
        let next = app
            .search(
                json!({"query":"evidence","limit":1,"cursor":first["nextCursor"]}),
                &|| Ok(()),
            )
            .expect("next");
        assert_eq!(next["results"][0]["content"], "Second evidence");
        assert_eq!(next["hasMore"], false);
        assert_eq!(
            app.search(
                json!({"query":"different","limit":1,"cursor":first["nextCursor"]}),
                &|| Ok(())
            )
            .unwrap_err(),
            "basis_mismatch"
        );
    }

    #[test]
    fn changed_sources_never_return_unverified_passage_content() {
        let app = EvidenceSearchApplication::new(std::sync::Arc::new(SourceOwner {
            content: "source evidence".into(),
            change_on_verification: true,
        }));
        let result = app
            .search(json!({"query":"evidence"}), &|| Ok(()))
            .expect("bounded issue");
        assert_eq!(result["results"], json!([]));
        assert_eq!(result["status"], "limited");
        assert_eq!(result["total"], Value::Null);
        assert_eq!(result["issues"][0]["code"], "source_changed");
    }

    #[test]
    fn table_passage_has_separately_verified_header_context() {
        let app = EvidenceSearchApplication::new(std::sync::Arc::new(SourceOwner {
            content: "| Method | Outcome |\n| --- | --- |\n| Retrieval | evidence |".into(),
            change_on_verification: false,
        }));
        let result = app.search(json!({"query":"evidence"}), &|| Ok(())).unwrap();
        assert_eq!(result["results"][0]["location"]["unit"], "table_row");
        assert_eq!(
            result["results"][0]["context"][0]["content"],
            "| Method | Outcome |"
        );
        assert_ne!(
            result["results"][0]["context"][0]["location"],
            result["results"][0]["location"]
        );
    }

    #[test]
    fn large_match_round_reports_truthful_result_budget_and_no_exact_total() {
        let app = EvidenceSearchApplication::new(std::sync::Arc::new(SourceOwner {
            content: "evidence one\n\nevidence two\n\nevidence three".into(),
            change_on_verification: false,
        }));
        let result = app
            .search(
                json!({"query":"evidence","limit":1,"maxResults":2}),
                &|| Ok(()),
            )
            .unwrap();
        assert_eq!(result["status"], "limited");
        assert_eq!(result["total"], Value::Null);
        assert!(
            result["issues"]
                .as_array()
                .unwrap()
                .iter()
                .any(|i| i["code"] == "result_budget_exhausted")
        );
        assert_eq!(result["hasMore"], true);
    }

    #[test]
    fn empty_kind_and_item_scopes_complete_without_searching_sources() {
        let app = EvidenceSearchApplication::new(std::sync::Arc::new(SourceOwner {
            content: "evidence".into(),
            change_on_verification: false,
        }));
        for request in [
            json!({"query":"evidence","sourceKinds":[]}),
            json!({"query":"evidence","itemRefs":[]}),
        ] {
            let result = app.search(request, &|| Ok(())).unwrap();
            assert_eq!(result["results"], json!([]));
            assert_eq!(result["status"], "completed");
            assert_eq!(result["total"], 0);
        }
    }

    #[test]
    fn analysis_passages_preserve_their_canonical_field_locator() {
        let source = EvidenceSource::Analysis {
            artifact_type: ArtifactType::Digest,
            note_ref: ItemRef {
                library_id: 1,
                key: "NOTE1".into(),
            },
        };
        let passages = segment(
            r#"{"summary":"evidence 😀","keywords":["retrieval"]}"#,
            &source,
        );
        assert!(passages.iter().any(|(location, content, _)| {
            location["unit"] == "analysis_field"
                && location["field"] == "/summary"
                && content == "\"evidence 😀\""
        }));
    }

    #[test]
    fn exhausted_work_budget_returns_limited_coverage_without_an_exact_total() {
        let app = EvidenceSearchApplication::new(Arc::new(SourceOwner {
            content: "evidence".into(),
            change_on_verification: false,
        }));
        let calls = std::cell::Cell::new(0);
        let result = app
            .search(json!({"query":"evidence"}), &|| {
                calls.set(calls.get() + 1);
                if calls.get() > 2 {
                    Err("operation_timeout".into())
                } else {
                    Ok(())
                }
            })
            .expect("budget exhaustion retains a typed result");
        assert_eq!(result["status"], "limited");
        assert_eq!(result["total"], Value::Null);
        assert!(
            result["issues"]
                .as_array()
                .unwrap()
                .iter()
                .any(|i| i["code"] == "scan_budget_exhausted")
        );
    }

    struct PagingOwner {
        calls: Mutex<usize>,
    }

    impl EvidenceSourcePort for PagingOwner {
        fn list_sources(&self, request: Value) -> Result<Value, String> {
            let mut calls = self.calls.lock().unwrap();
            *calls += 1;
            // An ambient Library switch after the first page must not move
            // the admitted search to a new Library, even on an empty page.
            let library = if *calls == 1 {
                1
            } else {
                request["scope"]["libraryIds"][0].as_u64().unwrap_or(2)
            };
            Ok(json!({"scope":{"libraryIds":[library]},"descriptors":[],
                "nextCursor":if *calls == 1 {Some("next")}else{None},
                "hasMore":*calls == 1,"issues":[]}))
        }

        fn read_source(&self, _: Value) -> Result<Value, String> {
            unreachable!("empty catalog")
        }
    }

    #[test]
    fn source_pages_keep_the_first_captured_library_scope() {
        let app = EvidenceSearchApplication::new(Arc::new(PagingOwner {
            calls: Mutex::new(0),
        }));
        let result = app
            .search(json!({"query":"evidence"}), &|| Ok(()))
            .expect("an ambient switch cannot change captured scope");
        assert_eq!(result["status"], "completed");
        assert_eq!(result["total"], 0);
    }

    #[test]
    fn scan_exhaustion_leaves_unvisited_source_kinds_incomplete() {
        struct TimeoutOwner;
        impl EvidenceSourcePort for TimeoutOwner {
            fn list_sources(&self, _: Value) -> Result<Value, String> {
                Ok(json!({"scope":{"libraryIds":[1]},"descriptors":[{
                    "itemRef":{"libraryId":1,"key":"ABCDEFGH"},
                    "source":{"kind":"metadata","field":"title"},
                    "sourceVersion":"v1","format":"text","contentLength":8
                },{
                    "itemRef":{"libraryId":1,"key":"ABCDEFGH"},
                    "source":{"kind":"fulltext","attachmentRef":{"libraryId":1,"key":"MARKDOWN"}},
                    "sourceVersion":"v1","format":"markdown","contentLength":8
                }],"nextCursor":null,"hasMore":false,"issues":[]}))
            }
            fn read_source(&self, _: Value) -> Result<Value, String> {
                Err("operation_timeout".into())
            }
        }
        let app = EvidenceSearchApplication::new(Arc::new(TimeoutOwner));
        let result = app.search(json!({"query":"evidence"}), &|| Ok(())).unwrap();
        assert_eq!(result["status"], "limited");
        assert_eq!(result["total"], Value::Null);
        for kind in ["metadata", "fulltext", "analysis"] {
            assert_eq!(result["coverage"]["sources"][kind]["status"], "limited");
        }
    }

    #[test]
    fn limited_catalog_keeps_its_verified_result_round_pageable() {
        struct PartialOwner(SourceOwner);
        impl EvidenceSourcePort for PartialOwner {
            fn list_sources(&self, request: Value) -> Result<Value, String> {
                let mut page = self.0.list_sources(request)?;
                page["issues"] = json!([{
                    "code":"source_unavailable","sourceKind":"analysis","affectedCount":1
                }]);
                Ok(page)
            }
            fn read_source(&self, request: Value) -> Result<Value, String> {
                self.0.read_source(request)
            }
        }
        let app = EvidenceSearchApplication::new(Arc::new(PartialOwner(SourceOwner {
            content: "evidence one\n\nevidence two".into(),
            change_on_verification: false,
        })));
        let first = app
            .search(json!({"query":"evidence","limit":1}), &|| Ok(()))
            .unwrap();
        assert_eq!(first["status"], "limited");
        assert_eq!(first["total"], Value::Null);
        let second = app
            .search(
                json!({"query":"evidence","limit":1,"cursor":first["nextCursor"]}),
                &|| Ok(()),
            )
            .expect("unchanged incomplete coverage still permits the same verified round");
        assert_eq!(second["results"][0]["content"], "evidence two");
        assert_eq!(second["status"], "limited");
        assert_eq!(second["hasMore"], false);
    }

    fn matched(coverage: usize, phrase: bool) -> LexicalMatch {
        LexicalMatch {
            coverage,
            phrase,
            ranges: Vec::new(),
        }
    }

    #[test]
    fn dense_ranks_share_equal_lexical_significance() {
        let items = vec![
            (matched(2, true), 0usize),
            (matched(2, true), 0usize),
            (matched(2, false), 0usize),
            (matched(1, true), 3usize),
        ];
        let ranks = dense_ranks(&items, |left, right| {
            crate::lexical_search::compare_matches(&left.0, left.1, "", &right.0, right.1, "")
                == std::cmp::Ordering::Equal
        });
        assert_eq!(ranks, vec![0, 0, 1, 2]);
    }

    #[test]
    fn reciprocal_rank_fusion_equal_ties_contribute_equally() {
        // Two items tied in lexical significance share dense rank 0, so their
        // lexical contribution is identical rather than rank-ordered.
        let lexical = vec![("a".to_owned(), 0usize), ("b".to_owned(), 0usize)];
        let vector = vec![("b".to_owned(), 0usize), ("c".to_owned(), 1usize)];
        let fused = reciprocal_rank_fusion(&[lexical, vector], 60);
        assert_eq!(
            fused
                .iter()
                .map(|(identity, _)| identity.as_str())
                .collect::<Vec<_>>(),
            vec!["b", "a", "c"]
        );
        let score = |identity: &str| {
            fused
                .iter()
                .find(|(name, _)| name == identity)
                .expect("fused identity")
                .1
        };
        assert!((score("a") - 1.0 / 61.0).abs() < 1e-12);
        assert!((score("b") - 2.0 / 61.0).abs() < 1e-12);
        assert!((score("c") - 1.0 / 62.0).abs() < 1e-12);
    }

    #[test]
    fn reciprocal_rank_fusion_resolves_only_exact_ties_by_identity() {
        let lexical = vec![("zeta".to_owned(), 0usize), ("alpha".to_owned(), 0usize)];
        let fused = reciprocal_rank_fusion(&[lexical], 60);
        assert_eq!(fused[0].0, "alpha");
        assert!((fused[0].1 - fused[1].1).abs() < 1e-12);
    }

    fn library_item(key: &str, term: &str) -> Value {
        json!({
            "itemRef": {"libraryId": 1, "key": key},
            "matches": [{
                "source": {"kind":"metadata","field":"title"},
                "sourceVersion": "v1",
                "location": {"unit":"field","field":"title","range":{"start":0,"end":5}},
                "matchedTerms": [term],
                "phraseMatch": false,
            }],
        })
    }

    fn library_execution(method: &str, results: Value) -> Value {
        json!({
            "result": {
                "results": results,
                "status": "completed",
                "method": method,
                "coverage": {"kind":"library","sources":{
                    "metadata": {"status":"complete","sourcesScanned":2},
                    "fulltext": {"status":"not_requested","sourcesScanned":0},
                    "analysis": {"status":"not_requested","sourcesScanned":0},
                }},
                "issues": [],
                "nextCursor": null,
                "hasMore": false,
                "total": 2,
            },
            "scope": {"libraryIds": [1]},
            "descriptors": [],
            "catalogIssues": [],
            "catalogLimited": false,
        })
    }

    #[test]
    fn library_fusion_reorders_existing_lexical_items_by_rrf() {
        // Lexical ties share dense rank 0, so only the vector ranking separates
        // them; the stronger vector score wins.
        let lexical = vec![("1:AAAA".to_owned(), 0usize), ("1:BBBB".to_owned(), 0usize)];
        let vector = vec![("1:BBBB".to_owned(), 0.9f32), ("1:AAAA".to_owned(), 0.5f32)];
        assert_eq!(
            fuse_library_result_order(&lexical, &vector),
            vec!["1:BBBB", "1:AAAA"]
        );
    }

    #[test]
    fn apply_library_fusion_marks_hybrid_and_keeps_lexical_items() {
        let mut execution = library_execution(
            "lexical",
            json!([library_item("AAAA", "alpha"), library_item("BBBB", "beta")]),
        );
        let vector = vec![("1:BBBB".to_owned(), 0.9f32), ("1:AAAA".to_owned(), 0.2f32)];
        let lexical = BTreeSet::from(["1:AAAA".to_owned(), "1:BBBB".to_owned()]);
        assert!(apply_library_fusion(&mut execution, &vector, &lexical));
        assert_eq!(execution["result"]["method"], json!("hybrid"));
        assert_eq!(
            execution["result"]["results"][0]["itemRef"]["key"],
            json!("BBBB")
        );
        assert_eq!(
            execution["result"]["results"][1]["itemRef"]["key"],
            json!("AAAA")
        );
        assert!(validate_library_retrieval_result(&execution));
        assert!(!validate_library_lexical_result(&execution));
    }

    #[test]
    fn library_retrieval_validator_admits_semantic_methods_only() {
        let lexical = library_execution("lexical", json!([library_item("AAAA", "alpha")]));
        assert!(validate_library_lexical_result(&lexical));
        assert!(!validate_library_retrieval_result(&lexical));
        let mut hybrid = lexical.clone();
        hybrid["result"]["method"] = json!("hybrid");
        assert!(!validate_library_lexical_result(&hybrid));
        assert!(validate_library_retrieval_result(&hybrid));
    }

    fn semantic_only_item(key: &str) -> Value {
        json!({
            "itemRef": {"libraryId": 1, "key": key},
            "matches": [{
                "source": {"kind":"metadata","field":"title"},
                "sourceVersion": "v1",
                "location": {"unit":"field","field":"title","range":{"start":0,"end":5}},
                "matchedTerms": [],
                "phraseMatch": false,
            }],
        })
    }

    #[test]
    fn library_fusion_gives_semantic_only_items_no_lexical_rank() {
        let mut execution = library_execution(
            "hybrid",
            json!([
                library_item("AAAA", "alpha"),
                library_item("BBBB", "beta"),
                semantic_only_item("CCCC"),
            ]),
        );
        // A, B are the original lexical set; C is semantic-only and must reach
        // the ranking through the vector term alone.
        let lexical = BTreeSet::from(["1:AAAA".to_owned(), "1:BBBB".to_owned()]);
        let vector = vec![
            ("1:CCCC".to_owned(), 0.9f32),
            ("1:AAAA".to_owned(), 0.5f32),
            ("1:BBBB".to_owned(), 0.4f32),
        ];
        assert!(apply_library_fusion(&mut execution, &vector, &lexical));
        let order = execution["result"]["results"]
            .as_array()
            .unwrap()
            .iter()
            .map(|result| result["itemRef"]["key"].as_str().unwrap().to_owned())
            .collect::<Vec<_>>();
        // Lexical significance ties A and B; the strong semantic-only C still
        // ranks below both because it earns no lexical contribution.
        assert_eq!(order, vec!["AAAA", "BBBB", "CCCC"]);
        // Multi-match counterexample: significance must be one real match tuple,
        // not a synthesized (max coverage, OR phrase, best priority) that no
        // single match actually has. The best match here is (2, false, 0); the
        // synthesized tuple would be (2, true, 0).
        let multi = json!({
            "matches": [
                {"matchedTerms":["a","b"],"phraseMatch":false,"source":{"kind":"metadata","field":"title"}},
                {"matchedTerms":["a"],"phraseMatch":true,"source":{"kind":"metadata","field":"abstract"}},
            ]
        });
        assert_eq!(library_item_significance(&multi), (2, false, 0));
    }

    #[test]
    fn library_union_surfaces_bounded_issues_without_a_vector_contribution() {
        let mut execution = json!({"result": {"status": "completed", "total": 2, "issues": []}});
        flush_library_issues(
            &mut execution,
            vec![json!({"code": "source_changed", "sourceKind": null, "affectedCount": 1})],
        );
        assert_eq!(execution["result"]["status"], json!("limited"));
        assert_eq!(execution["result"]["total"], Value::Null);
        assert_eq!(
            execution["result"]["issues"][0]["code"],
            json!("source_changed")
        );
        // No new issue leaves the envelope untouched.
        let mut untouched = json!({"result": {"status": "completed", "total": 2, "issues": []}});
        flush_library_issues(&mut untouched, Vec::new());
        assert_eq!(untouched["result"]["status"], json!("completed"));
        assert_eq!(untouched["result"]["total"], json!(2));
    }

    struct RangeOwner {
        content: String,
    }

    impl EvidenceSourcePort for RangeOwner {
        fn list_sources(&self, _request: Value) -> Result<Value, String> {
            unreachable!("range owner is only read by location")
        }
        fn read_source(&self, request: Value) -> Result<Value, String> {
            let descriptor = &request["descriptor"];
            let location = &request["location"];
            let start = location["range"]["start"].as_u64().unwrap_or_default() as usize;
            let end = location["range"]["end"].as_u64().unwrap_or_default() as usize;
            let content = String::from_utf16_lossy(
                &self
                    .content
                    .encode_utf16()
                    .skip(start)
                    .take(end.saturating_sub(start))
                    .collect::<Vec<_>>(),
            );
            Ok(json!({
                "outcome": "available",
                "itemRef": descriptor["itemRef"].clone(),
                "content": content,
                "format": descriptor["format"].clone(),
                "source": descriptor["source"].clone(),
                "sourceVersion": descriptor["sourceVersion"].clone(),
                "location": location.clone(),
            }))
        }
    }

    #[test]
    fn vector_only_passage_requires_current_version_and_original_range() {
        let content = "alpha passage beta".to_owned();
        let application = EvidenceSearchApplication::new(Arc::new(RangeOwner {
            content: content.clone(),
        }));
        let descriptor = SourceDescriptor {
            item_ref: ItemRef {
                library_id: 1,
                key: "AAAA".into(),
            },
            source: EvidenceSource::Metadata {
                field: "title".into(),
            },
            source_version: "v1".into(),
            format: TextFormat::Text,
            content_length: content.encode_utf16().count(),
        };
        let scope = json!({"libraryIds": [1]});
        let fragments = [descriptor];
        let fragment = |version: &str, start: i64, end: i64| crate::retrieval::ScoredFragment {
            item_ref: Some(ItemRef {
                library_id: 1,
                key: "AAAA".into(),
            }),
            topic: None,
            item_identity: "1:AAAA".into(),
            library_id: 1,
            group_id: "group".into(),
            fragment_id: "fragment".into(),
            source_json: json!({"kind": "metadata", "field": "title"}).to_string(),
            source_version: version.into(),
            range_start: start,
            range_end: end,
            location_json:
                json!({"unit": "field", "field": "title", "range": {"start": start, "end": end}})
                    .to_string(),
            score: 0.5,
        };
        // Current version and a legal original range verify to real passage text.
        let verified = application
            .verify_semantic_passage(&scope, &fragments, &fragment("v1", 0, 5))
            .expect("verified passage");
        assert_eq!(verified.content, "alpha");
        assert_eq!(verified.descriptor.item_ref.key, "AAAA");
        // A stale source version and an out-of-range span are both rejected.
        assert_eq!(
            application
                .verify_semantic_passage(&scope, &fragments, &fragment("v2", 0, 5))
                .err()
                .unwrap(),
            "source_changed"
        );
        assert_eq!(
            application
                .verify_semantic_passage(&scope, &fragments, &fragment("v1", 0, 99))
                .err()
                .unwrap(),
            "source_changed"
        );
    }
}
