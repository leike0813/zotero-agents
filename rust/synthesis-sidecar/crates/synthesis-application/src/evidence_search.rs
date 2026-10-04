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

pub struct EvidenceSearchApplication {
    sources: Arc<dyn EvidenceSourcePort>,
    rounds: Mutex<Rounds>,
}

const MAX_SOURCES: usize = 256;
const MAX_SCAN_BYTES: usize = 4 * 1024 * 1024;
const MAX_PASSAGES: usize = 4096;
const MAX_PASSAGE_UTF16: usize = 2048;
const MAX_ROUND_BYTES: usize = 512 * 1024;
const CURSOR_LIFETIME: Duration = Duration::from_secs(60);

impl EvidenceSearchApplication {
    pub fn new(sources: Arc<dyn EvidenceSourcePort>) -> Self {
        Self {
            sources,
            rounds: Mutex::new(Rounds {
                sequence: 0,
                rounds: BTreeMap::new(),
            }),
        }
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
                self.catalog(&request, Some(&round.resolved_scope), checkpoint)?;
            if issues != round.catalog_issues
                || limited != round.catalog_limited
                || hash(&json!({"scope":scope,"descriptors":descriptors})) != round.catalog_basis
            {
                return Err("basis_mismatch".into());
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
        let (descriptors, scope, mut issues, catalog_limited) =
            self.catalog(&request, None, checkpoint)?;
        if issues.is_empty()
            && (kinds.is_empty() || request.item_refs.as_ref().is_some_and(Vec::is_empty))
        {
            return Ok(json!({"results":[],"status":"completed","method":"lexical",
                "coverage":{"kind":"library","sources":{
                    "metadata":work_coverage(SourceKind::Metadata,&kinds,&BTreeMap::new(),&[],false),
                    "fulltext":work_coverage(SourceKind::Fulltext,&kinds,&BTreeMap::new(),&[],false),
                    "analysis":work_coverage(SourceKind::Analysis,&kinds,&BTreeMap::new(),&[],false)
                }},"issues":[],"nextCursor":null,"hasMore":false,"total":0}));
        }
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

    fn catalog(
        &self,
        request: &EvidenceSearchRequest,
        captured: Option<&Value>,
        checkpoint: &dyn Fn() -> Result<(), String>,
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
            if pages > 32 {
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
        let result = json!({"results":results,"status":status,"method":"lexical","coverage":round.coverage,"issues":round.issues,"nextCursor":if has_more {Some(format!("{id}:{end}"))} else {None},"hasMore":has_more,"total":round.total});
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
            "SearchRequest" | "TopicRequest" => {
                let Some(object) = value.as_object() else {
                    return false;
                };
                if object.keys().any(|key| {
                    !["query", "limit", "maxResults", "cursor"].contains(&key.as_str())
                        && !(definition == "TopicRequest" && key == "sections")
                }) {
                    return false;
                }
                if let Some(sections) = object.get("sections")
                    && !sections.as_array().is_some_and(|values| {
                        values.len() <= 100
                            && values.iter().all(|s| {
                                s.as_str()
                                    .is_some_and(|s| !s.is_empty() && s.chars().count() <= 128)
                            })
                    })
                {
                    return false;
                }
                let mut common = object.clone();
                common.remove("sections");
                EvidenceSearchRequest::from_value(Value::Object(common)).is_ok()
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
            "TopicResult" => {
                #[derive(Deserialize)]
                #[serde(rename_all = "camelCase", deny_unknown_fields)]
                struct TopicHit {
                    topic_id: String,
                    section: String,
                    content: String,
                    range: RangeWire,
                }
                let Some(hits) = value["results"].as_array() else {
                    return false;
                };
                if hits.len() > 100
                    || !hits.iter().all(|hit| {
                        let Ok(hit) = serde_json::from_value::<TopicHit>(hit.clone()) else {
                            return false;
                        };
                        !hit.topic_id.is_empty()
                            && hit.topic_id.chars().count() <= 256
                            && !hit.section.is_empty()
                            && hit.section.chars().count() <= 128
                            && hit.content.chars().count() <= 8192
                            && hit.range.end > hit.range.start
                            && hit.range.end <= 262144
                            && hit.range.end - hit.range.start == hit.content.encode_utf16().count()
                    })
                {
                    return false;
                }
                let mut envelope = value.clone();
                envelope["results"] = json!([]);
                validate_evidence_result(&envelope)
            }
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
}
