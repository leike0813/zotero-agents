use crate::concept_kb::{ConceptKbApplication, ConceptMutationStatus};
use crate::dto::{
    ResolvedTopicPaperSetDto, TopicApplyRequest, TopicApplyResult, TopicApplyStatus,
    TopicContextRequest, TopicContextResult, TopicContextView, TopicDefinitionDto,
    TopicDeleteRequest, TopicDeleteResult, TopicDeleteStatus, TopicDetailRequest,
    TopicDetailResult, TopicDiscoveryHintRequest, TopicDiscoveryHintResult, TopicFindDiagnostics,
    TopicFindRequest, TopicFindResult, TopicFindRow, TopicFreshness, TopicListRequest,
    TopicListResult, TopicProjectionDto, TopicPurgeResult, TopicRecord, TopicReportRequest,
    TopicReportResult, TopicResolverCombine, TopicResolverDto, TopicResolverPaper,
    TopicResolverRequest, TopicResolverResult, TopicSourceMaterialsStatus, TopicWorkflowFilter,
    TopicWorkflowOption, TopicWorkflowOptionsResult,
};
use crate::ports::{
    StructuredArtifactPort, TopicCanonicalPort, TopicLibraryQueryPort, TopicRepositoryPort,
};
use crate::topic_graph::{
    TopicGraphApplication, TopicGraphIngestRequest, TopicGraphMaterializedTopic,
    TopicGraphMutationStatus, TopicGraphProposal, TopicGraphProposalKind,
};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
#[cfg(test)]
use synthesis_canonical_store::CanonicalTopicView;
use synthesis_canonical_store::{
    CanonicalTopicDraft, CanonicalTopicState, LegacyCanonicalTopic, canonical_json_hash,
    canonical_topic_path_id, prepare_topic,
};
use synthesis_protocol::canonical_json;
use synthesis_repository::{
    DeletedTopicArtifactRecord, OperationRecord, ReferenceArtifactRecord,
    TopicApplicationProjectionRecord, TopicApplicationStateRecord,
};

const MAX_ASSETS: usize = 256;
const MAX_ASSET_BYTES: usize = 5 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES: usize = 50 * 1024 * 1024;
const MAX_LIST: usize = 250;
const MAX_RESOLVER_CANDIDATES: usize = 10_000;
const RESOLVER_PAGE_LIMIT: usize = 100;
const TOPIC_SOURCE_ARTIFACT_TYPES: [&str; 3] = ["digest", "references", "citation_analysis"];
const BUNDLE_FIELDS: &[&str] = &[
    "kind",
    "operation",
    "mode",
    "language",
    "base_hashes",
    "create_base_hashes_ignored",
    "topic_id",
    "read_section_hashes",
    "topic_definition",
    "topic_resolver",
    "resolved_paper_set",
    "resolver_manifest_path",
    "artifact_manifest_path",
    "resolver_diagnostics",
    "artifact_metadata",
    "analysis_manifest_path",
    "topic_interest_metadata_path",
    "concept_cards_proposal_path",
    "topic_graph_relation_proposals_path",
    "markdown",
    "markdown_path",
    "timeline",
];

type TextFactory = Arc<dyn Fn(&str) -> String + Send + Sync>;
type Clock = Arc<dyn Fn() -> String + Send + Sync>;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
struct TopicDependencyArtifact {
    status: String,
    hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
struct TopicDependencySnapshot {
    paper_refs: Vec<String>,
    paper_artifacts: BTreeMap<String, BTreeMap<String, TopicDependencyArtifact>>,
    missing_artifacts: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
struct TopicReadinessProjection {
    baseline_input_hash: String,
    baseline_dependencies: Option<TopicDependencySnapshot>,
    current_input_hash: String,
    current_dependencies: Option<TopicDependencySnapshot>,
    baseline_initialized_at: String,
    last_scanned_at: String,
}

#[derive(Clone, Debug)]
struct TopicReadinessView {
    freshness: TopicFreshness,
    source_materials_status: TopicSourceMaterialsStatus,
    source_materials_percent: i64,
    stale_reasons: Vec<String>,
    dirty_reasons: Vec<String>,
    missing_sections: Vec<String>,
}

pub fn project_legacy_canonical_topic(
    legacy: &LegacyCanonicalTopic,
) -> Result<
    (
        TopicApplicationStateRecord,
        TopicApplicationProjectionRecord,
    ),
    String,
> {
    let snapshot = &legacy.snapshot;
    let topic_id = snapshot.topic_id.clone();
    let definition_id = legacy
        .topic_definition
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if definition_id != topic_id {
        return Err("canonical_legacy_topic_sources_mismatch".into());
    }
    let metadata = snapshot
        .metadata
        .get("data")
        .and_then(Value::as_object)
        .ok_or_else(|| "canonical_legacy_topic_sources_invalid".to_owned())?;
    let title = legacy
        .topic_definition
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned();
    let definition = legacy
        .topic_definition
        .get("definition")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned();
    if title.trim().is_empty() {
        return Err("canonical_legacy_topic_sources_invalid".into());
    }
    let timestamp = snapshot
        .metadata
        .get("updated_at")
        .and_then(Value::as_str)
        .or_else(|| metadata.get("updated_at").and_then(Value::as_str))
        .unwrap_or_default()
        .to_owned();
    let created_at = snapshot
        .metadata
        .get("created_at")
        .and_then(Value::as_str)
        .unwrap_or(&timestamp)
        .to_owned();
    let source_paper_refs = snapshot
        .artifact
        .get("source_papers")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|paper| {
            paper
                .get("paper_ref")
                .or_else(|| paper.get("paperRef"))
                .and_then(Value::as_str)
        })
        .filter(|value| !value.trim().is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    let artifact_hash = snapshot.basis.artifact_hash.clone();
    let metadata_hash = snapshot.metadata_hash.clone();
    let topic_resolver = normalize_legacy_topic_resolver(&legacy.topic_resolver)?;
    let state = TopicApplicationStateRecord {
        topic_id: topic_id.clone(),
        path_id: snapshot.path_id.clone(),
        title: title.clone(),
        definition: definition.clone(),
        language: snapshot
            .manifest
            .get("language")
            .and_then(Value::as_str)
            .unwrap_or("auto")
            .to_owned(),
        operation: snapshot
            .manifest
            .get("operation")
            .and_then(Value::as_str)
            .unwrap_or("create")
            .to_owned(),
        manifest_hash: snapshot.basis.manifest_hash.clone(),
        artifact_hash: artifact_hash.clone(),
        metadata_hash,
        bundle_hash: metadata
            .get("bundle_hash")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned(),
        paper_count: source_paper_refs.len() as i64,
        topic_definition_json: canonical_json(&legacy.topic_definition)
            .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?,
        topic_resolver_json: canonical_json(&topic_resolver)
            .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?,
        resolved_paper_set_json: canonical_json(&legacy.resolved_paper_set)
            .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?,
        created_at,
        updated_at: timestamp.clone(),
    };
    let projection = TopicApplicationProjectionRecord {
        topic_id: topic_id.clone(),
        topic_graph_json: canonical_json(&json!({
            "topic":{
                "topic_id":topic_id,
                "title":title,
                "definition":definition,
                "artifact_hash":artifact_hash,
            },
            "relations":{},
        }))
        .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?,
        concepts_json: "{}".into(),
        interest_metadata_json: "{}".into(),
        discovery_json: canonical_json(&json!({"source_paper_refs":source_paper_refs}))
            .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?,
        updated_at: timestamp,
    };
    Ok((state, projection))
}

fn normalize_legacy_topic_resolver(resolver: &Value) -> Result<Value, String> {
    let resolver = resolver
        .as_object()
        .ok_or_else(|| "canonical_legacy_topic_sources_invalid".to_owned())?;
    let strings = |value: Option<&Value>| -> Result<Vec<String>, String> {
        match value {
            None => Ok(Vec::new()),
            Some(Value::String(value)) if !value.trim().is_empty() => Ok(vec![value.clone()]),
            Some(Value::Array(values)) => values
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .filter(|value| !value.trim().is_empty())
                        .map(str::to_owned)
                        .ok_or_else(|| "canonical_legacy_topic_sources_invalid".to_owned())
                })
                .collect(),
            _ => Err("canonical_legacy_topic_sources_invalid".into()),
        }
    };
    let tag = match resolver.get("tag") {
        None => None,
        Some(Value::String(_)) | Some(Value::Array(_)) => {
            Some(json!({"or": strings(resolver.get("tag"))?}))
        }
        Some(Value::Object(value)) => {
            let mut normalized = Map::new();
            for field in ["and", "or", "not"] {
                if value.contains_key(field) {
                    normalized.insert(field.into(), json!(strings(value.get(field))?));
                }
            }
            Some(Value::Object(normalized))
        }
        _ => return Err("canonical_legacy_topic_sources_invalid".into()),
    };
    let combine = match resolver.get("combine").and_then(Value::as_str) {
        None | Some("union") => "union",
        Some("intersection") => "intersection",
        _ => return Err("canonical_legacy_topic_sources_invalid".into()),
    };
    let mut normalized = json!({
        "paper_refs": strings(resolver.get("paper_refs"))?,
        "collection_key": strings(resolver.get("collection_key"))?,
        "combine": combine,
    });
    if let Some(tag) = tag {
        normalized
            .as_object_mut()
            .expect("resolver is an object")
            .insert("tag".into(), tag);
    }
    serde_json::from_value::<TopicResolverDto>(normalized.clone())
        .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?;
    Ok(normalized)
}

pub struct TopicApplication {
    repository: Arc<dyn TopicRepositoryPort>,
    canonical: Arc<dyn TopicCanonicalPort>,
    engine: Arc<dyn StructuredArtifactPort>,
    now: Clock,
    operation_id: TextFactory,
    topic_graph: Option<Arc<TopicGraphApplication>>,
    concept_kb: Option<Arc<ConceptKbApplication>>,
    accepting: AtomicBool,
    active: Mutex<usize>,
    drained: Condvar,
}

struct ActiveApply<'a>(&'a TopicApplication);

impl Drop for ActiveApply<'_> {
    fn drop(&mut self) {
        if let Ok(mut active) = self.0.active.lock() {
            *active = active.saturating_sub(1);
            self.0.drained.notify_all();
        }
    }
}

impl TopicApplication {
    pub fn new(
        repository: Arc<dyn TopicRepositoryPort>,
        canonical: Arc<dyn TopicCanonicalPort>,
        engine: Arc<dyn StructuredArtifactPort>,
    ) -> Self {
        let sequence = Arc::new(AtomicU64::new(0));
        let operation_sequence = Arc::clone(&sequence);
        Self::with_factories(
            repository,
            canonical,
            engine,
            Arc::new(synthesis_protocol::utc_now_iso8601),
            Arc::new(move |topic_id| {
                format!(
                    "topic-apply-{}-{}",
                    canonical_topic_path_id(topic_id).unwrap_or_else(|_| "invalid".into()),
                    operation_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    pub fn with_factories(
        repository: Arc<dyn TopicRepositoryPort>,
        canonical: Arc<dyn TopicCanonicalPort>,
        engine: Arc<dyn StructuredArtifactPort>,
        now: Clock,
        operation_id: TextFactory,
    ) -> Self {
        Self {
            repository,
            canonical,
            engine,
            now,
            operation_id,
            topic_graph: None,
            concept_kb: None,
            accepting: AtomicBool::new(true),
            active: Mutex::new(0),
            drained: Condvar::new(),
        }
    }

    pub fn with_topic_graph(mut self, topic_graph: Arc<TopicGraphApplication>) -> Self {
        self.topic_graph = Some(topic_graph);
        self
    }

    pub fn with_concept_kb(mut self, concept_kb: Arc<ConceptKbApplication>) -> Self {
        self.concept_kb = Some(concept_kb);
        self
    }

    fn project_rows(
        &self,
        rows: Vec<(
            TopicApplicationStateRecord,
            Option<TopicApplicationProjectionRecord>,
        )>,
    ) -> Result<Vec<TopicRecord>, String> {
        let mut paper_refs = rows
            .iter()
            .flat_map(|(state, _)| {
                serde_json::from_str::<Value>(&state.resolved_paper_set_json)
                    .ok()
                    .map(|value| resolved_paper_refs(&value))
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>();
        paper_refs.sort();
        paper_refs.dedup();
        let artifacts = self
            .repository
            .list_reference_artifacts(&paper_refs)
            .unwrap_or_default();
        rows.into_iter()
            .map(|(state, projection)| project_record(state, projection, &artifacts))
            .collect()
    }

    pub fn list(&self, request: TopicListRequest) -> Result<TopicListResult, String> {
        if request.limit == 0 || request.limit > MAX_LIST {
            return Err("invalid_request".into());
        }
        let offset = if request.cursor.is_empty() {
            0
        } else {
            request
                .cursor
                .parse::<usize>()
                .map_err(|_| "invalid_request".to_owned())?
        };
        let (rows, total) = self.repository.list_records(offset, request.limit)?;
        let returned = rows.len();
        let next = offset.saturating_add(returned);
        let topics = self.project_rows(rows)?;
        Ok(TopicListResult {
            topics,
            cursor: request.cursor,
            next_cursor: if next < total {
                next.to_string()
            } else {
                String::new()
            },
            has_more: next < total,
            returned,
            total,
            limit: request.limit,
        })
    }

    pub fn detail(&self, request: TopicDetailRequest) -> Result<TopicDetailResult, String> {
        validate_topic_id(&request.topic_id)?;
        let state = self.repository.get_state(&request.topic_id)?;
        let current = self
            .canonical
            .read_topic(&request.topic_id)
            .map_err(|error| error.code().to_owned())?;
        match (state, current) {
            (None, _) | (_, CanonicalTopicState::Absent { .. }) => Ok(TopicDetailResult::Absent {
                topic_id: request.topic_id,
                diagnostics: Vec::new(),
            }),
            (_, CanonicalTopicState::Invalid { diagnostics, .. }) => {
                Ok(TopicDetailResult::Invalid {
                    topic_id: request.topic_id,
                    diagnostics,
                })
            }
            (Some(state), CanonicalTopicState::Ready(snapshot)) => {
                let projection = self.repository.get_projection(&request.topic_id)?;
                let paper_refs = serde_json::from_str::<Value>(&state.resolved_paper_set_json)
                    .ok()
                    .map(|value| resolved_paper_refs(&value))
                    .unwrap_or_default();
                let artifacts = self
                    .repository
                    .list_reference_artifacts(&paper_refs)
                    .unwrap_or_default();
                Ok(TopicDetailResult::Ready {
                    topic_id: request.topic_id,
                    topic: Box::new(project_record(state, projection, &artifacts)?),
                    snapshot: Box::new(snapshot),
                })
            }
        }
    }

    pub fn find_by_paper_refs(&self, request: TopicFindRequest) -> Result<TopicFindResult, String> {
        let mut paper_refs = request
            .paper_refs
            .into_iter()
            .map(|paper_ref| paper_ref.trim().to_owned())
            .filter(|paper_ref| !paper_ref.is_empty())
            .collect::<Vec<_>>();
        paper_refs.sort();
        paper_refs.dedup();
        if paper_refs.is_empty() || paper_refs.len() > 100 {
            return Ok(TopicFindResult {
                ok: false,
                status: "invalid_request".into(),
                topics: Vec::new(),
                diagnostics: TopicFindDiagnostics {
                    requested_count: paper_refs.len(),
                    matched_topic_count: 0,
                    unmatched_paper_refs: paper_refs.clone(),
                    source: "artifact_state".into(),
                    errors: vec!["paper_ref or paper_refs is required".into()],
                },
                paper_refs,
            });
        }
        let (rows, _) = self
            .repository
            .find_records_by_paper_refs(&paper_refs, MAX_LIST)?;
        let requested = paper_refs.iter().cloned().collect::<HashSet<_>>();
        let mut matched_refs = HashSet::new();
        let mut topics = self
            .project_rows(rows)?
            .into_iter()
            .filter_map(|topic| {
                let mut matched = topic
                    .resolved_paper_set
                    .papers
                    .iter()
                    .map(|paper| paper.paper_ref.clone())
                    .filter(|paper_ref| requested.contains(paper_ref))
                    .collect::<Vec<_>>();
                matched.sort();
                matched.dedup();
                if matched.is_empty() {
                    return None;
                }
                matched_refs.extend(matched.iter().cloned());
                Some(TopicFindRow {
                    topic_id: topic.topic_id,
                    title: topic.title,
                    status: topic.operation,
                    updated_at: topic.updated_at,
                    matched_paper_refs: matched,
                    match_sources: vec!["current_dependencies".into()],
                    freshness: topic.projection.freshness,
                    source_materials_status: topic.projection.source_materials_status,
                })
            })
            .collect::<Vec<_>>();
        topics.sort_by(|left, right| {
            left.title
                .to_lowercase()
                .cmp(&right.title.to_lowercase())
                .then_with(|| left.topic_id.cmp(&right.topic_id))
        });
        let unmatched = paper_refs
            .iter()
            .filter(|paper_ref| !matched_refs.contains(*paper_ref))
            .cloned()
            .collect::<Vec<_>>();
        Ok(TopicFindResult {
            ok: true,
            status: "ok".into(),
            diagnostics: TopicFindDiagnostics {
                requested_count: paper_refs.len(),
                matched_topic_count: topics.len(),
                unmatched_paper_refs: unmatched,
                source: "artifact_state".into(),
                errors: Vec::new(),
            },
            paper_refs,
            topics,
        })
    }

    pub fn workflow_options(
        &self,
        filter: TopicWorkflowFilter,
    ) -> Result<TopicWorkflowOptionsResult, String> {
        let (rows, _) = self.repository.list_workflow_option_records(MAX_LIST)?;
        let mut options = self
            .project_rows(rows)?
            .into_iter()
            .filter(|topic| {
                filter == TopicWorkflowFilter::All
                    || !topic
                        .projection
                        .recommended_update
                        .as_ref()
                        .is_some_and(|update| update.blocked)
            })
            .map(|topic| {
                let title = if topic.title.trim().is_empty() {
                    topic.topic_id.clone()
                } else {
                    topic.title.clone()
                };
                match filter {
                    TopicWorkflowFilter::All => TopicWorkflowOption {
                        value: topic.topic_id.clone(),
                        label: title.clone(),
                        description: [
                            (!topic.operation.is_empty())
                                .then(|| format!("status {}", topic.operation)),
                            (!topic.updated_at.is_empty())
                                .then(|| format!("updated {}", topic.updated_at)),
                            Some(topic.topic_id.clone()),
                        ]
                        .into_iter()
                        .flatten()
                        .collect::<Vec<_>>()
                        .join(" · "),
                        meta: json!({
                            "kind":"synthesis.topic",
                            "topicId":topic.topic_id,
                            "title":title,
                            "status":topic.operation,
                            "updatedAt":topic.updated_at,
                        }),
                    },
                    TopicWorkflowFilter::Updatable => {
                        let update = topic.projection.recommended_update.as_ref();
                        let action = update.map_or("Update", |update| update.action_label.as_str());
                        let freshness = update.map_or_else(
                            || topic.projection.freshness.as_str(),
                            |update| update.freshness.as_str(),
                        );
                        let source_status = update.map_or_else(
                            || topic.projection.source_materials_status.as_str(),
                            |update| update.source_materials_status.as_str(),
                        );
                        TopicWorkflowOption {
                            value: topic.topic_id.clone(),
                            label: title.clone(),
                            description: format!(
                                "{action} · freshness {freshness} · source materials {source_status} · {}",
                                topic.topic_id
                            ),
                            meta: json!({
                                "kind":"synthesis.topic",
                                "topicId":topic.topic_id,
                                "title":title,
                                "actionLabel":action,
                                "freshness":freshness,
                                "sourceMaterialsStatus":source_status,
                            }),
                        }
                    }
                }
            })
            .collect::<Vec<_>>();
        options.sort_by(|left, right| {
            left.label
                .to_lowercase()
                .cmp(&right.label.to_lowercase())
                .then_with(|| left.value.cmp(&right.value))
        });
        Ok(TopicWorkflowOptionsResult {
            options,
            diagnostics: Vec::new(),
        })
    }

    pub fn context(&self, request: TopicContextRequest) -> Result<TopicContextResult, String> {
        let topic_id = request.topic_id.clone();
        let result = match self.detail(TopicDetailRequest {
            topic_id: topic_id.clone(),
        })? {
            TopicDetailResult::Absent { diagnostics, .. } => json!({
                "schema_id":"synthesis.topic_context",
                "schema_version":"2.0.0",
                "topic_id":topic_id,
                "status":"not_found",
                "diagnostics":diagnostics,
            }),
            TopicDetailResult::Invalid { diagnostics, .. } => json!({
                "schema_id":"synthesis.topic_context",
                "schema_version":"2.0.0",
                "topic_id":topic_id,
                "status":"invalid",
                "diagnostics":diagnostics,
            }),
            TopicDetailResult::Ready {
                topic, snapshot, ..
            } => {
                let digest = json!({
                    "topic_id":topic.topic_id,
                    "title":topic.title,
                    "definition":topic.definition,
                    "language":topic.language,
                    "markdown":snapshot.markdown,
                });
                let semantic = json!({
                    "topic_definition":topic.topic_definition,
                    "topic_resolver":topic.topic_resolver,
                    "resolved_paper_set":topic.resolved_paper_set,
                });
                let audit = json!({
                    "manifest":snapshot.manifest,
                    "metadata":snapshot.metadata,
                    "artifact":snapshot.artifact,
                    "projection":topic.projection,
                });
                match request.view {
                    TopicContextView::Digest => json!({
                        "schema_id":"synthesis.topic_context","schema_version":"2.0.0",
                        "topic_id":topic_id,"view":"digest","digest":digest,
                    }),
                    TopicContextView::Semantic => json!({
                        "schema_id":"synthesis.topic_context","schema_version":"2.0.0",
                        "topic_id":topic_id,"view":"semantic","semantic":semantic,
                    }),
                    TopicContextView::Audit => json!({
                        "schema_id":"synthesis.topic_context","schema_version":"2.0.0",
                        "topic_id":topic_id,"view":"audit","audit":audit,
                    }),
                    TopicContextView::Full => json!({
                        "schema_id":"synthesis.topic_context","schema_version":"2.0.0",
                        "topic_id":topic_id,"view":"full","digest":digest,"semantic":semantic,"audit":audit,
                    }),
                }
            }
        };
        Ok(TopicContextResult(result))
    }

    pub fn report(&self, request: TopicReportRequest) -> Result<TopicReportResult, String> {
        let topic_id = request.topic_id;
        let TopicDetailResult::Ready {
            topic, snapshot, ..
        } = self.detail(TopicDetailRequest {
            topic_id: topic_id.clone(),
        })?
        else {
            return Ok(TopicReportResult {
                ok: false,
                status: "not_found".into(),
                topic_id,
                title: String::new(),
                format: "markdown".into(),
                markdown: String::new(),
                source: None,
                metadata: None,
                diagnostics: vec!["topic_report_unavailable".into()],
            });
        };
        let report = snapshot
            .artifact
            .get("synthesis_report")
            .or_else(|| snapshot.artifact.get("synthesisReport"))
            .and_then(Value::as_object);
        let markdown = report
            .and_then(|value| value.get("body").or_else(|| value.get("markdown")))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned();
        let available = !markdown.is_empty();
        Ok(TopicReportResult {
            ok: available,
            status: if available {
                "available"
            } else {
                "unavailable"
            }
            .into(),
            topic_id: topic.topic_id.clone(),
            title: report
                .and_then(|value| value.get("title"))
                .and_then(Value::as_str)
                .unwrap_or(&topic.title)
                .to_owned(),
            format: "markdown".into(),
            markdown,
            source: Some(json!({
                "path":format!("topics/{}/current/artifact.json", topic.path_id),
                "field":"synthesis_report.body",
                "ssot":"runtime.synthesis_report.body",
            })),
            metadata: Some(json!({
                "language":topic.language,
                "updated_at":topic.updated_at,
                "artifact_hash":topic.artifact_hash,
                "manifest_hash":topic.manifest_hash,
                "metadata_hash":topic.metadata_hash,
            })),
            diagnostics: if available {
                Vec::new()
            } else {
                vec!["synthesis_report_body_unavailable".into()]
            },
        })
    }

    pub fn resolve(
        &self,
        library: &dyn TopicLibraryQueryPort,
        request: TopicResolverRequest,
    ) -> Result<TopicResolverResult, String> {
        if request.limit == 0 || request.limit > MAX_LIST {
            return Err("invalid_request".into());
        }
        let requires_scan = request.tag.is_some() || !request.collection_keys.is_empty();
        let items = if requires_scan {
            collect_library_candidates(library)?
        } else {
            library.get_items_by_ref(&request.paper_refs)?.items
        };
        let collection_keys = request
            .collection_keys
            .iter()
            .map(|value| value.to_lowercase())
            .collect::<HashSet<_>>();
        let paper_refs = request.paper_refs.iter().cloned().collect::<HashSet<_>>();
        let selector_count = usize::from(request.tag.is_some())
            + usize::from(!collection_keys.is_empty())
            + usize::from(!paper_refs.is_empty());
        let mut papers = items
            .iter()
            .filter_map(|item| {
                let mut reasons = Vec::new();
                if request
                    .tag
                    .as_ref()
                    .is_some_and(|query| tag_query_matches(&item.tags, query))
                {
                    reasons.push("tag".into());
                }
                if !collection_keys.is_empty()
                    && item
                        .collections
                        .iter()
                        .any(|value| collection_keys.contains(&value.to_lowercase()))
                {
                    reasons.push("collection_key".into());
                }
                if paper_refs.contains(&item.paper_ref) {
                    reasons.push("paper_refs".into());
                }
                let matched = match request.combine {
                    TopicResolverCombine::Union => !reasons.is_empty(),
                    TopicResolverCombine::Intersection => reasons.len() == selector_count,
                };
                matched.then(|| {
                    reasons.sort();
                    TopicResolverPaper {
                        paper_ref: item.paper_ref.clone(),
                        item_key: item.item_key.clone(),
                        title: item.title.clone(),
                        year: item.year.clone(),
                        match_reasons: reasons,
                    }
                })
            })
            .collect::<Vec<_>>();
        papers.sort_by(|left, right| left.paper_ref.cmp(&right.paper_ref));
        let total = papers.len();
        if request.cursor > total {
            return Err("invalid_request".into());
        }
        let end = total.min(request.cursor.saturating_add(request.limit));
        let page = papers[request.cursor..end].to_vec();
        let has_more = end < total;
        Ok(TopicResolverResult {
            ok: total > 0,
            errors: if total == 0 {
                vec!["resolver matched no papers".into()]
            } else {
                Vec::new()
            },
            papers: page,
            normalized_resolver: request.normalized,
            cursor: request.cursor.to_string(),
            next_cursor: if has_more {
                end.to_string()
            } else {
                String::new()
            },
            has_more,
            returned: end - request.cursor,
            total,
            limit: request.limit,
            diagnostics: json!({
                "final_count":total,
                "total_candidates":items.len(),
                "rejected":false,
            }),
        })
    }

    pub fn update_discovery_hint(
        &self,
        request: TopicDiscoveryHintRequest,
    ) -> Result<TopicDiscoveryHintResult, String> {
        if request.hint_id.trim().is_empty()
            || !matches!(request.status.as_str(), "open" | "rejected")
        {
            return Err("invalid_request".into());
        }
        let status = request.status;
        let hint =
            self.repository
                .update_discovery_hint(&request.hint_id, &status, &(self.now)())?;
        Ok(TopicDiscoveryHintResult {
            ok: true,
            status: if hint.is_some() {
                status
            } else {
                "not_found".into()
            },
            hint,
            diagnostics: Vec::new(),
        })
    }

    pub fn list_deleted(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String> {
        if limit == 0 || limit > MAX_LIST {
            return Err("invalid_request".into());
        }
        self.repository.list_deleted(offset, limit)
    }

    pub fn delete(&self, request: TopicDeleteRequest) -> Result<TopicDeleteResult, String> {
        validate_topic_id(&request.topic_id)?;
        let state = self.repository.get_state(&request.topic_id)?;
        let previous = self.repository.get_deleted(&request.topic_id)?;
        let Some(state) = state else {
            return Ok(match previous {
                Some(previous) => TopicDeleteResult {
                    ok: true,
                    status: TopicDeleteStatus::Deleted,
                    topic_id: request.topic_id,
                    deleted_path_id: previous.deleted_path_id,
                    reason: String::new(),
                    warnings: Vec::new(),
                },
                None => TopicDeleteResult {
                    ok: false,
                    status: TopicDeleteStatus::NotFound,
                    topic_id: request.topic_id,
                    deleted_path_id: String::new(),
                    reason: "topic artifact not found".into(),
                    warnings: Vec::new(),
                },
            });
        };
        if previous.is_some() {
            return Err("topic_deleted_artifact_exists".into());
        }
        let deleted_at = (self.now)();
        let deleted_path_id = deleted_path_id(&request.topic_id, &deleted_at)?;
        if !self
            .canonical
            .archive_current(&request.topic_id, &deleted_path_id)
            .map_err(|error| error.code().to_owned())?
        {
            return Err("topic_current_missing".into());
        }
        let deleted = DeletedTopicArtifactRecord {
            topic_id: request.topic_id.clone(),
            path_id: state.path_id,
            deleted_path_id: deleted_path_id.clone(),
            title: state.title,
            manifest_hash: state.manifest_hash,
            artifact_hash: state.artifact_hash,
            metadata_hash: state.metadata_hash,
            bundle_hash: state.bundle_hash,
            updated_at: state.updated_at,
            deleted_at,
        };
        if let Err(error) = self.repository.soft_delete(&deleted) {
            return match self
                .canonical
                .restore_deleted(&request.topic_id, &deleted_path_id)
            {
                Ok(true) => Err(error),
                _ => Err("repair_required".into()),
            };
        }
        let mut warnings = Vec::new();
        if let Some(topic_graph) = &self.topic_graph
            && topic_graph
                .mark_deleted_topic(&request.topic_id, &deleted_path_id)
                .is_err()
        {
            warnings.push("topic_graph_delete_mark_failed".into());
        }
        Ok(TopicDeleteResult {
            ok: true,
            status: TopicDeleteStatus::Deleted,
            topic_id: request.topic_id,
            deleted_path_id,
            reason: String::new(),
            warnings,
        })
    }

    pub fn purge_deleted(&self) -> Result<TopicPurgeResult, String> {
        let mut records = Vec::new();
        let mut offset = 0;
        loop {
            let (page, total) = self.repository.list_deleted(offset, MAX_LIST)?;
            offset += page.len();
            records.extend(page);
            if offset >= total {
                break;
            }
        }
        for record in &records {
            self.canonical
                .purge_deleted(&record.deleted_path_id)
                .map_err(|error| error.code().to_owned())?;
        }
        let purged_count = self.repository.purge_deleted(&records)?;
        let mut warnings = Vec::new();
        if !records.is_empty()
            && let Some(topic_graph) = &self.topic_graph
            && topic_graph
                .purge_deleted_topics(
                    &records
                        .iter()
                        .map(|record| record.topic_id.clone())
                        .collect::<Vec<_>>(),
                )
                .is_err()
        {
            warnings.push("topic_graph_relations_purge_failed".into());
        }
        Ok(TopicPurgeResult {
            ok: true,
            status: "purged".into(),
            purged_count,
            warnings,
        })
    }

    pub fn apply(&self, request: TopicApplyRequest) -> TopicApplyResult {
        if !self.accepting.load(Ordering::Acquire) {
            return TopicApplyResult::failed(
                TopicApplyStatus::RepairRequired,
                String::new(),
                String::new(),
            );
        }
        let mut active = match self.active.lock() {
            Ok(active) => active,
            Err(_) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::RepairRequired,
                    String::new(),
                    String::new(),
                );
            }
        };
        if !self.accepting.load(Ordering::Acquire) {
            return TopicApplyResult::failed(
                TopicApplyStatus::RepairRequired,
                String::new(),
                String::new(),
            );
        }
        *active += 1;
        drop(active);
        let _active = ActiveApply(self);
        self.apply_admitted(request)
    }

    pub fn stop_admission(&self) {
        self.accepting.store(false, Ordering::Release);
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        let active = self
            .active
            .lock()
            .map_err(|_| "topic_drain_failed".to_owned())?;
        let (active, wait) = self
            .drained
            .wait_timeout_while(active, timeout, |active| *active > 0)
            .map_err(|_| "topic_drain_failed".to_owned())?;
        if *active > 0 || wait.timed_out() {
            Err("topic_drain_timeout".into())
        } else {
            Ok(())
        }
    }

    fn apply_admitted(&self, request: TopicApplyRequest) -> TopicApplyResult {
        let rejected_topic_id = rejected_request_topic_id(&request);
        let parsed = match ParsedApply::rebuild(request) {
            Ok(parsed) => parsed,
            Err(_) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::InvalidRequest,
                    rejected_topic_id,
                    String::new(),
                );
            }
        };
        let topic_id = parsed.topic_id.clone();
        let operation_id = (self.operation_id)(&topic_id);
        let started = (self.now)();
        if self
            .repository
            .upsert_operation(&OperationRecord {
                operation_id: operation_id.clone(),
                operation_type: "topic_apply".into(),
                scope_kind: "topic".into(),
                scope_ref: topic_id.clone(),
                status: "running".into(),
                phase: "validation".into(),
                label: format!("Apply Topic {topic_id}"),
                progress_mode: "determinate".into(),
                total_count: 4,
                created_at: started.clone(),
                started_at: started.clone(),
                updated_at: started.clone(),
                ..OperationRecord::default()
            })
            .is_err()
        {
            return TopicApplyResult::failed(
                TopicApplyStatus::InvalidRequest,
                topic_id,
                operation_id,
            );
        }
        let result = self.apply_after_receipt(&parsed, &operation_id);
        if result.ok {
            return result;
        }
        let phase = apply_status_phase(result.status);
        let _ =
            self.repository
                .update_operation(&operation_id, "failed", phase, &[], &(self.now)());
        result
    }

    fn apply_after_receipt(&self, parsed: &ParsedApply, operation_id: &str) -> TopicApplyResult {
        let current = match self.canonical.read_topic(&parsed.topic_id) {
            Ok(current) => current,
            Err(error) => {
                return failed_from_error(error.code().to_owned(), &parsed.topic_id, operation_id);
            }
        };
        match (&parsed.operation, &current) {
            (TopicOperation::Create, CanonicalTopicState::Absent { .. }) => {}
            (TopicOperation::Create, _) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicExists,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            (_, CanonicalTopicState::Absent { .. }) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicMissing,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            (_, CanonicalTopicState::Invalid { .. }) => {
                return TopicApplyResult::failed(
                    TopicApplyStatus::RepairRequired,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            }
            _ => {}
        }
        let current_hashes = match &current {
            CanonicalTopicState::Ready(snapshot) => {
                Some((snapshot.basis.clone(), snapshot.metadata_hash.clone()))
            }
            _ => None,
        };
        if parsed.operation == TopicOperation::UpdateFull {
            let Some((basis, metadata_hash)) = &current_hashes else {
                return TopicApplyResult::failed(
                    TopicApplyStatus::TopicMissing,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
            };
            let current = BTreeMap::from([
                ("manifest", basis.manifest_hash.as_str()),
                ("artifact", basis.artifact_hash.as_str()),
                ("metadata", metadata_hash.as_str()),
            ]);
            let mismatches = ["artifact", "manifest", "metadata"]
                .into_iter()
                .filter_map(|name| {
                    let base = parsed.base_hashes.get(name)?;
                    let actual = current.get(name).copied().unwrap_or_default();
                    (base != actual).then(|| json!({"name":name,"base":base,"current":actual}))
                })
                .collect::<Vec<_>>();
            if !mismatches.is_empty() {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::Conflict,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.mismatches = mismatches;
                return result;
            }
        }
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "assembly",
            &[],
            &(self.now)(),
        );
        let candidate = match self.build_candidate(parsed, &current) {
            Ok(candidate) => candidate,
            Err(CandidateError::Patch(mismatches)) => {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::PatchConflict,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.mismatches = mismatches;
                return result;
            }
            Err(CandidateError::Code(_code)) => {
                let mut result = TopicApplyResult::failed(
                    TopicApplyStatus::InvalidRequest,
                    parsed.topic_id.clone(),
                    operation_id.into(),
                );
                result.warnings.push("topic_apply_invalid".into());
                return result;
            }
        };
        let timestamp = (self.now)();
        let created_at = match &current {
            CanonicalTopicState::Ready(snapshot) => snapshot.metadata["created_at"]
                .as_str()
                .filter(|value| !value.is_empty())
                .unwrap_or(&timestamp)
                .to_owned(),
            _ => timestamp.clone(),
        };
        let metadata = json!({
            "schema_id":"synthesis.topic_artifact_metadata",
            "schema_version":"1.0.0",
            "created_at":created_at,
            "updated_at":timestamp,
            "data":{
                "topic_id":parsed.topic_id,
                "title":parsed.title,
                "definition":parsed.definition,
                "language":parsed.language,
                "operation":parsed.operation.as_str(),
                "artifact_metadata":parsed.artifact_metadata,
            }
        });
        let prepared = match prepare_topic(CanonicalTopicDraft {
            topic_id: parsed.topic_id.clone(),
            manifest: candidate.manifest,
            artifact: candidate.artifact,
            metadata,
            sections: candidate.sections,
            markdown: BTreeMap::new(),
        }) {
            Ok(prepared) => prepared,
            Err(error) => {
                return failed_from_error(error.code().to_owned(), &parsed.topic_id, operation_id);
            }
        };
        let snapshot = prepared.view();
        let manifest_hash = snapshot.basis.manifest_hash.clone();
        let artifact_hash = snapshot.basis.artifact_hash.clone();
        let metadata_hash = snapshot.metadata_hash.clone();
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "promotion",
            &[],
            &(self.now)(),
        );
        let expected_basis = match &current {
            CanonicalTopicState::Ready(snapshot) => Some(snapshot.basis.clone()),
            _ => None,
        };
        if let Err(error) = self
            .canonical
            .promote(prepared.for_promotion(expected_basis))
        {
            return failed_from_error(error.code().to_owned(), &parsed.topic_id, operation_id);
        }
        let mut warnings = Vec::new();
        let _ = self.repository.update_operation(
            operation_id,
            "running",
            "projection",
            &[],
            &(self.now)(),
        );
        let inherited_state = if parsed.operation == TopicOperation::UpdatePatch {
            self.repository.get_state(&parsed.topic_id).ok().flatten()
        } else {
            None
        };
        let topic_resolver_json = if parsed.topic_resolver == json!({}) {
            inherited_state
                .as_ref()
                .map(|state| state.topic_resolver_json.clone())
                .unwrap_or_else(|| "{}".into())
        } else {
            canonical_json(&parsed.topic_resolver).unwrap_or_else(|_| "{}".into())
        };
        let resolved_paper_set_json = if parsed.resolved_paper_set == json!({}) {
            inherited_state
                .as_ref()
                .map(|state| state.resolved_paper_set_json.clone())
                .unwrap_or_else(|| "{}".into())
        } else {
            canonical_json(&parsed.resolved_paper_set).unwrap_or_else(|_| "{}".into())
        };
        let topic_definition_json = if parsed.topic_definition == json!({}) {
            snapshot
                .artifact
                .get("topic")
                .filter(|topic| {
                    topic
                        .get("id")
                        .and_then(Value::as_str)
                        .is_some_and(|id| !id.is_empty())
                })
                .and_then(|topic| canonical_json(topic).ok())
                .or_else(|| {
                    inherited_state
                        .as_ref()
                        .map(|state| state.topic_definition_json.clone())
                })
                .unwrap_or_else(|| {
                    canonical_json(&json!({
                        "id": parsed.topic_id,
                        "title": parsed.title,
                        "definition": parsed.definition,
                    }))
                    .unwrap_or_else(|_| "{}".into())
                })
        } else {
            canonical_json(&parsed.topic_definition).unwrap_or_else(|_| "{}".into())
        };
        let state = TopicApplicationStateRecord {
            topic_id: parsed.topic_id.clone(),
            path_id: snapshot.path_id.clone(),
            title: parsed.title.clone(),
            definition: parsed.definition.clone(),
            language: parsed.language.clone(),
            operation: parsed.operation.as_str().into(),
            manifest_hash: manifest_hash.clone(),
            artifact_hash: artifact_hash.clone(),
            metadata_hash: metadata_hash.clone(),
            bundle_hash: canonical_json_hash(&parsed.bundle).unwrap_or_default(),
            paper_count: snapshot.artifact["source_papers"]
                .as_array()
                .map(|rows| rows.len() as i64)
                .unwrap_or_default(),
            topic_definition_json,
            topic_resolver_json,
            resolved_paper_set_json,
            created_at,
            updated_at: timestamp.clone(),
        };
        let source_paper_refs = snapshot.artifact["source_papers"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|paper| paper["paper_ref"].as_str())
            .filter(|paper_ref| !paper_ref.trim().is_empty())
            .map(str::to_owned)
            .collect::<Vec<_>>();
        let mut dependency_records = topic_artifact_dependency_records(&snapshot.artifact);
        if let Ok(records) = self.repository.list_reference_artifacts(&source_paper_refs) {
            let mut by_key = dependency_records
                .into_iter()
                .map(|record| {
                    (
                        (record.paper_ref.clone(), record.artifact_type.clone()),
                        record,
                    )
                })
                .collect::<BTreeMap<_, _>>();
            for record in records {
                by_key.insert(
                    (record.paper_ref.clone(), record.artifact_type.clone()),
                    record,
                );
            }
            dependency_records = by_key.into_values().collect();
        }
        let dependency_snapshot =
            topic_dependency_snapshot(&source_paper_refs, &dependency_records);
        let dependency_hash = topic_dependency_hash(&dependency_snapshot);
        let readiness = TopicReadinessProjection {
            baseline_input_hash: dependency_hash.clone(),
            baseline_dependencies: Some(dependency_snapshot.clone()),
            current_input_hash: dependency_hash,
            current_dependencies: Some(dependency_snapshot),
            baseline_initialized_at: timestamp.clone(),
            last_scanned_at: timestamp.clone(),
        };
        let projection = TopicApplicationProjectionRecord {
            topic_id: parsed.topic_id.clone(),
            topic_graph_json: canonical_json(&json!({
                "topic":{
                    "topic_id":parsed.topic_id,
                    "title":parsed.title,
                    "definition":parsed.definition,
                    "artifact_hash":artifact_hash,
                },
                "relations":parsed.relations.as_ref().cloned().unwrap_or_else(|| json!({})),
            }))
            .unwrap_or_else(|_| "{}".into()),
            concepts_json: canonical_json(
                &parsed
                    .concepts
                    .as_ref()
                    .cloned()
                    .unwrap_or_else(|| json!({})),
            )
            .unwrap_or_else(|_| "{}".into()),
            interest_metadata_json: canonical_json(
                &parsed
                    .interest
                    .as_ref()
                    .cloned()
                    .unwrap_or_else(|| json!({})),
            )
            .unwrap_or_else(|_| "{}".into()),
            discovery_json: canonical_json(&json!({
                "source_paper_refs":source_paper_refs,
                "readiness":readiness,
            }))
            .unwrap_or_else(|_| "{}".into()),
            updated_at: timestamp.clone(),
        };
        let topic_projection_persisted = self.repository.upsert_state(&state).is_ok()
            && self.repository.upsert_projection(&projection).is_ok();
        if !topic_projection_persisted {
            warnings.push("topic_projection_failed".into());
        }
        if topic_projection_persisted && let Some(topic_graph) = &self.topic_graph {
            let graph_result =
                topic_graph.upsert_materialized_topic(&TopicGraphMaterializedTopic {
                    topic_id: parsed.topic_id.clone(),
                    title: parsed.title.clone(),
                    definition: parsed.definition.clone(),
                    current_artifact_path: format!(
                        "topics/{}/current/artifact.json",
                        snapshot.path_id
                    ),
                    paper_count: state.paper_count,
                    synthesized_at: timestamp.clone(),
                });
            if !matches!(
                graph_result.status,
                TopicGraphMutationStatus::Committed | TopicGraphMutationStatus::Unchanged
            ) {
                warnings.push("topic_graph_projection_failed".into());
            } else if let (Some(manifest_hash), Some(relations)) =
                (graph_result.manifest_hash, parsed.relations.as_ref())
                && let Some(request) =
                    topic_graph_ingest_request(&parsed.topic_id, &manifest_hash, relations)
                && !matches!(
                    topic_graph.ingest_proposals(&request).status,
                    TopicGraphMutationStatus::Committed | TopicGraphMutationStatus::Unchanged
                )
            {
                warnings.push("topic_graph_projection_failed".into());
            }
        }
        if topic_projection_persisted
            && let (Some(concept_kb), Some(concepts)) = (&self.concept_kb, &parsed.concepts)
            && !matches!(
                concept_kb
                    .ingest_topic_sidecar(&parsed.topic_id, &snapshot.path_id, concepts)
                    .status,
                ConceptMutationStatus::Committed | ConceptMutationStatus::Unchanged
            )
        {
            warnings.push("concept_cards_proposal_failed".into());
        }
        if self
            .repository
            .update_operation(
                operation_id,
                "completed",
                "completed",
                &warnings,
                &(self.now)(),
            )
            .is_err()
        {
            warnings.push("topic_operation_receipt_failed".into());
        }
        TopicApplyResult {
            ok: true,
            status: TopicApplyStatus::Persisted,
            topic_id: parsed.topic_id.clone(),
            operation_id: operation_id.into(),
            hashes: BTreeMap::from([
                ("manifest".into(), manifest_hash),
                ("artifact".into(), artifact_hash),
                ("metadata".into(), metadata_hash),
            ]),
            mismatches: Vec::new(),
            warnings,
        }
    }

    fn build_candidate(
        &self,
        parsed: &ParsedApply,
        current: &CanonicalTopicState,
    ) -> Result<Candidate, CandidateError> {
        if parsed.operation == TopicOperation::UpdatePatch {
            let CanonicalTopicState::Ready(snapshot) = current else {
                return Err(CandidateError::Code("topic_missing".into()));
            };
            let changed = read_manifest_sections(
                parsed.manifest["patch"]["sections"].as_object(),
                &parsed.assets,
            )
            .map_err(CandidateError::Code)?;
            let patched = self
                .engine
                .apply_section_patch(snapshot, &parsed.manifest, &changed)
                .map_err(CandidateError::Code)?;
            if !patched.mismatches.is_empty() {
                return Err(CandidateError::Patch(patched.mismatches));
            }
            let sections = patched.sections;
            let mut manifest = snapshot.manifest.as_object().cloned().unwrap_or_default();
            manifest.insert("operation".into(), json!("update_patch"));
            manifest.insert("language".into(), json!(parsed.language));
            manifest.insert(
                "sections".into(),
                Value::Object(
                    sections
                        .keys()
                        .map(|name| {
                            (
                                name.clone(),
                                json!({"path":format!("current/sections/{name}.json")}),
                            )
                        })
                        .collect(),
                ),
            );
            let manifest = Value::Object(manifest);
            let artifact = self
                .engine
                .assemble_artifact(&manifest, &sections)
                .map_err(CandidateError::Code)?;
            self.engine
                .validate_artifact(&artifact, &parsed.language)
                .map_err(CandidateError::Code)?;
            return Ok(Candidate {
                manifest,
                artifact,
                sections,
            });
        }
        self.engine
            .validate_manifest(&parsed.manifest)
            .map_err(CandidateError::Code)?;
        let sections =
            read_manifest_sections(parsed.manifest["sections"].as_object(), &parsed.assets)
                .map_err(CandidateError::Code)?;
        let artifact = self
            .engine
            .assemble_artifact(&parsed.manifest, &sections)
            .map_err(CandidateError::Code)?;
        self.engine
            .validate_artifact(&artifact, &parsed.language)
            .map_err(CandidateError::Code)?;
        Ok(Candidate {
            manifest: parsed.manifest.clone(),
            artifact,
            sections,
        })
    }
}

fn rejected_request_topic_id(request: &TopicApplyRequest) -> String {
    if materialize_assets(&request.assets).is_err() {
        return String::new();
    }
    let Some(bundle) = request.bundle.as_object() else {
        return String::new();
    };
    if bundle
        .keys()
        .any(|key| !BUNDLE_FIELDS.contains(&key.as_str()))
        || bundle.get("kind").and_then(Value::as_str) != Some("topic_synthesis")
    {
        return String::new();
    }
    let definition_id = bundle
        .get("topic_definition")
        .and_then(Value::as_object)
        .and_then(|definition| definition.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let bundle_id = bundle
        .get("topic_id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let topic_id = if definition_id.is_empty() {
        bundle_id
    } else {
        definition_id
    };
    if validate_topic_id(topic_id).is_ok() {
        topic_id.to_owned()
    } else {
        String::new()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum TopicOperation {
    Create,
    UpdateFull,
    UpdatePatch,
}

impl TopicOperation {
    fn as_str(self) -> &'static str {
        match self {
            Self::Create => "create",
            Self::UpdateFull => "update_full",
            Self::UpdatePatch => "update_patch",
        }
    }
}

struct ParsedApply {
    bundle: Value,
    operation: TopicOperation,
    topic_id: String,
    title: String,
    definition: String,
    language: String,
    base_hashes: BTreeMap<String, String>,
    topic_definition: Value,
    topic_resolver: Value,
    resolved_paper_set: Value,
    artifact_metadata: Value,
    manifest: Value,
    assets: BTreeMap<String, Value>,
    interest: Option<Value>,
    concepts: Option<Value>,
    relations: Option<Value>,
}

impl ParsedApply {
    fn rebuild(request: TopicApplyRequest) -> Result<Self, String> {
        let bundle = request
            .bundle
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        if bundle
            .keys()
            .any(|key| !BUNDLE_FIELDS.contains(&key.as_str()))
            || bundle.get("kind").and_then(Value::as_str) != Some("topic_synthesis")
        {
            return Err("invalid_request".into());
        }
        let operation = match bundle.get("operation").and_then(Value::as_str) {
            Some("create") => TopicOperation::Create,
            Some("update_full") => TopicOperation::UpdateFull,
            Some("update_patch") => TopicOperation::UpdatePatch,
            _ => return Err("invalid_request".into()),
        };
        let language = nonempty_string(bundle.get("language"), 4096)?;
        if bundle
            .get("markdown")
            .and_then(Value::as_str)
            .is_some_and(|value| !value.trim().is_empty())
            || bundle
                .get("markdown_path")
                .and_then(Value::as_str)
                .is_some_and(|value| !value.trim().is_empty())
        {
            return Err("invalid_request".into());
        }
        let definition = bundle
            .get("topic_definition")
            .and_then(Value::as_object)
            .cloned()
            .unwrap_or_default();
        let definition_id = definition
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let bundle_id = bundle
            .get("topic_id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let topic_id = if definition_id.is_empty() {
            bundle_id
        } else {
            definition_id
        };
        validate_topic_id(topic_id)?;
        if !bundle_id.is_empty() && bundle_id != topic_id {
            return Err("invalid_request".into());
        }
        if operation != TopicOperation::UpdatePatch && definition_id.is_empty() {
            return Err("invalid_request".into());
        }
        let assets = materialize_assets(&request.assets)?;
        let artifact_manifest = read_artifact_manifest(bundle, &assets)?;
        let manifest_id = if let Some(id) = bundle
            .get("analysis_manifest_path")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
        {
            id.to_owned()
        } else {
            manifest_locator(artifact_manifest, &["topic_analysis", "analysis_manifest"])
                .ok_or_else(|| "invalid_request".to_owned())?
        };
        let manifest = assets
            .get(&manifest_id)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let manifest_object = manifest
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let entries = if operation == TopicOperation::UpdatePatch {
            manifest_object
                .get("patch")
                .and_then(Value::as_object)
                .and_then(|patch| patch.get("sections"))
                .and_then(Value::as_object)
        } else {
            manifest_object.get("sections").and_then(Value::as_object)
        };
        let _ = read_manifest_sections(entries, &assets)?;
        let base_hashes = bundle
            .get("base_hashes")
            .and_then(Value::as_object)
            .map(|hashes| {
                hashes
                    .iter()
                    .filter_map(|(key, value)| {
                        value.as_str().map(|value| (key.clone(), value.into()))
                    })
                    .collect::<BTreeMap<_, _>>()
            })
            .unwrap_or_default();
        if operation == TopicOperation::UpdateFull
            && ["artifact", "manifest", "metadata"]
                .iter()
                .any(|name| base_hashes.get(*name).is_none_or(String::is_empty))
        {
            return Err("invalid_request".into());
        }
        let resolver = read_resolver(bundle, &assets, operation != TopicOperation::UpdatePatch)?;
        let topic_definition = Value::Object(definition.clone());
        let title = definition
            .get("title")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(topic_id)
            .trim()
            .to_owned();
        let definition_text = definition
            .get("definition")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_owned();
        let interest = read_optional_sidecar(
            bundle.get("topic_interest_metadata_path"),
            artifact_manifest,
            &manifest,
            "topic_interest_metadata",
            &assets,
        )?;
        let concepts = read_optional_sidecar(
            bundle.get("concept_cards_proposal_path"),
            artifact_manifest,
            &manifest,
            "concept_cards_proposal",
            &assets,
        )?;
        let relations = read_optional_sidecar(
            bundle.get("topic_graph_relation_proposals_path"),
            artifact_manifest,
            &manifest,
            "topic_graph_relation_proposals",
            &assets,
        )?;
        Ok(Self {
            bundle: Value::Object(bundle.clone()),
            operation,
            topic_id: topic_id.into(),
            title,
            definition: definition_text,
            language,
            base_hashes,
            topic_definition,
            topic_resolver: resolver.0,
            resolved_paper_set: resolver.1,
            artifact_metadata: bundle
                .get("artifact_metadata")
                .filter(|value| value.is_object())
                .cloned()
                .unwrap_or_else(|| json!({})),
            manifest,
            assets,
            interest,
            concepts,
            relations,
        })
    }
}

fn read_artifact_manifest<'a>(
    bundle: &Map<String, Value>,
    assets: &'a BTreeMap<String, Value>,
) -> Result<Option<&'a Map<String, Value>>, String> {
    bundle
        .get("artifact_manifest_path")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .map(|id| {
            assets
                .get(id)
                .and_then(Value::as_object)
                .ok_or_else(|| "invalid_request".to_owned())
        })
        .transpose()
}

struct Candidate {
    manifest: Value,
    artifact: Value,
    sections: BTreeMap<String, Value>,
}

enum CandidateError {
    Code(String),
    Patch(Vec<Value>),
}

fn validate_topic_id(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.trim() != value
        || value.len() > 512
        || value.contains(['/', '\\'])
        || matches!(value, "." | "..")
        || value.chars().any(char::is_control)
    {
        Err("invalid_request".into())
    } else {
        Ok(())
    }
}

fn deleted_path_id(topic_id: &str, deleted_at: &str) -> Result<String, String> {
    if synthesis_protocol::unix_millis_from_utc_iso8601(deleted_at).is_none() {
        return Err("invalid_request".into());
    }
    let suffix = deleted_at
        .chars()
        .filter(char::is_ascii_alphanumeric)
        .take(14)
        .collect::<String>();
    Ok(format!("{}-{suffix}", canonical_topic_path_id(topic_id)?))
}

fn nonempty_string(value: Option<&Value>, max: usize) -> Result<String, String> {
    value
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty() && value.len() <= max)
        .map(|value| value.trim().to_owned())
        .ok_or_else(|| "invalid_request".into())
}

fn valid_asset_id(value: &str) -> bool {
    !value.is_empty()
        && value.trim() == value
        && value.len() <= 256
        && !value.starts_with('/')
        && !value.contains('\\')
        && !value.contains("://")
        && !value
            .split('/')
            .any(|segment| segment.is_empty() || segment == "..")
}

fn materialize_assets(
    assets: &[crate::dto::TopicAsset],
) -> Result<BTreeMap<String, Value>, String> {
    if assets.len() > MAX_ASSETS {
        return Err("invalid_request".into());
    }
    let mut seen = BTreeSet::new();
    let mut total = 0usize;
    let mut values = BTreeMap::new();
    for asset in assets {
        if !valid_asset_id(&asset.id)
            || !seen.insert(asset.id.clone())
            || !matches!(
                asset.media_type.as_str(),
                "application/json" | "text/markdown" | "text/plain"
            )
        {
            return Err("invalid_request".into());
        }
        let bytes = asset.text.len();
        total = total.saturating_add(bytes);
        if bytes > MAX_ASSET_BYTES || total > MAX_TOTAL_ASSET_BYTES {
            return Err("invalid_request".into());
        }
        if asset.media_type == "application/json" {
            let value =
                serde_json::from_str(&asset.text).map_err(|_| "invalid_request".to_owned())?;
            values.insert(asset.id.clone(), value);
        }
    }
    Ok(values)
}

fn read_manifest_sections(
    entries: Option<&Map<String, Value>>,
    assets: &BTreeMap<String, Value>,
) -> Result<BTreeMap<String, Value>, String> {
    let mut sections = BTreeMap::new();
    for (name, entry) in entries.into_iter().flatten() {
        let path = entry
            .as_object()
            .and_then(|entry| entry.get("path"))
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let value = assets
            .get(path)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        sections.insert(name.clone(), value);
    }
    Ok(sections)
}

fn manifest_locator(manifest: Option<&Map<String, Value>>, keys: &[&str]) -> Option<String> {
    let manifest = manifest?;
    keys.iter().find_map(|key| {
        manifest
            .get(*key)
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    })
}

fn read_resolver(
    bundle: &Map<String, Value>,
    assets: &BTreeMap<String, Value>,
    required: bool,
) -> Result<(Value, Value), String> {
    if let (Some(topic_resolver), Some(resolved_paper_set)) = (
        bundle.get("topic_resolver"),
        bundle.get("resolved_paper_set"),
    ) && topic_resolver.is_object()
        && resolved_paper_set["papers"].as_array().is_some()
    {
        return Ok((topic_resolver.clone(), resolved_paper_set.clone()));
    }
    let id = if let Some(id) = bundle
        .get("resolver_manifest_path")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
    {
        Some(id.to_owned())
    } else {
        manifest_locator(
            read_artifact_manifest(bundle, assets)?,
            &["resolver_manifest", "resolver"],
        )
    };
    let Some(id) = id else {
        return if required {
            Err("invalid_request".into())
        } else {
            Ok((json!({}), json!({})))
        };
    };
    let resolver = assets
        .get(&id)
        .and_then(Value::as_object)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let resolved = resolver
        .get("resolved_paper_set")
        .or_else(|| resolver.get("resolution_result"))
        .filter(|value| value["papers"].as_array().is_some())
        .cloned()
        .ok_or_else(|| "invalid_request".to_owned())?;
    Ok((
        resolver
            .get("topic_resolver")
            .or_else(|| resolver.get("resolver"))
            .filter(|value| value.is_object())
            .cloned()
            .unwrap_or_else(|| json!({})),
        resolved,
    ))
}

fn read_optional_sidecar(
    bundle_locator: Option<&Value>,
    artifact_manifest: Option<&Map<String, Value>>,
    analysis_manifest: &Value,
    sidecar_key: &str,
    assets: &BTreeMap<String, Value>,
) -> Result<Option<Value>, String> {
    let artifact_key = format!("{sidecar_key}_sidecar");
    let locator = bundle_locator
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .or_else(|| {
            analysis_manifest
                .get("sidecars")
                .and_then(|sidecars| sidecars.get(sidecar_key))
                .and_then(|sidecar| sidecar.get("path"))
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
        })
        .or_else(|| {
            artifact_manifest
                .and_then(|manifest| manifest.get(&artifact_key))
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
        });
    let Some(locator) = locator else {
        return Ok(None);
    };
    assets
        .get(locator)
        .filter(|value| value.is_object())
        .cloned()
        .map(Some)
        .ok_or_else(|| "invalid_request".to_owned())
}

fn parse_object(text: &str) -> Result<Value, String> {
    let value: Value = serde_json::from_str(text).map_err(|_| "repository_topic_json_invalid")?;
    if value.is_object() {
        Ok(value)
    } else {
        Err("repository_topic_json_invalid".into())
    }
}

fn parse_topic_dto<T: DeserializeOwned>(value: Value, field: &str) -> Result<T, String> {
    serde_json::from_value(value).map_err(|_| format!("repository_topic_{field}_invalid"))
}

fn resolved_paper_refs(value: &Value) -> Vec<String> {
    value
        .get("papers")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|paper| {
            paper
                .get("paper_ref")
                .or_else(|| paper.get("paperRef"))
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .collect()
}

fn resolver_strings(value: &Value) -> Vec<String> {
    match value {
        Value::String(value) => vec![value.to_owned()],
        Value::Array(values) => values
            .iter()
            .filter_map(Value::as_str)
            .map(str::to_owned)
            .collect(),
        _ => Vec::new(),
    }
}

fn tag_query_matches(item_tags: &[String], query: &Value) -> bool {
    let tags = item_tags
        .iter()
        .map(|value| value.to_lowercase())
        .collect::<HashSet<_>>();
    let contains = |value: &str| tags.contains(&value.to_lowercase());
    match query {
        Value::String(value) => contains(value),
        Value::Array(_) => resolver_strings(query).iter().all(|value| contains(value)),
        Value::Object(object) => {
            let and_values = object.get("and").map(resolver_strings).unwrap_or_default();
            let or_values = object.get("or").map(resolver_strings).unwrap_or_default();
            let not_values = object.get("not").map(resolver_strings).unwrap_or_default();
            and_values.iter().all(|value| contains(value))
                && (or_values.is_empty() || or_values.iter().any(|value| contains(value)))
                && !not_values.iter().any(|value| contains(value))
        }
        _ => false,
    }
}

fn collect_library_candidates(
    library: &dyn TopicLibraryQueryPort,
) -> Result<Vec<crate::dto::TopicLibraryItem>, String> {
    let mut cursor = String::new();
    let mut seen = HashSet::new();
    let mut items = Vec::new();
    loop {
        let page = library.list_items_page(&cursor, RESOLVER_PAGE_LIMIT)?;
        if page.cursor != cursor
            || !seen.insert(page.cursor.clone())
            || (page.has_more && (page.next_cursor.is_empty() || page.next_cursor == cursor))
            || (!page.has_more && !page.next_cursor.is_empty())
        {
            return Err("topic_library_page_invalid".into());
        }
        items.extend(page.items);
        if items.len() > MAX_RESOLVER_CANDIDATES {
            return Err("resolver_candidate_limit_exceeded".into());
        }
        if !page.has_more {
            items.sort_by(|left, right| left.paper_ref.cmp(&right.paper_ref));
            items.dedup_by(|left, right| left.paper_ref == right.paper_ref);
            return Ok(items);
        }
        cursor = page.next_cursor;
    }
}

fn topic_dependency_snapshot(
    paper_refs: &[String],
    artifacts: &[ReferenceArtifactRecord],
) -> TopicDependencySnapshot {
    let mut refs = paper_refs
        .iter()
        .map(|paper_ref| paper_ref.trim().to_owned())
        .filter(|paper_ref| !paper_ref.is_empty())
        .collect::<Vec<_>>();
    refs.sort();
    refs.dedup();
    let by_key = artifacts
        .iter()
        .filter(|artifact| {
            refs.binary_search(&artifact.paper_ref).is_ok()
                && TOPIC_SOURCE_ARTIFACT_TYPES.contains(&artifact.artifact_type.as_str())
        })
        .map(|artifact| {
            (
                (artifact.paper_ref.clone(), artifact.artifact_type.clone()),
                artifact,
            )
        })
        .collect::<BTreeMap<_, _>>();
    let mut paper_artifacts = BTreeMap::new();
    let mut missing_artifacts = Vec::new();
    for paper_ref in &refs {
        let mut dependencies = BTreeMap::new();
        for artifact_type in TOPIC_SOURCE_ARTIFACT_TYPES {
            let record = by_key.get(&(paper_ref.clone(), artifact_type.to_owned()));
            let dependency = TopicDependencyArtifact {
                status: record
                    .map(|record| record.status.clone())
                    .unwrap_or_else(|| "missing".into()),
                hash: record
                    .map(|record| record.payload_hash.clone())
                    .unwrap_or_default(),
            };
            if dependency.status != "available" {
                missing_artifacts.push(format!("{paper_ref}:{artifact_type}"));
            }
            dependencies.insert(artifact_type.into(), dependency);
        }
        paper_artifacts.insert(paper_ref.clone(), dependencies);
    }
    TopicDependencySnapshot {
        paper_refs: refs,
        paper_artifacts,
        missing_artifacts,
    }
}

fn topic_dependency_hash(snapshot: &TopicDependencySnapshot) -> String {
    serde_json::to_value(snapshot)
        .ok()
        .and_then(|value| canonical_json_hash(&value).ok())
        .unwrap_or_default()
}

fn source_materials_status(snapshot: &TopicDependencySnapshot) -> TopicSourceMaterialsStatus {
    if snapshot.paper_refs.is_empty() {
        return TopicSourceMaterialsStatus::Missing;
    }
    let total = snapshot.paper_refs.len() * TOPIC_SOURCE_ARTIFACT_TYPES.len();
    if snapshot.missing_artifacts.is_empty() {
        TopicSourceMaterialsStatus::Complete
    } else if snapshot.missing_artifacts.len() >= total {
        TopicSourceMaterialsStatus::Missing
    } else {
        TopicSourceMaterialsStatus::Partial
    }
}

fn source_materials_percent(snapshot: &TopicDependencySnapshot) -> i64 {
    if snapshot.paper_refs.is_empty() {
        return 0;
    }
    let missing_refs = snapshot
        .missing_artifacts
        .iter()
        .filter_map(|entry| entry.rsplit_once(':').map(|(paper_ref, _)| paper_ref))
        .collect::<HashSet<_>>();
    let complete = snapshot
        .paper_refs
        .iter()
        .filter(|paper_ref| !missing_refs.contains(paper_ref.as_str()))
        .count();
    ((complete * 100) / snapshot.paper_refs.len()) as i64
}

fn stored_topic_readiness(projection: &Value) -> Option<TopicReadinessProjection> {
    projection
        .get("discovery")
        .and_then(|discovery| discovery.get("readiness"))
        .cloned()
        .and_then(|value| serde_json::from_value(value).ok())
}

fn topic_readiness_view(
    state: &TopicApplicationStateRecord,
    projection: &Value,
    artifacts: &[ReferenceArtifactRecord],
) -> TopicReadinessView {
    let paper_refs = serde_json::from_str::<Value>(&state.resolved_paper_set_json)
        .ok()
        .map(|value| resolved_paper_refs(&value))
        .unwrap_or_default();
    let stored = stored_topic_readiness(projection);
    let current = if artifacts.is_empty() {
        stored
            .as_ref()
            .and_then(|readiness| readiness.current_dependencies.clone())
            .or_else(|| {
                stored
                    .as_ref()
                    .and_then(|readiness| readiness.baseline_dependencies.clone())
            })
            .unwrap_or_else(|| topic_dependency_snapshot(&paper_refs, artifacts))
    } else {
        topic_dependency_snapshot(&paper_refs, artifacts)
    };
    let current_hash = topic_dependency_hash(&current);
    let status = source_materials_status(&current);
    let percent = source_materials_percent(&current);
    let mut stale_reasons = Vec::new();
    let mut dirty_reasons = Vec::new();
    let freshness = match stored.as_ref().and_then(|readiness| {
        (!readiness.baseline_input_hash.is_empty()).then_some(&readiness.baseline_input_hash)
    }) {
        Some(baseline_hash) if baseline_hash == &current_hash => TopicFreshness::Fresh,
        Some(_) => {
            stale_reasons.push("topic_dependencies_changed".into());
            TopicFreshness::Stale
        }
        None if matches!(status, TopicSourceMaterialsStatus::Complete) => TopicFreshness::Fresh,
        None => {
            dirty_reasons.push("readiness_baseline_missing".into());
            TopicFreshness::Dirty
        }
    };
    TopicReadinessView {
        freshness,
        source_materials_status: status,
        source_materials_percent: percent,
        stale_reasons,
        dirty_reasons,
        missing_sections: current.missing_artifacts.clone(),
    }
}

fn topic_artifact_dependency_records(artifact: &Value) -> Vec<ReferenceArtifactRecord> {
    artifact
        .get("source_artifacts")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let paper_ref = entry.get("paper_ref")?.as_str()?.trim();
            let artifact_type = entry.get("artifact_type")?.as_str()?.trim();
            if paper_ref.is_empty() || !TOPIC_SOURCE_ARTIFACT_TYPES.contains(&artifact_type) {
                return None;
            }
            Some(ReferenceArtifactRecord {
                paper_ref: paper_ref.into(),
                artifact_type: artifact_type.into(),
                payload_type: entry
                    .get("payload_type")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .into(),
                status: entry
                    .get("status")
                    .and_then(Value::as_str)
                    .unwrap_or("missing")
                    .into(),
                locator: entry
                    .get("path")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .into(),
                payload_hash: entry
                    .get("hash")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .into(),
                diagnostics_json: "[]".into(),
                updated_at: entry
                    .get("updated_at")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .into(),
            })
        })
        .collect()
}

fn topic_graph_proposal_kind(value: &str) -> Option<TopicGraphProposalKind> {
    match value {
        "target_is_broader_topic_candidate" => {
            Some(TopicGraphProposalKind::TargetIsBroaderTopicCandidate)
        }
        "target_is_narrower_topic_candidate" => {
            Some(TopicGraphProposalKind::TargetIsNarrowerTopicCandidate)
        }
        "overlap_topic_candidate" => Some(TopicGraphProposalKind::OverlapTopicCandidate),
        "contrast_topic_candidate" => Some(TopicGraphProposalKind::ContrastTopicCandidate),
        "related_topic_candidate" => Some(TopicGraphProposalKind::RelatedTopicCandidate),
        _ => None,
    }
}

fn topic_graph_ingest_request(
    source_topic_id: &str,
    expected_manifest_hash: &str,
    relations: &Value,
) -> Option<TopicGraphIngestRequest> {
    let proposals = relations
        .get("proposals")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|proposal| {
            let proposal_type = proposal
                .get("type")
                .or_else(|| proposal.get("relation_type"))
                .and_then(Value::as_str)
                .and_then(topic_graph_proposal_kind)?;
            let target_topic_id = proposal
                .get("target_topic_id")
                .or_else(|| proposal.get("targetTopicId"))
                .and_then(Value::as_str)?
                .trim()
                .to_owned();
            if target_topic_id.is_empty() {
                return None;
            }
            let provenance = proposal
                .get("provenance")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_else(|| {
                    proposal
                        .get("rationale")
                        .and_then(Value::as_str)
                        .filter(|value| !value.trim().is_empty())
                        .map(|rationale| vec![json!({"rationale":rationale})])
                        .unwrap_or_default()
                });
            let evidence_refs = proposal
                .get("evidence_refs")
                .or_else(|| proposal.get("source_paper_refs"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            Some(TopicGraphProposal {
                proposal_type,
                target_topic_id,
                target_title: proposal
                    .get("target_title")
                    .or_else(|| proposal.get("target_topic_title"))
                    .or_else(|| proposal.get("targetTitle"))
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                confidence: proposal.get("confidence").and_then(Value::as_f64),
                provenance,
                evidence_refs,
            })
        })
        .collect::<Vec<_>>();
    (!proposals.is_empty()).then(|| TopicGraphIngestRequest {
        expected_manifest_hash: expected_manifest_hash.into(),
        source_topic_id: source_topic_id.into(),
        proposals,
    })
}

fn project_record(
    state: TopicApplicationStateRecord,
    projection: Option<TopicApplicationProjectionRecord>,
    artifacts: &[ReferenceArtifactRecord],
) -> Result<TopicRecord, String> {
    let projection = projection
        .map(|projection| {
            Ok::<Value, String>(json!({
                "topicGraph":parse_object(&projection.topic_graph_json)?,
                "concepts":parse_object(&projection.concepts_json)?,
                "interestMetadata":parse_object(&projection.interest_metadata_json)?,
                "discovery":parse_object(&projection.discovery_json)?,
            }))
        })
        .transpose()?
        .unwrap_or_else(|| json!({}));
    let readiness = topic_readiness_view(&state, &projection, artifacts);
    let mut projection = projection;
    if let Some(object) = projection.as_object_mut() {
        object.insert("freshness".into(), json!(readiness.freshness.as_str()));
        object.insert(
            "source_materials_status".into(),
            json!(readiness.source_materials_status.as_str()),
        );
        object.insert(
            "source_materials_percent".into(),
            json!(readiness.source_materials_percent),
        );
        object.insert("stale_reasons".into(), json!(&readiness.stale_reasons));
        object.insert("dirty_reasons".into(), json!(&readiness.dirty_reasons));
        object.insert(
            "missing_sections".into(),
            json!(&readiness.missing_sections),
        );
    }
    Ok(TopicRecord {
        topic_id: state.topic_id,
        path_id: state.path_id,
        title: state.title,
        definition: state.definition,
        language: state.language,
        operation: state.operation,
        manifest_hash: state.manifest_hash,
        artifact_hash: state.artifact_hash,
        metadata_hash: state.metadata_hash,
        bundle_hash: state.bundle_hash,
        paper_count: state.paper_count,
        updated_at: state.updated_at,
        topic_definition: parse_topic_dto::<TopicDefinitionDto>(
            parse_object(&state.topic_definition_json)?,
            "definition",
        )?,
        topic_resolver: parse_topic_dto::<TopicResolverDto>(
            parse_object(&state.topic_resolver_json)?,
            "resolver",
        )?,
        resolved_paper_set: parse_topic_dto::<ResolvedTopicPaperSetDto>(
            parse_object(&state.resolved_paper_set_json)?,
            "resolved_paper_set",
        )?,
        projection: parse_topic_dto::<TopicProjectionDto>(projection, "projection")?,
        freshness: readiness.freshness,
        source_materials_status: readiness.source_materials_status,
        source_materials_percent: readiness.source_materials_percent,
        stale_reasons: readiness.stale_reasons,
        dirty_reasons: readiness.dirty_reasons,
        missing_sections: readiness.missing_sections,
    })
}

fn apply_status_phase(status: TopicApplyStatus) -> &'static str {
    match status {
        TopicApplyStatus::TopicExists => "topic_exists",
        TopicApplyStatus::TopicMissing => "topic_missing",
        TopicApplyStatus::Conflict => "basis_conflict",
        TopicApplyStatus::PatchConflict => "patch_conflict",
        TopicApplyStatus::CanonicalStoreBusy => "canonical_store_busy",
        TopicApplyStatus::FailedRecovered => "failed_recovered",
        TopicApplyStatus::RepairRequired => "repair_required",
        TopicApplyStatus::Persisted => "completed",
        TopicApplyStatus::InvalidRequest => "invalid_request",
    }
}

fn failed_from_error(error: String, topic_id: &str, operation_id: &str) -> TopicApplyResult {
    let status = match error.as_str() {
        "basis_mismatch" => TopicApplyStatus::Conflict,
        "canonical_store_busy" => TopicApplyStatus::CanonicalStoreBusy,
        "failed_recovered" => TopicApplyStatus::FailedRecovered,
        "repair_required" => TopicApplyStatus::RepairRequired,
        _ => TopicApplyStatus::InvalidRequest,
    };
    let mut result = TopicApplyResult::failed(status, topic_id.to_owned(), operation_id.to_owned());
    if status == TopicApplyStatus::InvalidRequest {
        result.warnings.push("topic_apply_invalid".into());
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dto::{
        PatchOutput, TopicAsset, TopicLibraryItem, TopicLibraryItemsByRef, TopicLibraryPage,
    };
    use crate::ports::{CanonicalStorePort, RepositoryPort};
    use crate::topic_graph::{TopicGraphComputePort, TopicGraphIndexOutput};
    use std::fs;
    use std::path::PathBuf;
    use std::sync::Mutex as TestMutex;
    use std::sync::atomic::AtomicUsize;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{
        Repository, RepositoryIdentity, TopicApplicationRecordPage,
        TopicGraphApplicationStateRecord, TopicGraphNodeRecord, TopicGraphReplacement,
    };

    #[test]
    fn legacy_resolver_shapes_normalize_to_the_current_closed_dto() {
        assert_eq!(
            normalize_legacy_topic_resolver(&json!({"tag":"topic:r7"})).expect("string tag"),
            json!({
                "paper_refs":[],"collection_key":[],"tag":{"or":["topic:r7"]},
                "combine":"union"
            })
        );
        assert_eq!(
            normalize_legacy_topic_resolver(&json!({
                "paper_refs":["1:AAAA"],
                "collection_key":"collection:r7",
                "tag":{"and":["topic:r7"],"not":"status:excluded"},
                "combine":"intersection"
            }))
            .expect("composite resolver"),
            json!({
                "paper_refs":["1:AAAA"],
                "collection_key":["collection:r7"],
                "tag":{"and":["topic:r7"],"not":["status:excluded"]},
                "combine":"intersection"
            })
        );
    }

    struct CountingTopicRepository {
        inner: RepositoryPort,
        list_states: AtomicUsize,
        list_records: AtomicUsize,
        get_projection: AtomicUsize,
    }

    struct FixtureLibrary {
        items: Vec<TopicLibraryItem>,
        page_reads: TestMutex<usize>,
        keyed_reads: TestMutex<usize>,
    }

    impl TopicLibraryQueryPort for FixtureLibrary {
        fn list_items_page(&self, cursor: &str, _limit: usize) -> Result<TopicLibraryPage, String> {
            *self.page_reads.lock().expect("page reads") += 1;
            if !cursor.is_empty() {
                return Err("unexpected_cursor".into());
            }
            Ok(TopicLibraryPage {
                items: self.items.clone(),
                cursor: String::new(),
                next_cursor: String::new(),
                has_more: false,
            })
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<TopicLibraryItemsByRef, String> {
            *self.keyed_reads.lock().expect("keyed reads") += 1;
            let requested = paper_refs.iter().collect::<HashSet<_>>();
            let items = self
                .items
                .iter()
                .filter(|item| requested.contains(&item.paper_ref))
                .cloned()
                .collect::<Vec<_>>();
            Ok(TopicLibraryItemsByRef {
                items,
                missing_paper_refs: Vec::new(),
            })
        }
    }

    impl TopicRepositoryPort for CountingTopicRepository {
        fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String> {
            self.inner.get_state(topic_id)
        }

        fn list_states(
            &self,
            offset: usize,
            limit: usize,
        ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String> {
            self.list_states.fetch_add(1, Ordering::Relaxed);
            self.inner.list_states(offset, limit)
        }

        fn list_records(
            &self,
            offset: usize,
            limit: usize,
        ) -> Result<TopicApplicationRecordPage, String> {
            self.list_records.fetch_add(1, Ordering::Relaxed);
            self.inner.list_records(offset, limit)
        }

        fn upsert_state(&self, record: &TopicApplicationStateRecord) -> Result<(), String> {
            self.inner.upsert_state(record)
        }

        fn get_projection(
            &self,
            topic_id: &str,
        ) -> Result<Option<TopicApplicationProjectionRecord>, String> {
            self.get_projection.fetch_add(1, Ordering::Relaxed);
            self.inner.get_projection(topic_id)
        }

        fn upsert_projection(
            &self,
            record: &TopicApplicationProjectionRecord,
        ) -> Result<(), String> {
            self.inner.upsert_projection(record)
        }

        fn get_deleted(
            &self,
            topic_id: &str,
        ) -> Result<Option<DeletedTopicArtifactRecord>, String> {
            self.inner.get_deleted(topic_id)
        }

        fn list_deleted(
            &self,
            offset: usize,
            limit: usize,
        ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String> {
            self.inner.list_deleted(offset, limit)
        }

        fn soft_delete(&self, record: &DeletedTopicArtifactRecord) -> Result<(), String> {
            self.inner.soft_delete(record)
        }

        fn purge_deleted(&self, records: &[DeletedTopicArtifactRecord]) -> Result<usize, String> {
            self.inner.purge_deleted(records)
        }

        fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
            self.inner.upsert_operation(record)
        }

        fn update_operation(
            &self,
            operation_id: &str,
            status: &str,
            phase: &str,
            diagnostics: &[String],
            now: &str,
        ) -> Result<Option<OperationRecord>, String> {
            self.inner
                .update_operation(operation_id, status, phase, diagnostics, now)
        }
    }

    struct FixtureEngine;

    struct FixtureTopicGraphCompute;

    impl TopicGraphComputePort for FixtureTopicGraphCompute {
        fn build_index(
            &self,
            _snapshot: &TopicGraphReplacement,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<TopicGraphIndexOutput, String> {
            Ok(TopicGraphIndexOutput {
                index_hash: "index:fixture".into(),
                index_json: "{}".into(),
            })
        }
    }

    impl StructuredArtifactPort for FixtureEngine {
        fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
            if manifest.is_object() {
                Ok(())
            } else {
                Err("manifest_invalid".into())
            }
        }

        fn assemble_artifact(
            &self,
            manifest: &Value,
            sections: &BTreeMap<String, Value>,
        ) -> Result<Value, String> {
            let mut artifact = Map::from_iter([
                (
                    "schema_id".into(),
                    json!("synthesis.topic_synthesis_artifact"),
                ),
                ("schema_version".into(), json!("4.0.0")),
                (
                    "language".into(),
                    manifest
                        .get("language")
                        .cloned()
                        .unwrap_or_else(|| json!("en")),
                ),
            ]);
            artifact.extend(sections.clone());
            Ok(Value::Object(artifact))
        }

        fn validate_artifact(&self, artifact: &Value, _language: &str) -> Result<(), String> {
            artifact
                .is_object()
                .then_some(())
                .ok_or_else(|| "artifact_invalid".into())
        }

        fn apply_section_patch(
            &self,
            current: &CanonicalTopicView,
            _patch_manifest: &Value,
            changed_sections: &BTreeMap<String, Value>,
        ) -> Result<PatchOutput, String> {
            let mut sections = current.sections.clone();
            sections.extend(changed_sections.clone());
            Ok(PatchOutput {
                sections,
                mismatches: Vec::new(),
            })
        }
    }

    fn root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-typed-topic-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root");
        root
    }

    fn owners(root: &std::path::Path) -> (RepositoryPort, CanonicalStorePort) {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("canonical");
        (
            RepositoryPort::new(Arc::new(Mutex::new(repository))),
            CanonicalStorePort::new(Arc::new(Mutex::new(canonical))),
        )
    }

    fn make_application(root: &std::path::Path) -> TopicApplication {
        let (repository, canonical) = owners(root);
        let sequence = Arc::new(AtomicU64::new(0));
        let operation_sequence = Arc::clone(&sequence);
        TopicApplication::with_factories(
            Arc::new(repository),
            Arc::new(canonical),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(move |topic| {
                format!(
                    "operation:{topic}:{}",
                    operation_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    fn request(topic_id: &str, operation: &str) -> TopicApplyRequest {
        let manifest = if operation == "update_patch" {
            json!({
                "schema_id":"synthesis.topic_analysis_patch",
                "schema_version":"3.0.0",
                "topic_id":topic_id,
                "patch":{"sections":{"claims":{"path":"asset/claims"}}},
            })
        } else {
            json!({
                "schema_id":"synthesis.topic_analysis_manifest",
                "schema_version":"3.0.0",
                "topic_id":topic_id,
                "language":"en",
                "sections":{
                    "claims":{"path":"asset/claims"},
                    "source_papers":{"path":"asset/papers"},
                },
            })
        };
        TopicApplyRequest {
            bundle: json!({
                "kind":"topic_synthesis",
                "operation":operation,
                "mode":if operation == "create" {"create"} else {"update"},
                "language":"en",
                "topic_id":topic_id,
                "topic_definition":{
                    "id":topic_id,
                    "title":"Typed Topic",
                    "definition":"Typed parity reference slice",
                },
                "resolver_manifest_path":"asset/resolver",
                "analysis_manifest_path":"asset/manifest",
                "artifact_metadata":{},
                "markdown":"",
            }),
            assets: vec![
                TopicAsset {
                    id: "asset/manifest".into(),
                    media_type: "application/json".into(),
                    text: serde_json::to_string(&manifest).expect("manifest"),
                },
                TopicAsset {
                    id: "asset/claims".into(),
                    media_type: "application/json".into(),
                    text: r#"[{"id":"claim:one","text":"One"}]"#.into(),
                },
                TopicAsset {
                    id: "asset/papers".into(),
                    media_type: "application/json".into(),
                    text: r#"[{"paper_ref":"1:AAAA"}]"#.into(),
                },
                TopicAsset {
                    id: "asset/resolver".into(),
                    media_type: "application/json".into(),
                    text: r#"{"resolver":{"paper_refs":["1:AAAA"],"collection_key":[],"combine":"union"},"resolved_paper_set":{"papers":[{"paper_ref":"1:AAAA"}]}}"#.into(),
                },
            ],
        }
    }

    fn flat_manifest_request(topic_id: &str) -> TopicApplyRequest {
        let mut request = request(topic_id, "create");
        let bundle = request.bundle.as_object_mut().expect("topic apply bundle");
        bundle.remove("analysis_manifest_path");
        bundle.remove("resolver_manifest_path");
        bundle.insert(
            "artifact_manifest_path".into(),
            json!("asset/artifact-manifest"),
        );
        request.assets.push(TopicAsset {
            id: "asset/artifact-manifest".into(),
            media_type: "application/json".into(),
            text: serde_json::to_string(&json!({
                "topic_analysis": "asset/manifest",
                "resolver_manifest": "asset/resolver",
            }))
            .expect("artifact manifest"),
        });
        request
    }

    #[test]
    fn create_resolves_analysis_and_resolver_from_flat_artifact_manifest() {
        let root = root("flat-artifact-manifest");
        let application = make_application(&root);

        let created = application.apply(flat_manifest_request("topic-flat-manifest"));

        assert_eq!(created.status, TopicApplyStatus::Persisted);
        assert!(created.ok);
    }

    #[test]
    fn create_list_detail_duplicate_and_reopen_are_typed_and_durable() {
        let root = root("create");
        let application = make_application(&root);
        assert!(
            application
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .is_empty()
        );
        let created = application.apply(request("topic-alpha", "create"));
        assert_eq!(created.status, TopicApplyStatus::Persisted);
        assert!(created.ok);
        assert_eq!(
            application
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .len(),
            1
        );
        assert!(matches!(
            application
                .detail(TopicDetailRequest {
                    topic_id: "topic-alpha".into()
                })
                .unwrap(),
            TopicDetailResult::Ready { .. }
        ));
        assert_eq!(
            application.apply(request("topic-alpha", "create")).status,
            TopicApplyStatus::TopicExists
        );
        drop(application);
        let reopened = make_application(&root);
        assert!(matches!(
            reopened
                .detail(TopicDetailRequest {
                    topic_id: "topic-alpha".into()
                })
                .unwrap(),
            TopicDetailResult::Ready { .. }
        ));
        drop(reopened);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn apply_materializes_topic_graph_node_and_reopens_it() {
        let root = root("apply-topic-graph");
        let (repository, canonical) = owners(&root);
        let graph = Arc::new(TopicGraphApplication::new(
            Arc::new(repository.clone()),
            Arc::new(FixtureTopicGraphCompute),
        ));
        let application = TopicApplication::with_factories(
            Arc::new(repository),
            Arc::new(canonical),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(|topic| format!("operation:{topic}")),
        )
        .with_topic_graph(Arc::clone(&graph));

        let applied = application.apply(request("topic-alpha", "create"));

        assert_eq!(applied.status, TopicApplyStatus::Persisted);
        assert!(applied.warnings.is_empty());
        let snapshot = graph.load().expect("topic graph");
        assert_eq!(snapshot.nodes.len(), 1);
        assert_eq!(snapshot.nodes[0].topic_id, "topic-alpha");
        assert_eq!(snapshot.nodes[0].node_type, "materialized");
        assert_eq!(snapshot.nodes[0].definition_status, "has_synthesis");
        drop(application);
        drop(graph);

        let reopened_repository = owners(&root).0;
        let reopened_graph = TopicGraphApplication::new(
            Arc::new(reopened_repository),
            Arc::new(FixtureTopicGraphCompute),
        );
        assert_eq!(
            reopened_graph.load().expect("reopened graph").nodes.len(),
            1
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn apply_routes_relation_proposals_through_topic_graph_application() {
        let root = root("apply-topic-graph-proposals");
        let (repository, canonical) = owners(&root);
        let graph = Arc::new(TopicGraphApplication::new(
            Arc::new(repository.clone()),
            Arc::new(FixtureTopicGraphCompute),
        ));
        let application = TopicApplication::with_factories(
            Arc::new(repository),
            Arc::new(canonical),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(|topic| format!("operation:{topic}")),
        )
        .with_topic_graph(Arc::clone(&graph));
        assert!(application.apply(request("topic-parent", "create")).ok);
        let mut child = request("topic-child", "create");
        child.bundle.as_object_mut().expect("bundle").insert(
            "topic_graph_relation_proposals_path".into(),
            json!("asset/relations"),
        );
        child.assets.push(TopicAsset {
            id: "asset/relations".into(),
            media_type: "application/json".into(),
            text: serde_json::to_string(&json!({
                "schema_id":"synthesis.topic_graph_relation_proposals",
                "proposals":[{
                    "relation_type":"target_is_broader_topic_candidate",
                    "target_topic_id":"topic-parent",
                    "target_topic_title":"Typed Topic",
                    "confidence":0.9,
                    "source_paper_refs":["1:AAAA"]
                }]
            }))
            .expect("relations"),
        });

        let applied = application.apply(child);

        assert_eq!(applied.status, TopicApplyStatus::Persisted);
        assert!(applied.warnings.is_empty());
        let snapshot = graph.load().expect("topic graph");
        assert_eq!(snapshot.nodes.len(), 2);
        assert_eq!(snapshot.edges.len(), 1);
        assert_eq!(snapshot.edges[0].source_topic_id, "topic-parent");
        assert_eq!(snapshot.edges[0].target_topic_id, "topic-child");
        assert_eq!(snapshot.edges[0].status, "suggested");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn startup_reconciliation_backfills_legacy_topic_once() {
        let root = root("reconcile-legacy-topic-graph");
        let application = make_application(&root);
        assert!(application.apply(request("topic-legacy", "create")).ok);
        drop(application);
        let (repository, _) = owners(&root);
        let state = repository
            .get_state("topic-legacy")
            .expect("topic state")
            .expect("legacy topic");
        let graph =
            TopicGraphApplication::new(Arc::new(repository), Arc::new(FixtureTopicGraphCompute));
        let materialized = TopicGraphMaterializedTopic {
            topic_id: state.topic_id,
            title: state.title,
            definition: state.definition,
            current_artifact_path: format!("topics/{}/current/artifact.json", state.path_id),
            paper_count: state.paper_count,
            synthesized_at: state.updated_at,
        };

        let first = graph.reconcile_materialized_topics(std::slice::from_ref(&materialized));
        let second = graph.reconcile_materialized_topics(&[materialized]);

        assert_eq!(first.status, TopicGraphMutationStatus::Committed);
        assert_eq!(second.status, TopicGraphMutationStatus::Unchanged);
        assert_eq!(graph.load().expect("topic graph").nodes.len(), 1);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn delete_rebuild_and_purge_are_durable_and_idempotent() {
        let root = root("delete-purge");
        let application = make_application(&root);
        assert!(application.apply(request("topic-alpha", "create")).ok);

        let deleted = application
            .delete(TopicDeleteRequest {
                topic_id: "topic-alpha".into(),
            })
            .expect("delete");
        assert_eq!(deleted.status, TopicDeleteStatus::Deleted);
        assert!(!deleted.deleted_path_id.is_empty());
        assert!(
            application
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .is_empty()
        );
        assert_eq!(application.list_deleted(0, 50).expect("deleted").0.len(), 1);
        assert_eq!(
            application
                .delete(TopicDeleteRequest {
                    topic_id: "topic-alpha".into(),
                })
                .expect("idempotent delete")
                .deleted_path_id,
            deleted.deleted_path_id
        );

        drop(application);
        let reopened = make_application(&root);
        assert_eq!(
            reopened
                .list_deleted(0, 50)
                .expect("reopen deleted")
                .0
                .len(),
            1
        );
        assert!(reopened.apply(request("topic-alpha", "create")).ok);
        assert_eq!(
            reopened
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .len(),
            1
        );
        assert_eq!(reopened.list_deleted(0, 50).expect("coexist").0.len(), 1);

        assert_eq!(reopened.purge_deleted().expect("purge").purged_count, 1);
        assert_eq!(
            reopened
                .purge_deleted()
                .expect("idempotent purge")
                .purged_count,
            0
        );
        assert_eq!(
            reopened
                .list(TopicListRequest::default())
                .unwrap()
                .topics
                .len(),
            1
        );
        drop(reopened);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn repository_failure_restores_current_and_graph_failure_is_only_a_warning() {
        let rollback_root = root("delete-rollback");
        let (repository, canonical) = owners(&rollback_root);
        let rollback = TopicApplication::with_factories(
            Arc::new(repository.clone()),
            Arc::new(canonical.clone()),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(|topic| format!("operation:{topic}")),
        );
        assert!(rollback.apply(request("topic-alpha", "create")).ok);
        repository
            .owner()
            .lock()
            .expect("repository")
            .execute(
                "CREATE TRIGGER fail_topic_tombstone BEFORE INSERT ON synt_topic_deleted_artifact
                 BEGIN SELECT RAISE(FAIL, 'fixture tombstone failure'); END",
                &[],
            )
            .expect("trigger");
        assert!(
            rollback
                .delete(TopicDeleteRequest {
                    topic_id: "topic-alpha".into(),
                })
                .is_err()
        );
        assert!(matches!(
            canonical.read_topic("topic-alpha").expect("restored"),
            CanonicalTopicState::Ready(_)
        ));
        assert!(repository.get_state("topic-alpha").unwrap().is_some());
        assert!(repository.get_deleted("topic-alpha").unwrap().is_none());
        drop(rollback);
        fs::remove_dir_all(rollback_root).expect("cleanup rollback");

        let warning_root = root("delete-graph-warning");
        let (repository, canonical) = owners(&warning_root);
        let graph = Arc::new(TopicGraphApplication::new(
            Arc::new(repository.clone()),
            Arc::new(FixtureTopicGraphCompute),
        ));
        let graph_seed = TopicGraphReplacement {
            state: TopicGraphApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: "graph:fixture".into(),
                index_json: "{}".into(),
                index_stale: 1,
                ..TopicGraphApplicationStateRecord::default()
            },
            nodes: vec![TopicGraphNodeRecord {
                topic_id: "topic-alpha".into(),
                title: "Alpha".into(),
                node_type: "materialized".into(),
                definition_status: "has_synthesis".into(),
                aliases_json: "[]".into(),
                ..TopicGraphNodeRecord::default()
            }],
            edges: Vec::new(),
            reviews: Vec::new(),
        };
        assert_eq!(
            graph.replace_snapshot(None, &graph_seed).status,
            crate::topic_graph::TopicGraphMutationStatus::Committed
        );
        let warning = TopicApplication::with_factories(
            Arc::new(repository.clone()),
            Arc::new(canonical.clone()),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(|topic| format!("operation:{topic}")),
        )
        .with_topic_graph(graph);
        assert!(warning.apply(request("topic-alpha", "create")).ok);
        repository
            .owner()
            .lock()
            .expect("repository")
            .execute(
                "CREATE TRIGGER fail_topic_graph_state BEFORE INSERT ON synt_topic_graph_application_state
                 BEGIN SELECT RAISE(FAIL, 'fixture graph failure'); END",
                &[],
            )
            .expect("trigger");
        let deleted = warning
            .delete(TopicDeleteRequest {
                topic_id: "topic-alpha".into(),
            })
            .expect("delete with graph warning");
        assert_eq!(deleted.warnings, vec!["topic_graph_delete_mark_failed"]);
        assert!(repository.get_state("topic-alpha").unwrap().is_none());
        assert!(repository.get_deleted("topic-alpha").unwrap().is_some());
        assert!(matches!(
            canonical.read_topic("topic-alpha").expect("absent"),
            CanonicalTopicState::Absent { .. }
        ));
        drop(warning);
        fs::remove_dir_all(warning_root).expect("cleanup warning");
    }

    #[test]
    fn list_uses_one_joined_repository_page_without_projection_fanout() {
        let root = root("joined-page");
        let (repository, canonical) = owners(&root);
        let repository = Arc::new(CountingTopicRepository {
            inner: repository,
            list_states: AtomicUsize::new(0),
            list_records: AtomicUsize::new(0),
            get_projection: AtomicUsize::new(0),
        });
        let application = TopicApplication::with_factories(
            repository.clone(),
            Arc::new(canonical),
            Arc::new(FixtureEngine),
            Arc::new(|| "2026-07-26T12:00:00.000Z".into()),
            Arc::new(|topic| format!("operation:{topic}")),
        );
        assert!(application.apply(request("topic-alpha", "create")).ok);
        repository.list_states.store(0, Ordering::Relaxed);
        repository.list_records.store(0, Ordering::Relaxed);
        repository.get_projection.store(0, Ordering::Relaxed);

        let page = application.list(TopicListRequest::default()).expect("page");

        assert_eq!(page.returned, 1);
        assert_eq!(repository.list_records.load(Ordering::Relaxed), 1);
        assert_eq!(repository.list_states.load(Ordering::Relaxed), 0);
        assert_eq!(repository.get_projection.load(Ordering::Relaxed), 0);
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn full_update_checks_basis_and_patch_inherits_sections() {
        let root = root("update");
        let application = make_application(&root);
        let created = application.apply(request("topic-alpha", "create"));
        let mut stale = request("topic-alpha", "update_full");
        stale.bundle["base_hashes"] = json!({
            "manifest":"sha256:stale",
            "artifact":created.hashes["artifact"],
            "metadata":created.hashes["metadata"],
        });
        assert_eq!(application.apply(stale).status, TopicApplyStatus::Conflict);
        let mut update = request("topic-alpha", "update_full");
        update.bundle["base_hashes"] = json!({
            "manifest":created.hashes["manifest"],
            "artifact":created.hashes["artifact"],
            "metadata":created.hashes["metadata"],
        });
        let updated = application.apply(update);
        assert_eq!(updated.status, TopicApplyStatus::Persisted);
        let patched = application.apply(request("topic-alpha", "update_patch"));
        assert_eq!(patched.status, TopicApplyStatus::Persisted);
        let detail = application
            .detail(TopicDetailRequest {
                topic_id: "topic-alpha".into(),
            })
            .unwrap();
        let TopicDetailResult::Ready { snapshot, .. } = detail else {
            panic!("ready");
        };
        assert!(snapshot.sections.contains_key("source_papers"));
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn topic_queries_preserve_fixed_filters_context_views_and_explicit_report_source() {
        let root = root("query-surface");
        let application = make_application(&root);
        assert!(application.apply(request("topic-alpha", "create")).ok);

        let found = application
            .find_by_paper_refs(TopicFindRequest {
                paper_refs: vec!["1:MISSING".into(), "1:AAAA".into(), "1:AAAA".into()],
            })
            .expect("find topics");
        assert!(found.ok);
        assert_eq!(found.paper_refs, vec!["1:AAAA", "1:MISSING"]);
        assert_eq!(found.topics.len(), 1);
        assert_eq!(found.topics[0].topic_id, "topic-alpha");
        assert_eq!(found.topics[0].matched_paper_refs, vec!["1:AAAA"]);
        assert_eq!(found.diagnostics.unmatched_paper_refs, vec!["1:MISSING"]);

        for filter in [TopicWorkflowFilter::All, TopicWorkflowFilter::Updatable] {
            let options = application
                .workflow_options(filter)
                .expect("workflow options");
            assert_eq!(options.options.len(), 1);
            assert_eq!(options.options[0].value, "topic-alpha");
        }

        for (view, expected) in [
            (TopicContextView::Digest, "digest"),
            (TopicContextView::Semantic, "semantic"),
            (TopicContextView::Audit, "audit"),
            (TopicContextView::Full, "full"),
        ] {
            let context = application
                .context(TopicContextRequest {
                    topic_id: "topic-alpha".into(),
                    view,
                })
                .expect("topic context");
            assert_eq!(context.0["view"], expected);
        }

        let report = application
            .report(TopicReportRequest {
                topic_id: "topic-alpha".into(),
            })
            .expect("topic report");
        assert!(!report.ok);
        assert_eq!(report.status, "unavailable");
        assert!(report.markdown.is_empty());
        assert_eq!(
            report.diagnostics,
            vec!["synthesis_report_body_unavailable"]
        );

        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn resolver_uses_keyed_reads_when_possible_and_bounded_scan_for_composite_selectors() {
        let root = root("resolver");
        let application = make_application(&root);
        let library = FixtureLibrary {
            items: vec![
                TopicLibraryItem {
                    paper_ref: "1:AAAA".into(),
                    library_id: 1,
                    item_key: "AAAA".into(),
                    item_type: "journalArticle".into(),
                    title: "Alpha".into(),
                    year: "2024".into(),
                    tags: vec!["topic:alpha".into()],
                    collections: vec!["COLLECTION-A".into()],
                },
                TopicLibraryItem {
                    paper_ref: "1:BBBB".into(),
                    library_id: 1,
                    item_key: "BBBB".into(),
                    item_type: "journalArticle".into(),
                    title: "Beta".into(),
                    year: "2025".into(),
                    tags: vec!["topic:beta".into()],
                    collections: vec!["COLLECTION-A".into()],
                },
            ],
            page_reads: TestMutex::new(0),
            keyed_reads: TestMutex::new(0),
        };

        let keyed = application
            .resolve(
                &library,
                TopicResolverRequest {
                    tag: None,
                    collection_keys: Vec::new(),
                    paper_refs: vec!["1:BBBB".into()],
                    combine: TopicResolverCombine::Union,
                    cursor: 0,
                    limit: 50,
                    normalized: json!({"paper_refs":["1:BBBB"]}),
                },
            )
            .expect("keyed resolver");
        assert_eq!(keyed.total, 1);
        assert_eq!(keyed.papers[0].paper_ref, "1:BBBB");
        assert_eq!(*library.keyed_reads.lock().expect("keyed reads"), 1);
        assert_eq!(*library.page_reads.lock().expect("page reads"), 0);

        let composite = application
            .resolve(
                &library,
                TopicResolverRequest {
                    tag: Some(json!({"and":["topic:alpha"]})),
                    collection_keys: vec!["collection-a".into()],
                    paper_refs: vec!["1:AAAA".into()],
                    combine: TopicResolverCombine::Intersection,
                    cursor: 0,
                    limit: 1,
                    normalized: json!({"combine":"intersection"}),
                },
            )
            .expect("composite resolver");
        assert_eq!(composite.total, 1);
        assert_eq!(composite.returned, 1);
        assert!(!composite.has_more);
        assert_eq!(
            composite.papers[0].match_reasons,
            vec!["collection_key", "paper_refs", "tag"]
        );
        assert_eq!(*library.page_reads.lock().expect("page reads"), 1);

        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn invalid_assets_write_no_operation_and_stopped_admission_is_bounded() {
        let root = root("invalid");
        let application = make_application(&root);
        let mut invalid = request("topic-alpha", "create");
        invalid.assets[0].id = "../escape".into();
        let result = application.apply(invalid);
        assert_eq!(result.status, TopicApplyStatus::InvalidRequest);
        application.stop_admission();
        assert_eq!(
            application.apply(request("topic-alpha", "create")).status,
            TopicApplyStatus::RepairRequired
        );
        assert_eq!(application.shutdown(Duration::from_millis(10)), Ok(()));
        drop(application);
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile:typed".into(),
                data_root_id: "data:typed".into(),
            },
        )
        .expect("repository");
        assert!(
            repository
                .query("SELECT operation_id FROM synt_operation", &[])
                .expect("operations")
                .is_empty()
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
