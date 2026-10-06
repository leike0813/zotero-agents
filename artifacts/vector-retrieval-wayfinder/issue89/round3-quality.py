"""Round-three passage-quality comparison for issue 89.

Only qwen3-embedding:4b / MRL 1024 is compared. Reference-list candidates are
identified from heading, list syntax, and complete source-block boundaries;
this remains a structural heuristic, not an exact semantic classifier.
The conservative arm retains uncertain, mixed, and unlocated fragments. A
separate reference-section arm also masks contained uncertain blocks to test
the coverage limit; it can remove explanatory reference notes. All passage text
and document/source identity stay in the ignored run root; the public output
contains aggregates only.
"""

import argparse
import hashlib
import json
import re
import unittest
from collections import Counter
from pathlib import Path

import numpy as np

from corpus import MODEL, QUERIES, QUERY_PREFIX, validate_vectors


REFERENCE_HEADING = re.compile(
    r"^(?:references?(?:\s+and\s+notes)?|bibliography|works\s+cited|"
    r"literature\s+cited|参考文献|引用文献|文献目录|参考资料)$",
    re.IGNORECASE,
)
ATX_HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$")
SETEXT_UNDERLINE = re.compile(r"^ {0,3}(=+|-+)\s*$")
LIST_ITEM = re.compile(r"^ {0,3}(?:\[\d{1,4}\]|\d{1,4}[.)]|[-*•‣])\s+\S")
BIBLIOGRAPHIC_CUE = re.compile(
    r"(?i)(?:\bdoi\s*[:/]|doi\.org/|\barxiv\b|\bISBN\b|\bISSN\b|"
    r"\b(?:journal|proceedings|conference|transactions|publisher|"
    r"vol(?:ume)?\.?|pp?\.?\s*\d)\b|期刊|会议|出版社|卷[期]?|页码)"
)


def utf16_to_index(text, offset):
    """Convert a UTF-16 code-unit offset to a Python character index."""
    if offset < 0:
        raise ValueError("negative_utf16_offset")
    units = 0
    for index, char in enumerate(text):
        if units == offset:
            return index
        units += 2 if ord(char) > 0xFFFF else 1
        if units > offset:
            raise ValueError("utf16_offset_splits_surrogate_pair")
    if units == offset:
        return len(text)
    raise ValueError("utf16_offset_out_of_range")


def markdown_headings(text):
    lines = text.splitlines(keepends=True)
    headings = []
    offset = 0
    previous_line = ""
    previous_start = 0
    for line in lines:
        content = line.rstrip("\r\n")
        match = ATX_HEADING.match(content)
        if match:
            headings.append(
                (
                    offset,
                    offset + len(line),
                    len(match.group(1)),
                    match.group(2).strip(),
                )
            )
        elif SETEXT_UNDERLINE.match(content) and previous_line.strip():
            level = 1 if content.lstrip().startswith("=") else 2
            headings.append(
                (previous_start, offset + len(line), level, previous_line.strip())
            )
        previous_start = offset
        previous_line = content
        offset += len(line)
    return headings


def is_reference_heading(title):
    normalized = re.sub(r"[*_`]+", "", title).strip().rstrip(":：.。")
    return bool(REFERENCE_HEADING.fullmatch(normalized))


def reference_sections(text):
    headings = markdown_headings(text)
    sections = []
    for index, (heading_start, body_start, level, title) in enumerate(headings):
        if not is_reference_heading(title):
            continue
        section_end = len(text)
        for next_heading in headings[index + 1 :]:
            section_end = next_heading[0]
            break
        sections.append((heading_start, body_start, section_end))
    return sections


def utf16_slice(text, start_utf16, end_utf16):
    if end_utf16 < start_utf16:
        raise ValueError("invalid_utf16_range")
    start = utf16_to_index(text, start_utf16)
    end = utf16_to_index(text, end_utf16)
    return text[start:end], start, end


def source_blocks(text):
    spans = []
    cursor = 0
    for separator in re.finditer(r"\n[ \t]*\n+", text):
        left, right = cursor, separator.start()
        while left < right and text[left].isspace():
            left += 1
        while right > left and text[right - 1].isspace():
            right -= 1
        if left < right:
            spans.append((left, right, text[left:right]))
        cursor = separator.end()
    left, right = cursor, len(text)
    while left < right and text[left].isspace():
        left += 1
    while right > left and text[right - 1].isspace():
        right -= 1
    if left < right:
        spans.append((left, right, text[left:right]))
    return spans


def is_complete_reference_list_block(block):
    lines = [line for line in block.splitlines() if line.strip()]
    if not lines or not LIST_ITEM.match(lines[0]):
        return False
    if any(not line.startswith(("  ", "\t")) for line in lines[1:]):
        return False
    return bool(BIBLIOGRAPHIC_CUE.search(block))


def classify_fragment(source_text, start_utf16, end_utf16, fragment, *, kind, field):
    if kind != 1 or field != "markdown":
        return "ineligible_source"
    try:
        source_slice, start, end = utf16_slice(source_text, start_utf16, end_utf16)
    except ValueError:
        return "invalid_source_range"
    if source_slice != fragment:
        return "source_slice_mismatch"
    sections = reference_sections(source_text)
    if not sections:
        return "no_reference_heading"
    section = next(
        (
            candidate
            for candidate in sections
            if start >= candidate[0] and end <= candidate[2]
        ),
        None,
    )
    if section is None:
        if any(
            start < section_end and end > heading_start
            for heading_start, _, section_end in sections
        ):
            return "crosses_reference_boundary"
        if any(end <= heading_start for heading_start, _, _ in sections):
            return "outside_reference_section"
        return "outside_reference_section"
    heading_start, content_start, section_end = section
    overlapping_blocks = []
    for block_start, block_end, block_text in source_blocks(source_text):
        if block_end <= start or block_start >= end:
            continue
        if block_start < start or block_end > end:
            return "split_source_block_uncertain"
        overlapping_blocks.append((block_start, block_end, block_text))
    if not overlapping_blocks:
        return "empty_fragment"
    content_blocks = []
    for block_start, block_end, block_text in overlapping_blocks:
        if block_start >= heading_start and block_end <= content_start:
            heading_match = ATX_HEADING.match(block_text.strip())
            if heading_match and is_reference_heading(heading_match.group(2)):
                continue
            return "mixed_or_uncertain"
        if block_start < content_start or block_end > section_end:
            return "mixed_or_uncertain"
        content_blocks.append(block_text)
    if content_blocks and all(
        is_complete_reference_list_block(block) for block in content_blocks
    ):
        return "reference_list_candidate"
    if any(is_complete_reference_list_block(block) for block in content_blocks):
        return "mixed_or_uncertain"
    return "mixed_or_uncertain"


def load_source_records(source_root):
    path = source_root / "sources.json"
    if not path.is_file():
        raise FileNotFoundError("private_snapshot_sources_json_unavailable")
    rows = json.loads(path.read_text(encoding="utf-8"))
    records = {}
    for row in rows:
        source_id = row.get("source")
        if not isinstance(source_id, int) or source_id in records:
            raise ValueError("invalid_private_source_index")
        records[source_id] = row
    return records


def classify_rows(chunks, source_root):
    source_records = load_source_records(source_root)
    classifications = []
    for row in chunks:
        if row.get("kind") != 1 or row.get("field") != "markdown":
            classifications.append("ineligible_source")
            continue
        source_row = source_records.get(row.get("source"))
        if (
            source_row is None
            or source_row.get("kind") != 1
            or source_row.get("field") != "markdown"
            or source_row.get("document") != row.get("document")
            or source_row.get("identity") != row.get("identity")
        ):
            classifications.append("source_unavailable")
            continue
        classifications.append(
            classify_fragment(
                source_row["text"],
                row["start"],
                row["end"],
                row["text"],
                kind=row["kind"],
                field=row["field"],
            )
        )
    return classifications


def load_frozen_grades(path):
    raw = path.read_bytes()
    frozen_hash = hashlib.sha256(raw).hexdigest()
    value = json.loads(raw)
    if value.get("status") != "draft_for_main_review__NOT_human_confirmed_gold":
        raise ValueError("unexpected_frozen_label_status")
    grade_by_intent = []
    for intent in value.get("intents", []):
        grades = {}
        for label in intent.get("labels", []):
            grade = label.get("grade")
            document = label.get("document")
            if grade not in (0, 1, 2) or not isinstance(document, int):
                raise ValueError("invalid_parent_grade_record")
            if document in grades:
                raise ValueError("duplicate_parent_grade")
            grades[document] = grade
        grade_by_intent.append(grades)
    if len(grade_by_intent) != len(QUERIES) // 2:
        raise ValueError("frozen_intent_count_mismatch")
    return frozen_hash, grade_by_intent


def validate_inputs(root, source_root, public_output):
    root = root.resolve()
    allowed = Path(".scaffold/test").resolve()
    if not root.is_relative_to(allowed):
        raise ValueError("private_root_must_be_under_scaffold_test")
    manifest_path = root / "large-1024" / "manifest.json"
    chunks_path = root / "chunks.json"
    labels_path = root / "review" / "blind-labels-private.json"
    safe_summary_path = root / "review" / "safe-summary.json"
    for path in [manifest_path, chunks_path, labels_path, safe_summary_path]:
        if not path.is_file():
            raise FileNotFoundError(path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    if manifest.get("model") != MODEL or manifest.get("dimension") != 1024:
        raise ValueError("round3_requires_qwen3_4b_mrl1024")
    if manifest.get("query_count") != len(QUERIES):
        raise ValueError("manifest_query_count_mismatch")
    encoding = manifest.get("encoding", {})
    if (
        encoding.get("output_dimensions") != 1024
        or encoding.get("reduction") != "MRL_prefix_then_L2"
        or encoding.get("truncate") is not False
        or encoding.get("query_prefix") != QUERY_PREFIX
        or encoding.get("document_prefix") != ""
    ):
        raise ValueError("manifest_encoding_mismatch")
    safe_summary = json.loads(safe_summary_path.read_text(encoding="utf-8"))
    hash_record = safe_summary.get("frozen_label_file_sha256", {})
    expected_label_hash = (
        hash_record.get("operative_frozen_file")
        if isinstance(hash_record, dict)
        else hash_record
    )
    if not expected_label_hash:
        raise ValueError("frozen_parent_label_hash_missing")
    actual_label_hash = hashlib.sha256(labels_path.read_bytes()).hexdigest()
    if actual_label_hash != expected_label_hash:
        raise ValueError("frozen_parent_label_hash_mismatch")
    if len(chunks) != len(manifest.get("rows", [])):
        raise ValueError("manifest_chunk_count_mismatch")
    for index, (chunk, row) in enumerate(zip(chunks, manifest["rows"])):
        expected = (
            chunk.get("document"),
            chunk.get("source"),
            chunk.get("kind"),
            chunk.get("section"),
            chunk.get("start"),
            chunk.get("end"),
        )
        actual = (
            row.get("document"),
            row.get("source"),
            row.get("kind"),
            row.get("section"),
            row.get("start_utf16"),
            row.get("end_utf16"),
        )
        if actual != expected:
            raise ValueError("manifest_chunk_index_mismatch_" + str(index))
    source_root = source_root.resolve()
    if not (source_root / "sources.json").is_file():
        raise FileNotFoundError("private_snapshot_sources_json_unavailable")
    if not source_root.is_relative_to(allowed) or source_root == root:
        raise ValueError("source_root_must_be_separate_private_snapshot")
    public_output = public_output.resolve()
    if public_output.is_relative_to(allowed):
        raise ValueError("public_output_must_not_be_private")
    private_output = root / "round3-quality-private.json"
    if private_output.exists() or public_output.exists():
        raise FileExistsError("round3_output_already_exists")
    return (
        root,
        source_root,
        manifest,
        chunks,
        labels_path,
        private_output,
        public_output,
    )


def load_vectors(manifest, chunk_count):
    dimension = 1024
    vector_path = Path(manifest["vectors_file"])
    query_path = Path(manifest["queries_file"])
    vectors = np.memmap(
        vector_path, dtype="<f4", mode="r", shape=(chunk_count, dimension)
    )
    queries = np.fromfile(query_path, dtype="<f4")
    if queries.size != len(QUERIES) * dimension:
        raise ValueError("query_vector_shape_mismatch")
    queries = queries.reshape((len(QUERIES), dimension))
    validate_vectors({"embeddings": vectors}, chunk_count, dimension)
    validate_vectors({"embeddings": queries}, len(QUERIES), dimension)
    return vectors, queries


def cosine_distance_matrix(vectors, queries):
    normalized_vectors = vectors.astype(np.float64)
    normalized_vectors /= np.linalg.norm(normalized_vectors, axis=1, keepdims=True)
    normalized_queries = queries.astype(np.float64)
    normalized_queries /= np.linalg.norm(normalized_queries, axis=1, keepdims=True)
    return 1.0 - normalized_queries @ normalized_vectors.T


def rank_documents(chunks, distances, classifications, arm):
    if arm == "current":
        eligible = np.ones(len(chunks), dtype=bool)
    elif arm == "reference_list_candidate_masked":
        eligible = np.asarray(
            [
                classification != "reference_list_candidate"
                for classification in classifications
            ],
            dtype=bool,
        )
    elif arm == "reference_section_masked":
        eligible = np.asarray(
            [
                classification
                not in {
                    "reference_list_candidate",
                    "split_source_block_uncertain",
                    "mixed_or_uncertain",
                    "empty_fragment",
                }
                for classification in classifications
            ],
            dtype=bool,
        )
    else:
        raise ValueError("unknown_arm")
    results = []
    for query_index, row_scores in enumerate(distances):
        best_by_document = {}
        for index, row in enumerate(chunks):
            if not eligible[index] or row["kind"] == 3:
                continue
            hit = (float(row_scores[index]), index)
            document = row["document"]
            if document not in best_by_document or hit < best_by_document[document]:
                best_by_document[document] = hit
        ranked = sorted(best_by_document.items(), key=lambda item: item[1])[:3]
        intent_index = query_index // 2
        results.append(
            {
                "query_index": query_index,
                "intent_index": intent_index,
                "results": [
                    {
                        "rank": rank,
                        "document": document,
                        "parent_grade": None,
                        "distance": score,
                        "fragment_index": index,
                        "fragment_classification": classifications[index],
                        "fragment_review": "pending_new_review",
                        "text": chunks[index]["text"],
                        "source": chunks[index]["source"],
                        "kind": chunks[index]["kind"],
                        "field": chunks[index]["field"],
                        "start": chunks[index]["start"],
                        "end": chunks[index]["end"],
                    }
                    for rank, (document, (score, index)) in enumerate(ranked, start=1)
                ],
            }
        )
    return results


def attach_parent_grades(rankings, grade_by_intent):
    for query in rankings:
        grades = grade_by_intent[query["intent_index"]]
        for result in query["results"]:
            result["parent_grade"] = grades.get(result["document"])


def public_counts(chunks, classifications, arm_results, frozen_hash):
    classification_counts = Counter(classifications)
    arms = {}
    for arm, rankings in arm_results.items():
        grades = Counter()
        for query in rankings:
            for row in query["results"]:
                grade = row["parent_grade"]
                grades[str(grade) if grade is not None else "unlabeled"] += 1
        arms[arm] = {
            "top3_slots": sum(len(query["results"]) for query in rankings),
            "parent_grade_counts": dict(sorted(grades.items())),
            "ranked_queries": sum(bool(query["results"]) for query in rankings),
        }
    masked_chunks = classification_counts.get("reference_list_candidate", 0)
    return {
        "schema": "issue89-round3-quality-counts.v1",
        "model": MODEL,
        "dimension": 1024,
        "query_count": len(QUERIES),
        "fragment_classification_counts": dict(sorted(classification_counts.items())),
        "fragment_count": len(chunks),
        "reference_list_candidate_fragment_count": masked_chunks,
        "reference_section_fragment_count": sum(
            classification_counts.get(name, 0)
            for name in (
                "reference_list_candidate",
                "split_source_block_uncertain",
                "mixed_or_uncertain",
                "empty_fragment",
            )
        ),
        "arms": arms,
        "frozen_parent_label_sha256": frozen_hash,
        "fragment_grade_status": "pending_new_review_no_round2_scores_reused",
        "classification_method": "heading + complete source block boundaries + explicit list marker + bibliographic surface cue",
        "classification_limit": "heuristic candidates pending review; no multilingual semantic-purity claim",
    }


def write_new_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def run_quality(args):
    (
        root,
        source_root,
        manifest,
        chunks,
        labels_path,
        private_output,
        public_output,
    ) = validate_inputs(args.root, args.source_root, args.public_output)
    frozen_hash, grade_by_intent = load_frozen_grades(labels_path)
    classifications = classify_rows(chunks, source_root)
    vectors, queries = load_vectors(manifest, len(chunks))
    distances = cosine_distance_matrix(vectors, queries)
    arm_results = {
        arm: rank_documents(chunks, distances, classifications, arm)
        for arm in [
            "current",
            "reference_list_candidate_masked",
            "reference_section_masked",
        ]
    }
    for rankings in arm_results.values():
        attach_parent_grades(rankings, grade_by_intent)
    private = {
        "schema": "issue89-round3-quality-private.v1",
        "model": MODEL,
        "dimension": 1024,
        "frozen_parent_label_sha256": frozen_hash,
        "fragment_grades": "not_assigned_pending_independent_review",
        "classification_policy": "conservative list candidates plus separate contained-reference-section coverage probe; neither is a production purity classifier",
        "arms": arm_results,
    }
    public = public_counts(chunks, classifications, arm_results, frozen_hash)
    write_new_json(private_output, private)
    write_new_json(public_output, public)
    print(
        json.dumps(
            {"private_output": str(private_output), "public_output": str(public_output)}
        )
    )


class FragmentClassificationTests(unittest.TestCase):
    def classify(self, source, start, end, *, kind=1, field="markdown"):
        fragment = source.encode("utf-16-le")[start * 2 : end * 2].decode("utf-16-le")
        return classify_fragment(source, start, end, fragment, kind=kind, field=field)

    def test_only_complete_citation_list_blocks_inside_references_are_excluded(self):
        source = (
            "Body cites prior work.\n\n"
            "## References\n\n"
            "[1] A. Author. A study (2020). Journal of Examples.\n\n"
            "[2] B. Writer. Another study. doi:10.1000/example\n\n"
            "## Appendix\n\n"
            "1. Explain the data collection (2021).\n"
        )
        first = source.index("[1]")
        end = source.index("## Appendix")
        result = self.classify(
            source,
            len(source[:first].encode("utf-16-le")) // 2,
            len(source[:end].encode("utf-16-le")) // 2,
        )
        self.assertEqual(result, "reference_list_candidate")

    def test_mixed_explanatory_block_is_retained(self):
        source = (
            "# References\n\n"
            "[1] A. Author. A study (2020). Journal.\n"
            "This study explains why the method works.\n"
        )
        result = self.classify(source, 0, len(source.encode("utf-16-le")) // 2)
        self.assertEqual(result, "mixed_or_uncertain")

    def test_unheaded_list_and_non_markdown_sources_are_retained(self):
        source = "[1] A. Author. A study (2020). Journal.\n"
        end = len(source.encode("utf-16-le")) // 2
        self.assertEqual(self.classify(source, 0, end), "no_reference_heading")
        self.assertEqual(self.classify(source, 0, end, kind=2), "ineligible_source")
        self.assertEqual(
            self.classify(source, 0, end, field="metadata"), "ineligible_source"
        )

    def test_nested_section_closes_reference_scope(self):
        source = (
            "# References\n\n"
            "[1] A. Author. A study (2020). Journal.\n\n"
            "## Notes\n\n"
            "[2] This is an explanatory note (2021).\n"
        )
        start = len(source[: source.index("## Notes")].encode("utf-16-le")) // 2
        end = len(source.encode("utf-16-le")) // 2
        self.assertEqual(self.classify(source, start, end), "outside_reference_section")

    def test_utf16_offsets_are_checked_against_the_exact_source_slice(self):
        source = (
            "🧠 introductory text\n\n"
            "## References\n\n"
            "[1] A. Author. A study (2020). Journal.\n"
        )
        start_char = source.index("[1]")
        start = len(source[:start_char].encode("utf-16-le")) // 2
        end = len(source.encode("utf-16-le")) // 2
        exact = source[start_char:]
        self.assertEqual(
            classify_fragment(source, start, end, exact, kind=1, field="markdown"),
            "reference_list_candidate",
        )
        self.assertEqual(
            classify_fragment(
                source, start, end, "wrong slice", kind=1, field="markdown"
            ),
            "source_slice_mismatch",
        )

    def test_plain_numbered_prose_in_a_reference_section_is_retained(self):
        source = "# References\n\n1. First explain this result (2021).\n"
        result = self.classify(source, 0, len(source.encode("utf-16-le")) // 2)
        self.assertEqual(result, "mixed_or_uncertain")

    def test_section_heading_must_be_a_real_markdown_heading(self):
        source = "The word References appears here.\n\n[1] A. Author (2020). Journal.\n"
        result = self.classify(source, 0, len(source.encode("utf-16-le")) // 2)
        self.assertEqual(result, "no_reference_heading")

    def test_fragment_starting_in_the_middle_of_an_entry_is_retained(self):
        source = "# References\n\n[1] A. Author. A study (2020). Journal.\n"
        start_char = source.index("A study")
        start = len(source[:start_char].encode("utf-16-le")) // 2
        end = len(source.encode("utf-16-le")) // 2
        self.assertEqual(
            self.classify(source, start, end), "split_source_block_uncertain"
        )

    def test_both_arms_can_share_one_float64_cosine_matrix(self):
        vectors = np.asarray([[3.0, 4.0], [0.0, 2.0]], dtype="<f4")
        queries = np.asarray([[6.0, 8.0]], dtype="<f4")
        distances = cosine_distance_matrix(vectors, queries)
        np.testing.assert_allclose(distances, [[0.0, 0.2]], atol=1e-12)

    def test_section_probe_keeps_body_and_changes_best_passage_for_same_document(self):
        chunks = [
            {
                "document": 1,
                "kind": 1,
                "text": str(i),
                "source": 1,
                "field": "markdown",
                "start": 0,
                "end": 1,
            }
            for i in range(3)
        ]
        scores = np.asarray([[0.1, 0.2, 0.3]])
        classes = [
            "split_source_block_uncertain",
            "mixed_or_uncertain",
            "outside_reference_section",
        ]
        for arm, expected in [
            ("current", 0),
            ("reference_list_candidate_masked", 0),
            ("reference_section_masked", 2),
        ]:
            with self.subTest(arm=arm):
                result = rank_documents(chunks, scores, classes, arm)
                self.assertEqual(result[0]["results"][0]["fragment_index"], expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["self-test", "classify", "quality"])
    parser.add_argument("--root", type=Path)
    parser.add_argument("--source-root", type=Path)
    parser.add_argument(
        "--public-output",
        type=Path,
        default=Path(
            "artifacts/vector-retrieval-wayfinder/issue89-round3-quality-counts.json"
        ),
    )
    args = parser.parse_args()
    if args.action == "self-test":
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(
            FragmentClassificationTests
        )
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        raise SystemExit(not result.wasSuccessful())
    if args.action == "classify":
        if args.root is None or args.source_root is None:
            parser.error("classify requires --root and --source-root")
        root = args.root.resolve()
        if not root.is_relative_to(Path(".scaffold/test").resolve()):
            parser.error("root must be under .scaffold/test")
        chunks = json.loads((root / "chunks.json").read_text(encoding="utf-8"))
        classifications = classify_rows(chunks, args.source_root.resolve())
        print(
            json.dumps(
                {
                    "fragment_count": len(chunks),
                    "classification_counts": dict(
                        sorted(Counter(classifications).items())
                    ),
                    "reference_list_candidate_fragment_count": classifications.count(
                        "reference_list_candidate"
                    ),
                    "output_written": False,
                }
            )
        )
        return
    if args.root is None or args.source_root is None:
        parser.error("quality requires --root and --source-root")
    run_quality(args)


if __name__ == "__main__":
    main()
