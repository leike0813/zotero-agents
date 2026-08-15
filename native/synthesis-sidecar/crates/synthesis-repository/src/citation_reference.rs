//! Typed persistence boundary for the existing Citation/Reference table families.
//!
//! Application policy deliberately stays outside this module.  The records below are
//! the narrow state and replacement DTOs needed by private applications; SQL table
//! selection is internal and fixed so callers cannot turn this into a generic store.

use crate::{
    ReferenceRedirectGraph, Repository, ReviewPage, ReviewPageQuery,
    is_explicit_reference_redirect_reason, rank_reference_redirect_roots, row_integer, row_text,
    validate_identity_part,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const CITATION_GRAPH_DEFAULT_NODE_MAX: usize = 20_000;
pub const CITATION_GRAPH_DEFAULT_EDGE_MAX: usize = 80_000;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphApplicationStateRecord {
    pub graph_hash: String,
    pub input_hash: String,
    pub metrics_hash: Option<String>,
    pub node_count: i64,
    pub edge_count: i64,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationNodeRecord {
    pub literature_item_id: String,
    pub node_status: String,
    pub has_zotero_binding: bool,
    pub title: String,
    pub year: String,
    pub authors_json: String,
    pub summary_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationEdgeRecord {
    pub edge_id: String,
    pub source_literature_item_id: String,
    pub target_literature_item_id: String,
    pub reference_instance_id: String,
    pub resolution_id: String,
    pub edge_status: String,
    pub roles_json: String,
    pub weight: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelatedItemsAcceptedEdgeRecord {
    pub edge_id: String,
    pub source_literature_item_id: String,
    pub target_literature_item_id: String,
    pub source_library_id: i64,
    pub source_item_key: String,
    pub target_library_id: i64,
    pub target_item_key: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RelatedItemsSyncEffectRecord {
    pub effect_id: String,
    pub payload_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationSourceOwnershipRecord {
    pub source_literature_item_id: String,
    pub edge_id: String,
    pub reference_instance_id: String,
    pub target_literature_item_id: String,
    pub edge_status: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationIncomingGroupRecord {
    pub target_literature_item_id: String,
    pub source_literature_item_id: String,
    pub edge_id: String,
    pub reference_instance_id: String,
    pub edge_status: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationLightMetricsRecord {
    pub literature_item_id: String,
    pub outgoing_count: i64,
    pub incoming_count: i64,
    pub matched_outgoing_count: i64,
    pub unresolved_outgoing_count: i64,
    pub ambiguous_outgoing_count: i64,
    pub local_degree: i64,
    pub source_structure_version: i64,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationComplexMetricsRecord {
    pub literature_item_id: String,
    pub node_id: String,
    pub paper_ref: String,
    pub item_key: String,
    pub title: String,
    pub year: String,
    pub internal_in_degree: i64,
    pub internal_out_degree: i64,
    pub external_reference_count: i64,
    pub unresolved_reference_count: i64,
    pub internal_pagerank: f64,
    pub component_id: String,
    pub component_size: i64,
    pub is_isolated: bool,
    pub age_norm: f64,
    pub recency_norm: f64,
    pub in_degree_norm: f64,
    pub out_degree_norm: f64,
    pub pagerank_norm: f64,
    pub foundation_score: f64,
    pub frontier_score: f64,
    pub synthesis_role_hints_json: String,
    pub source_structure_version: i64,
    pub source_graph_hash: String,
    pub metrics_hash: String,
    pub status: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationLayoutRecord {
    pub layout_key: String,
    pub view_key: String,
    pub preset: String,
    pub graph_hash: String,
    pub status: String,
    pub layout_json: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CitationMetricsSort {
    #[default]
    Foundation,
    Frontier,
    Pagerank,
    InDegree,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CitationMetricsPageQuery {
    pub offset: usize,
    pub limit: usize,
    pub sort_by: CitationMetricsSort,
    pub paper_refs: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CitationMetricsPageRows {
    pub records: Vec<CitationComplexMetricsRecord>,
    pub total: usize,
    pub stale: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CitationLayoutMetadataRecord {
    pub layout_key: String,
    pub view_key: String,
    pub preset: String,
    pub graph_hash: String,
    pub layout_hash: String,
    pub layout_version: i64,
    pub status: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CitationLayoutPointRecord {
    pub node_id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CitationLayoutWindowRecord {
    pub metadata: CitationLayoutMetadataRecord,
    pub points: Vec<CitationLayoutPointRecord>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceApplicationStateRecord {
    pub reference_hash: String,
    pub input_hash: String,
    pub source_count: i64,
    pub reference_count: i64,
    pub canonical_count: i64,
    pub binding_count: i64,
    pub reference_ready: bool,
    pub graph_ready: bool,
    pub related_items_ready: bool,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ReferenceProjectionSnapshot {
    pub state: Option<ReferenceApplicationStateRecord>,
    pub sources: Vec<ReferenceSourceRecord>,
    pub artifacts: Vec<ReferenceArtifactRecord>,
    pub raw_references: Vec<RawReferenceRecord>,
    pub bindings: Vec<ReferenceBindingFactRecord>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceSourceRecord {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    pub title: String,
    pub year: String,
    pub metadata_hash: String,
    pub summary_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceArtifactRecord {
    pub paper_ref: String,
    pub artifact_type: String,
    pub payload_type: String,
    pub status: String,
    pub locator: String,
    pub payload_hash: String,
    pub diagnostics_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LiteratureMatchingMetadataRecord {
    pub literature_item_id: String,
    pub schema_id: String,
    pub key_terms_json: String,
    pub methods_json: String,
    pub problems_json: String,
    pub datasets_json: String,
    pub exclude_terms_json: String,
    pub source_artifact_hash: String,
    pub metadata_hash: String,
    pub diagnostics_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RawReferenceRecord {
    pub raw_reference_id: String,
    pub source_ref: String,
    pub references_artifact_hash: String,
    pub reference_index: i64,
    pub raw_hash: String,
    pub parsed_title: String,
    pub normalized_title: String,
    pub year: String,
    pub authors_json: String,
    pub raw_reference: String,
    pub canonical_reference_id: String,
    pub status: String,
    pub roles_json: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalReferenceRecord {
    pub canonical_reference_id: String,
    pub title: String,
    pub normalized_title: String,
    pub year: String,
    pub authors_json: String,
    pub identifiers_json: String,
    pub metadata_hash: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRevisionReviewRecord {
    pub review_id: String,
    pub source_ref: String,
    pub canonical_reference_id: String,
    pub status: String,
    pub reason: String,
    pub payload_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceProjectionScope {
    #[default]
    Full,
    Sources,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceProjectionReplacement {
    pub expected_reference_hash: Option<String>,
    pub reference_hash: String,
    pub input_hash: String,
    pub scope: ReferenceProjectionScope,
    pub source_refs: Vec<String>,
    pub replace_reference_source_refs: Vec<String>,
    pub remove_binding_ids: Vec<String>,
    pub sources: Vec<ReferenceSourceRecord>,
    pub artifacts: Vec<ReferenceArtifactRecord>,
    pub raw_references: Vec<RawReferenceRecord>,
    pub canonicals: Vec<CanonicalReferenceRecord>,
    pub bindings: Vec<ReferenceBindingFactRecord>,
    pub reviews: Vec<ReferenceRevisionReviewRecord>,
    pub graph_facts_changed: bool,
    pub now: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingStateRecord {
    pub reference_hash: String,
    pub matching_hash: String,
    pub proposal_count: i64,
    pub open_proposal_count: i64,
    pub matching_ready: bool,
    pub graph_ready: bool,
    pub related_items_ready: bool,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchProposalRecord {
    pub proposal_id: String,
    pub kind: String,
    pub status: String,
    pub source_canonical_reference_id: String,
    pub source_raw_reference_ids_json: String,
    pub target_canonical_reference_id: String,
    pub target_library_id: i64,
    pub target_item_key: String,
    pub confidence: String,
    pub score: f64,
    pub reasons_json: String,
    pub evidence_json: String,
    pub diagnostics_json: String,
    pub basis_hash: String,
    pub source_hash: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingPreparationRecord {
    pub preparation_id: String,
    pub reference_hash: String,
    pub repository_basis_hash: String,
    pub host_basis_hash: String,
    pub status: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceBindingFactRecord {
    pub binding_id: String,
    pub canonical_reference_id: String,
    pub library_id: i64,
    pub item_key: String,
    pub status: String,
    pub confidence: String,
    pub reviewer: String,
    pub basis_hash: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceRedirectFactRecord {
    pub from_canonical_reference_id: String,
    pub to_canonical_reference_id: String,
    pub reason: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingPromotion {
    pub expected_reference_hash: String,
    pub expected_repository_basis_hash: String,
    pub matching_hash: String,
    pub proposals: Vec<ReferenceMatchProposalRecord>,
    pub bindings: Vec<ReferenceBindingFactRecord>,
    pub redirects: Vec<ReferenceRedirectFactRecord>,
    pub graph_facts_changed: bool,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceReviewTransition {
    pub proposal: ReferenceMatchProposalRecord,
    pub revoke_binding_id: String,
    pub revoke_redirect_source_ids: Vec<String>,
    pub binding: Option<ReferenceBindingFactRecord>,
    pub redirects: Vec<ReferenceRedirectFactRecord>,
    pub audit_proposals: Vec<ReferenceMatchProposalRecord>,
    #[serde(default)]
    pub preferred_root_canonical_id: String,
    pub graph_facts_changed: bool,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphReplacement {
    pub state: CitationGraphApplicationStateRecord,
    pub nodes: Vec<CitationNodeRecord>,
    pub edges: Vec<CitationEdgeRecord>,
    pub ownership: Vec<CitationSourceOwnershipRecord>,
    pub incoming_groups: Vec<CitationIncomingGroupRecord>,
    pub light_metrics: Vec<CitationLightMetricsRecord>,
    pub complex_metrics: Vec<CitationComplexMetricsRecord>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum CitationGraphPromotion {
    Full {
        expected_graph_hash: Option<String>,
        replacement: CitationGraphReplacement,
    },
    SourceSlice {
        expected_graph_hash: String,
        source_ids: Vec<String>,
        replacement: CitationGraphReplacement,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub struct CitationGraphPromotionCommit {
    pub promotion: CitationGraphPromotion,
    pub ready_cache: crate::CacheBasisRecord,
    pub terminal_operation: crate::OperationRecord,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CitationGraphPromotionResult {
    Promoted { graph_hash: String },
    BasisMismatch,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CitationGraphWindowFilter {
    pub node_kinds: Vec<String>,
    pub roles: Vec<String>,
    pub include_low_signal: bool,
    pub search: String,
    pub topic_node_ids: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CitationGraphWindowQuery {
    pub node_offset: usize,
    pub node_limit: usize,
    pub edge_offset: usize,
    pub edge_limit: usize,
    pub hover_node_offset: usize,
    pub hover_node_limit: usize,
    pub hover_edge_offset: usize,
    pub hover_edge_limit: usize,
    pub filter: CitationGraphWindowFilter,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CitationGraphWindowNodeRecord {
    pub record: CitationNodeRecord,
    pub external_degree: i64,
    pub visibility: String,
    pub light_metrics: Option<CitationLightMetricsRecord>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CitationGraphWindowEdgeRecord {
    pub record: CitationEdgeRecord,
    pub visibility: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CitationGraphWindowRows {
    pub nodes: Vec<CitationGraphWindowNodeRecord>,
    pub edges: Vec<CitationGraphWindowEdgeRecord>,
    pub hover_nodes: Vec<CitationGraphWindowNodeRecord>,
    pub hover_edges: Vec<CitationGraphWindowEdgeRecord>,
    pub endpoint_nodes: Vec<CitationGraphWindowNodeRecord>,
    pub total_nodes: usize,
    pub total_edges: usize,
    pub total_hover_nodes: usize,
    pub total_hover_edges: usize,
    pub role_options: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct CitationGraphNeighborhoodRows {
    pub nodes: Vec<CitationGraphWindowNodeRecord>,
    pub edges: Vec<CitationGraphWindowEdgeRecord>,
    pub truncated: bool,
}

impl Repository {
    pub fn get_citation_graph_application_state(
        &self,
    ) -> Result<Option<CitationGraphApplicationStateRecord>, String> {
        self.query(
            "SELECT graph_hash,input_hash,metrics_hash,node_count,edge_count,updated_at \
             FROM synt_citation_graph_application_state WHERE singleton_id='active' LIMIT 1",
            &[],
        )?
        .into_iter()
        .next()
        .map(|row| {
            Ok(CitationGraphApplicationStateRecord {
                graph_hash: row_text(&row, "graph_hash")?,
                input_hash: row_text(&row, "input_hash")?,
                metrics_hash: Some(row_text(&row, "metrics_hash")?)
                    .filter(|value| !value.is_empty()),
                node_count: row_integer(&row, "node_count")?,
                edge_count: row_integer(&row, "edge_count")?,
                updated_at: row_text(&row, "updated_at")?,
            })
        })
        .transpose()
    }

    pub fn get_reference_application_state(
        &self,
    ) -> Result<Option<ReferenceApplicationStateRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_application_state WHERE singleton_id=1 LIMIT 1",
            &[],
        )?
        .into_iter()
        .next()
        .map(reference_state_record)
        .transpose()
    }

    pub fn load_reference_projection_snapshot(
        &self,
    ) -> Result<ReferenceProjectionSnapshot, String> {
        Ok(ReferenceProjectionSnapshot {
            state: self.get_reference_application_state()?,
            sources: self.list_reference_sources()?,
            artifacts: self.list_reference_artifacts(&[])?,
            raw_references: self.list_raw_references()?,
            bindings: self.list_reference_bindings()?,
        })
    }

    pub fn get_reference_matching_state(
        &self,
    ) -> Result<Option<ReferenceMatchingStateRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_matching_state WHERE singleton_id=1 LIMIT 1",
            &[],
        )?
        .into_iter()
        .next()
        .map(matching_state_record)
        .transpose()
    }

    pub fn list_citation_nodes(&self) -> Result<Vec<CitationNodeRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_node ORDER BY literature_item_id ASC",
            &[],
        )?
        .into_iter()
        .map(citation_node_record)
        .collect()
    }

    pub fn list_citation_edges(&self) -> Result<Vec<CitationEdgeRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_edge
             ORDER BY source_literature_item_id ASC,edge_id ASC",
            &[],
        )?
        .into_iter()
        .map(citation_edge_record)
        .collect()
    }

    pub fn list_related_items_accepted_edges(
        &self,
        source_refs: &[String],
    ) -> Result<Vec<RelatedItemsAcceptedEdgeRecord>, String> {
        let source_refs = source_refs.iter().cloned().collect::<BTreeSet<_>>();
        let parse_ref = |value: &str| -> Option<(i64, String)> {
            let (library_id, item_key) = value.split_once(':')?;
            let library_id = library_id.parse::<i64>().ok().filter(|value| *value > 0)?;
            if item_key.is_empty() || !item_key.bytes().all(|byte| byte.is_ascii_alphanumeric()) {
                return None;
            }
            Some((library_id, item_key.into()))
        };
        let active_nodes = self
            .list_citation_nodes()?
            .into_iter()
            .filter(|node| node.node_status == "active")
            .filter_map(|node| {
                parse_ref(&node.literature_item_id)
                    .map(|binding| (node.literature_item_id, binding))
            })
            .collect::<BTreeMap<_, _>>();
        let mut records = self
            .list_citation_edges()?
            .into_iter()
            .filter(|edge| edge.edge_status == "accepted")
            .filter(|edge| {
                source_refs.is_empty() || source_refs.contains(&edge.source_literature_item_id)
            })
            .filter_map(|edge| {
                let (source_library_id, source_item_key) =
                    active_nodes.get(&edge.source_literature_item_id)?.clone();
                let (target_library_id, target_item_key) =
                    active_nodes.get(&edge.target_literature_item_id)?.clone();
                Some(RelatedItemsAcceptedEdgeRecord {
                    edge_id: edge.edge_id,
                    source_literature_item_id: edge.source_literature_item_id,
                    target_literature_item_id: edge.target_literature_item_id,
                    source_library_id,
                    source_item_key,
                    target_library_id,
                    target_item_key,
                })
            })
            .collect::<Vec<_>>();
        records.sort_by(|left, right| left.edge_id.cmp(&right.edge_id));
        records.dedup_by(|left, right| left.edge_id == right.edge_id);
        Ok(records)
    }

    pub fn list_related_items_sync_effects(
        &self,
    ) -> Result<Vec<RelatedItemsSyncEffectRecord>, String> {
        self.query(
            "SELECT effect_id,payload_json,updated_at FROM synt_related_items_sync_effect ORDER BY effect_id ASC",
            &[],
        )?
        .into_iter()
        .map(|row| {
            Ok(RelatedItemsSyncEffectRecord {
                effect_id: row_text(&row, "effect_id")?,
                payload_json: row_text(&row, "payload_json")?,
                updated_at: row_text(&row, "updated_at")?,
            })
        })
        .collect()
    }

    pub fn get_related_items_sync_effect(
        &self,
        effect_id: &str,
    ) -> Result<Option<RelatedItemsSyncEffectRecord>, String> {
        validate_identity_part(effect_id)?;
        self.query(
            "SELECT effect_id,payload_json,updated_at FROM synt_related_items_sync_effect WHERE effect_id=?1 LIMIT 1",
            &[json!(effect_id)],
        )?
        .into_iter()
        .next()
        .map(|row| {
            Ok(RelatedItemsSyncEffectRecord {
                effect_id: row_text(&row, "effect_id")?,
                payload_json: row_text(&row, "payload_json")?,
                updated_at: row_text(&row, "updated_at")?,
            })
        })
        .transpose()
    }

    pub fn upsert_related_items_sync_effect(
        &self,
        record: &RelatedItemsSyncEffectRecord,
    ) -> Result<(), String> {
        validate_identity_part(&record.effect_id)?;
        serde_json::from_str::<Value>(&record.payload_json)
            .map_err(|_| "repository_payload_invalid".to_owned())?;
        self.execute(
            "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)
             ON CONFLICT(effect_id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at",
            &[json!(record.effect_id), json!(record.payload_json), json!(record.updated_at)],
        )?;
        Ok(())
    }

    pub fn read_citation_graph_window(
        &self,
        request: &CitationGraphWindowQuery,
    ) -> Result<CitationGraphWindowRows, String> {
        let (cte, values) = citation_graph_window_cte(
            &request.filter,
            self.citation_graph_projection_may_exceed_bounds()?,
        )?;
        let counts = self
            .query(
                &format!(
                    "{cte}
                     SELECT
                       SUM(CASE WHEN visibility='default' THEN 1 ELSE 0 END) AS total_nodes,
                       SUM(CASE WHEN visibility='hover_only' THEN 1 ELSE 0 END) AS total_hover_nodes
                     FROM filtered_nodes"
                ),
                &values,
            )?
            .into_iter()
            .next()
            .unwrap_or_else(|| json!({}));
        let edge_counts = self
            .query(
                &format!(
                    "{cte}
                     SELECT
                       SUM(CASE WHEN visibility='default' THEN 1 ELSE 0 END) AS total_edges,
                       SUM(CASE WHEN visibility='hover_only' THEN 1 ELSE 0 END) AS total_hover_edges
                     FROM filtered_edges"
                ),
                &values,
            )?
            .into_iter()
            .next()
            .unwrap_or_else(|| json!({}));
        let nodes = self.read_citation_graph_node_page(
            &cte,
            &values,
            "default",
            request.node_offset,
            request.node_limit,
        )?;
        let hover_nodes = self.read_citation_graph_node_page(
            &cte,
            &values,
            "hover_only",
            request.hover_node_offset,
            request.hover_node_limit,
        )?;
        let edges = self.read_citation_graph_edge_page(
            &cte,
            &values,
            "default",
            request.edge_offset,
            request.edge_limit,
        )?;
        let hover_edges = self.read_citation_graph_edge_page(
            &cte,
            &values,
            "hover_only",
            request.hover_edge_offset,
            request.hover_edge_limit,
        )?;
        let endpoint_ids = edges
            .iter()
            .chain(hover_edges.iter())
            .flat_map(|edge| {
                [
                    edge.record.source_literature_item_id.clone(),
                    edge.record.target_literature_item_id.clone(),
                ]
            })
            .collect::<BTreeSet<_>>();
        let returned_ids = nodes
            .iter()
            .chain(hover_nodes.iter())
            .map(|node| node.record.literature_item_id.clone())
            .collect::<BTreeSet<_>>();
        let missing_ids = endpoint_ids
            .difference(&returned_ids)
            .cloned()
            .collect::<Vec<_>>();
        let endpoint_nodes =
            self.read_citation_graph_endpoint_nodes(&cte, &values, &missing_ids)?;
        let role_options = self
            .query(
                &format!(
                    "{cte}
                     SELECT DISTINCT CASE
                       WHEN role.type='object' THEN json_extract(role.value,'$.role')
                       ELSE CAST(role.value AS TEXT)
                     END AS role
                     FROM filtered_edges edge_row,json_each(edge_row.roles_json) role
                     WHERE role IS NOT NULL AND role<>''
                     ORDER BY role ASC LIMIT 256"
                ),
                &values,
            )?
            .into_iter()
            .filter_map(|row| row["role"].as_str().map(str::to_owned))
            .collect();
        Ok(CitationGraphWindowRows {
            nodes,
            edges,
            hover_nodes,
            hover_edges,
            endpoint_nodes,
            total_nodes: nullable_count(&counts, "total_nodes")?,
            total_edges: nullable_count(&edge_counts, "total_edges")?,
            total_hover_nodes: nullable_count(&counts, "total_hover_nodes")?,
            total_hover_edges: nullable_count(&edge_counts, "total_hover_edges")?,
            role_options,
        })
    }

    pub fn read_citation_graph_neighborhood(
        &self,
        start_node_id: &str,
        direction: &str,
        max_nodes: usize,
        max_edges: usize,
        filter: &CitationGraphWindowFilter,
    ) -> Result<CitationGraphNeighborhoodRows, String> {
        validate_identity_part(start_node_id)?;
        let direction_clause = match direction {
            "incoming" => "target_literature_item_id=?",
            "outgoing" => "source_literature_item_id=?",
            "both" => "(source_literature_item_id=? OR target_literature_item_id=?)",
            _ => return Err("invalid_request".into()),
        };
        let (cte, mut values) =
            citation_graph_window_cte(filter, self.citation_graph_projection_may_exceed_bounds()?)?;
        values.push(json!(start_node_id));
        if direction == "both" {
            values.push(json!(start_node_id));
        }
        values.push(json!(max_edges.saturating_add(1) as i64));
        let candidates = self
            .query(
                &format!(
                    "{cte}
                     SELECT * FROM filtered_edges WHERE {direction_clause}
                     ORDER BY edge_id ASC LIMIT ?"
                ),
                &values,
            )?
            .into_iter()
            .map(citation_graph_window_edge_record)
            .collect::<Result<Vec<_>, _>>()?;
        let mut node_ids = BTreeSet::from([start_node_id.to_owned()]);
        let mut edges = Vec::new();
        for edge in &candidates {
            let needed = [
                edge.record.source_literature_item_id.clone(),
                edge.record.target_literature_item_id.clone(),
            ];
            let additional = needed.iter().filter(|id| !node_ids.contains(*id)).count();
            if node_ids.len() + additional > max_nodes.max(1) || edges.len() >= max_edges {
                continue;
            }
            node_ids.extend(needed);
            edges.push(edge.clone());
        }
        let nodes = self.read_citation_graph_endpoint_nodes(
            &cte,
            &values[..values.len() - if direction == "both" { 3 } else { 2 }],
            &node_ids.into_iter().collect::<Vec<_>>(),
        )?;
        Ok(CitationGraphNeighborhoodRows {
            nodes,
            truncated: candidates.len() > edges.len(),
            edges,
        })
    }

    pub fn read_citation_graph_explicit(
        &self,
        node_ids: &[String],
        max_edges: usize,
        filter: &CitationGraphWindowFilter,
    ) -> Result<CitationGraphNeighborhoodRows, String> {
        if node_ids.is_empty() || node_ids.len() > 5_000 || max_edges > 20_000 {
            return Err("invalid_request".into());
        }
        for node_id in node_ids {
            validate_identity_part(node_id)?;
        }
        let (cte, values) =
            citation_graph_window_cte(filter, self.citation_graph_projection_may_exceed_bounds()?)?;
        let nodes = self.read_citation_graph_endpoint_nodes(&cte, &values, node_ids)?;
        let retained = nodes
            .iter()
            .map(|node| node.record.literature_item_id.clone())
            .collect::<Vec<_>>();
        if retained.is_empty() {
            return Ok(CitationGraphNeighborhoodRows::default());
        }
        let mut bindings = values;
        bindings.extend(retained.iter().map(|id| json!(id)));
        bindings.extend(retained.iter().map(|id| json!(id)));
        bindings.push(json!(max_edges.saturating_add(1) as i64));
        let candidates = self
            .query(
                &format!(
                    "{cte}
                     SELECT * FROM filtered_edges
                     WHERE source_literature_item_id IN ({})
                       AND target_literature_item_id IN ({})
                     ORDER BY edge_id ASC LIMIT ?",
                    sql_placeholders(retained.len()),
                    sql_placeholders(retained.len())
                ),
                &bindings,
            )?
            .into_iter()
            .map(citation_graph_window_edge_record)
            .collect::<Result<Vec<_>, _>>()?;
        let truncated = candidates.len() > max_edges;
        Ok(CitationGraphNeighborhoodRows {
            nodes,
            edges: candidates.into_iter().take(max_edges).collect(),
            truncated,
        })
    }

    fn read_citation_graph_node_page(
        &self,
        cte: &str,
        values: &[Value],
        visibility: &str,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<CitationGraphWindowNodeRecord>, String> {
        let mut bindings = values.to_vec();
        bindings.extend([json!(visibility), json!(limit as i64), json!(offset as i64)]);
        self.query(
            &format!(
                "{cte}
                 SELECT n.*,
                   light.outgoing_count AS metric_outgoing_count,
                   light.incoming_count AS metric_incoming_count,
                   light.matched_outgoing_count AS metric_matched_outgoing_count,
                   light.unresolved_outgoing_count AS metric_unresolved_outgoing_count,
                   light.ambiguous_outgoing_count AS metric_ambiguous_outgoing_count,
                   light.local_degree AS metric_local_degree,
                   light.source_structure_version AS metric_source_structure_version,
                   light.updated_at AS metric_updated_at
                 FROM filtered_nodes n
                 LEFT JOIN synt_citation_metrics_light light
                   ON light.literature_item_id=n.literature_item_id
                 LEFT JOIN synt_citation_metrics_complex complex
                   ON complex.literature_item_id=n.literature_item_id
                 WHERE n.visibility=?
                 ORDER BY n.has_zotero_binding DESC,n.literature_item_id ASC
                 LIMIT ? OFFSET ?"
            ),
            &bindings,
        )?
        .into_iter()
        .map(citation_graph_window_node_record)
        .collect()
    }

    fn citation_graph_projection_may_exceed_bounds(&self) -> Result<bool, String> {
        Ok(self
            .get_citation_graph_application_state()?
            .is_none_or(|state| {
                state.node_count > CITATION_GRAPH_DEFAULT_NODE_MAX as i64
                    || state.edge_count > CITATION_GRAPH_DEFAULT_EDGE_MAX as i64
            }))
    }

    fn read_citation_graph_edge_page(
        &self,
        cte: &str,
        values: &[Value],
        visibility: &str,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<CitationGraphWindowEdgeRecord>, String> {
        let mut bindings = values.to_vec();
        bindings.extend([json!(visibility), json!(limit as i64), json!(offset as i64)]);
        self.query(
            &format!(
                "{cte}
                 SELECT * FROM filtered_edges
                 WHERE visibility=? ORDER BY edge_id ASC LIMIT ? OFFSET ?"
            ),
            &bindings,
        )?
        .into_iter()
        .map(citation_graph_window_edge_record)
        .collect()
    }

    fn read_citation_graph_endpoint_nodes(
        &self,
        cte: &str,
        values: &[Value],
        ids: &[String],
    ) -> Result<Vec<CitationGraphWindowNodeRecord>, String> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let mut bindings = values.to_vec();
        bindings.extend(ids.iter().map(|id| json!(id)));
        self.query(
            &format!(
                "{cte}
                 SELECT n.*,
                   light.outgoing_count AS metric_outgoing_count,
                   light.incoming_count AS metric_incoming_count,
                   light.matched_outgoing_count AS metric_matched_outgoing_count,
                   light.unresolved_outgoing_count AS metric_unresolved_outgoing_count,
                   light.ambiguous_outgoing_count AS metric_ambiguous_outgoing_count,
                   light.local_degree AS metric_local_degree,
                   light.source_structure_version AS metric_source_structure_version,
                   light.updated_at AS metric_updated_at
                 FROM filtered_nodes n
                 LEFT JOIN synt_citation_metrics_light light
                   ON light.literature_item_id=n.literature_item_id
                 WHERE n.literature_item_id IN ({})
                 ORDER BY n.literature_item_id ASC",
                sql_placeholders(ids.len())
            ),
            &bindings,
        )?
        .into_iter()
        .map(citation_graph_window_node_record)
        .collect()
    }

    pub fn list_citation_source_ownership(
        &self,
    ) -> Result<Vec<CitationSourceOwnershipRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_source_ownership
             ORDER BY source_literature_item_id ASC,edge_id ASC",
            &[],
        )?
        .into_iter()
        .map(citation_ownership_record)
        .collect()
    }

    pub fn list_citation_incoming_groups(
        &self,
    ) -> Result<Vec<CitationIncomingGroupRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_incoming_group
             ORDER BY target_literature_item_id ASC,edge_id ASC",
            &[],
        )?
        .into_iter()
        .map(citation_incoming_record)
        .collect()
    }

    pub fn list_citation_light_metrics(&self) -> Result<Vec<CitationLightMetricsRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_metrics_light ORDER BY literature_item_id ASC",
            &[],
        )?
        .into_iter()
        .map(citation_light_metrics_record)
        .collect()
    }

    pub fn read_citation_metrics_page(
        &self,
        request: &CitationMetricsPageQuery,
    ) -> Result<CitationMetricsPageRows, String> {
        if request.limit == 0
            || request.limit > 100
            || request.paper_refs.len() > 250
            || request
                .paper_refs
                .iter()
                .any(|value| value.trim().is_empty())
        {
            return Err("invalid_request".into());
        }
        let mut values = request
            .paper_refs
            .iter()
            .map(|value| json!(value))
            .collect::<Vec<_>>();
        let predicate = if request.paper_refs.is_empty() {
            String::new()
        } else {
            format!(
                "WHERE complex.paper_ref IN ({})",
                sql_placeholders(request.paper_refs.len())
            )
        };
        let total_row = self
            .query(
                &format!(
                    "SELECT COUNT(*) AS total,
                            COALESCE(MAX(CASE WHEN complex.status<>'ready'
                               OR COALESCE(light.source_structure_version,0)>
                                  complex.source_structure_version
                             THEN 1 ELSE 0 END),0) AS window_stale
                     FROM synt_citation_metrics_complex complex
                     LEFT JOIN synt_citation_metrics_light light
                       ON light.literature_item_id=complex.literature_item_id
                     {predicate}"
                ),
                &values,
            )?
            .into_iter()
            .next()
            .unwrap_or_else(|| json!({}));
        let total = nullable_count(&total_row, "total")?;
        let stale = row_integer(&total_row, "window_stale")? != 0;
        let order = match request.sort_by {
            CitationMetricsSort::Foundation => "complex.foundation_score DESC",
            CitationMetricsSort::Frontier => "complex.frontier_score DESC",
            CitationMetricsSort::Pagerank => "complex.internal_pagerank DESC",
            CitationMetricsSort::InDegree => "complex.internal_in_degree DESC",
        };
        values.extend([json!(request.limit as i64), json!(request.offset as i64)]);
        let rows = self.query(
            &format!(
                "SELECT complex.*
                 FROM synt_citation_metrics_complex complex
                 {predicate}
                 ORDER BY {order},complex.literature_item_id ASC
                 LIMIT ? OFFSET ?"
            ),
            &values,
        )?;
        Ok(CitationMetricsPageRows {
            records: rows
                .into_iter()
                .map(citation_complex_metrics_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
            stale,
        })
    }

    pub fn list_ready_citation_layout_presets(
        &self,
        graph_hash: &str,
    ) -> Result<Vec<String>, String> {
        validate_identity_part(graph_hash)?;
        Ok(self
            .query(
                "SELECT DISTINCT preset FROM synt_citation_layout_state
                 WHERE graph_hash=?1 AND status='ready'
                 ORDER BY preset ASC",
                &[json!(graph_hash)],
            )?
            .into_iter()
            .filter_map(|row| row["preset"].as_str().map(str::to_owned))
            .collect())
    }

    pub fn read_citation_layout_window(
        &self,
        layout_key: &str,
        node_ids: &[String],
    ) -> Result<Option<CitationLayoutWindowRecord>, String> {
        validate_identity_part(layout_key)?;
        if node_ids.len() > 5_000 {
            return Err("invalid_request".into());
        }
        for node_id in node_ids {
            validate_identity_part(node_id)?;
        }
        let Some(metadata) = self
            .query(
                "SELECT layout_key,view_key,preset,graph_hash,status,diagnostics_json,
                        created_at,updated_at,
                        COALESCE(json_extract(layout_json,'$.layout_hash'),'') AS layout_hash,
                        COALESCE(json_extract(layout_json,'$.layout_version'),0) AS layout_version
                 FROM synt_citation_layout_state WHERE layout_key=?1 LIMIT 1",
                &[json!(layout_key)],
            )?
            .into_iter()
            .next()
            .map(citation_layout_metadata_record)
            .transpose()?
        else {
            return Ok(None);
        };
        if node_ids.is_empty() {
            return Ok(Some(CitationLayoutWindowRecord {
                metadata,
                points: Vec::new(),
            }));
        }
        let mut values = vec![json!(layout_key)];
        values.extend(node_ids.iter().map(|node_id| json!(node_id)));
        let points = self
            .query(
                &format!(
                    "SELECT point.key AS node_id,
                            json_extract(point.value,'$.x') AS x,
                            json_extract(point.value,'$.y') AS y
                     FROM synt_citation_layout_state layout,
                          json_each(layout.layout_json,'$.nodes') point
                     WHERE layout.layout_key=?
                       AND point.key IN ({})
                     ORDER BY point.key ASC",
                    sql_placeholders(node_ids.len())
                ),
                &values,
            )?
            .into_iter()
            .map(citation_layout_point_record)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Some(CitationLayoutWindowRecord { metadata, points }))
    }

    pub fn list_reference_sources(&self) -> Result<Vec<ReferenceSourceRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_source ORDER BY paper_ref ASC",
            &[],
        )?
        .into_iter()
        .map(reference_source_record)
        .collect()
    }

    pub fn list_reference_artifacts(
        &self,
        source_refs: &[String],
    ) -> Result<Vec<ReferenceArtifactRecord>, String> {
        let (clause, values) = scoped_string_clause("paper_ref", source_refs)?;
        self.query(
            &format!(
                "SELECT * FROM synt_reference_artifact {clause}
                 ORDER BY paper_ref ASC,artifact_type ASC"
            ),
            &values,
        )?
        .into_iter()
        .map(reference_artifact_record)
        .collect()
    }

    pub fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_raw
             ORDER BY source_ref ASC,reference_index ASC,raw_reference_id ASC",
            &[],
        )?
        .into_iter()
        .map(raw_reference_record)
        .collect()
    }

    pub fn get_literature_matching_metadata(
        &self,
        literature_item_id: &str,
    ) -> Result<Option<LiteratureMatchingMetadataRecord>, String> {
        self.query(
            "SELECT * FROM synt_literature_matching_metadata
             WHERE literature_item_id=?1 LIMIT 1",
            &[json!(literature_item_id)],
        )?
        .into_iter()
        .next()
        .map(literature_matching_metadata_record)
        .transpose()
    }

    pub fn list_raw_references_for_sources(
        &self,
        source_refs: &[String],
    ) -> Result<Vec<RawReferenceRecord>, String> {
        if source_refs.is_empty() {
            return Ok(Vec::new());
        }
        let (clause, values) = scoped_string_clause("source_ref", source_refs)?;
        self.query(
            &format!(
                "SELECT * FROM synt_reference_raw {clause}
                 ORDER BY source_ref ASC,reference_index ASC,raw_reference_id ASC"
            ),
            &values,
        )?
        .into_iter()
        .map(raw_reference_record)
        .collect()
    }

    pub fn list_canonical_references(&self) -> Result<Vec<CanonicalReferenceRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_canonical ORDER BY canonical_reference_id ASC",
            &[],
        )?
        .into_iter()
        .map(canonical_reference_record)
        .collect()
    }

    pub fn list_reference_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_binding ORDER BY binding_id ASC",
            &[],
        )?
        .into_iter()
        .map(reference_binding_record)
        .collect()
    }

    pub fn list_reference_bindings_for_canonicals(
        &self,
        canonical_reference_ids: &[String],
    ) -> Result<Vec<ReferenceBindingFactRecord>, String> {
        if canonical_reference_ids.is_empty() {
            return Ok(Vec::new());
        }
        let mut result = Vec::new();
        for ids in canonical_reference_ids.chunks(250) {
            let (clause, values) = scoped_string_clause("canonical_reference_id", ids)?;
            result.extend(
                self.query(
                    &format!(
                        "SELECT * FROM synt_reference_binding {clause}
                         ORDER BY binding_id ASC"
                    ),
                    &values,
                )?
                .into_iter()
                .map(reference_binding_record)
                .collect::<Result<Vec<_>, _>>()?,
            );
        }
        result.sort_by(|left, right| left.binding_id.cmp(&right.binding_id));
        Ok(result)
    }

    pub fn list_reference_redirects(&self) -> Result<Vec<ReferenceRedirectFactRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_redirect ORDER BY from_canonical_reference_id ASC",
            &[],
        )?
        .into_iter()
        .map(reference_redirect_record)
        .collect()
    }

    pub fn list_reference_revision_reviews(
        &self,
    ) -> Result<Vec<ReferenceRevisionReviewRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_revision_review ORDER BY review_id ASC",
            &[],
        )?
        .into_iter()
        .map(reference_review_record)
        .collect()
    }

    pub fn list_canonical_references_by_ids(
        &self,
        canonical_ids: &BTreeSet<String>,
    ) -> Result<Vec<CanonicalReferenceRecord>, String> {
        if canonical_ids.len() > 300 {
            return Err("canonical_reference_context_limit_invalid".into());
        }
        if canonical_ids.is_empty() {
            return Ok(Vec::new());
        }
        let placeholders = std::iter::repeat_n("?", canonical_ids.len())
            .collect::<Vec<_>>()
            .join(",");
        let values = canonical_ids.iter().map(|id| json!(id)).collect::<Vec<_>>();
        self.query(
            &format!(
                "SELECT * FROM synt_reference_canonical
                 WHERE canonical_reference_id IN ({placeholders})
                 ORDER BY canonical_reference_id ASC"
            ),
            &values,
        )?
        .into_iter()
        .map(canonical_reference_record)
        .collect()
    }

    pub fn list_active_canonical_reference_candidates(
        &self,
        limit: usize,
    ) -> Result<Vec<CanonicalReferenceRecord>, String> {
        if limit == 0 || limit > 100 {
            return Err("canonical_reference_candidate_limit_invalid".into());
        }
        self.query(
            "SELECT * FROM synt_reference_canonical WHERE status='active'
             ORDER BY updated_at DESC,canonical_reference_id ASC LIMIT ?1",
            &[json!(limit)],
        )?
        .into_iter()
        .map(canonical_reference_record)
        .collect()
    }

    pub fn list_reference_revision_reviews_for_review(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<ReviewPage<ReferenceRevisionReviewRecord>, String> {
        validate_review_page_query(query)?;
        let mut conditions = Vec::new();
        let mut values = Vec::new();
        if query.kind != "all" && query.kind != "canonical_revision" {
            conditions.push("1=0".to_owned());
        }
        if query.confidence != "all" {
            conditions.push("1=0".to_owned());
        }
        push_review_status_condition(&mut conditions, &mut values, &query.status, true, "status");
        push_review_search_condition(
            &mut conditions,
            &mut values,
            &query.search,
            &[
                "review_id",
                "source_ref",
                "canonical_reference_id",
                "reason",
                "payload_json",
            ],
        );
        let clause = review_where_clause(&conditions);
        let total = review_count(self, "synt_reference_revision_review", &clause, &values)?;
        let mut page_values = values;
        page_values.extend([json!(query.limit), json!(query.offset)]);
        let records = self
            .query(
                &format!(
                    "SELECT * FROM synt_reference_revision_review {clause}
                     ORDER BY updated_at DESC,review_id ASC LIMIT ? OFFSET ?"
                ),
                &page_values,
            )?
            .into_iter()
            .map(reference_review_record)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(ReviewPage { records, total })
    }

    pub fn upsert_reference_revision_review_record(
        &self,
        record: &ReferenceRevisionReviewRecord,
    ) -> Result<(), String> {
        if record.review_id.is_empty()
            || record.canonical_reference_id.is_empty()
            || !matches!(
                record.status.as_str(),
                "open" | "approved" | "rejected" | "blocked_by_upstream_review"
            )
        {
            return Err("reference_revision_review_invalid".into());
        }
        self.execute(
            "INSERT INTO synt_reference_revision_review(
             review_id,source_ref,canonical_reference_id,status,reason,payload_json,
             created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)
             ON CONFLICT(review_id) DO UPDATE SET
             source_ref=excluded.source_ref,
             canonical_reference_id=excluded.canonical_reference_id,
             status=excluded.status,
             reason=excluded.reason,
             payload_json=excluded.payload_json,
             updated_at=excluded.updated_at",
            &[
                json!(record.review_id),
                json!(record.source_ref),
                json!(record.canonical_reference_id),
                json!(record.status),
                json!(record.reason),
                json!(record.payload_json),
                json!(record.created_at),
                json!(record.updated_at),
            ],
        )
        .map(|_| ())
    }

    pub fn upsert_canonical_reference_record(
        &mut self,
        record: &CanonicalReferenceRecord,
    ) -> Result<(), String> {
        if record.canonical_reference_id.is_empty()
            || !matches!(record.status.as_str(), "active" | "archived")
        {
            return Err("canonical_reference_invalid".into());
        }
        self.transaction(|repository| {
            repository.execute(
                "INSERT OR REPLACE INTO synt_reference_canonical(
                 canonical_reference_id,title,normalized_title,year,authors_json,
                 identifiers_json,metadata_hash,status,created_at,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                &[
                    json!(record.canonical_reference_id),
                    json!(record.title),
                    json!(record.normalized_title),
                    json!(record.year),
                    json!(record.authors_json),
                    json!(record.identifiers_json),
                    json!(record.metadata_hash),
                    json!(record.status),
                    json!(record.created_at),
                    json!(record.updated_at),
                ],
            )?;
            Ok(())
        })
    }

    pub fn upsert_canonical_reference_redirect(
        &mut self,
        record: &ReferenceRedirectFactRecord,
    ) -> Result<(), String> {
        self.transaction(|repository| upsert_redirect(repository, record))
    }

    pub fn mark_reference_dependent_caches_stale(
        &mut self,
        reason: &str,
        updated_at: &str,
    ) -> Result<(), String> {
        self.transaction(|repository| {
            repository.execute(
                "UPDATE synt_cache_basis
                 SET status='stale',stale_reason=?1,updated_at=?2
                 WHERE cache_kind IN ('citation_graph','related_items')",
                &[json!(reason), json!(updated_at)],
            )?;
            Ok(())
        })
    }

    /// Replaces the active Citation Graph rows in one expected-basis transaction.
    /// Row values are normalized JSON objects whose keys must exactly match table
    /// columns; the SQL helper rejects malformed records before transaction commit.
    pub fn replace_citation_graph_application_state(
        &mut self,
        expected_graph_hash: Option<&str>,
        replacement: &CitationGraphReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_citation_graph_application_state()?
                .as_ref()
                .map(|row| row.graph_hash.as_str())
                != expected_graph_hash
            {
                return Ok(false);
            }
            for table in [
                "synt_citation_metrics_light",
                "synt_citation_metrics_complex",
                "synt_citation_incoming_group",
                "synt_citation_source_ownership",
                "synt_citation_edge",
                "synt_citation_node",
                "synt_citation_layout_state",
            ] {
                repository.execute(&format!("DELETE FROM {table}"), &[])?;
            }
            replacement
                .nodes
                .iter()
                .try_for_each(|row| upsert_citation_node(repository, row))?;
            replacement
                .edges
                .iter()
                .try_for_each(|row| upsert_citation_edge(repository, row))?;
            replacement
                .ownership
                .iter()
                .try_for_each(|row| upsert_citation_ownership(repository, row))?;
            replacement
                .incoming_groups
                .iter()
                .try_for_each(|row| upsert_citation_incoming(repository, row))?;
            replacement
                .light_metrics
                .iter()
                .try_for_each(|row| upsert_citation_light_metrics(repository, row))?;
            replacement
                .complex_metrics
                .iter()
                .try_for_each(|row| upsert_citation_complex_metrics(repository, row))?;
            repository.execute(
                "INSERT INTO synt_citation_graph_application_state(\
                 singleton_id,graph_hash,input_hash,metrics_hash,node_count,edge_count,updated_at\
                 ) VALUES('active',?1,?2,?3,?4,?5,?6)\
                 ON CONFLICT(singleton_id) DO UPDATE SET graph_hash=excluded.graph_hash,\
                 input_hash=excluded.input_hash,metrics_hash=excluded.metrics_hash,\
                 node_count=excluded.node_count,edge_count=excluded.edge_count,updated_at=excluded.updated_at",
                &[
                    json!(replacement.state.graph_hash),
                    json!(replacement.state.input_hash),
                    json!(replacement.state.metrics_hash.as_deref().unwrap_or_default()),
                    json!(replacement.nodes.len()),
                    json!(replacement.edges.len()),
                    json!(replacement.state.updated_at),
                ],
            )?;
            Ok(true)
        })
    }

    /// Atomically replaces only outgoing rows owned by the selected source
    /// papers. Unrelated source rows survive, while derived global metrics and
    /// layouts are invalidated and rebuilt from the merged graph.
    pub fn replace_citation_graph_source_slice(
        &mut self,
        expected_graph_hash: &str,
        source_ids: &[String],
        replacement: &CitationGraphReplacement,
    ) -> Result<Option<String>, String> {
        if source_ids.is_empty() {
            return Err("citation_graph_source_slice_invalid".into());
        }
        let source_ids = source_ids.iter().cloned().collect::<BTreeSet<_>>();
        if source_ids.len() > 25_000 || source_ids.iter().any(|value| value.is_empty()) {
            return Err("citation_graph_source_slice_invalid".into());
        }
        let source_ids = source_ids.into_iter().collect::<Vec<_>>();
        self.transaction(|repository| {
            if repository
                .get_citation_graph_application_state()?
                .as_ref()
                .map(|row| row.graph_hash.as_str())
                != Some(expected_graph_hash)
            {
                return Ok(None);
            }
            delete_in(
                repository,
                "synt_citation_incoming_group",
                "source_literature_item_id",
                &source_ids,
            )?;
            delete_in(
                repository,
                "synt_citation_source_ownership",
                "source_literature_item_id",
                &source_ids,
            )?;
            delete_in(
                repository,
                "synt_citation_edge",
                "source_literature_item_id",
                &source_ids,
            )?;
            delete_in(
                repository,
                "synt_citation_node",
                "literature_item_id",
                &source_ids,
            )?;
            replacement
                .nodes
                .iter()
                .try_for_each(|row| upsert_citation_node(repository, row))?;
            replacement
                .edges
                .iter()
                .try_for_each(|row| upsert_citation_edge(repository, row))?;
            replacement
                .ownership
                .iter()
                .try_for_each(|row| upsert_citation_ownership(repository, row))?;
            replacement
                .incoming_groups
                .iter()
                .try_for_each(|row| upsert_citation_incoming(repository, row))?;

            let edges = repository.list_citation_edges()?;
            let referenced_nodes = edges
                .iter()
                .flat_map(|edge| {
                    [
                        edge.source_literature_item_id.as_str(),
                        edge.target_literature_item_id.as_str(),
                    ]
                })
                .collect::<BTreeSet<_>>();
            for node in repository.list_citation_nodes()? {
                if !node.has_zotero_binding
                    && !referenced_nodes.contains(node.literature_item_id.as_str())
                {
                    repository.execute(
                        "DELETE FROM synt_citation_node WHERE literature_item_id=?1",
                        &[json!(node.literature_item_id)],
                    )?;
                }
            }

            repository.execute("DELETE FROM synt_citation_metrics_light", &[])?;
            repository.execute("DELETE FROM synt_citation_metrics_complex", &[])?;
            repository.execute("DELETE FROM synt_citation_layout_state", &[])?;
            let nodes = repository.list_citation_nodes()?;
            let edges = repository.list_citation_edges()?;
            let version = replacement
                .state
                .updated_at
                .parse::<i64>()
                .unwrap_or_default();
            let mut counts = BTreeMap::<String, (i64, i64, i64, i64)>::new();
            for node in &nodes {
                counts.entry(node.literature_item_id.clone()).or_default();
            }
            for edge in &edges {
                let outgoing = counts
                    .entry(edge.source_literature_item_id.clone())
                    .or_default();
                outgoing.0 += 1;
                if edge.edge_status == "accepted" {
                    outgoing.2 += 1;
                } else {
                    outgoing.3 += 1;
                }
                counts
                    .entry(edge.target_literature_item_id.clone())
                    .or_default()
                    .1 += 1;
            }
            for (node_id, (outgoing, incoming, matched, unresolved)) in counts {
                upsert_citation_light_metrics(
                    repository,
                    &CitationLightMetricsRecord {
                        literature_item_id: node_id,
                        outgoing_count: outgoing,
                        incoming_count: incoming,
                        matched_outgoing_count: matched,
                        unresolved_outgoing_count: unresolved,
                        ambiguous_outgoing_count: 0,
                        local_degree: outgoing + incoming,
                        source_structure_version: version,
                        updated_at: replacement.state.updated_at.clone(),
                    },
                )?;
            }
            let ownership = repository.list_citation_source_ownership()?;
            let incoming = repository.list_citation_incoming_groups()?;
            let light = repository.list_citation_light_metrics()?;
            let canonical = serde_json::to_vec(&json!({
                "nodes":nodes,
                "edges":edges,
                "ownership":ownership,
                "incomingGroups":incoming,
                "lightMetrics":light,
            }))
            .map_err(|_| "repository_citation_graph_invalid")?;
            let graph_hash = format!("sha256:{:x}", Sha256::digest(canonical));
            repository.execute(
                "UPDATE synt_citation_graph_application_state
                 SET graph_hash=?1,input_hash=?2,metrics_hash='',node_count=?3,
                     edge_count=?4,updated_at=?5
                 WHERE singleton_id='active' AND graph_hash=?6",
                &[
                    json!(graph_hash),
                    json!(replacement.state.input_hash),
                    json!(nodes.len()),
                    json!(edges.len()),
                    json!(replacement.state.updated_at),
                    json!(expected_graph_hash),
                ],
            )?;
            Ok(Some(graph_hash))
        })
    }

    /// Atomically promotes Citation Graph rows, their ready cache basis, and
    /// the terminal state of the private graph attempt that produced them.
    pub fn commit_citation_graph_promotion(
        &mut self,
        commit: &CitationGraphPromotionCommit,
    ) -> Result<CitationGraphPromotionResult, String> {
        self.transaction(|repository| {
            let graph_hash = match &commit.promotion {
                CitationGraphPromotion::Full {
                    expected_graph_hash,
                    replacement,
                } => {
                    if !repository.replace_citation_graph_application_state(
                        expected_graph_hash.as_deref(),
                        replacement,
                    )? {
                        return Ok(CitationGraphPromotionResult::BasisMismatch);
                    }
                    replacement.state.graph_hash.clone()
                }
                CitationGraphPromotion::SourceSlice {
                    expected_graph_hash,
                    source_ids,
                    replacement,
                } => {
                    let Some(graph_hash) = repository.replace_citation_graph_source_slice(
                        expected_graph_hash,
                        source_ids,
                        replacement,
                    )?
                    else {
                        return Ok(CitationGraphPromotionResult::BasisMismatch);
                    };
                    graph_hash
                }
            };
            if commit.ready_cache.cache_key != "citation-graph:library"
                || commit.ready_cache.cache_kind != "citation_graph"
                || commit.ready_cache.status != "ready"
                || commit.ready_cache.basis_kind != "graph_hash"
            {
                return Err("citation_graph_promotion_cache_invalid".into());
            }
            let mut ready_cache = commit.ready_cache.clone();
            ready_cache.basis_value.clone_from(&graph_hash);
            repository.upsert_cache_basis(&ready_cache)?;
            let mut terminal_operation = commit.terminal_operation.clone();
            terminal_operation.basis_value.clone_from(&graph_hash);
            let (_, won_terminal) =
                repository.finish_operation_if_nonterminal(&terminal_operation)?;
            if !won_terminal {
                return Err("citation_graph_promotion_operation_not_running".into());
            }
            Ok(CitationGraphPromotionResult::Promoted { graph_hash })
        })
    }

    pub fn promote_citation_complex_metrics(
        &mut self,
        expected_graph_hash: &str,
        metrics_hash: &str,
        records: &[CitationComplexMetricsRecord],
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_citation_graph_application_state()?
                .as_ref()
                .map(|state| state.graph_hash.as_str())
                != Some(expected_graph_hash)
            {
                return Ok(false);
            }
            repository.execute("DELETE FROM synt_citation_metrics_complex", &[])?;
            records
                .iter()
                .try_for_each(|record| upsert_citation_complex_metrics(repository, record))?;
            repository.execute(
                "UPDATE synt_citation_graph_application_state
                 SET metrics_hash=?1,updated_at=?2
                 WHERE singleton_id='active' AND graph_hash=?3",
                &[json!(metrics_hash), json!(now), json!(expected_graph_hash)],
            )?;
            Ok(true)
        })
    }

    pub fn promote_citation_layout(
        &mut self,
        expected_graph_hash: &str,
        record: &CitationLayoutRecord,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_citation_graph_application_state()?
                .as_ref()
                .map(|state| state.graph_hash.as_str())
                != Some(expected_graph_hash)
            {
                return Ok(false);
            }
            let mut record = record.clone();
            record.graph_hash = expected_graph_hash.to_owned();
            upsert_citation_layout(repository, &record)?;
            Ok(true)
        })
    }

    /// Replaces the refresh-owned rows for either a full refresh or an explicit
    /// source scope. Protected binding/redirect/review records are left to the
    /// matching/review application and therefore never deleted here.
    pub fn replace_reference_projection(
        &mut self,
        replacement: &ReferenceProjectionReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_reference_application_state()?
                .as_ref()
                .map(|row| row.reference_hash.as_str())
                != replacement.expected_reference_hash.as_deref()
            {
                return Ok(false);
            }
            if replacement.scope == ReferenceProjectionScope::Full {
                if replacement.source_refs.is_empty() {
                    repository.execute("DELETE FROM synt_reference_artifact", &[])?;
                    repository.execute("DELETE FROM synt_reference_raw", &[])?;
                    repository.execute("DELETE FROM synt_reference_source", &[])?;
                } else {
                    delete_not_in(
                        repository,
                        "synt_reference_artifact",
                        "paper_ref",
                        &replacement.source_refs,
                    )?;
                    delete_not_in(
                        repository,
                        "synt_reference_raw",
                        "source_ref",
                        &replacement.source_refs,
                    )?;
                    delete_not_in(
                        repository,
                        "synt_reference_source",
                        "paper_ref",
                        &replacement.source_refs,
                    )?;
                }
            }
            delete_in(
                repository,
                "synt_reference_raw",
                "source_ref",
                &replacement.replace_reference_source_refs,
            )?;
            delete_in(
                repository,
                "synt_reference_binding",
                "binding_id",
                &replacement.remove_binding_ids,
            )?;
            replacement
                .sources
                .iter()
                .try_for_each(|record| upsert_reference_source(repository, record))?;
            replacement
                .artifacts
                .iter()
                .try_for_each(|record| upsert_reference_artifact(repository, record))?;
            replacement
                .canonicals
                .iter()
                .try_for_each(|record| insert_canonical_if_absent(repository, record))?;
            replacement
                .raw_references
                .iter()
                .try_for_each(|record| upsert_raw_reference(repository, record))?;
            replacement
                .bindings
                .iter()
                .try_for_each(|record| insert_binding_if_absent(repository, record))?;
            replacement
                .reviews
                .iter()
                .try_for_each(|record| insert_review_if_absent(repository, record))?;
            repository.execute(
                "DELETE FROM synt_reference_canonical
                 WHERE canonical_reference_id NOT IN (
                   SELECT canonical_reference_id FROM synt_reference_raw WHERE status='active'
                 ) AND canonical_reference_id NOT IN (
                   SELECT canonical_reference_id FROM synt_reference_binding
                   WHERE reviewer<>'reference-refresh-application'
                 )",
                &[],
            )?;
            let counts = reference_counts(repository)?;
            let current = repository.get_reference_application_state()?;
            let graph_ready = if replacement.graph_facts_changed {
                false
            } else {
                current.as_ref().is_none_or(|state| state.graph_ready)
            };
            let related_ready = if replacement.graph_facts_changed {
                false
            } else {
                current
                    .as_ref()
                    .is_none_or(|state| state.related_items_ready)
            };
            repository.execute(
                "INSERT INTO synt_reference_application_state(singleton_id,reference_hash,input_hash,source_count,reference_count,canonical_count,binding_count,reference_ready,graph_ready,related_items_ready,updated_at)\
                 VALUES(1,?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)\
                 ON CONFLICT(singleton_id) DO UPDATE SET reference_hash=excluded.reference_hash,input_hash=excluded.input_hash,source_count=excluded.source_count,reference_count=excluded.reference_count,canonical_count=excluded.canonical_count,binding_count=excluded.binding_count,reference_ready=excluded.reference_ready,graph_ready=excluded.graph_ready,related_items_ready=excluded.related_items_ready,updated_at=excluded.updated_at",
                &[
                    json!(replacement.reference_hash),
                    json!(replacement.input_hash),
                    json!(counts.0),
                    json!(counts.1),
                    json!(counts.2),
                    json!(counts.3),
                    json!(true),
                    json!(graph_ready),
                    json!(related_ready),
                    json!(replacement.now),
                ],
            )?;
            if replacement.graph_facts_changed {
                mark_reference_projection_caches_stale(repository, replacement)?;
            }
            repository.upsert_cache_basis(&crate::CacheBasisRecord {
                cache_key: "reference-sidecar:library".into(),
                cache_kind: "reference_sidecar".into(),
                scope_kind: "library".into(),
                status: "ready".into(),
                basis_kind: "reference_refresh_application".into(),
                basis_value: replacement.reference_hash.clone(),
                source_hash: replacement.input_hash.clone(),
                policy_version: "reference-refresh-application-v1".into(),
                refreshed_at: replacement.now.clone(),
                diagnostics_json: "[]".into(),
                updated_at: replacement.now.clone(),
                ..crate::CacheBasisRecord::default()
            })?;
            Ok(true)
        })
    }

    pub fn apply_literature_reference_projection(
        &mut self,
        replacement: &ReferenceProjectionReplacement,
        metadata: Option<&LiteratureMatchingMetadataRecord>,
        receipt: &crate::OperationRecord,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if !repository.replace_reference_projection(replacement)? {
                return Ok(false);
            }
            if let Some(metadata) = metadata {
                upsert_literature_matching_metadata(repository, metadata)?;
            }
            let mut receipt = receipt.clone();
            let canonical_ids = repository
                .list_raw_references_for_sources(&replacement.source_refs)?
                .into_iter()
                .map(|row| row.canonical_reference_id)
                .collect::<BTreeSet<_>>();
            let matched_count = repository
                .list_reference_bindings()?
                .into_iter()
                .filter(|binding| canonical_ids.contains(&binding.canonical_reference_id))
                .count();
            let mut diagnostics: Value = serde_json::from_str(&receipt.diagnostics_json)
                .map_err(|_| "operation_receipt_invalid".to_owned())?;
            diagnostics["result"]["matched_count"] = json!(matched_count);
            diagnostics["result"]["decision_count"] = json!(matched_count);
            receipt.diagnostics_json = serde_json::to_string(&diagnostics)
                .map_err(|_| "operation_receipt_invalid".to_owned())?;
            repository.upsert_operation(&receipt)?;
            Ok(true)
        })
    }

    pub fn get_reference_matching_preparation(
        &self,
        preparation_id: &str,
    ) -> Result<Option<ReferenceMatchingPreparationRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_matching_preparation WHERE preparation_id=?1 LIMIT 1",
            &[json!(preparation_id)],
        )?
        .into_iter()
        .next()
        .map(preparation_record)
        .transpose()
    }

    pub fn has_prepared_reference_matching_preparation(&self) -> Result<bool, String> {
        Ok(!self
            .query(
                "SELECT preparation_id FROM synt_reference_matching_preparation
                 WHERE status='prepared' LIMIT 1",
                &[],
            )?
            .is_empty())
    }

    pub fn upsert_reference_matching_preparation(
        &self,
        record: &ReferenceMatchingPreparationRecord,
    ) -> Result<(), String> {
        validate_preparation(record)?;
        self.execute(
            "INSERT INTO synt_reference_matching_preparation(
             preparation_id,reference_hash,repository_basis_hash,host_basis_hash,status,
             diagnostics_json,created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)
             ON CONFLICT(preparation_id) DO UPDATE SET reference_hash=excluded.reference_hash,
             repository_basis_hash=excluded.repository_basis_hash,
             host_basis_hash=excluded.host_basis_hash,status=excluded.status,
             diagnostics_json=excluded.diagnostics_json,updated_at=excluded.updated_at",
            &[
                json!(record.preparation_id),
                json!(record.reference_hash),
                json!(record.repository_basis_hash),
                json!(record.host_basis_hash),
                json!(record.status),
                json!(record.diagnostics_json),
                json!(record.created_at),
                json!(record.updated_at),
            ],
        )?;
        Ok(())
    }

    pub fn delete_reference_matching_preparation(
        &self,
        preparation_id: &str,
    ) -> Result<(), String> {
        self.execute(
            "DELETE FROM synt_reference_matching_preparation WHERE preparation_id=?1",
            &[json!(preparation_id)],
        )?;
        Ok(())
    }

    pub fn delete_prepared_reference_matching_preparations(&self) -> Result<(), String> {
        self.execute(
            "DELETE FROM synt_reference_matching_preparation WHERE status='prepared'",
            &[],
        )?;
        Ok(())
    }

    pub fn get_reference_match_proposal(
        &self,
        proposal_id: &str,
    ) -> Result<Option<ReferenceMatchProposalRecord>, String> {
        self.query(
            "SELECT * FROM synt_reference_match_proposal WHERE proposal_id=?1 LIMIT 1",
            &[json!(proposal_id)],
        )?
        .into_iter()
        .next()
        .map(proposal_record)
        .transpose()
    }

    pub fn list_reference_match_proposals(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<ReferenceMatchProposalRecord>, bool), String> {
        if limit == 0 || limit > 100 {
            return Err("reference_match_proposal_limit_invalid".into());
        }
        let rows = self.query(
            "SELECT * FROM synt_reference_match_proposal
             ORDER BY updated_at DESC,proposal_id ASC LIMIT ?1 OFFSET ?2",
            &[json!(limit + 1), json!(offset)],
        )?;
        let has_more = rows.len() > limit;
        let records = rows
            .into_iter()
            .take(limit)
            .map(proposal_record)
            .collect::<Result<Vec<_>, _>>()?;
        Ok((records, has_more))
    }

    pub fn list_reference_match_proposals_for_review(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<ReviewPage<ReferenceMatchProposalRecord>, String> {
        validate_review_page_query(query)?;
        let mut conditions = Vec::new();
        let mut values = Vec::new();
        if query.kind == "canonical_revision" {
            conditions.push("1=0".to_owned());
        } else if query.kind != "all" {
            conditions.push("kind=?".to_owned());
            values.push(json!(query.kind));
        }
        if query.confidence != "all" {
            conditions.push("confidence=?".to_owned());
            values.push(json!(query.confidence));
        }
        push_review_status_condition(&mut conditions, &mut values, &query.status, false, "status");
        push_review_search_condition(
            &mut conditions,
            &mut values,
            &query.search,
            &[
                "proposal_id",
                "kind",
                "source_canonical_reference_id",
                "target_canonical_reference_id",
                "target_item_key",
                "reasons_json",
            ],
        );
        let clause = review_where_clause(&conditions);
        let total = review_count(self, "synt_reference_match_proposal", &clause, &values)?;
        let mut page_values = values;
        page_values.extend([json!(query.limit), json!(query.offset)]);
        let records = self
            .query(
                &format!(
                    "SELECT * FROM synt_reference_match_proposal {clause}
                     ORDER BY updated_at DESC,proposal_id ASC LIMIT ? OFFSET ?"
                ),
                &page_values,
            )?
            .into_iter()
            .map(proposal_record)
            .collect::<Result<Vec<_>, _>>()?;
        Ok(ReviewPage { records, total })
    }

    pub fn upsert_reference_match_proposal(
        &self,
        record: &ReferenceMatchProposalRecord,
    ) -> Result<(), String> {
        validate_proposal(record)?;
        self.execute(
            "INSERT INTO synt_reference_match_proposal(
             proposal_id,kind,status,source_canonical_reference_id,
             source_raw_reference_ids_json,target_canonical_reference_id,
             target_library_id,target_item_key,confidence,score,reasons_json,
             evidence_json,diagnostics_json,basis_hash,source_hash,created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
             ON CONFLICT(proposal_id) DO UPDATE SET kind=excluded.kind,status=excluded.status,
             source_canonical_reference_id=excluded.source_canonical_reference_id,
             source_raw_reference_ids_json=excluded.source_raw_reference_ids_json,
             target_canonical_reference_id=excluded.target_canonical_reference_id,
             target_library_id=excluded.target_library_id,target_item_key=excluded.target_item_key,
             confidence=excluded.confidence,score=excluded.score,reasons_json=excluded.reasons_json,
             evidence_json=excluded.evidence_json,diagnostics_json=excluded.diagnostics_json,
             basis_hash=excluded.basis_hash,source_hash=excluded.source_hash,
             updated_at=excluded.updated_at",
            &[
                json!(record.proposal_id),
                json!(record.kind),
                json!(record.status),
                json!(record.source_canonical_reference_id),
                json!(record.source_raw_reference_ids_json),
                json!(record.target_canonical_reference_id),
                json!(record.target_library_id),
                json!(record.target_item_key),
                json!(record.confidence),
                json!(record.score),
                json!(record.reasons_json),
                json!(record.evidence_json),
                json!(record.diagnostics_json),
                json!(record.basis_hash),
                json!(record.source_hash),
                json!(record.created_at),
                json!(record.updated_at),
            ],
        )?;
        Ok(())
    }

    pub fn has_rejected_reference_match_proposal(
        &self,
        kind: &str,
        basis_hash: &str,
        source_hash: &str,
    ) -> Result<bool, String> {
        Ok(!self
            .query(
                "SELECT proposal_id FROM synt_reference_match_proposal
                 WHERE kind=?1 AND basis_hash=?2 AND source_hash=?3 AND status='rejected'
                 LIMIT 1",
                &[json!(kind), json!(basis_hash), json!(source_hash)],
            )?
            .is_empty())
    }

    pub fn promote_reference_matching(
        &mut self,
        preparation_id: &str,
        promotion: &ReferenceMatchingPromotion,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let reference_hash = repository
                .get_reference_application_state()?
                .map(|state| state.reference_hash)
                .unwrap_or_default();
            let preparation = repository
                .get_reference_matching_preparation(preparation_id)?
                .filter(|row| row.status == "prepared");
            if reference_hash != promotion.expected_reference_hash
                || preparation
                    .as_ref()
                    .map(|row| row.repository_basis_hash.as_str())
                    != Some(promotion.expected_repository_basis_hash.as_str())
            {
                return Ok(false);
            }
            for binding in &promotion.bindings {
                upsert_binding(repository, binding)?;
            }
            for redirect in &promotion.redirects {
                upsert_redirect(repository, redirect)?;
            }
            for proposal in &promotion.proposals {
                if proposal.basis_hash.is_empty()
                    || proposal.source_hash.is_empty()
                    || !repository.has_rejected_reference_match_proposal(
                        &proposal.kind,
                        &proposal.basis_hash,
                        &proposal.source_hash,
                    )?
                {
                    repository.upsert_reference_match_proposal(proposal)?;
                }
            }
            let counts = proposal_counts(repository)?;
            upsert_matching_state(
                repository,
                &ReferenceMatchingStateRecord {
                    reference_hash,
                    matching_hash: promotion.matching_hash.clone(),
                    proposal_count: counts.0,
                    open_proposal_count: counts.1,
                    matching_ready: true,
                    graph_ready: !promotion.graph_facts_changed,
                    related_items_ready: !promotion.graph_facts_changed,
                    updated_at: promotion.updated_at.clone(),
                },
            )?;
            repository.delete_reference_matching_preparation(preparation_id)?;
            Ok(true)
        })
    }

    pub fn apply_reference_review_transition(
        &mut self,
        transition: &ReferenceReviewTransition,
    ) -> Result<bool, String> {
        self.apply_reference_review_transitions(std::slice::from_ref(transition))
    }

    pub fn apply_reference_review_transitions(
        &mut self,
        transitions: &[ReferenceReviewTransition],
    ) -> Result<bool, String> {
        self.apply_reference_review_transitions_with_receipt(transitions, None)
    }

    pub fn apply_reference_review_transitions_with_receipt(
        &mut self,
        transitions: &[ReferenceReviewTransition],
        receipt: Option<&crate::OperationRecord>,
    ) -> Result<bool, String> {
        if transitions.is_empty() {
            return Err("reference_review_batch_invalid".into());
        }
        self.transaction(|repository| {
            let proposal_ids = transitions
                .iter()
                .map(|transition| transition.proposal.proposal_id.as_str())
                .collect::<std::collections::BTreeSet<_>>();
            if proposal_ids.len() != transitions.len()
                || transitions
                    .iter()
                    .any(|transition| transition.proposal.proposal_id.is_empty())
            {
                return Ok(false);
            }
            for transition in transitions {
                if repository
                    .get_reference_match_proposal(&transition.proposal.proposal_id)?
                    .is_none()
                {
                    return Ok(false);
                }
            }
            let requested_graph_facts_changed = transitions
                .iter()
                .any(|transition| transition.graph_facts_changed);
            let updated_at = transitions
                .iter()
                .map(|transition| transition.updated_at.as_str())
                .max()
                .unwrap_or_default()
                .to_owned();
            let original_redirects = repository.list_reference_redirects()?;
            let mut redirect_graph = ReferenceRedirectGraph::from_records(&original_redirects)?;
            let mut redirect_templates = Vec::new();
            for transition in transitions {
                if !transition.revoke_binding_id.is_empty() {
                    repository.execute(
                        "DELETE FROM synt_reference_binding WHERE binding_id=?1",
                        &[json!(transition.revoke_binding_id)],
                    )?;
                }
                for source in &transition.revoke_redirect_source_ids {
                    redirect_graph.remove_source(source);
                }
                if let Some(binding) = &transition.binding {
                    upsert_binding(repository, binding)?;
                }
                for redirect in &transition.redirects {
                    if transition.preferred_root_canonical_id.is_empty() {
                        redirect_graph.merge(
                            &redirect.from_canonical_reference_id,
                            &redirect.to_canonical_reference_id,
                        )?;
                    } else {
                        redirect_graph.reroot(&transition.preferred_root_canonical_id)?;
                        redirect_graph.merge(
                            &redirect.from_canonical_reference_id,
                            &transition.preferred_root_canonical_id,
                        )?;
                    }
                    redirect_templates.push(redirect.clone());
                }
                repository.upsert_reference_match_proposal(&transition.proposal)?;
                for proposal in &transition.audit_proposals {
                    repository.upsert_reference_match_proposal(proposal)?;
                }
            }
            let persisted_redirects = persist_redirect_graph(
                repository,
                &original_redirects,
                &redirect_graph,
                &redirect_templates,
                &updated_at,
            )?;
            supersede_displaced_redirect_proposals(
                repository,
                &persisted_redirects.removed,
                &updated_at,
            )?;
            supersede_redundant_open_redirect_proposals(repository, &redirect_graph, &updated_at)?;
            let graph_facts_changed = requested_graph_facts_changed || persisted_redirects.changed;
            let counts = proposal_counts(repository)?;
            let mut state = repository
                .get_reference_matching_state()?
                .unwrap_or_default();
            state.proposal_count = counts.0;
            state.open_proposal_count = counts.1;
            if graph_facts_changed {
                state.graph_ready = false;
                state.related_items_ready = false;
            }
            state.updated_at = updated_at;
            upsert_matching_state(repository, &state)?;
            if let Some(receipt) = receipt {
                repository.upsert_operation(receipt)?;
            }
            Ok(true)
        })
    }

    pub(crate) fn normalize_imported_reference_redirect_graph(
        &mut self,
        operation_id: &str,
        import_receipt_id: &str,
        now: &str,
    ) -> Result<bool, String> {
        let original_redirects = self.list_reference_redirects()?;
        let mut redirect_graph = ReferenceRedirectGraph::from_records(&original_redirects)?;
        if redirect_graph.cycles().is_empty() {
            return Ok(false);
        }

        let accepted_proposals = self
            .query(
                "SELECT target_canonical_reference_id,reasons_json,updated_at
                 FROM synt_reference_match_proposal
                 WHERE kind='canonical_merge' AND status='accepted'",
                &[],
            )?
            .into_iter()
            .map(|row| {
                Ok((
                    row_text(&row, "target_canonical_reference_id")?,
                    row_text(&row, "reasons_json")?,
                    row_text(&row, "updated_at")?,
                ))
            })
            .collect::<Result<Vec<_>, String>>()?;
        let (explicit_targets, automatic_targets): (Vec<_>, Vec<_>) = accepted_proposals
            .into_iter()
            .map(|(target, reasons, updated_at)| {
                (target, crate::stored_timestamp_millis(&updated_at), reasons)
            })
            .partition(|(_, _, reasons)| is_explicit_reference_redirect_reason(reasons));
        let preferred_roots = rank_reference_redirect_roots(
            explicit_targets
                .into_iter()
                .map(|(target, updated_at, _)| (target, updated_at))
                .collect(),
            self.list_reference_bindings()?
                .into_iter()
                .filter(|binding| binding.status == "accepted")
                .map(|binding| binding.canonical_reference_id)
                .collect(),
            automatic_targets
                .into_iter()
                .map(|(target, updated_at, _)| (target, updated_at))
                .collect(),
        );

        redirect_graph.repair_cycles(&preferred_roots);
        let persisted =
            persist_redirect_graph(self, &original_redirects, &redirect_graph, &[], now)?;
        supersede_displaced_redirect_proposals(self, &persisted.removed, now)?;
        supersede_redundant_open_redirect_proposals(self, &redirect_graph, now)?;
        self.execute(
            "UPDATE synt_cache_basis
             SET status='stale',active_operation_id='',
                 stale_reason='canonical_redirect_cycle_repair',updated_at=?1
             WHERE cache_kind IN ('citation_graph','related_items')",
            &[json!(now)],
        )?;
        let counts = proposal_counts(self)?;
        let mut state = self.get_reference_matching_state()?.unwrap_or_default();
        state.proposal_count = counts.0;
        state.open_proposal_count = counts.1;
        state.graph_ready = false;
        state.related_items_ready = false;
        state.updated_at = now.into();
        upsert_matching_state(self, &state)?;
        self.upsert_operation(&crate::OperationRecord {
            operation_id: operation_id.into(),
            operation_type: "canonical_redirect_repair".into(),
            status: "completed".into(),
            label: "Canonical redirect repair".into(),
            phase: "completed".into(),
            message: "Canonical redirect cycles repaired.".into(),
            progress_mode: "determinate".into(),
            processed_count: persisted.removed.len() as i64,
            total_count: persisted.removed.len() as i64,
            basis_kind: "durable_import_receipt".into(),
            basis_value: import_receipt_id.into(),
            diagnostics_json: serde_json::to_string(&json!({
                "code": "canonical_redirect_cycle_repaired",
                "rootSelection": if persisted.removed.iter().all(|edge| {
                    preferred_roots.contains(&edge.from_canonical_reference_id)
                }) {
                    "evidence"
                } else {
                    "stable_fallback"
                },
                "preferredRoots": preferred_roots,
                "removed": persisted.removed.iter().map(|edge| json!({
                    "from": edge.from_canonical_reference_id,
                    "to": edge.to_canonical_reference_id,
                })).collect::<Vec<_>>(),
            }))
            .map_err(|_| "reference_redirect_repair_diagnostics_invalid".to_owned())?,
            created_at: now.into(),
            started_at: now.into(),
            completed_at: now.into(),
            updated_at: now.into(),
            ..crate::OperationRecord::default()
        })?;
        Ok(true)
    }
}

fn mark_reference_projection_caches_stale(
    repository: &Repository,
    replacement: &ReferenceProjectionReplacement,
) -> Result<(), String> {
    for cache_key in ["citation-graph:library", "related-items-sync:global"] {
        let Some(mut cache) = repository.get_cache_basis(cache_key)? else {
            continue;
        };
        cache.status = "stale".into();
        cache.stale_reason = "reference_refresh_graph_facts_changed".into();
        cache.updated_at = replacement.now.clone();
        if cache_key == "citation-graph:library" {
            cache.diagnostics_json = serde_json::to_string(&vec![json!({
                "code": "citation_graph_cache_stale_delta",
                "severity": "info",
                "reason": "reference_refresh_graph_facts_changed",
                "source_refs": replacement.source_refs,
                "changed_canonical_ids": [],
                "changed_binding_canonical_ids": [],
                "changed_redirect_canonical_ids": [],
            })])
            .map_err(|_| "repository_cache_basis_invalid".to_owned())?;
        }
        repository.upsert_cache_basis(&cache)?;
    }
    Ok(())
}

fn reference_state_record(row: Value) -> Result<ReferenceApplicationStateRecord, String> {
    Ok(ReferenceApplicationStateRecord {
        reference_hash: row_text(&row, "reference_hash")?,
        input_hash: row_text(&row, "input_hash")?,
        source_count: row_integer(&row, "source_count")?,
        reference_count: row_integer(&row, "reference_count")?,
        canonical_count: row_integer(&row, "canonical_count")?,
        binding_count: row_integer(&row, "binding_count")?,
        reference_ready: row_integer(&row, "reference_ready")? != 0,
        graph_ready: row_integer(&row, "graph_ready")? != 0,
        related_items_ready: row_integer(&row, "related_items_ready")? != 0,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn validate_review_page_query(query: &ReviewPageQuery) -> Result<(), String> {
    if query.limit == 0
        || query.limit > 100
        || query.offset > 100_000
        || query.search.chars().count() > 500
        || !matches!(
            query.status.as_str(),
            "all" | "open" | "accepted" | "rejected" | "superseded" | "retargeted"
        )
        || !matches!(
            query.kind.as_str(),
            "all" | "zotero_binding" | "canonical_merge" | "canonical_revision"
        )
        || !matches!(
            query.confidence.as_str(),
            "all" | "deterministic" | "high" | "medium" | "low" | "review"
        )
    {
        return Err("review_page_query_invalid".into());
    }
    Ok(())
}

fn push_review_status_condition(
    conditions: &mut Vec<String>,
    values: &mut Vec<Value>,
    status: &str,
    canonical_revision: bool,
    column: &str,
) {
    if status == "all" {
        return;
    }
    let stored = if canonical_revision && status == "accepted" {
        "approved"
    } else {
        status
    };
    conditions.push(format!("{column}=?"));
    values.push(json!(stored));
}

fn push_review_search_condition(
    conditions: &mut Vec<String>,
    values: &mut Vec<Value>,
    search: &str,
    columns: &[&str],
) {
    let search = search.trim().to_lowercase();
    if search.is_empty() {
        return;
    }
    let pattern = format!("%{search}%");
    let condition = columns
        .iter()
        .map(|column| format!("lower({column}) LIKE ?"))
        .collect::<Vec<_>>()
        .join(" OR ");
    conditions.push(format!("({condition})"));
    values.extend(columns.iter().map(|_| json!(pattern)));
}

fn review_where_clause(conditions: &[String]) -> String {
    if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    }
}

fn review_count(
    repository: &Repository,
    table: &str,
    clause: &str,
    values: &[Value],
) -> Result<usize, String> {
    let row = repository
        .query(
            &format!("SELECT COUNT(*) AS total FROM {table} {clause}"),
            values,
        )?
        .into_iter()
        .next()
        .ok_or_else(|| "repository_typed_row_invalid".to_owned())?;
    usize::try_from(row_integer(&row, "total")?).map_err(|_| "repository_typed_row_invalid".into())
}

fn row_bool(row: &Value, key: &str) -> Result<bool, String> {
    match row_integer(row, key)? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err("repository_typed_row_invalid".into()),
    }
}

fn row_number(row: &Value, key: &str) -> Result<f64, String> {
    row[key]
        .as_f64()
        .filter(|value| value.is_finite())
        .ok_or_else(|| "repository_typed_row_invalid".into())
}

fn sql_placeholders(count: usize) -> String {
    std::iter::repeat_n("?", count)
        .collect::<Vec<_>>()
        .join(",")
}

fn nullable_count(row: &Value, key: &str) -> Result<usize, String> {
    match &row[key] {
        Value::Null => Ok(0),
        value => value
            .as_i64()
            .and_then(|value| usize::try_from(value).ok())
            .ok_or_else(|| "repository_typed_row_invalid".into()),
    }
}

fn citation_graph_window_cte(
    filter: &CitationGraphWindowFilter,
    enforce_projection_bounds: bool,
) -> Result<(String, Vec<Value>), String> {
    if filter.node_kinds.len() > 3
        || filter.roles.len() > 64
        || filter.search.chars().count() > 500
        || filter
            .topic_node_ids
            .as_ref()
            .is_some_and(|ids| ids.len() > 10_000)
    {
        return Err("invalid_request".into());
    }
    let mut conditions = vec!["visibility<>'excluded'".to_owned()];
    let mut values = Vec::new();
    if !filter.node_kinds.is_empty() {
        let library = filter.node_kinds.iter().any(|kind| kind == "library_paper");
        let external = filter
            .node_kinds
            .iter()
            .any(|kind| matches!(kind.as_str(), "external_reference" | "unresolved_reference"));
        conditions.push(match (library, external) {
            (true, true) => "1=1".into(),
            (true, false) => "has_zotero_binding=1".into(),
            (false, true) => "has_zotero_binding=0".into(),
            (false, false) => "1=0".into(),
        });
    }
    if !filter.include_low_signal {
        conditions.push("COALESCE(json_extract(summary_json,'$.low_signal'),0)=0".into());
    }
    let search = filter.search.trim().to_lowercase();
    if !search.is_empty() {
        let pattern = format!("%{search}%");
        conditions.push(
            "(lower(literature_item_id) LIKE ? OR lower(title) LIKE ? OR lower(authors_json) LIKE ?)"
                .into(),
        );
        values.extend([json!(pattern), json!(pattern), json!(pattern)]);
    }
    if let Some(topic_ids) = &filter.topic_node_ids {
        if topic_ids.is_empty() {
            conditions.push("1=0".into());
        } else {
            let placeholders = sql_placeholders(topic_ids.len());
            conditions.push(format!(
                "(literature_item_id IN ({placeholders}) OR EXISTS(
                   SELECT 1 FROM eligible_edges topic_edge
                   WHERE (topic_edge.source_literature_item_id=literature_item_id
                          AND topic_edge.target_literature_item_id IN ({placeholders}))
                      OR (topic_edge.target_literature_item_id=literature_item_id
                          AND topic_edge.source_literature_item_id IN ({placeholders}))))"
            ));
            for _ in 0..3 {
                values.extend(topic_ids.iter().map(|id| json!(id)));
            }
        }
    }
    let role_patterns = filter
        .roles
        .iter()
        .map(|role| json!(format!("%\"{role}\"%")))
        .collect::<Vec<_>>();
    let role_predicate = if filter.roles.is_empty() {
        "1=1".to_owned()
    } else {
        let predicates = filter
            .roles
            .iter()
            .map(|_| "roles_json LIKE ?")
            .collect::<Vec<_>>()
            .join(" OR ");
        format!("({predicates})")
    };
    let role_node_predicate = if filter.roles.is_empty() {
        "1=1".to_owned()
    } else {
        let predicates = filter
            .roles
            .iter()
            .map(|_| "role_edge.roles_json LIKE ?")
            .collect::<Vec<_>>()
            .join(" OR ");
        format!(
            "EXISTS(SELECT 1 FROM eligible_edges role_edge
             WHERE (role_edge.source_literature_item_id=literature_item_id
                    OR role_edge.target_literature_item_id=literature_item_id)
               AND ({predicates}))"
        )
    };
    conditions.push(role_node_predicate);
    values.extend(role_patterns.iter().cloned());
    values.extend(role_patterns);
    let projection_ctes = if enforce_projection_bounds {
        format!(
            "projection_nodes AS MATERIALIZED (
               SELECT classified.*,
                      CASE WHEN visibility='default' THEN
                        ROW_NUMBER() OVER (PARTITION BY visibility ORDER BY has_zotero_binding DESC,literature_item_id ASC)
                      END AS projection_rank
               FROM classified_nodes classified
             ), filtered_nodes AS (
               SELECT * FROM projection_nodes
               WHERE (visibility='hover_only' OR projection_rank<={node_limit})
                 AND {node_conditions}
             ), projection_edges AS MATERIALIZED (
               SELECT edge.*,
                      CASE WHEN source.visibility='hover_only' OR target.visibility='hover_only'
                           THEN 'hover_only' ELSE 'default' END AS visibility
               FROM eligible_edges edge
               JOIN projection_nodes source
                 ON source.literature_item_id=edge.source_literature_item_id
               JOIN projection_nodes target
                 ON target.literature_item_id=edge.target_literature_item_id
               WHERE (source.visibility='hover_only' OR source.projection_rank<={node_limit})
                 AND (target.visibility='hover_only' OR target.projection_rank<={node_limit})
             ), ranked_edges AS MATERIALIZED (
               SELECT projected.*,
                      CASE WHEN visibility='default' THEN
                        ROW_NUMBER() OVER (PARTITION BY visibility ORDER BY edge_id ASC)
                      END AS projection_rank
               FROM projection_edges projected
             ), filtered_edges AS (
               SELECT edge.*
               FROM ranked_edges edge
               JOIN filtered_nodes source
                 ON source.literature_item_id=edge.source_literature_item_id
               JOIN filtered_nodes target
                 ON target.literature_item_id=edge.target_literature_item_id
               WHERE {role_predicate}
                 AND (edge.visibility='hover_only' OR edge.projection_rank<={edge_limit})
             )",
            node_limit = CITATION_GRAPH_DEFAULT_NODE_MAX,
            edge_limit = CITATION_GRAPH_DEFAULT_EDGE_MAX,
            node_conditions = conditions.join(" AND "),
        )
    } else {
        format!(
            "filtered_nodes AS (
               SELECT * FROM classified_nodes WHERE {node_conditions}
             ), filtered_edges AS (
               SELECT edge.*,
                      CASE WHEN source.visibility='hover_only' OR target.visibility='hover_only'
                           THEN 'hover_only' ELSE 'default' END AS visibility
               FROM eligible_edges edge
               JOIN filtered_nodes source
                 ON source.literature_item_id=edge.source_literature_item_id
               JOIN filtered_nodes target
                 ON target.literature_item_id=edge.target_literature_item_id
               WHERE {role_predicate}
             )",
            node_conditions = conditions.join(" AND "),
        )
    };
    Ok((
        format!(
            "WITH active_nodes AS (
               SELECT * FROM synt_citation_node WHERE node_status='active'
             ), eligible_edges AS (
               SELECT edge.*
               FROM synt_citation_edge edge
               JOIN active_nodes source_node
                 ON source_node.literature_item_id=edge.source_literature_item_id
               JOIN active_nodes target_node
                 ON target_node.literature_item_id=edge.target_literature_item_id
               WHERE source_node.has_zotero_binding=1
                 AND edge.edge_status IN ('accepted','unbound')
                 AND (target_node.has_zotero_binding=0 OR edge.edge_status='accepted')
             ), external_degrees AS (
               SELECT edge.target_literature_item_id,
                      COUNT(DISTINCT edge.source_literature_item_id) AS external_degree
               FROM eligible_edges edge
               JOIN active_nodes target_node
                 ON target_node.literature_item_id=edge.target_literature_item_id
               WHERE target_node.has_zotero_binding=0
               GROUP BY edge.target_literature_item_id
             ), classified_nodes AS (
               SELECT node.*,
                      COALESCE(degree.external_degree,0) AS external_degree,
                      CASE
                        WHEN node.has_zotero_binding=1 OR degree.external_degree>1 THEN 'default'
                        WHEN degree.external_degree=1 THEN 'hover_only'
                        ELSE 'excluded'
                      END AS visibility
               FROM active_nodes node
               LEFT JOIN external_degrees degree
                 ON degree.target_literature_item_id=node.literature_item_id
             ), {projection_ctes}",
        ),
        values,
    ))
}

fn citation_graph_window_node_record(row: Value) -> Result<CitationGraphWindowNodeRecord, String> {
    let light_metrics = if row["metric_local_degree"].is_null() {
        None
    } else {
        Some(CitationLightMetricsRecord {
            literature_item_id: row_text(&row, "literature_item_id")?,
            outgoing_count: row_integer(&row, "metric_outgoing_count")?,
            incoming_count: row_integer(&row, "metric_incoming_count")?,
            matched_outgoing_count: row_integer(&row, "metric_matched_outgoing_count")?,
            unresolved_outgoing_count: row_integer(&row, "metric_unresolved_outgoing_count")?,
            ambiguous_outgoing_count: row_integer(&row, "metric_ambiguous_outgoing_count")?,
            local_degree: row_integer(&row, "metric_local_degree")?,
            source_structure_version: row_integer(&row, "metric_source_structure_version")?,
            updated_at: row_text(&row, "metric_updated_at")?,
        })
    };
    Ok(CitationGraphWindowNodeRecord {
        external_degree: row_integer(&row, "external_degree")?,
        visibility: row_text(&row, "visibility")?,
        record: citation_node_record(row)?,
        light_metrics,
    })
}

fn citation_graph_window_edge_record(row: Value) -> Result<CitationGraphWindowEdgeRecord, String> {
    Ok(CitationGraphWindowEdgeRecord {
        visibility: row_text(&row, "visibility")?,
        record: citation_edge_record(row)?,
    })
}

fn citation_node_record(row: Value) -> Result<CitationNodeRecord, String> {
    Ok(CitationNodeRecord {
        literature_item_id: row_text(&row, "literature_item_id")?,
        node_status: row_text(&row, "node_status")?,
        has_zotero_binding: row_bool(&row, "has_zotero_binding")?,
        title: row_text(&row, "title")?,
        year: row_text(&row, "year")?,
        authors_json: row_text(&row, "authors_json")?,
        summary_json: row_text(&row, "summary_json")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_edge_record(row: Value) -> Result<CitationEdgeRecord, String> {
    Ok(CitationEdgeRecord {
        edge_id: row_text(&row, "edge_id")?,
        source_literature_item_id: row_text(&row, "source_literature_item_id")?,
        target_literature_item_id: row_text(&row, "target_literature_item_id")?,
        reference_instance_id: row_text(&row, "reference_instance_id")?,
        resolution_id: row_text(&row, "resolution_id")?,
        edge_status: row_text(&row, "edge_status")?,
        roles_json: row_text(&row, "roles_json")?,
        weight: row_number(&row, "weight")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_ownership_record(row: Value) -> Result<CitationSourceOwnershipRecord, String> {
    Ok(CitationSourceOwnershipRecord {
        source_literature_item_id: row_text(&row, "source_literature_item_id")?,
        edge_id: row_text(&row, "edge_id")?,
        reference_instance_id: row_text(&row, "reference_instance_id")?,
        target_literature_item_id: row_text(&row, "target_literature_item_id")?,
        edge_status: row_text(&row, "edge_status")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_incoming_record(row: Value) -> Result<CitationIncomingGroupRecord, String> {
    Ok(CitationIncomingGroupRecord {
        target_literature_item_id: row_text(&row, "target_literature_item_id")?,
        source_literature_item_id: row_text(&row, "source_literature_item_id")?,
        edge_id: row_text(&row, "edge_id")?,
        reference_instance_id: row_text(&row, "reference_instance_id")?,
        edge_status: row_text(&row, "edge_status")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_light_metrics_record(row: Value) -> Result<CitationLightMetricsRecord, String> {
    Ok(CitationLightMetricsRecord {
        literature_item_id: row_text(&row, "literature_item_id")?,
        outgoing_count: row_integer(&row, "outgoing_count")?,
        incoming_count: row_integer(&row, "incoming_count")?,
        matched_outgoing_count: row_integer(&row, "matched_outgoing_count")?,
        unresolved_outgoing_count: row_integer(&row, "unresolved_outgoing_count")?,
        ambiguous_outgoing_count: row_integer(&row, "ambiguous_outgoing_count")?,
        local_degree: row_integer(&row, "local_degree")?,
        source_structure_version: row_integer(&row, "source_structure_version")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_complex_metrics_record(row: Value) -> Result<CitationComplexMetricsRecord, String> {
    Ok(CitationComplexMetricsRecord {
        literature_item_id: row_text(&row, "literature_item_id")?,
        node_id: row_text(&row, "node_id")?,
        paper_ref: row_text(&row, "paper_ref")?,
        item_key: row_text(&row, "item_key")?,
        title: row_text(&row, "title")?,
        year: row_text(&row, "year")?,
        internal_in_degree: row_integer(&row, "internal_in_degree")?,
        internal_out_degree: row_integer(&row, "internal_out_degree")?,
        external_reference_count: row_integer(&row, "external_reference_count")?,
        unresolved_reference_count: row_integer(&row, "unresolved_reference_count")?,
        internal_pagerank: row_number(&row, "internal_pagerank")?,
        component_id: row_text(&row, "component_id")?,
        component_size: row_integer(&row, "component_size")?,
        is_isolated: row_bool(&row, "is_isolated")?,
        age_norm: row_number(&row, "age_norm")?,
        recency_norm: row_number(&row, "recency_norm")?,
        in_degree_norm: row_number(&row, "in_degree_norm")?,
        out_degree_norm: row_number(&row, "out_degree_norm")?,
        pagerank_norm: row_number(&row, "pagerank_norm")?,
        foundation_score: row_number(&row, "foundation_score")?,
        frontier_score: row_number(&row, "frontier_score")?,
        synthesis_role_hints_json: row_text(&row, "synthesis_role_hints_json")?,
        source_structure_version: row_integer(&row, "source_structure_version")?,
        source_graph_hash: row_text(&row, "source_graph_hash")?,
        metrics_hash: row_text(&row, "metrics_hash")?,
        status: row_text(&row, "status")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_layout_metadata_record(row: Value) -> Result<CitationLayoutMetadataRecord, String> {
    Ok(CitationLayoutMetadataRecord {
        layout_key: row_text(&row, "layout_key")?,
        view_key: row_text(&row, "view_key")?,
        preset: row_text(&row, "preset")?,
        graph_hash: row_text(&row, "graph_hash")?,
        layout_hash: row_text(&row, "layout_hash")?,
        layout_version: row_integer(&row, "layout_version")?,
        status: row_text(&row, "status")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn citation_layout_point_record(row: Value) -> Result<CitationLayoutPointRecord, String> {
    Ok(CitationLayoutPointRecord {
        node_id: row_text(&row, "node_id")?,
        x: row_number(&row, "x")?,
        y: row_number(&row, "y")?,
    })
}

fn reference_source_record(row: Value) -> Result<ReferenceSourceRecord, String> {
    Ok(ReferenceSourceRecord {
        paper_ref: row_text(&row, "paper_ref")?,
        library_id: row_integer(&row, "library_id")?,
        item_key: row_text(&row, "item_key")?,
        title: row_text(&row, "title")?,
        year: row_text(&row, "year")?,
        metadata_hash: row_text(&row, "metadata_hash")?,
        summary_json: row_text(&row, "summary_json")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn reference_artifact_record(row: Value) -> Result<ReferenceArtifactRecord, String> {
    Ok(ReferenceArtifactRecord {
        paper_ref: row_text(&row, "paper_ref")?,
        artifact_type: row_text(&row, "artifact_type")?,
        payload_type: row_text(&row, "payload_type")?,
        status: row_text(&row, "status")?,
        locator: row_text(&row, "locator")?,
        payload_hash: row_text(&row, "payload_hash")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn literature_matching_metadata_record(
    row: Value,
) -> Result<LiteratureMatchingMetadataRecord, String> {
    Ok(LiteratureMatchingMetadataRecord {
        literature_item_id: row_text(&row, "literature_item_id")?,
        schema_id: row_text(&row, "schema_id")?,
        key_terms_json: row_text(&row, "key_terms_json")?,
        methods_json: row_text(&row, "methods_json")?,
        problems_json: row_text(&row, "problems_json")?,
        datasets_json: row_text(&row, "datasets_json")?,
        exclude_terms_json: row_text(&row, "exclude_terms_json")?,
        source_artifact_hash: row_text(&row, "source_artifact_hash")?,
        metadata_hash: row_text(&row, "metadata_hash")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn raw_reference_record(row: Value) -> Result<RawReferenceRecord, String> {
    Ok(RawReferenceRecord {
        raw_reference_id: row_text(&row, "raw_reference_id")?,
        source_ref: row_text(&row, "source_ref")?,
        references_artifact_hash: row_text(&row, "references_artifact_hash")?,
        reference_index: row_integer(&row, "reference_index")?,
        raw_hash: row_text(&row, "raw_hash")?,
        parsed_title: row_text(&row, "parsed_title")?,
        normalized_title: row_text(&row, "normalized_title")?,
        year: row_text(&row, "year")?,
        authors_json: row_text(&row, "authors_json")?,
        raw_reference: row_text(&row, "raw_reference")?,
        canonical_reference_id: row_text(&row, "canonical_reference_id")?,
        status: row_text(&row, "status")?,
        roles_json: row_text(&row, "roles_json")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn canonical_reference_record(row: Value) -> Result<CanonicalReferenceRecord, String> {
    Ok(CanonicalReferenceRecord {
        canonical_reference_id: row_text(&row, "canonical_reference_id")?,
        title: row_text(&row, "title")?,
        normalized_title: row_text(&row, "normalized_title")?,
        year: row_text(&row, "year")?,
        authors_json: row_text(&row, "authors_json")?,
        identifiers_json: row_text(&row, "identifiers_json")?,
        metadata_hash: row_text(&row, "metadata_hash")?,
        status: row_text(&row, "status")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn reference_binding_record(row: Value) -> Result<ReferenceBindingFactRecord, String> {
    Ok(ReferenceBindingFactRecord {
        binding_id: row_text(&row, "binding_id")?,
        canonical_reference_id: row_text(&row, "canonical_reference_id")?,
        library_id: row_integer(&row, "library_id")?,
        item_key: row_text(&row, "item_key")?,
        status: row_text(&row, "status")?,
        confidence: row_text(&row, "confidence")?,
        reviewer: row_text(&row, "reviewer")?,
        basis_hash: row_text(&row, "basis_hash")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn reference_redirect_record(row: Value) -> Result<ReferenceRedirectFactRecord, String> {
    Ok(ReferenceRedirectFactRecord {
        from_canonical_reference_id: row_text(&row, "from_canonical_reference_id")?,
        to_canonical_reference_id: row_text(&row, "to_canonical_reference_id")?,
        reason: row_text(&row, "reason")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn reference_review_record(row: Value) -> Result<ReferenceRevisionReviewRecord, String> {
    Ok(ReferenceRevisionReviewRecord {
        review_id: row_text(&row, "review_id")?,
        source_ref: row_text(&row, "source_ref")?,
        canonical_reference_id: row_text(&row, "canonical_reference_id")?,
        status: row_text(&row, "status")?,
        reason: row_text(&row, "reason")?,
        payload_json: row_text(&row, "payload_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn matching_state_record(row: Value) -> Result<ReferenceMatchingStateRecord, String> {
    Ok(ReferenceMatchingStateRecord {
        reference_hash: row_text(&row, "reference_hash")?,
        matching_hash: row_text(&row, "matching_hash")?,
        proposal_count: row_integer(&row, "proposal_count")?,
        open_proposal_count: row_integer(&row, "open_proposal_count")?,
        matching_ready: row_integer(&row, "matching_ready")? != 0,
        graph_ready: row_integer(&row, "graph_ready")? != 0,
        related_items_ready: row_integer(&row, "related_items_ready")? != 0,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn proposal_record(row: Value) -> Result<ReferenceMatchProposalRecord, String> {
    let score = row["score"]
        .as_f64()
        .ok_or_else(|| "repository_typed_row_invalid".to_owned())?;
    let record = ReferenceMatchProposalRecord {
        proposal_id: row_text(&row, "proposal_id")?,
        kind: row_text(&row, "kind")?,
        status: row_text(&row, "status")?,
        source_canonical_reference_id: row_text(&row, "source_canonical_reference_id")?,
        source_raw_reference_ids_json: row_text(&row, "source_raw_reference_ids_json")?,
        target_canonical_reference_id: row_text(&row, "target_canonical_reference_id")?,
        target_library_id: row_integer(&row, "target_library_id")?,
        target_item_key: row_text(&row, "target_item_key")?,
        confidence: row_text(&row, "confidence")?,
        score,
        reasons_json: row_text(&row, "reasons_json")?,
        evidence_json: row_text(&row, "evidence_json")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        basis_hash: row_text(&row, "basis_hash")?,
        source_hash: row_text(&row, "source_hash")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    };
    validate_proposal(&record)?;
    Ok(record)
}

fn preparation_record(row: Value) -> Result<ReferenceMatchingPreparationRecord, String> {
    let record = ReferenceMatchingPreparationRecord {
        preparation_id: row_text(&row, "preparation_id")?,
        reference_hash: row_text(&row, "reference_hash")?,
        repository_basis_hash: row_text(&row, "repository_basis_hash")?,
        host_basis_hash: row_text(&row, "host_basis_hash")?,
        status: row_text(&row, "status")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    };
    validate_preparation(&record)?;
    Ok(record)
}

fn validate_proposal(record: &ReferenceMatchProposalRecord) -> Result<(), String> {
    if record.proposal_id.is_empty()
        || !matches!(record.kind.as_str(), "zotero_binding" | "canonical_merge")
        || !matches!(
            record.status.as_str(),
            "open" | "accepted" | "rejected" | "superseded" | "retargeted"
        )
        || record.source_canonical_reference_id.is_empty()
        || !record.score.is_finite()
        || record.target_library_id < 0
    {
        return Err("reference_match_proposal_invalid".into());
    }
    Ok(())
}

fn validate_preparation(record: &ReferenceMatchingPreparationRecord) -> Result<(), String> {
    if record.preparation_id.is_empty()
        || record.repository_basis_hash.is_empty()
        || record.host_basis_hash.is_empty()
        || !matches!(
            record.status.as_str(),
            "prepared" | "applied" | "discarded" | "superseded" | "failed"
        )
    {
        return Err("reference_matching_preparation_invalid".into());
    }
    Ok(())
}

fn upsert_binding(
    repository: &Repository,
    record: &ReferenceBindingFactRecord,
) -> Result<(), String> {
    if record.binding_id.is_empty()
        || record.canonical_reference_id.is_empty()
        || record.library_id <= 0
        || record.item_key.is_empty()
    {
        return Err("reference_binding_invalid".into());
    }
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_binding(
         binding_id,canonical_reference_id,library_id,item_key,status,confidence,
         reviewer,basis_hash,diagnostics_json,created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        &[
            json!(record.binding_id),
            json!(record.canonical_reference_id),
            json!(record.library_id),
            json!(record.item_key),
            json!(record.status),
            json!(record.confidence),
            json!(record.reviewer),
            json!(record.basis_hash),
            json!(record.diagnostics_json),
            json!(record.created_at),
            json!(record.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_redirect_row(
    repository: &Repository,
    record: &ReferenceRedirectFactRecord,
) -> Result<(), String> {
    if record.from_canonical_reference_id.is_empty()
        || record.to_canonical_reference_id.is_empty()
        || record.from_canonical_reference_id == record.to_canonical_reference_id
    {
        return Err("reference_redirect_invalid".into());
    }
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_redirect(
         from_canonical_reference_id,to_canonical_reference_id,reason,
         diagnostics_json,created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6)",
        &[
            json!(record.from_canonical_reference_id),
            json!(record.to_canonical_reference_id),
            json!(record.reason),
            json!(record.diagnostics_json),
            json!(record.created_at),
            json!(record.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_redirect(
    repository: &Repository,
    record: &ReferenceRedirectFactRecord,
) -> Result<(), String> {
    let original = repository.list_reference_redirects()?;
    let mut graph = ReferenceRedirectGraph::from_records(&original)?;
    graph.merge(
        &record.from_canonical_reference_id,
        &record.to_canonical_reference_id,
    )?;
    persist_redirect_graph(
        repository,
        &original,
        &graph,
        std::slice::from_ref(record),
        &record.updated_at,
    )?;
    Ok(())
}

#[derive(Default)]
struct PersistedRedirectGraph {
    changed: bool,
    removed: Vec<ReferenceRedirectFactRecord>,
}

fn persist_redirect_graph(
    repository: &Repository,
    original: &[ReferenceRedirectFactRecord],
    graph: &ReferenceRedirectGraph,
    templates: &[ReferenceRedirectFactRecord],
    now: &str,
) -> Result<PersistedRedirectGraph, String> {
    graph.validate_acyclic()?;
    let original_by_source = original
        .iter()
        .map(|record| (record.from_canonical_reference_id.as_str(), record))
        .collect::<BTreeMap<_, _>>();
    let final_edges = graph.edges().collect::<BTreeMap<_, _>>();
    let mut result = PersistedRedirectGraph::default();
    for record in original {
        if final_edges
            .get(record.from_canonical_reference_id.as_str())
            .copied()
            != Some(record.to_canonical_reference_id.as_str())
        {
            repository.execute(
                "DELETE FROM synt_reference_redirect WHERE from_canonical_reference_id=?1",
                &[json!(record.from_canonical_reference_id)],
            )?;
            result.changed = true;
            result.removed.push(record.clone());
        }
    }
    for (source, target) in final_edges {
        if original_by_source
            .get(source)
            .is_some_and(|record| record.to_canonical_reference_id == target)
        {
            continue;
        }
        let template = templates
            .iter()
            .find(|record| {
                record.from_canonical_reference_id == source
                    && record.to_canonical_reference_id == target
            })
            .or_else(|| templates.last());
        let record = ReferenceRedirectFactRecord {
            from_canonical_reference_id: source.into(),
            to_canonical_reference_id: target.into(),
            reason: template
                .map(|record| record.reason.clone())
                .filter(|reason| !reason.is_empty())
                .unwrap_or_else(|| "reference_redirect_normalized".into()),
            diagnostics_json: template
                .map(|record| record.diagnostics_json.clone())
                .filter(|diagnostics| !diagnostics.is_empty())
                .unwrap_or_else(|| "[]".into()),
            created_at: template
                .map(|record| record.created_at.clone())
                .filter(|created_at| !created_at.is_empty())
                .unwrap_or_else(|| now.into()),
            updated_at: now.into(),
        };
        upsert_redirect_row(repository, &record)?;
        result.changed = true;
    }
    Ok(result)
}

fn supersede_displaced_redirect_proposals(
    repository: &Repository,
    removed: &[ReferenceRedirectFactRecord],
    now: &str,
) -> Result<(), String> {
    for edge in removed {
        repository.execute(
            "UPDATE synt_reference_match_proposal
             SET status='superseded',updated_at=?3
             WHERE kind='canonical_merge' AND status IN ('open','accepted')
               AND source_canonical_reference_id=?1
               AND target_canonical_reference_id=?2",
            &[
                json!(edge.from_canonical_reference_id),
                json!(edge.to_canonical_reference_id),
                json!(now),
            ],
        )?;
    }
    Ok(())
}

fn supersede_redundant_open_redirect_proposals(
    repository: &Repository,
    graph: &ReferenceRedirectGraph,
    now: &str,
) -> Result<(), String> {
    let rows = repository.query(
        "SELECT proposal_id,source_canonical_reference_id,target_canonical_reference_id
         FROM synt_reference_match_proposal
         WHERE kind='canonical_merge' AND status='open'",
        &[],
    )?;
    for row in rows {
        let source = row_text(&row, "source_canonical_reference_id")?;
        let target = row_text(&row, "target_canonical_reference_id")?;
        if !source.is_empty()
            && !target.is_empty()
            && graph.resolve(&source).ok() == graph.resolve(&target).ok()
        {
            repository.execute(
                "UPDATE synt_reference_match_proposal
                 SET status='superseded',updated_at=?2 WHERE proposal_id=?1",
                &[json!(row_text(&row, "proposal_id")?), json!(now)],
            )?;
        }
    }
    Ok(())
}

fn proposal_counts(repository: &Repository) -> Result<(i64, i64), String> {
    let row = repository
        .query(
            "SELECT COUNT(*) AS proposal_count,
             SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open_count
             FROM synt_reference_match_proposal",
            &[],
        )?
        .into_iter()
        .next()
        .ok_or_else(|| "reference_matching_state_invalid".to_owned())?;
    Ok((
        row_integer(&row, "proposal_count")?,
        row["open_count"].as_i64().unwrap_or(0),
    ))
}

fn upsert_matching_state(
    repository: &Repository,
    record: &ReferenceMatchingStateRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_matching_state(
         singleton_id,reference_hash,matching_hash,proposal_count,open_proposal_count,
         matching_ready,graph_ready,related_items_ready,updated_at
         ) VALUES(1,?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            json!(record.reference_hash),
            json!(record.matching_hash),
            json!(record.proposal_count),
            json!(record.open_proposal_count),
            json!(record.matching_ready),
            json!(record.graph_ready),
            json!(record.related_items_ready),
            json!(record.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_node(repository: &Repository, row: &CitationNodeRecord) -> Result<(), String> {
    if row.literature_item_id.is_empty() {
        return Err("repository_citation_node_invalid".into());
    }
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_node(
         literature_item_id,node_status,has_zotero_binding,title,year,
         authors_json,summary_json,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            json!(row.literature_item_id),
            json!(row.node_status),
            json!(row.has_zotero_binding),
            json!(row.title),
            json!(row.year),
            json!(row.authors_json),
            json!(row.summary_json),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_edge(repository: &Repository, row: &CitationEdgeRecord) -> Result<(), String> {
    if row.edge_id.is_empty() || row.source_literature_item_id.is_empty() || !row.weight.is_finite()
    {
        return Err("repository_citation_edge_invalid".into());
    }
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_edge(
         edge_id,source_literature_item_id,target_literature_item_id,
         reference_instance_id,resolution_id,edge_status,roles_json,weight,
         created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        &[
            json!(row.edge_id),
            json!(row.source_literature_item_id),
            json!(row.target_literature_item_id),
            json!(row.reference_instance_id),
            json!(row.resolution_id),
            json!(row.edge_status),
            json!(row.roles_json),
            json!(row.weight),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_ownership(
    repository: &Repository,
    row: &CitationSourceOwnershipRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_source_ownership(
         source_literature_item_id,edge_id,reference_instance_id,
         target_literature_item_id,edge_status,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6)",
        &[
            json!(row.source_literature_item_id),
            json!(row.edge_id),
            json!(row.reference_instance_id),
            json!(row.target_literature_item_id),
            json!(row.edge_status),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_incoming(
    repository: &Repository,
    row: &CitationIncomingGroupRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_incoming_group(
         target_literature_item_id,source_literature_item_id,edge_id,
         reference_instance_id,edge_status,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6)",
        &[
            json!(row.target_literature_item_id),
            json!(row.source_literature_item_id),
            json!(row.edge_id),
            json!(row.reference_instance_id),
            json!(row.edge_status),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_light_metrics(
    repository: &Repository,
    row: &CitationLightMetricsRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_metrics_light(
         literature_item_id,outgoing_count,incoming_count,matched_outgoing_count,
         unresolved_outgoing_count,ambiguous_outgoing_count,local_degree,
         source_structure_version,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        &[
            json!(row.literature_item_id),
            json!(row.outgoing_count),
            json!(row.incoming_count),
            json!(row.matched_outgoing_count),
            json!(row.unresolved_outgoing_count),
            json!(row.ambiguous_outgoing_count),
            json!(row.local_degree),
            json!(row.source_structure_version),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_complex_metrics(
    repository: &Repository,
    row: &CitationComplexMetricsRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_metrics_complex(
         literature_item_id,node_id,paper_ref,item_key,title,year,internal_in_degree,
         internal_out_degree,external_reference_count,unresolved_reference_count,
         internal_pagerank,component_id,component_size,is_isolated,age_norm,recency_norm,
         in_degree_norm,out_degree_norm,pagerank_norm,foundation_score,frontier_score,
         synthesis_role_hints_json,source_structure_version,source_graph_hash,
         metrics_hash,status,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,
                  ?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27)",
        &[
            json!(row.literature_item_id),
            json!(row.node_id),
            json!(row.paper_ref),
            json!(row.item_key),
            json!(row.title),
            json!(row.year),
            json!(row.internal_in_degree),
            json!(row.internal_out_degree),
            json!(row.external_reference_count),
            json!(row.unresolved_reference_count),
            json!(row.internal_pagerank),
            json!(row.component_id),
            json!(row.component_size),
            json!(row.is_isolated),
            json!(row.age_norm),
            json!(row.recency_norm),
            json!(row.in_degree_norm),
            json!(row.out_degree_norm),
            json!(row.pagerank_norm),
            json!(row.foundation_score),
            json!(row.frontier_score),
            json!(row.synthesis_role_hints_json),
            json!(row.source_structure_version),
            json!(row.source_graph_hash),
            json!(row.metrics_hash),
            json!(row.status),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_citation_layout(
    repository: &Repository,
    row: &CitationLayoutRecord,
) -> Result<(), String> {
    if !matches!(
        row.status.as_str(),
        "missing" | "ready" | "dirty" | "running" | "failed"
    ) {
        return Err("repository_citation_layout_invalid".into());
    }
    repository.execute(
        "INSERT OR REPLACE INTO synt_citation_layout_state(
         layout_key,view_key,preset,graph_hash,status,layout_json,diagnostics_json,
         created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        &[
            json!(row.layout_key),
            json!(row.view_key),
            json!(row.preset),
            json!(row.graph_hash),
            json!(row.status),
            json!(row.layout_json),
            json!(row.diagnostics_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_reference_source(
    repository: &Repository,
    row: &ReferenceSourceRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_source(
         paper_ref,library_id,item_key,title,year,metadata_hash,summary_json,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            json!(row.paper_ref),
            json!(row.library_id),
            json!(row.item_key),
            json!(row.title),
            json!(row.year),
            json!(row.metadata_hash),
            json!(row.summary_json),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_reference_artifact(
    repository: &Repository,
    row: &ReferenceArtifactRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_artifact(
         paper_ref,artifact_type,payload_type,status,locator,payload_hash,
         diagnostics_json,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            json!(row.paper_ref),
            json!(row.artifact_type),
            json!(row.payload_type),
            json!(row.status),
            json!(row.locator),
            json!(row.payload_hash),
            json!(row.diagnostics_json),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_literature_matching_metadata(
    repository: &Repository,
    row: &LiteratureMatchingMetadataRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_literature_matching_metadata(
         literature_item_id,schema_id,key_terms_json,methods_json,problems_json,datasets_json,
         exclude_terms_json,source_artifact_hash,metadata_hash,diagnostics_json,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
         ON CONFLICT(literature_item_id) DO UPDATE SET
         schema_id=excluded.schema_id,key_terms_json=excluded.key_terms_json,
         methods_json=excluded.methods_json,problems_json=excluded.problems_json,
         datasets_json=excluded.datasets_json,exclude_terms_json=excluded.exclude_terms_json,
         source_artifact_hash=excluded.source_artifact_hash,
         metadata_hash=excluded.metadata_hash,diagnostics_json=excluded.diagnostics_json,
         updated_at=excluded.updated_at",
        &[
            json!(row.literature_item_id),
            json!(row.schema_id),
            json!(row.key_terms_json),
            json!(row.methods_json),
            json!(row.problems_json),
            json!(row.datasets_json),
            json!(row.exclude_terms_json),
            json!(row.source_artifact_hash),
            json!(row.metadata_hash),
            json!(row.diagnostics_json),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn upsert_raw_reference(repository: &Repository, row: &RawReferenceRecord) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_reference_raw(
         raw_reference_id,source_ref,references_artifact_hash,reference_index,raw_hash,
         parsed_title,normalized_title,year,authors_json,raw_reference,
         canonical_reference_id,status,roles_json,diagnostics_json,created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",
        &[
            json!(row.raw_reference_id),
            json!(row.source_ref),
            json!(row.references_artifact_hash),
            json!(row.reference_index),
            json!(row.raw_hash),
            json!(row.parsed_title),
            json!(row.normalized_title),
            json!(row.year),
            json!(row.authors_json),
            json!(row.raw_reference),
            json!(row.canonical_reference_id),
            json!(row.status),
            json!(row.roles_json),
            json!(row.diagnostics_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn insert_canonical_if_absent(
    repository: &Repository,
    row: &CanonicalReferenceRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR IGNORE INTO synt_reference_canonical(
         canonical_reference_id,title,normalized_title,year,authors_json,
         identifiers_json,metadata_hash,status,created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        &[
            json!(row.canonical_reference_id),
            json!(row.title),
            json!(row.normalized_title),
            json!(row.year),
            json!(row.authors_json),
            json!(row.identifiers_json),
            json!(row.metadata_hash),
            json!(row.status),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn insert_binding_if_absent(
    repository: &Repository,
    row: &ReferenceBindingFactRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR IGNORE INTO synt_reference_binding(
         binding_id,canonical_reference_id,library_id,item_key,status,confidence,
         reviewer,basis_hash,diagnostics_json,created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        &[
            json!(row.binding_id),
            json!(row.canonical_reference_id),
            json!(row.library_id),
            json!(row.item_key),
            json!(row.status),
            json!(row.confidence),
            json!(row.reviewer),
            json!(row.basis_hash),
            json!(row.diagnostics_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn insert_review_if_absent(
    repository: &Repository,
    row: &ReferenceRevisionReviewRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR IGNORE INTO synt_reference_revision_review(
         review_id,source_ref,canonical_reference_id,status,reason,payload_json,
         created_at,updated_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        &[
            json!(row.review_id),
            json!(row.source_ref),
            json!(row.canonical_reference_id),
            json!(row.status),
            json!(row.reason),
            json!(row.payload_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn reference_counts(repository: &Repository) -> Result<(i64, i64, i64, i64), String> {
    let row = repository
        .query(
            "SELECT
             (SELECT COUNT(*) FROM synt_reference_source) AS source_count,
             (SELECT COUNT(*) FROM synt_reference_raw WHERE status='active') AS reference_count,
             (SELECT COUNT(*) FROM synt_reference_canonical WHERE status='active') AS canonical_count,
             (SELECT COUNT(*) FROM synt_reference_binding WHERE status='accepted') AS binding_count",
            &[],
        )?
        .into_iter()
        .next()
        .ok_or_else(|| "repository_reference_state_invalid".to_owned())?;
    Ok((
        row_integer(&row, "source_count")?,
        row_integer(&row, "reference_count")?,
        row_integer(&row, "canonical_count")?,
        row_integer(&row, "binding_count")?,
    ))
}

fn delete_in(
    repository: &Repository,
    table: &str,
    column: &str,
    values: &[String],
) -> Result<(), String> {
    for value in values {
        repository.execute(
            &format!("DELETE FROM {table} WHERE {column}=?1"),
            &[json!(value)],
        )?;
    }
    Ok(())
}

fn scoped_string_clause(column: &str, values: &[String]) -> Result<(String, Vec<Value>), String> {
    if values.is_empty() {
        return Ok((String::new(), Vec::new()));
    }
    let mut bindings = Vec::with_capacity(values.len());
    let mut placeholders = Vec::with_capacity(values.len());
    for value in values {
        validate_identity_part(value)?;
        bindings.push(json!(value));
        placeholders.push(format!("?{}", bindings.len()));
    }
    Ok((
        format!("WHERE {column} IN ({})", placeholders.join(",")),
        bindings,
    ))
}

fn delete_not_in(
    repository: &Repository,
    table: &str,
    column: &str,
    values: &[String],
) -> Result<(), String> {
    let placeholders = (1..=values.len())
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(",");
    let bindings = values.iter().map(|value| json!(value)).collect::<Vec<_>>();
    repository.execute(
        &format!("DELETE FROM {table} WHERE {column} NOT IN ({placeholders})"),
        &bindings,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{CacheBasisRecord, OperationRecord, RepositoryIdentity};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-citation-reference-repository-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn graph(graph_hash: &str, node_id: &str) -> CitationGraphReplacement {
        CitationGraphReplacement {
            state: CitationGraphApplicationStateRecord {
                graph_hash: graph_hash.into(),
                input_hash: format!("input:{graph_hash}"),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
                ..CitationGraphApplicationStateRecord::default()
            },
            nodes: vec![CitationNodeRecord {
                literature_item_id: node_id.into(),
                node_status: "active".into(),
                authors_json: "[]".into(),
                summary_json: "{}".into(),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
                ..CitationNodeRecord::default()
            }],
            edges: Vec::new(),
            ownership: Vec::new(),
            incoming_groups: Vec::new(),
            light_metrics: Vec::new(),
            complex_metrics: Vec::new(),
        }
    }

    #[test]
    fn graph_replacement_cas_rolls_back_every_projection_table() {
        let root = root();
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        assert!(
            repository
                .replace_citation_graph_application_state(None, &graph("graph:1", "paper:1"))
                .expect("initial replacement")
        );
        repository
            .execute(
                "CREATE TRIGGER fail_citation_replace
                 BEFORE INSERT ON synt_citation_node
                 WHEN NEW.literature_item_id='paper:2'
                 BEGIN SELECT RAISE(ABORT, 'forced failure'); END",
                &[],
            )
            .expect("create trigger");
        assert!(
            repository
                .replace_citation_graph_application_state(
                    Some("graph:1"),
                    &graph("graph:2", "paper:2"),
                )
                .is_err()
        );
        assert_eq!(
            repository
                .get_citation_graph_application_state()
                .expect("state")
                .expect("active state")
                .graph_hash,
            "graph:1"
        );
        assert_eq!(
            repository
                .list_citation_nodes()
                .expect("nodes")
                .into_iter()
                .map(|row| row.literature_item_id)
                .collect::<Vec<_>>(),
            ["paper:1"]
        );
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn graph_promotion_rolls_back_graph_cache_and_operation_together() {
        let root = root();
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        assert!(
            repository
                .replace_citation_graph_application_state(None, &graph("graph:1", "paper:1"))
                .expect("initial replacement")
        );
        repository
            .upsert_cache_basis(&CacheBasisRecord {
                cache_key: "citation-graph:library".into(),
                cache_kind: "citation_graph".into(),
                scope_kind: "library".into(),
                status: "ready".into(),
                basis_kind: "graph_hash".into(),
                basis_value: "graph:1".into(),
                refreshed_at: "2026-07-26T00:00:00.000Z".into(),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
                ..CacheBasisRecord::default()
            })
            .expect("initial cache basis");
        let running = OperationRecord {
            operation_id: "citation-graph-attempt:2".into(),
            operation_type: "citation_graph_cache_rebuild".into(),
            status: "running".into(),
            phase: "promote".into(),
            progress_mode: "indeterminate".into(),
            diagnostics_json: "[]".into(),
            created_at: "2026-07-26T00:00:01.000Z".into(),
            started_at: "2026-07-26T00:00:01.000Z".into(),
            updated_at: "2026-07-26T00:00:01.000Z".into(),
            ..OperationRecord::default()
        };
        repository
            .upsert_operation(&running)
            .expect("running graph attempt");
        repository
            .execute(
                "CREATE TRIGGER fail_citation_graph_attempt_terminal
                 BEFORE UPDATE ON synt_operation
                 WHEN NEW.operation_id='citation-graph-attempt:2' AND NEW.status='completed'
                 BEGIN SELECT RAISE(ABORT, 'forced terminal failure'); END",
                &[],
            )
            .expect("create terminal trigger");

        let result = repository.commit_citation_graph_promotion(&CitationGraphPromotionCommit {
            promotion: CitationGraphPromotion::Full {
                expected_graph_hash: Some("graph:1".into()),
                replacement: graph("graph:2", "paper:2"),
            },
            ready_cache: CacheBasisRecord {
                cache_key: "citation-graph:library".into(),
                cache_kind: "citation_graph".into(),
                scope_kind: "library".into(),
                status: "ready".into(),
                basis_kind: "graph_hash".into(),
                basis_value: "graph:2".into(),
                refreshed_at: "2026-07-26T00:00:02.000Z".into(),
                updated_at: "2026-07-26T00:00:02.000Z".into(),
                ..CacheBasisRecord::default()
            },
            terminal_operation: OperationRecord {
                status: "completed".into(),
                phase: "completed".into(),
                completed_at: "2026-07-26T00:00:02.000Z".into(),
                updated_at: "2026-07-26T00:00:02.000Z".into(),
                ..running.clone()
            },
        });
        assert!(result.is_err());

        assert_eq!(
            repository
                .get_citation_graph_application_state()
                .expect("state")
                .expect("active state")
                .graph_hash,
            "graph:1"
        );
        assert_eq!(
            repository
                .list_citation_nodes()
                .expect("nodes")
                .into_iter()
                .map(|row| row.literature_item_id)
                .collect::<Vec<_>>(),
            ["paper:1"]
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("cache basis")
                .expect("citation graph cache")
                .basis_value,
            "graph:1"
        );
        assert_eq!(
            repository
                .get_operation("citation-graph-attempt:2")
                .expect("operation")
                .expect("graph attempt")
                .status,
            "running"
        );
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn source_slice_promotion_publishes_its_computed_hash_atomically() {
        let root = root();
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        assert!(
            repository
                .replace_citation_graph_application_state(None, &graph("graph:1", "paper:1"))
                .expect("initial replacement")
        );
        let running = OperationRecord {
            operation_id: "citation-graph-attempt:incremental".into(),
            operation_type: "citation_graph_cache_incremental_refresh".into(),
            status: "running".into(),
            phase: "promote".into(),
            progress_mode: "indeterminate".into(),
            diagnostics_json: "[]".into(),
            created_at: "2026-07-26T00:00:01.000Z".into(),
            started_at: "2026-07-26T00:00:01.000Z".into(),
            updated_at: "2026-07-26T00:00:01.000Z".into(),
            ..OperationRecord::default()
        };
        repository
            .upsert_operation(&running)
            .expect("running graph attempt");

        let result = repository
            .commit_citation_graph_promotion(&CitationGraphPromotionCommit {
                promotion: CitationGraphPromotion::SourceSlice {
                    expected_graph_hash: "graph:1".into(),
                    source_ids: vec!["paper:1".into()],
                    replacement: graph("ignored-until-merge", "paper:2"),
                },
                ready_cache: CacheBasisRecord {
                    cache_key: "citation-graph:library".into(),
                    cache_kind: "citation_graph".into(),
                    scope_kind: "library".into(),
                    status: "ready".into(),
                    basis_kind: "graph_hash".into(),
                    refreshed_at: "2026-07-26T00:00:02.000Z".into(),
                    updated_at: "2026-07-26T00:00:02.000Z".into(),
                    ..CacheBasisRecord::default()
                },
                terminal_operation: OperationRecord {
                    status: "completed".into(),
                    phase: "completed".into(),
                    completed_at: "2026-07-26T00:00:02.000Z".into(),
                    updated_at: "2026-07-26T00:00:02.000Z".into(),
                    ..running
                },
            })
            .expect("source-slice promotion");
        let CitationGraphPromotionResult::Promoted { graph_hash } = result else {
            panic!("source-slice basis should match");
        };
        assert!(graph_hash.starts_with("sha256:"));
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("cache basis")
                .expect("citation graph cache")
                .basis_value,
            graph_hash
        );
        let operation = repository
            .get_operation("citation-graph-attempt:incremental")
            .expect("operation")
            .expect("graph attempt");
        assert_eq!(operation.status, "completed");
        assert_eq!(operation.basis_value, graph_hash);
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn canonical_maintenance_writes_records_redirects_and_cache_state() {
        let root = root();
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        repository
            .upsert_canonical_reference_record(&CanonicalReferenceRecord {
                canonical_reference_id: "canonical:1".into(),
                title: "Title".into(),
                normalized_title: "title".into(),
                authors_json: "[]".into(),
                identifiers_json: "{}".into(),
                metadata_hash: "sha256:metadata".into(),
                status: "active".into(),
                created_at: "1".into(),
                updated_at: "1".into(),
                ..CanonicalReferenceRecord::default()
            })
            .expect("canonical");
        repository
            .upsert_canonical_reference_redirect(&ReferenceRedirectFactRecord {
                from_canonical_reference_id: "canonical:old".into(),
                to_canonical_reference_id: "canonical:1".into(),
                reason: "test".into(),
                diagnostics_json: "[]".into(),
                created_at: "1".into(),
                updated_at: "1".into(),
            })
            .expect("redirect");
        repository
            .execute(
                "INSERT INTO synt_cache_basis(
                 cache_key,cache_kind,status
                 ) VALUES('citation','citation_graph','ready')",
                &[],
            )
            .expect("cache");
        repository
            .mark_reference_dependent_caches_stale("canonical_update", "2")
            .expect("mark stale");
        assert_eq!(
            repository.list_canonical_references().expect("canonicals")[0].canonical_reference_id,
            "canonical:1"
        );
        assert_eq!(
            repository.list_reference_redirects().expect("redirects")[0].to_canonical_reference_id,
            "canonical:1"
        );
        assert_eq!(
            repository
                .query(
                    "SELECT status FROM synt_cache_basis WHERE cache_key='citation'",
                    &[],
                )
                .expect("cache row")[0]["status"],
            json!("stale")
        );
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn citation_graph_window_pages_large_graph_without_dangling_edges() {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile-window".into(),
                data_root_id: "data-window".into(),
            },
        )
        .expect("open repository");
        repository
            .execute(
                "WITH RECURSIVE ids(value) AS (
                   SELECT 1 UNION ALL SELECT value+1 FROM ids WHERE value<7500
                 )
                 INSERT INTO synt_citation_node(
                   literature_item_id,node_status,has_zotero_binding,title,authors_json,summary_json
                 )
                 SELECT printf('1:N%05d',value),'active',1,printf('Paper %05d',value),'[]','{}'
                 FROM ids",
                &[],
            )
            .expect("insert nodes");
        repository
            .execute(
                "WITH RECURSIVE ids(value) AS (
                   SELECT 1 UNION ALL SELECT value+1 FROM ids WHERE value<12000
                 )
                 INSERT INTO synt_citation_edge(
                   edge_id,source_literature_item_id,target_literature_item_id,
                   reference_instance_id,edge_status,roles_json,weight
                 )
                 SELECT printf('E%05d',value),
                        printf('1:N%05d',((value-1)%7500)+1),
                        printf('1:N%05d',(value%7500)+1),
                        printf('R%05d',value),'accepted','[\"background\"]',1
                 FROM ids",
                &[],
            )
            .expect("insert edges");
        repository
            .execute(
                "INSERT INTO synt_citation_graph_application_state(
                   singleton_id,graph_hash,input_hash,node_count,edge_count
                 ) VALUES('active','graph:large','input:large',7500,12000)",
                &[],
            )
            .expect("insert state");

        let mut request = CitationGraphWindowQuery {
            node_offset: 0,
            node_limit: 200,
            edge_offset: 0,
            edge_limit: 400,
            hover_node_offset: 0,
            hover_node_limit: 100,
            hover_edge_offset: 0,
            hover_edge_limit: 200,
            filter: CitationGraphWindowFilter {
                node_kinds: vec!["library_paper".into()],
                roles: vec!["background".into()],
                include_low_signal: false,
                ..CitationGraphWindowFilter::default()
            },
        };
        let first = repository
            .read_citation_graph_window(&request)
            .expect("first page");
        let repeated = repository
            .read_citation_graph_window(&request)
            .expect("repeated page");
        assert_eq!(first, repeated);
        assert_eq!((first.total_nodes, first.total_edges), (7500, 12000));
        assert_eq!((first.nodes.len(), first.edges.len()), (200, 400));
        assert_eq!(first.role_options, ["background"]);
        let returned = first
            .nodes
            .iter()
            .chain(first.endpoint_nodes.iter())
            .map(|node| node.record.literature_item_id.as_str())
            .collect::<BTreeSet<_>>();
        assert!(first.edges.iter().all(|edge| {
            returned.contains(edge.record.source_literature_item_id.as_str())
                && returned.contains(edge.record.target_literature_item_id.as_str())
        }));
        let outgoing = repository
            .read_citation_graph_neighborhood("1:N00001", "outgoing", 10, 10, &request.filter)
            .expect("outgoing neighborhood");
        let incoming = repository
            .read_citation_graph_neighborhood("1:N00001", "incoming", 10, 10, &request.filter)
            .expect("incoming neighborhood");
        assert!(
            outgoing
                .edges
                .iter()
                .all(|edge| { edge.record.source_literature_item_id == "1:N00001" })
        );
        assert!(
            incoming
                .edges
                .iter()
                .all(|edge| { edge.record.target_literature_item_id == "1:N00001" })
        );

        let mut node_ids = BTreeSet::new();
        let mut edge_ids = BTreeSet::new();
        loop {
            let page = repository
                .read_citation_graph_window(&request)
                .expect("next page");
            node_ids.extend(
                page.nodes
                    .iter()
                    .map(|node| node.record.literature_item_id.clone()),
            );
            edge_ids.extend(page.edges.iter().map(|edge| edge.record.edge_id.clone()));
            request.node_offset += page.nodes.len();
            request.edge_offset += page.edges.len();
            if request.node_offset >= page.total_nodes && request.edge_offset >= page.total_edges {
                break;
            }
        }
        assert_eq!(node_ids.len(), 7500);
        assert_eq!(edge_ids.len(), 12000);
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn citation_graph_metrics_and_layout_reads_materialize_only_the_requested_window() {
        let root = root();
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile-windowed-reads".into(),
                data_root_id: "data-windowed-reads".into(),
            },
        )
        .expect("open repository");
        repository
            .execute(
                "WITH RECURSIVE ids(value) AS (
                   SELECT 1 UNION ALL SELECT value+1 FROM ids WHERE value<500
                 )
                 INSERT INTO synt_citation_node(
                   literature_item_id,node_status,has_zotero_binding,title,authors_json,summary_json
                 )
                 SELECT printf('1:N%05d',value),'active',1,printf('Paper %05d',value),'[]','{}'
                 FROM ids",
                &[],
            )
            .expect("insert nodes");
        repository
            .execute(
                "WITH RECURSIVE ids(value) AS (
                   SELECT 1 UNION ALL SELECT value+1 FROM ids WHERE value<500
                 )
                 INSERT INTO synt_citation_metrics_complex(
                   literature_item_id,node_id,paper_ref,item_key,title,
                   internal_in_degree,internal_pagerank,foundation_score,frontier_score,
                   source_graph_hash,metrics_hash,status
                 )
                 SELECT printf('1:N%05d',value),printf('1:N%05d',value),
                        printf('1:N%05d',value),printf('N%05d',value),printf('Paper %05d',value),
                        value,value/1000.0,value/10.0,(501-value)/10.0,
                        'graph:windowed','metrics:windowed','ready'
                 FROM ids",
                &[],
            )
            .expect("insert metrics");
        repository
            .execute(
                "INSERT INTO synt_citation_metrics_light(
                   literature_item_id,source_structure_version
                 ) VALUES('1:N00500',1)",
                &[],
            )
            .expect("insert stale light metrics marker outside requested page");
        repository
            .execute(
                "INSERT INTO synt_citation_layout_state(
                   layout_key,view_key,preset,graph_hash,status,layout_json
                 ) VALUES(
                   'workbench_overview:force','workbench_overview','force','graph:windowed','ready',
                   json_object(
                     'graph_hash','graph:windowed','layout_hash','layout:windowed','layout_version',2,
                     'nodes',json_object(
                       '1:N00001',json_object('x',1.0,'y',2.0),
                       '1:N00500',json_object('x',500.0,'y',1000.0)
                     )
                   )
                 )",
                &[],
            )
            .expect("insert layout");

        let (page, metrics_observation) = crate::observe_repository_sql(|| {
            repository.read_citation_metrics_page(&CitationMetricsPageQuery {
                offset: 25,
                limit: 25,
                sort_by: CitationMetricsSort::Pagerank,
                paper_refs: Vec::new(),
            })
        });
        let page = page.expect("metrics page");
        assert_eq!(page.total, 500);
        assert_eq!(page.records.len(), 25);
        assert_eq!(page.records[0].literature_item_id, "1:N00475");
        assert!(page.stale);
        assert!(metrics_observation.query_count <= 2);
        assert_eq!(metrics_observation.write_count, 0);

        let (layout, layout_observation) = crate::observe_repository_sql(|| {
            repository.read_citation_layout_window("workbench_overview:force", &["1:N00001".into()])
        });
        let layout = layout.expect("layout window").expect("layout record");
        assert_eq!(layout.metadata.layout_hash, "layout:windowed");
        assert_eq!(layout.points.len(), 1);
        assert_eq!(layout.points[0].node_id, "1:N00001");
        assert!(layout_observation.query_count <= 2);
        assert_eq!(layout_observation.write_count, 0);
        let (presets, preset_observation) = crate::observe_repository_sql(|| {
            repository.list_ready_citation_layout_presets("graph:windowed")
        });
        assert_eq!(presets.expect("ready presets"), vec!["force"]);
        assert_eq!(preset_observation.query_count, 1);
        assert_eq!(preset_observation.write_count, 0);

        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn repository_reopens_with_additive_tables_and_rejects_conflicting_schema() {
        let root = root();
        let identity = RepositoryIdentity {
            profile_id: "profile-schema".into(),
            data_root_id: "data-schema".into(),
        };
        let repository = Repository::open(&root, identity.clone()).expect("open repository");
        repository
            .execute("DROP TABLE synt_citation_layout_state", &[])
            .expect("drop additive table");
        drop(repository);
        let repository = Repository::open(&root, identity.clone()).expect("restore additive table");
        assert!(
            repository.schema_inventory().expect("inventory")["tables"]
                .as_array()
                .is_some_and(|tables| tables
                    .iter()
                    .any(|table| { table["name"].as_str() == Some("synt_citation_layout_state") }))
        );
        repository
            .execute("DROP TABLE synt_citation_node", &[])
            .expect("drop node table");
        repository
            .execute(
                "CREATE TABLE synt_citation_node(literature_item_id TEXT PRIMARY KEY)",
                &[],
            )
            .expect("create conflicting table");
        drop(repository);
        assert_eq!(
            Repository::open(&root, identity).expect_err("conflicting schema must fail"),
            "repository_schema_incompatible"
        );
        let _ = std::fs::remove_dir_all(root);
    }
}
