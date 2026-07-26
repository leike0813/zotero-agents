use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{Connection, OpenFlags, OptionalExtension, ToSql, params};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

pub const SCHEMA_VERSION: &str = "synthesis-repository-foundation.v1";
pub const BUSY_TIMEOUT_MILLIS: u64 = 250;
pub const JS_SAFE_INTEGER_MAX: i64 = 9_007_199_254_740_991;
const IDENTITY_SCHEMA: &str = "synthesis-rust-shadow-repository.v1";
const SCHEMA_SQL: &str = include_str!("schema.sql");

const SCHEMA_IDENTITIES: &[(&str, &str)] = &[
    ("repository_foundation_schema_version", SCHEMA_VERSION),
    (
        "topic_application_schema_version",
        "synthesis-topic-application-repository.v1",
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
];

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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OperationRecord {
    pub operation_id: String,
    pub operation_type: String,
    #[serde(default)]
    pub library_id: i64,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub phase: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApplicationState {
    pub kind: String,
    pub basis: String,
    pub payload: Value,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct Repository {
    connection: Option<Connection>,
    database_path: PathBuf,
    repository_id: String,
    transaction_depth: usize,
    savepoint_sequence: u64,
}

fn stable_id(identity: &RepositoryIdentity) -> String {
    let mut hash = Sha256::new();
    hash.update(IDENTITY_SCHEMA.as_bytes());
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
                .map_err(map_sqlite_error)?;
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
                .execute(
                    "UPDATE synt_operation SET status='canceled',phase='service_restart',updated_at=CASE WHEN updated_at='' THEN created_at ELSE updated_at END WHERE status='running'",
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
        if record.library_id.abs() > JS_SAFE_INTEGER_MAX {
            return Err("repository_sqlite_integer_unsafe".into());
        }
        self.connection()?
            .execute(
                "INSERT INTO synt_operation(
                   operation_id,operation_type,library_id,status,label,phase,message,created_at,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)
                 ON CONFLICT(operation_id) DO UPDATE SET
                   operation_type=excluded.operation_type,library_id=excluded.library_id,
                   status=excluded.status,label=excluded.label,phase=excluded.phase,
                   message=excluded.message,updated_at=excluded.updated_at",
                params![
                    record.operation_id,
                    record.operation_type,
                    record.library_id,
                    if record.status.is_empty() {
                        "pending"
                    } else {
                        &record.status
                    },
                    record.label,
                    record.phase,
                    record.message,
                    record.created_at,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn workbench_chrome(&self) -> Result<Value, String> {
        let mut cache_readiness = Vec::new();
        for (cache_key, cache_kind) in [
            ("reference-sidecar:library", "reference-sidecar"),
            ("citation-graph:library", "citation_graph"),
        ] {
            let row = self
                .query(
                    "SELECT status,refreshed_at,updated_at,stale_reason
                     FROM synt_cache_basis WHERE cache_key=?1",
                    &[json!(cache_key)],
                )?
                .into_iter()
                .next();
            let mut descriptor = Map::from_iter([
                ("cacheKey".into(), json!(cache_key)),
                ("cacheKind".into(), json!(cache_kind)),
                (
                    "status".into(),
                    row.as_ref()
                        .and_then(|row| row["status"].as_str())
                        .map(|value| json!(value))
                        .unwrap_or_else(|| json!("missing")),
                ),
            ]);
            if let Some(row) = row {
                for (source, target) in [
                    ("refreshed_at", "refreshedAt"),
                    ("updated_at", "updatedAt"),
                    ("stale_reason", "staleReason"),
                ] {
                    if let Some(value) = row[source].as_str().filter(|value| !value.is_empty()) {
                        descriptor.insert(target.into(), json!(value));
                    }
                }
            }
            cache_readiness.push(Value::Object(descriptor));
        }
        let running = self.query(
            "SELECT * FROM synt_operation WHERE status='running'
             ORDER BY updated_at DESC,operation_id ASC LIMIT 50",
            &[],
        )?;
        let failed = self.query(
            "SELECT * FROM synt_operation
             WHERE status='failed'
               AND operation_type IN ('reference_sidecar_refresh','citation_graph_cache_rebuild')
             ORDER BY updated_at DESC,operation_id ASC LIMIT 20",
            &[],
        )?;
        let mut jobs = Vec::new();
        for row in running.into_iter().chain(failed) {
            let operation_id = row["operation_id"].as_str().unwrap_or_default();
            let operation_type = row["operation_type"].as_str().unwrap_or_default();
            let source = match operation_type {
                "reference_sidecar_refresh"
                | "citation_graph_cache_rebuild"
                | "citation_graph_layout"
                | "webdav_sync"
                | "canonical_maintenance" => operation_type,
                _ => "operation",
            };
            let total = row["total_count"].as_i64().unwrap_or(0).max(0);
            let current = row["processed_count"].as_i64().unwrap_or(0).clamp(0, total);
            let label = row["label"]
                .as_str()
                .filter(|value| !value.is_empty())
                .unwrap_or(operation_id);
            let detail = ["message", "phase_label", "phase"]
                .iter()
                .find_map(|key| row[*key].as_str().filter(|value| !value.is_empty()));
            let progress = if row["progress_mode"] == "determinate" && total > 0 {
                json!({
                    "mode":"determinate",
                    "current":current,
                    "total":total,
                    "percent":((current as f64 / total as f64) * 100.0).round() as i64,
                })
            } else {
                json!({"mode":"indeterminate"})
            };
            let mut job = Map::from_iter([
                ("job_id".into(), json!(operation_id)),
                ("source".into(), json!(source)),
                (
                    "status".into(),
                    json!(if row["status"] == "running" {
                        "running"
                    } else {
                        "failed"
                    }),
                ),
                ("label".into(), json!(label)),
                ("progress".into(), progress),
            ]);
            if let Some(detail) = detail {
                job.insert("detail".into(), json!(detail));
            }
            if let Some(updated_at) = row["updated_at"].as_str().filter(|value| !value.is_empty()) {
                job.insert("updated_at".into(), json!(updated_at));
            }
            jobs.push(Value::Object(job));
        }
        jobs.sort_by(|left, right| {
            right["updated_at"]
                .as_str()
                .unwrap_or_default()
                .cmp(left["updated_at"].as_str().unwrap_or_default())
                .then_with(|| {
                    left["job_id"]
                        .as_str()
                        .unwrap_or_default()
                        .cmp(right["job_id"].as_str().unwrap_or_default())
                })
        });
        Ok(json!({"maintenance":{
            "cacheReadiness":cache_readiness,
            "backgroundJobs":jobs,
        }}))
    }

    pub fn application_state(&self, kind: &str) -> Result<Option<ApplicationState>, String> {
        validate_identity_part(kind)?;
        let rows = self.query(
            "SELECT cache_kind,basis_value,diagnostics_json,updated_at
             FROM synt_cache_basis WHERE cache_key=?1",
            &[json!(format!("application:{kind}"))],
        )?;
        rows.into_iter()
            .next()
            .map(|row| {
                let payload = serde_json::from_str(
                    row["diagnostics_json"]
                        .as_str()
                        .ok_or_else(|| "repository_application_state_invalid".to_owned())?,
                )
                .map_err(|_| "repository_application_state_invalid".to_owned())?;
                Ok(ApplicationState {
                    kind: row["cache_kind"]
                        .as_str()
                        .ok_or_else(|| "repository_application_state_invalid".to_owned())?
                        .to_owned(),
                    basis: row["basis_value"]
                        .as_str()
                        .ok_or_else(|| "repository_application_state_invalid".to_owned())?
                        .to_owned(),
                    payload,
                    updated_at: row["updated_at"]
                        .as_str()
                        .ok_or_else(|| "repository_application_state_invalid".to_owned())?
                        .to_owned(),
                })
            })
            .transpose()
    }

    pub fn compare_and_swap_application_state(
        &mut self,
        next: ApplicationState,
        expected_basis: Option<&str>,
    ) -> Result<bool, String> {
        validate_identity_part(&next.kind)?;
        validate_identity_part(&next.basis)?;
        validate_json_safe(&next.payload)?;
        self.transaction(|repository| {
            let current = repository.application_state(&next.kind)?;
            if current.as_ref().map(|state| state.basis.as_str()) != expected_basis {
                return Ok(false);
            }
            repository
                .connection()?
                .execute(
                    "INSERT INTO synt_cache_basis(
                       cache_key,cache_kind,status,basis_kind,basis_value,diagnostics_json,updated_at
                     ) VALUES(?1,?2,'ready','application',?3,?4,?5)
                     ON CONFLICT(cache_key) DO UPDATE SET
                       cache_kind=excluded.cache_kind,status='ready',basis_kind='application',
                       basis_value=excluded.basis_value,diagnostics_json=excluded.diagnostics_json,
                       updated_at=excluded.updated_at",
                    params![
                        format!("application:{}", next.kind),
                        next.kind,
                        next.basis,
                        canonical_application_payload(&next.payload)?,
                        next.updated_at,
                    ],
                )
                .map_err(map_sqlite_error)?;
            Ok(true)
        })
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
            rows.sort_by_key(|row| serde_json::to_string(row).unwrap_or_default());
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

fn canonical_application_payload(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|_| "repository_application_state_invalid".into())
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
        assert_eq!(inventory["tables"].as_array().map(Vec::len), Some(51));
        assert_eq!(inventory["indexes"].as_array().map(Vec::len), Some(40));
        repository.close().expect("close");
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
    fn restart_cancels_only_running_operations() {
        let root = root("restart");
        let repository = Repository::open(&root, identity()).expect("open");
        for (id, status) in [
            ("running", "running"),
            ("succeeded", "succeeded"),
            ("failed", "failed"),
            ("canceled", "canceled"),
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
                    created_at: "2026-01-01".into(),
                    updated_at: "2026-01-01".into(),
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
                json!({"operation_id":"running","status":"canceled"}),
                json!({"operation_id":"succeeded","status":"succeeded"}),
            ]
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
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
