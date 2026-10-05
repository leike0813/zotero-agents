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
fn saved_search_discovery_is_available_offline_with_bounded_continuation() {
    let (code, output, _) = run(&["surface", "describe", "library saved-searches list"]);
    assert_eq!(code, 0);
    let descriptor = &output["data"];
    let serialized = serde_json::to_string(descriptor).unwrap();
    assert!(serialized.contains("library.list_saved_searches"));
    assert!(serialized.contains("cursor"));
    assert!(serialized.contains("savedSearches"));
}

#[test]
fn ordinary_reads_reject_removed_payload_windows_and_note_excerpt_options() {
    for args in [
        vec![
            "library",
            "note",
            "payload",
            "--key",
            "ABC12345",
            "--payload-type",
            "references-json",
            "--offset",
            "1",
        ],
        vec![
            "library",
            "item",
            "notes",
            "--key",
            "ABC12345",
            "--max-excerpt-chars",
            "40",
        ],
    ] {
        let (code, output, _) = run_executable(&args);
        assert_eq!(code, 2);
        assert_eq!(output["error"]["code"], "cli_unknown_argument");
        assert_eq!(output["error"]["details"]["phase"], "argv");
    }
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
    assert_eq!(
        schema["$ref"],
        "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSearchRequest"
    );
}

#[test]
fn item_search_schema_describes_full_result_cursor_boundary() {
    let (code, output, _) = run(&["surface", "describe", "library item search"]);
    assert_eq!(code, 0);
    let descriptor = &output["data"];
    assert_eq!(descriptor["pagination"], "cursor");
    assert_eq!(descriptor["outputBoundary"]["strategy"], "cursor");
    assert_eq!(descriptor["outputBoundary"]["section"], "data.results");
    assert_eq!(descriptor["outputBoundary"]["cursorInput"], "cursor");
    assert_eq!(
        descriptor["outputBoundary"]["continuation"][0],
        "data.nextCursor"
    );
    assert_eq!(
        descriptor["outputBoundary"]["continuation"][1],
        "data.hasMore"
    );
    assert!(descriptor["outputBoundary"]["continuation"]
        .as_array()
        .unwrap()
        .iter()
        .any(|field| field == "data.total"));
    assert!(descriptor["recovery"][0]["action"]
        .as_str()
        .unwrap()
        .contains("Do not retry or rerun"));
}

#[test]
fn topic_search_schema_owns_the_canonical_topic_search_request() {
    let (_, output, _) = run(&["synthesis", "topic", "search", "--schema"]);
    let schema = &output["data"]["inputs"]["query"]["schema"];
    assert_eq!(
        schema["$ref"],
        "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
    );
    let (code, rejection, _) = run_executable(&[
        "synthesis",
        "topic",
        "search",
        "--query",
        r#"{"query":"needle","text":"needle"}"#,
    ]);
    assert_ne!(code, 0);
    assert_eq!(rejection["error"]["code"], "command_input_invalid");
}

#[test]
fn topic_search_schema_describes_full_result_cursor_boundary() {
    let (code, output, _) = run(&["surface", "describe", "synthesis topic search"]);
    assert_eq!(code, 0);
    let descriptor = &output["data"];
    assert_eq!(descriptor["targets"][0]["target"], "topics.search");
    assert_eq!(descriptor["danger"], "none");
    assert_eq!(descriptor["effects"][0]["stateChanged"], false);
    assert_eq!(descriptor["approvalContract"]["kind"], "none");
    assert_eq!(descriptor["pagination"], "cursor");
    assert_eq!(descriptor["outputBoundary"]["strategy"], "cursor");
    assert_eq!(descriptor["outputBoundary"]["section"], "data.results");
    assert_eq!(descriptor["outputBoundary"]["cursorInput"], "cursor");
    let continuation = descriptor["outputBoundary"]["continuation"]
        .as_array()
        .unwrap();
    for field in ["data.nextCursor", "data.hasMore", "data.total"] {
        assert!(continuation.iter().any(|value| value == field), "{field}");
    }
    assert!(descriptor["recovery"][0]["action"]
        .as_str()
        .unwrap()
        .contains("Do not retry or rerun"));
}

#[test]
fn enumeration_schemas_use_filter_while_search_keeps_query() {
    for command in [
        vec!["library", "items", "list", "--schema"],
        vec!["library", "readiness", "audit", "--schema"],
    ] {
        let (code, output, _) = run(&command);
        assert_eq!(code, 0);
        let schema = &output["data"]["inputs"]["query"]["schema"];
        assert!(schema["properties"]["filter"].is_object());
        assert!(schema["properties"]["query"].is_null());
        assert_eq!(schema["additionalProperties"], false);
    }

    let (_, output, _) = run(&["library", "item", "search", "--schema"]);
    let schema = &output["data"]["inputs"]["query"]["schema"];
    assert!(schema["properties"]["filter"].is_null());

    for args in [
        vec![
            "library",
            "items",
            "list",
            "--query",
            r#"{"filter":"paper","limit":5}"#,
        ],
        vec![
            "library",
            "readiness",
            "audit",
            "--query",
            r#"{"filter":"paper","checks":["pdf"]}"#,
        ],
        vec![
            "library",
            "item",
            "search",
            "--query",
            r#"{"query":"paper","limit":5}"#,
        ],
    ] {
        let (code, output, stdout) = run_executable(&args);
        assert_eq!(code, 4);
        assert_eq!(stdout.lines().count(), 1);
        assert_eq!(output["error"]["category"], "connection");
        assert_eq!(output["error"]["code"], "bridge_unavailable");
    }

    for args in [
        vec![
            "library",
            "items",
            "list",
            "--query",
            r#"{"query":"paper","limit":5}"#,
        ],
        vec![
            "library",
            "readiness",
            "audit",
            "--query",
            r#"{"query":"paper","checks":["pdf"]}"#,
        ],
        vec![
            "library",
            "item",
            "search",
            "--query",
            r#"{"filter":"paper"}"#,
        ],
    ] {
        let (code, output, stdout) = run_executable(&args);
        assert_eq!(code, 7);
        assert_eq!(stdout.lines().count(), 1);
        assert_eq!(output["error"]["code"], "command_input_invalid");
        assert_eq!(output["error"]["details"]["phase"], "command_input");
        assert_eq!(output["error"]["details"]["argumentId"], "query");
    }
}

#[test]
fn navigation_schema_exposes_canonical_items_and_direct_reader_location() {
    let (code, reveal, _) = run(&["navigation", "reveal-items", "--schema"]);
    assert_eq!(code, 0);
    let reveal_schema = &reveal["data"]["inputs"]["input"]["schema"];
    assert!(reveal_schema["properties"]["items"].is_object());
    assert!(reveal_schema["properties"]["itemRefs"].is_null());
    assert_eq!(reveal_schema["required"], serde_json::json!(["items"]));

    let (code, reader, _) = run(&["navigation", "open-reader-location", "--schema"]);
    assert_eq!(code, 0);
    let reader_schema = &reader["data"]["inputs"]["input"]["schema"];
    assert!(reader_schema["oneOf"].is_array());
    assert!(reader_schema["properties"]["target"].is_null());
    assert!(reader_schema["properties"]["location"].is_null());
    let serialized = serde_json::to_string(reader_schema).unwrap();
    assert!(serialized.contains("attachment"));
    assert!(serialized.contains("pageIndex"));
    assert!(serialized.contains("annotation"));
    assert!(serialized.contains("cfi"));
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
    assert!(output["error"]["details"]["violations"]
        .as_array()
        .is_some_and(|violations| !violations.is_empty()));
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
    assert_eq!(output["error"]["code"], "invalid_portable_ref");
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
fn removed_mutation_execute_capability_is_not_exposed() {
    let (code, output, stdout) = run_executable(&[
        "--operation-id",
        "from-flag",
        "call",
        "mutation.execute",
        "--input",
        r#"{"operation":"item.create","operationId":"from-input"}"#,
    ]);
    assert_eq!(code, 7);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["error"]["code"], "capability_not_found");
}

#[test]
fn raw_mutation_observation_rejects_authority_invalid_operation_id_before_connection() {
    let input = format!(r#"{{"operationId":"{}"}}"#, "a".repeat(129));
    let (code, output, stdout) =
        run_executable(&["call", "mutation.get_operation", "--input", input.as_str()]);
    assert_eq!(code, 7);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["error"]["code"], "invalid_operation_id");
}

#[test]
fn mutation_get_operation_schema_uses_canonical_observation_input() {
    let (code, output, stdout) = run(&["mutation", "get-operation", "--schema"]);
    assert_eq!(code, 0);
    assert_eq!(stdout.lines().count(), 1);
    assert_eq!(output["data"]["command"], "mutation get-operation");
    let schema = &output["data"]["inputs"]["operation_id"]["schema"];
    assert_eq!(schema["type"], "string");
    assert_eq!(schema["minLength"], 1);
    assert_eq!(schema["maxLength"], 128);
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
