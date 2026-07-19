use serde::{Deserialize, Serialize, Serializer};
use serde_json::{Map, Value, value::RawValue};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

pub const WORKER_PROTOCOL: &str = "synthesis-rust-worker.v1";
pub const METRICS_OPERATION: &str = "citation_graph_metrics.v1";
pub const TAG_VOCABULARY_VALIDATE_OPERATION: &str = "tag_vocabulary_validate.v1";
pub const TAG_VOCABULARY_INDEX_OPERATION: &str = "tag_vocabulary_index.v1";
pub const CONCEPT_KB_INDEX_OPERATION: &str = "concept_kb_index.v1";
pub const CONCEPT_KB_QUERY_OPERATION: &str = "concept_kb_query.v1";
pub const TOPIC_GRAPH_INDEX_OPERATION: &str = "topic_graph_index.v1";

pub const PAGE_MAX_BYTES: usize = 4 * 1024 * 1024;
pub const PAGE_MAX_ROWS: usize = 100_000;
pub const PAGE_MAX_JSON_NODES: usize = 100_000;
pub const PAGE_MAX_INDEX: u64 = 255;

pub fn deterministic_operation(value: &str) -> bool {
    deterministic_operation_spec(value).is_some()
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SectionShape {
    Array,
    StringRecord,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SectionSpec {
    pub name: &'static str,
    pub max_rows: usize,
    pub shape: SectionShape,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DeterministicOperationSpec {
    pub input_header_fields: &'static [&'static str],
    pub input_sections: &'static [SectionSpec],
    pub output_header_fields: &'static [&'static str],
    pub output_sections: &'static [SectionSpec],
}

const TAG_INPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "entries",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "aliases",
        max_rows: 50_000,
        shape: SectionShape::StringRecord,
    },
    SectionSpec {
        name: "abbrev",
        max_rows: 10_000,
        shape: SectionShape::StringRecord,
    },
];
const TAG_VALIDATE_OUTPUT_SECTIONS: &[SectionSpec] = &[SectionSpec {
    name: "warnings",
    max_rows: 1_000_000,
    shape: SectionShape::Array,
}];
const TAG_INDEX_OUTPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "tags",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "aliases",
        max_rows: 50_000,
        shape: SectionShape::StringRecord,
    },
    SectionSpec {
        name: "abbrev",
        max_rows: 10_000,
        shape: SectionShape::StringRecord,
    },
    SectionSpec {
        name: "search",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "validationWarnings",
        max_rows: 1_000_000,
        shape: SectionShape::Array,
    },
];
const CONCEPT_INDEX_INPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "concepts",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "senses",
        max_rows: 100_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "aliases",
        max_rows: 250_000,
        shape: SectionShape::Array,
    },
];
const CONCEPT_QUERY_INPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "concepts",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "senses",
        max_rows: 100_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "aliases",
        max_rows: 250_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "labels",
        max_rows: 100,
        shape: SectionShape::Array,
    },
];
const CONCEPT_INDEX_OUTPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "search",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "overlayEntries",
        max_rows: 250_000,
        shape: SectionShape::Array,
    },
];
const CONCEPT_QUERY_OUTPUT_SECTIONS: &[SectionSpec] = &[SectionSpec {
    name: "matches",
    max_rows: 100,
    shape: SectionShape::Array,
}];
const TOPIC_INPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "nodes",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "edges",
        max_rows: 100_000,
        shape: SectionShape::Array,
    },
];
const TOPIC_OUTPUT_SECTIONS: &[SectionSpec] = &[
    SectionSpec {
        name: "roots",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
    SectionSpec {
        name: "unplaced",
        max_rows: 25_000,
        shape: SectionShape::Array,
    },
];
const TAG_VALIDATE_INPUT_HEADER: &[&str] = &["contractVersion", "algorithmVersion", "protocol"];
const TAG_INDEX_INPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "protocol",
    "sourceManifestHash",
    "rebuiltAt",
];
const TAG_VALIDATE_OUTPUT_HEADER: &[&str] = &["contractVersion", "algorithmVersion"];
const TAG_INDEX_OUTPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "schemaVersion",
    "sourceManifestHash",
    "rebuiltAt",
];
const CONCEPT_INDEX_INPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "sourceManifestHash",
    "rebuiltAt",
];
const CONCEPT_QUERY_INPUT_HEADER: &[&str] = &["contractVersion", "algorithmVersion"];
const CONCEPT_INDEX_OUTPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "schemaVersion",
    "sourceManifestHash",
    "rebuiltAt",
];
const CONCEPT_QUERY_OUTPUT_HEADER: &[&str] = &["contractVersion", "algorithmVersion"];
const TOPIC_INPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "sourceManifestHash",
    "rebuiltAt",
];
const TOPIC_OUTPUT_HEADER: &[&str] = &[
    "contractVersion",
    "algorithmVersion",
    "schemaVersion",
    "sourceManifestHash",
    "rebuiltAt",
];

pub fn deterministic_operation_spec(operation: &str) -> Option<DeterministicOperationSpec> {
    match operation {
        TAG_VOCABULARY_VALIDATE_OPERATION => Some(DeterministicOperationSpec {
            input_header_fields: TAG_VALIDATE_INPUT_HEADER,
            input_sections: TAG_INPUT_SECTIONS,
            output_header_fields: TAG_VALIDATE_OUTPUT_HEADER,
            output_sections: TAG_VALIDATE_OUTPUT_SECTIONS,
        }),
        TAG_VOCABULARY_INDEX_OPERATION => Some(DeterministicOperationSpec {
            input_header_fields: TAG_INDEX_INPUT_HEADER,
            input_sections: TAG_INPUT_SECTIONS,
            output_header_fields: TAG_INDEX_OUTPUT_HEADER,
            output_sections: TAG_INDEX_OUTPUT_SECTIONS,
        }),
        CONCEPT_KB_INDEX_OPERATION => Some(DeterministicOperationSpec {
            input_header_fields: CONCEPT_INDEX_INPUT_HEADER,
            input_sections: CONCEPT_INDEX_INPUT_SECTIONS,
            output_header_fields: CONCEPT_INDEX_OUTPUT_HEADER,
            output_sections: CONCEPT_INDEX_OUTPUT_SECTIONS,
        }),
        CONCEPT_KB_QUERY_OPERATION => Some(DeterministicOperationSpec {
            input_header_fields: CONCEPT_QUERY_INPUT_HEADER,
            input_sections: CONCEPT_QUERY_INPUT_SECTIONS,
            output_header_fields: CONCEPT_QUERY_OUTPUT_HEADER,
            output_sections: CONCEPT_QUERY_OUTPUT_SECTIONS,
        }),
        TOPIC_GRAPH_INDEX_OPERATION => Some(DeterministicOperationSpec {
            input_header_fields: TOPIC_INPUT_HEADER,
            input_sections: TOPIC_INPUT_SECTIONS,
            output_header_fields: TOPIC_OUTPUT_HEADER,
            output_sections: TOPIC_OUTPUT_SECTIONS,
        }),
        _ => None,
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PageDescriptor {
    pub section: String,
    pub page_index: u64,
    pub row_count: usize,
    pub byte_length: usize,
    pub sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeterministicRunBegin {
    pub protocol: String,
    #[serde(rename = "type")]
    pub frame_type: String,
    pub task_id: String,
    pub operation: String,
    pub header: Map<String, Value>,
}

impl DeterministicRunBegin {
    pub fn rebuild(value: Value) -> Result<Self, &'static str> {
        let frame: Self = serde_json::from_value(value).map_err(|_| "invalid_request")?;
        if frame.protocol != WORKER_PROTOCOL
            || frame.frame_type != "run_begin"
            || !deterministic_operation(&frame.operation)
        {
            return Err("invalid_request");
        }
        Ok(frame)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeterministicPageFrame {
    pub protocol: String,
    #[serde(rename = "type")]
    pub frame_type: String,
    pub task_id: String,
    pub descriptor: PageDescriptor,
    pub rows: Vec<Value>,
}

impl DeterministicPageFrame {
    pub fn rebuild_input(value: Value) -> Result<Self, &'static str> {
        let frame: Self = serde_json::from_value(value).map_err(|_| "invalid_request")?;
        if frame.protocol != WORKER_PROTOCOL || frame.frame_type != "input_page" {
            return Err("invalid_request");
        }
        Ok(frame)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeterministicRawPageFrame<'a> {
    #[serde(borrow)]
    pub protocol: &'a str,
    #[serde(rename = "type", borrow)]
    pub frame_type: &'a str,
    #[serde(borrow)]
    pub task_id: &'a str,
    pub descriptor: PageDescriptor,
    #[serde(borrow)]
    pub rows: &'a RawValue,
}

impl<'a> DeterministicRawPageFrame<'a> {
    pub fn rebuild_input(source: &'a str) -> Result<Self, &'static str> {
        let frame: Self = serde_json::from_str(source).map_err(|_| "invalid_request")?;
        if frame.protocol != WORKER_PROTOCOL || frame.frame_type != "input_page" {
            return Err("invalid_request");
        }
        Ok(frame)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeterministicTaskFrame {
    pub protocol: String,
    #[serde(rename = "type")]
    pub frame_type: String,
    pub task_id: String,
}

impl DeterministicTaskFrame {
    pub fn rebuild(value: Value, expected_type: &str) -> Result<Self, &'static str> {
        let frame: Self = serde_json::from_value(value).map_err(|_| "invalid_request")?;
        if frame.protocol != WORKER_PROTOCOL || frame.frame_type != expected_type {
            return Err("invalid_request");
        }
        Ok(frame)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeterministicAckFrame {
    pub protocol: String,
    #[serde(rename = "type")]
    pub frame_type: String,
    pub task_id: String,
    pub section: String,
    pub page_index: u64,
}

impl DeterministicAckFrame {
    pub fn rebuild_result(value: Value) -> Result<Self, &'static str> {
        let frame: Self = serde_json::from_value(value).map_err(|_| "invalid_request")?;
        if frame.protocol != WORKER_PROTOCOL
            || frame.frame_type != "result_ack"
            || frame.page_index > PAGE_MAX_INDEX
        {
            return Err("invalid_request");
        }
        Ok(frame)
    }
}

pub fn count_json_nodes(value: &Value) -> Result<usize, &'static str> {
    let mut total = 1usize;
    match value {
        Value::Array(values) => {
            for value in values {
                total = total
                    .checked_add(count_json_nodes(value)?)
                    .ok_or("invalid_request")?;
            }
        }
        Value::Object(values) => {
            for value in values.values() {
                total = total
                    .checked_add(1)
                    .and_then(|count| count.checked_add(count_json_nodes(value).ok()?))
                    .ok_or("invalid_request")?;
            }
        }
        _ => {}
    }
    Ok(total)
}

pub fn count_json_nodes_raw(source: &str) -> Result<usize, &'static str> {
    let bytes = source.as_bytes();
    let mut index = 0usize;
    let mut nodes = 0usize;
    while index < bytes.len() {
        match bytes[index] {
            b'{' | b'[' => {
                nodes = nodes.checked_add(1).ok_or("invalid_request")?;
                index += 1;
            }
            b'"' => {
                nodes = nodes.checked_add(1).ok_or("invalid_request")?;
                index += 1;
                while index < bytes.len() {
                    match bytes[index] {
                        b'\\' => index = index.checked_add(2).ok_or("invalid_request")?,
                        b'"' => {
                            index += 1;
                            break;
                        }
                        _ => index += 1,
                    }
                }
            }
            b'-' | b'0'..=b'9' | b't' | b'f' | b'n' => {
                nodes = nodes.checked_add(1).ok_or("invalid_request")?;
                index += 1;
                while index < bytes.len()
                    && !matches!(
                        bytes[index],
                        b',' | b']' | b'}' | b' ' | b'\t' | b'\r' | b'\n'
                    )
                {
                    index += 1;
                }
            }
            _ => index += 1,
        }
    }
    Ok(nodes)
}

fn fast_page_json(value: &Value) -> Result<(usize, bool), &'static str> {
    let mut total = 1usize;
    let mut canonical_order = true;
    match value {
        Value::Number(value) => {
            if value.as_f64() == Some(0.0) && value.to_string() != "0" {
                canonical_order = false;
            }
        }
        Value::Array(values) => {
            for value in values {
                let (nodes, fast) = fast_page_json(value)?;
                total = total.checked_add(nodes).ok_or("invalid_request")?;
                canonical_order &= fast;
            }
        }
        Value::Object(values) => {
            for (key, value) in values {
                canonical_order &= key.is_ascii();
                let (nodes, fast) = fast_page_json(value)?;
                total = total
                    .checked_add(1)
                    .and_then(|count| count.checked_add(nodes))
                    .ok_or("invalid_request")?;
                canonical_order &= fast;
            }
        }
        _ => {}
    }
    Ok((total, canonical_order))
}

pub fn page_descriptor(
    section: &str,
    page_index: u64,
    rows: &[Value],
) -> Result<PageDescriptor, &'static str> {
    if page_index > PAGE_MAX_INDEX || rows.len() > PAGE_MAX_ROWS {
        return Err("invalid_request");
    }
    let mut nodes = 1usize;
    let mut fast = true;
    for row in rows {
        let (row_nodes, row_fast) = fast_page_json(row)?;
        nodes = nodes.checked_add(row_nodes).ok_or("invalid_request")?;
        fast &= row_fast;
    }
    let canonical = if fast {
        serde_json::to_vec(rows).map_err(|_| "invalid_request")?
    } else {
        let mut canonical = String::from("[");
        for (index, row) in rows.iter().enumerate() {
            if index > 0 {
                canonical.push(',');
            }
            write_canonical(row, &mut canonical)?;
        }
        canonical.push(']');
        canonical.into_bytes()
    };
    if canonical.len() > PAGE_MAX_BYTES || nodes > PAGE_MAX_JSON_NODES {
        return Err("invalid_request");
    }
    Ok(PageDescriptor {
        section: section.to_owned(),
        page_index,
        row_count: rows.len(),
        byte_length: canonical.len(),
        sha256: format!("sha256:{:x}", Sha256::digest(&canonical)),
    })
}

pub fn raw_page_descriptor(
    section: &str,
    page_index: u64,
    raw_rows: &str,
    row_count: usize,
) -> Result<PageDescriptor, &'static str> {
    raw_page_descriptor_with_node_count(
        section,
        page_index,
        raw_rows,
        row_count,
        count_json_nodes_raw(raw_rows)?,
    )
}

pub fn raw_page_descriptor_with_node_count(
    section: &str,
    page_index: u64,
    raw_rows: &str,
    row_count: usize,
    node_count: usize,
) -> Result<PageDescriptor, &'static str> {
    if page_index > PAGE_MAX_INDEX
        || row_count > PAGE_MAX_ROWS
        || raw_rows.len() > PAGE_MAX_BYTES
        || node_count > PAGE_MAX_JSON_NODES
    {
        return Err("invalid_request");
    }
    Ok(PageDescriptor {
        section: section.to_owned(),
        page_index,
        row_count,
        byte_length: raw_rows.len(),
        sha256: format!("sha256:{:x}", Sha256::digest(raw_rows.as_bytes())),
    })
}

fn exact_fields(values: &Map<String, Value>, expected: &[&str]) -> bool {
    values.len() == expected.len() && expected.iter().all(|field| values.contains_key(*field))
}

#[derive(Debug)]
pub struct PagedInputValidator {
    task_id: String,
    operation: String,
    header: Map<String, Value>,
    spec: DeterministicOperationSpec,
    section_index: usize,
    page_index: u64,
    section_rows: usize,
    started: bool,
}

impl PagedInputValidator {
    pub fn new(
        task_id: String,
        operation: String,
        header: Map<String, Value>,
    ) -> Result<Self, &'static str> {
        if task_id.is_empty() || task_id.encode_utf16().count() > 512 {
            return Err("invalid_request");
        }
        let spec = deterministic_operation_spec(&operation).ok_or("invalid_request")?;
        if !exact_fields(&header, spec.input_header_fields) {
            return Err("invalid_request");
        }
        Ok(Self {
            task_id,
            operation,
            header,
            spec,
            section_index: 0,
            page_index: 0,
            section_rows: 0,
            started: false,
        })
    }

    pub fn task_id(&self) -> &str {
        &self.task_id
    }

    pub fn validate_page(
        &mut self,
        task_id: &str,
        descriptor: &PageDescriptor,
        rows: &[Value],
    ) -> Result<(SectionSpec, u64), &'static str> {
        let expected = page_descriptor(&descriptor.section, descriptor.page_index, rows)?;
        if descriptor != &expected {
            return Err("invalid_request");
        }
        self.advance_page(task_id, descriptor, rows.len())
    }

    pub fn validate_raw_page(
        &mut self,
        task_id: &str,
        descriptor: &PageDescriptor,
        raw_rows: &str,
        row_count: usize,
    ) -> Result<(SectionSpec, u64), &'static str> {
        if descriptor
            != &raw_page_descriptor(
                &descriptor.section,
                descriptor.page_index,
                raw_rows,
                row_count,
            )?
        {
            return Err("invalid_request");
        }
        self.advance_page(task_id, descriptor, row_count)
    }

    pub fn validate_verified_raw_page(
        &mut self,
        task_id: &str,
        descriptor: &PageDescriptor,
        raw_rows: &str,
        row_count: usize,
        node_count: usize,
    ) -> Result<(SectionSpec, u64), &'static str> {
        if descriptor
            != &raw_page_descriptor_with_node_count(
                &descriptor.section,
                descriptor.page_index,
                raw_rows,
                row_count,
                node_count,
            )?
        {
            return Err("invalid_request");
        }
        self.advance_page(task_id, descriptor, row_count)
    }

    fn advance_page(
        &mut self,
        task_id: &str,
        descriptor: &PageDescriptor,
        row_count: usize,
    ) -> Result<(SectionSpec, u64), &'static str> {
        if task_id != self.task_id || self.section_index >= self.spec.input_sections.len() {
            return Err("invalid_request");
        }
        let mut section_index = self.section_index;
        let mut page_index = self.page_index;
        let mut section_rows = self.section_rows;
        let current = self.spec.input_sections[section_index];
        if descriptor.section != current.name {
            let next = self
                .spec
                .input_sections
                .get(section_index + 1)
                .ok_or("invalid_request")?;
            if !self.started || descriptor.section != next.name {
                return Err("invalid_request");
            }
            section_index += 1;
            page_index = 0;
            section_rows = 0;
        }
        let section = self.spec.input_sections[section_index];
        if descriptor.section != section.name || descriptor.page_index != page_index {
            return Err("invalid_request");
        }
        let accumulated = section_rows
            .checked_add(row_count)
            .filter(|count| *count <= section.max_rows)
            .ok_or("invalid_request")?;
        let acknowledged = page_index;
        self.section_index = section_index;
        self.page_index = page_index + 1;
        self.section_rows = accumulated;
        self.started = true;
        Ok((section, acknowledged))
    }

    pub fn finish(
        self,
        task_id: &str,
    ) -> Result<(String, String, Map<String, Value>), &'static str> {
        if task_id != self.task_id
            || !self.started
            || self.section_index + 1 != self.spec.input_sections.len()
        {
            return Err("invalid_request");
        }
        Ok((self.task_id, self.operation, self.header))
    }
}

#[derive(Debug)]
pub struct PagedInputAssembler {
    validator: PagedInputValidator,
    sections: HashMap<String, Vec<Value>>,
}

impl PagedInputAssembler {
    pub fn new(
        task_id: String,
        operation: String,
        header: Map<String, Value>,
    ) -> Result<Self, &'static str> {
        Ok(Self {
            validator: PagedInputValidator::new(task_id, operation, header)?,
            sections: HashMap::new(),
        })
    }

    pub fn task_id(&self) -> &str {
        self.validator.task_id()
    }

    pub fn append_page(
        &mut self,
        task_id: &str,
        descriptor: PageDescriptor,
        rows: Vec<Value>,
    ) -> Result<(String, u64), &'static str> {
        let (section, acknowledged) = self.validator.validate_page(task_id, &descriptor, &rows)?;
        self.sections
            .entry(section.name.to_owned())
            .or_default()
            .extend(rows);
        Ok((section.name.to_owned(), acknowledged))
    }

    pub fn finish(mut self, task_id: &str) -> Result<(String, String, Value), &'static str> {
        let spec = self.validator.spec;
        let (task_id, operation, mut header) = self.validator.finish(task_id)?;
        for section in spec.input_sections {
            let rows = self
                .sections
                .remove(section.name)
                .ok_or("invalid_request")?;
            let value = match section.shape {
                SectionShape::Array => Value::Array(rows),
                SectionShape::StringRecord => {
                    let mut object = Map::new();
                    for row in rows {
                        let pair = row
                            .as_array()
                            .filter(|pair| pair.len() == 2)
                            .ok_or("invalid_request")?;
                        let key = pair[0]
                            .as_str()
                            .filter(|key| !key.is_empty())
                            .ok_or("invalid_request")?;
                        let value = pair[1].as_str().ok_or("invalid_request")?;
                        if object
                            .insert(key.to_owned(), Value::String(value.to_owned()))
                            .is_some()
                        {
                            return Err("invalid_request");
                        }
                    }
                    Value::Object(object)
                }
            };
            header.insert(section.name.to_owned(), value);
        }
        Ok((task_id, operation, Value::Object(header)))
    }
}

#[derive(Debug)]
pub struct PagedResultParts {
    pub header: Map<String, Value>,
    pub sections: Vec<(SectionSpec, Vec<Value>)>,
}

pub fn split_paged_result(
    operation: &str,
    result: Value,
) -> Result<PagedResultParts, &'static str> {
    let spec = deterministic_operation_spec(operation).ok_or("worker_result_invalid")?;
    let mut header = match result {
        Value::Object(header) => header,
        _ => return Err("worker_result_invalid"),
    };
    let mut sections = Vec::with_capacity(spec.output_sections.len());
    for section in spec.output_sections {
        let value = header.remove(section.name).ok_or("worker_result_invalid")?;
        let rows = match section.shape {
            SectionShape::Array => match value {
                Value::Array(rows) => rows,
                _ => return Err("worker_result_invalid"),
            },
            SectionShape::StringRecord => match value {
                Value::Object(record) => record
                    .into_iter()
                    .map(|(key, value)| Value::Array(vec![Value::String(key), value]))
                    .collect(),
                _ => return Err("worker_result_invalid"),
            },
        };
        if rows.len() > section.max_rows {
            return Err("worker_result_invalid");
        }
        sections.push((*section, rows));
    }
    if !exact_fields(&header, spec.output_header_fields) {
        return Err("worker_result_invalid");
    }
    Ok(PagedResultParts { header, sections })
}
pub const METRICS_VERSION: u8 = 2;
pub const NODE_MAX: usize = 5_000;
pub const EDGE_MAX: usize = 20_000;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    LibraryPaper,
    ExternalReference,
    UnresolvedReference,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsNode {
    pub node_id: String,
    pub kind: NodeKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub library_id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsEdge {
    pub edge_id: String,
    pub source: String,
    pub target: String,
    pub mention_count: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MetricsRequest {
    pub graph_hash: String,
    pub nodes: Vec<MetricsNode>,
    pub edges: Vec<MetricsEdge>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsParams {
    pub pagerank_damping: f64,
    pub pagerank_iterations: u8,
    pub foundation_formula: String,
    pub frontier_formula: String,
}

fn serialize_js_number<S>(value: &f64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    if *value >= 0.0 && value.fract() == 0.0 && *value <= 9_007_199_254_740_991.0 {
        serializer.serialize_u64(*value as u64)
    } else {
        serializer.serialize_f64(*value)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LibraryNodeMetrics {
    pub node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paper_ref: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_in_degree: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_out_degree: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub external_reference_count: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub unresolved_reference_count: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub internal_pagerank: f64,
    pub component_id: String,
    pub component_size: usize,
    pub is_isolated: bool,
    #[serde(serialize_with = "serialize_js_number")]
    pub age_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub recency_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub in_degree_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub out_degree_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub pagerank_norm: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub foundation_score: f64,
    #[serde(serialize_with = "serialize_js_number")]
    pub frontier_score: f64,
    pub synthesis_role_hints: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsDiagnostics {
    pub library_node_count: usize,
    pub external_reference_count: usize,
    pub unresolved_reference_count: usize,
    pub component_count: usize,
    pub isolated_library_node_count: usize,
    pub missing_year_count: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MetricsResult {
    pub graph_hash: String,
    pub metrics_version: u8,
    pub params: MetricsParams,
    pub graph_year: Option<i32>,
    pub library_node_metrics: Vec<LibraryNodeMetrics>,
    pub diagnostics: MetricsDiagnostics,
}

pub fn compare_utf16(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

fn valid_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.encode_utf16().count() <= max
}

pub fn rebuild_metrics_request(
    mut request: MetricsRequest,
) -> Result<MetricsRequest, &'static str> {
    if !request.graph_hash.starts_with("sha256:")
        || request.graph_hash.len() != 71
        || !request.graph_hash[7..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        || request.nodes.is_empty()
        || request.nodes.len() > NODE_MAX
        || request.edges.len() > EDGE_MAX
    {
        return Err("invalid_request");
    }
    let mut node_ids = HashSet::new();
    for node in &request.nodes {
        if !valid_text(&node.node_id, 512)
            || !node_ids.insert(node.node_id.clone())
            || node.library_id == Some(0)
            || node
                .item_key
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
            || node
                .title
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
            || node
                .year
                .as_deref()
                .is_some_and(|value| !valid_text(value, 4_096))
        {
            return Err("invalid_request");
        }
    }
    let mut edge_ids = HashSet::new();
    for edge in &request.edges {
        if !valid_text(&edge.edge_id, 512)
            || !edge_ids.insert(edge.edge_id.clone())
            || !node_ids.contains(&edge.source)
            || !node_ids.contains(&edge.target)
            || !edge.mention_count.is_finite()
            || edge.mention_count <= 0.0
        {
            return Err("invalid_request");
        }
    }
    request
        .nodes
        .sort_by(|left, right| compare_utf16(&left.node_id, &right.node_id));
    request
        .edges
        .sort_by(|left, right| compare_utf16(&left.edge_id, &right.edge_id));
    Ok(request)
}

fn write_canonical(value: &Value, output: &mut String) -> Result<(), &'static str> {
    match value {
        Value::Null => output.push_str("null"),
        Value::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
        Value::Number(value) => {
            if value.as_f64() == Some(0.0) {
                output.push('0');
            } else {
                output.push_str(&value.to_string());
            }
        }
        Value::String(value) => {
            output.push_str(&serde_json::to_string(value).map_err(|_| "invalid_json")?)
        }
        Value::Array(values) => {
            output.push('[');
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                write_canonical(value, output)?;
            }
            output.push(']');
        }
        Value::Object(values) => {
            output.push('{');
            let mut entries: Vec<_> = values.iter().collect();
            entries.sort_by(|(left, _), (right, _)| compare_utf16(left, right));
            for (index, (key, value)) in entries.into_iter().enumerate() {
                if index > 0 {
                    output.push(',');
                }
                output.push_str(&serde_json::to_string(key).map_err(|_| "invalid_json")?);
                output.push(':');
                write_canonical(value, output)?;
            }
            output.push('}');
        }
    }
    Ok(())
}

pub fn canonical_json<T: Serialize>(value: &T) -> Result<String, &'static str> {
    let value = serde_json::to_value(value).map_err(|_| "invalid_json")?;
    let mut output = String::new();
    write_canonical(&value, &mut output)?;
    Ok(output)
}

pub fn canonical_sha256<T: Serialize>(value: &T) -> Result<String, &'static str> {
    let canonical = canonical_json(value)?;
    let digest = Sha256::digest(canonical.as_bytes());
    Ok(format!("sha256:{digest:x}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn canonicalizes_utf16_keys_and_hashes() {
        let value: Value =
            serde_json::from_str(r#"{"\ue000":1,"😀":2,"a":-0,"float":1e-7}"#).unwrap();
        assert_eq!(
            canonical_json(&value).unwrap(),
            r#"{"a":0,"float":1e-7,"😀":2,"":1}"#
        );
        assert_eq!(
            canonical_sha256(&value).unwrap(),
            "sha256:8ea42081471bf081697b912e59f207b803004aaf41fc75df225c77941edda7ed"
        );
    }

    fn descriptor(section: &str, page_index: u64, rows: &[Value]) -> PageDescriptor {
        page_descriptor(section, page_index, rows).unwrap()
    }

    #[test]
    fn paged_input_requires_operation_section_order_and_exact_header() {
        let header = serde_json::from_value(json!({
            "contractVersion": "synthesis-topic-graph-index.v1",
            "algorithmVersion": "topic-graph-index.v1",
            "sourceManifestHash": "sha256:test",
            "rebuiltAt": "2026-07-19T00:00:00.000Z"
        }))
        .unwrap();
        let mut input =
            PagedInputAssembler::new("task-1".into(), TOPIC_GRAPH_INDEX_OPERATION.into(), header)
                .unwrap();
        let edges = vec![json!({"edgeId":"edge:1"})];
        assert_eq!(
            input.append_page("task-1", descriptor("edges", 0, &edges), edges),
            Err("invalid_request")
        );

        let nodes = vec![json!({"topicId":"topic:1"})];
        assert_eq!(
            input
                .append_page("task-1", descriptor("nodes", 0, &nodes), nodes)
                .unwrap(),
            ("nodes".into(), 0)
        );
        let empty: Vec<Value> = Vec::new();
        assert_eq!(
            input
                .append_page("task-1", descriptor("edges", 0, &empty), empty)
                .unwrap(),
            ("edges".into(), 0)
        );
        assert!(input.finish("task-1").is_ok());
    }

    #[test]
    fn deterministic_frame_dtos_reject_unknown_fields_and_wrong_frame_types() {
        assert_eq!(
            DeterministicRunBegin::rebuild(json!({
                "protocol":WORKER_PROTOCOL,
                "type":"run_begin",
                "taskId":"task-1",
                "operation":TOPIC_GRAPH_INDEX_OPERATION,
                "header":{},
                "unknown":true
            })),
            Err("invalid_request")
        );
        assert_eq!(
            DeterministicTaskFrame::rebuild(
                json!({"protocol":WORKER_PROTOCOL,"type":"cancel","taskId":"task-1"}),
                "input_complete"
            ),
            Err("invalid_request")
        );
    }

    #[test]
    fn paged_input_rejects_wrong_task_duplicate_page_and_duplicate_record_key() {
        let header = serde_json::from_value(json!({
            "contractVersion": "synthesis-tag-vocabulary.v1",
            "algorithmVersion": "tag-vocabulary-validation.v1",
            "protocol": {}
        }))
        .unwrap();
        let mut input = PagedInputAssembler::new(
            "task-1".into(),
            TAG_VOCABULARY_VALIDATE_OPERATION.into(),
            header,
        )
        .unwrap();
        let empty: Vec<Value> = Vec::new();
        assert_eq!(
            input.append_page("other", descriptor("entries", 0, &empty), empty.clone()),
            Err("invalid_request")
        );
        input
            .append_page("task-1", descriptor("entries", 0, &empty), empty)
            .unwrap();
        let duplicate_page: Vec<Value> = Vec::new();
        assert_eq!(
            input.append_page(
                "task-1",
                descriptor("entries", 0, &duplicate_page),
                duplicate_page
            ),
            Err("invalid_request")
        );
        let aliases = vec![json!(["alias", "one"]), json!(["alias", "two"])];
        input
            .append_page("task-1", descriptor("aliases", 0, &aliases), aliases)
            .unwrap();
        let abbrev: Vec<Value> = Vec::new();
        input
            .append_page("task-1", descriptor("abbrev", 0, &abbrev), abbrev)
            .unwrap();
        assert_eq!(input.finish("task-1"), Err("invalid_request"));
    }

    #[test]
    fn page_descriptor_locks_hash_length_rows_and_json_node_budget() {
        assert_eq!(
            canonical_sha256(&Value::Array(Vec::new())).unwrap(),
            "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
        );
        let rows = vec![json!({"value":"😀"})];
        let descriptor = page_descriptor("nodes", 0, &rows).unwrap();
        assert_eq!(descriptor.row_count, 1);
        assert_eq!(
            descriptor.byte_length,
            canonical_json(&Value::Array(rows)).unwrap().len()
        );
        assert!(descriptor.sha256.starts_with("sha256:"));
        assert_eq!(
            page_descriptor("nodes", PAGE_MAX_INDEX + 1, &[]),
            Err("invalid_request")
        );
    }

    #[test]
    fn raw_page_validation_preserves_node_hash_and_sequence_checks() {
        let raw = r#"[{"edgeId":"edge:1","weight":1},true,null]"#;
        let value: Value = serde_json::from_str(raw).unwrap();
        assert_eq!(
            count_json_nodes_raw(raw).unwrap(),
            count_json_nodes(&value).unwrap()
        );

        let header = serde_json::from_value(json!({
            "contractVersion": "synthesis-topic-graph-index.v1",
            "algorithmVersion": "topic-graph-index.v1",
            "sourceManifestHash": "sha256:test",
            "rebuiltAt": "2026-07-19T00:00:00.000Z"
        }))
        .unwrap();
        let mut validator =
            PagedInputValidator::new("task".into(), TOPIC_GRAPH_INDEX_OPERATION.into(), header)
                .unwrap();
        let rows = value.as_array().unwrap();
        let descriptor = page_descriptor("nodes", 0, rows).unwrap();
        assert_eq!(
            validator
                .validate_raw_page("task", &descriptor, raw, rows.len())
                .unwrap(),
            (TOPIC_INPUT_SECTIONS[0], 0)
        );
        let mut tampered = page_descriptor("edges", 0, &[]).unwrap();
        tampered.sha256 = "sha256:tampered".into();
        assert_eq!(
            validator.validate_raw_page("task", &tampered, "[]", 0),
            Err("invalid_request")
        );
    }

    #[test]
    fn paged_result_requires_exact_sections_and_header() {
        let result = json!({
            "contractVersion":"synthesis-topic-graph-index.v1",
            "algorithmVersion":"topic-graph-index.v1",
            "schemaVersion":"1.0.0",
            "sourceManifestHash":"sha256:test",
            "rebuiltAt":"2026-07-19T00:00:00.000Z",
            "roots":[],
            "unplaced":[]
        });
        let parts = split_paged_result(TOPIC_GRAPH_INDEX_OPERATION, result).unwrap();
        assert_eq!(
            parts
                .sections
                .iter()
                .map(|(spec, _)| spec.name)
                .collect::<Vec<_>>(),
            vec!["roots", "unplaced"]
        );
        assert!(matches!(
            split_paged_result(
                TOPIC_GRAPH_INDEX_OPERATION,
                json!({
                    "contractVersion":"synthesis-topic-graph-index.v1",
                    "algorithmVersion":"topic-graph-index.v1",
                    "schemaVersion":"1.0.0",
                    "sourceManifestHash":"sha256:test",
                    "rebuiltAt":"2026-07-19T00:00:00.000Z",
                    "roots":[],
                    "unplaced":[],
                    "unknown":true
                })
            ),
            Err("worker_result_invalid")
        ));
    }
}
