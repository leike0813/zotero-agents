//! Local derived retrieval facts: publication state, source groups and
//! original float32 fragment vectors. These tables are owned by the Retrieval
//! application and are excluded from durable bundle capture. Original vectors
//! are the durable authority; any normalized acceleration is rebuildable.

use super::{Repository, map_sqlite_error, validate_json_safe};
use rusqlite::{OptionalExtension, params};
use std::collections::BTreeMap;

pub const RETRIEVAL_SCHEMA: &str = "synthesis-retrieval-derivation.v1";

/// Bounds one group's fragment set and one scoped invalidation request.
pub const RETRIEVAL_MAX_SCOPED_IDS: usize = 4096;
pub const RETRIEVAL_MAX_VECTOR_DIMS: usize = 16_384;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetrievalStateRecord {
    pub enabled: bool,
    pub status: String,
    pub active_publication_id: String,
    pub pending_publication_id: String,
    pub active_identity_json: String,
    pub pending_identity_json: String,
    pub active_scope_json: String,
    pub pending_scope_json: String,
    pub updated_at: String,
}

impl Default for RetrievalStateRecord {
    fn default() -> Self {
        Self {
            enabled: false,
            status: "missing".into(),
            active_publication_id: String::new(),
            pending_publication_id: String::new(),
            active_identity_json: String::new(),
            pending_identity_json: String::new(),
            active_scope_json: String::new(),
            pending_scope_json: String::new(),
            updated_at: String::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetrievalPublicationRecord {
    pub publication_id: String,
    pub role: String,
    pub identity_json: String,
    pub scope_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetrievalGroupRecord {
    pub publication_id: String,
    pub group_id: String,
    pub item_identity: String,
    pub library_id: i64,
    pub source_json: String,
    pub source_version: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RetrievalFragmentRecord {
    pub publication_id: String,
    pub group_id: String,
    pub fragment_id: String,
    pub item_identity: String,
    pub library_id: i64,
    pub source_json: String,
    pub source_version: String,
    pub range_start: i64,
    pub range_end: i64,
    pub location_json: String,
    pub vector: Vec<f32>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RetrievalPromotion {
    pub publication_id: String,
    pub identity_json: String,
    pub scope_json: String,
    pub updated_at: String,
}

fn valid_identity(value: &str) -> bool {
    !value.is_empty() && value.len() <= 512 && !value.chars().any(char::is_control)
}

fn valid_json_text(value: &str) -> Result<(), String> {
    let parsed: serde_json::Value =
        serde_json::from_str(value).map_err(|_| "retrieval_json_invalid".to_owned())?;
    validate_json_safe(&parsed)
}

fn valid_group_status(status: &str) -> bool {
    matches!(status, "ready" | "suspended" | "missing" | "failed")
}

pub fn encode_vector(values: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(values.len() * 4);
    for value in values {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

/// Trust-boundary vector validity: non-empty, within the dimension bound,
/// every value finite, and a non-zero norm. The same rule is applied when a
/// persisted blob is decoded, so a corrupted or hostile row is never surfaced
/// as a scorable vector.
pub fn valid_vector(values: &[f32]) -> bool {
    !values.is_empty()
        && values.len() <= RETRIEVAL_MAX_VECTOR_DIMS
        && values.iter().all(|value| value.is_finite())
        && values.iter().any(|value| *value != 0.0)
}

pub fn decode_vector(bytes: &[u8]) -> Result<Vec<f32>, String> {
    if !bytes.len().is_multiple_of(4) {
        return Err("retrieval_vector_invalid".into());
    }
    let values = bytes
        .as_chunks::<4>()
        .0
        .iter()
        .map(|chunk| f32::from_le_bytes(*chunk))
        .collect::<Vec<_>>();
    if !valid_vector(&values) {
        return Err("retrieval_vector_invalid".into());
    }
    Ok(values)
}

fn placeholders(count: usize) -> String {
    std::iter::repeat_n("?", count)
        .collect::<Vec<_>>()
        .join(",")
}

impl Repository {
    pub fn get_retrieval_state(&self) -> Result<Option<RetrievalStateRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT enabled,status,active_publication_id,pending_publication_id,
                        active_identity_json,pending_identity_json,active_scope_json,
                        pending_scope_json,updated_at
                 FROM synt_retrieval_state WHERE singleton_id=1",
                [],
                |row| {
                    Ok(RetrievalStateRecord {
                        enabled: row.get::<_, i64>(0)? != 0,
                        status: row.get(1)?,
                        active_publication_id: row.get(2)?,
                        pending_publication_id: row.get(3)?,
                        active_identity_json: row.get(4)?,
                        pending_identity_json: row.get(5)?,
                        active_scope_json: row.get(6)?,
                        pending_scope_json: row.get(7)?,
                        updated_at: row.get(8)?,
                    })
                },
            )
            .optional()
            .map_err(map_sqlite_error)
    }

    pub fn put_retrieval_state(&mut self, record: &RetrievalStateRecord) -> Result<(), String> {
        if !matches!(record.status.as_str(), "missing" | "ready" | "paused")
            || record.active_identity_json.len() > 4_096
            || record.pending_identity_json.len() > 4_096
            || record.active_scope_json.len() > 16_384
            || record.pending_scope_json.len() > 16_384
            || record.updated_at.is_empty()
        {
            return Err("retrieval_state_invalid".into());
        }
        for identity in [
            &record.active_publication_id,
            &record.pending_publication_id,
        ] {
            if !identity.is_empty() && !valid_identity(identity) {
                return Err("retrieval_state_invalid".into());
            }
        }
        for json in [&record.active_identity_json, &record.pending_identity_json] {
            if !json.is_empty() {
                valid_json_text(json)?;
            }
        }
        for json in [&record.active_scope_json, &record.pending_scope_json] {
            if !json.is_empty() {
                valid_json_text(json)?;
            }
        }
        self.connection()?
            .execute(
                "INSERT INTO synt_retrieval_state(
                   singleton_id,enabled,status,active_publication_id,pending_publication_id,
                   active_identity_json,pending_identity_json,active_scope_json,
                   pending_scope_json,updated_at
                 ) VALUES(1,?1,?2,?3,?4,?5,?6,?7,?8,?9)
                 ON CONFLICT(singleton_id) DO UPDATE SET
                   enabled=excluded.enabled,status=excluded.status,
                   active_publication_id=excluded.active_publication_id,
                   pending_publication_id=excluded.pending_publication_id,
                   active_identity_json=excluded.active_identity_json,
                   pending_identity_json=excluded.pending_identity_json,
                   active_scope_json=excluded.active_scope_json,
                   pending_scope_json=excluded.pending_scope_json,
                   updated_at=excluded.updated_at",
                params![
                    i64::from(record.enabled),
                    record.status,
                    record.active_publication_id,
                    record.pending_publication_id,
                    record.active_identity_json,
                    record.pending_identity_json,
                    record.active_scope_json,
                    record.pending_scope_json,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn get_retrieval_publication(
        &self,
        publication_id: &str,
    ) -> Result<Option<RetrievalPublicationRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT publication_id,role,identity_json,scope_json,created_at,updated_at
                 FROM synt_retrieval_publication WHERE publication_id=?1",
                [publication_id],
                |row| {
                    Ok(RetrievalPublicationRecord {
                        publication_id: row.get(0)?,
                        role: row.get(1)?,
                        identity_json: row.get(2)?,
                        scope_json: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .optional()
            .map_err(map_sqlite_error)
    }

    pub fn list_retrieval_publications(&self, role: &str) -> Result<Vec<String>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT publication_id FROM synt_retrieval_publication
                 WHERE role=?1 ORDER BY created_at ASC, publication_id ASC",
            )
            .map_err(map_sqlite_error)?;
        statement
            .query_map([role], |row| row.get::<_, String>(0))
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }

    /// Insert a publication. A second staging target is rejected: the schema
    /// holds one staging publication and one active publication per data root.
    pub fn insert_retrieval_publication(
        &mut self,
        record: &RetrievalPublicationRecord,
    ) -> Result<(), String> {
        if !valid_identity(&record.publication_id)
            || !matches!(record.role.as_str(), "active" | "staging")
            || record.created_at.is_empty()
        {
            return Err("retrieval_publication_invalid".into());
        }
        valid_json_text(&record.identity_json)?;
        valid_json_text(&record.scope_json)?;
        // Only one active and one staging target exist per data root;
        // publications awaiting explicit cleanup do not count.
        let existing = self.list_retrieval_publications(&record.role)?;
        if !existing.is_empty() {
            return Err("retrieval_publication_conflict".into());
        }
        self.connection()?
            .execute(
                "INSERT INTO synt_retrieval_publication(
                   publication_id,role,identity_json,scope_json,created_at,updated_at
                 ) VALUES(?1,?2,?3,?4,?5,?6)",
                params![
                    record.publication_id,
                    record.role,
                    record.identity_json,
                    record.scope_json,
                    record.created_at,
                    record.updated_at,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn delete_retrieval_publication(&mut self, publication_id: &str) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute(
                "DELETE FROM synt_retrieval_fragment WHERE publication_id=?1",
                [publication_id],
            )
            .map_err(map_sqlite_error)?;
        connection
            .execute(
                "DELETE FROM synt_retrieval_group WHERE publication_id=?1",
                [publication_id],
            )
            .map_err(map_sqlite_error)?;
        connection
            .execute(
                "DELETE FROM synt_retrieval_publication WHERE publication_id=?1",
                [publication_id],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    pub fn list_retrieval_groups(
        &self,
        publication_id: &str,
    ) -> Result<Vec<RetrievalGroupRecord>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT publication_id,group_id,item_identity,library_id,source_json,
                        source_version,status
                 FROM synt_retrieval_group WHERE publication_id=?1
                 ORDER BY group_id ASC",
            )
            .map_err(map_sqlite_error)?;
        statement
            .query_map([publication_id], read_group_row)
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }

    pub fn list_retrieval_groups_for_items(
        &self,
        publication_id: &str,
        item_identities: &[String],
    ) -> Result<Vec<RetrievalGroupRecord>, String> {
        if item_identities.len() > RETRIEVAL_MAX_SCOPED_IDS {
            return Err("retrieval_scope_limit_exceeded".into());
        }
        if item_identities.is_empty() {
            return Ok(Vec::new());
        }
        let sql = format!(
            "SELECT publication_id,group_id,item_identity,library_id,source_json,
                    source_version,status
             FROM synt_retrieval_group
             WHERE publication_id=?1 AND item_identity IN ({})
             ORDER BY group_id ASC",
            placeholders(item_identities.len())
        );
        let mut statement = self.connection()?.prepare(&sql).map_err(map_sqlite_error)?;
        let mut bindings: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(item_identities.len() + 1);
        bindings.push(&publication_id);
        for identity in item_identities {
            bindings.push(identity);
        }
        statement
            .query_map(bindings.as_slice(), read_group_row)
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }

    pub fn put_retrieval_group(&mut self, record: &RetrievalGroupRecord) -> Result<(), String> {
        if !valid_identity(&record.group_id)
            || !valid_identity(&record.item_identity)
            || !valid_group_status(&record.status)
            || record.source_version.len() > 512
        {
            return Err("retrieval_group_invalid".into());
        }
        let source: serde_json::Value =
            serde_json::from_str(&record.source_json).map_err(|_| "retrieval_group_invalid")?;
        validate_json_safe(&source)?;
        self.connection()?
            .execute(
                "INSERT INTO synt_retrieval_group(
                   publication_id,group_id,item_identity,library_id,source_json,
                   source_version,status
                 ) VALUES(?1,?2,?3,?4,?5,?6,?7)
                 ON CONFLICT(publication_id,group_id) DO UPDATE SET
                   item_identity=excluded.item_identity,library_id=excluded.library_id,
                   source_json=excluded.source_json,source_version=excluded.source_version,
                   status=excluded.status",
                params![
                    record.publication_id,
                    record.group_id,
                    record.item_identity,
                    record.library_id,
                    record.source_json,
                    record.source_version,
                    record.status,
                ],
            )
            .map_err(map_sqlite_error)?;
        Ok(())
    }

    /// Suspend only the named source groups. This performs no source scan and
    /// no encoding; a scoped metadata invalidation can pause work immediately.
    pub fn suspend_retrieval_groups_for_items(
        &mut self,
        publication_id: &str,
        item_identities: &[String],
    ) -> Result<usize, String> {
        if item_identities.len() > RETRIEVAL_MAX_SCOPED_IDS {
            return Err("retrieval_scope_limit_exceeded".into());
        }
        if item_identities.is_empty() {
            return Ok(0);
        }
        let sql = format!(
            "UPDATE synt_retrieval_group SET status='suspended'
             WHERE publication_id=?1 AND status='ready' AND item_identity IN ({})",
            placeholders(item_identities.len())
        );
        let mut bindings: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(item_identities.len() + 1);
        bindings.push(&publication_id);
        for identity in item_identities {
            bindings.push(identity);
        }
        self.connection()?
            .execute(&sql, bindings.as_slice())
            .map_err(map_sqlite_error)
    }

    pub fn set_retrieval_group_status(
        &mut self,
        publication_id: &str,
        group_id: &str,
        status: &str,
    ) -> Result<usize, String> {
        if !valid_group_status(status) {
            return Err("retrieval_group_invalid".into());
        }
        self.connection()?
            .execute(
                "UPDATE synt_retrieval_group SET status=?3
                 WHERE publication_id=?1 AND group_id=?2",
                params![publication_id, group_id, status],
            )
            .map_err(map_sqlite_error)
    }

    /// Replace one group's fragments atomically. A group whose fragments are
    /// replaced has already revalidated its source version, so the group is
    /// marked ready in the same statement set.
    pub fn replace_retrieval_group_fragments(
        &mut self,
        group: &RetrievalGroupRecord,
        records: &[RetrievalFragmentRecord],
    ) -> Result<(), String> {
        if records.len() > 100_000 {
            return Err("retrieval_fragment_limit_exceeded".into());
        }
        self.transaction(|repository| {
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_retrieval_fragment
                     WHERE publication_id=?1 AND group_id=?2",
                    params![group.publication_id, group.group_id],
                )
                .map_err(map_sqlite_error)?;
            for record in records {
                if record.publication_id != group.publication_id
                    || record.group_id != group.group_id
                    || !valid_identity(&record.fragment_id)
                    || record.range_end <= record.range_start
                    || record.location_json.is_empty()
                    || !valid_vector(&record.vector)
                {
                    return Err("retrieval_fragment_invalid".into());
                }
                let location: serde_json::Value = serde_json::from_str(&record.location_json)
                    .map_err(|_| "retrieval_fragment_invalid".to_owned())?;
                validate_json_safe(&location)?;
                repository
                    .connection()?
                    .execute(
                        "INSERT INTO synt_retrieval_fragment(
                           publication_id,group_id,fragment_id,item_identity,library_id,
                           source_json,source_version,range_start,range_end,location_json,
                           dims,vector
                         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                        params![
                            record.publication_id,
                            record.group_id,
                            record.fragment_id,
                            record.item_identity,
                            record.library_id,
                            record.source_json,
                            record.source_version,
                            record.range_start,
                            record.range_end,
                            record.location_json,
                            record.vector.len() as i64,
                            encode_vector(&record.vector),
                        ],
                    )
                    .map_err(map_sqlite_error)?;
            }
            repository
                .connection()?
                .execute(
                    "UPDATE synt_retrieval_group SET status='ready',source_version=?3
                     WHERE publication_id=?1 AND group_id=?2",
                    params![group.publication_id, group.group_id, group.source_version],
                )
                .map_err(map_sqlite_error)?;
            Ok(())
        })
    }

    pub fn list_retrieval_fragments(
        &self,
        publication_id: &str,
    ) -> Result<Vec<RetrievalFragmentRecord>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT publication_id,group_id,fragment_id,item_identity,library_id,
                        source_json,source_version,range_start,range_end,location_json,vector
                 FROM synt_retrieval_fragment WHERE publication_id=?1
                 ORDER BY fragment_id ASC",
            )
            .map_err(map_sqlite_error)?;
        statement
            .query_map([publication_id], read_fragment_row)
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }

    pub fn list_retrieval_fragments_for_items(
        &self,
        publication_id: &str,
        item_identities: &[String],
    ) -> Result<Vec<RetrievalFragmentRecord>, String> {
        if item_identities.len() > RETRIEVAL_MAX_SCOPED_IDS {
            return Err("retrieval_scope_limit_exceeded".into());
        }
        if item_identities.is_empty() {
            return Ok(Vec::new());
        }
        let sql = format!(
            "SELECT publication_id,group_id,fragment_id,item_identity,library_id,
                    source_json,source_version,range_start,range_end,location_json,vector
             FROM synt_retrieval_fragment
             WHERE publication_id=?1 AND item_identity IN ({})
             ORDER BY fragment_id ASC",
            placeholders(item_identities.len())
        );
        let mut statement = self.connection()?.prepare(&sql).map_err(map_sqlite_error)?;
        let mut bindings: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(item_identities.len() + 1);
        bindings.push(&publication_id);
        for identity in item_identities {
            bindings.push(identity);
        }
        statement
            .query_map(bindings.as_slice(), read_fragment_row)
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)
    }

    pub fn count_retrieval_group_statuses(
        &self,
        publication_id: &str,
    ) -> Result<BTreeMap<String, i64>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT status,COUNT(*) FROM synt_retrieval_group
                 WHERE publication_id=?1 GROUP BY status",
            )
            .map_err(map_sqlite_error)?;
        let rows = statement
            .query_map([publication_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(map_sqlite_error)?
            .collect::<Result<BTreeMap<_, _>, _>>()
            .map_err(map_sqlite_error)?;
        Ok(rows)
    }

    /// Atomically publish a completed staging target. Expected absence
    /// (`missing`) never blocks publication; unreadable or failed groups do.
    /// The replaced active publication is demoted to `cleanup_pending` rather
    /// than deleted in this transaction, so a post-publication cleanup failure
    /// leaves the new index ready and the old facts removable by explicit
    /// cleanup.
    pub fn promote_retrieval_publication(
        &mut self,
        promotion: &RetrievalPromotion,
    ) -> Result<(), String> {
        if !valid_identity(&promotion.publication_id) || promotion.updated_at.is_empty() {
            return Err("retrieval_publication_invalid".into());
        }
        valid_json_text(&promotion.identity_json)?;
        valid_json_text(&promotion.scope_json)?;
        self.transaction(|repository| {
            let staging = repository
                .get_retrieval_publication(&promotion.publication_id)?
                .filter(|record| record.role == "staging")
                .ok_or_else(|| "retrieval_publication_missing".to_owned())?;
            // Compare-and-set on the announced target: the staging identity
            // and scope must still describe what is being published, and any
            // pending target recorded in state must be this publication.
            if staging.identity_json != promotion.identity_json
                || staging.scope_json != promotion.scope_json
            {
                return Err("retrieval_publication_basis_mismatch".into());
            }
            let pending = repository
                .get_retrieval_state()?
                .map(|state| state.pending_publication_id)
                .unwrap_or_default();
            if !pending.is_empty() && pending != promotion.publication_id {
                return Err("retrieval_publication_basis_mismatch".into());
            }
            let remaining = repository.count_retrieval_group_statuses(&promotion.publication_id)?;
            if remaining.iter().any(|(status, count)| {
                *count > 0 && !matches!(status.as_str(), "ready" | "missing")
            }) {
                return Err("retrieval_publication_incomplete".into());
            }
            let replaced = repository.list_retrieval_publications("active")?;
            for other in repository.list_retrieval_publications("staging")? {
                if other != promotion.publication_id {
                    repository.delete_retrieval_publication(&other)?;
                }
            }
            repository
                .connection()?
                .execute(
                    "UPDATE synt_retrieval_publication
                     SET role='active',identity_json=?2,scope_json=?3,updated_at=?4
                     WHERE publication_id=?1",
                    params![
                        promotion.publication_id,
                        promotion.identity_json,
                        promotion.scope_json,
                        promotion.updated_at,
                    ],
                )
                .map_err(map_sqlite_error)?;
            for previous in replaced {
                repository
                    .connection()?
                    .execute(
                        "UPDATE synt_retrieval_publication SET role='cleanup_pending',updated_at=?2
                         WHERE publication_id=?1",
                        params![previous, promotion.updated_at],
                    )
                    .map_err(map_sqlite_error)?;
            }
            let mut state = repository.get_retrieval_state()?.unwrap_or_default();
            state.status = "ready".into();
            state.active_publication_id = promotion.publication_id.clone();
            state.pending_publication_id = String::new();
            state.active_identity_json = promotion.identity_json.clone();
            state.active_scope_json = promotion.scope_json.clone();
            state.pending_identity_json = String::new();
            state.pending_scope_json = String::new();
            state.updated_at = promotion.updated_at.clone();
            repository.put_retrieval_state(&state)?;
            Ok(())
        })
    }

    /// Publications replaced by a newer active target and still awaiting the
    /// explicit cleanup tail. Their groups and fragments remain durable until
    /// cleanup removes them.
    pub fn list_retrieval_cleanup_pending(&self) -> Result<Vec<String>, String> {
        self.list_retrieval_publications("cleanup_pending")
    }

    /// Rotate an incremental publication's generation and every owned row in
    /// one transaction. Concurrent replacements fail against the old owner.
    pub fn rotate_retrieval_publication(
        &mut self,
        previous: &str,
        next: &str,
        updated_at: &str,
    ) -> Result<(), String> {
        if !valid_identity(next) || previous == next || updated_at.is_empty() {
            return Err("invalid_request".into());
        }
        self.transaction(|repository| {
            let mut state = repository.get_retrieval_state()?.unwrap_or_default();
            if state.status != "ready" || state.active_publication_id != previous {
                return Err("retrieval_publication_basis_mismatch".into());
            }
            let mut publication = repository.get_retrieval_publication(previous)?
                .filter(|record| record.role == "active")
                .ok_or_else(|| "retrieval_publication_basis_mismatch".to_owned())?;
            publication.publication_id = next.into();
            publication.role = "cleanup_pending".into();
            publication.updated_at = updated_at.into();
            repository.connection()?.execute(
                "INSERT INTO synt_retrieval_publication(publication_id,role,identity_json,scope_json,created_at,updated_at) VALUES(?1,'cleanup_pending',?2,?3,?4,?5)",
                params![next, publication.identity_json, publication.scope_json, publication.created_at, updated_at],
            ).map_err(map_sqlite_error)?;
            for table in ["synt_retrieval_group", "synt_retrieval_fragment"] {
                repository.connection()?.execute(
                    &format!("UPDATE {table} SET publication_id=?1 WHERE publication_id=?2"),
                    params![next, previous],
                ).map_err(map_sqlite_error)?;
            }
            repository.delete_retrieval_publication(previous)?;
            repository.connection()?.execute(
                "UPDATE synt_retrieval_publication SET role='active' WHERE publication_id=?1", [next],
            ).map_err(map_sqlite_error)?;
            state.active_publication_id = next.into();
            state.updated_at = updated_at.into();
            repository.put_retrieval_state(&state)
        })
    }

    /// Complete the post-publication cleanup tail for one replaced publication.
    pub fn finalize_retrieval_cleanup(&mut self, publication_id: &str) -> Result<(), String> {
        let pending = self
            .get_retrieval_publication(publication_id)?
            .is_some_and(|record| record.role == "cleanup_pending");
        if !pending {
            return Err("retrieval_cleanup_target_invalid".into());
        }
        self.delete_retrieval_publication(publication_id)
    }

    /// Count persisted fragments for one publication without materializing a
    /// single vector, so state reads stay bounded by rows rather than bytes.
    pub fn count_retrieval_fragments(&self, publication_id: &str) -> Result<usize, String> {
        self.connection()?
            .query_row(
                "SELECT COUNT(*) FROM synt_retrieval_fragment WHERE publication_id=?1",
                [publication_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(map_sqlite_error)
            .map(|count| count.max(0) as usize)
    }

    /// Scoped fragment count, again without loading any vector.
    pub fn count_retrieval_fragments_for_items(
        &self,
        publication_id: &str,
        item_identities: &[String],
    ) -> Result<usize, String> {
        if item_identities.len() > RETRIEVAL_MAX_SCOPED_IDS {
            return Err("retrieval_scope_limit_exceeded".into());
        }
        if item_identities.is_empty() {
            return Ok(0);
        }
        let sql = format!(
            "SELECT COUNT(*) FROM synt_retrieval_fragment
             WHERE publication_id=?1 AND item_identity IN ({})",
            placeholders(item_identities.len())
        );
        let mut statement = self.connection()?.prepare(&sql).map_err(map_sqlite_error)?;
        let mut bindings: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(item_identities.len() + 1);
        bindings.push(&publication_id);
        for identity in item_identities {
            bindings.push(identity);
        }
        statement
            .query_row(bindings.as_slice(), |row| row.get::<_, i64>(0))
            .map_err(map_sqlite_error)
            .map(|count| count.max(0) as usize)
    }

    /// Hard-scope source groups for a query: only `ready` groups in the
    /// requested libraries and source kinds, and never a vector. The caller
    /// reads this scope before loading any fragment, then loads fragments only
    /// for the surviving item identities.
    pub fn list_retrieval_groups_for_scope(
        &self,
        publication_id: &str,
        library_ids: &[i64],
        source_kinds: &[&str],
    ) -> Result<Vec<RetrievalGroupRecord>, String> {
        Ok(self
            .list_retrieval_scope_groups(publication_id, library_ids, source_kinds)?
            .into_iter()
            .filter(|group| group.status == "ready")
            .collect())
    }

    /// Scoped metadata including unavailable groups, for truthful query
    /// coverage and final source-version revalidation without loading vectors.
    pub fn list_retrieval_scope_groups(
        &self,
        publication_id: &str,
        library_ids: &[i64],
        source_kinds: &[&str],
    ) -> Result<Vec<RetrievalGroupRecord>, String> {
        if library_ids.is_empty()
            || library_ids.len() > 100
            || library_ids.iter().any(|id| *id <= 0)
            || source_kinds.len() > 3
        {
            return Err("invalid_request".into());
        }
        let sql = format!(
            "SELECT publication_id,group_id,item_identity,library_id,source_json,
                    source_version,status
             FROM synt_retrieval_group
             WHERE publication_id=?1 AND library_id IN ({})
             ORDER BY group_id ASC",
            placeholders(library_ids.len())
        );
        let mut statement = self.connection()?.prepare(&sql).map_err(map_sqlite_error)?;
        let mut bindings: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(library_ids.len() + 1);
        bindings.push(&publication_id);
        for id in library_ids {
            bindings.push(id);
        }
        let groups = statement
            .query_map(bindings.as_slice(), read_group_row)
            .map_err(map_sqlite_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(map_sqlite_error)?;
        if source_kinds.is_empty() {
            return Ok(groups);
        }
        Ok(groups
            .into_iter()
            .filter(|record| {
                source_kind_of(&record.source_json)
                    .is_some_and(|kind| source_kinds.contains(&kind.as_str()))
            })
            .collect())
    }

    /// One persisted source group by its primary key, used to revalidate a
    /// discovery candidate against the publication it was generated from.
    fn retrieval_group(
        &self,
        publication_id: &str,
        group_id: &str,
    ) -> Result<Option<RetrievalGroupRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT publication_id,group_id,item_identity,library_id,source_json,source_version,status FROM synt_retrieval_group WHERE publication_id=?1 AND group_id=?2",
                params![publication_id, group_id],
                read_group_row,
            )
            .optional()
            .map_err(map_sqlite_error)
    }

    /// Every discovery hint payload recorded for one Topic, ordered by hint id.
    fn topic_discovery_hints(&self, topic_id: &str) -> Result<Vec<serde_json::Value>, String> {
        let rows = self.query(
            "SELECT payload_json FROM synt_topic_discovery_hint
             WHERE COALESCE(json_extract(payload_json,'$.topic_id'),
                            json_extract(payload_json,'$.topicId'))=?1
             ORDER BY hint_id LIMIT ?2",
            &[
                serde_json::json!(topic_id),
                serde_json::json!(RETRIEVAL_MAX_SCOPED_IDS + 1),
            ],
        )?;
        if rows.len() > RETRIEVAL_MAX_SCOPED_IDS {
            return Err("retrieval_scope_limit_exceeded".into());
        }
        Ok(rows
            .into_iter()
            .filter_map(|row| {
                row.get("payload_json")
                    .and_then(serde_json::Value::as_str)
                    .and_then(|payload| serde_json::from_str::<serde_json::Value>(payload).ok())
            })
            .collect())
    }

    /// Full literature identities already adopted by the current Topic
    /// projection. A candidate for one of these is never re-published.
    fn topic_discovery_adopted_identities(&self, topic_id: &str) -> Result<Vec<String>, String> {
        let Some(projection) = self.get_topic_application_projection(topic_id)? else {
            return Ok(Vec::new());
        };
        let Ok(discovery) = serde_json::from_str::<serde_json::Value>(&projection.discovery_json)
        else {
            return Ok(Vec::new());
        };
        Ok(discovery
            .get("source_paper_refs")
            .and_then(serde_json::Value::as_array)
            .map(|refs| refs.iter().filter_map(adopted_identity).collect())
            .unwrap_or_default())
    }

    /// Publish a bounded batch of post-publication Topic Discovery candidates.
    ///
    /// One short transaction: the active retrieval publication and the Topic
    /// artifact basis must still be the ones the candidates were generated
    /// against, each candidate's source group must still be ready at the same
    /// version in that publication, and any full literature identity the user
    /// already rejected or accepted (or that the current projection adopts) is
    /// excluded. A same-basis screened-out hint stays screened; a changed basis
    /// may reopen it. Any failure rolls the whole batch back.
    pub fn retrieval_discovery_excluded_identities(
        &self,
        topic_id: &str,
    ) -> Result<Vec<String>, String> {
        let mut excluded = self
            .topic_discovery_adopted_identities(topic_id)?
            .into_iter()
            .collect::<std::collections::BTreeSet<_>>();
        for hint in self.topic_discovery_hints(topic_id)? {
            if matches!(hint["status"].as_str(), Some("accepted" | "rejected"))
                && let Some(identity) = hint_identity(&hint)
            {
                excluded.insert(identity);
            }
        }
        Ok(excluded.into_iter().collect())
    }

    pub fn publish_retrieval_discovery_candidates(
        &mut self,
        topic_id: &str,
        expected_artifact_hash: &str,
        publication: &str,
        candidates: &[serde_json::Value],
        updated_at: &str,
    ) -> Result<usize, String> {
        if !valid_identity(topic_id)
            || !valid_identity(expected_artifact_hash)
            || !valid_identity(publication)
            || updated_at.is_empty()
            || candidates.len() > RETRIEVAL_MAX_DISCOVERY_CANDIDATES
        {
            return Err("invalid_request".into());
        }
        let parsed = candidates
            .iter()
            .map(|candidate| parse_discovery_candidate(topic_id, candidate))
            .collect::<Result<Vec<_>, _>>()?;
        self.transaction(|repository| {
            let state = repository.get_retrieval_state()?.unwrap_or_default();
            if state.status != "ready" || state.active_publication_id != publication {
                return Err("retrieval_publication_basis_mismatch".into());
            }
            let topic = repository
                .get_topic_application_state(topic_id)?
                .ok_or_else(|| "topic_discovery_basis_mismatch".to_owned())?;
            if topic.artifact_hash != expected_artifact_hash {
                return Err("topic_discovery_basis_mismatch".into());
            }
            let mut excluded = std::collections::BTreeSet::new();
            // The candidates were generated against one interest basis; the
            // current projection must still carry exactly that basis.
            let current_interest = repository
                .get_topic_application_projection(topic_id)?
                .map(|projection| projection.interest_metadata_json)
                // A missing projection carries the same canonical empty
                // object the projection upsert normalizes an absent interest
                // basis to, so candidates built from either agree.
                .unwrap_or_else(|| "{}".to_owned());
            for hint in repository.topic_discovery_hints(topic_id)? {
                if matches!(
                    hint.get("status").and_then(serde_json::Value::as_str),
                    Some("rejected" | "accepted")
                ) && let Some(identity) = hint_identity(&hint)
                {
                    excluded.insert(identity);
                }
            }
            for adopted in repository.topic_discovery_adopted_identities(topic_id)? {
                excluded.insert(adopted);
            }
            let mut published = 0;
            for candidate in &parsed {
                if excluded.contains(&candidate.item_identity) {
                    continue;
                }
                let Some(group) = repository.retrieval_group(publication, &candidate.group_id)?
                else {
                    continue;
                };
                if group.status != "ready" || group.source_version != candidate.source_version {
                    continue;
                }
                if candidate.interest_basis != current_interest {
                    continue;
                }
                excluded.insert(candidate.item_identity.clone());
                repository.execute(
                    "INSERT OR IGNORE INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at) VALUES(?1,?2,?3)",
                    &[
                        serde_json::json!(candidate.hint_id),
                        serde_json::json!(candidate.payload_json()?),
                        serde_json::json!(updated_at),
                    ],
                )?;
                let resolved = repository.update_topic_discovery_hint_outcome(
                    &candidate.hint_id,
                    "open",
                    &candidate.basis_hash,
                    &candidate.outcome,
                    updated_at,
                )?;
                if resolved
                    .as_ref()
                    .and_then(|payload| payload.get("status"))
                    .and_then(serde_json::Value::as_str)
                    == Some("open")
                {
                    published += 1;
                }
            }
            if published > 0 {
                repository.refresh_topic_discovery_projections(updated_at)?;
            }
            Ok(published)
        })
    }
}

/// Hard-scope filter for a source group's kind, read from its stored source
/// descriptor rather than duplicated into a second column.
fn source_kind_of(source_json: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(source_json)
        .ok()?
        .get("kind")
        .and_then(serde_json::Value::as_str)
        .map(str::to_owned)
}

/// Discovery candidates one publication batch may carry.
pub const RETRIEVAL_MAX_DISCOVERY_CANDIDATES: usize = 100;

struct DiscoveryCandidate {
    hint_id: String,
    item_identity: String,
    group_id: String,
    source_version: String,
    /// Generation basis: Topic content hash plus the interest basis plus the
    /// source version. A screened-out hint only reopens when this changes.
    basis_hash: String,
    /// The Topic projection `interest_metadata_json` the candidates were
    /// generated against, verified against the current projection.
    interest_basis: String,
    outcome: serde_json::Value,
    payload: serde_json::Map<String, serde_json::Value>,
}

impl DiscoveryCandidate {
    fn payload_json(&self) -> Result<String, String> {
        serde_json::to_string(&serde_json::Value::Object(self.payload.clone()))
            .map_err(|_| "invalid_request".to_owned())
    }
}

fn parse_discovery_candidate(
    topic_id: &str,
    value: &serde_json::Value,
) -> Result<DiscoveryCandidate, String> {
    let object = value
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let item_identity = object
        .get("itemIdentity")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let group_id = object
        .get("groupId")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let source_version = object
        .get("sourceVersion")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    if !valid_identity(item_identity)
        || !valid_identity(group_id)
        || source_version.len() > 512
        || source_version.chars().any(char::is_control)
    {
        return Err("invalid_request".into());
    }
    let basis_hash = object
        .get("basisHash")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    if !valid_identity(basis_hash) {
        return Err("invalid_request".into());
    }
    let interest_basis = object
        .get("interestBasis")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_owned();
    let hint_id = match object.get("hintId").and_then(serde_json::Value::as_str) {
        Some(value) => value.to_owned(),
        None => format!("{topic_id}:{item_identity}"),
    };
    if !valid_identity(&hint_id) {
        return Err("invalid_request".into());
    }
    let mut payload = object.clone();
    payload.insert("hint_id".into(), serde_json::json!(hint_id));
    payload.insert("topic_id".into(), serde_json::json!(topic_id));
    payload.insert(
        "literature_item_id".into(),
        serde_json::json!(item_identity),
    );
    payload.insert("status".into(), serde_json::json!("open"));
    payload.remove("basis_hash");
    payload.remove("outcome");
    payload.remove("basisHash");
    payload.remove("interestBasis");
    Ok(DiscoveryCandidate {
        hint_id,
        item_identity: item_identity.to_owned(),
        group_id: group_id.to_owned(),
        source_version: source_version.to_owned(),
        basis_hash: basis_hash.to_owned(),
        interest_basis,
        outcome: value.clone(),
        payload,
    })
}

fn hint_identity(hint: &serde_json::Value) -> Option<String> {
    hint.get("literature_item_id")
        .or_else(|| hint.get("literatureItemId"))
        .and_then(serde_json::Value::as_str)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn adopted_identity(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(text) if !text.is_empty() => Some(text.clone()),
        serde_json::Value::Object(object) => object
            .get("ref")
            .or_else(|| object.get("paperRef"))
            .and_then(serde_json::Value::as_str)
            .filter(|text| !text.is_empty())
            .map(str::to_owned),
        _ => None,
    }
}

fn read_group_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<RetrievalGroupRecord> {
    Ok(RetrievalGroupRecord {
        publication_id: row.get(0)?,
        group_id: row.get(1)?,
        item_identity: row.get(2)?,
        library_id: row.get(3)?,
        source_json: row.get(4)?,
        source_version: row.get(5)?,
        status: row.get(6)?,
    })
}

fn read_fragment_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<RetrievalFragmentRecord> {
    let bytes: Vec<u8> = row.get(10)?;
    let vector = decode_vector(&bytes).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            10,
            rusqlite::types::Type::Blob,
            Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, error)),
        )
    })?;
    Ok(RetrievalFragmentRecord {
        publication_id: row.get(0)?,
        group_id: row.get(1)?,
        fragment_id: row.get(2)?,
        item_identity: row.get(3)?,
        library_id: row.get(4)?,
        source_json: row.get(5)?,
        source_version: row.get(6)?,
        range_start: row.get(7)?,
        range_end: row.get(8)?,
        location_json: row.get(9)?,
        vector,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Repository, RepositoryIdentity, SCHEMA_VERSION, prepare_production_schema};
    use rusqlite::Connection;
    use std::fs;
    use synthesis_test_support::TestRoot;

    fn identity() -> RepositoryIdentity {
        RepositoryIdentity {
            profile_id: "profile:retrieval".into(),
            data_root_id: "data:retrieval".into(),
        }
    }

    fn database_path(label: &str) -> (TestRoot, std::path::PathBuf) {
        let root = TestRoot::new(&format!("synthesis-repository-retrieval-{label}"));
        let path = root.join("state/synthesis.db");
        (root, path)
    }

    fn open(label: &str) -> (TestRoot, std::path::PathBuf, Repository) {
        let (root, path) = database_path(label);
        let repository =
            Repository::initialize_production(&path, identity()).expect("initialize production");
        (root, path, repository)
    }

    fn identity_json() -> String {
        serde_json::json!({
            "modelId":"embed-small",
            "dimensions":3,
            "queryPrefix":"query: ",
            "documentPrefix":"passage: "
        })
        .to_string()
    }

    fn scope_json() -> String {
        serde_json::json!({
            "libraryIds":[1],
            "sourceKinds":["metadata","fulltext","analysis"],
            "includeTopics":false
        })
        .to_string()
    }

    fn source_json() -> String {
        serde_json::json!({"kind":"fulltext","attachmentRef":{"libraryId":1,"key":"ATTACH01"}})
            .to_string()
    }

    fn location_json() -> String {
        serde_json::json!({"unit":"paragraph","field":null,"range":{"start":0,"end":5}}).to_string()
    }
    fn staging(publication_id: &str) -> RetrievalPublicationRecord {
        RetrievalPublicationRecord {
            publication_id: publication_id.into(),
            role: "staging".into(),
            identity_json: identity_json(),
            scope_json: scope_json(),
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
        }
    }

    fn group(publication_id: &str, item: &str, status: &str) -> RetrievalGroupRecord {
        RetrievalGroupRecord {
            publication_id: publication_id.into(),
            group_id: format!("group:{item}"),
            item_identity: item.into(),
            library_id: 1,
            source_json: source_json(),
            source_version: "rev-1".into(),
            status: status.into(),
        }
    }

    fn fragment(
        publication_id: &str,
        item: &str,
        fragment_id: &str,
        vector: &[f32],
    ) -> RetrievalFragmentRecord {
        RetrievalFragmentRecord {
            publication_id: publication_id.into(),
            group_id: format!("group:{item}"),
            fragment_id: fragment_id.into(),
            item_identity: item.into(),
            library_id: 1,
            source_json: source_json(),
            source_version: "rev-1".into(),
            range_start: 0,
            range_end: 5,
            location_json: location_json(),
            vector: vector.to_vec(),
        }
    }

    /// Insert one staging target with the supplied (status, fragments) groups.
    fn stage_target(
        repository: &mut Repository,
        publication_id: &str,
        groups: &[(&str, &str, Vec<Vec<f32>>)],
    ) {
        repository
            .insert_retrieval_publication(&staging(publication_id))
            .expect("insert staging");
        for (item, status, vectors) in groups {
            let record = group(publication_id, item, status);
            repository.put_retrieval_group(&record).expect("put group");
            if vectors.is_empty() {
                continue;
            }
            let fragments = vectors
                .iter()
                .enumerate()
                .map(|(index, vector)| {
                    fragment(
                        publication_id,
                        item,
                        &format!("{publication_id}:{item}:{index}"),
                        vector,
                    )
                })
                .collect::<Vec<_>>();
            repository
                .replace_retrieval_group_fragments(&record, &fragments)
                .expect("replace fragments");
        }
    }

    fn promote(publication_id: &str) -> RetrievalPromotion {
        RetrievalPromotion {
            publication_id: publication_id.into(),
            identity_json: identity_json(),
            scope_json: scope_json(),
            updated_at: "2026-01-02T00:00:00Z".into(),
        }
    }

    #[test]
    fn incremental_generation_rotation_preserves_vectors_and_rejects_old_owner() {
        let (_root, _path, mut repository) = open("generation-rotation");
        stage_target(
            &mut repository,
            "pub:1",
            &[("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .unwrap();
        repository
            .rotate_retrieval_publication("pub:1", "pub:2", "2026-02-01T00:00:00Z")
            .unwrap();
        assert_eq!(
            repository
                .get_retrieval_state()
                .unwrap()
                .unwrap()
                .active_publication_id,
            "pub:2"
        );
        assert_eq!(
            repository.list_retrieval_fragments("pub:2").unwrap()[0].vector,
            vec![1.0, 0.0, 0.0]
        );
        assert!(
            repository
                .get_retrieval_publication("pub:1")
                .unwrap()
                .is_none()
        );
        assert!(
            repository
                .rotate_retrieval_publication("pub:1", "pub:3", "2026-02-02T00:00:00Z")
                .is_err()
        );
        assert_eq!(
            repository
                .get_retrieval_state()
                .unwrap()
                .unwrap()
                .active_publication_id,
            "pub:2"
        );
    }

    #[test]
    fn original_vectors_round_trip_and_survive_reopen() {
        let (_root, path, mut repository) = open("round-trip");
        stage_target(
            &mut repository,
            "pub:1",
            &[
                ("paper:A", "suspended", vec![vec![1.0, 2.5, -3.25]]),
                ("paper:B", "suspended", vec![vec![0.0, 0.5, 4.0]]),
            ],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");
        repository.close().expect("close");

        let reopened =
            Repository::open_production(&path, identity(), "2026-01-03T00:00:00Z").expect("reopen");
        let state = reopened
            .get_retrieval_state()
            .expect("state")
            .expect("ready state");
        assert_eq!(state.status, "ready");
        assert_eq!(state.active_publication_id, "pub:1");
        assert_eq!(state.pending_publication_id, "");
        assert_eq!(state.active_identity_json, identity_json());
        assert_eq!(state.active_scope_json, scope_json());
        assert_eq!(state.updated_at, "2026-01-02T00:00:00Z");

        let fragments = reopened
            .list_retrieval_fragments_for_items("pub:1", &["paper:A".into(), "paper:B".into()])
            .expect("fragments");
        assert_eq!(fragments.len(), 2);
        let first = fragments
            .iter()
            .find(|record| record.item_identity == "paper:A")
            .expect("paper:A fragment");
        // Original little-endian float32 values are the durable authority and
        // must round-trip bit-exactly, not approximately.
        assert_eq!(first.vector, vec![1.0_f32, 2.5, -3.25]);
        assert_eq!(first.range_start, 0);
        assert_eq!(first.range_end, 5);
        assert_eq!(first.location_json, location_json());
    }

    #[test]
    fn foundation_v6_database_migrates_to_v7_with_backup_and_no_initial_index() {
        let (_root, path, repository) = open("migration");
        repository.close().expect("close");
        let backup_root = path.parent().expect("state").join("migration-backups");
        {
            let connection = Connection::open(&path).expect("fixture");
            connection
                .execute_batch(
                    "DROP TABLE synt_retrieval_fragment;
                     DROP TABLE synt_retrieval_group;
                     DROP TABLE synt_retrieval_publication;
                     DROP TABLE synt_retrieval_state;
                     UPDATE synt_schema_meta
                       SET value='synthesis-repository-foundation.v6'
                       WHERE key='repository_foundation_schema_version';",
                )
                .expect("downgrade fixture to v6");
        }

        prepare_production_schema(&path, &backup_root).expect("migrate v6 to v7");
        assert!(
            fs::read_dir(&backup_root)
                .expect("backup root")
                .next()
                .is_some(),
            "a registered migration takes a pre-migration backup"
        );

        let migrated = Repository::open_production(&path, identity(), "2026-01-04T00:00:00Z")
            .expect("reopen migrated");
        assert_eq!(
            migrated.get_retrieval_state().expect("state"),
            None,
            "a fresh install begins with no index"
        );
        let connection = Connection::open(&path).expect("verify tables");
        for table in [
            "synt_retrieval_state",
            "synt_retrieval_publication",
            "synt_retrieval_group",
            "synt_retrieval_fragment",
        ] {
            let present: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .expect("count table");
            assert_eq!(present, 1, "{table} exists after migration");
        }
        let version: String = connection
            .query_row(
                "SELECT value FROM synt_schema_meta
                 WHERE key='repository_foundation_schema_version'",
                [],
                |row| row.get(0),
            )
            .expect("schema version");
        assert_eq!(version, SCHEMA_VERSION);
    }

    #[test]
    fn scoped_suspension_touches_only_the_named_groups() {
        let (_root, _path, mut repository) = open("suspension");
        stage_target(
            &mut repository,
            "pub:1",
            &[
                ("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]]),
                ("paper:B", "suspended", vec![vec![0.0, 1.0, 0.0]]),
            ],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");

        let suspended = repository
            .suspend_retrieval_groups_for_items("pub:1", &["paper:B".into()])
            .expect("suspend");
        assert_eq!(suspended, 1);
        let by_item = repository
            .list_retrieval_groups("pub:1")
            .expect("groups")
            .into_iter()
            .map(|record| (record.item_identity, record.status))
            .collect::<BTreeMap<_, _>>();
        assert_eq!(by_item.get("paper:A").map(String::as_str), Some("ready"));
        assert_eq!(
            by_item.get("paper:B").map(String::as_str),
            Some("suspended")
        );
        assert_eq!(
            repository
                .list_retrieval_fragments_for_items("pub:1", &["paper:B".into()])
                .expect("fragments")
                .len(),
            1,
            "suspension performs no source work and keeps staged fragments"
        );
    }

    #[test]
    fn promotion_demotes_the_replaced_active_for_explicit_cleanup() {
        let (_root, _path, mut repository) = open("cleanup");
        stage_target(
            &mut repository,
            "pub:1",
            &[("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote first");
        stage_target(
            &mut repository,
            "pub:2",
            &[("paper:B", "suspended", vec![vec![0.0, 1.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:2"))
            .expect("promote second");

        let state = repository
            .get_retrieval_state()
            .expect("state")
            .expect("ready");
        assert_eq!(state.status, "ready");
        assert_eq!(state.active_publication_id, "pub:2");
        assert_eq!(
            repository
                .list_retrieval_publications("active")
                .expect("active"),
            vec!["pub:2".to_owned()]
        );
        assert_eq!(
            repository
                .list_retrieval_cleanup_pending()
                .expect("pending"),
            vec!["pub:1".to_owned()]
        );
        assert_eq!(
            repository
                .get_retrieval_publication("pub:1")
                .expect("old publication")
                .map(|record| record.role),
            Some("cleanup_pending".to_owned())
        );
        assert_eq!(
            repository
                .list_retrieval_fragments("pub:1")
                .expect("old fragments")
                .len(),
            1,
            "replaced facts are retained until explicit cleanup"
        );

        repository
            .finalize_retrieval_cleanup("pub:1")
            .expect("cleanup");
        assert!(
            repository
                .get_retrieval_publication("pub:1")
                .expect("gone")
                .is_none()
        );
        assert!(
            repository
                .list_retrieval_fragments("pub:1")
                .expect("fragments")
                .is_empty()
        );
        assert_eq!(
            repository
                .get_retrieval_state()
                .expect("state")
                .expect("ready")
                .active_publication_id,
            "pub:2",
            "cleanup never disturbs the published index"
        );
        assert_eq!(
            repository
                .finalize_retrieval_cleanup("pub:2")
                .expect_err("active is not a cleanup target"),
            "retrieval_cleanup_target_invalid"
        );
    }

    #[test]
    fn expected_absence_publishes_but_failed_or_suspended_groups_do_not() {
        let (_root, _path, mut repository) = open("coverage");
        stage_target(
            &mut repository,
            "pub:ok",
            &[
                ("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]]),
                ("paper:absent", "missing", Vec::new()),
            ],
        );
        repository
            .promote_retrieval_publication(&promote("pub:ok"))
            .expect("an expected-missing group is a coverage gap, not a blocker");

        for (label, status) in [("failed", "failed"), ("suspended", "suspended")] {
            let (_root, _path, mut repository) = open(&format!("coverage-{label}"));
            stage_target(
                &mut repository,
                "pub:bad",
                &[
                    ("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]]),
                    ("paper:B", status, Vec::new()),
                ],
            );
            assert_eq!(
                repository
                    .promote_retrieval_publication(&promote("pub:bad"))
                    .expect_err("unreadable or failed work blocks publication"),
                "retrieval_publication_incomplete",
                "{label}"
            );
        }
    }

    #[test]
    fn only_one_staging_target_exists_per_data_root() {
        let (_root, _path, mut repository) = open("single-staging");
        repository
            .insert_retrieval_publication(&staging("pub:1"))
            .expect("first staging");
        assert_eq!(
            repository
                .insert_retrieval_publication(&staging("pub:2"))
                .expect_err("second staging rejected"),
            "retrieval_publication_conflict"
        );
    }

    #[test]
    fn fragment_counts_avoid_materializing_vectors() {
        let (_root, _path, mut repository) = open("counts");
        stage_target(
            &mut repository,
            "pub:1",
            &[
                ("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]]),
                (
                    "paper:B",
                    "suspended",
                    vec![vec![0.0, 1.0, 0.0], vec![0.0, 0.0, 1.0]],
                ),
            ],
        );
        assert_eq!(
            repository
                .count_retrieval_fragments("pub:1")
                .expect("count"),
            3
        );
        assert_eq!(
            repository
                .count_retrieval_fragments_for_items("pub:1", &["paper:B".into()])
                .expect("scoped count"),
            2
        );
        assert_eq!(
            repository
                .count_retrieval_fragments_for_items("pub:1", &["paper:missing".into()])
                .expect("absent count"),
            0
        );
        assert_eq!(
            repository
                .count_retrieval_fragments("pub:absent")
                .expect("absent publication"),
            0
        );
    }

    #[test]
    fn scope_groups_filter_by_library_and_kind_without_vectors() {
        let (_root, _path, mut repository) = open("scope-groups");
        repository
            .insert_retrieval_publication(&staging("pub:1"))
            .expect("staging");
        for (item, library, kind, status) in [
            ("paper:A", 1, "fulltext", "ready"),
            ("paper:B", 1, "metadata", "ready"),
            ("paper:C", 2, "fulltext", "ready"),
            ("paper:D", 1, "fulltext", "suspended"),
        ] {
            repository
                .put_retrieval_group(&RetrievalGroupRecord {
                    publication_id: "pub:1".into(),
                    group_id: format!("group:{item}"),
                    item_identity: item.into(),
                    library_id: library,
                    source_json: serde_json::json!({"kind":kind}).to_string(),
                    source_version: "rev-1".into(),
                    status: status.into(),
                })
                .expect("group");
        }
        let items = |library_ids: &[i64], kinds: &[&str]| {
            repository
                .list_retrieval_groups_for_scope("pub:1", library_ids, kinds)
                .expect("scope")
                .into_iter()
                .map(|record| record.item_identity)
                .collect::<Vec<_>>()
        };
        assert_eq!(items(&[1], &[]), vec!["paper:A", "paper:B"]);
        assert_eq!(items(&[1], &["fulltext"]), vec!["paper:A"]);
        assert_eq!(items(&[2], &["fulltext"]), vec!["paper:C"]);
        assert_eq!(items(&[1, 2], &["metadata"]), vec!["paper:B"]);
        assert_eq!(
            repository
                .list_retrieval_groups_for_scope("pub:1", &[], &[])
                .expect_err("an empty library scope is invalid"),
            "invalid_request"
        );
    }

    #[test]
    fn invalid_vectors_are_rejected_at_the_write_boundary() {
        let (_root, _path, mut repository) = open("invalid-vectors");
        repository
            .insert_retrieval_publication(&staging("pub:1"))
            .expect("staging");
        let record = group("pub:1", "paper:A", "suspended");
        repository.put_retrieval_group(&record).expect("group");
        for vector in [
            Vec::new(),
            vec![0.0_f32, 0.0, 0.0],
            vec![1.0_f32, f32::NAN, 0.0],
            vec![1.0_f32, f32::INFINITY, 0.0],
        ] {
            let fragments = vec![fragment("pub:1", "paper:A", "frag:bad", &vector)];
            assert_eq!(
                repository
                    .replace_retrieval_group_fragments(&record, &fragments)
                    .expect_err("invalid vector rejected"),
                "retrieval_fragment_invalid"
            );
        }
        assert_eq!(
            repository
                .count_retrieval_fragments("pub:1")
                .expect("count"),
            0,
            "a rejected batch persists nothing"
        );
        assert!(decode_vector(&encode_vector(&[1.0_f32, 0.0])).is_ok());
        assert!(
            decode_vector(&[0_u8; 4]).is_err(),
            "zero norm is refused on decode"
        );
        repository
            .replace_retrieval_group_fragments(
                &record,
                &[fragment("pub:1", "paper:A", "frag:ok", &[0.0, 1.0, 0.0])],
            )
            .expect("a valid vector persists");
        assert_eq!(
            repository
                .count_retrieval_fragments("pub:1")
                .expect("count"),
            1
        );
    }

    #[test]
    fn promotion_rejects_a_basis_mismatch() {
        let (_root, _path, mut repository) = open("promotion-basis");
        stage_target(
            &mut repository,
            "pub:1",
            &[("paper:A", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        let mut drift = promote("pub:1");
        drift.identity_json = serde_json::json!({
            "modelId":"other",
            "dimensions":3,
            "queryPrefix":"q:",
            "documentPrefix":"d:"
        })
        .to_string();
        assert_eq!(
            repository
                .promote_retrieval_publication(&drift)
                .expect_err("identity drift rejected"),
            "retrieval_publication_basis_mismatch"
        );
        repository
            .put_retrieval_state(&RetrievalStateRecord {
                status: "paused".into(),
                pending_publication_id: "pub:other".into(),
                updated_at: "2026-01-02T00:00:00Z".into(),
                ..RetrievalStateRecord::default()
            })
            .expect("state");
        assert_eq!(
            repository
                .promote_retrieval_publication(&promote("pub:1"))
                .expect_err("a stale pending target is rejected"),
            "retrieval_publication_basis_mismatch"
        );
        repository
            .put_retrieval_state(&RetrievalStateRecord {
                status: "paused".into(),
                pending_publication_id: "pub:1".into(),
                updated_at: "2026-01-02T00:00:00Z".into(),
                ..RetrievalStateRecord::default()
            })
            .expect("state");
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("the announced target publishes");
        assert_eq!(
            repository
                .get_retrieval_state()
                .expect("state")
                .expect("ready")
                .status,
            "ready"
        );
    }

    fn topic_state(topic_id: &str, artifact_hash: &str) -> crate::TopicApplicationStateRecord {
        crate::TopicApplicationStateRecord {
            topic_id: topic_id.into(),
            path_id: format!("path-{topic_id}"),
            title: "Topic".into(),
            definition: "Definition".into(),
            language: "en".into(),
            operation: "upsert".into(),
            manifest_hash: "manifest-1".into(),
            artifact_hash: artifact_hash.into(),
            metadata_hash: "metadata-1".into(),
            bundle_hash: "bundle-1".into(),
            paper_count: 1,
            updated_at: "2026-01-01T00:00:00Z".into(),
            ..Default::default()
        }
    }

    fn discovery_candidate(identity: &str) -> serde_json::Value {
        serde_json::json!({
            "itemIdentity": identity,
            "groupId": format!("group:{identity}"),
            "sourceVersion": "rev-1",
            "basisHash": "basis-1",
            "interestBasis": "{}",
            "title": format!("Title {identity}"),
        })
    }

    #[test]
    fn discovery_hint_reads_are_topic_scoped_and_reject_incomplete_coverage() {
        let (_root, _path, repository) = open("discovery-topic-hints");
        for (hint_id, topic_field, topic_id, identity) in [
            ("hint:one", "topic_id", "topic:one", "1:AAAA"),
            ("hint:two", "topicId", "topic:one", "1:BBBB"),
            ("hint:other", "topic_id", "topic:other", "1:CCCC"),
        ] {
            let mut payload =
                serde_json::json!({"literature_item_id":identity,"status":"rejected"});
            payload[topic_field] = serde_json::json!(topic_id);
            repository.execute(
                "INSERT INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at) VALUES(?1,?2,'1')",
                &[serde_json::json!(hint_id), serde_json::json!(payload.to_string())],
            ).unwrap();
        }
        assert_eq!(
            repository
                .retrieval_discovery_excluded_identities("topic:one")
                .unwrap(),
            vec!["1:AAAA", "1:BBBB"]
        );
        assert!(
            repository
                .retrieval_discovery_excluded_identities("topic:absent")
                .unwrap()
                .is_empty()
        );
        repository.execute(
            "WITH RECURSIVE seq(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM seq WHERE n<?1)
             INSERT INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at)
             SELECT 'hint:bounded:'||n,'{\"topic_id\":\"topic:bounded\",\"status\":\"rejected\"}','1' FROM seq",
            &[serde_json::json!(RETRIEVAL_MAX_SCOPED_IDS + 1)],
        ).unwrap();
        assert!(repository.topic_discovery_hints("topic:bounded").is_err());
        assert_eq!(
            repository
                .retrieval_discovery_excluded_identities("topic:one")
                .unwrap()
                .len(),
            2
        );
    }

    #[test]
    fn discovery_publish_revalidates_publication_topic_and_groups() {
        let (_root, _path, mut repository) = open("discovery-publish");
        stage_target(
            &mut repository,
            "pub:1",
            &[
                ("1:KEYA", "suspended", vec![vec![1.0, 0.0, 0.0]]),
                ("1:KEYB", "suspended", vec![vec![0.0, 1.0, 0.0]]),
            ],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");
        repository
            .upsert_topic_application_state(&topic_state("topic:one", "artifact:1"))
            .expect("topic state");
        repository
            .upsert_topic_application_projection(&crate::TopicApplicationProjectionRecord {
                topic_id: "topic:one".into(),
                discovery_json: "{}".into(),
                updated_at: "2026-01-01T00:00:00Z".into(),
                ..Default::default()
            })
            .expect("projection");

        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:other",
                    &[discovery_candidate("1:KEYA")],
                    "2026-02-01T00:00:00Z",
                )
                .expect_err("a different active publication is refused"),
            "retrieval_publication_basis_mismatch"
        );
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:stale",
                    "pub:1",
                    &[discovery_candidate("1:KEYA")],
                    "2026-02-01T00:00:00Z",
                )
                .expect_err("a stale Topic basis is refused"),
            "topic_discovery_basis_mismatch"
        );
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &[
                        discovery_candidate("1:KEYA"),
                        discovery_candidate("1:NOTSTAGED"),
                    ],
                    "2026-02-01T00:00:00Z",
                )
                .expect("publish"),
            1,
            "only the candidate with a ready group publishes"
        );

        repository
            .suspend_retrieval_groups_for_items("pub:1", &["1:KEYB".into()])
            .expect("suspend");
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &[discovery_candidate("1:KEYB")],
                    "2026-02-02T00:00:00Z",
                )
                .expect("publish"),
            0,
            "a suspended source group never publishes"
        );

        let projection = repository
            .get_topic_application_projection("topic:one")
            .expect("projection")
            .expect("projection row");
        let discovery: serde_json::Value =
            serde_json::from_str(&projection.discovery_json).expect("discovery json");
        let hints = discovery["hints"].as_array().expect("hints");
        assert_eq!(hints.len(), 1);
        assert_eq!(hints[0]["literature_item_id"], "1:KEYA");
        assert_eq!(hints[0]["status"], "open");
    }

    #[test]
    fn discovery_publish_preserves_a_user_rejection() {
        let (_root, _path, mut repository) = open("discovery-rejection");
        stage_target(
            &mut repository,
            "pub:1",
            &[("1:KEYA", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");
        repository
            .upsert_topic_application_state(&topic_state("topic:one", "artifact:1"))
            .expect("topic");
        repository
            .upsert_topic_application_projection(&crate::TopicApplicationProjectionRecord {
                topic_id: "topic:one".into(),
                discovery_json: "{}".into(),
                updated_at: "2026-01-01T00:00:00Z".into(),
                ..Default::default()
            })
            .expect("projection");
        let candidates = [discovery_candidate("1:KEYA")];
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &candidates,
                    "2026-02-01T00:00:00Z",
                )
                .expect("publish"),
            1
        );
        repository
            .update_topic_discovery_hint_status(
                "topic:one:1:KEYA",
                "rejected",
                "2026-02-01T01:00:00Z",
            )
            .expect("reject")
            .expect("hint");
        // A regeneration round that races the user rejection must not reopen it.
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &candidates,
                    "2026-02-01T02:00:00Z",
                )
                .expect("publish"),
            0
        );
        repository
            .refresh_topic_discovery_projections("2026-02-01T03:00:00Z")
            .expect("refresh");
        let projection = repository
            .get_topic_application_projection("topic:one")
            .expect("projection")
            .expect("projection row");
        let discovery: serde_json::Value =
            serde_json::from_str(&projection.discovery_json).expect("discovery json");
        assert_eq!(discovery["hints"][0]["status"], "rejected");
    }

    #[test]
    fn discovery_publish_excludes_adopted_sources() {
        let (_root, _path, mut repository) = open("discovery-adopted");
        stage_target(
            &mut repository,
            "pub:1",
            &[("1:KEYA", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");
        repository
            .upsert_topic_application_state(&topic_state("topic:one", "artifact:1"))
            .expect("topic");
        repository
            .upsert_topic_application_projection(&crate::TopicApplicationProjectionRecord {
                topic_id: "topic:one".into(),
                discovery_json: serde_json::json!({
                    "source_paper_refs": ["1:KEYA"],
                })
                .to_string(),
                updated_at: "2026-02-01T00:00:00Z".into(),
                ..Default::default()
            })
            .expect("projection");
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &[discovery_candidate("1:KEYA")],
                    "2026-02-01T00:00:00Z",
                )
                .expect("publish"),
            0,
            "an already adopted source is never re-proposed"
        );
    }

    #[test]
    fn discovery_publish_skips_a_stale_interest_basis() {
        let (_root, _path, mut repository) = open("discovery-interest");
        stage_target(
            &mut repository,
            "pub:1",
            &[("1:KEYA", "suspended", vec![vec![1.0, 0.0, 0.0]])],
        );
        repository
            .promote_retrieval_publication(&promote("pub:1"))
            .expect("promote");
        repository
            .upsert_topic_application_state(&topic_state("topic:one", "artifact:1"))
            .expect("topic");
        repository
            .upsert_topic_application_projection(&crate::TopicApplicationProjectionRecord {
                topic_id: "topic:one".into(),
                interest_metadata_json: serde_json::json!({"version":"v1"}).to_string(),
                discovery_json: "{}".into(),
                updated_at: "2026-02-01T00:00:00Z".into(),
                ..Default::default()
            })
            .expect("projection");
        let candidate = |interest: &str| {
            serde_json::json!({
                "itemIdentity": "1:KEYA",
                "groupId": "group:1:KEYA",
                "sourceVersion": "rev-1",
                "basisHash": "basis-1",
                "interestBasis": interest,
            })
        };
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &[candidate("{}")],
                    "2026-02-01T01:00:00Z",
                )
                .expect("publish"),
            0,
            "a candidate generated under another interest basis is stale"
        );
        assert_eq!(
            repository
                .publish_retrieval_discovery_candidates(
                    "topic:one",
                    "artifact:1",
                    "pub:1",
                    &[candidate("{\"version\":\"v1\"}")],
                    "2026-02-01T02:00:00Z",
                )
                .expect("publish"),
            1,
            "the current interest basis publishes"
        );
    }
}
