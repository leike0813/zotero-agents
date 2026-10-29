use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, json};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use synthesis_protocol::{
    CONCEPT_KB_INDEX_OPERATION, CONCEPT_KB_QUERY_OPERATION, PageDescriptor, PagedInputValidator,
};

const CONTRACT_VERSION: &str = "synthesis-concept-kb-index.v1";
const INDEX_VERSION: &str = "concept-kb-index.v1";
const QUERY_VERSION: &str = "concept-kb-query.v1";
const SCHEMA_VERSION: &str = "1.0.0";
const PER_CONCEPT_ALIAS_MAX: usize = 256;

fn wire_schema(common: bool) -> &'static Value {
    static WORKER: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    static COMMON: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    if common {
        COMMON.get_or_init(|| serde_json::from_str(include_str!("../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json")).expect("common contract"))
    } else {
        WORKER.get_or_init(|| serde_json::from_str(include_str!("../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json")).expect("worker contract"))
    }
}

fn wire_text_valid(value: &str, definition: &str) -> bool {
    let rule = &wire_schema(definition == "identifier")["$defs"][definition];
    let length = value.chars().count() as u64;
    length >= rule["minLength"].as_u64().unwrap_or(0)
        && length <= rule["maxLength"].as_u64().expect("wire text limit")
        && (definition != "identifier"
            || !value
                .chars()
                .any(|value| value <= '\u{1f}' || value == '\u{7f}'))
}

fn wire_string<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
    definition: &str,
) -> Result<String, D::Error> {
    let value = String::deserialize(deserializer)?;
    if wire_text_valid(&value, definition) {
        Ok(value)
    } else {
        Err(serde::de::Error::custom("invalid_request"))
    }
}

fn wire_identifier<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<String, D::Error> {
    wire_string(deserializer, "identifier")
}

fn wire_text<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<String, D::Error> {
    wire_string(deserializer, "Text")
}

fn wire_optional_text<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<String>, D::Error> {
    wire_string(deserializer, "OptionalText").map(Some)
}

fn wire_optional_identifier<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<String>, D::Error> {
    wire_identifier(deserializer).map(Some)
}

fn wire_aliases<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<String>, D::Error> {
    let values = Vec::<String>::deserialize(deserializer)?;
    if values.len() as u64
        <= wire_schema(false)["$defs"]["StringArray"]["maxItems"]
            .as_u64()
            .expect("alias bound")
        && values
            .iter()
            .all(|value| wire_text_valid(value, "OptionalText"))
    {
        Ok(values)
    } else {
        Err(serde::de::Error::custom("invalid_request"))
    }
}

fn canceled(flag: &AtomicBool) -> Result<(), &'static str> {
    if flag.load(Ordering::Relaxed) {
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

fn valid_string(value: &str) -> bool {
    value.trim() == value && wire_text_valid(value, "Text")
}

fn validate_optional(value: &Option<String>) -> Result<(), &'static str> {
    if value.as_deref().is_some_and(|value| !valid_string(value)) {
        return Err("invalid_request");
    }
    Ok(())
}

fn normalized(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConceptStatus {
    Active,
    Review,
    Deprecated,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Confidence {
    High,
    Medium,
    Low,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Concept {
    #[serde(deserialize_with = "wire_aliases")]
    pub aliases: Vec<String>,
    #[serde(deserialize_with = "wire_identifier")]
    pub concept_id: String,
    #[serde(deserialize_with = "wire_text")]
    pub concept_type: String,
    #[serde(
        default,
        deserialize_with = "wire_optional_text",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition: Option<String>,
    #[serde(deserialize_with = "wire_text")]
    pub domain: String,
    #[serde(deserialize_with = "wire_text")]
    pub label: String,
    #[serde(
        default,
        deserialize_with = "wire_optional_text",
        skip_serializing_if = "Option::is_none"
    )]
    pub short_definition: Option<String>,
    pub status: ConceptStatus,
}

impl Concept {
    fn validate(&self) -> Result<(), &'static str> {
        if !valid_string(&self.concept_id)
            || !valid_string(&self.label)
            || !valid_string(&self.concept_type)
            || !valid_string(&self.domain)
            || self.aliases.len() > PER_CONCEPT_ALIAS_MAX
            || self.aliases.iter().any(|value| !valid_string(value))
            || self.aliases.iter().collect::<HashSet<_>>().len() != self.aliases.len()
        {
            return Err("invalid_request");
        }
        validate_optional(&self.short_definition)?;
        validate_optional(&self.definition)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Sense {
    #[serde(deserialize_with = "wire_identifier")]
    pub concept_id: String,
    pub confidence: Confidence,
    #[serde(
        default,
        deserialize_with = "wire_optional_text",
        skip_serializing_if = "Option::is_none"
    )]
    pub definition: Option<String>,
    #[serde(deserialize_with = "wire_text")]
    pub label: String,
    #[serde(deserialize_with = "wire_identifier")]
    pub sense_id: String,
    #[serde(
        default,
        deserialize_with = "wire_optional_text",
        skip_serializing_if = "Option::is_none"
    )]
    pub short_definition: Option<String>,
}

impl Sense {
    fn validate(&self) -> Result<(), &'static str> {
        if !valid_string(&self.sense_id)
            || !valid_string(&self.concept_id)
            || !valid_string(&self.label)
        {
            return Err("invalid_request");
        }
        validate_optional(&self.short_definition)?;
        validate_optional(&self.definition)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Alias {
    #[serde(deserialize_with = "wire_text")]
    pub alias: String,
    #[serde(deserialize_with = "wire_identifier")]
    pub alias_id: String,
    #[serde(deserialize_with = "wire_identifier")]
    pub concept_id: String,
    pub confidence: Confidence,
    #[serde(deserialize_with = "wire_text")]
    pub normalized: String,
    #[serde(
        default,
        deserialize_with = "wire_optional_identifier",
        skip_serializing_if = "Option::is_none"
    )]
    pub sense_id: Option<String>,
    pub status: ConceptStatus,
}

impl Alias {
    fn validate(&self) -> Result<(), &'static str> {
        if !valid_string(&self.alias_id)
            || !valid_string(&self.alias)
            || !valid_string(&self.normalized)
            || !valid_string(&self.concept_id)
        {
            return Err("invalid_request");
        }
        validate_optional(&self.sense_id)
    }
}

trait ConceptInputRow {
    fn json_nodes(&self) -> usize;
}

impl ConceptInputRow for Concept {
    fn json_nodes(&self) -> usize {
        13 + self.aliases.len()
            + usize::from(self.definition.is_some()) * 2
            + usize::from(self.short_definition.is_some()) * 2
    }
}

impl ConceptInputRow for Sense {
    fn json_nodes(&self) -> usize {
        9 + usize::from(self.definition.is_some()) * 2
            + usize::from(self.short_definition.is_some()) * 2
    }
}

impl ConceptInputRow for Alias {
    fn json_nodes(&self) -> usize {
        13 + usize::from(self.sense_id.is_some()) * 2
    }
}

impl ConceptInputRow for String {
    fn json_nodes(&self) -> usize {
        1
    }
}

#[derive(Debug)]
pub struct ConceptSource {
    concepts: Vec<Concept>,
    senses: Vec<Sense>,
    aliases: Vec<Alias>,
}

#[derive(Debug)]
pub enum ConceptRequest {
    Index {
        source_manifest_hash: String,
        rebuilt_at: String,
        source: ConceptSource,
    },
    Query {
        source: ConceptSource,
        labels: Vec<String>,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct IndexHeader {
    contract_version: String,
    algorithm_version: String,
    source_manifest_hash: String,
    rebuilt_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryHeader {
    contract_version: String,
    algorithm_version: String,
}

fn validate_source(source: &ConceptSource) -> Result<(), &'static str> {
    if source.concepts.iter().any(|row| row.validate().is_err())
        || source.senses.iter().any(|row| row.validate().is_err())
        || source.aliases.iter().any(|row| row.validate().is_err())
    {
        return Err("invalid_request");
    }
    let concept_ids = source
        .concepts
        .iter()
        .map(|row| row.concept_id.as_str())
        .collect::<HashSet<_>>();
    if concept_ids.len() != source.concepts.len() {
        return Err("invalid_request");
    }
    let senses_by_id = source
        .senses
        .iter()
        .map(|row| (row.sense_id.as_str(), row.concept_id.as_str()))
        .collect::<HashMap<_, _>>();
    if senses_by_id.len() != source.senses.len()
        || source
            .senses
            .iter()
            .any(|row| !concept_ids.contains(row.concept_id.as_str()))
    {
        return Err("invalid_request");
    }
    let mut alias_ids = HashSet::with_capacity(source.aliases.len());
    for alias in &source.aliases {
        if !alias_ids.insert(alias.alias_id.as_str())
            || !concept_ids.contains(alias.concept_id.as_str())
            || alias.sense_id.as_deref().is_some_and(|sense_id| {
                senses_by_id.get(sense_id).copied() != Some(alias.concept_id.as_str())
            })
        {
            return Err("invalid_request");
        }
    }
    Ok(())
}

#[derive(Debug)]
pub struct ConceptPagedInputAssembler {
    validator: PagedInputValidator,
    concepts: Vec<Concept>,
    senses: Vec<Sense>,
    aliases: Vec<Alias>,
    labels: Vec<String>,
}

impl ConceptPagedInputAssembler {
    pub fn new(
        task_id: String,
        operation: String,
        request_hash: String,
        header: Map<String, Value>,
    ) -> Result<Self, &'static str> {
        if operation != CONCEPT_KB_INDEX_OPERATION && operation != CONCEPT_KB_QUERY_OPERATION {
            return Err("invalid_request");
        }
        Ok(Self {
            validator: PagedInputValidator::new(task_id, operation, request_hash, header)?,
            concepts: Vec::new(),
            senses: Vec::new(),
            aliases: Vec::new(),
            labels: Vec::new(),
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
        match section.name {
            "concepts" => {
                for row in rows {
                    self.concepts
                        .push(serde_json::from_value(row).map_err(|_| "invalid_request")?);
                }
            }
            "senses" => {
                for row in rows {
                    self.senses
                        .push(serde_json::from_value(row).map_err(|_| "invalid_request")?);
                }
            }
            "aliases" => {
                for row in rows {
                    self.aliases
                        .push(serde_json::from_value(row).map_err(|_| "invalid_request")?);
                }
            }
            "labels" => {
                for row in rows {
                    let label = row.as_str().filter(|value| valid_string(value));
                    self.labels.push(label.ok_or("invalid_request")?.to_owned());
                }
            }
            _ => return Err("invalid_request"),
        }
        Ok((section.name.to_owned(), acknowledged))
    }

    pub fn append_raw_page(
        &mut self,
        task_id: &str,
        descriptor: PageDescriptor,
        raw_rows: &str,
    ) -> Result<(String, u64), &'static str> {
        enum TypedPage {
            Concepts(Vec<Concept>),
            Senses(Vec<Sense>),
            Aliases(Vec<Alias>),
            Labels(Vec<String>),
        }

        let (page, node_count) = match descriptor.section.as_str() {
            "concepts" => {
                let (rows, nodes) = parse_canonical_rows("concepts", raw_rows)?;
                (TypedPage::Concepts(rows), nodes)
            }
            "senses" => {
                let (rows, nodes) = parse_canonical_rows("senses", raw_rows)?;
                (TypedPage::Senses(rows), nodes)
            }
            "aliases" => {
                let (rows, nodes) = parse_canonical_rows("aliases", raw_rows)?;
                (TypedPage::Aliases(rows), nodes)
            }
            "labels" => {
                let (rows, nodes) = parse_canonical_rows::<String>("labels", raw_rows)?;
                if rows.iter().any(|row| !valid_string(row)) {
                    return Err("invalid_request");
                }
                (TypedPage::Labels(rows), nodes)
            }
            _ => return Err("invalid_request"),
        };
        let row_count = match &page {
            TypedPage::Concepts(rows) => rows.len(),
            TypedPage::Senses(rows) => rows.len(),
            TypedPage::Aliases(rows) => rows.len(),
            TypedPage::Labels(rows) => rows.len(),
        };
        let (section, acknowledged) = self.validator.validate_verified_raw_page(
            task_id,
            &descriptor,
            raw_rows,
            row_count,
            node_count,
        )?;
        match page {
            TypedPage::Concepts(rows) => self.concepts.extend(rows),
            TypedPage::Senses(rows) => self.senses.extend(rows),
            TypedPage::Aliases(rows) => self.aliases.extend(rows),
            TypedPage::Labels(rows) => self.labels.extend(rows),
        }
        Ok((section.name.to_owned(), acknowledged))
    }

    pub fn finish(self, task_id: &str) -> Result<(String, String, ConceptRequest), &'static str> {
        let (task_id, operation, request_hash, header) = self.validator.finish(task_id)?;
        let source = ConceptSource {
            concepts: self.concepts,
            senses: self.senses,
            aliases: self.aliases,
        };
        validate_source(&source)?;
        let request = match operation.as_str() {
            CONCEPT_KB_INDEX_OPERATION => {
                let header: IndexHeader =
                    serde_json::from_value(Value::Object(header)).map_err(|_| "invalid_request")?;
                if header.contract_version != CONTRACT_VERSION
                    || header.algorithm_version != INDEX_VERSION
                    || !valid_string(&header.source_manifest_hash)
                    || !valid_string(&header.rebuilt_at)
                {
                    return Err("invalid_request");
                }
                ConceptRequest::Index {
                    source_manifest_hash: header.source_manifest_hash,
                    rebuilt_at: header.rebuilt_at,
                    source,
                }
            }
            CONCEPT_KB_QUERY_OPERATION => {
                let header: QueryHeader =
                    serde_json::from_value(Value::Object(header)).map_err(|_| "invalid_request")?;
                if header.contract_version != CONTRACT_VERSION
                    || header.algorithm_version != QUERY_VERSION
                    || self.labels.iter().collect::<HashSet<_>>().len() != self.labels.len()
                {
                    return Err("invalid_request");
                }
                ConceptRequest::Query {
                    source,
                    labels: self.labels,
                }
            }
            _ => return Err("invalid_request"),
        };
        Ok((task_id, request_hash, request))
    }
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SearchRow {
    concept_id: String,
    concept_type: String,
    domain: String,
    label: String,
    normalized: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OverlayEntry {
    alias: String,
    concept_id: String,
    confidence: Confidence,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition: Option<String>,
    label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sense_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    short_definition: Option<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct QueryAliasMatch {
    alias_id: String,
    concept_id: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct QueryMatch {
    alias_matches: Vec<QueryAliasMatch>,
    ambiguous: bool,
    exact_concept_ids: Vec<String>,
    label: String,
    sense_ids: Vec<String>,
}

pub trait ConceptResultRow: Serialize {
    fn json_nodes(&self) -> usize;
}

impl ConceptResultRow for SearchRow {
    fn json_nodes(&self) -> usize {
        11
    }
}

impl ConceptResultRow for OverlayEntry {
    fn json_nodes(&self) -> usize {
        9 + usize::from(self.definition.is_some()) * 2
            + usize::from(self.sense_id.is_some()) * 2
            + usize::from(self.short_definition.is_some()) * 2
    }
}

impl ConceptResultRow for QueryMatch {
    fn json_nodes(&self) -> usize {
        11 + self.alias_matches.len() * 5 + self.exact_concept_ids.len() + self.sense_ids.len()
    }
}

#[derive(Debug)]
pub enum ConceptResult {
    Index {
        source_manifest_hash: String,
        rebuilt_at: String,
        search: Vec<SearchRow>,
        overlay_entries: Vec<OverlayEntry>,
    },
    Query {
        matches: Vec<QueryMatch>,
    },
}

pub enum ConceptResultSection {
    Search(Vec<SearchRow>),
    OverlayEntries(Vec<OverlayEntry>),
    Matches(Vec<QueryMatch>),
}

impl ConceptResultSection {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Search(_) => "search",
            Self::OverlayEntries(_) => "overlayEntries",
            Self::Matches(_) => "matches",
        }
    }
}

pub struct ConceptResultParts {
    pub header: Map<String, Value>,
    pub sections: Vec<ConceptResultSection>,
}

impl ConceptResult {
    pub fn into_parts(self) -> ConceptResultParts {
        match self {
            Self::Index {
                source_manifest_hash,
                rebuilt_at,
                search,
                overlay_entries,
            } => ConceptResultParts {
                header: serde_json::from_value(json!({
                    "contractVersion": CONTRACT_VERSION,
                    "algorithmVersion": INDEX_VERSION,
                    "schemaVersion": SCHEMA_VERSION,
                    "sourceManifestHash": source_manifest_hash,
                    "rebuiltAt": rebuilt_at,
                }))
                .expect("static result header is an object"),
                sections: vec![
                    ConceptResultSection::Search(search),
                    ConceptResultSection::OverlayEntries(overlay_entries),
                ],
            },
            Self::Query { matches } => ConceptResultParts {
                header: serde_json::from_value(json!({
                    "contractVersion": CONTRACT_VERSION,
                    "algorithmVersion": QUERY_VERSION,
                }))
                .expect("static result header is an object"),
                sections: vec![ConceptResultSection::Matches(matches)],
            },
        }
    }

    fn into_value(self) -> Value {
        let parts = self.into_parts();
        let mut result = parts.header;
        for section in parts.sections {
            let (name, rows) = match section {
                ConceptResultSection::Search(rows) => {
                    ("search", serde_json::to_value(rows).unwrap())
                }
                ConceptResultSection::OverlayEntries(rows) => {
                    ("overlayEntries", serde_json::to_value(rows).unwrap())
                }
                ConceptResultSection::Matches(rows) => {
                    ("matches", serde_json::to_value(rows).unwrap())
                }
            };
            result.insert(name.to_owned(), rows);
        }
        Value::Object(result)
    }
}

fn compute_index(
    source_manifest_hash: String,
    rebuilt_at: String,
    source: ConceptSource,
    flag: &AtomicBool,
) -> Result<ConceptResult, &'static str> {
    let ConceptSource {
        concepts,
        senses,
        aliases,
    } = source;
    let mut ambiguity_by_normalized: HashMap<&str, Option<&str>> = HashMap::new();
    for (index, alias) in aliases.iter().enumerate() {
        checkpoint(flag, index)?;
        ambiguity_by_normalized
            .entry(alias.normalized.as_str())
            .and_modify(|concept_id| {
                if concept_id.is_some_and(|value| value != alias.concept_id) {
                    *concept_id = None;
                }
            })
            .or_insert(Some(alias.concept_id.as_str()));
    }
    let unambiguous_aliases = aliases
        .iter()
        .map(|alias| {
            ambiguity_by_normalized
                .get(alias.normalized.as_str())
                .is_some_and(Option::is_some)
        })
        .collect::<Vec<_>>();
    drop(ambiguity_by_normalized);
    let overlay_entries = {
        let concepts_by_id = concepts
            .iter()
            .map(|row| (row.concept_id.as_str(), row))
            .collect::<HashMap<_, _>>();
        let senses_by_id = senses
            .iter()
            .map(|row| (row.sense_id.as_str(), row))
            .collect::<HashMap<_, _>>();
        let mut overlay_entries = Vec::new();
        for (index, (alias, unambiguous)) in
            aliases.into_iter().zip(unambiguous_aliases).enumerate()
        {
            checkpoint(flag, index)?;
            if alias.status != ConceptStatus::Active
                || alias.confidence == Confidence::Low
                || !unambiguous
            {
                continue;
            }
            let Some(concept) = concepts_by_id.get(alias.concept_id.as_str()) else {
                continue;
            };
            if concept.status != ConceptStatus::Active {
                continue;
            }
            let sense = alias
                .sense_id
                .as_deref()
                .and_then(|sense_id| senses_by_id.get(sense_id).copied());
            overlay_entries.push(OverlayEntry {
                concept_id: alias.concept_id,
                sense_id: alias.sense_id,
                alias: alias.alias,
                label: concept.label.clone(),
                short_definition: sense
                    .and_then(|row| row.short_definition.clone())
                    .or_else(|| concept.short_definition.clone()),
                definition: sense
                    .and_then(|row| row.definition.clone())
                    .or_else(|| concept.definition.clone()),
                confidence: alias.confidence,
            });
        }
        let compare_overlay = |left: &OverlayEntry, right: &OverlayEntry| {
            right
                .alias
                .encode_utf16()
                .count()
                .cmp(&left.alias.encode_utf16().count())
                .then_with(|| synthesis_protocol::compare_utf16(&left.alias, &right.alias))
        };
        if !overlay_entries
            .windows(2)
            .all(|pair| compare_overlay(&pair[0], &pair[1]).is_le())
        {
            overlay_entries.sort_by(compare_overlay);
        }
        overlay_entries
    };
    drop(senses);
    let mut search = Vec::with_capacity(concepts.len());
    for (index, concept) in concepts.into_iter().enumerate() {
        checkpoint(flag, index)?;
        let aliases = concept.aliases.join(" ");
        let normalized = format!(
            "{} {} {} {}",
            concept.label,
            aliases,
            concept.short_definition.as_deref().unwrap_or(""),
            concept.definition.as_deref().unwrap_or("")
        )
        .to_lowercase();
        search.push(SearchRow {
            concept_id: concept.concept_id,
            label: concept.label,
            normalized,
            concept_type: concept.concept_type,
            domain: concept.domain,
        });
    }
    canceled(flag)?;
    Ok(ConceptResult::Index {
        source_manifest_hash,
        rebuilt_at,
        search,
        overlay_entries,
    })
}

fn compute_query(
    source: ConceptSource,
    labels: Vec<String>,
    flag: &AtomicBool,
) -> Result<ConceptResult, &'static str> {
    let wanted_keys = labels
        .iter()
        .map(|label| normalized(label))
        .collect::<HashSet<_>>();
    let concepts_by_key = source.concepts.iter().enumerate().fold(
        HashMap::<String, Vec<usize>>::new(),
        |mut by_key, (index, concept)| {
            let key = normalized(&concept.label);
            if wanted_keys.contains(&key) {
                by_key.entry(key).or_default().push(index);
            }
            by_key
        },
    );
    let aliases_by_key = source.aliases.iter().enumerate().fold(
        HashMap::<String, Vec<usize>>::new(),
        |mut by_key, (index, alias)| {
            let key = normalized(&alias.alias);
            if wanted_keys.contains(&key) {
                by_key.entry(key).or_default().push(index);
            }
            by_key
        },
    );
    let candidate_concept_ids = concepts_by_key
        .values()
        .flatten()
        .map(|index| source.concepts[*index].concept_id.as_str())
        .chain(
            aliases_by_key
                .values()
                .flatten()
                .map(|index| source.aliases[*index].concept_id.as_str()),
        )
        .collect::<HashSet<_>>();
    let mut senses_by_concept: HashMap<&str, Vec<(usize, &str)>> = HashMap::new();
    for (index, sense) in source.senses.iter().enumerate() {
        checkpoint(flag, index)?;
        if candidate_concept_ids.contains(sense.concept_id.as_str()) {
            senses_by_concept
                .entry(sense.concept_id.as_str())
                .or_default()
                .push((index, sense.sense_id.as_str()));
        }
    }
    let mut matches = Vec::with_capacity(labels.len());
    for (index, label) in labels.into_iter().enumerate() {
        checkpoint(flag, index)?;
        let key = normalized(&label);
        let exact_concept_ids = concepts_by_key
            .get(&key)
            .into_iter()
            .flatten()
            .map(|index| source.concepts[*index].concept_id.clone())
            .collect::<Vec<_>>();
        let alias_matches = aliases_by_key
            .get(&key)
            .into_iter()
            .flatten()
            .map(|index| {
                let alias = &source.aliases[*index];
                QueryAliasMatch {
                    alias_id: alias.alias_id.clone(),
                    concept_id: alias.concept_id.clone(),
                }
            })
            .collect::<Vec<_>>();
        let candidates = exact_concept_ids
            .iter()
            .map(String::as_str)
            .chain(alias_matches.iter().map(|row| row.concept_id.as_str()))
            .collect::<HashSet<_>>();
        let mut ordered_senses = candidates
            .iter()
            .filter_map(|concept_id| senses_by_concept.get(*concept_id))
            .flatten()
            .copied()
            .collect::<Vec<_>>();
        ordered_senses.sort_unstable_by_key(|(index, _)| *index);
        let sense_ids = ordered_senses
            .into_iter()
            .map(|(_, sense_id)| sense_id.to_owned())
            .collect();
        let ambiguous = candidates.len() > 1;
        drop(candidates);
        matches.push(QueryMatch {
            label,
            exact_concept_ids,
            alias_matches,
            sense_ids,
            ambiguous,
        });
    }
    canceled(flag)?;
    Ok(ConceptResult::Query { matches })
}

fn parse_canonical_rows<T>(section: &str, raw_rows: &str) -> Result<(Vec<T>, usize), &'static str>
where
    T: ConceptInputRow + DeserializeOwned + Serialize,
{
    let page = match section {
        "concepts" => "ConceptsPage",
        "senses" => "SensesPage",
        "aliases" => "ConceptAliasesPage",
        "labels" => "ConceptLabelsPage",
        _ => return Err("invalid_request"),
    };
    let rows = serde_json::from_str::<Vec<T>>(raw_rows).map_err(|_| "invalid_request")?;
    if rows.len() as u64
        > wire_schema(false)["$defs"][page]["properties"]["rows"]["maxItems"]
            .as_u64()
            .expect("concept page capacity")
        || serde_json::to_vec(&rows).map_err(|_| "invalid_request")? != raw_rows.as_bytes()
    {
        return Err("invalid_request");
    }
    let node_count = 1 + rows.iter().map(ConceptInputRow::json_nodes).sum::<usize>();
    Ok((rows, node_count))
}

pub fn compute_typed(
    request: ConceptRequest,
    flag: &AtomicBool,
) -> Result<ConceptResult, &'static str> {
    canceled(flag)?;
    match request {
        ConceptRequest::Index {
            source_manifest_hash,
            rebuilt_at,
            source,
        } => compute_index(source_manifest_hash, rebuilt_at, source, flag),
        ConceptRequest::Query { source, labels } => compute_query(source, labels, flag),
    }
}

pub fn compute(operation: &str, request: Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    let object = request.as_object().ok_or("invalid_request")?;
    let header_fields = if operation == CONCEPT_KB_INDEX_OPERATION {
        [
            "contractVersion",
            "algorithmVersion",
            "sourceManifestHash",
            "rebuiltAt",
        ]
        .as_slice()
    } else if operation == CONCEPT_KB_QUERY_OPERATION {
        ["contractVersion", "algorithmVersion"].as_slice()
    } else {
        return Err("invalid_request");
    };
    let header = object
        .iter()
        .filter(|(key, _)| header_fields.contains(&key.as_str()))
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect();
    let mut pages = Vec::new();
    for section in synthesis_protocol::deterministic_operation_spec(operation)
        .ok_or("invalid_request")?
        .input_sections
    {
        let rows = object
            .get(section.name)
            .and_then(Value::as_array)
            .ok_or("invalid_request")?
            .clone();
        let descriptor = synthesis_protocol::page_descriptor(section.name, 0, &rows)?;
        pages.push((descriptor, rows));
    }
    let descriptors = pages
        .iter()
        .map(|(descriptor, _)| descriptor.clone())
        .collect::<Vec<_>>();
    let request_hash = synthesis_protocol::paged_request_hash(operation, &header, &descriptors)?;
    let mut input =
        ConceptPagedInputAssembler::new("legacy".into(), operation.into(), request_hash, header)?;
    for (descriptor, rows) in pages {
        input.append_page("legacy", descriptor, rows)?;
    }
    let (_, _, request) = input.finish("legacy")?;
    compute_typed(request, flag).map(ConceptResult::into_value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_protocol::{DeterministicRawPageFrame, WORKER_PROTOCOL};

    fn flag() -> AtomicBool {
        AtomicBool::new(false)
    }

    #[test]
    fn shared_row_arrays_use_the_production_typed_decoder() {
        let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_CONCEPT_ARRAY_CODEC_CASES"),
            std::env::var("SYNTHESIS_CONCEPT_ARRAY_CODEC_RESULTS"),
        ) else {
            return;
        };
        let cases: Vec<Value> =
            serde_json::from_slice(&std::fs::read(cases_path).unwrap()).unwrap();
        let results: Vec<Value> = cases
            .iter()
            .map(|case| {
                let section = case["value"]["descriptor"]["section"].as_str().unwrap();
                let raw_rows = synthesis_protocol::canonical_json(&case["value"]["rows"]).unwrap();
                let outcome = match section {
                    "concepts" => parse_canonical_rows::<Concept>(section, &raw_rows).map(|_| ()),
                    "senses" => parse_canonical_rows::<Sense>(section, &raw_rows).map(|_| ()),
                    "aliases" => parse_canonical_rows::<Alias>(section, &raw_rows).map(|_| ()),
                    "labels" => parse_canonical_rows::<String>(section, &raw_rows).map(|_| ()),
                    _ => Err("invalid_request"),
                };
                json!({"id":case["id"],"accepted":outcome.is_ok(),"reason":outcome.err()})
            })
            .collect();
        std::fs::write(results_path, serde_json::to_vec(&results).unwrap()).unwrap();
    }

    #[test]
    fn typed_row_array_page_capacity_is_enforced() {
        let max_items =
            wire_schema(false)["$defs"]["ConceptLabelsPage"]["properties"]["rows"]["maxItems"]
                .as_u64()
                .unwrap() as usize;
        let rows = vec!["label".to_owned(); max_items + 1];
        let raw = synthesis_protocol::canonical_json(&rows).unwrap();
        assert_eq!(
            parse_canonical_rows::<String>("labels", &raw).map(|_| ()),
            Err("invalid_request")
        );
    }

    fn source() -> Value {
        json!({
            "contractVersion":"synthesis-concept-kb-index.v1",
            "algorithmVersion":"concept-kb-index.v1",
            "concepts":[
                {"conceptId":"concept:one","label":"Élan","aliases":[],"conceptType":"topic","domain":"test","status":"active","shortDefinition":"concept short"},
                {"conceptId":"concept:two","label":"Second","aliases":[],"conceptType":"topic","domain":"test","status":"active"}
            ],
            "senses":[{"senseId":"sense:one","conceptId":"concept:one","label":"Élan sense","confidence":"high","shortDefinition":"sense short"}],
            "aliases":[
                {"aliasId":"alias:one","alias":"Shared term","normalized":"shared term","conceptId":"concept:one","senseId":"sense:one","status":"active","confidence":"high"},
                {"aliasId":"alias:two","alias":"Shared term","normalized":"shared term","conceptId":"concept:two","status":"active","confidence":"high"}
            ],
            "sourceManifestHash":format!("sha256:{}", "a".repeat(64)),
            "rebuiltAt":"2026-07-19T00:00:00.000Z"
        })
    }

    #[test]
    fn index_suppresses_ambiguous_overlay_and_prefers_sense_definition() {
        let mut request = source();
        let result = compute(CONCEPT_KB_INDEX_OPERATION, request.clone(), &flag()).unwrap();
        assert_eq!(result["overlayEntries"], json!([]));
        request["aliases"].as_array_mut().unwrap().pop();
        let result = compute(CONCEPT_KB_INDEX_OPERATION, request, &flag()).unwrap();
        assert_eq!(
            result["overlayEntries"][0]["shortDefinition"],
            "sense short"
        );
    }

    #[test]
    fn unicode_text_at_the_wire_capacity_survives_query_execution() {
        let label = "\u{1f600}".repeat(4096);
        let mut request = source();
        request["algorithmVersion"] = json!(QUERY_VERSION);
        request["labels"] = json!([label]);
        request["concepts"][0]["label"] = json!(label);
        request
            .as_object_mut()
            .unwrap()
            .remove("sourceManifestHash");
        request.as_object_mut().unwrap().remove("rebuiltAt");
        let result = compute(CONCEPT_KB_QUERY_OPERATION, request, &flag()).unwrap();
        assert_eq!(
            result["matches"][0]["exactConceptIds"],
            json!(["concept:one"])
        );
    }

    #[test]
    fn query_matches_unicode_case_and_reports_cross_concept_ambiguity() {
        let mut request = source();
        request["algorithmVersion"] = json!("concept-kb-query.v1");
        request["labels"] = json!(["ÉLAN", "shared term"]);
        request
            .as_object_mut()
            .unwrap()
            .remove("sourceManifestHash");
        request.as_object_mut().unwrap().remove("rebuiltAt");
        let result = compute(CONCEPT_KB_QUERY_OPERATION, request, &flag()).unwrap();
        assert_eq!(
            result["matches"][0]["exactConceptIds"],
            json!(["concept:one"])
        );
        assert_eq!(result["matches"][1]["ambiguous"], true);
    }

    #[test]
    fn typed_pages_reject_unknown_domain_fields() {
        let header = serde_json::from_value(json!({
            "contractVersion": CONTRACT_VERSION,
            "algorithmVersion": QUERY_VERSION,
        }))
        .unwrap();
        let mut input = ConceptPagedInputAssembler::new(
            "task".into(),
            CONCEPT_KB_QUERY_OPERATION.into(),
            format!("sha256:{}", "0".repeat(64)),
            header,
        )
        .unwrap();
        let rows = vec![json!({
            "conceptId":"concept:one","label":"One","aliases":[],
            "conceptType":"topic","domain":"test","status":"active","extra":true
        })];
        let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &rows).unwrap();
        assert_eq!(
            input.append_page("task", descriptor, rows),
            Err("invalid_request")
        );
    }

    #[test]
    fn raw_typed_pages_require_canonical_bytes_and_deny_unknown_fields() {
        fn query_input() -> ConceptPagedInputAssembler {
            let header = serde_json::from_value(json!({
                "contractVersion": CONTRACT_VERSION,
                "algorithmVersion": QUERY_VERSION,
            }))
            .unwrap();
            ConceptPagedInputAssembler::new(
                "task".into(),
                CONCEPT_KB_QUERY_OPERATION.into(),
                format!("sha256:{}", "0".repeat(64)),
                header,
            )
            .unwrap()
        }

        let rows = vec![json!({
            "conceptId":"concept:one","label":"One","aliases":[],
            "conceptType":"topic","domain":"test","status":"active"
        })];
        let raw = synthesis_protocol::canonical_json(&Value::Array(rows.clone())).unwrap();
        let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &rows).unwrap();
        assert_eq!(
            query_input()
                .append_raw_page("task", descriptor, &raw)
                .unwrap(),
            ("concepts".into(), 0)
        );

        let noncanonical = r#"[{"label":"One","aliases":[],"conceptId":"concept:one","conceptType":"topic","domain":"test","status":"active"}]"#;
        let parsed: Vec<Value> = serde_json::from_str(noncanonical).unwrap();
        let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &parsed).unwrap();
        assert_eq!(
            query_input().append_raw_page("task", descriptor, noncanonical),
            Err("invalid_request")
        );

        let unknown = vec![json!({
            "aliases":[],"conceptId":"concept:one","conceptType":"topic",
            "domain":"test","extra":true,"label":"One","status":"active"
        })];
        let raw = synthesis_protocol::canonical_json(&Value::Array(unknown.clone())).unwrap();
        let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &unknown).unwrap();
        assert_eq!(
            query_input().append_raw_page("task", descriptor, &raw),
            Err("invalid_request")
        );

        for (field, value, accepted) in [
            ("definition", Value::Null, false),
            ("conceptId", json!("x".repeat(513)), false),
            ("conceptId", json!("invalid\nidentifier"), false),
            ("label", json!("x".repeat(4097)), false),
            ("label", json!("😀".repeat(4096)), true),
            ("definition", json!(""), true),
            ("aliases", json!(vec![""; 4097]), false),
        ] {
            let mut row = rows[0].clone();
            row[field] = value;
            let page = vec![row];
            let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &page).unwrap();
            let raw = synthesis_protocol::canonical_json(&Value::Array(page.clone())).unwrap();
            assert_eq!(
                query_input()
                    .append_raw_page("task", descriptor.clone(), &raw)
                    .is_ok(),
                accepted,
                "raw {field}"
            );
            assert_eq!(
                query_input().append_page("task", descriptor, page).is_ok(),
                accepted,
                "value {field}"
            );
        }
        let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_CONCEPT_ROW_CODEC_CASES"),
            std::env::var("SYNTHESIS_CONCEPT_ROW_CODEC_RESULTS"),
        ) else {
            return;
        };
        let cases: Vec<Value> =
            serde_json::from_slice(&std::fs::read(cases_path).unwrap()).unwrap();
        assert!(!cases.is_empty());
        let outcomes = cases.iter().map(|case| {
            let value = case["value"].clone();
            let result = match case["schemaRef"].as_str().unwrap().rsplit('/').next().unwrap() {
                "Concept" => serde_json::from_value::<Concept>(value).map(|_| ()),
                "Sense" => serde_json::from_value::<Sense>(value).map(|_| ()),
                "ConceptAlias" => serde_json::from_value::<Alias>(value).map(|_| ()),
                _ => panic!("unexpected concept row"),
            };
            json!({"id":case["id"],"accepted":result.is_ok(),"reason":result.err().map(|_| "invalid_request")})
        }).collect::<Vec<_>>();
        std::fs::write(results_path, serde_json::to_vec(&outcomes).unwrap()).unwrap();
        for (case, outcome) in cases.iter().zip(&outcomes) {
            assert_eq!(outcome["accepted"], case["valid"], "{}", case["id"]);
        }
    }

    #[test]
    fn shared_input_sections_use_the_production_page_receiver() {
        fn query_input() -> ConceptPagedInputAssembler {
            let header = serde_json::from_value(json!({
                "contractVersion": CONTRACT_VERSION,
                "algorithmVersion": QUERY_VERSION,
            }))
            .unwrap();
            ConceptPagedInputAssembler::new(
                "task".into(),
                CONCEPT_KB_QUERY_OPERATION.into(),
                format!("sha256:{}", "0".repeat(64)),
                header,
            )
            .unwrap()
        }

        fn receive_page(
            section: &str,
            descriptor: PageDescriptor,
            raw_rows: &str,
        ) -> Result<(), &'static str> {
            let mut input = query_input();
            let order = ["concepts", "senses", "aliases", "labels"];
            let target = order
                .iter()
                .position(|name| *name == section)
                .ok_or("invalid_request")?;
            for name in &order[..target] {
                let descriptor = synthesis_protocol::page_descriptor(name, 0, &[])?;
                input.append_raw_page("task", descriptor, "[]")?;
            }
            input.append_raw_page("task", descriptor, raw_rows)?;
            Ok(())
        }

        fn receive_frame(source: &str) -> Result<(), &'static str> {
            let frame = DeterministicRawPageFrame::rebuild_input(source)?;
            let section = frame.descriptor.section.clone();
            receive_page(&section, frame.descriptor, frame.rows.get())
        }

        fn receive_case_page(section: &str, rows: Vec<Value>) -> Result<(), &'static str> {
            let descriptor = synthesis_protocol::page_descriptor(section, 0, &rows)?;
            frame_source(
                &serde_json::to_value(descriptor).map_err(|_| "invalid_request")?,
                &Value::Array(rows),
            )
            .and_then(|source| receive_frame(&source))
        }

        fn frame_source(descriptor: &Value, rows: &Value) -> Result<String, &'static str> {
            let descriptor = serde_json::to_string(descriptor).map_err(|_| "invalid_request")?;
            let rows = synthesis_protocol::canonical_json(rows)?;
            Ok(format!(
                "{{\"protocol\":\"{WORKER_PROTOCOL}\",\"type\":\"input_page\",\"taskId\":\"task\",\"descriptor\":{descriptor},\"rows\":{rows}}}"
            ))
        }

        fn outcome(case: &Value) -> Result<(), &'static str> {
            let mut value = case["value"].clone();
            if case["resealDescriptor"] == true
                && value["rows"].is_array()
                && let (Some(section), Some(page_index)) = (
                    value["descriptor"]["section"].as_str(),
                    value["descriptor"]["pageIndex"].as_u64(),
                )
            {
                let rows: Vec<Value> =
                    serde_json::from_value(value["rows"].clone()).map_err(|_| "invalid_request")?;
                if let Ok(sealed) = synthesis_protocol::page_descriptor(section, page_index, &rows)
                {
                    value["descriptor"]["rowCount"] = json!(sealed.row_count);
                    value["descriptor"]["byteLength"] = json!(sealed.byte_length);
                    value["descriptor"]["sha256"] = json!(sealed.sha256);
                }
            }
            let object = value.as_object_mut().ok_or("invalid_request")?;
            object.insert("protocol".into(), json!(WORKER_PROTOCOL));
            object.insert("type".into(), json!("input_page"));
            object.insert("taskId".into(), json!("task"));
            let source = synthesis_protocol::canonical_json(&value)?;
            receive_frame(&source)
        }

        if let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_CONCEPT_SECTION_CODEC_CASES"),
            std::env::var("SYNTHESIS_CONCEPT_SECTION_CODEC_RESULTS"),
        ) {
            let cases: Vec<Value> =
                serde_json::from_slice(&std::fs::read(cases_path).unwrap()).unwrap();
            assert!(!cases.is_empty());
            let results: Vec<Value> = cases
                .iter()
                .map(|case| {
                    let result = outcome(case);
                    let mut row = json!({"id":case["id"],"accepted":result.is_ok()});
                    if let Err(reason) = result {
                        row["reason"] = json!(reason);
                    }
                    row
                })
                .collect();
            std::fs::write(results_path, serde_json::to_vec(&results).unwrap()).unwrap();
        }

        for (section, rows) in [
            (
                "concepts",
                vec![
                    json!({"conceptId":"concept:one","label":"One","aliases":[],"conceptType":"topic","domain":"test","status":"active"}),
                ],
            ),
            (
                "senses",
                vec![
                    json!({"senseId":"sense:one","conceptId":"concept:one","label":"One","confidence":"high"}),
                ],
            ),
            (
                "aliases",
                vec![
                    json!({"aliasId":"alias:one","alias":"One","normalized":"one","conceptId":"concept:one","status":"active","confidence":"high"}),
                ],
            ),
            ("labels", vec![json!("One")]),
        ] {
            assert!(receive_case_page(section, rows).is_ok(), "{section}");
        }
        let rows = vec![
            json!({"conceptId":"concept:one","label":"One","aliases":[],"conceptType":"topic","domain":"test","status":"active"}),
        ];
        let descriptor = synthesis_protocol::page_descriptor("concepts", 0, &rows).unwrap();
        let base = json!({"descriptor":descriptor,"rows":rows});
        let mut unknown_root = base.clone();
        unknown_root["extra"] = json!(true);
        assert!(outcome(&json!({"value":unknown_root})).is_err());
        for missing in ["descriptor", "rows"] {
            let mut value = base.clone();
            value.as_object_mut().unwrap().remove(missing);
            assert!(
                outcome(&json!({"value":value})).is_err(),
                "missing {missing}"
            );
        }
        let mut unknown_descriptor = base.clone();
        unknown_descriptor["descriptor"]["extra"] = json!(true);
        assert!(outcome(&json!({"value":unknown_descriptor})).is_err());
        let mut invalid_rows = base;
        invalid_rows["rows"] = json!({"wrong":"type"});
        assert!(outcome(&json!({"value":invalid_rows})).is_err());
    }

    #[test]
    fn canceled_kernel_fails_before_publication() {
        assert_eq!(
            compute(CONCEPT_KB_INDEX_OPERATION, source(), &AtomicBool::new(true)),
            Err("worker_canceled")
        );
    }
}
