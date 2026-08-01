use serde_json::{Map, Value, json};
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use unicode_categories::UnicodeCategories;
use unicode_normalization::UnicodeNormalization;

pub const CONTRACT_VERSION: &str = "synthesis-reference-matcher.v1";
pub const BINDING_ALGORITHM_VERSION: &str = "reference-binding.v1";
pub const DEDUPE_ALGORITHM_VERSION: &str = "canonical-cluster-dedupe.v1";

fn canceled(flag: &AtomicBool) -> Result<(), &'static str> {
    if flag.load(AtomicOrdering::Relaxed) {
        Err("canceled")
    } else {
        Ok(())
    }
}

fn string<'a>(object: &'a Map<String, Value>, key: &str) -> &'a str {
    object.get(key).and_then(Value::as_str).unwrap_or("").trim()
}

fn utf16_cmp(left: &str, right: &str) -> Ordering {
    left.encode_utf16().cmp(right.encode_utf16())
}

fn normalize_title(value: &str) -> String {
    let mut output = String::new();
    let mut space = true;
    for character in value.nfkc().flat_map(char::to_lowercase) {
        let separator =
            character.is_punctuation() || character.is_symbol() || character.is_whitespace();
        if separator {
            if !space && !output.is_empty() {
                output.push(' ');
            }
            space = true;
        } else {
            output.push(character);
            space = false;
        }
    }
    output.trim().to_owned()
}

fn compact_title(value: &str) -> String {
    normalize_title(value)
        .chars()
        .filter(|value| !value.is_whitespace())
        .collect()
}

fn strong_compact_title(value: &str) -> String {
    value
        .nfkc()
        .flat_map(char::to_lowercase)
        .filter(|value| value.is_alphanumeric())
        .collect()
}

fn normalize_identifier(kind: &str, value: &str) -> Option<(String, String)> {
    let kind = kind.trim().to_ascii_lowercase();
    let mut value = value.trim().to_lowercase();
    match kind.as_str() {
        "doi" => {
            for prefix in [
                "https://dx.doi.org/",
                "http://dx.doi.org/",
                "https://doi.org/",
                "http://doi.org/",
                "doi:",
            ] {
                if value.starts_with(prefix) {
                    value = value[prefix.len()..].to_owned();
                    break;
                }
            }
            value = value
                .trim_end_matches(['.', ',', ';', ':'])
                .trim()
                .to_owned();
        }
        "arxiv" => {
            for prefix in [
                "https://arxiv.org/abs/",
                "http://arxiv.org/abs/",
                "https://arxiv.org/pdf/",
                "http://arxiv.org/pdf/",
                "arxiv:",
                "10.48550/arxiv.",
            ] {
                if value.starts_with(prefix) {
                    value = value[prefix.len()..].to_owned();
                    break;
                }
            }
            value = value.trim_end_matches(".pdf").to_owned();
            if let Some(index) = value.rfind('v')
                && value[index + 1..]
                    .chars()
                    .all(|value| value.is_ascii_digit())
            {
                value.truncate(index);
            }
            value = value
                .trim_end_matches(['.', ',', ';', ':'])
                .trim()
                .to_owned();
        }
        "url" => value = value.trim_end_matches('/').to_owned(),
        "citekey" | "isbn" => {}
        _ => return None,
    }
    (!value.is_empty()).then_some((kind, value))
}

fn identifiers(object: &Map<String, Value>, include_raw: bool) -> Vec<(String, String)> {
    let mut values = BTreeSet::new();
    for key in ["doi", "arxiv", "isbn", "url", "citekey"] {
        if let Some(identifier) = normalize_identifier(key, string(object, key)) {
            values.insert(identifier);
        }
    }
    if let Some(rows) = object.get("identifiers").and_then(Value::as_array) {
        for row in rows.iter().filter_map(Value::as_object) {
            if let Some(identifier) =
                normalize_identifier(string(row, "kind"), string(row, "value"))
            {
                values.insert(identifier);
            }
        }
    }
    if include_raw {
        let text = [
            string(object, "title"),
            string(object, "parsedTitle"),
            string(object, "rawReference"),
        ]
        .join(" ");
        for token in text.split_whitespace() {
            let token = token.trim_matches(|value: char| {
                matches!(value, '[' | ']' | '(' | ')' | '（' | '）' | ',' | ';')
            });
            let candidate = token.strip_prefix("doi:").unwrap_or(token);
            if candidate.starts_with("10.")
                && candidate.contains('/')
                && let Some(identifier) = normalize_identifier("doi", candidate)
            {
                values.insert(identifier);
            }
            if let Some(candidate) = token.to_ascii_lowercase().strip_prefix("arxiv:")
                && let Some(identifier) = normalize_identifier("arxiv", candidate)
            {
                values.insert(identifier);
            }
        }
        let lowered = text.to_ascii_lowercase();
        let mut offset = 0;
        while let Some(index) = lowered[offset..].find("arxiv:") {
            let start = offset + index + "arxiv:".len();
            let value: String = lowered[start..]
                .chars()
                .skip_while(|character| character.is_ascii_whitespace())
                .take_while(|character| {
                    character.is_ascii_digit() || matches!(character, '.' | 'v')
                })
                .collect();
            if let Some(identifier) = normalize_identifier("arxiv", &value) {
                values.insert(identifier);
            }
            offset = start;
        }
        let mut offset = 0;
        while let Some(index) = lowered[offset..].find("10.") {
            let start = offset + index;
            let value: String = lowered[start..]
                .chars()
                .take_while(|character| {
                    !character.is_whitespace() && !matches!(character, ',' | ';' | ']' | ')' | '）')
                })
                .collect();
            if value.contains('/')
                && let Some(identifier) = normalize_identifier("doi", &value)
            {
                values.insert(identifier);
            }
            offset = start + 3;
        }
    }
    values.into_iter().collect()
}

fn authors(object: &Map<String, Value>) -> BTreeSet<String> {
    object
        .get("authors")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter_map(|author| {
            let first = author.split(',').next().unwrap_or(author);
            normalize_title(first)
                .split_whitespace()
                .next_back()
                .map(str::to_owned)
        })
        .filter(|token| token != "et" && token != "al")
        .collect()
}

fn year_number(object: &Map<String, Value>) -> Option<f64> {
    string(object, "year").parse().ok()
}

fn year_delta(reference: &Map<String, Value>, paper: &Map<String, Value>) -> f64 {
    match (year_number(reference), year_number(paper)) {
        (Some(left), Some(right)) => (left - right).abs(),
        _ => 999.0,
    }
}

fn reasons_with_year(mut reasons: Vec<String>, delta: f64) -> Vec<String> {
    if delta == 0.0 {
        reasons.push("year_same".into());
    } else if delta == 1.0 {
        reasons.push("year_delta_1".into());
    } else if delta == 2.0 {
        reasons.push("year_delta_2".into());
    }
    reasons.sort_by(|left, right| utf16_cmp(left, right));
    reasons.dedup();
    reasons
}

fn javascript_number(value: f64) -> Value {
    if value.fract() == 0.0 && value >= i64::MIN as f64 && value <= i64::MAX as f64 {
        json!(value as i64)
    } else {
        json!(value)
    }
}

fn candidate(
    paper: &Map<String, Value>,
    reference: &Map<String, Value>,
    reasons: Vec<String>,
    score: f64,
) -> Value {
    let reference_authors = authors(reference);
    let paper_authors = authors(paper);
    let overlap: Vec<_> = reference_authors
        .intersection(&paper_authors)
        .cloned()
        .collect();
    let delta = year_delta(reference, paper);
    let mut output = Map::new();
    output.insert(
        "paperRef".into(),
        Value::String(string(paper, "paperRef").into()),
    );
    for key in ["itemKey", "literatureItemId"] {
        if !string(paper, key).is_empty() {
            output.insert(key.into(), Value::String(string(paper, key).into()));
        }
    }
    output.insert("title".into(), Value::String(string(paper, "title").into()));
    output.insert("year".into(), Value::String(string(paper, "year").into()));
    output.insert("score".into(), javascript_number(score));
    output.insert("reasons".into(), json!(reasons_with_year(reasons, delta)));
    output.insert(
        "evidence".into(),
        json!({
            "author_overlap": overlap,
            "author_overlap_count": overlap.len(),
            "year_delta": javascript_number(delta),
            "title_similarity": javascript_number(score),
        }),
    );
    Value::Object(output)
}

fn title_similarity(left: &str, right: &str) -> f64 {
    let left: Vec<_> = left.encode_utf16().collect();
    let right: Vec<_> = right.encode_utf16().collect();
    if left.is_empty() || right.is_empty() {
        return 0.0;
    }
    let mut previous: Vec<usize> = (0..=right.len()).collect();
    let mut current = vec![0; right.len() + 1];
    for (index, source) in left.iter().enumerate() {
        current[0] = index + 1;
        for (target_index, target) in right.iter().enumerate() {
            current[target_index + 1] = (previous[target_index + 1] + 1)
                .min(current[target_index] + 1)
                .min(previous[target_index] + usize::from(source != target));
        }
        std::mem::swap(&mut previous, &mut current);
    }
    1.0 - previous[right.len()] as f64 / left.len().max(right.len()) as f64
}

#[derive(Clone)]
struct Paper {
    row: Map<String, Value>,
    normalized: String,
    authors: BTreeSet<String>,
    year: Option<f64>,
    variants: Vec<(String, String, bool)>,
}

fn title_variants(object: &Map<String, Value>) -> Vec<(String, String, bool)> {
    let mut inputs = BTreeSet::new();
    for key in ["normalizedTitle", "title", "parsedTitle"] {
        let value = string(object, key);
        if !value.is_empty() {
            inputs.insert(value.to_owned());
        }
    }
    let mut variants = BTreeMap::new();
    for input in inputs {
        let normalized = normalize_title(&input);
        if normalized.is_empty() {
            continue;
        }
        variants.insert(
            format!("{normalized}:false"),
            (normalized.clone(), strong_compact_title(&normalized), false),
        );
        let padded = format!(" {normalized} ");
        let earliest = [
            " in proceedings of ",
            " in proceedings ",
            " proceedings of ",
            " proceedings ",
            " arxiv preprint ",
            " corr ",
            " cvpr ",
            " iccv ",
            " eccv ",
            " neurips ",
            " nips ",
            " iclr ",
            " aaai ",
            " ijcai ",
            " wacv ",
            " bmvc ",
            " pami ",
            " pp ",
            " pages ",
            " page ",
        ]
        .iter()
        .filter_map(|marker| padded.find(marker))
        .min();
        if let Some(index) = earliest {
            let stripped = padded[..index].trim();
            if stripped.split_whitespace().count() >= 3 && stripped.encode_utf16().count() >= 12 {
                variants.insert(
                    format!("{stripped}:true"),
                    (stripped.to_owned(), strong_compact_title(stripped), true),
                );
            }
        }
        if normalized
            .split_whitespace()
            .next_back()
            .is_some_and(|token| {
                token.len() == 4
                    && token.chars().all(|character| character.is_ascii_digit())
                    && matches!(&token[..2], "19" | "20")
            })
        {
            let stripped = normalized
                .rsplit_once(' ')
                .map(|(prefix, _)| prefix)
                .unwrap_or("");
            if stripped.split_whitespace().count() >= 3 && stripped.encode_utf16().count() >= 12 {
                variants.insert(
                    format!("{stripped}:true"),
                    (stripped.to_owned(), strong_compact_title(stripped), true),
                );
            }
        }
    }
    let mut output: Vec<_> = variants.into_values().collect();
    output.sort_by(|left, right| {
        left.2
            .cmp(&right.2)
            .then_with(|| utf16_cmp(&left.0, &right.0))
    });
    output
}

fn binding(request: Value, canceled_flag: &AtomicBool) -> Result<Value, &'static str> {
    canceled(canceled_flag)?;
    let request = request.as_object().ok_or("invalid_request")?;
    if string(request, "contractVersion") != CONTRACT_VERSION
        || string(request, "algorithmVersion") != BINDING_ALGORITHM_VERSION
    {
        return Err("invalid_request");
    }
    let policy = string(request, "policyId");
    let raw_identifiers = policy != "baseline";
    let year_guard = !matches!(policy, "baseline" | "policy-a");
    let compact_enabled = !matches!(policy, "baseline" | "policy-a" | "policy-b");
    let fuzzy_enabled = matches!(policy, "policy-d" | "production");
    let papers = request
        .get("papers")
        .and_then(Value::as_array)
        .ok_or("invalid_request")?;
    let mut normalized_papers = Vec::with_capacity(papers.len());
    let mut identifier_index: HashMap<(String, String), Vec<usize>> = HashMap::new();
    for (index, row) in papers.iter().enumerate() {
        canceled(canceled_flag)?;
        let mut row = row.as_object().ok_or("invalid_request")?.clone();
        let title = if string(&row, "normalizedTitle").is_empty() {
            string(&row, "title")
        } else {
            string(&row, "normalizedTitle")
        };
        let normalized = normalize_title(title);
        for identifier in identifiers(&row, false) {
            identifier_index.entry(identifier).or_default().push(index);
        }
        normalized_papers.push(Paper {
            authors: authors(&row),
            year: year_number(&row),
            variants: title_variants(&row),
            normalized,
            row: std::mem::take(&mut row),
        });
    }
    let references = request
        .get("references")
        .and_then(Value::as_array)
        .ok_or("invalid_request")?;
    let mut matches = Vec::with_capacity(references.len());
    for entry in references {
        canceled(canceled_flag)?;
        let entry = entry.as_object().ok_or("invalid_request")?;
        let reference = entry
            .get("reference")
            .and_then(Value::as_object)
            .ok_or("invalid_request")?;
        let mut decision = None;
        for identifier in identifiers(reference, raw_identifiers) {
            let candidates = identifier_index
                .get(&identifier)
                .cloned()
                .unwrap_or_default();
            if candidates.len() == 1 {
                let paper = &normalized_papers[candidates[0]];
                decision = Some(json!({
                    "status": "matched",
                    "targetPaperRef": string(&paper.row, "paperRef"),
                    "confidence": "deterministic",
                    "diagnostics": [{"code":"reference_identifier_match","kind":identifier.0,"policy":policy}],
                    "suggestedCandidates": [candidate(&paper.row, reference, vec![format!("identifier:{}", identifier.0)], 1.0)]
                }));
                break;
            }
            if candidates.len() > 1 {
                let mut rows: Vec<_> = candidates
                    .iter()
                    .map(|index| {
                        candidate(
                            &normalized_papers[*index].row,
                            reference,
                            vec![format!("identifier:{}", identifier.0)],
                            1.0,
                        )
                    })
                    .collect();
                rows.sort_by(|left, right| {
                    utf16_cmp(
                        left["paperRef"].as_str().unwrap_or(""),
                        right["paperRef"].as_str().unwrap_or(""),
                    )
                });
                rows.truncate(3);
                decision = Some(json!({
                    "status":"ambiguous", "confidence":"review",
                    "diagnostics":[{"code":"ambiguous_reference_identifier_match","kind":identifier.0,"candidates":candidates.iter().map(|index| string(&normalized_papers[*index].row,"paperRef")).collect::<Vec<_>>(),"policy":policy}],
                    "suggestedCandidates":rows
                }));
                break;
            }
        }
        if decision.is_none() {
            let source = if !string(reference, "normalizedTitle").is_empty() {
                string(reference, "normalizedTitle")
            } else if !string(reference, "title").is_empty() {
                string(reference, "title")
            } else {
                string(reference, "parsedTitle")
            };
            let normalized = normalize_title(source);
            let reference_variants = title_variants(reference);
            let reference_authors = authors(reference);
            let reference_year = year_number(reference);
            let mut candidates = Vec::<Value>::new();
            for paper in &normalized_papers {
                let overlap = reference_authors.intersection(&paper.authors).count();
                let compatible_year = !year_guard
                    || reference_year.is_none()
                    || paper.year.is_none()
                    || (reference_year.unwrap() - paper.year.unwrap()).abs() <= 2.0;
                let mut reasons = Vec::<String>::new();
                let mut score: f64 = 0.0;
                for (reference_title, reference_strong, reference_stripped) in &reference_variants {
                    for (paper_title, paper_strong, paper_stripped) in &paper.variants {
                        let stripped = *reference_stripped || *paper_stripped;
                        let prefix = if stripped { "stripped_" } else { "" };
                        if !reference_strong.is_empty() && reference_strong == paper_strong {
                            reasons.push(format!("{prefix}strong_compact_title_exact"));
                            score = 1.0;
                        }
                        if reference_title == paper_title && overlap > 0 && compatible_year {
                            reasons.push(format!("{prefix}exact_title_author"));
                            score = score.max(0.999);
                        }
                        if compact_enabled
                            && compact_title(reference_title) == compact_title(paper_title)
                            && overlap > 0
                            && compatible_year
                        {
                            reasons.push(format!("{prefix}compact_title_author"));
                            score = score.max(0.995);
                        }
                    }
                }
                reasons.sort_by(|left, right| utf16_cmp(left, right));
                reasons.dedup();
                if reasons.is_empty()
                    && fuzzy_enabled
                    && reference_authors.len() >= 2
                    && overlap >= 2
                    && compatible_year
                {
                    let similarity = title_similarity(&normalized, &paper.normalized);
                    if similarity >= 0.82 {
                        reasons.push(
                            if similarity >= 0.97 {
                                "guarded_fuzzy_title"
                            } else {
                                "suggested_fuzzy_title"
                            }
                            .into(),
                        );
                        score = similarity;
                    }
                }
                if !reasons.is_empty() {
                    candidates.push(candidate(&paper.row, reference, reasons, score));
                }
            }
            candidates.sort_by(|left, right| {
                right["score"]
                    .as_f64()
                    .unwrap_or(0.0)
                    .partial_cmp(&left["score"].as_f64().unwrap_or(0.0))
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| {
                        right["evidence"]["author_overlap_count"]
                            .as_u64()
                            .cmp(&left["evidence"]["author_overlap_count"].as_u64())
                    })
                    .then_with(|| {
                        utf16_cmp(
                            left["paperRef"].as_str().unwrap_or(""),
                            right["paperRef"].as_str().unwrap_or(""),
                        )
                    })
            });
            let auto: Vec<_> = candidates
                .iter()
                .filter(|candidate| {
                    candidate["reasons"].as_array().is_some_and(|reasons| {
                        reasons.iter().any(|reason| {
                            matches!(
                                reason.as_str(),
                                Some(
                                    "strong_compact_title_exact"
                                        | "stripped_strong_compact_title_exact"
                                        | "guarded_fuzzy_title"
                                )
                            )
                        })
                    })
                })
                .collect();
            decision = Some(if auto.len() == 1 {
                let selected = auto[0].clone();
                json!({"status":"matched","targetPaperRef":selected["paperRef"],"confidence":if selected["reasons"].as_array().unwrap().iter().any(|reason| reason == "strong_compact_title_exact" || reason == "stripped_strong_compact_title_exact") {"deterministic"} else {"high"},"diagnostics":[{"code":"reference_title_match","reasons":selected["reasons"],"policy":policy}],"suggestedCandidates":[selected]})
            } else {
                candidates.truncate(3);
                let status = if candidates.is_empty() {
                    "unmatched"
                } else if candidates.len() == 1 {
                    "suggested"
                } else {
                    "ambiguous"
                };
                json!({"status":status,"confidence":if status == "suggested" {"low"} else {"review"},"diagnostics":[{"code":if candidates.is_empty(){"needs_resolution_review"}else{"reference_match_suggestions"},"policy":policy,"suggested_candidates":candidates}],"suggestedCandidates":candidates})
            });
        }
        matches.push(json!({"canonicalReferenceId":string(entry,"canonicalReferenceId"),"result":decision.unwrap()}));
    }
    Ok(
        json!({"contractVersion":CONTRACT_VERSION,"algorithmVersion":BINDING_ALGORITHM_VERSION,"policyId":policy,"matches":matches}),
    )
}

#[derive(Clone)]
struct DedupeRecord {
    id: String,
    title: String,
    normalized: String,
    year: String,
    authors: Vec<String>,
    accepted: bool,
    sticky: bool,
    eligibility: &'static str,
    eligibility_reasons: Vec<String>,
    identifiers: Vec<(String, String)>,
    strong_identifiers: Vec<String>,
    tokens: Vec<String>,
    token_set: BTreeSet<String>,
    compact: String,
    strong: String,
    raw_references: Vec<String>,
    raw_count: usize,
    selected_title_candidate: Value,
    title_candidates: Vec<Value>,
    noise_profile: Value,
}

fn sorted_strings(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn content_tokens(value: &str) -> Vec<String> {
    normalize_title(value)
        .split_whitespace()
        .filter(|token| {
            token.encode_utf16().count() >= 2
                && !matches!(
                    *token,
                    "a" | "an"
                        | "the"
                        | "of"
                        | "for"
                        | "with"
                        | "and"
                        | "or"
                        | "to"
                        | "in"
                        | "on"
                        | "by"
                        | "from"
                        | "via"
                        | "using"
                        | "based"
                        | "towards"
                        | "toward"
                        | "end"
                        | "real"
                        | "time"
                )
                && !token.chars().all(|character| character.is_ascii_digit())
        })
        .map(str::to_owned)
        .collect()
}

fn normalize_title_candidate(candidate: &Map<String, Value>) -> Option<Value> {
    let title = string(candidate, "title").to_owned();
    let normalized = if string(candidate, "normalizedTitle").is_empty() {
        normalize_title(&title)
    } else {
        string(candidate, "normalizedTitle").to_owned()
    };
    if title.is_empty() || normalized.is_empty() || content_tokens(&normalized).len() < 2 {
        return None;
    }
    let identifiers: Vec<_> = identifiers(candidate, false)
        .into_iter()
        .map(|(kind, value)| json!({"kind":kind,"value":value}))
        .collect();
    Some(json!({
        "title":title,
        "normalizedTitle":normalized,
        "year":string(candidate,"year"),
        "authors":sorted_strings(candidate.get("authors")),
        "identifiers":identifiers,
        "rawReferenceIds":sorted_strings(candidate.get("rawReferenceIds")),
        "source":string(candidate,"source"),
        "sourceCanonicalReferenceId":string(candidate,"sourceCanonicalReferenceId"),
        "frequency":candidate.get("frequency").and_then(Value::as_f64).unwrap_or(1.0).floor().max(1.0) as u64
    }))
}

fn title_candidate_quality(candidate: &Value) -> f64 {
    let candidate = candidate.as_object().expect("normalized title candidate");
    let normalized = string(candidate, "normalizedTitle");
    let tokens = content_tokens(normalized);
    let compact_length = strong_compact_title(normalized)
        .encode_utf16()
        .count()
        .min(90) as f64;
    let frequency = candidate
        .get("frequency")
        .and_then(Value::as_u64)
        .unwrap_or(1)
        .max(1) as f64;
    tokens.len().min(12) as f64 * 4.0
        + compact_length / 8.0
        + sorted_strings(candidate.get("authors")).len().min(6) as f64 * 1.5
        + if string(candidate, "year").is_empty() {
            0.0
        } else {
            2.0
        }
        + candidate
            .get("identifiers")
            .and_then(Value::as_array)
            .map_or(0, Vec::len)
            .min(2) as f64
            * 2.0
        + (frequency + 1.0).log2().min(4.0)
        - title_noise_penalty_value(normalized)
}

fn noise_profile(normalized: &str) -> Value {
    let tokens: Vec<_> = normalized.split_whitespace().collect();
    let core = [
        "arxiv",
        "doi",
        "preprint",
        "proceedings",
        "conference",
        "journal",
        "transactions",
        "pages",
        "page",
        "pp",
        "vol",
        "volume",
        "no",
        "number",
        "eds",
        "editor",
        "editors",
        "publisher",
    ];
    let weak = [
        "cvpr", "iccv", "eccv", "neurips", "nips", "iclr", "aaai", "ijcai", "wacv", "bmvc", "pami",
        "ieee", "acm", "springer", "sensors", "remote", "sensing",
    ];
    let core_count = tokens.iter().filter(|token| core.contains(token)).count();
    let weak_count = tokens.iter().filter(|token| weak.contains(token)).count();
    let has_doi = tokens
        .iter()
        .any(|token| matches!(*token, "arxiv" | "doi" | "preprint"))
        || normalized.contains("doi org")
        || normalized
            .split_whitespace()
            .any(|token| token.starts_with("10") && token.len() > 4);
    let has_proceedings = normalized.contains("proceedings");
    let has_page = tokens.windows(2).any(|pair| {
        matches!(pair[0], "pp" | "p" | "page" | "pages")
            && pair[1].chars().any(|c| c.is_ascii_digit())
    });
    let has_volume = tokens.iter().enumerate().any(|(index, token)| {
        matches!(*token, "vol" | "volume" | "no" | "number")
            && tokens
                .get(index + 1)
                .is_some_and(|next| next.chars().any(|c| c.is_ascii_digit()))
    }) || tokens.windows(4).any(|window| {
        window[0]
            .chars()
            .next()
            .is_some_and(|character| character.is_ascii_alphabetic())
            && window[1..]
                .iter()
                .all(|token| token.chars().all(|character| character.is_ascii_digit()))
            && (1..=4).contains(&window[1].len())
            && (1..=4).contains(&window[2].len())
            && (1..=6).contains(&window[3].len())
    });
    let has_year = tokens.last().is_some_and(|token| {
        token.len() == 4
            && token.chars().all(|character| character.is_ascii_digit())
            && matches!(&token[..2], "19" | "20")
    });
    let has_publisher = tokens.iter().any(|token| {
        matches!(
            *token,
            "ed" | "eds" | "editor" | "editors" | "publisher" | "springer" | "ieee" | "acm"
        )
    });
    let mut reasons = Vec::new();
    if has_doi {
        reasons.push("doi_or_arxiv_suffix");
    }
    if has_page {
        reasons.push("page_marker");
    }
    if has_proceedings {
        reasons.push("proceedings_phrase");
    }
    if has_publisher {
        reasons.push("publisher_or_editor_phrase");
    }
    if has_volume {
        reasons.push("volume_issue_page_pattern");
    }
    if has_year {
        reasons.push("year_suffix");
    }
    if core_count > 0 {
        reasons.push("core_bibliographic_marker");
    }
    if weak_count > 0 {
        reasons.push("weak_venue_marker");
    }
    reasons.sort_by(|left, right| utf16_cmp(left, right));
    let score = usize::from(has_doi) * 4
        + usize::from(has_proceedings) * 3
        + usize::from(has_page) * 3
        + usize::from(has_volume) * 3
        + usize::from(has_publisher) * 2
        + usize::from(has_year)
        + core_count.min(3) * 2
        + weak_count.min(2);
    json!({
        "coreMarkerCount":core_count,
        "weakVenueCount":weak_count,
        "hasDoiOrArxiv":has_doi,
        "hasProceedingsPhrase":has_proceedings,
        "hasPageMarker":has_page,
        "hasVolumeIssuePagePattern":has_volume,
        "hasYearSuffix":has_year,
        "hasPublisherOrEditorPhrase":has_publisher,
        "score":score,
        "reasons":reasons
    })
}

fn dedupe_record(row: &Map<String, Value>) -> Option<DedupeRecord> {
    let id = string(row, "canonicalReferenceId").to_owned();
    let raw_ids = sorted_strings(row.get("rawReferenceIds"));
    let explicit_identifiers = identifiers(row, false);
    let input_candidate = json!({
        "title":string(row,"title"),
        "normalizedTitle":string(row,"normalizedTitle"),
        "year":string(row,"year"),
        "authors":sorted_strings(row.get("authors")),
        "identifiers":explicit_identifiers.iter().map(|(kind,value)| json!({"kind":kind,"value":value})).collect::<Vec<_>>(),
        "rawReferenceIds":raw_ids,
        "source":"input",
        "frequency":raw_ids.len().max(1)
    });
    let mut source_candidates = vec![input_candidate];
    source_candidates.extend(
        row.get("titleCandidates")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .cloned(),
    );
    let mut normalized_candidates: Vec<Value> = source_candidates
        .iter()
        .filter_map(Value::as_object)
        .filter_map(normalize_title_candidate)
        .collect();
    normalized_candidates.sort_by(|left, right| {
        title_candidate_quality(right)
            .partial_cmp(&title_candidate_quality(left))
            .unwrap_or(Ordering::Equal)
            .then_with(|| {
                utf16_cmp(
                    left["title"].as_str().unwrap_or(""),
                    right["title"].as_str().unwrap_or(""),
                )
            })
    });
    let selected = normalized_candidates.first()?.clone();
    let title = selected["title"].as_str().unwrap_or("").to_owned();
    let normalized = selected["normalizedTitle"]
        .as_str()
        .unwrap_or("")
        .to_owned();
    let tokens = content_tokens(&normalized);
    if id.is_empty() || normalized.is_empty() || tokens.len() < 2 {
        return None;
    }
    let mut author_list = sorted_strings(row.get("authors"));
    let mut candidate_identifiers = Vec::new();
    for candidate in &normalized_candidates {
        if let Some(candidate) = candidate.as_object() {
            author_list.extend(sorted_strings(candidate.get("authors")));
            candidate_identifiers.extend(identifiers(candidate, false));
        }
    }
    author_list = unique_utf16(author_list);
    let mut identifiers = identifiers(row, true);
    identifiers.extend(candidate_identifiers);
    identifiers.sort_by(|left, right| {
        utf16_cmp(
            &format!("{}:{}", left.0, left.1),
            &format!("{}:{}", right.0, right.1),
        )
    });
    identifiers.dedup();
    let strong_identifiers: Vec<_> = identifiers
        .iter()
        .filter(|(kind, _)| kind == "doi" || kind == "arxiv")
        .map(|(kind, value)| format!("{kind}:{value}"))
        .collect();
    let noise = noise_profile(&normalized);
    let noise_score = noise["score"].as_u64().unwrap_or_default() as usize;
    let author_token_set: BTreeSet<_> = author_list
        .iter()
        .flat_map(|author| authors(json!({"authors":[author]}).as_object().unwrap()))
        .collect();
    let token_set: BTreeSet<_> = tokens.iter().cloned().collect();
    let author_overlap = token_set.intersection(&author_token_set).count();
    let author_dice = if token_set.is_empty() || author_token_set.is_empty() {
        0.0
    } else {
        2.0 * author_overlap as f64 / (token_set.len() + author_token_set.len()) as f64
    };
    let mut eligibility_reasons = Vec::new();
    if normalized.starts_with("doi ")
        || normalized.starts_with("10 ")
        || normalized.starts_with("http ")
        || normalized.starts_with("https ")
        || normalized.starts_with("www ")
    {
        eligibility_reasons.push("bare_doi_or_url_title".to_owned());
    }
    if tokens.len() < 3 {
        eligibility_reasons.push("too_few_content_tokens".to_owned());
    }
    if author_list.len() >= 2 && tokens.len() <= 8 && author_dice >= 0.65 {
        eligibility_reasons.push("mostly_author_tokens".to_owned());
    }
    if noise_score >= 8 && tokens.len() <= 6 {
        eligibility_reasons.push("mostly_bibliographic_metadata".to_owned());
    }
    eligibility_reasons.sort_by(|left, right| utf16_cmp(left, right));
    eligibility_reasons.dedup();
    let eligibility = if eligibility_reasons
        .iter()
        .any(|reason| reason.starts_with("bare_") || reason == "too_few_content_tokens")
    {
        "excluded"
    } else if !eligibility_reasons.is_empty() || noise_score >= 6 {
        if noise_score >= 6
            && !eligibility_reasons
                .iter()
                .any(|reason| reason == "bibliographic_noise_heavy")
        {
            eligibility_reasons.push("bibliographic_noise_heavy".to_owned());
            eligibility_reasons.sort_by(|left, right| utf16_cmp(left, right));
        }
        "weak"
    } else {
        "eligible"
    };
    let identifier_values: Vec<_> = explicit_identifiers
        .iter()
        .map(|(kind, value)| json!({"kind":kind,"value":value}))
        .collect();
    let base_candidate = normalize_title_candidate(
        json!({
            "title":title,
            "normalizedTitle":normalized,
            "year":string(row,"year"),
            "authors":author_list,
            "identifiers":identifier_values,
            "rawReferenceIds":raw_ids,
            "source":"input",
            "frequency":raw_ids.len().max(1)
        })
        .as_object()
        .expect("input title candidate"),
    )?;
    let mut title_candidates = vec![base_candidate];
    title_candidates.extend(
        row.get("titleCandidates")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_object)
            .filter_map(normalize_title_candidate),
    );
    Some(DedupeRecord {
        id,
        title,
        normalized: normalized.clone(),
        year: string(row, "year").to_owned(),
        authors: author_list,
        accepted: row
            .get("acceptedBinding")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        sticky: row
            .get("stickyRepresentative")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        eligibility,
        eligibility_reasons,
        identifiers,
        strong_identifiers,
        tokens,
        token_set,
        compact: compact_title(&normalized),
        strong: strong_compact_title(&normalized),
        raw_references: sorted_strings(row.get("rawReferences")),
        raw_count: raw_ids.len().max(1),
        selected_title_candidate: selected,
        title_candidates,
        noise_profile: noise,
    })
}

fn score_value(value: f64) -> f64 {
    (value * 10_000.0).round() / 10_000.0
}

fn token_dice(left: &BTreeSet<String>, right: &BTreeSet<String>) -> f64 {
    if left.is_empty() || right.is_empty() {
        0.0
    } else {
        2.0 * left.intersection(right).count() as f64 / (left.len() + right.len()) as f64
    }
}

fn compatible_dedupe_year(left: &DedupeRecord, right: &DedupeRecord) -> bool {
    left.year.is_empty()
        || right.year.is_empty()
        || year_delta(
            &json!({"year":left.year}).as_object().unwrap().clone(),
            &json!({"year":right.year}).as_object().unwrap().clone(),
        ) <= 1.0
}

fn stable_id(prefix: &str, ids: &[String]) -> Result<String, &'static str> {
    let mut ids = ids.to_vec();
    ids.sort_by(|left, right| utf16_cmp(left, right));
    ids.dedup();
    let hash = synthesis_protocol::canonical_sha256(&ids)?;
    Ok(format!("{prefix}:{}", &hash[..16]))
}

fn title_cleanliness_reasons(record: &DedupeRecord) -> Vec<String> {
    let mut reasons = Vec::new();
    if record.sticky {
        reasons.push("sticky_representative".into());
    }
    if record.accepted {
        reasons.push("accepted_binding".into());
    }
    if !record.strong_identifiers.is_empty() {
        reasons.push("strong_identifier".into());
    }
    if record.noise_profile["score"].as_u64().unwrap_or_default() < 3 {
        reasons.push("clean_title".into());
    }
    if record.eligibility != "eligible" {
        reasons.push(format!("eligibility_{}", record.eligibility));
    }
    if record.title_candidates.len() > 1 {
        reasons.push("selected_from_title_candidates".into());
    }
    if record.raw_count > 1 {
        reasons.push("raw_support_capped".into());
    }
    if !record.identifiers.is_empty() {
        reasons.push("has_identifier".into());
    }
    if !record.authors.is_empty() {
        reasons.push("has_authors".into());
    }
    if !record.year.is_empty() {
        reasons.push("has_year".into());
    }
    if reasons.is_empty() {
        reasons.push("stable_id_tiebreaker".into());
    }
    reasons
}

fn record_summary(record: &DedupeRecord) -> Value {
    json!({
        "canonicalReferenceId":record.id,
        "title":record.title,
        "normalizedTitle":record.normalized,
        "year":record.year,
        "rawCount":record.raw_count,
        "stickyRepresentative":record.sticky,
        "acceptedBinding":record.accepted,
        "eligibility":record.eligibility,
        "eligibilityReasons":record.eligibility_reasons,
        "noiseProfile":record.noise_profile,
        "titleCandidateCount":record.title_candidates.len(),
        "selectedTitleCandidate":record.selected_title_candidate,
        "titleCandidates":record.title_candidates,
        "representativeRationale":title_cleanliness_reasons(record)
    })
}

fn deterministic_edge(edge_type: &str) -> bool {
    matches!(
        edge_type,
        "identifier_exact" | "exact_normalized_title_year" | "exact_compact_title_year"
    )
}

fn adjusted_representative_quality(record: &DedupeRecord, edges: &[&Value]) -> f64 {
    let mut score = representative_quality(record);
    for edge in edges {
        if !matches!(
            edge["edgeType"].as_str(),
            Some("contained_bibliographic_noise" | "contained_author_noise")
        ) {
            continue;
        }
        if edge["evidence"]["shorter_canonical_reference_id"] == record.id {
            score += 18.0;
        }
        if edge["evidence"]["longer_canonical_reference_id"] == record.id {
            score -= 20.0;
        }
    }
    score
}

fn ranked_cluster_candidate<'a>(
    records: &[&'a DedupeRecord],
    edges: &[&Value],
) -> &'a DedupeRecord {
    records
        .iter()
        .copied()
        .min_by(|left, right| {
            right
                .accepted
                .cmp(&left.accepted)
                .then_with(|| {
                    adjusted_representative_quality(right, edges)
                        .partial_cmp(&adjusted_representative_quality(left, edges))
                        .unwrap_or(Ordering::Equal)
                })
                .then_with(|| {
                    right
                        .strong_identifiers
                        .len()
                        .cmp(&left.strong_identifiers.len())
                })
                .then_with(|| right.authors.len().cmp(&left.authors.len()))
                .then_with(|| utf16_cmp(&left.id, &right.id))
        })
        .expect("non-empty cluster")
}

fn strong_retarget_allowed(
    sticky: &DedupeRecord,
    candidate: &DedupeRecord,
    edges: &[&Value],
) -> bool {
    edges.iter().any(|edge| {
        let connects = (edge["sourceCanonicalReferenceId"] == sticky.id
            && edge["targetCanonicalReferenceId"] == candidate.id)
            || (edge["sourceCanonicalReferenceId"] == candidate.id
                && edge["targetCanonicalReferenceId"] == sticky.id);
        connects
            && (edge["edgeType"] == "identifier_exact"
                || (sticky.strong_identifiers.is_empty()
                    && !candidate.strong_identifiers.is_empty()
                    && matches!(
                        edge["edgeType"].as_str(),
                        Some("exact_normalized_title_year" | "exact_compact_title_year")
                    )))
    })
}

fn cluster_representative<'a>(records: &[&'a DedupeRecord], edges: &[&Value]) -> &'a DedupeRecord {
    let candidate = ranked_cluster_candidate(records, edges);
    let sticky = records
        .iter()
        .copied()
        .filter(|record| record.sticky)
        .min_by(|left, right| {
            right
                .accepted
                .cmp(&left.accepted)
                .then_with(|| {
                    right
                        .strong_identifiers
                        .len()
                        .cmp(&left.strong_identifiers.len())
                })
                .then_with(|| {
                    representative_quality(right)
                        .partial_cmp(&representative_quality(left))
                        .unwrap_or(Ordering::Equal)
                })
                .then_with(|| utf16_cmp(&left.id, &right.id))
        });
    let strong_retarget =
        sticky.is_some_and(|sticky| strong_retarget_allowed(sticky, candidate, edges));
    if let Some(sticky) = sticky
        && sticky.id != candidate.id
        && !strong_retarget
    {
        return sticky;
    }
    candidate
}

fn deterministic_subcomponents(component: &[String], edges: &[&Value]) -> Vec<Vec<String>> {
    let mut adjacency: HashMap<String, BTreeSet<String>> = component
        .iter()
        .cloned()
        .map(|id| (id, BTreeSet::new()))
        .collect();
    for edge in edges
        .iter()
        .filter(|edge| deterministic_edge(edge["edgeType"].as_str().unwrap_or("")))
    {
        let source = edge["sourceCanonicalReferenceId"].as_str().unwrap_or("");
        let target = edge["targetCanonicalReferenceId"].as_str().unwrap_or("");
        adjacency.get_mut(source).unwrap().insert(target.into());
        adjacency.get_mut(target).unwrap().insert(source.into());
    }
    let mut seen = BTreeSet::new();
    let mut output = Vec::new();
    for id in component {
        if !seen.insert(id.clone()) {
            continue;
        }
        let mut stack = vec![id.clone()];
        let mut subcomponent = Vec::new();
        while let Some(next) = stack.pop() {
            subcomponent.push(next.clone());
            for neighbor in &adjacency[&next] {
                if seen.insert(neighbor.clone()) {
                    stack.push(neighbor.clone());
                }
            }
        }
        subcomponent.sort_by(|left, right| utf16_cmp(left, right));
        output.push(subcomponent);
    }
    output
}

fn title_noise_penalty(record: &DedupeRecord) -> f64 {
    title_noise_penalty_value(&record.normalized)
}

fn title_noise_penalty_value(normalized: &str) -> f64 {
    let words = normalized.split_whitespace().count();
    let strong = strong_compact_title(normalized);
    let length = strong.encode_utf16().count();
    let fused =
        usize::from(normalized.contains("offreebies") || normalized.contains("bagoffreebies")) * 18;
    let tokens: Vec<_> = normalized.split_whitespace().collect();
    let author_prefix = usize::from((3..=9).any(|count| {
        tokens.len() > count
            && tokens[..count]
                .iter()
                .all(|token| token.chars().all(char::is_alphabetic))
    })) * 12;
    let noise = noise_profile(normalized);
    fused as f64
        + noise["score"].as_f64().unwrap_or_default() * 8.0
        + author_prefix as f64
        + words.saturating_sub(12) as f64 * 3.0
        + length.saturating_sub(110) as f64 / 5.0
}

fn representative_quality(record: &DedupeRecord) -> f64 {
    let words = record.normalized.split_whitespace().count().min(12) as f64;
    let length = record.strong.encode_utf16().count().min(90) as f64;
    let raw_support = (record.raw_count as f64 + 1.0).log2().min(3.0);
    words * 4.0
        + length / 8.0
        + record.authors.len().min(8) as f64 * 1.5
        + record.identifiers.len() as f64 * 2.0
        + if record.year.is_empty() { 0.0 } else { 3.0 }
        + raw_support
        - title_noise_penalty(record) * 3.0
}

fn unique_utf16(mut values: Vec<String>) -> Vec<String> {
    values.retain(|value| !value.is_empty());
    values.sort_by(|left, right| utf16_cmp(left, right));
    values.dedup();
    values
}

fn sequence_index(haystack: &[String], needle: &[String]) -> Option<usize> {
    if needle.is_empty() || needle.len() > haystack.len() {
        return None;
    }
    (0..=haystack.len() - needle.len()).find(|start| {
        needle
            .iter()
            .enumerate()
            .all(|(offset, token)| haystack[*start + offset] == *token)
    })
}

fn author_tokens_for_record(record: &DedupeRecord) -> BTreeSet<String> {
    record
        .authors
        .iter()
        .filter_map(|author| {
            let first = author.split(',').next().unwrap_or(author);
            normalize_title(first)
                .split_whitespace()
                .next_back()
                .map(str::to_owned)
        })
        .filter(|token| token != "et" && token != "al")
        .collect()
}

fn numeric_bibliographic_suffix(normalized: &str) -> bool {
    let tokens: Vec<_> = normalized.split_whitespace().collect();
    let numeric_suffix = tokens
        .iter()
        .rev()
        .take_while(|token| {
            (1..=5).contains(&token.len())
                && token.chars().all(|character| character.is_ascii_digit())
        })
        .count();
    (2..=4).contains(&numeric_suffix)
}

struct ContainedDetails<'a> {
    shorter: &'a DedupeRecord,
    longer: &'a DedupeRecord,
    extra_tokens: Vec<String>,
    extra_prefix_tokens: Vec<String>,
    extra_suffix_tokens: Vec<String>,
    edge_type: &'static str,
    risk_signals: Vec<String>,
    bibliographic_reasons: Vec<String>,
}

fn contained_title_details<'a>(
    left: &'a DedupeRecord,
    right: &'a DedupeRecord,
) -> Option<ContainedDetails<'a>> {
    let (shorter, longer) =
        if left.strong.encode_utf16().count() <= right.strong.encode_utf16().count() {
            (left, right)
        } else {
            (right, left)
        };
    let short_length = shorter.strong.encode_utf16().count();
    let long_length = longer.strong.encode_utf16().count().max(1);
    if shorter.tokens.len() < 4
        || short_length < 18
        || short_length as f64 / (long_length as f64) < 0.25
        || !longer.strong.contains(&shorter.strong)
    {
        return None;
    }
    let start = sequence_index(&longer.tokens, &shorter.tokens);
    let extra_prefix_tokens = start
        .map(|index| longer.tokens[..index].to_vec())
        .unwrap_or_default();
    let extra_suffix_tokens = start
        .map(|index| longer.tokens[index + shorter.tokens.len()..].to_vec())
        .unwrap_or_default();
    let extra_tokens: Vec<String> = start.map_or_else(
        || {
            longer
                .tokens
                .iter()
                .filter(|token| !shorter.token_set.contains(*token))
                .cloned()
                .collect()
        },
        |_| {
            extra_prefix_tokens
                .iter()
                .chain(&extra_suffix_tokens)
                .cloned()
                .collect()
        },
    );
    let extra_text = extra_tokens.join(" ");
    let suffix_text = extra_suffix_tokens.join(" ");
    let extra_profile = noise_profile(&extra_text);
    let suffix_profile = noise_profile(&suffix_text);
    let numeric_suffix =
        !extra_suffix_tokens.is_empty() && numeric_bibliographic_suffix(&longer.normalized);
    let structural = [
        "hasDoiOrArxiv",
        "hasProceedingsPhrase",
        "hasPageMarker",
        "hasVolumeIssuePagePattern",
    ]
    .iter()
    .any(|key| {
        extra_profile[*key].as_bool() == Some(true) || suffix_profile[*key].as_bool() == Some(true)
    }) || numeric_suffix;
    let weak_with_structure = (extra_profile["weakVenueCount"].as_u64().unwrap_or_default() > 0
        || suffix_profile["weakVenueCount"]
            .as_u64()
            .unwrap_or_default()
            > 0)
        && (numeric_suffix
            || extra_profile["hasProceedingsPhrase"].as_bool() == Some(true)
            || suffix_profile["hasProceedingsPhrase"].as_bool() == Some(true)
            || extra_profile["hasPageMarker"].as_bool() == Some(true)
            || suffix_profile["hasPageMarker"].as_bool() == Some(true));
    let bibliographic = structural
        || weak_with_structure
        || extra_profile["coreMarkerCount"]
            .as_u64()
            .unwrap_or_default() as usize
            >= extra_tokens.len().max(1).div_ceil(2);
    let semantic_tokens = [
        "with",
        "using",
        "via",
        "under",
        "based",
        "supervision",
        "supervised",
        "weakly",
        "semi",
        "prompt",
        "point",
        "points",
        "open",
        "vocabulary",
        "multi",
        "modal",
        "domain",
        "adaptation",
    ];
    let semantic = extra_tokens
        .iter()
        .any(|token| semantic_tokens.contains(&token.as_str()));
    let author_tokens: BTreeSet<_> = author_tokens_for_record(shorter)
        .into_iter()
        .chain(author_tokens_for_record(longer))
        .collect();
    let author_noise = extra_tokens
        .iter()
        .any(|token| author_tokens.contains(token));
    let author_prefix_like =
        (2..=8).contains(&extra_prefix_tokens.len()) && !bibliographic && !semantic;
    let (edge_type, risk_signals) = if bibliographic {
        ("contained_bibliographic_noise", vec![])
    } else if author_noise || author_prefix_like {
        ("contained_author_noise", vec![])
    } else if semantic {
        (
            "contained_extension_risk",
            vec!["semantic_title_extension".into()],
        )
    } else if !extra_tokens.is_empty() {
        (
            "contained_extension_risk",
            vec!["unclassified_extra_title_tokens".into()],
        )
    } else {
        ("contained_bibliographic_noise", vec![])
    };
    let mut reasons: Vec<String> = extra_profile["reasons"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_owned)
        .chain(
            suffix_profile["reasons"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(|reason| format!("suffix_{reason}")),
        )
        .collect();
    if numeric_suffix {
        reasons.push("numeric_bibliographic_suffix".into());
    }
    Some(ContainedDetails {
        shorter,
        longer,
        extra_tokens: unique_utf16(extra_tokens),
        extra_prefix_tokens: unique_utf16(extra_prefix_tokens),
        extra_suffix_tokens: unique_utf16(extra_suffix_tokens),
        edge_type,
        risk_signals,
        bibliographic_reasons: unique_utf16(reasons),
    })
}

fn dedupe(request: Value, canceled_flag: &AtomicBool) -> Result<Value, &'static str> {
    canceled(canceled_flag)?;
    let request = request.as_object().ok_or("invalid_request")?;
    if string(request, "contractVersion") != CONTRACT_VERSION
        || string(request, "algorithmVersion") != DEDUPE_ALGORITHM_VERSION
    {
        return Err("invalid_request");
    }
    let canonicals = request
        .get("canonicals")
        .and_then(Value::as_array)
        .ok_or("invalid_request")?;
    let mut records: Vec<_> = canonicals
        .iter()
        .map(|row| row.as_object().ok_or("invalid_request"))
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .filter_map(dedupe_record)
        .collect();
    records.sort_by(|left, right| utf16_cmp(&left.id, &right.id));
    let excluded = records
        .iter()
        .filter(|record| record.eligibility == "excluded")
        .count();
    let weak = records
        .iter()
        .filter(|record| record.eligibility == "weak")
        .count();
    let diagnostics: Vec<_> = records
        .iter()
        .filter(|record| record.eligibility == "excluded")
        .map(|record| {
            json!({
                "code":"cluster_dedupe_record_excluded",
                "canonical_reference_id":record.id,
                "title":record.title,
                "eligibility":record.eligibility,
                "reasons":record.eligibility_reasons
            })
        })
        .collect();
    let match_records: Vec<_> = records
        .iter()
        .filter(|record| record.eligibility != "excluded")
        .collect();
    let record_by_id: HashMap<_, _> = match_records
        .iter()
        .map(|record| (record.id.clone(), *record))
        .collect();
    let mut blocks = BTreeMap::<String, BTreeSet<String>>::new();
    for record in &match_records {
        canceled(canceled_flag)?;
        for key in &record.strong_identifiers {
            blocks
                .entry(format!("identifier:{key}"))
                .or_default()
                .insert(record.id.clone());
        }
        for key in [
            (!record.year.is_empty())
                .then(|| format!("normalized:{}:{}", record.year, record.normalized)),
            (!record.year.is_empty())
                .then(|| format!("compact:{}:{}", record.year, record.compact)),
            (!record.year.is_empty()).then(|| format!("strong:{}:{}", record.year, record.strong)),
            Some(format!("compact-any-year:{}", record.compact)),
            Some(format!("strong-any-year:{}", record.strong)),
            (!record.year.is_empty() && record.tokens.len() >= 3).then(|| {
                format!(
                    "first-last:{}:{}:{}",
                    record.year,
                    record.tokens[..2].join(" "),
                    record.tokens.last().unwrap()
                )
            }),
            (!record.year.is_empty() && record.tokens.len() >= 3)
                .then(|| format!("first:{}:{}", record.year, record.tokens[..3].join(" "))),
            (!record.year.is_empty() && record.tokens.len() >= 3).then(|| {
                format!(
                    "last:{}:{}",
                    record.year,
                    record.tokens[record.tokens.len().saturating_sub(3)..].join(" ")
                )
            }),
        ]
        .into_iter()
        .flatten()
        {
            blocks.entry(key).or_default().insert(record.id.clone());
        }
    }
    let block_count = blocks.len();
    let mut candidate_pair_count = 0usize;
    let mut edges_by_pair = BTreeMap::<String, Value>::new();
    for ids in blocks
        .values()
        .filter(|ids| ids.len() >= 2 && ids.len() <= 30)
    {
        let ids: Vec<_> = ids.iter().collect();
        for i in 0..ids.len() {
            for j in i + 1..ids.len() {
                if candidate_pair_count >= 3_000 {
                    break;
                }
                let left = record_by_id[ids[i]];
                let right = record_by_id[ids[j]];
                let conflict = ["doi", "arxiv"].iter().any(|kind| {
                    left.identifiers
                        .iter()
                        .chain(right.identifiers.iter())
                        .filter(|(entry_kind, _)| entry_kind == kind)
                        .map(|(_, value)| value)
                        .collect::<BTreeSet<_>>()
                        .len()
                        > 1
                });
                if conflict {
                    continue;
                }
                candidate_pair_count += 1;
                let matching_identifiers: Vec<_> = left
                    .strong_identifiers
                    .iter()
                    .filter(|key| right.strong_identifiers.contains(key))
                    .cloned()
                    .collect();
                let same_normalized =
                    compatible_dedupe_year(left, right) && left.normalized == right.normalized;
                let same_compact =
                    compatible_dedupe_year(left, right) && left.compact == right.compact;
                let same_strong = left.strong == right.strong;
                let similarity = title_similarity(&left.normalized, &right.normalized);
                let dice = token_dice(&left.token_set, &right.token_set);
                let contained = contained_title_details(left, right);
                let (edge_type, score, reason, extra, confidence, risk_signals) =
                    if !matching_identifiers.is_empty() {
                        (
                            "identifier_exact",
                            1.0,
                            "cluster_identifier_exact".to_owned(),
                            json!({"matching_identifiers":matching_identifiers}),
                            "deterministic",
                            vec![],
                        )
                    } else if same_normalized {
                        (
                            "exact_normalized_title_year",
                            0.999,
                            "cluster_exact_normalized_title_year".to_owned(),
                            json!({}),
                            "deterministic",
                            vec![],
                        )
                    } else if same_compact || same_strong {
                        (
                            "exact_compact_title_year",
                            if same_strong { 0.998 } else { 0.995 },
                            if same_strong {
                                "cluster_exact_strong_compact_title".to_owned()
                            } else {
                                "cluster_exact_compact_title_year".to_owned()
                            },
                            json!({}),
                            "deterministic",
                            vec![],
                        )
                    } else if let Some(contained) =
                        contained.filter(|_| compatible_dedupe_year(left, right) && dice >= 0.45)
                    {
                        (
                            contained.edge_type,
                            similarity,
                            format!("cluster_{}", contained.edge_type),
                            json!({
                                "shorter_canonical_reference_id":contained.shorter.id,
                                "longer_canonical_reference_id":contained.longer.id,
                                "extra_tokens":contained.extra_tokens,
                                "extra_prefix_tokens":contained.extra_prefix_tokens,
                                "extra_suffix_tokens":contained.extra_suffix_tokens,
                                "containment_classification":contained.edge_type,
                                "bibliographic_reasons":contained.bibliographic_reasons,
                            }),
                            "review",
                            contained.risk_signals,
                        )
                    } else if compatible_dedupe_year(left, right)
                        && similarity >= 0.97
                        && dice >= 0.72
                    {
                        (
                            "typo_equivalent_title",
                            similarity,
                            "cluster_typo_equivalent_title".to_owned(),
                            json!({}),
                            "review",
                            vec![],
                        )
                    } else if compatible_dedupe_year(left, right)
                        && similarity >= 0.9
                        && dice >= 0.72
                    {
                        (
                            "weak_fuzzy_title",
                            similarity,
                            "cluster_weak_fuzzy_title".to_owned(),
                            json!({}),
                            "review",
                            vec![],
                        )
                    } else {
                        continue;
                    };
                let (source, target) = if utf16_cmp(&left.id, &right.id).is_le() {
                    (left, right)
                } else {
                    (right, left)
                };
                let source_year = json!({"year":source.year});
                let target_year = json!({"year":target.year});
                let mut evidence = json!({
                    "source":{"canonical_reference_id":source.id,"title":source.title,"selected_title_candidate":source.selected_title_candidate,"normalized_title":source.normalized,"year":source.year,"raw_count":source.raw_count,"raw_sample":source.raw_references.first().cloned().unwrap_or_default()},
                    "target":{"canonical_reference_id":target.id,"title":target.title,"selected_title_candidate":target.selected_title_candidate,"normalized_title":target.normalized,"year":target.year,"raw_count":target.raw_count,"raw_sample":target.raw_references.first().cloned().unwrap_or_default()},
                    "token_dice":javascript_number(score_value(token_dice(&source.token_set,&target.token_set))),
                    "year_delta":javascript_number(year_delta(source_year.as_object().unwrap(),target_year.as_object().unwrap()))
                });
                evidence
                    .as_object_mut()
                    .unwrap()
                    .extend(extra.as_object().unwrap().clone());
                let reasons = vec![reason];
                let hash = synthesis_protocol::canonical_sha256(
                    &json!({"source":source.id,"target":target.id,"edgeType":edge_type,"reasons":reasons,"riskSignals":risk_signals,"evidence":evidence}),
                )?;
                let edge = json!({"edgeId":format!("edge:{}",&hash[..24]),"sourceCanonicalReferenceId":source.id,"targetCanonicalReferenceId":target.id,"edgeType":edge_type,"confidence":confidence,"score":javascript_number(score_value(score)),"reasons":reasons,"riskSignals":risk_signals,"evidence":evidence});
                let key = format!("{}::{}", source.id, target.id);
                if edges_by_pair.get(&key).is_none_or(|current| {
                    edge["score"].as_f64().unwrap() > current["score"].as_f64().unwrap()
                        || (edge["score"] == current["score"]
                            && utf16_cmp(
                                edge["edgeType"].as_str().unwrap(),
                                current["edgeType"].as_str().unwrap(),
                            )
                            .is_lt())
                }) {
                    edges_by_pair.insert(key, edge);
                }
            }
        }
    }
    let mut edges: Vec<_> = edges_by_pair.into_values().collect();
    edges.sort_by(|left, right| {
        utf16_cmp(
            left["sourceCanonicalReferenceId"].as_str().unwrap(),
            right["sourceCanonicalReferenceId"].as_str().unwrap(),
        )
        .then_with(|| {
            utf16_cmp(
                left["targetCanonicalReferenceId"].as_str().unwrap(),
                right["targetCanonicalReferenceId"].as_str().unwrap(),
            )
        })
        .then_with(|| {
            utf16_cmp(
                left["edgeType"].as_str().unwrap(),
                right["edgeType"].as_str().unwrap(),
            )
        })
    });
    let mut adjacency: HashMap<String, BTreeSet<String>> = match_records
        .iter()
        .map(|record| (record.id.clone(), BTreeSet::new()))
        .collect();
    for edge in &edges {
        let source = edge["sourceCanonicalReferenceId"].as_str().unwrap();
        let target = edge["targetCanonicalReferenceId"].as_str().unwrap();
        adjacency.get_mut(source).unwrap().insert(target.into());
        adjacency.get_mut(target).unwrap().insert(source.into());
    }
    let mut seen = BTreeSet::new();
    let mut components = Vec::new();
    for record in &match_records {
        if seen.contains(&record.id) || adjacency[&record.id].is_empty() {
            continue;
        }
        let mut stack = vec![record.id.clone()];
        let mut component = Vec::new();
        seen.insert(record.id.clone());
        while let Some(id) = stack.pop() {
            component.push(id.clone());
            for neighbor in &adjacency[&id] {
                if seen.insert(neighbor.clone()) {
                    stack.push(neighbor.clone());
                }
            }
        }
        component.sort_by(|left, right| utf16_cmp(left, right));
        components.push(component);
    }
    let mut clusters = Vec::new();
    let mut actions = Vec::new();
    for component in components {
        let component_records: Vec<_> = component.iter().map(|id| record_by_id[id]).collect();
        let cluster_id = stable_id("cluster", &component)?;
        let component_edges: Vec<_> = edges
            .iter()
            .filter(|edge| {
                component
                    .iter()
                    .any(|id| id == edge["sourceCanonicalReferenceId"].as_str().unwrap())
                    && component
                        .iter()
                        .any(|id| id == edge["targetCanonicalReferenceId"].as_str().unwrap())
            })
            .collect();
        let representative = cluster_representative(&component_records, &component_edges);
        let mut subclusters = Vec::new();
        for subcomponent in deterministic_subcomponents(&component, &component_edges) {
            let subcluster_id = stable_id("subcluster", &subcomponent)?;
            let subcluster_records: Vec<_> =
                subcomponent.iter().map(|id| record_by_id[id]).collect();
            let subcluster_edges: Vec<_> = component_edges
                .iter()
                .copied()
                .filter(|edge| {
                    subcomponent
                        .iter()
                        .any(|id| id == edge["sourceCanonicalReferenceId"].as_str().unwrap_or(""))
                        && subcomponent.iter().any(|id| {
                            id == edge["targetCanonicalReferenceId"].as_str().unwrap_or("")
                        })
                })
                .collect();
            let subcluster_representative =
                cluster_representative(&subcluster_records, &subcluster_edges);
            let edge_types: Vec<_> = subcluster_edges
                .iter()
                .filter_map(|edge| edge["edgeType"].as_str())
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect();
            for record in &subcluster_records {
                if record.id == representative.id {
                    continue;
                }
                let best_edge = subcluster_edges
                    .iter()
                    .copied()
                    .filter(|edge| {
                        edge["sourceCanonicalReferenceId"] == record.id
                            || edge["targetCanonicalReferenceId"] == record.id
                    })
                    .max_by(|left, right| {
                        left["score"]
                            .as_f64()
                            .unwrap_or_default()
                            .partial_cmp(&right["score"].as_f64().unwrap_or_default())
                            .unwrap_or(Ordering::Equal)
                            .then_with(|| {
                                utf16_cmp(
                                    right["edgeType"].as_str().unwrap_or(""),
                                    left["edgeType"].as_str().unwrap_or(""),
                                )
                            })
                    });
                let Some(edge) = best_edge else { continue };
                let redirect = record.eligibility == "eligible"
                    && representative.eligibility == "eligible"
                    && deterministic_edge(edge["edgeType"].as_str().unwrap_or(""))
                    && subcomponent.iter().any(|id| id == &representative.id);
                let action_name = if redirect { "redirect" } else { "review" };
                let action_hash = synthesis_protocol::canonical_sha256(
                    &json!({"action":action_name,"source":record.id,"target":representative.id,"clusterId":cluster_id,"subclusterId":subcluster_id,"edge":edge["edgeId"]}),
                )?;
                let mut action_evidence = edge["evidence"].as_object().unwrap().clone();
                action_evidence.insert(
                    "representative_canonical_reference_id".into(),
                    json!(representative.id),
                );
                action_evidence.insert("representative".into(), record_summary(representative));
                action_evidence.insert("source_record".into(), record_summary(record));
                action_evidence.insert(
                    "subcluster_representative_canonical_reference_id".into(),
                    json!(subcluster_representative.id),
                );
                action_evidence.insert(
                    "representative_rationale".into(),
                    json!(title_cleanliness_reasons(representative)),
                );
                action_evidence.insert(
                    "supporting_edge_target_canonical_reference_id".into(),
                    if edge["sourceCanonicalReferenceId"] == record.id {
                        edge["targetCanonicalReferenceId"].clone()
                    } else {
                        edge["sourceCanonicalReferenceId"].clone()
                    },
                );
                actions.push(json!({"actionId":format!("action:{}",&action_hash[..24]),"action":action_name,"sourceCanonicalReferenceId":record.id,"targetCanonicalReferenceId":representative.id,"clusterId":cluster_id,"subclusterId":subcluster_id,"edgeType":edge["edgeType"],"confidence":if redirect {edge["confidence"].clone()} else {json!("review")},"score":edge["score"],"reasons":edge["reasons"],"riskSignals":edge["riskSignals"],"evidence":action_evidence}));
            }
            subclusters.push(json!({
                "subclusterId":subcluster_id,
                "canonicalReferenceIds":subcomponent,
                "representativeCanonicalReferenceId":subcluster_representative.id,
                "edgeTypes":edge_types,
                "deterministic":!subcluster_edges.is_empty() && subcluster_edges.iter().all(|edge| deterministic_edge(edge["edgeType"].as_str().unwrap_or(""))),
                "representativeRationale":title_cleanliness_reasons(subcluster_representative)
            }));
        }
        clusters.push(json!({"clusterId":cluster_id,"canonicalReferenceIds":component,"representativeCanonicalReferenceId":representative.id,"representativeRationale":title_cleanliness_reasons(representative),"members":component_records.iter().map(|record|record_summary(record)).collect::<Vec<_>>(),"subclusters":subclusters}));
        if representative.sticky {
            let retarget_candidate = ranked_cluster_candidate(&component_records, &component_edges);
            let materially_stronger = (retarget_candidate.accepted && !representative.accepted)
                || retarget_candidate.strong_identifiers.len()
                    > representative.strong_identifiers.len();
            if retarget_candidate.id != representative.id
                && materially_stronger
                && !strong_retarget_allowed(representative, retarget_candidate, &component_edges)
            {
                let retarget_edge = component_edges
                    .iter()
                    .copied()
                    .filter(|edge| {
                        (edge["sourceCanonicalReferenceId"] == representative.id
                            && edge["targetCanonicalReferenceId"] == retarget_candidate.id)
                            || (edge["sourceCanonicalReferenceId"] == retarget_candidate.id
                                && edge["targetCanonicalReferenceId"] == representative.id)
                    })
                    .max_by(|left, right| {
                        left["score"]
                            .as_f64()
                            .unwrap_or_default()
                            .partial_cmp(&right["score"].as_f64().unwrap_or_default())
                            .unwrap_or(Ordering::Equal)
                            .then_with(|| {
                                utf16_cmp(
                                    right["edgeType"].as_str().unwrap_or(""),
                                    left["edgeType"].as_str().unwrap_or(""),
                                )
                            })
                    })
                    .or_else(|| component_edges.first().copied());
                if let Some(edge) = retarget_edge {
                    let subcluster_id = stable_id(
                        "subcluster",
                        &[representative.id.clone(), retarget_candidate.id.clone()],
                    )?;
                    let action_hash = synthesis_protocol::canonical_sha256(&json!({
                        "action":"review",
                        "source":representative.id,
                        "target":retarget_candidate.id,
                        "clusterId":cluster_id,
                        "edge":edge["edgeId"],
                        "reason":"representative_retarget_review"
                    }))?;
                    let mut reasons: Vec<String> = edge["reasons"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect();
                    reasons.push("representative_retarget_review".into());
                    let mut risk_signals: Vec<String> = edge["riskSignals"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect();
                    risk_signals.push("retarget_requires_review".into());
                    let mut evidence = edge["evidence"].as_object().unwrap().clone();
                    evidence.insert(
                        "representative_canonical_reference_id".into(),
                        json!(representative.id),
                    );
                    evidence.insert(
                        "retarget_candidate_canonical_reference_id".into(),
                        json!(retarget_candidate.id),
                    );
                    evidence.insert("representative".into(), record_summary(representative));
                    evidence.insert(
                        "retarget_candidate".into(),
                        record_summary(retarget_candidate),
                    );
                    evidence.insert(
                        "representative_rationale".into(),
                        json!(title_cleanliness_reasons(representative)),
                    );
                    evidence.insert(
                        "retarget_rationale".into(),
                        json!(title_cleanliness_reasons(retarget_candidate)),
                    );
                    actions.push(json!({
                        "actionId":format!("action:{}",&action_hash[..24]),
                        "action":"review",
                        "sourceCanonicalReferenceId":representative.id,
                        "targetCanonicalReferenceId":retarget_candidate.id,
                        "clusterId":cluster_id,
                        "subclusterId":subcluster_id,
                        "edgeType":edge["edgeType"],
                        "confidence":"review",
                        "score":edge["score"],
                        "reasons":unique_utf16(reasons),
                        "riskSignals":unique_utf16(risk_signals),
                        "evidence":evidence
                    }));
                }
            }
        }
        for edge in component_edges
            .iter()
            .copied()
            .filter(|edge| !deterministic_edge(edge["edgeType"].as_str().unwrap_or("")))
        {
            let source = record_by_id[edge["sourceCanonicalReferenceId"].as_str().unwrap()];
            let target = record_by_id[edge["targetCanonicalReferenceId"].as_str().unwrap()];
            let pair_records = vec![source, target];
            let pair_representative = cluster_representative(&pair_records, &[edge]);
            let longer = edge["evidence"]["longer_canonical_reference_id"]
                .as_str()
                .unwrap_or("");
            let other = if longer == source.id {
                if source.id == representative.id {
                    target
                } else {
                    source
                }
            } else if longer == target.id {
                if target.id == representative.id {
                    source
                } else {
                    target
                }
            } else if representative.id == source.id {
                target
            } else {
                source
            };
            if other.id == representative.id {
                continue;
            }
            let pair_ids = vec![source.id.clone(), target.id.clone()];
            let subcluster_id = stable_id("subcluster", &pair_ids)?;
            let action_hash = synthesis_protocol::canonical_sha256(
                &json!({"action":"review","source":other.id,"target":representative.id,"clusterId":cluster_id,"edge":edge["edgeId"]}),
            )?;
            let mut action_evidence = edge["evidence"].as_object().unwrap().clone();
            action_evidence.insert(
                "representative_canonical_reference_id".into(),
                json!(representative.id),
            );
            action_evidence.insert("representative".into(), record_summary(representative));
            action_evidence.insert("source_record".into(), record_summary(other));
            action_evidence.insert(
                "pair_representative_canonical_reference_id".into(),
                json!(pair_representative.id),
            );
            action_evidence.insert(
                "representative_rationale".into(),
                json!(title_cleanliness_reasons(representative)),
            );
            actions.push(json!({"actionId":format!("action:{}",&action_hash[..24]),"action":"review","sourceCanonicalReferenceId":other.id,"targetCanonicalReferenceId":representative.id,"clusterId":cluster_id,"subclusterId":subcluster_id,"edgeType":edge["edgeType"],"confidence":"review","score":edge["score"],"reasons":edge["reasons"],"riskSignals":edge["riskSignals"],"evidence":action_evidence}));
        }
    }
    clusters.sort_by(|left, right| {
        utf16_cmp(
            left["clusterId"].as_str().unwrap_or(""),
            right["clusterId"].as_str().unwrap_or(""),
        )
    });
    actions.sort_by(|left, right| {
        utf16_cmp(
            left["clusterId"].as_str().unwrap_or(""),
            right["clusterId"].as_str().unwrap_or(""),
        )
        .then_with(|| {
            utf16_cmp(
                left["sourceCanonicalReferenceId"].as_str().unwrap_or(""),
                right["sourceCanonicalReferenceId"].as_str().unwrap_or(""),
            )
        })
        .then_with(|| {
            utf16_cmp(
                left["targetCanonicalReferenceId"].as_str().unwrap_or(""),
                right["targetCanonicalReferenceId"].as_str().unwrap_or(""),
            )
        })
    });
    let redirect_count = actions
        .iter()
        .filter(|action| action["action"] == "redirect")
        .count();
    let review_count = actions.len() - redirect_count;
    let extension_risk_count = edges
        .iter()
        .filter(|edge| edge["edgeType"] == "contained_extension_risk")
        .count();
    let subcluster_count = clusters
        .iter()
        .map(|cluster| cluster["subclusters"].as_array().map_or(0, Vec::len))
        .sum::<usize>();
    Ok(json!({
        "contractVersion":CONTRACT_VERSION,
        "algorithmVersion":DEDUPE_ALGORITHM_VERSION,
        "clusters":clusters, "edges":edges, "actions":actions, "diagnostics":diagnostics,
        "counters":{
            "canonical_count":records.len(), "block_count":block_count,
            "block_skipped_count":0, "candidate_pair_count":candidate_pair_count,
            "candidate_pair_budget":3000, "edge_count":edges.len(), "cluster_count":clusters.len(),
            "subcluster_count":subcluster_count, "redirect_action_count":redirect_count, "review_action_count":review_count,
            "extension_risk_edge_count":extension_risk_count, "weak_record_count":weak,
            "excluded_record_count":excluded
        }
    }))
}

pub fn compute(
    operation: &str,
    request: Value,
    canceled_flag: &AtomicBool,
) -> Result<Value, &'static str> {
    match operation {
        "reference_binding.v1" => binding(request, canceled_flag),
        "reference_canonical_dedupe.v1" => dedupe(request, canceled_flag),
        _ => Err("invalid_request"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binding_preserves_identifier_and_title_semantics() {
        let request = json!({
            "contractVersion":CONTRACT_VERSION,"algorithmVersion":BINDING_ALGORITHM_VERSION,"policyId":"production",
            "papers":[{"paperRef":"1:A","itemKey":"A","title":"Exact Work","year":"2024","authors":["Alpha"],"identifiers":[{"kind":"doi","value":"10.1000/exact"}]}],
            "references":[{"canonicalReferenceId":"canonical:1","reference":{"title":"Exact Work","rawReference":"doi:10.1000/exact"}}]
        });
        let result = binding(request, &AtomicBool::new(false)).unwrap();
        assert_eq!(result["matches"][0]["result"]["targetPaperRef"], "1:A");
    }

    #[test]
    fn cancellation_fails_closed() {
        assert_eq!(binding(json!({}), &AtomicBool::new(true)), Err("canceled"));
        assert_eq!(canceled(&AtomicBool::new(true)), Err("canceled"));
    }
}
