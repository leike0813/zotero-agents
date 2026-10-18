use crate::PromotionCheckpoint;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
use synthesis_repository::{
    LibrarySnapshotGenerationRecord, LibrarySnapshotIndexItemRecord, LibrarySnapshotPromotion,
};

static GENERATION_SEQUENCE: AtomicU64 = AtomicU64::new(0);

pub trait LibrarySnapshotIndexRepositoryPort: Send + Sync {
    fn begin(&self, record: &LibrarySnapshotGenerationRecord) -> Result<(), String>;
    fn stage(
        &self,
        generation_id: &str,
        snapshot_id: &str,
        library_id: i64,
        records: &[LibrarySnapshotIndexItemRecord],
    ) -> Result<(), String>;
    fn promote(&self, promotion: &LibrarySnapshotPromotion) -> Result<(), String>;
}

#[derive(Clone)]
pub struct LibrarySnapshotIndexApplication {
    repository: Arc<dyn LibrarySnapshotIndexRepositoryPort>,
    refresh_lock: Arc<Mutex<()>>,
}

pub struct PreparedLibrarySnapshot<'a> {
    repository: &'a dyn LibrarySnapshotIndexRepositoryPort,
    promotion: LibrarySnapshotPromotion,
    _guard: MutexGuard<'a, ()>,
}

impl PreparedLibrarySnapshot<'_> {
    pub fn promote(self, checkpoint: &PromotionCheckpoint<'_>) -> Result<(), String> {
        checkpoint()?;
        self.repository.promote(&self.promotion)
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SnapshotRef {
    library_id: i64,
    key: String,
}

fn nullable<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(
    d: D,
) -> Result<Option<T>, D::Error> {
    Option::<T>::deserialize(d)
}

#[derive(Deserialize, Serialize)]
#[serde(
    tag = "representation",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum SnapshotCreator {
    TwoField {
        creator_type: String,
        first_name: String,
        last_name: String,
    },
    SingleField {
        creator_type: String,
        name: String,
    },
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct SnapshotIdentifiers {
    #[serde(deserialize_with = "nullable")]
    doi: Option<String>,
    #[serde(deserialize_with = "nullable")]
    isbn: Option<String>,
    #[serde(deserialize_with = "nullable")]
    issn: Option<String>,
    #[serde(deserialize_with = "nullable")]
    arxiv: Option<String>,
    #[serde(deserialize_with = "nullable")]
    pmid: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SnapshotItem {
    r#ref: SnapshotRef,
    kind: String,
    #[serde(deserialize_with = "nullable")]
    parent_ref: Option<SnapshotRef>,
    item_type: String,
    title: String,
    creators: Vec<SnapshotCreator>,
    #[serde(deserialize_with = "nullable")]
    year: Option<String>,
    date: String,
    publication_title: String,
    tags: Vec<String>,
    collection_refs: Vec<SnapshotRef>,
    revision: String,
    state: String,
    identifiers: SnapshotIdentifiers,
    #[serde(deserialize_with = "nullable")]
    url: Option<String>,
    note_count: i64,
    attachment_count: i64,
    annotation_count: i64,
    modified_at: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SnapshotCompletion {
    snapshot_id: String,
    schema: String,
    library_id: i64,
    scope: String,
    total_items: i64,
    total_batches: i64,
    order: String,
    content_digest: String,
    completed_at: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SnapshotPage {
    schema: String,
    snapshot_id: String,
    library_id: i64,
    scope: String,
    order: String,
    batch_size: i64,
    batch_index: i64,
    items: Vec<SnapshotItem>,
    returned: i64,
    delivered_items: i64,
    delivered_batches: i64,
    outcome: String,
    #[serde(deserialize_with = "nullable")]
    next_cursor: Option<String>,
    has_more: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    completion_evidence: Option<SnapshotCompletion>,
}

// Serde owns the closed DTO shape; bounds and literals come from the wire contract.
fn snapshot_bounds(rule: &Value, value: &Value) -> bool {
    static HOST: OnceLock<Value> = OnceLock::new();
    static COMMON: OnceLock<Value> = OnceLock::new();
    let host = HOST.get_or_init(|| serde_json::from_str(include_str!(
        "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json"
    )).expect("embedded reverse Host schema"));
    let rule = if let Some(reference) = rule["$ref"].as_str() {
        let (document, pointer) = if let Some(pointer) =
            reference.strip_prefix("common.schema.json#")
        {
            (COMMON.get_or_init(|| serde_json::from_str(include_str!(
                "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json"
            )).expect("embedded common schema")), pointer)
        } else {
            (
                host,
                reference
                    .strip_prefix('#')
                    .expect("local snapshot reference"),
            )
        };
        document.pointer(pointer).expect("snapshot field schema")
    } else {
        rule
    };
    if let Some(kind) = rule["type"].as_str() {
        let matches = match kind {
            "null" => value.is_null(),
            "object" => value.is_object(),
            "array" => value.is_array(),
            "string" => value.is_string(),
            "integer" => value.as_i64().is_some(),
            "boolean" => value.is_boolean(),
            _ => false,
        };
        if !matches {
            return false;
        }
    }
    if let Some(branches) = rule["anyOf"].as_array() {
        return branches.iter().any(|branch| snapshot_bounds(branch, value));
    }
    if let Some(branches) = rule["oneOf"].as_array() {
        return branches
            .iter()
            .filter(|branch| snapshot_bounds(branch, value))
            .count()
            == 1;
    }
    if rule.get("const").is_some_and(|literal| literal != value)
        || rule["enum"]
            .as_array()
            .is_some_and(|choices| !choices.contains(value))
    {
        return false;
    }
    match value {
        Value::String(text) => {
            let length = text.chars().count() as u64;
            length >= rule["minLength"].as_u64().unwrap_or(0)
                && length <= rule["maxLength"].as_u64().unwrap_or(u64::MAX)
                && match rule["pattern"].as_str() {
                    None => true,
                    Some("^[A-Za-z0-9]+$") => text.bytes().all(|b| b.is_ascii_alphanumeric()),
                    Some("^sha256:[0-9a-f]{64}$") => {
                        text.strip_prefix("sha256:").is_some_and(|hash| {
                            hash.len() == 64
                                && hash
                                    .bytes()
                                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                        })
                    }
                    Some(_) => false,
                }
        }
        Value::Number(number) => number.as_i64().is_some_and(|n| {
            n >= rule["minimum"].as_i64().unwrap_or(i64::MIN)
                && n <= rule["maximum"].as_i64().unwrap_or(i64::MAX)
        }),
        Value::Array(items) => {
            items.len() as u64 <= rule["maxItems"].as_u64().unwrap_or(u64::MAX)
                && items
                    .iter()
                    .all(|item| snapshot_bounds(&rule["items"], item))
        }
        Value::Object(object) => object
            .iter()
            .all(|(name, field)| snapshot_bounds(&rule["properties"][name], field)),
        _ => true,
    }
}

fn decode_snapshot_page(value: Value) -> Result<SnapshotPage, String> {
    let page: SnapshotPage =
        serde_json::from_value(value.clone()).map_err(|_| "reverse_host_result_invalid")?;
    let terminal_valid = match page.outcome.as_str() {
        "completed" => {
            !page.has_more && page.next_cursor.is_none() && page.completion_evidence.is_some()
        }
        "active" => {
            page.has_more
                && page
                    .next_cursor
                    .as_ref()
                    .is_some_and(|cursor| !cursor.is_empty())
                && page.completion_evidence.is_none()
        }
        _ => false,
    };
    if !terminal_valid
        || !snapshot_bounds(&json!({"$ref":"#/$defs/LibrarySnapshotResult"}), &value)
        || value.get("completionEvidence").is_some_and(Value::is_null)
    {
        return Err("reverse_host_result_invalid".into());
    }
    Ok(page)
}

impl LibrarySnapshotIndexApplication {
    pub fn new(repository: Arc<dyn LibrarySnapshotIndexRepositoryPort>) -> Self {
        Self {
            repository,
            refresh_lock: Arc::new(Mutex::new(())),
        }
    }

    pub fn prepare(
        &self,
        library_id: i64,
        mut fetch: impl FnMut(Value) -> Result<Value, String>,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<PreparedLibrarySnapshot<'_>, String> {
        let guard = self
            .refresh_lock
            .lock()
            .map_err(|_| "repository_unavailable")?;
        let started_at = synthesis_protocol::utc_now_iso8601();
        let mut request = json!({"batchSize":100});
        let mut snapshot_id = None;
        let mut generation_id = String::new();
        let mut identities = Vec::new();
        let mut keys = HashSet::new();
        let mut cursors = HashSet::new();
        for batch in 0..=10_000 {
            checkpoint()?;
            let page = decode_snapshot_page(fetch(request)?)?;
            if page.library_id != library_id
                || page.batch_size != 100
                || page.batch_index != batch
                || page.returned != page.items.len() as i64
                || page.returned > page.batch_size
                || page.delivered_batches != batch + 1
                || snapshot_id
                    .as_ref()
                    .is_some_and(|id| id != &page.snapshot_id)
            {
                return Err("reverse_host_result_invalid".into());
            }
            if snapshot_id.is_none() {
                generation_id = format!(
                    "snapshot:{started_at}:{}",
                    GENERATION_SEQUENCE.fetch_add(1, Ordering::Relaxed)
                );
                snapshot_id = Some(page.snapshot_id.clone());
            }
            for item in &page.items {
                if item.r#ref.library_id != library_id || !keys.insert(item.r#ref.key.clone()) {
                    return Err("reverse_host_result_invalid".into());
                }
                identities.push(json!({"ref":item.r#ref,"revision":item.revision}));
            }
            if identities.len() > 1_000_000 || page.delivered_items != identities.len() as i64 {
                return Err("reverse_host_result_invalid".into());
            }
            let completed = page.outcome == "completed";
            if completed {
                let evidence = page
                    .completion_evidence
                    .as_ref()
                    .ok_or("reverse_host_result_invalid")?;
                let digest = synthesis_protocol::canonical_sha256(&json!({
                    "schema":page.schema,"snapshotId":page.snapshot_id,"libraryId":library_id,
                    "scope":page.scope,"order":page.order,"items":identities,
                }))
                .map_err(|_| "reverse_host_result_invalid")?;
                if evidence.content_digest != digest
                    || page.has_more
                    || page.next_cursor.is_some()
                    || evidence.snapshot_id != page.snapshot_id
                    || evidence.library_id != page.library_id
                    || evidence.total_items != page.delivered_items
                    || evidence.total_batches != page.delivered_batches
                {
                    return Err("reverse_host_result_invalid".into());
                }
            } else if !page.has_more
                || page.returned != page.batch_size
                || page.completion_evidence.is_some()
                || !page
                    .next_cursor
                    .as_ref()
                    .is_some_and(|cursor| !cursor.is_empty() && cursors.insert(cursor.clone()))
            {
                return Err("reverse_host_result_invalid".into());
            }
            request =
                json!({"batchSize":100,"snapshotId":page.snapshot_id,"cursor":page.next_cursor});
            checkpoint()?;
            self.stage_page(&generation_id, &page, &started_at)?;
            if completed {
                let evidence = page
                    .completion_evidence
                    .ok_or("reverse_host_result_invalid")?;
                return Ok(PreparedLibrarySnapshot {
                    repository: self.repository.as_ref(),
                    promotion: LibrarySnapshotPromotion {
                        generation_id,
                        snapshot_id: page.snapshot_id,
                        library_id,
                        content_digest: evidence.content_digest,
                        total_items: evidence.total_items,
                        total_batches: evidence.total_batches,
                        completed_at: evidence.completed_at,
                    },
                    _guard: guard,
                });
            }
        }
        Err("reverse_host_page_limit_exceeded".into())
    }

    fn stage_page(
        &self,
        generation_id: &str,
        page: &SnapshotPage,
        started_at: &str,
    ) -> Result<(), String> {
        if page.batch_index == 0 {
            self.repository.begin(&LibrarySnapshotGenerationRecord {
                generation_id: generation_id.into(),
                snapshot_id: page.snapshot_id.clone(),
                library_id: page.library_id,
                status: "staging".into(),
                created_at: started_at.into(),
                content_digest: String::new(),
                total_items: 0,
                total_batches: 0,
                promoted_at: String::new(),
            })?;
        }
        let records = page
            .items
            .iter()
            .map(|item| {
                Ok(LibrarySnapshotIndexItemRecord {
                    library_id: item.r#ref.library_id,
                    item_key: item.r#ref.key.clone(),
                    revision: item.revision.clone(),
                    payload: serde_json::to_value(item).map_err(|_| "serialization_failed")?,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        self.repository
            .stage(generation_id, &page.snapshot_id, page.library_id, &records)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RepositoryPort;
    use serde_json::json;
    use std::sync::Mutex;
    use synthesis_repository::{Repository, RepositoryIdentity};
    use synthesis_test_support::TestRoot;

    const SNAPSHOT_SCHEMA: &str = "zotero-agents.library-full-index.v1";
    const SNAPSHOT_SCOPE: &str = "top-level-regular";
    const SNAPSHOT_ORDER: &str = "stable_identity";

    fn application(
        label: &str,
    ) -> (
        TestRoot,
        LibrarySnapshotIndexApplication,
        Arc<Mutex<Repository>>,
    ) {
        let root = TestRoot::new(label);
        let owner = Arc::new(Mutex::new(
            Repository::open(
                root.path(),
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: label.into(),
                },
            )
            .expect("repository"),
        ));
        let port = Arc::new(RepositoryPort::new(Arc::clone(&owner)));
        (root, LibrarySnapshotIndexApplication::new(port), owner)
    }

    fn page(snapshot_id: &str, outcome: &str, items: Vec<Value>) -> Value {
        let completed = outcome == "completed";
        let mut page = json!({
            "schema": SNAPSHOT_SCHEMA,
            "snapshotId": snapshot_id,
            "libraryId": 1,
            "scope": SNAPSHOT_SCOPE,
            "order": SNAPSHOT_ORDER,
            "batchSize": 500,
            "batchIndex": 0,
            "returned": items.len(),
            "items": items,
            "deliveredItems": if completed { 0 } else { 1 },
            "deliveredBatches": 1,
            "outcome": outcome,
            "nextCursor": if completed { Value::Null } else { json!("cursor") },
            "hasMore": !completed
        });
        if completed {
            page["completionEvidence"] = json!({
                "snapshotId": snapshot_id,
                "schema": SNAPSHOT_SCHEMA,
                "libraryId": 1,
                "scope": SNAPSHOT_SCOPE,
                "totalItems": 0,
                "totalBatches": 1,
                "order": SNAPSHOT_ORDER,
                "contentDigest": format!("sha256:{}", "b".repeat(64)),
                "completedAt": "2026-08-30T00:00:01Z"
            });
        }
        page
    }

    #[test]
    fn snapshot_decoder_checks_shared_shapes_and_nested_bounds() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/reverse-host.json"
        )).unwrap();
        for case in corpus["cases"].as_array().unwrap().iter().filter(|case| {
            case["schemaRef"] == "schemas/reverse-host.schema.json#/$defs/LibrarySnapshotResult"
        }) {
            assert_eq!(
                decode_snapshot_page(case["value"].clone()).is_ok(),
                case["valid"] == true,
                "{}",
                case["id"]
            );
        }
        let seed = corpus["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"] == "library-snapshot-result-positive")
            .unwrap()["value"]
            .clone();
        for (pointer, value) in [
            ("/items/0/title", json!("界".repeat(65537))),
            ("/items/0/ref/key", json!("bad-key")),
            ("/items/0/noteCount", json!(-1)),
            ("/items/0/identifiers/doi", json!(true)),
            ("/items/0/state", json!("deleted")),
            ("/nextCursor", json!("x".repeat(4097))),
        ] {
            let mut value_root = seed.clone();
            *value_root.pointer_mut(pointer).unwrap() = value;
            assert!(decode_snapshot_page(value_root).is_err(), "{pointer}");
        }
        let mut missing = seed.clone();
        missing["items"][0]["identifiers"]
            .as_object_mut()
            .unwrap()
            .remove("doi");
        assert!(decode_snapshot_page(missing).is_err());
        let mut unicode = seed;
        unicode["items"][0]["title"] = json!("🦀".repeat(65536));
        assert!(decode_snapshot_page(unicode).is_ok());
    }

    #[test]
    fn refresh_requires_complete_coverage_and_preserves_the_previous_generation() {
        let (_root, application, owner) = application("library-snapshot-refresh");
        let complete = |snapshot: &str| {
            let mut value = page(snapshot, "completed", Vec::new());
            value["batchSize"] = json!(100);
            value["completionEvidence"]["contentDigest"] = json!(
                synthesis_protocol::canonical_sha256(&json!({
                    "schema": SNAPSHOT_SCHEMA, "snapshotId": snapshot, "libraryId": 1,
                    "scope": SNAPSHOT_SCOPE, "order": SNAPSHOT_ORDER, "items": []
                }))
                .unwrap()
            );
            value
        };
        let initial = application
            .prepare(1, |_| Ok(complete("first")), &|| Ok(()))
            .expect("initial capture");
        assert!(
            owner
                .lock()
                .unwrap()
                .current_library_snapshot_generation()
                .unwrap()
                .is_none()
        );
        initial.promote(&|| Ok(())).expect("initial promotion");
        let current = owner
            .lock()
            .unwrap()
            .current_library_snapshot_generation()
            .unwrap()
            .unwrap();
        let mut invalid = complete("invalid");
        invalid["deliveredBatches"] = json!(2);
        assert!(
            application
                .prepare(1, |_| Ok(invalid.clone()), &|| Ok(()))
                .is_err()
        );
        assert!(
            application
                .prepare(1, |_| Ok(complete("cancelled")), &|| Err(
                    "operation_cancelled".into()
                ))
                .is_err()
        );
        drop(
            application
                .prepare(1, |_| Ok(complete("discarded")), &|| Ok(()))
                .expect("discarded capture"),
        );
        assert!(
            application
                .prepare(1, |_| Ok(complete("cancel-before-promotion")), &|| Ok(()))
                .expect("capture")
                .promote(&|| Err("operation_canceled".into()))
                .is_err()
        );
        assert_eq!(
            owner
                .lock()
                .unwrap()
                .current_library_snapshot_generation()
                .unwrap()
                .unwrap()
                .generation_id,
            current.generation_id
        );
        application
            .prepare(1, |_| Ok(complete("replacement")), &|| Ok(()))
            .expect("replacement")
            .promote(&|| Ok(()))
            .expect("replacement promotion");
        assert_eq!(
            owner
                .lock()
                .unwrap()
                .current_library_snapshot_generation()
                .unwrap()
                .unwrap()
                .snapshot_id,
            "replacement"
        );
    }
}
