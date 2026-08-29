use crate::dto::{
    BackgroundJob, CacheReadiness, JobProgress, WorkbenchChrome, WorkbenchMaintenance,
    WorkbenchProjection, WorkbenchSurface, WorkbenchSurfaceRequest,
};
use crate::ports::{WorkbenchRepositoryPort, WorkbenchSurfacePort};
use serde_json::{Value, json};
use std::sync::Arc;
use synthesis_repository::{CacheBasisRecord, OperationQuery, OperationRecord};

const RUNNING_LIMIT: usize = 50;
const FAILED_LIMIT: usize = 20;
const CACHE_DESCRIPTORS: [(&str, &str); 2] = [
    ("reference-sidecar:library", "reference-sidecar"),
    ("citation-graph:library", "citation_graph"),
];

pub struct WorkbenchApplication {
    repository: Arc<dyn WorkbenchRepositoryPort>,
}

impl WorkbenchApplication {
    pub fn new(repository: Arc<dyn WorkbenchRepositoryPort>) -> Self {
        Self { repository }
    }

    pub fn read(&self) -> Result<WorkbenchChrome, String> {
        let caches = CACHE_DESCRIPTORS
            .iter()
            .map(|(key, _)| self.repository.get_cache_basis(key))
            .collect::<Result<Vec<_>, _>>()?;
        let running = self.repository.list_operations(&OperationQuery {
            statuses: vec!["running".into()],
            include_completed: true,
            limit: RUNNING_LIMIT,
            ..OperationQuery::default()
        })?;
        let failed = self.repository.list_operations(&OperationQuery {
            statuses: vec!["failed".into()],
            operation_types: vec![
                "reference_sidecar_refresh".into(),
                "citation_graph_cache_rebuild".into(),
            ],
            include_completed: true,
            limit: FAILED_LIMIT,
            ..OperationQuery::default()
        })?;
        let mut jobs = running
            .into_iter()
            .chain(
                failed
                    .into_iter()
                    .filter(|row| current_failure(row, &caches)),
            )
            .filter_map(project_job)
            .collect::<Vec<_>>();
        jobs.sort_by(|left, right| {
            right
                .updated_at
                .cmp(&left.updated_at)
                .then_with(|| left.job_id.cmp(&right.job_id))
        });
        Ok(WorkbenchChrome {
            maintenance: WorkbenchMaintenance {
                cache_readiness: CACHE_DESCRIPTORS
                    .iter()
                    .zip(caches)
                    .map(|((cache_key, cache_kind), row)| CacheReadiness {
                        cache_key: (*cache_key).into(),
                        cache_kind: (*cache_kind).into(),
                        status: row
                            .as_ref()
                            .map(|row| row.status.clone())
                            .filter(|status| {
                                matches!(
                                    status.as_str(),
                                    "missing" | "ready" | "stale" | "refreshing" | "failed"
                                )
                            })
                            .unwrap_or_else(|| "missing".into()),
                        refreshed_at: row
                            .as_ref()
                            .map(|row| row.refreshed_at.clone())
                            .unwrap_or_default(),
                        updated_at: row
                            .as_ref()
                            .map(|row| row.updated_at.clone())
                            .unwrap_or_default(),
                        stale_reason: row
                            .as_ref()
                            .map(|row| row.stale_reason.clone())
                            .unwrap_or_default(),
                    })
                    .collect(),
                background_jobs: jobs,
            },
        })
    }

    pub fn read_json(&self) -> Result<Value, String> {
        serde_json::to_value(self.read()?).map_err(|_| "workbench_projection_invalid".into())
    }

    pub fn read_public_chrome(&self) -> Result<WorkbenchProjection, String> {
        let chrome = self.read()?;
        let reference = chrome
            .maintenance
            .cache_readiness
            .iter()
            .find(|cache| cache.cache_key == "reference-sidecar:library");
        let citation = chrome
            .maintenance
            .cache_readiness
            .iter()
            .find(|cache| cache.cache_key == "citation-graph:library");
        let caches = [reference, citation];
        let missing = cache_keys_with_status(&caches, "missing");
        let stale = cache_keys_with_status(&caches, "stale");
        let failed = cache_keys_with_status(&caches, "failed");
        let active_jobs = chrome
            .maintenance
            .background_jobs
            .iter()
            .filter(|job| job.status != "failed")
            .collect::<Vec<_>>();
        let partial = if missing.len() == 1 {
            missing.clone()
        } else {
            Vec::new()
        };
        let status = if !active_jobs.is_empty() {
            "running"
        } else if !failed.is_empty() {
            "failed"
        } else if missing.len() > 1 {
            "missing"
        } else if !partial.is_empty() {
            "partial"
        } else if !stale.is_empty() {
            "stale"
        } else {
            "ready"
        };
        let mut recommended_commands = Vec::new();
        if reference.is_some_and(rebuild_recommended) {
            recommended_commands.push("refreshReferenceSidecarNow");
        }
        if citation.is_some_and(rebuild_recommended) {
            recommended_commands.push("rebuildCitationGraphCache");
        }
        let latest_reference = latest_cache_timestamp(reference);
        let latest_citation = latest_cache_timestamp(citation);
        Ok(WorkbenchProjection(json!({
            "maintenance":{
                "summary":{
                    "status":status,
                    "latestUsable":{
                        "referenceSidecar":latest_reference.map(|updated_at|json!({"updated_at":updated_at})),
                        "citationGraph":latest_citation.map(|updated_at|json!({"updated_at":updated_at})),
                    },
                    "pendingDirtyCount":0,
                    "activeWorkerCount":active_jobs.len(),
                    "activeWorkerKind":active_jobs.first().map(|job|job.source.as_str()),
                    "canonicalSyncPending":false,
                    "canonicalEpoch":0,
                    "stale":stale,
                    "partial":partial,
                    "missing":missing,
                    "recommendedCommands":recommended_commands,
                    "diagnostics":[],
                },
                "backgroundJobs":chrome.maintenance.background_jobs,
            },
        })))
    }

    pub fn background_jobs(&self) -> Result<Vec<BackgroundJob>, String> {
        Ok(self.read()?.maintenance.background_jobs)
    }

    pub fn read_surface(
        &self,
        request: &WorkbenchSurfaceRequest,
        surfaces: &dyn WorkbenchSurfacePort,
    ) -> Result<WorkbenchProjection, String> {
        let value = match request.surface {
            WorkbenchSurface::Home => surfaces.home(&request.state),
            WorkbenchSurface::Topics => surfaces.topics(&request.state),
            WorkbenchSurface::Index => surfaces.index(&request.state),
            WorkbenchSurface::Graph => surfaces.graph(&request.state),
            WorkbenchSurface::Tags => surfaces.tags(&request.state),
            WorkbenchSurface::Concepts => surfaces.concepts(&request.state),
            WorkbenchSurface::Reader => surfaces.reader(&request.state),
            WorkbenchSurface::Review => match active_review_tab(&request.state)? {
                "reference_matching" => surfaces.reference_review(&request.state),
                "topic_graph" => surfaces.topic_graph_review(&request.state),
                "concepts" => surfaces.concept_review(&request.state),
                _ => unreachable!("active_review_tab validates the closed tab set"),
            },
        }?;
        Ok(WorkbenchProjection(value))
    }
}

fn cache_keys_with_status(caches: &[Option<&CacheReadiness>], status: &str) -> Vec<String> {
    caches
        .iter()
        .flatten()
        .filter(|cache| cache.status == status)
        .map(|cache| cache.cache_key.clone())
        .collect()
}

fn rebuild_recommended(cache: &CacheReadiness) -> bool {
    matches!(cache.status.as_str(), "missing" | "stale" | "failed")
}

fn latest_cache_timestamp(cache: Option<&CacheReadiness>) -> Option<&str> {
    cache
        .map(|cache| {
            if cache.refreshed_at.is_empty() {
                cache.updated_at.as_str()
            } else {
                cache.refreshed_at.as_str()
            }
        })
        .filter(|value| !value.is_empty())
}

fn active_review_tab(state: &Value) -> Result<&str, String> {
    let tab = state
        .get("reviews")
        .and_then(Value::as_object)
        .and_then(|reviews| {
            reviews
                .get("activeTab")
                .or_else(|| reviews.get("active_tab"))
        })
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("reference_matching");
    if matches!(tab, "reference_matching" | "topic_graph" | "concepts") {
        Ok(tab)
    } else {
        Err("invalid_request".into())
    }
}

fn related_cache_key(operation_type: &str) -> Option<&'static str> {
    match operation_type {
        "reference_sidecar_refresh" => Some("reference-sidecar:library"),
        "citation_graph_cache_rebuild" | "citation_graph_cache_incremental_refresh" => {
            Some("citation-graph:library")
        }
        _ => None,
    }
}

fn current_failure(row: &OperationRecord, caches: &[Option<CacheBasisRecord>]) -> bool {
    let Some(cache_key) = related_cache_key(&row.operation_type) else {
        return true;
    };
    let Some(cache) = CACHE_DESCRIPTORS
        .iter()
        .position(|(key, _)| *key == cache_key)
        .and_then(|index| caches.get(index))
        .and_then(Option::as_ref)
    else {
        return true;
    };
    if cache.status == "failed" {
        return true;
    }
    let cache_updated = if cache.refreshed_at.is_empty() {
        &cache.updated_at
    } else {
        &cache.refreshed_at
    };
    let operation_updated = if row.updated_at.is_empty() {
        &row.completed_at
    } else {
        &row.updated_at
    };
    !operation_updated.is_empty() && operation_updated > cache_updated
}

fn project_job(row: OperationRecord) -> Option<BackgroundJob> {
    if row.operation_id.trim().is_empty() {
        return None;
    }
    let source = match row.operation_type.as_str() {
        "reference_sidecar_refresh"
        | "citation_graph_cache_rebuild"
        | "citation_graph_layout"
        | "webdav_sync"
        | "canonical_maintenance" => row.operation_type.clone(),
        _ => "operation".into(),
    };
    let total = row.total_count.max(0);
    let current = row.processed_count.max(0).min(total);
    let progress_label = [&row.phase_label, &row.message]
        .into_iter()
        .find(|value| !value.trim().is_empty())
        .cloned()
        .unwrap_or_default();
    let progress = if row.progress_mode == "determinate" && total > 0 {
        JobProgress::Determinate {
            percent: ((current as f64 / total as f64) * 100.0).round() as i64,
            current,
            total,
            label: progress_label,
        }
    } else {
        JobProgress::Indeterminate {
            label: progress_label,
        }
    };
    Some(BackgroundJob {
        job_id: row.operation_id.clone(),
        source,
        status: if row.status == "running" {
            "running".into()
        } else {
            "failed".into()
        },
        label: if row.label.trim().is_empty() {
            row.operation_id
        } else {
            row.label
        },
        detail: [&row.message, &row.phase_label, &row.phase]
            .into_iter()
            .find(|value| !value.trim().is_empty())
            .cloned()
            .unwrap_or_default(),
        updated_at: if !row.updated_at.is_empty() {
            row.updated_at
        } else if !row.completed_at.is_empty() {
            row.completed_at
        } else if !row.started_at.is_empty() {
            row.started_at
        } else {
            row.created_at
        },
        progress,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use std::sync::Mutex;

    #[derive(Default)]
    struct FixtureRepository {
        caches: BTreeMap<String, CacheBasisRecord>,
        operations: Mutex<Vec<OperationRecord>>,
    }

    impl WorkbenchRepositoryPort for FixtureRepository {
        fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String> {
            Ok(self.caches.get(cache_key).cloned())
        }

        fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String> {
            let mut rows = self
                .operations
                .lock()
                .expect("operations")
                .iter()
                .filter(|row| {
                    (query.statuses.is_empty() || query.statuses.contains(&row.status))
                        && (query.operation_types.is_empty()
                            || query.operation_types.contains(&row.operation_type))
                })
                .cloned()
                .collect::<Vec<_>>();
            rows.sort_by(|left, right| {
                right
                    .updated_at
                    .cmp(&left.updated_at)
                    .then_with(|| left.operation_id.cmp(&right.operation_id))
            });
            rows.truncate(query.limit);
            Ok(rows)
        }
    }

    #[derive(Default)]
    struct RecordingSurfaces {
        calls: Mutex<Vec<&'static str>>,
    }

    impl RecordingSurfaces {
        fn record(&self, name: &'static str) -> Result<Value, String> {
            self.calls.lock().expect("calls").push(name);
            Ok(json!({"surface":name}))
        }
    }

    impl WorkbenchSurfacePort for RecordingSurfaces {
        fn home(&self, _state: &Value) -> Result<Value, String> {
            self.record("home")
        }
        fn topics(&self, _state: &Value) -> Result<Value, String> {
            self.record("topics")
        }
        fn index(&self, _state: &Value) -> Result<Value, String> {
            self.record("index")
        }
        fn reference_review(&self, _state: &Value) -> Result<Value, String> {
            self.record("reference_review")
        }
        fn topic_graph_review(&self, _state: &Value) -> Result<Value, String> {
            self.record("topic_graph_review")
        }
        fn concept_review(&self, _state: &Value) -> Result<Value, String> {
            self.record("concept_review")
        }
        fn graph(&self, _state: &Value) -> Result<Value, String> {
            self.record("graph")
        }
        fn tags(&self, _state: &Value) -> Result<Value, String> {
            self.record("tags")
        }
        fn concepts(&self, _state: &Value) -> Result<Value, String> {
            self.record("concepts")
        }
        fn reader(&self, _state: &Value) -> Result<Value, String> {
            self.record("reader")
        }
    }

    #[test]
    fn surface_reads_call_only_the_selected_domain_and_active_review_tab() {
        let application = WorkbenchApplication::new(Arc::new(FixtureRepository::default()));
        let surfaces = RecordingSurfaces::default();

        for (surface, expected) in [
            (WorkbenchSurface::Home, "home"),
            (WorkbenchSurface::Topics, "topics"),
            (WorkbenchSurface::Index, "index"),
            (WorkbenchSurface::Graph, "graph"),
            (WorkbenchSurface::Tags, "tags"),
            (WorkbenchSurface::Concepts, "concepts"),
            (WorkbenchSurface::Reader, "reader"),
        ] {
            let projection = application
                .read_surface(
                    &WorkbenchSurfaceRequest {
                        surface,
                        state: json!({}),
                    },
                    &surfaces,
                )
                .expect(expected);
            assert_eq!(projection.0, json!({"surface":expected}));
            assert_eq!(*surfaces.calls.lock().expect("calls"), vec![expected]);
            surfaces.calls.lock().expect("calls").clear();
        }

        for (tab, expected) in [
            ("reference_matching", "reference_review"),
            ("topic_graph", "topic_graph_review"),
            ("concepts", "concept_review"),
        ] {
            let projection = application
                .read_surface(
                    &WorkbenchSurfaceRequest {
                        surface: WorkbenchSurface::Review,
                        state: json!({"reviews":{"activeTab":tab}}),
                    },
                    &surfaces,
                )
                .expect(expected);
            assert_eq!(projection.0, json!({"surface":expected}));
            assert_eq!(*surfaces.calls.lock().expect("calls"), vec![expected]);
            surfaces.calls.lock().expect("calls").clear();
        }

        assert_eq!(
            application.read_surface(
                &WorkbenchSurfaceRequest {
                    surface: WorkbenchSurface::Review,
                    state: json!({"reviews":{"activeTab":"unknown"}}),
                },
                &surfaces,
            ),
            Err("invalid_request".into())
        );
        assert!(surfaces.calls.lock().expect("calls").is_empty());
    }

    #[test]
    fn empty_projection_has_two_fixed_cache_descriptors() {
        let application = WorkbenchApplication::new(Arc::new(FixtureRepository::default()));
        let result = application.read().expect("read");
        assert_eq!(result.maintenance.cache_readiness.len(), 2);
        assert!(
            result
                .maintenance
                .cache_readiness
                .iter()
                .all(|row| row.status == "missing")
        );
        assert!(result.maintenance.background_jobs.is_empty());
    }

    #[test]
    fn suppresses_old_failure_and_projects_deterministic_progress() {
        let repository = FixtureRepository {
            caches: BTreeMap::from([(
                "reference-sidecar:library".into(),
                CacheBasisRecord {
                    cache_key: "reference-sidecar:library".into(),
                    cache_kind: "reference-sidecar".into(),
                    status: "ready".into(),
                    refreshed_at: "2026-07-26T00:10:00.000Z".into(),
                    ..CacheBasisRecord::default()
                },
            )]),
            operations: Mutex::new(vec![
                OperationRecord {
                    operation_id: "old-failure".into(),
                    operation_type: "reference_sidecar_refresh".into(),
                    status: "failed".into(),
                    updated_at: "2026-07-26T00:05:00.000Z".into(),
                    ..OperationRecord::default()
                },
                OperationRecord {
                    operation_id: "running-b".into(),
                    operation_type: "canonical_maintenance".into(),
                    status: "running".into(),
                    label: "Maintenance".into(),
                    phase_label: "Index".into(),
                    progress_mode: "determinate".into(),
                    processed_count: 3,
                    total_count: 4,
                    updated_at: "2026-07-26T00:20:00.000Z".into(),
                    ..OperationRecord::default()
                },
                OperationRecord {
                    operation_id: "running-a".into(),
                    operation_type: "fixture".into(),
                    status: "running".into(),
                    updated_at: "2026-07-26T00:20:00.000Z".into(),
                    ..OperationRecord::default()
                },
            ]),
        };
        let result = WorkbenchApplication::new(Arc::new(repository))
            .read()
            .expect("read");
        assert_eq!(
            result
                .maintenance
                .background_jobs
                .iter()
                .map(|row| row.job_id.as_str())
                .collect::<Vec<_>>(),
            vec!["running-a", "running-b"]
        );
        assert_eq!(
            result.maintenance.background_jobs[1].progress,
            JobProgress::Determinate {
                percent: 75,
                current: 3,
                total: 4,
                label: "Index".into(),
            }
        );
    }

    #[test]
    fn enforces_independent_fifty_and_twenty_bounds() {
        let operations = (0..80)
            .map(|index| OperationRecord {
                operation_id: format!("running-{index:03}"),
                operation_type: "fixture".into(),
                status: "running".into(),
                updated_at: format!("2026-07-26T00:{:02}:00.000Z", index % 60),
                ..OperationRecord::default()
            })
            .chain((0..30).map(|index| OperationRecord {
                operation_id: format!("failed-{index:03}"),
                operation_type: "citation_graph_cache_rebuild".into(),
                status: "failed".into(),
                updated_at: format!("2026-07-26T01:{index:02}:00.000Z"),
                ..OperationRecord::default()
            }))
            .collect();
        let application = WorkbenchApplication::new(Arc::new(FixtureRepository {
            operations: Mutex::new(operations),
            ..FixtureRepository::default()
        }));
        assert_eq!(
            application
                .read()
                .expect("read")
                .maintenance
                .background_jobs
                .len(),
            70
        );
    }
}
