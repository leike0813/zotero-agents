use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{Connection, OpenFlags, OptionalExtension, ToSql, params};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::cell::Cell;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use synthesis_protocol::unix_millis_from_utc_iso8601;

mod citation_reference;
pub use citation_reference::*;
mod checkpoint_bundle_webdav_debug;
pub use checkpoint_bundle_webdav_debug::*;
mod reference_redirect_graph;
pub use reference_redirect_graph::*;
mod tag_concept_topic_graph;
pub use tag_concept_topic_graph::*;

const PREVIOUS_SCHEMA_VERSION: &str = "synthesis-repository-foundation.v1";
pub const SCHEMA_VERSION: &str = "synthesis-repository-foundation.v2";
pub const BUSY_TIMEOUT_MILLIS: u64 = 250;
pub const JS_SAFE_INTEGER_MAX: i64 = 9_007_199_254_740_991;
const IDENTITY_SCHEMA: &str = "synthesis-rust-shadow-repository.v1";
const PRODUCTION_IDENTITY_SCHEMA: &str = "synthesis-rust-production-repository.v1";
const REFERENCE_REDIRECT_GRAPH_SCHEMA_KEY: &str = "reference_redirect_graph_schema_version";
const REFERENCE_REDIRECT_GRAPH_SCHEMA: &str = "synthesis-reference-redirect-graph.v1";
const SCHEMA_SQL: &str = include_str!("schema.sql");

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ReviewPageQuery {
    pub status: String,
    pub kind: String,
    pub confidence: String,
    pub search: String,
    pub offset: usize,
    pub limit: usize,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct ReviewPage<T> {
    pub records: Vec<T>,
    pub total: usize,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct RepositorySqlObservation {
    pub query_count: u64,
    pub write_count: u64,
}

thread_local! {
    static SQL_OBSERVATION: Cell<Option<RepositorySqlObservation>> = const { Cell::new(None) };
}

struct SqlObservationScope {
    previous: Option<RepositorySqlObservation>,
    active: bool,
}

impl SqlObservationScope {
    fn enter() -> Self {
        let previous = SQL_OBSERVATION
            .with(|observation| observation.replace(Some(RepositorySqlObservation::default())));
        Self {
            previous,
            active: true,
        }
    }

    fn finish(mut self) -> RepositorySqlObservation {
        let observed = SQL_OBSERVATION
            .with(|observation| observation.replace(self.previous))
            .unwrap_or_default();
        self.active = false;
        observed
    }
}

impl Drop for SqlObservationScope {
    fn drop(&mut self) {
        if self.active {
            SQL_OBSERVATION.with(|observation| observation.set(self.previous));
        }
    }
}

pub fn observe_repository_sql<T>(operation: impl FnOnce() -> T) -> (T, RepositorySqlObservation) {
    let scope = SqlObservationScope::enter();
    let result = operation();
    let observation = scope.finish();
    (result, observation)
}

fn is_terminal_operation_status(status: &str) -> bool {
    matches!(
        status,
        "completed" | "succeeded" | "failed" | "canceled" | "timed_out"
    )
}

fn record_observed_repository_query() {
    SQL_OBSERVATION.with(|observation| {
        if let Some(current) = observation.get() {
            observation.set(Some(RepositorySqlObservation {
                query_count: current.query_count.saturating_add(1),
                ..current
            }));
        }
    });
}

fn record_observed_repository_write() {
    SQL_OBSERVATION.with(|observation| {
        if let Some(current) = observation.get() {
            observation.set(Some(RepositorySqlObservation {
                write_count: current.write_count.saturating_add(1),
                ..current
            }));
        }
    });
}

const SCHEMA_IDENTITIES: &[(&str, &str)] = &[
    ("repository_foundation_schema_version", SCHEMA_VERSION),
    (
        "topic_application_schema_version",
        "synthesis-topic-application-repository.v2",
    ),
    (
        "citation_graph_application_schema_version",
        "synthesis-citation-graph-application-repository.v1",
    ),
    (
        "reference_refresh_application_schema_version",
        "synthesis-reference-refresh-repository.v1",
    ),
    (
        "reference_matching_review_application_schema_version",
        "synthesis-reference-matching-review-repository.v1",
    ),
    (
        "tag_vocabulary_application_schema_version",
        "synthesis-tag-vocabulary-application-repository.v1",
    ),
    (
        "concept_kb_application_schema_version",
        "synthesis-concept-kb-application-repository.v1",
    ),
    (
        "topic_graph_application_schema_version",
        "synthesis-topic-graph-application-repository.v1",
    ),
    (
        "durable_import_repository_schema_version",
        "synthesis-durable-import-repository.v1",
    ),
    (
        REFERENCE_REDIRECT_GRAPH_SCHEMA_KEY,
        REFERENCE_REDIRECT_GRAPH_SCHEMA,
    ),
];

struct RegisteredProductionSchemaMigration {
    from: &'static str,
    to: &'static str,
    migrate: fn(&Connection) -> Result<(), String>,
}

// Schema changes must be registered here explicitly. Ordinary XPI updates do
// not create backups and never infer a migration from a runtime fingerprint.
const REGISTERED_PRODUCTION_SCHEMA_MIGRATIONS: &[RegisteredProductionSchemaMigration] =
    &[RegisteredProductionSchemaMigration {
        from: PREVIOUS_SCHEMA_VERSION,
        to: SCHEMA_VERSION,
        migrate: migrate_repository_foundation_v1_to_v2,
    }];

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RepositoryIdentity {
    pub profile_id: String,
    pub data_root_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct IdentityMarker {
    schema: String,
    profile_id: String,
    data_root_id: String,
    schema_version: String,
    repository_id: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperationRecord {
    pub operation_id: String,
    pub operation_type: String,
    #[serde(default)]
    pub library_id: i64,
    #[serde(default)]
    pub scope_kind: String,
    #[serde(default)]
    pub scope_ref: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub phase: String,
    #[serde(default)]
    pub phase_label: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub progress_mode: String,
    #[serde(default)]
    pub processed_count: i64,
    #[serde(default)]
    pub skipped_count: i64,
    #[serde(default)]
    pub failed_count: i64,
    #[serde(default)]
    pub total_count: i64,
    #[serde(default)]
    pub basis_kind: String,
    #[serde(default)]
    pub basis_value: String,
    #[serde(default)]
    pub source_hash: String,
    #[serde(default)]
    pub diagnostics_json: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub started_at: String,
    #[serde(default)]
    pub completed_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CacheBasisRecord {
    pub cache_key: String,
    pub cache_kind: String,
    #[serde(default)]
    pub scope_kind: String,
    #[serde(default)]
    pub scope_ref: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub basis_kind: String,
    #[serde(default)]
    pub basis_value: String,
    #[serde(default)]
    pub source_hash: String,
    #[serde(default)]
    pub policy_version: String,
    #[serde(default)]
    pub active_operation_id: String,
    #[serde(default)]
    pub refreshed_at: String,
    #[serde(default)]
    pub stale_reason: String,
    #[serde(default)]
    pub diagnostics_json: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicApplicationStateRecord {
    pub topic_id: String,
    pub path_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub definition: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub operation: String,
    pub manifest_hash: String,
    pub artifact_hash: String,
    pub metadata_hash: String,
    pub bundle_hash: String,
    #[serde(default)]
    pub paper_count: i64,
    #[serde(default)]
    pub topic_definition_json: String,
    #[serde(default)]
    pub topic_resolver_json: String,
    #[serde(default)]
    pub resolved_paper_set_json: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicApplicationProjectionRecord {
    pub topic_id: String,
    #[serde(default)]
    pub topic_graph_json: String,
    #[serde(default)]
    pub concepts_json: String,
    #[serde(default)]
    pub interest_metadata_json: String,
    #[serde(default)]
    pub discovery_json: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeletedTopicArtifactRecord {
    pub topic_id: String,
    pub path_id: String,
    pub deleted_path_id: String,
    #[serde(default)]
    pub title: String,
    pub manifest_hash: String,
    pub artifact_hash: String,
    pub metadata_hash: String,
    pub bundle_hash: String,
    #[serde(default)]
    pub updated_at: String,
    pub deleted_at: String,
}

pub type TopicApplicationJoinedRecord = (
    TopicApplicationStateRecord,
    Option<TopicApplicationProjectionRecord>,
);
pub type TopicApplicationRecordPage = (Vec<TopicApplicationJoinedRecord>, usize);

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TopicGraphScopeRecord {
    pub topic_id: String,
    pub title: String,
    pub paper_count: i64,
    pub source_paper_ref_total: i64,
    pub source_paper_refs_json: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct OperationQuery {
    pub statuses: Vec<String>,
    pub operation_types: Vec<String>,
    pub basis_kinds: Vec<String>,
    pub include_completed: bool,
    pub order_by_operation_id: bool,
    pub start_after_operation_id: Option<String>,
    pub limit: usize,
}

#[derive(Debug)]
pub struct Repository {
    connection: Option<Connection>,
    database_path: PathBuf,
    repository_id: String,
    transaction_depth: usize,
    savepoint_sequence: u64,
}

struct RepositoryReadTransaction<'a> {
    connection: &'a Connection,
    finished: bool,
}

impl RepositoryReadTransaction<'_> {
    fn commit(mut self) -> Result<(), String> {
        self.connection
            .execute_batch("COMMIT")
            .map_err(map_sqlite_error)?;
        self.finished = true;
        Ok(())
    }

    fn rollback(mut self) {
        let _ = self.connection.execute_batch("ROLLBACK");
        self.finished = true;
    }
}

impl Drop for RepositoryReadTransaction<'_> {
    fn drop(&mut self) {
        if !self.finished {
            let _ = self.connection.execute_batch("ROLLBACK");
        }
    }
}

fn stable_id(identity: &RepositoryIdentity) -> String {
    stable_id_for_schema(IDENTITY_SCHEMA, identity)
}

fn stable_id_for_schema(schema: &str, identity: &RepositoryIdentity) -> String {
    let mut hash = Sha256::new();
    hash.update(schema.as_bytes());
    hash.update([0]);
    hash.update(identity.profile_id.as_bytes());
    hash.update([0]);
    hash.update(identity.data_root_id.as_bytes());
    format!("{:x}", hash.finalize())
}

fn validate_identity_part(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 512
        || value.chars().any(|character| character.is_control())
    {
        return Err("repository_identity_invalid".into());
    }
    Ok(())
}

fn path_segment(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-') {
                character
            } else {
                '_'
            }
        })
        .collect()
}

fn map_sqlite_error(error: rusqlite::Error) -> String {
    match &error {
        rusqlite::Error::SqliteFailure(detail, _)
            if matches!(
                detail.code,
                rusqlite::ErrorCode::DatabaseBusy | rusqlite::ErrorCode::DatabaseLocked
            ) =>
        {
            "repository_busy".into()
        }
        _ => format!("repository_sqlite:{error}"),
    }
}

fn validate_production_database_path(database_path: &Path) -> Result<(), String> {
    if !database_path.is_absolute()
        || database_path.file_name().and_then(|value| value.to_str()) != Some("synthesis.db")
    {
        return Err("repository_production_path_invalid".into());
    }
    Ok(())
}

fn read_schema_version(connection: &Connection) -> Result<String, String> {
    connection
        .query_row(
            "SELECT value FROM synt_schema_meta
             WHERE key='repository_foundation_schema_version'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(map_sqlite_error)?
        .ok_or_else(|| "repository_schema_version_missing".into())
}

fn open_existing_database_read_only(database_path: &Path) -> Result<Connection, String> {
    let metadata = fs::symlink_metadata(database_path)
        .map_err(|_| "repository_production_database_missing".to_owned())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("repository_production_path_invalid".into());
    }
    Connection::open_with_flags(
        database_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )
    .map_err(map_sqlite_error)
}

fn open_production_database_read_only(database_path: &Path) -> Result<Connection, String> {
    validate_production_database_path(database_path)?;
    open_existing_database_read_only(database_path)
}

fn migration_backup_path(backup_root: &Path, from: &str, to: &str) -> PathBuf {
    let mut hash = Sha256::new();
    hash.update(from.as_bytes());
    hash.update([0]);
    hash.update(to.as_bytes());
    backup_root.join(format!("{:x}.db", hash.finalize()))
}

fn create_or_verify_migration_backup(
    database_path: &Path,
    backup_path: &Path,
    expected_schema: &str,
) -> Result<(), String> {
    if backup_path.exists() {
        let backup = open_existing_database_read_only(backup_path)?;
        return if read_schema_version(&backup)? == expected_schema {
            Ok(())
        } else {
            Err("repository_migration_backup_mismatch".into())
        };
    }
    let parent = backup_path
        .parent()
        .ok_or_else(|| "repository_migration_backup_path_invalid".to_owned())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("repository_migration_backup_failed:{error}"))?;
    let source = open_production_database_read_only(database_path)?;
    source
        .backup(rusqlite::MAIN_DB, backup_path, None)
        .map_err(|error| format!("repository_migration_backup_failed:{error}"))
}

fn migrate_repository_foundation_v1_to_v2(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS synt_topic_deleted_artifact (
               topic_id TEXT PRIMARY KEY,
               path_id TEXT NOT NULL,
               deleted_path_id TEXT NOT NULL,
               title TEXT NOT NULL DEFAULT '',
               manifest_hash TEXT NOT NULL,
               artifact_hash TEXT NOT NULL,
               metadata_hash TEXT NOT NULL,
               bundle_hash TEXT NOT NULL,
               updated_at TEXT NOT NULL DEFAULT '',
               deleted_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_synt_topic_deleted_artifact_deleted
               ON synt_topic_deleted_artifact(deleted_at DESC, topic_id ASC);
             UPDATE synt_cache_basis
               SET status='stale', active_operation_id='',
                   stale_reason='repository_foundation_v2';
             UPDATE synt_citation_layout_state SET status='stale';
             UPDATE synt_citation_metrics_complex SET status='stale';
             UPDATE synt_tag_application_state SET index_stale=1;
             UPDATE synt_concept_application_state SET index_stale=1;
             UPDATE synt_topic_graph_application_state SET index_stale=1;
             UPDATE synt_reference_application_state
               SET reference_ready=0, graph_ready=0, related_items_ready=0;
             UPDATE synt_reference_matching_state
               SET matching_ready=0, graph_ready=0, related_items_ready=0;",
        )
        .map_err(map_sqlite_error)?;
    connection
        .execute(
            "UPDATE synt_schema_meta SET value='synthesis-topic-application-repository.v2'
             WHERE key='topic_application_schema_version'",
            [],
        )
        .map_err(map_sqlite_error)?;
    connection
        .execute(
            "UPDATE synt_schema_meta SET value=?1
             WHERE key='repository_foundation_schema_version'",
            [SCHEMA_VERSION],
        )
        .map_err(map_sqlite_error)?;
    Ok(())
}

fn prepare_production_schema_with_registry(
    database_path: &Path,
    backup_root: &Path,
    migrations: &[RegisteredProductionSchemaMigration],
) -> Result<(), String> {
    let stored_schema = {
        let connection = open_production_database_read_only(database_path)?;
        read_schema_version(&connection)?
    };
    if stored_schema == SCHEMA_VERSION {
        return Ok(());
    }
    let migration = migrations
        .iter()
        .find(|migration| migration.from == stored_schema && migration.to == SCHEMA_VERSION)
        .ok_or_else(|| "repository_schema_migration_unregistered".to_owned())?;
    let backup_path = migration_backup_path(backup_root, migration.from, migration.to);
    create_or_verify_migration_backup(database_path, &backup_path, migration.from)?;

    let connection = Connection::open_with_flags(
        database_path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )
    .map_err(map_sqlite_error)?;
    connection
        .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS))
        .map_err(map_sqlite_error)?;
    connection
        .execute_batch("BEGIN IMMEDIATE")
        .map_err(map_sqlite_error)?;
    let migrated = (|| -> Result<(), String> {
        if read_schema_version(&connection)? != migration.from {
            return Err("repository_schema_changed_during_migration".into());
        }
        (migration.migrate)(&connection)?;
        if read_schema_version(&connection)? != migration.to {
            return Err("repository_schema_migration_incomplete".into());
        }
        connection
            .execute_batch("COMMIT")
            .map_err(map_sqlite_error)?;
        Ok(())
    })();
    if let Err(error) = migrated {
        let _ = connection.execute_batch("ROLLBACK");
        return Err(error);
    }
    Ok(())
}

pub fn prepare_production_schema(database_path: &Path, backup_root: &Path) -> Result<(), String> {
    prepare_production_schema_with_registry(
        database_path,
        backup_root,
        REGISTERED_PRODUCTION_SCHEMA_MIGRATIONS,
    )?;
    prepare_reference_redirect_graph_schema(database_path, backup_root)
}

fn stored_timestamp_millis(value: &str) -> i64 {
    value
        .parse::<i64>()
        .ok()
        .or_else(|| unix_millis_from_utc_iso8601(value))
        .unwrap_or_default()
}

fn repair_reference_redirect_cycles(
    connection: &Connection,
    now: &str,
) -> Result<Vec<RemovedReferenceRedirect>, String> {
    let mut statement = connection
        .prepare(
            "SELECT from_canonical_reference_id,to_canonical_reference_id,reason,
                    diagnostics_json,created_at,updated_at
             FROM synt_reference_redirect ORDER BY from_canonical_reference_id",
        )
        .map_err(map_sqlite_error)?;
    let redirects = statement
        .query_map([], |row| {
            Ok(ReferenceRedirectFactRecord {
                from_canonical_reference_id: row.get(0)?,
                to_canonical_reference_id: row.get(1)?,
                reason: row.get(2)?,
                diagnostics_json: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    drop(statement);
    let mut graph = ReferenceRedirectGraph::from_records(&redirects)?;
    if graph.cycles().is_empty() {
        return Ok(Vec::new());
    }

    let mut statement = connection
        .prepare(
            "SELECT target_canonical_reference_id,reasons_json,updated_at
             FROM synt_reference_match_proposal
             WHERE kind='canonical_merge' AND status='accepted'",
        )
        .map_err(map_sqlite_error)?;
    let accepted_proposals = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    drop(statement);
    let mut statement = connection
        .prepare(
            "SELECT canonical_reference_id FROM synt_reference_binding
             WHERE status='accepted' ORDER BY canonical_reference_id",
        )
        .map_err(map_sqlite_error)?;
    let accepted_bindings = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(map_sqlite_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(map_sqlite_error)?;
    drop(statement);
    let (explicit_targets, automatic_targets): (Vec<_>, Vec<_>) = accepted_proposals
        .into_iter()
        .map(|(target, reasons, updated_at)| {
            (target, stored_timestamp_millis(&updated_at), reasons)
        })
        .partition(|(_, _, reasons)| is_explicit_reference_redirect_reason(reasons));
    let preferred_roots = rank_reference_redirect_roots(
        explicit_targets
            .into_iter()
            .map(|(target, updated_at, _)| (target, updated_at))
            .collect(),
        accepted_bindings,
        automatic_targets
            .into_iter()
            .map(|(target, updated_at, _)| (target, updated_at))
            .collect(),
    );

    let removed = graph.repair_cycles(&preferred_roots);
    graph.validate_acyclic()?;
    for edge in &removed {
        connection
            .execute(
                "DELETE FROM synt_reference_redirect WHERE from_canonical_reference_id=?1",
                [&edge.from_canonical_reference_id],
            )
            .map_err(map_sqlite_error)?;
        connection
            .execute(
                "UPDATE synt_reference_match_proposal
                 SET status='superseded',updated_at=?3
                 WHERE kind='canonical_merge' AND status IN ('open','accepted')
                   AND source_canonical_reference_id=?1
                   AND target_canonical_reference_id=?2",
                params![
                    edge.from_canonical_reference_id,
                    edge.to_canonical_reference_id,
                    now,
                ],
            )
            .map_err(map_sqlite_error)?;
    }
    connection
        .execute(
            "UPDATE synt_cache_basis SET status='stale',active_operation_id='',
               stale_reason='canonical_redirect_cycle_repair',updated_at=?1
             WHERE cache_kind IN ('citation_graph','related_items')",
            [now],
        )
        .map_err(map_sqlite_error)?;
    connection
        .execute(
            "UPDATE synt_reference_matching_state
             SET graph_ready=0,related_items_ready=0,updated_at=?1",
            [now],
        )
        .map_err(map_sqlite_error)?;
    let diagnostics = serde_json::to_string(&json!({
        "code":"canonical_redirect_cycle_repaired",
        "rootSelection": if removed.iter().all(|edge| preferred_roots.contains(&edge.from_canonical_reference_id)) {
            "evidence"
        } else {
            "stable_fallback"
        },
        "preferredRoots": preferred_roots,
        "removed":removed.iter().map(|edge| json!({
            "from":edge.from_canonical_reference_id,
            "to":edge.to_canonical_reference_id,
        })).collect::<Vec<_>>(),
    }))
    .map_err(|_| "repository_migration_diagnostics_invalid".to_owned())?;
    connection
        .execute(
            "INSERT OR REPLACE INTO synt_operation(
               operation_id,operation_type,status,label,phase,message,progress_mode,
               basis_kind,basis_value,diagnostics_json,created_at,started_at,completed_at,updated_at
             ) VALUES(?1,'canonical_redirect_repair','completed','Canonical redirect repair',
               'completed','Canonical redirect cycles repaired.','determinate',
               'reference_redirect_graph_schema',?2,?3,?4,?4,?4,?4)",
            params![
                "canonical-redirect-repair:synthesis-reference-redirect-graph.v1",
                REFERENCE_REDIRECT_GRAPH_SCHEMA,
                diagnostics,
                now,
            ],
        )
        .map_err(map_sqlite_error)?;
    Ok(removed)
}

fn prepare_reference_redirect_graph_schema(
    database_path: &Path,
    backup_root: &Path,
) -> Result<(), String> {
    let current = {
        let connection = open_production_database_read_only(database_path)?;
        connection
            .query_row(
                "SELECT value FROM synt_schema_meta WHERE key=?1",
                [REFERENCE_REDIRECT_GRAPH_SCHEMA_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(map_sqlite_error)?
    };
    match current.as_deref() {
        Some(REFERENCE_REDIRECT_GRAPH_SCHEMA) => return Ok(()),
        Some(_) => return Err("repository_schema_mismatch".into()),
        None => {}
    }
    let backup_path = migration_backup_path(
        backup_root,
        "synthesis-reference-redirect-graph.unversioned",
        REFERENCE_REDIRECT_GRAPH_SCHEMA,
    );
    create_or_verify_migration_backup(database_path, &backup_path, SCHEMA_VERSION)?;
    let connection = Connection::open_with_flags(
        database_path,
        OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )
    .map_err(map_sqlite_error)?;
    connection
        .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS))
        .map_err(map_sqlite_error)?;
    connection
        .execute_batch("BEGIN IMMEDIATE")
        .map_err(map_sqlite_error)?;
    let migrated = (|| -> Result<(), String> {
        let current = connection
            .query_row(
                "SELECT value FROM synt_schema_meta WHERE key=?1",
                [REFERENCE_REDIRECT_GRAPH_SCHEMA_KEY],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(map_sqlite_error)?;
        if current.is_some() {
            return Err("repository_schema_changed_during_migration".into());
        }
        let now = synthesis_protocol::utc_now_iso8601();
        repair_reference_redirect_cycles(&connection, &now)?;
        connection
            .execute(
                "INSERT INTO synt_schema_meta(key,value) VALUES(?1,?2)",
                params![
                    REFERENCE_REDIRECT_GRAPH_SCHEMA_KEY,
                    REFERENCE_REDIRECT_GRAPH_SCHEMA,
                ],
            )
            .map_err(map_sqlite_error)?;
        connection.execute_batch("COMMIT").map_err(map_sqlite_error)
    })();
    if let Err(error) = migrated {
        let _ = connection.execute_batch("ROLLBACK");
        return Err(error);
    }
    Ok(())
}

fn write_marker(path: &Path, marker: &IdentityMarker) -> Result<(), String> {
    let bytes = serde_json::to_vec(marker).map_err(|_| "repository_identity_invalid".to_owned())?;
    fs::write(path, bytes).map_err(|error| format!("repository_identity_write:{error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("repository_identity_permissions:{error}"))?;
    }
    Ok(())
}

fn validate_json_safe(value: &Value) -> Result<(), String> {
    match value {
        Value::Null | Value::Bool(_) | Value::String(_) => Ok(()),
        Value::Number(number) => {
            if let Some(integer) = number.as_i64() {
                if integer.abs() > JS_SAFE_INTEGER_MAX {
                    return Err("repository_sqlite_integer_unsafe".into());
                }
            } else if let Some(integer) = number.as_u64() {
                if integer > JS_SAFE_INTEGER_MAX as u64 {
                    return Err("repository_sqlite_integer_unsafe".into());
                }
            } else if !number.as_f64().is_some_and(f64::is_finite) {
                return Err("repository_sqlite_number_invalid".into());
            }
            Ok(())
        }
        Value::Array(values) => values.iter().try_for_each(validate_json_safe),
        Value::Object(object) => object.values().try_for_each(validate_json_safe),
    }
}

fn sql_value(value: &Value) -> Result<SqlValue, String> {
    validate_json_safe(value)?;
    match value {
        Value::Null => Ok(SqlValue::Null),
        Value::Bool(value) => Ok(SqlValue::Integer(i64::from(*value))),
        Value::Number(number) => {
            if let Some(value) = number.as_i64() {
                Ok(SqlValue::Integer(value))
            } else if let Some(value) = number.as_u64() {
                Ok(SqlValue::Integer(value as i64))
            } else {
                Ok(SqlValue::Real(number.as_f64().ok_or_else(|| {
                    "repository_sqlite_number_invalid".to_owned()
                })?))
            }
        }
        Value::String(value) => Ok(SqlValue::Text(value.clone())),
        Value::Array(_) | Value::Object(_) => serde_json::to_string(value)
            .map(SqlValue::Text)
            .map_err(|_| "repository_sqlite_json_invalid".into()),
    }
}

fn json_value(value: ValueRef<'_>) -> Result<Value, String> {
    match value {
        ValueRef::Null => Ok(Value::Null),
        ValueRef::Integer(value) => {
            if value.abs() > JS_SAFE_INTEGER_MAX {
                Err("repository_sqlite_integer_unsafe".into())
            } else {
                Ok(json!(value))
            }
        }
        ValueRef::Real(value) if value.is_finite() => Ok(json!(value)),
        ValueRef::Text(value) => std::str::from_utf8(value)
            .map(|value| Value::String(value.into()))
            .map_err(|_| "repository_sqlite_row_invalid".into()),
        ValueRef::Blob(_) | ValueRef::Real(_) => Err("repository_sqlite_row_invalid".into()),
    }
}

impl Repository {
    pub fn open(profile_runtime_root: &Path, identity: RepositoryIdentity) -> Result<Self, String> {
        Self::open_internal(profile_runtime_root, identity, "")
    }

    pub fn open_at(
        profile_runtime_root: &Path,
        identity: RepositoryIdentity,
        reconcile_now: &str,
    ) -> Result<Self, String> {
        validate_identity_part(reconcile_now)?;
        Self::open_internal(profile_runtime_root, identity, reconcile_now)
    }

    pub fn open_production(
        database_path: &Path,
        identity: RepositoryIdentity,
        reconcile_now: &str,
    ) -> Result<Self, String> {
        validate_identity_part(reconcile_now)?;
        validate_identity_part(&identity.profile_id)?;
        validate_identity_part(&identity.data_root_id)?;
        validate_production_database_path(database_path)?;
        let metadata = fs::symlink_metadata(database_path)
            .map_err(|_| "repository_production_database_missing".to_owned())?;
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err("repository_production_path_invalid".into());
        }
        Self::open_database(
            database_path.to_owned(),
            stable_id_for_schema(PRODUCTION_IDENTITY_SCHEMA, &identity),
            reconcile_now,
        )
    }

    pub fn initialize_production(
        database_path: &Path,
        identity: RepositoryIdentity,
    ) -> Result<Self, String> {
        validate_identity_part(&identity.profile_id)?;
        validate_identity_part(&identity.data_root_id)?;
        validate_production_database_path(database_path)?;
        if database_path.exists() {
            return Err("repository_production_database_exists".into());
        }
        let parent = database_path
            .parent()
            .ok_or_else(|| "repository_production_path_invalid".to_owned())?;
        fs::create_dir_all(parent).map_err(|error| format!("repository_root_create:{error}"))?;
        Self::open_database(
            database_path.to_owned(),
            stable_id_for_schema(PRODUCTION_IDENTITY_SCHEMA, &identity),
            "",
        )
    }

    fn open_internal(
        profile_runtime_root: &Path,
        identity: RepositoryIdentity,
        reconcile_now: &str,
    ) -> Result<Self, String> {
        validate_identity_part(&identity.profile_id)?;
        validate_identity_part(&identity.data_root_id)?;
        let root = profile_runtime_root
            .join("shadow-repository")
            .join(path_segment(&identity.data_root_id));
        fs::create_dir_all(&root).map_err(|error| format!("repository_root_create:{error}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700))
                .map_err(|error| format!("repository_root_permissions:{error}"))?;
        }
        let repository_id = stable_id(&identity);
        let marker = IdentityMarker {
            schema: IDENTITY_SCHEMA.into(),
            profile_id: identity.profile_id,
            data_root_id: identity.data_root_id,
            schema_version: SCHEMA_VERSION.into(),
            repository_id: repository_id.clone(),
        };
        let marker_path = root.join("identity.json");
        if marker_path.exists() {
            let current: IdentityMarker = serde_json::from_slice(
                &fs::read(&marker_path)
                    .map_err(|error| format!("repository_identity_read:{error}"))?,
            )
            .map_err(|_| "repository_identity_invalid".to_owned())?;
            if current != marker {
                return Err("repository_identity_mismatch".into());
            }
        } else {
            write_marker(&marker_path, &marker)?;
        }

        let database_path = root.join("synthesis.db");
        Self::open_database(database_path, repository_id, reconcile_now)
    }

    fn open_database(
        database_path: PathBuf,
        repository_id: String,
        _reconcile_now: &str,
    ) -> Result<Self, String> {
        let connection = Connection::open_with_flags(
            &database_path,
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
        )
        .map_err(map_sqlite_error)?;
        connection
            .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS))
            .map_err(map_sqlite_error)?;
        connection
            .execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA synchronous=NORMAL;
                 PRAGMA foreign_keys=ON;
                 PRAGMA busy_timeout=250;
                 BEGIN IMMEDIATE;",
            )
            .map_err(map_sqlite_error)?;
        let initialized = (|| -> Result<(), String> {
            connection
                .execute_batch(SCHEMA_SQL)
                .map_err(|_| "repository_schema_incompatible".to_owned())?;
            verify_required_application_schema(&connection)?;
            for (key, value) in SCHEMA_IDENTITIES {
                let current: Option<String> = connection
                    .query_row(
                        "SELECT value FROM synt_schema_meta WHERE key=?1",
                        [key],
                        |row| row.get(0),
                    )
                    .optional()
                    .map_err(map_sqlite_error)?;
                if current.as_deref().is_some_and(|current| current != *value) {
                    return Err("repository_schema_mismatch".into());
                }
                connection
                    .execute(
                        "INSERT OR IGNORE INTO synt_schema_meta(key,value) VALUES(?1,?2)",
                        params![key, value],
                    )
                    .map_err(map_sqlite_error)?;
            }
            connection
                .execute(
                    "INSERT OR IGNORE INTO synt_durable_sync_state(singleton_id,revision,updated_at) VALUES(1,0,'')",
                    [],
                )
                .map_err(map_sqlite_error)?;
            connection
                .execute_batch("COMMIT;")
                .map_err(map_sqlite_error)?;
            Ok(())
        })();
        if let Err(error) = initialized {
            let _ = connection.execute_batch("ROLLBACK;");
            return Err(error);
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&database_path, fs::Permissions::from_mode(0o600))
                .map_err(|error| format!("repository_database_permissions:{error}"))?;
        }
        Ok(Self {
            connection: Some(connection),
            database_path,
            repository_id,
            transaction_depth: 0,
            savepoint_sequence: 0,
        })
    }

    pub fn open_reader(&self) -> Result<Self, String> {
        let connection = open_existing_database_read_only(&self.database_path)?;
        connection
            .busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS))
            .map_err(map_sqlite_error)?;
        connection
            .execute_batch(
                "PRAGMA query_only=ON;
                 PRAGMA foreign_keys=ON;
                 PRAGMA busy_timeout=250;",
            )
            .map_err(map_sqlite_error)?;
        if read_schema_version(&connection)? != SCHEMA_VERSION {
            return Err("repository_schema_mismatch".into());
        }
        verify_required_application_schema(&connection)?;
        Ok(Self {
            connection: Some(connection),
            database_path: self.database_path.clone(),
            repository_id: self.repository_id.clone(),
            transaction_depth: 0,
            savepoint_sequence: 0,
        })
    }

    pub fn read_transaction<T>(
        &self,
        operation: impl FnOnce(&Self) -> Result<T, String>,
    ) -> Result<T, String> {
        let connection = self.connection()?;
        connection
            .execute_batch("BEGIN DEFERRED")
            .map_err(map_sqlite_error)?;
        let transaction = RepositoryReadTransaction {
            connection,
            finished: false,
        };
        match operation(self) {
            Ok(value) => {
                transaction.commit()?;
                Ok(value)
            }
            Err(error) => {
                transaction.rollback();
                Err(error)
            }
        }
    }

    fn connection(&self) -> Result<&Connection, String> {
        self.connection
            .as_ref()
            .ok_or_else(|| "repository_sqlite_closed".into())
    }

    pub fn database_path(&self) -> &Path {
        &self.database_path
    }

    pub fn repository_id(&self) -> &str {
        &self.repository_id
    }

    pub fn pragma_snapshot(&self) -> Result<Value, String> {
        let connection = self.connection()?;
        let string = |name: &str| {
            connection
                .query_row(&format!("PRAGMA {name}"), [], |row| row.get::<_, String>(0))
                .map_err(map_sqlite_error)
        };
        let integer = |name: &str| {
            connection
                .query_row(&format!("PRAGMA {name}"), [], |row| row.get::<_, i64>(0))
                .map_err(map_sqlite_error)
        };
        Ok(json!({
            "journalMode": string("journal_mode")?,
            "synchronous": integer("synchronous")?,
            "foreignKeys": integer("foreign_keys")?,
            "busyTimeout": integer("busy_timeout")?,
        }))
    }

    pub fn schema_inventory(&self) -> Result<Value, String> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT type,name,sql FROM sqlite_master
                 WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
                 ORDER BY type ASC,name ASC",
            )
            .map_err(map_sqlite_error)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(map_sqlite_error)?;
        let mut tables = Vec::new();
        let mut indexes = Vec::new();
        for row in rows {
            let (kind, name, sql) = row.map_err(map_sqlite_error)?;
            let descriptor = json!({"name":name,"sql":sql});
            match kind.as_str() {
                "table" => tables.push(descriptor),
                "index" => indexes.push(descriptor),
                _ => {}
            }
        }
        Ok(json!({"tables":tables,"indexes":indexes}))
    }

    pub fn execute(&self, sql: &str, values: &[Value]) -> Result<usize, String> {
        record_observed_repository_write();
        let values = values
            .iter()
            .map(sql_value)
            .collect::<Result<Vec<_>, _>>()?;
        let bindings = values
            .iter()
            .map(|value| value as &dyn ToSql)
            .collect::<Vec<_>>();
        self.connection()?
            .execute(sql, bindings.as_slice())
            .map_err(map_sqlite_error)
    }

    pub fn query(&self, sql: &str, values: &[Value]) -> Result<Vec<Value>, String> {
        record_observed_repository_query();
        let values = values
            .iter()
            .map(sql_value)
            .collect::<Result<Vec<_>, _>>()?;
        let bindings = values
            .iter()
            .map(|value| value as &dyn ToSql)
            .collect::<Vec<_>>();
        let mut statement = self.connection()?.prepare(sql).map_err(map_sqlite_error)?;
        let column_names = statement
            .column_names()
            .into_iter()
            .map(str::to_owned)
            .collect::<Vec<_>>();
        let mut rows = statement
            .query(bindings.as_slice())
            .map_err(map_sqlite_error)?;
        let mut result = Vec::new();
        while let Some(row) = rows.next().map_err(map_sqlite_error)? {
            let mut object = Map::new();
            for (index, name) in column_names.iter().enumerate() {
                object.insert(
                    name.clone(),
                    json_value(row.get_ref(index).map_err(map_sqlite_error)?)?,
                );
            }
            result.push(Value::Object(object));
        }
        Ok(result)
    }

    pub fn consume_related_items_sync_echo(
        &self,
        library_id: i64,
        item_key: &str,
        related_item_key: Option<&str>,
        observed_at: &str,
    ) -> Result<bool, String> {
        const ECHO_WINDOW_MILLIS: i64 = 10_000;
        if library_id <= 0 || item_key.trim().is_empty() {
            return Err("invalid_request".into());
        }
        let observed_millis = unix_millis_from_utc_iso8601(observed_at)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let rows = self.query(
            "SELECT effect_id,payload_json,updated_at FROM synt_related_items_sync_effect ORDER BY updated_at DESC,effect_id ASC",
            &[],
        )?;
        for row in rows {
            let effect_id = row_text(&row, "effect_id")?;
            let original_payload = row_text(&row, "payload_json")?;
            let mut payload: Value = serde_json::from_str(&original_payload)
                .map_err(|_| "repository_payload_invalid".to_owned())?;
            let field =
                |camel: &str, snake: &str| payload.get(camel).or_else(|| payload.get(snake));
            let text = |camel: &str, snake: &str| {
                field(camel, snake)
                    .and_then(Value::as_str)
                    .unwrap_or_default()
            };
            let integer = |camel: &str, snake: &str| {
                field(camel, snake)
                    .and_then(Value::as_i64)
                    .unwrap_or_default()
            };
            if !matches!(
                text("status", "status"),
                "pending_external_write" | "applied"
            ) || text("echoState", "echo_state") != "awaiting_echo"
            {
                continue;
            }
            let source_matches = integer("sourceLibraryId", "source_library_id") == library_id
                && text("sourceItemKey", "source_item_key") == item_key
                && related_item_key
                    .is_none_or(|related| text("targetItemKey", "target_item_key") == related);
            let target_matches = integer("targetLibraryId", "target_library_id") == library_id
                && text("targetItemKey", "target_item_key") == item_key
                && related_item_key
                    .is_none_or(|related| text("sourceItemKey", "source_item_key") == related);
            if !source_matches && !target_matches {
                continue;
            }
            let written_at = text("externalWriteAt", "external_write_at");
            let written_at = if written_at.is_empty() {
                row_text(&row, "updated_at")?
            } else {
                written_at.to_owned()
            };
            let expired = unix_millis_from_utc_iso8601(&written_at).is_some_and(|written| {
                observed_millis.saturating_sub(written) > ECHO_WINDOW_MILLIS
            });
            let object = payload
                .as_object_mut()
                .ok_or_else(|| "repository_payload_invalid".to_owned())?;
            object.insert(
                "echoState".into(),
                json!(if expired { "expired" } else { "observed" }),
            );
            object.insert("updatedAt".into(), json!(observed_at));
            if !expired {
                object.insert("echoObservedAt".into(), json!(observed_at));
            }
            let updated_payload = serde_json::to_string(&payload)
                .map_err(|_| "repository_payload_invalid".to_owned())?;
            let changed = self.execute(
                "UPDATE synt_related_items_sync_effect SET payload_json=?1,updated_at=?2 WHERE effect_id=?3 AND payload_json=?4",
                &[
                    json!(updated_payload),
                    json!(observed_at),
                    json!(effect_id),
                    json!(original_payload),
                ],
            )?;
            if changed == 1 && !expired {
                return Ok(true);
            }
        }
        Ok(false)
    }

    pub fn transaction<T>(
        &mut self,
        operation: impl FnOnce(&mut Self) -> Result<T, String>,
    ) -> Result<T, String> {
        let outer = self.transaction_depth == 0;
        let savepoint = format!("synthesis_repository_{}", self.savepoint_sequence);
        self.savepoint_sequence += 1;
        self.connection()?
            .execute_batch(if outer {
                "BEGIN IMMEDIATE"
            } else {
                // The statement is built only from an internal integer sequence.
                return self.transaction_nested(savepoint, operation);
            })
            .map_err(map_sqlite_error)?;
        self.transaction_depth += 1;
        let result = operation(self);
        self.transaction_depth -= 1;
        match result {
            Ok(value) => {
                self.connection()?
                    .execute_batch("COMMIT")
                    .map_err(map_sqlite_error)?;
                Ok(value)
            }
            Err(error) => {
                let _ = self.connection()?.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }

    fn transaction_nested<T>(
        &mut self,
        savepoint: String,
        operation: impl FnOnce(&mut Self) -> Result<T, String>,
    ) -> Result<T, String> {
        self.connection()?
            .execute_batch(&format!("SAVEPOINT {savepoint}"))
            .map_err(map_sqlite_error)?;
        self.transaction_depth += 1;
        let result = operation(self);
        self.transaction_depth -= 1;
        match result {
            Ok(value) => {
                self.connection()?
                    .execute_batch(&format!("RELEASE SAVEPOINT {savepoint}"))
                    .map_err(map_sqlite_error)?;
                Ok(value)
            }
            Err(error) => {
                self.connection()?
                    .execute_batch(&format!(
                        "ROLLBACK TO SAVEPOINT {savepoint}; RELEASE SAVEPOINT {savepoint}"
                    ))
                    .map_err(map_sqlite_error)?;
                Err(error)
            }
        }
    }

    pub fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
        validate_identity_part(&record.operation_id)?;
        validate_identity_part(&record.operation_type)?;
        if [
            record.library_id,
            record.processed_count,
            record.skipped_count,
            record.failed_count,
            record.total_count,
        ]
        .iter()
        .any(|value| value.abs() > JS_SAFE_INTEGER_MAX || *value < 0)
        {
            return Err("repository_sqlite_integer_unsafe".into());
        }
        record_observed_repository_write();
        self.connection()?
            .execute(
                "INSERT INTO synt_operation(
                   operation_id,operation_type,library_id,scope_kind,scope_ref,status,label,phase,
                   phase_label,message,progress_mode,processed_count,skipped_count,failed_count,
                   total_count,basis_kind,basis_value,source_hash,diagnostics_json,created_at,
                   started_at,completed_at,updated_at
                 ) VALUES(
                   ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,
                   ?20,?21,?22,?23
                 )
                 ON CONFLICT(operation_id) DO UPDATE SET
                   operation_type=excluded.operation_type,library_id=excluded.library_id,
                   scope_kind=excluded.scope_kind,scope_ref=excluded.scope_ref,status=excluded.status,
                   label=excluded.label,phase=excluded.phase,phase_label=excluded.phase_label,
                   message=excluded.message,progress_mode=excluded.progress_mode,
                   processed_count=excluded.processed_count,skipped_count=excluded.skipped_count,
                   failed_count=excluded.failed_count,total_count=excluded.total_count,
                   basis_kind=excluded.basis_kind,basis_value=excluded.basis_value,
                   source_hash=excluded.source_hash,diagnostics_json=excluded.diagnostics_json,
                   started_at=excluded.started_at,completed_at=excluded.completed_at,
                   updated_at=excluded.updated_at",
                params![
                    record.operation_id,
                    record.operation_type,
                    record.library_id,
                    record.scope_kind,
                    record.scope_ref,
                    if record.status.is_empty() {
                        "pending"
                    } else {
                        &record.status
                    },
                    record.label,
                    record.phase,
                    record.phase_label,
                    record.message,
                    if record.progress_mode.is_empty() {
                        "indeterminate"
                    } else {
                        &record.progress_mode
                    },
                    record.processed_count,
                    record.skipped_count,
                    record.failed_count,
                    record.total_count,
                    record.basis_kind,
                    record.basis_value,
                    record.source_hash,
                    if record.diagnostics_json.is_empty() {
                        "[]"
                    } else {
                        &record.diagnostics_json
                    },
                    record.created_at,
                    record.started_at,
                    record.completed_at,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn get_operation(&self, operation_id: &str) -> Result<Option<OperationRecord>, String> {
        validate_identity_part(operation_id)?;
        self.query(
            "SELECT * FROM synt_operation WHERE operation_id=?1 LIMIT 1",
            &[json!(operation_id)],
        )?
        .into_iter()
        .next()
        .map(operation_record)
        .transpose()
    }

    pub fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String> {
        let limit = query.limit.clamp(1, 1_000);
        let mut clauses = Vec::new();
        let mut values = Vec::new();
        let mut placeholders = |items: &[String]| -> Result<String, String> {
            let mut result = Vec::new();
            for item in items {
                validate_identity_part(item)?;
                values.push(json!(item));
                result.push(format!("?{}", values.len()));
            }
            Ok(result.join(","))
        };
        if !query.statuses.is_empty() {
            clauses.push(format!("status IN ({})", placeholders(&query.statuses)?));
        } else if !query.include_completed {
            clauses.push(
                "status NOT IN ('completed','succeeded','failed','canceled','timed_out')"
                    .to_owned(),
            );
        }
        if !query.operation_types.is_empty() {
            clauses.push(format!(
                "operation_type IN ({})",
                placeholders(&query.operation_types)?
            ));
        }
        if !query.basis_kinds.is_empty() {
            clauses.push(format!(
                "basis_kind IN ({})",
                placeholders(&query.basis_kinds)?
            ));
        }
        if let Some(operation_id) = query.start_after_operation_id.as_deref() {
            validate_identity_part(operation_id)?;
            values.push(json!(operation_id));
            clauses.push(format!("operation_id > ?{}", values.len()));
        }
        values.push(json!(limit));
        let sql = format!(
            "SELECT * FROM synt_operation {} ORDER BY {} LIMIT ?{}",
            if clauses.is_empty() {
                String::new()
            } else {
                format!("WHERE {}", clauses.join(" AND "))
            },
            if query.order_by_operation_id {
                "operation_id ASC"
            } else {
                "updated_at DESC,operation_id ASC"
            },
            values.len()
        );
        self.query(&sql, &values)?
            .into_iter()
            .map(operation_record)
            .collect()
    }

    pub fn update_operation_status(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<Option<OperationRecord>, String> {
        let Some(mut record) = self.get_operation(operation_id)? else {
            return Ok(None);
        };
        record.status = status.into();
        record.phase = phase.into();
        record.diagnostics_json =
            serde_json::to_string(diagnostics).map_err(|_| "repository_operation_invalid")?;
        record.updated_at = now.into();
        if is_terminal_operation_status(status) {
            record.completed_at = now.into();
        }
        self.upsert_operation(&record)?;
        Ok(Some(record))
    }

    /// Atomically move an operation to a terminal state.  Terminal receipts are
    /// immutable: when another runner has already recorded one, its row is
    /// returned unchanged instead of allowing a later completion to overwrite
    /// the first observed outcome.
    pub fn finish_operation_if_nonterminal(
        &self,
        record: &OperationRecord,
    ) -> Result<OperationRecord, String> {
        if !matches!(
            record.status.as_str(),
            "completed" | "failed" | "canceled" | "timed_out"
        ) {
            return Err("repository_operation_terminal_required".into());
        }
        validate_identity_part(&record.operation_id)?;
        record_observed_repository_write();
        let changed = self
            .connection()?
            .execute(
                "UPDATE synt_operation SET
                status=?2,phase=?3,phase_label=?4,message=?5,progress_mode=?6,
                processed_count=?7,skipped_count=?8,failed_count=?9,total_count=?10,
                basis_value=?11,source_hash=?12,diagnostics_json=?13,completed_at=?14,updated_at=?15
              WHERE operation_id=?1
                AND status NOT IN ('completed','failed','canceled','timed_out','succeeded')",
                params![
                    record.operation_id,
                    record.status,
                    record.phase,
                    record.phase_label,
                    record.message,
                    record.progress_mode,
                    record.processed_count,
                    record.skipped_count,
                    record.failed_count,
                    record.total_count,
                    record.basis_value,
                    record.source_hash,
                    record.diagnostics_json,
                    record.completed_at,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        let row = self
            .get_operation(&record.operation_id)?
            .ok_or_else(|| "operation_receipt_missing".to_owned())?;
        debug_assert!(changed <= 1);
        Ok(row)
    }

    /// Update a non-terminal operation only while its persisted state still
    /// matches the caller's observation.  This is the common CAS primitive for
    /// pending→running, running→cancel-requested and explicit continuation.
    pub fn update_operation_if_current(
        &self,
        record: &OperationRecord,
        expected_status: &str,
        expected_phase: Option<&str>,
    ) -> Result<Option<OperationRecord>, String> {
        if is_terminal_operation_status(&record.status) {
            return Err("repository_operation_nonterminal_required".into());
        }
        validate_identity_part(&record.operation_id)?;
        record_observed_repository_write();
        let changed = self
            .connection()?
            .execute(
                "UPDATE synt_operation SET
                status=?2,phase=?3,phase_label=?4,message=?5,progress_mode=?6,
                processed_count=?7,skipped_count=?8,failed_count=?9,total_count=?10,
                basis_value=?11,source_hash=?12,diagnostics_json=?13,started_at=?14,updated_at=?15
              WHERE operation_id=?1 AND status=?16 AND (?17 IS NULL OR phase=?17)",
                params![
                    record.operation_id,
                    record.status,
                    record.phase,
                    record.phase_label,
                    record.message,
                    record.progress_mode,
                    record.processed_count,
                    record.skipped_count,
                    record.failed_count,
                    record.total_count,
                    record.basis_value,
                    record.source_hash,
                    record.diagnostics_json,
                    record.started_at,
                    record.updated_at,
                    expected_status,
                    expected_phase,
                ],
            )
            .map_err(map_sqlite_error)?;
        if changed == 0 {
            return self.get_operation(&record.operation_id);
        }
        self.get_operation(&record.operation_id)
    }

    /// Insert a retry successor exactly once.  A duplicate retry key resolves
    /// to the original successor rather than creating another queued action.
    pub fn insert_operation_if_absent(
        &self,
        record: &OperationRecord,
    ) -> Result<(OperationRecord, bool), String> {
        validate_identity_part(&record.operation_id)?;
        validate_identity_part(&record.operation_type)?;
        record_observed_repository_write();
        let inserted = self.connection()?.execute(
            "INSERT OR IGNORE INTO synt_operation(
                operation_id,operation_type,library_id,scope_kind,scope_ref,status,label,phase,
                phase_label,message,progress_mode,processed_count,skipped_count,failed_count,
                total_count,basis_kind,basis_value,source_hash,diagnostics_json,created_at,
                started_at,completed_at,updated_at
              ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
            params![
                record.operation_id, record.operation_type, record.library_id, record.scope_kind,
                record.scope_ref, record.status, record.label, record.phase, record.phase_label,
                record.message, record.progress_mode, record.processed_count, record.skipped_count,
                record.failed_count, record.total_count, record.basis_kind, record.basis_value,
                record.source_hash, record.diagnostics_json, record.created_at, record.started_at,
                record.completed_at, record.updated_at,
            ],
        ).map_err(map_sqlite_error)? > 0;
        let stored = self
            .get_operation(&record.operation_id)?
            .ok_or_else(|| "operation_receipt_missing".to_owned())?;
        Ok((stored, inserted))
    }

    pub fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String> {
        validate_identity_part(cache_key)?;
        self.query(
            "SELECT * FROM synt_cache_basis WHERE cache_key=?1 LIMIT 1",
            &[json!(cache_key)],
        )?
        .into_iter()
        .next()
        .map(cache_basis_record)
        .transpose()
    }

    pub fn upsert_cache_basis(&self, record: &CacheBasisRecord) -> Result<(), String> {
        validate_identity_part(&record.cache_key)?;
        validate_identity_part(&record.cache_kind)?;
        record_observed_repository_write();
        self.connection()?
            .execute(
                "INSERT INTO synt_cache_basis(
                   cache_key,cache_kind,scope_kind,scope_ref,status,basis_kind,basis_value,
                   source_hash,policy_version,active_operation_id,refreshed_at,stale_reason,
                   diagnostics_json,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
                 ON CONFLICT(cache_key) DO UPDATE SET
                   cache_kind=excluded.cache_kind,scope_kind=excluded.scope_kind,
                   scope_ref=excluded.scope_ref,status=excluded.status,basis_kind=excluded.basis_kind,
                   basis_value=excluded.basis_value,source_hash=excluded.source_hash,
                   policy_version=excluded.policy_version,
                   active_operation_id=excluded.active_operation_id,
                   refreshed_at=excluded.refreshed_at,stale_reason=excluded.stale_reason,
                   diagnostics_json=excluded.diagnostics_json,updated_at=excluded.updated_at",
                params![
                    record.cache_key,
                    record.cache_kind,
                    record.scope_kind,
                    record.scope_ref,
                    if record.status.is_empty() {
                        "missing"
                    } else {
                        &record.status
                    },
                    record.basis_kind,
                    record.basis_value,
                    record.source_hash,
                    record.policy_version,
                    record.active_operation_id,
                    record.refreshed_at,
                    record.stale_reason,
                    if record.diagnostics_json.is_empty() {
                        "[]"
                    } else {
                        &record.diagnostics_json
                    },
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn get_topic_application_state(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationStateRecord>, String> {
        validate_identity_part(topic_id)?;
        self.query(
            "SELECT * FROM synt_topic_application_state WHERE topic_id=?1 LIMIT 1",
            &[json!(topic_id)],
        )?
        .into_iter()
        .next()
        .map(topic_state_record)
        .transpose()
    }

    pub fn list_topic_application_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String> {
        let limit = limit.clamp(1, 250);
        let total = self
            .query(
                "SELECT COUNT(*) AS total
                 FROM synt_topic_application_state state
                 JOIN synt_topic_application_projection projection
                   ON projection.topic_id=state.topic_id
                 WHERE EXISTS (
                   SELECT 1 FROM json_each(projection.discovery_json,'$.source_paper_refs') ref
                   WHERE ref.type='text' AND ref.value<>''
                 )",
                &[],
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let rows = self.query(
            "SELECT * FROM synt_topic_application_state
             ORDER BY updated_at DESC,topic_id ASC LIMIT ?1 OFFSET ?2",
            &[json!(limit), json!(offset)],
        )?;
        Ok((
            rows.into_iter()
                .map(topic_state_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
        ))
    }

    pub fn list_topic_application_records(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        let limit = limit.clamp(1, 250);
        let total = self
            .query(
                "SELECT COUNT(*) AS total FROM synt_topic_application_state",
                &[],
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let rows = self.query(
            "SELECT state.*,
                    projection.topic_id AS projection_topic_id,
                    projection.topic_graph_json AS projection_topic_graph_json,
                    projection.concepts_json AS projection_concepts_json,
                    projection.interest_metadata_json AS projection_interest_metadata_json,
                    projection.discovery_json AS projection_discovery_json,
                    projection.updated_at AS projection_updated_at
             FROM synt_topic_application_state AS state
             LEFT JOIN synt_topic_application_projection AS projection
               ON projection.topic_id=state.topic_id
             ORDER BY state.updated_at DESC,state.topic_id ASC LIMIT ?1 OFFSET ?2",
            &[json!(limit), json!(offset)],
        )?;
        Ok((
            rows.into_iter()
                .map(topic_joined_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
        ))
    }

    pub fn list_topic_graph_scope_records(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicGraphScopeRecord>, usize), String> {
        let limit = limit.clamp(1, 250);
        let total = self
            .query(
                "SELECT COUNT(*) AS total FROM synt_topic_application_state",
                &[],
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let rows = self.query(
            "SELECT state.topic_id,state.title,state.paper_count,
                    COALESCE(json_array_length(
                      json_extract(projection.discovery_json,'$.source_paper_refs')
                    ),0) AS source_paper_ref_total,
                    COALESCE((
                      SELECT json_group_array(value) FROM (
                        SELECT ref.value AS value
                        FROM json_each(projection.discovery_json,'$.source_paper_refs') ref
                        WHERE ref.type='text' AND ref.value<>''
                        ORDER BY ref.value ASC LIMIT 250
                      )
                    ),'[]') AS source_paper_refs_json
             FROM synt_topic_application_state state
             JOIN synt_topic_application_projection projection
               ON projection.topic_id=state.topic_id
             WHERE EXISTS (
               SELECT 1 FROM json_each(projection.discovery_json,'$.source_paper_refs') ref
               WHERE ref.type='text' AND ref.value<>''
             )
             ORDER BY state.title COLLATE NOCASE ASC,state.topic_id ASC
             LIMIT ?1 OFFSET ?2",
            &[json!(limit), json!(offset)],
        )?;
        Ok((
            rows.into_iter()
                .map(|row| {
                    Ok(TopicGraphScopeRecord {
                        topic_id: row_text(&row, "topic_id")?,
                        title: row_text(&row, "title")?,
                        paper_count: row_integer(&row, "paper_count")?,
                        source_paper_ref_total: row_integer(&row, "source_paper_ref_total")?,
                        source_paper_refs_json: array_json(&row_text(
                            &row,
                            "source_paper_refs_json",
                        )?)?,
                    })
                })
                .collect::<Result<Vec<_>, String>>()?,
            total,
        ))
    }

    pub fn find_topic_application_records_by_paper_refs(
        &self,
        paper_refs: &[String],
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        if paper_refs.is_empty()
            || paper_refs.len() > 100
            || paper_refs
                .iter()
                .any(|paper_ref| paper_ref.trim().is_empty())
        {
            return Err("invalid_request".into());
        }
        let limit = limit.clamp(1, 250);
        let placeholders = (1..=paper_refs.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(",");
        let predicate = format!(
            "EXISTS (
               SELECT 1
               FROM json_each(state.resolved_paper_set_json, '$.papers') AS paper
               WHERE json_extract(paper.value, '$.paper_ref') IN ({placeholders})
             )"
        );
        let parameters = paper_refs
            .iter()
            .map(|paper_ref| json!(paper_ref))
            .collect::<Vec<_>>();
        let total = self
            .query(
                &format!(
                    "SELECT COUNT(*) AS total
                     FROM synt_topic_application_state AS state
                     WHERE {predicate}"
                ),
                &parameters,
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let mut page_parameters = parameters;
        page_parameters.push(json!(limit));
        let rows = self.query(
            &format!(
                "SELECT state.*,
                        projection.topic_id AS projection_topic_id,
                        projection.topic_graph_json AS projection_topic_graph_json,
                        projection.concepts_json AS projection_concepts_json,
                        projection.interest_metadata_json AS projection_interest_metadata_json,
                        projection.discovery_json AS projection_discovery_json,
                        projection.updated_at AS projection_updated_at
                 FROM synt_topic_application_state AS state
                 LEFT JOIN synt_topic_application_projection AS projection
                   ON projection.topic_id=state.topic_id
                 WHERE {predicate}
                 ORDER BY state.title COLLATE NOCASE ASC,state.topic_id ASC
                 LIMIT ?{}",
                page_parameters.len()
            ),
            &page_parameters,
        )?;
        Ok((
            rows.into_iter()
                .map(topic_joined_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
        ))
    }

    pub fn list_topic_workflow_option_records(
        &self,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        let limit = limit.clamp(1, 250);
        let total = self
            .query(
                "SELECT COUNT(*) AS total FROM synt_topic_application_state",
                &[],
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let rows = self.query(
            "SELECT state.*,
                    projection.topic_id AS projection_topic_id,
                    projection.topic_graph_json AS projection_topic_graph_json,
                    projection.concepts_json AS projection_concepts_json,
                    projection.interest_metadata_json AS projection_interest_metadata_json,
                    projection.discovery_json AS projection_discovery_json,
                    projection.updated_at AS projection_updated_at
             FROM synt_topic_application_state AS state
             LEFT JOIN synt_topic_application_projection AS projection
               ON projection.topic_id=state.topic_id
             ORDER BY state.title COLLATE NOCASE ASC,state.topic_id ASC LIMIT ?1",
            &[json!(limit)],
        )?;
        Ok((
            rows.into_iter()
                .map(topic_joined_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
        ))
    }

    pub fn upsert_topic_application_state(
        &self,
        record: &TopicApplicationStateRecord,
    ) -> Result<(), String> {
        validate_topic_state(record)?;
        record_observed_repository_write();
        self.connection()?
            .execute(
                "INSERT INTO synt_topic_application_state(
                   topic_id,path_id,title,definition,language,operation,manifest_hash,artifact_hash,
                   metadata_hash,bundle_hash,paper_count,topic_definition_json,topic_resolver_json,
                   resolved_paper_set_json,created_at,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
                 ON CONFLICT(topic_id) DO UPDATE SET
                   path_id=excluded.path_id,title=excluded.title,definition=excluded.definition,
                   language=excluded.language,operation=excluded.operation,
                   manifest_hash=excluded.manifest_hash,artifact_hash=excluded.artifact_hash,
                   metadata_hash=excluded.metadata_hash,bundle_hash=excluded.bundle_hash,
                   paper_count=excluded.paper_count,
                   topic_definition_json=excluded.topic_definition_json,
                   topic_resolver_json=excluded.topic_resolver_json,
                   resolved_paper_set_json=excluded.resolved_paper_set_json,
                   updated_at=excluded.updated_at",
                params![
                    record.topic_id,
                    record.path_id,
                    record.title,
                    record.definition,
                    if record.language.is_empty() {
                        "auto"
                    } else {
                        &record.language
                    },
                    record.operation,
                    record.manifest_hash,
                    record.artifact_hash,
                    record.metadata_hash,
                    record.bundle_hash,
                    record.paper_count,
                    object_json(&record.topic_definition_json)?,
                    object_json(&record.topic_resolver_json)?,
                    object_json(&record.resolved_paper_set_json)?,
                    record.created_at,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn get_topic_application_projection(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationProjectionRecord>, String> {
        validate_identity_part(topic_id)?;
        self.query(
            "SELECT * FROM synt_topic_application_projection WHERE topic_id=?1 LIMIT 1",
            &[json!(topic_id)],
        )?
        .into_iter()
        .next()
        .map(topic_projection_record)
        .transpose()
    }

    pub fn upsert_topic_application_projection(
        &self,
        record: &TopicApplicationProjectionRecord,
    ) -> Result<(), String> {
        validate_identity_part(&record.topic_id)?;
        record_observed_repository_write();
        self.connection()?
            .execute(
                "INSERT INTO synt_topic_application_projection(
                   topic_id,topic_graph_json,concepts_json,interest_metadata_json,discovery_json,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6)
                 ON CONFLICT(topic_id) DO UPDATE SET
                   topic_graph_json=excluded.topic_graph_json,concepts_json=excluded.concepts_json,
                   interest_metadata_json=excluded.interest_metadata_json,
                   discovery_json=excluded.discovery_json,updated_at=excluded.updated_at",
                params![
                    record.topic_id,
                    object_json(&record.topic_graph_json)?,
                    object_json(&record.concepts_json)?,
                    object_json(&record.interest_metadata_json)?,
                    object_json(&record.discovery_json)?,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn get_deleted_topic_artifact(
        &self,
        topic_id: &str,
    ) -> Result<Option<DeletedTopicArtifactRecord>, String> {
        validate_identity_part(topic_id)?;
        self.query(
            "SELECT * FROM synt_topic_deleted_artifact WHERE topic_id=?1 LIMIT 1",
            &[json!(topic_id)],
        )?
        .into_iter()
        .next()
        .map(deleted_topic_artifact_record)
        .transpose()
    }

    pub fn list_deleted_topic_artifacts(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String> {
        let limit = limit.clamp(1, 250);
        let total = self
            .query(
                "SELECT COUNT(*) AS total FROM synt_topic_deleted_artifact",
                &[],
            )?
            .first()
            .and_then(|row| row["total"].as_i64())
            .unwrap_or_default()
            .max(0) as usize;
        let rows = self.query(
            "SELECT * FROM synt_topic_deleted_artifact
             ORDER BY deleted_at DESC,topic_id ASC LIMIT ?1 OFFSET ?2",
            &[json!(limit), json!(offset)],
        )?;
        Ok((
            rows.into_iter()
                .map(deleted_topic_artifact_record)
                .collect::<Result<Vec<_>, _>>()?,
            total,
        ))
    }

    pub fn soft_delete_topic_application_state(
        &mut self,
        record: &DeletedTopicArtifactRecord,
    ) -> Result<(), String> {
        validate_deleted_topic_artifact(record)?;
        self.transaction(|repository| {
            if repository
                .get_topic_application_state(&record.topic_id)?
                .is_none()
            {
                return Err("topic_not_found".into());
            }
            record_observed_repository_write();
            repository
                .connection()?
                .execute(
                    "INSERT OR REPLACE INTO synt_topic_deleted_artifact(
                       topic_id,path_id,deleted_path_id,title,manifest_hash,artifact_hash,
                       metadata_hash,bundle_hash,updated_at,deleted_at
                     ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                    params![
                        record.topic_id,
                        record.path_id,
                        record.deleted_path_id,
                        record.title,
                        record.manifest_hash,
                        record.artifact_hash,
                        record.metadata_hash,
                        record.bundle_hash,
                        record.updated_at,
                        record.deleted_at,
                    ],
                )
                .map_err(map_sqlite_error)?;
            record_observed_repository_write();
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_topic_application_projection WHERE topic_id=?1",
                    [&record.topic_id],
                )
                .map_err(map_sqlite_error)?;
            record_observed_repository_write();
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_topic_application_state WHERE topic_id=?1",
                    [&record.topic_id],
                )
                .map_err(map_sqlite_error)?;
            Ok(())
        })
    }

    pub fn purge_deleted_topic_artifacts(
        &mut self,
        records: &[DeletedTopicArtifactRecord],
    ) -> Result<usize, String> {
        self.transaction(|repository| {
            let mut purged = 0;
            for record in records {
                validate_deleted_topic_artifact(record)?;
                record_observed_repository_write();
                purged += repository
                    .connection()?
                    .execute(
                        "DELETE FROM synt_topic_deleted_artifact
                         WHERE topic_id=?1 AND deleted_path_id=?2",
                        params![record.topic_id, record.deleted_path_id],
                    )
                    .map_err(map_sqlite_error)?;
            }
            Ok(purged)
        })
    }

    pub fn application_state_rows_absent(&self) -> Result<bool, String> {
        Ok(self
            .query(
                "SELECT cache_key FROM synt_cache_basis WHERE cache_key LIKE 'application:%' LIMIT 1",
                &[],
            )?
            .into_iter()
            .next()
            .is_none())
    }

    pub fn table_snapshot(&self) -> Result<Value, String> {
        let inventory = self.schema_inventory()?;
        let tables = inventory["tables"]
            .as_array()
            .ok_or_else(|| "repository_schema_invalid".to_owned())?;
        let mut snapshot = BTreeMap::new();
        for descriptor in tables {
            let name = descriptor["name"]
                .as_str()
                .ok_or_else(|| "repository_schema_invalid".to_owned())?;
            if !name
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || character == '_')
            {
                return Err("repository_schema_invalid".into());
            }
            let mut rows = self.query(&format!("SELECT * FROM {name}"), &[])?;
            rows.sort_by_key(stable_value_key);
            snapshot.insert(name.to_owned(), rows);
        }
        serde_json::to_value(snapshot).map_err(|_| "repository_snapshot_invalid".into())
    }

    pub fn backup(&self, destination: &Path) -> Result<(), String> {
        if destination == self.database_path {
            return Err("repository_backup_path_invalid".into());
        }
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("repository_backup_failed:{error}"))?;
        }
        self.connection()?
            .backup(rusqlite::MAIN_DB, destination, None)
            .map_err(map_sqlite_error)
    }

    pub fn close(mut self) -> Result<(), String> {
        if self.transaction_depth != 0 {
            return Err("repository_sqlite_transaction_active".into());
        }
        let connection = self
            .connection
            .take()
            .ok_or_else(|| "repository_sqlite_closed".to_owned())?;
        connection
            .close()
            .map_err(|(_, error)| map_sqlite_error(error))
    }
}

fn verify_required_application_schema(connection: &Connection) -> Result<(), String> {
    const REQUIRED: &[(&str, &[&str])] = &[
        (
            "synt_citation_graph_application_state",
            &[
                "singleton_id",
                "graph_hash",
                "input_hash",
                "node_count",
                "edge_count",
            ],
        ),
        (
            "synt_citation_node",
            &[
                "literature_item_id",
                "node_status",
                "has_zotero_binding",
                "title",
                "authors_json",
                "summary_json",
            ],
        ),
        (
            "synt_citation_edge",
            &[
                "edge_id",
                "source_literature_item_id",
                "target_literature_item_id",
                "edge_status",
                "roles_json",
                "weight",
            ],
        ),
        (
            "synt_citation_metrics_light",
            &[
                "literature_item_id",
                "incoming_count",
                "outgoing_count",
                "local_degree",
            ],
        ),
        (
            "synt_citation_metrics_complex",
            &[
                "literature_item_id",
                "foundation_score",
                "source_graph_hash",
            ],
        ),
        (
            "synt_citation_layout_state",
            &[
                "layout_key",
                "view_key",
                "preset",
                "graph_hash",
                "layout_json",
            ],
        ),
    ];
    for (table, required_columns) in REQUIRED {
        let mut statement = connection
            .prepare("SELECT name FROM pragma_table_info(?1) ORDER BY cid ASC")
            .map_err(|_| "repository_schema_incompatible".to_owned())?;
        let actual = statement
            .query_map([table], |row| row.get::<_, String>(0))
            .map_err(|_| "repository_schema_incompatible".to_owned())?
            .collect::<Result<BTreeSet<_>, _>>()
            .map_err(|_| "repository_schema_incompatible".to_owned())?;
        if required_columns
            .iter()
            .any(|column| !actual.contains(*column))
        {
            return Err("repository_schema_incompatible".into());
        }
    }
    Ok(())
}

fn row_text(row: &Value, key: &str) -> Result<String, String> {
    row[key]
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| "repository_typed_row_invalid".into())
}

fn stable_value_key(value: &Value) -> String {
    fn normalize(value: &Value) -> Value {
        match value {
            Value::Array(values) => Value::Array(values.iter().map(normalize).collect()),
            Value::Object(object) => Value::Object(
                object
                    .iter()
                    .map(|(key, value)| (key.clone(), normalize(value)))
                    .collect::<BTreeMap<_, _>>()
                    .into_iter()
                    .collect(),
            ),
            value => value.clone(),
        }
    }
    serde_json::to_string(&normalize(value)).unwrap_or_default()
}

fn row_integer(row: &Value, key: &str) -> Result<i64, String> {
    row[key]
        .as_i64()
        .filter(|value| *value >= 0 && *value <= JS_SAFE_INTEGER_MAX)
        .ok_or_else(|| "repository_typed_row_invalid".into())
}

fn operation_record(row: Value) -> Result<OperationRecord, String> {
    Ok(OperationRecord {
        operation_id: row_text(&row, "operation_id")?,
        operation_type: row_text(&row, "operation_type")?,
        library_id: row_integer(&row, "library_id")?,
        scope_kind: row_text(&row, "scope_kind")?,
        scope_ref: row_text(&row, "scope_ref")?,
        status: row_text(&row, "status")?,
        label: row_text(&row, "label")?,
        phase: row_text(&row, "phase")?,
        phase_label: row_text(&row, "phase_label")?,
        message: row_text(&row, "message")?,
        progress_mode: row_text(&row, "progress_mode")?,
        processed_count: row_integer(&row, "processed_count")?,
        skipped_count: row_integer(&row, "skipped_count")?,
        failed_count: row_integer(&row, "failed_count")?,
        total_count: row_integer(&row, "total_count")?,
        basis_kind: row_text(&row, "basis_kind")?,
        basis_value: row_text(&row, "basis_value")?,
        source_hash: row_text(&row, "source_hash")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        created_at: row_text(&row, "created_at")?,
        started_at: row_text(&row, "started_at")?,
        completed_at: row_text(&row, "completed_at")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn cache_basis_record(row: Value) -> Result<CacheBasisRecord, String> {
    Ok(CacheBasisRecord {
        cache_key: row_text(&row, "cache_key")?,
        cache_kind: row_text(&row, "cache_kind")?,
        scope_kind: row_text(&row, "scope_kind")?,
        scope_ref: row_text(&row, "scope_ref")?,
        status: row_text(&row, "status")?,
        basis_kind: row_text(&row, "basis_kind")?,
        basis_value: row_text(&row, "basis_value")?,
        source_hash: row_text(&row, "source_hash")?,
        policy_version: row_text(&row, "policy_version")?,
        active_operation_id: row_text(&row, "active_operation_id")?,
        refreshed_at: row_text(&row, "refreshed_at")?,
        stale_reason: row_text(&row, "stale_reason")?,
        diagnostics_json: row_text(&row, "diagnostics_json")?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn object_json(value: &str) -> Result<String, String> {
    let value = if value.is_empty() { "{}" } else { value };
    let parsed: Value =
        serde_json::from_str(value).map_err(|_| "repository_topic_json_invalid".to_owned())?;
    if !parsed.is_object() {
        return Err("repository_topic_json_invalid".into());
    }
    serde_json::to_string(&parsed).map_err(|_| "repository_topic_json_invalid".into())
}

fn array_json(value: &str) -> Result<String, String> {
    let value = if value.is_empty() { "[]" } else { value };
    let parsed: Value =
        serde_json::from_str(value).map_err(|_| "repository_topic_json_invalid".to_owned())?;
    if !parsed.is_array() {
        return Err("repository_topic_json_invalid".into());
    }
    serde_json::to_string(&parsed).map_err(|_| "repository_topic_json_invalid".into())
}

fn validate_topic_state(record: &TopicApplicationStateRecord) -> Result<(), String> {
    for value in [
        &record.topic_id,
        &record.path_id,
        &record.manifest_hash,
        &record.artifact_hash,
        &record.metadata_hash,
        &record.bundle_hash,
    ] {
        validate_identity_part(value)?;
    }
    if record.paper_count < 0 || record.paper_count > JS_SAFE_INTEGER_MAX {
        return Err("repository_sqlite_integer_unsafe".into());
    }
    Ok(())
}

fn topic_state_record(row: Value) -> Result<TopicApplicationStateRecord, String> {
    let record = TopicApplicationStateRecord {
        topic_id: row_text(&row, "topic_id")?,
        path_id: row_text(&row, "path_id")?,
        title: row_text(&row, "title")?,
        definition: row_text(&row, "definition")?,
        language: row_text(&row, "language")?,
        operation: row_text(&row, "operation")?,
        manifest_hash: row_text(&row, "manifest_hash")?,
        artifact_hash: row_text(&row, "artifact_hash")?,
        metadata_hash: row_text(&row, "metadata_hash")?,
        bundle_hash: row_text(&row, "bundle_hash")?,
        paper_count: row_integer(&row, "paper_count")?,
        topic_definition_json: object_json(&row_text(&row, "topic_definition_json")?)?,
        topic_resolver_json: object_json(&row_text(&row, "topic_resolver_json")?)?,
        resolved_paper_set_json: object_json(&row_text(&row, "resolved_paper_set_json")?)?,
        created_at: row_text(&row, "created_at")?,
        updated_at: row_text(&row, "updated_at")?,
    };
    validate_topic_state(&record)?;
    Ok(record)
}

fn topic_projection_record(row: Value) -> Result<TopicApplicationProjectionRecord, String> {
    let topic_id = row_text(&row, "topic_id")?;
    validate_identity_part(&topic_id)?;
    Ok(TopicApplicationProjectionRecord {
        topic_id,
        topic_graph_json: object_json(&row_text(&row, "topic_graph_json")?)?,
        concepts_json: object_json(&row_text(&row, "concepts_json")?)?,
        interest_metadata_json: object_json(&row_text(&row, "interest_metadata_json")?)?,
        discovery_json: object_json(&row_text(&row, "discovery_json")?)?,
        updated_at: row_text(&row, "updated_at")?,
    })
}

fn validate_deleted_topic_artifact(record: &DeletedTopicArtifactRecord) -> Result<(), String> {
    for value in [
        &record.topic_id,
        &record.path_id,
        &record.deleted_path_id,
        &record.manifest_hash,
        &record.artifact_hash,
        &record.metadata_hash,
        &record.bundle_hash,
    ] {
        validate_identity_part(value)?;
    }
    if unix_millis_from_utc_iso8601(&record.deleted_at).is_none() {
        return Err("repository_deleted_topic_timestamp_invalid".into());
    }
    Ok(())
}

fn deleted_topic_artifact_record(row: Value) -> Result<DeletedTopicArtifactRecord, String> {
    let record = DeletedTopicArtifactRecord {
        topic_id: row_text(&row, "topic_id")?,
        path_id: row_text(&row, "path_id")?,
        deleted_path_id: row_text(&row, "deleted_path_id")?,
        title: row_text(&row, "title")?,
        manifest_hash: row_text(&row, "manifest_hash")?,
        artifact_hash: row_text(&row, "artifact_hash")?,
        metadata_hash: row_text(&row, "metadata_hash")?,
        bundle_hash: row_text(&row, "bundle_hash")?,
        updated_at: row_text(&row, "updated_at")?,
        deleted_at: row_text(&row, "deleted_at")?,
    };
    validate_deleted_topic_artifact(&record)?;
    Ok(record)
}

fn topic_joined_record(row: Value) -> Result<TopicApplicationJoinedRecord, String> {
    let state = topic_state_record(row.clone())?;
    let Some(topic_id) = row["projection_topic_id"].as_str() else {
        return Ok((state, None));
    };
    let projection = topic_projection_record(json!({
        "topic_id":topic_id,
        "topic_graph_json":row["projection_topic_graph_json"],
        "concepts_json":row["projection_concepts_json"],
        "interest_metadata_json":row["projection_interest_metadata_json"],
        "discovery_json":row["projection_discovery_json"],
        "updated_at":row["projection_updated_at"],
    }))?;
    Ok((state, Some(projection)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-r7-repository-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root");
        root
    }

    fn identity() -> RepositoryIdentity {
        RepositoryIdentity {
            profile_id: "profile:r7".into(),
            data_root_id: "data:r7".into(),
        }
    }

    #[test]
    fn opens_complete_isolated_schema_with_required_pragmas() {
        let root = root("schema");
        let repository = Repository::open(&root, identity()).expect("open repository");
        assert_eq!(
            repository
                .database_path()
                .strip_prefix(&root)
                .expect("isolated path"),
            Path::new("shadow-repository/data_r7/synthesis.db")
        );
        let pragmas = repository.pragma_snapshot().expect("pragmas");
        assert_eq!(pragmas["journalMode"], "wal");
        assert_eq!(pragmas["synchronous"], 1);
        assert_eq!(pragmas["foreignKeys"], 1);
        assert_eq!(pragmas["busyTimeout"], 250);
        let inventory = repository.schema_inventory().expect("inventory");
        assert_eq!(inventory["tables"].as_array().map(Vec::len), Some(53));
        assert_eq!(inventory["indexes"].as_array().map(Vec::len), Some(46));
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn read_connection_observes_committed_state_and_rejects_writes() {
        let root = root("read-connection");
        let writer = Repository::open(&root, identity()).expect("open writer");
        writer
            .upsert_cache_basis(&CacheBasisRecord {
                cache_key: "reference-sidecar:library".into(),
                cache_kind: "reference-sidecar".into(),
                status: "missing".into(),
                updated_at: "2026-08-08T00:00:00.000Z".into(),
                ..CacheBasisRecord::default()
            })
            .expect("seed cache");

        let reader = writer.open_reader().expect("open reader");
        assert_eq!(
            reader
                .get_cache_basis("reference-sidecar:library")
                .expect("read cache")
                .expect("cache row")
                .status,
            "missing"
        );
        assert!(
            reader
                .execute(
                    "UPDATE synt_cache_basis SET status='ready' WHERE cache_key=?1",
                    &[json!("reference-sidecar:library")],
                )
                .is_err(),
            "reader must reject writes"
        );

        writer
            .execute(
                "UPDATE synt_cache_basis SET status='ready' WHERE cache_key=?1",
                &[json!("reference-sidecar:library")],
            )
            .expect("update cache");
        assert_eq!(
            reader
                .get_cache_basis("reference-sidecar:library")
                .expect("read updated cache")
                .expect("updated cache row")
                .status,
            "ready"
        );

        reader.close().expect("close reader");
        writer.close().expect("close writer");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn production_open_uses_only_the_explicit_existing_database() {
        let root = root("production");
        let database_path = root.join("state").join("synthesis.db");
        fs::create_dir_all(database_path.parent().unwrap()).expect("state root");
        fs::write(&database_path, []).expect("database placeholder");
        let repository =
            Repository::open_production(&database_path, identity(), "2026-07-27T00:00:00.000Z")
                .expect("open production");
        assert_eq!(repository.database_path(), database_path);
        assert!(!root.join("shadow-repository").exists());
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn production_initialize_creates_the_explicit_database_once() {
        let root = root("production-initialize");
        let database_path = root.join("state").join("synthesis.db");
        let repository = Repository::initialize_production(&database_path, identity())
            .expect("initialize production");
        assert_eq!(repository.database_path(), database_path);
        assert!(repository.database_path().is_file());
        repository.close().expect("close");
        assert_eq!(
            Repository::initialize_production(&database_path, identity(),).unwrap_err(),
            "repository_production_database_exists"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn registered_v1_migration_preserves_facts_and_marks_rebuildable_state_stale() {
        let root = root("production-schema-v2");
        let database_path = root.join("state").join("synthesis.db");
        Repository::initialize_production(&database_path, identity())
            .expect("initialize")
            .close()
            .expect("close");
        let connection = Connection::open(&database_path).expect("open fixture");
        connection
            .execute_batch(
                "DROP INDEX idx_synt_topic_deleted_artifact_deleted;
                 DROP TABLE synt_topic_deleted_artifact;
                 INSERT INTO synt_topic_application_state(
                   topic_id,path_id,manifest_hash,artifact_hash,metadata_hash,bundle_hash
                 ) VALUES('topic:kept','topic-kept','manifest','artifact','metadata','bundle');
                 INSERT INTO synt_cache_basis(cache_key,cache_kind,status)
                 VALUES('citation:layout','citation_layout','ready');
                 INSERT INTO synt_citation_layout_state(layout_key,status)
                 VALUES('layout:kept','ready');
                 INSERT INTO synt_citation_metrics_complex(literature_item_id,status)
                 VALUES('paper:kept','ready');
                 INSERT INTO synt_reference_application_state(
                   singleton_id,reference_hash,input_hash,source_count,reference_count,
                   canonical_count,binding_count,reference_ready,graph_ready,related_items_ready,
                   updated_at
                 ) VALUES(1,'reference','input',0,0,0,0,1,1,1,'');
                 INSERT INTO synt_reference_binding(
                   binding_id,canonical_reference_id,library_id,item_key,status,confidence,
                   reviewer,basis_hash,diagnostics_json,created_at,updated_at
                 ) VALUES('binding:kept','canonical:kept',1,'AAAA','accepted','high',
                   'user','basis','[]','','');
                 INSERT INTO synt_reference_redirect(
                   from_canonical_reference_id,to_canonical_reference_id,reason,
                   diagnostics_json,created_at,updated_at
                 ) VALUES('canonical:old','canonical:kept','user_merge','[]','','');
                 INSERT INTO synt_reference_revision_review(
                   review_id,source_ref,canonical_reference_id,status,reason,payload_json,
                   created_at,updated_at
                 ) VALUES('review:kept','1:AAAA','canonical:kept','accepted','user','{}','','');
                 INSERT INTO synt_reference_matching_state(
                   singleton_id,reference_hash,matching_hash,proposal_count,open_proposal_count,
                   matching_ready,graph_ready,related_items_ready,updated_at
                 ) VALUES(1,'reference','matching',0,0,1,1,1,'');
                 INSERT INTO synt_operation(operation_id,operation_type,status)
                 VALUES('operation:kept','fixture','completed');
                 UPDATE synt_durable_sync_state SET revision=7 WHERE singleton_id=1;
                 INSERT INTO synt_durable_sync_entity(
                   entity_key,entity_kind,entity_id,path,last_synced_hash,updated_at
                 ) VALUES('topic:kept','topic','topic:kept','topics/topic-kept','sync','');
                 INSERT INTO synt_tag_application_state(singleton_id,index_stale)
                 VALUES(1,0);
                 INSERT INTO synt_concept_application_state(singleton_id,manifest_hash,index_stale)
                 VALUES(1,'concept',0);
                 INSERT INTO synt_topic_graph_application_state(singleton_id,manifest_hash,index_stale)
                 VALUES(1,'topic-graph',0);
                 UPDATE synt_schema_meta
                   SET value='synthesis-topic-application-repository.v1'
                   WHERE key='topic_application_schema_version';
                 UPDATE synt_schema_meta
                   SET value='synthesis-repository-foundation.v1'
                   WHERE key='repository_foundation_schema_version';",
            )
            .expect("downgrade fixture");
        drop(connection);

        let backup_root = root.join("state/synthesis-migration-backups");
        prepare_production_schema(&database_path, &backup_root).expect("migrate");
        prepare_production_schema(&database_path, &backup_root).expect("idempotent");
        let migrated =
            Repository::open_production(&database_path, identity(), "2026-07-27T00:00:00.000Z")
                .expect("reopen migrated");
        assert!(
            migrated
                .get_topic_application_state("topic:kept")
                .unwrap()
                .is_some()
        );
        assert_eq!(
            migrated
                .get_cache_basis("citation:layout")
                .unwrap()
                .unwrap()
                .status,
            "stale"
        );
        assert_eq!(
            migrated
                .query("SELECT status FROM synt_citation_layout_state", &[])
                .unwrap()[0]["status"],
            "stale"
        );
        assert_eq!(
            migrated
                .query("SELECT status FROM synt_citation_metrics_complex", &[])
                .unwrap()[0]["status"],
            "stale"
        );
        assert_eq!(
            migrated
                .query(
                    "SELECT reference_ready FROM synt_reference_application_state",
                    &[]
                )
                .unwrap()[0]["reference_ready"],
            0
        );
        assert_eq!(
            migrated
                .query(
                    "SELECT matching_ready FROM synt_reference_matching_state",
                    &[]
                )
                .unwrap()[0]["matching_ready"],
            0
        );
        for table in [
            "synt_reference_binding",
            "synt_reference_redirect",
            "synt_reference_revision_review",
            "synt_operation",
            "synt_durable_sync_entity",
        ] {
            assert_eq!(
                migrated
                    .query(&format!("SELECT COUNT(*) AS total FROM {table}"), &[])
                    .unwrap()[0]["total"],
                1,
                "{table}"
            );
        }
        assert_eq!(
            migrated
                .query("SELECT revision FROM synt_durable_sync_state", &[])
                .unwrap()[0]["revision"],
            7
        );
        for table in [
            "synt_tag_application_state",
            "synt_concept_application_state",
            "synt_topic_graph_application_state",
        ] {
            assert_eq!(
                migrated
                    .query(&format!("SELECT index_stale FROM {table}"), &[])
                    .unwrap()[0]["index_stale"],
                1,
                "{table}"
            );
        }
        assert!(
            migrated
                .get_deleted_topic_artifact("topic:kept")
                .unwrap()
                .is_none()
        );
        migrated.close().expect("close");

        let backups = fs::read_dir(&backup_root)
            .expect("backup root")
            .collect::<Result<Vec<_>, _>>()
            .expect("backups");
        assert_eq!(backups.len(), 1);
        let backup = open_existing_database_read_only(&backups[0].path()).expect("backup");
        assert_eq!(
            read_schema_version(&backup).expect("backup schema"),
            PREVIOUS_SCHEMA_VERSION
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn unregistered_production_schema_stops_without_creating_a_backup() {
        let root = root("production-schema-unregistered");
        let database_path = root.join("state").join("synthesis.db");
        Repository::initialize_production(&database_path, identity())
            .expect("initialize")
            .close()
            .expect("close");
        let connection = Connection::open(&database_path).expect("open fixture");
        connection
            .execute(
                "UPDATE synt_schema_meta SET value='legacy.test'
                 WHERE key='repository_foundation_schema_version'",
                [],
            )
            .expect("set legacy schema");
        drop(connection);
        let backup_root = root.join("state/synthesis-migration-backups");
        assert_eq!(
            prepare_production_schema(&database_path, &backup_root).unwrap_err(),
            "repository_schema_migration_unregistered"
        );
        assert!(!backup_root.exists());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn redirect_graph_migration_repairs_cycle_using_explicit_reverse_audit() {
        let root = root("production-redirect-cycle");
        let database_path = root.join("state").join("synthesis.db");
        Repository::initialize_production(&database_path, identity())
            .expect("initialize")
            .close()
            .expect("close");
        let connection = Connection::open(&database_path).expect("open fixture");
        connection
            .execute_batch(
                "DELETE FROM synt_schema_meta
                   WHERE key='reference_redirect_graph_schema_version';
                 INSERT INTO synt_reference_redirect(
                   from_canonical_reference_id,to_canonical_reference_id,reason,
                   diagnostics_json,created_at,updated_at
                 ) VALUES
                   ('canonical:a','canonical:b','reference_matching','[]','1','1'),
                   ('canonical:b','canonical:a','reference_matching','[]','2','2'),
                   ('canonical:c','canonical:b','reference_matching','[]','1','1');
                 INSERT INTO synt_reference_match_proposal(
                   proposal_id,kind,status,source_canonical_reference_id,
                   target_canonical_reference_id,reasons_json,updated_at
                 ) VALUES
                   ('proposal:forward','canonical_merge','accepted','canonical:a',
                    'canonical:b','[\"cluster_exact\"]','2026-08-10T08:26:24.886Z'),
                   ('proposal:reverse','canonical_merge','accepted','canonical:b',
                    'canonical:a','[\"reverse_accept\"]','2026-08-10T10:16:56.901Z');",
            )
            .expect("cycle fixture");
        drop(connection);

        let backup_root = root.join("state/synthesis-migration-backups");
        prepare_production_schema(&database_path, &backup_root).expect("repair");
        prepare_production_schema(&database_path, &backup_root).expect("idempotent");
        let repository =
            Repository::open_production(&database_path, identity(), "2026-08-10T10:17:00.000Z")
                .expect("open repaired");
        let redirects = repository.list_reference_redirects().expect("redirects");
        let graph = ReferenceRedirectGraph::from_records(&redirects).expect("graph");
        assert!(graph.validate_acyclic().is_ok());
        assert_eq!(graph.resolve("canonical:a").unwrap(), "canonical:a");
        assert_eq!(graph.resolve("canonical:b").unwrap(), "canonical:a");
        assert_eq!(graph.resolve("canonical:c").unwrap(), "canonical:a");
        assert_eq!(graph.target("canonical:a"), None);
        assert_eq!(graph.target("canonical:b"), Some("canonical:a"));
        let (proposals, _) = repository
            .list_reference_match_proposals(0, 10)
            .expect("proposals");
        assert_eq!(
            proposals
                .iter()
                .find(|proposal| proposal.proposal_id == "proposal:forward")
                .map(|proposal| proposal.status.as_str()),
            Some("superseded")
        );
        assert!(
            repository
                .list_operations(&OperationQuery {
                    operation_types: vec!["canonical_redirect_repair".into()],
                    include_completed: true,
                    limit: 10,
                    ..OperationQuery::default()
                })
                .expect("repair receipt")
                .iter()
                .any(|operation| operation.status == "completed")
        );
        repository.close().expect("close");
        assert_eq!(
            fs::read_dir(&backup_root)
                .expect("backup root")
                .collect::<Result<Vec<_>, _>>()
                .expect("backups")
                .len(),
            1
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn registered_failed_migration_keeps_the_original_schema_and_backup() {
        fn fail_after_schema_write(connection: &Connection) -> Result<(), String> {
            connection
                .execute(
                    "UPDATE synt_schema_meta SET value=?1
                     WHERE key='repository_foundation_schema_version'",
                    [SCHEMA_VERSION],
                )
                .map_err(map_sqlite_error)?;
            Err("migration_fixture_failed".into())
        }

        let root = root("production-schema-failure");
        let database_path = root.join("state").join("synthesis.db");
        Repository::initialize_production(&database_path, identity())
            .expect("initialize")
            .close()
            .expect("close");
        let connection = Connection::open(&database_path).expect("open fixture");
        connection
            .execute_batch(
                "DROP INDEX idx_synt_topic_deleted_artifact_deleted;
                 DROP TABLE synt_topic_deleted_artifact;
                 UPDATE synt_schema_meta
                   SET value='synthesis-topic-application-repository.v1'
                   WHERE key='topic_application_schema_version';
                 UPDATE synt_schema_meta
                   SET value='synthesis-repository-foundation.v1'
                   WHERE key='repository_foundation_schema_version';",
            )
            .expect("set v1 schema");
        drop(connection);
        let backup_root = root.join("state/synthesis-migration-backups");
        let migrations = [RegisteredProductionSchemaMigration {
            from: PREVIOUS_SCHEMA_VERSION,
            to: SCHEMA_VERSION,
            migrate: fail_after_schema_write,
        }];
        assert_eq!(
            prepare_production_schema_with_registry(&database_path, &backup_root, &migrations,)
                .unwrap_err(),
            "migration_fixture_failed"
        );
        let source = open_production_database_read_only(&database_path).expect("source");
        assert_eq!(
            read_schema_version(&source).expect("source schema"),
            PREVIOUS_SCHEMA_VERSION
        );
        let backups = fs::read_dir(&backup_root)
            .expect("backup root")
            .collect::<Result<Vec<_>, _>>()
            .expect("backup entries");
        assert_eq!(backups.len(), 1);
        let backup = open_existing_database_read_only(&backups[0].path()).expect("backup");
        assert_eq!(
            read_schema_version(&backup).expect("backup schema"),
            PREVIOUS_SCHEMA_VERSION
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn production_open_rejects_missing_or_derived_paths() {
        let root = root("production-reject");
        assert_eq!(
            Repository::open_production(
                &root.join("state").join("synthesis.db"),
                identity(),
                "2026-07-27T00:00:00.000Z",
            )
            .unwrap_err(),
            "repository_production_database_missing"
        );
        assert_eq!(
            Repository::open_production(
                Path::new("state/synthesis.db"),
                identity(),
                "2026-07-27T00:00:00.000Z",
            )
            .unwrap_err(),
            "repository_production_path_invalid"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn schema_and_pragmas_match_the_shared_durable_foundation_corpus() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json"
        ))
        .expect("shared corpus");
        let root = root("shared-corpus");
        let repository = Repository::open(&root, identity()).expect("open");
        let inventory = repository.schema_inventory().expect("inventory");
        let names = |kind: &str| {
            inventory[kind]
                .as_array()
                .expect("inventory entries")
                .iter()
                .map(|entry| entry["name"].clone())
                .collect::<Vec<_>>()
        };
        assert_eq!(
            names("tables"),
            corpus["repository"]["tables"]
                .as_array()
                .expect("corpus tables")
                .clone()
        );
        assert_eq!(
            names("indexes"),
            corpus["repository"]["indexes"]
                .as_array()
                .expect("corpus indexes")
                .clone()
        );
        assert_eq!(
            repository.pragma_snapshot().expect("pragmas"),
            corpus["repository"]["pragmas"]
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn sql_observation_counts_repository_queries_and_writes_separately() {
        let root = root("query-observation");
        let repository = Repository::open(&root, identity()).expect("open");
        let (rows, observation) = observe_repository_sql(|| {
            repository
                .query("SELECT 1 AS value", &[])
                .expect("observed query")
        });
        assert_eq!(rows, vec![json!({"value":1})]);
        assert_eq!(observation.query_count, 1);
        assert_eq!(observation.write_count, 0);

        let (_, observation) = observe_repository_sql(|| {
            repository
                .execute(
                    "INSERT INTO synt_schema_meta(key,value) VALUES('observation-write','1')",
                    &[],
                )
                .expect("observed write");
        });
        assert_eq!(observation.query_count, 0);
        assert_eq!(observation.write_count, 1);
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn nested_sql_observation_restores_the_outer_scope() {
        let root = root("nested-query-observation");
        let repository = Repository::open(&root, identity()).expect("open");
        let ((inner_observation, final_rows), outer_observation) = observe_repository_sql(|| {
            repository.query("SELECT 1", &[]).expect("outer first");
            let (_, inner_observation) = observe_repository_sql(|| {
                repository.query("SELECT 2", &[]).expect("inner");
            });
            let final_rows = repository.query("SELECT 3", &[]).expect("outer second");
            (inner_observation, final_rows)
        });
        assert_eq!(inner_observation.query_count, 1);
        assert_eq!(inner_observation.write_count, 0);
        assert_eq!(outer_observation.query_count, 2);
        assert_eq!(outer_observation.write_count, 0);
        assert_eq!(final_rows, vec![json!({"3":3})]);
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn panicking_sql_observation_restores_the_previous_scope() {
        let panic = std::panic::catch_unwind(|| {
            observe_repository_sql(|| panic!("fixture panic"));
        });
        assert!(panic.is_err());
        let (_, observation) = observe_repository_sql(record_observed_repository_query);
        assert_eq!(observation.query_count, 1);
        assert_eq!(observation.write_count, 0);
    }

    #[test]
    fn nested_savepoint_rolls_back_locally_and_outer_commits() {
        let root = root("savepoint");
        let mut repository = Repository::open(&root, identity()).expect("open");
        repository
            .transaction(|repository| {
                repository.upsert_operation(&OperationRecord {
                    operation_id: "outer".into(),
                    operation_type: "topic".into(),
                    library_id: 1,
                    status: "running".into(),
                    label: String::new(),
                    phase: String::new(),
                    message: String::new(),
                    created_at: "2026-01-01".into(),
                    updated_at: "2026-01-01".into(),
                    ..OperationRecord::default()
                })?;
                let nested = repository.transaction(|repository| {
                    repository.upsert_operation(&OperationRecord {
                        operation_id: "inner".into(),
                        operation_type: "topic".into(),
                        library_id: 1,
                        status: "running".into(),
                        label: String::new(),
                        phase: String::new(),
                        message: String::new(),
                        created_at: "2026-01-01".into(),
                        updated_at: "2026-01-01".into(),
                        ..OperationRecord::default()
                    })?;
                    Err::<(), _>("fixture_failure".into())
                });
                assert_eq!(nested.unwrap_err(), "fixture_failure");
                Ok(())
            })
            .expect("outer commit");
        assert_eq!(
            repository
                .query(
                    "SELECT operation_id FROM synt_operation ORDER BY operation_id",
                    &[]
                )
                .expect("rows"),
            vec![json!({"operation_id":"outer"})]
        );
        let rollback = repository.transaction(|repository| {
            repository.upsert_operation(&OperationRecord {
                operation_id: "outer-rollback".into(),
                operation_type: "topic".into(),
                library_id: 1,
                status: "running".into(),
                label: String::new(),
                phase: String::new(),
                message: String::new(),
                created_at: "2026-01-01".into(),
                updated_at: "2026-01-01".into(),
                ..OperationRecord::default()
            })?;
            Err::<(), _>("outer_failure".into())
        });
        assert_eq!(rollback.unwrap_err(), "outer_failure");
        assert!(
            repository
                .query(
                    "SELECT operation_id FROM synt_operation WHERE operation_id='outer-rollback'",
                    &[]
                )
                .expect("rows")
                .is_empty()
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rejects_unsafe_integer_inputs_and_row_values() {
        let root = root("safe-integers");
        let repository = Repository::open(&root, identity()).expect("open");
        assert_eq!(
            repository
                .query("SELECT ? AS value", &[json!(9_007_199_254_740_992_u64)])
                .unwrap_err(),
            "repository_sqlite_integer_unsafe"
        );
        assert_eq!(
            repository
                .query("SELECT 9007199254740992 AS value", &[])
                .unwrap_err(),
            "repository_sqlite_integer_unsafe"
        );
        assert_eq!(
            repository.query("SELECT X'00' AS value", &[]).unwrap_err(),
            "repository_sqlite_row_invalid"
        );
        assert_eq!(
            repository
                .query("SELECT ? AS value", &[json!(true)])
                .expect("normalized boolean"),
            vec![json!({"value":1})]
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn restart_preserves_operations_for_explicit_reconciliation() {
        let root = root("restart");
        let repository = Repository::open(&root, identity()).expect("open");
        for (id, status, updated_at) in [
            ("running", "running", "2026-01-01T00:00:03.000Z"),
            ("succeeded", "succeeded", "2026-01-01T00:00:02.000Z"),
            ("failed", "failed", "2026-01-01T00:00:01.000Z"),
            ("canceled", "canceled", "2026-01-01T00:00:01.000Z"),
        ] {
            repository
                .upsert_operation(&OperationRecord {
                    operation_id: id.into(),
                    operation_type: "fixture".into(),
                    library_id: 0,
                    status: status.into(),
                    label: String::new(),
                    phase: String::new(),
                    message: String::new(),
                    created_at: "2026-01-01T00:00:00.000Z".into(),
                    updated_at: updated_at.into(),
                    ..OperationRecord::default()
                })
                .expect("operation");
        }
        repository.close().expect("close");
        let repository = Repository::open(&root, identity()).expect("reopen");
        let rows = repository
            .query(
                "SELECT operation_id,status FROM synt_operation ORDER BY operation_id",
                &[],
            )
            .expect("rows");
        assert_eq!(
            rows,
            vec![
                json!({"operation_id":"canceled","status":"canceled"}),
                json!({"operation_id":"failed","status":"failed"}),
                json!({"operation_id":"running","status":"running"}),
                json!({"operation_id":"succeeded","status":"succeeded"}),
            ]
        );
        assert_eq!(
            repository
                .list_operations(&OperationQuery {
                    include_completed: true,
                    limit: 10,
                    ..OperationQuery::default()
                })
                .expect("ordered operations")
                .into_iter()
                .map(|row| row.operation_id)
                .collect::<Vec<_>>(),
            vec!["running", "succeeded", "canceled", "failed"]
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn competing_writer_observes_the_fixed_busy_timeout() {
        let root = root("busy");
        let repository = Repository::open(&root, identity()).expect("open");
        repository
            .connection()
            .expect("connection")
            .execute_batch("BEGIN IMMEDIATE")
            .expect("hold writer");
        let started = std::time::Instant::now();
        let error = Repository::open(&root, identity()).unwrap_err();
        let elapsed = started.elapsed();
        assert_eq!(error, "repository_busy");
        assert!(elapsed >= Duration::from_millis(200), "{elapsed:?}");
        assert!(elapsed < Duration::from_secs(2), "{elapsed:?}");
        repository
            .connection()
            .expect("connection")
            .execute_batch("ROLLBACK")
            .expect("release");
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn online_backup_reopens_with_identical_table_state() {
        let root = root("backup");
        let repository = Repository::open(&root, identity()).expect("open");
        repository
            .upsert_operation(&OperationRecord {
                operation_id: "backup-fixture".into(),
                operation_type: "fixture".into(),
                library_id: 0,
                status: "succeeded".into(),
                label: String::new(),
                phase: String::new(),
                message: String::new(),
                created_at: "2026-01-01".into(),
                updated_at: "2026-01-01".into(),
                ..OperationRecord::default()
            })
            .expect("operation");
        let expected = repository.table_snapshot().expect("snapshot");
        let destination = root.join("backup/synthesis.db");
        repository.backup(&destination).expect("backup");
        let backup = Connection::open(destination).expect("open backup");
        let operation: String = backup
            .query_row("SELECT operation_id FROM synt_operation", [], |row| {
                row.get(0)
            })
            .expect("operation");
        assert_eq!(operation, "backup-fixture");
        assert_eq!(expected["synt_operation"].as_array().map(Vec::len), Some(1));
        drop(backup);
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn typed_application_rows_round_trip_without_synthetic_state() {
        let root = root("typed-rows");
        let repository = Repository::open(&root, identity()).expect("open");
        let cache = CacheBasisRecord {
            cache_key: "reference-sidecar:library".into(),
            cache_kind: "reference-sidecar".into(),
            status: "ready".into(),
            refreshed_at: "2026-07-26".into(),
            updated_at: "2026-07-26".into(),
            ..CacheBasisRecord::default()
        };
        repository.upsert_cache_basis(&cache).expect("cache");
        assert_eq!(
            repository
                .get_cache_basis(&cache.cache_key)
                .expect("cache read"),
            Some(CacheBasisRecord {
                diagnostics_json: "[]".into(),
                ..cache
            })
        );
        let state = TopicApplicationStateRecord {
            topic_id: "topic:typed".into(),
            path_id: "topic-typed".into(),
            manifest_hash: format!("sha256:{}", "1".repeat(64)),
            artifact_hash: format!("sha256:{}", "2".repeat(64)),
            metadata_hash: format!("sha256:{}", "3".repeat(64)),
            bundle_hash: format!("sha256:{}", "4".repeat(64)),
            topic_definition_json: r#"{"id":"topic:typed"}"#.into(),
            topic_resolver_json: "{}".into(),
            resolved_paper_set_json: "{}".into(),
            ..TopicApplicationStateRecord::default()
        };
        repository
            .upsert_topic_application_state(&state)
            .expect("state");
        assert_eq!(
            repository
                .get_topic_application_state(&state.topic_id)
                .expect("state read")
                .expect("state")
                .topic_id,
            state.topic_id
        );
        let projection = TopicApplicationProjectionRecord {
            topic_id: "topic:typed".into(),
            topic_graph_json: "{}".into(),
            concepts_json: "{}".into(),
            interest_metadata_json: "{}".into(),
            discovery_json: r#"{"source_paper_refs":["1:AAAA1111"]}"#.into(),
            ..TopicApplicationProjectionRecord::default()
        };
        repository
            .upsert_topic_application_projection(&projection)
            .expect("projection");
        assert!(
            repository
                .get_topic_application_projection("topic:typed")
                .expect("projection read")
                .is_some()
        );
        let (records, total) = repository
            .list_topic_application_records(0, 50)
            .expect("joined topic page");
        assert_eq!(total, 1);
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].0.topic_id, "topic:typed");
        assert_eq!(
            records[0].1.as_ref().map(|record| record.topic_id.as_str()),
            Some("topic:typed")
        );
        let ((scopes, scope_total), observation) = observe_repository_sql(|| {
            repository
                .list_topic_graph_scope_records(0, 25)
                .expect("topic graph scopes")
        });
        assert_eq!(scope_total, 1);
        assert_eq!(scopes.len(), 1);
        assert_eq!(scopes[0].source_paper_ref_total, 1);
        assert_eq!(scopes[0].source_paper_refs_json, r#"["1:AAAA1111"]"#);
        assert_eq!(observation.query_count, 2);
        assert_eq!(observation.write_count, 0);
        assert!(repository.application_state_rows_absent().expect("absence"));
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn consumes_related_items_echo_in_repository_without_a_host_effect() {
        let root = root("related-items-echo");
        let repository = Repository::open(&root, identity()).expect("open");
        let payload = json!({
            "effectId":"effect:1",
            "sourceLibraryId":1,
            "sourceItemKey":"AAAA1111",
            "targetLibraryId":1,
            "targetItemKey":"BBBB2222",
            "status":"applied",
            "externalWriteAt":"2026-08-02T00:00:00.000Z",
            "echoState":"awaiting_echo",
            "updatedAt":"2026-08-02T00:00:00.000Z"
        });
        repository
            .execute(
                "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)",
                &[
                    json!("effect:1"),
                    json!(serde_json::to_string(&payload).expect("payload")),
                    json!("2026-08-02T00:00:00.000Z"),
                ],
            )
            .expect("seed");

        assert!(
            repository
                .consume_related_items_sync_echo(
                    1,
                    "AAAA1111",
                    Some("BBBB2222"),
                    "2026-08-02T00:00:05.000Z",
                )
                .expect("consume")
        );
        assert!(
            !repository
                .consume_related_items_sync_echo(
                    1,
                    "AAAA1111",
                    Some("BBBB2222"),
                    "2026-08-02T00:00:06.000Z",
                )
                .expect("already consumed")
        );
        let rows = repository
            .query(
                "SELECT payload_json FROM synt_related_items_sync_effect WHERE effect_id=?1",
                &[json!("effect:1")],
            )
            .expect("read");
        let stored: Value =
            serde_json::from_str(rows[0]["payload_json"].as_str().expect("stored payload"))
                .expect("stored json");
        assert_eq!(stored["echoState"], "observed");
        assert_eq!(stored["echoObservedAt"], "2026-08-02T00:00:05.000Z");

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn terminal_operation_receipt_is_compare_and_set_and_immutable() {
        let root = root("operation-terminal-cas");
        let repository = Repository::open(&root, identity()).expect("open");
        let pending = OperationRecord {
            operation_id: "operation:cas".into(),
            operation_type: "fixture".into(),
            status: "running".into(),
            created_at: "2026-08-02T00:00:00.000Z".into(),
            updated_at: "2026-08-02T00:00:00.000Z".into(),
            ..OperationRecord::default()
        };
        repository.upsert_operation(&pending).expect("seed");
        let completed = OperationRecord {
            status: "completed".into(),
            phase: "completed".into(),
            completed_at: "2026-08-02T00:00:01.000Z".into(),
            updated_at: "2026-08-02T00:00:01.000Z".into(),
            ..pending.clone()
        };
        assert_eq!(
            repository
                .finish_operation_if_nonterminal(&completed)
                .expect("complete")
                .status,
            "completed"
        );
        let late_cancel = OperationRecord {
            status: "canceled".into(),
            phase: "canceled".into(),
            completed_at: "2026-08-02T00:00:02.000Z".into(),
            updated_at: "2026-08-02T00:00:02.000Z".into(),
            ..pending
        };
        assert_eq!(
            repository
                .finish_operation_if_nonterminal(&late_cancel)
                .expect("first terminal wins")
                .status,
            "completed"
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn insert_operation_if_absent_returns_the_first_retry_successor() {
        let root = root("operation-retry-idempotency");
        let repository = Repository::open(&root, identity()).expect("open");
        let first = OperationRecord {
            operation_id: "maintenance:retry:fixture".into(),
            operation_type: "fixture".into(),
            status: "pending".into(),
            phase: "continuation_required".into(),
            created_at: "2026-08-02T00:00:00.000Z".into(),
            updated_at: "2026-08-02T00:00:00.000Z".into(),
            ..OperationRecord::default()
        };
        let (inserted, was_inserted) = repository
            .insert_operation_if_absent(&first)
            .expect("insert");
        assert!(was_inserted);
        assert_eq!(inserted.phase, "continuation_required");
        let duplicate = OperationRecord {
            phase: "queued".into(),
            ..first.clone()
        };
        let (replayed, was_inserted) = repository
            .insert_operation_if_absent(&duplicate)
            .expect("replay");
        assert!(!was_inserted);
        assert_eq!(replayed.phase, "continuation_required");
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn operation_id_keyset_order_is_stable_from_the_first_page() {
        let root = root("operation-keyset-order");
        let repository = Repository::open(&root, identity()).expect("open");
        for (operation_id, updated_at) in [
            ("operation:c", "2026-08-02T00:00:01.000Z"),
            ("operation:a", "2026-08-02T00:00:03.000Z"),
            ("operation:b", "2026-08-02T00:00:02.000Z"),
        ] {
            repository
                .upsert_operation(&OperationRecord {
                    operation_id: operation_id.into(),
                    operation_type: "fixture".into(),
                    status: "pending".into(),
                    created_at: updated_at.into(),
                    updated_at: updated_at.into(),
                    ..OperationRecord::default()
                })
                .expect("seed");
        }

        let first_page = repository
            .list_operations(&OperationQuery {
                statuses: vec!["pending".into()],
                order_by_operation_id: true,
                limit: 2,
                ..OperationQuery::default()
            })
            .expect("first page");
        assert_eq!(
            first_page
                .iter()
                .map(|row| row.operation_id.as_str())
                .collect::<Vec<_>>(),
            vec!["operation:a", "operation:b"]
        );
        let second_page = repository
            .list_operations(&OperationQuery {
                statuses: vec!["pending".into()],
                order_by_operation_id: true,
                start_after_operation_id: first_page.last().map(|row| row.operation_id.clone()),
                limit: 2,
                ..OperationQuery::default()
            })
            .expect("second page");
        assert_eq!(
            second_page
                .iter()
                .map(|row| row.operation_id.as_str())
                .collect::<Vec<_>>(),
            vec!["operation:c"]
        );

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
