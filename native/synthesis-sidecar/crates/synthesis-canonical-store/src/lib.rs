use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
#[cfg(feature = "parity-harness")]
use std::collections::VecDeque;
use std::collections::{BTreeMap, BTreeSet, HashSet};
#[cfg(unix)]
use std::fs::File;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
#[cfg(feature = "parity-harness")]
use std::sync::{Arc, Mutex};
use synthesis_protocol::canonical_json;

const IDENTITY_SCHEMA: &str = "synthesis-rust-shadow-canonical.v1";
const PRODUCTION_IDENTITY_SCHEMA: &str = "synthesis-rust-production-canonical.v1";
const STORE_SCHEMA: &str = "synthesis-topic-canonical-store.v1";
const JOURNAL_SCHEMA: &str = "synthesis-topic-canonical-transaction.v1";
const RECEIPT_SCHEMA: &str = "synthesis-topic-canonical-receipt.v1";
const IMPORT_SCHEMA: &str = "synthesis-topic-canonical-import-batch.v1";
const MAX_TOPIC_ID_BYTES: usize = 512;
const MAX_SECTION_COUNT: usize = 256;
const MAX_SECTION_BYTES: usize = 4 * 1024 * 1024;
static TRANSACTION_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalIdentity {
    pub profile_id: String,
    pub data_root_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicSnapshot {
    topic_id: String,
    path_id: String,
    manifest: Value,
    artifact: Value,
    metadata: Value,
    #[serde(default)]
    sections: BTreeMap<String, Value>,
    #[serde(default)]
    markdown: BTreeMap<String, String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CanonicalTopicDraft {
    pub topic_id: String,
    pub manifest: Value,
    pub artifact: Value,
    pub metadata: Value,
    pub sections: BTreeMap<String, Value>,
    pub markdown: BTreeMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalTopicView {
    pub topic_id: String,
    pub path_id: String,
    pub manifest: Value,
    pub artifact: Value,
    pub metadata: Value,
    pub sections: BTreeMap<String, Value>,
    pub markdown: BTreeMap<String, String>,
    #[serde(skip)]
    pub basis: CanonicalBasis,
    #[serde(skip)]
    pub metadata_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CanonicalTopicAsset {
    pub path: String,
    pub text: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct CanonicalTopicCapture {
    pub topic: CanonicalTopicView,
    pub assets: Vec<CanonicalTopicAsset>,
    pub representation_hash: String,
}

#[derive(Clone, Debug)]
pub struct PreparedCanonicalTopic {
    snapshot: TopicSnapshot,
}

#[derive(Clone, Debug)]
pub struct PreparedCanonicalPromotion {
    expected_basis: Option<CanonicalBasis>,
    snapshot: TopicSnapshot,
}

impl PreparedCanonicalTopic {
    pub fn view(&self) -> CanonicalTopicView {
        canonical_topic_view(&self.snapshot).expect("prepared canonical topic remains valid")
    }

    pub fn assets(&self) -> Result<Vec<CanonicalTopicAsset>, CanonicalError> {
        canonical_topic_assets(&self.snapshot).map_err(CanonicalError::from_code)
    }

    pub fn representation_hash(&self) -> Result<String, CanonicalError> {
        topic_representation_hash(&self.snapshot).map_err(CanonicalError::from_code)
    }

    pub fn for_promotion(
        self,
        expected_basis: Option<CanonicalBasis>,
    ) -> PreparedCanonicalPromotion {
        PreparedCanonicalPromotion {
            expected_basis,
            snapshot: self.snapshot,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum CanonicalTopicState {
    Absent {
        topic_id: String,
        path_id: String,
    },
    Ready(CanonicalTopicView),
    Invalid {
        topic_id: String,
        path_id: String,
        diagnostics: Vec<String>,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CanonicalErrorKind {
    InvalidRepresentation,
    BasisConflict,
    StoreBusy,
    RepairRequired,
    DurableIo,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CanonicalError {
    kind: CanonicalErrorKind,
    code: String,
}

impl CanonicalError {
    pub fn from_code(code: String) -> Self {
        let kind = match code.as_str() {
            "basis_mismatch" => CanonicalErrorKind::BasisConflict,
            "canonical_store_busy" => CanonicalErrorKind::StoreBusy,
            "repair_required" => CanonicalErrorKind::RepairRequired,
            value
                if value == "canonical_store_unavailable"
                    || value.starts_with("canonical_write_failed:")
                    || value.starts_with("canonical_read_failed:")
                    || value.starts_with("canonical_fsync_failed:")
                    || value.starts_with("canonical_rename_failed:")
                    || value.starts_with("canonical_remove_failed:") =>
            {
                CanonicalErrorKind::DurableIo
            }
            _ => CanonicalErrorKind::InvalidRepresentation,
        };
        Self { kind, code }
    }

    pub fn kind(&self) -> CanonicalErrorKind {
        self.kind
    }

    pub fn code(&self) -> &str {
        &self.code
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyCanonicalTopic {
    pub topic_definition: Value,
    pub topic_resolver: Value,
    pub resolved_paper_set: Value,
    pub snapshot: CanonicalTopicView,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalBasis {
    pub manifest_hash: String,
    pub artifact_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalReceipt {
    schema: String,
    pub transaction_id: String,
    pub topic_id: String,
    pub path_id: String,
    pub manifest_hash: String,
    pub artifact_hash: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ImportBatchRecoveryOutcome {
    NoPendingBatch,
    DiscardedUncommittedBatch,
    PromotedCommittedBatch,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
enum CurrentTopic {
    Absent {
        topic_id: String,
        path_id: String,
    },
    Ready {
        snapshot: TopicSnapshot,
        basis: CanonicalBasis,
    },
    Invalid {
        topic_id: String,
        path_id: String,
        diagnostics: Vec<String>,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FaultPoint {
    LockAcquired,
    StagingWritten,
    JournalWritten,
    CurrentBackedUp,
    CurrentPromoted,
    ReceiptWritten,
    RollbackRestore,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum JournalPhase {
    Staged,
    BackedUp,
    Promoted,
    Committed,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct IdentityMarker {
    schema: String,
    profile_id: String,
    data_root_id: String,
    store_schema: String,
    store_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Journal {
    schema: String,
    transaction_id: String,
    topic_id: String,
    path_id: String,
    had_current: bool,
    phase: JournalPhase,
    manifest_hash: String,
    artifact_hash: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Promotion {
    transaction_id: String,
    #[serde(default)]
    expected_basis: Option<CanonicalBasis>,
    snapshot: TopicSnapshot,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ImportBatch {
    schema: String,
    receipt_id: String,
    manifest_hash: String,
    topics: Vec<Promotion>,
}

#[derive(Debug)]
struct WriterLease {
    path: PathBuf,
}

impl Drop for WriterLease {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

#[derive(Debug)]
pub struct CanonicalStore {
    root: PathBuf,
    store_id: String,
    writer: AtomicBool,
    repair_required: bool,
    #[cfg(feature = "parity-harness")]
    parity_transaction_ids: Option<Arc<Mutex<VecDeque<String>>>>,
}

fn validate_identity_part(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > MAX_TOPIC_ID_BYTES
        || value != value.trim()
        || value.contains(['/', '\\'])
        || matches!(value, "." | "..")
        || value.chars().any(|character| character.is_control())
    {
        return Err("canonical_identity_invalid".into());
    }
    Ok(())
}

fn validate_deleted_path_id(value: &str) -> Result<(), String> {
    validate_identity_part(value)?;
    if !value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-'))
    {
        return Err("canonical_deleted_path_invalid".into());
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

fn validate_relative_file(value: &str) -> Result<(), String> {
    let path = Path::new(value);
    if value.is_empty()
        || value.len() > 255
        || path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
        || path.extension().and_then(|value| value.to_str()) != Some("md")
    {
        return Err("canonical_path_invalid".into());
    }
    Ok(())
}

fn stable_id(identity: &CanonicalIdentity) -> String {
    stable_id_for_schema(IDENTITY_SCHEMA, identity)
}

fn stable_id_for_schema(schema: &str, identity: &CanonicalIdentity) -> String {
    sha256_hex(format!(
        "{schema}\0{}\0{}",
        identity.profile_id, identity.data_root_id
    ))
}

fn sha256_hex(value: impl AsRef<[u8]>) -> String {
    let mut hash = Sha256::new();
    hash.update(value.as_ref());
    format!("{:x}", hash.finalize())
}

fn sha256(value: impl AsRef<[u8]>) -> String {
    content_sha256(value)
}

pub fn content_sha256(value: impl AsRef<[u8]>) -> String {
    format!("sha256:{}", sha256_hex(value))
}

fn hash_json(value: &Value) -> Result<String, String> {
    canonical_json(value)
        .map(sha256)
        .map_err(|_| "canonical_json_invalid".into())
}

pub fn canonical_json_hash(value: &Value) -> Result<String, String> {
    hash_json(value)
}

fn json_bytes(value: &Value) -> Result<Vec<u8>, String> {
    canonical_json(value)
        .map(|value| format!("{value}\n").into_bytes())
        .map_err(|_| "canonical_json_invalid".into())
}

fn topic_slug(topic_id: &str) -> Result<String, String> {
    validate_identity_part(topic_id)?;
    let mut slug = String::new();
    let mut pending_dash = false;
    for character in topic_id.to_ascii_lowercase().chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '.' | '_' | '-') {
            if pending_dash && !slug.is_empty() && !slug.ends_with('-') {
                slug.push('-');
            }
            pending_dash = false;
            slug.push(character);
        } else {
            pending_dash = true;
        }
        if slug.len() >= 80 {
            break;
        }
    }
    let slug = slug.trim_matches('-').to_owned();
    Ok(slug)
}

pub fn canonical_topic_path_id(topic_id: &str) -> Result<String, String> {
    let slug = topic_slug(topic_id)?;
    if !slug.is_empty() {
        return Ok(slug);
    }
    let hash = hash_json(&json!({"topic_id":topic_id}))?;
    Ok(hash.trim_start_matches("sha256:")[..16].to_owned())
}

fn historical_typescript_topic_path_id(topic_id: &str) -> Result<Option<String>, String> {
    if !topic_slug(topic_id)?.is_empty() {
        return Ok(None);
    }
    let hash = hash_json(&json!({"topic_id":topic_id}))?;
    Ok(Some(hash.trim_start_matches("sha256:")[..9].to_owned()))
}

fn section_file_name(name: &str) -> Result<String, String> {
    if name.is_empty()
        || name.len() > 128
        || !name.chars().enumerate().all(|(index, value)| {
            value.is_ascii_lowercase() || value == '_' || (index > 0 && value.is_ascii_digit())
        })
    {
        return Err("canonical_section_invalid".into());
    }
    Ok(format!("{}.json", name.replace('_', "-")))
}

fn validate_declared_hashes(snapshot: &TopicSnapshot) -> Result<(), String> {
    let manifest = snapshot
        .manifest
        .as_object()
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    let declared_sections = manifest
        .get("sections")
        .and_then(Value::as_object)
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    let actual_names = snapshot.sections.keys().cloned().collect::<Vec<_>>();
    let declared_names = declared_sections.keys().cloned().collect::<Vec<_>>();
    if actual_names != declared_names {
        return Err("canonical_snapshot_incomplete".into());
    }
    let artifact_hash = hash_json(&snapshot.artifact)?;
    let metadata_hash = hash_json(&snapshot.metadata)?;
    if manifest.get("artifact_hash").and_then(Value::as_str) != Some(&artifact_hash)
        || manifest.get("metadata_hash").and_then(Value::as_str) != Some(&metadata_hash)
    {
        return Err("canonical_hash_mismatch".into());
    }
    let declared_hashes = manifest
        .get("section_hashes")
        .and_then(Value::as_object)
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    if declared_hashes.len() != snapshot.sections.len()
        || snapshot.sections.iter().any(|(name, value)| {
            hash_json(value).ok().as_deref() != declared_hashes.get(name).and_then(Value::as_str)
        })
    {
        return Err("canonical_hash_mismatch".into());
    }
    Ok(())
}

fn canonical_topic_view(snapshot: &TopicSnapshot) -> Result<CanonicalTopicView, String> {
    Ok(CanonicalTopicView {
        topic_id: snapshot.topic_id.clone(),
        path_id: snapshot.path_id.clone(),
        manifest: snapshot.manifest.clone(),
        artifact: snapshot.artifact.clone(),
        metadata: snapshot.metadata.clone(),
        sections: snapshot.sections.clone(),
        markdown: snapshot.markdown.clone(),
        basis: CanonicalBasis {
            manifest_hash: hash_json(&snapshot.manifest)?,
            artifact_hash: hash_json(&snapshot.artifact)?,
        },
        metadata_hash: hash_json(&snapshot.metadata)?,
    })
}

fn validate_snapshot_representation(snapshot: &TopicSnapshot) -> Result<(), String> {
    validate_identity_part(&snapshot.topic_id)?;
    validate_identity_part(&snapshot.path_id)?;
    if canonical_topic_path_id(&snapshot.topic_id)? != snapshot.path_id {
        return Err("canonical_path_identity_mismatch".into());
    }
    validate_declared_hashes(snapshot)?;
    if snapshot.sections.len() > MAX_SECTION_COUNT {
        return Err("canonical_snapshot_too_large".into());
    }
    for (name, value) in &snapshot.sections {
        section_file_name(name)?;
        if json_bytes(value)?.len() > MAX_SECTION_BYTES {
            return Err("canonical_snapshot_too_large".into());
        }
    }
    for (relative, content) in &snapshot.markdown {
        validate_relative_file(relative)?;
        if Path::new(relative).starts_with("sections") || content.len() > MAX_SECTION_BYTES {
            return Err("canonical_snapshot_too_large".into());
        }
    }
    Ok(())
}

fn pretty_json_text(value: &Value) -> Result<String, String> {
    serde_json::to_string_pretty(value)
        .map(|text| format!("{text}\n"))
        .map_err(|_| "canonical_json_invalid".to_owned())
}

fn canonical_topic_assets(snapshot: &TopicSnapshot) -> Result<Vec<CanonicalTopicAsset>, String> {
    let mut assets = BTreeMap::from([
        (
            "manifest.json".to_owned(),
            pretty_json_text(&snapshot.manifest)?,
        ),
        (
            "artifact.json".to_owned(),
            pretty_json_text(&snapshot.artifact)?,
        ),
        (
            "metadata.json".to_owned(),
            pretty_json_text(&snapshot.metadata)?,
        ),
    ]);
    for (name, value) in &snapshot.sections {
        assets.insert(
            format!("sections/{}", section_file_name(name)?),
            pretty_json_text(value)?,
        );
    }
    for (path, text) in &snapshot.markdown {
        if assets.insert(path.clone(), text.clone()).is_some() {
            return Err("canonical_snapshot_invalid".into());
        }
    }
    Ok(assets
        .into_iter()
        .map(|(path, text)| CanonicalTopicAsset { path, text })
        .collect())
}

fn topic_representation_hash(snapshot: &TopicSnapshot) -> Result<String, String> {
    canonical_json_hash(
        &serde_json::to_value(snapshot).map_err(|_| "canonical_snapshot_invalid".to_owned())?,
    )
}

fn validate_asset_path(path: &str) -> Result<(), String> {
    let path_value = Path::new(path);
    if path.is_empty()
        || path.len() > 512
        || path_value.is_absolute()
        || path_value
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("canonical_asset_path_invalid".into());
    }
    Ok(())
}

pub fn decode_topic_assets(
    path_id: &str,
    assets: Vec<CanonicalTopicAsset>,
) -> Result<PreparedCanonicalTopic, CanonicalError> {
    validate_identity_part(path_id).map_err(CanonicalError::from_code)?;
    let mut by_path = BTreeMap::new();
    for asset in assets {
        validate_asset_path(&asset.path).map_err(CanonicalError::from_code)?;
        if by_path.insert(asset.path, asset.text).is_some() {
            return Err(CanonicalError::from_code(
                "canonical_asset_duplicate".into(),
            ));
        }
    }
    let mut read_json_asset = |path: &str| -> Result<Value, CanonicalError> {
        let text = by_path
            .remove(path)
            .ok_or_else(|| CanonicalError::from_code("canonical_snapshot_incomplete".into()))?;
        serde_json::from_str(&text)
            .map_err(|_| CanonicalError::from_code("canonical_snapshot_invalid".into()))
    };
    let manifest = read_json_asset("manifest.json")?;
    let artifact = read_json_asset("artifact.json")?;
    let metadata = read_json_asset("metadata.json")?;
    let declared = manifest
        .get("sections")
        .and_then(Value::as_object)
        .ok_or_else(|| CanonicalError::from_code("canonical_snapshot_invalid".into()))?;
    let mut sections = BTreeMap::new();
    for name in declared.keys() {
        let path = format!(
            "sections/{}",
            section_file_name(name).map_err(CanonicalError::from_code)?
        );
        sections.insert(name.clone(), read_json_asset(&path)?);
    }
    let mut markdown = BTreeMap::new();
    for (path, text) in by_path {
        validate_relative_file(&path).map_err(CanonicalError::from_code)?;
        markdown.insert(path, text);
    }
    let topic_id = metadata
        .pointer("/data/topic_id")
        .and_then(Value::as_str)
        .ok_or_else(|| CanonicalError::from_code("canonical_topic_identity_invalid".into()))?
        .to_owned();
    let snapshot = TopicSnapshot {
        topic_id,
        path_id: path_id.into(),
        manifest,
        artifact,
        metadata,
        sections,
        markdown,
    };
    validate_snapshot_representation(&snapshot).map_err(CanonicalError::from_code)?;
    Ok(PreparedCanonicalTopic { snapshot })
}

pub fn prepare_topic(draft: CanonicalTopicDraft) -> Result<PreparedCanonicalTopic, CanonicalError> {
    let path_id = canonical_topic_path_id(&draft.topic_id).map_err(CanonicalError::from_code)?;
    let artifact_hash = hash_json(&draft.artifact).map_err(CanonicalError::from_code)?;
    let metadata_hash = hash_json(&draft.metadata).map_err(CanonicalError::from_code)?;
    let section_hashes = draft
        .sections
        .iter()
        .map(|(name, value)| hash_json(value).map(|hash| (name.clone(), hash)))
        .collect::<Result<BTreeMap<_, _>, _>>()
        .map_err(CanonicalError::from_code)?;
    let mut manifest = draft
        .manifest
        .as_object()
        .cloned()
        .ok_or_else(|| CanonicalError::from_code("canonical_snapshot_invalid".into()))?;
    manifest.insert("artifact_hash".into(), json!(artifact_hash));
    manifest.insert("metadata_hash".into(), json!(metadata_hash));
    manifest.insert("section_hashes".into(), json!(section_hashes));
    let snapshot = TopicSnapshot {
        topic_id: draft.topic_id,
        path_id,
        manifest: Value::Object(manifest),
        artifact: draft.artifact,
        metadata: draft.metadata,
        sections: draft.sections,
        markdown: draft.markdown,
    };
    validate_snapshot_representation(&snapshot).map_err(CanonicalError::from_code)?;
    Ok(PreparedCanonicalTopic { snapshot })
}

#[cfg(unix)]
fn sync_directory(path: &Path) -> Result<(), String> {
    File::open(path)
        .and_then(|file| file.sync_all())
        .map_err(|error| format!("canonical_fsync_failed:{error}"))
}

#[cfg(windows)]
fn sync_directory(_path: &Path) -> Result<(), String> {
    // Windows requires a writable directory handle for FlushFileBuffers. File
    // contents are synchronized before every rename; journal recovery owns the
    // remaining metadata durability boundary.
    Ok(())
}

fn durable_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "canonical_path_invalid".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| format!("canonical_write_failed:{error}"))?;
    let temporary = parent.join(format!(
        ".{}.tmp-{}",
        path.file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| "canonical_path_invalid".to_owned())?,
        std::process::id()
    ));
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| format!("canonical_write_failed:{error}"))?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("canonical_fsync_failed:{error}"))?;
    drop(file);
    fs::rename(&temporary, path).map_err(|error| format!("canonical_rename_failed:{error}"))?;
    sync_directory(parent)
}

fn durable_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let bytes = serde_json::to_vec(value).map_err(|_| "canonical_json_invalid".to_owned())?;
    durable_write(path, &bytes)
}

fn remove_tree(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let metadata =
        fs::symlink_metadata(path).map_err(|error| format!("canonical_stat_failed:{error}"))?;
    if metadata.file_type().is_symlink() {
        return Err("canonical_symlink_rejected".into());
    }
    if metadata.is_dir() {
        fs::remove_dir_all(path).map_err(|error| format!("canonical_remove_failed:{error}"))
    } else {
        fs::remove_file(path).map_err(|error| format!("canonical_remove_failed:{error}"))
    }
}

fn copy_snapshot(snapshot: &TopicSnapshot, current: &Path) -> Result<CanonicalBasis, String> {
    validate_identity_part(&snapshot.topic_id)?;
    validate_identity_part(&snapshot.path_id)?;
    if canonical_topic_path_id(&snapshot.topic_id)? != snapshot.path_id {
        return Err("canonical_path_identity_mismatch".into());
    }
    validate_declared_hashes(snapshot)?;
    if snapshot.sections.len() > MAX_SECTION_COUNT {
        return Err("canonical_snapshot_too_large".into());
    }
    fs::create_dir_all(current.join("sections"))
        .map_err(|error| format!("canonical_write_failed:{error}"))?;
    let manifest = json_bytes(&snapshot.manifest)?;
    let artifact = json_bytes(&snapshot.artifact)?;
    let metadata = json_bytes(&snapshot.metadata)?;
    for (path, bytes) in [
        (current.join("manifest.json"), manifest.as_slice()),
        (current.join("artifact.json"), artifact.as_slice()),
        (current.join("metadata.json"), metadata.as_slice()),
    ] {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|error| format!("canonical_write_failed:{error}"))?;
        file.write_all(bytes)
            .and_then(|_| file.sync_all())
            .map_err(|error| format!("canonical_fsync_failed:{error}"))?;
    }
    let mut seen = HashSet::new();
    for (name, contents) in &snapshot.sections {
        let file_name = section_file_name(name)?;
        if !seen.insert(file_name.clone()) {
            return Err("canonical_snapshot_invalid".into());
        }
        let bytes = json_bytes(contents)?;
        if bytes.len() > MAX_SECTION_BYTES {
            return Err("canonical_snapshot_too_large".into());
        }
        let path = current.join("sections").join(file_name);
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|error| format!("canonical_write_failed:{error}"))?;
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|error| format!("canonical_fsync_failed:{error}"))?;
    }
    for (relative_path, contents) in &snapshot.markdown {
        validate_relative_file(relative_path)?;
        if contents.len() > MAX_SECTION_BYTES {
            return Err("canonical_snapshot_too_large".into());
        }
        let path = current.join(relative_path);
        let parent = path
            .parent()
            .ok_or_else(|| "canonical_path_invalid".to_owned())?;
        if parent.starts_with(current.join("sections")) {
            return Err("canonical_path_invalid".into());
        }
        fs::create_dir_all(parent).map_err(|error| format!("canonical_write_failed:{error}"))?;
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|error| format!("canonical_write_failed:{error}"))?;
        file.write_all(contents.as_bytes())
            .and_then(|_| file.sync_all())
            .map_err(|error| format!("canonical_fsync_failed:{error}"))?;
        sync_directory(parent)?;
    }
    sync_directory(&current.join("sections"))?;
    sync_directory(current)?;
    Ok(CanonicalBasis {
        manifest_hash: hash_json(&snapshot.manifest)?,
        artifact_hash: hash_json(&snapshot.artifact)?,
    })
}

fn read_json(path: &Path) -> Result<(Value, Vec<u8>), String> {
    let (value, bytes) = read_json_bytes(path)?;
    if json_bytes(&value)? != bytes {
        return Err("canonical_bytes_noncanonical".into());
    }
    Ok((value, bytes))
}

fn read_json_bytes(path: &Path) -> Result<(Value, Vec<u8>), String> {
    let metadata =
        fs::symlink_metadata(path).map_err(|_| "canonical_snapshot_incomplete".to_owned())?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("canonical_symlink_rejected".into());
    }
    let bytes = fs::read(path).map_err(|_| "canonical_snapshot_incomplete".to_owned())?;
    let value: Value =
        serde_json::from_slice(&bytes).map_err(|_| "canonical_snapshot_invalid".to_owned())?;
    Ok((value, bytes))
}

fn legacy_topic_map(path: &Path, field: &str) -> Result<BTreeMap<String, Value>, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("canonical_symlink_rejected".into());
    }
    let bytes = fs::read(path).map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?;
    let document: Value = serde_json::from_slice(&bytes)
        .map_err(|_| "canonical_legacy_topic_sources_invalid".to_owned())?;
    document
        .get("data")
        .and_then(Value::as_object)
        .and_then(|data| data.get(field))
        .and_then(Value::as_object)
        .cloned()
        .map(|values| values.into_iter().collect())
        .ok_or_else(|| "canonical_legacy_topic_sources_invalid".to_owned())
}

struct ResolvedCurrentTopic {
    path_id: String,
    current: PathBuf,
}

fn resolve_current_topic(root: &Path, topic_id: &str) -> Result<ResolvedCurrentTopic, String> {
    validate_identity_part(topic_id)?;
    let path_id = canonical_topic_path_id(topic_id)?;
    let current = root.join("topics").join(&path_id).join("current");
    if current.exists() && descriptor(&current, topic_id, &path_id).is_ok() {
        return Ok(ResolvedCurrentTopic { path_id, current });
    }
    if let Some(legacy_path_id) = historical_typescript_topic_path_id(topic_id)? {
        let legacy_current = root.join("topics").join(legacy_path_id).join("current");
        if legacy_current.exists()
            && (descriptor(&legacy_current, topic_id, &path_id).is_ok() || !current.exists())
        {
            return Ok(ResolvedCurrentTopic {
                path_id,
                current: legacy_current,
            });
        }
    }
    Ok(ResolvedCurrentTopic { path_id, current })
}

fn read_topic_snapshot(root: &Path, topic_id: &str) -> Result<TopicSnapshot, String> {
    let resolved = resolve_current_topic(root, topic_id)?;
    let path_id = resolved.path_id;
    let current = resolved.current;
    if !current.is_dir() {
        return Err("canonical_legacy_topic_sources_mismatch".into());
    }
    descriptor(&current, topic_id, &path_id)?;
    let (manifest, _) = read_json(&current.join("manifest.json"))?;
    let (artifact, _) = read_json(&current.join("artifact.json"))?;
    // The final TypeScript owner wrote metadata with a stable payload hash but
    // pretty JSON bytes. Preserve those bytes; descriptor validates the legacy
    // hash basis while excluding its self-declared metadata_hash field.
    let (metadata, _) = read_json_bytes(&current.join("metadata.json"))?;
    let mut sections = BTreeMap::new();
    let section_names = manifest["sections"]
        .as_object()
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    for name in section_names.keys() {
        let file_name = section_file_name(name)?;
        let (section, _) = read_json(&current.join("sections").join(file_name))?;
        sections.insert(name.clone(), section);
    }
    let mut markdown = BTreeMap::new();
    collect_markdown(&current, &current, &mut markdown)?;
    Ok(TopicSnapshot {
        topic_id: topic_id.into(),
        path_id,
        manifest,
        artifact,
        metadata,
        sections,
        markdown,
    })
}

fn descriptor(current: &Path, topic_id: &str, path_id: &str) -> Result<Value, String> {
    let metadata =
        fs::symlink_metadata(current).map_err(|_| "canonical_snapshot_incomplete".to_owned())?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("canonical_symlink_rejected".into());
    }
    let (manifest_value, _manifest) = read_json(&current.join("manifest.json"))?;
    let (artifact_value, _artifact) = read_json(&current.join("artifact.json"))?;
    let (metadata_value, _metadata) = read_json_bytes(&current.join("metadata.json"))?;
    let mut sections = Vec::new();
    let sections_root = current.join("sections");
    let section_metadata = fs::symlink_metadata(&sections_root)
        .map_err(|_| "canonical_snapshot_incomplete".to_owned())?;
    if section_metadata.file_type().is_symlink() || !section_metadata.is_dir() {
        return Err("canonical_symlink_rejected".into());
    }
    for entry in
        fs::read_dir(&sections_root).map_err(|error| format!("canonical_read_failed:{error}"))?
    {
        let entry = entry.map_err(|error| format!("canonical_read_failed:{error}"))?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("canonical_read_failed:{error}"))?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err("canonical_unknown_file".into());
        }
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !file_name.ends_with(".json") {
            return Err("canonical_unknown_file".into());
        }
        let name = file_name.trim_end_matches(".json").replace('-', "_");
        if section_file_name(&name)? != file_name {
            return Err("canonical_unknown_file".into());
        }
        let (value, bytes) = read_json(&path)?;
        sections.push(json!({
            "name":name,
            "fileName":file_name,
            "sha256":hash_json(&value)?,
            "byteLength":bytes.len(),
        }));
    }
    sections.sort_by_key(|value| value["name"].as_str().unwrap_or_default().to_owned());
    if sections.len() > MAX_SECTION_COUNT {
        return Err("canonical_snapshot_too_large".into());
    }
    let declared = manifest_value
        .as_object()
        .and_then(|manifest| manifest.get("sections"))
        .and_then(Value::as_object)
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    if declared.len() != sections.len()
        || sections
            .iter()
            .any(|section| !declared.contains_key(section["name"].as_str().unwrap_or_default()))
    {
        return Err("canonical_snapshot_incomplete".into());
    }
    let manifest_object = manifest_value
        .as_object()
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    let artifact_hash = hash_json(&artifact_value)?;
    let metadata_hash = hash_json(&metadata_value)?;
    let legacy_metadata_hash = metadata_value
        .get("data")
        .and_then(Value::as_object)
        .and_then(|data| {
            let declared = data.get("metadata_hash")?.as_str()?.to_owned();
            let mut basis = data.clone();
            basis.remove("metadata_hash");
            Some((declared, Value::Object(basis)))
        })
        .map(|(declared, basis)| hash_json(&basis).map(|computed| (declared, computed)))
        .transpose()?;
    let declared_metadata_hash = manifest_object.get("metadata_hash").and_then(Value::as_str);
    let metadata_hash_matches = declared_metadata_hash == Some(metadata_hash.as_str())
        || legacy_metadata_hash
            .as_ref()
            .is_some_and(|(declared, computed)| {
                declared == computed && declared_metadata_hash == Some(declared.as_str())
            });
    if manifest_object.get("artifact_hash").and_then(Value::as_str) != Some(artifact_hash.as_str())
        || !metadata_hash_matches
    {
        return Err("canonical_hash_mismatch".into());
    }
    let declared_hashes = manifest_object
        .get("section_hashes")
        .and_then(Value::as_object)
        .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?;
    if sections.iter().any(|section| {
        declared_hashes
            .get(section["name"].as_str().unwrap_or_default())
            .and_then(Value::as_str)
            != section["sha256"].as_str()
    }) {
        return Err("canonical_hash_mismatch".into());
    }
    let mut known = HashSet::from([
        "manifest.json".to_owned(),
        "artifact.json".to_owned(),
        "metadata.json".to_owned(),
        "sections".to_owned(),
    ]);
    for entry in fs::read_dir(current).map_err(|error| format!("canonical_read_failed:{error}"))? {
        let entry = entry.map_err(|error| format!("canonical_read_failed:{error}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !known.remove(&name) {
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path)
                .map_err(|error| format!("canonical_read_failed:{error}"))?;
            if metadata.file_type().is_symlink() {
                return Err("canonical_symlink_rejected".into());
            }
            if metadata.is_file() {
                validate_relative_file(&name)?;
            } else if metadata.is_dir() {
                fn validate_markdown_tree(root: &Path, directory: &Path) -> Result<(), String> {
                    for entry in fs::read_dir(directory)
                        .map_err(|error| format!("canonical_read_failed:{error}"))?
                    {
                        let entry =
                            entry.map_err(|error| format!("canonical_read_failed:{error}"))?;
                        let path = entry.path();
                        let metadata = fs::symlink_metadata(&path)
                            .map_err(|error| format!("canonical_read_failed:{error}"))?;
                        if metadata.file_type().is_symlink() {
                            return Err("canonical_symlink_rejected".into());
                        }
                        if metadata.is_dir() {
                            validate_markdown_tree(root, &path)?;
                        } else if metadata.is_file() {
                            let relative = path
                                .strip_prefix(root)
                                .map_err(|_| "canonical_path_invalid".to_owned())?
                                .to_string_lossy()
                                .replace('\\', "/");
                            validate_relative_file(&relative)?;
                            if metadata.len() > MAX_SECTION_BYTES as u64 {
                                return Err("canonical_snapshot_too_large".into());
                            }
                        } else {
                            return Err("canonical_unknown_file".into());
                        }
                    }
                    Ok(())
                }
                validate_markdown_tree(current, &path)?;
            } else {
                return Err("canonical_unknown_file".into());
            }
        }
    }
    Ok(json!({
        "status": "ready",
        "topicId": topic_id,
        "pathId": path_id,
        "manifestHash": hash_json(&manifest_value)?,
        "artifactHash": hash_json(&artifact_value)?,
        "metadataHash": hash_json(&metadata_value)?,
        "sections": sections,
        "diagnostics": [],
    }))
}

fn collect_markdown(
    current: &Path,
    directory: &Path,
    output: &mut BTreeMap<String, String>,
) -> Result<(), String> {
    for entry in
        fs::read_dir(directory).map_err(|error| format!("canonical_read_failed:{error}"))?
    {
        let entry = entry.map_err(|error| format!("canonical_read_failed:{error}"))?;
        let path = entry.path();
        let relative = path
            .strip_prefix(current)
            .map_err(|_| "canonical_path_invalid".to_owned())?
            .to_string_lossy()
            .replace('\\', "/");
        if matches!(
            relative.as_str(),
            "manifest.json" | "artifact.json" | "metadata.json" | "sections"
        ) {
            continue;
        }
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("canonical_read_failed:{error}"))?;
        if metadata.file_type().is_symlink() {
            return Err("canonical_symlink_rejected".into());
        }
        if metadata.is_dir() {
            collect_markdown(current, &path, output)?;
        } else if metadata.is_file() {
            validate_relative_file(&relative)?;
            let text =
                fs::read_to_string(&path).map_err(|_| "canonical_snapshot_invalid".to_owned())?;
            output.insert(relative, text);
        } else {
            return Err("canonical_unknown_file".into());
        }
    }
    Ok(())
}

impl CanonicalStore {
    pub fn preflight_legacy_production(
        root: &Path,
        canonical_topic_ids: &BTreeSet<String>,
        graph_only_topic_ids: &BTreeSet<String>,
    ) -> Result<Vec<LegacyCanonicalTopic>, String> {
        if !root.is_absolute()
            || root.file_name().and_then(|value| value.to_str()) != Some("synthesis")
        {
            return Err("canonical_production_path_invalid".into());
        }
        let metadata = fs::symlink_metadata(root)
            .map_err(|_| "canonical_production_root_missing".to_owned())?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("canonical_production_path_invalid".into());
        }
        if root.join("identity.json").exists() {
            return Err("canonical_legacy_identity_present".into());
        }
        let definitions = legacy_topic_map(&root.join("sidecar/topic-definitions.json"), "topics")?;
        let resolvers = legacy_topic_map(&root.join("sidecar/resolvers.json"), "resolvers")?;
        let paper_sets =
            legacy_topic_map(&root.join("sidecar/resolved-paper-sets.json"), "paper_sets")?;
        if !canonical_topic_ids.is_disjoint(graph_only_topic_ids) {
            return Err("canonical_legacy_topic_sources_mismatch".into());
        }
        let known_topic_ids = canonical_topic_ids
            .union(graph_only_topic_ids)
            .collect::<BTreeSet<_>>();
        if definitions
            .keys()
            .chain(resolvers.keys())
            .chain(paper_sets.keys())
            .any(|topic_id| !known_topic_ids.contains(topic_id))
        {
            return Err("canonical_legacy_topic_sources_mismatch".into());
        }
        canonical_topic_ids
            .iter()
            .map(|topic_id| {
                let definition = definitions
                    .get(topic_id)
                    .cloned()
                    .ok_or_else(|| "canonical_legacy_topic_sources_mismatch".to_owned())?;
                if definition.get("id").and_then(Value::as_str) != Some(topic_id.as_str()) {
                    return Err("canonical_legacy_topic_sources_mismatch".into());
                }
                let snapshot = read_topic_snapshot(root, topic_id)?;
                if snapshot.topic_id.as_str() != topic_id
                    || snapshot.manifest.get("topic_id").and_then(Value::as_str)
                        != Some(topic_id.as_str())
                {
                    return Err("canonical_legacy_topic_sources_mismatch".into());
                }
                Ok(LegacyCanonicalTopic {
                    topic_definition: definition,
                    topic_resolver: resolvers
                        .get(topic_id)
                        .cloned()
                        .ok_or_else(|| "canonical_legacy_topic_sources_mismatch".to_owned())?,
                    resolved_paper_set: paper_sets
                        .get(topic_id)
                        .cloned()
                        .ok_or_else(|| "canonical_legacy_topic_sources_mismatch".to_owned())?,
                    snapshot: canonical_topic_view(&snapshot)?,
                })
            })
            .collect()
    }

    pub fn open(profile_runtime_root: &Path, identity: CanonicalIdentity) -> Result<Self, String> {
        let root = profile_runtime_root
            .join("shadow-canonical")
            .join(path_segment(&identity.data_root_id));
        Self::open_root(root, identity, IDENTITY_SCHEMA)
    }

    pub fn open_production(root: &Path, identity: CanonicalIdentity) -> Result<Self, String> {
        if !root.is_absolute()
            || root.file_name().and_then(|value| value.to_str()) != Some("synthesis")
        {
            return Err("canonical_production_path_invalid".into());
        }
        let metadata = fs::symlink_metadata(root)
            .map_err(|_| "canonical_production_root_missing".to_owned())?;
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("canonical_production_path_invalid".into());
        }
        Self::open_root(root.to_owned(), identity, PRODUCTION_IDENTITY_SCHEMA)
    }

    pub fn initialize_production(root: &Path, identity: CanonicalIdentity) -> Result<Self, String> {
        if !root.is_absolute()
            || root.file_name().and_then(|value| value.to_str()) != Some("synthesis")
        {
            return Err("canonical_production_path_invalid".into());
        }
        if root.exists() {
            return Err("canonical_production_root_exists".into());
        }
        Self::open_root(root.to_owned(), identity, PRODUCTION_IDENTITY_SCHEMA)
    }

    fn open_root(
        root: PathBuf,
        identity: CanonicalIdentity,
        identity_schema: &str,
    ) -> Result<Self, String> {
        validate_identity_part(&identity.profile_id)?;
        validate_identity_part(&identity.data_root_id)?;
        fs::create_dir_all(root.join("topics"))
            .map_err(|error| format!("canonical_root_create:{error}"))?;
        fs::create_dir_all(root.join("deleted"))
            .map_err(|error| format!("canonical_root_create:{error}"))?;
        let store_id = if identity_schema == IDENTITY_SCHEMA {
            stable_id(&identity)
        } else {
            stable_id_for_schema(identity_schema, &identity)
        };
        let marker = IdentityMarker {
            schema: identity_schema.into(),
            profile_id: identity.profile_id,
            data_root_id: identity.data_root_id,
            store_schema: STORE_SCHEMA.into(),
            store_id: store_id.clone(),
        };
        let marker_path = root.join("identity.json");
        if marker_path.exists() {
            let current: IdentityMarker = serde_json::from_slice(
                &fs::read(&marker_path)
                    .map_err(|error| format!("canonical_identity_read:{error}"))?,
            )
            .map_err(|_| "canonical_identity_invalid".to_owned())?;
            if current != marker {
                return Err("canonical_identity_mismatch".into());
            }
        } else {
            durable_json(&marker_path, &marker)?;
        }
        let _ = fs::remove_file(root.join(".writer.lock"));
        let mut store = Self {
            root,
            store_id,
            writer: AtomicBool::new(false),
            repair_required: false,
            #[cfg(feature = "parity-harness")]
            parity_transaction_ids: None,
        };
        store.recover_all(None)?;
        store.recover_import_batch_on_open()?;
        Ok(store)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn store_id(&self) -> &str {
        &self.store_id
    }

    pub fn close(self) -> Result<(), String> {
        if self.writer.load(Ordering::Acquire) {
            return Err("canonical_writer_active".into());
        }
        Ok(())
    }

    fn topic_root(&self, path_id: &str) -> Result<PathBuf, String> {
        validate_identity_part(path_id)?;
        Ok(self.root.join("topics").join(path_segment(path_id)))
    }

    fn acquire_writer(&self) -> Result<WriterLease, String> {
        if self
            .writer
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return Err("canonical_store_busy".into());
        }
        let path = self.root.join(".writer.lock");
        match OpenOptions::new().create_new(true).write(true).open(&path) {
            Ok(mut file) => {
                let result = file
                    .write_all(self.store_id.as_bytes())
                    .and_then(|_| file.sync_all());
                if let Err(error) = result {
                    self.writer.store(false, Ordering::Release);
                    let _ = fs::remove_file(&path);
                    return Err(format!("canonical_writer_failed:{error}"));
                }
                Ok(WriterLease { path })
            }
            Err(_) => {
                self.writer.store(false, Ordering::Release);
                Err("canonical_store_busy".into())
            }
        }
    }

    fn release_writer(&self, lease: WriterLease) {
        drop(lease);
        self.writer.store(false, Ordering::Release);
    }

    pub fn inspect(&self, topic_id: &str) -> Result<Value, String> {
        let resolved = resolve_current_topic(&self.root, topic_id)?;
        let path_id = resolved.path_id;
        let current = resolved.current;
        if !current.exists() {
            return Ok(json!({
                "status":"absent",
                "topicId":topic_id,
                "pathId":path_id,
                "manifestHash":null,
                "artifactHash":null,
                "metadataHash":null,
                "sections":[],
                "diagnostics":[],
            }));
        }
        match descriptor(&current, topic_id, &path_id) {
            Ok(value) => Ok(value),
            Err(error) => Ok(json!({
                "status":"invalid",
                "topicId":topic_id,
                "pathId":path_id,
                "manifestHash":null,
                "artifactHash":null,
                "metadataHash":null,
                "sections":[],
                "diagnostics":[error],
            })),
        }
    }

    fn read_current(&self, topic_id: &str) -> Result<CurrentTopic, String> {
        let resolved = resolve_current_topic(&self.root, topic_id)?;
        let path_id = resolved.path_id;
        let current = resolved.current;
        if !current.exists() {
            return Ok(CurrentTopic::Absent {
                topic_id: topic_id.into(),
                path_id,
            });
        }
        let descriptor = match descriptor(&current, topic_id, &path_id) {
            Ok(descriptor) => descriptor,
            Err(error) => {
                return Ok(CurrentTopic::Invalid {
                    topic_id: topic_id.into(),
                    path_id,
                    diagnostics: vec![error],
                });
            }
        };
        let snapshot = read_topic_snapshot(&self.root, topic_id)?;
        Ok(CurrentTopic::Ready {
            snapshot,
            basis: CanonicalBasis {
                manifest_hash: descriptor["manifestHash"]
                    .as_str()
                    .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?
                    .into(),
                artifact_hash: descriptor["artifactHash"]
                    .as_str()
                    .ok_or_else(|| "canonical_snapshot_invalid".to_owned())?
                    .into(),
            },
        })
    }

    pub fn read_topic(&self, topic_id: &str) -> Result<CanonicalTopicState, CanonicalError> {
        match self
            .read_current(topic_id)
            .map_err(CanonicalError::from_code)?
        {
            CurrentTopic::Absent { topic_id, path_id } => {
                Ok(CanonicalTopicState::Absent { topic_id, path_id })
            }
            CurrentTopic::Ready { snapshot, .. } => canonical_topic_view(&snapshot)
                .map(CanonicalTopicState::Ready)
                .map_err(CanonicalError::from_code),
            CurrentTopic::Invalid {
                topic_id,
                path_id,
                diagnostics,
            } => Ok(CanonicalTopicState::Invalid {
                topic_id,
                path_id,
                diagnostics,
            }),
        }
    }

    pub fn capture_topic(&self, topic_id: &str) -> Result<CanonicalTopicCapture, CanonicalError> {
        let snapshot = match self
            .read_current(topic_id)
            .map_err(CanonicalError::from_code)?
        {
            CurrentTopic::Ready { snapshot, .. } => snapshot,
            CurrentTopic::Absent { .. } => {
                return Err(CanonicalError::from_code("canonical_topic_absent".into()));
            }
            CurrentTopic::Invalid { .. } => {
                return Err(CanonicalError::from_code(
                    "canonical_snapshot_invalid".into(),
                ));
            }
        };
        Ok(CanonicalTopicCapture {
            topic: canonical_topic_view(&snapshot).map_err(CanonicalError::from_code)?,
            assets: canonical_topic_assets(&snapshot).map_err(CanonicalError::from_code)?,
            representation_hash: topic_representation_hash(&snapshot)
                .map_err(CanonicalError::from_code)?,
        })
    }

    pub fn archive_current(
        &mut self,
        topic_id: &str,
        deleted_path_id: &str,
    ) -> Result<bool, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        if self.root.join("import-batch.json").exists() {
            return Err("canonical_store_busy".into());
        }
        validate_identity_part(topic_id)?;
        validate_deleted_path_id(deleted_path_id)?;
        let resolved = resolve_current_topic(&self.root, topic_id)?;
        let current = resolved.current;
        if !current.exists() {
            return Ok(false);
        }
        let topic_root = current
            .parent()
            .ok_or_else(|| "canonical_path_invalid".to_owned())?
            .to_owned();
        let deleted_root = self.root.join("deleted").join(deleted_path_id);
        if deleted_root.exists() {
            return Err("canonical_deleted_snapshot_exists".into());
        }
        let lease = self.acquire_writer()?;
        let result = (|| {
            fs::create_dir(&deleted_root)
                .map_err(|error| format!("canonical_write_failed:{error}"))?;
            if let Err(error) = fs::rename(&current, deleted_root.join("current")) {
                let _ = fs::remove_dir(&deleted_root);
                return Err(format!("canonical_rename_failed:{error}"));
            }
            if let Err(error) = sync_directory(&topic_root)
                .and_then(|_| sync_directory(&deleted_root))
                .and_then(|_| sync_directory(&self.root.join("deleted")))
            {
                let restored = fs::rename(deleted_root.join("current"), &current)
                    .and_then(|_| fs::remove_dir(&deleted_root));
                let _ = sync_directory(&topic_root);
                let _ = sync_directory(&self.root.join("deleted"));
                return if restored.is_ok() {
                    Err(error)
                } else {
                    Err("repair_required".into())
                };
            }
            Ok(true)
        })();
        self.release_writer(lease);
        result
    }

    pub fn restore_deleted(
        &mut self,
        topic_id: &str,
        deleted_path_id: &str,
    ) -> Result<bool, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        validate_identity_part(topic_id)?;
        validate_deleted_path_id(deleted_path_id)?;
        let topic_root = self.topic_root(&canonical_topic_path_id(topic_id)?)?;
        let current = topic_root.join("current");
        if current.exists() {
            return Err("canonical_current_exists".into());
        }
        let deleted_root = self.root.join("deleted").join(deleted_path_id);
        let deleted_current = deleted_root.join("current");
        if !deleted_current.exists() {
            return Err("canonical_deleted_snapshot_missing".into());
        }
        let lease = self.acquire_writer()?;
        let result = (|| {
            fs::create_dir_all(&topic_root)
                .map_err(|error| format!("canonical_write_failed:{error}"))?;
            fs::rename(&deleted_current, &current)
                .map_err(|error| format!("canonical_rename_failed:{error}"))?;
            fs::remove_dir(&deleted_root)
                .map_err(|error| format!("canonical_remove_failed:{error}"))?;
            sync_directory(&topic_root)?;
            sync_directory(&self.root.join("deleted"))?;
            Ok(true)
        })();
        self.release_writer(lease);
        result
    }

    pub fn purge_deleted(&mut self, deleted_path_id: &str) -> Result<bool, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        validate_deleted_path_id(deleted_path_id)?;
        let deleted_root = self.root.join("deleted").join(deleted_path_id);
        if !deleted_root.exists() {
            return Ok(false);
        }
        let lease = self.acquire_writer()?;
        let result = remove_tree(&deleted_root)
            .and_then(|_| sync_directory(&self.root.join("deleted")))
            .map(|_| true);
        self.release_writer(lease);
        result
    }

    pub fn receipt(&self, topic_id: &str) -> Result<Option<CanonicalReceipt>, String> {
        validate_identity_part(topic_id)?;
        let resolved = resolve_current_topic(&self.root, topic_id)?;
        let path_id = resolved.path_id;
        let topic_root = resolved
            .current
            .parent()
            .ok_or_else(|| "canonical_path_invalid".to_owned())?;
        let path = topic_root.join("receipt.json");
        if !path.exists() {
            return Ok(None);
        }
        let receipt: CanonicalReceipt = serde_json::from_slice(
            &fs::read(path).map_err(|error| format!("canonical_read_failed:{error}"))?,
        )
        .map_err(|_| "canonical_receipt_invalid".to_owned())?;
        if receipt.schema != RECEIPT_SCHEMA
            || receipt.topic_id != topic_id
            || receipt.path_id != path_id
        {
            return Err("canonical_receipt_invalid".into());
        }
        Ok(Some(receipt))
    }

    pub fn repair_required(&self) -> bool {
        self.repair_required
    }

    fn inspect_resolved_current(&self, topic_id: &str) -> Result<Option<Value>, String> {
        let resolved = resolve_current_topic(&self.root, topic_id)?;
        if !resolved.current.exists() {
            return Ok(None);
        }
        descriptor(&resolved.current, topic_id, &resolved.path_id).map(Some)
    }

    fn promote(&mut self, promotion: Promotion) -> Result<CanonicalReceipt, String> {
        self.promote_with_fault(promotion, None, true)
    }

    pub fn promote_prepared(
        &mut self,
        prepared: PreparedCanonicalPromotion,
    ) -> Result<CanonicalReceipt, CanonicalError> {
        let transaction_id = self.next_transaction_id(&prepared.snapshot.path_id);
        self.promote(Promotion {
            transaction_id,
            expected_basis: prepared.expected_basis,
            snapshot: prepared.snapshot,
        })
        .map_err(CanonicalError::from_code)
    }

    fn next_transaction_id(&mut self, path_id: &str) -> String {
        #[cfg(feature = "parity-harness")]
        if let Some(transaction_ids) = &self.parity_transaction_ids
            && let Ok(mut transaction_ids) = transaction_ids.lock()
            && let Some(transaction_id) = transaction_ids.pop_front()
        {
            return transaction_id;
        }
        let sequence = TRANSACTION_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let identity = sha256_hex(format!(
            "{}\0{path_id}\0{}\0{}\0{sequence}",
            self.store_id,
            synthesis_protocol::utc_now_iso8601(),
            std::process::id(),
        ));
        format!("canonical-transaction-{identity}")
    }

    #[cfg(feature = "parity-harness")]
    pub fn set_transaction_ids_for_parity(
        &mut self,
        transaction_ids: Arc<Mutex<VecDeque<String>>>,
    ) {
        self.parity_transaction_ids = Some(transaction_ids);
    }

    #[cfg(feature = "parity-harness")]
    pub fn reject_prepared_promotion_for_parity(
        &mut self,
        prepared: PreparedCanonicalPromotion,
        code: String,
    ) -> CanonicalError {
        let _ = self.next_transaction_id(&prepared.snapshot.path_id);
        CanonicalError::from_code(code)
    }

    fn promote_with_fault(
        &mut self,
        promotion: Promotion,
        fault: Option<FaultPoint>,
        recover_in_process: bool,
    ) -> Result<CanonicalReceipt, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        if self.root.join("import-batch.json").exists() {
            return Err("canonical_store_busy".into());
        }
        let lease = self.acquire_writer()?;
        let result = if fault == Some(FaultPoint::LockAcquired) {
            Err("fault_injected:lock_acquired".into())
        } else {
            self.promote_locked(promotion, fault)
        };
        if result.is_err()
            && recover_in_process
            && let Err(error) = self.recover_all(fault)
        {
            self.repair_required = true;
            self.release_writer(lease);
            return Err(error);
        }
        self.release_writer(lease);
        result
    }

    fn promote_locked(
        &mut self,
        promotion: Promotion,
        fault: Option<FaultPoint>,
    ) -> Result<CanonicalReceipt, String> {
        validate_identity_part(&promotion.transaction_id)?;
        validate_identity_part(&promotion.snapshot.topic_id)?;
        validate_identity_part(&promotion.snapshot.path_id)?;
        let topic_root = self.topic_root(&promotion.snapshot.path_id)?;
        fs::create_dir_all(&topic_root)
            .map_err(|error| format!("canonical_write_failed:{error}"))?;
        let current_descriptor = self.inspect_resolved_current(&promotion.snapshot.topic_id)?;
        match (&promotion.expected_basis, &current_descriptor) {
            (None, None) => {}
            (Some(expected), Some(current))
                if current["manifestHash"] == expected.manifest_hash
                    && current["artifactHash"] == expected.artifact_hash => {}
            _ => return Err("basis_mismatch".into()),
        }
        let staging = topic_root.join("staging").join("current");
        let backup = topic_root.join("backup").join("current");
        if staging.exists() || backup.exists() || topic_root.join("transaction.json").exists() {
            return Err("canonical_store_busy".into());
        }
        fs::create_dir_all(
            staging
                .parent()
                .ok_or_else(|| "canonical_path_invalid".to_owned())?,
        )
        .map_err(|error| format!("canonical_write_failed:{error}"))?;
        fs::create_dir_all(
            backup
                .parent()
                .ok_or_else(|| "canonical_path_invalid".to_owned())?,
        )
        .map_err(|error| format!("canonical_write_failed:{error}"))?;
        let basis = copy_snapshot(&promotion.snapshot, &staging)?;
        sync_directory(
            staging
                .parent()
                .ok_or_else(|| "canonical_path_invalid".to_owned())?,
        )?;
        if fault == Some(FaultPoint::StagingWritten) {
            return Err("fault_injected:staging_written".into());
        }
        let had_current = topic_root.join("current").exists();
        let mut journal = Journal {
            schema: JOURNAL_SCHEMA.into(),
            transaction_id: promotion.transaction_id,
            topic_id: promotion.snapshot.topic_id,
            path_id: promotion.snapshot.path_id,
            had_current,
            phase: JournalPhase::Staged,
            manifest_hash: basis.manifest_hash,
            artifact_hash: basis.artifact_hash,
        };
        durable_json(&topic_root.join("transaction.json"), &journal)?;
        if fault == Some(FaultPoint::JournalWritten) {
            return Err("fault_injected:journal_written".into());
        }
        if had_current {
            fs::rename(topic_root.join("current"), &backup)
                .map_err(|error| format!("canonical_rename_failed:{error}"))?;
            sync_directory(&topic_root)?;
        }
        journal.phase = JournalPhase::BackedUp;
        durable_json(&topic_root.join("transaction.json"), &journal)?;
        if fault == Some(FaultPoint::CurrentBackedUp) {
            return Err("fault_injected:current_backed_up".into());
        }
        fs::rename(&staging, topic_root.join("current"))
            .map_err(|error| format!("canonical_rename_failed:{error}"))?;
        sync_directory(&topic_root)?;
        journal.phase = JournalPhase::Promoted;
        durable_json(&topic_root.join("transaction.json"), &journal)?;
        if fault == Some(FaultPoint::CurrentPromoted) {
            return Err("fault_injected:current_promoted".into());
        }
        let receipt = CanonicalReceipt {
            schema: RECEIPT_SCHEMA.into(),
            transaction_id: journal.transaction_id.clone(),
            topic_id: journal.topic_id.clone(),
            path_id: journal.path_id.clone(),
            manifest_hash: journal.manifest_hash.clone(),
            artifact_hash: journal.artifact_hash.clone(),
        };
        if fault == Some(FaultPoint::ReceiptWritten) {
            return Err("fault_injected:receipt_written".into());
        }
        durable_json(&topic_root.join("receipt.json"), &receipt)?;
        journal.phase = JournalPhase::Committed;
        durable_json(&topic_root.join("transaction.json"), &journal)?;
        self.cleanup_transaction(&topic_root)?;
        Ok(receipt)
    }

    fn cleanup_transaction(&self, topic_root: &Path) -> Result<(), String> {
        remove_tree(&topic_root.join("staging"))?;
        remove_tree(&topic_root.join("backup"))?;
        if topic_root.join("transaction.json").exists() {
            fs::remove_file(topic_root.join("transaction.json"))
                .map_err(|error| format!("canonical_remove_failed:{error}"))?;
        }
        sync_directory(topic_root)
    }

    fn recover_topic(
        &mut self,
        topic_root: &Path,
        fault: Option<FaultPoint>,
    ) -> Result<(), String> {
        let journal_path = topic_root.join("transaction.json");
        if !journal_path.exists() {
            remove_tree(&topic_root.join("staging"))?;
            remove_tree(&topic_root.join("backup"))?;
            return Ok(());
        }
        let journal: Journal = serde_json::from_slice(
            &fs::read(&journal_path).map_err(|error| format!("canonical_read_failed:{error}"))?,
        )
        .map_err(|_| "canonical_journal_invalid".to_owned())?;
        if journal.schema != JOURNAL_SCHEMA {
            return Err("canonical_journal_invalid".into());
        }
        let receipt_path = topic_root.join("receipt.json");
        let receipt = if receipt_path.exists() {
            Some(
                serde_json::from_slice::<CanonicalReceipt>(
                    &fs::read(&receipt_path)
                        .map_err(|error| format!("canonical_read_failed:{error}"))?,
                )
                .map_err(|_| "canonical_receipt_invalid".to_owned())?,
            )
        } else {
            None
        };
        let forward = journal.phase == JournalPhase::Committed
            || receipt.as_ref().is_some_and(|receipt| {
                receipt.schema == RECEIPT_SCHEMA
                    && receipt.transaction_id == journal.transaction_id
                    && receipt.topic_id == journal.topic_id
                    && receipt.path_id == journal.path_id
                    && receipt.manifest_hash == journal.manifest_hash
                    && receipt.artifact_hash == journal.artifact_hash
            });
        if !forward {
            if journal.phase != JournalPhase::Staged && topic_root.join("current").exists() {
                remove_tree(&topic_root.join("current"))?;
            }
            if journal.had_current {
                let backup = topic_root.join("backup").join("current");
                if journal.phase == JournalPhase::Staged {
                    if !topic_root.join("current").exists() {
                        return Err("repair_required".into());
                    }
                } else {
                    if !backup.exists() || fault == Some(FaultPoint::RollbackRestore) {
                        return Err("repair_required".into());
                    }
                    fs::rename(backup, topic_root.join("current"))
                        .map_err(|_| "repair_required".to_owned())?;
                    sync_directory(topic_root)?;
                }
            } else if topic_root.join("current").exists() {
                remove_tree(&topic_root.join("current"))?;
            }
        }
        self.cleanup_transaction(topic_root)
    }

    fn recover_all(&mut self, fault: Option<FaultPoint>) -> Result<(), String> {
        let topics = self.root.join("topics");
        let entries =
            fs::read_dir(&topics).map_err(|error| format!("canonical_read_failed:{error}"))?;
        for entry in entries {
            let entry = entry.map_err(|error| format!("canonical_read_failed:{error}"))?;
            let metadata = entry
                .file_type()
                .map_err(|error| format!("canonical_read_failed:{error}"))?;
            if !metadata.is_dir() {
                return Err("canonical_unknown_file".into());
            }
            self.recover_topic(&entry.path(), fault)?;
        }
        Ok(())
    }

    fn stage_import_batch(
        &mut self,
        receipt_id: String,
        manifest_hash: String,
        topics: Vec<Promotion>,
    ) -> Result<(), String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        validate_identity_part(&receipt_id)?;
        if manifest_hash.len() != 64 || topics.is_empty() {
            return Err("canonical_import_invalid".into());
        }
        let lease = self.acquire_writer()?;
        let result = (|| {
            if self.root.join("import-batch.json").exists() {
                return Err("canonical_store_busy".into());
            }
            let mut seen = HashSet::new();
            for topic in &topics {
                if !seen.insert(topic.snapshot.topic_id.clone()) {
                    return Err("canonical_import_invalid".into());
                }
                let current = self.inspect_resolved_current(&topic.snapshot.topic_id)?;
                match (&topic.expected_basis, current) {
                    (None, None) => {}
                    (Some(expected), Some(current))
                        if current["manifestHash"] == expected.manifest_hash
                            && current["artifactHash"] == expected.artifact_hash => {}
                    _ => return Err("basis_mismatch".into()),
                }
            }
            durable_json(
                &self.root.join("import-batch.json"),
                &ImportBatch {
                    schema: IMPORT_SCHEMA.into(),
                    receipt_id,
                    manifest_hash,
                    topics,
                },
            )
        })();
        self.release_writer(lease);
        result
    }

    pub fn stage_prepared_import_batch(
        &mut self,
        receipt_id: String,
        manifest_hash: String,
        topics: Vec<PreparedCanonicalPromotion>,
    ) -> Result<(), CanonicalError> {
        let mut promotions = Vec::with_capacity(topics.len());
        for prepared in topics {
            promotions.push(Promotion {
                transaction_id: self.next_transaction_id(&prepared.snapshot.path_id),
                expected_basis: prepared.expected_basis,
                snapshot: prepared.snapshot,
            });
        }
        self.stage_import_batch(receipt_id, manifest_hash, promotions)
            .map_err(CanonicalError::from_code)
    }

    pub fn commit_import_batch(
        &mut self,
        receipt_id: &str,
        manifest_hash: &str,
    ) -> Result<Vec<CanonicalReceipt>, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        let lease = self.acquire_writer()?;
        let result = (|| {
            let batch_path = self.root.join("import-batch.json");
            let batch: ImportBatch = serde_json::from_slice(
                &fs::read(&batch_path).map_err(|_| "canonical_import_missing".to_owned())?,
            )
            .map_err(|_| "canonical_import_invalid".to_owned())?;
            if batch.schema != IMPORT_SCHEMA
                || batch.receipt_id != receipt_id
                || batch.manifest_hash != manifest_hash
            {
                return Err("canonical_import_receipt_mismatch".into());
            }
            let mut receipts = Vec::new();
            for promotion in batch.topics {
                let desired_manifest_hash = hash_json(&promotion.snapshot.manifest)?;
                let desired_artifact_hash = hash_json(&promotion.snapshot.artifact)?;
                let current = self.inspect_resolved_current(&promotion.snapshot.topic_id)?;
                if current.as_ref().is_some_and(|descriptor| {
                    descriptor["manifestHash"] == desired_manifest_hash
                        && descriptor["artifactHash"] == desired_artifact_hash
                }) {
                    let receipt_path = self
                        .topic_root(&promotion.snapshot.path_id)?
                        .join("receipt.json");
                    let receipt: CanonicalReceipt = serde_json::from_slice(
                        &fs::read(receipt_path)
                            .map_err(|_| "canonical_import_recovery_incomplete".to_owned())?,
                    )
                    .map_err(|_| "canonical_import_recovery_incomplete".to_owned())?;
                    if receipt.transaction_id != promotion.transaction_id
                        || receipt.topic_id != promotion.snapshot.topic_id
                        || receipt.manifest_hash != desired_manifest_hash
                        || receipt.artifact_hash != desired_artifact_hash
                    {
                        return Err("canonical_import_recovery_incomplete".into());
                    }
                    receipts.push(receipt);
                    continue;
                }
                receipts.push(self.promote_locked(promotion, None)?);
            }
            fs::remove_file(batch_path)
                .map_err(|error| format!("canonical_remove_failed:{error}"))?;
            sync_directory(&self.root)?;
            Ok(receipts)
        })();
        if result.is_err() && self.recover_all(None).is_err() {
            self.repair_required = true;
        }
        self.release_writer(lease);
        result
    }

    pub fn discard_import_batch(&mut self, receipt_id: &str) -> Result<bool, String> {
        if self.repair_required {
            return Err("repair_required".into());
        }
        validate_identity_part(receipt_id)?;
        let lease = self.acquire_writer()?;
        let result = (|| {
            let batch_path = self.root.join("import-batch.json");
            if !batch_path.exists() {
                return Ok(false);
            }
            let batch: ImportBatch = serde_json::from_slice(
                &fs::read(&batch_path).map_err(|_| "canonical_import_missing".to_owned())?,
            )
            .map_err(|_| "canonical_import_invalid".to_owned())?;
            if batch.schema != IMPORT_SCHEMA || batch.receipt_id != receipt_id {
                return Err("canonical_import_receipt_mismatch".into());
            }
            fs::remove_file(batch_path)
                .map_err(|error| format!("canonical_remove_failed:{error}"))?;
            sync_directory(&self.root)?;
            Ok(true)
        })();
        self.release_writer(lease);
        result
    }

    pub fn recover_import_batch(
        &mut self,
        receipt: Option<(&str, &str)>,
    ) -> Result<ImportBatchRecoveryOutcome, String> {
        let path = self.root.join("import-batch.json");
        if !path.exists() {
            return Ok(ImportBatchRecoveryOutcome::NoPendingBatch);
        }
        let batch: ImportBatch = match fs::read(&path)
            .map_err(|error| format!("canonical_read_failed:{error}"))
            .and_then(|bytes| {
                serde_json::from_slice::<ImportBatch>(&bytes)
                    .map_err(|_| "canonical_import_invalid".to_owned())
            }) {
            Ok(batch) if batch.schema == IMPORT_SCHEMA => batch,
            _ => {
                self.repair_required = true;
                return Err("canonical_import_batch_invalid".into());
            }
        };
        let Some((receipt_id, manifest_hash)) = receipt else {
            self.discard_import_batch(&batch.receipt_id)?;
            return Ok(ImportBatchRecoveryOutcome::DiscardedUncommittedBatch);
        };
        if receipt_id != batch.receipt_id || manifest_hash != batch.manifest_hash {
            self.repair_required = true;
            return Err("canonical_import_receipt_mismatch".into());
        }
        match self.commit_import_batch(receipt_id, manifest_hash) {
            Ok(_) => Ok(ImportBatchRecoveryOutcome::PromotedCommittedBatch),
            Err(_) => {
                self.repair_required = true;
                Err("canonical_import_recovery_failed".into())
            }
        }
    }

    fn recover_import_batch_on_open(&mut self) -> Result<(), String> {
        let path = self.root.join("import-batch.json");
        if !path.exists() {
            return Ok(());
        }
        let batch: ImportBatch = serde_json::from_slice(
            &fs::read(&path).map_err(|error| format!("canonical_read_failed:{error}"))?,
        )
        .map_err(|_| "canonical_import_invalid".to_owned())?;
        if batch.schema != IMPORT_SCHEMA {
            return Err("canonical_import_invalid".into());
        }
        let all_committed = batch.topics.iter().all(|topic| {
            let desired_manifest_hash = hash_json(&topic.snapshot.manifest).ok();
            let desired_artifact_hash = hash_json(&topic.snapshot.artifact).ok();
            self.topic_root(&topic.snapshot.path_id)
                .ok()
                .and_then(|root| fs::read(root.join("receipt.json")).ok())
                .and_then(|bytes| serde_json::from_slice::<CanonicalReceipt>(&bytes).ok())
                .is_some_and(|receipt| {
                    receipt.transaction_id == topic.transaction_id
                        && receipt.topic_id == topic.snapshot.topic_id
                        && Some(receipt.manifest_hash) == desired_manifest_hash
                        && Some(receipt.artifact_hash) == desired_artifact_hash
                })
        });
        if all_committed {
            fs::remove_file(path).map_err(|error| format!("canonical_remove_failed:{error}"))?;
            sync_directory(&self.root)
        } else {
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_test_support::TestRoot;

    fn root(label: &str) -> TestRoot {
        TestRoot::new(&format!("synthesis-r7-canonical-{label}"))
    }

    fn identity() -> CanonicalIdentity {
        CanonicalIdentity {
            profile_id: "profile:r7".into(),
            data_root_id: "data:r7".into(),
        }
    }

    fn snapshot(version: i64) -> TopicSnapshot {
        let sections = BTreeMap::from([("summary".into(), json!({"version":version}))]);
        let artifact = json!({"schema":"topic.artifact.v1","title":"R7","version":version});
        let metadata = json!({"updatedAt":format!("2026-01-0{version}")});
        TopicSnapshot {
            topic_id: "topic:r7".into(),
            path_id: "topic-r7".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "version":version,
                "sections":{"summary":{"path":"summary.json"}},
                "artifact_hash":hash_json(&artifact).expect("artifact hash"),
                "metadata_hash":hash_json(&metadata).expect("metadata hash"),
                "section_hashes":{
                    "summary":hash_json(&sections["summary"]).expect("section hash")
                }
            }),
            artifact,
            metadata,
            sections,
            markdown: BTreeMap::from([("synthesis.md".into(), format!("# R7\n\n{version}\n"))]),
        }
    }

    fn promotion(version: i64, basis: Option<CanonicalBasis>) -> Promotion {
        Promotion {
            transaction_id: format!("transaction:{version}"),
            expected_basis: basis,
            snapshot: snapshot(version),
        }
    }

    #[test]
    fn draft_preparation_derives_the_stable_canonical_representation() {
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "topic:r7".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "version":1,
                "sections":{"summary":{"path":"summary.json"}},
            }),
            artifact: json!({"schema":"topic.artifact.v1","title":"R7","version":1}),
            metadata: json!({"updatedAt":"2026-01-01"}),
            sections: BTreeMap::from([("summary".into(), json!({"version":1}))]),
            markdown: BTreeMap::from([("synthesis.md".into(), "# R7\n\n1\n".into())]),
        })
        .expect("prepare");
        let view = prepared.view();
        assert_eq!(view.topic_id, "topic:r7");
        assert_eq!(view.path_id, "topic-r7");
        assert_eq!(
            view.basis,
            CanonicalBasis {
                manifest_hash:
                    "sha256:0f5fc1ab01f60c9aac565ed46a6a9d776d89d07b5f85a0883c4754da0b2a059c".into(),
                artifact_hash:
                    "sha256:df1b02cbd6c0f8aa68c48cc82f7db6a1174bb5e14bae069a467ac401bc9f6e28".into(),
            }
        );
        assert_eq!(
            view.metadata_hash,
            "sha256:0de4f132d94ecf227adce4ff574b19f1629e145e1e8e5491d8e942417a5e630c"
        );

        let root = root("prepared-representation");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store
            .promote_prepared(prepared.for_promotion(None))
            .expect("promote prepared");
        let CanonicalTopicState::Ready(current) =
            store.read_topic("topic:r7").expect("read prepared")
        else {
            panic!("expected ready topic");
        };
        assert_eq!(current, view);
        assert_eq!(
            fs::read_to_string(store.root().join("topics/topic-r7/current/manifest.json"))
                .expect("manifest bytes"),
            concat!(
                "{\"artifact_hash\":\"sha256:df1b02cbd6c0f8aa68c48cc82f7db6a1174bb5e14bae069a467ac401bc9f6e28\",",
                "\"metadata_hash\":\"sha256:0de4f132d94ecf227adce4ff574b19f1629e145e1e8e5491d8e942417a5e630c\",",
                "\"schema\":\"topic.manifest.v1\",",
                "\"section_hashes\":{\"summary\":\"sha256:2430f1a2ad2982d0067885488a4c89e21ad1d7c83b115ba8f1b20acc88dfaea8\"},",
                "\"sections\":{\"summary\":{\"path\":\"summary.json\"}},\"version\":1}\n"
            )
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn topic_path_ids_match_the_shared_corpus() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json"
        ))
        .expect("shared corpus");
        for vector in corpus["canonical"]["topicPathIds"]
            .as_array()
            .expect("topic path vectors")
        {
            assert_eq!(
                canonical_topic_path_id(vector["topicId"].as_str().expect("topic id"))
                    .expect("path id"),
                vector["pathId"].as_str().expect("path id vector")
            );
        }
    }

    #[test]
    fn reads_a_historical_typescript_topic_path() {
        let parent = root("legacy-typescript-topic-path");
        let production_root = parent.join("data/synthesis");
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "中文主题".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "topic_id":"中文主题",
                "sections":{"summary":{"path":"summary.json"}}
            }),
            artifact: json!({"schema":"topic.artifact.v1","title":"中文主题"}),
            metadata: json!({"data":{"topic_id":"中文主题"}}),
            sections: BTreeMap::from([("summary".into(), json!({"text":"ready"}))]),
            markdown: BTreeMap::from([("synthesis.md".into(), "# 中文主题\n".into())]),
        })
        .expect("prepare");
        let canonical_path = production_root
            .join("topics")
            .join(&prepared.snapshot.path_id);
        let mut store = CanonicalStore::initialize_production(&production_root, identity())
            .expect("initialize");
        let receipt = store
            .promote_prepared(prepared.for_promotion(None))
            .expect("promote");
        store.close().expect("close");
        fs::remove_file(production_root.join("identity.json")).expect("remove identity");
        let legacy_path = production_root.join("topics").join("63974b299");
        fs::rename(&canonical_path, &legacy_path).expect("rename historical path");

        let mut store =
            CanonicalStore::open_production(&production_root, identity()).expect("open");
        let state = store.read_topic("中文主题").expect("read");
        let CanonicalTopicState::Ready(view) = state else {
            panic!("expected a historical topic to be readable");
        };
        assert_eq!(view.path_id, "63974b2998633977");
        assert_eq!(
            store
                .receipt("中文主题")
                .expect("receipt")
                .expect("legacy receipt")
                .transaction_id,
            receipt.transaction_id
        );
        let updated = prepare_topic(CanonicalTopicDraft {
            topic_id: "中文主题".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "topic_id":"中文主题",
                "sections":{"summary":{"path":"summary.json"}}
            }),
            artifact: json!({"schema":"topic.artifact.v1","title":"中文主题","version":2}),
            metadata: json!({"data":{"topic_id":"中文主题","version":2}}),
            sections: BTreeMap::from([("summary".into(), json!({"text":"updated"}))]),
            markdown: BTreeMap::from([("synthesis.md".into(), "# 中文主题\n\nupdated\n".into())]),
        })
        .expect("prepare update");
        store
            .promote_prepared(updated.for_promotion(Some(view.basis.clone())))
            .expect("promote update");
        assert!(
            production_root
                .join("topics/63974b2998633977/current/artifact.json")
                .is_file()
        );
        assert!(
            production_root
                .join("topics/63974b299/current/artifact.json")
                .is_file()
        );
        store.close().expect("close");
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn prefers_valid_legacy_topic_when_current_canonical_snapshot_is_invalid() {
        let parent = root("legacy-topic-invalid-current");
        let production_root = parent.join("data/synthesis");
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "中文主题".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "topic_id":"中文主题",
                "sections":{"summary":{"path":"summary.json"}}
            }),
            artifact: json!({"schema":"topic.artifact.v1","title":"legacy"}),
            metadata: json!({"data":{"topic_id":"中文主题"}}),
            sections: BTreeMap::from([("summary".into(), json!({"text":"ready"}))]),
            markdown: BTreeMap::new(),
        })
        .expect("prepare");
        let canonical_path_id = prepared.view().path_id.clone();
        let mut store = CanonicalStore::initialize_production(&production_root, identity())
            .expect("initialize");
        store
            .promote_prepared(prepared.for_promotion(None))
            .expect("promote");
        store.close().expect("close");
        fs::remove_file(production_root.join("identity.json")).expect("remove identity");
        let canonical_path = production_root.join("topics").join(&canonical_path_id);
        fs::rename(&canonical_path, production_root.join("topics/63974b299"))
            .expect("install legacy path");
        fs::create_dir_all(canonical_path.join("current")).expect("invalid current");
        fs::write(canonical_path.join("current/artifact.json"), b"not-json")
            .expect("write invalid current");

        let store = CanonicalStore::open_production(&production_root, identity()).expect("reopen");
        let CanonicalTopicState::Ready(view) = store.read_topic("中文主题").expect("read")
        else {
            panic!("expected valid legacy fallback");
        };
        assert_eq!(view.path_id, canonical_path_id);
        assert_eq!(view.artifact["title"], "legacy");
        drop(store);
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn canonical_assets_round_trip_through_the_representation_interface() {
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "topic:r7".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "sections":{"source_papers":{"path":"asset/source-papers"}},
            }),
            artifact: json!({"source_papers":[]}),
            metadata: json!({"data":{"topic_id":"topic:r7"}}),
            sections: BTreeMap::from([("source_papers".into(), json!({"papers":[]}))]),
            markdown: BTreeMap::from([("notes/summary.md".into(), "# Summary\n".into())]),
        })
        .expect("prepare");

        let assets = prepared.assets().expect("assets");
        assert_eq!(
            assets
                .iter()
                .map(|asset| asset.path.as_str())
                .collect::<Vec<_>>(),
            vec![
                "artifact.json",
                "manifest.json",
                "metadata.json",
                "notes/summary.md",
                "sections/source-papers.json",
            ]
        );
        let decoded = decode_topic_assets("topic-r7", assets).expect("decode");
        assert_eq!(decoded.view(), prepared.view());
    }

    #[test]
    fn canonical_assets_reject_inconsistent_and_invalid_representation() {
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "topic:r7".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "sections":{"summary":{"path":"summary.json"}},
            }),
            artifact: json!({"version":1}),
            metadata: json!({"data":{"topic_id":"topic:r7"}}),
            sections: BTreeMap::from([("summary".into(), json!({"version":1}))]),
            markdown: BTreeMap::new(),
        })
        .expect("prepare");
        let mut assets = prepared.assets().expect("assets");
        assets
            .iter_mut()
            .find(|asset| asset.path == "artifact.json")
            .expect("artifact")
            .text = "{\"version\":2}\n".into();
        assert_eq!(
            decode_topic_assets("topic-r7", assets)
                .expect_err("hash mismatch")
                .kind(),
            CanonicalErrorKind::InvalidRepresentation
        );

        let traversal = vec![CanonicalTopicAsset {
            path: "../manifest.json".into(),
            text: "{}\n".into(),
        }];
        assert_eq!(
            decode_topic_assets("topic-r7", traversal)
                .expect_err("traversal")
                .kind(),
            CanonicalErrorKind::InvalidRepresentation
        );

        let oversized_name = "a".repeat(129);
        assert_eq!(
            prepare_topic(CanonicalTopicDraft {
                topic_id: "topic:r7".into(),
                manifest: json!({"sections":{oversized_name.clone():{"path":"summary.json"}}}),
                artifact: json!({}),
                metadata: json!({}),
                sections: BTreeMap::from([(oversized_name, json!({}))]),
                markdown: BTreeMap::new(),
            })
            .expect_err("section bound")
            .kind(),
            CanonicalErrorKind::InvalidRepresentation
        );
    }

    #[test]
    fn canonical_error_codes_map_to_stable_typed_categories() {
        for (code, expected) in [
            (
                "canonical_snapshot_invalid",
                CanonicalErrorKind::InvalidRepresentation,
            ),
            ("basis_mismatch", CanonicalErrorKind::BasisConflict),
            ("canonical_store_busy", CanonicalErrorKind::StoreBusy),
            ("repair_required", CanonicalErrorKind::RepairRequired),
            (
                "canonical_read_failed:fixture",
                CanonicalErrorKind::DurableIo,
            ),
        ] {
            assert_eq!(CanonicalError::from_code(code.into()).kind(), expected);
        }
    }

    #[test]
    fn opens_only_the_derived_shadow_root() {
        let root = root("root");
        let store = CanonicalStore::open(&root, identity()).expect("open");
        assert_eq!(
            store.root().strip_prefix(&root).expect("isolated"),
            Path::new("shadow-canonical/data_r7")
        );
        assert_eq!(
            store.inspect("topic:absent").expect("inspect")["status"],
            "absent"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn production_open_uses_only_the_explicit_existing_root() {
        let parent = root("production");
        let production_root = parent.join("data").join("synthesis");
        fs::create_dir_all(&production_root).expect("production root");
        let store =
            CanonicalStore::open_production(&production_root, identity()).expect("open production");
        assert_eq!(store.root(), production_root);
        assert!(!parent.join("shadow-canonical").exists());
        store.close().expect("close");
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn production_initialize_creates_the_explicit_root_once() {
        let parent = root("production-initialize");
        let production_root = parent.join("data").join("synthesis");
        let store = CanonicalStore::initialize_production(&production_root, identity())
            .expect("initialize production");
        assert_eq!(store.root(), production_root);
        assert!(production_root.join("identity.json").is_file());
        store.close().expect("close");
        assert_eq!(
            CanonicalStore::initialize_production(&production_root, identity(),).unwrap_err(),
            "canonical_production_root_exists"
        );
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn legacy_preflight_preserves_bytes_and_rejects_source_conflicts() {
        let parent = root("legacy-preflight");
        let production_root = parent.join("data/synthesis");
        let mut store = CanonicalStore::initialize_production(&production_root, identity())
            .expect("initialize production");
        let mut legacy_snapshot = snapshot(1);
        legacy_snapshot
            .manifest
            .as_object_mut()
            .expect("manifest")
            .insert("topic_id".into(), json!(legacy_snapshot.topic_id));
        store
            .promote(Promotion {
                transaction_id: "transaction:legacy".into(),
                expected_basis: None,
                snapshot: legacy_snapshot,
            })
            .expect("promote legacy topic");
        store.close().expect("close");
        fs::remove_file(production_root.join("identity.json")).expect("remove identity");

        let current = production_root.join("topics/topic-r7/current");
        let mut metadata_data = json!({
            "topic_id":"topic:r7",
            "title":"R7",
            "updated_at":"2026-01-01",
        });
        let metadata_hash = hash_json(&metadata_data).expect("metadata hash");
        metadata_data
            .as_object_mut()
            .expect("metadata data")
            .insert("metadata_hash".into(), json!(metadata_hash));
        let metadata = json!({
            "schema_id":"synthesis.topic_artifact_metadata",
            "schema_version":"1.0.0",
            "created_at":"2026-01-01",
            "updated_at":"2026-01-01",
            "data":metadata_data,
        });
        fs::write(
            current.join("metadata.json"),
            format!(
                "{}\n",
                serde_json::to_string_pretty(&metadata).expect("pretty metadata")
            ),
        )
        .expect("write metadata");
        let manifest_path = current.join("manifest.json");
        let mut manifest: Value =
            serde_json::from_slice(&fs::read(&manifest_path).expect("manifest bytes"))
                .expect("manifest");
        manifest
            .as_object_mut()
            .expect("manifest object")
            .insert("metadata_hash".into(), json!(metadata_hash));
        fs::write(
            &manifest_path,
            json_bytes(&manifest).expect("manifest bytes"),
        )
        .expect("write manifest");

        let sidecar = production_root.join("sidecar");
        fs::create_dir_all(&sidecar).expect("sidecar");
        let write_legacy = |name: &str, field: &str, values: Vec<(&str, Value)>| {
            let mut keyed = serde_json::Map::new();
            for (topic_id, value) in values {
                keyed.insert(topic_id.into(), value);
            }
            let mut data = serde_json::Map::new();
            data.insert(field.into(), Value::Object(keyed));
            fs::write(
                sidecar.join(name),
                format!(
                    "{}\n",
                    serde_json::to_string_pretty(&json!({"data":data})).expect("legacy json")
                ),
            )
            .expect("write legacy source");
        };
        write_legacy(
            "topic-definitions.json",
            "topics",
            vec![
                (
                    "topic:r7",
                    json!({"id":"topic:r7","title":"R7","definition":"definition"}),
                ),
                (
                    "topic:planned",
                    json!({"id":"topic:planned","title":"Planned"}),
                ),
            ],
        );
        write_legacy(
            "resolvers.json",
            "resolvers",
            vec![
                ("topic:r7", json!({"tag":"topic:r7"})),
                ("topic:deleted", json!({"tag":"topic:deleted"})),
            ],
        );
        write_legacy(
            "resolved-paper-sets.json",
            "paper_sets",
            vec![("topic:r7", json!({"papers":[]}))],
        );
        let canonical_topic_ids = BTreeSet::from(["topic:r7".to_owned()]);
        let graph_only_topic_ids =
            BTreeSet::from(["topic:deleted".to_owned(), "topic:planned".to_owned()]);
        let metadata_before = fs::read(current.join("metadata.json")).expect("metadata before");
        let definitions_before =
            fs::read(sidecar.join("topic-definitions.json")).expect("definitions before");
        let topics = CanonicalStore::preflight_legacy_production(
            &production_root,
            &canonical_topic_ids,
            &graph_only_topic_ids,
        )
        .expect("legacy preflight");
        assert_eq!(topics.len(), 1);
        assert_eq!(topics[0].topic_resolver, json!({"tag":"topic:r7"}));
        assert_eq!(
            fs::read(current.join("metadata.json")).expect("metadata after"),
            metadata_before
        );
        assert_eq!(
            fs::read(sidecar.join("topic-definitions.json")).expect("definitions after"),
            definitions_before
        );

        let conflict = fs::read_to_string(sidecar.join("resolved-paper-sets.json"))
            .expect("paper sets")
            .replace("topic:r7", "topic:other");
        fs::write(sidecar.join("resolved-paper-sets.json"), conflict).expect("write conflict");
        assert_eq!(
            CanonicalStore::preflight_legacy_production(
                &production_root,
                &canonical_topic_ids,
                &graph_only_topic_ids,
            )
            .unwrap_err(),
            "canonical_legacy_topic_sources_mismatch"
        );
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn production_open_rejects_missing_or_derived_roots() {
        let parent = root("production-reject");
        assert_eq!(
            CanonicalStore::open_production(&parent.join("data/synthesis"), identity())
                .unwrap_err(),
            "canonical_production_root_missing"
        );
        assert_eq!(
            CanonicalStore::open_production(Path::new("data/synthesis"), identity()).unwrap_err(),
            "canonical_production_path_invalid"
        );
        fs::remove_dir_all(parent).expect("cleanup");
    }

    #[test]
    fn canonical_json_and_absent_dto_match_the_shared_corpus() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json"
        ))
        .expect("shared corpus");
        let fixture = &corpus["canonical"]["canonicalJson"];
        let bytes = json_bytes(&fixture["value"]).expect("canonical bytes");
        assert_eq!(
            String::from_utf8(bytes).expect("utf8"),
            fixture["text"].as_str().expect("text")
        );
        assert_eq!(
            canonical_json_hash(&fixture["value"]).expect("hash"),
            fixture["sha256"].as_str().expect("sha256")
        );
        let root = root("shared-corpus");
        let store = CanonicalStore::open(&root, identity()).expect("open");
        assert_eq!(
            store.inspect("r7-canary").expect("inspect"),
            corpus["canonical"]["absentInspect"]
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn create_update_cas_and_descriptor_bytes_are_stable() {
        let root = root("cas");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let first = store.promote(promotion(1, None)).expect("create");
        let inspected = store.inspect("topic:r7").expect("inspect");
        assert_eq!(inspected["status"], "ready");
        assert_eq!(inspected["manifestHash"], first.manifest_hash);
        let CurrentTopic::Ready { snapshot, basis } =
            store.read_current("topic:r7").expect("typed current")
        else {
            panic!("ready current");
        };
        assert_eq!(snapshot.topic_id, "topic:r7");
        assert_eq!(basis.manifest_hash, first.manifest_hash);
        assert_eq!(
            store
                .receipt("topic:r7")
                .expect("typed receipt")
                .expect("receipt")
                .transaction_id,
            first.transaction_id
        );
        assert_eq!(
            store
                .promote(promotion(
                    2,
                    Some(CanonicalBasis {
                        manifest_hash: "stale".into(),
                        artifact_hash: "stale".into(),
                    })
                ))
                .unwrap_err(),
            "basis_mismatch"
        );
        store
            .promote(promotion(
                2,
                Some(CanonicalBasis {
                    manifest_hash: first.manifest_hash,
                    artifact_hash: first.artifact_hash,
                }),
            ))
            .expect("update");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn archives_restores_and_purges_current_only_by_deleted_path_id() {
        let root = root("deleted-lifecycle");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store.promote(promotion(1, None)).expect("promote");

        assert!(
            store
                .archive_current("topic:r7", "topic-r7-20260726000000")
                .expect("archive")
        );
        assert!(matches!(
            store.read_current("topic:r7").expect("absent"),
            CurrentTopic::Absent { .. }
        ));
        assert_eq!(
            store.restore_deleted("topic:r7", "wrong-deleted-id"),
            Err("canonical_deleted_snapshot_missing".into())
        );
        assert!(
            store
                .restore_deleted("topic:r7", "topic-r7-20260726000000")
                .expect("restore")
        );
        assert!(matches!(
            store.read_current("topic:r7").expect("ready"),
            CurrentTopic::Ready { .. }
        ));

        store
            .archive_current("topic:r7", "topic-r7-20260726000000")
            .expect("archive again");
        assert!(
            store
                .purge_deleted("topic-r7-20260726000000")
                .expect("purge")
        );
        assert!(
            !store
                .purge_deleted("topic-r7-20260726000000")
                .expect("idempotent")
        );
        drop(store);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn archives_a_historical_typescript_topic_path() {
        let root = root("legacy-typescript-topic-archive");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let prepared = prepare_topic(CanonicalTopicDraft {
            topic_id: "中文主题".into(),
            manifest: json!({
                "schema":"topic.manifest.v1",
                "topic_id":"中文主题",
                "sections":{"summary":{"path":"summary.json"}}
            }),
            artifact: json!({"schema":"topic.artifact.v1"}),
            metadata: json!({"data":{"topic_id":"中文主题"}}),
            sections: BTreeMap::from([("summary".into(), json!({"text":"ready"}))]),
            markdown: BTreeMap::new(),
        })
        .expect("prepare");
        let current_path_id = prepared.view().path_id;
        let root_path = store.root().to_owned();
        store
            .promote_prepared(prepared.for_promotion(None))
            .expect("promote");
        store.close().expect("close");
        fs::rename(
            root_path.join("topics").join(&current_path_id),
            root_path.join("topics/63974b299"),
        )
        .expect("install historical path");

        let mut store = CanonicalStore::open(&root, identity()).expect("reopen");
        assert!(
            store
                .archive_current("中文主题", "legacy-topic-deleted")
                .expect("archive historical")
        );
        assert!(
            root_path
                .join("deleted/legacy-topic-deleted/current/artifact.json")
                .is_file()
        );
        store.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn every_pre_receipt_fault_recovers_the_last_good_snapshot_on_restart() {
        for fault in [
            FaultPoint::LockAcquired,
            FaultPoint::StagingWritten,
            FaultPoint::JournalWritten,
            FaultPoint::CurrentBackedUp,
            FaultPoint::CurrentPromoted,
            FaultPoint::ReceiptWritten,
        ] {
            let root = root(&format!("{fault:?}"));
            let mut store = CanonicalStore::open(&root, identity()).expect("open");
            let first = store.promote(promotion(1, None)).expect("create");
            let result = store.promote_with_fault(
                promotion(
                    2,
                    Some(CanonicalBasis {
                        manifest_hash: first.manifest_hash,
                        artifact_hash: first.artifact_hash,
                    }),
                ),
                Some(fault),
                false,
            );
            assert!(result.is_err());
            drop(store);
            let store = CanonicalStore::open(&root, identity()).expect("restart recovery");
            let inspected = store.inspect("topic:r7").expect("inspect");
            assert_eq!(inspected["status"], "ready", "{fault:?}");
            let (_, expected) =
                read_json(&store.root.join("topics/topic-r7/current/manifest.json"))
                    .expect("manifest");
            assert_eq!(
                expected,
                json_bytes(&snapshot(1).manifest).expect("expected"),
                "{fault:?}"
            );
            fs::remove_dir_all(root).expect("cleanup");
        }
    }

    #[cfg(windows)]
    #[test]
    fn windows_directory_sync_does_not_block_promotion_or_restart_recovery() {
        let root = root("windows-directory-sync");
        sync_directory(&root).expect("directory sync boundary");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let first = store.promote(promotion(1, None)).expect("create");
        store
            .promote_with_fault(
                promotion(
                    2,
                    Some(CanonicalBasis {
                        manifest_hash: first.manifest_hash,
                        artifact_hash: first.artifact_hash,
                    }),
                ),
                Some(FaultPoint::CurrentBackedUp),
                false,
            )
            .expect_err("interruption");
        drop(store);
        let store = CanonicalStore::open(&root, identity()).expect("restart recovery");
        assert_eq!(
            store.inspect("topic:r7").expect("inspect")["status"],
            "ready"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn import_batch_blocks_ordinary_promotion_and_commits_with_one_receipt() {
        let root = root("import");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store
            .stage_import_batch(
                "receipt:r7".into(),
                "a".repeat(64),
                vec![promotion(1, None)],
            )
            .expect("stage");
        assert_eq!(
            store.promote(promotion(1, None)).unwrap_err(),
            "canonical_store_busy"
        );
        let receipts = store
            .commit_import_batch("receipt:r7", &"a".repeat(64))
            .expect("commit");
        assert_eq!(receipts.len(), 1);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn import_batch_can_be_explicitly_discarded_and_reopened() {
        let root = root("import-discard");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store
            .stage_import_batch(
                "receipt:discard".into(),
                "b".repeat(64),
                vec![promotion(1, None)],
            )
            .expect("stage");
        assert!(
            store
                .discard_import_batch("receipt:discard")
                .expect("discard")
        );
        assert!(
            !store
                .discard_import_batch("receipt:discard")
                .expect("already discarded")
        );
        drop(store);
        let reopened = CanonicalStore::open(&root, identity()).expect("reopen");
        assert!(!root.join("import-batch.json").exists());
        drop(reopened);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn import_batch_recovery_uses_the_repository_receipt_after_reopen() {
        let root = root("import-recovery");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store
            .stage_import_batch(
                "receipt:forward".into(),
                "c".repeat(64),
                vec![promotion(1, None)],
            )
            .expect("stage forward");
        drop(store);

        let mut reopened = CanonicalStore::open(&root, identity()).expect("reopen");
        assert_eq!(
            reopened
                .recover_import_batch(Some(("receipt:forward", &"c".repeat(64))))
                .expect("recover"),
            ImportBatchRecoveryOutcome::PromotedCommittedBatch
        );
        assert_eq!(
            reopened.inspect("topic:r7").expect("inspect")["status"],
            "ready"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn import_batch_recovery_discards_without_a_repository_receipt() {
        let root = root("import-recovery-discard");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store
            .stage_import_batch(
                "receipt:discard-recovery".into(),
                "d".repeat(64),
                vec![promotion(1, None)],
            )
            .expect("stage discard");
        drop(store);

        let mut reopened = CanonicalStore::open(&root, identity()).expect("reopen");
        assert_eq!(
            reopened
                .recover_import_batch(None)
                .expect("recover discard"),
            ImportBatchRecoveryOutcome::DiscardedUncommittedBatch
        );
        assert_eq!(
            reopened.inspect("topic:r7").expect("inspect")["status"],
            "absent"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn import_batch_recovery_skips_an_already_committed_prefix() {
        let root = root("import-recovery-prefix");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let first = promotion(1, None);
        let mut second = promotion(2, None);
        second.transaction_id = "transaction:second".into();
        second.snapshot.topic_id = "topic:second".into();
        second.snapshot.path_id = "topic-second".into();
        store
            .stage_import_batch(
                "receipt:prefix".into(),
                "e".repeat(64),
                vec![first.clone(), second],
            )
            .expect("stage");
        let lease = store.acquire_writer().expect("writer");
        store
            .promote_locked(first, None)
            .expect("commit first topic");
        store.release_writer(lease);
        drop(store);

        let mut reopened = CanonicalStore::open(&root, identity()).expect("reopen");
        assert_eq!(
            reopened
                .recover_import_batch(Some(("receipt:prefix", &"e".repeat(64))))
                .expect("recover"),
            ImportBatchRecoveryOutcome::PromotedCommittedBatch
        );
        assert_eq!(
            reopened.inspect("topic:r7").expect("first")["status"],
            "ready"
        );
        assert_eq!(
            reopened.inspect("topic:second").expect("second")["status"],
            "ready"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn independent_owners_share_the_filesystem_writer_admission() {
        let root = root("writer-admission");
        let first = CanonicalStore::open(&root, identity()).expect("first");
        let mut second = CanonicalStore::open(&root, identity()).expect("second");
        let lease = first.acquire_writer().expect("writer lease");
        assert_eq!(
            second.promote(promotion(1, None)).unwrap_err(),
            "canonical_store_busy"
        );
        first.release_writer(lease);
        second.promote(promotion(1, None)).expect("promote");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn promotion_rejects_traversal_incomplete_snapshots_and_hash_drift() {
        let root = root("validation");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let mut traversal = promotion(1, None);
        traversal
            .snapshot
            .markdown
            .insert("../outside.md".into(), "unsafe".into());
        assert_eq!(
            store.promote(traversal).unwrap_err(),
            "canonical_path_invalid"
        );

        let mut incomplete = promotion(1, None);
        incomplete.snapshot.sections.clear();
        assert_eq!(
            store.promote(incomplete).unwrap_err(),
            "canonical_snapshot_incomplete"
        );

        let mut drifted = promotion(1, None);
        drifted.snapshot.artifact["version"] = json!(999);
        assert_eq!(
            store.promote(drifted).unwrap_err(),
            "canonical_hash_mismatch"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn matching_receipt_forwards_a_promoted_interruption() {
        let root = root("forward");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let first = store.promote(promotion(1, None)).expect("create");
        store
            .promote_with_fault(
                promotion(
                    2,
                    Some(CanonicalBasis {
                        manifest_hash: first.manifest_hash,
                        artifact_hash: first.artifact_hash,
                    }),
                ),
                Some(FaultPoint::CurrentPromoted),
                false,
            )
            .expect_err("interruption");
        let topic_root = store.root.join("topics/topic-r7");
        let journal: Journal = serde_json::from_slice(
            &fs::read(topic_root.join("transaction.json")).expect("journal"),
        )
        .expect("journal DTO");
        durable_json(
            &topic_root.join("receipt.json"),
            &CanonicalReceipt {
                schema: RECEIPT_SCHEMA.into(),
                transaction_id: journal.transaction_id,
                topic_id: journal.topic_id,
                path_id: journal.path_id,
                manifest_hash: journal.manifest_hash,
                artifact_hash: journal.artifact_hash,
            },
        )
        .expect("receipt");
        drop(store);
        let store = CanonicalStore::open(&root, identity()).expect("forward recovery");
        let (_, bytes) =
            read_json(&store.root.join("topics/topic-r7/current/manifest.json")).expect("current");
        assert_eq!(
            bytes,
            json_bytes(&snapshot(2).manifest).expect("expected promoted bytes")
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn rollback_restore_failure_enters_repair_required() {
        let root = root("rollback-repair");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        let first = store.promote(promotion(1, None)).expect("create");
        store
            .promote_with_fault(
                promotion(
                    2,
                    Some(CanonicalBasis {
                        manifest_hash: first.manifest_hash,
                        artifact_hash: first.artifact_hash,
                    }),
                ),
                Some(FaultPoint::CurrentBackedUp),
                false,
            )
            .expect_err("interruption");
        assert_eq!(
            store
                .recover_all(Some(FaultPoint::RollbackRestore))
                .unwrap_err(),
            "repair_required"
        );
        store.repair_required = true;
        assert_eq!(
            store.promote(promotion(2, None)).unwrap_err(),
            "repair_required"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[cfg(unix)]
    #[test]
    fn inspect_rejects_symlinks_and_unknown_current_files() {
        use std::os::unix::fs::symlink;
        let root = root("unsafe");
        let mut store = CanonicalStore::open(&root, identity()).expect("open");
        store.promote(promotion(1, None)).expect("create");
        let current = store.root.join("topics/topic-r7/current");
        fs::write(current.join("unknown.txt"), b"unsafe").expect("unknown");
        assert_eq!(
            store.inspect("topic:r7").expect("inspect")["status"],
            "invalid"
        );
        fs::remove_file(current.join("unknown.txt")).expect("remove");
        symlink(
            current.join("manifest.json"),
            current.join("sections/link.json"),
        )
        .expect("symlink");
        assert_eq!(
            store.inspect("topic:r7").expect("inspect")["status"],
            "invalid"
        );
        fs::remove_dir_all(root).expect("cleanup");
    }
}
