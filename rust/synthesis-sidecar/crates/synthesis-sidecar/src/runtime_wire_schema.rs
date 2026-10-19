use serde_json::Value;

fn pattern_matches(pattern: &str, text: &str) -> bool {
    match pattern {
        "^[A-Za-z0-9]+$" => {
            !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_alphanumeric())
        }
        "^[A-Za-z0-9._:-]{1,128}$" => {
            (1..=128).contains(&text.len())
                && text
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
        }
        "^[A-Za-z][A-Za-z0-9_.:-]{0,127}$" => {
            (1..=128).contains(&text.len())
                && text.as_bytes()[0].is_ascii_alphabetic()
                && text
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
        }
        "^[^\\u0000-\\u001f\\u007f]+$" => {
            !text.is_empty() && !text.chars().any(|ch| ch <= '\u{1f}' || ch == '\u{7f}')
        }
        "^[a-f0-9]{64}$" => {
            text.len() == 64
                && text
                    .bytes()
                    .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        }
        "^sha256:[a-f0-9]{64}$" | "^sha256:[0-9a-f]{64}$" => {
            text.strip_prefix("sha256:").is_some_and(|hash| {
                hash.len() == 64
                    && hash
                        .bytes()
                        .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
            })
        }
        _ => false,
    }
}

// The embedded contracts own the limits; serde still rebuilds the closed DTO.
pub(super) fn matches(document: &Value, rule: &Value, value: &Value) -> bool {
    let accepted = matches_rule(document, rule, value);
    #[cfg(test)]
    PROBE.with(|probe| {
        if let Some(probe) = probe.borrow_mut().as_mut()
            && document["$id"]
                .as_str()
                .is_some_and(|id| id.ends_with(&probe.file))
            && document
                .pointer(&probe.pointer)
                .is_some_and(|target| std::ptr::eq(target, rule))
            && value == &probe.value
        {
            probe.accepted = Some(accepted);
        }
    });
    accepted
}

#[cfg(test)]
struct SchemaProbe {
    file: String,
    pointer: String,
    value: Value,
    accepted: Option<bool>,
}

#[cfg(test)]
thread_local! {
    static PROBE: std::cell::RefCell<Option<SchemaProbe>> = const { std::cell::RefCell::new(None) };
}

#[cfg(test)]
pub(super) fn with_schema_probe<T>(case: &Value, execute: impl FnOnce() -> T) -> (T, Option<bool>) {
    let probe = case.get("predicate").and_then(|probe| {
        let (file, pointer) = probe["schemaRef"].as_str()?.split_once('#')?;
        Some(SchemaProbe {
            file: file.rsplit('/').next()?.into(),
            pointer: pointer.into(),
            value: probe["value"].clone(),
            accepted: None,
        })
    });
    PROBE.with(|current| *current.borrow_mut() = probe);
    let result = execute();
    let accepted =
        PROBE.with(|current| current.borrow_mut().take().and_then(|probe| probe.accepted));
    (result, accepted)
}

fn matches_rule(document: &Value, rule: &Value, value: &Value) -> bool {
    if let Value::Bool(allowed) = rule {
        return *allowed;
    }
    if let Some(reference) = rule["$ref"].as_str() {
        let (file, pointer) = reference.split_once('#').unwrap_or((reference, ""));
        let document = match file {
            "" => document,
            "common.schema.json" => {
                static COMMON: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                COMMON.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json"
                )).expect("embedded common schema"))
            }
            "topic-domain.schema.json" => {
                static TOPIC: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                TOPIC.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json"
                )).expect("embedded Topic schema"))
            }
            "transfer.schema.json" => {
                static TRANSFER: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                TRANSFER.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json"
                )).expect("embedded transfer schema"))
            }
            "client-citation-graph.schema.json" => {
                static GRAPH: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                GRAPH.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json"
                )).expect("embedded graph query schema"))
            }
            "https://zotero-agents.local/canonical-literature-artifacts/v1/source-reference-artifact.schema.json" =>
            {
                static REFERENCES: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                REFERENCES.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json"
                )).expect("embedded references contract"))
            }
            "https://zotero-agents.local/canonical-literature-artifacts/v1/citation-analysis-artifact.schema.json" =>
            {
                static CITATIONS: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                CITATIONS.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json"
                )).expect("embedded citation analysis contract"))
            }
            "https://zotero-agents.local/canonical-literature-artifacts/v1/literature-score-artifact.schema.json" =>
            {
                static SCORE: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
                SCORE.get_or_init(|| serde_json::from_str(include_str!(
                    "../../../../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/literature-score-artifact.schema.json"
                )).expect("embedded literature score contract"))
            }
            _ => return false,
        };
        return document
            .pointer(pointer)
            .is_some_and(|rule| matches(document, rule, value));
    }
    if rule["allOf"].as_array().is_some_and(|branches| {
        branches
            .iter()
            .any(|branch| !matches(document, branch, value))
    }) {
        return false;
    }
    if rule
        .get("not")
        .is_some_and(|rule| matches(document, rule, value))
    {
        return false;
    }
    if let Some(condition) = rule.get("if") {
        let branch = if matches(document, condition, value) {
            "then"
        } else {
            "else"
        };
        if rule
            .get(branch)
            .is_some_and(|rule| !matches(document, rule, value))
        {
            return false;
        }
    }
    if rule["oneOf"].as_array().is_some_and(|branches| {
        branches
            .iter()
            .filter(|branch| matches(document, branch, value))
            .count()
            != 1
    }) {
        return false;
    }
    if rule["anyOf"].as_array().is_some_and(|branches| {
        !branches
            .iter()
            .any(|branch| matches(document, branch, value))
    }) {
        return false;
    }
    if rule["enum"]
        .as_array()
        .is_some_and(|allowed| !allowed.contains(value))
        || rule.get("const").is_some_and(|expected| expected != value)
    {
        return false;
    }
    if let Some(kinds) = rule.get("type") {
        let accepts = |kind: &str| match kind {
            "object" => value.is_object(),
            "array" => value.is_array(),
            "string" => value.is_string(),
            "integer" => value.as_u64().is_some() || value.as_i64().is_some(),
            "number" => value.is_number(),
            "boolean" => value.is_boolean(),
            "null" => value.is_null(),
            _ => false,
        };
        let valid = match kinds {
            Value::String(kind) => accepts(kind),
            Value::Array(kinds) => kinds.iter().any(|kind| kind.as_str().is_some_and(accepts)),
            _ => false,
        };
        if !valid {
            return false;
        }
    }
    if let Some(number) = value.as_f64()
        && (rule["minimum"].as_f64().is_some_and(|min| number < min)
            || rule["maximum"].as_f64().is_some_and(|max| number > max)
            || rule["exclusiveMinimum"]
                .as_f64()
                .is_some_and(|min| number <= min)
            || rule["exclusiveMaximum"]
                .as_f64()
                .is_some_and(|max| number >= max))
    {
        return false;
    }
    if let Some(text) = value.as_str() {
        let count = text.chars().count() as u64;
        if count < rule["minLength"].as_u64().unwrap_or(0)
            || count > rule["maxLength"].as_u64().unwrap_or(u64::MAX)
            || rule["pattern"]
                .as_str()
                .is_some_and(|pattern| !pattern_matches(pattern, text))
        {
            return false;
        }
    }
    if let Some(values) = value.as_array() {
        if values.len() as u64 > rule["maxItems"].as_u64().unwrap_or(u64::MAX)
            || (values.len() as u64) < rule["minItems"].as_u64().unwrap_or(0)
        {
            return false;
        }
        let prefix = rule["prefixItems"].as_array();
        if prefix.is_some_and(|rules| {
            rules
                .iter()
                .zip(values)
                .any(|(rule, value)| !matches(document, rule, value))
        }) {
            return false;
        }
        if let Some(items) = rule.get("items")
            && values
                .iter()
                .skip(prefix.map_or(0, Vec::len))
                .any(|value| !matches(document, items, value))
        {
            return false;
        }
        if rule["uniqueItems"] == true {
            let mut seen = std::collections::HashSet::new();
            if values.iter().any(|value| !seen.insert(value.to_string())) {
                return false;
            }
        }
    }
    if let Some(fields) = value.as_object() {
        if fields.len() as u64 > rule["maxProperties"].as_u64().unwrap_or(u64::MAX)
            || (fields.len() as u64) < rule["minProperties"].as_u64().unwrap_or(0)
            || rule["required"].as_array().is_some_and(|required| {
                required
                    .iter()
                    .any(|name| !fields.contains_key(name.as_str().expect("required field")))
            })
        {
            return false;
        }
        for (name, value) in fields {
            if rule
                .get("propertyNames")
                .is_some_and(|rule| !matches(document, rule, &Value::String(name.clone())))
            {
                return false;
            }
            if let Some(field) = rule["properties"].get(name) {
                if !matches(document, field, value) {
                    return false;
                }
            } else {
                let patterns = rule["patternProperties"].as_object();
                let mut matched = false;
                if let Some(patterns) = patterns {
                    for (pattern, field) in patterns {
                        if pattern_matches(pattern, name) {
                            matched = true;
                            if !matches(document, field, value) {
                                return false;
                            }
                        }
                    }
                }
                if !matched
                    && rule
                        .get("additionalProperties")
                        .is_some_and(|rule| !matches(document, rule, value))
                {
                    return false;
                }
            }
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn predicate_receipts_require_execution_inside_the_production_validator() {
        let schema: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json"
        )).unwrap();
        let rule = &schema["$defs"]["WorkbenchState"];
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/corpus/client-topic-workbench.json"
        )).unwrap();
        let mut value = corpus["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| {
                case["valid"] == true
                    && case["schemaRef"].as_str().is_some_and(|reference| {
                        reference.ends_with("/$defs/GetSynthesisWorkbenchSurfaceInputRequest")
                    })
            })
            .unwrap()["value"]["args"][1]
            .clone();
        let registry = value["registry"].as_object_mut().unwrap();
        registry.remove("cursor");
        registry.remove("limit");
        registry.insert("sourceRefs".into(), json!(["1:ITEM1"]));
        let case = json!({"predicate":{
            "schemaRef":"schemas/client-topic-workbench.schema.json#/$defs/WorkbenchState/properties/registry/allOf/0/not",
            "value":value["registry"],
        }});
        let (accepted, predicate) = with_schema_probe(&case, || matches(&schema, rule, &value));
        assert!(accepted);
        assert_eq!(predicate, Some(false));
        let (_, unexecuted) = with_schema_probe(&case, || true);
        assert_eq!(unexecuted, None);
    }
}
