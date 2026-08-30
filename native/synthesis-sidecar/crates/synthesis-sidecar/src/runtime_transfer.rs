use crate::runtime_background_tasks::BackgroundTaskOwner;
use crate::runtime_contract::current_time_ms;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, child_observation_context, emit_debug, with_observation_context,
};
use crate::runtime_lifecycle::StopSignal;
use crate::runtime_worker_pool::{
    NativeComputePool, PagedInputFrame, PagedInputSource, PagedOutputCommit, PagedOutputFrame,
    PagedOutputSink, WorkerOperation,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use synthesis_protocol::{
    CITATION_GRAPH_BUILD_TRANSFER_OPERATION, PageDescriptor, canonical_json, canonical_sha256,
    paged_request_hash,
};

const TRANSFER_VERSION: &str = "synthesis-citation-graph-build-transfer.v1";
const TRANSFER_ENCODING: &str = "canonical_json_rows.v1";
const CONTENT_TRANSFER_VERSION: &str = "synthesis-production-content-transfer.v1";
const CONTENT_TRANSFER_ENCODING: &str = "canonical_json_text_chunks.v1";
const MAX_SESSIONS: usize = 2;
const MAX_PAGE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_DIRECTION_PAGES: usize = 256;
const MAX_DIRECTION_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_SERVICE_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const CONTENT_CHUNK_TARGET_BYTES: usize = 416 * 1024;
const IDLE_TTL_MS: u64 = 5 * 60 * 1000;
const ABSOLUTE_TTL_MS: u64 = 30 * 60 * 1000;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TransferPageDescriptorDto {
    kind: String,
    page_index: u64,
    row_count: u64,
    byte_length: u64,
    sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationScopeDto {
    kind: String,
    source_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationInputHeaderDto {
    contract_version: String,
    scope: CitationScopeDto,
    role_priority: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct CitationNodeCountsDto {
    library_paper: u64,
    external_reference: u64,
    unresolved_reference: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationDiagnosticsDto {
    node_counts: CitationNodeCountsDto,
    reference_count: u64,
    aggregate_edge_count: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationOutputHeaderDto {
    contract_version: String,
    scope: CitationScopeDto,
    diagnostics: CitationDiagnosticsDto,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicAssetDescriptorDto {
    id: String,
    media_type: String,
    byte_length: u64,
    sha256: String,
    first_page: u64,
    page_count: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "target", rename_all = "snake_case", deny_unknown_fields)]
enum ContentInputHeaderDto {
    TopicApplyAssets {
        assets: Vec<TopicAssetDescriptorDto>,
    },
    ProductionClientRequest {
        capability: String,
        #[serde(rename = "byteLength")]
        byte_length: u64,
        sha256: String,
    },
    ProductionClientResult,
    HostExportEntries,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "target", rename_all = "snake_case", deny_unknown_fields)]
enum ContentOutputHeaderDto {
    ProductionClientResult {
        capability: String,
        byte_length: u64,
        sha256: String,
    },
    HostExportEntries {
        capability: String,
        byte_length: u64,
        sha256: String,
    },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
enum TransferManifestHeaderDto {
    CitationInput(CitationInputHeaderDto),
    CitationOutput(CitationOutputHeaderDto),
    ContentInput(ContentInputHeaderDto),
    ContentOutput(ContentOutputHeaderDto),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TransferManifestDto {
    transfer_version: String,
    encoding: String,
    direction: String,
    header: TransferManifestHeaderDto,
    pages: Vec<TransferPageDescriptorDto>,
    root_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationLibraryNodeDto {
    node_id: String,
    title: Option<String>,
    year: Option<String>,
    authors: Vec<String>,
    aliases: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum CitationNodeKindDto {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum CitationEdgeStatusDto {
    Accepted,
    Unbound,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationReferenceDto {
    reference_id: String,
    edge_id: String,
    source_id: String,
    source_ref: Option<String>,
    target_id: String,
    target_kind: CitationNodeKindDto,
    target_title: Option<String>,
    target_year: Option<String>,
    target_authors: Vec<String>,
    target_aliases: Vec<String>,
    roles: Vec<String>,
    weight: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationGraphNodeDto {
    node_id: String,
    kind: CitationNodeKindDto,
    title: Option<String>,
    year: Option<String>,
    authors: Vec<String>,
    aliases: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationResolvedEdgeDto {
    edge_id: String,
    reference_id: String,
    source_id: String,
    target_id: String,
    status: CitationEdgeStatusDto,
    roles: Vec<String>,
    weight: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationRoleEvidenceDto {
    role: String,
    count: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationAggregateEdgeDto {
    source_id: String,
    target_id: String,
    mention_count: u64,
    primary_role: String,
    aux_roles: Vec<CitationRoleEvidenceDto>,
    role_evidence: Vec<CitationRoleEvidenceDto>,
    source_refs: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationOwnershipDto {
    source_id: String,
    edge_id: String,
    reference_id: String,
    target_id: String,
    status: CitationEdgeStatusDto,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CitationLightMetricDto {
    node_id: String,
    outgoing_count: u64,
    incoming_count: u64,
    local_degree: u64,
    matched_outgoing_count: u64,
    unresolved_outgoing_count: u64,
    ambiguous_outgoing_count: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct TransferPageDto {
    descriptor: TransferPageDescriptorDto,
    rows: Value,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
enum TransferActionDto {
    Begin {
        #[serde(rename = "idempotencyKey")]
        idempotency_key: String,
        manifest: TransferManifestDto,
    },
    PutInputPage {
        #[serde(rename = "sessionId")]
        session_id: String,
        page: TransferPageDto,
    },
    SealInput {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    Execute {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    Status {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    GetOutputManifest {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    GetOutputPage {
        #[serde(rename = "sessionId")]
        session_id: String,
        kind: String,
        #[serde(rename = "pageIndex")]
        page_index: u64,
    },
    Cancel {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
}

struct StagedPage {
    path: PathBuf,
    byte_length: u64,
    _reservation: Option<ByteReservation>,
}

struct Session {
    id: String,
    idempotency_key: String,
    root: PathBuf,
    manifest: Value,
    pages: BTreeMap<(String, u64), StagedPage>,
    state: &'static str,
    staged_bytes: u64,
    created_at_ms: u64,
    last_activity_at_ms: u64,
    attempts: u64,
    active_attempt: Option<u64>,
    last_failure: Option<Value>,
    output_manifest: Option<Value>,
    output_pages: BTreeMap<(String, u64), StagedPage>,
    output_ownership: Option<Box<dyn Send>>,
    canceled: Arc<AtomicBool>,
    cleanup_requested: bool,
}

pub(crate) struct NativeTransferOwner {
    root: PathBuf,
    sessions: HashMap<String, Session>,
    idempotency: HashMap<String, String>,
    next_id: u64,
    stopping: bool,
    service_bytes: Arc<ByteBudget>,
    production_client_membership: crate::runtime_production_client::ProductionClientMembership,
}

pub(crate) struct PublishedContentTransfer {
    pub(crate) session_id: String,
    pub(crate) root_sha256: String,
}

pub(crate) enum TransferDispatch {
    Response(Value),
    Execute(Box<TransferExecution>),
}

pub(crate) struct TransferExecution {
    pub(crate) status: Value,
    pub(crate) source: TransferInputSource,
    pub(crate) sink: TransferOutputSink,
}

pub(crate) fn dispatch_transfer_action(
    transfer: &Arc<Mutex<NativeTransferOwner>>,
    compute_pool: &Arc<NativeComputePool>,
    background_tasks: &Arc<BackgroundTaskOwner>,
    stop_signal: &StopSignal,
    action: Value,
) -> Result<Value, String> {
    emit_debug(|| {
        NativeDiagnosticEvent::new("batch", "dispatch", "started")
            .capability("compute.citation_graph_build_transfer")
    });
    let dispatch = transfer
        .lock()
        .map_err(|_| "transfer_unavailable".to_owned())?
        .handle(action, current_time_ms()?);
    emit_debug(|| {
        let event = NativeDiagnosticEvent::new(
            "batch",
            "dispatch-terminal",
            if dispatch.is_ok() {
                "succeeded"
            } else {
                "failed"
            },
        )
        .capability("compute.citation_graph_build_transfer");
        match &dispatch {
            Ok(_) => event,
            Err(code) => event.code(code),
        }
    });
    match dispatch? {
        TransferDispatch::Response(data) => Ok(data),
        TransferDispatch::Execute(execution) => queue_transfer_execution(
            transfer,
            compute_pool,
            background_tasks,
            stop_signal,
            *execution,
        ),
    }
}

fn queue_transfer_execution(
    transfer: &Arc<Mutex<NativeTransferOwner>>,
    compute_pool: &Arc<NativeComputePool>,
    background_tasks: &Arc<BackgroundTaskOwner>,
    stop_signal: &StopSignal,
    execution: TransferExecution,
) -> Result<Value, String> {
    let TransferExecution {
        status,
        mut source,
        mut sink,
    } = execution;
    let (session_id, attempt) = source.identity();
    let session_id = session_id.to_owned();
    let cancellation = source.cancellation();
    let mut reservation = match compute_pool.reserve() {
        Ok(reservation) => reservation,
        Err(code) => {
            if let Ok(mut owner) = transfer.lock() {
                owner.reject_queued(&session_id, attempt, current_time_ms().unwrap_or_default());
            }
            return Err(code.to_owned());
        }
    };
    let transfer_for_attempt = Arc::clone(transfer);
    let compute_pool_for_attempt = Arc::clone(compute_pool);
    let stop_signal_for_attempt = stop_signal.clone();
    let attempt_trace = child_observation_context();
    let attempt_cancellation = Arc::clone(&cancellation);
    let session_id_for_attempt = session_id.clone();
    let spawn_result = background_tasks.spawn(
        format!("synthesis-transfer-{attempt}"),
        attempt_cancellation,
        move || {
            with_observation_context(attempt_trace.as_ref(), || {
                emit_debug(|| {
                    NativeDiagnosticEvent::new("batch", "attempt", "started")
                        .capability("compute.citation_graph_build_transfer")
                });
                let result = match reservation
                    .wait(stop_signal_for_attempt.stopping_flag(), &cancellation)
                {
                    Ok(()) => {
                        let now_ms = current_time_ms().unwrap_or_default();
                        if let Ok(mut owner) = transfer_for_attempt.lock() {
                            owner.mark_executing(&session_id_for_attempt, attempt, now_ms);
                        }
                        compute_pool_for_attempt.run_paged(
                            WorkerOperation::CitationGraphBuildTransfer,
                            &mut source,
                            &mut sink,
                            &cancellation,
                        )
                    }
                    Err(code) => Err(code.to_owned()),
                };
                drop(reservation);
                emit_debug(|| {
                    let event = NativeDiagnosticEvent::new(
                        "batch",
                        "attempt-terminal",
                        if result.is_ok() {
                            "succeeded"
                        } else {
                            "failed"
                        },
                    )
                    .capability("compute.citation_graph_build_transfer");
                    match &result {
                        Ok(_) => event,
                        Err(code) => event.code(code),
                    }
                });
                if let Ok(mut owner) = transfer_for_attempt.lock() {
                    owner.finish_attempt(
                        &session_id_for_attempt,
                        attempt,
                        result,
                        current_time_ms().unwrap_or_default(),
                    );
                }
            })
        },
    );
    if let Err(code) = spawn_result {
        if let Ok(mut owner) = transfer.lock() {
            owner.reject_queued(&session_id, attempt, current_time_ms().unwrap_or_default());
        }
        return Err(code);
    }
    Ok(status)
}

#[derive(Clone)]
struct Descriptor {
    kind: String,
    page_index: u64,
    row_count: u64,
    byte_length: u64,
    sha256: String,
}

pub(crate) struct TransferInputSource {
    session_id: String,
    attempt: u64,
    header: Map<String, Value>,
    request_hash: String,
    pages: Vec<(Descriptor, PathBuf)>,
    cursor: usize,
    canceled: Arc<AtomicBool>,
}

pub(crate) struct TransferOutputSink {
    session_id: String,
    attempt: u64,
    root: PathBuf,
    header: Option<Map<String, Value>>,
    pages: Vec<(Descriptor, PathBuf)>,
    staged_bytes: u64,
    reservations: Vec<ByteReservation>,
    service_bytes: Arc<ByteBudget>,
    committed: bool,
}

struct ByteBudget {
    used: AtomicU64,
}

struct ByteReservation {
    budget: Arc<ByteBudget>,
    bytes: u64,
}

struct TransferOutputOwnership {
    root: PathBuf,
    _reservations: Vec<ByteReservation>,
}

fn valid_transfer_hash(value: &str) -> bool {
    value.len() == 71
        && value.starts_with("sha256:")
        && value[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn valid_transfer_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}

fn validate_scope(scope: &CitationScopeDto) -> Result<(), String> {
    let mut source_ids = HashSet::with_capacity(scope.source_ids.len());
    if !matches!(scope.kind.as_str(), "full" | "source_slice")
        || scope.source_ids.len() > 25_000
        || scope
            .source_ids
            .iter()
            .any(|value| !valid_transfer_text(value, 4_096) || !source_ids.insert(value))
    {
        return Err("invalid_request".into());
    }
    Ok(())
}

fn validate_descriptor(descriptor: &TransferPageDescriptorDto) -> Result<(), String> {
    if !matches!(
        descriptor.kind.as_str(),
        "library_nodes"
            | "references"
            | "nodes"
            | "resolved_edges"
            | "aggregate_edges"
            | "source_ownership"
            | "incoming_groups"
            | "light_metrics"
            | "content"
    ) || descriptor.page_index > 255
        || descriptor.row_count > 100_000
        || descriptor.byte_length > MAX_PAGE_BYTES
        || !valid_transfer_hash(&descriptor.sha256)
    {
        return Err("invalid_request".into());
    }
    Ok(())
}

fn validate_manifest_dto(
    manifest: &TransferManifestDto,
    content_only: bool,
    production_client_membership: &crate::runtime_production_client::ProductionClientMembership,
) -> Result<(), String> {
    if !valid_transfer_hash(&manifest.root_sha256)
        || manifest.pages.len() > MAX_DIRECTION_PAGES
        || manifest.pages.iter().try_fold(0_u64, |total, page| {
            validate_descriptor(page)?;
            total
                .checked_add(page.byte_length)
                .ok_or_else(|| "transfer_limit_exceeded".to_owned())
        })? > MAX_DIRECTION_BYTES
    {
        return Err("invalid_request".into());
    }
    let citation =
        manifest.transfer_version == TRANSFER_VERSION && manifest.encoding == TRANSFER_ENCODING;
    let content = manifest.transfer_version == CONTENT_TRANSFER_VERSION
        && manifest.encoding == CONTENT_TRANSFER_ENCODING;
    if (!citation && !content) || (content_only && !content) {
        return Err("invalid_request".into());
    }
    match (&manifest.header, citation, manifest.direction.as_str()) {
        (TransferManifestHeaderDto::CitationInput(header), true, "input") => {
            if header.contract_version != "synthesis-citation-graph-build.v1"
                || header
                    .role_priority
                    .iter()
                    .any(|value| !valid_transfer_text(value, 4_096))
                || manifest
                    .pages
                    .iter()
                    .any(|page| !matches!(page.kind.as_str(), "library_nodes" | "references"))
            {
                return Err("invalid_request".into());
            }
            validate_scope(&header.scope)?;
        }
        (TransferManifestHeaderDto::CitationOutput(header), true, "output") => {
            if header.contract_version != "synthesis-citation-graph-build.v1"
                || manifest.pages.iter().any(|page| {
                    !matches!(
                        page.kind.as_str(),
                        "nodes"
                            | "resolved_edges"
                            | "aggregate_edges"
                            | "source_ownership"
                            | "incoming_groups"
                            | "light_metrics"
                    )
                })
            {
                return Err("invalid_request".into());
            }
            validate_scope(&header.scope)?;
        }
        (
            TransferManifestHeaderDto::ContentInput(ContentInputHeaderDto::TopicApplyAssets {
                assets,
            }),
            false,
            "input",
        ) => {
            if assets.len() > 256
                || manifest.pages.iter().any(|page| page.kind != "content")
                || assets.iter().any(|asset| {
                    !valid_transfer_text(&asset.id, 256)
                        || !matches!(
                            asset.media_type.as_str(),
                            "application/json" | "text/markdown" | "text/plain"
                        )
                        || asset.byte_length > MAX_DIRECTION_BYTES
                        || !valid_transfer_hash(&asset.sha256)
                        || asset.page_count == 0
                        || asset.first_page > 255
                        || asset.page_count > 256
                })
            {
                return Err("invalid_request".into());
            }
        }
        (
            TransferManifestHeaderDto::ContentInput(
                ContentInputHeaderDto::ProductionClientResult
                | ContentInputHeaderDto::HostExportEntries,
            ),
            false,
            "input",
        ) if manifest.pages.is_empty() => {}
        (
            TransferManifestHeaderDto::ContentInput(
                ContentInputHeaderDto::ProductionClientRequest {
                    capability,
                    byte_length,
                    sha256,
                },
            ),
            false,
            "input",
        ) => {
            if !production_client_membership.contains(capability)
                || *byte_length > MAX_DIRECTION_BYTES
                || !valid_transfer_hash(sha256)
                || manifest.pages.iter().any(|page| page.kind != "content")
            {
                return Err("invalid_request".into());
            }
        }
        (TransferManifestHeaderDto::ContentOutput(header), false, "output") => {
            if manifest.pages.iter().any(|page| page.kind != "content") {
                return Err("invalid_request".into());
            }
            match header {
                ContentOutputHeaderDto::ProductionClientResult {
                    capability,
                    byte_length,
                    sha256,
                } => {
                    if !production_client_membership.contains(capability)
                        || *byte_length > MAX_DIRECTION_BYTES
                        || !valid_transfer_hash(sha256)
                    {
                        return Err("invalid_request".into());
                    }
                }
                ContentOutputHeaderDto::HostExportEntries {
                    capability,
                    byte_length,
                    sha256,
                } => {
                    if capability != "paper_artifacts.export_filtered"
                        || *byte_length > MAX_DIRECTION_BYTES
                        || !valid_transfer_hash(sha256)
                    {
                        return Err("invalid_request".into());
                    }
                }
            }
        }
        _ => return Err("invalid_request".into()),
    }
    Ok(())
}

fn validate_page_dto(page: TransferPageDto) -> Result<(), String> {
    validate_descriptor(&page.descriptor)?;
    let expected_rows = page.descriptor.row_count as usize;
    let rows = page.rows;
    match page.descriptor.kind.as_str() {
        "library_nodes" => {
            let rows: Vec<CitationLibraryNodeDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.node_id, 4_096)
                        || row
                            .title
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 4_096))
                        || row
                            .year
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 64))
                        || !valid_string_list(&row.authors, false)
                        || !valid_string_list(&row.aliases, true)
                })
            {
                return Err("invalid_request".into());
            }
        }
        "references" => {
            let rows: Vec<CitationReferenceDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.reference_id, 4_096)
                        || !valid_transfer_text(&row.edge_id, 4_096)
                        || !valid_transfer_text(&row.source_id, 4_096)
                        || !valid_transfer_text(&row.target_id, 4_096)
                        || row
                            .source_ref
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 4_096))
                        || row
                            .target_title
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 4_096))
                        || row
                            .target_year
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 64))
                        || !valid_string_list(&row.target_authors, false)
                        || !valid_string_list(&row.target_aliases, true)
                        || !valid_string_list(&row.roles, false)
                        || !row.weight.is_finite()
                        || row.weight <= 0.0
                })
            {
                return Err("invalid_request".into());
            }
        }
        "nodes" => {
            let rows: Vec<CitationGraphNodeDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.node_id, 4_096)
                        || row
                            .title
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 4_096))
                        || row
                            .year
                            .as_ref()
                            .is_some_and(|value| !valid_transfer_text(value, 64))
                        || !valid_string_list(&row.authors, false)
                        || !valid_string_list(&row.aliases, true)
                })
            {
                return Err("invalid_request".into());
            }
        }
        "resolved_edges" => {
            let rows: Vec<CitationResolvedEdgeDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.edge_id, 4_096)
                        || !valid_transfer_text(&row.reference_id, 4_096)
                        || !valid_transfer_text(&row.source_id, 4_096)
                        || !valid_transfer_text(&row.target_id, 4_096)
                        || !valid_string_list(&row.roles, false)
                        || !row.weight.is_finite()
                        || row.weight <= 0.0
                })
            {
                return Err("invalid_request".into());
            }
        }
        "aggregate_edges" => {
            let rows: Vec<CitationAggregateEdgeDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.source_id, 4_096)
                        || !valid_transfer_text(&row.target_id, 4_096)
                        || row.mention_count == 0
                        || !valid_transfer_text(&row.primary_role, 4_096)
                        || !valid_role_evidence(&row.aux_roles)
                        || !valid_role_evidence(&row.role_evidence)
                        || !valid_string_list(&row.source_refs, true)
                })
            {
                return Err("invalid_request".into());
            }
        }
        "source_ownership" | "incoming_groups" => {
            let rows: Vec<CitationOwnershipDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.source_id, 4_096)
                        || !valid_transfer_text(&row.edge_id, 4_096)
                        || !valid_transfer_text(&row.reference_id, 4_096)
                        || !valid_transfer_text(&row.target_id, 4_096)
                })
            {
                return Err("invalid_request".into());
            }
        }
        "light_metrics" => {
            let rows: Vec<CitationLightMetricDto> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != expected_rows
                || rows.iter().any(|row| {
                    !valid_transfer_text(&row.node_id, 4_096) || row.ambiguous_outgoing_count != 0
                })
            {
                return Err("invalid_request".into());
            }
        }
        "content" => {
            let rows: Vec<String> =
                serde_json::from_value(rows).map_err(|_| "invalid_request".to_owned())?;
            if rows.len() != 1 || expected_rows != 1 || rows[0].len() as u64 > MAX_PAGE_BYTES {
                return Err("invalid_request".into());
            }
        }
        _ => return Err("invalid_request".into()),
    }
    Ok(())
}

fn valid_string_list(values: &[String], unique: bool) -> bool {
    if values.len() > 256
        || values
            .iter()
            .any(|value| !valid_transfer_text(value, 4_096))
    {
        return false;
    }
    !unique || values.iter().collect::<HashSet<_>>().len() == values.len()
}

fn valid_role_evidence(values: &[CitationRoleEvidenceDto]) -> bool {
    values.len() <= 256
        && values
            .iter()
            .all(|value| valid_transfer_text(&value.role, 4_096) && value.count > 0)
}

fn validate_transfer_action_contract(
    action: &Value,
    content_only: bool,
    production_client_membership: &crate::runtime_production_client::ProductionClientMembership,
) -> Result<(), String> {
    let action: TransferActionDto =
        serde_json::from_value(action.clone()).map_err(|_| "invalid_request".to_owned())?;
    match action {
        TransferActionDto::Begin {
            idempotency_key,
            manifest,
        } => {
            if !valid_transfer_text(&idempotency_key, 128) {
                return Err("invalid_request".into());
            }
            validate_manifest_dto(&manifest, content_only, production_client_membership)
        }
        TransferActionDto::PutInputPage { session_id, page } => {
            if !valid_transfer_text(&session_id, 128) {
                return Err("invalid_request".into());
            }
            validate_page_dto(page)?;
            Ok(())
        }
        TransferActionDto::SealInput { session_id }
        | TransferActionDto::Execute { session_id }
        | TransferActionDto::Status { session_id }
        | TransferActionDto::GetOutputManifest { session_id }
        | TransferActionDto::Cancel { session_id } => {
            if valid_transfer_text(&session_id, 128) {
                Ok(())
            } else {
                Err("invalid_request".into())
            }
        }
        TransferActionDto::GetOutputPage {
            session_id,
            kind,
            page_index,
        } => {
            if !valid_transfer_text(&session_id, 128)
                || !matches!(
                    kind.as_str(),
                    "library_nodes"
                        | "references"
                        | "nodes"
                        | "resolved_edges"
                        | "aggregate_edges"
                        | "source_ownership"
                        | "incoming_groups"
                        | "light_metrics"
                        | "content"
                )
                || page_index > 255
            {
                return Err("invalid_request".into());
            }
            Ok(())
        }
    }
}

impl ByteBudget {
    fn new() -> Arc<Self> {
        Arc::new(Self {
            used: AtomicU64::new(0),
        })
    }

    fn reserve(self: &Arc<Self>, bytes: u64) -> Result<ByteReservation, String> {
        self.used
            .try_update(Ordering::AcqRel, Ordering::Acquire, |current| {
                current
                    .checked_add(bytes)
                    .filter(|next| *next <= MAX_SERVICE_BYTES)
            })
            .map_err(|_| "transfer_limit_exceeded".to_owned())?;
        Ok(ByteReservation {
            budget: Arc::clone(self),
            bytes,
        })
    }

    fn total(&self) -> u64 {
        self.used.load(Ordering::Acquire)
    }
}

impl Drop for ByteReservation {
    fn drop(&mut self) {
        let released =
            self.budget
                .used
                .try_update(Ordering::AcqRel, Ordering::Acquire, |current| {
                    current.checked_sub(self.bytes)
                });
        debug_assert!(released.is_ok(), "transfer byte ownership underflow");
    }
}

impl Drop for TransferOutputOwnership {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

impl NativeTransferOwner {
    pub(crate) fn new(
        profile_runtime_root: &Path,
        production_client_membership: crate::runtime_production_client::ProductionClientMembership,
    ) -> Result<Self, String> {
        let root = profile_runtime_root.join("citation-graph-transfer");
        if root.exists() {
            fs::remove_dir_all(&root).map_err(|_| "transfer_unavailable".to_owned())?;
        }
        secure_directory(&root)?;
        Ok(Self {
            root,
            sessions: HashMap::new(),
            idempotency: HashMap::new(),
            next_id: 1,
            stopping: false,
            service_bytes: ByteBudget::new(),
            production_client_membership,
        })
    }

    pub(crate) fn snapshot(&self) -> Value {
        let visible_sessions = self
            .sessions
            .values()
            .filter(|session| !session.cleanup_requested)
            .count();
        json!({
            "state":if self.stopping {"stopping"} else if visible_sessions == 0 {"idle"} else {"active"},
            "sessions":visible_sessions,
            "stagedBytes":self.total_staged_bytes(),
        })
    }

    pub(crate) fn reap(&mut self, now_ms: u64) {
        let expired: Vec<(String, bool)> = self
            .sessions
            .values()
            .filter_map(|session| {
                let absolute = now_ms.saturating_sub(session.created_at_ms) >= ABSOLUTE_TTL_MS;
                let idle = now_ms.saturating_sub(session.last_activity_at_ms) >= IDLE_TTL_MS;
                (absolute || (idle && session.active_attempt.is_none()))
                    .then(|| (session.id.clone(), absolute))
            })
            .collect();
        for (session_id, _absolute) in expired {
            self.request_cleanup(&session_id);
        }
    }

    pub(crate) fn request_stop(&mut self) {
        self.stopping = true;
        let session_ids = self.sessions.keys().cloned().collect::<Vec<_>>();
        for session_id in session_ids {
            self.request_cleanup(&session_id);
        }
    }

    pub(crate) fn finalize_stop(&mut self) {
        let session_ids = self.sessions.keys().cloned().collect::<Vec<_>>();
        for session_id in session_ids {
            self.remove_session(&session_id);
        }
        let _ = fs::remove_dir_all(&self.root);
    }

    pub(crate) fn handle(
        &mut self,
        action: Value,
        now_ms: u64,
    ) -> Result<TransferDispatch, String> {
        validate_transfer_action_contract(&action, false, &self.production_client_membership)?;
        if self.stopping {
            return Err("transfer_stopping".to_owned());
        }
        self.reap(now_ms);
        let action_name = bounded_string(&action["action"], 64)?;
        if action_name != "begin"
            && action["sessionId"].as_str().is_some_and(|session_id| {
                self.sessions
                    .get(session_id)
                    .is_some_and(|session| session.cleanup_requested)
            })
        {
            return Err("transfer_not_found".into());
        }
        match action_name {
            "begin" => self.begin(action, now_ms).map(TransferDispatch::Response),
            "put_input_page" => self
                .put_input_page(action, now_ms)
                .map(TransferDispatch::Response),
            "seal_input" => self
                .seal_input(action, now_ms)
                .map(TransferDispatch::Response),
            "status" => self.status_action(action).map(TransferDispatch::Response),
            "execute" => self.execute(action, now_ms),
            "get_output_manifest" => self
                .get_output_manifest(action)
                .map(TransferDispatch::Response),
            "get_output_page" => self.get_output_page(action).map(TransferDispatch::Response),
            "cancel" => self.cancel(action).map(TransferDispatch::Response),
            _ => Err("invalid_request".to_owned()),
        }
    }

    pub(crate) fn handle_content(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        validate_transfer_action_contract(&action, true, &self.production_client_membership)?;
        let action_name = bounded_string(&action["action"], 64)?;
        if action_name == "execute" {
            return Err("invalid_request".to_owned());
        }
        if action_name == "begin" {
            if action["manifest"]["transferVersion"] != CONTENT_TRANSFER_VERSION {
                return Err("invalid_request".to_owned());
            }
        } else {
            let session_id = bounded_string(&action["sessionId"], 128)?;
            if self.sessions.get(session_id).is_none_or(|session| {
                session.manifest["transferVersion"] != CONTENT_TRANSFER_VERSION
            }) {
                return Err("transfer_not_found".to_owned());
            }
        }
        match self.handle(action, now_ms)? {
            TransferDispatch::Response(value) => Ok(value),
            TransferDispatch::Execute(_) => Err("invalid_request".to_owned()),
        }
    }

    pub(crate) fn mark_executing(&mut self, session_id: &str, attempt: u64, now_ms: u64) {
        if let Some(session) = self.sessions.get_mut(session_id)
            && session.active_attempt == Some(attempt)
        {
            session.state = "executing";
            session.last_activity_at_ms = now_ms;
        }
    }

    pub(crate) fn reject_queued(&mut self, session_id: &str, attempt: u64, now_ms: u64) {
        let mut cleanup = false;
        if let Some(session) = self.sessions.get_mut(session_id)
            && session.active_attempt == Some(attempt)
            && session.state == "queued"
        {
            session.active_attempt = None;
            session.attempts = session.attempts.saturating_sub(1);
            session.state = "input_sealed";
            session.last_activity_at_ms = now_ms;
            let _ = fs::remove_dir_all(session.root.join(format!("attempt-{attempt}")));
            cleanup = session.cleanup_requested;
        }
        if cleanup {
            self.remove_session(session_id);
        }
    }

    pub(crate) fn finish_attempt(
        &mut self,
        session_id: &str,
        attempt: u64,
        result: Result<PagedOutputCommit, String>,
        now_ms: u64,
    ) {
        let Some(session) = self.sessions.get_mut(session_id) else {
            return;
        };
        if session.active_attempt != Some(attempt) {
            return;
        }
        if session.cleanup_requested {
            self.remove_session(session_id);
            return;
        }
        session.active_attempt = None;
        session.last_activity_at_ms = now_ms;
        match result {
            Ok(publication) => {
                let (publication, ownership) = publication.into_parts();
                let parsed = parse_publication(&publication);
                match parsed {
                    Ok((manifest, pages)) => {
                        session.output_manifest = Some(manifest);
                        session.output_pages = pages;
                        session.output_ownership = ownership;
                        session.last_failure = None;
                        session.state = "completed";
                    }
                    Err(code) => {
                        drop(ownership);
                        fail_attempt(session, code, now_ms);
                    }
                }
            }
            Err(code) => fail_attempt(session, &code, now_ms),
        }
    }

    pub(crate) fn topic_apply_assets(
        &self,
        session_id: &str,
    ) -> Result<Vec<synthesis_application::TopicAsset>, String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.cleanup_requested {
            return Err("transfer_not_found".into());
        }
        if session.state != "input_sealed"
            || session.manifest["transferVersion"] != CONTENT_TRANSFER_VERSION
            || session.manifest["encoding"] != CONTENT_TRANSFER_ENCODING
            || session.manifest["direction"] != "input"
            || session.manifest["header"]["target"] != "topic_apply_assets"
        {
            return Err("transfer_conflict".to_owned());
        }
        let descriptors = descriptors(&session.manifest)?;
        if descriptors.iter().enumerate().any(|(index, descriptor)| {
            descriptor.kind != "content" || descriptor.page_index != index as u64
        }) {
            return Err("transfer_conflict".to_owned());
        }
        let assets = session.manifest["header"]["assets"]
            .as_array()
            .filter(|assets| assets.len() <= 256)
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let mut next_page = 0_usize;
        let mut result = Vec::with_capacity(assets.len());
        for asset in assets {
            exact(
                asset,
                &[
                    "id",
                    "mediaType",
                    "byteLength",
                    "sha256",
                    "firstPage",
                    "pageCount",
                ],
            )?;
            let id = bounded_string(&asset["id"], 128)?.to_owned();
            let media_type = bounded_string(&asset["mediaType"], 64)?.to_owned();
            if !matches!(
                media_type.as_str(),
                "application/json" | "text/markdown" | "text/plain"
            ) {
                return Err("transfer_conflict".to_owned());
            }
            let byte_length = asset["byteLength"]
                .as_u64()
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let expected_hash = asset["sha256"]
                .as_str()
                .filter(|value| value.len() == 71 && value.starts_with("sha256:"))
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let first_page = asset["firstPage"]
                .as_u64()
                .map(|value| value as usize)
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let page_count = asset["pageCount"]
                .as_u64()
                .map(|value| value as usize)
                .filter(|value| *value > 0)
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            if first_page != next_page || first_page.saturating_add(page_count) > descriptors.len()
            {
                return Err("transfer_conflict".to_owned());
            }
            let mut text = String::new();
            for descriptor in &descriptors[first_page..first_page + page_count] {
                let staged = session
                    .pages
                    .get(&(descriptor.kind.clone(), descriptor.page_index))
                    .ok_or_else(|| "transfer_incomplete".to_owned())?;
                let page = read_value(&staged.path)?;
                page_identity(&page)?;
                let rows = page["rows"]
                    .as_array()
                    .filter(|rows| rows.len() == 1)
                    .ok_or_else(|| "transfer_conflict".to_owned())?;
                text.push_str(
                    rows[0]
                        .as_str()
                        .ok_or_else(|| "transfer_conflict".to_owned())?,
                );
            }
            if text.len() as u64 != byte_length
                || canonical_sha256(&text).map_err(|_| "transfer_conflict".to_owned())?
                    != expected_hash
            {
                return Err("transfer_conflict".to_owned());
            }
            result.push(synthesis_application::TopicAsset {
                id,
                media_type,
                text,
            });
            next_page += page_count;
        }
        if next_page != descriptors.len() {
            return Err("transfer_conflict".to_owned());
        }
        Ok(result)
    }

    pub(crate) fn production_client_request(
        &self,
        session_id: &str,
        capability: &str,
    ) -> Result<Value, String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.cleanup_requested {
            return Err("transfer_not_found".into());
        }
        if session.state != "input_sealed"
            || session.manifest["transferVersion"] != CONTENT_TRANSFER_VERSION
            || session.manifest["encoding"] != CONTENT_TRANSFER_ENCODING
            || session.manifest["direction"] != "input"
            || session.manifest["header"]["target"] != "production_client_request"
            || session.manifest["header"]["capability"] != capability
        {
            return Err("transfer_conflict".to_owned());
        }
        let descriptors = descriptors(&session.manifest)?;
        if descriptors.iter().enumerate().any(|(index, descriptor)| {
            descriptor.kind != "content"
                || descriptor.page_index != index as u64
                || descriptor.row_count != 1
        }) {
            return Err("transfer_conflict".to_owned());
        }
        let mut text = String::new();
        for descriptor in &descriptors {
            let staged = session
                .pages
                .get(&(descriptor.kind.clone(), descriptor.page_index))
                .ok_or_else(|| "transfer_incomplete".to_owned())?;
            let page = read_value(&staged.path)?;
            page_identity(&page)?;
            let rows = page["rows"]
                .as_array()
                .filter(|rows| rows.len() == 1)
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            text.push_str(
                rows[0]
                    .as_str()
                    .ok_or_else(|| "transfer_conflict".to_owned())?,
            );
        }
        let expected_bytes = session.manifest["header"]["byteLength"]
            .as_u64()
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let expected_hash = bounded_string(&session.manifest["header"]["sha256"], 80)?;
        if text.len() as u64 != expected_bytes
            || canonical_sha256(&text).map_err(|_| "transfer_conflict".to_owned())? != expected_hash
        {
            return Err("transfer_conflict".to_owned());
        }
        serde_json::from_str(&text).map_err(|_| "invalid_request".to_owned())
    }

    fn publish_content(
        &mut self,
        target: &str,
        capability: &str,
        result: &Value,
        now_ms: u64,
    ) -> Result<PublishedContentTransfer, String> {
        self.reap(now_ms);
        if self.stopping {
            return Err("transfer_stopping".to_owned());
        }
        if self
            .sessions
            .values()
            .filter(|session| !session.cleanup_requested)
            .count()
            >= MAX_SESSIONS
        {
            return Err("transfer_busy".to_owned());
        }
        let valid_identity = match target {
            "production_client_result" => capability.starts_with("client."),
            "host_export_entries" => capability == "paper_artifacts.export_filtered",
            _ => false,
        };
        if !valid_identity || capability.len() > 128 {
            return Err("invalid_request".to_owned());
        }
        let content = canonical_json(result).map_err(|_| "production_projection_invalid")?;
        if content.len() as u64 > MAX_DIRECTION_BYTES {
            return Err("transfer_limit_exceeded".to_owned());
        }
        let content_chunks = content_text_chunks(&content);
        if content_chunks.len() > MAX_DIRECTION_PAGES {
            return Err("transfer_limit_exceeded".to_owned());
        }
        let id = format!("native-transfer:{}", self.next_id);
        let session_root = self.root.join(format!("session-{}", self.next_id));
        self.next_id += 1;
        let output_root = session_root.join("output");
        secure_directory(&output_root)?;
        let published = (|| {
            let mut output_pages = BTreeMap::new();
            let mut output_descriptors = Vec::new();
            for (page_index, chunk) in content_chunks.into_iter().enumerate() {
                let rows = json!([chunk]);
                let canonical_rows = canonical_json(&rows)
                    .map_err(|_| "production_projection_invalid".to_owned())?;
                if canonical_rows.len() as u64 > MAX_PAGE_BYTES {
                    return Err("transfer_limit_exceeded".to_owned());
                }
                let reservation = self.service_bytes.reserve(canonical_rows.len() as u64)?;
                let descriptor = Descriptor {
                    kind: "content".into(),
                    page_index: page_index as u64,
                    row_count: 1,
                    byte_length: canonical_rows.len() as u64,
                    sha256: canonical_sha256(&rows)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                };
                let page = json!({
                    "descriptor":descriptor_value(&descriptor),
                    "rows":rows,
                });
                let path = output_root.join(page_filename("content", page_index as u64));
                atomic_write(
                    &path,
                    canonical_json(&page)
                        .map_err(|_| "production_projection_invalid".to_owned())?
                        .as_bytes(),
                )?;
                output_pages.insert(
                    ("content".into(), page_index as u64),
                    StagedPage {
                        path,
                        byte_length: descriptor.byte_length,
                        _reservation: Some(reservation),
                    },
                );
                output_descriptors.push(descriptor_value(&descriptor));
            }
            let output_body = json!({
                "transferVersion":CONTENT_TRANSFER_VERSION,
                "encoding":CONTENT_TRANSFER_ENCODING,
                "direction":"output",
                "header":{
                    "target":target,
                    "capability":capability,
                    "byteLength":content.len(),
                    "sha256":canonical_sha256(&content)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                },
                "pages":output_descriptors,
            });
            let mut output_manifest = output_body.clone();
            output_manifest
                .as_object_mut()
                .expect("output manifest")
                .insert(
                    "rootSha256".into(),
                    Value::String(
                        canonical_sha256(&output_body)
                            .map_err(|_| "production_projection_invalid".to_owned())?,
                    ),
                );
            atomic_write(
                &session_root.join("output-manifest.json"),
                canonical_json(&output_manifest)
                    .map_err(|_| "production_projection_invalid".to_owned())?
                    .as_bytes(),
            )?;
            Ok((output_manifest, output_pages))
        })();
        let (output_manifest, output_pages) = match published {
            Ok(value) => value,
            Err(code) => {
                let _ = fs::remove_dir_all(&session_root);
                return Err(code);
            }
        };
        let input_body = json!({
            "transferVersion":CONTENT_TRANSFER_VERSION,
            "encoding":CONTENT_TRANSFER_ENCODING,
            "direction":"input",
            "header":{"target":target},
            "pages":[],
        });
        let mut input_manifest = input_body.clone();
        input_manifest
            .as_object_mut()
            .expect("input manifest")
            .insert(
                "rootSha256".into(),
                Value::String(
                    canonical_sha256(&input_body)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                ),
            );
        let idempotency_key = format!("content:{target}:{id}");
        let root_sha256 = output_manifest
            .get("rootSha256")
            .and_then(Value::as_str)
            .ok_or_else(|| "production_projection_invalid".to_owned())?
            .to_owned();
        self.idempotency.insert(idempotency_key.clone(), id.clone());
        self.sessions.insert(
            id.clone(),
            Session {
                id: id.clone(),
                idempotency_key,
                root: session_root,
                manifest: input_manifest,
                pages: BTreeMap::new(),
                state: "completed",
                staged_bytes: 0,
                created_at_ms: now_ms,
                last_activity_at_ms: now_ms,
                attempts: 0,
                active_attempt: None,
                last_failure: None,
                output_manifest: Some(output_manifest),
                output_pages,
                output_ownership: None,
                canceled: Arc::new(AtomicBool::new(false)),
                cleanup_requested: false,
            },
        );
        Ok(PublishedContentTransfer {
            session_id: id,
            root_sha256,
        })
    }

    pub(crate) fn publish_client_result(
        &mut self,
        capability: &str,
        result: &Value,
        now_ms: u64,
    ) -> Result<Value, String> {
        let published =
            self.publish_content("production_client_result", capability, result, now_ms)?;
        Ok(json!({
            "contentTransfer": {
                "sessionId": published.session_id,
                "rootSha256": published.root_sha256,
            }
        }))
    }

    pub(crate) fn publish_host_export_entries(
        &mut self,
        capability: &str,
        entries: &Value,
        now_ms: u64,
    ) -> Result<PublishedContentTransfer, String> {
        self.publish_content("host_export_entries", capability, entries, now_ms)
    }

    fn begin(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "idempotencyKey", "manifest"])?;
        let key = bounded_string(&action["idempotencyKey"], 128)?.to_owned();
        descriptors(&action["manifest"])?;
        if let Some(session_id) = self.idempotency.get(&key) {
            let session = self
                .sessions
                .get(session_id)
                .ok_or_else(|| "transfer_not_found".to_owned())?;
            if session.manifest != action["manifest"] {
                return Err("transfer_conflict".to_owned());
            }
            return Ok(status(session));
        }
        if self
            .sessions
            .values()
            .filter(|session| !session.cleanup_requested)
            .count()
            >= MAX_SESSIONS
        {
            return Err("transfer_busy".to_owned());
        }
        let id = format!("native-transfer:{}", self.next_id);
        self.next_id += 1;
        let session_root = self.root.join(format!("session-{}", self.next_id - 1));
        secure_directory(&session_root.join("input"))?;
        atomic_write(
            &session_root.join("input-manifest.json"),
            canonical_json(&action["manifest"])
                .map_err(|_| "invalid_request".to_owned())?
                .as_bytes(),
        )?;
        let session = Session {
            id: id.clone(),
            idempotency_key: key.clone(),
            root: session_root,
            manifest: action["manifest"].clone(),
            pages: BTreeMap::new(),
            state: "receiving_input",
            staged_bytes: 0,
            created_at_ms: now_ms,
            last_activity_at_ms: now_ms,
            attempts: 0,
            active_attempt: None,
            last_failure: None,
            output_manifest: None,
            output_pages: BTreeMap::new(),
            output_ownership: None,
            canceled: Arc::new(AtomicBool::new(false)),
            cleanup_requested: false,
        };
        let result = status(&session);
        self.idempotency.insert(key, id.clone());
        self.sessions.insert(id, session);
        Ok(result)
    }

    fn put_input_page(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "sessionId", "page"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        let session = self
            .sessions
            .get_mut(&session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.state != "receiving_input" {
            return Err("transfer_conflict".to_owned());
        }
        let (kind, index, bytes) = page_identity(&action["page"])?;
        let expected = descriptors(&session.manifest)?
            .into_iter()
            .find(|entry| entry.kind == kind && entry.page_index == index)
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let descriptor = &action["page"]["descriptor"];
        if descriptor["rowCount"] != expected.row_count
            || descriptor["byteLength"] != expected.byte_length
            || descriptor["sha256"] != expected.sha256
        {
            return Err("transfer_conflict".to_owned());
        }
        let identity = (kind.clone(), index);
        if let Some(previous) = session.pages.get(&identity) {
            let previous_value = read_value(&previous.path)?;
            if previous_value != action["page"] {
                return Err("transfer_conflict".to_owned());
            }
        } else {
            if session.staged_bytes.saturating_add(bytes) > MAX_DIRECTION_BYTES {
                return Err("transfer_limit_exceeded".to_owned());
            }
            let reservation = self.service_bytes.reserve(bytes)?;
            let path = session.root.join("input").join(page_filename(&kind, index));
            atomic_write(
                &path,
                canonical_json(&action["page"])
                    .map_err(|_| "invalid_request".to_owned())?
                    .as_bytes(),
            )?;
            session.pages.insert(
                identity,
                StagedPage {
                    path,
                    byte_length: expected.byte_length,
                    _reservation: Some(reservation),
                },
            );
            session.staged_bytes += bytes;
        }
        session.last_activity_at_ms = now_ms;
        Ok(status(session))
    }

    fn seal_input(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        let session = self
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.state == "input_sealed" {
            return Ok(status(session));
        }
        if session.state != "receiving_input" {
            return Err("transfer_conflict".to_owned());
        }
        if session.pages.len() != descriptors(&session.manifest)?.len() {
            return Err("transfer_incomplete".to_owned());
        }
        session.state = "input_sealed";
        session.last_activity_at_ms = now_ms;
        Ok(status(session))
    }

    fn status_action(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        self.sessions
            .get(session_id)
            .map(status)
            .ok_or_else(|| "transfer_not_found".to_owned())
    }

    fn execute(&mut self, action: Value, now_ms: u64) -> Result<TransferDispatch, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        let session = self
            .sessions
            .get_mut(&session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.manifest["transferVersion"] != TRANSFER_VERSION {
            return Err("invalid_request".to_owned());
        }
        if matches!(
            session.state,
            "queued" | "executing" | "publishing" | "completed"
        ) {
            return Ok(TransferDispatch::Response(status(session)));
        }
        if session.state != "input_sealed" {
            return Err("transfer_conflict".to_owned());
        }
        session.attempts += 1;
        let attempt = session.attempts;
        session.active_attempt = Some(attempt);
        session.state = "queued";
        session.last_activity_at_ms = now_ms;
        session.last_failure = None;
        let attempt_root = session.root.join(format!("attempt-{attempt}"));
        if attempt_root.exists() {
            fs::remove_dir_all(&attempt_root).map_err(|_| "transfer_unavailable".to_owned())?;
        }
        secure_directory(&attempt_root)?;
        let input_descriptors = descriptors(&session.manifest)?;
        let pages = input_descriptors
            .into_iter()
            .map(|descriptor| {
                let path = session
                    .pages
                    .get(&(descriptor.kind.clone(), descriptor.page_index))
                    .ok_or_else(|| "transfer_incomplete".to_owned())?
                    .path
                    .clone();
                Ok((descriptor, path))
            })
            .collect::<Result<Vec<_>, String>>()?;
        let header = session.manifest["header"]
            .as_object()
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let worker_descriptors = pages
            .iter()
            .map(|(descriptor, _)| {
                Ok(PageDescriptor {
                    section: input_section(&descriptor.kind)?.to_owned(),
                    page_index: descriptor.page_index,
                    row_count: descriptor.row_count as usize,
                    byte_length: descriptor.byte_length as usize,
                    sha256: descriptor.sha256.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let request_hash = paged_request_hash(
            CITATION_GRAPH_BUILD_TRANSFER_OPERATION,
            &header,
            &worker_descriptors,
        )
        .map_err(str::to_owned)?;
        let source = TransferInputSource {
            session_id: session_id.clone(),
            attempt,
            header,
            request_hash,
            pages,
            cursor: 0,
            canceled: Arc::clone(&session.canceled),
        };
        let sink = TransferOutputSink {
            session_id,
            attempt,
            root: attempt_root,
            header: None,
            pages: Vec::new(),
            staged_bytes: 0,
            reservations: Vec::new(),
            service_bytes: Arc::clone(&self.service_bytes),
            committed: false,
        };
        Ok(TransferDispatch::Execute(Box::new(TransferExecution {
            status: status(session),
            source,
            sink,
        })))
    }

    fn get_output_manifest(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        self.sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?
            .output_manifest
            .clone()
            .ok_or_else(|| "transfer_output_not_ready".to_owned())
    }

    fn get_output_page(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId", "kind", "pageIndex"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        let kind = bounded_string(&action["kind"], 64)?;
        let page_index = action["pageIndex"]
            .as_u64()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let page = self
            .sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?
            .output_pages
            .get(&(kind.to_owned(), page_index))
            .ok_or_else(|| "transfer_output_not_ready".to_owned())?;
        read_value(&page.path)
    }

    fn cancel(&mut self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        if !self.sessions.contains_key(&session_id) {
            return Err("transfer_not_found".to_owned());
        }
        self.request_cleanup(&session_id);
        Ok(json!({"canceled":true}))
    }

    fn request_cleanup(&mut self, session_id: &str) {
        let Some(session) = self.sessions.get_mut(session_id) else {
            return;
        };
        session.canceled.store(true, Ordering::Release);
        session.cleanup_requested = true;
        self.idempotency.remove(&session.idempotency_key);
        if session.active_attempt.is_none() {
            self.remove_session(session_id);
        }
    }

    fn remove_session(&mut self, session_id: &str) {
        if let Some(session) = self.sessions.remove(session_id) {
            session.canceled.store(true, Ordering::Release);
            self.idempotency.remove(&session.idempotency_key);
            let _ = fs::remove_dir_all(session.root);
        }
    }

    fn total_staged_bytes(&self) -> u64 {
        self.service_bytes.total()
    }
}

impl TransferInputSource {
    pub(crate) fn identity(&self) -> (&str, u64) {
        (&self.session_id, self.attempt)
    }

    pub(crate) fn cancellation(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.canceled)
    }
}

impl PagedInputSource for TransferInputSource {
    fn header(&self) -> Result<Map<String, Value>, String> {
        Ok(self.header.clone())
    }

    fn request_hash(&self) -> &str {
        &self.request_hash
    }

    fn next_page(&mut self) -> Result<Option<PagedInputFrame>, String> {
        if self.canceled.load(Ordering::Acquire) {
            return Err("worker_canceled".to_owned());
        }
        let Some((descriptor, path)) = self.pages.get(self.cursor) else {
            return Ok(None);
        };
        self.cursor += 1;
        let page = read_value(path)?;
        let rows = page["rows"]
            .as_array()
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let raw_rows = canonical_json(rows).map_err(|_| "transfer_conflict".to_owned())?;
        if raw_rows.len() as u64 != descriptor.byte_length
            || canonical_sha256(rows).map_err(|_| "transfer_conflict".to_owned())?
                != descriptor.sha256
            || rows.len() as u64 != descriptor.row_count
        {
            return Err("transfer_conflict".to_owned());
        }
        Ok(Some(PagedInputFrame {
            section: input_section(&descriptor.kind)?.to_owned(),
            page_index: descriptor.page_index,
            row_count: descriptor.row_count as usize,
            raw_rows,
        }))
    }
}

impl PagedOutputSink for TransferOutputSink {
    fn begin(&mut self, header: Map<String, Value>) -> Result<(), String> {
        if self.header.is_some() {
            return Err("worker_result_invalid".to_owned());
        }
        self.header = Some(header);
        Ok(())
    }

    fn stage_page(&mut self, frame: PagedOutputFrame) -> Result<(), String> {
        let kind = output_kind(&frame.section)?.to_owned();
        let expected_index = self
            .pages
            .iter()
            .filter(|(descriptor, _)| descriptor.kind == kind)
            .count() as u64;
        if frame.page_index != expected_index {
            return Err("worker_result_invalid".to_owned());
        }
        let rows = Value::Array(frame.rows);
        let canonical = canonical_json(&rows).map_err(|_| "worker_result_invalid".to_owned())?;
        if canonical.len() as u64 > MAX_PAGE_BYTES
            || self.staged_bytes.saturating_add(canonical.len() as u64) > MAX_DIRECTION_BYTES
        {
            return Err("transfer_limit_exceeded".to_owned());
        }
        let descriptor = Descriptor {
            kind: kind.clone(),
            page_index: frame.page_index,
            row_count: rows.as_array().map_or(0, Vec::len) as u64,
            byte_length: canonical.len() as u64,
            sha256: canonical_sha256(&rows).map_err(|_| "worker_result_invalid".to_owned())?,
        };
        let page = json!({
            "descriptor":descriptor_value(&descriptor),
            "rows":rows,
        });
        let page_bytes = canonical_json(&page).map_err(|_| "worker_result_invalid".to_owned())?;
        let reservation = self.service_bytes.reserve(canonical.len() as u64)?;
        let path = self.root.join(page_filename(&kind, frame.page_index));
        atomic_write(&path, page_bytes.as_bytes())?;
        self.staged_bytes += descriptor.byte_length;
        self.reservations.push(reservation);
        self.pages.push((descriptor, path));
        Ok(())
    }

    fn commit(&mut self) -> Result<PagedOutputCommit, String> {
        let header = self
            .header
            .take()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        let descriptors = self
            .pages
            .iter()
            .map(|(descriptor, _)| descriptor_value(descriptor))
            .collect::<Vec<_>>();
        let body = json!({
            "transferVersion":TRANSFER_VERSION,
            "encoding":TRANSFER_ENCODING,
            "direction":"output",
            "header":header,
            "pages":descriptors,
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).map_err(|_| "worker_result_invalid".to_owned())?),
        );
        let manifest_path = self.root.join("manifest.json");
        atomic_write(
            &manifest_path,
            canonical_json(&manifest)
                .map_err(|_| "worker_result_invalid".to_owned())?
                .as_bytes(),
        )?;
        self.committed = true;
        let publication = json!({
            "sessionId":self.session_id,
            "attempt":self.attempt,
            "attemptRoot":self.root.to_string_lossy(),
            "manifest":manifest,
            "pages":self.pages.iter().map(|(descriptor, path)| json!({
                "descriptor":descriptor_value(descriptor),
                "path":path.to_string_lossy(),
            })).collect::<Vec<_>>(),
        });
        Ok(PagedOutputCommit::with_ownership(
            publication,
            TransferOutputOwnership {
                root: self.root.clone(),
                _reservations: std::mem::take(&mut self.reservations),
            },
        ))
    }

    fn rollback(&mut self) {
        if !self.committed {
            self.reservations.clear();
            let _ = fs::remove_dir_all(&self.root);
        }
    }
}

impl Drop for TransferOutputSink {
    fn drop(&mut self) {
        self.rollback();
    }
}

fn fail_attempt(session: &mut Session, code: &str, now_ms: u64) {
    let code = match code {
        "worker_timeout"
        | "worker_canceled"
        | "worker_crashed"
        | "worker_panicked"
        | "worker_result_invalid"
        | "worker_unavailable"
        | "transfer_limit_exceeded"
        | "transfer_conflict" => code,
        _ => "internal_error",
    };
    session.state = "input_sealed";
    session.output_manifest = None;
    session.output_pages.clear();
    session.output_ownership = None;
    session.last_failure = Some(json!({
        "code":code,
        "retryable":true,
        "atMs":now_ms,
    }));
}

type PublishedPages = BTreeMap<(String, u64), StagedPage>;

fn parse_publication(publication: &Value) -> Result<(Value, PublishedPages), &'static str> {
    let manifest = publication["manifest"].clone();
    let descriptors = descriptors_output(&manifest)?;
    let paths = publication["pages"]
        .as_array()
        .ok_or("worker_result_invalid")?;
    if paths.len() != descriptors.len() {
        return Err("worker_result_invalid");
    }
    let mut pages = BTreeMap::new();
    for (descriptor, entry) in descriptors.into_iter().zip(paths) {
        let path = entry["path"]
            .as_str()
            .map(PathBuf::from)
            .ok_or("worker_result_invalid")?;
        if !path.is_file() || entry["descriptor"] != descriptor_value(&descriptor) {
            return Err("worker_result_invalid");
        }
        pages.insert(
            (descriptor.kind.clone(), descriptor.page_index),
            StagedPage {
                path,
                byte_length: descriptor.byte_length,
                _reservation: None,
            },
        );
    }
    Ok((manifest, pages))
}

fn object(value: &Value) -> Result<&Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())
}

fn exact(value: &Value, fields: &[&str]) -> Result<(), String> {
    let value = object(value)?;
    if value.len() != fields.len() || fields.iter().any(|field| !value.contains_key(*field)) {
        return Err("invalid_request".to_owned());
    }
    Ok(())
}

fn bounded_string(value: &Value, max: usize) -> Result<&str, String> {
    value
        .as_str()
        .filter(|value| !value.is_empty() && value.len() <= max)
        .ok_or_else(|| "invalid_request".to_owned())
}

fn descriptors(manifest: &Value) -> Result<Vec<Descriptor>, String> {
    descriptors_direction(manifest, "input").map_err(str::to_owned)
}

fn descriptors_output(manifest: &Value) -> Result<Vec<Descriptor>, &'static str> {
    descriptors_direction(manifest, "output")
}

fn descriptors_direction(
    manifest: &Value,
    direction: &str,
) -> Result<Vec<Descriptor>, &'static str> {
    let object = manifest.as_object().ok_or("invalid_request")?;
    let citation_transfer = manifest["transferVersion"] == TRANSFER_VERSION
        && manifest["encoding"] == TRANSFER_ENCODING;
    let content_transfer = manifest["transferVersion"] == CONTENT_TRANSFER_VERSION
        && manifest["encoding"] == CONTENT_TRANSFER_ENCODING
        && matches!(
            manifest["header"]["target"].as_str(),
            Some("topic_apply_assets" | "production_client_result" | "host_export_entries")
                | Some("production_client_request")
        );
    if object.len() != 6
        || [
            "transferVersion",
            "encoding",
            "direction",
            "header",
            "pages",
            "rootSha256",
        ]
        .iter()
        .any(|field| !object.contains_key(*field))
        || (!citation_transfer && !content_transfer)
        || manifest["direction"] != direction
        || !manifest["header"].is_object()
    {
        return Err("invalid_request");
    }
    let pages = manifest["pages"].as_array().ok_or("invalid_request")?;
    if pages.len() > 256 {
        return Err("transfer_limit_exceeded");
    }
    let mut result = Vec::with_capacity(pages.len());
    let mut total = 0_u64;
    for page in pages {
        let page = page.as_object().ok_or("invalid_request")?;
        if page.len() != 5
            || ["kind", "pageIndex", "rowCount", "byteLength", "sha256"]
                .iter()
                .any(|field| !page.contains_key(*field))
        {
            return Err("invalid_request");
        }
        let kind = page["kind"]
            .as_str()
            .filter(|value| !value.is_empty() && value.len() <= 64)
            .ok_or("invalid_request")?
            .to_owned();
        let page_index = page["pageIndex"].as_u64().ok_or("invalid_request")?;
        let row_count = page["rowCount"].as_u64().ok_or("invalid_request")?;
        let byte_length = page["byteLength"].as_u64().ok_or("invalid_request")?;
        let sha256 = page["sha256"]
            .as_str()
            .filter(|value| value.len() == 71 && value.starts_with("sha256:"))
            .ok_or("invalid_request")?
            .to_owned();
        total = total
            .checked_add(byte_length)
            .ok_or("transfer_limit_exceeded")?;
        if byte_length > MAX_PAGE_BYTES || total > MAX_DIRECTION_BYTES {
            return Err("transfer_limit_exceeded");
        }
        result.push(Descriptor {
            kind,
            page_index,
            row_count,
            byte_length,
            sha256,
        });
    }
    let mut body = manifest.clone();
    body.as_object_mut()
        .expect("manifest object")
        .remove("rootSha256");
    if manifest["rootSha256"] != canonical_sha256(&body).map_err(|_| "invalid_request")? {
        return Err("invalid_request");
    }
    Ok(result)
}

fn page_identity(page: &Value) -> Result<(String, u64, u64), String> {
    exact(page, &["descriptor", "rows"])?;
    let descriptor = &page["descriptor"];
    exact(
        descriptor,
        &["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    )?;
    let rows = page["rows"]
        .as_array()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let kind = bounded_string(&descriptor["kind"], 64)?.to_owned();
    let page_index = descriptor["pageIndex"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let row_count = descriptor["rowCount"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let byte_length = descriptor["byteLength"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    if byte_length > MAX_PAGE_BYTES
        || row_count != rows.len() as u64
        || byte_length
            != canonical_json(rows)
                .map_err(|_| "invalid_request".to_owned())?
                .len() as u64
        || descriptor["sha256"]
            != canonical_sha256(rows).map_err(|_| "invalid_request".to_owned())?
    {
        return Err("transfer_conflict".to_owned());
    }
    Ok((kind, page_index, byte_length))
}

fn progress(session: &Session, output: bool) -> Value {
    let manifest = if output {
        session.output_manifest.as_ref()
    } else {
        Some(&session.manifest)
    };
    let total_pages = manifest
        .and_then(|manifest| manifest["pages"].as_array())
        .map_or(0, Vec::len);
    let pages = if output {
        session.output_pages.len()
    } else {
        session.pages.len()
    };
    let staged_bytes = if output {
        session
            .output_pages
            .values()
            .map(|page| page.byte_length)
            .sum()
    } else {
        session.staged_bytes
    };
    json!({
        "receivedPages":pages,
        "totalPages":total_pages,
        "stagedBytes":staged_bytes,
    })
}

fn status(session: &Session) -> Value {
    let mut execution = json!({"attempts":session.attempts});
    if let Some(last_failure) = &session.last_failure {
        execution
            .as_object_mut()
            .expect("execution object")
            .insert("lastFailure".to_owned(), last_failure.clone());
    }
    let mut value = json!({
        "sessionId":session.id,
        "state":session.state,
        "input":progress(session, false),
        "execution":execution,
        "stagedBytes":session.staged_bytes,
        "createdAtMs":session.created_at_ms,
        "lastActivityAtMs":session.last_activity_at_ms,
    });
    if session.output_manifest.is_some() {
        value
            .as_object_mut()
            .expect("status object")
            .insert("output".to_owned(), progress(session, true));
    }
    value
}

fn input_section(kind: &str) -> Result<&'static str, String> {
    match kind {
        "library_nodes" => Ok("libraryNodes"),
        "references" => Ok("references"),
        _ => Err("transfer_conflict".to_owned()),
    }
}

fn output_kind(section: &str) -> Result<&'static str, String> {
    match section {
        "nodes" => Ok("nodes"),
        "resolvedEdges" => Ok("resolved_edges"),
        "aggregateEdges" => Ok("aggregate_edges"),
        "sourceOwnership" => Ok("source_ownership"),
        "incomingGroups" => Ok("incoming_groups"),
        "lightMetrics" => Ok("light_metrics"),
        _ => Err("worker_result_invalid".to_owned()),
    }
}

fn descriptor_value(descriptor: &Descriptor) -> Value {
    json!({
        "kind":descriptor.kind,
        "pageIndex":descriptor.page_index,
        "rowCount":descriptor.row_count,
        "byteLength":descriptor.byte_length,
        "sha256":descriptor.sha256,
    })
}

fn page_filename(kind: &str, page_index: u64) -> String {
    format!("{kind}-{page_index}.json")
}

fn content_text_chunks(content: &str) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut chunk = String::new();
    for character in content.chars() {
        if !chunk.is_empty()
            && chunk.len().saturating_add(character.len_utf8()) > CONTENT_CHUNK_TARGET_BYTES
        {
            chunks.push(std::mem::take(&mut chunk));
        }
        chunk.push(character);
    }
    if !chunk.is_empty() || chunks.is_empty() {
        chunks.push(chunk);
    }
    chunks
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, bytes).map_err(|_| "transfer_unavailable".to_owned())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temporary, fs::Permissions::from_mode(0o600))
            .map_err(|_| "transfer_unavailable".to_owned())?;
    }
    fs::rename(&temporary, path).map_err(|_| "transfer_unavailable".to_owned())
}

fn secure_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|_| "transfer_unavailable".to_owned())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|_| "transfer_unavailable".to_owned())?;
    }
    Ok(())
}

fn read_value(path: &Path) -> Result<Value, String> {
    let bytes = fs::read(path).map_err(|_| "transfer_unavailable".to_owned())?;
    serde_json::from_slice(&bytes).map_err(|_| "transfer_conflict".to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_test_support::TestRoot;

    fn temporary_root(label: &str) -> TestRoot {
        TestRoot::new(&format!("synthesis-native-transfer-{label}"))
    }

    fn production_client_membership() -> crate::runtime_production_client::ProductionClientMembership
    {
        crate::runtime_production_client::ProductionClientCatalog::from_embedded()
            .expect("production client catalog")
            .membership()
    }

    fn page(kind: &str, rows: Value) -> Value {
        let canonical = canonical_json(&rows).expect("canonical rows");
        json!({
            "descriptor":{
                "kind":kind,
                "pageIndex":0,
                "rowCount":rows.as_array().expect("rows").len(),
                "byteLength":canonical.len(),
                "sha256":canonical_sha256(&rows).expect("rows hash"),
            },
            "rows":rows,
        })
    }

    fn input_manifest(pages: &[Value]) -> Value {
        let body = json!({
            "transferVersion":TRANSFER_VERSION,
            "encoding":TRANSFER_ENCODING,
            "direction":"input",
            "header":{
                "contractVersion":"synthesis-citation-graph-build.v1",
                "scope":{"kind":"full","sourceIds":[]},
                "rolePriority":[],
            },
            "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).expect("manifest hash")),
        );
        manifest
    }

    fn topic_assets_manifest(pages: &[Value], text: &str) -> Value {
        let body = json!({
            "transferVersion":"synthesis-production-content-transfer.v1",
            "encoding":"canonical_json_text_chunks.v1",
            "direction":"input",
            "header":{
                "target":"topic_apply_assets",
                "assets":[{
                    "id":"asset/0001",
                    "mediaType":"text/markdown",
                    "byteLength":text.len(),
                    "sha256":canonical_sha256(&text).expect("asset hash"),
                    "firstPage":0,
                    "pageCount":pages.len(),
                }],
            },
            "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).expect("manifest hash")),
        );
        manifest
    }

    fn production_client_request_manifest(pages: &[Value], capability: &str, text: &str) -> Value {
        let body = json!({
            "transferVersion":"synthesis-production-content-transfer.v1",
            "encoding":"canonical_json_text_chunks.v1",
            "direction":"input",
            "header":{
                "target":"production_client_request",
                "capability":capability,
                "byteLength":text.len(),
                "sha256":canonical_sha256(&text).expect("request hash"),
            },
            "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).expect("manifest hash")),
        );
        manifest
    }

    #[test]
    fn materializes_hash_bound_topic_assets_from_a_sealed_content_session() {
        let root = temporary_root("topic-content");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let text = "large topic body";
        let pages = [page("content", json!([text]))];
        let TransferDispatch::Response(begun) = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"topic-assets",
                    "manifest":topic_assets_manifest(&pages, text),
                }),
                1,
            )
            .expect("begin")
        else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id");
        owner
            .handle(
                json!({"action":"put_input_page","sessionId":session_id,"page":pages[0]}),
                2,
            )
            .expect("put page");
        owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal");

        assert_eq!(
            owner.topic_apply_assets(session_id).expect("topic assets"),
            vec![synthesis_application::TopicAsset {
                id: "asset/0001".into(),
                media_type: "text/markdown".into(),
                text: text.into(),
            }]
        );
        assert!(
            owner
                .handle(json!({"action":"execute","sessionId":session_id}), 4)
                .is_err()
        );
    }

    #[test]
    fn materializes_a_capability_bound_production_client_request() {
        let root = temporary_root("production-client-request");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let payload = json!({"args":[{"kind":"topic_plan","operation":"reconcile"}]});
        let text = canonical_json(&payload).expect("canonical payload");
        let pages = [page("content", json!([text]))];
        let action = json!({
            "action":"begin",
            "idempotencyKey":"production-client-request",
            "manifest":production_client_request_manifest(
                &pages,
                "client.applyTopicPlan",
                &text,
            ),
        });
        let parsed: TransferActionDto =
            serde_json::from_value(action.clone()).expect("parse request transfer action");
        let TransferActionDto::Begin { manifest, .. } = parsed else {
            panic!("begin action");
        };
        validate_manifest_dto(&manifest, true, &production_client_membership())
            .expect("validate request transfer manifest");
        let TransferDispatch::Response(begun) = owner.handle(action, 1).expect("begin") else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id");
        owner
            .handle(
                json!({"action":"put_input_page","sessionId":session_id,"page":pages[0]}),
                2,
            )
            .expect("put page");
        owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal");

        assert_eq!(
            owner
                .production_client_request(session_id, "client.applyTopicPlan")
                .expect("request"),
            payload
        );
        assert_eq!(
            owner
                .production_client_request(session_id, "client.appendTagAuditRun")
                .expect_err("capability fence"),
            "transfer_conflict"
        );
    }

    #[test]
    fn rejects_unknown_nested_transfer_fields_and_kind_row_mismatches() {
        let root = temporary_root("strict-contract");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let pages = [page(
            "library_nodes",
            json!([{"nodeId":"paper:A","authors":[],"aliases":[]}]),
        )];
        let mut manifest = input_manifest(&pages);
        manifest["header"]["scope"]["ignored"] = json!(true);
        assert_eq!(
            owner
                .handle(
                    json!({"action":"begin","idempotencyKey":"unknown","manifest":manifest}),
                    1,
                )
                .err()
                .expect("nested unknown field"),
            "invalid_request"
        );

        let mismatched = page(
            "resolved_edges",
            json!([{"nodeId":"paper:A","authors":[],"aliases":[]}]),
        );
        assert_eq!(
            owner
                .handle(
                    json!({"action":"put_input_page","sessionId":"missing","page":mismatched}),
                    2,
                )
                .err()
                .expect("descriptor row mismatch"),
            "invalid_request"
        );
    }

    #[test]
    fn publishes_large_client_results_as_hash_bound_output_pages() {
        let root = temporary_root("client-result");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let result =
            json!({"artifacts":[{"payload":"x".repeat(900_000)}],"diagnostics":[],"total":1});
        let locator = owner
            .publish_client_result("client.readPaperArtifacts", &result, 10)
            .expect("publish result");
        let session_id = locator["contentTransfer"]["sessionId"]
            .as_str()
            .expect("session id");
        let expected_root_sha256 = locator["contentTransfer"]["rootSha256"]
            .as_str()
            .expect("root sha256");
        let TransferDispatch::Response(manifest) = owner
            .handle(
                json!({"action":"get_output_manifest","sessionId":session_id}),
                11,
            )
            .expect("manifest")
        else {
            panic!("manifest response");
        };
        assert_eq!(manifest["header"]["target"], "production_client_result");
        assert_eq!(manifest["rootSha256"], expected_root_sha256);
        assert_eq!(
            manifest["header"]["capability"],
            "client.readPaperArtifacts"
        );
        assert!(manifest["pages"].as_array().expect("pages").len() > 1);
        let mut content = String::new();
        for descriptor in manifest["pages"].as_array().expect("pages") {
            let TransferDispatch::Response(page) = owner
                .handle(
                    json!({
                        "action":"get_output_page",
                        "sessionId":session_id,
                        "kind":descriptor["kind"],
                        "pageIndex":descriptor["pageIndex"],
                    }),
                    12,
                )
                .expect("page")
            else {
                panic!("page response");
            };
            content.push_str(page["rows"][0].as_str().expect("content"));
        }
        assert_eq!(
            serde_json::from_str::<Value>(&content).expect("json"),
            result
        );
    }

    #[test]
    fn publishes_and_cancels_hash_bound_host_export_entries() {
        let root = temporary_root("host-export-entries");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let content = json!({
            "entries":[
                {"path":"runtime/payloads/paper-artifacts-manifest.json","text":"{}\n"},
                {"path":"runtime/payloads/artifacts/1_TEST/references.json","text":"x".repeat(100_000)},
            ]
        });
        let reference = owner
            .publish_host_export_entries("paper_artifacts.export_filtered", &content, 10)
            .expect("publish export entries");
        let session_id = reference.session_id.as_str();
        let root_sha256 = reference.root_sha256.as_str();
        let manifest = owner
            .handle_content(
                json!({"action":"get_output_manifest","sessionId":session_id}),
                11,
            )
            .expect("manifest");
        assert_eq!(manifest["header"]["target"], "host_export_entries");
        assert_eq!(manifest["rootSha256"], root_sha256);
        owner
            .handle_content(json!({"action":"cancel","sessionId":session_id}), 12)
            .expect("cancel");
        assert_eq!(owner.snapshot()["sessions"], 0);
    }

    #[test]
    fn stages_canonical_pages_on_disk_and_reaps_idle_sessions() {
        let root = temporary_root("staging");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let pages = [
            page(
                "library_nodes",
                json!([{"nodeId":"paper:A","title":"A","authors":[],"aliases":[]}]),
            ),
            page("references", json!([])),
        ];
        let begun = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"test",
                    "manifest":input_manifest(&pages),
                }),
                1,
            )
            .expect("begin");
        let TransferDispatch::Response(begun) = begun else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id");
        for page in pages {
            owner
                .handle(
                    json!({
                        "action":"put_input_page",
                        "sessionId":session_id,
                        "page":page,
                    }),
                    2,
                )
                .expect("stage page");
        }
        let TransferDispatch::Response(sealed) = owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal")
        else {
            panic!("seal response");
        };
        assert_eq!(sealed["state"], "input_sealed");
        assert_eq!(owner.sessions[session_id].pages.len(), 2);
        assert!(
            owner.sessions[session_id]
                .pages
                .values()
                .all(|page| page.path.is_file())
        );
        let TransferDispatch::Execute(execution) = owner
            .handle(json!({"action":"execute","sessionId":session_id}), 4)
            .expect("execute")
        else {
            panic!("execute dispatch");
        };
        let TransferExecution {
            source, mut sink, ..
        } = *execution;
        let (_, attempt) = source.identity();
        sink.rollback();
        owner.mark_executing(session_id, attempt, 5);
        owner.finish_attempt(session_id, attempt, Err("worker_timeout".to_owned()), 6);
        let TransferDispatch::Response(failed) = owner
            .handle(json!({"action":"status","sessionId":session_id}), 7)
            .expect("failed status")
        else {
            panic!("status response");
        };
        assert_eq!(failed["state"], "input_sealed");
        assert_eq!(
            failed["execution"]["lastFailure"],
            json!({"code":"worker_timeout","retryable":true,"atMs":6})
        );

        owner.reap(IDLE_TTL_MS + 8);
        assert_eq!(owner.snapshot()["sessions"], 0);
        assert!(
            !root
                .join("citation-graph-transfer")
                .read_dir()
                .is_ok_and(|mut entries| entries.next().is_some())
        );
    }

    #[test]
    fn restart_cleanup_and_attempt_rollback_are_disposable() {
        let root = temporary_root("restart");
        let stale = root.join("citation-graph-transfer/stale");
        fs::create_dir_all(&stale).expect("stale root");
        fs::write(stale.join("page.json"), b"stale").expect("stale page");
        let owner = NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        assert!(!stale.exists());
        drop(owner);

        let attempt_root = root.join("attempt");
        fs::create_dir_all(&attempt_root).expect("attempt root");
        let mut sink = TransferOutputSink {
            session_id: "session".to_owned(),
            attempt: 1,
            root: attempt_root.clone(),
            header: None,
            pages: Vec::new(),
            staged_bytes: 0,
            reservations: Vec::new(),
            service_bytes: ByteBudget::new(),
            committed: false,
        };
        sink.begin(
            json!({
                "contractVersion":"synthesis-citation-graph-build.v1",
                "scope":{"kind":"full","sourceIds":[]},
                "diagnostics":{},
            })
            .as_object()
            .expect("header")
            .clone(),
        )
        .expect("begin output");
        sink.stage_page(PagedOutputFrame {
            section: "nodes".to_owned(),
            page_index: 0,
            rows: vec![json!({"nodeId":"paper:A"})],
        })
        .expect("stage output");
        assert!(attempt_root.is_dir());
        sink.rollback();
        assert!(!attempt_root.exists());
    }

    #[test]
    fn active_attempts_are_hidden_before_cleanup_but_keep_files_until_finish() {
        let root = temporary_root("active-cleanup");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let pages = [
            page(
                "library_nodes",
                json!([{"nodeId":"paper:A","title":"A","authors":[],"aliases":[]}]),
            ),
            page("references", json!([])),
        ];
        let TransferDispatch::Response(begun) = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"active-cleanup",
                    "manifest":input_manifest(&pages),
                }),
                1,
            )
            .expect("begin")
        else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id").to_owned();
        for staged in pages {
            owner
                .handle(
                    json!({"action":"put_input_page","sessionId":session_id,"page":staged}),
                    2,
                )
                .expect("put page");
        }
        owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal");
        let TransferDispatch::Execute(execution) = owner
            .handle(json!({"action":"execute","sessionId":session_id}), 4)
            .expect("execute")
        else {
            panic!("execute dispatch");
        };
        let TransferExecution {
            source, mut sink, ..
        } = *execution;
        let session_root = owner.sessions[&session_id].root.clone();
        let (_, attempt) = source.identity();

        owner.reap(ABSOLUTE_TTL_MS + 5);
        assert!(
            session_root.is_dir(),
            "active attempt files must stay pinned"
        );
        assert!(
            owner
                .handle(json!({"action":"status","sessionId":session_id}), 6)
                .is_err(),
            "expired active session must be hidden immediately",
        );

        sink.rollback();
        owner.finish_attempt(&session_id, attempt, Err("worker_canceled".into()), 7);
        assert!(!session_root.exists());
        assert_eq!(owner.snapshot()["stagedBytes"], 0);
    }

    #[test]
    fn stop_and_late_output_rollback_release_each_byte_once() {
        let root = temporary_root("stop-byte-ownership");
        let mut owner =
            NativeTransferOwner::new(&root, production_client_membership()).expect("owner");
        let pages = [
            page(
                "library_nodes",
                json!([{"nodeId":"paper:A","title":"A","authors":[],"aliases":[]}]),
            ),
            page("references", json!([])),
        ];
        let TransferDispatch::Response(begun) = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"stop-byte-ownership",
                    "manifest":input_manifest(&pages),
                }),
                1,
            )
            .expect("begin")
        else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id").to_owned();
        for staged in pages {
            owner
                .handle(
                    json!({"action":"put_input_page","sessionId":session_id,"page":staged}),
                    2,
                )
                .expect("put page");
        }
        owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal");
        let TransferDispatch::Execute(execution) = owner
            .handle(json!({"action":"execute","sessionId":session_id}), 4)
            .expect("execute")
        else {
            panic!("execute dispatch");
        };
        let TransferExecution {
            source, mut sink, ..
        } = *execution;
        let (_, attempt) = source.identity();
        sink.begin(
            json!({
                "contractVersion":"synthesis-citation-graph-build.v1",
                "scope":{"kind":"full","sourceIds":[]},
                "diagnostics":{},
            })
            .as_object()
            .expect("header")
            .clone(),
        )
        .expect("begin output");
        sink.stage_page(PagedOutputFrame {
            section: "nodes".into(),
            page_index: 0,
            rows: vec![json!({"nodeId":"paper:A"})],
        })
        .expect("stage output");
        assert!(owner.total_staged_bytes() > 0);

        owner.request_stop();
        sink.rollback();
        owner.finish_attempt(&session_id, attempt, Err("worker_canceled".into()), 5);
        assert_eq!(owner.total_staged_bytes(), 0);
    }
}
