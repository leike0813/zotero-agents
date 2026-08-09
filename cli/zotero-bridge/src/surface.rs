use std::collections::{BTreeSet, HashMap};

use clap::{Arg, Command, CommandFactory};
use jsonschema::validator_for;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::{
    args::{Cli, SurfaceArgs, SurfaceCommand, SurfaceDescribeArgs, SurfaceSearchArgs},
    contract,
    error::CliError,
};

const AGENT_SURFACE_SCHEMA_JSON: &str =
    include_str!("../../../schemas/host-bridge.agent-surface.v6.schema.json");

fn raw_argument(command: &Command, arg: &Arg, position: Option<usize>) -> Value {
    json!({
        "id": arg.get_id().as_str(),
        "long": arg.get_long(),
        "short": arg.get_short().map(|value| value.to_string()),
        "index": arg.get_index(),
        "position": position,
        "required": arg.is_required_set(),
        "takesValue": arg.get_action().takes_values(),
        "global": arg.is_global_set(),
        "help": arg.get_help().map(|value| value.to_string()),
        "longHelp": arg.get_long_help().map(|value| value.to_string()),
        "env": arg.get_env().map(|value| value.to_string_lossy().to_string()),
        "aliases": arg
            .get_aliases()
            .unwrap_or_default()
            .into_iter()
            .map(str::to_string)
            .collect::<Vec<_>>(),
        "defaultValues": arg
            .get_default_values()
            .iter()
            .map(|value| value.to_string_lossy().to_string())
            .collect::<Vec<_>>(),
        "valueNames": arg
            .get_value_names()
            .map(|values| values.iter().map(|value| value.to_string()).collect::<Vec<_>>())
            .unwrap_or_default(),
        "possibleValues": arg
            .get_value_parser()
            .possible_values()
            .map(|values| values.map(|value| value.get_name().to_string()).collect::<Vec<_>>())
            .unwrap_or_default(),
        "conflictsWith": command
            .get_arg_conflicts_with(arg)
            .iter()
            .map(|entry| entry.get_id().as_str())
            .collect::<Vec<_>>(),
        "repeatable": matches!(arg.get_action(), clap::ArgAction::Append | clap::ArgAction::Count),
        "numArgs": arg.get_num_args().map(|value| value.to_string()),
    })
}

fn visit_inventory(command: &Command, path: &[String], leaves: &mut Vec<Value>) {
    let children = command
        .get_subcommands()
        .filter(|child| child.get_name() != "help")
        .collect::<Vec<_>>();
    if children.is_empty() {
        leaves.push(json!({
            "command": path.join(" "),
            "argv": path,
            "about": command
                .get_about()
                .map(|value| value.to_string())
                .unwrap_or_default(),
            "arguments": command
                .get_arguments()
                .map(|arg| {
                    let position = command
                        .get_positionals()
                        .position(|positional| positional.get_id() == arg.get_id())
                        .map(|index| index + 1);
                    raw_argument(command, arg, position)
                })
                .collect::<Vec<_>>(),
            "argumentGroups": command
                .get_groups()
                .map(|group| json!({
                    "id": group.get_id().as_str(),
                    "arguments": group.get_args().map(|id| id.as_str()).collect::<Vec<_>>(),
                    "required": group.is_required_set(),
                }))
                .collect::<Vec<_>>(),
        }));
        return;
    }

    for child in children {
        let mut child_path = path.to_vec();
        child_path.push(child.get_name().to_string());
        visit_inventory(child, &child_path, leaves);
    }
}

fn command_inventory() -> (Vec<Value>, Vec<Value>) {
    let root = Cli::command();
    let global_arguments = root
        .get_arguments()
        .filter(|arg| arg.is_global_set())
        .map(|arg| raw_argument(&root, arg, None))
        .collect::<Vec<_>>();
    let mut commands = Vec::new();
    for command in root
        .get_subcommands()
        .filter(|command| command.get_name() != "help")
    {
        visit_inventory(command, &[command.get_name().to_string()], &mut commands);
    }
    commands.sort_by(|left, right| {
        left.get("command")
            .and_then(Value::as_str)
            .cmp(&right.get("command").and_then(Value::as_str))
    });
    (global_arguments, commands)
}

fn string_array(value: Option<&Value>) -> Value {
    Value::Array(value.and_then(Value::as_array).cloned().unwrap_or_default())
}

fn agent_argument(argument: &Value) -> Result<Value, CliError> {
    let id = argument
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| CliError::internal("command_inventory_invalid", "Argument id is missing"))?;
    let position = argument.get("position").and_then(Value::as_u64);
    let long = argument.get("long").and_then(Value::as_str);
    let short = argument.get("short").and_then(Value::as_str);
    let value_names = string_array(argument.get("valueNames"));
    let positional_token = value_names
        .as_array()
        .and_then(|values| values.first())
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| id.to_uppercase());
    let token = if position.is_some() {
        positional_token
    } else if let Some(long) = long {
        format!("--{long}")
    } else if let Some(short) = short {
        format!("-{short}")
    } else {
        id.to_string()
    };
    let mut result = Map::new();
    result.insert("id".to_string(), Value::String(id.to_string()));
    result.insert(
        "kind".to_string(),
        Value::String(
            if position.is_some() {
                "positional"
            } else {
                "option"
            }
            .to_string(),
        ),
    );
    result.insert("token".to_string(), Value::String(token));
    if let Some(position) = position {
        result.insert("position".to_string(), Value::from(position));
    }
    if let (Some(short), Some(_)) = (short, long) {
        result.insert("shortToken".to_string(), Value::String(format!("-{short}")));
    }
    for field in ["takesValue", "required", "global", "repeatable"] {
        result.insert(
            field.to_string(),
            Value::Bool(
                argument
                    .get(field)
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
            ),
        );
    }
    result.insert(
        "help".to_string(),
        Value::String(
            argument
                .get("help")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or(id)
                .to_string(),
        ),
    );
    for field in ["longHelp", "numArgs", "env"] {
        if let Some(value) = argument
            .get(field)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            result.insert(field.to_string(), Value::String(value.to_string()));
        }
    }
    result.insert("valueNames".to_string(), value_names);
    for field in [
        "possibleValues",
        "conflictsWith",
        "aliases",
        "defaultValues",
    ] {
        result.insert(field.to_string(), string_array(argument.get(field)));
    }
    Ok(Value::Object(result))
}

fn invocation_schema(inventory: &Value) -> Result<Value, CliError> {
    let arguments = inventory
        .get("arguments")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            CliError::internal("command_inventory_invalid", "Command arguments are missing")
        })?;
    let mut properties = Map::new();
    let mut required = Vec::new();
    let mut property_by_id = HashMap::new();
    for argument in arguments {
        let id = argument.get("id").and_then(Value::as_str).unwrap_or("");
        let name = argument
            .get("long")
            .and_then(Value::as_str)
            .unwrap_or(id)
            .to_string();
        property_by_id.insert(id.to_string(), name.clone());
        let repeatable = argument
            .get("repeatable")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let takes_value = argument
            .get("takesValue")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let mut property = Map::new();
        if repeatable {
            property.insert("type".to_string(), Value::String("array".to_string()));
            property.insert(
                "items".to_string(),
                json!({ "type": if takes_value { "string" } else { "boolean" } }),
            );
        } else {
            property.insert(
                "type".to_string(),
                Value::String(if takes_value { "string" } else { "boolean" }.to_string()),
            );
        }
        if let Some(help) = argument
            .get("help")
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
        {
            property.insert("description".to_string(), Value::String(help.to_string()));
        }
        if let Some(position) = argument.get("position").and_then(Value::as_u64) {
            property.insert("position".to_string(), Value::from(position));
        }
        properties.insert(name.clone(), Value::Object(property));
        if argument
            .get("required")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            required.push(Value::String(name));
        }
    }

    let mut all_of = Vec::new();
    let mut conflict_pairs = BTreeSet::new();
    for argument in arguments {
        let id = argument.get("id").and_then(Value::as_str).unwrap_or("");
        let Some(left) = property_by_id.get(id) else {
            continue;
        };
        for conflict_id in argument
            .get("conflictsWith")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
        {
            let Some(right) = property_by_id.get(conflict_id) else {
                continue;
            };
            let mut pair = [left.clone(), right.clone()];
            pair.sort();
            if conflict_pairs.insert(pair.join("\n")) {
                all_of.push(json!({ "not": { "required": pair } }));
            }
        }
    }
    for group in inventory
        .get("argumentGroups")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if !group
            .get("required")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            continue;
        }
        let members = group
            .get("arguments")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .filter_map(|id| property_by_id.get(id))
            .map(|member| json!({ "required": [member] }))
            .collect::<Vec<_>>();
        if !members.is_empty() {
            all_of.push(json!({ "oneOf": members }));
        }
    }
    let mut result = json!({
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": false,
    });
    if !all_of.is_empty() {
        result
            .as_object_mut()
            .expect("object")
            .insert("allOf".to_string(), Value::Array(all_of));
    }
    Ok(result)
}

fn argv_bindings(inventory: &Value) -> Result<Value, CliError> {
    let arguments = inventory
        .get("arguments")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            CliError::internal("command_inventory_invalid", "Command arguments are missing")
        })?;
    arguments
        .iter()
        .map(|argument| {
            let id = argument.get("id").and_then(Value::as_str).unwrap_or("");
            let long = argument.get("long").and_then(Value::as_str);
            let short = argument.get("short").and_then(Value::as_str);
            let position = argument.get("position").and_then(Value::as_u64);
            let value_names = string_array(argument.get("valueNames"));
            let token = if position.is_some() {
                value_names
                    .as_array()
                    .and_then(|values| values.first())
                    .and_then(Value::as_str)
                    .map(str::to_string)
                    .unwrap_or_else(|| id.to_uppercase())
            } else if let Some(long) = long {
                format!("--{long}")
            } else if let Some(short) = short {
                format!("-{short}")
            } else {
                return Err(CliError::internal(
                    "command_inventory_invalid",
                    format!("Argument {id} has no argv binding"),
                ));
            };
            let mut result = json!({
                "property": long.unwrap_or(id),
                "kind": if position.is_some() { "positional" } else { "option" },
                "token": token,
                "takesValue": argument.get("takesValue").and_then(Value::as_bool).unwrap_or(false),
                "required": argument.get("required").and_then(Value::as_bool).unwrap_or(false),
                "valueNames": value_names,
            });
            let object = result.as_object_mut().expect("object");
            if let Some(position) = position {
                object.insert("position".to_string(), Value::from(position));
            }
            if let (Some(short), Some(_)) = (short, long) {
                object.insert("shortToken".to_string(), Value::String(format!("-{short}")));
            }
            Ok(result)
        })
        .collect::<Result<Vec<_>, _>>()
        .map(Value::Array)
}

fn agent_target(target: &Value) -> Result<Value, CliError> {
    let kind = target.get("kind").and_then(Value::as_str).unwrap_or("");
    match kind {
        "capability" => Ok(json!({
            "kind": "capability",
            "target": target.get("capability").and_then(Value::as_str).unwrap_or(""),
        })),
        "endpoint" => Ok(json!({
            "kind": "endpoint",
            "target": format!(
                "{} {}",
                target.get("method").and_then(Value::as_str).unwrap_or(""),
                target.get("path").and_then(Value::as_str).unwrap_or("")
            ),
        })),
        "dynamic-capability" => Ok(json!({
            "kind": "service",
            "target": "POST /bridge/v2/call",
        })),
        "local" => Ok(json!({
            "kind": "service",
            "target": "embedded host-bridge.agent-surface.v6",
        })),
        _ => Err(CliError::internal(
            "command_target_invalid",
            format!("Unsupported command target kind {kind}"),
        )),
    }
}

fn targets(contract: &Value) -> Result<Value, CliError> {
    let target = contract.get("target").ok_or_else(|| {
        CliError::internal(
            "command_target_missing",
            "Command contract target is missing",
        )
    })?;
    std::iter::once(target)
        .chain(
            contract
                .get("auxiliaryTargets")
                .and_then(Value::as_array)
                .into_iter()
                .flatten(),
        )
        .map(agent_target)
        .collect::<Result<Vec<_>, _>>()
        .map(Value::Array)
}

fn validate_contract_binding(inventory: &Value, contract: &Value) -> Result<(), CliError> {
    let command = inventory
        .get("command")
        .and_then(Value::as_str)
        .unwrap_or("");
    let arguments = inventory
        .get("arguments")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    for (argument_id, input) in contract
        .get("inputs")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
    {
        let argument = arguments
            .iter()
            .find(|candidate| candidate.get("id").and_then(Value::as_str) == Some(argument_id))
            .ok_or_else(|| {
                CliError::internal(
                    "command_contract_binding_invalid",
                    format!("{command} contract names missing argument {argument_id}"),
                )
            })?;
        let token = if let Some(long) = argument.get("long").and_then(Value::as_str) {
            format!("--{long}")
        } else {
            argument_id.to_string()
        };
        let required = argument
            .get("required")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        if input.get("token").and_then(Value::as_str) != Some(token.as_str())
            || input.get("required").and_then(Value::as_bool) != Some(required)
        {
            return Err(CliError::internal(
                "command_contract_binding_invalid",
                format!("{command} contract metadata differs for {argument_id}"),
            ));
        }
    }
    if let Some(composition) = contract.get("composition") {
        let mut referenced = Vec::new();
        if let Some(argument) = composition
            .pointer("/base/argument")
            .and_then(Value::as_str)
        {
            referenced.push(argument);
        }
        referenced.extend(
            composition
                .get("mappings")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(|mapping| mapping.get("argument").and_then(Value::as_str)),
        );
        for argument_id in referenced {
            if !arguments
                .iter()
                .any(|candidate| candidate.get("id").and_then(Value::as_str) == Some(argument_id))
            {
                return Err(CliError::internal(
                    "command_contract_binding_invalid",
                    format!("{command} composition names missing argument {argument_id}"),
                ));
            }
        }
    }
    Ok(())
}

fn descriptor_command(inventory: &Value, contract: &Value) -> Result<Value, CliError> {
    validate_contract_binding(inventory, contract)?;
    let command = inventory
        .get("command")
        .and_then(Value::as_str)
        .unwrap_or("");
    let arguments = inventory
        .get("arguments")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(agent_argument)
        .collect::<Result<Vec<_>, _>>()?;
    let mut result = Map::new();
    result.insert("command".to_string(), Value::String(command.to_string()));
    result.insert(
        "argv".to_string(),
        inventory
            .get("argv")
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );
    result.insert(
        "summary".to_string(),
        Value::String(
            inventory
                .get("about")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty())
                .unwrap_or(command)
                .to_string(),
        ),
    );
    result.insert(
        "invocationSchema".to_string(),
        invocation_schema(inventory)?,
    );
    result.insert("arguments".to_string(), Value::Array(arguments));
    result.insert("argvBindings".to_string(), argv_bindings(inventory)?);
    result.insert(
        "inputSchemas".to_string(),
        Value::Object(contract::resolved_command_inputs(command)?),
    );
    result.insert(
        "payloadSchema".to_string(),
        contract::resolved_command_payload_schema(command)?,
    );
    result.insert(
        "composition".to_string(),
        contract.get("composition").cloned().unwrap_or(Value::Null),
    );
    for field in [
        "category",
        "danger",
        "binding",
        "outputBoundary",
        "pagination",
        "effects",
        "approvalContract",
        "handleTransitions",
        "recovery",
        "operationalAliases",
        "hiddenFromIntentSearch",
    ] {
        result.insert(
            field.to_string(),
            contract.get(field).cloned().ok_or_else(|| {
                CliError::internal(
                    "command_contract_invalid",
                    format!("{command} contract is missing {field}"),
                )
            })?,
        );
    }
    result.insert(
        "resultSchema".to_string(),
        contract::resolved_command_result_schema(command)?,
    );
    result.insert("targets".to_string(), targets(contract)?);
    Ok(Value::Object(result))
}

fn stable_serialize(value: &Value) -> String {
    match value {
        Value::Array(values) => format!(
            "[{}]",
            values
                .iter()
                .map(stable_serialize)
                .collect::<Vec<_>>()
                .join(",")
        ),
        Value::Object(entries) => {
            let mut entries = entries.iter().collect::<Vec<_>>();
            entries.sort_by(|left, right| left.0.cmp(right.0));
            format!(
                "{{{}}}",
                entries
                    .into_iter()
                    .map(|(key, value)| format!(
                        "{}:{}",
                        serde_json::to_string(key).expect("serialize key"),
                        stable_serialize(value)
                    ))
                    .collect::<Vec<_>>()
                    .join(",")
            )
        }
        _ => serde_json::to_string(value).expect("serialize value"),
    }
}

fn checksum(global_options: &[Value], commands: &[Value]) -> String {
    let value = json!({
        "globalOptions": global_options,
        "commands": commands,
    });
    format!("{:x}", Sha256::digest(stable_serialize(&value).as_bytes()))
}

pub fn descriptor() -> Result<Value, CliError> {
    let (global_arguments, inventory_commands) = command_inventory();
    let command_contract = contract::command_contract()?;
    let contracts = command_contract
        .get("commands")
        .and_then(Value::as_object)
        .ok_or_else(|| {
            CliError::internal(
                "command_contract_invalid",
                "Command contract entries are missing",
            )
        })?;
    let inventory_names = inventory_commands
        .iter()
        .filter_map(|entry| entry.get("command").and_then(Value::as_str))
        .collect::<BTreeSet<_>>();
    let contract_names = contracts
        .keys()
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    if inventory_names != contract_names {
        let missing = inventory_names
            .difference(&contract_names)
            .copied()
            .collect::<Vec<_>>();
        let orphan = contract_names
            .difference(&inventory_names)
            .copied()
            .collect::<Vec<_>>();
        return Err(CliError::internal(
            "command_contract_inventory_mismatch",
            format!(
                "missing=[{}], orphan=[{}]",
                missing.join(", "),
                orphan.join(", ")
            ),
        ));
    }
    let commands = inventory_commands
        .iter()
        .map(|inventory| {
            let command = inventory
                .get("command")
                .and_then(Value::as_str)
                .unwrap_or("");
            descriptor_command(inventory, contracts.get(command).expect("checked command"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut global_options = global_arguments
        .iter()
        .map(agent_argument)
        .collect::<Result<Vec<_>, _>>()?;
    global_options.sort_by(|left, right| {
        left.get("token")
            .and_then(Value::as_str)
            .cmp(&right.get("token").and_then(Value::as_str))
    });
    let command_catalog_checksum = checksum(&global_options, &commands);
    let result = json!({
        "schema": "host-bridge.agent-surface.v6",
        "protocol": "host-bridge.v2",
        "cliSchema": "zotero-bridge.cli.v5",
        "commandCatalogChecksum": command_catalog_checksum,
        "globalOptions": global_options,
        "commands": commands,
    });
    let schema = serde_json::from_str::<Value>(AGENT_SURFACE_SCHEMA_JSON).map_err(|error| {
        CliError::internal(
            "agent_surface_schema_invalid",
            format!("Agent Surface schema is invalid JSON: {error}"),
        )
    })?;
    let validator = validator_for(&schema).map_err(|error| {
        CliError::internal(
            "agent_surface_schema_invalid",
            format!("Agent Surface schema cannot compile: {error}"),
        )
    })?;
    if let Some(error) = validator.iter_errors(&result).next() {
        return Err(CliError::internal(
            "agent_surface_contract_violation",
            format!("Derived Agent Surface violates its schema: {error}"),
        ));
    }
    Ok(result)
}

fn command_entries(descriptor: &Value) -> Result<&Vec<Value>, CliError> {
    descriptor
        .get("commands")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            CliError::internal(
                "invalid_derived_agent_surface",
                "Derived Agent Surface is missing commands",
            )
        })
}

pub fn cli_schema() -> Result<String, CliError> {
    descriptor()?
        .get("cliSchema")
        .and_then(Value::as_str)
        .filter(|value| *value == "zotero-bridge.cli.v5")
        .map(str::to_string)
        .ok_or_else(|| {
            CliError::internal(
                "invalid_derived_agent_surface",
                "Derived Agent Surface is missing the current CLI schema",
            )
        })
}

fn identity(descriptor: &Value) -> Value {
    json!({
        "schema": "host-bridge.surface-identity.v6",
        "protocol": descriptor.get("protocol").and_then(Value::as_str).unwrap_or(""),
        "cliSchema": descriptor.get("cliSchema").and_then(Value::as_str).unwrap_or(""),
        "version": env!("CARGO_PKG_VERSION"),
        "buildFingerprint": option_env!("ZOTERO_BRIDGE_BUILD_FINGERPRINT").unwrap_or("development"),
        "commandCatalogChecksum": descriptor.get("commandCatalogChecksum").and_then(Value::as_str).unwrap_or(""),
    })
}

fn describe(descriptor: &Value, args: SurfaceDescribeArgs) -> Result<Value, CliError> {
    let requested = args.command.join(" ").trim().to_lowercase();
    command_entries(descriptor)?
        .iter()
        .find(|entry| {
            entry
                .get("command")
                .and_then(Value::as_str)
                .map(|command| command == requested)
                .unwrap_or(false)
        })
        .cloned()
        .ok_or_else(|| {
            CliError::validation(
                "surface_command_not_found",
                format!("Unknown canonical command: {requested}"),
            )
            .with_next_command("zotero-bridge surface search --intent <intent> --json")
        })
}

fn search(descriptor: &Value, args: SurfaceSearchArgs) -> Result<Value, CliError> {
    let intent = args.intent.trim().to_lowercase();
    if intent.is_empty() {
        return Err(CliError::validation(
            "surface_intent_required",
            "surface search requires a non-empty --intent",
        ));
    }
    let tokens = intent
        .split(|character: char| !character.is_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>();
    let mut matches = command_entries(descriptor)?
        .iter()
        .filter(|entry| {
            args.include_debug
                || !entry
                    .get("hiddenFromIntentSearch")
                    .and_then(Value::as_bool)
                    .unwrap_or(false)
        })
        .filter_map(|entry| {
            let fields = [
                entry.get("command"),
                entry.get("summary"),
                entry.get("operationalAliases"),
            ];
            let haystack = fields
                .iter()
                .filter_map(|value| *value)
                .map(|value| serde_json::to_string(value).ok())
                .collect::<Option<Vec<_>>>()?
                .join(" ")
                .to_lowercase();
            let phrase = if haystack.contains(&intent) { 100 } else { 0 };
            let matched_tokens = tokens
                .iter()
                .filter(|token| haystack.contains(**token))
                .map(|token| (*token).to_string())
                .collect::<Vec<_>>();
            let score = phrase + matched_tokens.len();
            let mut reasons = Vec::new();
            if phrase > 0 {
                reasons.push(format!("phrase:{intent}"));
            }
            reasons.extend(
                matched_tokens
                    .into_iter()
                    .map(|token| format!("token:{token}")),
            );
            (score > 0).then(|| (score, reasons, entry.clone()))
        })
        .collect::<Vec<_>>();
    matches.sort_by(|left, right| {
        right.0.cmp(&left.0).then_with(|| {
            left.2
                .get("command")
                .and_then(Value::as_str)
                .unwrap_or("")
                .cmp(right.2.get("command").and_then(Value::as_str).unwrap_or(""))
        })
    });
    Ok(json!({
        "intent": args.intent,
        "matches": matches
            .into_iter()
            .take(args.limit as usize)
            .map(|(_, match_reasons, command)| json!({
                "command": command.get("command").cloned().unwrap_or(Value::Null),
                "summary": command.get("summary").cloned().unwrap_or(Value::Null),
                "category": command.get("category").cloned().unwrap_or(Value::Null),
                "danger": command.get("danger").cloned().unwrap_or(Value::Null),
                "matchReasons": match_reasons,
            }))
            .collect::<Vec<_>>()
    }))
}

pub fn run(args: SurfaceArgs) -> Result<Value, CliError> {
    let descriptor = descriptor()?;
    match args.command {
        SurfaceCommand::Identity(_) => Ok(identity(&descriptor)),
        SurfaceCommand::Describe(args) => describe(&descriptor, args),
        SurfaceCommand::Search(args) => search(&descriptor, args),
    }
}

#[cfg(test)]
mod tests {
    use super::{descriptor, identity, search};
    use crate::args::SurfaceSearchArgs;

    #[test]
    fn identity_uses_derived_v6_contract() {
        let value = identity(&descriptor().unwrap());
        assert_eq!(value["schema"], "host-bridge.surface-identity.v6");
        assert_eq!(value["cliSchema"], "zotero-bridge.cli.v5");
    }

    #[test]
    fn search_matches_operational_terms() {
        let value = search(
            &descriptor().unwrap(),
            SurfaceSearchArgs {
                intent: "workflow submit".to_string(),
                limit: 10,
                include_debug: false,
                json: true,
            },
        )
        .unwrap();
        assert_eq!(value["matches"][0]["command"], "workflow submit");
        assert_eq!(
            value["matches"][0]["matchReasons"][0],
            "phrase:workflow submit"
        );
    }
}
