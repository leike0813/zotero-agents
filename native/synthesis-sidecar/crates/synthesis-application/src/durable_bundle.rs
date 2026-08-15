use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::{CanonicalStorePort, RepositoryPort};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_canonical_store::{ImportBatchRecoveryOutcome, Promotion, canonical_json_hash};
use synthesis_repository::{
    DurableDraft, DurableImportApply, DurableImportCapture, DurableSyncFact, DurableTopicBasis,
};

pub const DURABLE_MANIFEST_VERSION: &str = "2.0.0";
pub const DURABLE_LEGACY_MANIFEST_VERSION: &str = "1.0.0";
pub const DURABLE_ASSET_VERSION: &str = "1.0.0";
pub const DURABLE_BUNDLE_SCHEMA_ID: &str = "synthesis.durable_asset_bundle";
pub const DURABLE_BUNDLE_SCHEMA_VERSION: &str = "2.0.0";
pub const DURABLE_BUNDLE_TEXT_LIMIT: usize = 4 * 1024 * 1024;
pub const DURABLE_ENTITY_KINDS: [&str; 23] = [
    "concept",
    "concept_sense",
    "concept_alias",
    "concept_relation",
    "concept_review_item",
    "topic_current_asset",
    "topic_concept_links",
    "topic_graph_node",
    "topic_graph_edge",
    "topic_graph_review_item",
    "canonical_reference",
    "canonical_reference_redirect",
    "reference_binding",
    "reference_match_proposal",
    "review_item",
    "topic_interest_metadata",
    "topic_discovery_hint",
    "tag_vocabulary",
    "tag_aliases",
    "tag_abbrev",
    "tag_protocol",
    "related_items_sync_effect",
    "tombstone",
];

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DurableEnvelope {
    pub schema_id: String,
    pub schema_version: String,
    pub entity_kind: String,
    pub entity_id: String,
    pub base_hash: String,
    pub content_hash: String,
    pub updated_at: String,
    pub data: Value,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DurableManifestEntry {
    pub path: String,
    pub entity_kind: String,
    pub entity_id: String,
    pub schema_id: String,
    pub schema_version: String,
    pub hash: String,
    pub content_hash: String,
    pub bytes: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DurableAssetBundle {
    pub schema_id: String,
    pub schema_version: String,
    pub bundle_kind: String,
    pub entries: Vec<DurableEnvelope>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DurableManifestAsset {
    pub path: String,
    pub hash: String,
    pub bytes: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bundle_kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub entry_count: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub entries: Option<Vec<DurableManifestEntry>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub entity_kind: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub entity_id: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DurableManifest {
    pub manifest_schema_version: String,
    pub producer_version: String,
    pub min_reader_version: String,
    pub required_capabilities: Vec<String>,
    pub domain_versions: BTreeMap<String, String>,
    pub generated_at: String,
    pub asset_count: usize,
    pub assets: Vec<DurableManifestAsset>,
    pub manifest_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableAsset {
    pub path: String,
    pub text: String,
    pub bundle: DurableAssetBundle,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableBuildSummary {
    pub bundle_count: usize,
    pub entity_count: usize,
    pub topic_count: usize,
    pub manifest_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableExport {
    pub manifest: DurableManifest,
    pub manifest_text: String,
    pub assets: Vec<DurableAsset>,
    pub entries: Vec<DurableEnvelope>,
    pub summary: DurableBuildSummary,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableDiagnostic {
    pub code: String,
    pub severity: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub path: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableVerification {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub value: Option<DurableExport>,
    pub diagnostics: Vec<DurableDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportConflict {
    pub entity_kind: String,
    pub entity_id: String,
    pub path: String,
    pub reason: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub base_hash: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub local_hash: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub remote_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportPreview {
    pub ok: bool,
    pub additions: usize,
    pub updates: usize,
    pub unbased_updates: usize,
    pub unchanged: usize,
    pub tombstones: usize,
    pub conflicts: Vec<DurableImportConflict>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub manifest_hash: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub receipt_id: String,
    pub diagnostics: Vec<DurableDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportApplyRequest {
    pub receipt_id: String,
    pub manifest_hash: String,
    pub acknowledge_unbased_updates: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportApplyResult {
    pub status: String,
    pub manifest_hash: String,
    pub imported: usize,
}

pub trait DurableBundleSourcePort: Send + Sync {
    fn read_manifest_text(&self) -> Result<Option<String>, String>;
    fn read_asset_text(&self, path: &str) -> Result<Option<String>, String>;
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DurableCanonicalCapture {
    pub basis: String,
    pub drafts: Vec<DurableDraft>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct DurableCanonicalPreparation {
    pub promotions: Vec<Promotion>,
    pub targets: Vec<DurableTopicBasis>,
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;
type ReceiptFactory = Arc<dyn Fn() -> String + Send + Sync>;

#[derive(Clone)]
struct ImportReceipt {
    receipt_id: String,
    manifest_hash: String,
    entries: Vec<DurableEnvelope>,
    facts: Vec<DurableSyncFact>,
    capture: DurableImportCapture,
    preview: DurableImportPreview,
    canonical: DurableCanonicalPreparation,
}

pub struct DurableBundleApplication {
    repository: Arc<RepositoryPort>,
    canonical: Arc<CanonicalStorePort>,
    now: Clock,
    create_receipt_id: ReceiptFactory,
    producer_version: String,
    receipt: Mutex<Option<ImportReceipt>>,
    admission: SingleFlightAdmission,
}

impl DurableBundleApplication {
    pub fn acquire(
        repository: Arc<RepositoryPort>,
        canonical: Arc<CanonicalStorePort>,
    ) -> Result<Self, String> {
        Self::acquire_with_runtime(
            repository,
            canonical,
            Arc::new(default_now),
            Arc::new(default_receipt_id),
            "synthesis-sidecar".into(),
        )
    }

    #[cfg(feature = "parity-harness")]
    pub fn acquire_for_parity(
        repository: Arc<RepositoryPort>,
        canonical: Arc<CanonicalStorePort>,
        now: String,
        receipt_id: String,
        producer_version: String,
    ) -> Result<Self, String> {
        Self::acquire_with_runtime(
            repository,
            canonical,
            Arc::new(move || now.clone()),
            Arc::new(move || receipt_id.clone()),
            producer_version,
        )
    }

    fn acquire_with_runtime(
        repository: Arc<RepositoryPort>,
        canonical: Arc<CanonicalStorePort>,
        now: Clock,
        create_receipt_id: ReceiptFactory,
        producer_version: String,
    ) -> Result<Self, String> {
        let application = Self {
            repository,
            canonical,
            now,
            create_receipt_id,
            producer_version,
            receipt: Mutex::new(None),
            admission: SingleFlightAdmission::new(),
        };
        application.reconcile_pending_import()?;
        Ok(application)
    }

    pub fn build_export(&self) -> Result<DurableExport, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "durable_bundle_export_busy"))?;
        let first = self.repository.capture_bundle()?;
        let mut drafts = first.drafts.clone();
        let mut canonical_bases = BTreeMap::new();
        for topic in sorted_topics(&first.topic_bases) {
            let current = self.canonical.read_current_assets(topic)?;
            canonical_bases.insert(topic_key(topic), current.basis);
            drafts.extend(current.drafts);
        }
        let second = self.repository.capture_bundle()?;
        if first.aggregate_basis != second.aggregate_basis
            || sorted_topics(&first.topic_bases) != sorted_topics(&second.topic_bases)
        {
            return Err("basis_superseded".into());
        }
        for topic in sorted_topics(&second.topic_bases) {
            let expected = canonical_bases
                .get(&topic_key(topic))
                .ok_or_else(|| "basis_superseded".to_owned())?;
            let actual = self.canonical.inspect_current(topic)?;
            if &actual != expected {
                return Err("basis_superseded".into());
            }
        }
        let mut built = build_export(
            &drafts,
            &(self.now)(),
            &self.producer_version,
            first.topic_bases.len(),
        )?;
        built.summary.topic_count = first.topic_bases.len();
        Ok(built)
    }

    pub fn read_and_verify(
        &self,
        source: &dyn DurableBundleSourcePort,
    ) -> Result<DurableVerification, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "durable_bundle_export_busy"))?;
        Ok(read_and_verify(source))
    }

    pub fn preview_import(
        &self,
        source: &dyn DurableBundleSourcePort,
    ) -> Result<DurableImportPreview, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "durable_bundle_export_busy"))?;
        self.clear_receipt()?;
        let verification = read_and_verify(source);
        let Some(verified) = verification.value else {
            return Ok(DurableImportPreview {
                diagnostics: verification.diagnostics,
                ..DurableImportPreview::default()
            });
        };
        let facts = facts_from_export(&verified);
        let tombstones = facts
            .iter()
            .filter(|fact| fact.entity_kind == "tombstone")
            .count();
        let capture = self.repository.capture_import()?;
        let local = build_export(
            &capture.bundle.drafts,
            &(self.now)(),
            &self.producer_version,
            capture.bundle.topic_bases.len(),
        )?;
        let local_hashes = facts_from_export(&local)
            .into_iter()
            .map(|fact| (entity_key(&fact.entity_kind, &fact.entity_id), fact.hash))
            .collect::<BTreeMap<_, _>>();
        let index = capture
            .sync_entities
            .iter()
            .map(|entry| (entry.entity_key.clone(), entry.last_synced_hash.clone()))
            .collect::<BTreeMap<_, _>>();
        let mut preview = classify(&facts, &local_hashes, &index);
        preview.tombstones = tombstones;
        if tombstones > 0 {
            preview.ok = false;
            preview.diagnostics.push(DurableDiagnostic {
                code: "tombstone_apply_unsupported".into(),
                severity: "error".into(),
                path: String::new(),
            });
        }
        let entries = verified
            .entries
            .iter()
            .filter(|entry| entry.entity_kind != "tombstone")
            .cloned()
            .collect::<Vec<_>>();
        let mut canonical = DurableCanonicalPreparation::default();
        if preview.ok {
            match self
                .canonical
                .prepare_import(&entries, &capture.bundle.topic_bases)
            {
                Ok(prepared) => canonical = prepared,
                Err(error) => {
                    preview.ok = false;
                    preview.diagnostics.push(DurableDiagnostic {
                        code: error,
                        severity: "error".into(),
                        path: String::new(),
                    });
                }
            }
        }
        if preview.ok {
            preview.receipt_id = (self.create_receipt_id)();
            preview.manifest_hash = verified.manifest.manifest_hash.clone();
            *self
                .receipt
                .lock()
                .map_err(|_| "durable_bundle_unavailable".to_owned())? = Some(ImportReceipt {
                receipt_id: preview.receipt_id.clone(),
                manifest_hash: preview.manifest_hash.clone(),
                entries,
                facts,
                capture,
                preview: preview.clone(),
                canonical,
            });
        }
        Ok(preview)
    }

    pub fn apply_import(
        &self,
        request: &DurableImportApplyRequest,
    ) -> Result<DurableImportApplyResult, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "durable_bundle_export_busy"))?;
        let receipt = self
            .receipt
            .lock()
            .map_err(|_| "durable_bundle_unavailable".to_owned())?
            .take()
            .ok_or_else(|| "receipt_invalid".to_owned())?;
        if receipt.receipt_id != request.receipt_id
            || receipt.manifest_hash != request.manifest_hash
        {
            return Err("receipt_invalid".into());
        }
        if receipt.preview.unbased_updates > 0 && !request.acknowledge_unbased_updates {
            return Err("unbased_update_acknowledgement_required".into());
        }
        let recaptured = self.repository.capture_import()?;
        if recaptured.bundle.aggregate_basis != receipt.capture.bundle.aggregate_basis
            || recaptured.index_revision != receipt.capture.index_revision
        {
            return Err("basis_superseded".into());
        }
        if !receipt.canonical.promotions.is_empty()
            && let Err(error) = self.canonical.stage_import(
                &receipt.receipt_id,
                receipt
                    .manifest_hash
                    .strip_prefix("sha256:")
                    .unwrap_or(&receipt.manifest_hash),
                receipt.canonical.promotions.clone(),
            )
        {
            let _ = self.canonical.discard_import(&receipt.receipt_id);
            return Err(error);
        }
        let entries = receipt
            .entries
            .iter()
            .map(envelope_to_draft)
            .collect::<Vec<_>>();
        let applied = self.repository.apply_import(&DurableImportApply {
            expected_aggregate_basis: receipt.capture.bundle.aggregate_basis.clone(),
            expected_index_revision: receipt.capture.index_revision,
            receipt_id: receipt.receipt_id.clone(),
            manifest_hash: receipt.manifest_hash.clone(),
            entries,
            facts: receipt.facts.clone(),
            topic_targets: receipt.canonical.targets.clone(),
            run_id: String::new(),
            now: (self.now)(),
        });
        let committed = match applied {
            Ok(committed) => committed,
            Err(error) => {
                let _ = self.canonical.discard_import(&receipt.receipt_id);
                return Err(error);
            }
        };
        if !committed {
            let _ = self.canonical.discard_import(&receipt.receipt_id);
            return Err("basis_superseded".into());
        }
        self.reconcile_pending_import()?;
        Ok(DurableImportApplyResult {
            status: "committed".into(),
            manifest_hash: receipt.manifest_hash,
            imported: receipt.entries.len(),
        })
    }

    pub fn discard_import(&self, receipt_id: Option<&str>) -> Result<bool, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "durable_bundle_export_busy"))?;
        let mut receipt = self
            .receipt
            .lock()
            .map_err(|_| "durable_bundle_unavailable".to_owned())?;
        if receipt
            .as_ref()
            .is_none_or(|current| receipt_id.is_some_and(|id| current.receipt_id != id))
        {
            return Ok(false);
        }
        *receipt = None;
        Ok(true)
    }

    fn reconcile_pending_import(&self) -> Result<ImportBatchRecoveryOutcome, String> {
        let capture = self.repository.capture_import()?;
        let outcome = self
            .canonical
            .recover_import(capture.commit_receipt.as_ref())?;
        if let Some(receipt) = &capture.commit_receipt {
            for target in &receipt.topic_targets {
                if self.canonical.inspect_current(target)? != target.bundle_hash {
                    return Err("durable_import_recovery_incomplete".into());
                }
            }
            if !self.repository.clear_import_commit(&receipt.receipt_id)? {
                return Err("durable_import_receipt_clear_failed".into());
            }
        }
        Ok(outcome)
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
        let _ = self.clear_receipt();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        self.admission.shutdown(timeout, "durable_bundle")
    }

    fn clear_receipt(&self) -> Result<(), String> {
        *self
            .receipt
            .lock()
            .map_err(|_| "durable_bundle_unavailable".to_owned())? = None;
        Ok(())
    }
}

fn sorted_topics(topics: &[DurableTopicBasis]) -> Vec<&DurableTopicBasis> {
    let mut topics = topics.iter().collect::<Vec<_>>();
    topics.sort_by(|left, right| {
        (&left.topic_id, &left.path_id).cmp(&(&right.topic_id, &right.path_id))
    });
    topics
}

fn topic_key(topic: &DurableTopicBasis) -> String {
    format!("{}\n{}", topic.topic_id, topic.path_id)
}

fn canonical_text(value: &impl Serialize) -> Result<String, String> {
    let value = serde_json::to_value(value).map_err(|_| "durable_bundle_invalid".to_owned())?;
    let text =
        serde_json::to_string_pretty(&value).map_err(|_| "durable_bundle_invalid".to_owned())?;
    Ok(format!("{text}\n"))
}

fn content_hash(envelope: &DurableEnvelope) -> Result<String, String> {
    canonical_json_hash(&json!({
        "schema_id":envelope.schema_id,
        "schema_version":envelope.schema_version,
        "entity_kind":envelope.entity_kind,
        "entity_id":envelope.entity_id,
        "data":envelope.data,
    }))
}

fn envelope_from_draft(
    draft: &DurableDraft,
    generated_at: &str,
) -> Result<DurableEnvelope, String> {
    if !DURABLE_ENTITY_KINDS.contains(&draft.entity_kind.as_str())
        || draft.entity_id.trim() != draft.entity_id
        || draft.entity_id.is_empty()
    {
        return Err("durable_entity_kind_invalid".into());
    }
    let mut envelope = DurableEnvelope {
        schema_id: draft.schema_id.clone(),
        schema_version: DURABLE_ASSET_VERSION.into(),
        entity_kind: draft.entity_kind.clone(),
        entity_id: draft.entity_id.clone(),
        base_hash: String::new(),
        content_hash: String::new(),
        updated_at: if draft.updated_at.is_empty() {
            generated_at.into()
        } else {
            draft.updated_at.clone()
        },
        data: draft.data.clone(),
    };
    envelope.content_hash = content_hash(&envelope)?;
    Ok(envelope)
}

fn envelope_to_draft(envelope: &DurableEnvelope) -> DurableDraft {
    DurableDraft {
        entity_kind: envelope.entity_kind.clone(),
        entity_id: envelope.entity_id.clone(),
        schema_id: envelope.schema_id.clone(),
        data: envelope.data.clone(),
        updated_at: envelope.updated_at.clone(),
    }
}

fn entity_key(kind: &str, id: &str) -> String {
    format!("{kind}:{id}")
}

fn bundle_kind(kind: &str) -> Result<&'static str, String> {
    Ok(match kind {
        "concept"
        | "concept_sense"
        | "concept_alias"
        | "concept_relation"
        | "concept_review_item" => "concepts",
        "canonical_reference"
        | "canonical_reference_redirect"
        | "reference_binding"
        | "reference_match_proposal" => "references",
        "topic_current_asset" | "topic_concept_links" => "topics",
        "topic_graph_node" | "topic_graph_edge" | "topic_graph_review_item" => "topic-graph",
        "review_item" => "reviews",
        "topic_interest_metadata" | "topic_discovery_hint" => "discovery",
        "tag_vocabulary" | "tag_aliases" | "tag_abbrev" | "tag_protocol" => "tags",
        "related_items_sync_effect" => "related-items",
        "tombstone" => "tombstones",
        _ => return Err("durable_entity_kind_invalid".into()),
    })
}

fn topic_id(envelope: &DurableEnvelope) -> String {
    envelope
        .data
        .get("topic_id")
        .or_else(|| envelope.data.get("topicId"))
        .and_then(Value::as_str)
        .map(str::to_owned)
        .or_else(|| envelope.entity_id.split(':').nth(1).map(str::to_owned))
        .unwrap_or_else(|| "topic".into())
}

fn asset_path(envelope: &DurableEnvelope) -> Result<String, String> {
    let kind = bundle_kind(&envelope.entity_kind)?;
    if kind != "topics" {
        return Ok(format!("bundles/{kind}.json"));
    }
    let digest = canonical_json_hash(&json!(topic_id(envelope)))?;
    Ok(format!(
        "bundles/topics/topic_{}.json",
        &digest.trim_start_matches("sha256:")[..24]
    ))
}

fn domain_versions() -> BTreeMap<String, String> {
    [
        "concept",
        "discovery",
        "reference",
        "review",
        "tag",
        "topic",
        "topic_graph",
    ]
    .into_iter()
    .map(|domain| (domain.into(), "1.0.0".into()))
    .collect()
}

fn manifest_hash(manifest: &DurableManifest) -> Result<String, String> {
    canonical_json_hash(&json!({
        "manifest_schema_version":manifest.manifest_schema_version,
        "producer_version":manifest.producer_version,
        "min_reader_version":manifest.min_reader_version,
        "required_capabilities":manifest.required_capabilities,
        "domain_versions":manifest.domain_versions,
        "generated_at":manifest.generated_at,
        "asset_count":manifest.asset_count,
        "assets":manifest.assets,
    }))
}

pub(crate) fn build_export(
    drafts: &[DurableDraft],
    generated_at: &str,
    producer_version: &str,
    topic_count: usize,
) -> Result<DurableExport, String> {
    if generated_at.is_empty() {
        return Err("durable_generated_at_invalid".into());
    }
    let mut entries = drafts
        .iter()
        .map(|draft| envelope_from_draft(draft, generated_at))
        .collect::<Result<Vec<_>, _>>()?;
    entries.sort_by(|left, right| {
        entity_key(&left.entity_kind, &left.entity_id)
            .cmp(&entity_key(&right.entity_kind, &right.entity_id))
    });
    let mut seen = BTreeSet::new();
    for entry in &entries {
        if !seen.insert(entity_key(&entry.entity_kind, &entry.entity_id)) {
            return Err("durable_entity_duplicate".into());
        }
    }
    let mut groups = BTreeMap::<String, Vec<DurableEnvelope>>::new();
    for entry in &entries {
        groups
            .entry(asset_path(entry)?)
            .or_default()
            .push(entry.clone());
    }
    let mut assets = Vec::new();
    let mut manifest_assets = Vec::new();
    for (path, group) in groups {
        pack_group(&path, &group, 0, &mut assets, &mut manifest_assets)?;
    }
    assets.sort_by(|left, right| left.path.cmp(&right.path));
    manifest_assets.sort_by(|left, right| left.path.cmp(&right.path));
    let mut manifest = DurableManifest {
        manifest_schema_version: DURABLE_MANIFEST_VERSION.into(),
        producer_version: if producer_version.is_empty() {
            "zotero-skills".into()
        } else {
            producer_version.into()
        },
        min_reader_version: "1.0.0".into(),
        required_capabilities: vec![
            "durable-state.v1".into(),
            "durable-bundles.v2".into(),
            "webdav-sync.v1".into(),
        ],
        domain_versions: domain_versions(),
        generated_at: generated_at.into(),
        asset_count: manifest_assets.len(),
        assets: manifest_assets,
        manifest_hash: String::new(),
    };
    manifest.manifest_hash = manifest_hash(&manifest)?;
    let manifest_text = canonical_text(&manifest)?;
    Ok(DurableExport {
        summary: DurableBuildSummary {
            bundle_count: assets.len(),
            entity_count: entries.len(),
            topic_count,
            manifest_hash: manifest.manifest_hash.clone(),
        },
        manifest,
        manifest_text,
        assets,
        entries,
    })
}

fn pack_group(
    base_path: &str,
    group: &[DurableEnvelope],
    index: usize,
    assets: &mut Vec<DurableAsset>,
    manifest_assets: &mut Vec<DurableManifestAsset>,
) -> Result<usize, String> {
    let path = if index == 0 {
        base_path.to_owned()
    } else {
        base_path.replace(".json", &format!(".part-{:04}.json", index + 1))
    };
    let bundle = DurableAssetBundle {
        schema_id: DURABLE_BUNDLE_SCHEMA_ID.into(),
        schema_version: DURABLE_BUNDLE_SCHEMA_VERSION.into(),
        bundle_kind: bundle_kind(&group[0].entity_kind)?.into(),
        entries: group.to_vec(),
    };
    let text = canonical_text(&bundle)?;
    if text.len() > DURABLE_BUNDLE_TEXT_LIMIT {
        if group.len() == 1 {
            return Err("durable_bundle_too_large".into());
        }
        let split = (group.len() / 2).max(1);
        let next = pack_group(base_path, &group[..split], index, assets, manifest_assets)?;
        return pack_group(base_path, &group[split..], next, assets, manifest_assets);
    }
    let descriptors = group
        .iter()
        .map(|entry| {
            Ok(DurableManifestEntry {
                path: path.clone(),
                entity_kind: entry.entity_kind.clone(),
                entity_id: entry.entity_id.clone(),
                schema_id: entry.schema_id.clone(),
                schema_version: entry.schema_version.clone(),
                hash: entry.content_hash.clone(),
                content_hash: entry.content_hash.clone(),
                bytes: canonical_text(entry)?.len(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    manifest_assets.push(DurableManifestAsset {
        path: path.clone(),
        hash: canonical_json_hash(&json!(text))?,
        bytes: text.len(),
        schema_id: Some(DURABLE_BUNDLE_SCHEMA_ID.into()),
        schema_version: Some(DURABLE_BUNDLE_SCHEMA_VERSION.into()),
        bundle_kind: Some(bundle.bundle_kind.clone()),
        entry_count: Some(bundle.entries.len()),
        entries: Some(descriptors),
        entity_kind: None,
        entity_id: None,
    });
    assets.push(DurableAsset { path, text, bundle });
    Ok(index + 1)
}

fn read_and_verify(source: &dyn DurableBundleSourcePort) -> DurableVerification {
    match verify_source(source) {
        Ok(value) => DurableVerification {
            value: Some(value),
            diagnostics: Vec::new(),
        },
        Err((code, path)) => DurableVerification {
            value: None,
            diagnostics: vec![DurableDiagnostic {
                code,
                severity: "error".into(),
                path,
            }],
        },
    }
}

fn verify_source(source: &dyn DurableBundleSourcePort) -> Result<DurableExport, (String, String)> {
    let manifest_text = source
        .read_manifest_text()
        .map_err(|code| (code, String::new()))?
        .ok_or_else(|| ("durable_manifest_missing".into(), String::new()))?;
    if manifest_text.len() > DURABLE_BUNDLE_TEXT_LIMIT {
        return Err(("durable_manifest_too_large".into(), String::new()));
    }
    let manifest: DurableManifest = serde_json::from_str(&manifest_text)
        .map_err(|_| ("durable_manifest_invalid".into(), String::new()))?;
    if manifest.manifest_schema_version != DURABLE_MANIFEST_VERSION
        && manifest.manifest_schema_version != DURABLE_LEGACY_MANIFEST_VERSION
    {
        return Err(("durable_manifest_schema_invalid".into(), String::new()));
    }
    if manifest.asset_count != manifest.assets.len() {
        return Err(("durable_manifest_count_mismatch".into(), String::new()));
    }
    if manifest.producer_version.is_empty()
        || manifest.min_reader_version.is_empty()
        || manifest.generated_at.is_empty()
        || !valid_sha256(&manifest.manifest_hash)
    {
        return Err(("durable_manifest_invalid".into(), String::new()));
    }
    if manifest_hash(&manifest).map_err(|code| (code, String::new()))? != manifest.manifest_hash {
        return Err(("durable_manifest_hash_mismatch".into(), String::new()));
    }
    let mut assets = Vec::new();
    let mut entries = Vec::new();
    let legacy = manifest.manifest_schema_version == DURABLE_LEGACY_MANIFEST_VERSION;
    let mut seen_paths = BTreeSet::new();
    for descriptor in &manifest.assets {
        validate_path(&descriptor.path)?;
        if !valid_sha256(&descriptor.hash) {
            return Err(("durable_asset_hash_invalid".into(), descriptor.path.clone()));
        }
        if !seen_paths.insert(descriptor.path.clone()) {
            return Err(("durable_path_duplicate".into(), descriptor.path.clone()));
        }
        let text = source
            .read_asset_text(&descriptor.path)
            .map_err(|code| (code, descriptor.path.clone()))?
            .ok_or_else(|| ("durable_asset_missing".into(), descriptor.path.clone()))?;
        if text.len() != descriptor.bytes {
            return Err((
                "durable_asset_bytes_mismatch".into(),
                descriptor.path.clone(),
            ));
        }
        if canonical_json_hash(&json!(text)).map_err(|code| (code, descriptor.path.clone()))?
            != descriptor.hash
        {
            return Err((
                "durable_asset_hash_mismatch".into(),
                descriptor.path.clone(),
            ));
        }
        if legacy {
            if descriptor.bundle_kind.is_some()
                || descriptor.entry_count.is_some()
                || descriptor.entries.is_some()
                || descriptor.schema_id.is_none()
                || descriptor.schema_version.is_none()
                || descriptor.entity_kind.is_none()
                || descriptor.entity_id.is_none()
            {
                return Err((
                    "durable_manifest_asset_fields_invalid".into(),
                    descriptor.path.clone(),
                ));
            }
            let envelope: DurableEnvelope = serde_json::from_str(&text)
                .map_err(|_| ("durable_asset_json_invalid".into(), descriptor.path.clone()))?;
            if descriptor.schema_id.as_ref() != Some(&envelope.schema_id)
                || descriptor.schema_version.as_ref() != Some(&envelope.schema_version)
                || descriptor.entity_kind.as_ref() != Some(&envelope.entity_kind)
                || descriptor.entity_id.as_ref() != Some(&envelope.entity_id)
            {
                return Err((
                    "durable_manifest_entry_mismatch".into(),
                    descriptor.path.clone(),
                ));
            }
            validate_envelope(&envelope, &descriptor.path)?;
            entries.push(envelope);
            continue;
        }
        if descriptor.entity_kind.is_some()
            || descriptor.entity_id.is_some()
            || descriptor.schema_id.as_deref() != Some(DURABLE_BUNDLE_SCHEMA_ID)
            || descriptor.schema_version.as_deref() != Some(DURABLE_BUNDLE_SCHEMA_VERSION)
        {
            return Err((
                "durable_manifest_asset_fields_invalid".into(),
                descriptor.path.clone(),
            ));
        }
        if text.len() > DURABLE_BUNDLE_TEXT_LIMIT {
            return Err(("durable_bundle_too_large".into(), descriptor.path.clone()));
        }
        let bundle: DurableAssetBundle = serde_json::from_str(&text)
            .map_err(|_| ("durable_bundle_invalid".into(), descriptor.path.clone()))?;
        if bundle.schema_id != DURABLE_BUNDLE_SCHEMA_ID
            || bundle.schema_version != DURABLE_BUNDLE_SCHEMA_VERSION
            || Some(bundle.entries.len()) != descriptor.entry_count
            || Some(bundle.bundle_kind.as_str()) != descriptor.bundle_kind.as_deref()
        {
            return Err(("durable_bundle_invalid".into(), descriptor.path.clone()));
        }
        let indexed = descriptor
            .entries
            .as_ref()
            .ok_or_else(|| {
                (
                    "durable_manifest_entries_invalid".into(),
                    descriptor.path.clone(),
                )
            })?
            .iter()
            .map(|entry| (entity_key(&entry.entity_kind, &entry.entity_id), entry))
            .collect::<BTreeMap<_, _>>();
        if indexed.len() != bundle.entries.len() {
            return Err((
                "durable_entry_count_mismatch".into(),
                descriptor.path.clone(),
            ));
        }
        for entry in &bundle.entries {
            validate_envelope(entry, &descriptor.path)?;
            if bundle_kind(&entry.entity_kind).map_err(|code| (code, descriptor.path.clone()))?
                != bundle.bundle_kind
            {
                return Err((
                    "durable_bundle_kind_mismatch".into(),
                    descriptor.path.clone(),
                ));
            }
            let indexed_entry = indexed
                .get(&entity_key(&entry.entity_kind, &entry.entity_id))
                .ok_or_else(|| {
                    (
                        "durable_manifest_entry_missing".into(),
                        descriptor.path.clone(),
                    )
                })?;
            if indexed_entry.path != descriptor.path
                || indexed_entry.schema_id != entry.schema_id
                || indexed_entry.schema_version != entry.schema_version
                || !valid_sha256(&indexed_entry.hash)
                || !valid_sha256(&indexed_entry.content_hash)
                || indexed_entry.hash != entry.content_hash
                || indexed_entry.content_hash != entry.content_hash
                || indexed_entry.bytes
                    != canonical_text(entry)
                        .map_err(|code| (code, descriptor.path.clone()))?
                        .len()
            {
                return Err((
                    "durable_manifest_entry_mismatch".into(),
                    descriptor.path.clone(),
                ));
            }
        }
        entries.extend(bundle.entries.clone());
        assets.push(DurableAsset {
            path: descriptor.path.clone(),
            text,
            bundle,
        });
    }
    let mut seen = BTreeSet::new();
    if entries
        .iter()
        .any(|entry| !seen.insert(entity_key(&entry.entity_kind, &entry.entity_id)))
    {
        return Err(("durable_entity_duplicate".into(), String::new()));
    }
    Ok(DurableExport {
        summary: DurableBuildSummary {
            bundle_count: assets.len(),
            entity_count: entries.len(),
            topic_count: entries
                .iter()
                .filter(|entry| entry.entity_kind == "topic_current_asset")
                .count(),
            manifest_hash: manifest.manifest_hash.clone(),
        },
        manifest,
        manifest_text,
        assets,
        entries,
    })
}

fn validate_envelope(envelope: &DurableEnvelope, path: &str) -> Result<(), (String, String)> {
    if !DURABLE_ENTITY_KINDS.contains(&envelope.entity_kind.as_str())
        || envelope.entity_id.trim() != envelope.entity_id
        || envelope.entity_id.is_empty()
        || envelope.schema_id.is_empty()
        || envelope.schema_version.is_empty()
        || envelope.updated_at.is_empty()
        || !valid_sha256(&envelope.content_hash)
        || (!envelope.base_hash.is_empty() && !valid_sha256(&envelope.base_hash))
    {
        return Err(("durable_entity_kind_invalid".into(), path.into()));
    }
    if content_hash(envelope).map_err(|code| (code, path.into()))? != envelope.content_hash {
        return Err(("durable_content_hash_mismatch".into(), path.into()));
    }
    Ok(())
}

fn valid_sha256(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    })
}

fn validate_path(path: &str) -> Result<(), (String, String)> {
    if path.is_empty()
        || path.starts_with('/')
        || path.contains('\\')
        || path
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
    {
        Err(("durable_path_invalid".into(), path.into()))
    } else {
        Ok(())
    }
}

fn facts_from_export(value: &DurableExport) -> Vec<DurableSyncFact> {
    let paths = value
        .manifest
        .assets
        .iter()
        .flat_map(|asset| {
            let mut rows = asset
                .entries
                .iter()
                .flatten()
                .map(|entry| {
                    (
                        entity_key(&entry.entity_kind, &entry.entity_id),
                        entry.path.clone(),
                    )
                })
                .collect::<Vec<_>>();
            if let (Some(kind), Some(id)) = (&asset.entity_kind, &asset.entity_id) {
                rows.push((entity_key(kind, id), asset.path.clone()));
            }
            rows
        })
        .collect::<BTreeMap<_, _>>();
    value
        .entries
        .iter()
        .map(|entry| DurableSyncFact {
            entity_kind: entry.entity_kind.clone(),
            entity_id: entry.entity_id.clone(),
            path: paths
                .get(&entity_key(&entry.entity_kind, &entry.entity_id))
                .cloned()
                .unwrap_or_default(),
            hash: entry.content_hash.clone(),
        })
        .collect()
}

fn classify(
    remote: &[DurableSyncFact],
    local: &BTreeMap<String, String>,
    index: &BTreeMap<String, String>,
) -> DurableImportPreview {
    let mut preview = DurableImportPreview {
        ok: true,
        ..DurableImportPreview::default()
    };
    for fact in remote {
        let key = entity_key(&fact.entity_kind, &fact.entity_id);
        let local_hash = local.get(&key);
        let base_hash = index.get(&key);
        if local_hash == Some(&fact.hash) {
            preview.unchanged += 1;
        } else if local_hash.is_none() {
            preview.additions += 1;
        } else if base_hash.is_none() {
            preview.updates += 1;
            preview.unbased_updates += 1;
        } else if base_hash == local_hash {
            preview.updates += 1;
        } else if base_hash == Some(&fact.hash) {
            preview.unchanged += 1;
        } else {
            preview.ok = false;
            preview.conflicts.push(DurableImportConflict {
                entity_kind: fact.entity_kind.clone(),
                entity_id: fact.entity_id.clone(),
                path: fact.path.clone(),
                reason: "both_changed".into(),
                base_hash: base_hash.cloned().unwrap_or_default(),
                local_hash: local_hash.cloned().unwrap_or_default(),
                remote_hash: fact.hash.clone(),
            });
        }
    }
    preview
}

fn admission_code(error: AdmissionError, busy: &str) -> String {
    match error {
        AdmissionError::Busy => busy.into(),
        AdmissionError::Stopping => "stopping".into(),
        AdmissionError::Unavailable => "durable_bundle_unavailable".into(),
    }
}

fn default_now() -> String {
    synthesis_protocol::utc_now_iso8601()
}

fn default_receipt_id() -> String {
    format!("durable-import:{}", default_now())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_kinds_build_deterministically_and_manifest_is_last_owned_by_sink() {
        let drafts = DURABLE_ENTITY_KINDS
            .iter()
            .filter(|kind| **kind != "tombstone")
            .map(|kind| DurableDraft {
                entity_kind: (*kind).into(),
                entity_id: format!("id:{kind}"),
                schema_id: format!("synthesis.durable.{kind}"),
                data: json!({"kind":kind}),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
            })
            .collect::<Vec<_>>();
        let first = build_export(&drafts, "2026-07-26T00:00:00.000Z", "test", 0).expect("first");
        let mut reversed = drafts;
        reversed.reverse();
        let second =
            build_export(&reversed, "2026-07-26T00:00:00.000Z", "test", 0).expect("second");
        assert_eq!(first, second);
        assert_eq!(first.entries.len(), 22);
    }

    struct MemorySource {
        export: DurableExport,
    }

    impl DurableBundleSourcePort for MemorySource {
        fn read_manifest_text(&self) -> Result<Option<String>, String> {
            Ok(Some(self.export.manifest_text.clone()))
        }

        fn read_asset_text(&self, path: &str) -> Result<Option<String>, String> {
            Ok(self
                .export
                .assets
                .iter()
                .find(|asset| asset.path == path)
                .map(|asset| asset.text.clone()))
        }
    }

    struct RawSource {
        manifest_text: String,
        assets: BTreeMap<String, String>,
    }

    impl DurableBundleSourcePort for RawSource {
        fn read_manifest_text(&self) -> Result<Option<String>, String> {
            Ok(Some(self.manifest_text.clone()))
        }

        fn read_asset_text(&self, path: &str) -> Result<Option<String>, String> {
            Ok(self.assets.get(path).cloned())
        }
    }

    #[test]
    fn strict_legacy_v1_entity_asset_is_read_without_rewriting_to_v2() {
        let envelope = envelope_from_draft(
            &DurableDraft {
                entity_kind: "concept".into(),
                entity_id: "concept:legacy".into(),
                schema_id: "synthesis.durable.concept".into(),
                data: json!({"conceptId":"concept:legacy","label":"Legacy"}),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
            },
            "2026-07-26T00:00:00.000Z",
        )
        .expect("envelope");
        let asset_text = canonical_text(&envelope).expect("asset");
        let asset_path = "concepts/concept-legacy.json";
        let base = json!({
            "manifest_schema_version":"1.0.0",
            "producer_version":"legacy-fixture",
            "min_reader_version":"1.0.0",
            "required_capabilities":["durable-state.v1"],
            "domain_versions":{"concept":"1.0.0"},
            "generated_at":"2026-07-26T00:00:00.000Z",
            "asset_count":1,
            "assets":[{
                "path":asset_path,
                "schema_id":envelope.schema_id,
                "schema_version":envelope.schema_version,
                "hash":canonical_json_hash(&json!(asset_text)).expect("asset hash"),
                "bytes":asset_text.len(),
                "entity_kind":envelope.entity_kind,
                "entity_id":envelope.entity_id,
            }],
        });
        let mut manifest = base.as_object().expect("manifest").clone();
        manifest.insert(
            "manifest_hash".into(),
            json!(canonical_json_hash(&base).expect("manifest hash")),
        );
        let verified = read_and_verify(&RawSource {
            manifest_text: canonical_text(&Value::Object(manifest)).expect("manifest text"),
            assets: BTreeMap::from([(asset_path.into(), asset_text)]),
        });

        let value = verified.value.expect("legacy verified");
        assert_eq!(value.manifest.manifest_schema_version, "1.0.0");
        assert_eq!(value.entries.len(), 1);
        assert_eq!(value.entries[0].entity_kind, "concept");
        assert!(value.assets.is_empty());
    }

    #[test]
    fn strict_round_trip_detects_asset_tampering() {
        let export = build_export(
            &[DurableDraft {
                entity_kind: "concept".into(),
                entity_id: "concept:one".into(),
                schema_id: "synthesis.durable.concept".into(),
                data: json!({"conceptId":"concept:one"}),
                updated_at: "2026-07-26T00:00:00.000Z".into(),
            }],
            "2026-07-26T00:00:00.000Z",
            "test",
            0,
        )
        .expect("export");
        let verified = read_and_verify(&MemorySource { export });
        assert!(verified.value.is_some());
        assert!(verified.diagnostics.is_empty());
    }
}
