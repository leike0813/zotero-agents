use serde_json::{Map, Value};

#[path = "transport.rs"]
mod transport;

use crate::{args::normalize_operation_id, config::BridgeConfig, contract, error::CliError};

pub use transport::DownloadResponse;

pub fn last_operation_id() -> Option<String> {
    transport::last_operation_id()
}

pub fn health(config: &BridgeConfig) -> Result<Value, CliError> {
    contract::assert_endpoint_target("GET", "/health")?;
    transport::health(config)
}

pub fn call(config: &BridgeConfig, capability: &str, input: Value) -> Result<Value, CliError> {
    if is_canonical_mutation(capability) {
        return call_canonical_mutation(config, capability, input);
    }
    if capability == "mutation.get_operation" {
        return call_mutation_get_operation(config, input);
    }
    contract::assert_capability_target(capability)?;
    contract::validate_capability_input(capability, &input)?;
    let result = transport::call(config, capability, input)?;
    if result.get("capability").and_then(Value::as_str) != Some(capability) {
        return Err(CliError::protocol(
            "command_result_contract_violation",
            "Host capability result identifies a different capability",
        ));
    }
    contract::validate_capability_output(capability, result.get("data").unwrap_or(&Value::Null))?;
    Ok(result)
}

fn call_mutation_get_operation(config: &BridgeConfig, mut input: Value) -> Result<Value, CliError> {
    let object = input.as_object_mut().ok_or_else(|| {
        CliError::validation(
            "invalid_operation_id",
            "mutation.get_operation input must contain a valid operationId",
        )
    })?;
    let operation_id = object
        .get("operationId")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            CliError::validation(
                "invalid_operation_id",
                "mutation.get_operation operationId must be a valid opaque id",
            )
        })
        .and_then(|value| {
            normalize_operation_id(value)
                .map_err(|message| CliError::validation("invalid_operation_id", message))
        })?;
    object.insert("operationId".to_string(), Value::String(operation_id));
    contract::assert_capability_target("mutation.get_operation")?;
    contract::validate_capability_input("mutation.get_operation", &input)?;
    let result = transport::call(config, "mutation.get_operation", input)?;
    if result.get("capability").and_then(Value::as_str) != Some("mutation.get_operation") {
        return Err(CliError::protocol(
            "command_result_contract_violation",
            "Host capability result identifies a different capability",
        ));
    }
    contract::validate_capability_output(
        "mutation.get_operation",
        result.get("data").unwrap_or(&Value::Null),
    )?;
    Ok(result)
}

fn call_canonical_mutation(config: &BridgeConfig, capability: &str, mut input: Value) -> Result<Value, CliError> {
    let dry_run = input.get("dryRun").and_then(Value::as_bool).unwrap_or(false);
    let operation_id = if dry_run { None } else { Some(resolve_mutation_operation_id(config, &mut input)?) };
    contract::assert_capability_target(capability)?;
    contract::validate_capability_input(capability, &input)?;
    let result = if let Some(operation_id) = operation_id.as_deref() {
        transport::call_mutation_execute(config, capability, input, operation_id)?
    } else {
        transport::call(config, capability, input)?
    };
    if result.get("capability").and_then(Value::as_str) != Some(capability) {
        let operation_id = operation_id.unwrap_or_default();
        return Err(transport::operation_context(
            CliError::protocol(
                "command_result_contract_violation",
                "Host capability result identifies a different capability",
            ),
            &operation_id,
            format!("mutation get-operation {operation_id}"),
        ));
    }
    contract::validate_capability_output(
        capability,
        result.get("data").unwrap_or(&Value::Null),
    )
    .map_err(|error| match operation_id.as_deref() {
        Some(id) => transport::operation_context(error, id, format!("mutation get-operation {id}")),
        None => error,
    })?;
    Ok(result)
}

fn is_canonical_mutation(capability: &str) -> bool {
    matches!(capability,
        "item.create" | "item.updateMetadata" | "item.changeType" | "item.remove" |
        "item.updateTags" | "item.addRelated" | "item.removeRelated" |
        "collection.create" | "collection.update" | "collection.updateMembership" | "collection.remove" |
        "notes.create" | "notes.updateContent" | "notes.remove" | "notes.upsertPayload" |
        "attachments.create" | "attachments.updateMetadata" | "attachments.replaceFile" | "attachments.move" | "attachments.remove" |
        "statusTags.transition" | "trash.setItemsState" | "literature.ingest" |
        "managed_note.write_custom" | "managed_note.write_conversation" |
        "literature_artifact.upsert_digest" | "literature_artifact.upsert_references" |
        "literature_artifact.upsert_citation_analysis" | "literature_artifact.upsert_score")
}

fn resolve_mutation_operation_id(
    config: &BridgeConfig,
    input: &mut Value,
) -> Result<String, CliError> {
    let object = input.as_object_mut().ok_or_else(|| {
        CliError::validation(
            "mutation_operation_input_invalid",
            "canonical mutation input must be a JSON object",
        )
    })?;
    let input_operation_id = match object.get("operationId") {
        None => None,
        Some(Value::String(value)) => Some(
            normalize_operation_id(value)
                .map_err(|message| CliError::validation("invalid_operation_id", message))?,
        ),
        Some(_) => {
            return Err(CliError::validation(
                "invalid_operation_id",
                "canonical mutation operationId must be a valid opaque id",
            ));
        }
    };
    let flag_operation_id = config
        .operation_id
        .as_deref()
        .map(|value| {
            normalize_operation_id(value)
                .map_err(|message| CliError::validation("invalid_operation_id", message))
        })
        .transpose()?;
    if let (Some(input_operation_id), Some(flag_operation_id)) =
        (input_operation_id.as_deref(), flag_operation_id.as_deref())
    {
        if input_operation_id != flag_operation_id {
            return Err(CliError::validation(
                "operation_id_conflict",
                "--operation-id and canonical mutation operationId must match",
            )
            .with_details(serde_json::json!({
                "inputOperationId": input_operation_id,
                "flagOperationId": flag_operation_id,
            })));
        }
    }
    let operation_id = input_operation_id
        .or(flag_operation_id)
        .unwrap_or_else(transport::generated_operation_id);
    object.insert(
        "operationId".to_string(),
        Value::String(operation_id.clone()),
    );
    Ok(operation_id)
}

pub fn call_current(
    config: &BridgeConfig,
    arguments: Map<String, Value>,
) -> Result<Value, CliError> {
    call_current_with_dry_run(config, arguments, false)
}

pub fn call_current_with_dry_run(
    config: &BridgeConfig,
    arguments: Map<String, Value>,
    dry_run: bool,
) -> Result<Value, CliError> {
    let (capability, input) = contract::compose_current_command_payload(&arguments)?;
    let mut input = input;
    if dry_run {
        input
            .as_object_mut()
            .ok_or_else(|| CliError::validation("mutation_input_invalid", "Mutation input must be an object"))?
            .insert("dryRun".to_string(), Value::Bool(true));
    }
    call(config, &capability, input)
}

pub fn get(config: &BridgeConfig, path: &str) -> Result<Value, CliError> {
    contract::assert_endpoint_target("GET", path)?;
    transport::get(config, path)
}

pub fn post(config: &BridgeConfig, path: &str, body: Value) -> Result<Value, CliError> {
    contract::assert_endpoint_target("POST", path)?;
    transport::post(config, path, body)
}

pub fn upload(
    config: &BridgeConfig,
    path: &str,
    bytes: &[u8],
    display_name: Option<&str>,
    content_type: Option<&str>,
) -> Result<Value, CliError> {
    contract::assert_endpoint_target("POST", path)?;
    transport::upload(config, path, bytes, display_name, content_type)
}

pub fn download(config: &BridgeConfig, path: &str) -> Result<DownloadResponse, CliError> {
    contract::assert_endpoint_target("GET", path)?;
    transport::download(config, path)
}
