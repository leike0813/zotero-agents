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

pub fn cli_schema() -> Result<String, CliError> {
    descriptor()?
        .get("cliSchema")
        .and_then(Value::as_str)
        .filter(|value| *value == "zotero-bridge.cli.v3")
        .map(str::to_string)
        .ok_or_else(|| {
            CliError::internal(
                "invalid_embedded_agent_surface",
                "Embedded agent surface is missing the current CLI schema",
            )
        })
}

fn identity(descriptor: &Value) -> Value {
    json!({
        "schema": "host-bridge.surface-identity.v4",
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
    let tokens: Vec<&str> = intent
        .split(|character: char| !character.is_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect();
    let mut matches: Vec<(usize, Vec<String>, Value)> = command_entries(descriptor)?
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
        .collect();
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
                "command": command,
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
    fn identity_uses_embedded_v4_contract() {
        let value = identity(&descriptor().unwrap());
        assert_eq!(value["schema"], "host-bridge.surface-identity.v4");
        assert_eq!(value["cliSchema"], "zotero-bridge.cli.v3");
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
        assert_eq!(value["matches"][0]["command"]["command"], "workflow submit");
        assert_eq!(
            value["matches"][0]["matchReasons"][0],
            "phrase:workflow submit"
        );
    }
}
