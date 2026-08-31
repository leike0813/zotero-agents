use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::runtime_background_tasks::BackgroundTaskOwner;
use crate::runtime_contract::current_time_ms;
use crate::runtime_deadline::with_request_context;
use crate::runtime_diagnostics::{NativeDiagnosticEvent, debug_events_enabled, emit_debug};
use crate::runtime_public_maintenance_operation::{
    control as control_maintenance_operation, submit as submit_maintenance_operation,
    with_operation_context,
};
use crate::runtime_webdav_maintenance_surface::{
    public_maintenance_control_request, public_maintenance_not_found,
    public_maintenance_operation_dto,
};
use synthesis_protocol::utc_now_iso8601;
use synthesis_repository::{RepositorySqlObservation, observe_repository_sql};

const PRODUCTION_CLIENT_CAPABILITY_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/capabilities.json"
);
const PRODUCTION_CLIENT_OPERATION_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json"
);

pub(crate) type ProductionClientHandler =
    fn(&crate::runtime_production_ports::ProductionApplications, &[Value]) -> Result<Value, String>;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ProductionClientSpecialStep {
    None,
    ArtifactExportDelivery,
    MaintenanceControl,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ProductionClientCanonicalEffect {
    None,
    Persisted,
    Deleted,
    Committed,
    Mutated,
    NonEmptyPromotion,
    ReferencePromotion,
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct ProductionClientRouteEntry {
    pub(crate) capability: &'static str,
    pub(crate) handler: ProductionClientHandler,
    special_step: ProductionClientSpecialStep,
    canonical_effect: ProductionClientCanonicalEffect,
}

impl ProductionClientRouteEntry {
    pub(crate) const fn new(capability: &'static str, handler: ProductionClientHandler) -> Self {
        Self {
            capability,
            handler,
            special_step: ProductionClientSpecialStep::None,
            canonical_effect: ProductionClientCanonicalEffect::None,
        }
    }

    pub(crate) const fn with_special_step(
        mut self,
        special_step: ProductionClientSpecialStep,
    ) -> Self {
        self.special_step = special_step;
        self
    }

    pub(crate) const fn with_canonical_effect(
        mut self,
        canonical_effect: ProductionClientCanonicalEffect,
    ) -> Self {
        self.canonical_effect = canonical_effect;
        self
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientCapabilityManifest {
    schema: String,
    canonicalization: String,
    fingerprint_sha256: String,
    capabilities: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ProductionClientAccess {
    Read,
    Mutation,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ProductionClientDataPlane {
    Control,
    Transfer,
    Locator,
    Delivery,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ProductionClientWorkModel {
    Bounded,
    Receipt,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ProductionClientReceipt {
    Inline,
    PublicMaintenanceOperation,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProductionClientSemanticSuccess {
    pub(crate) field: String,
    pub(crate) values: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientPolicy {
    request_plane: ProductionClientDataPlane,
    result_plane: ProductionClientDataPlane,
    work_model: ProductionClientWorkModel,
    receipt: ProductionClientReceipt,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientPolicyOverride {
    request_plane: Option<ProductionClientDataPlane>,
    result_plane: Option<ProductionClientDataPlane>,
    work_model: Option<ProductionClientWorkModel>,
    receipt: Option<ProductionClientReceipt>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientOperationManifest {
    schema: String,
    request_codec: String,
    result_codec: String,
    request_bytes: usize,
    response_bytes: usize,
    control_target_bytes: usize,
    deadline_ms: u64,
    deadline_overrides_ms: BTreeMap<String, u64>,
    work_deadline_ms: BTreeMap<String, u64>,
    receipt_query_capability: String,
    policy_defaults: ProductionClientPolicy,
    policy_overrides: BTreeMap<String, ProductionClientPolicyOverride>,
    access: BTreeMap<String, ProductionClientAccess>,
    #[serde(default)]
    semantic_success: BTreeMap<String, ProductionClientSemanticSuccess>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ProductionClientOperationMetadata {
    pub(crate) access: ProductionClientAccess,
    pub(crate) request_plane: ProductionClientDataPlane,
    pub(crate) result_plane: ProductionClientDataPlane,
    pub(crate) work_model: ProductionClientWorkModel,
    pub(crate) receipt: ProductionClientReceipt,
    pub(crate) control_target_bytes: usize,
    pub(crate) request_bytes: usize,
    pub(crate) response_bytes: usize,
    pub(crate) deadline_ms: u64,
    pub(crate) work_deadline_ms: Option<u64>,
    pub(crate) semantic_success: Option<ProductionClientSemanticSuccess>,
}

#[derive(Clone, Debug)]
struct ProductionClientRoute {
    entry: ProductionClientRouteEntry,
    metadata: ProductionClientOperationMetadata,
}

#[derive(Clone)]
pub(crate) struct ResolvedMaintenanceRoute {
    operation_type: String,
    handler: ProductionClientHandler,
    canonical_effect: ProductionClientCanonicalEffect,
    work_deadline_ms: u64,
    semantic_success: Option<ProductionClientSemanticSuccess>,
}

impl ResolvedMaintenanceRoute {
    pub(crate) fn operation_type(&self) -> &str {
        &self.operation_type
    }

    pub(crate) fn work_deadline_ms(&self) -> u64 {
        self.work_deadline_ms
    }

    pub(crate) fn semantic_success(&self) -> Option<&ProductionClientSemanticSuccess> {
        self.semantic_success.as_ref()
    }

    pub(crate) fn execute(
        &self,
        applications: &crate::runtime_production_ports::ProductionApplications,
        request_id: &str,
        operation_id: &str,
        args: &[Value],
    ) -> Result<Value, String> {
        let mut canonical_maintenance = applications
            .canonical_autosync
            .begin_maintenance(self.canonical_effect);
        let observed_at = Instant::now();
        let (outcome, sql_observation) = observe_repository_sql(|| {
            with_request_context(
                Duration::from_millis(self.work_deadline_ms),
                debug_events_enabled().then_some(request_id),
                || with_operation_context(operation_id, || (self.handler)(applications, args)),
            )
        });
        emit_query_observation(&self.operation_type, &outcome, sql_observation);
        if let (Some(maintenance), Ok(result)) = (canonical_maintenance.as_mut(), outcome.as_ref())
        {
            maintenance.observe(result, sql_observation.write_count);
            record_semantic_mutation_result(
                &self.operation_type,
                self.semantic_success.as_ref(),
                result,
                observed_at.elapsed(),
            );
        }
        outcome
    }
}

#[derive(Debug)]
pub(crate) struct ProductionClientCatalog {
    capability_ids: Vec<String>,
    routes: BTreeMap<String, ProductionClientRoute>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub(crate) enum ProductionClientCatalogIssueKind {
    InvalidCapabilityManifest,
    InvalidOperationManifest,
    FingerprintMismatch,
    MissingHandler,
    DuplicateHandler,
    UndeclaredHandler,
    MissingPolicy,
    InvalidExecutionPlan,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ProductionClientCatalogIssue {
    pub(crate) kind: ProductionClientCatalogIssueKind,
    pub(crate) capability: Option<String>,
}

#[derive(Debug)]
pub(crate) struct ProductionClientCatalogError {
    pub(crate) issues: Vec<ProductionClientCatalogIssue>,
}

impl std::fmt::Display for ProductionClientCatalogError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "invalid_production_client_catalog")?;
        for issue in &self.issues {
            write!(
                formatter,
                ";{:?}:{}",
                issue.kind,
                issue.capability.as_deref().unwrap_or("-")
            )?;
        }
        Ok(())
    }
}

impl std::error::Error for ProductionClientCatalogError {}

impl ProductionClientCatalog {
    pub(crate) fn from_embedded() -> Result<Self, ProductionClientCatalogError> {
        Self::from_sources(
            PRODUCTION_CLIENT_CAPABILITY_MANIFEST,
            PRODUCTION_CLIENT_OPERATION_MANIFEST,
            &production_client_route_entries(),
        )
    }

    fn from_sources(
        capability_source: &str,
        operation_source: &str,
        entries: &[ProductionClientRouteEntry],
    ) -> Result<Self, ProductionClientCatalogError> {
        let manifest: ProductionClientCapabilityManifest = serde_json::from_str(capability_source)
            .map_err(|_| ProductionClientCatalogError {
                issues: vec![ProductionClientCatalogIssue {
                    kind: ProductionClientCatalogIssueKind::InvalidCapabilityManifest,
                    capability: None,
                }],
            })?;
        let operation_manifest =
            production_client_operation_manifest(operation_source).map_err(|_| {
                ProductionClientCatalogError {
                    issues: vec![ProductionClientCatalogIssue {
                        kind: ProductionClientCatalogIssueKind::InvalidOperationManifest,
                        capability: None,
                    }],
                }
            })?;
        let metadata = production_client_operation_metadata(&operation_manifest);
        let declared = manifest
            .capabilities
            .iter()
            .map(String::as_str)
            .collect::<BTreeSet<_>>();
        let computed_fingerprint = production_client_fingerprint(&manifest.capabilities);
        let mut issues = Vec::new();
        if manifest.schema != "synthesis-production-client-capabilities.v1"
            || manifest.canonicalization != "sorted-newline-terminated"
            || manifest
                .capabilities
                .iter()
                .any(|capability| !capability.starts_with("client."))
            || declared.len() != manifest.capabilities.len()
        {
            issues.push(ProductionClientCatalogIssue {
                kind: ProductionClientCatalogIssueKind::InvalidCapabilityManifest,
                capability: None,
            });
        }
        if manifest.fingerprint_sha256 != computed_fingerprint {
            issues.push(ProductionClientCatalogIssue {
                kind: ProductionClientCatalogIssueKind::FingerprintMismatch,
                capability: None,
            });
        }
        for capability in &manifest.capabilities {
            let matching = entries
                .iter()
                .filter(|entry| entry.capability == capability)
                .collect::<Vec<_>>();
            if matching.is_empty() {
                issues.push(catalog_issue(
                    ProductionClientCatalogIssueKind::MissingHandler,
                    capability,
                ));
            } else if matching.len() > 1 {
                issues.push(catalog_issue(
                    ProductionClientCatalogIssueKind::DuplicateHandler,
                    capability,
                ));
            }
            let Some(operation) = metadata.get(capability) else {
                issues.push(catalog_issue(
                    ProductionClientCatalogIssueKind::MissingPolicy,
                    capability,
                ));
                continue;
            };
            if matching
                .iter()
                .any(|entry| !valid_execution_plan(entry, operation))
            {
                issues.push(catalog_issue(
                    ProductionClientCatalogIssueKind::InvalidExecutionPlan,
                    capability,
                ));
            }
        }
        for entry in entries {
            if !declared.contains(entry.capability) {
                issues.push(catalog_issue(
                    ProductionClientCatalogIssueKind::UndeclaredHandler,
                    entry.capability,
                ));
            }
        }
        if operation_manifest
            .access
            .keys()
            .any(|capability| !declared.contains(capability.as_str()))
        {
            issues.push(ProductionClientCatalogIssue {
                kind: ProductionClientCatalogIssueKind::InvalidOperationManifest,
                capability: None,
            });
        }
        issues.sort_by(|left, right| {
            left.capability
                .cmp(&right.capability)
                .then(left.kind.cmp(&right.kind))
        });
        if !issues.is_empty() {
            return Err(ProductionClientCatalogError { issues });
        }

        let entries = entries
            .iter()
            .copied()
            .map(|entry| (entry.capability, entry))
            .collect::<BTreeMap<_, _>>();
        let routes = manifest
            .capabilities
            .iter()
            .map(|capability| {
                let entry = *entries.get(capability.as_str()).expect("validated route");
                let metadata = metadata
                    .get(capability)
                    .expect("validated metadata")
                    .clone();
                (
                    capability.clone(),
                    ProductionClientRoute { entry, metadata },
                )
            })
            .collect();
        Ok(Self {
            capability_ids: manifest.capabilities,
            routes,
        })
    }

    #[cfg(test)]
    pub(crate) fn capability_ids(&self) -> Vec<&str> {
        self.capability_ids.iter().map(String::as_str).collect()
    }

    #[cfg(test)]
    pub(crate) fn contains(&self, capability: &str) -> bool {
        self.routes.contains_key(capability)
    }

    #[cfg(test)]
    pub(crate) fn fingerprint(&self) -> String {
        production_client_fingerprint(&self.capability_ids)
    }

    fn route(&self, capability: &str) -> Option<&ProductionClientRoute> {
        self.routes.get(capability)
    }

    pub(crate) fn resolve_maintenance(&self, capability: &str) -> Option<ResolvedMaintenanceRoute> {
        let route = self.route(capability)?;
        if route.metadata.receipt != ProductionClientReceipt::PublicMaintenanceOperation {
            return None;
        }
        Some(ResolvedMaintenanceRoute {
            operation_type: capability.to_owned(),
            handler: route.entry.handler,
            canonical_effect: route.entry.canonical_effect,
            work_deadline_ms: route.metadata.work_deadline_ms?,
            semantic_success: route.metadata.semantic_success.clone(),
        })
    }

    pub(crate) fn membership(&self) -> ProductionClientMembership {
        ProductionClientMembership {
            capabilities: Arc::new(self.capability_ids.iter().cloned().collect()),
        }
    }
}

#[derive(Clone)]
pub(crate) struct ProductionClientMembership {
    capabilities: Arc<BTreeSet<String>>,
}

impl ProductionClientMembership {
    pub(crate) fn contains(&self, capability: &str) -> bool {
        self.capabilities.contains(capability)
    }
}

pub(crate) struct ProductionClientRuntime {
    catalog: Arc<ProductionClientCatalog>,
    applications: Arc<crate::runtime_production_ports::ProductionApplications>,
    transfer: Arc<Mutex<crate::runtime_transfer::NativeTransferOwner>>,
    background_tasks: Arc<BackgroundTaskOwner>,
}

impl ProductionClientRuntime {
    pub(crate) fn new(
        catalog: Arc<ProductionClientCatalog>,
        applications: Arc<crate::runtime_production_ports::ProductionApplications>,
        transfer: Arc<Mutex<crate::runtime_transfer::NativeTransferOwner>>,
        background_tasks: Arc<BackgroundTaskOwner>,
    ) -> Self {
        Self {
            catalog,
            applications,
            transfer,
            background_tasks,
        }
    }

    pub(crate) fn execute(
        &self,
        request_id: &str,
        capability: &str,
        payload: Value,
    ) -> Result<Value, String> {
        dispatch_production_client(self, request_id, capability, payload)
    }
}

fn catalog_issue(
    kind: ProductionClientCatalogIssueKind,
    capability: impl Into<String>,
) -> ProductionClientCatalogIssue {
    ProductionClientCatalogIssue {
        kind,
        capability: Some(capability.into()),
    }
}

fn valid_execution_plan(
    entry: &ProductionClientRouteEntry,
    metadata: &ProductionClientOperationMetadata,
) -> bool {
    let special_step_valid = match entry.special_step {
        ProductionClientSpecialStep::None => {
            metadata.result_plane != ProductionClientDataPlane::Delivery
        }
        ProductionClientSpecialStep::ArtifactExportDelivery => {
            metadata.work_model == ProductionClientWorkModel::Bounded
                && metadata.result_plane == ProductionClientDataPlane::Delivery
        }
        ProductionClientSpecialStep::MaintenanceControl => {
            metadata.work_model == ProductionClientWorkModel::Bounded
                && metadata.request_plane == ProductionClientDataPlane::Control
                && metadata.result_plane == ProductionClientDataPlane::Control
        }
    };
    let canonical_effect_valid = match entry.canonical_effect {
        ProductionClientCanonicalEffect::None => true,
        ProductionClientCanonicalEffect::ReferencePromotion => {
            metadata.work_model == ProductionClientWorkModel::Receipt
                && metadata.access == ProductionClientAccess::Mutation
        }
        ProductionClientCanonicalEffect::Persisted
        | ProductionClientCanonicalEffect::Deleted
        | ProductionClientCanonicalEffect::Committed
        | ProductionClientCanonicalEffect::Mutated
        | ProductionClientCanonicalEffect::NonEmptyPromotion => {
            metadata.work_model == ProductionClientWorkModel::Bounded
                && metadata.access == ProductionClientAccess::Mutation
        }
    };
    special_step_valid && canonical_effect_valid
}

fn production_client_fingerprint(capabilities: &[String]) -> String {
    let mut capabilities = capabilities.iter().map(String::as_str).collect::<Vec<_>>();
    capabilities.sort_unstable();
    let canonical = format!("{}\n", capabilities.join("\n"));
    format!("{:x}", Sha256::digest(canonical.as_bytes()))
}

fn production_client_route_entries() -> Vec<ProductionClientRouteEntry> {
    crate::runtime_topic_workbench_surface::TOPIC_WORKBENCH_CLIENT_ROUTES
        .iter()
        .chain(crate::runtime_reference_citation_surface::REFERENCE_CITATION_CLIENT_ROUTES)
        .chain(crate::runtime_tag_surface::TAG_CLIENT_ROUTES)
        .chain(crate::runtime_concept_topic_graph_surface::CONCEPT_TOPIC_GRAPH_CLIENT_ROUTES)
        .chain(crate::runtime_artifact_library_debug::ARTIFACT_LIBRARY_DEBUG_CLIENT_ROUTES)
        .chain(crate::runtime_webdav_maintenance_surface::WEBDAV_MAINTENANCE_CLIENT_ROUTES)
        .copied()
        .collect()
}

fn resolved_policy(
    manifest: &ProductionClientOperationManifest,
    capability: &str,
) -> ProductionClientPolicy {
    let defaults = manifest.policy_defaults;
    let policy = manifest
        .policy_overrides
        .get(capability)
        .copied()
        .unwrap_or_default();
    ProductionClientPolicy {
        request_plane: policy.request_plane.unwrap_or(defaults.request_plane),
        result_plane: policy.result_plane.unwrap_or(defaults.result_plane),
        work_model: policy.work_model.unwrap_or(defaults.work_model),
        receipt: policy.receipt.unwrap_or(defaults.receipt),
    }
}

fn valid_policy(access: ProductionClientAccess, policy: ProductionClientPolicy) -> bool {
    matches!(
        policy.request_plane,
        ProductionClientDataPlane::Control | ProductionClientDataPlane::Transfer
    ) && matches!(
        policy.result_plane,
        ProductionClientDataPlane::Control
            | ProductionClientDataPlane::Locator
            | ProductionClientDataPlane::Delivery
    ) && matches!(
        (policy.work_model, policy.receipt),
        (
            ProductionClientWorkModel::Bounded,
            ProductionClientReceipt::Inline
        ) | (
            ProductionClientWorkModel::Receipt,
            ProductionClientReceipt::PublicMaintenanceOperation
        )
    ) && (policy.work_model != ProductionClientWorkModel::Receipt
        || access == ProductionClientAccess::Mutation)
}

fn production_client_operation_manifest(
    source: &str,
) -> Result<ProductionClientOperationManifest, String> {
    let manifest: ProductionClientOperationManifest = serde_json::from_str(source)
        .map_err(|_| "invalid_production_operation_manifest".to_owned())?;
    if manifest.schema != "synthesis-production-client-operations.v2"
        || manifest.request_codec != "synthesis-client-args.v1"
        || manifest.result_codec != "synthesis-client-result.v1"
        || manifest.request_bytes == 0
        || manifest.request_bytes > 8 * 1024 * 1024
        || manifest.response_bytes == 0
        || manifest.response_bytes > 8 * 1024 * 1024
        || manifest.control_target_bytes == 0
        || manifest.control_target_bytes > manifest.request_bytes
        || manifest.control_target_bytes > manifest.response_bytes
        || manifest.receipt_query_capability != "client.getPublicMaintenanceOperation"
        || manifest.policy_defaults
            != (ProductionClientPolicy {
                request_plane: ProductionClientDataPlane::Control,
                result_plane: ProductionClientDataPlane::Control,
                work_model: ProductionClientWorkModel::Bounded,
                receipt: ProductionClientReceipt::Inline,
            })
        || manifest
            .policy_overrides
            .keys()
            .any(|capability| !manifest.access.contains_key(capability))
        || manifest.access.iter().any(|(capability, access)| {
            !valid_policy(*access, resolved_policy(&manifest, capability))
        })
        || !(100..=60_000).contains(&manifest.deadline_ms)
        || manifest
            .deadline_overrides_ms
            .iter()
            .any(|(capability, deadline)| {
                !manifest.access.contains_key(capability) || !(100..=60_000).contains(deadline)
            })
        || manifest
            .work_deadline_ms
            .iter()
            .any(|(capability, deadline)| {
                !manifest.access.contains_key(capability)
                    || resolved_policy(&manifest, capability).receipt
                        != ProductionClientReceipt::PublicMaintenanceOperation
                    || !(100..=1_800_000).contains(deadline)
            })
        || manifest.access.keys().any(|capability| {
            (resolved_policy(&manifest, capability).receipt
                == ProductionClientReceipt::PublicMaintenanceOperation)
                != manifest.work_deadline_ms.contains_key(capability)
        })
        || manifest.access.keys().any(|capability| {
            resolved_policy(&manifest, capability).receipt
                == ProductionClientReceipt::PublicMaintenanceOperation
                && !manifest.semantic_success.contains_key(capability)
        })
        || manifest.semantic_success.iter().any(|(capability, rule)| {
            !manifest.access.contains_key(capability)
                || !matches!(rule.field.as_str(), "status" | "queue_state")
                || rule.values.is_empty()
                || rule.values.iter().any(|value| {
                    value.is_empty()
                        || value.len() > 128
                        || !value.bytes().all(|byte| {
                            byte.is_ascii_lowercase()
                                || byte.is_ascii_digit()
                                || b"_.:-".contains(&byte)
                        })
                })
        })
    {
        return Err("invalid_production_operation_manifest".into());
    }
    Ok(manifest)
}

fn production_client_operation_metadata(
    manifest: &ProductionClientOperationManifest,
) -> BTreeMap<String, ProductionClientOperationMetadata> {
    manifest
        .access
        .iter()
        .map(|(capability, access)| {
            let policy = resolved_policy(manifest, capability);
            let deadline_ms = manifest
                .deadline_overrides_ms
                .get(capability)
                .copied()
                .unwrap_or(manifest.deadline_ms);
            (
                capability.clone(),
                ProductionClientOperationMetadata {
                    access: *access,
                    request_plane: policy.request_plane,
                    result_plane: policy.result_plane,
                    work_model: policy.work_model,
                    receipt: policy.receipt,
                    control_target_bytes: manifest.control_target_bytes,
                    request_bytes: manifest.request_bytes,
                    response_bytes: manifest.response_bytes,
                    deadline_ms,
                    work_deadline_ms: manifest.work_deadline_ms.get(capability).copied(),
                    semantic_success: manifest.semantic_success.get(capability).cloned(),
                },
            )
        })
        .collect()
}

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientRequestTransferControl {
    request_transfer: TopicApplyTransferReference,
}

#[cfg(test)]
fn dispatch_typed_client(
    apps: &crate::runtime_production_ports::ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    let entry = production_client_route_entries()
        .into_iter()
        .find(|entry| entry.capability == capability)
        .ok_or_else(|| "operation_unavailable".to_owned())?;
    (entry.handler)(apps, args)
}

fn dispatch_artifact_export(
    runtime: &ProductionClientRuntime,
    result: Value,
) -> Result<Value, String> {
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
    let published = runtime
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
        ArtifactExportDestination::RunWorkspace { run_root } => runtime.applications.call_host(
            "delivery.export.materialize_run_workspace",
            json!({
                "capability":"paper_artifacts.export_filtered",
                "runRoot":run_root,
                "contentTransfer":content_transfer,
            }),
        ),
        ArtifactExportDestination::Archive { display_name } => runtime.applications.call_host(
            "delivery.export.publish_archive",
            json!({
                "capability":"paper_artifacts.export_filtered",
                "displayName":display_name,
                "contentTransfer":content_transfer,
            }),
        ),
    };
    let cleanup = runtime
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

fn dispatch_production_client(
    runtime: &ProductionClientRuntime,
    request_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let route = runtime
        .catalog
        .route(capability)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let metadata = &route.metadata;
    let control_payload_bytes = serde_json::to_vec(&payload)
        .map_err(|_| "invalid_request".to_owned())?
        .len();
    if control_payload_bytes > metadata.request_bytes {
        return Err("request_too_large".into());
    }
    let transferred_request = metadata.request_plane == ProductionClientDataPlane::Transfer
        && payload.pointer("/args/0/requestTransfer").is_some();
    let payload = if transferred_request {
        let control: ClientArguments =
            serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
        if control.args.len() != 1 {
            return Err("invalid_request".into());
        }
        let transfer_control: ProductionClientRequestTransferControl =
            serde_json::from_value(control.args[0].clone())
                .map_err(|_| "invalid_request".to_owned())?;
        runtime
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .production_client_request(&transfer_control.request_transfer.session_id, capability)?
    } else {
        payload
    };
    let payload_bytes = serde_json::to_vec(&payload)
        .map_err(|_| "invalid_request".to_owned())?
        .len();
    let request_limit = match capability {
        "client.applyTopicPlan" => 64 * 1024 * 1024,
        "client.appendTagAuditRun" => 8 * 1024 * 1024,
        _ => metadata.request_bytes,
    };
    if payload_bytes > request_limit {
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
        if envelope.args.len() != 1 {
            return Err("invalid_request".to_owned());
        }
        let control: TopicApplyTransferControl = serde_json::from_value(envelope.args[0].clone())
            .map_err(|_| "invalid_request".to_owned())?;
        let assets = runtime
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .topic_apply_assets(&control.asset_transfer.session_id)?;
        vec![json!({"bundle":control.bundle,"assets":assets})]
    } else if !transferred_request
        && metadata.request_plane == ProductionClientDataPlane::Transfer
        && payload_bytes > metadata.control_target_bytes
    {
        return Err("request_too_large".to_owned());
    } else {
        envelope.args
    };
    if metadata.receipt == ProductionClientReceipt::PublicMaintenanceOperation {
        let maintenance_route = runtime
            .catalog
            .resolve_maintenance(capability)
            .ok_or_else(|| "operation_unavailable".to_owned())?;
        let view = submit_maintenance_operation(
            &runtime.applications,
            &runtime.background_tasks,
            maintenance_route,
            request_id,
            operation_args,
        )?;
        return public_maintenance_operation_dto(&view);
    }
    let started_at = Instant::now();
    let (outcome, sql_observation) = observe_repository_sql(|| {
        with_request_context(
            Duration::from_millis(metadata.deadline_ms),
            debug_events_enabled().then_some(request_id),
            || {
                if route.entry.special_step == ProductionClientSpecialStep::MaintenanceControl {
                    dispatch_public_maintenance_control(runtime, request_id, &operation_args)
                } else {
                    let result = (route.entry.handler)(&runtime.applications, &operation_args)?;
                    if route.entry.special_step
                        == ProductionClientSpecialStep::ArtifactExportDelivery
                    {
                        dispatch_artifact_export(runtime, result)
                    } else {
                        Ok(result)
                    }
                }
            },
        )
    });
    emit_query_observation(capability, &outcome, sql_observation);
    if let Ok(result) = outcome.as_ref() {
        runtime.applications.canonical_autosync.observe_commit(
            route.entry.canonical_effect,
            result,
            sql_observation.write_count,
        );
    }
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
        runtime
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
    runtime: &ProductionClientRuntime,
    request_id: &str,
    operation_args: &[Value],
) -> Result<Value, String> {
    let (command, operation_id) = public_maintenance_control_request(operation_args)?;
    let view = match control_maintenance_operation(
        &runtime.applications,
        &runtime.background_tasks,
        runtime.catalog.as_ref(),
        request_id,
        &command,
        &utc_now_iso8601(),
    ) {
        Ok(view) => view,
        Err(code) if code == "not_found" => {
            return Ok(public_maintenance_not_found(&operation_id));
        }
        Err(code) => return Err(code),
    };
    public_maintenance_operation_dto(&view)
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
    use std::path::Path;
    use std::sync::{Arc, Mutex};

    use super::*;
    use serde_json::json;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{CacheBasisRecord, Repository, RepositoryIdentity};

    use crate::runtime_host_collection::{
        HostItemCollectionPort, ReferenceHostItem, ReferenceHostItemsByRef, ReferenceHostItemsPage,
    };
    use crate::runtime_production_ports::{ProductionApplications, build_production_applications};
    use crate::runtime_worker_pool::NativeComputePool;
    use synthesis_application::reference::{
        ReferenceHostArtifactRead, ReferenceHostArtifactsPage, ReferenceHostPort,
    };

    struct LiteratureDigestHost;

    impl LiteratureDigestHost {
        fn item(item_key: &str) -> ReferenceHostItem {
            ReferenceHostItem {
                paper_ref: format!("1:{item_key}"),
                library_id: 1,
                item_key: item_key.into(),
                item_type: "journalArticle".into(),
                title: "Matched paper".into(),
                year: "2024".into(),
                date: "2024".into(),
                creators: vec!["Matched Author".into()],
                tags: Vec::new(),
                collections: Vec::new(),
                doi: String::new(),
                arxiv: String::new(),
                isbn: String::new(),
                url: String::new(),
                citekey: String::new(),
                date_added: "2024-01-01".into(),
                updated_at: "2024-01-01".into(),
                metadata_hash: format!("sha256:{}", "a".repeat(64)),
            }
        }
    }

    impl HostItemCollectionPort for LiteratureDigestHost {
        fn list_items_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            if !cursor.is_empty() || limit == 0 {
                return Err("reverse_host_result_invalid".into());
            }
            Ok(ReferenceHostItemsPage {
                items: Vec::new(),
                cursor: String::new(),
                next_cursor: String::new(),
                snapshot_revision: "literature-digest-host:1".into(),
                has_more: false,
                returned: 0,
                limit,
            })
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            let mut items = Vec::new();
            let mut missing_paper_refs = Vec::new();
            for paper_ref in paper_refs {
                match paper_ref.as_str() {
                    "1:BBBB2222" => items.push(Self::item("BBBB2222")),
                    "1:CCCC3333" => items.push(Self::item("CCCC3333")),
                    _ => missing_paper_refs.push(paper_ref.clone()),
                }
            }
            Ok(ReferenceHostItemsByRef {
                items,
                missing_paper_refs,
            })
        }
    }

    impl ReferenceHostPort for LiteratureDigestHost {
        fn list_items_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            HostItemCollectionPort::list_items_page(self, cursor, limit)
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            HostItemCollectionPort::get_items_by_ref(self, paper_refs)
        }

        fn scan_artifacts_page(
            &self,
            _cursor: &str,
            _limit: usize,
            _paper_refs: &[String],
            _artifact_types: &[&str],
        ) -> Result<ReferenceHostArtifactsPage, String> {
            Err("reverse_host_unavailable".into())
        }

        fn read_artifact(
            &self,
            _locator: &str,
            _expected_hash: &str,
        ) -> Result<ReferenceHostArtifactRead, String> {
            Err("reverse_host_unavailable".into())
        }
    }

    fn test_root() -> synthesis_test_support::TestRoot {
        synthesis_test_support::TestRoot::new("synthesis-production-client")
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
        let mut applications = build_production_applications(
            Arc::new(synthesis_application::RepositoryPort::new(Arc::new(
                Mutex::new(repository),
            ))),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
        .expect("applications");
        let host = Arc::new(LiteratureDigestHost);
        applications.references.replace_host_for_tests(host.clone());
        applications.host_items = host;
        applications
    }

    fn test_runtime(root: &Path) -> ProductionClientRuntime {
        let catalog = Arc::new(ProductionClientCatalog::from_embedded().unwrap());
        let transfer =
            crate::runtime_transfer::NativeTransferOwner::new(root, catalog.membership())
                .expect("transfer");
        ProductionClientRuntime::new(
            catalog,
            Arc::new(test_applications(root)),
            Arc::new(Mutex::new(transfer)),
            crate::runtime_background_tasks::BackgroundTaskOwner::new(),
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
                "library_id":1,
                "item_key":"BBBB2222"
            }]
        })
    }

    fn apply_literature_digest(
        apps: &ProductionApplications,
        request: Value,
    ) -> Result<Value, String> {
        let request = serde_json::from_value::<
            synthesis_application::reference_application::LiteratureDigestApplyRequest,
        >(request)
        .map_err(|_| "invalid_request".to_owned())?;
        apps.references.apply_literature_digest(request, &|| Ok(()))
    }

    #[test]
    fn embedded_catalog_preserves_manifest_order_membership_and_fingerprint() {
        let catalog = ProductionClientCatalog::from_embedded().unwrap();
        let manifest: Value = serde_json::from_str(PRODUCTION_CLIENT_CAPABILITY_MANIFEST).unwrap();
        let declared = manifest["capabilities"].as_array().unwrap();
        let declared = declared
            .iter()
            .map(|value| value.as_str().unwrap())
            .collect::<Vec<_>>();

        assert_eq!(catalog.capability_ids(), declared);
        assert!(catalog.contains("client.listTopics"));
        assert!(!catalog.contains("client.notDeclared"));
        assert_eq!(
            catalog.fingerprint(),
            manifest["fingerprintSha256"].as_str().unwrap()
        );
    }

    #[test]
    fn unified_runtime_executes_an_inline_route_from_the_validated_catalog() {
        let root = test_root();
        let runtime = test_runtime(&root);
        let result = runtime
            .execute(
                "request:inline",
                "client.listTopics",
                json!({"args":[{"cursor":"","limit":50}]}),
            )
            .unwrap();

        assert!(result["topics"].is_array());
        assert_eq!(result["cursor"], "");
        assert_eq!(
            runtime
                .execute("request:unknown", "client.notDeclared", json!({"args":[]}))
                .unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn catalog_compiles_manifest_planes_special_steps_and_effects_into_routes() {
        let catalog = ProductionClientCatalog::from_embedded().unwrap();
        let cases = [
            (
                "client.listTopics",
                ProductionClientDataPlane::Control,
                ProductionClientDataPlane::Control,
                ProductionClientReceipt::Inline,
                ProductionClientSpecialStep::None,
                ProductionClientCanonicalEffect::None,
            ),
            (
                "client.applyTopicSynthesisResult",
                ProductionClientDataPlane::Transfer,
                ProductionClientDataPlane::Control,
                ProductionClientReceipt::Inline,
                ProductionClientSpecialStep::None,
                ProductionClientCanonicalEffect::Persisted,
            ),
            (
                "client.readPaperArtifacts",
                ProductionClientDataPlane::Control,
                ProductionClientDataPlane::Locator,
                ProductionClientReceipt::Inline,
                ProductionClientSpecialStep::None,
                ProductionClientCanonicalEffect::None,
            ),
            (
                "client.exportFilteredPaperArtifacts",
                ProductionClientDataPlane::Control,
                ProductionClientDataPlane::Delivery,
                ProductionClientReceipt::Inline,
                ProductionClientSpecialStep::ArtifactExportDelivery,
                ProductionClientCanonicalEffect::None,
            ),
            (
                "client.refreshReferenceSidecarNow",
                ProductionClientDataPlane::Control,
                ProductionClientDataPlane::Control,
                ProductionClientReceipt::PublicMaintenanceOperation,
                ProductionClientSpecialStep::None,
                ProductionClientCanonicalEffect::ReferencePromotion,
            ),
            (
                "client.controlPublicMaintenanceOperation",
                ProductionClientDataPlane::Control,
                ProductionClientDataPlane::Control,
                ProductionClientReceipt::Inline,
                ProductionClientSpecialStep::MaintenanceControl,
                ProductionClientCanonicalEffect::None,
            ),
        ];
        for (capability, request_plane, result_plane, receipt, special, effect) in cases {
            let route = catalog.route(capability).unwrap();
            assert_eq!(route.metadata.request_plane, request_plane, "{capability}");
            assert_eq!(route.metadata.result_plane, result_plane, "{capability}");
            assert_eq!(route.metadata.receipt, receipt, "{capability}");
            assert_eq!(route.entry.special_step, special, "{capability}");
            assert_eq!(route.entry.canonical_effect, effect, "{capability}");
        }
    }

    #[test]
    fn catalog_resolves_only_receipt_operations_as_opaque_maintenance_routes() {
        let catalog = ProductionClientCatalog::from_embedded().unwrap();

        let route = catalog
            .resolve_maintenance("client.refreshReferenceSidecarNow")
            .expect("maintenance route");
        assert_eq!(route.operation_type(), "client.refreshReferenceSidecarNow");
        assert!(route.work_deadline_ms() >= 100);

        assert!(catalog.resolve_maintenance("client.listTopics").is_none());
        assert!(
            catalog
                .resolve_maintenance("client.controlPublicMaintenanceOperation")
                .is_none()
        );
    }

    #[test]
    fn committed_submit_terminalizes_the_same_operation_when_dispatch_is_rejected() {
        let root = test_root();
        let runtime = test_runtime(&root);
        runtime.background_tasks.stop_admission();

        let result = runtime
            .execute(
                "request:spawn-rejected",
                "client.syncWebDavNow",
                json!({"args":[]}),
            )
            .expect("durable terminal receipt");

        assert_eq!(result["status"], "failed");
        assert_eq!(result["receipt"]["outcome"], "failed");
        assert_eq!(
            result["receipt"]["diagnostics"][0]["code"],
            "operation_spawn_failed"
        );
        let operation_id = result["operation_id"].as_str().expect("operation id");
        let observed = runtime
            .execute(
                "request:spawn-rejected-read",
                "client.getPublicMaintenanceOperation",
                json!({"args":[{"operation_id":operation_id}]}),
            )
            .expect("read terminal receipt");
        assert_eq!(observed["operation_id"], operation_id);
        assert_eq!(observed["status"], "failed");
    }

    #[test]
    fn catalog_reports_all_route_assembly_defects_together() {
        let mut entries = production_client_route_entries();
        entries.retain(|entry| entry.capability != "client.listTopics");
        let duplicate = *entries
            .iter()
            .find(|entry| entry.capability == "client.findTopicsByPaperRef")
            .unwrap();
        entries.push(duplicate);
        entries.push(ProductionClientRouteEntry::new(
            "client.notDeclared",
            duplicate.handler,
        ));
        let invalid_plan = entries
            .iter_mut()
            .find(|entry| entry.capability == "client.readTopicDetail")
            .unwrap();
        *invalid_plan =
            invalid_plan.with_special_step(ProductionClientSpecialStep::ArtifactExportDelivery);

        let mut operations: Value =
            serde_json::from_str(PRODUCTION_CLIENT_OPERATION_MANIFEST).unwrap();
        operations["access"]
            .as_object_mut()
            .unwrap()
            .remove("client.getTopicContext");
        let operations = serde_json::to_string(&operations).unwrap();
        let error = ProductionClientCatalog::from_sources(
            PRODUCTION_CLIENT_CAPABILITY_MANIFEST,
            &operations,
            &entries,
        )
        .unwrap_err();
        let issues = error
            .issues
            .iter()
            .map(|issue| (issue.kind, issue.capability.as_deref()))
            .collect::<BTreeSet<_>>();

        assert!(issues.contains(&(
            ProductionClientCatalogIssueKind::MissingHandler,
            Some("client.listTopics")
        )));
        assert!(issues.contains(&(
            ProductionClientCatalogIssueKind::DuplicateHandler,
            Some("client.findTopicsByPaperRef")
        )));
        assert!(issues.contains(&(
            ProductionClientCatalogIssueKind::UndeclaredHandler,
            Some("client.notDeclared")
        )));
        assert!(issues.contains(&(
            ProductionClientCatalogIssueKind::MissingPolicy,
            Some("client.getTopicContext")
        )));
        assert!(issues.contains(&(
            ProductionClientCatalogIssueKind::InvalidExecutionPlan,
            Some("client.readTopicDetail")
        )));
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
            {"library_id":1,"item_key":"BBBB2222"},
            {"library_id":1,"item_key":"CCCC3333"}
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
    }
}
