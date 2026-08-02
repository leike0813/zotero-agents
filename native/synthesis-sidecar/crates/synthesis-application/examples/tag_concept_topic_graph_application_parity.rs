//! Development-only Tag/Concept/Topic Graph application parity driver.
//! This example is not linked into the production sidecar.

use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_application::concept_kb::{
    ConceptConfidence, ConceptIndexOutput, ConceptIngestRequest, ConceptKbComputePort,
    ConceptProposal, ConceptReviewAction, ConceptReviewRequest,
};
use synthesis_application::tag_vocabulary::{
    TagHostEffectPort, TagIndexOutput, TagLegacyBindingResolverPort, TagPromoteRequest,
    TagVocabularyComputePort,
};
use synthesis_application::topic_graph::{
    TopicGraphComputePort, TopicGraphIndexOutput, TopicGraphIngestRequest,
    TopicGraphMarkDeletedRequest, TopicGraphProposal, TopicGraphProposalKind,
    TopicGraphPurgeRequest, TopicGraphRelationDecisionRequest, TopicGraphRelationStatus,
};
use synthesis_application::{
    ConceptKbApplication, RepositoryPort, TagVocabularyApplication, TopicGraphApplication,
};
use synthesis_repository::{
    ConceptKbReplacement, Repository, RepositoryIdentity, TagApplicationStateRecord,
    TagEffectRecord, TagProtocolRecord, TagStagedSuggestionRecord, TagVocabularyEntryRecord,
    TagVocabularyReplacement, TopicGraphApplicationStateRecord, TopicGraphEdgeRecord,
    TopicGraphNodeRecord, TopicGraphReplacement,
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
    fault_phases: Vec<String>,
    fixture: Fixture,
    coverage: Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Fixture {
    tag: TagFixture,
    concept: ConceptFixture,
    topic_graph: TopicGraphFixture,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagFixture {
    initial_tag: String,
    promoted_tag: String,
    library_id: i64,
    item_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptFixture {
    first_label: String,
    review_label: String,
    topic_id: String,
    topic_path_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicGraphFixture {
    root_topic_id: String,
    child_topic_id: String,
    root_title: String,
    child_title: String,
}

struct TagCompute;

impl TagVocabularyComputePort for TagCompute {
    fn validate(
        &self,
        candidate: &TagVocabularyReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagVocabularyReplacement, String> {
        Ok(candidate.clone())
    }

    fn build_index(
        &self,
        entries: &[TagVocabularyEntryRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagIndexOutput, String> {
        Ok(TagIndexOutput {
            index_hash: format!("fixture:tag-index:{}", entries.len()),
            index_json: serde_json::to_string(&json!({
                "tags": entries.iter().map(|entry| &entry.tag).collect::<Vec<_>>()
            }))
            .map_err(|_| "fixture_invalid")?,
        })
    }
}

struct FailingHost;

impl TagHostEffectPort for FailingHost {
    fn apply(&self, _effect: &TagEffectRecord) -> Result<(), String> {
        Err("fixture_host_unavailable".into())
    }
}

struct BindingResolver;

impl TagLegacyBindingResolverPort for BindingResolver {
    fn resolve(
        &self,
        staged: &[TagStagedSuggestionRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        Ok(staged.to_vec())
    }
}

struct ConceptCompute;

impl ConceptKbComputePort for ConceptCompute {
    fn build_index(
        &self,
        snapshot: &ConceptKbReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<ConceptIndexOutput, String> {
        Ok(ConceptIndexOutput {
            index_hash: format!("fixture:concept-index:{}", snapshot.concepts.len()),
            index_json: serde_json::to_string(&json!({
                "labels": snapshot.concepts.iter().map(|concept| &concept.label).collect::<Vec<_>>()
            }))
            .map_err(|_| "fixture_invalid")?,
        })
    }

    fn query(
        &self,
        _index_json: &str,
        request: &Value,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Value, String> {
        Ok(json!({"matches": request["labels"].as_array().map_or(0, Vec::len)}))
    }
}

struct TopicCompute;

impl TopicGraphComputePort for TopicCompute {
    fn build_index(
        &self,
        snapshot: &TopicGraphReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TopicGraphIndexOutput, String> {
        Ok(TopicGraphIndexOutput {
            index_hash: format!("fixture:topic-graph-index:{}", snapshot.nodes.len()),
            index_json: serde_json::to_string(&json!({
                "roots": snapshot.nodes.iter().filter(|node| node.is_root != 0)
                    .map(|node| &node.topic_id).collect::<Vec<_>>()
            }))
            .map_err(|_| "fixture_invalid")?,
        })
    }
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

fn tag_replacement(hash: &str, tag: &str, now: &str) -> TagVocabularyReplacement {
    TagVocabularyReplacement {
        state: TagApplicationStateRecord {
            singleton_id: 1,
            vocabulary_hash: hash.into(),
            index_json: "{}".into(),
            index_stale: 1,
            updated_at: now.into(),
            ..TagApplicationStateRecord::default()
        },
        entries: vec![TagVocabularyEntryRecord {
            tag: tag.into(),
            facet: tag.split(':').next().unwrap_or("topic").into(),
            aliases_json: "[]".into(),
            abbrev_json: "[]".into(),
            source: "fixture".into(),
            created_at: now.into(),
            updated_at: now.into(),
            ..TagVocabularyEntryRecord::default()
        }],
        protocols: vec![TagProtocolRecord {
            protocol_id: "active".into(),
            version: "1.0.0".into(),
            tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$".into(),
            max_tag_length: 120,
            facets_json: "[\"topic\",\"method\"]".into(),
            updated_at: now.into(),
        }],
        ..TagVocabularyReplacement::default()
    }
}

fn topic_node(id: &str, title: &str, root: bool, now: &str) -> TopicGraphNodeRecord {
    TopicGraphNodeRecord {
        topic_id: id.into(),
        title: title.into(),
        aliases_json: "[]".into(),
        node_type: "materialized".into(),
        definition_status: "has_synthesis".into(),
        is_root: i64::from(root),
        level: "normal".into(),
        created_at: now.into(),
        updated_at: now.into(),
        ..TopicGraphNodeRecord::default()
    }
}

fn main() -> Result<(), String> {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|error| error.to_string())?;
    let request: DriverRequest =
        serde_json::from_str(&input).map_err(|error| format!("parity_fixture_invalid:{error}"))?;
    if request.corpus.schema != "synthesis-tag-concept-topic-graph-application-parity.v1"
        || request.corpus.report_schema
            != "synthesis-tag-concept-topic-graph-application-parity-report.v1"
        || request.corpus.operation_ids.len() < 4
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

    let tag = TagVocabularyApplication::with_clock(
        port.clone(),
        Arc::new(TagCompute),
        Arc::new(FailingHost),
        Arc::new(BindingResolver),
        now.clone(),
    );
    let tag_initial = tag.save(
        None,
        &tag_replacement(
            "fixture:tag:1",
            &request.corpus.fixture.tag.initial_tag,
            &request.corpus.clock,
        ),
    );
    let staged_row = TagStagedSuggestionRecord {
        tag: request.corpus.fixture.tag.promoted_tag.clone(),
        facet: "method".into(),
        source_flow: "fixture".into(),
        parent_bindings_json: serde_json::to_string(&json!([{
            "libraryId": request.corpus.fixture.tag.library_id,
            "itemKey": request.corpus.fixture.tag.item_key
        }]))
        .map_err(|_| "fixture_invalid")?,
        created_at: request.corpus.clock.clone(),
        updated_at: request.corpus.clock.clone(),
        ..TagStagedSuggestionRecord::default()
    };
    let tag_staged = tag.stage(0, std::slice::from_ref(&staged_row));
    let tag_promoted = tag.promote(&TagPromoteRequest {
        expected_vocabulary_hash: "fixture:tag:1".into(),
        expected_staged_revision: 1,
        tags: vec![request.corpus.fixture.tag.promoted_tag.clone()],
    });
    let tag_promoted_hash = tag_promoted
        .vocabulary_hash
        .as_deref()
        .ok_or("fixture_tag_promotion_missing_hash")?;
    let tag_index = tag.rebuild_index(tag_promoted_hash);
    let tag_inspect = tag.inspect()?;

    let concept =
        ConceptKbApplication::with_clock(port.clone(), Arc::new(ConceptCompute), now.clone());
    let proposal = |label: String, confidence: ConceptConfidence| ConceptProposal {
        short_definition: format!("{label} short"),
        definition: format!("{label} definition"),
        label,
        aliases: Vec::new(),
        concept_type: "method".into(),
        domain: "research".into(),
        disambiguation: String::new(),
        topic_relevance: String::new(),
        confidence,
        evidence: Vec::new(),
        relations: Vec::new(),
    };
    let concept_created = concept.ingest_proposals(&ConceptIngestRequest {
        expected_manifest_hash: None,
        topic_id: request.corpus.fixture.concept.topic_id.clone(),
        topic_path_id: request.corpus.fixture.concept.topic_path_id.clone(),
        proposals: vec![proposal(
            request.corpus.fixture.concept.first_label.clone(),
            ConceptConfidence::High,
        )],
    });
    let concept_created_hash = concept_created
        .manifest_hash
        .clone()
        .ok_or("fixture_concept_create_missing_hash")?;
    let concept_proposed = concept.ingest_proposals(&ConceptIngestRequest {
        expected_manifest_hash: Some(concept_created_hash),
        topic_id: format!("{}:review", request.corpus.fixture.concept.topic_id),
        topic_path_id: format!("{}-review", request.corpus.fixture.concept.topic_path_id),
        proposals: vec![proposal(
            request.corpus.fixture.concept.review_label.clone(),
            ConceptConfidence::Low,
        )],
    });
    let concept_proposed_hash = concept_proposed
        .manifest_hash
        .clone()
        .ok_or("fixture_concept_proposal_missing_hash")?;
    let review_id = concept
        .load()?
        .reviews
        .first()
        .map(|review| review.review_id.clone())
        .ok_or("fixture_concept_review_missing")?;
    let concept_review = concept.review(&ConceptReviewRequest {
        expected_manifest_hash: concept_proposed_hash,
        review_id,
        action: ConceptReviewAction::Approve,
        target_concept_id: None,
    });
    let concept_review_hash = concept_review
        .manifest_hash
        .as_deref()
        .ok_or("fixture_concept_review_missing_hash")?;
    let concept_index = concept.rebuild_index(concept_review_hash);
    let concept_query = concept.query(&json!({"labels":[
        request.corpus.fixture.concept.first_label
    ]}))?;
    let concept_inspect = concept.inspect()?;

    let topic_graph =
        TopicGraphApplication::with_clock(port.clone(), Arc::new(TopicCompute), now.clone());
    let root_node = topic_node(
        &request.corpus.fixture.topic_graph.root_topic_id,
        &request.corpus.fixture.topic_graph.root_title,
        true,
        &request.corpus.clock,
    );
    let child_node = topic_node(
        &request.corpus.fixture.topic_graph.child_topic_id,
        &request.corpus.fixture.topic_graph.child_title,
        false,
        &request.corpus.clock,
    );
    let topic_initial = TopicGraphReplacement {
        state: TopicGraphApplicationStateRecord {
            singleton_id: 1,
            manifest_hash: "fixture:topic-graph:1".into(),
            index_json: "{}".into(),
            index_stale: 1,
            updated_at: request.corpus.clock.clone(),
            ..TopicGraphApplicationStateRecord::default()
        },
        nodes: vec![root_node.clone(), child_node.clone()],
        ..TopicGraphReplacement::default()
    };
    let topic_created = topic_graph.replace_snapshot(None, &topic_initial);
    let topic_created_hash = topic_created
        .manifest_hash
        .clone()
        .ok_or("fixture_topic_create_missing_hash")?;
    let topic_ingested = topic_graph.ingest_proposals(&TopicGraphIngestRequest {
        expected_manifest_hash: topic_created_hash,
        source_topic_id: root_node.topic_id.clone(),
        proposals: vec![TopicGraphProposal {
            proposal_type: TopicGraphProposalKind::TargetIsNarrowerTopicCandidate,
            target_topic_id: child_node.topic_id.clone(),
            target_title: None,
            confidence: Some(0.9),
            provenance: vec![json!({"source": "fixture"})],
            evidence_refs: Vec::new(),
        }],
    });
    let topic_ingested_hash = topic_ingested
        .manifest_hash
        .clone()
        .ok_or("fixture_topic_ingest_missing_hash")?;
    let edge_id = topic_graph
        .load()?
        .edges
        .first()
        .map(|edge| edge.edge_id.clone())
        .ok_or("fixture_topic_edge_missing")?;
    let topic_decided = topic_graph.decide_relation(&TopicGraphRelationDecisionRequest {
        expected_manifest_hash: topic_ingested_hash,
        edge_id,
        status: TopicGraphRelationStatus::Confirmed,
    });
    let topic_decided_hash = topic_decided
        .manifest_hash
        .clone()
        .ok_or("fixture_topic_decision_missing_hash")?;
    let decided_snapshot = topic_graph.load()?;
    let edge = decided_snapshot
        .edges
        .first()
        .cloned()
        .ok_or("fixture_topic_decided_edge_missing")?;
    let cycle_snapshot = TopicGraphReplacement {
        state: TopicGraphApplicationStateRecord {
            manifest_hash: "fixture:topic-graph:cycle".into(),
            ..decided_snapshot.state.clone()
        },
        nodes: vec![root_node.clone(), child_node.clone()],
        edges: vec![
            edge,
            TopicGraphEdgeRecord {
                edge_id: "edge:child-root".into(),
                source_topic_id: child_node.topic_id.clone(),
                target_topic_id: root_node.topic_id.clone(),
                relation: "broader_than".into(),
                status: "confirmed".into(),
                confidence: Some(0.9),
                provenance_json: "[]".into(),
                evidence_refs_json: "[]".into(),
                created_at: request.corpus.clock.clone(),
                updated_at: request.corpus.clock.clone(),
            },
        ],
        reviews: Vec::new(),
    };
    let topic_cycle = topic_graph.replace_snapshot(Some(&topic_decided_hash), &cycle_snapshot);
    let mut deleted_snapshot = topic_graph.load()?;
    deleted_snapshot.state.manifest_hash = "fixture:topic-graph:deleted".into();
    deleted_snapshot
        .nodes
        .iter_mut()
        .find(|node| node.topic_id == root_node.topic_id)
        .ok_or("fixture_topic_root_missing")?
        .definition_status = "deleted".into();
    let topic_deleted = topic_graph.replace_snapshot(Some(&topic_decided_hash), &deleted_snapshot);
    let topic_deleted_hash = topic_deleted
        .manifest_hash
        .clone()
        .ok_or("fixture_topic_delete_missing_hash")?;
    let topic_marked = topic_graph.mark_topic_relations_deleted(&TopicGraphMarkDeletedRequest {
        expected_manifest_hash: topic_deleted_hash,
        topic_id: root_node.topic_id.clone(),
        deleted_path_id: "topic-root-deleted".into(),
    });
    let topic_marked_hash = topic_marked
        .manifest_hash
        .clone()
        .ok_or("fixture_topic_mark_missing_hash")?;
    let topic_purged = topic_graph.purge_deleted(&TopicGraphPurgeRequest {
        expected_manifest_hash: topic_marked_hash,
        topic_ids: vec![root_node.topic_id.clone()],
    });
    let topic_purged_hash = topic_purged
        .manifest_hash
        .as_deref()
        .ok_or("fixture_topic_purge_missing_hash")?;
    let topic_index = topic_graph.rebuild_index(topic_purged_hash);
    let topic_inspect = topic_graph.inspect()?;

    let table_snapshot = owner
        .lock()
        .map_err(|_| "repository_unavailable")?
        .table_snapshot()?;
    tag.shutdown(Duration::from_secs(1))?;
    concept.shutdown(Duration::from_secs(1))?;
    topic_graph.shutdown(Duration::from_secs(1))?;
    drop(tag);
    drop(concept);
    drop(topic_graph);
    drop(port);
    drop(owner);

    let reopened = Repository::open_at(&request.runtime_root, identity, &request.corpus.clock)?;
    let reopen_snapshot = reopened.table_snapshot()?;
    let reopen = json!({
        "tag": reopened.get_tag_application_state()?,
        "concept": reopened.get_concept_application_state()?,
        "topicGraph": reopened.get_topic_graph_application_state()?,
        "tables": reopen_snapshot,
    });
    drop(reopened);
    let canonical_after = tree(&request.canonical_root)?;
    let report = json!({
        "schema": request.corpus.report_schema,
        "corpusVersion": request.corpus.schema,
        "driver": "development_only",
        "productionCapabilityRegistered": false,
        "tagVocabulary": {
            "saved": tag_initial,
            "staged": tag_staged,
            "promoted": tag_promoted,
            "indexed": tag_index,
            "inspect": tag_inspect,
        },
        "conceptKb": {
            "created": concept_created,
            "reviewed": concept_review,
            "indexed": concept_index,
            "query": concept_query,
            "inspect": concept_inspect,
        },
        "topicGraph": {
            "created": topic_created,
            "decided": topic_decided,
            "cycle": topic_cycle,
            "purged": topic_purged,
            "indexed": topic_index,
            "inspect": topic_inspect,
        },
        "crossApplication": {
            "tagPresent": true,
            "conceptPresent": true,
            "topicGraphPresent": true,
            "downstreamTriggered": false,
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
