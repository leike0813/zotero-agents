//! Stateless, bounded lexical matching shared by Synthesis search applications.
//!
//! Query coverage counts distinct query units. Whitespace-delimited text uses
//! lexical tokens; selected unspaced scripts use scalar units. Ranges are
//! UTF-16 half-open offsets into the original source.

use std::cmp::Ordering;
use std::collections::BTreeSet;
use unicode_normalization::UnicodeNormalization;
use unicode_normalization::char::canonical_combining_class;

pub const MAX_QUERY_UTF16: usize = 4_096;
pub const MAX_SOURCE_BYTES: usize = 262_144;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LexicalQuery {
    units: Vec<String>,
    phrase: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LexicalMatch {
    pub coverage: usize,
    pub phrase: bool,
    pub ranges: Vec<TextRange>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct TextRange {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy)]
struct MappedChar {
    value: char,
    start: usize,
    end: usize,
}

impl LexicalQuery {
    pub fn new(query: &str) -> Result<Self, String> {
        if query.encode_utf16().take(MAX_QUERY_UTF16 + 1).count() > MAX_QUERY_UTF16 {
            return Err("lexical_query_too_long".to_owned());
        }
        let normalized = normalize_with_offsets(query);
        let units = lexical_units(&normalized);
        if units.is_empty() {
            return Err("lexical_query_empty".to_owned());
        }
        let phrase = normalized_phrase(&normalized)
            .iter()
            .map(|mapped| mapped.value)
            .collect();
        Ok(Self { units, phrase })
    }

    pub fn match_text(&self, source: &str) -> Option<LexicalMatch> {
        if source.len() > MAX_SOURCE_BYTES {
            return None;
        }
        let normalized = normalize_with_offsets(source);
        if normalized.is_empty() {
            return None;
        }
        let source_phrase = normalized_phrase(&normalized);
        let query_phrase = self.phrase.chars().collect::<Vec<_>>();
        let phrase_start = if query_phrase.is_empty() {
            None
        } else {
            source_phrase
                .windows(query_phrase.len())
                .position(|window| {
                    window
                        .iter()
                        .map(|ch| ch.value)
                        .eq(query_phrase.iter().copied())
                })
        };
        let phrase = phrase_start.is_some();
        let mut coverage = 0;
        let mut ranges = Vec::new();

        if let Some(start) = phrase_start {
            let end = start + query_phrase.len();
            coverage = self.units.len();
            ranges.push(TextRange {
                start: source_phrase[start].start,
                end: source_phrase[end - 1].end,
            });
        } else {
            for unit in &self.units {
                let needle = unit.chars().collect::<Vec<_>>();
                if needle.is_empty() {
                    continue;
                }
                if let Some(start) = normalized
                    .windows(needle.len())
                    .position(|window| window.iter().map(|ch| ch.value).eq(needle.iter().copied()))
                {
                    coverage += 1;
                    let end = start + needle.len();
                    ranges.push(TextRange {
                        start: normalized[start].start,
                        end: normalized[end - 1].end,
                    });
                }
            }
        }

        if coverage == 0 {
            return None;
        }
        ranges.sort_by_key(|range| (range.start, range.end));
        let mut merged: Vec<TextRange> = Vec::with_capacity(ranges.len());
        for range in ranges {
            if let Some(last) = merged.last_mut()
                && range.start <= last.end
            {
                last.end = last.end.max(range.end);
                continue;
            }
            merged.push(range);
        }
        Some(LexicalMatch {
            coverage,
            phrase,
            ranges: merged,
        })
    }

    /// Return normalized query units that actually occur in this source.
    pub fn matched_terms(&self, source: &str) -> Vec<String> {
        if source.len() > MAX_SOURCE_BYTES {
            return Vec::new();
        }
        let normalized = normalize_with_offsets(source);
        self.units
            .iter()
            .filter(|unit| {
                let needle = unit.chars().collect::<Vec<_>>();
                !needle.is_empty()
                    && normalized
                        .windows(needle.len())
                        .any(|window| window.iter().map(|ch| ch.value).eq(needle.iter().copied()))
            })
            .cloned()
            .collect()
    }
}

/// Compare search results in their required best-first order (`Less` means
/// the left result should be presented first).
pub fn compare_matches(
    left: &LexicalMatch,
    left_field_priority: usize,
    left_identity: &str,
    right: &LexicalMatch,
    right_field_priority: usize,
    right_identity: &str,
) -> Ordering {
    right
        .coverage
        .cmp(&left.coverage)
        .then_with(|| right.phrase.cmp(&left.phrase))
        .then_with(|| left_field_priority.cmp(&right_field_priority))
        .then_with(|| left_identity.cmp(right_identity))
}

fn normalize_with_offsets(source: &str) -> Vec<MappedChar> {
    let mut output = Vec::new();
    let mut cluster = String::new();
    let mut cluster_start = 0;
    let mut offset = 0;

    let flush = |cluster: &mut String, start: usize, end: usize, output: &mut Vec<MappedChar>| {
        if cluster.is_empty() {
            return;
        }
        let mut folded = String::new();
        for value in cluster.nfkc() {
            for lower in value.to_lowercase() {
                match lower {
                    'ß' => folded.push_str("ss"),
                    'ς' => folded.push('σ'),
                    other => folded.push(other),
                }
            }
        }
        for value in folded.nfd() {
            output.push(MappedChar { value, start, end });
        }
        cluster.clear();
    };

    for value in source.chars() {
        let end = offset + value.len_utf16();
        if canonical_combining_class(value) == 0 {
            flush(&mut cluster, cluster_start, offset, &mut output);
            cluster_start = offset;
        }
        cluster.push(value);
        offset = end;
    }
    flush(&mut cluster, cluster_start, offset, &mut output);
    output
}

fn lexical_units(text: &[MappedChar]) -> Vec<String> {
    let mut units = BTreeSet::new();
    let mut token = String::new();
    let mut index = 0;
    while index < text.len() {
        let mapped = text[index];
        if is_unspaced_script_letter(mapped.value) {
            if !token.is_empty() {
                units.insert(std::mem::take(&mut token));
            }
            let mut unit = String::new();
            let source_start = mapped.start;
            let source_end = mapped.end;
            if !is_hangul_jamo(mapped.value) {
                while index < text.len()
                    && text[index].start == source_start
                    && text[index].end == source_end
                    && !is_hangul_jamo(text[index].value)
                {
                    unit.push(text[index].value);
                    index += 1;
                }
            } else {
                unit.push(mapped.value);
                index += 1;
            }
            units.insert(unit);
            continue;
        } else if mapped.value.is_alphanumeric() || canonical_combining_class(mapped.value) != 0 {
            token.push(mapped.value);
        } else if !token.is_empty() {
            units.insert(std::mem::take(&mut token));
        }
        index += 1;
    }
    if !token.is_empty() {
        units.insert(token);
    }
    units.into_iter().collect()
}

fn is_hangul_jamo(value: char) -> bool {
    matches!(value as u32,
        0x1100..=0x11FF | 0x3130..=0x318F |
        0xA960..=0xA97F | 0xD7B0..=0xD7FF)
}

fn is_unspaced_script_letter(value: char) -> bool {
    let code = value as u32;
    value.is_alphabetic()
        && matches!(code,
            0x3041..=0x3096 | 0x309D..=0x309F |
            0x30A1..=0x30FA | 0x30FD..=0x30FF |
            0x31F0..=0x31FF | 0x3400..=0x4DBF |
            0x4E00..=0x9FFF | 0xF900..=0xFAFF |
            0x20000..=0x323AF | 0x0E00..=0x0E7F |
            0x0E80..=0x0EFF | 0x1000..=0x109F |
            0x1780..=0x17FF)
        || is_hangul_jamo(value)
}

fn normalized_phrase(text: &[MappedChar]) -> Vec<MappedChar> {
    let mut phrase = Vec::new();
    let mut separator: Option<(usize, usize)> = None;
    for mapped in text {
        if mapped.value.is_alphanumeric() || canonical_combining_class(mapped.value) != 0 {
            if let Some((start, end)) = separator.take()
                && !phrase.is_empty()
            {
                phrase.push(MappedChar {
                    value: ' ',
                    start,
                    end,
                });
            }
            phrase.push(*mapped);
        } else if !phrase.is_empty() {
            match separator.as_mut() {
                Some((_, end)) => *end = mapped.end,
                None => separator = Some((mapped.start, mapped.end)),
            }
        }
    }
    phrase
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matched_terms_are_normalized_query_units_that_occur_in_source() {
        let query = LexicalQuery::new("Café wind turbine").unwrap();
        assert_eq!(
            query.matched_terms("CAFE\u{301} turbine"),
            vec!["cafe\u{301}", "turbine"]
        );
    }

    #[test]
    fn query_validation_and_source_bounds_are_explicit() {
        assert!(LexicalQuery::new(" \t\n ").is_err());
        assert!(LexicalQuery::new(&"a".repeat(MAX_QUERY_UTF16 + 1)).is_err());

        let query = LexicalQuery::new("needle").expect("valid query");
        assert_eq!(query.match_text(&"x".repeat(MAX_SOURCE_BYTES + 1)), None);
    }

    #[test]
    fn canonical_unicode_case_and_nfkc_matches_keep_source_utf16_offsets() {
        let query = LexicalQuery::new("CAFÉ ﬁ").expect("valid query");
        let source = "😀 Cafe\u{301} ﬁ";
        let matched = query.match_text(source).expect("canonical match");

        assert_eq!(matched.coverage, 2);
        assert!(matched.phrase);
        assert_eq!(matched.ranges, vec![TextRange { start: 3, end: 10 }]);
        for range in &matched.ranges {
            assert!(!splits_surrogate(source, range.start));
            assert!(!splits_surrogate(source, range.end));
        }
    }

    #[test]
    fn accented_latin_and_cyrillic_or_greek_words_remain_single_units() {
        for (query_text, source_text) in [
            ("café", "caféiné"),
            ("κόσμος", "κόσμοσικός"),
            ("мир", "мирный"),
        ] {
            let query = LexicalQuery::new(query_text).expect("valid query");
            assert_eq!(query.units.len(), 1, "{query_text}");
            assert_eq!(
                query
                    .match_text(source_text)
                    .expect("partial word match")
                    .coverage,
                1,
                "{query_text} in {source_text}"
            );
        }
    }

    #[test]
    fn hangul_syllables_match_decomposed_jamo() {
        let query = LexicalQuery::new("각").expect("valid query");
        let source = "각";
        let matched = query.match_text(source).expect("canonical Hangul match");

        assert_eq!(matched.coverage, 3);
        assert_eq!(matched.ranges, vec![TextRange { start: 0, end: 3 }]);
    }

    #[test]
    fn casefold_matches_sharp_s_with_ss_and_maps_the_expansion() {
        let query = LexicalQuery::new("STRASSE").expect("valid query");
        let source = "Straße";
        let matched = query.match_text(source).expect("sharp s casefold");

        assert_eq!(matched.coverage, 1);
        assert!(matched.phrase);
        assert_eq!(matched.ranges, vec![TextRange { start: 0, end: 6 }]);
    }

    #[test]
    fn unspaced_scripts_match_by_scalar_and_phrase_is_contiguous() {
        let query = LexicalQuery::new("東京大学").expect("valid query");
        let matched = query
            .match_text("京都東京大学院")
            .expect("CJK partial match");
        assert_eq!(matched.coverage, 4);
        assert!(matched.phrase);
        assert_eq!(matched.ranges, vec![TextRange { start: 2, end: 6 }]);
    }

    #[test]
    fn coverage_uses_unique_query_units_and_source_substrings() {
        let query = LexicalQuery::new("neural search neural").expect("valid query");
        let matched = query
            .match_text("A NEURAL-network index")
            .expect("partial token match");
        assert_eq!(matched.coverage, 1);
        assert!(!matched.phrase);
    }

    #[test]
    fn comparator_uses_coverage_phrase_field_then_identity() {
        let broad = LexicalMatch {
            coverage: 2,
            phrase: false,
            ranges: vec![],
        };
        let phrase = LexicalMatch {
            coverage: 2,
            phrase: true,
            ranges: vec![],
        };
        assert_eq!(
            compare_matches(&phrase, 9, "z", &broad, 0, "a"),
            Ordering::Less
        );
        assert_eq!(
            compare_matches(&broad, 1, "z", &broad, 2, "a"),
            Ordering::Less
        );
        assert_eq!(
            compare_matches(&broad, 1, "a", &broad, 1, "b"),
            Ordering::Less
        );
        assert_eq!(
            compare_matches(&broad, 1, "a", &broad, 1, "a"),
            Ordering::Equal
        );
    }

    fn splits_surrogate(value: &str, utf16_offset: usize) -> bool {
        let mut units = 0;
        for ch in value.chars() {
            if units == utf16_offset {
                return false;
            }
            units += ch.len_utf16();
            if units > utf16_offset {
                return true;
            }
        }
        false
    }
}
