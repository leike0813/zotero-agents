use serde::Serialize;
use serde_json::{json, Value};

use crate::error::CliError;

#[derive(Debug, Serialize)]
struct SuccessOutput {
    ok: bool,
    data: Value,
    meta: Value,
}

#[derive(Debug, Serialize)]
struct ErrorOutput {
    ok: bool,
    error: crate::error::ErrorPayload,
    meta: Value,
}

pub fn print_success(data: Value) {
    let output = SuccessOutput {
        ok: true,
        data,
        meta: json!({
            "cli": "zotero-bridge",
            "schema": "zotero-bridge.cli.v1"
        }),
    };
    println!(
        "{}",
        serde_json::to_string(&output).expect("serialize success")
    );
}

pub fn print_error(error: CliError) {
    let output = ErrorOutput {
        ok: false,
        error: error.to_payload(),
        meta: json!({
            "cli": "zotero-bridge",
            "schema": "zotero-bridge.cli.v1"
        }),
    };
    println!(
        "{}",
        serde_json::to_string(&output).expect("serialize error")
    );
}
