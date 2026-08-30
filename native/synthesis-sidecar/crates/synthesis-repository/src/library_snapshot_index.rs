use super::{Repository, map_sqlite_error, validate_json_safe};
use rusqlite::{OptionalExtension, params};
use serde_json::Value;

pub const LIBRARY_SNAPSHOT_INDEX_SCHEMA: &str = "synthesis-library-snapshot-index.v1";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LibrarySnapshotGenerationRecord {
    pub generation_id: String,
    pub snapshot_id: String,
    pub library_id: i64,
    pub status: String,
    pub content_digest: String,
    pub total_items: i64,
    pub total_batches: i64,
    pub created_at: String,
    pub promoted_at: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LibrarySnapshotIndexItemRecord {
    pub library_id: i64,
    pub item_key: String,
    pub revision: String,
    pub payload: Value,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LibrarySnapshotPromotion {
    pub generation_id: String,
    pub snapshot_id: String,
    pub library_id: i64,
    pub content_digest: String,
    pub total_items: i64,
    pub total_batches: i64,
    pub completed_at: String,
}

fn valid_identity(value: &str) -> bool {
    !value.is_empty() && value.len() <= 512 && !value.chars().any(char::is_control)
}

impl Repository {
    pub fn begin_library_snapshot_generation(
        &self,
        record: &LibrarySnapshotGenerationRecord,
    ) -> Result<(), String> {
        if !valid_identity(&record.generation_id)
            || !valid_identity(&record.snapshot_id)
            || record.library_id <= 0
            || record.status != "staging"
            || record.total_items != 0
            || record.total_batches != 0
            || !record.content_digest.is_empty()
            || record.created_at.is_empty()
            || !record.promoted_at.is_empty()
        {
            return Err("library_snapshot_generation_invalid".into());
        }
        self.connection()?
            .execute(
                "INSERT INTO synt_library_snapshot_generation(
                   generation_id,snapshot_id,library_id,status,created_at
                 ) VALUES(?1,?2,?3,'staging',?4)",
                params![
                    record.generation_id,
                    record.snapshot_id,
                    record.library_id,
                    record.created_at
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn stage_library_snapshot_items(
        &mut self,
        generation_id: &str,
        snapshot_id: &str,
        library_id: i64,
        records: &[LibrarySnapshotIndexItemRecord],
    ) -> Result<(), String> {
        if !valid_identity(generation_id) || !valid_identity(snapshot_id) || library_id <= 0 {
            return Err("library_snapshot_generation_invalid".into());
        }
        self.transaction(|repository| {
            let basis = repository
                .connection()?
                .query_row(
                    "SELECT snapshot_id,library_id,status
                     FROM synt_library_snapshot_generation WHERE generation_id=?1",
                    [generation_id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, i64>(1)?,
                            row.get::<_, String>(2)?,
                        ))
                    },
                )
                .optional()
                .map_err(map_sqlite_error)?
                .ok_or_else(|| "library_snapshot_generation_missing".to_owned())?;
            if basis != (snapshot_id.to_owned(), library_id, "staging".to_owned()) {
                return Err("library_snapshot_generation_basis_mismatch".into());
            }
            for record in records {
                if record.library_id != library_id
                    || !valid_identity(&record.item_key)
                    || !valid_identity(&record.revision)
                {
                    return Err("library_snapshot_item_invalid".into());
                }
                validate_json_safe(&record.payload)?;
                let payload_json = serde_json::to_string(&record.payload)
                    .map_err(|_| "library_snapshot_item_invalid".to_owned())?;
                repository
                    .connection()?
                    .execute(
                        "INSERT INTO synt_library_snapshot_item(
                           generation_id,library_id,item_key,revision,payload_json
                         ) VALUES(?1,?2,?3,?4,?5)",
                        params![
                            generation_id,
                            record.library_id,
                            record.item_key,
                            record.revision,
                            payload_json
                        ],
                    )
                    .map_err(map_sqlite_error)?;
            }
            Ok(())
        })
    }

    pub fn promote_library_snapshot_generation(
        &mut self,
        promotion: &LibrarySnapshotPromotion,
    ) -> Result<(), String> {
        if !valid_identity(&promotion.generation_id)
            || !valid_identity(&promotion.snapshot_id)
            || promotion.library_id <= 0
            || promotion.content_digest.len() != 71
            || !promotion.content_digest.starts_with("sha256:")
            || !promotion
                .content_digest
                .strip_prefix("sha256:")
                .unwrap_or_default()
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
            || promotion.total_items < 0
            || promotion.total_batches < 1
            || promotion.completed_at.is_empty()
        {
            return Err("library_snapshot_completion_invalid".into());
        }
        self.transaction(|repository| {
            let basis = repository
                .connection()?
                .query_row(
                    "SELECT snapshot_id,library_id,status
                     FROM synt_library_snapshot_generation WHERE generation_id=?1",
                    [&promotion.generation_id],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, i64>(1)?,
                            row.get::<_, String>(2)?,
                        ))
                    },
                )
                .optional()
                .map_err(map_sqlite_error)?
                .ok_or_else(|| "library_snapshot_generation_missing".to_owned())?;
            if basis
                != (
                    promotion.snapshot_id.clone(),
                    promotion.library_id,
                    "staging".to_owned(),
                )
            {
                return Err("library_snapshot_generation_basis_mismatch".into());
            }
            let item_count = repository
                .connection()?
                .query_row(
                    "SELECT COUNT(*) FROM synt_library_snapshot_item WHERE generation_id=?1",
                    [&promotion.generation_id],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(map_sqlite_error)?;
            if item_count != promotion.total_items {
                return Err("library_snapshot_completion_mismatch".into());
            }
            repository
                .connection()?
                .execute(
                    "UPDATE synt_library_snapshot_generation
                     SET status='current',content_digest=?2,total_items=?3,total_batches=?4,promoted_at=?5
                     WHERE generation_id=?1 AND status='staging'",
                    params![
                        promotion.generation_id,
                        promotion.content_digest,
                        promotion.total_items,
                        promotion.total_batches,
                        promotion.completed_at
                    ],
                )
                .map_err(map_sqlite_error)?;
            repository
                .connection()?
                .execute(
                    "INSERT OR REPLACE INTO synt_library_snapshot_state(singleton_id,current_generation_id)
                     VALUES(1,?1)",
                    [&promotion.generation_id],
                )
                .map_err(map_sqlite_error)?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_library_snapshot_generation WHERE generation_id<>?1",
                    [&promotion.generation_id],
                )
                .map_err(map_sqlite_error)?;
            Ok(())
        })
    }

    pub fn current_library_snapshot_generation(
        &self,
    ) -> Result<Option<LibrarySnapshotGenerationRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT generation_id,snapshot_id,library_id,status,content_digest,
                        total_items,total_batches,created_at,promoted_at
                 FROM synt_library_snapshot_generation
                 WHERE generation_id=(SELECT current_generation_id
                   FROM synt_library_snapshot_state WHERE singleton_id=1)",
                [],
                |row| {
                    Ok(LibrarySnapshotGenerationRecord {
                        generation_id: row.get(0)?,
                        snapshot_id: row.get(1)?,
                        library_id: row.get(2)?,
                        status: row.get(3)?,
                        content_digest: row.get(4)?,
                        total_items: row.get(5)?,
                        total_batches: row.get(6)?,
                        created_at: row.get(7)?,
                        promoted_at: row.get(8)?,
                    })
                },
            )
            .optional()
            .map_err(map_sqlite_error)
    }

    pub fn list_current_library_snapshot_items(
        &self,
    ) -> Result<Vec<LibrarySnapshotIndexItemRecord>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT library_id,item_key,revision,payload_json
                 FROM synt_library_snapshot_item
                 WHERE generation_id=(SELECT current_generation_id
                   FROM synt_library_snapshot_state WHERE singleton_id=1)
                 ORDER BY library_id,item_key",
            )
            .map_err(map_sqlite_error)?;
        statement
            .query_map([], |row| {
                let payload_json = row.get::<_, String>(3)?;
                let payload = serde_json::from_str(&payload_json).map_err(|error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        3,
                        rusqlite::types::Type::Text,
                        Box::new(error),
                    )
                })?;
                Ok(LibrarySnapshotIndexItemRecord {
                    library_id: row.get(0)?,
                    item_key: row.get(1)?,
                    revision: row.get(2)?,
                    payload,
                })
            })
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RepositoryIdentity;
    use serde_json::json;
    use synthesis_test_support::TestRoot;

    fn repository(label: &str) -> Repository {
        let root = TestRoot::new(label);
        Repository::open(
            root.path(),
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: label.into(),
            },
        )
        .expect("repository")
    }

    fn generation(id: &str, snapshot_id: &str) -> LibrarySnapshotGenerationRecord {
        LibrarySnapshotGenerationRecord {
            generation_id: id.into(),
            snapshot_id: snapshot_id.into(),
            library_id: 1,
            status: "staging".into(),
            content_digest: String::new(),
            total_items: 0,
            total_batches: 0,
            created_at: "2026-08-30T00:00:00Z".into(),
            promoted_at: String::new(),
        }
    }

    fn promotion(id: &str, snapshot_id: &str, total_items: i64) -> LibrarySnapshotPromotion {
        LibrarySnapshotPromotion {
            generation_id: id.into(),
            snapshot_id: snapshot_id.into(),
            library_id: 1,
            content_digest: format!("sha256:{}", "a".repeat(64)),
            total_items,
            total_batches: 1,
            completed_at: "2026-08-30T00:00:01Z".into(),
        }
    }

    #[test]
    fn incomplete_generation_cannot_replace_current_generation() {
        let mut repository = repository("library-snapshot-incomplete");
        repository
            .begin_library_snapshot_generation(&generation("g1", "s1"))
            .expect("begin current");
        repository
            .stage_library_snapshot_items(
                "g1",
                "s1",
                1,
                &[LibrarySnapshotIndexItemRecord {
                    library_id: 1,
                    item_key: "A".into(),
                    revision: "r1".into(),
                    payload: json!({"ref":{"libraryId":1,"key":"A"}}),
                }],
            )
            .expect("stage current");
        repository
            .promote_library_snapshot_generation(&promotion("g1", "s1", 1))
            .expect("promote current");
        repository
            .begin_library_snapshot_generation(&generation("g2", "s2"))
            .expect("begin incomplete");

        assert_eq!(
            repository
                .current_library_snapshot_generation()
                .expect("current")
                .expect("generation")
                .generation_id,
            "g1"
        );
        assert_eq!(
            repository
                .list_current_library_snapshot_items()
                .expect("items")[0]
                .item_key,
            "A"
        );
    }

    #[test]
    fn complete_empty_generation_atomically_replaces_current_rows() {
        let mut repository = repository("library-snapshot-empty");
        repository
            .begin_library_snapshot_generation(&generation("g1", "s1"))
            .expect("begin current");
        repository
            .stage_library_snapshot_items(
                "g1",
                "s1",
                1,
                &[LibrarySnapshotIndexItemRecord {
                    library_id: 1,
                    item_key: "A".into(),
                    revision: "r1".into(),
                    payload: json!({"ref":{"libraryId":1,"key":"A"}}),
                }],
            )
            .expect("stage current");
        repository
            .promote_library_snapshot_generation(&promotion("g1", "s1", 1))
            .expect("promote current");
        repository
            .begin_library_snapshot_generation(&generation("g2", "s2"))
            .expect("begin empty");
        repository
            .promote_library_snapshot_generation(&promotion("g2", "s2", 0))
            .expect("promote empty");

        assert_eq!(
            repository
                .current_library_snapshot_generation()
                .expect("current")
                .expect("generation")
                .generation_id,
            "g2"
        );
        assert!(
            repository
                .list_current_library_snapshot_items()
                .expect("items")
                .is_empty()
        );
    }
}
