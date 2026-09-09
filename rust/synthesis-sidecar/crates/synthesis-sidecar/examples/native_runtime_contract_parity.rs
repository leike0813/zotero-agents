use serde::Deserialize;
use serde_json::{Value, json};
use std::io::{self, Read};
use synthesis_sidecar::runtime_contract::{
    rebuild_native_bundle_manifest, rebuild_native_discovery, rebuild_native_handshake,
    rebuild_native_health, rebuild_native_launch_config,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Corpus {
    absolute_runtime_root_token: String,
    manifest: Value,
    launch_config: Value,
    discovery: Value,
    health: Value,
    handshake: Value,
    cases: Vec<Case>,
}

#[derive(Deserialize)]
struct Case {
    id: String,
    kind: String,
    mutation: Option<Mutation>,
}

#[derive(Deserialize)]
struct Mutation {
    path: String,
    value: Value,
}

fn set_path(root: &mut Value, path: &str, value: Value) {
    let segments: Vec<&str> = path.split('.').collect();
    let mut cursor = root;
    for segment in &segments[..segments.len() - 1] {
        cursor = if let Ok(index) = segment.parse::<usize>() {
            &mut cursor.as_array_mut().expect("array path")[index]
        } else {
            cursor
                .as_object_mut()
                .expect("object path")
                .get_mut(*segment)
                .expect("existing path")
        };
    }
    let last = segments.last().expect("path");
    if let Ok(index) = last.parse::<usize>() {
        cursor.as_array_mut().expect("array path")[index] = value;
    } else {
        cursor
            .as_object_mut()
            .expect("object path")
            .insert((*last).to_owned(), value);
    }
}

fn replace_token(value: &mut Value, token: &str, replacement: &str) {
    match value {
        Value::String(text) if text == token => *text = replacement.to_owned(),
        Value::Array(values) => {
            for value in values {
                replace_token(value, token, replacement);
            }
        }
        Value::Object(values) => {
            for value in values.values_mut() {
                replace_token(value, token, replacement);
            }
        }
        _ => {}
    }
}

fn main() -> Result<(), String> {
    let mut source = String::new();
    io::stdin()
        .read_to_string(&mut source)
        .map_err(|error| error.to_string())?;
    let corpus: Corpus = serde_json::from_str(&source).map_err(|error| error.to_string())?;
    let absolute_root = std::env::current_dir()
        .map_err(|error| error.to_string())?
        .join(".scaffold/native-runtime-contract")
        .to_string_lossy()
        .into_owned();
    let results: Vec<Value> = corpus
        .cases
        .iter()
        .map(|case| {
            let mut value = match case.kind.as_str() {
                "manifest" => corpus.manifest.clone(),
                "launch" => corpus.launch_config.clone(),
                "discovery" => corpus.discovery.clone(),
                "health" => corpus.health.clone(),
                "handshake" => corpus.handshake.clone(),
                _ => Value::Null,
            };
            replace_token(
                &mut value,
                &corpus.absolute_runtime_root_token,
                &absolute_root,
            );
            if let Some(mutation) = &case.mutation {
                set_path(&mut value, &mutation.path, mutation.value.clone());
            }
            let source = serde_json::to_string(&value).expect("json");
            let result = match case.kind.as_str() {
                "manifest" => rebuild_native_bundle_manifest(&source),
                "launch" => rebuild_native_launch_config(&source).map(|_| ()),
                "discovery" => rebuild_native_discovery(&source),
                "health" => rebuild_native_health(&source),
                "handshake" => rebuild_native_handshake(&source),
                _ => Err("invalid_kind".to_owned()),
            };
            json!({
                "id":case.id,
                "code":result.err().unwrap_or_else(|| "ok".to_owned()),
            })
        })
        .collect();
    println!("{}", json!({"results":results}));
    Ok(())
}
