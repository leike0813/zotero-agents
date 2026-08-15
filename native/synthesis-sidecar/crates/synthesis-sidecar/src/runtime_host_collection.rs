use std::collections::HashSet;
use std::sync::Arc;
pub(crate) use synthesis_application::reference::{
    ReferenceHostItem, ReferenceHostItemsByRef, ReferenceHostItemsPage,
};
use synthesis_application::{
    TopicLibraryItem, TopicLibraryItemsByRef, TopicLibraryPage, TopicLibraryQueryPort,
};

pub(crate) const HOST_PAGE_LIMIT: usize = 100;
pub(crate) const MAX_HOST_PAGES: usize = 1_000;
pub(crate) const MAX_HOST_ROWS: usize = 100_000;

pub(crate) trait HostItemCollectionPort: Send + Sync {
    fn list_items_page(&self, cursor: &str, limit: usize)
    -> Result<ReferenceHostItemsPage, String>;

    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<ReferenceHostItemsByRef, String>;
}

pub(crate) struct TopicLibraryQueryAdapter {
    host: Arc<dyn HostItemCollectionPort>,
}

impl TopicLibraryQueryAdapter {
    pub(crate) fn new(host: Arc<dyn HostItemCollectionPort>) -> Self {
        Self { host }
    }
}

impl TopicLibraryQueryPort for TopicLibraryQueryAdapter {
    fn list_items_page(&self, cursor: &str, limit: usize) -> Result<TopicLibraryPage, String> {
        if limit == 0 || limit > HOST_PAGE_LIMIT {
            return Err("invalid_request".into());
        }
        let page = self.host.list_items_page(cursor, limit)?;
        validate_item_page(cursor, None, &page)?;
        Ok(TopicLibraryPage {
            items: page.items.into_iter().map(topic_library_item).collect(),
            cursor: page.cursor,
            next_cursor: page.next_cursor,
            has_more: page.has_more,
        })
    }

    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<TopicLibraryItemsByRef, String> {
        if paper_refs.is_empty() || paper_refs.len() > 250 {
            return Err("invalid_request".into());
        }
        let result = self.host.get_items_by_ref(paper_refs)?;
        Ok(TopicLibraryItemsByRef {
            items: result.items.into_iter().map(topic_library_item).collect(),
            missing_paper_refs: result.missing_paper_refs,
        })
    }
}

fn topic_library_item(item: ReferenceHostItem) -> TopicLibraryItem {
    TopicLibraryItem {
        paper_ref: item.paper_ref,
        library_id: item.library_id,
        item_key: item.item_key,
        item_type: item.item_type,
        title: item.title,
        year: item.year,
        tags: item.tags,
        collections: item.collections,
    }
}

pub(crate) fn validate_page_metadata(
    requested_cursor: &str,
    returned_cursor: &str,
    returned: usize,
    limit: usize,
    has_more: bool,
    next_cursor: &str,
) -> Result<(), String> {
    if returned_cursor != requested_cursor
        || limit == 0
        || limit > HOST_PAGE_LIMIT
        || returned > limit
        || (has_more && (next_cursor.is_empty() || next_cursor == requested_cursor))
        || (!has_more && !next_cursor.is_empty())
    {
        return Err("reverse_host_result_invalid".into());
    }
    Ok(())
}

fn validate_item_page(
    requested_cursor: &str,
    expected_revision: Option<&str>,
    page: &ReferenceHostItemsPage,
) -> Result<(), String> {
    validate_page_metadata(
        requested_cursor,
        &page.cursor,
        page.returned,
        page.limit,
        page.has_more,
        &page.next_cursor,
    )?;
    if page.returned != page.items.len()
        || page.snapshot_revision.is_empty()
        || expected_revision.is_some_and(|revision| revision != page.snapshot_revision)
    {
        return Err("reverse_host_result_invalid".into());
    }
    Ok(())
}

pub(crate) fn collect_host_items(
    host: &dyn HostItemCollectionPort,
) -> Result<Vec<ReferenceHostItem>, String> {
    collect_host_items_with_limit(host, MAX_HOST_ROWS, false)
}

fn collect_host_items_with_limit(
    host: &dyn HostItemCollectionPort,
    max_rows: usize,
    allow_truncation: bool,
) -> Result<Vec<ReferenceHostItem>, String> {
    let mut cursor = String::new();
    let mut revision: Option<String> = None;
    let mut seen_cursors = HashSet::new();
    let mut items = Vec::new();
    for _ in 0..MAX_HOST_PAGES {
        let page = host.list_items_page(&cursor, HOST_PAGE_LIMIT)?;
        validate_item_page(&cursor, revision.as_deref(), &page)?;
        if !seen_cursors.insert(page.cursor.clone()) {
            return Err("reverse_host_page_cycle".into());
        }
        revision.get_or_insert_with(|| page.snapshot_revision.clone());
        let remaining = max_rows.saturating_sub(items.len());
        if allow_truncation {
            items.extend(page.items.into_iter().take(remaining));
        } else {
            items.extend(page.items);
        }
        if items.len() > max_rows {
            return Err("reverse_host_input_too_large".into());
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
                return Err("reverse_host_result_invalid".into());
            }
            return Ok(items);
        }
        cursor = page.next_cursor;
    }
    Err("reverse_host_page_limit_exceeded".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;
    use std::sync::Mutex;

    struct FakeHost {
        pages: Mutex<VecDeque<ReferenceHostItemsPage>>,
    }

    impl HostItemCollectionPort for FakeHost {
        fn list_items_page(
            &self,
            _cursor: &str,
            _limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            self.pages
                .lock()
                .expect("pages")
                .pop_front()
                .ok_or_else(|| "reverse_host_unavailable".into())
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            Ok(ReferenceHostItemsByRef {
                items: Vec::new(),
                missing_paper_refs: paper_refs.to_vec(),
            })
        }
    }

    fn item(paper_ref: &str) -> ReferenceHostItem {
        ReferenceHostItem {
            paper_ref: paper_ref.into(),
            library_id: 1,
            item_key: paper_ref.split_once(':').expect("paper ref").1.into(),
            item_type: "journalArticle".into(),
            title: paper_ref.into(),
            year: String::new(),
            date: String::new(),
            creators: Vec::new(),
            tags: Vec::new(),
            collections: Vec::new(),
            doi: String::new(),
            arxiv: String::new(),
            isbn: String::new(),
            url: String::new(),
            citekey: String::new(),
            date_added: String::new(),
            updated_at: String::new(),
            metadata_hash: String::new(),
        }
    }

    fn page(
        items: Vec<ReferenceHostItem>,
        cursor: &str,
        next_cursor: &str,
        revision: &str,
    ) -> ReferenceHostItemsPage {
        ReferenceHostItemsPage {
            returned: items.len(),
            items,
            cursor: cursor.into(),
            next_cursor: next_cursor.into(),
            snapshot_revision: revision.into(),
            has_more: !next_cursor.is_empty(),
            limit: HOST_PAGE_LIMIT,
        }
    }

    #[test]
    fn collection_preserves_one_snapshot_and_deterministic_order() {
        let host = FakeHost {
            pages: Mutex::new(VecDeque::from([
                page(vec![item("1:BBBB2222")], "", "next", "revision:1"),
                page(vec![item("1:AAAA1111")], "next", "", "revision:1"),
            ])),
        };
        assert_eq!(
            collect_host_items(&host)
                .expect("items")
                .into_iter()
                .map(|item| item.paper_ref)
                .collect::<Vec<_>>(),
            vec!["1:AAAA1111", "1:BBBB2222"],
        );
    }

    #[test]
    fn collection_rejects_revision_cursor_duplicate_and_limit_drift() {
        let cases = [
            VecDeque::from([
                page(vec![item("1:AAAA1111")], "", "next", "revision:1"),
                page(vec![item("1:BBBB2222")], "next", "", "revision:2"),
            ]),
            VecDeque::from([
                page(vec![item("1:AAAA1111")], "", "next", "revision:1"),
                page(vec![item("1:AAAA1111")], "next", "", "revision:1"),
            ]),
            VecDeque::from([page(vec![item("1:AAAA1111")], "wrong", "", "revision:1")]),
            VecDeque::from([ReferenceHostItemsPage {
                limit: HOST_PAGE_LIMIT + 1,
                ..page(vec![item("1:AAAA1111")], "", "", "revision:1")
            }]),
        ];
        for pages in cases {
            let host = FakeHost {
                pages: Mutex::new(pages),
            };
            assert_eq!(
                collect_host_items(&host).expect_err("invalid page"),
                "reverse_host_result_invalid",
            );
        }
    }
}
