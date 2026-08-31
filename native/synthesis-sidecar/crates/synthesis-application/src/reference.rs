use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceIndexReference {
    pub raw_reference_id: String,
    pub source_ref: String,
    pub references_artifact_hash: String,
    pub reference_index: i64,
    pub raw_hash: String,
    pub parsed_title: String,
    pub normalized_title: String,
    pub year: String,
    pub authors_json: String,
    pub raw_reference: String,
    pub canonical_reference_id: String,
    pub status: String,
    pub roles_json: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReferenceIndexRow {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    pub title: String,
    pub year: String,
    pub metadata_hash: String,
    pub updated_at: String,
    pub artifact_coverage: String,
    pub missing_artifacts: Vec<String>,
    pub reference_count: usize,
    pub unbound_reference_count: usize,
    pub references: Vec<ReferenceIndexReference>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReferenceIndexSnapshot {
    pub rows: Vec<ReferenceIndexRow>,
    pub repository_basis_hash: String,
    pub canonical_basis_hash: String,
    pub cache_ready: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReferenceIndexQuery {
    pub cursor: usize,
    pub limit: usize,
    pub include_references: bool,
    pub source_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReferenceIndexProjection {
    pub rows: Vec<ReferenceIndexRow>,
    pub cursor: usize,
    pub next_cursor: Option<usize>,
    pub has_more: bool,
    pub returned: usize,
    pub total: usize,
    pub limit: usize,
    pub repository_basis_hash: String,
    pub canonical_basis_hash: String,
    pub cache_ready: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReferenceQuery {
    Index(ReferenceIndexQuery),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ReferenceProjection {
    Index(ReferenceIndexProjection),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReferenceApplicationError {
    InvalidRequest,
    Unavailable,
    HostResultInvalid,
    HostInputTooLarge,
    HostPageLimitExceeded,
}

impl ReferenceApplicationError {
    pub fn code(self) -> &'static str {
        match self {
            Self::InvalidRequest => "invalid_request",
            Self::Unavailable => "reverse_host_unavailable",
            Self::HostResultInvalid => "reverse_host_result_invalid",
            Self::HostInputTooLarge => "reverse_host_input_too_large",
            Self::HostPageLimitExceeded => "reverse_host_page_limit_exceeded",
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostItem {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    pub item_type: String,
    pub title: String,
    pub year: String,
    pub date: String,
    pub creators: Vec<String>,
    pub tags: Vec<String>,
    pub collections: Vec<String>,
    pub doi: String,
    pub arxiv: String,
    pub isbn: String,
    pub url: String,
    pub citekey: String,
    pub date_added: String,
    pub updated_at: String,
    pub metadata_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostItemsPage {
    pub items: Vec<ReferenceHostItem>,
    pub cursor: String,
    pub next_cursor: String,
    pub snapshot_revision: String,
    pub has_more: bool,
    pub returned: usize,
    pub limit: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostItemsByRef {
    pub items: Vec<ReferenceHostItem>,
    pub missing_paper_refs: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostArtifact {
    pub paper_ref: String,
    pub artifact_type: String,
    pub payload_type: String,
    pub status: String,
    #[serde(default)]
    pub locator: String,
    #[serde(default)]
    pub payload_hash: String,
    #[serde(default)]
    pub estimated_size: Option<usize>,
    #[serde(default)]
    pub diagnostics: Vec<String>,
    #[serde(default)]
    pub literature_quality: Option<Value>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostArtifactsPage {
    pub artifacts: Vec<ReferenceHostArtifact>,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
    pub returned: usize,
    pub limit: usize,
    pub snapshot_revision: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostArtifactRead {
    pub status: String,
    #[serde(default)]
    pub payload_hash: String,
    #[serde(default)]
    pub current_hash: String,
    #[serde(default)]
    pub content: Option<Value>,
    #[serde(default)]
    pub diagnostics: Vec<String>,
}

pub trait ReferenceHostPort: Send + Sync {
    fn list_items_page(&self, cursor: &str, limit: usize)
    -> Result<ReferenceHostItemsPage, String>;
    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<ReferenceHostItemsByRef, String>;
    fn scan_artifacts_page(
        &self,
        cursor: &str,
        limit: usize,
        paper_refs: &[String],
        artifact_types: &[&str],
    ) -> Result<ReferenceHostArtifactsPage, String>;
    fn read_artifact(
        &self,
        locator: &str,
        expected_hash: &str,
    ) -> Result<ReferenceHostArtifactRead, String>;
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceObservation {
    pub phase: &'static str,
    pub status: &'static str,
    pub code: Option<String>,
    pub fields: BTreeMap<String, Value>,
}

pub trait ReferenceObservationPort: Send + Sync {
    fn emit(&self, observation: ReferenceObservation);
}

#[derive(Default)]
pub struct NoopReferenceObservationPort;

impl ReferenceObservationPort for NoopReferenceObservationPort {
    fn emit(&self, _observation: ReferenceObservation) {}
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CanonicalReferenceMutation {
    Archive {
        canonical_reference_id: String,
    },
    UpdateMetadata {
        canonical_reference_id: String,
        title: Option<String>,
        normalized_title: Option<String>,
        normalized_title_derived: bool,
        year: Option<String>,
        authors: Option<Vec<String>>,
        identifiers: Option<BTreeMap<String, String>>,
    },
}

impl CanonicalReferenceMutation {
    pub(crate) fn canonical_reference_id(&self) -> &str {
        match self {
            Self::Archive {
                canonical_reference_id,
            }
            | Self::UpdateMetadata {
                canonical_reference_id,
                ..
            } => canonical_reference_id,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CanonicalMutationStatus {
    Archived,
    AlreadyArchived,
    Updated,
    BoundToZotero,
    MissingCanonical,
    Blocked,
    Stopping,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CanonicalMutationReceipt {
    pub canonical_reference_id: String,
    pub status: CanonicalMutationStatus,
    pub idempotent: bool,
    pub blockers: Vec<String>,
}

pub const HOST_PAGE_LIMIT: usize = 100;
pub const MAX_HOST_PAGES: usize = 1_000;
pub const MAX_HOST_ROWS: usize = 100_000;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum HostCollectionError {
    Host(String),
    InvalidPage,
    PageCycle,
    InputTooLarge,
    PageLimitExceeded,
}

pub fn validate_host_items_page(
    requested_cursor: &str,
    expected_revision: Option<&str>,
    page: &ReferenceHostItemsPage,
) -> Result<(), HostCollectionError> {
    if page.cursor != requested_cursor
        || page.limit == 0
        || page.limit > HOST_PAGE_LIMIT
        || page.returned != page.items.len()
        || page.returned > page.limit
        || page.snapshot_revision.is_empty()
        || expected_revision.is_some_and(|revision| revision != page.snapshot_revision)
        || (page.has_more && (page.next_cursor.is_empty() || page.next_cursor == requested_cursor))
        || (!page.has_more && !page.next_cursor.is_empty())
    {
        return Err(HostCollectionError::InvalidPage);
    }
    Ok(())
}

pub fn collect_host_item_pages(
    mut fetch_page: impl FnMut(&str, usize) -> Result<ReferenceHostItemsPage, String>,
    max_rows: usize,
    allow_truncation: bool,
) -> Result<Vec<ReferenceHostItem>, HostCollectionError> {
    if allow_truncation && max_rows == 0 {
        return Ok(Vec::new());
    }
    let mut cursor = String::new();
    let mut revision: Option<String> = None;
    let mut seen_cursors = HashSet::new();
    let mut items = Vec::new();
    for _ in 0..MAX_HOST_PAGES {
        let page = fetch_page(&cursor, HOST_PAGE_LIMIT).map_err(HostCollectionError::Host)?;
        validate_host_items_page(&cursor, revision.as_deref(), &page)?;
        if !seen_cursors.insert(page.cursor.clone()) {
            return Err(HostCollectionError::PageCycle);
        }
        revision.get_or_insert_with(|| page.snapshot_revision.clone());
        let remaining = max_rows.saturating_sub(items.len());
        if allow_truncation {
            items.extend(page.items.into_iter().take(remaining));
        } else {
            items.extend(page.items);
        }
        if items.len() > max_rows {
            return Err(HostCollectionError::InputTooLarge);
        }
        if (allow_truncation && items.len() >= max_rows) || !page.has_more {
            items.sort_by(|left, right| {
                left.paper_ref
                    .cmp(&right.paper_ref)
                    .then_with(|| left.item_key.cmp(&right.item_key))
            });
            if items
                .iter()
                .map(|item| item.paper_ref.as_str())
                .collect::<HashSet<_>>()
                .len()
                != items.len()
            {
                return Err(HostCollectionError::InvalidPage);
            }
            return Ok(items);
        }
        cursor = page.next_cursor;
    }
    Err(HostCollectionError::PageLimitExceeded)
}

pub(crate) fn collect_host_items(
    host: &dyn ReferenceHostPort,
) -> Result<Vec<ReferenceHostItem>, ReferenceApplicationError> {
    collect_host_items_with_limit(host, MAX_HOST_ROWS, false)
}

pub(crate) fn collect_host_items_bounded(
    host: &dyn ReferenceHostPort,
    max_rows: usize,
) -> Result<Vec<ReferenceHostItem>, ReferenceApplicationError> {
    collect_host_items_with_limit(host, max_rows.min(MAX_HOST_ROWS), true)
}

fn collect_host_items_with_limit(
    host: &dyn ReferenceHostPort,
    max_rows: usize,
    allow_truncation: bool,
) -> Result<Vec<ReferenceHostItem>, ReferenceApplicationError> {
    collect_host_item_pages(
        |cursor, limit| host.list_items_page(cursor, limit),
        max_rows,
        allow_truncation,
    )
    .map_err(|error| match error {
        HostCollectionError::Host(_) => ReferenceApplicationError::Unavailable,
        HostCollectionError::InvalidPage | HostCollectionError::PageCycle => {
            ReferenceApplicationError::HostResultInvalid
        }
        HostCollectionError::InputTooLarge => ReferenceApplicationError::HostInputTooLarge,
        HostCollectionError::PageLimitExceeded => ReferenceApplicationError::HostPageLimitExceeded,
    })
}

pub(crate) fn validate_page_metadata(
    requested_cursor: &str,
    returned_cursor: &str,
    returned: usize,
    limit: usize,
    has_more: bool,
    next_cursor: &str,
) -> Result<(), ReferenceApplicationError> {
    if returned_cursor != requested_cursor
        || limit == 0
        || limit > HOST_PAGE_LIMIT
        || returned > limit
        || (has_more && (next_cursor.is_empty() || next_cursor == requested_cursor))
        || (!has_more && !next_cursor.is_empty())
    {
        return Err(ReferenceApplicationError::HostResultInvalid);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct BoundedHost {
        calls: AtomicUsize,
    }

    impl ReferenceHostPort for BoundedHost {
        fn list_items_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            self.calls.fetch_add(1, Ordering::Relaxed);
            if !cursor.is_empty() {
                return Err("bounded_read_requested_an_extra_page".into());
            }
            Ok(ReferenceHostItemsPage {
                items: vec![host_item("paper:a"), host_item("paper:b")],
                cursor: String::new(),
                next_cursor: "page:2".into(),
                snapshot_revision: "revision:1".into(),
                has_more: true,
                returned: 2,
                limit,
            })
        }

        fn get_items_by_ref(
            &self,
            _paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            unreachable!()
        }

        fn scan_artifacts_page(
            &self,
            _cursor: &str,
            _limit: usize,
            _paper_refs: &[String],
            _artifact_types: &[&str],
        ) -> Result<ReferenceHostArtifactsPage, String> {
            unreachable!()
        }

        fn read_artifact(
            &self,
            _locator: &str,
            _expected_hash: &str,
        ) -> Result<ReferenceHostArtifactRead, String> {
            unreachable!()
        }
    }

    #[test]
    fn bounded_host_collection_stops_after_reaching_the_requested_row_limit() {
        let host = BoundedHost {
            calls: AtomicUsize::new(0),
        };

        let items = collect_host_items_bounded(&host, 1).expect("bounded collection");

        assert_eq!(items.len(), 1);
        assert_eq!(host.calls.load(Ordering::Relaxed), 1);
    }

    fn host_item(paper_ref: &str) -> ReferenceHostItem {
        ReferenceHostItem {
            paper_ref: paper_ref.into(),
            library_id: 1,
            item_key: paper_ref.into(),
            title: paper_ref.into(),
            year: "2026".into(),
            metadata_hash: format!("sha256:{paper_ref}"),
            updated_at: "1".into(),
            ..ReferenceHostItem::default()
        }
    }
}
