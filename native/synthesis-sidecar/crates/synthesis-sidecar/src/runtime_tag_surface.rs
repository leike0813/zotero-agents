use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::tag_vocabulary::TagPromoteRequest;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{TagAuditRecord, TagStagedSuggestionRecord, TagVocabularyReplacement};

use crate::runtime_production_ports::ProductionApplications;

/// The only production adapter for the public Tag surface.  It deliberately
/// keeps the private vocabulary application as the durable domain owner while
/// preventing the RPC dispatcher from exposing repository records directly.
pub(crate) fn dispatch(
    apps: &ProductionApplications,
    operation: &str,
    args: &[Value],
) -> Result<Value, String> {
    match operation {
        "client.isBuiltinTagPolicyInitialized" => {
            no_args(args)?;
            Ok(Value::Bool(apps.tags.inspect()?.vocabulary_hash.is_some()))
        }
        "client.loadTagVocabulary" => {
            no_args(args)?;
            snapshot(apps)
        }
        "client.exportTagVocabularyForRegulator" => {
            no_args(args)?;
            wire(apps.tags.export_regulator_tags()?)
        }
        "client.listStagedTagSuggestions" => list_staged(apps, args),
        "client.initializeBuiltinTagPolicy" => {
            no_args(args)?;
            apps.initialize_builtin_tag_policy()
        }
        "client.saveTagVocabulary" => save(apps, args),
        "client.validateTagVocabulary" => validate(apps, args),
        "client.rebuildTagVocabularyIndex" => rebuild_index(apps, args),
        "client.stageTagSuggestions" => replace_staged(apps, args, "stage"),
        "client.updateStagedTagSuggestion" => replace_staged(apps, args, "update"),
        "client.updateTagVocabularyEntry" => save(apps, args),
        "client.deleteTagVocabularyEntry" => save(apps, args),
        "client.promoteStagedTagSuggestions" => promote(apps, args),
        "client.discardStagedTagSuggestions" => replace_staged(apps, args, "discard"),
        "client.clearStagedTagSuggestions" => clear_staged(apps, args),
        "client.previewTagVocabularyImport" => preview_import(apps, args),
        "client.applyTagVocabularyImport" => apply_import(apps, args),
        "client.replaceTagAuditRecords" => replace_audits(apps, args),
        "client.clearTagAuditRecord" => clear_audit(apps, args),
        _ => Err("unknown_operation".into()),
    }
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn one<T: DeserializeOwned>(args: &[Value]) -> Result<T, String> {
    match args {
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn mutation<T: serde::Serialize>(value: T) -> Result<Value, String> {
    let mut value = wire(value)?;
    if let Some(object) = value.as_object_mut() {
        object.entry("diagnostics").or_insert_with(|| json!([]));
    }
    Ok(value)
}

fn snapshot(apps: &ProductionApplications) -> Result<Value, String> {
    let loaded = apps.tags.load_vocabulary()?;
    let inspect = apps.tags.inspect()?;
    Ok(json!({
        "vocabularyHash": inspect.vocabulary_hash,
        "stagedRevision": inspect.staged_revision,
        "indexHash": inspect.index_hash,
        "indexBasisHash": inspect.index_basis_hash,
        "indexStale": inspect.index_stale,
        "entryCount": inspect.entry_count,
        "stagedCount": inspect.staged_count,
        "auditCount": loaded.staged.len(),
        "pendingEffectCount": inspect.pending_effect_count,
        "entries": loaded.entries,
        "staged": loaded.staged,
        "effects": loaded.effects,
    }))
}

fn list_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (cursor, limit) = match args {
        [] => (0usize, 100usize),
        [request] => {
            let object = request
                .as_object()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if object.keys().any(|key| key != "cursor" && key != "limit") {
                return Err("invalid_request".into());
            }
            let cursor = object
                .get("cursor")
                .and_then(Value::as_str)
                .unwrap_or("0")
                .parse::<usize>()
                .map_err(|_| "invalid_request".to_owned())?;
            let limit = object.get("limit").and_then(Value::as_u64).unwrap_or(100) as usize;
            (cursor, limit)
        }
        _ => return Err("invalid_request".into()),
    };
    let page = apps.tags.list_staged(cursor, limit)?;
    Ok(json!({
        "entries": page.items,
        "nextCursor": page.next_cursor.map(|value| value.to_string()),
        "stagedRevision": apps.tags.inspect()?.staged_revision,
    }))
}

fn candidate_request(args: &[Value]) -> Result<(Option<String>, TagVocabularyReplacement), String> {
    let request = one::<Value>(args)?;
    let expected = request
        .get("expectedVocabularyHash")
        .and_then(Value::as_str)
        .map(str::to_owned);
    let candidate = request
        .get("candidate")
        .or_else(|| request.get("replacement"))
        .cloned()
        .unwrap_or(request);
    serde_json::from_value(candidate)
        .map(|candidate| (expected, candidate))
        .map_err(|_| "invalid_request".into())
}

fn save(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (expected, candidate) = candidate_request(args)?;
    mutation(apps.tags.save(expected.as_deref(), &candidate))
}

fn validate(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (_, candidate) = candidate_request(args)?;
    wire(apps.tags.validate(&candidate)?)
}

fn rebuild_index(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let expected = match args {
        [] => apps
            .tags
            .inspect()?
            .vocabulary_hash
            .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())?,
        [request] => request
            .get("expectedVocabularyHash")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "invalid_request".to_owned())?
            .to_owned(),
        _ => return Err("invalid_request".into()),
    };
    mutation(apps.tags.rebuild_index(&expected))
}

fn staged_request(args: &[Value]) -> Result<(i64, Vec<TagStagedSuggestionRecord>), String> {
    let request = one::<Value>(args)?;
    let revision = request
        .get("expectedStagedRevision")
        .or_else(|| request.get("expectedRevision"))
        .and_then(Value::as_i64)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let entries = request
        .get("entries")
        .or_else(|| request.get("staged"))
        .or_else(|| request.get("retained"))
        .cloned()
        .ok_or_else(|| "invalid_request".to_owned())?;
    serde_json::from_value(entries)
        .map(|entries| (revision, entries))
        .map_err(|_| "invalid_request".into())
}

fn replace_staged(
    apps: &ProductionApplications,
    args: &[Value],
    kind: &str,
) -> Result<Value, String> {
    let (revision, entries) = staged_request(args)?;
    let result = match kind {
        "stage" => apps.tags.stage(revision, &entries),
        "update" => apps.tags.update_staged(revision, &entries),
        _ => apps.tags.discard(revision, &entries),
    };
    mutation(result)
}

fn promote(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<Value>(args)?;
    let tags = request
        .get("tags")
        .cloned()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let inspect = apps.tags.inspect()?;
    let expected_hash = request
        .get("expectedVocabularyHash")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .or(inspect.vocabulary_hash)
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())?;
    let expected_revision = request
        .get("expectedStagedRevision")
        .and_then(Value::as_i64)
        .unwrap_or(inspect.staged_revision);
    let tags = serde_json::from_value(tags).map_err(|_| "invalid_request".to_owned())?;
    let mut result = mutation(apps.tags.promote(&TagPromoteRequest {
        expected_vocabulary_hash: expected_hash,
        expected_staged_revision: expected_revision,
        tags,
    }))?;
    let reconciled = apps.tags.reconcile_pending_effects(100)?;
    result
        .as_object_mut()
        .expect("mutation result is an object")
        .insert("reconciledEffectCount".into(), Value::from(reconciled));
    Ok(result)
}

fn clear_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let revision = match args {
        [] => apps.tags.inspect()?.staged_revision,
        [request] => request
            .get("expectedStagedRevision")
            .and_then(Value::as_i64)
            .ok_or_else(|| "invalid_request".to_owned())?,
        _ => return Err("invalid_request".into()),
    };
    mutation(apps.tags.clear_staged(revision))
}

fn import_payload(args: &[Value]) -> Result<(String, TagVocabularyReplacement), String> {
    let request = one::<Value>(args)?;
    let payload = request
        .get("payload")
        .and_then(Value::as_str)
        .ok_or_else(|| "invalid_request".to_owned())?;
    if payload.len() > 1_048_576 {
        return Err("invalid_request".into());
    }
    let candidate = serde_json::from_str(payload).map_err(|_| "invalid_request".to_owned())?;
    Ok((payload.to_owned(), candidate))
}

fn preview_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (payload, candidate) = import_payload(args)?;
    let validated = apps.tags.validate(&candidate)?;
    let digest = canonical_json_hash(&json!({"payload":payload,"candidate":validated}))?;
    Ok(
        json!({"previewDigest":digest,"vocabularyHash":apps.tags.inspect()?.vocabulary_hash,"candidate":validated}),
    )
}

fn apply_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (payload, candidate) = import_payload(args)?;
    let request = one::<Value>(args)?;
    let action = request
        .get("action")
        .and_then(Value::as_str)
        .ok_or_else(|| "invalid_request".to_owned())?;
    if !matches!(action, "use-imported" | "merge-non-conflicting") {
        return Err("invalid_request".into());
    }
    let expected = apps.tags.inspect()?.vocabulary_hash;
    let mut result = mutation(apps.tags.save(expected.as_deref(), &candidate))?;
    result.as_object_mut().expect("object").insert(
        "previewDigest".into(),
        Value::String(canonical_json_hash(&json!({"payload":payload}))?),
    );
    Ok(result)
}

fn replace_audits(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<Value>(args)?;
    let records = if let Some(legacy) = request.as_array() {
        serde_json::from_value::<Vec<TagAuditRecord>>(Value::Array(legacy.clone()))
            .map_err(|_| "invalid_request".to_owned())?
    } else {
        let object = request
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        if object
            .keys()
            .any(|key| key != "libraryId" && key != "entries")
        {
            return Err("invalid_request".into());
        }
        let library_id = object
            .get("libraryId")
            .and_then(Value::as_i64)
            .filter(|value| *value > 0)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let entries = object
            .get("entries")
            .and_then(Value::as_array)
            .ok_or_else(|| "invalid_request".to_owned())?;
        entries
            .iter()
            .map(|entry| {
                let entry = entry
                    .as_object()
                    .ok_or_else(|| "invalid_request".to_owned())?;
                if entry.keys().any(|key| {
                    !matches!(
                        key.as_str(),
                        "itemKey" | "needsTagRegulation" | "nonCompliantTags"
                    )
                }) {
                    return Err("invalid_request".into());
                }
                let item_key = entry
                    .get("itemKey")
                    .and_then(Value::as_str)
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| "invalid_request".to_owned())?;
                let needs_tag_regulation = entry
                    .get("needsTagRegulation")
                    .and_then(Value::as_bool)
                    .ok_or_else(|| "invalid_request".to_owned())?;
                let non_compliant_tags = entry
                    .get("nonCompliantTags")
                    .and_then(Value::as_array)
                    .ok_or_else(|| "invalid_request".to_owned())?;
                if non_compliant_tags.len() > 10_000
                    || non_compliant_tags
                        .iter()
                        .any(|tag| tag.as_str().is_none_or(str::is_empty))
                {
                    return Err("invalid_request".into());
                }
                Ok(TagAuditRecord {
                    library_id,
                    item_key: item_key.to_owned(),
                    needs_tag_regulation: i64::from(needs_tag_regulation),
                    non_compliant_tags_json: serde_json::to_string(non_compliant_tags)
                        .map_err(|_| "invalid_request".to_owned())?,
                    ..TagAuditRecord::default()
                })
            })
            .collect::<Result<Vec<_>, String>>()?
    };
    if records.len() > 10_000 {
        return Err("invalid_request".into());
    }
    if records
        .iter()
        .map(|record| (record.library_id, &record.item_key))
        .collect::<std::collections::HashSet<_>>()
        .len()
        != records.len()
    {
        return Err("invalid_request".into());
    }
    let mut results = Vec::with_capacity(records.len());
    for record in records {
        results.push(mutation(apps.tags.replace_audit(&record))?);
    }
    Ok(Value::Array(results))
}

fn clear_audit(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<Value>(args)?;
    let library_id = request
        .get("libraryId")
        .and_then(Value::as_i64)
        .filter(|value| *value > 0)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let item_key = request
        .get("itemKey")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "invalid_request".to_owned())?;
    let _ = apps.tags.clear_audit(library_id, item_key);
    Ok(json!({"ok":true}))
}
