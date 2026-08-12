use serde::{Deserialize, de::DeserializeOwned};
use serde_json::{Value, json};
use synthesis_application::tag_vocabulary::{
    TagSelectionRequest, TagStagedUpdateRequest, TagSuggestionStageRequest,
    TagVocabularyEntryDeleteRequest, TagVocabularyEntryUpdateRequest, TagVocabularySaveRequest,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::TagAuditRecord;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TagImportPreviewRequest {
    payload: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TagImportApplyRequest {
    payload: String,
    action: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditReplaceRequest {
    library_id: i64,
    entries: Vec<TagAuditReplaceEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditReplaceEntry {
    item_key: String,
    compliant: bool,
    non_compliant_tags: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditClearRequest {
    library_id: i64,
    item_key: String,
}

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
    no_args(args)?;
    wire(apps.tags.validate_public(None)?)
}

fn rebuild_index(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    let expected = apps
        .tags
        .inspect()?
        .vocabulary_hash
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())?;
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

fn decode_import_payload(payload: &str) -> Result<TagVocabularySaveRequest, String> {
    if payload.len() > 1_048_576 {
        return Err("invalid_request".into());
    }
    serde_json::from_str(payload).map_err(|_| "invalid_request".to_owned())
}

fn preview_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagImportPreviewRequest>(args)?;
    let candidate = decode_import_payload(&request.payload)?;
    let mut preview = wire(apps.tags.preview_public_import(&candidate)?)?;
    preview
        .as_object_mut()
        .expect("preview is an object")
        .insert(
            "previewDigest".into(),
            Value::String(canonical_json_hash(
                &json!({"payload":request.payload,"candidate":candidate}),
            )?),
        );
    Ok(preview)
}

fn apply_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagImportApplyRequest>(args)?;
    let candidate = decode_import_payload(&request.payload)?;
    if !matches!(
        request.action.as_str(),
        "use-imported" | "merge-non-conflicting"
    ) {
        return Err("invalid_request".into());
    }
    let mut result = mutation(
        apps.tags
            .apply_public_import(&candidate, request.action.as_str())?,
    )?;
    result.as_object_mut().expect("object").insert(
        "previewDigest".into(),
        Value::String(canonical_json_hash(&json!({"payload":request.payload}))?),
    );
    Ok(result)
}

fn replace_audits(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagAuditReplaceRequest>(args)?;
    if request.library_id <= 0 || request.entries.len() > 10_000 {
        return Err("invalid_request".into());
    }
    let records = request
        .entries
        .into_iter()
        .map(|entry| {
            if entry.item_key.trim().is_empty()
                || entry.non_compliant_tags.len() > 10_000
                || entry.non_compliant_tags.iter().any(|tag| tag.is_empty())
            {
                return Err("invalid_request".into());
            }
            Ok(TagAuditRecord {
                library_id: request.library_id,
                item_key: entry.item_key,
                needs_tag_regulation: i64::from(!entry.compliant),
                non_compliant_tags_json: serde_json::to_string(&entry.non_compliant_tags)
                    .map_err(|_| "invalid_request".to_owned())?,
                ..TagAuditRecord::default()
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    if records
        .iter()
        .map(|record| (record.library_id, &record.item_key))
        .collect::<std::collections::HashSet<_>>()
        .len()
        != records.len()
    {
        return Err("invalid_request".into());
    }
    let audited = apps.tags.replace_audits(request.library_id, &records)?;
    Ok(json!({"libraryId":request.library_id,"audited":audited}))
}

fn clear_audit(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagAuditClearRequest>(args)?;
    if request.library_id <= 0 || request.item_key.is_empty() {
        return Err("invalid_request".into());
    }
    apps.tags
        .clear_audit(request.library_id, &request.item_key)?;
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
