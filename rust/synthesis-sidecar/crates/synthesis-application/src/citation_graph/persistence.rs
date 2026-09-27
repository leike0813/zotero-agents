use crate::ports::RepositoryPort;
use synthesis_repository::{
    CitationComplexMetricsRecord, CitationEdgeRecord, CitationGraphApplicationStateRecord,
    CitationGraphPromotionCommit, CitationGraphPromotionResult, CitationLayoutRecord,
    CitationNodeRecord, OperationQuery, OperationRecord, Repository,
};

pub(super) fn state(
    repository: &RepositoryPort,
) -> Result<Option<CitationGraphApplicationStateRecord>, String> {
    repository.with_reader(Repository::get_citation_graph_application_state)
}

pub(super) fn graph(
    repository: &RepositoryPort,
) -> Result<(Vec<CitationNodeRecord>, Vec<CitationEdgeRecord>), String> {
    repository.with_reader(|repository| {
        Ok((
            repository.list_citation_nodes()?,
            repository.list_citation_edges()?,
        ))
    })
}

pub(super) fn ready_layout_presets(
    repository: &RepositoryPort,
    graph_hash: &str,
) -> Result<Vec<String>, String> {
    repository.with_reader(|repository| repository.list_ready_citation_layout_presets(graph_hash))
}

pub(super) fn insert_operation(
    repository: &RepositoryPort,
    operation: &OperationRecord,
) -> Result<(), String> {
    repository.with_writer(|repository| repository.upsert_operation(operation))
}

pub(super) fn update_operation(
    repository: &RepositoryPort,
    operation_id: &str,
    status: &str,
    phase: &str,
    diagnostics: &[String],
    now: &str,
) -> Result<(), String> {
    repository.with_writer(|repository| {
        repository.update_operation_status(operation_id, status, phase, diagnostics, now)?;
        Ok(())
    })
}

pub(super) fn commit_graph(
    repository: &RepositoryPort,
    commit: &CitationGraphPromotionCommit,
) -> Result<CitationGraphPromotionResult, String> {
    repository.with_writer(|repository| repository.commit_citation_graph_promotion(commit))
}

pub(super) fn promote_metrics(
    repository: &RepositoryPort,
    expected_graph_hash: &str,
    metrics_hash: &str,
    records: &[CitationComplexMetricsRecord],
    now: &str,
) -> Result<bool, String> {
    repository.with_writer(|repository| {
        repository.promote_citation_complex_metrics(expected_graph_hash, metrics_hash, records, now)
    })
}

pub(super) fn promote_layout(
    repository: &RepositoryPort,
    expected_graph_hash: &str,
    layout: &CitationLayoutRecord,
) -> Result<bool, String> {
    repository
        .with_writer(|repository| repository.promote_citation_layout(expected_graph_hash, layout))
}

pub(super) fn latest_failed_rebuild_type(
    repository: &RepositoryPort,
) -> Result<Option<String>, String> {
    repository.with_reader(|repository| {
        Ok(repository
            .list_operations(&OperationQuery {
                statuses: vec!["failed".into()],
                operation_types: vec![
                    "citation_graph_cache_rebuild".into(),
                    "citation_graph_cache_incremental_refresh".into(),
                ],
                include_completed: true,
                limit: 1,
                ..OperationQuery::default()
            })?
            .into_iter()
            .next()
            .map(|operation| operation.operation_type))
    })
}
