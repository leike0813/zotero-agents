use std::{cell::RefCell, sync::OnceLock};

use jsonschema::{error::ValidationErrorKind, validator_for};
use serde_json::{json, Map, Value};

use crate::error::{CliError, ErrorCategory};

const CAPABILITY_CONTRACT_JSON: &str =
    include_str!("../../../host-bridge/contracts/capabilities.v2.json");
const COMMAND_CONTRACT_JSON: &str =
    include_str!("../../../host-bridge/contracts/cli-commands.v2.json");
const CAPABILITY_META_SCHEMA_JSON: &str =
    include_str!("../../../schemas/host-bridge-capabilities.v2.schema.json");
const COMMAND_META_SCHEMA_JSON: &str =
    include_str!("../../../schemas/host-bridge-cli-command-contracts.v2.schema.json");

static CAPABILITY_CONTRACT: OnceLock<Result<Value, String>> = OnceLock::new();
static COMMAND_CONTRACT: OnceLock<Result<Value, String>> = OnceLock::new();

thread_local! {
    static CURRENT_COMMAND: RefCell<Option<String>> = const { RefCell::new(None) };
}

fn parse_and_validate(
    source: &str,
    meta_schema_source: &str,
    expected_schema: &str,
) -> Result<Value, String> {
    let value = serde_json::from_str::<Value>(source)
        .map_err(|error| format!("{expected_schema} is not valid JSON: {error}"))?;
    let meta_schema = serde_json::from_str::<Value>(meta_schema_source)
        .map_err(|error| format!("{expected_schema} meta-schema is invalid: {error}"))?;
    let validator = validator_for(&meta_schema)
        .map_err(|error| format!("{expected_schema} meta-schema cannot compile: {error}"))?;
    if let Some(error) = validator.iter_errors(&value).next() {
        return Err(format!(
            "{expected_schema} violates its meta-schema: {error}"
        ));
    }
    if value.get("schema").and_then(Value::as_str) != Some(expected_schema) {
        return Err(format!(
            "{expected_schema} has an unexpected schema identity"
        ));
    }
    Ok(value)
}

fn validate_command_references(registry: &Value) -> Result<(), String> {
    let capabilities = capability_contract()
        .map_err(|error| error.message)?
        .get("capabilities")
        .and_then(Value::as_object)
        .ok_or_else(|| "capability contract has no capabilities object".to_string())?;
    let commands = registry
        .get("commands")
        .and_then(Value::as_object)
        .ok_or_else(|| "command contract has no commands object".to_string())?;
    for (command, entry) in commands {
        let target = entry
            .get("target")
            .ok_or_else(|| format!("{command} has no target"))?;
        let target_kind = target
            .get("kind")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("{command} target has no kind"))?;
        let target_method = target.get("method").and_then(Value::as_str);
        let target_capability = target.get("capability").and_then(Value::as_str);
        if let Some(capability) = target_capability {
            if !capabilities.contains_key(capability) {
                return Err(format!(
                    "{command} references unknown capability {capability}"
                ));
            }
        }
        for auxiliary in entry
            .get("auxiliaryTargets")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(capability) = auxiliary.get("capability").and_then(Value::as_str) {
                if !capabilities.contains_key(capability) {
                    return Err(format!(
                        "{command} references unknown auxiliary capability {capability}"
                    ));
                }
            }
        }

        let inputs = entry
            .get("inputs")
            .and_then(Value::as_object)
            .ok_or_else(|| format!("{command} inputs must be an object"))?;
        let binding = entry
            .get("binding")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("{command} has no binding mode"))?;
        let binding_is_valid = match (target_kind, target_method, binding) {
            ("local", _, "none")
            | ("dynamic-capability", _, "raw")
            | ("endpoint", Some("GET"), "none") => true,
            ("capability", _, "passthrough" | "overlay" | "object")
            | ("endpoint", Some("POST"), "passthrough" | "overlay" | "object") => true,
            _ => false,
        };
        if !binding_is_valid {
            return Err(format!(
                "{command} uses binding {binding} with incompatible target {target_kind}"
            ));
        }
        if binding == "overlay" && inputs.is_empty() {
            return Err(format!(
                "{command} overlay binding requires structured source inputs"
            ));
        }
        if binding == "passthrough" {
            if inputs.len() != 1 {
                return Err(format!(
                    "{command} passthrough binding requires exactly one structured input"
                ));
            }
        }
        let composition = entry.get("composition");
        if target_kind == "capability" && matches!(binding, "overlay" | "object") {
            let composition = composition
                .and_then(Value::as_object)
                .ok_or_else(|| format!("{command} requires executable composition"))?;
            let base = composition
                .get("base")
                .and_then(|value| value.get("argument"))
                .and_then(Value::as_str);
            if binding == "overlay" {
                let base = base.ok_or_else(|| {
                    format!("{command} overlay composition requires a base argument")
                })?;
                if !inputs.contains_key(base) {
                    return Err(format!(
                        "{command} overlay base references undeclared structured input {base}"
                    ));
                }
            } else if base.is_some() {
                return Err(format!(
                    "{command} object composition must not declare a base argument"
                ));
            }
            let constants = composition
                .get("constants")
                .and_then(Value::as_object)
                .ok_or_else(|| format!("{command} composition constants must be an object"))?;
            let mappings = composition
                .get("mappings")
                .and_then(Value::as_array)
                .ok_or_else(|| format!("{command} composition mappings must be an array"))?;
            let mut fields = constants
                .keys()
                .cloned()
                .collect::<std::collections::BTreeSet<_>>();
            for mapping in mappings {
                let argument = mapping
                    .get("argument")
                    .and_then(Value::as_str)
                    .ok_or_else(|| format!("{command} composition mapping has no argument"))?;
                let field = mapping
                    .get("field")
                    .and_then(Value::as_str)
                    .ok_or_else(|| format!("{command} composition mapping has no field"))?;
                if !fields.insert(field.to_string()) {
                    return Err(format!(
                        "{command} composition writes target field {field} more than once"
                    ));
                }
                if inputs.contains_key(argument)
                    && inputs[argument].get("schemaSource").and_then(Value::as_str)
                        != Some("composition")
                {
                    return Err(format!(
                        "{command}:{argument} must derive its structured schema from composition"
                    ));
                }
            }
        } else if composition.is_some() {
            return Err(format!(
                "{command} declares composition for incompatible target or binding"
            ));
        }
        match entry.get("payloadSchemaSource").and_then(Value::as_str) {
            Some("inline")
                if target_kind != "capability" && entry.get("payloadSchema").is_some() => {}
            Some("target-capability")
                if target_kind == "capability" && entry.get("payloadSchema").is_none() => {}
            Some(source) => {
                return Err(format!(
                    "{command} cannot resolve payload schema source {source} for {target_kind}"
                ));
            }
            None => return Err(format!("{command} has no payload schema source")),
        }
        for (argument_id, input) in inputs {
            if input.get("schemaSource").and_then(Value::as_str) == Some("target-capability")
                && target_kind != "capability"
            {
                return Err(format!(
                    "{command}:{argument_id} cannot inherit from a non-capability target"
                ));
            }
        }
        match entry.get("resultSchemaSource").and_then(Value::as_str) {
            Some("inline") if entry.get("resultSchema").is_some() => {}
            Some("target-capability-envelope") if target_kind == "capability" => {}
            Some(source) => {
                return Err(format!(
                    "{command} cannot resolve result schema source {source} for {target_kind}"
                ));
            }
            None => return Err(format!("{command} has no result schema source")),
        }
    }
    Ok(())
}

pub fn capability_contract() -> Result<&'static Value, CliError> {
    CAPABILITY_CONTRACT
        .get_or_init(|| {
            parse_and_validate(
                CAPABILITY_CONTRACT_JSON,
                CAPABILITY_META_SCHEMA_JSON,
                "host-bridge.capabilities.v2",
            )
        })
        .as_ref()
        .map_err(|message| CliError::internal("capability_contract_invalid", message.to_string()))
}

pub fn command_contract() -> Result<&'static Value, CliError> {
    COMMAND_CONTRACT
        .get_or_init(|| {
            let registry = parse_and_validate(
                COMMAND_CONTRACT_JSON,
                COMMAND_META_SCHEMA_JSON,
                "zotero-bridge.command-contracts.v2",
            )?;
            validate_command_references(&registry)?;
            Ok(registry)
        })
        .as_ref()
        .map_err(|message| CliError::internal("command_contract_invalid", message.to_string()))
}

pub fn set_current_command(command: impl Into<String>) {
    CURRENT_COMMAND.with(|current| {
        *current.borrow_mut() = Some(command.into());
    });
}

pub fn current_command() -> Option<String> {
    CURRENT_COMMAND.with(|current| current.borrow().clone())
}

pub fn command_entry(command: &str) -> Result<&'static Value, CliError> {
    command_contract()?
        .get("commands")
        .and_then(Value::as_object)
        .and_then(|commands| commands.get(command))
        .ok_or_else(|| {
            CliError::internal(
                "command_contract_missing",
                format!("Executable command contract has no entry for {command}"),
            )
        })
}

pub fn capability_entry(capability: &str) -> Result<&'static Value, CliError> {
    capability_contract()?
        .get("capabilities")
        .and_then(Value::as_object)
        .and_then(|capabilities| capabilities.get(capability))
        .ok_or_else(|| {
            CliError::validation(
                "capability_not_found",
                format!("Executable capability contract has no entry for {capability}"),
            )
        })
}

pub fn resolved_command_inputs(command: &str) -> Result<Map<String, Value>, CliError> {
    let entry = command_entry(command)?;
    let inputs = entry
        .get("inputs")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            CliError::internal(
                "command_input_contract_invalid",
                format!("{command} inputs must be an object"),
            )
        })?;
    let target_capability = entry
        .get("target")
        .filter(|target| target.get("kind").and_then(Value::as_str) == Some("capability"))
        .and_then(|target| target.get("capability"))
        .and_then(Value::as_str);
    let mut resolved = Map::new();
    for (argument_id, input) in inputs {
        let mut input = input.as_object().cloned().ok_or_else(|| {
            CliError::internal(
                "command_input_contract_invalid",
                format!("{command}:{argument_id} input contract must be an object"),
            )
        })?;
        match input.get("schemaSource").and_then(Value::as_str) {
            Some("inline") => {
                if !input.get("schema").is_some_and(Value::is_object) {
                    return Err(CliError::internal(
                        "command_input_contract_invalid",
                        format!("{command}:{argument_id} inline schema is missing"),
                    ));
                }
            }
            Some("target-capability") => {
                let capability = target_capability.ok_or_else(|| {
                    CliError::internal(
                        "command_input_contract_invalid",
                        format!(
                            "{command}:{argument_id} can only inherit a schema from a fixed capability target"
                        ),
                    )
                })?;
                let schema = capability_entry(capability)?
                    .get("inputSchema")
                    .cloned()
                    .ok_or_else(|| {
                        CliError::internal(
                            "capability_input_contract_missing",
                            format!("{capability} has no input schema"),
                        )
                    })?;
                input.insert("schema".to_string(), schema);
            }
            Some("composition") => {
                let schema = resolved_composition_input_schema(entry, argument_id)?;
                input.insert("schema".to_string(), schema);
            }
            Some(source) => {
                return Err(CliError::internal(
                    "command_input_contract_invalid",
                    format!("{command}:{argument_id} has unknown schema source {source}"),
                ));
            }
            None => {
                return Err(CliError::internal(
                    "command_input_contract_invalid",
                    format!("{command}:{argument_id} has no schema source"),
                ));
            }
        }
        resolved.insert(argument_id.clone(), Value::Object(input));
    }
    Ok(resolved)
}

pub fn resolved_command_payload_schema(command: &str) -> Result<Value, CliError> {
    let entry = command_entry(command)?;
    let schema = match entry.get("payloadSchemaSource").and_then(Value::as_str) {
        Some("inline") => entry.get("payloadSchema").cloned().ok_or_else(|| {
            CliError::internal(
                "command_payload_contract_missing",
                format!("{command} has no inline payload schema"),
            )
        }),
        Some("target-capability") => {
            let capability = entry
                .pointer("/target/capability")
                .and_then(Value::as_str)
                .ok_or_else(|| {
                    CliError::internal(
                        "command_payload_contract_invalid",
                        format!("{command} has no fixed capability target"),
                    )
                })?;
            capability_entry(capability)?
                .get("inputSchema")
                .cloned()
                .ok_or_else(|| {
                    CliError::internal(
                        "capability_input_contract_missing",
                        format!("{capability} has no input schema"),
                    )
                })
        }
        Some(source) => Err(CliError::internal(
            "command_payload_contract_invalid",
            format!("{command} has unknown payload schema source {source}"),
        )),
        None => Err(CliError::internal(
            "command_payload_contract_missing",
            format!("{command} has no payload schema source"),
        )),
    }?;
    Ok(specialized_payload_schema(entry, schema))
}

fn composition_constant<'a>(entry: &'a Value, field: &str) -> Option<&'a Value> {
    entry.pointer(&format!("/composition/constants/{field}"))
}

fn schema_accepts_constant(property: &Value, constant: &Value) -> bool {
    property.get("const") == Some(constant)
        || property
            .get("enum")
            .and_then(Value::as_array)
            .is_some_and(|values| values.contains(constant))
}

fn prune_schema_definitions(schema: &mut Value) {
    let Some(definitions) = schema.get("$defs").cloned() else {
        return;
    };
    let mut kept = std::collections::BTreeSet::new();
    fn visit(value: &Value, defs: &Value, kept: &mut std::collections::BTreeSet<String>) {
        match value {
            Value::Array(values) => values.iter().for_each(|v| visit(v, defs, kept)),
            Value::Object(object) => {
                for (key, value) in object {
                    if key == "$defs" {
                        continue;
                    }
                    if key == "$ref" {
                        if let Some(reference) =
                            value.as_str().filter(|v| v.starts_with("#/$defs/"))
                        {
                            let name = reference[8..]
                                .split('/')
                                .next()
                                .unwrap_or("")
                                .replace("~1", "/")
                                .replace("~0", "~");
                            if kept.insert(name.clone()) {
                                if let Some(definition) = defs.get(&name) {
                                    visit(definition, defs, kept);
                                }
                            }
                            continue;
                        }
                    }
                    visit(value, defs, kept);
                }
            }
            _ => {}
        }
    }
    visit(schema, &definitions, &mut kept);
    if let Some(object) = schema.as_object_mut() {
        object.insert(
            "$defs".into(),
            Value::Object(
                kept.into_iter()
                    .filter_map(|name| definitions.get(&name).cloned().map(|v| (name, v)))
                    .collect(),
            ),
        );
    }
}

fn specialized_payload_schema(entry: &Value, schema: Value) -> Value {
    let Some(operation) = composition_constant(entry, "operation") else {
        let mut schema = schema;
        prune_schema_definitions(&mut schema);
        return schema;
    };
    let Some(branches) = schema.get("oneOf").and_then(Value::as_array) else {
        let mut schema = schema;
        prune_schema_definitions(&mut schema);
        return schema;
    };
    let Some(mut selected) = branches
        .iter()
        .find(|branch| {
            branch
                .pointer("/properties/operation")
                .is_some_and(|property| schema_accepts_constant(property, operation))
        })
        .cloned()
    else {
        let mut schema = schema;
        prune_schema_definitions(&mut schema);
        return schema;
    };
    if let Some(properties) = selected
        .get_mut("properties")
        .and_then(Value::as_object_mut)
    {
        properties.insert("operation".to_string(), json!({ "const": operation }));
    }
    if let Some(definitions) = schema.get("$defs") {
        selected
            .as_object_mut()
            .expect("selected payload schema branch is an object")
            .insert("$defs".to_string(), definitions.clone());
    }
    if schema.get("unevaluatedProperties") == Some(&Value::Bool(false)) {
        selected
            .as_object_mut()
            .expect("selected payload schema branch is an object")
            .insert("unevaluatedProperties".to_string(), Value::Bool(false));
    }
    prune_schema_definitions(&mut selected);
    selected
}

fn strip_composed_fields(schema: &mut Value, fields: &std::collections::BTreeSet<String>) {
    if let Some(properties) = schema.get_mut("properties").and_then(Value::as_object_mut) {
        properties.retain(|field, _| !fields.contains(field));
    }
    if let Some(required) = schema.get_mut("required").and_then(Value::as_array_mut) {
        required.retain(|field| field.as_str().is_none_or(|field| !fields.contains(field)));
    }
    for keyword in ["anyOf", "oneOf", "allOf"] {
        let satisfied_by_composition =
            schema
                .get(keyword)
                .and_then(Value::as_array)
                .is_some_and(|branches| {
                    branches.iter().any(|branch| {
                        branch
                            .get("required")
                            .and_then(Value::as_array)
                            .is_some_and(|required| {
                                required.iter().any(|field| {
                                    field.as_str().is_some_and(|field| fields.contains(field))
                                })
                            })
                    })
                });
        if satisfied_by_composition {
            schema
                .as_object_mut()
                .expect("schema object")
                .remove(keyword);
        }
    }
}

fn resolved_composition_input_schema(entry: &Value, argument_id: &str) -> Result<Value, CliError> {
    let command = current_command().unwrap_or_else(|| "unknown command".to_string());
    let composition = entry
        .get("composition")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            CliError::internal(
                "command_input_contract_invalid",
                format!("{command}:{argument_id} has no executable composition"),
            )
        })?;
    let payload_schema = match entry.pointer("/target/capability").and_then(Value::as_str) {
        Some(capability) => capability_entry(capability)?
            .get("inputSchema")
            .cloned()
            .ok_or_else(|| {
                CliError::internal(
                    "capability_input_contract_missing",
                    format!("{capability} has no input schema"),
                )
            })?,
        None => {
            return Err(CliError::internal(
                "command_input_contract_invalid",
                format!("{command}:{argument_id} composition requires a capability target"),
            ));
        }
    };
    let mut specialized = specialized_payload_schema(entry, payload_schema);
    let base_argument = composition
        .get("base")
        .and_then(|base| base.get("argument"))
        .and_then(Value::as_str);
    if base_argument == Some(argument_id) {
        let mut composed_fields = composition
            .get("constants")
            .and_then(Value::as_object)
            .into_iter()
            .flat_map(|constants| constants.keys().cloned())
            .collect::<std::collections::BTreeSet<_>>();
        for field in composition
            .get("mappings")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|mapping| mapping.get("field").and_then(Value::as_str))
        {
            composed_fields.insert(field.to_string());
        }
        strip_composed_fields(&mut specialized, &composed_fields);
        return Ok(specialized);
    }
    let field = composition
        .get("mappings")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .find(|mapping| mapping.get("argument").and_then(Value::as_str) == Some(argument_id))
        .and_then(|mapping| mapping.get("field"))
        .and_then(Value::as_str)
        .ok_or_else(|| {
            CliError::internal(
                "command_input_contract_invalid",
                format!("{command}:{argument_id} is not used by executable composition"),
            )
        })?;
    let mut field_schema = specialized
        .pointer(&format!("/properties/{field}"))
        .cloned()
        .ok_or_else(|| {
            CliError::internal(
                "command_input_contract_invalid",
                format!("{command}:{argument_id} maps to unknown payload field {field}"),
            )
        })?;
    if let Some(definitions) = specialized.get("$defs") {
        if let Some(object) = field_schema.as_object_mut() {
            object.insert("$defs".to_string(), definitions.clone());
        }
    }
    prune_schema_definitions(&mut field_schema);
    Ok(field_schema)
}

pub fn resolved_command_result_schema(command: &str) -> Result<Value, CliError> {
    let entry = command_entry(command)?;
    match entry.get("resultSchemaSource").and_then(Value::as_str) {
        Some("inline") => entry.get("resultSchema").cloned().ok_or_else(|| {
            CliError::internal(
                "command_result_contract_missing",
                format!("{command} has no inline result schema"),
            )
        }),
        Some("target-capability-envelope") => {
            let capability = entry
                .pointer("/target/capability")
                .and_then(Value::as_str)
                .ok_or_else(|| {
                    CliError::internal(
                        "command_result_contract_invalid",
                        format!("{command} has no fixed capability target"),
                    )
                })?;
            let data_schema = capability_entry(capability)?
                .get("outputSchema")
                .cloned()
                .ok_or_else(|| {
                    CliError::internal(
                        "capability_output_contract_missing",
                        format!("{capability} has no output schema"),
                    )
                })?;
            Ok(json!({
                "type": "object",
                "properties": {
                    "capability": {
                        "const": capability
                    },
                    "approval": {
                        "type": "string",
                        "minLength": 1
                    },
                    "data": data_schema
                },
                "required": ["capability", "approval", "data"],
                "additionalProperties": false
            }))
        }
        Some(source) => Err(CliError::internal(
            "command_result_contract_invalid",
            format!("{command} has unknown result schema source {source}"),
        )),
        None => Err(CliError::internal(
            "command_result_contract_missing",
            format!("{command} has no result schema source"),
        )),
    }
}

fn value_type(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn violations(schema: &Value, value: &Value) -> Result<(Vec<Value>, bool), CliError> {
    let validator = validator_for(schema).map_err(|error| {
        CliError::internal(
            "executable_schema_invalid",
            format!("Executable JSON Schema cannot compile: {error}"),
        )
    })?;
    let mut violations = validator
        .iter_errors(value)
        .map(|error| {
            let path = error.instance_path().to_string();
            let schema_path = error.schema_path().to_string();
            let property = match error.kind() {
                ValidationErrorKind::AdditionalProperties { unexpected }
                | ValidationErrorKind::UnevaluatedProperties { unexpected } => {
                    unexpected.first().cloned()
                }
                ValidationErrorKind::Required { property } => property.as_str().map(str::to_string),
                _ => None,
            };
            let mut violation = serde_json::Map::new();
            violation.insert("reason".to_string(), json!(error.kind().keyword()));
            violation.insert("path".to_string(), json!(path));
            violation.insert("schemaPath".to_string(), json!(schema_path));
            if let Some(expected) = schema.pointer(&schema_path) {
                violation.insert("expected".to_string(), expected.clone());
            }
            let actual = if path.is_empty() {
                Some(value)
            } else {
                value.pointer(&path)
            };
            if let Some(actual) = actual {
                violation.insert("actualType".to_string(), json!(value_type(actual)));
            }
            if let Some(property) = property {
                violation.insert("property".to_string(), json!(property));
            }
            Value::Object(violation)
        })
        .collect::<Vec<_>>();
    violations.sort_by(|left, right| {
        let key = |value: &Value| {
            format!(
                "{}\n{}\n{}",
                value.get("path").and_then(Value::as_str).unwrap_or(""),
                value.get("reason").and_then(Value::as_str).unwrap_or(""),
                value.get("property").and_then(Value::as_str).unwrap_or("")
            )
        };
        key(left).cmp(&key(right))
    });
    let truncated = violations.len() > 8;
    violations.truncate(8);
    Ok((violations, truncated))
}

fn validation_error(
    code: &str,
    category: ErrorCategory,
    message: &str,
    phase: &str,
    command: Option<&str>,
    capability: Option<&str>,
    argument_id: Option<&str>,
    violations: Vec<Value>,
    truncated: bool,
) -> CliError {
    let mut details = serde_json::Map::new();
    details.insert("schema".to_string(), json!("host-bridge.argument-error.v1"));
    details.insert("phase".to_string(), json!(phase));
    if let Some(command) = command {
        details.insert("command".to_string(), json!(command));
    }
    if let Some(capability) = capability {
        details.insert("capability".to_string(), json!(capability));
    }
    if let Some(argument_id) = argument_id {
        details.insert("argumentId".to_string(), json!(argument_id));
    }
    details.insert("violations".to_string(), Value::Array(violations));
    details.insert("truncated".to_string(), json!(truncated));
    CliError::new(code, category, message)
        .with_details(Value::Object(details))
        .with_outcome(
            false,
            crate::error::StateChange::Unchanged,
            crate::error::HandleConsumption::Unconsumed,
            vec!["inspect the command schema and correct the input".to_string()],
        )
}

fn composition_error(
    command: &str,
    argument_id: Option<&str>,
    reason: &str,
    actual: Option<&Value>,
) -> CliError {
    let mut violation = Map::new();
    violation.insert("reason".to_string(), json!(reason));
    violation.insert("path".to_string(), json!(""));
    violation.insert("schemaPath".to_string(), json!("/composition"));
    if let Some(actual) = actual {
        violation.insert("actualType".to_string(), json!(value_type(actual)));
    }
    validation_error(
        "command_payload_composition_failed",
        ErrorCategory::Validation,
        "Command arguments could not be composed into the declared capability payload",
        "payload_composition",
        Some(command),
        None,
        argument_id,
        vec![Value::Object(violation)],
        false,
    )
}

fn safe_object_ref(value: &str) -> bool {
    if value.contains('/')
        || value.contains('\\')
        || value.contains("..")
        || value.contains('(')
        || value.contains(')')
        || value.contains(';')
        || value.contains('{')
        || value.contains('}')
        || value.contains('[')
        || value.contains(']')
    {
        return false;
    }
    let key_like = |candidate: &str| {
        (2..=128).contains(&candidate.len())
            && candidate
                .chars()
                .all(|entry| entry.is_ascii_alphanumeric() || entry == '_' || entry == '-')
    };
    if let Some((library_id, key)) = value.split_once(':') {
        return !library_id.is_empty()
            && library_id.chars().all(|entry| entry.is_ascii_digit())
            && key_like(key);
    }
    !value.contains(':') && key_like(value)
}

pub fn context_ref_value(raw: &str) -> Result<Value, CliError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(CliError::validation(
            "missing_object_ref",
            "A Zotero object ref is required",
        ));
    }
    if trimmed.starts_with('{') {
        let value = serde_json::from_str::<Value>(trimmed)
            .map_err(|error| CliError::validation("invalid_object_ref_json", error.to_string()))?;
        if !value.is_object() {
            return Err(CliError::validation(
                "invalid_object_ref_json",
                "Object ref JSON must be a JSON object",
            ));
        }
        return Ok(value);
    }
    if !safe_object_ref(trimmed) {
        return Err(CliError::validation(
            "invalid_object_ref",
            "Object ref must be a Zotero key, libraryId:itemKey, or JSON object",
        ));
    }
    Ok(Value::String(trimmed.to_string()))
}

pub fn normalize_file_id(raw: &str) -> Result<String, CliError> {
    let file_id = raw.trim();
    if file_id.is_empty()
        || !file_id.starts_with("file-")
        || file_id.contains('/')
        || file_id.contains('\\')
        || file_id.contains("..")
        || file_id.contains(':')
    {
        return Err(CliError::validation(
            "invalid_file_id",
            "A bridge-issued opaque file-* handle is required",
        ));
    }
    Ok(file_id.to_string())
}

fn file_id_value(raw: &str) -> Result<Value, CliError> {
    normalize_file_id(raw).map(Value::String)
}

fn transform_composition_value(transform: &str, value: &Value) -> Result<Value, CliError> {
    match transform {
        "identity" => Ok(value.clone()),
        "trim-string" | "path-string" => {
            let raw = value.as_str().ok_or_else(|| {
                CliError::validation(
                    "invalid_composition_value",
                    format!("{transform} requires a string argument"),
                )
            })?;
            let normalized = if transform == "trim-string" {
                raw.trim()
            } else {
                raw
            };
            if normalized.is_empty() {
                return Err(CliError::validation(
                    "invalid_composition_value",
                    format!("{transform} requires a non-empty string argument"),
                ));
            }
            Ok(Value::String(normalized.to_string()))
        }
        "context-ref" => {
            let raw = value.as_str().ok_or_else(|| {
                CliError::validation(
                    "invalid_composition_value",
                    "context-ref requires a string argument",
                )
            })?;
            context_ref_value(raw)
        }
        "context-ref-array" => {
            let values = value.as_array().ok_or_else(|| {
                CliError::validation(
                    "invalid_composition_value",
                    "context-ref-array requires an array argument",
                )
            })?;
            values
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .ok_or_else(|| {
                            CliError::validation(
                                "invalid_composition_value",
                                "context-ref-array entries must be strings",
                            )
                        })
                        .and_then(context_ref_value)
                })
                .collect::<Result<Vec<_>, _>>()
                .map(Value::Array)
        }
        "file-id" => {
            let raw = value.as_str().ok_or_else(|| {
                CliError::validation(
                    "invalid_composition_value",
                    "file-id requires a string argument",
                )
            })?;
            file_id_value(raw)
        }
        _ => Err(CliError::internal(
            "command_composition_contract_invalid",
            format!("Unsupported composition transform {transform}"),
        )),
    }
}

pub fn compose_command_payload(
    command: &str,
    arguments: &Map<String, Value>,
) -> Result<Value, CliError> {
    let entry = command_entry(command)?;
    match entry.get("binding").and_then(Value::as_str) {
        Some("passthrough") => {
            let argument_id = entry
                .get("inputs")
                .and_then(Value::as_object)
                .and_then(|inputs| inputs.keys().next())
                .ok_or_else(|| {
                    CliError::internal(
                        "command_composition_contract_invalid",
                        format!("{command} passthrough binding has no source argument"),
                    )
                })?;
            arguments
                .get(argument_id)
                .cloned()
                .ok_or_else(|| composition_error(command, Some(argument_id), "required", None))
        }
        Some(binding @ ("overlay" | "object")) => {
            let composition = entry
                .get("composition")
                .and_then(Value::as_object)
                .ok_or_else(|| {
                    CliError::internal(
                        "command_composition_contract_invalid",
                        format!("{command} {binding} binding has no composition"),
                    )
                })?;
            let mut payload = if binding == "overlay" {
                let argument_id = composition
                    .get("base")
                    .and_then(|base| base.get("argument"))
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        CliError::internal(
                            "command_composition_contract_invalid",
                            format!("{command} overlay binding has no base argument"),
                        )
                    })?;
                match arguments.get(argument_id) {
                    Some(Value::Object(value)) => value.clone(),
                    actual => {
                        return Err(composition_error(
                            command,
                            Some(argument_id),
                            "object_required",
                            actual,
                        ));
                    }
                }
            } else {
                Map::new()
            };
            for (field, value) in composition
                .get("constants")
                .and_then(Value::as_object)
                .into_iter()
                .flatten()
            {
                payload.insert(field.clone(), value.clone());
            }
            for mapping in composition
                .get("mappings")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let argument_id =
                    mapping
                        .get("argument")
                        .and_then(Value::as_str)
                        .ok_or_else(|| {
                            CliError::internal(
                                "command_composition_contract_invalid",
                                format!("{command} composition mapping has no argument"),
                            )
                        })?;
                let field = mapping
                    .get("field")
                    .and_then(Value::as_str)
                    .ok_or_else(|| {
                        CliError::internal(
                            "command_composition_contract_invalid",
                            format!("{command} composition mapping has no field"),
                        )
                    })?;
                let value = arguments
                    .get(argument_id)
                    .or_else(|| mapping.get("default"));
                let Some(value) = value else {
                    if mapping.get("required").and_then(Value::as_bool) == Some(true) {
                        return Err(composition_error(
                            command,
                            Some(argument_id),
                            "required",
                            None,
                        ));
                    }
                    continue;
                };
                let transform = mapping
                    .get("transform")
                    .and_then(Value::as_str)
                    .unwrap_or("identity");
                let transformed =
                    transform_composition_value(transform, value).map_err(|error| {
                        if error.category == ErrorCategory::Internal {
                            error
                        } else {
                            composition_error(
                                command,
                                Some(argument_id),
                                error.code.as_str(),
                                Some(value),
                            )
                        }
                    })?;
                payload.insert(field.to_string(), transformed);
            }
            Ok(Value::Object(payload))
        }
        Some(binding) => Err(CliError::internal(
            "command_composition_contract_invalid",
            format!("{command} cannot compose capability payload for binding {binding}"),
        )),
        None => Err(CliError::internal(
            "command_composition_contract_invalid",
            format!("{command} has no binding"),
        )),
    }
}

pub fn compose_current_command_payload(
    arguments: &Map<String, Value>,
) -> Result<(String, Value), CliError> {
    let command = current_command().ok_or_else(|| {
        CliError::internal(
            "command_execution_context_missing",
            "Capability composition requires a canonical command context",
        )
    })?;
    let capability = command_entry(&command)?
        .pointer("/target/capability")
        .and_then(Value::as_str)
        .ok_or_else(|| {
            CliError::internal(
                "command_target_contract_violation",
                format!("{command} does not declare a fixed capability target"),
            )
        })?
        .to_string();
    let payload = compose_command_payload(&command, arguments)?;
    Ok((capability, payload))
}

pub fn validate_command_input(
    command: &str,
    argument_id: &str,
    value: &Value,
) -> Result<(), CliError> {
    let inputs = resolved_command_inputs(command)?;
    let schema = inputs
        .get(argument_id)
        .and_then(|input| input.get("schema"))
        .ok_or_else(|| {
            CliError::internal(
                "command_input_contract_missing",
                format!("{command} has no structured input contract for {argument_id}"),
            )
        })?;
    let (violations, truncated) = violations(schema, value)?;
    if violations.is_empty() {
        return Ok(());
    }
    Err(validation_error(
        "command_input_invalid",
        ErrorCategory::Validation,
        "Structured command input does not satisfy the executable contract",
        "command_input",
        Some(command),
        None,
        Some(argument_id),
        violations,
        truncated,
    ))
}

pub fn validate_current_command_input(argument_id: &str, value: &Value) -> Result<(), CliError> {
    let command = current_command().ok_or_else(|| {
        CliError::internal(
            "command_execution_context_missing",
            "Structured input validation requires a canonical command context",
        )
    })?;
    validate_command_input(&command, argument_id, value)
}

pub fn validate_capability_input(capability: &str, value: &Value) -> Result<(), CliError> {
    let entry = capability_entry(capability)?;
    let schema = entry.get("inputSchema").ok_or_else(|| {
        CliError::internal(
            "capability_input_contract_missing",
            format!("{capability} has no input schema"),
        )
    })?;
    let (violations, truncated) = violations(schema, value)?;
    if violations.is_empty() {
        return Ok(());
    }
    Err(validation_error(
        "command_payload_contract_violation",
        ErrorCategory::Internal,
        "Composed capability payload does not satisfy the executable contract",
        "payload_contract",
        current_command().as_deref(),
        Some(capability),
        None,
        violations,
        truncated,
    ))
}

pub fn validate_capability_output(capability: &str, value: &Value) -> Result<(), CliError> {
    let entry = capability_entry(capability)?;
    let schema = entry.get("outputSchema").ok_or_else(|| {
        CliError::internal(
            "capability_output_contract_missing",
            format!("{capability} has no output schema"),
        )
    })?;
    let (violations, truncated) = violations(schema, value)?;
    if violations.is_empty() {
        return Ok(());
    }
    Err(validation_error(
        "command_result_contract_violation",
        ErrorCategory::Protocol,
        "Host capability result does not satisfy the executable contract",
        "command_result",
        current_command().as_deref(),
        Some(capability),
        None,
        violations,
        truncated,
    ))
}

pub fn validate_command_result(value: &Value) -> Result<(), CliError> {
    let command = current_command().ok_or_else(|| {
        CliError::internal(
            "command_execution_context_missing",
            "Command result validation requires a canonical command context",
        )
    })?;
    let entry = command_entry(&command)?;
    let schema = resolved_command_result_schema(&command)?;
    let (violations, truncated) = violations(&schema, value)?;
    if violations.is_empty() {
        return Ok(());
    }
    let category = if entry.pointer("/target/kind").and_then(Value::as_str) == Some("local") {
        ErrorCategory::Internal
    } else {
        ErrorCategory::Protocol
    };
    Err(validation_error(
        "command_result_contract_violation",
        category,
        "Command result does not satisfy the executable contract",
        "command_result",
        Some(&command),
        None,
        None,
        violations,
        truncated,
    ))
}

fn path_matches(template: &str, actual: &str) -> bool {
    let template = template.split('?').next().unwrap_or(template);
    let actual = actual.split('?').next().unwrap_or(actual);
    let template_parts = template.split('/').collect::<Vec<_>>();
    let actual_parts = actual.split('/').collect::<Vec<_>>();
    template_parts.len() == actual_parts.len()
        && template_parts
            .iter()
            .zip(actual_parts.iter())
            .all(|(expected, value)| {
                (expected.starts_with('{') && expected.ends_with('}')) || expected == value
            })
}

pub fn assert_capability_target(capability: &str) -> Result<(), CliError> {
    let Some(command) = current_command() else {
        return Err(CliError::internal(
            "command_execution_context_missing",
            "Remote capability execution requires a canonical command context",
        ));
    };
    let entry = command_entry(&command)?;
    let target = entry
        .get("target")
        .ok_or_else(|| CliError::internal("command_target_missing", "Command target is missing"))?;
    let binding = entry.get("binding").and_then(Value::as_str).unwrap_or("");
    if !matches!(binding, "passthrough" | "overlay" | "object" | "raw") {
        return Err(CliError::internal(
            "command_binding_contract_violation",
            format!("{command} cannot call a capability with binding {binding}"),
        ));
    }
    let declared = std::iter::once(target).chain(
        entry
            .get("auxiliaryTargets")
            .and_then(Value::as_array)
            .into_iter()
            .flatten(),
    );
    if declared.into_iter().any(|target| {
        let kind = target.get("kind").and_then(Value::as_str).unwrap_or("");
        kind == "dynamic-capability"
            || (kind == "capability"
                && target.get("capability").and_then(Value::as_str) == Some(capability))
    }) {
        return Ok(());
    }
    Err(CliError::internal(
        "command_target_contract_violation",
        format!("{command} attempted undeclared capability {capability}"),
    ))
}

pub fn assert_endpoint_target(method: &str, path: &str) -> Result<(), CliError> {
    let Some(command) = current_command() else {
        return Err(CliError::internal(
            "command_execution_context_missing",
            "Remote endpoint execution requires a canonical command context",
        ));
    };
    let entry = command_entry(&command)?;
    let target = entry
        .get("target")
        .ok_or_else(|| CliError::internal("command_target_missing", "Command target is missing"))?;
    let actual_path = format!("/bridge/v2{}", path.split('?').next().unwrap_or(path));
    let declared = std::iter::once(target).chain(
        entry
            .get("auxiliaryTargets")
            .and_then(Value::as_array)
            .into_iter()
            .flatten(),
    );
    if declared.into_iter().any(|target| {
        target.get("kind").and_then(Value::as_str) == Some("endpoint")
            && target.get("method").and_then(Value::as_str) == Some(method)
            && target
                .get("path")
                .and_then(Value::as_str)
                .is_some_and(|target_path| path_matches(target_path, &actual_path))
    }) {
        return Ok(());
    }
    Err(CliError::internal(
        "command_target_contract_violation",
        format!("{command} attempted undeclared target {method} {actual_path}"),
    ))
}

#[cfg(test)]
mod tests {
    use super::{
        assert_capability_target, assert_endpoint_target, compose_command_payload,
        resolved_command_payload_schema, set_current_command, validate_command_input,
        validate_command_result,
    };
    use crate::error::ErrorCategory;
    use serde_json::{json, Map, Value};

    #[test]
    fn item_search_contract_rejects_text_and_accepts_query() {
        validate_command_input("library item search", "query", &json!({ "query": "graph" }))
            .unwrap();
        let error =
            validate_command_input("library item search", "query", &json!({ "text": "graph" }))
                .unwrap_err();
        assert_eq!(error.code, "command_input_invalid");
        let payload = resolved_command_payload_schema("library item search").unwrap();
        assert_eq!(
            payload.pointer("/properties/query/type"),
            Some(&json!("string"))
        );
        assert!(payload.pointer("/properties/text").is_none());
    }

    #[test]
    fn command_target_is_executable() {
        set_current_command("library item search");
        assert_capability_target("library.search_items").unwrap();
        assert!(assert_capability_target("library.list_items").is_err());
    }

    fn arguments(entries: &[(&str, Value)]) -> Map<String, Value> {
        entries
            .iter()
            .map(|(key, value)| ((*key).to_string(), value.clone()))
            .collect()
    }

    #[test]
    fn contract_composes_semantic_mutation_payloads() {
        let cases = [
            (
                "mutation literature-ingest",
                arguments(&[(
                    "input",
                    json!({
                        "collectionRef": { "libraryId": 1, "key": "COLL123" },
                        "paper": { "itemType": "journalArticle" }
                    }),
                )]),
                json!({
                    "operation": "literature.ingest",
                    "collectionRef": { "libraryId": 1, "key": "COLL123" },
                    "paper": { "itemType": "journalArticle" }
                }),
            ),
            (
                "mutation item update",
                arguments(&[
                    ("item", json!({ "libraryId": 1, "key": "ABC123" })),
                    ("patch", json!({ "fields": { "title": "Revised" } })),
                ]),
                json!({
                    "operation": "item.updateMetadata",
                    "itemRef": { "libraryId": 1, "key": "ABC123" },
                    "patch": { "fields": { "title": "Revised" } }
                }),
            ),
            (
                "mutation tag add",
                arguments(&[
                    ("items", json!({ "libraryId": 1, "key": "ABC123" })),
                    ("tags", json!(["topic:graph"])),
                ]),
                json!({
                    "operation": "item.updateTags",
                    "itemRef": { "libraryId": 1, "key": "ABC123" },
                    "add": ["topic:graph"],
                    "remove": []
                }),
            ),
            (
                "mutation note create",
                arguments(&[
                    (
                        "item",
                        json!({ "kind": "child", "parentRef": { "libraryId": 1, "key": "ABC123" } }),
                    ),
                    ("input", json!({ "content": "note" })),
                ]),
                json!({
                    "operation": "notes.create",
                    "placement": { "kind": "child", "parentRef": { "libraryId": 1, "key": "ABC123" } },
                    "content": "note"
                }),
            ),
        ];
        for (command, input, expected) in cases {
            assert_eq!(compose_command_payload(command, &input).unwrap(), expected);
        }
    }

    #[test]
    fn contract_composes_readiness_specializations() {
        for (command, check) in [
            ("library readiness missing-pdf", "pdf"),
            ("library readiness missing-markdown", "markdown"),
            ("library readiness missing-analysis", "analysis"),
        ] {
            let payload = compose_command_payload(
                command,
                &arguments(&[("query", json!({ "cursor": "next", "limit": 20 }))]),
            )
            .unwrap();
            assert_eq!(
                payload,
                json!({
                    "cursor": "next",
                    "limit": 20,
                    "checks": [check],
                    "missingOnly": true
                })
            );
        }
    }

    #[test]
    fn composition_reports_missing_argument_without_network_io() {
        let error = compose_command_payload(
            "mutation item update",
            &arguments(&[("item", json!("ABC123"))]),
        )
        .unwrap_err();
        assert_eq!(error.code, "command_payload_composition_failed");
        let details = error.details.as_ref().unwrap();
        assert_eq!(details["phase"], "payload_composition");
        assert_eq!(details["command"], "mutation item update");
        assert_eq!(details["argumentId"], "patch");
    }

    #[test]
    fn multi_step_command_can_only_use_declared_auxiliary_targets() {
        set_current_command("workflow agent-run");
        assert_endpoint_target("POST", "/workflows/agent-run").unwrap();
        assert_endpoint_target("GET", "/files/file-1").unwrap();
        assert!(assert_endpoint_target("POST", "/files/upload").is_err());
    }

    #[test]
    fn result_contract_distinguishes_local_and_remote_failures() {
        set_current_command("surface identity");
        let local = validate_command_result(&Value::Null).unwrap_err();
        assert_eq!(local.category, ErrorCategory::Internal);

        set_current_command("library item search");
        let remote = validate_command_result(&Value::Null).unwrap_err();
        assert_eq!(remote.category, ErrorCategory::Protocol);
    }
}
