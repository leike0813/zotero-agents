use crate::runtime_contract::NativeLaunchConfig;
use crate::runtime_host_collection::{
    HostItemCollectionPort, ReferenceHostItemsByRef, ReferenceHostItemsPage,
    TopicLibraryQueryAdapter,
};
use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use synthesis_application::citation_graph::{
    CITATION_GRAPH_LAYOUT_EDGE_MAX, CITATION_GRAPH_LAYOUT_NODE_MAX, CitationBuildOutput,
    CitationGraphComputePort, CitationLayoutRequest, CitationMetricsOutput,
};
use synthesis_application::concept_kb::{ConceptIndexOutput, ConceptKbComputePort};
use synthesis_application::reference_matching::{
    ReferenceMatchConfidence, ReferenceMatchDisposition, ReferenceMatchKind, ReferenceMatchPass,
    ReferenceMatcherInput, ReferenceMatcherOutcome, ReferenceMatcherPort,
};
use synthesis_application::related_items::{
    RelatedItemsApplication, RelatedItemsHostEffect, RelatedItemsHostEffectPort,
    RelatedItemsHostReceipt,
};
use synthesis_application::tag_audit::{
    TagAuditApplication, TagAuditFreshState, TagAuditFreshStatePort, TagAuditItemRef,
    TagAuditRuntimePort,
};
use synthesis_application::tag_vocabulary::{
    TagHostEffectPort, TagHostEffectReceipt, TagIndexOutput, TagLegacyBindingResolution,
    TagLegacyBindingResolverPort, TagParentBinding, TagVocabularyComputePort,
};
use synthesis_application::topic_digest::{
    RepresentativeImageHostResult, RepresentativeImageReadFailure, RepresentativeImageReadPort,
    TopicDigestArtifactReadPort, TopicDigestArtifactReadResult, TopicPaperDigestApplication,
};
use synthesis_application::topic_graph::{
    TopicGraphComputePort, TopicGraphIndexOutput, TopicGraphMaterializedTopic,
};
use synthesis_application::webdav_sync::{
    WebDavHostDescription, WebDavHostPort, WebDavReadResult, WebDavWriteResult,
};
use synthesis_application::{
    CanonicalStorePort, CitationGraphApplication, ConceptKbApplication,
    DebugMaintenanceApplication, DurableBundleApplication, HostEffectDiagnostic,
    ReferenceApplication, ReferenceMatchingApplication, ReferenceRefreshApplication,
    RepositoryPort, TagVocabularyApplication, TopicApplication, TopicGraphApplication,
    TopicLibraryQueryPort, WebDavSyncApplication, WorkbenchApplication,
};
use synthesis_canonical_store::{CanonicalStore, canonical_json_hash};
use synthesis_protocol::utc_now_iso8601;
use synthesis_reference_matcher::{
    BINDING_ALGORITHM_VERSION, CONTRACT_VERSION as REFERENCE_MATCHER_CONTRACT_VERSION,
    DEDUPE_ALGORITHM_VERSION,
};
use synthesis_repository::{
    CanonicalReferenceRecord, CitationComplexMetricsRecord, CitationEdgeRecord,
    CitationGraphApplicationStateRecord, CitationGraphReplacement, CitationIncomingGroupRecord,
    CitationLayoutRecord, CitationLightMetricsRecord, CitationNodeRecord,
    CitationSourceOwnershipRecord, RawReferenceRecord, TagEffectRecord, TagProtocolRecord,
    TagVocabularyEntryRecord, TagVocabularyReplacement, TopicGraphReplacement,
};

use crate::runtime_canonical_autosync::{
    CANONICAL_AUTOSYNC_DEBOUNCE, CanonicalAutosyncCoordinator,
};
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_reverse_host::call_reverse_host;
use crate::runtime_webdav_runtime::{FileWebDavStateStore, InterruptibleWebDavRetryScheduler};
use crate::runtime_worker_pool::NativeComputePool;
use synthesis_application::reference::{
    ReferenceHostArtifactRead, ReferenceHostArtifactsPage, ReferenceHostPort, ReferenceObservation,
    ReferenceObservationPort,
};

pub(crate) struct ProductionApplications {
    pub(crate) repository: Arc<RepositoryPort>,
    pub(crate) canonical: Arc<CanonicalStorePort>,
    pub(crate) workbench: WorkbenchApplication,
    pub(crate) topics: TopicApplication,
    pub(crate) topic_digests: TopicPaperDigestApplication,
    pub(crate) citations: CitationGraphApplication,
    pub(crate) related_items: RelatedItemsApplication,
    pub(crate) references: ReferenceApplication,
    pub(crate) tags: TagVocabularyApplication,
    pub(crate) tag_audits: TagAuditApplication,
    pub(crate) concepts: Arc<ConceptKbApplication>,
    pub(crate) topic_graph: Arc<TopicGraphApplication>,
    pub(crate) debug: DebugMaintenanceApplication,
    pub(crate) webdav: Arc<WebDavSyncApplication>,
    pub(crate) canonical_autosync: CanonicalAutosyncCoordinator,
    pub(crate) host_items: Arc<dyn HostItemCollectionPort>,
    pub(crate) topic_library: Arc<dyn TopicLibraryQueryPort>,
    config: Option<Arc<NativeLaunchConfig>>,
    service_instance_id: String,
}

impl ProductionApplications {
    pub(crate) fn library_id(&self) -> i64 {
        self.config
            .as_deref()
            .map(|config| config.library_id)
            .unwrap_or_default()
    }

    pub(crate) fn call_host(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let config = self
            .config
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(config, &self.service_instance_id, capability, payload)
    }

    pub(crate) fn consume_related_items_sync_echo(
        &self,
        library_id: i64,
        item_key: &str,
        related_item_key: Option<&str>,
    ) -> Result<Value, String> {
        let consumed = self
            .repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .consume_related_items_sync_echo(
                library_id,
                item_key,
                related_item_key,
                &utc_now_iso8601(),
            )?;
        Ok(json!({"consumed":consumed}))
    }
}

pub(crate) fn build_production_applications(
    repository: Arc<RepositoryPort>,
    canonical: Arc<Mutex<CanonicalStore>>,
    compute: Arc<NativeComputePool>,
    config: Option<Arc<NativeLaunchConfig>>,
    service_instance_id: String,
    webdav_state_path: PathBuf,
) -> Result<ProductionApplications, String> {
    let canonical = Arc::new(CanonicalStorePort::new(canonical));
    let workbench = WorkbenchApplication::new(repository.clone());
    let host = Arc::new(ReverseHostApplicationPort {
        config: config.clone(),
        service_instance_id: service_instance_id.clone(),
    });
    let host_items: Arc<dyn HostItemCollectionPort> = host.clone();
    let topic_library: Arc<dyn TopicLibraryQueryPort> =
        Arc::new(TopicLibraryQueryAdapter::new(host_items.clone()));
    let topic_graph = Arc::new(TopicGraphApplication::new(
        repository.clone(),
        Arc::new(NativeTopicGraphComputePort {
            compute: Arc::clone(&compute),
        }),
    ));
    let materialized_topics =
        repository
            .owner()
            .lock()
            .ok()
            .and_then(|repository| {
                let mut offset = 0;
                let mut topics = Vec::new();
                loop {
                    let (records, total) = repository
                        .list_topic_application_records(offset, 250)
                        .ok()?;
                    let returned = records.len();
                    topics.extend(records.into_iter().map(|(state, _)| {
                        TopicGraphMaterializedTopic {
                            topic_id: state.topic_id,
                            title: state.title,
                            definition: state.definition,
                            current_artifact_path: format!(
                                "topics/{}/current/artifact.json",
                                state.path_id
                            ),
                            paper_count: state.paper_count,
                            synthesized_at: state.updated_at,
                        }
                    }));
                    offset += returned;
                    if returned == 0 || offset >= total {
                        break;
                    }
                }
                Some(topics)
            })
            .unwrap_or_default();
    if !materialized_topics.is_empty() {
        let _ = topic_graph.reconcile_materialized_topics(&materialized_topics);
    }
    let concepts = Arc::new(ConceptKbApplication::new(
        repository.clone(),
        Arc::new(NativeConceptKbComputePort {
            compute: Arc::clone(&compute),
        }),
    ));
    let topics = TopicApplication::new(
        repository.clone(),
        canonical.clone(),
        Arc::new(NativeStructuredArtifactPort {
            compute: Arc::clone(&compute),
        }),
    )
    .with_topic_graph(Arc::clone(&topic_graph))
    .with_concept_kb(Arc::clone(&concepts));
    let topic_digests = TopicPaperDigestApplication::new(host.clone(), host.clone());
    let citations = CitationGraphApplication::new(
        repository.clone(),
        Arc::new(NativeCitationGraphComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let related_items = RelatedItemsApplication::new(
        repository.clone(),
        host.clone(),
        config.as_deref().map_or(0, |config| config.library_id),
    );
    let reference_refresh = ReferenceRefreshApplication::new(repository.clone());
    let reference_matching = ReferenceMatchingApplication::new(
        repository.clone(),
        Arc::new(NativeReferenceMatcherPort {
            compute: Arc::clone(&compute),
        }),
    );
    let references = ReferenceApplication::new(
        repository.clone(),
        reference_refresh,
        reference_matching,
        host.clone(),
    )
    .with_observations(Arc::new(NativeReferenceObservationPort));
    let tags = TagVocabularyApplication::new(
        repository.clone(),
        Arc::new(NativeTagVocabularyComputePort {
            compute: Arc::clone(&compute),
        }),
        host.clone(),
        host.clone(),
    )
    .with_library_id(config.as_deref().map_or(0, |config| config.library_id));
    let _ = tags.repair_case_collisions();
    let _ = tags.ensure_staged_bindings_migrated();
    let tag_audits = TagAuditApplication::new(
        repository.clone(),
        host.clone(),
        Arc::new(NativeTagAuditRuntimePort {
            service_instance_id: service_instance_id.clone(),
            sequence: AtomicU64::new(0),
        }),
    );
    let debug = DebugMaintenanceApplication::new(repository.clone(), canonical.clone());
    let durable = DurableBundleApplication::acquire(repository.clone(), canonical.clone())?;
    let webdav = Arc::new(WebDavSyncApplication::new(
        host.clone(),
        Arc::new(FileWebDavStateStore::new(webdav_state_path)),
        Arc::new(InterruptibleWebDavRetryScheduler::default()),
        Arc::new(durable),
        Arc::new(utc_now_iso8601),
    ));
    let canonical_autosync =
        CanonicalAutosyncCoordinator::new(Arc::clone(&webdav), CANONICAL_AUTOSYNC_DEBOUNCE)?;
    Ok(ProductionApplications {
        repository,
        canonical,
        workbench,
        topics,
        topic_digests,
        citations,
        related_items,
        references,
        tags,
        tag_audits,
        concepts,
        topic_graph,
        debug,
        webdav,
        canonical_autosync,
        host_items,
        topic_library,
        config,
        service_instance_id,
    })
}

struct NativeTagAuditRuntimePort {
    service_instance_id: String,
    sequence: AtomicU64,
}

impl TagAuditRuntimePort for NativeTagAuditRuntimePort {
    fn now(&self) -> String {
        utc_now_iso8601()
    }

    fn opaque_id(&self, kind: &str) -> String {
        let sequence = self.sequence.fetch_add(1, Ordering::Relaxed);
        canonical_json_hash(&json!({
            "kind": kind,
            "serviceInstanceId": self.service_instance_id,
            "sequence": sequence,
            "at": utc_now_iso8601(),
        }))
        .unwrap_or_else(|_| format!("{kind}-{sequence}"))
    }
}

struct NativeCitationGraphComputePort {
    compute: Arc<NativeComputePool>,
}

const CITATION_GRAPH_COMPUTE_TITLE_MAX_CHARS: usize = 500;
const CITATION_GRAPH_COMPUTE_TEXT_MAX_UTF16: usize = 4_096;

fn citation_node_kind(record: &CitationNodeRecord) -> &'static str {
    serde_json::from_str::<Value>(&record.summary_json)
        .ok()
        .and_then(|summary| summary["kind"].as_str().map(str::to_owned))
        .filter(|kind| {
            matches!(
                kind.as_str(),
                "library_paper" | "external_reference" | "unresolved_reference"
            )
        })
        .map(|kind| match kind.as_str() {
            "external_reference" => "external_reference",
            "unresolved_reference" => "unresolved_reference",
            _ => "library_paper",
        })
        .unwrap_or(if record.has_zotero_binding {
            "library_paper"
        } else {
            "external_reference"
        })
}

fn citation_paper_parts(node_id: &str) -> (Option<u64>, Option<String>) {
    node_id
        .split_once(':')
        .and_then(|(library_id, item_key)| {
            Some((
                library_id.parse::<u64>().ok()?,
                (!item_key.is_empty()).then(|| item_key.to_owned())?,
            ))
        })
        .map(|(library_id, item_key)| (Some(library_id), Some(item_key)))
        .unwrap_or((None, None))
}

fn citation_initial_coordinate(node_id: &str, axis: &str) -> Result<f64, String> {
    let hash = canonical_json_hash(&serde_json::json!({"nodeId":node_id,"axis":axis}))?;
    let value = u32::from_str_radix(hash.get(7..15).unwrap_or_default(), 16)
        .map_err(|_| "worker_result_invalid".to_owned())?;
    Ok((f64::from(value) / f64::from(u32::MAX) - 0.5) * 100.0)
}

fn bounded_citation_compute_text(
    value: &str,
    max_chars: usize,
    max_utf16_units: usize,
) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return None;
    }
    let mut chars = 0;
    let mut utf16_units = 0;
    Some(
        normalized
            .chars()
            .take_while(|character| {
                if chars >= max_chars {
                    return false;
                }
                let next = utf16_units + character.len_utf16();
                if next > max_utf16_units {
                    return false;
                }
                chars += 1;
                utf16_units = next;
                true
            })
            .collect(),
    )
}

fn citation_compute_node(record: &CitationNodeRecord) -> Map<String, Value> {
    let mut node = Map::from_iter([
        (
            "nodeId".into(),
            Value::String(record.literature_item_id.clone()),
        ),
        (
            "kind".into(),
            Value::String(citation_node_kind(record).into()),
        ),
    ]);
    if let Some(title) = bounded_citation_compute_text(
        &record.title,
        CITATION_GRAPH_COMPUTE_TITLE_MAX_CHARS,
        CITATION_GRAPH_COMPUTE_TEXT_MAX_UTF16,
    ) {
        node.insert("title".into(), Value::String(title));
    }
    if let Some(year) = bounded_citation_compute_text(
        &record.year,
        usize::MAX,
        CITATION_GRAPH_COMPUTE_TEXT_MAX_UTF16,
    ) {
        node.insert("year".into(), Value::String(year));
    }
    node
}

impl CitationGraphComputePort for NativeCitationGraphComputePort {
    fn build(
        &self,
        input: &Value,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationBuildOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphBuild,
            input.clone(),
        )?;
        let graph_hash = canonical_json_hash(&result)?;
        let updated_at = utc_now_iso8601();
        let metadata = input["references"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .filter_map(|row| {
                Some((
                    row["edgeId"].as_str()?.to_owned(),
                    (
                        row["targetId"].as_str().unwrap_or_default().to_owned(),
                        serde_json::to_string(&row["roles"]).ok()?,
                    ),
                ))
            })
            .collect::<std::collections::HashMap<_, _>>();
        let nodes = result["nodes"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let kind = row["kind"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?;
                Ok(CitationNodeRecord {
                    literature_item_id: row["nodeId"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    node_status: "active".into(),
                    has_zotero_binding: kind == "library_paper",
                    title: row["title"].as_str().unwrap_or_default().to_owned(),
                    year: row["year"].as_str().unwrap_or_default().to_owned(),
                    authors_json: serde_json::to_string(
                        row["authors"].as_array().unwrap_or(&Vec::new()),
                    )
                    .map_err(|_| "worker_result_invalid".to_owned())?,
                    summary_json: serde_json::to_string(&serde_json::json!({
                        "kind":kind,
                        "aliases":row["aliases"],
                        "cache_owner":"citation_graph_application",
                    }))
                    .map_err(|_| "worker_result_invalid".to_owned())?,
                    updated_at: updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let edges = result["resolvedEdges"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let edge_id = row["edgeId"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?;
                let edge_metadata = metadata.get(edge_id);
                Ok(CitationEdgeRecord {
                    edge_id: edge_id.to_owned(),
                    source_literature_item_id: row["sourceId"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    target_literature_item_id: row["targetId"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    reference_instance_id: row["referenceId"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    resolution_id: edge_metadata
                        .map(|metadata| metadata.0.clone())
                        .unwrap_or_default(),
                    edge_status: row["status"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    roles_json: edge_metadata
                        .map(|metadata| metadata.1.clone())
                        .unwrap_or_else(|| "[]".into()),
                    weight: row["weight"]
                        .as_f64()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?,
                    created_at: updated_at.clone(),
                    updated_at: updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let project_ownership = |row: &Value| -> Result<CitationSourceOwnershipRecord, String> {
            Ok(CitationSourceOwnershipRecord {
                source_literature_item_id: row["sourceId"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?
                    .to_owned(),
                edge_id: row["edgeId"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?
                    .to_owned(),
                reference_instance_id: row["referenceId"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?
                    .to_owned(),
                target_literature_item_id: row["targetId"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?
                    .to_owned(),
                edge_status: row["status"]
                    .as_str()
                    .ok_or_else(|| "worker_result_invalid".to_owned())?
                    .to_owned(),
                updated_at: updated_at.clone(),
            })
        };
        let ownership = result["sourceOwnership"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(project_ownership)
            .collect::<Result<Vec<_>, _>>()?;
        let incoming_groups = result["incomingGroups"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let ownership = project_ownership(row)?;
                Ok(CitationIncomingGroupRecord {
                    target_literature_item_id: ownership.target_literature_item_id,
                    source_literature_item_id: ownership.source_literature_item_id,
                    edge_id: ownership.edge_id,
                    reference_instance_id: ownership.reference_instance_id,
                    edge_status: ownership.edge_status,
                    updated_at: ownership.updated_at,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let source_structure_version = updated_at.parse::<i64>().unwrap_or_default();
        let light_metrics = result["lightMetrics"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let integer = |field: &str| {
                    row[field]
                        .as_i64()
                        .ok_or_else(|| "worker_result_invalid".to_owned())
                };
                Ok(CitationLightMetricsRecord {
                    literature_item_id: row["nodeId"]
                        .as_str()
                        .ok_or_else(|| "worker_result_invalid".to_owned())?
                        .to_owned(),
                    outgoing_count: integer("outgoingCount")?,
                    incoming_count: integer("incomingCount")?,
                    matched_outgoing_count: integer("matchedOutgoingCount")?,
                    unresolved_outgoing_count: integer("unresolvedOutgoingCount")?,
                    ambiguous_outgoing_count: integer("ambiguousOutgoingCount")?,
                    local_degree: integer("localDegree")?,
                    source_structure_version,
                    updated_at: updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let replacement = CitationGraphReplacement {
            state: CitationGraphApplicationStateRecord {
                graph_hash: graph_hash.clone(),
                input_hash: canonical_json_hash(input)?,
                metrics_hash: None,
                node_count: result["nodes"].as_array().map_or(0, |rows| rows.len()) as i64,
                edge_count: result["resolvedEdges"]
                    .as_array()
                    .map_or(0, |rows| rows.len()) as i64,
                updated_at,
            },
            nodes,
            edges,
            ownership,
            incoming_groups,
            light_metrics,
            complex_metrics: Vec::new(),
        };
        Ok(CitationBuildOutput {
            graph_hash,
            replacement,
        })
    }

    fn metrics(
        &self,
        graph_hash: &str,
        nodes: &[synthesis_repository::CitationNodeRecord],
        edges: &[synthesis_repository::CitationEdgeRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationMetricsOutput, String> {
        let request = serde_json::json!({
            "graphHash":graph_hash,
            "nodes":nodes.iter().map(|node| {
                let (library_id,item_key) = citation_paper_parts(&node.literature_item_id);
                let mut projected = citation_compute_node(node);
                if let Some(library_id) = library_id {
                    projected.insert("libraryId".into(), Value::from(library_id));
                }
                if let Some(item_key) = item_key {
                    projected.insert("itemKey".into(), Value::String(item_key));
                }
                Value::Object(projected)
            }).collect::<Vec<_>>(),
            "edges":edges.iter().map(|edge| serde_json::json!({
                "edgeId":edge.edge_id,
                "source":edge.source_literature_item_id,
                "target":edge.target_literature_item_id,
                "mentionCount":1,
            })).collect::<Vec<_>>(),
        });
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphMetrics,
            request,
        )?;
        let metrics_hash = canonical_json_hash(&result)?;
        let updated_at = utc_now_iso8601();
        let records = result
            .get("libraryNodeMetrics")
            .and_then(Value::as_array)
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let integer = |field: &str| {
                    row[field]
                        .as_f64()
                        .filter(|value| value.is_finite())
                        .map(|value| value.round() as i64)
                        .ok_or_else(|| "worker_result_invalid".to_owned())
                };
                let number = |field: &str| {
                    row[field]
                        .as_f64()
                        .filter(|value| value.is_finite())
                        .ok_or_else(|| "worker_result_invalid".to_owned())
                };
                Ok(CitationComplexMetricsRecord {
                    literature_item_id: row["nodeId"].as_str().unwrap_or_default().to_owned(),
                    node_id: row["nodeId"].as_str().unwrap_or_default().to_owned(),
                    paper_ref: row["paperRef"].as_str().unwrap_or_default().to_owned(),
                    item_key: row["itemKey"].as_str().unwrap_or_default().to_owned(),
                    title: row["title"].as_str().unwrap_or_default().to_owned(),
                    year: row["year"].as_str().unwrap_or_default().to_owned(),
                    internal_in_degree: integer("internalInDegree")?,
                    internal_out_degree: integer("internalOutDegree")?,
                    external_reference_count: integer("externalReferenceCount")?,
                    unresolved_reference_count: integer("unresolvedReferenceCount")?,
                    internal_pagerank: number("internalPagerank")?,
                    component_id: row["componentId"].as_str().unwrap_or_default().to_owned(),
                    component_size: integer("componentSize")?,
                    is_isolated: row["isIsolated"].as_bool().unwrap_or(false),
                    age_norm: number("ageNorm")?,
                    recency_norm: number("recencyNorm")?,
                    in_degree_norm: number("inDegreeNorm")?,
                    out_degree_norm: number("outDegreeNorm")?,
                    pagerank_norm: number("pagerankNorm")?,
                    foundation_score: number("foundationScore")?,
                    frontier_score: number("frontierScore")?,
                    synthesis_role_hints_json: serde_json::to_string(&row["synthesisRoleHints"])
                        .map_err(|_| "worker_result_invalid".to_owned())?,
                    source_structure_version: updated_at.parse().unwrap_or_default(),
                    source_graph_hash: graph_hash.to_owned(),
                    metrics_hash: metrics_hash.clone(),
                    status: "ready".into(),
                    updated_at: updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(CitationMetricsOutput {
            metrics_hash,
            records,
        })
    }

    fn layout(
        &self,
        request: &CitationLayoutRequest,
        nodes: &[synthesis_repository::CitationNodeRecord],
        edges: &[synthesis_repository::CitationEdgeRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationLayoutRecord, String> {
        let diagnostic = |stage: &'static str, status: &'static str| {
            NativeDiagnosticEvent::new("operation", stage, status)
                .capability("client.recomputeCitationGraphLayout")
                .algorithm(request.preset.clone())
                .graph_hash(request.expected_graph_hash.clone())
                .node_count(nodes.len())
                .edge_count(edges.len())
                .node_limit(CITATION_GRAPH_LAYOUT_NODE_MAX)
                .edge_limit(CITATION_GRAPH_LAYOUT_EDGE_MAX)
        };
        emit_debug(|| diagnostic("layout-worker-started", "started"));
        let started_at = Instant::now();
        let worker_request = serde_json::json!({
            "graphHash":request.expected_graph_hash,
            "algorithm":request.preset,
            "nodes":nodes.iter().map(|node| {
                let mut projected = citation_compute_node(node);
                projected.insert(
                    "initialX".into(),
                    Value::from(citation_initial_coordinate(&node.literature_item_id,"x")?),
                );
                projected.insert(
                    "initialY".into(),
                    Value::from(citation_initial_coordinate(&node.literature_item_id,"y")?),
                );
                Ok(Value::Object(projected))
            }).collect::<Result<Vec<Value>,String>>()?,
            "edges":edges.iter().map(|edge| serde_json::json!({
                "edgeId":edge.edge_id,
                "source":edge.source_literature_item_id,
                "target":edge.target_literature_item_id,
            })).collect::<Vec<_>>(),
        });
        let result: Value = match self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphLayout,
            worker_request,
        ) {
            Ok(result) => {
                emit_debug(|| {
                    diagnostic("layout-worker-completed", "succeeded")
                        .duration_ms(started_at.elapsed().as_millis() as u64)
                });
                result
            }
            Err(error) => {
                emit_debug(|| {
                    diagnostic("layout-worker-failed", "failed")
                        .code(error.clone())
                        .worker_code(error.clone())
                        .duration_ms(started_at.elapsed().as_millis() as u64)
                });
                return Err(error);
            }
        };
        let layout_nodes = result["nodes"]
            .as_array()
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|node| {
                let node_id = node["nodeId"]
                    .as_str()
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| "worker_result_invalid".to_owned())?;
                let x = node["x"]
                    .as_f64()
                    .filter(|value| value.is_finite())
                    .ok_or_else(|| "worker_result_invalid".to_owned())?;
                let y = node["y"]
                    .as_f64()
                    .filter(|value| value.is_finite())
                    .ok_or_else(|| "worker_result_invalid".to_owned())?;
                Ok((node_id.to_owned(), serde_json::json!({"x":x,"y":y})))
            })
            .collect::<Result<serde_json::Map<String, Value>, String>>()?;
        let layout_base = serde_json::json!({
            "graph_hash":result["graphHash"],
            "layout_engine":result["layoutEngine"],
            "layout_version":result["layoutVersion"],
            "algorithm":result["algorithm"],
            "preset":result["algorithm"],
            "params":result["params"],
            "nodes":layout_nodes,
        });
        let layout_hash = canonical_json_hash(&layout_base)?;
        let mut layout = layout_base
            .as_object()
            .cloned()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        layout.insert("layout_hash".into(), Value::String(layout_hash));
        let now = utc_now_iso8601();
        Ok(CitationLayoutRecord {
            layout_key: request.layout_key.clone(),
            view_key: request.view_key.clone(),
            preset: request.preset.clone(),
            graph_hash: request.expected_graph_hash.clone(),
            status: "ready".into(),
            layout_json: synthesis_protocol::canonical_json(&Value::Object(layout))
                .map_err(|_| "worker_result_invalid".to_owned())?,
            diagnostics_json: "[]".into(),
            created_at: now.clone(),
            updated_at: now,
        })
    }
}

struct NativeTagVocabularyComputePort {
    compute: Arc<NativeComputePool>,
}

fn tag_worker_entries(entries: &[TagVocabularyEntryRecord]) -> Result<Vec<Value>, String> {
    entries
        .iter()
        .map(|entry| {
            Ok(json!({
                "tag":entry.tag,
                "facet":entry.facet,
                "note":entry.note,
                "deprecated":entry.deprecated != 0,
                "replacement":entry.replacement,
                "aliases":serde_json::from_str::<Vec<Value>>(&entry.aliases_json)
                    .map_err(|_| "invalid_request")?,
                "abbrev":serde_json::from_str::<Vec<Value>>(&entry.abbrev_json)
                    .map_err(|_| "invalid_request")?,
            }))
        })
        .collect()
}

fn tag_worker_aliases(candidate: &TagVocabularyReplacement) -> Value {
    Value::Object(
        candidate
            .aliases
            .iter()
            .map(|record| (record.alias.clone(), Value::String(record.tag.clone())))
            .collect(),
    )
}

fn tag_worker_abbrevs(candidate: &TagVocabularyReplacement) -> Value {
    Value::Object(
        candidate
            .abbrevs
            .iter()
            .map(|record| {
                (
                    record.abbrev_key.clone(),
                    Value::String(record.abbrev_value.clone()),
                )
            })
            .collect(),
    )
}

fn tag_worker_protocol(protocol: &TagProtocolRecord) -> Result<Value, String> {
    Ok(json!({
        "tagPattern":protocol.tag_pattern,
        "maxTagLength":protocol.max_tag_length,
        "facets":serde_json::from_str::<Vec<Value>>(&protocol.facets_json)
            .map_err(|_| "invalid_request")?,
    }))
}

impl TagVocabularyComputePort for NativeTagVocabularyComputePort {
    fn validate(
        &self,
        candidate: &TagVocabularyReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagVocabularyReplacement, String> {
        let protocol = candidate
            .protocols
            .first()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let _: Value = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TagVocabularyValidate,
            serde_json::json!({
                "contractVersion":"synthesis-tag-vocabulary.v1",
                "algorithmVersion":"tag-vocabulary-validation.v1",
                "protocol":tag_worker_protocol(protocol)?,
                "entries":tag_worker_entries(&candidate.entries)?,
                "aliases":tag_worker_aliases(candidate),
                "abbrev":tag_worker_abbrevs(candidate),
            }),
        )?;
        Ok(candidate.clone())
    }

    fn build_index(
        &self,
        entries: &[TagVocabularyEntryRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagIndexOutput, String> {
        let facets = entries
            .iter()
            .map(|entry| entry.facet.clone())
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TagVocabularyIndex,
            serde_json::json!({
                "contractVersion":"synthesis-tag-vocabulary.v1",
                "algorithmVersion":"tag-vocabulary-index.v1",
                "sourceManifestHash":canonical_json_hash(&serde_json::json!(entries))?,
                "rebuiltAt":utc_now_iso8601(),
                "protocol":{
                    "tagPattern":"^.+:.+$",
                    "maxTagLength":512,
                    "facets":facets,
                },
                "entries":tag_worker_entries(entries)?,
                "aliases":{},
                "abbrev":{},
            }),
        )?;
        Ok(TagIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }
}

struct NativeConceptKbComputePort {
    compute: Arc<NativeComputePool>,
}

impl ConceptKbComputePort for NativeConceptKbComputePort {
    fn build_index(
        &self,
        snapshot: &synthesis_repository::ConceptKbReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<ConceptIndexOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::ConceptKbIndex,
            serde_json::json!({
                "contractVersion":"synthesis-concept-kb-index.v1",
                "algorithmVersion":"concept-kb-index.v1",
                "sourceManifestHash":snapshot.state.manifest_hash,
                "rebuiltAt":utc_now_iso8601(),
                "concepts":snapshot.concepts,
                "senses":snapshot.senses,
                "aliases":snapshot.aliases,
            }),
        )?;
        Ok(ConceptIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }

    fn query(
        &self,
        index_json: &str,
        request: &Value,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Value, String> {
        let index: Value =
            serde_json::from_str(index_json).map_err(|_| "concept_index_invalid".to_owned())?;
        self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::ConceptKbQuery,
            serde_json::json!({
                "contractVersion":"synthesis-concept-kb-index.v1",
                "algorithmVersion":"concept-kb-query.v1",
                "concepts":index.get("concepts").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "senses":index.get("senses").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "aliases":index.get("aliases").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "labels":request.get("labels").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
            }),
        )
    }
}

struct NativeTopicGraphComputePort {
    compute: Arc<NativeComputePool>,
}

impl TopicGraphComputePort for NativeTopicGraphComputePort {
    fn build_index(
        &self,
        snapshot: &TopicGraphReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TopicGraphIndexOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicGraphIndex,
            serde_json::json!({
                "contractVersion":"synthesis-topic-graph-index.v1",
                "algorithmVersion":"topic-graph-index.v1",
                "sourceManifestHash":snapshot.state.manifest_hash,
                "rebuiltAt":utc_now_iso8601(),
                "nodes":snapshot.nodes,
                "edges":snapshot.edges,
            }),
        )?;
        Ok(TopicGraphIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }
}

struct NativeReferenceMatcherPort {
    compute: Arc<NativeComputePool>,
}

impl ReferenceMatcherPort for NativeReferenceMatcherPort {
    fn match_pass(
        &self,
        pass: ReferenceMatchPass,
        input: &ReferenceMatcherInput,
    ) -> Result<Vec<ReferenceMatcherOutcome>, String> {
        let (operation, request) = reference_matcher_request(pass, input)?;
        let result = self.compute.run_direct(operation, request)?;
        reference_matcher_outcomes(pass, input, &result)
    }
}

type RawReferenceGroups<'a> = BTreeMap<String, Vec<&'a RawReferenceRecord>>;

struct MatcherProjection<'a> {
    canonicals: BTreeMap<String, &'a CanonicalReferenceRecord>,
    redirects: BTreeMap<String, String>,
    groups: RawReferenceGroups<'a>,
    sticky: BTreeSet<String>,
}

fn matcher_error() -> String {
    "worker_result_invalid".to_owned()
}

fn string_array(value: Option<&Value>) -> Result<Vec<String>, String> {
    value
        .and_then(Value::as_array)
        .ok_or_else(matcher_error)?
        .iter()
        .map(|value| value.as_str().map(str::to_owned).ok_or_else(matcher_error))
        .collect()
}

fn stored_string_array(source: &str) -> Result<Vec<String>, String> {
    if source.trim().is_empty() {
        return Ok(Vec::new());
    }
    let value: Value = serde_json::from_str(source).map_err(|_| matcher_error())?;
    string_array(Some(&value))
}

fn matcher_confidence(value: &str) -> Result<ReferenceMatchConfidence, String> {
    match value {
        "deterministic" => Ok(ReferenceMatchConfidence::Deterministic),
        "high" => Ok(ReferenceMatchConfidence::High),
        "low" => Ok(ReferenceMatchConfidence::Low),
        "review" => Ok(ReferenceMatchConfidence::Review),
        _ => Err(matcher_error()),
    }
}

fn diagnostic_objects(value: Option<&Value>) -> Result<Vec<Value>, String> {
    let values = value.and_then(Value::as_array).ok_or_else(matcher_error)?;
    if values.iter().any(|value| !value.is_object()) {
        return Err(matcher_error());
    }
    Ok(values.clone())
}

fn canonical_records(
    input: &ReferenceMatcherInput,
) -> Result<BTreeMap<String, &CanonicalReferenceRecord>, String> {
    let mut records = BTreeMap::new();
    for record in &input.canonicals {
        if record.canonical_reference_id.is_empty()
            || records
                .insert(record.canonical_reference_id.clone(), record)
                .is_some()
        {
            return Err(matcher_error());
        }
    }
    Ok(records)
}

fn redirect_map(input: &ReferenceMatcherInput) -> Result<BTreeMap<String, String>, String> {
    let canonicals = canonical_records(input)?;
    let mut redirects = BTreeMap::new();
    for redirect in &input.redirects {
        if redirect.from_canonical_reference_id.is_empty()
            || redirect.to_canonical_reference_id.is_empty()
            || redirect.from_canonical_reference_id == redirect.to_canonical_reference_id
        {
            return Err(matcher_error());
        }
        if let Some(previous) = redirects.insert(
            redirect.from_canonical_reference_id.clone(),
            redirect.to_canonical_reference_id.clone(),
        ) && previous != redirect.to_canonical_reference_id
        {
            return Err(matcher_error());
        }
    }
    for id in redirects.keys() {
        resolve_matcher_canonical(id, &redirects, &canonicals)?;
    }
    Ok(redirects)
}

fn resolve_matcher_canonical(
    id: &str,
    redirects: &BTreeMap<String, String>,
    canonicals: &BTreeMap<String, &CanonicalReferenceRecord>,
) -> Result<String, String> {
    if !canonicals.contains_key(id) && !redirects.contains_key(id) {
        return Err(matcher_error());
    }
    let mut current = id;
    let mut seen = HashSet::new();
    while let Some(next) = redirects.get(current) {
        if !seen.insert(current.to_owned()) {
            return Err(matcher_error());
        }
        current = next;
    }
    canonicals
        .contains_key(current)
        .then(|| current.to_owned())
        .ok_or_else(matcher_error)
}

fn matcher_groups<'a>(input: &'a ReferenceMatcherInput) -> Result<MatcherProjection<'a>, String> {
    let canonicals = canonical_records(input)?;
    let redirects = redirect_map(input)?;
    let mut excluded = BTreeSet::new();
    for binding in input
        .bindings
        .iter()
        .filter(|binding| binding.status == "accepted")
    {
        excluded.insert(resolve_matcher_canonical(
            &binding.canonical_reference_id,
            &redirects,
            &canonicals,
        )?);
    }
    for id in &input.accepted_binding_canonical_ids {
        excluded.insert(resolve_matcher_canonical(id, &redirects, &canonicals)?);
    }
    let mut sticky = BTreeSet::new();
    for source in redirects.keys() {
        sticky.insert(resolve_matcher_canonical(source, &redirects, &canonicals)?);
    }
    let mut groups = BTreeMap::<String, Vec<&RawReferenceRecord>>::new();
    for raw in input
        .raw_references
        .iter()
        .filter(|raw| raw.status == "active")
    {
        let effective =
            resolve_matcher_canonical(&raw.canonical_reference_id, &redirects, &canonicals)?;
        if !excluded.contains(&effective) {
            groups.entry(effective).or_default().push(raw);
        }
    }
    for rows in groups.values_mut() {
        rows.sort_by(|left, right| {
            left.source_ref
                .cmp(&right.source_ref)
                .then_with(|| left.reference_index.cmp(&right.reference_index))
                .then_with(|| left.raw_reference_id.cmp(&right.raw_reference_id))
        });
    }
    Ok(MatcherProjection {
        canonicals,
        redirects,
        groups,
        sticky,
    })
}

fn matcher_papers(input: &ReferenceMatcherInput) -> Result<Vec<Value>, String> {
    let mut papers = input
        .host_candidates
        .iter()
        .map(|candidate| {
            let paper_ref = format!("{}:{}", candidate.library_id, candidate.item_key);
            (
                paper_ref.clone(),
                json!({
                    "paperRef":paper_ref,
                    "itemKey":candidate.item_key,
                    "title":candidate.title,
                    "year":candidate.year,
                    "authors":candidate.authors,
                    "doi":candidate.doi,
                    "arxiv":candidate.arxiv,
                    "isbn":candidate.isbn,
                    "url":candidate.url,
                    "citekey":candidate.citekey,
                }),
            )
        })
        .collect::<Vec<_>>();
    papers.sort_by(|left, right| left.0.cmp(&right.0));
    if papers.windows(2).any(|pair| pair[0].0 == pair[1].0) {
        return Err(matcher_error());
    }
    Ok(papers.into_iter().map(|(_, value)| value).collect())
}

fn binding_request(input: &ReferenceMatcherInput) -> Result<Value, String> {
    let projection = matcher_groups(input)?;
    let references = projection
        .groups
        .iter()
        .map(|(canonical_id, rows)| {
            let representative = rows.first().ok_or_else(matcher_error)?;
            Ok(json!({
                "canonicalReferenceId":canonical_id,
                "reference":{
                    "referenceInstanceId":representative.raw_reference_id,
                    "parsedTitle":representative.parsed_title,
                    "normalizedTitle":representative.normalized_title,
                    "year":representative.year,
                    "authors":stored_string_array(&representative.authors_json)?,
                    "rawReference":representative.raw_reference,
                }
            }))
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(json!({
        "contractVersion":REFERENCE_MATCHER_CONTRACT_VERSION,
        "algorithmVersion":BINDING_ALGORITHM_VERSION,
        "policyId":"production",
        "papers":matcher_papers(input)?,
        "references":references,
    }))
}

fn stored_identifiers(source: &str) -> Result<Vec<Value>, String> {
    if source.trim().is_empty() {
        return Ok(Vec::new());
    }
    let parsed: Value = serde_json::from_str(source).map_err(|_| matcher_error())?;
    let mut values = BTreeSet::<(String, String)>::new();
    match parsed {
        Value::Object(object) => {
            for (kind, value) in object {
                let entries = match value {
                    Value::String(value) => vec![value],
                    Value::Array(values) => values
                        .into_iter()
                        .map(|value| value.as_str().map(str::to_owned).ok_or_else(matcher_error))
                        .collect::<Result<Vec<_>, _>>()?,
                    _ => return Err(matcher_error()),
                };
                for value in entries {
                    let value = value.trim();
                    if !value.is_empty() {
                        values.insert((kind.clone(), value.to_owned()));
                    }
                }
            }
        }
        Value::Array(rows) => {
            for row in rows {
                let row = row.as_object().ok_or_else(matcher_error)?;
                let kind = row.get("kind").and_then(Value::as_str).unwrap_or("").trim();
                let value = row
                    .get("value")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .trim();
                if kind.is_empty() || value.is_empty() {
                    return Err(matcher_error());
                }
                values.insert((kind.to_owned(), value.to_owned()));
            }
        }
        _ => return Err(matcher_error()),
    }
    Ok(values
        .into_iter()
        .map(|(kind, value)| json!({"kind":kind,"value":value}))
        .collect())
}

fn dedupe_title_candidates(
    effective_id: &str,
    rows: &[&RawReferenceRecord],
    canonicals: &BTreeMap<String, &CanonicalReferenceRecord>,
    redirects: &BTreeMap<String, String>,
) -> Result<Vec<Value>, String> {
    let mut candidates = Vec::new();
    let effective = canonicals.get(effective_id).ok_or_else(matcher_error)?;
    if !effective.title.trim().is_empty() {
        candidates.push(json!({
            "title":effective.title,
            "normalizedTitle":effective.normalized_title,
            "year":effective.year,
            "authors":stored_string_array(&effective.authors_json)?,
            "identifiers":stored_identifiers(&effective.identifiers_json)?,
            "source":"effective_canonical",
            "sourceCanonicalReferenceId":effective_id,
            "frequency":rows.len(),
        }));
    }
    let mut physical_ids = rows
        .iter()
        .map(|raw| raw.canonical_reference_id.clone())
        .collect::<BTreeSet<_>>();
    physical_ids.insert(effective_id.to_owned());
    for id in physical_ids {
        if resolve_matcher_canonical(&id, redirects, canonicals)? != effective_id {
            return Err(matcher_error());
        }
        let Some(canonical) = canonicals.get(&id) else {
            continue;
        };
        let raw_ids = rows
            .iter()
            .filter(|raw| raw.canonical_reference_id == id)
            .map(|raw| raw.raw_reference_id.clone())
            .collect::<Vec<_>>();
        if !canonical.title.trim().is_empty() {
            candidates.push(json!({
                "title":canonical.title,
                "normalizedTitle":canonical.normalized_title,
                "year":canonical.year,
                "authors":stored_string_array(&canonical.authors_json)?,
                "identifiers":stored_identifiers(&canonical.identifiers_json)?,
                "rawReferenceIds":raw_ids,
                "source":"physical_canonical",
                "sourceCanonicalReferenceId":id,
                "frequency":rows.iter().filter(|raw| raw.canonical_reference_id == id).count().max(1),
            }));
        }
    }
    let mut raw_groups = BTreeMap::<(String, String), Vec<&RawReferenceRecord>>::new();
    for raw in rows {
        if raw.parsed_title.trim().is_empty() {
            continue;
        }
        let title = if raw.normalized_title.is_empty() {
            raw.parsed_title.clone()
        } else {
            raw.normalized_title.clone()
        };
        raw_groups
            .entry((title, raw.year.clone()))
            .or_default()
            .push(*raw);
    }
    for ((normalized_title, year), grouped) in raw_groups {
        let representative = grouped.first().ok_or_else(matcher_error)?;
        let mut raw_ids = Vec::new();
        for raw in &grouped {
            raw_ids.push(raw.raw_reference_id.clone());
        }
        candidates.push(json!({
            "title":representative.parsed_title,
            "normalizedTitle":normalized_title,
            "year":year,
            "authors":stored_string_array(&representative.authors_json)?,
            "rawReferenceIds":raw_ids,
            "source":"raw_reference",
            "frequency":grouped.len(),
        }));
    }
    candidates.truncate(16);
    Ok(candidates)
}

fn dedupe_request(input: &ReferenceMatcherInput) -> Result<Value, String> {
    let projection = matcher_groups(input)?;
    let canonical_rows = projection
        .groups
        .iter()
        .map(|(effective_id, rows)| {
            let effective = projection
                .canonicals
                .get(effective_id)
                .ok_or_else(matcher_error)?;
            let mut identifiers = BTreeSet::new();
            let mut physical_ids = rows
                .iter()
                .map(|raw| raw.canonical_reference_id.clone())
                .collect::<BTreeSet<_>>();
            physical_ids.insert(effective_id.clone());
            for id in &physical_ids {
                let Some(canonical) = projection.canonicals.get(id) else {
                    continue;
                };
                for identifier in stored_identifiers(&canonical.identifiers_json)? {
                    let object = identifier.as_object().ok_or_else(matcher_error)?;
                    identifiers.insert((
                        object.get("kind").and_then(Value::as_str).unwrap_or("").to_owned(),
                        object.get("value").and_then(Value::as_str).unwrap_or("").to_owned(),
                    ));
                }
            }
            let raw_reference_ids = rows.iter().map(|raw| raw.raw_reference_id.clone()).collect::<BTreeSet<_>>();
            let raw_hashes = rows.iter().map(|raw| raw.raw_hash.clone()).collect::<BTreeSet<_>>();
            let raw_references = rows.iter().map(|raw| raw.raw_reference.clone()).collect::<BTreeSet<_>>();
            let source_refs = rows.iter().map(|raw| raw.source_ref.clone()).collect::<BTreeSet<_>>();
            let mut authors = stored_string_array(&effective.authors_json)?
                .into_iter()
                .collect::<BTreeSet<_>>();
            for raw in rows {
                authors.extend(stored_string_array(&raw.authors_json)?);
            }
            let first = rows.first().ok_or_else(matcher_error)?;
            let title = if effective.title.trim().is_empty() {
                first.parsed_title.clone()
            } else {
                effective.title.clone()
            };
            let normalized_title = if effective.normalized_title.trim().is_empty() {
                first.normalized_title.clone()
            } else {
                effective.normalized_title.clone()
            };
            let year = if effective.year.trim().is_empty() {
                first.year.clone()
            } else {
                effective.year.clone()
            };
            Ok(json!({
                "canonicalReferenceId":effective_id,
                "title":title,
                "normalizedTitle":normalized_title,
                "year":year,
                "authors":authors,
                "identifiers":identifiers.into_iter().map(|(kind,value)| json!({"kind":kind,"value":value})).collect::<Vec<_>>(),
                "rawReferenceIds":raw_reference_ids,
                "rawHashes":raw_hashes,
                "rawReferences":raw_references,
                "sourceRefs":source_refs,
                "acceptedBinding":false,
                "stickyRepresentative":projection.sticky.contains(effective_id),
                "titleCandidates":dedupe_title_candidates(
                    effective_id,
                    rows,
                    &projection.canonicals,
                    &projection.redirects,
                )?,
            }))
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(json!({
        "contractVersion":REFERENCE_MATCHER_CONTRACT_VERSION,
        "algorithmVersion":DEDUPE_ALGORITHM_VERSION,
        "canonicals":canonical_rows,
    }))
}

fn reference_matcher_request(
    pass: ReferenceMatchPass,
    input: &ReferenceMatcherInput,
) -> Result<(crate::runtime_worker_pool::WorkerOperation, Value), String> {
    match pass {
        ReferenceMatchPass::LibraryBinding => Ok((
            crate::runtime_worker_pool::WorkerOperation::ReferenceBinding,
            binding_request(input)?,
        )),
        ReferenceMatchPass::CanonicalRedirect => Ok((
            crate::runtime_worker_pool::WorkerOperation::ReferenceCanonicalDedupe,
            dedupe_request(input)?,
        )),
    }
}

fn binding_outcomes(
    input: &ReferenceMatcherInput,
    result: &Value,
) -> Result<Vec<ReferenceMatcherOutcome>, String> {
    if result.get("contractVersion").and_then(Value::as_str)
        != Some(REFERENCE_MATCHER_CONTRACT_VERSION)
        || result.get("algorithmVersion").and_then(Value::as_str) != Some(BINDING_ALGORITHM_VERSION)
        || result.get("policyId").and_then(Value::as_str) != Some("production")
    {
        return Err(matcher_error());
    }
    let projection = matcher_groups(input)?;
    let papers = input
        .host_candidates
        .iter()
        .map(|candidate| {
            (
                format!("{}:{}", candidate.library_id, candidate.item_key),
                (candidate.library_id, candidate.item_key.clone()),
            )
        })
        .collect::<BTreeMap<_, _>>();
    let matches = result
        .get("matches")
        .and_then(Value::as_array)
        .ok_or_else(matcher_error)?;
    let mut seen = BTreeSet::new();
    let mut outcomes = Vec::new();
    for entry in matches {
        let entry = entry.as_object().ok_or_else(matcher_error)?;
        let canonical_id = entry
            .get("canonicalReferenceId")
            .and_then(Value::as_str)
            .ok_or_else(matcher_error)?;
        let source_rows = projection
            .groups
            .get(canonical_id)
            .ok_or_else(matcher_error)?;
        if !seen.insert(canonical_id.to_owned()) {
            return Err(matcher_error());
        }
        let decision = entry
            .get("result")
            .and_then(Value::as_object)
            .ok_or_else(matcher_error)?;
        let status = decision.get("status").and_then(Value::as_str).unwrap_or("");
        let confidence = matcher_confidence(
            decision
                .get("confidence")
                .and_then(Value::as_str)
                .unwrap_or(""),
        )?;
        let diagnostics = diagnostic_objects(decision.get("diagnostics"))?;
        let candidates = decision
            .get("suggestedCandidates")
            .and_then(Value::as_array)
            .ok_or_else(matcher_error)?;
        let disposition = match status {
            "unmatched" if candidates.is_empty() => continue,
            "matched"
                if candidates.len() == 1
                    && matches!(
                        confidence,
                        ReferenceMatchConfidence::Deterministic | ReferenceMatchConfidence::High
                    ) =>
            {
                ReferenceMatchDisposition::Accept
            }
            "suggested" | "ambiguous" if candidates.len() <= 3 => ReferenceMatchDisposition::Review,
            _ => return Err(matcher_error()),
        };
        for candidate in candidates.iter().take(3) {
            let candidate = candidate.as_object().ok_or_else(matcher_error)?;
            let paper_ref = candidate
                .get("paperRef")
                .and_then(Value::as_str)
                .ok_or_else(matcher_error)?;
            let (library_id, item_key) = papers.get(paper_ref).ok_or_else(matcher_error)?;
            let score = candidate
                .get("score")
                .and_then(Value::as_f64)
                .ok_or_else(matcher_error)?;
            let evidence = candidate
                .get("evidence")
                .cloned()
                .ok_or_else(matcher_error)?;
            if !score.is_finite() || !(0.0..=1.0).contains(&score) || !evidence.is_object() {
                return Err(matcher_error());
            }
            outcomes.push(ReferenceMatcherOutcome {
                semantic_key: format!("binding::{canonical_id}::{library_id}::{item_key}"),
                kind: ReferenceMatchKind::Binding,
                disposition,
                confidence,
                source_canonical_reference_id: canonical_id.to_owned(),
                source_raw_reference_ids: source_rows
                    .iter()
                    .map(|raw| raw.raw_reference_id.clone())
                    .collect(),
                target_canonical_reference_id: String::new(),
                target_library_id: *library_id,
                target_item_key: item_key.clone(),
                score,
                reasons: string_array(candidate.get("reasons"))?,
                evidence,
                diagnostics: diagnostics.clone(),
            });
        }
    }
    if seen.len() != projection.groups.len() {
        return Err(matcher_error());
    }
    Ok(outcomes)
}

fn merge_evidence_field(
    evidence: &mut Map<String, Value>,
    key: &str,
    value: Value,
) -> Result<(), String> {
    if let Some(existing) = evidence.get(key)
        && existing != &value
    {
        return Err(matcher_error());
    }
    evidence.insert(key.to_owned(), value);
    Ok(())
}

fn dedupe_outcomes(
    input: &ReferenceMatcherInput,
    result: &Value,
) -> Result<Vec<ReferenceMatcherOutcome>, String> {
    if result.get("contractVersion").and_then(Value::as_str)
        != Some(REFERENCE_MATCHER_CONTRACT_VERSION)
        || result.get("algorithmVersion").and_then(Value::as_str) != Some(DEDUPE_ALGORITHM_VERSION)
    {
        return Err(matcher_error());
    }
    let projection = matcher_groups(input)?;
    let diagnostics = diagnostic_objects(result.get("diagnostics"))?;
    let actions = result
        .get("actions")
        .and_then(Value::as_array)
        .ok_or_else(matcher_error)?;
    let mut action_ids = BTreeSet::new();
    let mut outcomes = Vec::new();
    for action in actions {
        let action = action.as_object().ok_or_else(matcher_error)?;
        let action_id = action.get("actionId").and_then(Value::as_str).unwrap_or("");
        let source = action
            .get("sourceCanonicalReferenceId")
            .and_then(Value::as_str)
            .unwrap_or("");
        let target = action
            .get("targetCanonicalReferenceId")
            .and_then(Value::as_str)
            .unwrap_or("");
        if action_id.is_empty()
            || !action_ids.insert(action_id.to_owned())
            || source == target
            || !projection.groups.contains_key(source)
            || !projection.groups.contains_key(target)
        {
            return Err(matcher_error());
        }
        let action_name = action
            .get("action")
            .and_then(Value::as_str)
            .ok_or_else(matcher_error)?;
        let (disposition, expected_confidence) = match action_name {
            "redirect" => (ReferenceMatchDisposition::Accept, None),
            "review" => (
                ReferenceMatchDisposition::Review,
                Some(ReferenceMatchConfidence::Review),
            ),
            _ => return Err(matcher_error()),
        };
        let confidence = matcher_confidence(
            action
                .get("confidence")
                .and_then(Value::as_str)
                .unwrap_or(""),
        )?;
        if expected_confidence.is_some_and(|expected| confidence != expected) {
            return Err(matcher_error());
        }
        let score = action
            .get("score")
            .and_then(Value::as_f64)
            .ok_or_else(matcher_error)?;
        if !score.is_finite() || !(0.0..=1.0).contains(&score) {
            return Err(matcher_error());
        }
        let reasons = string_array(action.get("reasons"))?;
        let cluster_id = action
            .get("clusterId")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(matcher_error)?;
        let edge_type = action
            .get("edgeType")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(matcher_error)?;
        let retarget = reasons
            .iter()
            .any(|reason| reason == "representative_retarget_review");
        let mut evidence = action
            .get("evidence")
            .and_then(Value::as_object)
            .cloned()
            .ok_or_else(matcher_error)?;
        for key in [
            "actionId",
            "clusterId",
            "subclusterId",
            "edgeType",
            "riskSignals",
        ] {
            merge_evidence_field(
                &mut evidence,
                key,
                action.get(key).cloned().ok_or_else(matcher_error)?,
            )?;
        }
        outcomes.push(ReferenceMatcherOutcome {
            semantic_key: [
                action_name,
                source,
                target,
                cluster_id,
                edge_type,
                if retarget {
                    "representative_retarget_review"
                } else {
                    ""
                },
            ]
            .join("::"),
            kind: ReferenceMatchKind::Redirect,
            disposition,
            confidence,
            source_canonical_reference_id: source.to_owned(),
            source_raw_reference_ids: projection.groups[source]
                .iter()
                .map(|raw| raw.raw_reference_id.clone())
                .collect(),
            target_canonical_reference_id: target.to_owned(),
            target_library_id: 0,
            target_item_key: String::new(),
            score,
            reasons,
            evidence: Value::Object(evidence),
            diagnostics: diagnostics.clone(),
        });
    }
    Ok(outcomes)
}

fn reference_matcher_outcomes(
    pass: ReferenceMatchPass,
    input: &ReferenceMatcherInput,
    result: &Value,
) -> Result<Vec<ReferenceMatcherOutcome>, String> {
    match pass {
        ReferenceMatchPass::LibraryBinding => binding_outcomes(input, result),
        ReferenceMatchPass::CanonicalRedirect => dedupe_outcomes(input, result),
    }
}

pub(crate) struct ReverseHostApplicationPort {
    config: Option<Arc<NativeLaunchConfig>>,
    service_instance_id: String,
}

struct NativeReferenceObservationPort;

impl ReferenceObservationPort for NativeReferenceObservationPort {
    fn emit(&self, observation: ReferenceObservation) {
        let mut event =
            NativeDiagnosticEvent::new("operation", observation.phase, observation.status);
        if let Some(code) = observation.code {
            event = event.code(code);
        }
        for (key, value) in observation.fields {
            match key.as_str() {
                "capability" => {
                    if let Some(value) = value.as_str() {
                        event = event.capability(value);
                    }
                }
                "operationId" => {
                    if let Some(value) = value.as_str() {
                        event = event.operation_id(value);
                    }
                }
                "semanticStatus" => {
                    if let Some(value) = value.as_str() {
                        event = event.mutation_status(value);
                    }
                }
                "matchingHash" => {
                    if let Some(value) = value.as_str() {
                        event = event.matching_hash(value);
                    }
                }
                "returned" => {
                    if let Some(value) = value.as_u64() {
                        event = event.returned(value as usize);
                    }
                }
                "payloadCount" => {
                    if let Some(value) = value.as_u64() {
                        event = event.payload_count(value as usize);
                    }
                }
                "total" => {
                    if let Some(value) = value.as_u64() {
                        event = event.total(value as usize);
                    }
                }
                "sourceCount" => {
                    if let Some(value) = value.as_u64() {
                        event = event.source_count(value as usize);
                    }
                }
                "page" => {
                    if let Some(value) = value.as_u64() {
                        event = event.page(value as usize);
                    }
                }
                "batchOrdinal" => {
                    if let Some(value) = value.as_u64() {
                        event = event.batch_ordinal(value as usize);
                    }
                }
                "actualBytes" => {
                    if let Some(value) = value.as_u64() {
                        event = event.actual_bytes(value as usize);
                    }
                }
                "limitBytes" => {
                    if let Some(value) = value.as_u64() {
                        event = event.limit_bytes(value as usize);
                    }
                }
                "actualJsonNodes" => {
                    if let Some(value) = value.as_u64() {
                        event = event.actual_json_nodes(value as usize);
                    }
                }
                "limitJsonNodes" => {
                    if let Some(value) = value.as_u64() {
                        event = event.limit_json_nodes(value as usize);
                    }
                }
                "proposalCount" => {
                    if let Some(value) = value.as_u64() {
                        event = event.proposal_created_count(value as usize);
                    }
                }
                "factCount" => {
                    if let Some(value) = value.as_u64() {
                        event = event.fact_count(value as usize);
                    }
                }
                "warningCount" => {
                    if let Some(value) = value.as_u64() {
                        event = event.warning_count(value as usize);
                    }
                }
                _ => {}
            }
        }
        emit_debug(|| event);
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReverseHostEffectReceiptDto {
    effect_id: String,
    action: String,
    status: String,
    occurred_at: String,
    diagnostics: Vec<HostEffectDiagnostic>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReverseHostEffectBatchResultDto {
    receipts: Vec<ReverseHostEffectReceiptDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReverseHostItemRefDto {
    library_id: i64,
    item_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReverseHostResolvedBindingDto {
    item_id: i64,
    r#ref: ReverseHostItemRefDto,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReverseHostBindingResolutionDto {
    resolved: Vec<ReverseHostResolvedBindingDto>,
    missing_item_ids: Vec<i64>,
    diagnostics: Vec<HostEffectDiagnostic>,
}

impl ReverseHostApplicationPort {
    fn call(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let config = self
            .config
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(config, &self.service_instance_id, capability, payload)
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ReverseHostTagAuditStatesDto {
    states: Vec<TagAuditFreshState>,
}

impl TagAuditFreshStatePort for ReverseHostApplicationPort {
    fn read(&self, targets: &[TagAuditItemRef]) -> Result<Vec<TagAuditFreshState>, String> {
        if targets.len() > 500 {
            return Err("invalid_request".into());
        }
        let result: ReverseHostTagAuditStatesDto = serde_json::from_value(self.call(
            "library.items.get_audit_state",
            serde_json::json!({"targets": targets}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())?;
        Ok(result.states)
    }
}

impl HostItemCollectionPort for ReverseHostApplicationPort {
    fn list_items_page(
        &self,
        cursor: &str,
        limit: usize,
    ) -> Result<ReferenceHostItemsPage, String> {
        serde_json::from_value(self.call(
            "library.items.list_page",
            serde_json::json!({"cursor":cursor,"limit":limit}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".into())
    }

    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<ReferenceHostItemsByRef, String> {
        serde_json::from_value(self.call(
            "library.items.get_by_ref",
            serde_json::json!({"paperRefs":paper_refs}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".into())
    }
}

impl ReferenceHostPort for ReverseHostApplicationPort {
    fn list_items_page(
        &self,
        cursor: &str,
        limit: usize,
    ) -> Result<ReferenceHostItemsPage, String> {
        HostItemCollectionPort::list_items_page(self, cursor, limit)
    }

    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<ReferenceHostItemsByRef, String> {
        HostItemCollectionPort::get_items_by_ref(self, paper_refs)
    }

    fn scan_artifacts_page(
        &self,
        cursor: &str,
        limit: usize,
        paper_refs: &[String],
        artifact_types: &[&str],
    ) -> Result<ReferenceHostArtifactsPage, String> {
        serde_json::from_value(self.call(
            "library.artifacts.scan_page",
            serde_json::json!({
                "cursor":cursor,
                "limit":limit,
                "paperRefs":paper_refs,
                "artifactTypes":artifact_types,
            }),
        )?)
        .map_err(|_| "reverse_host_result_invalid".into())
    }

    fn read_artifact(
        &self,
        locator: &str,
        expected_hash: &str,
    ) -> Result<ReferenceHostArtifactRead, String> {
        serde_json::from_value(self.call(
            "library.artifacts.read",
            serde_json::json!({"locator":locator,"expectedHash":expected_hash}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".into())
    }
}

impl TopicDigestArtifactReadPort for ReverseHostApplicationPort {
    fn read(
        &self,
        locator: &str,
        expected_hash: &str,
    ) -> Result<TopicDigestArtifactReadResult, String> {
        serde_json::from_value(self.call(
            "library.artifacts.read",
            serde_json::json!({"locator":locator,"expectedHash":expected_hash}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".into())
    }
}

impl RepresentativeImageReadPort for ReverseHostApplicationPort {
    fn read(
        &self,
        library_id: i64,
        note_key: &str,
    ) -> Result<RepresentativeImageHostResult, RepresentativeImageReadFailure> {
        let result = self
            .call(
                "library.representative_image.read",
                serde_json::json!({"libraryId":library_id,"noteKey":note_key}),
            )
            .map_err(|_| RepresentativeImageReadFailure::Transport)?;
        serde_json::from_value(result).map_err(|_| RepresentativeImageReadFailure::Invalid)
    }
}

impl TagHostEffectPort for ReverseHostApplicationPort {
    fn apply_batch(
        &self,
        effects: &[TagEffectRecord],
    ) -> Result<Vec<TagHostEffectReceipt>, String> {
        if effects.is_empty() || effects.len() > 100 {
            return Err("invalid_request".into());
        }
        let result: ReverseHostEffectBatchResultDto = serde_json::from_value(self.call(
            "effects.tags.apply_batch",
            serde_json::json!({
                "effects":effects.iter().map(|effect| serde_json::json!({
                    "effectId":effect.effect_id,
                    "action":"ensure_present",
                    "target":{"libraryId":effect.library_id,"itemKey":effect.item_key},
                    "tag":effect.tag,
                    "provenance":{"kind":"staged_tag_promotion"},
                    "precondition":{"target":"exists"},
                    "permission":{"scope":"synthesis.tags","reason":"promote_staged_tag"},
                })).collect::<Vec<_>>(),
            }),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())?;
        if result.receipts.len() != effects.len() {
            return Err("reverse_host_result_invalid".into());
        }
        let expected = effects
            .iter()
            .map(|effect| effect.effect_id.as_str())
            .collect::<HashSet<_>>();
        let mut seen = HashSet::new();
        result
            .receipts
            .into_iter()
            .map(|receipt| {
                if !expected.contains(receipt.effect_id.as_str())
                    || !seen.insert(receipt.effect_id.clone())
                    || receipt.action != "ensure_present"
                {
                    return Err("reverse_host_result_invalid".into());
                }
                if !matches!(
                    receipt.status.as_str(),
                    "applied" | "already_satisfied" | "not_found" | "failed"
                ) || synthesis_protocol::unix_millis_from_utc_iso8601(&receipt.occurred_at)
                    .is_none()
                    || receipt.diagnostics.len() > 20
                {
                    return Err("reverse_host_result_invalid".into());
                }
                Ok(TagHostEffectReceipt {
                    effect_id: receipt.effect_id,
                    status: receipt.status,
                    occurred_at: receipt.occurred_at,
                    diagnostics: receipt.diagnostics,
                })
            })
            .collect()
    }
}

impl RelatedItemsHostEffectPort for ReverseHostApplicationPort {
    fn apply_batch(
        &self,
        effects: &[RelatedItemsHostEffect],
    ) -> Result<Vec<RelatedItemsHostReceipt>, String> {
        if effects.is_empty() || effects.len() > 25 {
            return Err("invalid_request".into());
        }
        let result: ReverseHostEffectBatchResultDto = serde_json::from_value(self.call(
            "effects.related_items.apply_batch",
            serde_json::json!({"effects":effects}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())?;
        if result.receipts.len() != effects.len() {
            return Err("reverse_host_result_invalid".into());
        }
        let expected = effects
            .iter()
            .map(|effect| (effect.effect_id.as_str(), effect.action.as_str()))
            .collect::<BTreeMap<_, _>>();
        let mut seen = HashSet::new();
        result
            .receipts
            .into_iter()
            .map(|receipt| {
                if expected.get(receipt.effect_id.as_str()) != Some(&receipt.action.as_str())
                    || !seen.insert(receipt.effect_id.clone())
                    || !matches!(
                        receipt.status.as_str(),
                        "applied" | "already_satisfied" | "not_found" | "failed"
                    )
                    || synthesis_protocol::unix_millis_from_utc_iso8601(&receipt.occurred_at)
                        .is_none()
                    || receipt.diagnostics.len() > 20
                {
                    return Err("reverse_host_result_invalid".into());
                }
                Ok(RelatedItemsHostReceipt {
                    effect_id: receipt.effect_id,
                    action: receipt.action,
                    status: receipt.status,
                    occurred_at: receipt.occurred_at,
                    diagnostics: receipt.diagnostics,
                })
            })
            .collect()
    }
}

impl TagLegacyBindingResolverPort for ReverseHostApplicationPort {
    fn resolve(
        &self,
        library_id: i64,
        item_ids: &[i64],
    ) -> Result<TagLegacyBindingResolution, String> {
        if library_id <= 0
            || item_ids.is_empty()
            || item_ids.len() > 100
            || item_ids.iter().any(|item_id| *item_id <= 0)
            || item_ids.iter().copied().collect::<HashSet<_>>().len() != item_ids.len()
        {
            return Err("invalid_request".into());
        }
        let result: ReverseHostBindingResolutionDto = serde_json::from_value(self.call(
            "effects.staged_tag_binding.resolve",
            serde_json::json!({"libraryId":library_id,"itemIds":item_ids}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())?;
        if result.diagnostics.len() > 20 {
            return Err("reverse_host_result_invalid".into());
        }
        let requested = item_ids.iter().copied().collect::<HashSet<_>>();
        let mut partition = HashSet::new();
        let resolved = result
            .resolved
            .into_iter()
            .map(|entry| {
                if !requested.contains(&entry.item_id)
                    || !partition.insert(entry.item_id)
                    || entry.r#ref.library_id != library_id
                    || entry.r#ref.item_key.is_empty()
                    || entry.r#ref.item_key.len() > 128
                    || !entry
                        .r#ref
                        .item_key
                        .bytes()
                        .all(|byte| byte.is_ascii_alphanumeric())
                {
                    return Err("reverse_host_result_invalid".into());
                }
                Ok((
                    entry.item_id,
                    TagParentBinding {
                        library_id: entry.r#ref.library_id,
                        item_key: entry.r#ref.item_key,
                    },
                ))
            })
            .collect::<Result<Vec<_>, String>>()?;
        let missing_item_ids = result
            .missing_item_ids
            .into_iter()
            .map(|item_id| {
                if requested.contains(&item_id) && partition.insert(item_id) {
                    Ok(item_id)
                } else {
                    Err("reverse_host_result_invalid".to_owned())
                }
            })
            .collect::<Result<Vec<_>, _>>()?;
        if partition != requested {
            return Err("reverse_host_result_invalid".into());
        }
        Ok(TagLegacyBindingResolution {
            resolved,
            missing_item_ids,
            diagnostics: result.diagnostics,
        })
    }
}

impl WebDavHostPort for ReverseHostApplicationPort {
    fn describe(&self) -> Result<WebDavHostDescription, String> {
        serde_json::from_value(self.call("webdav.describe", serde_json::json!({}))?)
            .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn read_text(&self, path: &str) -> Result<WebDavReadResult, String> {
        serde_json::from_value(self.call("webdav.read_text", serde_json::json!({"path":path}))?)
            .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn ensure_collection(&self, path: &str) -> Result<WebDavWriteResult, String> {
        serde_json::from_value(
            self.call("webdav.ensure_collection", serde_json::json!({"path":path}))?,
        )
        .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn write_text(
        &self,
        path: &str,
        text: &str,
        if_match: Option<&str>,
    ) -> Result<WebDavWriteResult, String> {
        serde_json::from_value(self.call(
            "webdav.write_text",
            serde_json::json!({"path":path,"text":text,"ifMatch":if_match}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())
    }
}

struct NativeStructuredArtifactPort {
    compute: Arc<NativeComputePool>,
}

impl synthesis_application::StructuredArtifactPort for NativeStructuredArtifactPort {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicManifestValidate,
                serde_json::json!({
                    "contractVersion":synthesis_topic_structured_artifact::CONTRACT_VERSION,
                    "algorithmVersion":synthesis_topic_structured_artifact::MANIFEST_VALIDATION_VERSION,
                    "manifest":manifest,
                }),
            )
            .and_then(|result: Value| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        self.compute
            .run_direct::<_, Value>(
                crate::runtime_worker_pool::WorkerOperation::TopicArtifactAssemble,
                serde_json::json!({
                    "contractVersion":synthesis_topic_structured_artifact::CONTRACT_VERSION,
                    "algorithmVersion":synthesis_topic_structured_artifact::ARTIFACT_ASSEMBLY_VERSION,
                    "manifest":manifest,
                    "sections":sections,
                }),
            )?
            .get("artifact")
            .cloned()
            .ok_or_else(|| "worker_result_invalid".into())
    }

    fn validate_artifact(&self, artifact: &Value, language: &str) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicArtifactValidate,
                serde_json::json!({
                    "contractVersion":synthesis_topic_structured_artifact::CONTRACT_VERSION,
                    "algorithmVersion":synthesis_topic_structured_artifact::ARTIFACT_VALIDATION_VERSION,
                    "expectedLanguage":language,
                    "artifact":artifact,
                }),
            )
            .and_then(|result: Value| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn apply_section_patch(
        &self,
        current: &synthesis_canonical_store::CanonicalTopicView,
        patch_manifest: &Value,
        changed_sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<synthesis_application::PatchOutput, String> {
        let result: Value = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicSectionPatch,
            serde_json::json!({
                "contractVersion":synthesis_topic_structured_artifact::CONTRACT_VERSION,
                "algorithmVersion":synthesis_topic_structured_artifact::SECTION_PATCH_VERSION,
                "currentManifest":current.manifest,
                "currentSections":current.sections,
                "patchManifest":patch_manifest,
                "changedSections":changed_sections,
            }),
        )?;
        let object = result
            .as_object()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        let sections = serde_json::from_value(
            object
                .get("sections")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let mismatches = serde_json::from_value(
            object
                .get("mismatches")
                .cloned()
                .unwrap_or_else(|| Value::Array(Vec::new())),
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        Ok(synthesis_application::PatchOutput {
            sections,
            mismatches,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_application::reference_matching::ReferenceHostCandidate;
    use synthesis_repository::{
        CanonicalReferenceRecord, RawReferenceRecord, ReferenceRedirectFactRecord,
    };

    #[test]
    fn reverse_host_effect_dtos_reject_unknown_nested_fields() {
        let valid = json!({
            "receipts": [{
                "effectId": "effect:1",
                "action": "ensure_present",
                "status": "applied",
                "occurredAt": "2026-08-12T00:00:00.000Z",
                "diagnostics": [{"code":"ok","severity":"info"}],
            }],
        });
        assert!(serde_json::from_value::<ReverseHostEffectBatchResultDto>(valid).is_ok());
        let invalid = json!({
            "receipts": [{
                "effectId": "effect:1",
                "action": "ensure_present",
                "status": "applied",
                "occurredAt": "2026-08-12T00:00:00.000Z",
                "diagnostics": [{"code":"ok","severity":"info","ignored":true}],
            }],
        });
        assert!(serde_json::from_value::<ReverseHostEffectBatchResultDto>(invalid).is_err());
    }

    #[test]
    fn citation_compute_nodes_omit_blank_optional_text_and_bound_nonblank_text() {
        let projected = citation_compute_node(&CitationNodeRecord {
            literature_item_id: "external:shared".into(),
            title: "  Shared reference  ".into(),
            year: " \n\t ".into(),
            ..CitationNodeRecord::default()
        });
        assert_eq!(projected["title"], "Shared reference");
        assert!(!projected.contains_key("year"));

        let projected = citation_compute_node(&CitationNodeRecord {
            literature_item_id: "external:long".into(),
            title: format!(
                "  {}  ",
                "🦀".repeat(CITATION_GRAPH_COMPUTE_TITLE_MAX_CHARS + 20)
            ),
            year: format!(
                "  {}  ",
                "2".repeat(CITATION_GRAPH_COMPUTE_TEXT_MAX_UTF16 + 20)
            ),
            ..CitationNodeRecord::default()
        });
        assert_eq!(
            projected["title"].as_str().expect("title").chars().count(),
            CITATION_GRAPH_COMPUTE_TITLE_MAX_CHARS
        );
        assert_eq!(
            projected["year"]
                .as_str()
                .expect("year")
                .encode_utf16()
                .count(),
            CITATION_GRAPH_COMPUTE_TEXT_MAX_UTF16
        );
    }

    #[test]
    fn reference_matcher_adapter_drives_real_two_pass_contract_and_excludes_binding_accepts() {
        let input = ReferenceMatcherInput {
            reference_hash: "sha256:reference".into(),
            canonicals: vec![
                CanonicalReferenceRecord {
                    canonical_reference_id: "canonical:1".into(),
                    title: "Exact Target Work".into(),
                    normalized_title: "exact target work".into(),
                    year: "2024".into(),
                    authors_json: r#"["Alpha"]"#.into(),
                    identifiers_json: r#"{"doi":"10.1000/exact"}"#.into(),
                    status: "active".into(),
                    ..CanonicalReferenceRecord::default()
                },
                CanonicalReferenceRecord {
                    canonical_reference_id: "canonical:2".into(),
                    title: "Different Reference Work".into(),
                    normalized_title: "different reference work".into(),
                    year: "2020".into(),
                    authors_json: r#"["Beta"]"#.into(),
                    identifiers_json: "{}".into(),
                    status: "active".into(),
                    ..CanonicalReferenceRecord::default()
                },
            ],
            raw_references: vec![
                RawReferenceRecord {
                    raw_reference_id: "raw:1".into(),
                    source_ref: "1:SOURCE".into(),
                    reference_index: 0,
                    raw_hash: "sha256:raw-1".into(),
                    parsed_title: "Exact Target Work".into(),
                    normalized_title: "exact target work".into(),
                    year: "2024".into(),
                    authors_json: r#"["Alpha"]"#.into(),
                    raw_reference: "doi:10.1000/exact".into(),
                    canonical_reference_id: "canonical:1".into(),
                    status: "active".into(),
                    ..RawReferenceRecord::default()
                },
                RawReferenceRecord {
                    raw_reference_id: "raw:2".into(),
                    source_ref: "1:SOURCE".into(),
                    reference_index: 1,
                    raw_hash: "sha256:raw-2".into(),
                    parsed_title: "Different Reference Work".into(),
                    normalized_title: "different reference work".into(),
                    year: "2020".into(),
                    authors_json: r#"["Beta"]"#.into(),
                    raw_reference: "Different Reference Work".into(),
                    canonical_reference_id: "canonical:old".into(),
                    status: "active".into(),
                    ..RawReferenceRecord::default()
                },
            ],
            host_candidates: vec![ReferenceHostCandidate {
                library_id: 1,
                item_key: "TARGET".into(),
                title: "Exact Target Work".into(),
                year: "2024".into(),
                authors: vec!["Alpha".into()],
                doi: "10.1000/exact".into(),
                arxiv: String::new(),
                isbn: String::new(),
                url: String::new(),
                citekey: "alpha2024".into(),
            }],
            bindings: Vec::new(),
            redirects: vec![ReferenceRedirectFactRecord {
                from_canonical_reference_id: "canonical:old".into(),
                to_canonical_reference_id: "canonical:2".into(),
                reason: "fixture".into(),
                ..ReferenceRedirectFactRecord::default()
            }],
            accepted_binding_canonical_ids: Vec::new(),
        };

        let binding_request = binding_request(&input).expect("binding request");
        assert_eq!(
            binding_request["contractVersion"],
            REFERENCE_MATCHER_CONTRACT_VERSION
        );
        assert_eq!(binding_request["papers"][0]["paperRef"], "1:TARGET");
        assert_eq!(binding_request["papers"][0]["doi"], "10.1000/exact");
        assert!(binding_request["references"][0].get("reference").is_some());
        let binding_result = synthesis_reference_matcher::compute(
            "reference_binding.v1",
            binding_request,
            &AtomicBool::new(false),
        )
        .expect("real binding result");
        let binding_outcomes = binding_outcomes(&input, &binding_result).expect("binding outcomes");
        assert_eq!(binding_outcomes.len(), 1);
        assert_eq!(
            binding_outcomes[0].disposition,
            ReferenceMatchDisposition::Accept
        );
        assert_eq!(
            binding_outcomes[0].confidence,
            ReferenceMatchConfidence::Deterministic
        );

        let mut duplicate_input = input.clone();
        duplicate_input.canonicals[1].title = "Exact Target Work".into();
        duplicate_input.canonicals[1].normalized_title = "exact target work".into();
        duplicate_input.canonicals[1].year = "2024".into();
        duplicate_input.canonicals[1].authors_json = r#"["Alpha"]"#.into();
        duplicate_input.canonicals[1].identifiers_json = r#"{"doi":["10.1000/exact"]}"#.into();
        duplicate_input.raw_references[1].parsed_title = "Exact Target Work".into();
        duplicate_input.raw_references[1].normalized_title = "exact target work".into();
        duplicate_input.raw_references[1].year = "2024".into();
        duplicate_input.raw_references[1].authors_json = r#"["Alpha"]"#.into();
        let duplicate_request = dedupe_request(&duplicate_input).expect("duplicate request");
        let duplicate_result = synthesis_reference_matcher::compute(
            "reference_canonical_dedupe.v1",
            duplicate_request,
            &AtomicBool::new(false),
        )
        .expect("real duplicate result");
        let duplicate_outcomes =
            dedupe_outcomes(&duplicate_input, &duplicate_result).expect("duplicate outcomes");
        assert_eq!(duplicate_outcomes.len(), 1);
        assert_eq!(
            duplicate_outcomes[0].disposition,
            ReferenceMatchDisposition::Accept
        );
        assert_eq!(duplicate_outcomes[0].kind, ReferenceMatchKind::Redirect);
        assert!(duplicate_outcomes[0].evidence.get("actionId").is_some());

        let mut dedupe_input = input.clone();
        dedupe_input.accepted_binding_canonical_ids = binding_outcomes
            .iter()
            .map(|outcome| outcome.source_canonical_reference_id.clone())
            .collect();
        let dedupe_request = dedupe_request(&dedupe_input).expect("dedupe request");
        assert_eq!(dedupe_request["canonicals"].as_array().unwrap().len(), 1);
        assert_eq!(
            dedupe_request["canonicals"][0]["canonicalReferenceId"],
            "canonical:2"
        );
        let dedupe_result = synthesis_reference_matcher::compute(
            "reference_canonical_dedupe.v1",
            dedupe_request,
            &AtomicBool::new(false),
        )
        .expect("real dedupe result");
        assert!(
            dedupe_outcomes(&dedupe_input, &dedupe_result)
                .expect("dedupe outcomes")
                .is_empty()
        );
    }
}
