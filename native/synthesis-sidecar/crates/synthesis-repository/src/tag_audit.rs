use rusqlite::{OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::Repository;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagAuditRunRecord {
    pub audit_run_id: String,
    pub library_id: i64,
    pub status: String,
    pub lease_token: String,
    pub host_instance_id: String,
    pub package_id: String,
    pub workflow_id: String,
    pub content_digest: String,
    pub vocabulary_hash: String,
    pub basis_digest: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagAuditStagingRecord {
    pub audit_run_id: String,
    pub library_id: i64,
    pub item_key: String,
    pub audited_revision: String,
    pub audited_tag_digest: String,
    pub evaluation_state: String,
    pub non_compliant_tags_json: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TagAuditAppendOutcome {
    Appended { staged_items: usize },
    AlreadyAppended { staged_items: usize },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagAuditSnapshotRecord {
    pub library_id: i64,
    pub snapshot_revision: String,
    pub vocabulary_hash: String,
    pub basis_digest: String,
    pub coverage_digest: String,
    pub audited_items: i64,
    pub needs_regulation: i64,
    pub source_run_id: String,
    pub published_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagAuditActiveRecord {
    pub library_id: i64,
    pub item_key: String,
    pub snapshot_revision: String,
    pub audited_revision: String,
    pub audited_tag_digest: String,
    pub non_compliant_tags_json: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TagRegulationVerifiedCommitRecord {
    pub library_id: i64,
    pub item_key: String,
    pub receipt_id: String,
    pub expected_snapshot_revision: String,
    pub audited_revision: String,
    pub current_revision: String,
    pub final_tag_digest: String,
    pub vocabulary_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TagRegulationAcknowledgementPrepareOutcome {
    Ready {
        active: TagAuditActiveRecord,
        snapshot: Box<TagAuditSnapshotRecord>,
    },
    AlreadyAcknowledged {
        snapshot_revision: String,
    },
    NotFound,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TagRegulationCommitOutcome {
    Acknowledged {
        snapshot_revision: String,
        remaining_needs_regulation: i64,
    },
    AlreadyAcknowledged {
        snapshot_revision: String,
    },
    StaleAuditSnapshotChanged,
    StaleVocabularyChanged,
    ConflictAuditedRevisionMismatch,
    NotFound,
}

impl Repository {
    pub fn abandon_tag_audit_runs_for_other_hosts(
        &mut self,
        library_id: i64,
        current_host_instance_id: &str,
        now: &str,
    ) -> Result<usize, String> {
        self.transaction(|repository| {
            let run_ids = {
                let mut statement = repository
                    .connection()?
                    .prepare(
                        "SELECT audit_run_id FROM synt_tag_audit_run
                         WHERE library_id=?1 AND status='open' AND host_instance_id<>?2",
                    )
                    .map_err(|error| format!("repository_query:{error}"))?;
                statement
                    .query_map(params![library_id, current_host_instance_id], |row| {
                        row.get::<_, String>(0)
                    })
                    .map_err(|error| format!("repository_query:{error}"))?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|error| format!("repository_query:{error}"))?
            };
            for run_id in &run_ids {
                repository
                    .connection()?
                    .execute(
                        "UPDATE synt_tag_audit_run
                         SET status='abandoned',lease_library_id=NULL,
                             cleanup_status='complete',terminal_reason='host_restarted',updated_at=?1
                         WHERE audit_run_id=?2 AND status='open'",
                        params![now, run_id],
                    )
                    .map_err(|error| format!("repository_write:{error}"))?;
                repository
                    .connection()?
                    .execute(
                        "DELETE FROM synt_tag_audit_batch WHERE audit_run_id=?1",
                        params![run_id],
                    )
                    .map_err(|error| format!("repository_write:{error}"))?;
                repository
                    .connection()?
                    .execute(
                        "DELETE FROM synt_tag_audit_staging WHERE audit_run_id=?1",
                        params![run_id],
                    )
                    .map_err(|error| format!("repository_write:{error}"))?;
            }
            Ok(run_ids.len())
        })
    }

    pub fn begin_tag_audit_run(&mut self, record: &TagAuditRunRecord) -> Result<bool, String> {
        let changed = self.execute(
            "INSERT OR IGNORE INTO synt_tag_audit_run(
               audit_run_id,library_id,lease_library_id,status,lease_token,
               host_instance_id,package_id,workflow_id,content_digest,
               vocabulary_hash,basis_digest,created_at,updated_at
             ) VALUES(?1,?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            &[
                json!(record.audit_run_id),
                json!(record.library_id),
                json!(record.status),
                json!(record.lease_token),
                json!(record.host_instance_id),
                json!(record.package_id),
                json!(record.workflow_id),
                json!(record.content_digest),
                json!(record.vocabulary_hash),
                json!(record.basis_digest),
                json!(record.created_at),
                json!(record.updated_at),
            ],
        )?;
        Ok(changed == 1)
    }

    pub fn append_tag_audit_batch(
        &mut self,
        audit_run_id: &str,
        lease_token: &str,
        sequence: i64,
        batch_digest: &str,
        entries: &[TagAuditStagingRecord],
    ) -> Result<TagAuditAppendOutcome, String> {
        self.transaction(|repository| {
            let (library_id, status, stored_lease, next_sequence, staged_items) = repository
                .connection()?
                .query_row(
                    "SELECT library_id,status,lease_token,next_sequence,staged_items
                     FROM synt_tag_audit_run WHERE audit_run_id=?1",
                    params![audit_run_id],
                    |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, i64>(3)?,
                            row.get::<_, i64>(4)?,
                        ))
                    },
                )
                .map_err(|_| "tag_audit_run_not_found".to_owned())?;
            if status != "open" || stored_lease != lease_token {
                return Err("tag_audit_run_fenced".into());
            }
            let replay = repository
                .connection()?
                .query_row(
                    "SELECT batch_digest,row_count FROM synt_tag_audit_batch
                     WHERE audit_run_id=?1 AND sequence=?2",
                    params![audit_run_id, sequence],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
                )
                .optional()
                .map_err(|error| format!("repository_query:{error}"))?;
            if let Some((stored_digest, stored_rows)) = replay {
                if stored_digest == batch_digest && stored_rows == entries.len() as i64 {
                    return Ok(TagAuditAppendOutcome::AlreadyAppended {
                        staged_items: staged_items as usize,
                    });
                }
                return Err("tag_audit_batch_conflict".into());
            }
            if sequence != next_sequence {
                return Err("tag_audit_sequence_conflict".into());
            }
            for entry in entries {
                if entry.audit_run_id != audit_run_id || entry.library_id != library_id {
                    return Err("tag_audit_target_mismatch".into());
                }
                repository
                    .connection()?
                    .execute(
                        "INSERT INTO synt_tag_audit_staging(
                           audit_run_id,library_id,item_key,audited_revision,
                           audited_tag_digest,evaluation_state,non_compliant_tags_json
                         ) VALUES(?1,?2,?3,?4,?5,?6,?7)",
                        params![
                            entry.audit_run_id,
                            entry.library_id,
                            entry.item_key,
                            entry.audited_revision,
                            entry.audited_tag_digest,
                            entry.evaluation_state,
                            entry.non_compliant_tags_json,
                        ],
                    )
                    .map_err(|_| "tag_audit_target_conflict".to_owned())?;
            }
            repository
                .connection()?
                .execute(
                    "INSERT INTO synt_tag_audit_batch(audit_run_id,sequence,batch_digest,row_count)
                     VALUES(?1,?2,?3,?4)",
                    params![audit_run_id, sequence, batch_digest, entries.len() as i64],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            let next_staged = staged_items + entries.len() as i64;
            repository
                .connection()?
                .execute(
                    "UPDATE synt_tag_audit_run SET next_sequence=?1,staged_items=?2
                     WHERE audit_run_id=?3",
                    params![sequence + 1, next_staged, audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            Ok(TagAuditAppendOutcome::Appended {
                staged_items: next_staged as usize,
            })
        })
    }

    pub fn abort_tag_audit_run(
        &mut self,
        audit_run_id: &str,
        lease_token: &str,
        reason: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let run = repository
                .connection()?
                .query_row(
                    "SELECT status,lease_token FROM synt_tag_audit_run WHERE audit_run_id=?1",
                    params![audit_run_id],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
                )
                .optional()
                .map_err(|error| format!("repository_query:{error}"))?;
            let Some((status, stored_lease)) = run else {
                return Err("tag_audit_run_not_found".into());
            };
            if status != "open" {
                return Ok(false);
            }
            if stored_lease != lease_token {
                return Err("tag_audit_run_fenced".into());
            }
            repository
                .connection()?
                .execute(
                    "UPDATE synt_tag_audit_run
                     SET status='aborted',lease_library_id=NULL,cleanup_status='complete',
                         terminal_reason=?1,updated_at=?2
                     WHERE audit_run_id=?3 AND status='open' AND lease_token=?4",
                    params![reason, now, audit_run_id, lease_token],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_batch WHERE audit_run_id=?1",
                    params![audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_staging WHERE audit_run_id=?1",
                    params![audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            Ok(true)
        })
    }

    pub fn promote_tag_audit_run(
        &mut self,
        audit_run_id: &str,
        lease_token: &str,
        snapshot: &TagAuditSnapshotRecord,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let run = repository
                .connection()?
                .query_row(
                    "SELECT library_id,status,lease_token,vocabulary_hash,basis_digest,staged_items
                     FROM synt_tag_audit_run WHERE audit_run_id=?1",
                    params![audit_run_id],
                    |row| {
                        Ok((
                            row.get::<_, i64>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, String>(3)?,
                            row.get::<_, String>(4)?,
                            row.get::<_, i64>(5)?,
                        ))
                    },
                )
                .map_err(|_| "tag_audit_run_not_found".to_owned())?;
            if run.1 == "promoted" {
                return Ok(run.0 == snapshot.library_id && snapshot.source_run_id == audit_run_id);
            }
            if run.1 != "open" || run.2 != lease_token {
                return Err("tag_audit_run_fenced".into());
            }
            if run.0 != snapshot.library_id
                || run.3 != snapshot.vocabulary_hash
                || run.4 != snapshot.basis_digest
                || run.5 != snapshot.audited_items
                || snapshot.source_run_id != audit_run_id
            {
                return Err("tag_audit_basis_conflict".into());
            }
            let needs = repository
                .connection()?
                .query_row(
                    "SELECT COUNT(*) FROM synt_tag_audit_staging
                     WHERE audit_run_id=?1 AND evaluation_state='needs_regulation'",
                    params![audit_run_id],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(|error| format!("repository_query:{error}"))?;
            if needs != snapshot.needs_regulation {
                return Err("tag_audit_basis_conflict".into());
            }
            repository
                .connection()?
                .execute(
                    "INSERT INTO synt_tag_audit_snapshot(
                       library_id,snapshot_revision,vocabulary_hash,basis_digest,
                       coverage_digest,audited_items,needs_regulation,source_run_id,
                       published_at,updated_at
                     ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
                     ON CONFLICT(library_id) DO UPDATE SET
                       snapshot_revision=excluded.snapshot_revision,
                       vocabulary_hash=excluded.vocabulary_hash,
                       basis_digest=excluded.basis_digest,
                       coverage_digest=excluded.coverage_digest,
                       audited_items=excluded.audited_items,
                       needs_regulation=excluded.needs_regulation,
                       source_run_id=excluded.source_run_id,
                       published_at=excluded.published_at,
                       updated_at=excluded.updated_at",
                    params![
                        snapshot.library_id,
                        snapshot.snapshot_revision,
                        snapshot.vocabulary_hash,
                        snapshot.basis_digest,
                        snapshot.coverage_digest,
                        snapshot.audited_items,
                        snapshot.needs_regulation,
                        snapshot.source_run_id,
                        snapshot.published_at,
                        snapshot.updated_at,
                    ],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_active WHERE library_id=?1",
                    params![snapshot.library_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "INSERT INTO synt_tag_audit_active(
                       library_id,item_key,snapshot_revision,audited_revision,
                       audited_tag_digest,non_compliant_tags_json
                     )
                     SELECT library_id,item_key,?1,audited_revision,
                            audited_tag_digest,non_compliant_tags_json
                     FROM synt_tag_audit_staging
                     WHERE audit_run_id=?2 AND evaluation_state='needs_regulation'",
                    params![snapshot.snapshot_revision, audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "UPDATE synt_tag_audit_run
                     SET status='promoted',lease_library_id=NULL,cleanup_status='complete',updated_at=?1
                     WHERE audit_run_id=?2",
                    params![snapshot.updated_at, audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_batch WHERE audit_run_id=?1",
                    params![audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_staging WHERE audit_run_id=?1",
                    params![audit_run_id],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            Ok(true)
        })
    }

    pub fn get_tag_audit_snapshot(
        &self,
        library_id: i64,
    ) -> Result<Option<TagAuditSnapshotRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT library_id,snapshot_revision,vocabulary_hash,basis_digest,
                        coverage_digest,audited_items,needs_regulation,source_run_id,
                        published_at,updated_at
                 FROM synt_tag_audit_snapshot WHERE library_id=?1",
                params![library_id],
                |row| {
                    Ok(TagAuditSnapshotRecord {
                        library_id: row.get(0)?,
                        snapshot_revision: row.get(1)?,
                        vocabulary_hash: row.get(2)?,
                        basis_digest: row.get(3)?,
                        coverage_digest: row.get(4)?,
                        audited_items: row.get(5)?,
                        needs_regulation: row.get(6)?,
                        source_run_id: row.get(7)?,
                        published_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                },
            )
            .optional()
            .map_err(|error| format!("repository_query:{error}"))
    }

    pub fn get_tag_audit_run(
        &self,
        audit_run_id: &str,
    ) -> Result<Option<TagAuditRunRecord>, String> {
        self.connection()?
            .query_row(
                "SELECT audit_run_id,library_id,status,lease_token,host_instance_id,
                        package_id,workflow_id,content_digest,vocabulary_hash,basis_digest,
                        created_at,updated_at
                 FROM synt_tag_audit_run WHERE audit_run_id=?1",
                params![audit_run_id],
                |row| {
                    Ok(TagAuditRunRecord {
                        audit_run_id: row.get(0)?,
                        library_id: row.get(1)?,
                        status: row.get(2)?,
                        lease_token: row.get(3)?,
                        host_instance_id: row.get(4)?,
                        package_id: row.get(5)?,
                        workflow_id: row.get(6)?,
                        content_digest: row.get(7)?,
                        vocabulary_hash: row.get(8)?,
                        basis_digest: row.get(9)?,
                        created_at: row.get(10)?,
                        updated_at: row.get(11)?,
                    })
                },
            )
            .optional()
            .map_err(|error| format!("repository_query:{error}"))
    }

    pub fn list_tag_audit_staging(
        &self,
        audit_run_id: &str,
    ) -> Result<Vec<TagAuditStagingRecord>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT audit_run_id,library_id,item_key,audited_revision,
                        audited_tag_digest,evaluation_state,non_compliant_tags_json
                 FROM synt_tag_audit_staging WHERE audit_run_id=?1
                 ORDER BY library_id,item_key",
            )
            .map_err(|error| format!("repository_query:{error}"))?;
        statement
            .query_map(params![audit_run_id], |row| {
                Ok(TagAuditStagingRecord {
                    audit_run_id: row.get(0)?,
                    library_id: row.get(1)?,
                    item_key: row.get(2)?,
                    audited_revision: row.get(3)?,
                    audited_tag_digest: row.get(4)?,
                    evaluation_state: row.get(5)?,
                    non_compliant_tags_json: row.get(6)?,
                })
            })
            .map_err(|error| format!("repository_query:{error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("repository_query:{error}"))
    }

    pub fn list_active_tag_audits(
        &self,
        library_id: i64,
    ) -> Result<Vec<TagAuditActiveRecord>, String> {
        let mut statement = self
            .connection()?
            .prepare(
                "SELECT library_id,item_key,snapshot_revision,audited_revision,
                        audited_tag_digest,non_compliant_tags_json
                 FROM synt_tag_audit_active WHERE library_id=?1 ORDER BY item_key",
            )
            .map_err(|error| format!("repository_query:{error}"))?;
        statement
            .query_map(params![library_id], |row| {
                Ok(TagAuditActiveRecord {
                    library_id: row.get(0)?,
                    item_key: row.get(1)?,
                    snapshot_revision: row.get(2)?,
                    audited_revision: row.get(3)?,
                    audited_tag_digest: row.get(4)?,
                    non_compliant_tags_json: row.get(5)?,
                })
            })
            .map_err(|error| format!("repository_query:{error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("repository_query:{error}"))
    }

    pub fn prepare_tag_regulation_acknowledgement(
        &self,
        library_id: i64,
        item_key: &str,
        receipt_id: &str,
    ) -> Result<TagRegulationAcknowledgementPrepareOutcome, String> {
        let active = self
            .connection()?
            .query_row(
                "SELECT library_id,item_key,snapshot_revision,audited_revision,
                        audited_tag_digest,non_compliant_tags_json
                 FROM synt_tag_audit_active WHERE library_id=?1 AND item_key=?2",
                params![library_id, item_key],
                |row| {
                    Ok(TagAuditActiveRecord {
                        library_id: row.get(0)?,
                        item_key: row.get(1)?,
                        snapshot_revision: row.get(2)?,
                        audited_revision: row.get(3)?,
                        audited_tag_digest: row.get(4)?,
                        non_compliant_tags_json: row.get(5)?,
                    })
                },
            )
            .optional()
            .map_err(|error| format!("repository_query:{error}"))?;
        if let Some(active) = active {
            let Some(snapshot) = self.get_tag_audit_snapshot(library_id)? else {
                return Err("tag_audit_snapshot_missing".into());
            };
            if active.snapshot_revision != snapshot.snapshot_revision {
                return Err("tag_audit_snapshot_mismatch".into());
            }
            return Ok(TagRegulationAcknowledgementPrepareOutcome::Ready {
                active,
                snapshot: Box::new(snapshot),
            });
        }
        let acknowledged = self
            .connection()?
            .query_row(
                "SELECT acknowledged_snapshot_revision
                 FROM synt_tag_regulation_ack
                 WHERE receipt_id=?1 AND library_id=?2 AND item_key=?3
                 ORDER BY acknowledged_at DESC LIMIT 1",
                params![receipt_id, library_id, item_key],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("repository_query:{error}"))?;
        Ok(match acknowledged {
            Some(snapshot_revision) => {
                TagRegulationAcknowledgementPrepareOutcome::AlreadyAcknowledged {
                    snapshot_revision,
                }
            }
            None => TagRegulationAcknowledgementPrepareOutcome::NotFound,
        })
    }

    pub fn commit_tag_regulation_acknowledgement(
        &mut self,
        commit: &TagRegulationVerifiedCommitRecord,
        next_snapshot_revision: &str,
        now: &str,
    ) -> Result<TagRegulationCommitOutcome, String> {
        self.transaction(|repository| {
            let acknowledged = repository
                .connection()?
                .query_row(
                    "SELECT acknowledged_snapshot_revision
                     FROM synt_tag_regulation_ack
                     WHERE receipt_id=?1 AND library_id=?2 AND item_key=?3
                       AND original_snapshot_revision=?4",
                    params![
                        commit.receipt_id,
                        commit.library_id,
                        commit.item_key,
                        commit.expected_snapshot_revision,
                    ],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| format!("repository_query:{error}"))?;
            if let Some(snapshot_revision) = acknowledged {
                return Ok(TagRegulationCommitOutcome::AlreadyAcknowledged { snapshot_revision });
            }
            let Some(snapshot) = repository.get_tag_audit_snapshot(commit.library_id)? else {
                return Ok(TagRegulationCommitOutcome::NotFound);
            };
            if snapshot.snapshot_revision != commit.expected_snapshot_revision {
                return Ok(TagRegulationCommitOutcome::StaleAuditSnapshotChanged);
            }
            if snapshot.vocabulary_hash != commit.vocabulary_hash {
                return Ok(TagRegulationCommitOutcome::StaleVocabularyChanged);
            }
            let active = repository
                .connection()?
                .query_row(
                    "SELECT audited_revision FROM synt_tag_audit_active
                     WHERE library_id=?1 AND item_key=?2 AND snapshot_revision=?3",
                    params![
                        commit.library_id,
                        commit.item_key,
                        commit.expected_snapshot_revision,
                    ],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| format!("repository_query:{error}"))?;
            let Some(audited_revision) = active else {
                return Ok(TagRegulationCommitOutcome::NotFound);
            };
            if audited_revision != commit.audited_revision {
                return Ok(TagRegulationCommitOutcome::ConflictAuditedRevisionMismatch);
            }
            let deleted = repository
                .connection()?
                .execute(
                    "DELETE FROM synt_tag_audit_active
                     WHERE library_id=?1 AND item_key=?2 AND snapshot_revision=?3
                       AND audited_revision=?4",
                    params![
                        commit.library_id,
                        commit.item_key,
                        commit.expected_snapshot_revision,
                        commit.audited_revision,
                    ],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            if deleted != 1 {
                return Ok(TagRegulationCommitOutcome::StaleAuditSnapshotChanged);
            }
            let remaining = repository
                .connection()?
                .query_row(
                    "SELECT COUNT(*) FROM synt_tag_audit_active WHERE library_id=?1",
                    params![commit.library_id],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(|error| format!("repository_query:{error}"))?;
            repository
                .connection()?
                .execute(
                    "UPDATE synt_tag_audit_snapshot
                     SET snapshot_revision=?1,needs_regulation=?2,updated_at=?3
                     WHERE library_id=?4 AND snapshot_revision=?5",
                    params![
                        next_snapshot_revision,
                        remaining,
                        now,
                        commit.library_id,
                        commit.expected_snapshot_revision,
                    ],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "UPDATE synt_tag_audit_active SET snapshot_revision=?1
                     WHERE library_id=?2 AND snapshot_revision=?3",
                    params![
                        next_snapshot_revision,
                        commit.library_id,
                        commit.expected_snapshot_revision,
                    ],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            repository
                .connection()?
                .execute(
                    "INSERT INTO synt_tag_regulation_ack(
                       receipt_id,library_id,item_key,original_snapshot_revision,
                       acknowledged_snapshot_revision,current_revision,final_tag_digest,
                       acknowledged_at
                     ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                    params![
                        commit.receipt_id,
                        commit.library_id,
                        commit.item_key,
                        commit.expected_snapshot_revision,
                        next_snapshot_revision,
                        commit.current_revision,
                        commit.final_tag_digest,
                        now,
                    ],
                )
                .map_err(|error| format!("repository_write:{error}"))?;
            Ok(TagRegulationCommitOutcome::Acknowledged {
                snapshot_revision: next_snapshot_revision.into(),
                remaining_needs_regulation: remaining,
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::super::{
        Repository, RepositoryIdentity, TagAuditAppendOutcome, TagAuditRunRecord,
        TagAuditSnapshotRecord, TagAuditStagingRecord, TagRegulationAcknowledgementPrepareOutcome,
        TagRegulationCommitOutcome, TagRegulationVerifiedCommitRecord,
    };
    use std::fs;
    use std::path::PathBuf;

    fn open(label: &str) -> (PathBuf, Repository) {
        let root = std::env::temp_dir().join(format!(
            "synthesis-tag-audit-{label}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile-r7".into(),
                data_root_id: "data-r7".into(),
            },
        )
        .expect("open repository");
        (root, repository)
    }

    #[test]
    fn only_one_open_audit_run_owns_a_library() {
        let (root, mut repository) = open("single-owner");
        let record = |run_id: &str| TagAuditRunRecord {
            audit_run_id: run_id.into(),
            library_id: 1,
            status: "open".into(),
            lease_token: format!("lease-{run_id}"),
            host_instance_id: "host-1".into(),
            package_id: "package-1".into(),
            workflow_id: "workflow-1".into(),
            content_digest: "content-1".into(),
            vocabulary_hash: "vocabulary-1".into(),
            basis_digest: "basis-1".into(),
            created_at: "2026-08-30T00:00:00.000Z".into(),
            updated_at: "2026-08-30T00:00:00.000Z".into(),
        };

        assert!(repository.begin_tag_audit_run(&record("run-1")).unwrap());
        assert!(!repository.begin_tag_audit_run(&record("run-2")).unwrap());

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn append_is_batch_idempotent_and_rejects_conflicting_replay() {
        let (root, mut repository) = open("append");
        let run = TagAuditRunRecord {
            audit_run_id: "run-1".into(),
            library_id: 1,
            status: "open".into(),
            lease_token: "lease-1".into(),
            host_instance_id: "host-1".into(),
            package_id: "package-1".into(),
            workflow_id: "workflow-1".into(),
            content_digest: "content-1".into(),
            vocabulary_hash: "vocabulary-1".into(),
            basis_digest: "basis-1".into(),
            created_at: "2026-08-30T00:00:00.000Z".into(),
            updated_at: "2026-08-30T00:00:00.000Z".into(),
        };
        repository.begin_tag_audit_run(&run).unwrap();
        let entries = [TagAuditStagingRecord {
            audit_run_id: "run-1".into(),
            library_id: 1,
            item_key: "AAAA1111".into(),
            audited_revision: "revision-1".into(),
            audited_tag_digest: "digest-1".into(),
            evaluation_state: "needs_regulation".into(),
            non_compliant_tags_json: "[\"topic:agents\"]".into(),
        }];

        assert_eq!(
            repository
                .append_tag_audit_batch("run-1", "lease-1", 0, "batch-1", &entries)
                .unwrap(),
            TagAuditAppendOutcome::Appended { staged_items: 1 }
        );
        assert_eq!(
            repository
                .append_tag_audit_batch("run-1", "lease-1", 0, "batch-1", &entries)
                .unwrap(),
            TagAuditAppendOutcome::AlreadyAppended { staged_items: 1 }
        );
        assert_eq!(
            repository
                .append_tag_audit_batch("run-1", "lease-1", 0, "different", &entries)
                .unwrap_err(),
            "tag_audit_batch_conflict"
        );

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn promotion_atomically_replaces_active_rows_and_publishes_empty_snapshots() {
        let (root, mut repository) = open("promotion");
        let run = |run_id: &str, lease: &str| TagAuditRunRecord {
            audit_run_id: run_id.into(),
            library_id: 1,
            status: "open".into(),
            lease_token: lease.into(),
            host_instance_id: "host-1".into(),
            package_id: "package-1".into(),
            workflow_id: "workflow-1".into(),
            content_digest: "content-1".into(),
            vocabulary_hash: "vocabulary-1".into(),
            basis_digest: "basis-1".into(),
            created_at: "2026-08-30T00:00:00.000Z".into(),
            updated_at: "2026-08-30T00:00:00.000Z".into(),
        };
        repository
            .begin_tag_audit_run(&run("run-1", "lease-1"))
            .unwrap();
        repository
            .append_tag_audit_batch(
                "run-1",
                "lease-1",
                0,
                "batch-1",
                &[
                    TagAuditStagingRecord {
                        audit_run_id: "run-1".into(),
                        library_id: 1,
                        item_key: "AAAA1111".into(),
                        audited_revision: "revision-1".into(),
                        audited_tag_digest: "digest-1".into(),
                        evaluation_state: "needs_regulation".into(),
                        non_compliant_tags_json: "[\"topic:agents\"]".into(),
                    },
                    TagAuditStagingRecord {
                        audit_run_id: "run-1".into(),
                        library_id: 1,
                        item_key: "BBBB2222".into(),
                        audited_revision: "revision-2".into(),
                        audited_tag_digest: "digest-2".into(),
                        evaluation_state: "compliant".into(),
                        non_compliant_tags_json: "[]".into(),
                    },
                ],
            )
            .unwrap();
        let snapshot = TagAuditSnapshotRecord {
            library_id: 1,
            snapshot_revision: "snapshot-1".into(),
            vocabulary_hash: "vocabulary-1".into(),
            basis_digest: "basis-1".into(),
            coverage_digest: "coverage-1".into(),
            audited_items: 2,
            needs_regulation: 1,
            source_run_id: "run-1".into(),
            published_at: "2026-08-30T00:01:00.000Z".into(),
            updated_at: "2026-08-30T00:01:00.000Z".into(),
        };
        assert!(
            repository
                .promote_tag_audit_run("run-1", "lease-1", &snapshot)
                .unwrap()
        );
        assert_eq!(repository.list_active_tag_audits(1).unwrap().len(), 1);
        assert_eq!(
            repository.get_tag_audit_snapshot(1).unwrap(),
            Some(snapshot.clone())
        );

        repository
            .begin_tag_audit_run(&run("run-2", "lease-2"))
            .unwrap();
        let empty = TagAuditSnapshotRecord {
            snapshot_revision: "snapshot-2".into(),
            audited_items: 0,
            needs_regulation: 0,
            source_run_id: "run-2".into(),
            published_at: "2026-08-30T00:02:00.000Z".into(),
            updated_at: "2026-08-30T00:02:00.000Z".into(),
            ..snapshot.clone()
        };
        assert!(
            repository
                .promote_tag_audit_run("run-2", "lease-2", &empty)
                .unwrap()
        );
        assert!(repository.list_active_tag_audits(1).unwrap().is_empty());
        assert_eq!(repository.get_tag_audit_snapshot(1).unwrap(), Some(empty));

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn acknowledgement_is_snapshot_bound_and_idempotent() {
        let (root, mut repository) = open("acknowledgement");
        let run = TagAuditRunRecord {
            audit_run_id: "run-1".into(),
            library_id: 1,
            status: "open".into(),
            lease_token: "lease-1".into(),
            host_instance_id: "host-1".into(),
            package_id: "package-1".into(),
            workflow_id: "workflow-1".into(),
            content_digest: "content-1".into(),
            vocabulary_hash: "vocabulary-1".into(),
            basis_digest: "basis-1".into(),
            created_at: "2026-08-30T00:00:00.000Z".into(),
            updated_at: "2026-08-30T00:00:00.000Z".into(),
        };
        repository.begin_tag_audit_run(&run).unwrap();
        repository
            .append_tag_audit_batch(
                "run-1",
                "lease-1",
                0,
                "batch-1",
                &[TagAuditStagingRecord {
                    audit_run_id: "run-1".into(),
                    library_id: 1,
                    item_key: "AAAA1111".into(),
                    audited_revision: "revision-1".into(),
                    audited_tag_digest: "digest-1".into(),
                    evaluation_state: "needs_regulation".into(),
                    non_compliant_tags_json: "[\"topic:agents\"]".into(),
                }],
            )
            .unwrap();
        repository
            .promote_tag_audit_run(
                "run-1",
                "lease-1",
                &TagAuditSnapshotRecord {
                    library_id: 1,
                    snapshot_revision: "snapshot-1".into(),
                    vocabulary_hash: "vocabulary-1".into(),
                    basis_digest: "basis-1".into(),
                    coverage_digest: "coverage-1".into(),
                    audited_items: 1,
                    needs_regulation: 1,
                    source_run_id: "run-1".into(),
                    published_at: "2026-08-30T00:01:00.000Z".into(),
                    updated_at: "2026-08-30T00:01:00.000Z".into(),
                },
            )
            .unwrap();

        assert!(matches!(
            repository
                .prepare_tag_regulation_acknowledgement(1, "AAAA1111", "receipt-1")
                .unwrap(),
            TagRegulationAcknowledgementPrepareOutcome::Ready { .. }
        ));
        let commit = TagRegulationVerifiedCommitRecord {
            library_id: 1,
            item_key: "AAAA1111".into(),
            receipt_id: "receipt-1".into(),
            expected_snapshot_revision: "snapshot-1".into(),
            audited_revision: "revision-1".into(),
            current_revision: "revision-2".into(),
            final_tag_digest: "digest-2".into(),
            vocabulary_hash: "vocabulary-1".into(),
        };
        assert_eq!(
            repository
                .commit_tag_regulation_acknowledgement(
                    &commit,
                    "snapshot-2",
                    "2026-08-30T00:02:00.000Z"
                )
                .unwrap(),
            TagRegulationCommitOutcome::Acknowledged {
                snapshot_revision: "snapshot-2".into(),
                remaining_needs_regulation: 0,
            }
        );
        assert!(repository.list_active_tag_audits(1).unwrap().is_empty());
        assert!(matches!(
            repository
                .commit_tag_regulation_acknowledgement(
                    &commit,
                    "ignored",
                    "2026-08-30T00:03:00.000Z"
                )
                .unwrap(),
            TagRegulationCommitOutcome::AlreadyAcknowledged { .. }
        ));

        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
