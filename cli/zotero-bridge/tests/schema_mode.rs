use serde_json::Value;
use std::process::Command;

fn run(args: &[&str]) -> (i32, Value, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_zotero-bridge"))
        .args(args)
        .env("ZOTERO_BRIDGE_PROFILE", "/definitely/missing/profile.json")
        .env("ZOTERO_BRIDGE_ENDPOINT", "http://127.0.0.1:1/bridge/v2")
        .env("ZOTERO_BRIDGE_TOKEN", "contract-test-token")
        .output()
        .expect("run zotero-bridge");
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    let value = serde_json::from_str(stdout.trim()).expect("one JSON stdout envelope");
    (output.status.code().unwrap_or(-1), value, stdout)
}

fn run_executable(args: &[&str]) -> (i32, Value, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_zotero-bridge"))
        .args(args)
        .env_remove("ZOTERO_BRIDGE_PROFILE")
        .env("ZOTERO_BRIDGE_ENDPOINT", "http://127.0.0.1:1/bridge/v2")
        .env("ZOTERO_BRIDGE_TOKEN", "contract-test-token")
        .output()
        .expect("run zotero-bridge");
    let stdout = String::from_utf8(output.stdout).expect("utf8 stdout");
    let value = serde_json::from_str(stdout.trim()).expect("one JSON stdout envelope");
    (output.status.code().unwrap_or(-1), value, stdout)
}

#[test]
fn schema_mode_accepts_leading_and_trailing_global_flag_without_required_values() {
    let (_, trailing, _) = run(&["workflow", "submit", "--schema"]);
    let (_, leading, _) = run(&["--schema", "workflow", "submit"]);
    assert_eq!(trailing, leading);
    assert_eq!(trailing["ok"], true);
    assert_eq!(
        trailing["data"]["schema"],
        "zotero-bridge.command-input-schemas.v2"
    );
    assert_eq!(trailing["data"]["command"], "workflow submit");
    assert!(trailing["data"]["inputs"]["selection"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["workflow_options"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["provider_profile"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["input_resource"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["output_resource"]["schema"].is_object());
}

#[test]
fn item_search_schema_owns_query_and_rejects_text() {
    let (_, output, _) = run(&["library", "item", "search", "--schema"]);
    let schema = &output["data"]["inputs"]["query"]["schema"];
    assert!(schema["properties"]["query"].is_object());
    assert!(schema["properties"]["text"].is_null());
    assert_eq!(schema["additionalProperties"], false);
}

#[test]
fn item_search_rejects_legacy_text_with_structured_contract_error() {
    let (code, output, stdout) = run_executable(&[
        "library",
        "item",
        "search",
        "--query",
        r#"{"text":"graph"}"#,
    ]);
    assert_eq!(code, 7);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["error"]["code"], "command_input_invalid");
    assert_eq!(
        output["error"]["details"]["schema"],
        "host-bridge.argument-error.v1"
    );
    assert_eq!(output["error"]["details"]["phase"], "command_input");
    assert_eq!(output["error"]["details"]["command"], "library item search");
    assert_eq!(output["error"]["details"]["argumentId"], "query");
    assert_eq!(
        output["error"]["details"]["violations"][0]["property"],
        "text"
    );
}

#[test]
fn semantic_composition_failure_names_the_argument_and_phase() {
    let (code, output, stdout) = run_executable(&[
        "mutation",
        "item",
        "attach-file",
        "--item",
        "ABC123",
        "--file-id",
        "../artifact.pdf",
    ]);
    assert_eq!(code, 7);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(
        output["error"]["code"],
        "command_payload_composition_failed"
    );
    assert_eq!(output["error"]["details"]["phase"], "payload_composition");
    assert_eq!(
        output["error"]["details"]["command"],
        "mutation item attach-file"
    );
    assert_eq!(output["error"]["details"]["argumentId"], "file_id");
    assert_eq!(output["error"]["stateChange"], "unchanged");
    assert_eq!(output["error"]["handleConsumption"], "unconsumed");
}

#[test]
fn semantic_input_failure_reports_the_derived_command_schema() {
    let (code, output, stdout) = run_executable(&[
        "mutation",
        "literature-ingest",
        "--input",
        r#"{"paper":{"itemType":"journalArticle","fields":{},"creators":[],"identifiers":{}}}"#,
    ]);
    assert_eq!(code, 7);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["error"]["code"], "command_input_invalid");
    assert_eq!(output["error"]["details"]["phase"], "command_input");
    assert_eq!(
        output["error"]["details"]["command"],
        "mutation literature-ingest"
    );
    assert_eq!(output["error"]["details"]["argumentId"], "input");
    assert!(output["error"]["details"]["violations"]
        .as_array()
        .is_some_and(|violations| !violations.is_empty()));
}

#[test]
fn argv_failures_name_the_command_and_argument() {
    let (code, output, stdout) = run(&["library", "item", "search", "--unknown-query", "{}"]);
    assert_eq!(code, 2);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["error"]["code"], "cli_unknown_argument");
    assert_eq!(output["error"]["details"]["phase"], "argv");
    assert_eq!(output["error"]["details"]["command"], "library item search");
    assert!(output["error"]["details"]["argumentId"]
        .as_str()
        .unwrap_or_default()
        .contains("--unknown-query"));
    assert!(output["error"]["details"]["violations"][0]["suggestions"]
        .as_array()
        .is_some_and(|entries| !entries.is_empty()));
}

#[test]
fn schema_mode_reports_unavailable_inputs_with_stable_error() {
    let (code, output, stdout) = run(&["bridge", "manifest", "--schema"]);
    assert_ne!(code, 0);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["ok"], false);
    assert_eq!(output["error"]["code"], "command_input_schema_unavailable");
    assert!(output["error"]["nextCommand"]
        .as_str()
        .unwrap_or_default()
        .contains("surface describe"));
}

#[test]
fn schema_mode_rejects_command_groups() {
    let (code, output, _) = run(&["workflow", "--schema"]);
    assert_eq!(code, 2);
    assert_eq!(output["ok"], false);
    assert_eq!(output["error"]["code"], "command_schema_leaf_required");
}

#[test]
fn schema_bearing_help_lists_examples_and_schema_direction() {
    let output = Command::new(env!("CARGO_BIN_EXE_zotero-bridge"))
        .args(["workflow", "submit", "--help"])
        .output()
        .expect("render help");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("utf8 help");
    assert!(stdout.contains("Examples:"));
    assert!(stdout.contains("--schema"));
    assert!(stdout.contains("shape-only"));
}
