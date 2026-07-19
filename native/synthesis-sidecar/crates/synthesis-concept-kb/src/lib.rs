use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};

fn canceled(flag: &AtomicBool) -> Result<(), &'static str> {
    if flag.load(Ordering::Relaxed) { Err("worker_canceled") } else { Ok(()) }
}
fn array<'a>(value: &'a Value, key: &str) -> Result<&'a Vec<Value>, &'static str> {
    value.get(key).and_then(Value::as_array).ok_or("invalid_request")
}
fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, &'static str> {
    value.get(key).and_then(Value::as_str).ok_or("invalid_request")
}
fn normalized(value: &str) -> String { value.trim().to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ") }

fn index(request: &Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    let concepts = array(request,"concepts")?;
    let senses = array(request,"senses")?;
    let aliases = array(request,"aliases")?;
    let mut search = Vec::with_capacity(concepts.len());
    let mut concepts_by_id = HashMap::new();
    for (index, concept) in concepts.iter().enumerate() {
        if index % 256 == 0 { canceled(flag)?; }
        concepts_by_id.insert(text(concept,"conceptId")?, concept);
        let aliases = array(concept,"aliases")?.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(" ");
        let label = text(concept,"label")?;
        let short = concept.get("shortDefinition").and_then(Value::as_str).unwrap_or("");
        let definition = concept.get("definition").and_then(Value::as_str).unwrap_or("");
        search.push(json!({"conceptId":text(concept,"conceptId")?,"label":label,"normalized":format!("{label} {aliases} {short} {definition}").to_lowercase(),"conceptType":text(concept,"conceptType")?,"domain":text(concept,"domain")?}));
    }
    let senses_by_id: HashMap<&str,&Value> = senses.iter().filter_map(|sense| text(sense,"senseId").ok().map(|id|(id,sense))).collect();
    let mut by_normalized: HashMap<&str,Vec<&Value>> = HashMap::new();
    for alias in aliases { by_normalized.entry(text(alias,"normalized")?).or_default().push(alias); }
    let mut overlay = Vec::new();
    for (index, alias) in aliases.iter().enumerate() {
        if index % 256 == 0 { canceled(flag)?; }
        if text(alias,"status")? != "active" || text(alias,"confidence")? == "low" { continue; }
        let matching = by_normalized.get(text(alias,"normalized")?).cloned().unwrap_or_default();
        if matching.iter().filter_map(|entry| entry.get("conceptId").and_then(Value::as_str)).collect::<HashSet<_>>().len() > 1 { continue; }
        let Some(concept) = concepts_by_id.get(text(alias,"conceptId")?) else { continue; };
        if text(concept,"status")? != "active" { continue; }
        let mut entry = serde_json::Map::new();
        entry.insert("conceptId".into(), json!(text(concept,"conceptId")?));
        entry.insert("alias".into(), json!(text(alias,"alias")?));
        entry.insert("label".into(), json!(text(concept,"label")?));
        entry.insert("confidence".into(), json!(text(alias,"confidence")?));
        let sense = alias.get("senseId").and_then(Value::as_str).and_then(|id| senses_by_id.get(id).copied());
        if let Some(id) = alias.get("senseId").and_then(Value::as_str) { entry.insert("senseId".into(),json!(id)); }
        if let Some(value) = sense.and_then(|row| row.get("shortDefinition").and_then(Value::as_str)).or_else(|| concept.get("shortDefinition").and_then(Value::as_str)) { entry.insert("shortDefinition".into(),json!(value)); }
        if let Some(value) = sense.and_then(|row| row.get("definition").and_then(Value::as_str)).or_else(|| concept.get("definition").and_then(Value::as_str)) { entry.insert("definition".into(),json!(value)); }
        overlay.push(Value::Object(entry));
    }
    overlay.sort_by(|left,right| {
        let l=text(left,"alias").unwrap_or_default(); let r=text(right,"alias").unwrap_or_default();
        r.encode_utf16().count().cmp(&l.encode_utf16().count()).then_with(|| synthesis_protocol::compare_utf16(l,r))
    });
    Ok(json!({"contractVersion":"synthesis-concept-kb-index.v1","algorithmVersion":"concept-kb-index.v1","schemaVersion":"1.0.0","sourceManifestHash":text(request,"sourceManifestHash")?,"rebuiltAt":text(request,"rebuiltAt")?,"search":search,"overlayEntries":overlay}))
}

fn query(request: &Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    let concepts=array(request,"concepts")?; let senses=array(request,"senses")?; let aliases=array(request,"aliases")?;
    let mut concepts_by_key: HashMap<String,Vec<&Value>>=HashMap::new();
    for concept in concepts { concepts_by_key.entry(normalized(text(concept,"label")?)).or_default().push(concept); }
    let mut aliases_by_key: HashMap<String,Vec<&Value>>=HashMap::new();
    for alias in aliases { aliases_by_key.entry(normalized(text(alias,"alias")?)).or_default().push(alias); }
    let mut matches=Vec::new();
    for (index,label) in array(request,"labels")?.iter().enumerate() {
        if index % 32 == 0 { canceled(flag)?; }
        let label=label.as_str().ok_or("invalid_request")?; let key=normalized(label);
        let exact=concepts_by_key.get(&key).cloned().unwrap_or_default().iter().map(|row|json!(text(row,"conceptId").unwrap_or_default())).collect::<Vec<_>>();
        let alias_matches=aliases_by_key.get(&key).cloned().unwrap_or_default().iter().map(|row|json!({"aliasId":text(row,"aliasId").unwrap_or_default(),"conceptId":text(row,"conceptId").unwrap_or_default()})).collect::<Vec<_>>();
        let candidates=exact.iter().filter_map(Value::as_str).chain(alias_matches.iter().filter_map(|row|row.get("conceptId").and_then(Value::as_str))).collect::<HashSet<_>>();
        let sense_ids=senses.iter().filter(|sense|sense.get("conceptId").and_then(Value::as_str).is_some_and(|id|candidates.contains(id))).map(|sense|json!(text(sense,"senseId").unwrap_or_default())).collect::<Vec<_>>();
        matches.push(json!({"label":label,"exactConceptIds":exact,"aliasMatches":alias_matches,"senseIds":sense_ids,"ambiguous":candidates.len()>1}));
    }
    Ok(json!({"contractVersion":"synthesis-concept-kb-index.v1","algorithmVersion":"concept-kb-query.v1","matches":matches}))
}

pub fn compute(operation:&str, request:Value, flag:&AtomicBool)->Result<Value,&'static str>{
    canceled(flag)?;
    match operation {
        synthesis_protocol::CONCEPT_KB_INDEX_OPERATION=>index(&request,flag),
        synthesis_protocol::CONCEPT_KB_QUERY_OPERATION=>query(&request,flag),
        _=>Err("invalid_request")
    }
}
