use serde_json::{json, Value};

use crate::{
    args::{SurfaceArgs, SurfaceCommand, SurfaceDescribeArgs, SurfaceSearchArgs},
    error::CliError,
};

const DESCRIPTOR_SOURCE: &str = include_str!("agent-surface.json");

fn descriptor() -> Result<Value, CliError> {
    serde_json::from_str(DESCRIPTOR_SOURCE).map_err(|error| {
        CliError::internal(
            "invalid_embedded_agent_surface",
            format!("Embedded agent surface is invalid: {error}"),
        )
    })
}

fn command_entries(descriptor: &Value) -> Result<&Vec<Value>, CliError> {
    descriptor
        .get("commands")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            CliError::internal(
                "invalid_embedded_agent_surface",
                "Embedded agent surface is missing commands",
            )
        })
}

fn identity(descriptor: &Value) -> Value {
    json!({
        "schema": "host-bridge.surface-identity.v1",
        "protocol": descriptor.get("protocol").and_then(Value::as_str).unwrap_or("host-bridge.v1"),
        "cliSchema": descriptor.get("cliSchema").and_then(Value::as_str).unwrap_or("zotero-bridge.cli.v1"),
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
    let tokens: Vec<&str> = intent
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect();
    let mut matches: Vec<(usize, Value)> = command_entries(descriptor)?
        .iter()
        .filter_map(|entry| {
            let haystack = serde_json::to_string(entry).ok()?.to_lowercase();
            let phrase = if haystack.contains(&intent) { 100 } else { 0 };
            let score = phrase
                + tokens
                    .iter()
                    .filter(|token| haystack.contains(**token))
                    .count();
            (score > 0).then(|| (score, entry.clone()))
        })
        .collect();
    matches.sort_by(|left, right| {
        right.0.cmp(&left.0).then_with(|| {
            left.1
                .get("command")
                .and_then(Value::as_str)
                .unwrap_or("")
                .cmp(right.1.get("command").and_then(Value::as_str).unwrap_or(""))
        })
    });
    Ok(json!({
        "intent": args.intent,
        "matches": matches.into_iter().map(|(_, entry)| entry).collect::<Vec<_>>()
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
