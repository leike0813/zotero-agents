use clap::{Command, CommandFactory};
use serde_json::{json, Map, Value};

use crate::args::Cli;
use crate::contract;
use crate::error::{CliError, ErrorCategory};

pub fn is_schema_request(argv: &[String]) -> bool {
    argv.iter().skip(1).any(|argument| argument == "--schema")
}

pub fn leaf_path(argv: &[String]) -> Result<String, CliError> {
    let root = Cli::command();
    let mut command = &root;
    let mut path = Vec::new();
    let mut index = 1usize;
    while index < argv.len() {
        let token = argv[index].as_str();
        if token == "--schema" {
            index += 1;
            continue;
        }
        if matches!(token, "--endpoint" | "--profile" | "--operation-id") {
            index += 2;
            continue;
        }
        if token.starts_with('-') {
            index += 1;
            continue;
        }
        let Some(next) = command.find_subcommand(token) else {
            if command.get_subcommands().next().is_none() {
                break;
            }
            return Err(CliError::new(
                "command_schema_path_invalid",
                ErrorCategory::Usage,
                format!("Cannot resolve canonical command path near: {token}"),
            )
            .with_next_command("zotero-bridge surface search --intent <intent> --json"));
        };
        path.push(next.get_name().to_string());
        command = next;
        index += 1;
    }

    if path.is_empty() || command.get_subcommands().next().is_some() {
        return Err(CliError::new(
            "command_schema_leaf_required",
            ErrorCategory::Usage,
            "--schema requires one canonical leaf command",
        )
        .with_next_command("zotero-bridge surface search --intent <intent> --json"));
    }
    Ok(path.join(" "))
}

pub fn run(argv: &[String]) -> Result<Value, CliError> {
    let command = leaf_path(argv)?;
    let inputs = contract::resolved_command_inputs(&command)?;
    if inputs.is_empty() {
        return Err(CliError::validation(
            "command_input_schema_unavailable",
            format!("{command} has no structured JSON input schema"),
        )
        .with_next_command(format!("zotero-bridge surface describe {command} --json")));
    }
    Ok(json!({
        "schema": "zotero-bridge.command-input-schemas.v2",
        "command": command,
        "inputs": inputs,
    }))
}

fn example_lines(command_path: &[String], contract: &Value) -> Vec<String> {
    let Some(inputs) = contract.get("inputs").and_then(Value::as_object) else {
        return Vec::new();
    };
    let mut lines = Vec::new();
    for input in inputs.values() {
        let Some(token) = input.get("token").and_then(Value::as_str) else {
            continue;
        };
        let Some(example) = input
            .get("examples")
            .and_then(Value::as_array)
            .and_then(|examples| examples.first())
        else {
            continue;
        };
        let value = serde_json::to_string(example.get("value").unwrap_or(&Value::Null))
            .unwrap_or_else(|_| "null".to_string());
        let kind = example
            .get("kind")
            .and_then(Value::as_str)
            .unwrap_or("shape-only");
        lines.push(format!(
            "  zotero-bridge {} {} '{}'  # {}",
            command_path.join(" "),
            token,
            value,
            kind
        ));
        if let Some(prerequisites) = example.get("prerequisites").and_then(Value::as_array) {
            for prerequisite in prerequisites.iter().filter_map(Value::as_str) {
                lines.push(format!("    prerequisite: {prerequisite}"));
            }
        }
    }
    lines
}

fn augment(command: &mut Command, path: &mut Vec<String>, contracts: &Map<String, Value>) {
    let child_names = command
        .get_subcommands()
        .map(|child| child.get_name().to_string())
        .collect::<Vec<_>>();
    if child_names.is_empty() {
        let canonical = path.join(" ");
        if let Some(contract) = contracts.get(&canonical) {
            let examples = example_lines(path, contract);
            if !examples.is_empty() {
                let mut text = String::from("Examples:\n");
                text.push_str(&examples.join("\n"));
                text.push_str(&format!(
                    "\n\nUse `zotero-bridge {} --schema` for complete raw JSON Schemas.",
                    canonical
                ));
                *command = command.clone().after_long_help(text);
            }
        }
        return;
    }
    for child_name in child_names {
        let child = command
            .find_subcommand_mut(&child_name)
            .expect("subcommand remains present");
        path.push(child_name);
        augment(child, path, contracts);
        path.pop();
    }
}

pub fn augment_command_help(command: &mut Command) {
    let Ok(registry) = contract::command_contract() else {
        return;
    };
    let Some(contracts) = registry.get("commands").and_then(Value::as_object) else {
        return;
    };
    augment(command, &mut Vec::new(), contracts);
}
