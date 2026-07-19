use serde_json::{Value,json};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool,Ordering};

fn text<'a>(value:&'a Value,key:&str)->Result<&'a str,&'static str>{value.get(key).and_then(Value::as_str).ok_or("invalid_request")}
pub fn compute(request:Value,flag:&AtomicBool)->Result<Value,&'static str>{
    let nodes=request.get("nodes").and_then(Value::as_array).ok_or("invalid_request")?;
    let edges=request.get("edges").and_then(Value::as_array).ok_or("invalid_request")?;
    let mut parented=HashSet::new();
    for (index,edge) in edges.iter().enumerate(){
        if index%256==0&&flag.load(Ordering::Relaxed){return Err("worker_canceled")}
        if text(edge,"relation")?=="broader_than"&&text(edge,"status")?!="rejected"{parented.insert(text(edge,"targetTopicId")?);}
    }
    let mut roots=Vec::new(); let mut unplaced=Vec::new();
    for node in nodes {
        let id=text(node,"topicId")?;
        let is_root=node.get("isRoot").and_then(Value::as_bool).ok_or("invalid_request")?;
        let level=node.get("level").and_then(Value::as_str);
        if is_root||level==Some("top"){roots.push(id.to_owned());}
        if !is_root&&level!=Some("top")&&node.get("definitionStatus").and_then(Value::as_str)!=Some("deleted")&&!parented.contains(id){unplaced.push(id.to_owned());}
    }
    roots.sort_by(|left,right|synthesis_protocol::compare_utf16(left,right));
    unplaced.sort_by(|left,right|synthesis_protocol::compare_utf16(left,right));
    Ok(json!({"contractVersion":"synthesis-topic-graph-index.v1","algorithmVersion":"topic-graph-index.v1","schemaVersion":"1.0.0","sourceManifestHash":text(&request,"sourceManifestHash")?,"rebuiltAt":text(&request,"rebuiltAt")?,"roots":roots,"unplaced":unplaced}))
}
