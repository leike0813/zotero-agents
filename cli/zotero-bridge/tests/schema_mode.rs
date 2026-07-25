use serde_json::Value;
use std::process::Command;

fn run(args: &[&str]) -> (i32, Value, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_zotero-bridge"))
        .args(args)
        .env("ZOTERO_BRIDGE_PROFILE", "/definitely/missing/profile.json")
        .env("ZOTERO_BRIDGE_ENDPOINT", "http://127.0.0.1:1/bridge/v1")
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
        "zotero-bridge.command-input-schemas.v1"
    );
    assert_eq!(trailing["data"]["command"], "workflow submit");
    assert!(trailing["data"]["inputs"]["selection"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["workflow_options"]["schema"].is_object());
    assert!(trailing["data"]["inputs"]["provider_profile"]["schema"].is_object());
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
