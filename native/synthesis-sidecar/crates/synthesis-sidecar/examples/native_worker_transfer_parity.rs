use serde::Deserialize;
use serde_json::{Value, json};
use std::io::{self, Read};
use std::sync::atomic::AtomicBool;
use synthesis_protocol::{canonical_json, canonical_sha256};

#[derive(Deserialize)]
struct Corpus {
    schema: String,
    lifecycle: Vec<String>,
    request: Value,
}

fn main() -> Result<(), String> {
    let mut source = String::new();
    io::stdin()
        .read_to_string(&mut source)
        .map_err(|error| error.to_string())?;
    let corpus: Corpus = serde_json::from_str(&source).map_err(|error| error.to_string())?;
    if corpus.schema != "synthesis-native-worker-transfer-parity.v1" {
        return Err("invalid_corpus".to_owned());
    }
    let result = synthesis_citation_graph_build::compute(corpus.request, &AtomicBool::new(false))
        .map_err(str::to_owned)?;
    println!(
        "{}",
        json!({
            "schema":corpus.schema,
            "lifecycle":corpus.lifecycle,
            "canonicalResult":canonical_json(&result).map_err(str::to_owned)?,
            "resultSha256":canonical_sha256(&result).map_err(str::to_owned)?,
        })
    );
    Ok(())
}
