//! Typed persistence boundary for the existing Citation/Reference table families.
//!
//! Application policy deliberately stays outside this module.  The records below are
//! the narrow state and replacement DTOs needed by private applications; SQL table
//! selection is internal and fixed so callers cannot turn this into a generic store.

use crate::{Repository, row_integer, row_text};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashSet;

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

    pub fn list_citation_complex_metrics(
        &self,
    ) -> Result<Vec<CitationComplexMetricsRecord>, String> {
        self.query("SELECT * FROM synt_citation_metrics_complex", &[])?
            .into_iter()
            .map(citation_complex_metrics_record)
            .collect()
    }

    pub fn list_citation_layouts(&self) -> Result<Vec<CitationLayoutRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_layout_state ORDER BY view_key ASC,preset ASC",
            &[],
        )?
        .into_iter()
        .map(citation_layout_record)
        .collect()
    }

    pub fn get_citation_layout(
        &self,
        layout_key: &str,
    ) -> Result<Option<CitationLayoutRecord>, String> {
        self.query(
            "SELECT * FROM synt_citation_layout_state WHERE layout_key=?1 LIMIT 1",
            &[json!(layout_key)],
        )?
        .into_iter()
        .next()
        .map(citation_layout_record)
        .transpose()
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
        let mut records = self
            .query(
                "SELECT * FROM synt_reference_artifact ORDER BY paper_ref ASC,artifact_type ASC",
                &[],
            )?
            .into_iter()
            .map(reference_artifact_record)
            .collect::<Result<Vec<_>, _>>()?;
        if !source_refs.is_empty() {
            let selected = source_refs.iter().collect::<HashSet<_>>();
            records.retain(|record| selected.contains(&record.paper_ref));
        }
        Ok(records)
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
                repository.execute(
                    "UPDATE synt_cache_basis SET status='stale',
                     stale_reason='reference_refresh_graph_facts_changed',updated_at=?1
                     WHERE cache_key IN ('citation-graph:library','related-items-sync:global')",
                    &[json!(replacement.now)],
                )?;
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
            let graph_facts_changed = transitions
                .iter()
                .any(|transition| transition.graph_facts_changed);
            let updated_at = transitions
                .iter()
                .map(|transition| transition.updated_at.as_str())
                .max()
                .unwrap_or_default()
                .to_owned();
            for transition in transitions {
                if !transition.revoke_binding_id.is_empty() {
                    repository.execute(
                        "DELETE FROM synt_reference_binding WHERE binding_id=?1",
                        &[json!(transition.revoke_binding_id)],
                    )?;
                }
                for source in &transition.revoke_redirect_source_ids {
                    repository.execute(
                        "DELETE FROM synt_reference_redirect WHERE from_canonical_reference_id=?1",
                        &[json!(source)],
                    )?;
                }
                if let Some(binding) = &transition.binding {
                    upsert_binding(repository, binding)?;
                }
                for redirect in &transition.redirects {
                    upsert_redirect(repository, redirect)?;
                }
                repository.upsert_reference_match_proposal(&transition.proposal)?;
                for proposal in &transition.audit_proposals {
                    repository.upsert_reference_match_proposal(proposal)?;
                }
            }
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

fn citation_layout_record(row: Value) -> Result<CitationLayoutRecord, String> {
    Ok(CitationLayoutRecord {
        layout_key: row_text(&row, "layout_key")?,
        view_key: row_text(&row, "view_key")?,
        preset: row_text(&row, "preset")?,
        graph_hash: row_text(&row, "graph_hash")?,
        status: row_text(&row, "status")?,
        layout_json: row_text(&row, "layout_json")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
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

fn upsert_redirect(
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
    use crate::RepositoryIdentity;
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
}
