//! Paper-detail similarity over the current active retrieval publication.
//!
//! recommend() reuses the existing RetrievalApplication::query ranking (exact
//! cosine over original vectors, best fragment per portable identity) plus the
//! real source catalog/read ports. It restricts the query to the seed paper's
//! library, excludes the seed, and reports unavailability instead of lexical
//! substitutes. Seed and result material follow one order: the metadata
//! abstract, then an existing structured canonical digest overview marked
//! generated, then the title marked weak. A markdown digest is never mined for
//! a summary; only the digest's approved structured overview path is read.

use crate::evidence_search::{ItemRef, SourceKind};
use crate::retrieval::RetrievalApplication;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::time::{SystemTime, UNIX_EPOCH};

/// Default result count when the request omits limit; matches the shared
/// TypeScript SYNTHESIS_RETRIEVAL_DEFAULT_LIMIT.
pub const SIMILARITY_DEFAULT_LIMIT: usize = 25;
/// Hard bound for one similarity request (PaperSimilarityRequest.limit).
pub const SIMILARITY_MAX_LIMIT: usize = 100;
const SIMILARITY_MAX_TITLE_UTF16: usize = 512;
const SIMILARITY_MAX_EXCERPT_UTF16: usize = 2_048;
const SIMILARITY_MAX_DESCRIPTORS: usize = 256;
const SIMILARITY_MAX_CATALOG_PAGES: usize = 64;
const SIMILARITY_MAX_SOURCE_VERSION_UTF16: usize = 256;
const SIMILARITY_MAX_CONTENT_UTF16: usize = 262_144;
const SIMILARITY_CATALOG_PAGE_LIMIT: usize = 100;
const SIMILARITY_QUERY_LIFETIME_MS: u64 = 30_000;
/// Approved structured overview paths inside a canonical digest artifact.
/// Only these exact JSON pointers are read; arbitrary markdown is never mined
/// for a summary and no descriptor format or length is fabricated.
const DIGEST_OVERVIEW_POINTERS: [&str; 2] = ["/overview", "/summary/overview"];
const SOURCE_KINDS: [SourceKind; 2] = [SourceKind::Metadata, SourceKind::Analysis];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SimilarityRequest {
    paper_ref: ItemRef,
    #[serde(default)]
    limit: Option<usize>,
}

type SimilarityCatalog = (Vec<(DescriptorView, Value)>, Value, bool);

impl SimilarityRequest {
    /// Admission mirrors PaperSimilarityRequest: a well-formed portable ref and
    /// an optional limit inside 1..=100.
    fn admit(&self) -> Result<usize, String> {
        if !valid_item_ref(&self.paper_ref) {
            return Err("invalid_request".into());
        }
        let limit = self.limit.unwrap_or(SIMILARITY_DEFAULT_LIMIT);
        if limit == 0 || limit > SIMILARITY_MAX_LIMIT {
            return Err("invalid_request".into());
        }
        Ok(limit)
    }
}

/// One catalog descriptor. Only fields the source owner actually supplies are
/// read; the private Rust view never invents a format or content length.
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DescriptorView {
    item_ref: ItemRef,
    source: Value,
    source_version: String,
    format: String,
    content_length: usize,
}

impl DescriptorView {
    fn is_valid(&self) -> bool {
        valid_item_ref(&self.item_ref)
            && !self.source_version.is_empty()
            && self.source_version.encode_utf16().count() <= SIMILARITY_MAX_SOURCE_VERSION_UTF16
            && self.content_length <= SIMILARITY_MAX_CONTENT_UTF16
            && self.source.is_object()
            && matches!(self.format.as_str(), "text" | "markdown")
            && self.source_kind().is_some()
    }

    fn source_kind(&self) -> Option<SourceKind> {
        match self.source.get("kind").and_then(Value::as_str) {
            Some("metadata") => Some(SourceKind::Metadata),
            Some("fulltext") => Some(SourceKind::Fulltext),
            Some("analysis") => Some(SourceKind::Analysis),
            _ => None,
        }
    }
}

/// Chosen summary material for one paper.
struct PaperMaterial {
    kind: &'static str,
    title: String,
    excerpt: String,
}

/// Bounded, merged issue accumulator over the shared search issue vocabulary.
#[derive(Default)]
struct IssueBag {
    rows: Vec<Value>,
}

impl IssueBag {
    fn push(&mut self, code: &str, source_kind: Option<&str>, count: usize) {
        let kind = source_kind.map_or(Value::Null, |kind| json!(kind));
        if let Some(existing) = self
            .rows
            .iter_mut()
            .find(|row| row["code"] == json!(code) && row["sourceKind"] == kind)
        {
            existing["affectedCount"] = json!(
                (existing["affectedCount"].as_u64().unwrap_or_default() + count.max(1) as u64)
                    .min(1_000_000)
            );
        } else if self.rows.len() < 8 {
            self.rows
                .push(json!({"code": code, "sourceKind": kind, "affectedCount": count.max(1)}));
        }
    }

    fn degraded(&self) -> bool {
        !self.rows.is_empty()
    }

    fn into_value(self) -> Value {
        Value::Array(self.rows)
    }
}

impl RetrievalApplication {
    /// retrieval.recommendSimilarPapers: paper-detail similarity over the
    /// current active publication. Returns retrieval_unavailable when no
    /// compatible ready index exists; never falls back to lexical matching.
    pub fn recommend(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let request: SimilarityRequest = parse_request(request)?;
        let limit = request.admit()?;
        checkpoint()?;

        let seed_ref = request.paper_ref;
        let mut issues = IssueBag::default();

        // Seed material, restricted to the seed's own library.
        let seed_catalog = self.similarity_catalog(
            seed_ref.library_id,
            std::slice::from_ref(&seed_ref),
            checkpoint,
            &mut issues,
        );
        let (seed_rows, seed_scope, seed_limited) = match seed_catalog {
            Ok(rows) => rows,
            Err(code) if is_protocol_error(&code) => return Err(code),
            Err(_) => {
                // A seed source read failure is a bounded availability gap, not
                // a lexical substitute.
                issues.push("source_unavailable", Some("metadata"), 1);
                checkpoint()?;
                return Ok(unavailable_result(issues));
            }
        };
        if seed_limited {
            issues.push("scan_budget_exhausted", None, 1);
        }
        let Some(seed) = self.paper_material(&seed_scope, &seed_rows, checkpoint, &mut issues)?
        else {
            issues.push("source_unavailable", Some("metadata"), 1);
            checkpoint()?;
            return Ok(unavailable_result(issues));
        };
        checkpoint()?;

        // One extra ranked result so excluding the seed still yields limit.
        let max_results = (limit + 1).min(SIMILARITY_MAX_LIMIT + 1);
        let query_text = if seed.title.is_empty() {
            seed.excerpt.clone()
        } else {
            format!("{}\n{}", seed.title, seed.excerpt)
        };
        let mut query = Map::new();
        query.insert("query".into(), json!(query_text));
        query.insert("libraryIds".into(), json!([seed_ref.library_id]));
        query.insert("maxResults".into(), json!(max_results));
        query.insert("includeTopics".into(), json!(false));
        query.insert(
            "deadlineAtMs".into(),
            json!(now_millis().saturating_add(SIMILARITY_QUERY_LIFETIME_MS)),
        );
        let outcome = match self.query(Value::Object(query)) {
            Ok(outcome) => outcome,
            Err(code) if is_service_failure(&code) => {
                // Index or encoding-service failure: report bounded
                // unavailability instead of a fabricated lexical ranking.
                issues.push("vector_unavailable", None, 1);
                checkpoint()?;
                return Ok(unavailable_result(issues));
            }
            Err(code) => return Err(code),
        };
        if outcome.limited {
            issues.push("result_budget_exhausted", None, 1);
        }

        // Seed exclusion happens before any title or excerpt is read. Topic
        // results carry no portable identity and are never similarity items.
        let mut ranked = outcome
            .results
            .into_iter()
            .filter(|fragment| fragment.item_ref.is_some())
            .filter(|fragment| fragment.item_ref.as_ref() != Some(&seed_ref))
            .collect::<Vec<_>>();
        ranked.truncate(limit);

        let result_refs = ranked
            .iter()
            .filter_map(|fragment| fragment.item_ref.clone())
            .collect::<Vec<_>>();
        let (result_rows, result_scope, result_limited) = if result_refs.is_empty() {
            (Vec::new(), seed_scope.clone(), false)
        } else {
            let catalog =
                self.similarity_catalog(seed_ref.library_id, &result_refs, checkpoint, &mut issues);
            match catalog {
                Ok(rows) => rows,
                Err(code) if is_protocol_error(&code) => return Err(code),
                Err(_) => {
                    // Ranking already succeeded; missing target material
                    // degrades to identity titles instead of failing the read.
                    issues.push("source_unavailable", None, 1);
                    (Vec::new(), seed_scope.clone(), false)
                }
            }
        };
        if result_limited {
            issues.push("scan_budget_exhausted", None, 1);
        }
        let mut by_identity: BTreeMap<String, Vec<(DescriptorView, Value)>> = BTreeMap::new();
        for (view, raw) in result_rows {
            by_identity
                .entry(format!(
                    "{}:{}",
                    view.item_ref.library_id, view.item_ref.key
                ))
                .or_default()
                .push((view, raw));
        }

        let mut results = Vec::new();
        for fragment in &ranked {
            checkpoint()?;
            let Some(item_ref) = fragment.item_ref.clone() else {
                continue;
            };
            let identity = format!("{}:{}", item_ref.library_id, item_ref.key);
            let material = match by_identity.get(&identity) {
                Some(rows) => self.paper_material(&result_scope, rows, checkpoint, &mut issues)?,
                None => None,
            };
            let (title, excerpt, material_kind) = match material {
                Some(material) => {
                    let title = if material.title.is_empty() {
                        identity.clone()
                    } else {
                        material.title
                    };
                    (title, material.excerpt, material.kind)
                }
                None => (identity.clone(), String::new(), "weak"),
            };
            results.push(json!({
                "paperRef": {"libraryId": item_ref.library_id, "key": item_ref.key},
                "title": truncate_utf16(&title, SIMILARITY_MAX_TITLE_UTF16),
                "excerpt": truncate_utf16(&excerpt, SIMILARITY_MAX_EXCERPT_UTF16),
                "materialKind": material_kind,
            }));
        }

        let status = if issues.degraded() {
            "limited"
        } else {
            "completed"
        };
        checkpoint()?;
        Ok(json!({
            "status": status,
            "materialKind": seed.kind,
            "results": results,
            "issues": issues.into_value(),
        }))
    }

    /// Bounded catalog sweep for one library and a small identity set. The Host
    /// may page; membership changes fail the whole read.
    fn similarity_catalog(
        &self,
        library_id: u64,
        item_refs: &[ItemRef],
        checkpoint: &dyn Fn() -> Result<(), String>,
        issues: &mut IssueBag,
    ) -> Result<SimilarityCatalog, String> {
        let mut input = Map::new();
        input.insert(
            "scope".into(),
            json!({"libraryIds": [library_id], "itemRefs": item_refs}),
        );
        input.insert("sourceKinds".into(), json!(SOURCE_KINDS));
        input.insert("limit".into(), json!(SIMILARITY_CATALOG_PAGE_LIMIT));
        let mut rows: Vec<(DescriptorView, Value)> = Vec::new();
        let mut scope: Option<Value> = None;
        let mut cursors: BTreeSet<String> = BTreeSet::new();
        let mut limited = false;
        let mut pages = 0usize;
        loop {
            checkpoint()?;
            pages += 1;
            if pages > SIMILARITY_MAX_CATALOG_PAGES {
                limited = true;
                break;
            }
            let page = self
                .sources
                .list_sources(Value::Object(input.clone()))
                .map_err(|code| match code.as_str() {
                    "invalid_request" | "basis_mismatch" | "conflict" => code,
                    _ => "source_unavailable".to_owned(),
                })?;
            let current = page
                .get("scope")
                .filter(|value| value.is_object())
                .cloned()
                .ok_or_else(|| "invalid_source".to_owned())?;
            // Membership basis must not change between pages.
            if scope.as_ref().is_some_and(|value| value != &current) {
                return Err("basis_mismatch".into());
            }
            if let Some(libraries) = current.get("libraryIds").and_then(Value::as_array)
                && !libraries.is_empty()
                && !libraries.iter().any(|id| id.as_u64() == Some(library_id))
            {
                return Err("basis_mismatch".into());
            }
            scope = Some(current.clone());
            input.insert("scope".into(), current);
            let descriptors = page
                .get("descriptors")
                .and_then(Value::as_array)
                .ok_or_else(|| "invalid_source".to_owned())?;
            for row in descriptors {
                if rows.len() >= SIMILARITY_MAX_DESCRIPTORS {
                    limited = true;
                    break;
                }
                // Trust boundary: the Host is never trusted to have applied
                // the requested identities or the single library. A well-formed
                // descriptor outside the boundary is silently skipped, not
                // reported: over-returning is not a coverage failure. Only a
                // malformed descriptor is an issue.
                match serde_json::from_value::<DescriptorView>(row.clone()) {
                    Ok(view) if !view.is_valid() => issues.push("invalid_source", None, 1),
                    Ok(view) if !descriptor_in_scope(&view, library_id, item_refs) => {}
                    Ok(view) => rows.push((view, row.clone())),
                    Err(_) => issues.push("invalid_source", None, 1),
                }
            }
            if rows.len() >= SIMILARITY_MAX_DESCRIPTORS {
                break;
            }
            match (
                page.get("hasMore").and_then(Value::as_bool),
                page.get("nextCursor").and_then(Value::as_str),
            ) {
                (Some(false), _) => break,
                (Some(true), Some(cursor))
                    if !cursor.is_empty() && cursors.insert(cursor.to_owned()) =>
                {
                    input.insert("cursor".into(), json!(cursor));
                }
                _ => return Err("invalid_source".into()),
            }
        }
        Ok((
            rows,
            scope.unwrap_or_else(|| json!({"libraryIds": [library_id]})),
            limited,
        ))
    }

    /// Read one descriptor's whole content and verify the returned facts.
    fn read_descriptor_content(
        &self,
        scope: &Value,
        descriptor: &Value,
        view: &DescriptorView,
    ) -> Result<String, String> {
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
            || read["itemRef"] != descriptor["itemRef"]
            || read["source"] != descriptor["source"]
            || read["format"] != descriptor["format"]
            || read["sourceVersion"].as_str() != Some(view.source_version.as_str())
        {
            return Err("source_changed".into());
        }
        let content = read["content"]
            .as_str()
            .ok_or_else(|| "invalid_source".to_owned())?
            .to_owned();
        let start = read["location"]["range"]["start"].as_u64();
        let end = read["location"]["range"]["end"].as_u64();
        if start != Some(0)
            || end != Some(view.content_length as u64)
            || content.encode_utf16().count() != view.content_length
        {
            return Err("source_changed".into());
        }
        Ok(content)
    }

    /// One paper's summary material: metadata abstract, else a structured
    /// canonical digest overview, else the title. Read failures degrade to the
    /// next tier and are reported; nothing is fabricated.
    fn paper_material(
        &self,
        scope: &Value,
        descriptors: &[(DescriptorView, Value)],
        checkpoint: &dyn Fn() -> Result<(), String>,
        issues: &mut IssueBag,
    ) -> Result<Option<PaperMaterial>, String> {
        let mut title = String::new();
        let mut abstract_text = String::new();
        let mut overview = String::new();
        for (view, raw) in descriptors {
            checkpoint()?;
            let Some(kind) = view.source_kind() else {
                continue;
            };
            let field = view
                .source
                .get("field")
                .and_then(Value::as_str)
                .unwrap_or("");
            match kind {
                SourceKind::Metadata if field == "title" => {
                    if !title.is_empty() {
                        continue;
                    }
                    match self.read_descriptor_content(scope, raw, view) {
                        Ok(text) => title = trim_text(&text),
                        Err(code) => issues.push(&code, Some("metadata"), 1),
                    }
                }
                SourceKind::Metadata if field == "abstract" => {
                    if !abstract_text.is_empty() {
                        continue;
                    }
                    match self.read_descriptor_content(scope, raw, view) {
                        Ok(text) => abstract_text = trim_text(&text),
                        Err(code) => issues.push(&code, Some("metadata"), 1),
                    }
                }
                SourceKind::Analysis if is_digest_source(&view.source) && view.format == "text" => {
                    if !overview.is_empty() {
                        continue;
                    }
                    match self.read_descriptor_content(scope, raw, view) {
                        Ok(text) => {
                            let found = structured_overview(&text);
                            if let Some(found) = found {
                                overview = found;
                            }
                        }
                        Err(code) => issues.push(&code, Some("analysis"), 1),
                    }
                }
                _ => {}
            }
        }
        let title = truncate_utf16(&title, SIMILARITY_MAX_TITLE_UTF16);
        if !abstract_text.is_empty() {
            return Ok(Some(PaperMaterial {
                kind: "metadata",
                excerpt: truncate_utf16(&abstract_text, SIMILARITY_MAX_EXCERPT_UTF16),
                title,
            }));
        }
        if !overview.is_empty() {
            return Ok(Some(PaperMaterial {
                kind: "generated",
                excerpt: truncate_utf16(&overview, SIMILARITY_MAX_EXCERPT_UTF16),
                title,
            }));
        }
        if !title.is_empty() {
            return Ok(Some(PaperMaterial {
                kind: "weak",
                excerpt: title.clone(),
                title,
            }));
        }
        Ok(None)
    }
}

fn unavailable_result(issues: IssueBag) -> Value {
    json!({
        "status": "unavailable",
        "materialKind": "weak",
        "results": [],
        "issues": issues.into_value(),
    })
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

/** Protocol or scope problems the caller must fix; never masked as unavailable. */
fn is_protocol_error(code: &str) -> bool {
    matches!(
        code,
        "invalid_request" | "invalid_source" | "basis_mismatch" | "conflict"
    )
}

/** Index or encoding-service failures that report bounded unavailability. */
fn is_service_failure(code: &str) -> bool {
    matches!(
        code,
        "retrieval_unavailable"
            | "embedding_response_invalid"
            | "service_unavailable"
            | "operation_timeout"
    )
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

/**
 * Exact requested identities inside the one requested library. A descriptor
 * outside that boundary is never read, even when the Host returns a wider set.
 */
fn descriptor_in_scope(view: &DescriptorView, library_id: u64, item_refs: &[ItemRef]) -> bool {
    view.item_ref.library_id == library_id && item_refs.contains(&view.item_ref)
}

fn is_digest_source(source: &Value) -> bool {
    source.get("kind").and_then(Value::as_str) == Some("analysis")
        && source.get("artifactType").and_then(Value::as_str) == Some("digest")
}

/// Exact explicit overview keys only, at the approved structured paths. A
/// canonical digest payload that carries markdown yields nothing here, so a
/// markdown digest is never mined for a summary.
fn structured_overview(text: &str) -> Option<String> {
    let value: Value = serde_json::from_str(text).ok()?;
    for pointer in DIGEST_OVERVIEW_POINTERS {
        if let Some(found) = value.pointer(pointer).and_then(Value::as_str) {
            let found = trim_text(found);
            if !found.is_empty() {
                return Some(found);
            }
        }
    }
    None
}

fn trim_text(text: &str) -> String {
    text.trim().to_owned()
}

fn truncate_utf16(text: &str, max: usize) -> String {
    let mut out = String::new();
    let mut count = 0usize;
    for character in text.chars() {
        let width = character.len_utf16();
        if count + width > max {
            break;
        }
        count += width;
        out.push(character);
    }
    out
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::evidence_search::EvidenceSourcePort;
    use crate::ports::RepositoryPort;
    use crate::retrieval::{RetrievalBuildMode, RetrievalEmbeddingPort};
    use std::sync::{Arc, Mutex};
    use synthesis_canonical_store::{
        CanonicalError, CanonicalReceipt, CanonicalTopicSearchSnapshot, CanonicalTopicState,
        PreparedCanonicalPromotion,
    };
    use synthesis_repository::{Repository, RepositoryIdentity};
    use synthesis_test_support::TestRoot;

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
            let Some((stored, content)) = self.rows.iter().find(|(row, _)| {
                row["itemRef"] == descriptor["itemRef"] && row["source"] == descriptor["source"]
            }) else {
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

    impl RetrievalEmbeddingPort for FakeEmbeddings {
        fn describe(&self) -> Result<Value, String> {
            Ok(json!({
                "enabled": true,
                "identity": {
                    "modelId": "test-model",
                    "dimensions": 16,
                    "queryPrefix": "q:",
                    "documentPrefix": "d:",
                },
            }))
        }

        fn encode(&self, request: Value) -> Result<Value, String> {
            let dimensions = request["identity"]["dimensions"].as_u64().unwrap_or(0) as usize;
            let inputs = request["inputs"].as_array().cloned().unwrap_or_default();
            let vectors = inputs
                .iter()
                .map(|input| {
                    let text = input.as_str().unwrap_or("");
                    let mut vector = vec![0.5f32; dimensions.max(1)];
                    for character in text.chars() {
                        vector[(character as usize) % dimensions.max(1)] += 1.0;
                    }
                    vector
                })
                .collect::<Vec<_>>();
            Ok(json!({"identity": request["identity"].clone(), "vectors": vectors}))
        }
    }

    /// Healthy for document encoding; query encoding returns invalid vectors.
    struct QueryFailingEmbeddings;

    impl RetrievalEmbeddingPort for QueryFailingEmbeddings {
        fn describe(&self) -> Result<Value, String> {
            Ok(json!({
                "enabled": true,
                "identity": {
                    "modelId": "test-model",
                    "dimensions": 16,
                    "queryPrefix": "q:",
                    "documentPrefix": "d:",
                },
            }))
        }

        fn encode(&self, request: Value) -> Result<Value, String> {
            if request["purpose"] == json!("query") {
                return Ok(json!({
                    "identity": request["identity"].clone(),
                    "vectors": [[0.0, 0.0]],
                }));
            }
            FakeEmbeddings.encode(request)
        }
    }

    /// First page resolves one membership basis; the next resolves a different
    /// one, so the whole read must fail instead of mixing pages.
    struct DriftingSources;

    impl EvidenceSourcePort for DriftingSources {
        fn list_sources(&self, request: Value) -> Result<Value, String> {
            let cursor = request
                .get("cursor")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_owned();
            if cursor.is_empty() {
                Ok(json!({
                    "scope": {"libraryIds": [1], "itemRefs": [{"libraryId": 1, "key": "SEED"}]},
                    "descriptors": [metadata_descriptor("SEED", "title", "Seed paper")],
                    "issues": [],
                    "hasMore": true,
                    "nextCursor": "page-2",
                }))
            } else {
                Ok(json!({
                    "scope": {"libraryIds": [1, 2], "itemRefs": [{"libraryId": 1, "key": "SEED"}]},
                    "descriptors": [],
                    "issues": [],
                    "hasMore": false,
                    "nextCursor": null,
                }))
            }
        }

        fn read_source(&self, _request: Value) -> Result<Value, String> {
            Ok(json!({"outcome": "source_unavailable"}))
        }
    }

    struct EmptyCanonical;

    impl crate::ports::TopicCanonicalPort for EmptyCanonical {
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

    fn metadata_descriptor(key: &str, field: &str, content: &str) -> Value {
        json!({
            "itemRef": {"libraryId": 1, "key": key},
            "source": {"kind": "metadata", "field": field},
            "sourceVersion": "v1",
            "format": "text",
            "contentLength": content.encode_utf16().count(),
        })
    }

    fn metadata_descriptor_in_library(
        library_id: u64,
        key: &str,
        field: &str,
        content: &str,
    ) -> Value {
        json!({
            "itemRef": {"libraryId": library_id, "key": key},
            "source": {"kind": "metadata", "field": field},
            "sourceVersion": "v1",
            "format": "text",
            "contentLength": content.encode_utf16().count(),
        })
    }

    fn digest_descriptor(key: &str, format: &str, content: &str) -> Value {
        json!({
            "itemRef": {"libraryId": 1, "key": key},
            "source": {
                "kind": "analysis",
                "artifactType": "digest",
                "noteRef": {"libraryId": 1, "key": format!("NOTE{key}")},
            },
            "sourceVersion": "v1",
            "format": format,
            "contentLength": content.encode_utf16().count(),
        })
    }

    fn fixture(label: &str, rows: Vec<(Value, String)>) -> Fixture {
        fixture_with(label, rows, Arc::new(FakeEmbeddings))
    }

    fn fixture_with(
        label: &str,
        rows: Vec<(Value, String)>,
        embeddings: Arc<dyn RetrievalEmbeddingPort>,
    ) -> Fixture {
        fixture_ports(label, Arc::new(FakeSources { rows }), embeddings)
    }

    fn fixture_ports(
        label: &str,
        sources: Arc<dyn EvidenceSourcePort>,
        embeddings: Arc<dyn RetrievalEmbeddingPort>,
    ) -> Fixture {
        let root = TestRoot::new(&format!("synthesis-retrieval-similarity-{label}"));
        let repository = Repository::open(
            root.path(),
            RepositoryIdentity {
                profile_id: "profile:retrieval-similarity".into(),
                data_root_id: "data:retrieval-similarity".into(),
            },
        )
        .expect("repository");
        let application = RetrievalApplication::new(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository)))),
            sources,
            embeddings,
            Arc::new(EmptyCanonical),
        )
        .with_clock(Arc::new(|| "2026-10-07T00:00:00.000Z".into()));
        Fixture {
            application,
            _root: root,
        }
    }

    fn checkpoint() -> impl Fn() -> Result<(), String> {
        || Ok(())
    }

    fn build(fixture: &Fixture, kinds: Value) {
        let outcome = fixture
            .application
            .build(
                json!({
                    "identity": {
                        "modelId": "test-model",
                        "dimensions": 16,
                        "queryPrefix": "q:",
                        "documentPrefix": "d:",
                    },
                    "scope": {"libraryIds": [1], "sourceKinds": kinds, "includeTopics": false},
                }),
                RetrievalBuildMode::Full,
                &checkpoint(),
            )
            .expect("build");
        // The maintenance view reports the promotion outcome; the index state
        // is read back through getState.
        assert_eq!(outcome["status"], json!("promoted"));
        assert_eq!(
            fixture.application.state().unwrap()["status"],
            json!("ready")
        );
    }

    fn identities(result: &Value) -> Vec<String> {
        result["results"]
            .as_array()
            .unwrap()
            .iter()
            .map(|row| {
                format!(
                    "{}:{}",
                    row["paperRef"]["libraryId"].as_u64().unwrap(),
                    row["paperRef"]["key"].as_str().unwrap()
                )
            })
            .collect()
    }

    /// Mirrors the PaperSimilarityResult contract shape until a shared Rust
    /// rebuilder exists for retrieval DTOs.
    fn assert_contract_shape(result: &Value) {
        let object = result.as_object().unwrap();
        let mut keys = object.keys().map(String::as_str).collect::<Vec<_>>();
        keys.sort_unstable();
        assert_eq!(keys, vec!["issues", "materialKind", "results", "status"]);
        assert!(matches!(
            result["status"].as_str(),
            Some("completed") | Some("limited") | Some("unavailable")
        ));
        assert!(matches!(
            result["materialKind"].as_str(),
            Some("metadata") | Some("generated") | Some("weak")
        ));
        let issues = result["issues"].as_array().unwrap();
        assert!(issues.len() <= 8);
        for issue in issues {
            let mut issue_keys = issue
                .as_object()
                .unwrap()
                .keys()
                .map(String::as_str)
                .collect::<Vec<_>>();
            issue_keys.sort_unstable();
            assert_eq!(issue_keys, vec!["affectedCount", "code", "sourceKind"]);
        }
        let results = result["results"].as_array().unwrap();
        assert!(results.len() <= SIMILARITY_MAX_LIMIT);
        for item in results {
            let mut item_keys = item
                .as_object()
                .unwrap()
                .keys()
                .map(String::as_str)
                .collect::<Vec<_>>();
            item_keys.sort_unstable();
            assert_eq!(
                item_keys,
                vec!["excerpt", "materialKind", "paperRef", "title"]
            );
            let title = item["title"].as_str().unwrap();
            let title_length = title.encode_utf16().count();
            assert!((1..=SIMILARITY_MAX_TITLE_UTF16).contains(&title_length));
            assert!(
                item["excerpt"].as_str().unwrap().encode_utf16().count()
                    <= SIMILARITY_MAX_EXCERPT_UTF16
            );
            assert!(matches!(
                item["materialKind"].as_str(),
                Some("metadata") | Some("generated") | Some("weak")
            ));
            assert!(
                item["paperRef"]["libraryId"]
                    .as_u64()
                    .is_some_and(|id| id > 0)
            );
            assert!(!item["paperRef"]["key"].as_str().unwrap().is_empty());
        }
    }

    #[test]
    fn recommends_related_papers_and_excludes_the_seed() {
        let shared = "alpha graph retrieval methods";
        let fixture = fixture(
            "related",
            vec![
                (
                    metadata_descriptor("SEED", "title", "Seed paper"),
                    "Seed paper".to_owned(),
                ),
                (
                    metadata_descriptor("SEED", "abstract", shared),
                    shared.to_owned(),
                ),
                (
                    metadata_descriptor("AAAA", "title", "Related paper"),
                    "Related paper".to_owned(),
                ),
                (
                    metadata_descriptor("AAAA", "abstract", shared),
                    shared.to_owned(),
                ),
                (
                    metadata_descriptor("BBBB", "title", "Other paper"),
                    "Other paper".to_owned(),
                ),
                (
                    metadata_descriptor("BBBB", "abstract", "zzz qqq"),
                    "zzz qqq".to_owned(),
                ),
            ],
        );
        build(&fixture, json!(["metadata"]));
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}, "limit": 5}),
                &checkpoint(),
            )
            .expect("recommend");
        assert_eq!(result["status"], json!("completed"));
        assert_contract_shape(&result);
        assert_eq!(result["materialKind"], json!("metadata"));
        assert_eq!(identities(&result), vec!["1:AAAA", "1:BBBB"]);
        let first = &result["results"][0];
        assert_eq!(first["title"], json!("Related paper"));
        assert_eq!(first["excerpt"], json!(shared));
        assert_eq!(first["materialKind"], json!("metadata"));
        assert!(result["issues"].as_array().unwrap().is_empty());
    }

    #[test]
    fn uses_an_explicit_digest_overview_marked_generated() {
        let payload = r#"{"overview":"seed overview"}"#;
        let related_payload = r#"{"overview":"aaaa overview"}"#;
        let fixture = fixture(
            "generated",
            vec![
                (
                    metadata_descriptor("SEED", "title", "Seed paper"),
                    "Seed paper".to_owned(),
                ),
                (
                    digest_descriptor("SEED", "text", payload),
                    payload.to_owned(),
                ),
                (
                    metadata_descriptor("AAAA", "title", "Related"),
                    "Related".to_owned(),
                ),
                (
                    digest_descriptor("AAAA", "text", related_payload),
                    related_payload.to_owned(),
                ),
            ],
        );
        build(&fixture, json!(["metadata", "analysis"]));
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                &checkpoint(),
            )
            .expect("recommend");
        assert_eq!(result["materialKind"], json!("generated"));
        assert_eq!(result["status"], json!("completed"));
        assert_contract_shape(&result);
        assert_eq!(identities(&result), vec!["1:AAAA"]);
        assert_eq!(result["results"][0]["excerpt"], json!("aaaa overview"));
        assert_eq!(result["results"][0]["materialKind"], json!("generated"));
    }

    #[test]
    fn a_markdown_digest_is_never_mined_for_a_summary() {
        // The real literature digest payload carries markdown, not an explicit
        // overview field.
        let payload: &str =
            "{\"markdown\":\"# Digest\\n\\n## Overview\\n\\nmust not be extracted\\n\"}";
        let fixture = fixture(
            "no-regex",
            vec![
                (
                    metadata_descriptor("SEED", "title", "Seed paper"),
                    "Seed paper".to_owned(),
                ),
                (
                    digest_descriptor("SEED", "text", payload),
                    payload.to_owned(),
                ),
                (
                    metadata_descriptor("AAAA", "title", "Related"),
                    "Related".to_owned(),
                ),
            ],
        );
        build(&fixture, json!(["metadata", "analysis"]));
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                &checkpoint(),
            )
            .expect("recommend");
        assert_eq!(result["materialKind"], json!("weak"));
        assert_eq!(identities(&result), vec!["1:AAAA"]);
        assert_eq!(result["results"][0]["materialKind"], json!("weak"));
        assert_eq!(result["results"][0]["excerpt"], json!("Related"));
    }

    #[test]
    fn reports_unavailability_without_a_ready_index() {
        let fixture = fixture(
            "unavailable",
            vec![(
                metadata_descriptor("SEED", "title", "Seed paper"),
                "Seed paper".to_owned(),
            )],
        );
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                &checkpoint(),
            )
            .expect("recommend");
        assert_eq!(result["status"], json!("unavailable"));
        assert_eq!(result["results"], json!([]));
        assert_eq!(result["issues"][0]["code"], json!("vector_unavailable"));
    }

    #[test]
    fn encoding_service_failure_reports_bounded_unavailability() {
        let fixture = fixture_with(
            "encoding-failure",
            vec![(
                metadata_descriptor("SEED", "title", "Seed paper"),
                "Seed paper".to_owned(),
            )],
            Arc::new(QueryFailingEmbeddings),
        );
        build(&fixture, json!(["metadata"]));
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                &checkpoint(),
            )
            .expect("recommend");
        assert_eq!(result["status"], json!("unavailable"));
        assert_eq!(result["results"], json!([]));
        assert_eq!(result["issues"][0]["code"], json!("vector_unavailable"));
    }

    #[test]
    fn rejects_malformed_similarity_requests() {
        let fixture = fixture("invalid", Vec::new());
        assert_eq!(
            fixture
                .application
                .recommend(
                    json!({"paperRef": {"libraryId": 1, "key": "SEED"}, "limit": 0}),
                    &checkpoint(),
                )
                .unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            fixture
                .application
                .recommend(
                    json!({"paperRef": {"libraryId": 1, "key": "SEED"}, "extra": 1}),
                    &checkpoint(),
                )
                .unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            fixture
                .application
                .recommend(
                    json!({"paperRef": {"libraryId": 1, "key": ""}}),
                    &checkpoint()
                )
                .unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn similarity_request_admission_matches_the_shared_contract_corpus() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/retrieval.json"
        ))
        .unwrap();
        let mut checked = 0usize;
        for case in corpus["cases"].as_array().unwrap() {
            let definition = case["schemaRef"]
                .as_str()
                .unwrap()
                .rsplit('/')
                .next()
                .unwrap();
            if definition != "PaperSimilarityRequest" {
                continue;
            }
            checked += 1;
            let admitted = parse_request::<SimilarityRequest>(case["value"].clone())
                .and_then(|request| request.admit())
                .is_ok();
            assert_eq!(
                admitted,
                case["admitted"].as_bool().unwrap(),
                "corpus case {}",
                case["id"]
            );
        }
        assert!(checked >= 2, "expected PaperSimilarityRequest corpus cases");
    }

    #[test]
    fn catalog_is_restricted_to_the_requested_library_and_identities() {
        // The seed itself has no material; only out-of-boundary decoys do. No
        // index is built, so this test exercises only the seed boundary.
        let fixture = fixture_ports(
            "trust-boundary",
            Arc::new(FakeSources {
                rows: vec![
                    (
                        metadata_descriptor("ZZZZ", "abstract", "decoy abstract"),
                        "decoy abstract".to_owned(),
                    ),
                    (
                        metadata_descriptor_in_library(
                            2,
                            "SEED",
                            "abstract",
                            "other library abstract",
                        ),
                        "other library abstract".to_owned(),
                    ),
                    (
                        metadata_descriptor("AAAA", "title", "Related"),
                        "Related".to_owned(),
                    ),
                ],
            }),
            Arc::new(FakeEmbeddings),
        );
        let result = fixture
            .application
            .recommend(
                json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                &checkpoint(),
            )
            .expect("recommend");
        // No in-boundary material exists, so the read reports unavailability
        // instead of borrowing a decoy's abstract.
        assert_eq!(result["status"], json!("unavailable"));
        assert_eq!(result["results"], json!([]));
        assert!(
            result["issues"]
                .as_array()
                .unwrap()
                .iter()
                .any(|issue| issue["code"] == json!("source_unavailable"))
        );
        assert_contract_shape(&result);
    }

    #[test]
    fn a_catalog_membership_change_between_pages_fails_the_read() {
        let fixture = fixture_ports(
            "drifting",
            Arc::new(DriftingSources),
            Arc::new(FakeEmbeddings),
        );
        assert_eq!(
            fixture
                .application
                .recommend(
                    json!({"paperRef": {"libraryId": 1, "key": "SEED"}}),
                    &checkpoint(),
                )
                .unwrap_err(),
            "basis_mismatch"
        );
    }
}
