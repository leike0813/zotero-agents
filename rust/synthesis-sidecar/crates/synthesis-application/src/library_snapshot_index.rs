use serde_json::Value;
use std::sync::Arc;
use synthesis_repository::{
    LibrarySnapshotGenerationRecord, LibrarySnapshotIndexItemRecord, LibrarySnapshotPromotion,
};

const SNAPSHOT_SCHEMA: &str = "zotero-agents.library-full-index.v1";
const SNAPSHOT_SCOPE: &str = "top-level-regular";
const SNAPSHOT_ORDER: &str = "stable_identity";

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
}

struct PageBasis<'a> {
    snapshot_id: &'a str,
    library_id: i64,
    batch_index: i64,
    outcome: &'a str,
    items: &'a [Value],
}

fn text<'a>(object: &'a serde_json::Map<String, Value>, field: &str) -> Result<&'a str, String> {
    object
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "library_snapshot_page_invalid".to_owned())
}

fn integer(object: &serde_json::Map<String, Value>, field: &str) -> Result<i64, String> {
    object
        .get(field)
        .and_then(Value::as_i64)
        .filter(|value| *value >= 0)
        .ok_or_else(|| "library_snapshot_page_invalid".to_owned())
}

fn page_basis(page: &Value) -> Result<PageBasis<'_>, String> {
    let object = page
        .as_object()
        .ok_or_else(|| "library_snapshot_page_invalid".to_owned())?;
    if text(object, "schema")? != SNAPSHOT_SCHEMA
        || text(object, "scope")? != SNAPSHOT_SCOPE
        || text(object, "order")? != SNAPSHOT_ORDER
    {
        return Err("library_snapshot_page_basis_invalid".into());
    }
    let outcome = text(object, "outcome")?;
    let has_more = object.get("hasMore").and_then(Value::as_bool);
    match outcome {
        "active"
            if has_more == Some(true)
                && object
                    .get("nextCursor")
                    .and_then(Value::as_str)
                    .is_some_and(|cursor| !cursor.is_empty()) => {}
        "completed"
            if has_more == Some(false) && object.get("nextCursor") == Some(&Value::Null) => {}
        _ => return Err("library_snapshot_page_terminal_invalid".into()),
    }
    let items = object
        .get("items")
        .and_then(Value::as_array)
        .ok_or_else(|| "library_snapshot_page_invalid".to_owned())?;
    if integer(object, "returned")? != items.len() as i64 {
        return Err("library_snapshot_page_coverage_invalid".into());
    }
    Ok(PageBasis {
        snapshot_id: text(object, "snapshotId")?,
        library_id: integer(object, "libraryId")?,
        batch_index: integer(object, "batchIndex")?,
        outcome,
        items,
    })
}

fn page_items(basis: &PageBasis<'_>) -> Result<Vec<LibrarySnapshotIndexItemRecord>, String> {
    basis
        .items
        .iter()
        .map(|item| {
            let object = item
                .as_object()
                .ok_or_else(|| "library_snapshot_item_invalid".to_owned())?;
            let reference = object
                .get("ref")
                .and_then(Value::as_object)
                .ok_or_else(|| "library_snapshot_item_invalid".to_owned())?;
            let library_id = integer(reference, "libraryId")?;
            if library_id != basis.library_id {
                return Err("library_snapshot_item_basis_mismatch".into());
            }
            Ok(LibrarySnapshotIndexItemRecord {
                library_id,
                item_key: text(reference, "key")?.into(),
                revision: text(object, "revision")?.into(),
                payload: item.clone(),
            })
        })
        .collect()
}

impl LibrarySnapshotIndexApplication {
    pub fn new(repository: Arc<dyn LibrarySnapshotIndexRepositoryPort>) -> Self {
        Self { repository }
    }

    pub fn consume_page(
        &self,
        generation_id: &str,
        page: &Value,
        started_at: &str,
    ) -> Result<bool, String> {
        let basis = page_basis(page)?;
        if basis.library_id <= 0 || generation_id.is_empty() || started_at.is_empty() {
            return Err("library_snapshot_generation_invalid".into());
        }
        if basis.batch_index == 0 {
            self.repository.begin(&LibrarySnapshotGenerationRecord {
                generation_id: generation_id.into(),
                snapshot_id: basis.snapshot_id.into(),
                library_id: basis.library_id,
                status: "staging".into(),
                content_digest: String::new(),
                total_items: 0,
                total_batches: 0,
                created_at: started_at.into(),
                promoted_at: String::new(),
            })?;
        }
        self.repository.stage(
            generation_id,
            basis.snapshot_id,
            basis.library_id,
            &page_items(&basis)?,
        )?;
        if basis.outcome != "completed" {
            return Ok(false);
        }
        let object = page
            .as_object()
            .ok_or_else(|| "library_snapshot_page_invalid".to_owned())?;
        let evidence = object
            .get("completionEvidence")
            .and_then(Value::as_object)
            .ok_or_else(|| "library_snapshot_completion_invalid".to_owned())?;
        let content_digest = text(evidence, "contentDigest")?;
        if text(evidence, "snapshotId")? != basis.snapshot_id
            || text(evidence, "schema")? != SNAPSHOT_SCHEMA
            || text(evidence, "scope")? != SNAPSHOT_SCOPE
            || text(evidence, "order")? != SNAPSHOT_ORDER
            || integer(evidence, "libraryId")? != basis.library_id
            || integer(evidence, "totalItems")? != integer(object, "deliveredItems")?
            || integer(evidence, "totalBatches")? != integer(object, "deliveredBatches")?
        {
            return Err("library_snapshot_completion_mismatch".into());
        }
        self.repository.promote(&LibrarySnapshotPromotion {
            generation_id: generation_id.into(),
            snapshot_id: basis.snapshot_id.into(),
            library_id: basis.library_id,
            content_digest: content_digest.into(),
            total_items: integer(evidence, "totalItems")?,
            total_batches: integer(evidence, "totalBatches")?,
            completed_at: text(evidence, "completedAt")?.into(),
        })?;
        Ok(true)
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
    fn incomplete_page_stays_staged_and_complete_empty_snapshot_can_promote() {
        let (_root, application, owner) = application("library-snapshot-application");
        assert!(
            !application
                .consume_page(
                    "staging",
                    &page(
                        "snapshot-staging",
                        "active",
                        vec![json!({
                            "ref":{"libraryId":1,"key":"A"},
                            "revision":"r1"
                        })],
                    ),
                    "2026-08-30T00:00:00Z",
                )
                .expect("stage")
        );
        assert!(
            owner
                .lock()
                .expect("owner")
                .current_library_snapshot_generation()
                .expect("current")
                .is_none()
        );
        assert!(
            application
                .consume_page(
                    "empty",
                    &page("snapshot-empty", "completed", Vec::new()),
                    "2026-08-30T00:00:00Z",
                )
                .expect("promote")
        );
        assert_eq!(
            owner
                .lock()
                .expect("owner")
                .current_library_snapshot_generation()
                .expect("current")
                .expect("generation")
                .generation_id,
            "empty"
        );
    }
}
