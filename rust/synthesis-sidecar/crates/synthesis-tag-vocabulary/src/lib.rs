use regress::Regex;
use serde_json::{Map, Value, json};
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use synthesis_protocol::compare_utf16;

fn canceled(flag: &AtomicBool) -> Result<(), &'static str> {
    if flag.load(AtomicOrdering::Relaxed) {
        Err("worker_canceled")
    } else {
        Ok(())
    }
}

fn checkpoint(flag: &AtomicBool, index: usize) -> Result<(), &'static str> {
    if index.is_multiple_of(256) {
        canceled(flag)?;
    }
    Ok(())
}

fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, &'static str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or("invalid_request")
}

fn array<'a>(value: &'a Value, key: &str) -> Result<&'a Vec<Value>, &'static str> {
    value
        .get(key)
        .and_then(Value::as_array)
        .ok_or("invalid_request")
}

fn object<'a>(value: &'a Value, key: &str) -> Result<&'a Map<String, Value>, &'static str> {
    value
        .get(key)
        .and_then(Value::as_object)
        .ok_or("invalid_request")
}

fn warning(code: &str, severity: &str, tag: &str, message: &str) -> Value {
    json!({"code":code,"severity":severity,"tag":tag,"message":message})
}

fn compare_tag_key(left: &(String, String), right: &(String, String)) -> Ordering {
    let lower = left.0.encode_utf16().cmp(right.0.encode_utf16());
    if lower == Ordering::Equal {
        compare_utf16(&left.1, &right.1)
    } else {
        lower
    }
}

fn validate(request: &Value, flag: &AtomicBool) -> Result<Vec<Value>, &'static str> {
    canceled(flag)?;
    let entries = array(request, "entries")?;
    let aliases = object(request, "aliases")?;
    let abbrev = object(request, "abbrev")?;
    let protocol = request.get("protocol").ok_or("invalid_request")?;
    let facets: HashSet<&str> = array(protocol, "facets")?
        .iter()
        .filter_map(Value::as_str)
        .collect();
    let pattern = Regex::new(text(protocol, "tagPattern")?).map_err(|_| "invalid_request")?;
    let max_tag_length = protocol
        .get("maxTagLength")
        .and_then(Value::as_u64)
        .ok_or("invalid_request")? as usize;
    let known: HashSet<&str> = entries
        .iter()
        .filter_map(|entry| entry.get("tag").and_then(Value::as_str))
        .collect();
    let mut warnings = Vec::new();
    let mut tag_ucs2 = Vec::new();
    for (index, (key, value)) in abbrev.iter().enumerate() {
        checkpoint(flag, index)?;
        let value = value.as_str().ok_or("invalid_request")?;
        if key.is_empty() || !key.bytes().all(|byte| byte.is_ascii_lowercase()) {
            warnings.push(warning(
                "invalid_abbrev_key",
                "error",
                key,
                "Abbreviation registry keys must be lowercase letters.",
            ));
        }
        let mut bytes = value.bytes();
        if !matches!(bytes.next(), Some(first) if first.is_ascii_uppercase())
            || !bytes.all(|byte| byte.is_ascii_alphanumeric())
        {
            warnings.push(warning(
                "invalid_abbrev_value",
                "error",
                key,
                "Abbreviation registry values must use canonical casing.",
            ));
        }
    }
    let mut seen_lower: HashMap<String, String> = HashMap::new();
    for (index, entry) in entries.iter().enumerate() {
        checkpoint(flag, index)?;
        let tag = text(entry, "tag")?;
        let facet = text(entry, "facet")?;
        tag_ucs2.clear();
        tag_ucs2.extend(tag.encode_utf16());
        if pattern.find_from_ucs2(&tag_ucs2, 0).next().is_none() || tag_ucs2.len() > max_tag_length
        {
            warnings.push(warning(
                "invalid_tag_format",
                "error",
                tag,
                "Tag must match the configured TagVocab pattern.",
            ));
        }
        if !facets.contains(facet) {
            warnings.push(warning(
                "unknown_facet",
                "error",
                tag,
                "Tag facet is not allowed by the protocol.",
            ));
        }
        let tag_facet = tag.split_once(':').map(|pair| pair.0).unwrap_or("");
        if !facet.is_empty() && !tag_facet.is_empty() && facet != tag_facet {
            warnings.push(warning(
                "facet_mismatch",
                "error",
                tag,
                "Entry facet must match the prefix before ':'.",
            ));
        }
        let lower = tag.to_lowercase();
        if let Some(existing) = seen_lower.get(&lower)
            && existing != tag
        {
            warnings.push(warning(
                "case_duplicate",
                "error",
                tag,
                "Tag duplicates another entry with different casing.",
            ));
        }
        seen_lower.insert(lower, tag.to_owned());
        let value = tag.split_once(':').map(|pair| pair.1).unwrap_or(tag);
        for segment in value.split('/').filter(|value| !value.is_empty()) {
            if let Some(expected) = abbrev.get(&segment.to_lowercase()).and_then(Value::as_str)
                && segment != expected
            {
                warnings.push(warning(
                    "abbrev_case_error",
                    "error",
                    tag,
                    "Registered abbreviation segment uses non-canonical casing.",
                ));
            }
        }
        if entry
            .get("deprecated")
            .and_then(Value::as_bool)
            .unwrap_or(false)
            && let Some(replacement) = entry.get("replacement").and_then(Value::as_str)
            && !known.contains(replacement)
        {
            warnings.push(warning(
                "missing_replacement",
                "warning",
                tag,
                "Deprecated replacement tag is not present in the vocabulary.",
            ));
        }
    }
    for (index, (alias, target)) in aliases.iter().enumerate() {
        checkpoint(flag, index)?;
        if !known.contains(target.as_str().ok_or("invalid_request")?) {
            warnings.push(warning(
                "alias_target_missing",
                "error",
                alias,
                "Alias target is not present in the vocabulary.",
            ));
        }
    }
    canceled(flag)?;
    Ok(warnings)
}

pub fn compute(operation: &str, request: Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    if request.get("contractVersion").and_then(Value::as_str) != Some("synthesis-tag-vocabulary.v1")
    {
        return Err("invalid_request");
    }
    let warnings = validate(&request, flag)?;
    if operation == synthesis_protocol::TAG_VOCABULARY_VALIDATE_OPERATION {
        return Ok(
            json!({"contractVersion":"synthesis-tag-vocabulary.v1","algorithmVersion":"tag-vocabulary-validation.v1","warnings":warnings}),
        );
    }
    if operation != synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION {
        return Err("invalid_request");
    }
    let mut tags: Vec<(String, String)> = array(&request, "entries")?
        .iter()
        .filter(|entry| {
            !entry
                .get("deprecated")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        })
        .filter_map(|entry| entry.get("tag").and_then(Value::as_str))
        .map(|tag| (tag.to_lowercase(), tag.to_owned()))
        .collect();
    tags.sort_by(compare_tag_key);
    let tags: Vec<String> = tags.into_iter().map(|(_, tag)| tag).collect();
    let mut search = Vec::new();
    for (index, entry) in array(&request, "entries")?.iter().enumerate() {
        checkpoint(flag, index)?;
        let tag = text(entry, "tag")?;
        let facet = text(entry, "facet")?;
        let note = entry.get("note").and_then(Value::as_str).unwrap_or("");
        let aliases: Vec<&str> = array(entry, "aliases")?
            .iter()
            .filter_map(Value::as_str)
            .collect();
        let abbrev: Vec<&str> = array(entry, "abbrev")?
            .iter()
            .filter_map(Value::as_str)
            .collect();
        let normalized =
            format!("{tag} {note} {} {}", aliases.join(" "), abbrev.join(" ")).to_lowercase();
        search.push(json!({"tag":tag,"normalized":normalized,"facet":facet,"aliases":aliases,"abbrev":abbrev}));
    }
    Ok(json!({
        "contractVersion":"synthesis-tag-vocabulary.v1",
        "algorithmVersion":"tag-vocabulary-index.v1",
        "schemaVersion":"1.0.0",
        "sourceManifestHash":text(&request,"sourceManifestHash")?,
        "rebuiltAt":text(&request,"rebuiltAt")?,
        "tags":tags,
        "aliases":object(&request,"aliases")?,
        "abbrev":object(&request,"abbrev")?,
        "search":search,
        "validationWarnings":warnings
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn flag() -> AtomicBool {
        AtomicBool::new(false)
    }

    fn request(entries: Value) -> Value {
        json!({
            "contractVersion":"synthesis-tag-vocabulary.v1",
            "algorithmVersion":"tag-vocabulary-index.v1",
            "entries":entries,
            "aliases":{},
            "abbrev":{},
            "protocol":{
                "version":"1.0.0",
                "tagPattern":"^[a-z_]+:[a-zA-Z0-9/_.-]+$",
                "maxTagLength":120,
                "facets":["field"]
            },
            "sourceManifestHash":"sha256:test",
            "rebuiltAt":"2026-07-19T00:00:00.000Z"
        })
    }

    #[test]
    fn validates_ecmascript_ucs2_and_uses_utf16_total_tag_order() {
        let input = request(json!([
            {"tag":"field:","facet":"field","aliases":[],"abbrev":[]},
            {"tag":"field:😀","facet":"field","aliases":[],"abbrev":[]}
        ]));
        let result = compute(
            synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION,
            input,
            &flag(),
        )
        .unwrap();
        assert_eq!(result["tags"], json!(["field:😀", "field:"]));
        assert_eq!(
            result["validationWarnings"]
                .as_array()
                .unwrap()
                .iter()
                .map(|warning| warning["code"].as_str().unwrap())
                .collect::<Vec<_>>(),
            vec!["invalid_tag_format", "invalid_tag_format"]
        );
    }

    #[test]
    fn rejects_invalid_ecmascript_pattern_and_honors_cancellation() {
        let mut invalid = request(json!([]));
        invalid["protocol"]["tagPattern"] = json!("[");
        assert_eq!(
            compute(
                synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION,
                invalid,
                &flag()
            ),
            Err("invalid_request")
        );
        let canceled = AtomicBool::new(true);
        assert_eq!(
            compute(
                synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION,
                request(json!([])),
                &canceled
            ),
            Err("worker_canceled")
        );
    }
}
