use crate::runtime_file_system::sync_directory;
use crate::runtime_host_collection::{
    HostItemCollectionPort, ReferenceHostItemsByRef, ReferenceHostItemsPage,
    TopicLibraryQueryAdapter,
};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
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
use synthesis_application::tag_vocabulary::{
    TagHostEffectPort, TagHostEffectReceipt, TagIndexOutput, TagLegacyBindingResolverPort,
    TagVocabularyComputePort,
};
use synthesis_application::topic_graph::{TopicGraphComputePort, TopicGraphIndexOutput};
use synthesis_application::webdav_sync::{
    WebDavHostDescription, WebDavHostPort, WebDavReadResult, WebDavRetrySchedulerPort,
    WebDavStateStorePort, WebDavSyncState, WebDavWriteResult,
};
use synthesis_application::{
    CanonicalStorePort, CitationGraphApplication, ConceptKbApplication,
    DebugMaintenanceApplication, DurableBundleApplication, ReferenceMatchingApplication,
    ReferenceRefreshApplication, RepositoryPort, TagVocabularyApplication,
    TagVocabularyRepositoryPort, TopicApplication, TopicGraphApplication, TopicLibraryQueryPort,
    WebDavSyncApplication, WorkbenchApplication,
};
use synthesis_canonical_store::{CanonicalStore, canonical_json_hash};
use synthesis_protocol::utc_now_iso8601;
use synthesis_reference_matcher::{
    BINDING_ALGORITHM_VERSION, CONTRACT_VERSION as REFERENCE_MATCHER_CONTRACT_VERSION,
    DEDUPE_ALGORITHM_VERSION,
};
use synthesis_repository::Repository;
use synthesis_repository::{
    CanonicalReferenceRecord, CitationComplexMetricsRecord, CitationEdgeRecord,
    CitationGraphApplicationStateRecord, CitationGraphReplacement, CitationIncomingGroupRecord,
    CitationLayoutRecord, CitationLightMetricsRecord, CitationNodeRecord,
    CitationSourceOwnershipRecord, RawReferenceRecord, TagEffectRecord, TagProtocolRecord,
    TagStagedSuggestionRecord, TagVocabularyEntryRecord, TagVocabularyReplacement,
    TopicGraphReplacement,
};
use synthesis_sidecar::runtime_contract::NativeLaunchConfig;

use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_reference_canonical::{
    ReferenceCanonicalApplication, ReferenceHostArtifactRead, ReferenceHostArtifactsPage,
    ReferenceHostPort,
};
use crate::runtime_reverse_host::call_reverse_host;
use crate::runtime_worker_pool::NativeComputePool;

pub(crate) struct ProductionApplications {
    pub(crate) repository: Arc<RepositoryPort>,
    pub(crate) canonical: Arc<CanonicalStorePort>,
    pub(crate) workbench: WorkbenchApplication,
    pub(crate) topics: TopicApplication,
    pub(crate) citations: CitationGraphApplication,
    pub(crate) reference_canonical: ReferenceCanonicalApplication,
    pub(crate) tags: TagVocabularyApplication,
    pub(crate) concepts: ConceptKbApplication,
    pub(crate) topic_graph: Arc<TopicGraphApplication>,
    pub(crate) debug: DebugMaintenanceApplication,
    pub(crate) webdav: WebDavSyncApplication,
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

    pub(crate) fn initialize_builtin_tag_policy(&self) -> Result<Value, String> {
        const BUILTIN_TAGS: &[&str] = &[
            "status:need-analysis",
            "status:need-deep-reading",
            "status:need-fulltext",
            "status:need-markdown",
            "status:need-metadata-curation",
        ];
        let mut candidate = self.repository.load_candidate()?;
        let expected_hash = (!candidate.state.vocabulary_hash.is_empty())
            .then(|| candidate.state.vocabulary_hash.clone());
        let now = utc_now_iso8601();
        if candidate.protocols.is_empty() {
            candidate.protocols.push(TagProtocolRecord {
                protocol_id: "builtin".into(),
                version: "1.0.0".into(),
                tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$".into(),
                max_tag_length: 120,
                facets_json: serde_json::to_string(&[
                    "field", "topic", "method", "model", "ai_task", "data", "tool", "status",
                ])
                .map_err(|_| "invalid_request".to_owned())?,
                updated_at: now.clone(),
            });
        } else {
            for protocol in &mut candidate.protocols {
                let mut facets: Vec<String> =
                    serde_json::from_str(&protocol.facets_json).unwrap_or_default();
                if !facets.iter().any(|facet| facet == "status") {
                    facets.push("status".into());
                    protocol.facets_json =
                        serde_json::to_string(&facets).map_err(|_| "invalid_request".to_owned())?;
                    protocol.updated_at = now.clone();
                }
            }
        }
        for tag in BUILTIN_TAGS {
            if let Some(entry) = candidate.entries.iter_mut().find(|entry| entry.tag == *tag) {
                entry.facet = "status".into();
                entry.source = "builtin".into();
                entry.deprecated = 0;
                entry.replacement.clear();
                entry.updated_at = now.clone();
            } else {
                candidate.entries.push(TagVocabularyEntryRecord {
                    tag: (*tag).into(),
                    facet: "status".into(),
                    note: String::new(),
                    source: "builtin".into(),
                    deprecated: 0,
                    replacement: String::new(),
                    aliases_json: "[]".into(),
                    abbrev_json: "[]".into(),
                    usage_count: 0,
                    last_synced_at: String::new(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                });
            }
        }
        candidate
            .entries
            .sort_by(|left, right| left.tag.cmp(&right.tag));
        candidate.state.singleton_id = 1;
        candidate.state.vocabulary_hash = canonical_json_hash(&serde_json::json!({
            "entries":candidate.entries,
            "aliases":candidate.aliases,
            "abbrevs":candidate.abbrevs,
            "protocols":candidate.protocols,
            "warnings":candidate.warnings,
        }))?;
        candidate.state.index_stale = 1;
        candidate.state.updated_at = now;
        serde_json::to_value(self.tags.save(expected_hash.as_deref(), &candidate))
            .map_err(|_| "serialization_failed".to_owned())
    }
}

pub(crate) fn build_production_applications(
    repository: Arc<Mutex<Repository>>,
    canonical: Arc<Mutex<CanonicalStore>>,
    compute: Arc<NativeComputePool>,
    config: Option<Arc<NativeLaunchConfig>>,
    service_instance_id: String,
    webdav_state_path: PathBuf,
) -> ProductionApplications {
    let repository = Arc::new(RepositoryPort::new(repository));
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
    let topics = TopicApplication::new(
        repository.clone(),
        canonical.clone(),
        Arc::new(NativeStructuredArtifactPort {
            compute: Arc::clone(&compute),
        }),
    )
    .with_topic_graph(Arc::clone(&topic_graph));
    let citations = CitationGraphApplication::new(
        repository.clone(),
        Arc::new(NativeCitationGraphComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let reference_refresh = ReferenceRefreshApplication::new(repository.clone());
    let reference_matching = ReferenceMatchingApplication::new(
        repository.clone(),
        Arc::new(NativeReferenceMatcherPort {
            compute: Arc::clone(&compute),
        }),
    );
    let reference_canonical = ReferenceCanonicalApplication::new(
        repository.clone(),
        reference_refresh,
        reference_matching,
        host.clone(),
    );
    let tags = TagVocabularyApplication::new(
        repository.clone(),
        Arc::new(NativeTagVocabularyComputePort {
            compute: Arc::clone(&compute),
        }),
        host.clone(),
        host.clone(),
    );
    let concepts = ConceptKbApplication::new(
        repository.clone(),
        Arc::new(NativeConceptKbComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let debug = DebugMaintenanceApplication::new(repository.clone(), canonical.clone());
    let durable = DurableBundleApplication::with_runtime(
        repository.clone(),
        Some(canonical.clone()),
        Some(canonical.clone()),
        Arc::new(utc_now_iso8601),
        Arc::new(|| format!("durable-import:{}", utc_now_iso8601())),
        "synthesis-sidecar".into(),
    );
    let webdav = WebDavSyncApplication::new(
        host.clone(),
        Arc::new(FileWebDavStateStore {
            path: webdav_state_path,
        }),
        Arc::new(BoundedWebDavRetryScheduler::default()),
        Arc::new(durable),
        Arc::new(utc_now_iso8601),
    );
    ProductionApplications {
        repository,
        canonical,
        workbench,
        topics,
        citations,
        reference_canonical,
        tags,
        concepts,
        topic_graph,
        debug,
        webdav,
        host_items,
        topic_library,
        config,
        service_instance_id,
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
        let result = match self.compute.run_direct(
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
        self.compute.run_direct(
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

impl ReverseHostApplicationPort {
    fn call(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let config = self
            .config
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(config, &self.service_instance_id, capability, payload)
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
    fn scan_artifacts_page(
        &self,
        cursor: &str,
        limit: usize,
    ) -> Result<ReferenceHostArtifactsPage, String> {
        serde_json::from_value(self.call(
            "library.artifacts.scan_page",
            serde_json::json!({"cursor":cursor,"limit":limit}),
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

impl TagHostEffectPort for ReverseHostApplicationPort {
    fn apply_batch(
        &self,
        effects: &[TagEffectRecord],
    ) -> Result<Vec<TagHostEffectReceipt>, String> {
        if effects.is_empty() || effects.len() > 100 {
            return Err("invalid_request".into());
        }
        let result = self.call(
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
        )?;
        let receipts = result
            .get("receipts")
            .and_then(Value::as_array)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        if receipts.len() != effects.len() {
            return Err("reverse_host_result_invalid".into());
        }
        let expected = effects
            .iter()
            .map(|effect| effect.effect_id.as_str())
            .collect::<HashSet<_>>();
        let mut seen = HashSet::new();
        receipts
            .iter()
            .map(|receipt| {
                let receipt = receipt
                    .as_object()
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                let effect_id = receipt
                    .get("effectId")
                    .and_then(Value::as_str)
                    .filter(|effect_id| expected.contains(*effect_id) && seen.insert(*effect_id))
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                if receipt.get("action").and_then(Value::as_str) != Some("ensure_present") {
                    return Err("reverse_host_result_invalid".into());
                }
                let status = receipt
                    .get("status")
                    .and_then(Value::as_str)
                    .filter(|status| {
                        matches!(
                            *status,
                            "applied" | "already_satisfied" | "not_found" | "failed"
                        )
                    })
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                let occurred_at = receipt
                    .get("occurredAt")
                    .and_then(Value::as_str)
                    .filter(|value| {
                        synthesis_protocol::unix_millis_from_utc_iso8601(value).is_some()
                    })
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                let diagnostics = receipt
                    .get("diagnostics")
                    .and_then(Value::as_array)
                    .filter(|diagnostics| diagnostics.len() <= 20)
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                if diagnostics.iter().any(|entry| !entry.is_object()) {
                    return Err("reverse_host_result_invalid".into());
                }
                Ok(TagHostEffectReceipt {
                    effect_id: effect_id.into(),
                    status: status.into(),
                    occurred_at: occurred_at.into(),
                    diagnostics_json: serde_json::to_string(diagnostics)
                        .map_err(|_| "reverse_host_result_invalid".to_owned())?,
                })
            })
            .collect()
    }
}

impl TagLegacyBindingResolverPort for ReverseHostApplicationPort {
    fn resolve(
        &self,
        staged: &[TagStagedSuggestionRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        for suggestion in staged {
            let bindings: Value = serde_json::from_str(&suggestion.parent_bindings_json)
                .map_err(|_| "invalid_request".to_owned())?;
            let bindings = bindings
                .as_array()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if bindings.iter().any(Value::is_number) {
                return Err("legacy_binding_library_scope_missing".into());
            }
            if !bindings.iter().all(|binding| {
                binding.get("libraryId").and_then(Value::as_i64).is_some()
                    && binding
                        .get("itemKey")
                        .and_then(Value::as_str)
                        .is_some_and(|item_key| !item_key.is_empty())
            }) {
                return Err("invalid_request".into());
            }
        }
        Ok(staged.to_vec())
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

struct FileWebDavStateStore {
    path: PathBuf,
}

impl FileWebDavStateStore {
    fn backup_path(&self) -> PathBuf {
        self.path.with_extension("json.previous")
    }

    fn temporary_path(&self) -> PathBuf {
        self.path.with_extension("json.pending")
    }
}

impl WebDavStateStorePort for FileWebDavStateStore {
    fn load(&self) -> Result<Option<WebDavSyncState>, String> {
        let path = if self.path.exists() {
            &self.path
        } else {
            let backup = self.backup_path();
            if !backup.exists() {
                return Ok(None);
            }
            return serde_json::from_slice(
                &fs::read(backup).map_err(|_| "webdav_state_unavailable".to_owned())?,
            )
            .map(Some)
            .map_err(|_| "webdav_sync_state_invalid".to_owned());
        };
        serde_json::from_slice(&fs::read(path).map_err(|_| "webdav_state_unavailable".to_owned())?)
            .map(Some)
            .map_err(|_| "webdav_sync_state_invalid".to_owned())
    }

    fn save(&self, state: &WebDavSyncState) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "webdav_state_unavailable".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "webdav_state_unavailable".to_owned())?;
        let pending = self.temporary_path();
        let bytes =
            serde_json::to_vec(state).map_err(|_| "webdav_sync_state_invalid".to_owned())?;
        fs::write(&pending, bytes).map_err(|_| "webdav_state_unavailable".to_owned())?;
        OpenOptions::new()
            .write(true)
            .open(&pending)
            .and_then(|file| file.sync_all())
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        let backup = self.backup_path();
        if self.path.exists() {
            if backup.exists() {
                fs::remove_file(&backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
            }
            fs::rename(&self.path, &backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        if let Err(error) = fs::rename(&pending, &self.path) {
            if backup.exists() && !self.path.exists() {
                let _ = fs::rename(&backup, &self.path);
            }
            return Err(format!("webdav_state_unavailable:{error}"));
        }
        sync_directory(parent).map_err(|_| "webdav_state_unavailable".to_owned())?;
        if backup.exists() {
            fs::remove_file(backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        Ok(())
    }
}

#[derive(Default)]
struct BoundedWebDavRetryScheduler {
    canceled_generation: std::sync::atomic::AtomicU64,
}

impl WebDavRetrySchedulerPort for BoundedWebDavRetryScheduler {
    fn wait(&self, delay_ms: u64, generation: u64) -> Result<bool, String> {
        std::thread::sleep(std::time::Duration::from_millis(delay_ms.min(1_000)));
        Ok(self
            .canceled_generation
            .load(std::sync::atomic::Ordering::Acquire)
            != generation)
    }

    fn cancel(&self, generation: u64) {
        self.canceled_generation
            .store(generation, std::sync::atomic::Ordering::Release);
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
            .and_then(|result| {
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
            .run_direct(
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
            .and_then(|result| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn apply_section_patch(
        &self,
        current: &synthesis_canonical_store::TopicSnapshot,
        patch_manifest: &Value,
        changed_sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<synthesis_application::PatchOutput, String> {
        let result = self.compute.run_direct(
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
    fn webdav_state_survives_store_reopen() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-webdav-state-{}-{}",
            std::process::id(),
            utc_now_iso8601()
        ));
        let path = root.join("native-webdav-state.json");
        let state = WebDavSyncState {
            schema_id: "synthesis.webdav_sync_state".into(),
            schema_version: "1".into(),
            queue_state: "paused".into(),
            ..WebDavSyncState::default()
        };
        FileWebDavStateStore { path: path.clone() }
            .save(&state)
            .expect("persist state");
        let reopened = FileWebDavStateStore { path }
            .load()
            .expect("reopen state")
            .expect("stored state");
        assert_eq!(reopened.queue_state, "paused");
        std::fs::remove_dir_all(root).expect("remove test state");
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
