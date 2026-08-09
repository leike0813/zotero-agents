use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::tag_vocabulary::{
    TagSelectionRequest, TagStagedUpdateRequest, TagSuggestionStageRequest,
    TagVocabularyEntryDeleteRequest, TagVocabularyEntryUpdateRequest, TagVocabularySaveRequest,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::TagAuditRecord;

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    checkpoint_before_promotion, current_operation_id,
};

/// The only production adapter for the public Tag surface.  It deliberately
/// keeps the private vocabulary application as the durable domain owner while
/// preventing the RPC dispatcher from exposing repository records directly.
type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const TAG_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.isBuiltinTagPolicyInitialized", |apps, args| {
        no_args(args)?;
        Ok(Value::Bool(apps.tags.is_builtin_policy_initialized()?))
    }),
    ("client.loadTagVocabulary", |apps, args| {
        no_args(args)?;
        snapshot(apps)
    }),
    ("client.exportTagVocabularyForRegulator", |apps, args| {
        no_args(args)?;
        wire(apps.tags.export_regulator_tags()?)
    }),
    ("client.listStagedTagSuggestions", list_staged),
    ("client.initializeBuiltinTagPolicy", |apps, args| {
        no_args(args)?;
        wire(apps.tags.initialize_public_vocabulary()?)
    }),
    ("client.saveTagVocabulary", save),
    ("client.validateTagVocabulary", validate),
    ("client.rebuildTagVocabularyIndex", rebuild_index),
    ("client.stageTagSuggestions", stage),
    ("client.updateStagedTagSuggestion", update_staged),
    ("client.updateTagVocabularyEntry", update_entry),
    ("client.deleteTagVocabularyEntry", delete_entry),
    ("client.promoteStagedTagSuggestions", promote),
    ("client.discardStagedTagSuggestions", discard),
    ("client.clearStagedTagSuggestions", clear_staged),
    ("client.previewTagVocabularyImport", preview_import),
    ("client.applyTagVocabularyImport", apply_import),
    ("client.replaceTagAuditRecords", replace_audits),
    ("client.clearTagAuditRecord", clear_audit),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    TAG_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    TAG_CLIENT_HANDLERS.iter().map(|handler| handler.capability)
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
    wire(apps.tags.load_public_vocabulary()?)
}

fn list_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    wire(apps.tags.list_public_staged()?)
}

fn save(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagVocabularySaveRequest>(args)?;
    mutation(apps.tags.save_public(&request))
}

fn validate(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    match args {
        [] => wire(apps.tags.validate_public(None)?),
        [_] => {
            let request = one::<TagVocabularySaveRequest>(args)?;
            wire(apps.tags.validate_public(Some(&request))?)
        }
        _ => Err("invalid_request".into()),
    }
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
    let checkpoint = || promotion_checkpoint(apps);
    mutation(
        apps.tags
            .rebuild_index_with_checkpoint(&expected, &checkpoint),
    )
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion(apps, &operation_id, &synthesis_protocol::utc_now_iso8601())
}

fn stage(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .stage_public(&one::<TagSuggestionStageRequest>(args)?)?,
    )
}

fn update_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .update_public_staged(&one::<TagStagedUpdateRequest>(args)?)?,
    )
}

fn update_entry(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .update_public_entry(&one::<TagVocabularyEntryUpdateRequest>(args)?)?,
    )
}

fn delete_entry(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .delete_public_entry(&one::<TagVocabularyEntryDeleteRequest>(args)?)?,
    )
}

fn promote(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .promote_public(&one::<TagSelectionRequest>(args)?)?,
    )
}

fn discard(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .discard_public(&one::<TagSelectionRequest>(args)?)?,
    )
}

fn clear_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    wire(apps.tags.clear_public_staged()?)
}

fn import_payload(args: &[Value]) -> Result<(String, TagVocabularySaveRequest), String> {
    let request = one::<Value>(args)?;
    let payload = request
        .get("payload")
        .and_then(Value::as_str)
        .ok_or_else(|| "invalid_request".to_owned())?;
    if payload.len() > 1_048_576 {
        return Err("invalid_request".into());
    }
    let imported =
        serde_json::from_str::<Value>(payload).map_err(|_| "invalid_request".to_owned())?;
    let imported = imported
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let candidate = serde_json::from_value(json!({
        "entries": imported.get("entries").or_else(|| imported.get("tags")).cloned().unwrap_or_else(|| json!([])),
        "aliases": imported.get("aliases").cloned().unwrap_or_else(|| json!({})),
        "abbrev": imported.get("abbrev").or_else(|| imported.get("abbrevs")).cloned().unwrap_or_else(|| json!({})),
        "protocol": imported.get("protocol").cloned(),
    }))
    .map_err(|_| "invalid_request".to_owned())?;
    Ok((payload.to_owned(), candidate))
}

fn preview_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let (payload, candidate) = import_payload(args)?;
    let mut preview = wire(apps.tags.preview_public_import(&candidate)?)?;
    preview
        .as_object_mut()
        .expect("preview is an object")
        .insert(
            "previewDigest".into(),
            Value::String(canonical_json_hash(
                &json!({"payload":payload,"candidate":candidate}),
            )?),
        );
    Ok(preview)
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
    let mut result = mutation(apps.tags.apply_public_import(&candidate, action)?)?;
    result.as_object_mut().expect("object").insert(
        "previewDigest".into(),
        Value::String(canonical_json_hash(&json!({"payload":payload}))?),
    );
    Ok(result)
}

fn replace_audits(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<Value>(args)?;
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
    let records = entries
        .iter()
        .map(|entry| {
            let entry = entry
                .as_object()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if entry
                .keys()
                .any(|key| !matches!(key.as_str(), "itemKey" | "compliant" | "nonCompliantTags"))
            {
                return Err("invalid_request".into());
            }
            let item_key = entry
                .get("itemKey")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "invalid_request".to_owned())?;
            let compliant = entry
                .get("compliant")
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
                needs_tag_regulation: i64::from(!compliant),
                non_compliant_tags_json: serde_json::to_string(non_compliant_tags)
                    .map_err(|_| "invalid_request".to_owned())?,
                ..TagAuditRecord::default()
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
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
    let audited = apps.tags.replace_audits(library_id, &records)?;
    Ok(json!({"libraryId":library_id,"audited":audited}))
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
    apps.tags.clear_audit(library_id, item_key)?;
    Ok(json!({"ok":true}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_has_the_closed_nineteen_operation_slice() {
        assert_eq!(TAG_CLIENT_HANDLERS.len(), 19);
        let capabilities = TAG_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(capabilities.len(), 19);
    }
}
