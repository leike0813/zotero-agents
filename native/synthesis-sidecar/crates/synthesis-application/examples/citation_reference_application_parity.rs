//! Development-only Citation/Reference application parity driver.
//! This example is not linked into the production sidecar.

use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, VecDeque};
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_application::citation_graph::{
    CitationBuildOutput, CitationDirection, CitationGraphComputePort, CitationLayoutRequest,
    CitationMetricsOutput, CitationMetricsPageRequest, CitationMetricsSort, CitationRebuildRequest,
    CitationSliceRequest,
};
use synthesis_application::reference_matching::{
    ReferenceHostCandidate, ReferenceMatchKind, ReferenceMatchPass, ReferenceMatcherInput,
    ReferenceMatcherOutcome, ReferenceMatcherPort, ReferenceMatchingPrepareRequest,
    ReferenceReviewAction, ReferenceReviewDecision,
};
use synthesis_application::reference_refresh::{
    ReferenceArtifactDescriptor, ReferenceArtifactType, ReferenceRefreshApplyRequest,
    ReferenceRefreshItem, ReferenceRefreshPayload, ReferenceRefreshPrepareRequest,
    ReferenceRefreshScope,
};
use synthesis_application::{
    CitationGraphApplication, ReferenceMatchingApplication, ReferenceRefreshApplication,
    RepositoryPort,
};
use synthesis_repository::{
    CitationComplexMetricsRecord, CitationEdgeRecord, CitationGraphApplicationStateRecord,
    CitationGraphReplacement, CitationIncomingGroupRecord, CitationLayoutRecord,
    CitationLightMetricsRecord, CitationNodeRecord, CitationSourceOwnershipRecord, Repository,
    RepositoryIdentity,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DriverRequest {
    corpus: Corpus,
    runtime_root: PathBuf,
    canonical_root: PathBuf,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Corpus {
    schema: String,
    report_schema: String,
    profile_id: String,
    data_root_id: String,
    clock: String,
    operation_ids: Vec<String>,
    preparation_ids: Vec<String>,
    fault_phases: Vec<String>,
    fixture: Fixture,
    coverage: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Fixture {
    citation_input: Value,
    refresh: RefreshFixture,
    matching_host_candidates: Vec<ReferenceHostCandidate>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RefreshFixture {
    items: Vec<ReferenceRefreshItem>,
    artifacts: Vec<ReferenceArtifactDescriptor>,
    references: Value,
    citation_analysis: Value,
}

struct FixtureCitationCompute {
    now: String,
}

impl CitationGraphComputePort for FixtureCitationCompute {
    fn build(
        &self,
        input: &Value,
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationBuildOutput, String> {
        if canceled.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("worker_canceled".into());
        }
        let title = input
            .pointer("/libraryNodes/0/title")
            .and_then(Value::as_str)
            .unwrap_or("Alpha");
        let nodes = vec![
            CitationNodeRecord {
                literature_item_id: "paper:a".into(),
                node_status: "active".into(),
                has_zotero_binding: true,
                title: title.into(),
                year: "2020".into(),
                authors_json: "[\"A\"]".into(),
                summary_json: "{}".into(),
                updated_at: self.now.clone(),
            },
            CitationNodeRecord {
                literature_item_id: "paper:b".into(),
                node_status: "active".into(),
                has_zotero_binding: true,
                title: "Beta".into(),
                year: "2024".into(),
                authors_json: "[\"B\"]".into(),
                summary_json: "{}".into(),
                updated_at: self.now.clone(),
            },
        ];
        let edges = vec![CitationEdgeRecord {
            edge_id: "edge:1".into(),
            source_literature_item_id: "paper:a".into(),
            target_literature_item_id: "paper:b".into(),
            reference_instance_id: "reference:1".into(),
            resolution_id: "resolution:1".into(),
            edge_status: "matched".into(),
            roles_json: "[\"background\"]".into(),
            weight: 1.0,
            created_at: self.now.clone(),
            updated_at: self.now.clone(),
        }];
        let graph_hash = synthesis_canonical_store::canonical_json_hash(&json!({
            "nodes": nodes,
            "edges": edges,
        }))?;
        Ok(CitationBuildOutput {
            graph_hash,
            replacement: CitationGraphReplacement {
                state: CitationGraphApplicationStateRecord::default(),
                nodes,
                edges,
                ownership: vec![CitationSourceOwnershipRecord {
                    source_literature_item_id: "paper:a".into(),
                    edge_id: "edge:1".into(),
                    reference_instance_id: "reference:1".into(),
                    target_literature_item_id: "paper:b".into(),
                    edge_status: "matched".into(),
                    updated_at: self.now.clone(),
                }],
                incoming_groups: vec![CitationIncomingGroupRecord {
                    target_literature_item_id: "paper:b".into(),
                    source_literature_item_id: "paper:a".into(),
                    edge_id: "edge:1".into(),
                    reference_instance_id: "reference:1".into(),
                    edge_status: "matched".into(),
                    updated_at: self.now.clone(),
                }],
                light_metrics: vec![
                    CitationLightMetricsRecord {
                        literature_item_id: "paper:a".into(),
                        outgoing_count: 1,
                        matched_outgoing_count: 1,
                        local_degree: 1,
                        source_structure_version: 1,
                        updated_at: self.now.clone(),
                        ..CitationLightMetricsRecord::default()
                    },
                    CitationLightMetricsRecord {
                        literature_item_id: "paper:b".into(),
                        incoming_count: 1,
                        local_degree: 1,
                        source_structure_version: 1,
                        updated_at: self.now.clone(),
                        ..CitationLightMetricsRecord::default()
                    },
                ],
                complex_metrics: Vec::new(),
            },
        })
    }

    fn metrics(
        &self,
        graph_hash: &str,
        nodes: &[CitationNodeRecord],
        _edges: &[CitationEdgeRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationMetricsOutput, String> {
        if canceled.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("worker_canceled".into());
        }
        let metrics_hash = synthesis_canonical_store::canonical_json_hash(&json!({
            "graphHash": graph_hash,
            "algorithm": "fixture-v1",
        }))?;
        Ok(CitationMetricsOutput {
            metrics_hash: metrics_hash.clone(),
            records: nodes
                .iter()
                .enumerate()
                .map(|(index, node)| CitationComplexMetricsRecord {
                    literature_item_id: node.literature_item_id.clone(),
                    node_id: node.literature_item_id.clone(),
                    paper_ref: node.literature_item_id.clone(),
                    item_key: node.literature_item_id.clone(),
                    title: node.title.clone(),
                    year: node.year.clone(),
                    internal_pagerank: if index == 0 { 0.4 } else { 0.6 },
                    component_id: "component:1".into(),
                    component_size: 2,
                    foundation_score: if index == 0 { 0.8 } else { 0.6 },
                    frontier_score: if index == 0 { 0.2 } else { 0.7 },
                    source_graph_hash: graph_hash.into(),
                    metrics_hash: metrics_hash.clone(),
                    status: "ready".into(),
                    updated_at: self.now.clone(),
                    ..CitationComplexMetricsRecord::default()
                })
                .collect(),
        })
    }

    fn layout(
        &self,
        request: &CitationLayoutRequest,
        _nodes: &[CitationNodeRecord],
        _edges: &[CitationEdgeRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<CitationLayoutRecord, String> {
        if canceled.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("worker_canceled".into());
        }
        Ok(CitationLayoutRecord {
            layout_key: request.layout_key.clone(),
            view_key: request.view_key.clone(),
            preset: request.preset.clone(),
            status: "ready".into(),
            layout_json: "{\"nodes\":[]}".into(),
            diagnostics_json: "[]".into(),
            created_at: self.now.clone(),
            updated_at: self.now.clone(),
            ..CitationLayoutRecord::default()
        })
    }
}

struct FixtureMatcher;

impl ReferenceMatcherPort for FixtureMatcher {
    fn match_pass(
        &self,
        pass: ReferenceMatchPass,
        input: &ReferenceMatcherInput,
    ) -> Result<Vec<ReferenceMatcherOutcome>, String> {
        let Some(canonical) = input.canonicals.first() else {
            return Ok(Vec::new());
        };
        let Some(host) = input.host_candidates.first() else {
            return Ok(Vec::new());
        };
        Ok(match pass {
            ReferenceMatchPass::LibraryBinding => vec![ReferenceMatcherOutcome {
                semantic_key: format!(
                    "binding::{}::{}::{}",
                    canonical.canonical_reference_id, host.library_id, host.item_key
                ),
                kind: ReferenceMatchKind::Binding,
                disposition:
                    synthesis_application::reference_matching::ReferenceMatchDisposition::Accept,
                confidence:
                    synthesis_application::reference_matching::ReferenceMatchConfidence::High,
                source_canonical_reference_id: canonical.canonical_reference_id.clone(),
                source_raw_reference_ids: input
                    .raw_references
                    .iter()
                    .filter(|row| row.canonical_reference_id == canonical.canonical_reference_id)
                    .map(|row| row.raw_reference_id.clone())
                    .collect(),
                target_canonical_reference_id: String::new(),
                target_library_id: host.library_id,
                target_item_key: host.item_key.clone(),
                score: 0.99,
                reasons: vec!["fixture_title_match".into()],
                evidence: serde_json::json!({"title":host.title}),
                diagnostics: Vec::new(),
            }],
            ReferenceMatchPass::CanonicalRedirect => Vec::new(),
        })
    }
}

fn id_factory(ids: Vec<String>) -> Arc<dyn Fn() -> String + Send + Sync> {
    let ids = Arc::new(Mutex::new(VecDeque::from(ids)));
    Arc::new(move || {
        ids.lock()
            .ok()
            .and_then(|mut ids| ids.pop_front())
            .unwrap_or_else(|| "fixture:id:exhausted".into())
    })
}

fn tree(root: &Path) -> Result<BTreeMap<String, String>, String> {
    fn visit(base: &Path, path: &Path, files: &mut BTreeMap<String, String>) -> Result<(), String> {
        if !path.exists() {
            return Ok(());
        }
        for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let file_type = entry.file_type().map_err(|error| error.to_string())?;
            if file_type.is_symlink() {
                return Err("parity_symlink_rejected".into());
            }
            if file_type.is_dir() {
                visit(base, &entry.path(), files)?;
            } else {
                let relative = entry
                    .path()
                    .strip_prefix(base)
                    .map_err(|error| error.to_string())?
                    .to_string_lossy()
                    .replace('\\', "/");
                let bytes = fs::read(entry.path()).map_err(|error| error.to_string())?;
                files.insert(relative, format!("sha256:{:x}", Sha256::digest(&bytes)));
            }
        }
        Ok(())
    }
    let mut files = BTreeMap::new();
    visit(root, root, &mut files)?;
    Ok(files)
}

fn main() -> Result<(), String> {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|error| error.to_string())?;
    let request: DriverRequest =
        serde_json::from_str(&input).map_err(|error| format!("parity_fixture_invalid:{error}"))?;
    if request.corpus.schema != "synthesis-citation-reference-application-parity.v1"
        || request.corpus.report_schema
            != "synthesis-citation-reference-application-parity-report.v1"
        || request.corpus.operation_ids.len() < 2
        || request.corpus.preparation_ids.len() < 2
        || request.corpus.fault_phases.is_empty()
        || !request.corpus.coverage.is_object()
    {
        return Err("parity_fixture_invalid".into());
    }
    fs::create_dir_all(&request.runtime_root).map_err(|error| error.to_string())?;
    fs::create_dir_all(&request.canonical_root).map_err(|error| error.to_string())?;
    let canonical_before = tree(&request.canonical_root)?;
    let identity = RepositoryIdentity {
        profile_id: request.corpus.profile_id.clone(),
        data_root_id: request.corpus.data_root_id.clone(),
    };
    let repository = Repository::open_at(
        &request.runtime_root,
        identity.clone(),
        &request.corpus.clock,
    )?;
    let owner = Arc::new(Mutex::new(repository));
    let port = Arc::new(RepositoryPort::new(Arc::clone(&owner)));
    let now_value = request.corpus.clock.clone();
    let now: Arc<dyn Fn() -> String + Send + Sync> = Arc::new(move || now_value.clone());
    let citation = CitationGraphApplication::with_factories(
        port.clone(),
        Arc::new(FixtureCitationCompute {
            now: request.corpus.clock.clone(),
        }),
        now.clone(),
        id_factory(request.corpus.operation_ids.clone()),
    );
    let initial_citation = citation.inspect()?;
    let created = citation.rebuild_full(CitationRebuildRequest {
        expected_graph_hash: None,
        force: false,
        input: request.corpus.fixture.citation_input.clone(),
    });
    let unchanged = citation.rebuild_full(CitationRebuildRequest {
        expected_graph_hash: created.graph_hash.clone(),
        force: false,
        input: request.corpus.fixture.citation_input.clone(),
    });
    let mismatch = citation.rebuild_full(CitationRebuildRequest {
        expected_graph_hash: Some("sha256:stale".into()),
        force: true,
        input: request.corpus.fixture.citation_input.clone(),
    });
    let slice = citation.read_slice(CitationSliceRequest {
        root_node_id: "paper:a".into(),
        depth: 1,
        direction: CitationDirection::Both,
        max_nodes: 80,
        max_edges: 160,
    })?;
    let metrics = citation.read_metrics(CitationMetricsPageRequest {
        cursor: 0,
        limit: 1,
        sort_by: CitationMetricsSort::Foundation,
        paper_refs: Vec::new(),
    })?;
    let layout = citation.recompute_layout(CitationLayoutRequest {
        expected_graph_hash: created.graph_hash.clone().unwrap_or_default(),
        layout_key: "layout:force".into(),
        view_key: "workbench_overview".into(),
        preset: "force".into(),
    });
    let graph_before_refresh = citation.inspect()?.graph_hash;

    let refresh = ReferenceRefreshApplication::with_factories(
        port.clone(),
        now.clone(),
        id_factory(request.corpus.preparation_ids[0..1].to_vec()),
    );
    let prepared_refresh = refresh.prepare_refresh(ReferenceRefreshPrepareRequest {
        expected_reference_hash: None,
        force: false,
        scope: ReferenceRefreshScope::Full,
        items: request.corpus.fixture.refresh.items.clone(),
        artifacts: request.corpus.fixture.refresh.artifacts.clone(),
    });
    let wrong_refresh = refresh.apply_refresh(ReferenceRefreshApplyRequest {
        preparation_id: "refresh:wrong".into(),
        payloads: Vec::new(),
    });
    let refresh_payloads = prepared_refresh
        .reads
        .iter()
        .map(|read| ReferenceRefreshPayload {
            locator: read.locator.clone(),
            expected_hash: read.expected_hash.clone(),
            status: "available".into(),
            payload_hash: read.expected_hash.clone(),
            content: match read.artifact_type {
                ReferenceArtifactType::References => {
                    request.corpus.fixture.refresh.references.clone()
                }
                ReferenceArtifactType::CitationAnalysis => {
                    request.corpus.fixture.refresh.citation_analysis.clone()
                }
                ReferenceArtifactType::Digest | ReferenceArtifactType::LiteratureScore => json!({}),
            },
            diagnostics: Vec::new(),
        })
        .collect();
    let promoted_refresh = refresh.apply_refresh(ReferenceRefreshApplyRequest {
        preparation_id: prepared_refresh.preparation_id.clone().unwrap_or_default(),
        payloads: refresh_payloads,
    });
    let replay_refresh = refresh.apply_refresh(ReferenceRefreshApplyRequest {
        preparation_id: prepared_refresh.preparation_id.clone().unwrap_or_default(),
        payloads: Vec::new(),
    });
    let reference_page = refresh.read_references(0, 100)?.0;
    let graph_after_refresh = citation.inspect()?.graph_hash;

    let matching = ReferenceMatchingApplication::with_factories(
        port.clone(),
        Arc::new(FixtureMatcher),
        now.clone(),
        id_factory(request.corpus.preparation_ids[1..2].to_vec()),
    );
    let prepared_matching = matching.prepare(ReferenceMatchingPrepareRequest {
        expected_reference_hash: promoted_refresh.reference_hash.clone(),
        host_basis_hash: "sha256:host".into(),
        host_candidates: request.corpus.fixture.matching_host_candidates.clone(),
    });
    let busy_matching = matching.prepare(ReferenceMatchingPrepareRequest {
        expected_reference_hash: promoted_refresh.reference_hash.clone(),
        host_basis_hash: "sha256:host".into(),
        host_candidates: request.corpus.fixture.matching_host_candidates.clone(),
    });
    let promoted_matching = matching.apply(
        prepared_matching
            .preparation_id
            .as_deref()
            .unwrap_or_default(),
        "sha256:host",
    );
    let replay_matching = matching.apply(
        prepared_matching
            .preparation_id
            .as_deref()
            .unwrap_or_default(),
        "sha256:host",
    );
    let proposal_page = matching.read_proposals(0, 100)?;
    let accepted = proposal_page.records.first().map_or_else(
        || {
            matching.review(&[ReferenceReviewDecision {
                proposal_id: "missing".into(),
                action: ReferenceReviewAction::Accept,
                target_canonical_reference_id: String::new(),
                target_library_id: 0,
                target_item_key: String::new(),
            }])
        },
        |proposal| {
            matching.review(&[ReferenceReviewDecision {
                proposal_id: proposal.proposal_id.clone(),
                action: ReferenceReviewAction::Accept,
                target_canonical_reference_id: String::new(),
                target_library_id: 0,
                target_item_key: String::new(),
            }])
        },
    );
    let partial = matching.review(&[ReferenceReviewDecision {
        proposal_id: "missing".into(),
        action: ReferenceReviewAction::Reject,
        target_canonical_reference_id: String::new(),
        target_library_id: 0,
        target_item_key: String::new(),
    }]);
    let graph_after_review = citation.inspect()?.graph_hash;

    let mut changed_input = request.corpus.fixture.citation_input.clone();
    changed_input["libraryNodes"][0]["title"] = json!("Alpha explicit rebuild");
    let explicit_rebuild = citation.rebuild_full(CitationRebuildRequest {
        expected_graph_hash: graph_after_review.clone(),
        force: true,
        input: changed_input,
    });
    let graph_after_explicit_rebuild = citation.inspect()?.graph_hash;
    let table_snapshot = owner
        .lock()
        .map_err(|_| "repository_unavailable")?
        .table_snapshot()?;
    let citation_inspect = citation.inspect()?;
    let refresh_inspect = refresh.inspect()?;
    let matching_inspect = matching.inspect()?;
    citation.shutdown(Duration::from_secs(1))?;
    refresh.shutdown(Duration::from_secs(1))?;
    if !matching.shutdown(Duration::from_secs(1)) {
        return Err("reference_matching_drain_timeout".into());
    }
    drop(citation);
    drop(refresh);
    drop(matching);
    drop(port);
    drop(owner);

    let reopened = Repository::open_at(&request.runtime_root, identity, &request.corpus.clock)?;
    let reopen_snapshot = reopened.table_snapshot()?;
    let reopen = json!({
        "citation": reopened.get_citation_graph_application_state()?,
        "refresh": reopened.get_reference_application_state()?,
        "matching": reopened.get_reference_matching_state()?,
        "tables": reopen_snapshot,
    });
    drop(reopened);
    let canonical_after = tree(&request.canonical_root)?;
    let report = json!({
        "schema": request.corpus.report_schema,
        "corpusVersion": request.corpus.schema,
        "driver": "development_only",
        "productionCapabilityRegistered": false,
        "citationGraph": {
            "initial": initial_citation,
            "created": created,
            "unchanged": unchanged,
            "mismatch": mismatch,
            "slice": {"nodes": slice.nodes.len(), "edges": slice.edges.len()},
            "metrics": {"returned": metrics.returned, "hasMore": metrics.has_more},
            "layout": layout,
            "inspect": citation_inspect,
        },
        "referenceRefresh": {
            "prepared": prepared_refresh,
            "wrongPreparation": wrong_refresh,
            "promoted": promoted_refresh,
            "replay": replay_refresh,
            "referenceRows": reference_page.len(),
            "inspect": refresh_inspect,
        },
        "referenceMatching": {
            "prepared": prepared_matching,
            "busy": busy_matching,
            "promoted": promoted_matching,
            "replay": replay_matching,
            "proposalRows": proposal_page.records.len(),
            "accepted": accepted,
            "partial": partial,
            "inspect": matching_inspect,
        },
        "crossApplication": {
            "graphBeforeRefresh": graph_before_refresh,
            "graphAfterRefresh": graph_after_refresh,
            "graphAfterReview": graph_after_review,
            "explicitRebuild": explicit_rebuild,
            "graphAfterExplicitRebuild": graph_after_explicit_rebuild,
        },
        "tables": table_snapshot,
        "canonical": {
            "before": canonical_before,
            "after": canonical_after,
            "journal": Value::Null,
            "receipt": Value::Null,
        },
        "reopen": reopen,
    });
    println!(
        "{}",
        serde_json::to_string(&report).map_err(|_| "parity_report_invalid")?
    );
    Ok(())
}
