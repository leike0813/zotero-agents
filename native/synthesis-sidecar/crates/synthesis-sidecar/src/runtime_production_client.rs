use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use crate::runtime_capabilities::ServeState;
use crate::runtime_deadline::with_request_context;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, child_observation_context, debug_events_enabled, emit_debug,
    with_observation_context,
};
use crate::runtime_public_maintenance_operation::{
    PublicMaintenanceBasis, decode_basis, with_operation_context,
};
use crate::runtime_webdav_maintenance_surface::{
    begin_public_maintenance_operation, finish_public_maintenance_operation,
    mark_public_maintenance_running, observe_public_maintenance_accepted,
    public_maintenance_operation_dto,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_protocol::utc_now_iso8601;
use synthesis_repository::{RepositorySqlObservation, observe_repository_sql};
use synthesis_sidecar::production_capabilities::{
    ProductionClientDataPlane, ProductionClientReceipt, ProductionClientSemanticSuccess,
};
use synthesis_sidecar::runtime_contract::current_time_ms;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ClientArguments {
    args: Vec<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicApplyTransferControl {
    bundle: Value,
    asset_transfer: TopicApplyTransferReference,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicApplyTransferReference {
    session_id: String,
}

#[cfg(test)]
fn dispatched_production_client_capabilities() -> impl Iterator<Item = &'static str> {
    crate::runtime_topic_workbench_surface::dispatched_capabilities()
        .chain(crate::runtime_reference_citation_surface::dispatched_capabilities())
        .chain(crate::runtime_tag_surface::dispatched_capabilities())
        .chain(crate::runtime_concept_topic_graph_surface::dispatched_capabilities())
        .chain(crate::runtime_artifact_library_debug::dispatched_capabilities())
        .chain(crate::runtime_webdav_maintenance_surface::dispatched_capabilities())
}

fn dispatch_typed_client(
    apps: &crate::runtime_production_ports::ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    if let Some(result) = crate::runtime_topic_workbench_surface::dispatch(apps, capability, args) {
        return result;
    }
    if let Some(result) =
        crate::runtime_reference_citation_surface::dispatch(apps, capability, args)
    {
        return result;
    }
    if let Some(result) = crate::runtime_tag_surface::dispatch(apps, capability, args) {
        return result;
    }
    if let Some(result) =
        crate::runtime_concept_topic_graph_surface::dispatch(apps, capability, args)
    {
        return result;
    }
    if let Some(result) = crate::runtime_artifact_library_debug::dispatch(apps, capability, args) {
        return result;
    }
    if let Some(result) =
        crate::runtime_webdav_maintenance_surface::dispatch(apps, capability, args)
    {
        return result;
    }
    Err("operation_unavailable".into())
}

fn dispatch_artifact_export(state: &Arc<ServeState>, result: Value) -> Result<Value, String> {
    use crate::runtime_artifact_library_debug::{ArtifactExportDestination, ArtifactExportPlan};

    let ArtifactExportPlan {
        mut response,
        entries,
        destination,
    } = crate::runtime_artifact_library_debug::rebuild_export_plan(result)?;
    let entry_count = entries
        .as_array()
        .map(Vec::len)
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    let transfer_now_ms = current_time_ms()?;
    let published = state
        .transfer
        .lock()
        .map_err(|_| "transfer_unavailable".to_owned())?
        .publish_host_export_entries(
            "paper_artifacts.export_filtered",
            &json!({"entries":entries}),
            transfer_now_ms,
        )?;
    let session_id = published.session_id;
    let content_transfer = json!({
        "sessionId":session_id,
        "rootSha256":published.root_sha256,
    });
    let delivery = match &destination {
        ArtifactExportDestination::RunWorkspace { run_root } => state.applications.call_host(
            "delivery.export.materialize_run_workspace",
            json!({
                "capability":"paper_artifacts.export_filtered",
                "runRoot":run_root,
                "contentTransfer":content_transfer,
            }),
        ),
        ArtifactExportDestination::Archive { display_name } => state.applications.call_host(
            "delivery.export.publish_archive",
            json!({
                "capability":"paper_artifacts.export_filtered",
                "displayName":display_name,
                "contentTransfer":content_transfer,
            }),
        ),
    };
    let cleanup = state
        .transfer
        .lock()
        .map_err(|_| "transfer_unavailable".to_owned())?
        .handle_content(
            json!({"action":"cancel","sessionId":session_id}),
            transfer_now_ms,
        );
    let delivery = delivery?;
    cleanup?;
    match destination {
        ArtifactExportDestination::RunWorkspace { .. } => {
            if delivery.get("status").and_then(Value::as_str) != Some("materialized")
                || delivery.get("capability").and_then(Value::as_str)
                    != Some("paper_artifacts.export_filtered")
                || delivery.get("entryCount").and_then(Value::as_u64) != Some(entry_count as u64)
            {
                return Err("reverse_host_result_invalid".into());
            }
        }
        ArtifactExportDestination::Archive { display_name } => {
            if delivery.get("status").and_then(Value::as_str) != Some("available")
                || delivery.get("capability").and_then(Value::as_str)
                    != Some("paper_artifacts.export_filtered")
                || delivery
                    .pointer("/delivery/bundle/displayName")
                    .and_then(Value::as_str)
                    != Some(display_name.as_str())
            {
                return Err("unavailable".into());
            }
            response["delivery"] = delivery
                .get("delivery")
                .cloned()
                .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        }
    }
    Ok(response)
}

pub(crate) fn dispatch_production_client(
    state: &Arc<ServeState>,
    request_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let metadata = state
        .production_client_operations
        .get(capability)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let payload_bytes = serde_json::to_vec(&payload)
        .map_err(|_| "invalid_request".to_owned())?
        .len();
    if payload_bytes > metadata.request_bytes {
        return Err("request_too_large".into());
    }
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    let operation_args = if metadata.request_plane == ProductionClientDataPlane::Transfer
        && envelope
            .args
            .first()
            .is_some_and(|value| value.get("assetTransfer").is_some())
    {
        if capability != "client.applyTopicSynthesisResult" || envelope.args.len() != 1 {
            return Err("invalid_request".to_owned());
        }
        let control: TopicApplyTransferControl = serde_json::from_value(envelope.args[0].clone())
            .map_err(|_| "invalid_request".to_owned())?;
        let assets = state
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .topic_apply_assets(&control.asset_transfer.session_id)?;
        vec![json!({"bundle":control.bundle,"assets":assets})]
    } else if metadata.request_plane == ProductionClientDataPlane::Transfer
        && payload_bytes > metadata.control_target_bytes
    {
        return Err("request_too_large".to_owned());
    } else {
        envelope.args
    };
    if metadata.receipt == ProductionClientReceipt::PublicMaintenanceOperation {
        let work_deadline_ms = metadata
            .work_deadline_ms
            .ok_or_else(|| "invalid_production_operation_manifest".to_owned())?;
        return start_public_maintenance_operation(
            state,
            request_id,
            capability,
            operation_args,
            work_deadline_ms,
            metadata.semantic_success.clone(),
        );
    }
    let started_at = Instant::now();
    let (outcome, sql_observation) = observe_repository_sql(|| {
        with_request_context(
            Duration::from_millis(metadata.deadline_ms),
            debug_events_enabled().then_some(request_id),
            || {
                if capability == "client.controlPublicMaintenanceOperation" {
                    dispatch_public_maintenance_control(
                        state,
                        request_id,
                        capability,
                        &operation_args,
                    )
                } else {
                    let result =
                        dispatch_typed_client(&state.applications, capability, &operation_args)?;
                    if capability == "client.exportFilteredPaperArtifacts" {
                        dispatch_artifact_export(state, result)
                    } else {
                        Ok(result)
                    }
                }
            },
        )
    });
    emit_query_observation(capability, &outcome, sql_observation);
    let result = outcome?;
    record_semantic_mutation_result(
        capability,
        metadata.semantic_success.as_ref(),
        &result,
        started_at.elapsed(),
    );
    if started_at.elapsed() > Duration::from_millis(metadata.deadline_ms) {
        return Err("operation_timeout".into());
    }
    let result_bytes = serde_json::to_vec(&result)
        .map_err(|_| "production_projection_invalid".to_owned())?
        .len();
    let wire_result = if metadata.result_plane == ProductionClientDataPlane::Locator
        && result_bytes > metadata.control_target_bytes
    {
        state
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .publish_client_result(capability, &result, current_time_ms()?)?
    } else {
        result
    };
    if serde_json::to_vec(&wire_result)
        .map_err(|_| "production_projection_invalid".to_owned())?
        .len()
        > metadata.response_bytes
    {
        return Err("response_too_large".into());
    }
    Ok(wire_result)
}

fn dispatch_public_maintenance_control(
    state: &Arc<ServeState>,
    request_id: &str,
    capability: &str,
    operation_args: &[Value],
) -> Result<Value, String> {
    let result = crate::runtime_webdav_maintenance_surface::dispatch(
        state.applications.as_ref(),
        capability,
        operation_args,
    )
    .ok_or_else(|| "operation_unavailable".to_owned())??;
    let action = operation_args
        .first()
        .and_then(|value| value.get("action"))
        .and_then(Value::as_str);
    if matches!(action, Some("retry") | Some("continue"))
        && result.get("status").and_then(Value::as_str) == Some("pending")
    {
        let operation_id = result
            .get("operation_id")
            .and_then(Value::as_str)
            .ok_or_else(|| "production_projection_invalid".to_owned())?;
        let basis = state.applications.repository.with_reader(|repository| {
            let row = repository
                .get_operation(operation_id)?
                .ok_or_else(|| "operation_receipt_missing".to_owned())?;
            decode_basis(&row)
        })?;
        resume_public_maintenance_operation(state, request_id, operation_id, basis)?;
    }
    Ok(result)
}

fn resume_public_maintenance_operation(
    state: &Arc<ServeState>,
    request_id: &str,
    operation_id: &str,
    basis: PublicMaintenanceBasis,
) -> Result<(), String> {
    let semantic_success = state
        .production_client_operations
        .get(&basis.capability)
        .and_then(|metadata| metadata.semantic_success.clone());
    let applications = Arc::clone(&state.applications);
    let operation_id = operation_id.to_owned();
    let request_id = request_id.to_owned();
    observe_public_maintenance_accepted(state.applications.as_ref(), &operation_id)?;
    let worker_trace = child_observation_context();
    thread::Builder::new()
        .name("synthesis-maintenance-resume".into())
        .spawn(move || {
            with_observation_context(worker_trace.as_ref(), || {
                let started_at = utc_now_iso8601();
                if let Err(error) = mark_public_maintenance_running(
                    applications.as_ref(),
                    &operation_id,
                    &started_at,
                ) {
                    let _ = finish_public_maintenance_operation(
                        applications.as_ref(),
                        &operation_id,
                        Err(&error),
                        semantic_success.as_ref(),
                        &utc_now_iso8601(),
                    );
                    return;
                }
                let outcome = with_request_context(
                    Duration::from_millis(basis.deadline_ms),
                    debug_events_enabled().then_some(&request_id),
                    || {
                        with_operation_context(&operation_id, || {
                            dispatch_typed_client(
                                applications.as_ref(),
                                &basis.capability,
                                &basis.args,
                            )
                        })
                    },
                );
                let _ = finish_public_maintenance_operation(
                    applications.as_ref(),
                    &operation_id,
                    outcome.as_ref().map_err(String::as_str),
                    semantic_success.as_ref(),
                    &utc_now_iso8601(),
                );
            })
        })
        .map_err(|error| format!("operation_spawn_failed:{error}"))?;
    Ok(())
}

fn start_public_maintenance_operation(
    state: &Arc<ServeState>,
    request_id: &str,
    capability: &str,
    operation_args: Vec<Value>,
    work_deadline_ms: u64,
    semantic_success: Option<ProductionClientSemanticSuccess>,
) -> Result<Value, String> {
    let accepted_at = utc_now_iso8601();
    let source_hash = canonical_json_hash(&json!({
        "capability":capability,
        "args":operation_args,
    }))?;
    let identity_hash = canonical_json_hash(&json!({
        "capability":capability,
        "requestId":request_id,
        "acceptedAt":accepted_at,
    }))?;
    let operation_id = format!(
        "maintenance:{}:{}",
        capability.trim_start_matches("client."),
        &identity_hash["sha256:".len().."sha256:".len() + 24]
    );
    let accepted = begin_public_maintenance_operation(
        state.applications.as_ref(),
        &operation_id,
        capability,
        &operation_args,
        &source_hash,
        work_deadline_ms,
        &accepted_at,
    )?;
    let accepted_dto = public_maintenance_operation_dto(&accepted)?;
    let applications = Arc::clone(&state.applications);
    let operation_id_for_worker = operation_id.clone();
    let capability_for_worker = capability.to_owned();
    let request_id_for_worker = request_id.to_owned();
    let semantic_success_for_worker = semantic_success.clone();
    let worker_trace = child_observation_context();
    let spawn_result = thread::Builder::new()
        .name(format!(
            "synthesis-maintenance-{}",
            &identity_hash["sha256:".len().."sha256:".len() + 8]
        ))
        .spawn(move || {
            with_observation_context(worker_trace.as_ref(), || {
                let started_at = utc_now_iso8601();
                if let Err(error) = mark_public_maintenance_running(
                    applications.as_ref(),
                    &operation_id_for_worker,
                    &started_at,
                ) {
                    let _ = finish_public_maintenance_operation(
                        applications.as_ref(),
                        &operation_id_for_worker,
                        Err(&error),
                        semantic_success_for_worker.as_ref(),
                        &utc_now_iso8601(),
                    );
                    return;
                }
                let observed_at = Instant::now();
                let (outcome, sql_observation) = observe_repository_sql(|| {
                    with_request_context(
                        Duration::from_millis(work_deadline_ms),
                        debug_events_enabled().then_some(&request_id_for_worker),
                        || {
                            with_operation_context(&operation_id_for_worker, || {
                                dispatch_typed_client(
                                    applications.as_ref(),
                                    &capability_for_worker,
                                    &operation_args,
                                )
                            })
                        },
                    )
                });
                emit_query_observation(&capability_for_worker, &outcome, sql_observation);
                if let Ok(result) = outcome.as_ref() {
                    record_semantic_mutation_result(
                        &capability_for_worker,
                        semantic_success_for_worker.as_ref(),
                        result,
                        observed_at.elapsed(),
                    );
                }
                let _ = finish_public_maintenance_operation(
                    applications.as_ref(),
                    &operation_id_for_worker,
                    outcome.as_ref().map_err(String::as_str),
                    semantic_success_for_worker.as_ref(),
                    &utc_now_iso8601(),
                );
            })
        });
    if let Err(error) = spawn_result {
        let code = format!("operation_spawn_failed:{error}");
        finish_public_maintenance_operation(
            state.applications.as_ref(),
            &operation_id,
            Err(&code),
            semantic_success.as_ref(),
            &utc_now_iso8601(),
        )?;
        let row = state.applications.repository.with_reader(|repository| {
            repository
                .get_operation(&operation_id)?
                .ok_or_else(|| "operation_receipt_missing".to_owned())
        })?;
        return public_maintenance_operation_dto(&row);
    }
    Ok(accepted_dto)
}

fn emit_query_observation(
    capability: &str,
    outcome: &Result<Value, String>,
    observation: RepositorySqlObservation,
) {
    emit_debug(|| {
        let event = NativeDiagnosticEvent::new(
            "operation",
            "query-terminal",
            if outcome.is_ok() {
                "succeeded"
            } else {
                "failed"
            },
        )
        .capability(capability)
        .sql_query_count(observation.query_count)
        .sql_write_count(observation.write_count);
        match outcome {
            Ok(_) => event,
            Err(code) => event.code(code),
        }
    });
}

fn record_semantic_mutation_result(
    capability: &str,
    rule: Option<&ProductionClientSemanticSuccess>,
    result: &Value,
    duration: Duration,
) {
    let Some(rule) = rule else {
        return;
    };
    let Some(status) = result.get(&rule.field).and_then(Value::as_str) else {
        return;
    };
    let succeeded = rule.values.iter().any(|value| value == status);
    emit_debug(|| {
        NativeDiagnosticEvent::new(
            "operation",
            "mutation-result",
            if succeeded { "succeeded" } else { "failed" },
        )
        .capability(capability)
        .code(status)
        .mutation_status(status)
        .duration_ms(duration.as_millis() as u64)
    });
}

pub(crate) fn production_client_error_status(code: &str) -> u16 {
    if code == "invalid_request" {
        400
    } else if code == "mutation_not_admitted"
        || code == "production_activation_replayed"
        || code == "basis_mismatch"
        || code == "schema_mismatch"
        || code == "repository_schema_incompatible"
        || code.ends_with("_conflict")
        || code.ends_with("_basis_mismatch")
    {
        409
    } else if code.ends_with("_not_found") || code.ends_with("_missing") {
        404
    } else if code.ends_with("_busy") {
        429
    } else if code.ends_with("_too_large") || code.ends_with("_limit_exceeded") {
        413
    } else if code.ends_with("_timeout") || code.ends_with("_expired") || code == "timeout" {
        408
    } else {
        503
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_stable_production_error_statuses() {
        assert_eq!(production_client_error_status("invalid_request"), 400);
        assert_eq!(production_client_error_status("mutation_not_admitted"), 409);
        assert_eq!(production_client_error_status("topic_not_found"), 404);
        assert_eq!(production_client_error_status("basis_conflict"), 409);
        assert_eq!(production_client_error_status("basis_mismatch"), 409);
        assert_eq!(
            production_client_error_status("repository_schema_incompatible"),
            409
        );
        assert_eq!(
            production_client_error_status("response_body_too_large"),
            413
        );
        assert_eq!(production_client_error_status("worker_busy"), 429);
        assert_eq!(production_client_error_status("request_too_large"), 413);
        assert_eq!(production_client_error_status("worker_timeout"), 408);
        assert_eq!(production_client_error_status("operation_unavailable"), 503);
    }

    #[test]
    fn classifies_manifest_declared_semantic_terminals_for_diagnostics() {
        let rule = ProductionClientSemanticSuccess {
            field: "status".into(),
            values: vec!["promoted".into(), "unchanged".into()],
        };
        for status in ["promoted", "unchanged"] {
            assert!(rule.values.iter().any(|value| value == status));
        }
        for status in [
            "worker_busy",
            "worker_failed",
            "basis_mismatch",
            "invalid_request",
            "repair_required",
            "stopping",
        ] {
            assert!(!rule.values.iter().any(|value| value == status));
        }
    }
}

#[cfg(test)]
mod dispatch_integration_tests {
    use std::collections::BTreeSet;
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;
    use serde_json::json;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{CacheBasisRecord, Repository, RepositoryIdentity};
    use synthesis_sidecar::production_capabilities::{
        READY_PRODUCTION_CLIENT_CAPABILITIES, production_client_capabilities,
    };

    use crate::runtime_production_ports::{ProductionApplications, build_production_applications};
    use crate::runtime_worker_pool::NativeComputePool;

    fn test_root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-production-client-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn test_applications(root: &Path) -> ProductionApplications {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("canonical");
        build_production_applications(
            Arc::new(synthesis_application::RepositoryPort::new(Arc::new(
                Mutex::new(repository),
            ))),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
    }

    fn literature_digest_request() -> Value {
        json!({
            "libraryId":1,
            "itemKey":"AAAA1111",
            "paperRef":"1:AAAA1111",
            "itemType":"journalArticle",
            "title":"Source paper",
            "year":"2026",
            "date":"2026-01-01",
            "creators":["Source Author"],
            "tags":["topic:test"],
            "collections":["collection-1"],
            "doi":"10.1000/source",
            "arxiv":"",
            "isbn":"",
            "url":"https://example.test/source",
            "citekey":"source2026",
            "dateAdded":"2026-01-01",
            "digest":{
                "noteKey":"DIGEST1",
                "payloadHash":"sha256:digest-1",
                "content":"# Digest\n".to_owned() + &"x".repeat(128 * 1024),
            },
            "references":{
                "noteKey":"REFS1",
                "payloadHash":"sha256:references-1",
                "references":[{
                    "title":"Matched paper",
                    "year":"2024",
                    "authors":["Matched Author"],
                    "citekey":"matched2024",
                    "raw":"Matched Author (2024). Matched paper."
                }]
            },
            "citationAnalysis":{
                "noteKey":"CITATION1",
                "payloadHash":"sha256:citation-1",
                "citations":[{"reference_index":0,"role":"background"}]
            },
            "literatureMatchingMetadata":{
                "key_terms":["  Knowledge Graph  ","knowledge graph","Rust"],
                "methods":["Case Study"],
                "problems":["Reference Drift"],
                "datasets":["Zotero Library"],
                "exclude_terms":["Legacy"]
            },
            "matchedReferences":[{
                "libraryId":1,
                "itemKey":"BBBB2222",
                "paperRef":"1:BBBB2222",
                "title":"Matched paper",
                "year":"2024",
                "citekey":"matched2024"
            }]
        })
    }

    fn apply_literature_digest(
        apps: &ProductionApplications,
        request: Value,
    ) -> Result<Value, String> {
        let request = serde_json::from_value::<
            crate::runtime_reference_canonical::LiteratureDigestApplyRequest,
        >(request)
        .map_err(|_| "invalid_request".to_owned())?;
        apps.reference_canonical.apply_literature_digest(request)
    }

    #[test]
    fn registered_handlers_are_unique_and_declared() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(registered.len(), 96);
        assert!(registered.is_subset(&declared));
    }

    #[test]
    fn every_declared_client_operation_has_exactly_one_handler() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(registered, declared);
    }

    #[test]
    fn ready_roster_is_a_dispatchable_subset() {
        let ready = READY_PRODUCTION_CLIENT_CAPABILITIES
            .iter()
            .map(|capability| (*capability).to_owned())
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert!(ready.is_subset(&registered));
    }

    #[test]
    fn topic_apply_rejects_a_raw_bundle_without_the_strict_envelope() {
        let root = test_root();
        let apps = test_applications(&root);
        let result = dispatch_typed_client(
            &apps,
            "client.applyTopicSynthesisResult",
            &[json!({"topicId":"topic:test","title":"Raw bundle"})],
        );

        assert_eq!(result, Err("invalid_request".into()));
    }

    #[test]
    fn missing_topic_lifecycle_routes_return_typed_terminals_without_touching_topic_graph() {
        let root = test_root();
        let apps = test_applications(&root);

        assert_eq!(
            dispatch_typed_client(
                &apps,
                "client.deleteTopicArtifact",
                &[json!({"topicId":"topic:test"})],
            ),
            Ok(json!({
                "ok":false,
                "status":"not_found",
                "topicId":"topic:test",
                "reason":"topic artifact not found"
            }))
        );
        assert_eq!(
            dispatch_typed_client(&apps, "client.purgeDeletedTopicArtifacts", &[]),
            Ok(json!({"ok":true,"status":"purged","purged_count":0}))
        );
        assert!(
            apps.topic_graph
                .load()
                .expect("topic graph")
                .nodes
                .is_empty()
        );
    }

    #[test]
    fn workbench_surfaces_use_domain_projections_instead_of_maintenance_chrome() {
        let root = test_root();
        let apps = test_applications(&root);
        for (surface, field) in [
            ("home", "artifacts"),
            ("topics", "artifacts"),
            ("review", "reviews"),
            ("tags", "tags"),
            ("concepts", "concepts"),
            ("reader", "reader"),
        ] {
            let projection = dispatch_typed_client(
                &apps,
                "client.getSynthesisWorkbenchSurfaceInput",
                &[json!(surface), json!({})],
            )
            .unwrap_or_else(|error| panic!("{surface}: {error}"));
            assert!(projection.get(field).is_some(), "{surface}: {projection}");
            assert!(
                projection.get("maintenance").is_none(),
                "{surface}: {projection}"
            );
        }
    }

    #[test]
    fn related_items_echo_reads_repository_without_calling_reverse_host() {
        let root = test_root();
        let apps = test_applications(&root);
        assert_eq!(
            dispatch_typed_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({"libraryId":1,"itemKey":"AAAA1111"})],
            ),
            Ok(json!({"consumed":false}))
        );
        let payload = json!({
            "effectId":"effect:1",
            "sourceLibraryId":1,
            "sourceItemKey":"AAAA1111",
            "targetLibraryId":1,
            "targetItemKey":"BBBB2222",
            "status":"applied",
            "externalWriteAt":synthesis_protocol::utc_now_iso8601(),
            "echoState":"awaiting_echo",
            "updatedAt":synthesis_protocol::utc_now_iso8601()
        });
        apps.repository
            .owner()
            .lock()
            .expect("repository")
            .execute(
                "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)",
                &[
                    json!("effect:1"),
                    json!(serde_json::to_string(&payload).expect("payload")),
                    json!(synthesis_protocol::utc_now_iso8601()),
                ],
            )
            .expect("seed echo");

        assert_eq!(
            dispatch_typed_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({
                    "libraryId":1,
                    "itemKey":"AAAA1111",
                    "relatedItemKey":"BBBB2222"
                })],
            ),
            Ok(json!({"consumed":true}))
        );
    }

    #[test]
    fn unavailable_debug_projections_return_typed_stable_terminals() {
        let root = test_root();
        let apps = test_applications(&root);
        for (operation, request) in [
            ("client.debugSynthesisProfilerList", json!({})),
            (
                "client.debugSynthesisPaperInspect",
                json!({"paperRef":"1:ABSENT"}),
            ),
            ("client.debugSynthesisDiff", json!({})),
        ] {
            assert_eq!(
                dispatch_typed_client(&apps, operation, &[request]),
                Ok(json!({"status":"unavailable","diagnostics":[]})),
                "{operation}"
            );
        }
    }

    #[test]
    fn literature_digest_receipt_is_idempotent_after_reopen() {
        let root = test_root();
        let request = literature_digest_request();
        let first_apps = test_applications(&root);
        let first = apply_literature_digest(&first_apps, request.clone()).expect("first apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["idempotent"], false);

        let second_apps = test_applications(&root);
        let second = apply_literature_digest(&second_apps, request).expect("reopened apply");
        assert_eq!(second["status"], "sidecar_applied");
        assert_eq!(second["idempotent"], true);
        assert_eq!(first["operationId"], second["operationId"]);
    }

    #[test]
    fn literature_digest_apply_materializes_and_rolls_back_scoped_state() {
        let root = test_root();
        let apps = test_applications(&root);
        let request = literature_digest_request();
        let first = apply_literature_digest(&apps, request.clone()).expect("materialized apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["sourceRef"], "1:AAAA1111");
        assert_eq!(first["source_ref"], "1:AAAA1111");
        assert_eq!(first["paperRef"], "1:AAAA1111");
        assert_eq!(first["reference_count"], 1);
        assert_eq!(first["matched_count"], 1);

        let owner = apps.repository.owner();
        let repository = owner.lock().expect("repository");
        let artifacts = repository
            .list_reference_artifacts(&["1:AAAA1111".into()])
            .expect("artifacts");
        assert_eq!(artifacts.len(), 4);
        let raw_before = repository.list_raw_references().expect("references");
        assert_eq!(raw_before.len(), 1);
        assert!(raw_before[0].roles_json.contains("background"));
        let bindings = repository.list_reference_bindings().expect("bindings");
        assert_eq!(bindings.len(), 1);
        assert_eq!(bindings[0].item_key, "BBBB2222");
        let metadata = repository
            .query(
                "SELECT * FROM synt_literature_matching_metadata WHERE literature_item_id=?1",
                &[json!("1:AAAA1111")],
            )
            .expect("metadata");
        assert_eq!(metadata.len(), 1);
        assert_eq!(
            metadata[0]["key_terms_json"],
            "[\"Knowledge Graph\",\"Rust\"]"
        );

        for key in ["citation-graph:library", "related-items-sync:global"] {
            repository
                .upsert_cache_basis(&CacheBasisRecord {
                    cache_key: key.into(),
                    cache_kind: key.into(),
                    status: "ready".into(),
                    updated_at: "ready".into(),
                    ..CacheBasisRecord::default()
                })
                .expect("ready cache");
        }
        drop(repository);

        let mut digest_only = request.clone();
        digest_only["digest"]["payloadHash"] = json!("sha256:digest-2");
        digest_only["digest"]["content"] = json!("changed digest");
        apply_literature_digest(&apps, digest_only).expect("digest-only apply");
        let repository = owner.lock().expect("repository");
        assert_eq!(
            repository.list_raw_references().expect("references"),
            raw_before
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "ready"
        );
        drop(repository);

        let mut citation_only = request.clone();
        citation_only["citationAnalysis"]["payloadHash"] = json!("sha256:citation-2");
        citation_only["citationAnalysis"]["citations"][0]["role"] = json!("method");
        apply_literature_digest(&apps, citation_only).expect("citation-only apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository.list_raw_references().expect("references")[0]
                .roles_json
                .contains("method")
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "stale"
        );
        drop(repository);

        let mut ambiguous = request.clone();
        ambiguous["matchedReferences"] = json!([
            {"libraryId":1,"itemKey":"BBBB2222","paperRef":"1:BBBB2222","title":"Matched paper","year":"2024"},
            {"libraryId":1,"itemKey":"CCCC3333","paperRef":"1:CCCC3333","title":"Matched paper","year":"2024"}
        ]);
        apply_literature_digest(&apps, ambiguous).expect("ambiguous title-year apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository
                .list_reference_bindings()
                .expect("bindings")
                .is_empty()
        );
        let before_failure = repository.list_raw_references().expect("references");
        drop(repository);

        let mut invalid = request.clone();
        invalid["references"]["payloadHash"] = json!("sha256:references-invalid");
        invalid["references"]["references"] = json!("not-an-array");
        assert!(apply_literature_digest(&apps, invalid).is_err());
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references"),
            before_failure
        );

        let mut missing_references = request;
        missing_references
            .as_object_mut()
            .expect("request object")
            .remove("references");
        missing_references["citationAnalysis"] = Value::Null;
        let missing = apply_literature_digest(&apps, missing_references)
            .expect("missing references artifact");
        assert_eq!(missing["reference_count"], 0);
        assert!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references")
                .is_empty()
        );
    }

    #[test]
    fn topic_discovery_public_adapter_preserves_stable_shape() {
        let root = test_root();
        let apps = test_applications(&root);
        {
            let owner = apps.repository.owner();
            let repository = owner.lock().expect("repository");
            repository
                .execute(
                    "INSERT INTO synt_topic_discovery_hint(
                     hint_id,payload_json,updated_at
                     ) VALUES('hint:1','{\"hint_id\":\"hint:1\",\"status\":\"open\"}','1')",
                    &[],
                )
                .expect("hint");
        }
        let rejected = dispatch_typed_client(
            &apps,
            "client.rejectTopicDiscoveryHint",
            &[json!({"hintId":"hint:1"})],
        )
        .expect("reject hint");
        assert_eq!(rejected["status"], "rejected");
        assert_eq!(rejected["hint"]["status"], "rejected");
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }
}
