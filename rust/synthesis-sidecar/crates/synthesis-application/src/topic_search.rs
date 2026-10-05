//! Bounded canonical lexical search owned by the Topic application.
//!
//! One request performs a single bounded pass over the current canonical data
//! root, ranks Topics with the shared lexical kernel, and freezes the round
//! (result window plus the membership and content basis of every scanned
//! candidate, matches and non-matches alike) behind an opaque cursor. A
//! continuation re-reads that basis instead of rerunning the query.

use crate::lexical_search::{LexicalMatch, LexicalQuery, MAX_SOURCE_BYTES, compare_matches};
use crate::topic::TopicApplication;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::hash_map::RandomState;
use std::collections::{BTreeMap, BTreeSet};
use std::hash::{BuildHasher, Hasher};
use std::time::{Duration, Instant};
use synthesis_canonical_store::{CanonicalTopicSearchMember, CanonicalTopicView};
use synthesis_protocol::topic_artifact_sections;

/// Canonical candidates one pass may read. A larger current root reports a
/// bounded, cursorless outcome rather than a partial claim of completeness.
pub const MAX_SEARCH_CANDIDATES: usize = 64;
/// Canonical bytes one pass may read from the current root.
const MAX_SEARCH_BYTES: usize = 32 * 1024 * 1024;
/// Matching work bounds: extracted text bytes and searchable fields per round.
const MAX_MATCH_BYTES: usize = 4 * 1024 * 1024;
const MAX_MATCH_FIELDS: usize = 20_000;
const MAX_ROUNDS: usize = 8;
const CURSOR_LIFETIME: Duration = Duration::from_secs(60);
const MAX_QUERY_UTF16: usize = 4_096;
const MAX_CURSOR_UTF16: usize = 4_096;
// The shared schema counts string bounds in UTF-16 code units, so the same
// measure is used here; a code-point count would admit identities the
// TypeScript rebuilders reject.
const MAX_TOPIC_ID_UTF16: usize = 256;
const MAX_SECTION_UTF16: usize = 128;
const MAX_ISSUES: usize = 8;
const MAX_AFFECTED: usize = 1_000_000;
const MAX_RESULTS: usize = 100;
const MAX_TOTAL: usize = 1_000_000;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchRequest {
    pub query: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_results: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sections: Option<Vec<String>>,
}

impl TopicSearchRequest {
    /// Rebuild a request from its wire value. Canonical section names, bounded
    /// paging, and a non-blank query are settled before any canonical read.
    pub fn from_value(value: Value) -> Result<Self, String> {
        if value
            .as_object()
            .is_none_or(|object| object.values().any(Value::is_null))
        {
            return Err("invalid_request".into());
        }
        let request: Self =
            serde_json::from_value(value).map_err(|_| "invalid_request".to_owned())?;
        request.validate()?;
        Ok(request)
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.query.trim().is_empty()
            || self.query.encode_utf16().count() > MAX_QUERY_UTF16
            || self.limit.is_some_and(|limit| limit == 0 || limit > 100)
            || self.max_results.is_some_and(|max| max == 0 || max > 500)
            || self.cursor.as_ref().is_some_and(|cursor| {
                cursor.is_empty() || cursor.encode_utf16().count() > MAX_CURSOR_UTF16
            })
            || self.sections.as_ref().is_some_and(|sections| {
                sections.is_empty()
                    || sections.len() > topic_artifact_sections().len()
                    || sections
                        .iter()
                        .any(|section| !is_canonical_section(section))
                    || has_duplicates(sections)
            })
            || self.limit.unwrap_or(25) > self.max_results.unwrap_or(100)
        {
            return Err("invalid_request".into());
        }
        Ok(())
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TopicSearchStatus {
    Completed,
    Limited,
    Unavailable,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TopicSearchMethod {
    Lexical,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicSearchWorkStatus {
    Complete,
    NotRequested,
    Limited,
    Unavailable,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TopicSearchCoverageKind {
    Topic,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicSearchIssueCode {
    SourceUnavailable,
    SourceChanged,
    SourceReadFailed,
    InvalidSource,
    ScanBudgetExhausted,
    PassageBudgetExhausted,
    ResultBudgetExhausted,
    VectorUnavailable,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchIssue {
    pub code: TopicSearchIssueCode,
    /// Always null: a Topic-owned failure is not attributable to one library
    /// source kind, and the shared issue shape keeps that field closed.
    pub source_kind: Option<String>,
    pub affected_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchSectionCoverage {
    pub section: String,
    pub status: TopicSearchWorkStatus,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchCoverage {
    pub kind: TopicSearchCoverageKind,
    pub sections: Vec<TopicSearchSectionCoverage>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchMatch {
    pub topic_id: String,
    pub matched_sections: Vec<String>,
    pub match_reasons: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicSearchResult {
    pub results: Vec<TopicSearchMatch>,
    pub status: TopicSearchStatus,
    pub method: TopicSearchMethod,
    pub coverage: TopicSearchCoverage,
    pub issues: Vec<TopicSearchIssue>,
    pub next_cursor: Option<String>,
    pub has_more: bool,
    pub total: Option<usize>,
}

/// One frozen search round. `membership_hash` covers the canonical identity
/// and content basis of every scanned candidate, so a continuation proves the
/// round is still current without keeping the scanned content itself.
#[derive(Clone)]
struct TopicSearchRound {
    request_basis: String,
    membership_hash: String,
    results: Vec<TopicSearchMatch>,
    coverage: TopicSearchCoverage,
    issues: Vec<TopicSearchIssue>,
    total: Option<usize>,
    created: Instant,
}

#[derive(Default)]
pub struct TopicSearchRounds {
    sequence: u64,
    rounds: BTreeMap<String, TopicSearchRound>,
}

struct TopicCandidate {
    topic_id: String,
    matched: LexicalMatch,
    field_priority: usize,
    matched_sections: Vec<String>,
    match_reasons: Vec<String>,
}

#[derive(Default)]
struct ScanBudget {
    fields: usize,
    bytes: usize,
}

impl ScanBudget {
    fn consume(&mut self, bytes: usize) -> Result<(), ()> {
        self.fields += 1;
        self.bytes += bytes;
        if self.fields > MAX_MATCH_FIELDS || self.bytes > MAX_MATCH_BYTES {
            return Err(());
        }
        Ok(())
    }
}

impl TopicApplication {
    /// Search canonical Topic content. `checkpoint` is the caller's bounded
    /// execution gate; exhausting it degrades the round to `limited` instead
    /// of publishing results for a scope that was never fully scanned.
    pub fn search(
        &self,
        request: TopicSearchRequest,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<TopicSearchResult, String> {
        request.validate()?;
        let query = LexicalQuery::new(&request.query).map_err(|_| "invalid_request".to_owned())?;
        let scope = section_scope(request.sections.as_deref());
        let limit = request.limit.unwrap_or(25);
        let max_results = request.max_results.unwrap_or(100);
        let request_basis = hash(&json!({
            "algorithm":"lexical-topic-v1",
            "query":request.query,
            "sections":scope,
            "maxResults":max_results,
        }));
        match request.cursor {
            Some(cursor) => self.continue_round(&cursor, &request_basis, limit, checkpoint),
            None => self.start_round(
                &query,
                &scope,
                limit,
                max_results,
                &request_basis,
                checkpoint,
            ),
        }
    }

    fn start_round(
        &self,
        query: &LexicalQuery,
        scope: &[String],
        limit: usize,
        max_results: usize,
        request_basis: &str,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<TopicSearchResult, String> {
        checkpoint()?;
        let snapshot = match self
            .canonical
            .search_topics(MAX_SEARCH_CANDIDATES, MAX_SEARCH_BYTES)
        {
            Ok(snapshot) => snapshot,
            Err(_) => return Ok(unavailable(scope)),
        };
        let mut issues = Vec::new();
        let mut budget = ScanBudget::default();
        let mut candidates = Vec::new();
        if !snapshot.complete {
            // The owner could not read the whole current root. The candidates
            // it did read are still searched and returned as verified matches;
            // the round simply cannot claim a complete scope or a cursor.
            add_issue(&mut issues, TopicSearchIssueCode::ScanBudgetExhausted);
        }
        for member in &snapshot.members {
            if let Err(code) = checkpoint() {
                if code != "operation_timeout" {
                    return Err(code);
                }
                add_issue(&mut issues, TopicSearchIssueCode::ScanBudgetExhausted);
                break;
            }
            match member {
                CanonicalTopicSearchMember::Ready { topic_id, view, .. } => {
                    if topic_id.is_empty() || topic_id.encode_utf16().count() > MAX_TOPIC_ID_UTF16 {
                        add_issue(&mut issues, TopicSearchIssueCode::InvalidSource);
                        continue;
                    }
                    match scan_topic(query, scope, topic_id.as_str(), view, &mut budget) {
                        Ok(Some(candidate)) => candidates.push(candidate),
                        Ok(None) => {}
                        Err(()) => {
                            add_issue(&mut issues, TopicSearchIssueCode::ScanBudgetExhausted);
                            break;
                        }
                    }
                }
                CanonicalTopicSearchMember::Unavailable { code, .. } => {
                    if code == "canonical_search_budget_exhausted" {
                        add_issue(&mut issues, TopicSearchIssueCode::ScanBudgetExhausted);
                        break;
                    }
                    add_issue(&mut issues, issue_code_for(code.as_str()));
                }
            }
        }
        candidates.sort_by(|left, right| {
            compare_matches(
                &left.matched,
                left.field_priority,
                &left.topic_id,
                &right.matched,
                right.field_priority,
                &right.topic_id,
            )
        });
        // The basis is complete when the current root was fully enumerated and
        // every candidate in it was read; only such a round may be continued.
        let basis_complete = snapshot.complete && issues.is_empty();
        if candidates.len() > max_results {
            candidates.truncate(max_results);
            add_issue(&mut issues, TopicSearchIssueCode::ResultBudgetExhausted);
        }
        // An exact total is a claim about the whole requested scope, so a capped
        // result set reports no total even though its basis is complete.
        let complete = basis_complete && issues.is_empty();
        let results = candidates
            .into_iter()
            .map(|candidate| TopicSearchMatch {
                topic_id: candidate.topic_id,
                matched_sections: candidate.matched_sections,
                match_reasons: candidate.match_reasons,
            })
            .collect::<Vec<_>>();
        let coverage = section_coverage(scope, complete);
        let total = complete.then_some(results.len());
        let round = TopicSearchRound {
            request_basis: request_basis.to_owned(),
            membership_hash: snapshot.membership_hash,
            results,
            coverage,
            issues,
            total,
            created: Instant::now(),
        };
        // A continuation may only continue a round whose membership and whose
        // per-candidate content basis were both captured completely. The page
        // size is not part of that basis, so a continuation may resize its page.
        let id = (round.results.len() > limit && basis_complete)
            .then(|| self.freeze_round(round.clone()));
        self.page(&round, id.as_deref(), 0, limit)
    }

    fn continue_round(
        &self,
        cursor: &str,
        request_basis: &str,
        limit: usize,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<TopicSearchResult, String> {
        let (id, offset) = cursor
            .rsplit_once(':')
            .ok_or_else(|| "invalid_request".to_owned())?;
        let offset = offset
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned())?;
        // A round that is no longer cached expired: the process restarted or the
        // bounded cache evicted it. Neither case reruns the query.
        let round = self
            .search_rounds
            .lock()
            .map_err(|_| "search_cursor_expired".to_owned())?
            .rounds
            .get(id)
            .cloned()
            .ok_or_else(|| "search_cursor_expired".to_owned())?;
        if offset >= round.results.len() {
            return Err("invalid_request".into());
        }
        if round.request_basis != request_basis {
            return Err("search_cursor_stale".into());
        }
        if round.created.elapsed() > CURSOR_LIFETIME {
            return Err("search_cursor_expired".into());
        }
        checkpoint()?;
        // Revalidate the frozen basis: re-enumerate the current root and re-read
        // every candidate, including the Topics that did not match.
        let current = self
            .canonical
            .search_topics(MAX_SEARCH_CANDIDATES, MAX_SEARCH_BYTES)
            .map_err(|_| "search_cursor_stale".to_owned())?;
        if !current.complete || current.membership_hash != round.membership_hash {
            return Err("search_cursor_stale".into());
        }
        self.page(&round, Some(id), offset, limit)
    }

    fn freeze_round(&self, round: TopicSearchRound) -> String {
        let mut state = match self.search_rounds.lock() {
            Ok(state) => state,
            Err(poisoned) => poisoned.into_inner(),
        };
        state
            .rounds
            .retain(|_, round| round.created.elapsed() <= CURSOR_LIFETIME);
        while state.rounds.len() >= MAX_ROUNDS {
            let oldest = state
                .rounds
                .iter()
                .min_by_key(|(_, round)| round.created)
                .map(|(id, _)| id.clone())
                .expect("a retained round");
            state.rounds.remove(&oldest);
        }
        state.sequence += 1;
        // The round identity is a lookup handle, not a claim about content, so
        // it is opaque and unpredictable: a caller that could compute the next
        // handle could read a round it never asked for.
        let id = format!(
            "{:016x}",
            RandomState::new()
                .build_hasher()
                .finish()
                .wrapping_add(state.sequence)
        );
        state.rounds.insert(id.clone(), round);
        id
    }

    fn page(
        &self,
        round: &TopicSearchRound,
        id: Option<&str>,
        offset: usize,
        limit: usize,
    ) -> Result<TopicSearchResult, String> {
        // A round that could not be frozen has no continuation, so it publishes
        // one page and claims no further pages.
        let end = if id.is_some() {
            (offset + limit).min(round.results.len())
        } else {
            limit.min(round.results.len())
        };
        let has_more = id.is_some() && end < round.results.len();
        let result = TopicSearchResult {
            results: round.results[offset..end].to_vec(),
            status: if round.issues.is_empty() {
                TopicSearchStatus::Completed
            } else {
                TopicSearchStatus::Limited
            },
            method: TopicSearchMethod::Lexical,
            coverage: round.coverage.clone(),
            issues: round.issues.clone(),
            next_cursor: has_more.then(|| format!("{}:{end}", id.unwrap_or_default())),
            has_more,
            total: round.total,
        };
        if !valid_topic_result(&result) {
            return Err("invalid_search_result".into());
        }
        Ok(result)
    }
}

fn scan_topic(
    query: &LexicalQuery,
    scope: &[String],
    topic_id: &str,
    view: &CanonicalTopicView,
    budget: &mut ScanBudget,
) -> Result<Option<TopicCandidate>, ()> {
    // Coverage is the number of distinct query units the Topic covers across
    // all of its searchable text, so a Topic whose terms are spread over
    // several sections ranks like a Topic that covered them in one field. The
    // kernel owns the unit set, the phrase test, and the ordering.
    let mut covered: BTreeSet<String> = BTreeSet::new();
    let mut priority = usize::MAX;
    let mut matched_sections = Vec::new();
    let mut phrase = false;
    let mut terms = false;
    for section in scope {
        let Some(value) = view.sections.get(section) else {
            continue;
        };
        let mut texts = Vec::new();
        collect_searchable(value, section, &mut texts, budget)?;
        let mut matched = false;
        for text in texts {
            // The kernel declines a source this large, and a field it never
            // searched cannot be reported as a field that does not match.
            if text.len() > MAX_SOURCE_BYTES {
                return Err(());
            }
            covered.extend(query.matched_terms(&text));
            let Some(found) = query.match_text(&text) else {
                continue;
            };
            matched = true;
            match found.phrase {
                true => phrase = true,
                false => terms = true,
            }
        }
        if matched {
            matched_sections.push(section.clone());
            priority = priority.min(field_priority(section));
        }
    }
    if matched_sections.is_empty() {
        return Ok(None);
    }
    let matched = LexicalMatch {
        coverage: covered.len(),
        phrase,
        ranges: Vec::new(),
    };
    let mut match_reasons = Vec::new();
    if terms {
        match_reasons.push("query_terms".to_owned());
    }
    if phrase {
        match_reasons.push("exact_phrase".to_owned());
    }
    Ok(Some(TopicCandidate {
        topic_id: topic_id.to_owned(),
        matched,
        field_priority: priority,
        matched_sections,
        match_reasons,
    }))
}

/// One field-classification rule owned by the Topic search kernel: identity,
/// hash, path, status, and code fields are structural bookkeeping rather than
/// user-facing prose, so they never enter lexical matching. Only the trailing
/// word decides, so `identity` and `validity` stay searchable while
/// `topic_id` and `path_id` do not. Every other string inside a canonical
/// section is searchable text, including user-visible reasons and diagnostics.
fn structural_field(name: &str) -> bool {
    let trailing = name
        .split(|c: char| !c.is_ascii_alphanumeric())
        .flat_map(|word| {
            // `topicId` and `topicID` are the same field as `topic_id`.
            let mut words = Vec::new();
            let mut start = 0;
            for (at, c) in word.char_indices() {
                if at > start && c.is_ascii_uppercase() {
                    words.push(&word[start..at]);
                    start = at;
                }
            }
            words.push(&word[start..]);
            words.into_iter()
        })
        .next_back()
        .map(str::to_ascii_lowercase);
    matches!(
        trailing.as_deref(),
        Some(
            "id" | "ids"
                | "uuid"
                | "guid"
                | "ref"
                | "refs"
                | "version"
                | "operation"
                | "hash"
                | "hashes"
                | "sha256"
                | "checksum"
                | "path"
                | "paths"
                | "file"
                | "files"
                | "filename"
                | "url"
                | "uri"
                | "href"
                | "locator"
                | "status"
                | "state"
                | "phase"
                | "outcome"
                | "code"
                | "codes"
                | "severity"
        )
    )
}

fn collect_searchable(
    value: &Value,
    field: &str,
    out: &mut Vec<String>,
    budget: &mut ScanBudget,
) -> Result<(), ()> {
    match value {
        Value::String(text) => {
            if !structural_field(field) && !text.trim().is_empty() {
                budget.consume(text.len())?;
                out.push(text.clone());
            }
            Ok(())
        }
        Value::Array(items) => {
            for item in items {
                collect_searchable(item, field, out, budget)?;
            }
            Ok(())
        }
        Value::Object(fields) => {
            for (name, field) in fields {
                collect_searchable(field, name, out, budget)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

/// Section scope in canonical order, so ranking, coverage, and request
/// validation all read the one inventory the protocol schema declares.
fn section_scope(requested: Option<&[String]>) -> Vec<String> {
    let canonical = topic_artifact_sections();
    match requested {
        Some(sections) => canonical
            .iter()
            .filter(|section| sections.iter().any(|name| name == *section))
            .cloned()
            .collect(),
        None => canonical.to_vec(),
    }
}

fn field_priority(section: &str) -> usize {
    // The searchable inventory still comes from the Topic artifact schema; this
    // only names the sections a reader treats as leading. Schema order alone is
    // alphabetical, so it would rank `claims` above the Topic definition and
    // make field importance a property of JSON key ordering. Every other
    // section keeps its canonical schema position behind these two.
    match section {
        "topic" => 0,
        "summary" => 1,
        _ => topic_artifact_sections()
            .iter()
            .position(|name| name == section)
            .map(|position| position + 2)
            .unwrap_or(usize::MAX),
    }
}

fn section_coverage(scope: &[String], complete: bool) -> TopicSearchCoverage {
    let status = if complete {
        TopicSearchWorkStatus::Complete
    } else {
        TopicSearchWorkStatus::Limited
    };
    TopicSearchCoverage {
        kind: TopicSearchCoverageKind::Topic,
        sections: scope
            .iter()
            .map(|section| TopicSearchSectionCoverage {
                section: section.clone(),
                status,
            })
            .collect(),
    }
}

fn unavailable(scope: &[String]) -> TopicSearchResult {
    TopicSearchResult {
        results: Vec::new(),
        status: TopicSearchStatus::Unavailable,
        method: TopicSearchMethod::Lexical,
        coverage: TopicSearchCoverage {
            kind: TopicSearchCoverageKind::Topic,
            sections: scope
                .iter()
                .map(|section| TopicSearchSectionCoverage {
                    section: section.clone(),
                    status: TopicSearchWorkStatus::Unavailable,
                })
                .collect(),
        },
        issues: vec![TopicSearchIssue {
            code: TopicSearchIssueCode::SourceUnavailable,
            source_kind: None,
            affected_count: 1,
        }],
        next_cursor: None,
        has_more: false,
        total: None,
    }
}

fn issue_code_for(code: &str) -> TopicSearchIssueCode {
    if code == "canonical_search_budget_exhausted" {
        TopicSearchIssueCode::ScanBudgetExhausted
    } else if code.starts_with("canonical_read_failed") {
        TopicSearchIssueCode::SourceReadFailed
    } else if matches!(
        code,
        "repair_required" | "canonical_store_busy" | "canonical_store_unavailable"
    ) {
        TopicSearchIssueCode::SourceUnavailable
    } else {
        TopicSearchIssueCode::InvalidSource
    }
}

fn add_issue(issues: &mut Vec<TopicSearchIssue>, code: TopicSearchIssueCode) {
    if let Some(issue) = issues.iter_mut().find(|issue| issue.code == code) {
        issue.affected_count = (issue.affected_count + 1).min(MAX_AFFECTED);
    } else if issues.len() < MAX_ISSUES {
        issues.push(TopicSearchIssue {
            code,
            source_kind: None,
            affected_count: 1,
        });
    }
}

fn is_canonical_section(section: &str) -> bool {
    !section.is_empty()
        && section.encode_utf16().count() <= MAX_SECTION_UTF16
        && topic_artifact_sections().iter().any(|name| name == section)
}

fn has_duplicates(values: &[String]) -> bool {
    let mut seen = BTreeSet::new();
    values.iter().any(|value| !seen.insert(value))
}

fn hash(value: &Value) -> String {
    format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(value).unwrap_or_default())
    )
}

/// Strict rebuild of the shared Topic search result, paired with the shared
/// protocol search corpus.
pub fn validate_topic_search_result(value: &Value) -> bool {
    serde_json::from_value::<TopicSearchResult>(value.clone())
        .is_ok_and(|result| valid_topic_result(&result))
}

fn valid_topic_result(result: &TopicSearchResult) -> bool {
    if result.results.len() > MAX_RESULTS
        || result.issues.len() > MAX_ISSUES
        || result.total.is_some_and(|total| total > MAX_TOTAL)
        || result.has_more != result.next_cursor.is_some()
        || result.next_cursor.as_ref().is_some_and(|cursor| {
            cursor.is_empty() || cursor.encode_utf16().count() > MAX_CURSOR_UTF16
        })
        || result.coverage.kind != TopicSearchCoverageKind::Topic
        || result.coverage.sections.is_empty()
        || result.coverage.sections.len() > topic_artifact_sections().len()
        || result
            .coverage
            .sections
            .iter()
            .any(|section| !is_canonical_section(&section.section))
        || has_duplicates(
            &result
                .coverage
                .sections
                .iter()
                .map(|section| section.section.clone())
                .collect::<Vec<_>>(),
        )
        || result
            .issues
            .iter()
            .any(|issue| issue.source_kind.is_some() || issue.affected_count == 0)
    {
        return false;
    }
    let mut identities = BTreeSet::new();
    result.results.iter().all(|found| {
        let unique_identity = !found.topic_id.is_empty()
            && found.topic_id.encode_utf16().count() <= MAX_TOPIC_ID_UTF16
            && identities.insert(found.topic_id.clone());
        let unique_sections = !found.matched_sections.is_empty()
            && found.matched_sections.len() <= topic_artifact_sections().len()
            && found
                .matched_sections
                .iter()
                .all(|section| is_canonical_section(section))
            && !has_duplicates(&found.matched_sections);
        let reasons = !found.match_reasons.is_empty()
            && found.match_reasons.len() <= 2
            && found
                .match_reasons
                .iter()
                .all(|reason| matches!(reason.as_str(), "query_terms" | "exact_phrase"))
            && !has_duplicates(&found.match_reasons);
        unique_identity && unique_sections && reasons
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::{
        CanonicalStorePort, DisabledStructuredArtifact, RepositoryPort, TopicCanonicalPort,
    };
    use std::sync::{Arc, Mutex};
    use synthesis_canonical_store::{
        CanonicalBasis, CanonicalError, CanonicalIdentity, CanonicalStore, CanonicalTopicDraft,
        prepare_topic,
    };
    use synthesis_repository::{Repository, RepositoryIdentity};
    use synthesis_test_support::TestRoot;

    struct Fixture {
        application: TopicApplication,
        store: Arc<Mutex<CanonicalStore>>,
        _root: TestRoot,
    }

    fn fixture(label: &str) -> Fixture {
        let root = TestRoot::new(&format!("synthesis-topic-search-{label}"));
        let repository = Repository::open(
            root.path(),
            RepositoryIdentity {
                profile_id: "profile:search".into(),
                data_root_id: "data:search".into(),
            },
        )
        .expect("repository");
        let store = Arc::new(Mutex::new(
            CanonicalStore::open(
                root.path(),
                CanonicalIdentity {
                    profile_id: "profile:search".into(),
                    data_root_id: "data:search".into(),
                },
            )
            .expect("canonical"),
        ));
        let application = TopicApplication::with_factories(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository)))),
            Arc::new(CanonicalStorePort::new(Arc::clone(&store))),
            Arc::new(DisabledStructuredArtifact),
            Arc::new(|| "2026-10-05T00:00:00.000Z".into()),
            Arc::new(|topic_id| format!("operation:{topic_id}")),
        );
        Fixture {
            application,
            store,
            _root: root,
        }
    }

    fn promote(fixture: &Fixture, topic_id: &str, sections: &[(&str, Value)]) -> CanonicalBasis {
        promote_over(fixture, topic_id, sections, None)
    }

    fn repromote(
        fixture: &Fixture,
        topic_id: &str,
        sections: &[(&str, Value)],
        expected: &CanonicalBasis,
    ) -> CanonicalBasis {
        promote_over(fixture, topic_id, sections, Some(expected.clone()))
    }

    fn promote_over(
        fixture: &Fixture,
        topic_id: &str,
        sections: &[(&str, Value)],
        expected: Option<CanonicalBasis>,
    ) -> CanonicalBasis {
        let sections = sections
            .iter()
            .map(|(name, value)| ((*name).to_owned(), value.clone()))
            .collect::<BTreeMap<_, _>>();
        let manifest = json!({
            "schema":"synthesis.topic_analysis_manifest",
            "schema_version":"3.0.0",
            "topic_id":topic_id,
            "language":"en",
            "sections":sections
                .keys()
                .map(|name| (name.clone(), json!({"path":format!("sections/{name}.json")})))
                .collect::<serde_json::Map<_, _>>(),
        });
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: topic_id.into(),
            manifest,
            artifact: json!({"schema_id":"synthesis.topic_artifact","sections":sections}),
            metadata: json!({
                "schema_id":"synthesis.topic_artifact_metadata",
                "schema_version":"1.0.0",
                "created_at":"2026-10-05T00:00:00.000Z",
                "updated_at":"2026-10-05T00:00:00.000Z",
                "data":{"topic_id":topic_id},
            }),
            sections,
            markdown: BTreeMap::new(),
        })
        .expect("prepare");
        let basis = prepared.view().basis;
        fixture
            .store
            .lock()
            .expect("store")
            .promote_prepared(prepared.for_promotion(expected))
            .expect("promote");
        basis
    }

    fn search(fixture: &Fixture, request: Value) -> Result<TopicSearchResult, String> {
        fixture
            .application
            .search(TopicSearchRequest::from_value(request)?, &|| Ok(()))
    }

    fn searched(fixture: &Fixture, request: Value) -> TopicSearchResult {
        search(fixture, request).expect("search")
    }

    fn wind_ticket() -> Value {
        json!({
            "id":"comparison-matrix-1",
            "title":"Offshore wind",
            "axes":["cost","capacity"],
            "status":"complete",
            "sha256":"sha256:0f1e",
            "path":"sections/comparison_matrix.json",
            "code":"MATRIX",
            "note":"Cost per MWh fell while capacity factor rose."
        })
    }

    #[test]
    fn search_reports_one_result_per_topic_with_its_sections_and_reasons() {
        let fixture = fixture("aggregate");
        promote(
            &fixture,
            "topic:alpha",
            &[
                (
                    "topic",
                    json!({"id":"topic:alpha","title":"Offshore wind","definition":"Cost per MWh fell."}),
                ),
                (
                    "claims",
                    json!([{"id":"c1","text":"Capacity factor rose."}]),
                ),
            ],
        );
        promote(
            &fixture,
            "topic:beta",
            &[("summary", json!({"text":"Unrelated notes."}))],
        );

        let result = searched(
            &fixture,
            json!({"query":"offshore wind", "limit":25, "maxResults":100}),
        );

        assert_eq!(result.status, TopicSearchStatus::Completed);
        assert_eq!(result.method, TopicSearchMethod::Lexical);
        assert_eq!(result.total, Some(1));
        assert_eq!(result.next_cursor, None);
        assert!(!result.has_more);
        assert!(result.issues.is_empty());
        assert_eq!(
            result.coverage.sections.len(),
            topic_artifact_sections().len()
        );
        assert!(
            result
                .coverage
                .sections
                .iter()
                .all(|section| section.status == TopicSearchWorkStatus::Complete)
        );
        let found = &result.results[0];
        assert_eq!(found.topic_id, "topic:alpha");
        assert_eq!(found.matched_sections, vec!["topic"]);
        assert_eq!(found.match_reasons, vec!["exact_phrase"]);
    }

    #[test]
    fn search_aggregates_sections_phrase_and_term_coverage_per_topic() {
        let fixture = fixture("sections");
        promote(
            &fixture,
            "topic:matrix",
            &[
                ("summary", json!({"text":"A capacity study."})),
                ("comparison_matrix", wind_ticket()),
            ],
        );

        let result = searched(
            &fixture,
            json!({"query":"capacity wind", "limit":25, "maxResults":100}),
        );

        assert_eq!(result.results.len(), 1);
        let found = &result.results[0];
        assert_eq!(found.matched_sections, vec!["comparison_matrix", "summary"]);
        assert_eq!(found.match_reasons, vec!["query_terms"]);
    }

    #[test]
    fn search_matches_unicode_case_and_unspaced_scripts() {
        let fixture = fixture("unicode");
        promote(
            &fixture,
            "topic:cafe",
            &[("summary", json!({"text":"CAFÉ ﬁ liability"}))],
        );
        promote(
            &fixture,
            "topic:tokyo",
            &[("summary", json!({"text":"京都東京大学大学院"}))],
        );

        let decomposed = searched(
            &fixture,
            json!({"query":"cafe\u{301} liability", "limit":25, "maxResults":100}),
        );
        assert_eq!(decomposed.results[0].topic_id, "topic:cafe");
        assert_eq!(decomposed.total, Some(1));

        let cjk = searched(
            &fixture,
            json!({"query":"東京大学", "limit":25, "maxResults":100}),
        );
        assert_eq!(cjk.results[0].topic_id, "topic:tokyo");
    }

    #[test]
    fn search_ignores_identity_hash_path_status_and_code_values() {
        let fixture = fixture("fields");
        promote(
            &fixture,
            "topic:structural",
            &[(
                "comparison_matrix",
                json!({"id":"offshore","sha256":"sha256:wind","path":"sections/offshore.json","status":"offshore","code":"offshore"}),
            )],
        );
        promote(
            &fixture,
            "topic:prose",
            &[(
                "summary",
                json!({"text":"offshore wind", "status":"draft", "code":"offshore"}),
            )],
        );

        let result = searched(
            &fixture,
            json!({"query":"offshore wind", "limit":25, "maxResults":100}),
        );

        assert_eq!(result.results.len(), 1);
        assert_eq!(result.results[0].topic_id, "topic:prose");
    }

    #[test]
    fn search_scope_limits_sections_and_rejects_a_non_canonical_name() {
        let fixture = fixture("scope");
        promote(
            &fixture,
            "topic:matrix",
            &[
                ("summary", json!({"text":"capacity note"})),
                ("comparison_matrix", wind_ticket()),
            ],
        );

        let scoped = searched(
            &fixture,
            json!({"query":"cost", "sections":["comparison_matrix"], "limit":25, "maxResults":100}),
        );
        assert_eq!(scoped.results.len(), 1);
        assert_eq!(scoped.coverage.sections.len(), 1);
        assert_eq!(scoped.coverage.sections[0].section, "comparison_matrix");

        assert_eq!(
            search(
                &fixture,
                json!({"query":"cost", "sections":["private_notes"]})
            )
            .unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            search(&fixture, json!({"query":"cost", "sections":[]})).unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            search(
                &fixture,
                json!({"query":"cost", "sections":["claims","claims"]})
            )
            .unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn search_orders_by_coverage_phrase_field_then_identity() {
        let fixture = fixture("ordering");
        promote(
            &fixture,
            "topic:phrase",
            &[("summary", json!({"text":"capacity factor"}))],
        );
        promote(
            &fixture,
            "topic:term",
            &[("summary", json!({"text":"capacity and factor and more"}))],
        );
        promote(
            &fixture,
            "topic:field",
            &[("topic", json!({"title":"capacity factor"}))],
        );

        let result = searched(
            &fixture,
            json!({"query":"capacity factor", "limit":25, "maxResults":100}),
        );
        let order = result
            .results
            .iter()
            .map(|found| found.topic_id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(order, vec!["topic:field", "topic:phrase", "topic:term"]);
    }

    #[test]
    fn field_importance_is_semantic_rather_than_schema_alphabetical() {
        assert!(field_priority("topic") < field_priority("summary"));
        // `claims` sorts before `summary` in the canonical schema, so a plain
        // schema position would outrank the Topic definition.
        assert!(field_priority("summary") < field_priority("claims"));
        assert!(field_priority("claims") < field_priority("taxonomy"));
        assert_eq!(
            topic_artifact_sections()
                .iter()
                .map(|section| field_priority(section))
                .collect::<BTreeSet<_>>()
                .len(),
            topic_artifact_sections().len()
        );
    }

    #[test]
    fn query_unit_coverage_aggregates_across_the_sections_of_one_topic() {
        let fixture = fixture("aggregate-coverage");
        // One term per section: the Topic covers the same query units as a
        // Topic that happened to cover them in a single field.
        promote(
            &fixture,
            "topic:split",
            &[
                ("summary", json!({"text":"capacity only"})),
                ("taxonomy", json!({"name":"factor only"})),
            ],
        );
        promote(
            &fixture,
            "topic:whole",
            &[("statistics", json!({"text":"capacity and factor"}))],
        );

        let result = searched(
            &fixture,
            json!({"query":"capacity factor", "limit":25, "maxResults":100}),
        );
        let order = result
            .results
            .iter()
            .map(|found| found.topic_id.as_str())
            .collect::<Vec<_>>();

        // Equal coverage falls to canonical field importance, and the Topic
        // definition and summary outrank the later schema sections.
        assert_eq!(order, vec!["topic:split", "topic:whole"]);
        assert_eq!(
            result.results[0].matched_sections,
            vec!["summary", "taxonomy"]
        );
        assert_eq!(result.results[0].match_reasons, vec!["query_terms"]);
    }

    #[test]
    fn a_field_too_large_for_the_kernel_reports_a_bounded_scan() {
        let fixture = fixture("oversized-field");
        let huge = "x".repeat(MAX_SOURCE_BYTES + 1);
        promote(
            &fixture,
            "topic:alpha",
            &[("summary", json!({"text":huge}))],
        );

        let result = searched(
            &fixture,
            json!({"query":"wind", "limit":25, "maxResults":100}),
        );

        // The field was never searched, so the round cannot claim a complete
        // scope, an exact total, or a continuation.
        assert!(result.results.is_empty());
        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        assert_eq!(result.next_cursor, None);
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::ScanBudgetExhausted)
        );
    }

    #[test]
    fn search_rejects_out_of_bounds_requests_before_reading() {
        let fixture = fixture("bounds");
        promote(
            &fixture,
            "topic:alpha",
            &[("summary", json!({"text":"wind"}))],
        );
        for request in [
            json!({"query":"  "}),
            json!({"query":"wind","limit":101}),
            json!({"query":"wind","maxResults":501}),
            json!({"query":"wind","limit":25,"maxResults":24}),
            json!({"query":"wind","limit":0}),
            json!({"query":"wind","cursor":""}),
            json!({"query":"wind","score":1}),
            json!({"query":"wind","sections":null}),
        ] {
            assert_eq!(
                search(&fixture, request.clone()).unwrap_err(),
                "invalid_request",
                "{request}"
            );
        }
    }

    #[test]
    fn an_empty_current_root_completes_with_zero_total_and_no_cursor() {
        let fixture = fixture("empty");
        let result = searched(
            &fixture,
            json!({"query":"wind", "limit":25, "maxResults":100}),
        );

        assert_eq!(result.status, TopicSearchStatus::Completed);
        assert_eq!(result.total, Some(0));
        assert!(result.results.is_empty());
        assert!(result.issues.is_empty());
        assert_eq!(result.next_cursor, None);
    }

    #[test]
    fn a_complete_round_continues_its_frozen_ordering() {
        let fixture = fixture("continuation");
        for index in 0..3 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }

        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":2, "maxResults":100}),
        );
        assert_eq!(first.results.len(), 2);
        assert!(first.has_more);
        let cursor = first.next_cursor.clone().expect("continuation cursor");
        assert!(!cursor.contains("topic"));

        let second = searched(
            &fixture,
            json!({"query":"wind", "limit":2, "maxResults":100, "cursor":cursor}),
        );
        assert_eq!(second.results.len(), 1);
        assert!(!second.has_more);
        assert_eq!(second.next_cursor, None);
        let mut ranked = first
            .results
            .iter()
            .map(|found| found.topic_id.clone())
            .collect::<Vec<_>>();
        ranked.extend(second.results.iter().map(|found| found.topic_id.clone()));
        assert_eq!(ranked, vec!["topic:0", "topic:1", "topic:2"]);
    }

    #[test]
    fn a_changed_matching_or_non_matching_topic_fails_the_round() {
        let fixture = fixture("changed-non-match");
        promote(
            &fixture,
            "topic:alpha",
            &[("summary", json!({"text":"wind report"}))],
        );
        promote(
            &fixture,
            "topic:beta",
            &[("summary", json!({"text":"wind second"}))],
        );
        let other = promote(
            &fixture,
            "topic:other",
            &[("summary", json!({"text":"solar report"}))],
        );
        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        assert!(first.has_more);
        let cursor = first.next_cursor.clone().expect("continuation cursor");

        repromote(
            &fixture,
            "topic:other",
            &[("summary", json!({"text":"solar and wind report"}))],
            &other,
        );

        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":cursor})
            )
            .unwrap_err(),
            "search_cursor_stale"
        );
    }

    #[test]
    fn a_membership_change_fails_the_round() {
        let fixture = fixture("membership");
        promote(
            &fixture,
            "topic:alpha",
            &[("summary", json!({"text":"wind one"}))],
        );
        promote(
            &fixture,
            "topic:beta",
            &[("summary", json!({"text":"wind two"}))],
        );
        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        let cursor = first.next_cursor.clone().expect("continuation cursor");

        promote(
            &fixture,
            "topic:gamma",
            &[("summary", json!({"text":"wind three"}))],
        );

        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":cursor})
            )
            .unwrap_err(),
            "search_cursor_stale"
        );
    }

    #[test]
    fn an_expired_or_evicted_round_reports_an_expired_cursor() {
        let fixture = fixture("expiry");
        for index in 0..3 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }
        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        let cursor = first.next_cursor.clone().expect("continuation cursor");
        let (id, _offset) = cursor.rsplit_once(':').expect("round id");
        fixture
            .application
            .search_rounds
            .lock()
            .expect("rounds")
            .rounds
            .get_mut(id)
            .expect("frozen round")
            .created = Instant::now() - CURSOR_LIFETIME - Duration::from_secs(1);

        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":cursor.clone()})
            )
            .unwrap_err(),
            "search_cursor_expired"
        );

        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":"unknown-round:1"})
            )
            .unwrap_err(),
            "search_cursor_expired"
        );
        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":"not-a-cursor"})
            )
            .unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn a_query_change_on_the_same_round_is_stale() {
        let fixture = fixture("rebound");
        for index in 0..3 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }
        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        let cursor = first.next_cursor.clone().expect("continuation cursor");

        assert_eq!(
            search(
                &fixture,
                json!({"query":"solar", "limit":1, "maxResults":100, "cursor":cursor})
            )
            .unwrap_err(),
            "search_cursor_stale"
        );
    }

    #[test]
    fn an_identity_outside_the_result_bound_cannot_prove_no_match() {
        let fixture = fixture("identity-bound");
        promote(
            &fixture,
            &format!("topic:{}", "a".repeat(300)),
            &[("summary", json!({"text":"wind"}))],
        );
        let result = searched(&fixture, json!({"query":"wind"}));
        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        assert!(result.next_cursor.is_none());
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::InvalidSource)
        );
    }

    #[test]
    fn an_unreadable_candidate_reports_a_closed_issue_and_no_cursor() {
        let fixture = fixture("unreadable");
        for index in 0..2 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }
        let first = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        let cursor = first.next_cursor.clone().expect("continuation cursor");
        let broken = fixture
            .store
            .lock()
            .expect("store")
            .root()
            .join("topics")
            .join(synthesis_canonical_store::canonical_topic_path_id("topic:1").expect("path"))
            .join("current/sections/summary.json");
        std::fs::write(broken, b"{}").expect("corrupt section");

        let result = searched(
            &fixture,
            json!({"query":"wind", "limit":1, "maxResults":100}),
        );
        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        assert_eq!(result.next_cursor, None);
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::InvalidSource
                    && issue.source_kind.is_none())
        );
        assert!(
            result
                .coverage
                .sections
                .iter()
                .all(|section| section.status == TopicSearchWorkStatus::Limited)
        );
        assert_eq!(
            search(
                &fixture,
                json!({"query":"wind", "limit":1, "maxResults":100, "cursor":cursor})
            )
            .unwrap_err(),
            "search_cursor_stale"
        );
    }

    #[test]
    fn the_result_cap_reports_limited_without_an_exact_total() {
        let fixture = fixture("cap");
        for index in 0..3 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }

        let result = searched(&fixture, json!({"query":"wind", "limit":1, "maxResults":2}));

        assert_eq!(result.results.len(), 1);
        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        // The basis is still complete, so the caller can page through the
        // matches the cap left out.
        assert!(result.next_cursor.is_some());
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::ResultBudgetExhausted)
        );
    }

    #[test]
    fn an_exhausted_scan_budget_reports_limited_without_a_cursor() {
        let fixture = fixture("budget");
        for index in 0..2 {
            promote(
                &fixture,
                &format!("topic:{index}"),
                &[("summary", json!({"text":format!("wind report {index}")}))],
            );
        }
        let remaining = std::sync::Mutex::new(1);
        let result = fixture
            .application
            .search(
                TopicSearchRequest::from_value(json!({
                    "query":"wind", "limit":1, "maxResults":100
                }))
                .expect("request"),
                &|| {
                    let mut remaining = remaining.lock().expect("budget");
                    *remaining -= 1;
                    if *remaining < 0 {
                        Err("operation_timeout".into())
                    } else {
                        Ok(())
                    }
                },
            )
            .expect("bounded search");

        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        assert_eq!(result.next_cursor, None);
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::ScanBudgetExhausted)
        );
    }

    #[test]
    fn a_candidate_bound_larger_than_the_read_limit_reports_limited() {
        let fixture = fixture("candidate-bound");
        for index in 0..=MAX_SEARCH_CANDIDATES {
            promote(
                &fixture,
                &format!("topic:{index:03}"),
                &[("summary", json!({"text":"wind"}))],
            );
        }

        let result = searched(
            &fixture,
            json!({"query":"wind", "limit":25, "maxResults":100}),
        );

        assert_eq!(result.status, TopicSearchStatus::Limited);
        assert_eq!(result.total, None);
        assert_eq!(result.next_cursor, None);
        assert_eq!(result.results.len(), 25);
        assert!(
            result
                .issues
                .iter()
                .any(|issue| issue.code == TopicSearchIssueCode::ScanBudgetExhausted)
        );
    }

    #[test]
    fn an_unavailable_canonical_owner_reports_no_results() {
        struct UnavailableCanonical(CanonicalStorePort);
        impl TopicCanonicalPort for UnavailableCanonical {
            fn read_topic(
                &self,
                topic_id: &str,
            ) -> Result<synthesis_canonical_store::CanonicalTopicState, CanonicalError>
            {
                self.0.read_topic(topic_id)
            }

            fn search_topics(
                &self,
                _limit: usize,
                _max_bytes: usize,
            ) -> Result<synthesis_canonical_store::CanonicalTopicSearchSnapshot, CanonicalError>
            {
                Err(CanonicalError::from_code("repair_required".into()))
            }

            fn promote(
                &self,
                promotion: synthesis_canonical_store::PreparedCanonicalPromotion,
            ) -> Result<synthesis_canonical_store::CanonicalReceipt, CanonicalError> {
                self.0.promote(promotion)
            }

            fn archive_current(
                &self,
                topic_id: &str,
                deleted_path_id: &str,
            ) -> Result<bool, CanonicalError> {
                self.0.archive_current(topic_id, deleted_path_id)
            }

            fn restore_deleted(
                &self,
                topic_id: &str,
                deleted_path_id: &str,
            ) -> Result<bool, CanonicalError> {
                self.0.restore_deleted(topic_id, deleted_path_id)
            }

            fn purge_deleted(&self, deleted_path_id: &str) -> Result<bool, CanonicalError> {
                self.0.purge_deleted(deleted_path_id)
            }
        }

        let fixture = fixture("unavailable");
        promote(
            &fixture,
            "topic:alpha",
            &[("summary", json!({"text":"wind"}))],
        );
        let canonical = Arc::new(UnavailableCanonical(CanonicalStorePort::new(Arc::clone(
            &fixture.store,
        ))));
        let application = TopicApplication::with_factories(
            Arc::new(RepositoryPort::new(Arc::new(Mutex::new(
                Repository::open(
                    fixture._root.path(),
                    RepositoryIdentity {
                        profile_id: "profile:search".into(),
                        data_root_id: "data:search".into(),
                    },
                )
                .expect("repository"),
            )))),
            canonical,
            Arc::new(DisabledStructuredArtifact),
            Arc::new(|| "2026-10-05T00:00:00.000Z".into()),
            Arc::new(|topic_id| format!("operation:{topic_id}")),
        );

        let result = application
            .search(
                TopicSearchRequest::from_value(json!({"query":"wind"})).expect("request"),
                &|| Ok(()),
            )
            .expect("unavailable search");

        assert_eq!(result.status, TopicSearchStatus::Unavailable);
        assert!(result.results.is_empty());
        assert_eq!(result.total, None);
        assert_eq!(
            result.issues,
            vec![TopicSearchIssue {
                code: TopicSearchIssueCode::SourceUnavailable,
                source_kind: None,
                affected_count: 1
            }]
        );
        assert!(
            result
                .coverage
                .sections
                .iter()
                .all(|section| section.status == TopicSearchWorkStatus::Unavailable)
        );
    }

    #[test]
    fn the_result_dto_rebuilds_the_shared_topic_contract() {
        let covered = json!({
            "results": [{
                "topicId":"topic:energy",
                "matchedSections":["topic","comparison_matrix"],
                "matchReasons":["query_terms","exact_phrase"]
            }],
            "status":"completed",
            "method":"lexical",
            "coverage":{"kind":"topic","sections":[{"section":"comparison_matrix","status":"complete"}]},
            "issues":[],
            "nextCursor":null,
            "hasMore":false,
            "total":1
        });
        assert!(validate_topic_search_result(&covered));

        for rejected in [
            json!({ "results": [], "status": "completed", "method": "lexical",
                "coverage": {"kind":"library","sources":{
                    "metadata":{"status":"complete","sourcesScanned":0},
                    "fulltext":{"status":"not_requested","sourcesScanned":0},
                    "analysis":{"status":"not_requested","sourcesScanned":0}}},
                "issues": [], "nextCursor": null, "hasMore": false, "total": 0 }),
            json!({ "results": [{ "topicId":"topic:energy","matchedSections":[],"matchReasons":["query_terms"] }],
                "status": "completed", "method": "lexical",
                "coverage": {"kind":"topic","sections":[{"section":"topic","status":"complete"}]},
                "issues": [], "nextCursor": null, "hasMore": false, "total": 1 }),
            json!({ "results": [{ "topicId":"topic:energy","matchedSections":["private_notes"],"matchReasons":["query_terms"] }],
                "status": "completed", "method": "lexical",
                "coverage": {"kind":"topic","sections":[{"section":"topic","status":"complete"}]},
                "issues": [], "nextCursor": null, "hasMore": false, "total": 1 }),
            json!({ "results": [{ "topicId":"topic:energy","matchedSections":["topic"],"matchReasons":["query_terms"] }],
                "status": "completed", "method": "vector",
                "coverage": {"kind":"topic","sections":[{"section":"topic","status":"complete"}]},
                "issues": [], "nextCursor": null, "hasMore": false, "total": 1 }),
            json!({ "results": [], "status": "completed", "method": "lexical",
                "coverage": {"kind":"topic","sections":[{"section":"topic","status":"complete"}]},
                "issues": [{"code":"source_read_failed","sourceKind":"metadata","affectedCount":1}],
                "nextCursor": null, "hasMore": false, "total": null }),
            json!({ "results": [], "status": "completed", "method": "lexical",
                "coverage": {"kind":"topic","sections":[{"section":"topic","status":"complete"}]},
                "issues": [], "nextCursor": "abc", "hasMore": false, "total": 0 }),
        ] {
            assert!(!validate_topic_search_result(&rejected), "{rejected}");
        }
    }
}
