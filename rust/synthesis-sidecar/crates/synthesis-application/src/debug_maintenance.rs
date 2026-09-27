use crate::admission::{AdmissionError, SingleFlightAdmission};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Duration;
use synthesis_repository::{
    CacheBasisRecord, DebugProjection, DebugRepositoryBasis, DebugSchemaSummary, OperationRecord,
};

pub const DEBUG_MAINTENANCE_SCHEMA_ID: &str = "synthesis.debug-maintenance.v1";
pub const DEBUG_PAGE_LIMIT: usize = 1_000;
pub const MAINTENANCE_PAGE_LIMIT: usize = 100;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugDiagnostic {
    pub code: String,
    pub severity: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugPage<T> {
    pub items: Vec<T>,
    pub cursor: String,
    pub next_cursor: Option<String>,
    pub limit: usize,
    pub truncated: bool,
    pub diagnostics: Vec<DebugDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugCacheItem {
    pub cache_key: String,
    pub cache_kind: String,
    pub status: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugOperationItem {
    pub operation_id: String,
    pub operation_type: String,
    pub status: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugTopicInspection {
    pub topic_id: String,
    pub status: String,
    pub manifest_hash: Option<String>,
    pub artifact_hash: Option<String>,
    pub metadata_hash: Option<String>,
    pub section_count: usize,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugTopicDescriptor {
    pub topic_id: String,
    pub status: String,
    pub manifest_hash: Option<String>,
    pub artifact_hash: Option<String>,
    pub metadata_hash: Option<String>,
    pub section_count: usize,
    pub diagnostics: Vec<DebugDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugSnapshot {
    pub schema_id: String,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub basis: Option<DebugRepositoryBasis>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema: Option<DebugSchemaSummary>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub caches: Option<DebugPage<DebugCacheItem>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operations: Option<DebugPage<DebugOperationItem>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub topics: Option<DebugPage<DebugTopicDescriptor>>,
    pub diagnostics: Vec<DebugDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugSnapshotDiff {
    pub added: Vec<String>,
    pub removed: Vec<String>,
    pub changed: Vec<String>,
    pub diagnostics: Vec<DebugDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugProfilerResult {
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub samples: Option<DebugPage<Value>>,
    pub diagnostics: Vec<DebugDiagnostic>,
}

pub trait DebugMaintenanceRepositoryPort: Send + Sync {
    fn capture(&self) -> Result<DebugProjection, String>;
}

pub trait DebugCanonicalPort: Send + Sync {
    fn inspect(&self, topic_id: &str) -> Result<DebugTopicInspection, String>;
}

pub trait DebugProfilerPort: Send + Sync {
    fn inspect(&self) -> Result<DebugProfilerResult, String>;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DebugMaintenanceKind {
    Checkpoint,
    Durable,
    Reset,
}

impl DebugMaintenanceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Checkpoint => "checkpoint",
            Self::Durable => "durable",
            Self::Reset => "reset",
        }
    }
}

pub trait DebugMaintenanceOperationPort: Send + Sync {
    fn run(&self, kind: DebugMaintenanceKind, request: &Value) -> Result<Value, String>;
    fn supports(&self, kind: DebugMaintenanceKind) -> bool;
}

pub struct DebugMaintenanceApplication {
    repository: Arc<dyn DebugMaintenanceRepositoryPort>,
    canonical: Arc<dyn DebugCanonicalPort>,
    profiler: Option<Arc<dyn DebugProfilerPort>>,
    maintenance: Option<Arc<dyn DebugMaintenanceOperationPort>>,
    admission: SingleFlightAdmission,
}

impl DebugMaintenanceApplication {
    pub fn new(
        repository: Arc<dyn DebugMaintenanceRepositoryPort>,
        canonical: Arc<dyn DebugCanonicalPort>,
    ) -> Self {
        Self {
            repository,
            canonical,
            profiler: None,
            maintenance: None,
            admission: SingleFlightAdmission::new(),
        }
    }

    pub fn with_ports(
        mut self,
        profiler: Option<Arc<dyn DebugProfilerPort>>,
        maintenance: Option<Arc<dyn DebugMaintenanceOperationPort>>,
    ) -> Self {
        self.profiler = profiler;
        self.maintenance = maintenance;
        self
    }

    pub fn snapshot(&self) -> Result<DebugSnapshot, String> {
        let first = self.repository.capture()?;
        let mut topics = first.topic_ids.clone();
        topics.sort();
        topics.dedup();
        topics.truncate(DEBUG_PAGE_LIMIT);
        let topics = topics
            .into_iter()
            .map(|topic_id| {
                let inspected = self.canonical.inspect(&topic_id)?;
                Ok(DebugTopicDescriptor {
                    topic_id,
                    status: inspected.status,
                    manifest_hash: inspected.manifest_hash,
                    artifact_hash: inspected.artifact_hash,
                    metadata_hash: inspected.metadata_hash,
                    section_count: inspected.section_count,
                    diagnostics: inspected
                        .diagnostics
                        .into_iter()
                        .map(|code| DebugDiagnostic {
                            code,
                            severity: "warning".into(),
                        })
                        .collect(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let second = self.repository.capture()?;
        if first.basis != second.basis {
            return Ok(DebugSnapshot {
                schema_id: DEBUG_MAINTENANCE_SCHEMA_ID.into(),
                status: "superseded".into(),
                diagnostics: vec![DebugDiagnostic {
                    code: "repository_basis_superseded".into(),
                    severity: "info".into(),
                }],
                ..DebugSnapshot::default()
            });
        }
        let mut caches = first.caches.into_iter().map(cache_item).collect::<Vec<_>>();
        caches.sort_by(|left, right| left.cache_key.cmp(&right.cache_key));
        let mut operations = first
            .operations
            .into_iter()
            .map(operation_item)
            .collect::<Vec<_>>();
        operations.sort_by(|left, right| left.operation_id.cmp(&right.operation_id));
        Ok(DebugSnapshot {
            schema_id: DEBUG_MAINTENANCE_SCHEMA_ID.into(),
            status: "ready".into(),
            basis: Some(first.basis),
            schema: Some(first.schema),
            caches: Some(debug_page(caches, "", DEBUG_PAGE_LIMIT, true)?),
            operations: Some(debug_page(operations, "", DEBUG_PAGE_LIMIT, true)?),
            topics: Some(debug_page(topics, "", DEBUG_PAGE_LIMIT, true)?),
            diagnostics: Vec::new(),
        })
    }

    pub fn inspect_topic(&self, topic_id: &str) -> Result<DebugTopicInspection, String> {
        self.canonical.inspect(topic_id)
    }

    pub fn diff(
        &self,
        before: &DebugSnapshot,
        after: &DebugSnapshot,
    ) -> Result<DebugSnapshotDiff, String> {
        let left = project(before)?;
        let right = project(after)?;
        Ok(DebugSnapshotDiff {
            added: right
                .keys()
                .filter(|key| !left.contains_key(*key))
                .cloned()
                .collect(),
            removed: left
                .keys()
                .filter(|key| !right.contains_key(*key))
                .cloned()
                .collect(),
            changed: right
                .iter()
                .filter(|(key, value)| left.get(*key).is_some_and(|left| left != *value))
                .map(|(key, _)| key.clone())
                .collect(),
            diagnostics: Vec::new(),
        })
    }

    pub fn inspect_profiler(&self) -> Result<DebugProfilerResult, String> {
        if let Some(profiler) = &self.profiler {
            profiler.inspect()
        } else {
            Ok(DebugProfilerResult {
                status: "unavailable".into(),
                samples: None,
                diagnostics: Vec::new(),
            })
        }
    }

    pub fn run_maintenance(
        &self,
        kind: DebugMaintenanceKind,
        request: &Value,
    ) -> Result<Value, String> {
        let _lease = self.admission.admit().map_err(admission_code)?;
        let maintenance = self
            .maintenance
            .as_ref()
            .filter(|port| port.supports(kind))
            .ok_or_else(|| "unsupported_operation".to_owned())?;
        maintenance.run(kind, request)
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        self.admission.shutdown(timeout, "debug_maintenance")
    }
}

pub fn debug_page<T: Clone>(
    items: Vec<T>,
    cursor: &str,
    requested_limit: usize,
    debug: bool,
) -> Result<DebugPage<T>, String> {
    let maximum = if debug {
        DEBUG_PAGE_LIMIT
    } else {
        MAINTENANCE_PAGE_LIMIT
    };
    let limit = requested_limit.clamp(1, maximum);
    let offset = if cursor.is_empty() {
        0
    } else {
        let parsed = cursor
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned())?;
        if parsed.to_string() != cursor {
            return Err("invalid_request".into());
        }
        parsed
    };
    let page_items = items
        .iter()
        .skip(offset)
        .take(limit)
        .cloned()
        .collect::<Vec<_>>();
    let next_offset = offset + page_items.len();
    Ok(DebugPage {
        items: page_items,
        cursor: cursor.into(),
        next_cursor: (next_offset < items.len()).then(|| next_offset.to_string()),
        limit,
        truncated: next_offset < items.len(),
        diagnostics: Vec::new(),
    })
}

fn cache_item(record: CacheBasisRecord) -> DebugCacheItem {
    DebugCacheItem {
        cache_key: record.cache_key,
        cache_kind: record.cache_kind,
        status: record.status,
        updated_at: record.updated_at,
    }
}

fn operation_item(record: OperationRecord) -> DebugOperationItem {
    DebugOperationItem {
        operation_id: record.operation_id,
        operation_type: record.operation_type,
        status: record.status,
        updated_at: record.updated_at,
    }
}

fn project(snapshot: &DebugSnapshot) -> Result<BTreeMap<String, Value>, String> {
    if snapshot.status != "ready" {
        return Err("invalid_request".into());
    }
    let mut result = BTreeMap::new();
    for item in snapshot
        .caches
        .as_ref()
        .ok_or_else(|| "invalid_request".to_owned())?
        .items
        .iter()
    {
        result.insert(
            format!("cache:{}", item.cache_key),
            serde_json::to_value(item).map_err(|_| "invalid_request".to_owned())?,
        );
    }
    for item in snapshot
        .operations
        .as_ref()
        .ok_or_else(|| "invalid_request".to_owned())?
        .items
        .iter()
    {
        result.insert(
            format!("operation:{}", item.operation_id),
            serde_json::to_value(item).map_err(|_| "invalid_request".to_owned())?,
        );
    }
    for item in snapshot
        .topics
        .as_ref()
        .ok_or_else(|| "invalid_request".to_owned())?
        .items
        .iter()
    {
        result.insert(
            format!("topic:{}", item.topic_id),
            serde_json::to_value(item).map_err(|_| "invalid_request".to_owned())?,
        );
    }
    Ok(result)
}

fn admission_code(error: AdmissionError) -> String {
    match error {
        AdmissionError::Busy => "busy".into(),
        AdmissionError::Stopping => "stopping".into(),
        AdmissionError::Unavailable => "debug_maintenance_unavailable".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct RepositoryProjection {
        capture: DebugProjection,
    }

    impl DebugMaintenanceRepositoryPort for RepositoryProjection {
        fn capture(&self) -> Result<DebugProjection, String> {
            Ok(self.capture.clone())
        }
    }

    struct Canonical;

    impl DebugCanonicalPort for Canonical {
        fn inspect(&self, topic_id: &str) -> Result<DebugTopicInspection, String> {
            Ok(DebugTopicInspection {
                topic_id: topic_id.into(),
                status: "absent".into(),
                ..DebugTopicInspection::default()
            })
        }
    }

    struct Maintenance(Mutex<usize>);

    impl DebugMaintenanceOperationPort for Maintenance {
        fn run(&self, kind: DebugMaintenanceKind, request: &Value) -> Result<Value, String> {
            *self.0.lock().expect("count") += 1;
            Ok(serde_json::json!({"kind":kind.as_str(),"request":request}))
        }

        fn supports(&self, _kind: DebugMaintenanceKind) -> bool {
            true
        }
    }

    #[test]
    fn snapshot_is_bounded_sorted_and_maintenance_is_delegated() {
        let repository = Arc::new(RepositoryProjection {
            capture: DebugProjection {
                basis: DebugRepositoryBasis {
                    schema_version: "repository.v1".into(),
                    revision: "one".into(),
                },
                schema: DebugSchemaSummary {
                    schema_version: "repository.v1".into(),
                    aggregate_count: 10,
                    diagnostics: Vec::new(),
                },
                topic_ids: vec!["topic-b".into(), "topic-a".into()],
                ..DebugProjection::default()
            },
        });
        let application = DebugMaintenanceApplication::new(repository, Arc::new(Canonical))
            .with_ports(None, Some(Arc::new(Maintenance(Mutex::new(0)))));
        let snapshot = application.snapshot().expect("snapshot");
        assert_eq!(snapshot.status, "ready");
        assert_eq!(
            snapshot.topics.expect("topics").items[0].topic_id,
            "topic-a"
        );
        assert_eq!(
            application
                .run_maintenance(DebugMaintenanceKind::Checkpoint, &serde_json::json!({}))
                .expect("maintenance")["kind"],
            "checkpoint"
        );
    }
}
