use super::{
    SCHEMA_IDENTITIES, SCHEMA_SQL, SCHEMA_VERSION, TopicApplicationProjectionRecord,
    TopicApplicationStateRecord, map_sqlite_error, migration_backup_path,
    open_existing_database_read_only, open_production_database_read_only, read_schema_version,
    verify_required_application_schema,
};
use rusqlite::{Connection, OptionalExtension, params};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

pub(crate) const LEGACY_TS_SCHEMA_VERSION: &str = "2026-06-01.sidecar-cache-hard-cut";
const LEGACY_MIGRATION_ID: &str = "synthesis-legacy-ts-sidecar-cache-hard-cut.v2";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum LegacyTsVariant {
    ReleaseV05V06,
    ReleaseV07V083,
    DevPlanning,
    DevPlanningScreening,
}

const LEGACY_TABLES: &[(&str, &str)] = &[
    (
        "synt_artifact_sidecar",
        "source_ref,library_id,item_key,artifact_type,status,artifact_hash,locator_json,diagnostics_json,scanned_at,updated_at",
    ),
    (
        "synt_cache_basis",
        "cache_key,cache_kind,scope_kind,scope_ref,status,basis_kind,basis_value,source_hash,policy_version,active_operation_id,refreshed_at,stale_reason,diagnostics_json,updated_at",
    ),
    (
        "synt_canonical_reference",
        "canonical_reference_id,title,normalized_title,year,authors_json,identifiers_json,metadata_hash,status,created_at,updated_at",
    ),
    (
        "synt_canonical_reference_redirect",
        "from_canonical_reference_id,to_canonical_reference_id,reason,diagnostics_json,created_at,updated_at",
    ),
    (
        "synt_canonical_store_record",
        "record_id,record_kind,transaction_id,scope,asset_path,payload_json,created_at",
    ),
    (
        "synt_citation_edge",
        "edge_id,source_literature_item_id,target_literature_item_id,reference_instance_id,resolution_id,edge_status,roles_json,weight,created_at,updated_at",
    ),
    (
        "synt_citation_incoming_group",
        "target_literature_item_id,source_literature_item_id,edge_id,reference_instance_id,edge_status,updated_at",
    ),
    (
        "synt_citation_layout_state",
        "layout_key,view_key,preset,graph_hash,status,layout_json,diagnostics_json,created_at,updated_at",
    ),
    (
        "synt_citation_metrics_complex",
        "literature_item_id,node_id,paper_ref,item_key,title,year,internal_in_degree,internal_out_degree,external_reference_count,unresolved_reference_count,internal_pagerank,component_id,component_size,is_isolated,age_norm,recency_norm,in_degree_norm,out_degree_norm,pagerank_norm,foundation_score,frontier_score,synthesis_role_hints_json,source_structure_version,source_graph_hash,metrics_hash,status,updated_at",
    ),
    (
        "synt_citation_metrics_light",
        "literature_item_id,outgoing_count,incoming_count,matched_outgoing_count,unresolved_outgoing_count,ambiguous_outgoing_count,local_degree,source_structure_version,updated_at",
    ),
    (
        "synt_citation_node",
        "literature_item_id,node_status,has_zotero_binding,title,year,authors_json,summary_json,updated_at",
    ),
    (
        "synt_citation_source_ownership",
        "source_literature_item_id,edge_id,reference_instance_id,target_literature_item_id,edge_status,updated_at",
    ),
    (
        "synt_concept",
        "concept_id,label,aliases_json,concept_type,domain,status,short_definition,definition,usage_note,editorial_note,sense_ids_json,created_at,updated_at",
    ),
    (
        "synt_concept_alias",
        "alias_id,alias,normalized,concept_id,sense_id,status,confidence,created_at,updated_at",
    ),
    (
        "synt_concept_relation",
        "relation_id,source_concept_id,target_concept_id,relation,status,confidence,provenance_json,created_at,updated_at",
    ),
    (
        "synt_concept_review_item",
        "review_id,status,reason,topic_id,topic_path_id,label,confidence,candidate_concept_ids_json,proposal_json,target_concept_id,created_at,updated_at,resolved_at",
    ),
    (
        "synt_concept_sense",
        "sense_id,concept_id,label,aliases_json,domain,short_definition,definition,disambiguation,topic_relevance,confidence,source_topic_ids_json,evidence_json,created_at,updated_at",
    ),
    (
        "synt_literature_matching_metadata",
        "literature_item_id,schema_id,key_terms_json,methods_json,problems_json,datasets_json,exclude_terms_json,source_artifact_hash,metadata_hash,diagnostics_json,updated_at",
    ),
    (
        "synt_operation",
        "operation_id,operation_type,library_id,scope_kind,scope_ref,status,label,phase,phase_label,message,progress_mode,processed_count,skipped_count,failed_count,total_count,basis_kind,basis_value,source_hash,diagnostics_json,created_at,started_at,completed_at,updated_at",
    ),
    (
        "synt_raw_reference",
        "raw_reference_id,source_ref,references_artifact_hash,reference_index,raw_hash,parsed_title,normalized_title,year,authors_json,raw_reference,canonical_reference_id,status,roles_json,diagnostics_json,created_at,updated_at",
    ),
    (
        "synt_reference_binding",
        "binding_id,canonical_reference_id,library_id,item_key,status,confidence,reviewer,basis_hash,diagnostics_json,created_at,updated_at",
    ),
    (
        "synt_reference_match_proposal",
        "proposal_id,kind,status,source_canonical_reference_id,source_raw_reference_ids_json,target_canonical_reference_id,target_library_id,target_item_key,confidence,score,reasons_json,evidence_json,diagnostics_json,basis_hash,source_hash,created_at,updated_at",
    ),
    (
        "synt_related_items_sync_effect",
        "effect_id,operation_id,citation_edge_id,source_literature_item_id,target_literature_item_id,source_library_id,source_item_key,target_library_id,target_item_key,action,status,created_by_synthesis,graph_basis_hash,graph_hash,external_write_at,echo_state,echo_observed_at,diagnostics_json,created_at,updated_at",
    ),
    (
        "synt_review_item",
        "review_item_id,review_kind,priority,status,scope_kind,scope_ref,blocked_by_review_item_id,payload_json,diagnostics_json,created_at,updated_at",
    ),
    ("synt_schema_meta", "key,value"),
    (
        "synt_tag_abbrev",
        "abbrev_key,abbrev_value,created_at,updated_at",
    ),
    ("synt_tag_alias", "alias,tag,created_at,updated_at"),
    (
        "synt_tag_audit",
        "library_id,item_key,needs_tag_regulation,non_compliant_tags_json,audited_at,updated_at",
    ),
    (
        "synt_tag_protocol",
        "protocol_id,version,tag_pattern,max_tag_length,facets_json,updated_at",
    ),
    (
        "synt_tag_staged_suggestion",
        "tag,facet,note,source_flow,parent_bindings_json,created_at,updated_at",
    ),
    (
        "synt_tag_validation_warning",
        "warning_id,code,severity,tag,message,created_at,updated_at",
    ),
    (
        "synt_tag_vocabulary_entry",
        "tag,facet,note,source,deprecated,replacement,aliases_json,abbrev_json,usage_count,last_synced_at,created_at,updated_at",
    ),
    (
        "synt_topic_concept_link",
        "topic_id,concept_id,sense_id,label,relevance,confidence,source,created_at,updated_at",
    ),
    (
        "synt_topic_discovery_hint",
        "hint_id,topic_id,literature_item_id,score,method,matching_fields_json,status,created_at,updated_at",
    ),
    (
        "synt_topic_graph_edge",
        "edge_id,source_topic_id,target_topic_id,relation,status,confidence,provenance_json,evidence_refs_json,created_at,updated_at",
    ),
    (
        "synt_topic_graph_node",
        "topic_id,title,definition,aliases_json,node_type,definition_status,current_artifact_path,is_root,level,paper_count,last_synthesis_at,created_at,updated_at",
    ),
    (
        "synt_topic_graph_review_item",
        "review_id,status,source_topic_id,target_topic_id,target_title,relation,confidence,provenance_json,evidence_refs_json,created_at,updated_at,resolved_at",
    ),
    (
        "synt_topic_interest_metadata",
        "topic_id,schema_id,include_terms_json,must_have_terms_json,methods_json,exclude_terms_json,seed_literature_item_ids_json,source_artifact_hash,metadata_hash,diagnostics_json,updated_at",
    ),
];

const DIRECT_COPY_TABLES: &[&str] = &[
    "synt_cache_basis",
    "synt_citation_edge",
    "synt_citation_incoming_group",
    "synt_citation_layout_state",
    "synt_citation_metrics_complex",
    "synt_citation_metrics_light",
    "synt_citation_node",
    "synt_citation_source_ownership",
    "synt_concept",
    "synt_concept_alias",
    "synt_concept_relation",
    "synt_concept_review_item",
    "synt_concept_sense",
    "synt_literature_matching_metadata",
    "synt_operation",
    "synt_reference_binding",
    "synt_reference_match_proposal",
    "synt_review_item",
    "synt_tag_abbrev",
    "synt_tag_alias",
    "synt_tag_audit",
    "synt_tag_protocol",
    "synt_tag_staged_suggestion",
    "synt_tag_validation_warning",
    "synt_tag_vocabulary_entry",
    "synt_topic_concept_link",
    "synt_topic_graph_edge",
    "synt_topic_graph_node",
    "synt_topic_graph_review_item",
];

fn table_columns(connection: &Connection, table: &str) -> Result<String, String> {
    table_columns_in(connection, "main", table)
}

fn table_columns_in(
    connection: &Connection,
    database: &str,
    table: &str,
) -> Result<String, String> {
    let quoted = table.replace('\'', "''");
    let mut statement = connection
        .prepare(&format!("PRAGMA {database}.table_info('{quoted}')"))
        .map_err(map_sqlite_error)?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    Ok(columns.join(","))
}

fn table_names(connection: &Connection) -> Result<BTreeSet<String>, String> {
    let mut statement = connection
        .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE 'synt_%' ORDER BY name")
        .map_err(map_sqlite_error)?;
    statement
        .query_map([], |row| row.get(0))
        .map_err(map_sqlite_error)?
        .collect::<Result<BTreeSet<_>, _>>()
        .map_err(map_sqlite_error)
}

fn legacy_schema_version(connection: &Connection) -> Result<Option<String>, String> {
    let has_meta = connection
        .query_row(
            "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='synt_schema_meta'",
            [],
            |_| Ok(()),
        )
        .optional()
        .map_err(map_sqlite_error)?
        .is_some();
    if !has_meta {
        return Ok(None);
    }
    connection
        .query_row(
            "SELECT value FROM synt_schema_meta WHERE key='schema_version'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(map_sqlite_error)
}

pub(crate) fn classify_legacy_ts_schema(
    connection: &Connection,
) -> Result<Option<LegacyTsVariant>, String> {
    if legacy_schema_version(connection)?.as_deref() != Some(LEGACY_TS_SCHEMA_VERSION) {
        return Ok(None);
    }
    if connection
        .query_row(
            "SELECT value FROM synt_schema_meta WHERE key='repository_foundation_schema_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(map_sqlite_error)?
        .is_some()
    {
        return Ok(None);
    }
    let expected = LEGACY_TABLES
        .iter()
        .map(|(name, _)| (*name).to_owned())
        .collect::<BTreeSet<_>>();
    let mut release_v05_tables = expected.clone();
    release_v05_tables.remove("synt_tag_audit");
    let actual_tables = table_names(connection)?;
    if actual_tables != expected && actual_tables != release_v05_tables {
        return Err("legacy_schema_variant_unsupported".into());
    }
    for (table, columns) in LEGACY_TABLES {
        if *table == "synt_tag_audit" && actual_tables == release_v05_tables {
            continue;
        }
        let actual = table_columns(connection, table)?;
        let accepted = match *table {
            "synt_topic_graph_node" => {
                [(*columns).to_owned(), format!("{columns},planning_json")].contains(&actual)
            }
            "synt_topic_discovery_hint" => [
                (*columns).to_owned(),
                format!("{columns},basis_hash,outcome_json"),
            ]
            .contains(&actual),
            _ => actual == *columns,
        };
        if !accepted {
            return Err("legacy_schema_variant_unsupported".into());
        }
    }
    if actual_tables == release_v05_tables {
        return Ok(Some(LegacyTsVariant::ReleaseV05V06));
    }
    let has_planning = table_columns(connection, "synt_topic_graph_node")?
        .split(',')
        .any(|column| column == "planning_json");
    let has_screening = table_columns(connection, "synt_topic_discovery_hint")?
        .split(',')
        .any(|column| column == "basis_hash");
    match (has_planning, has_screening) {
        (false, false) => Ok(Some(LegacyTsVariant::ReleaseV07V083)),
        (true, false) => Ok(Some(LegacyTsVariant::DevPlanning)),
        (true, true) => Ok(Some(LegacyTsVariant::DevPlanningScreening)),
        (false, true) => Err("legacy_schema_variant_unsupported".into()),
    }
}

#[cfg(test)]
pub(crate) fn is_exact_legacy_ts_schema(connection: &Connection) -> Result<bool, String> {
    Ok(matches!(
        classify_legacy_ts_schema(connection)?,
        Some(LegacyTsVariant::ReleaseV07V083)
    ))
}

fn parse_json(text: String, error: &str) -> Result<Value, String> {
    serde_json::from_str(&text).map_err(|_| error.to_owned())
}

fn parse_optional_json(text: String, error: &str) -> Result<Value, String> {
    if text.trim().is_empty() {
        Ok(json!({}))
    } else {
        parse_json(text, error)
    }
}

fn text(row: &rusqlite::Row<'_>, index: usize) -> Result<String, String> {
    row.get(index).map_err(map_sqlite_error)
}

fn copy_direct_tables(connection: &Connection) -> Result<(), String> {
    for table in DIRECT_COPY_TABLES {
        let columns = table_columns_in(connection, "legacy", table)?;
        if columns.is_empty() {
            continue;
        }
        connection
            .execute(
                &format!(
                    "INSERT INTO main.{table}({columns}) SELECT {columns} FROM legacy.{table}"
                ),
                [],
            )
            .map_err(map_sqlite_error)?;
    }
    for (source, target) in [
        ("synt_canonical_reference", "synt_reference_canonical"),
        (
            "synt_canonical_reference_redirect",
            "synt_reference_redirect",
        ),
        ("synt_raw_reference", "synt_reference_raw"),
    ] {
        let columns = table_columns(connection, target)?;
        connection
            .execute(
                &format!(
                    "INSERT INTO main.{target}({columns}) SELECT {columns} FROM legacy.{source}"
                ),
                [],
            )
            .map_err(map_sqlite_error)?;
    }
    Ok(())
}

fn copy_artifacts(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare(
            "SELECT source_ref,library_id,item_key,artifact_type,status,artifact_hash,
                    locator_json,diagnostics_json,updated_at
               FROM legacy.synt_artifact_sidecar ORDER BY source_ref,artifact_type",
        )
        .map_err(map_sqlite_error)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
            ))
        })
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    let mut sources = BTreeMap::<String, (i64, String, String)>::new();
    for (
        paper_ref,
        library_id,
        item_key,
        artifact_type,
        status,
        hash,
        locator_json,
        diagnostics,
        updated_at,
    ) in rows
    {
        let locator = parse_json(locator_json, "repository_legacy_artifact_invalid")?;
        let payload_type = locator
            .get("payload_type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let note_key = locator
            .get("note_key")
            .and_then(Value::as_str)
            .unwrap_or_default();
        sources
            .entry(paper_ref.clone())
            .or_insert((library_id, item_key, updated_at.clone()));
        connection.execute(
            "INSERT INTO synt_reference_artifact(paper_ref,artifact_type,payload_type,status,locator,payload_hash,diagnostics_json,updated_at)
             VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
            params![paper_ref, artifact_type, payload_type, status, note_key, hash, diagnostics, updated_at],
        ).map_err(map_sqlite_error)?;
    }
    for (paper_ref, (library_id, item_key, updated_at)) in sources {
        connection.execute(
            "INSERT INTO synt_reference_source(paper_ref,library_id,item_key,title,year,metadata_hash,summary_json,updated_at)
             VALUES(?1,?2,?3,'','','','{}',?4)",
            params![paper_ref, library_id, item_key, updated_at],
        ).map_err(map_sqlite_error)?;
    }
    Ok(())
}

fn copy_related_effects(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare(
            "SELECT effect_id,operation_id,citation_edge_id,source_literature_item_id,
                target_literature_item_id,source_library_id,source_item_key,target_library_id,
                target_item_key,action,status,created_by_synthesis,graph_hash,external_write_at,
                echo_state,echo_observed_at,diagnostics_json,created_at,updated_at
           FROM legacy.synt_related_items_sync_effect ORDER BY effect_id",
        )
        .map_err(map_sqlite_error)?;
    let mut rows = statement.query([]).map_err(map_sqlite_error)?;
    while let Some(row) = rows.next().map_err(map_sqlite_error)? {
        let diagnostics = parse_json(text(row, 16)?, "repository_legacy_related_effect_invalid")?;
        let payload = json!({
            "effectId":text(row,0)?, "operationId":text(row,1)?, "citationEdgeId":text(row,2)?,
            "sourceLiteratureItemId":text(row,3)?, "targetLiteratureItemId":text(row,4)?,
            "sourceLibraryId":row.get::<_,i64>(5).map_err(map_sqlite_error)?, "sourceItemKey":text(row,6)?,
            "targetLibraryId":row.get::<_,i64>(7).map_err(map_sqlite_error)?, "targetItemKey":text(row,8)?,
            "action":text(row,9)?, "status":text(row,10)?,
            "createdBySynthesis":row.get::<_,i64>(11).map_err(map_sqlite_error)? != 0,
            "graphHash":text(row,12)?, "externalWriteAt":text(row,13)?, "echoState":text(row,14)?,
            "echoObservedAt":text(row,15)?, "diagnostics":diagnostics,
            "createdAt":text(row,17)?, "updatedAt":text(row,18)?,
        });
        connection.execute(
            "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)",
            params![payload["effectId"].as_str().unwrap_or_default(), serde_json::to_string(&payload).map_err(|_| "repository_legacy_related_effect_invalid".to_owned())?, payload["updatedAt"].as_str().unwrap_or_default()],
        ).map_err(map_sqlite_error)?;
    }
    Ok(())
}

fn copy_topic_payloads(connection: &Connection) -> Result<(), String> {
    let hint_columns = table_columns_in(connection, "legacy", "synt_topic_discovery_hint")?;
    let has_screening = hint_columns.split(',').any(|column| column == "basis_hash");
    let basis_expression = if has_screening { "basis_hash" } else { "''" };
    let outcome_expression = if has_screening {
        "outcome_json"
    } else {
        "'{}'"
    };
    let mut hints = connection.prepare(
        &format!("SELECT hint_id,topic_id,literature_item_id,CAST(score AS REAL),method,matching_fields_json,status,created_at,updated_at,
                  {basis_expression} AS basis_hash,{outcome_expression} AS outcome_json
                  FROM legacy.synt_topic_discovery_hint ORDER BY hint_id"),
    ).map_err(map_sqlite_error)?;
    let mut rows = hints.query([]).map_err(map_sqlite_error)?;
    while let Some(row) = rows.next().map_err(map_sqlite_error)? {
        let payload = json!({
            "hint_id":text(row,0)?, "topic_id":text(row,1)?, "literature_item_id":text(row,2)?,
            "score":row.get::<_,f64>(3).map_err(map_sqlite_error)?, "method":text(row,4)?,
            "matching_fields":parse_json(text(row,5)?, "repository_legacy_topic_hint_invalid")?,
            "status":text(row,6)?, "created_at":text(row,7)?, "updated_at":text(row,8)?,
            "basis_hash":text(row,9)?,
            "outcome":parse_optional_json(text(row,10)?, "repository_legacy_topic_hint_invalid")?,
        });
        connection.execute(
            "INSERT INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at) VALUES(?1,?2,?3)",
            params![payload["hint_id"].as_str().unwrap_or_default(), serde_json::to_string(&payload).map_err(|_| "repository_legacy_topic_hint_invalid".to_owned())?, payload["updated_at"].as_str().unwrap_or_default()],
        ).map_err(map_sqlite_error)?;
    }
    let mut metadata = connection
        .prepare(
            "SELECT topic_id,schema_id,include_terms_json,must_have_terms_json,methods_json,
                exclude_terms_json,seed_literature_item_ids_json,updated_at
           FROM legacy.synt_topic_interest_metadata ORDER BY topic_id",
        )
        .map_err(map_sqlite_error)?;
    let mut rows = metadata.query([]).map_err(map_sqlite_error)?;
    while let Some(row) = rows.next().map_err(map_sqlite_error)? {
        let payload = json!({
            "topic_id":text(row,0)?, "schema_id":text(row,1)?,
            "include_terms":parse_json(text(row,2)?, "repository_legacy_topic_interest_invalid")?,
            "must_have_terms":parse_json(text(row,3)?, "repository_legacy_topic_interest_invalid")?,
            "methods":parse_json(text(row,4)?, "repository_legacy_topic_interest_invalid")?,
            "exclude_terms":parse_json(text(row,5)?, "repository_legacy_topic_interest_invalid")?,
            "seed_literature_item_ids":parse_json(text(row,6)?, "repository_legacy_topic_interest_invalid")?,
        });
        connection.execute(
            "INSERT INTO synt_topic_interest_metadata(topic_id,payload_json,updated_at) VALUES(?1,?2,?3)",
            params![payload["topic_id"].as_str().unwrap_or_default(), serde_json::to_string(&payload).map_err(|_| "repository_legacy_topic_interest_invalid".to_owned())?, text(row,7)?],
        ).map_err(map_sqlite_error)?;
    }
    Ok(())
}

fn copy_counts(connection: &Connection, table: &str, legacy_table: &str) -> Result<(), String> {
    let current: i64 = connection
        .query_row(&format!("SELECT COUNT(*) FROM main.{table}"), [], |row| {
            row.get(0)
        })
        .map_err(map_sqlite_error)?;
    let legacy: i64 = connection
        .query_row(
            &format!("SELECT COUNT(*) FROM legacy.{legacy_table}"),
            [],
            |row| row.get(0),
        )
        .map_err(map_sqlite_error)?;
    if current == legacy {
        Ok(())
    } else {
        Err("repository_legacy_fact_count_mismatch".into())
    }
}

fn insert_legacy_topics(
    connection: &Connection,
    topics: &[(
        TopicApplicationStateRecord,
        TopicApplicationProjectionRecord,
    )],
) -> Result<(), String> {
    for (state, projection) in topics {
        if state.topic_id != projection.topic_id || state.topic_id.is_empty() {
            return Err("repository_legacy_topic_projection_invalid".into());
        }
        for value in [
            &state.topic_definition_json,
            &state.topic_resolver_json,
            &state.resolved_paper_set_json,
            &projection.topic_graph_json,
            &projection.concepts_json,
            &projection.interest_metadata_json,
            &projection.discovery_json,
        ] {
            if !parse_json(value.clone(), "repository_legacy_topic_projection_invalid")?.is_object()
            {
                return Err("repository_legacy_topic_projection_invalid".into());
            }
        }
        connection
            .execute(
                "INSERT INTO synt_topic_application_state(
               topic_id,path_id,title,definition,language,operation,manifest_hash,artifact_hash,
               metadata_hash,bundle_hash,paper_count,topic_definition_json,topic_resolver_json,
               resolved_paper_set_json,created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",
                params![
                    state.topic_id,
                    state.path_id,
                    state.title,
                    state.definition,
                    state.language,
                    state.operation,
                    state.manifest_hash,
                    state.artifact_hash,
                    state.metadata_hash,
                    state.bundle_hash,
                    state.paper_count,
                    state.topic_definition_json,
                    state.topic_resolver_json,
                    state.resolved_paper_set_json,
                    state.created_at,
                    state.updated_at
                ],
            )
            .map_err(map_sqlite_error)?;
        connection.execute(
            "INSERT INTO synt_topic_application_projection(
               topic_id,topic_graph_json,concepts_json,interest_metadata_json,discovery_json,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6)",
            params![projection.topic_id,projection.topic_graph_json,projection.concepts_json,
                projection.interest_metadata_json,projection.discovery_json,projection.updated_at],
        ).map_err(map_sqlite_error)?;
    }
    Ok(())
}

fn build_current_database(
    source: &Path,
    target: &Path,
    topics: &[(
        TopicApplicationStateRecord,
        TopicApplicationProjectionRecord,
    )],
) -> Result<(), String> {
    let connection = Connection::open(target).map_err(map_sqlite_error)?;
    connection
        .execute_batch("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE;")
        .map_err(map_sqlite_error)?;
    let built = (|| -> Result<(), String> {
        connection
            .execute_batch(SCHEMA_SQL)
            .map_err(|_| "repository_schema_incompatible".to_owned())?;
        connection
            .execute(
                "ATTACH DATABASE ?1 AS legacy",
                [source.to_string_lossy().as_ref()],
            )
            .map_err(map_sqlite_error)?;
        copy_direct_tables(&connection)?;
        copy_artifacts(&connection)?;
        copy_related_effects(&connection)?;
        copy_topic_payloads(&connection)?;
        insert_legacy_topics(&connection, topics)?;
        connection.execute_batch(
            "UPDATE synt_cache_basis SET status='stale',active_operation_id='',stale_reason='legacy_ts_migration';
             UPDATE synt_citation_layout_state SET status='stale';
             UPDATE synt_citation_metrics_complex SET status='stale';
             INSERT INTO synt_tag_application_state(singleton_id,vocabulary_hash,staged_revision,index_hash,index_basis_hash,index_json,index_stale,updated_at)
               VALUES(1,'',0,'','','{}',1,'');
             INSERT INTO synt_durable_sync_state(singleton_id,revision,updated_at) VALUES(1,0,'');",
        ).map_err(map_sqlite_error)?;
        for (key, value) in SCHEMA_IDENTITIES {
            connection
                .execute(
                    "INSERT OR REPLACE INTO synt_schema_meta(key,value) VALUES(?1,?2)",
                    params![key, value],
                )
                .map_err(map_sqlite_error)?;
        }
        for table in DIRECT_COPY_TABLES {
            if table_columns_in(&connection, "legacy", table)?.is_empty() {
                continue;
            }
            copy_counts(&connection, table, table)?;
        }
        copy_counts(
            &connection,
            "synt_reference_canonical",
            "synt_canonical_reference",
        )?;
        copy_counts(
            &connection,
            "synt_reference_redirect",
            "synt_canonical_reference_redirect",
        )?;
        copy_counts(&connection, "synt_reference_raw", "synt_raw_reference")?;
        copy_counts(
            &connection,
            "synt_reference_artifact",
            "synt_artifact_sidecar",
        )?;
        copy_counts(
            &connection,
            "synt_related_items_sync_effect",
            "synt_related_items_sync_effect",
        )?;
        copy_counts(
            &connection,
            "synt_topic_discovery_hint",
            "synt_topic_discovery_hint",
        )?;
        copy_counts(
            &connection,
            "synt_topic_interest_metadata",
            "synt_topic_interest_metadata",
        )?;
        connection
            .execute_batch("COMMIT; DETACH DATABASE legacy;")
            .map_err(map_sqlite_error)?;
        Ok(())
    })();
    if let Err(error) = built {
        let _ = connection.execute_batch("ROLLBACK;");
        return Err(error);
    }
    if connection
        .query_row("PRAGMA quick_check", [], |row| row.get::<_, String>(0))
        .map_err(map_sqlite_error)?
        != "ok"
    {
        return Err("repository_legacy_integrity_failed".into());
    }
    if connection
        .query_row("PRAGMA foreign_key_check", [], |_| Ok(()))
        .optional()
        .map_err(map_sqlite_error)?
        .is_some()
    {
        return Err("repository_legacy_foreign_key_failed".into());
    }
    verify_required_application_schema(&connection)?;
    if read_schema_version(&connection)? != SCHEMA_VERSION {
        return Err("repository_schema_migration_incomplete".into());
    }
    Ok(())
}

fn temporary_database_path(database_path: &Path) -> Result<PathBuf, String> {
    let parent = database_path
        .parent()
        .ok_or_else(|| "repository_production_path_invalid".to_owned())?;
    Ok(parent.join(format!(
        ".synthesis-legacy-migration-{}.db",
        std::process::id()
    )))
}

fn publish_database(source: &Path, database_path: &Path) -> Result<(), String> {
    let current = open_existing_database_read_only(source)?;
    current
        .backup(rusqlite::MAIN_DB, database_path, None)
        .map_err(|error| format!("repository_schema_migration_publish_failed:{error}"))
}

pub(crate) fn migrate_if_known_legacy_ts(
    database_path: &Path,
    backup_root: &Path,
    topics: &[(
        TopicApplicationStateRecord,
        TopicApplicationProjectionRecord,
    )],
) -> Result<bool, String> {
    let source = open_production_database_read_only(database_path)?;
    let Some(variant) = classify_legacy_ts_schema(&source)? else {
        return Ok(false);
    };
    drop(source);
    let backup_path = migration_backup_path(backup_root, LEGACY_MIGRATION_ID, SCHEMA_VERSION);
    if backup_path.exists() {
        let backup = open_existing_database_read_only(&backup_path)?;
        if classify_legacy_ts_schema(&backup)? != Some(variant) {
            return Err("repository_migration_backup_mismatch".into());
        }
    } else {
        let parent = backup_path
            .parent()
            .ok_or_else(|| "repository_migration_backup_path_invalid".to_owned())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("repository_migration_backup_failed:{error}"))?;
        let source = open_production_database_read_only(database_path)?;
        source
            .backup(rusqlite::MAIN_DB, &backup_path, None)
            .map_err(|error| format!("repository_migration_backup_failed:{error}"))?;
    }
    let temporary = temporary_database_path(database_path)?;
    if temporary.exists() {
        fs::remove_file(&temporary)
            .map_err(|error| format!("repository_schema_migration_temp_failed:{error}"))?;
    }
    let result = build_current_database(database_path, &temporary, topics)
        .and_then(|_| publish_database(&temporary, database_path));
    let _ = fs::remove_file(&temporary);
    result.map(|_| true)
}

pub(crate) fn legacy_topic_ids(database_path: &Path) -> Result<Option<Vec<String>>, String> {
    let connection = open_production_database_read_only(database_path)?;
    if classify_legacy_ts_schema(&connection)?.is_none() {
        return Ok(None);
    }
    let mut statement = connection
        .prepare("SELECT topic_id FROM synt_topic_graph_node ORDER BY topic_id")
        .map_err(map_sqlite_error)?;
    let values = statement
        .query_map([], |row| row.get(0))
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    Ok(Some(values))
}

#[cfg(test)]
pub(crate) fn create_legacy_test_database(database_path: &Path) -> Result<(), String> {
    let connection = Connection::open(database_path).map_err(map_sqlite_error)?;
    for (table, columns) in LEGACY_TABLES {
        if *table == "synt_schema_meta" {
            continue;
        }
        let definitions = columns
            .split(',')
            .map(|column| format!("{column} TEXT NOT NULL DEFAULT ''"))
            .collect::<Vec<_>>()
            .join(",");
        connection
            .execute_batch(&format!("CREATE TABLE {table}({definitions});"))
            .map_err(map_sqlite_error)?;
    }
    connection
        .execute_batch("CREATE TABLE synt_schema_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);")
        .map_err(map_sqlite_error)?;
    connection
        .execute(
            "INSERT INTO synt_schema_meta(key,value) VALUES('schema_version',?1)",
            [LEGACY_TS_SCHEMA_VERSION],
        )
        .map_err(map_sqlite_error)?;
    Ok(())
}
