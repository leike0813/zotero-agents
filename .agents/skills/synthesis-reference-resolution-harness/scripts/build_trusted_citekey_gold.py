from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


SCHEMA_ID = "synthesis.reference_resolution_gold_labels.trusted_citekey_review.v1"
TRUSTED_SOURCE = "zotero-reference-notes-old-reference-matching-workflow"


@dataclass(frozen=True)
class ReferenceNote:
    literature_item_id: str
    library_id: int
    item_key: str
    note_key: str


@dataclass(frozen=True)
class CitekeyTarget:
    citekey: str
    literature_item_id: str
    item_key: str
    library_id: int
    title: str
    year: str


class ReferencesTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_cell: list[str] = []
        self.current_row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_by_name = {name: value for name, value in attrs}
        if tag == "table" and attrs_by_name.get("data-zs-view") == "references-table":
            self.in_table = True
        if not self.in_table:
            return
        if tag == "tr":
            self.in_row = True
            self.current_row = []
        elif tag in {"td", "th"} and self.in_row:
            self.in_cell = True
            self.current_cell = []

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.current_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self.in_table:
            return
        if tag in {"td", "th"} and self.in_cell:
            text = " ".join("".join(self.current_cell).split())
            self.current_row.append(text)
            self.current_cell = []
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = []
            self.in_row = False
        elif tag == "table":
            self.in_table = False


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_citekey(value: Any) -> str:
    return str(value or "").strip().lower()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def run_bridge(bridge: str, args: list[str], timeout: int = 60) -> dict[str, Any]:
    completed = subprocess.run(
        [bridge, *args],
        capture_output=True,
        check=False,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    if completed.returncode != 0:
        raise RuntimeError((completed.stderr or completed.stdout).strip())
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"zotero-bridge returned non-JSON output: {exc}") from exc


def query_reference_notes(db_path: Path) -> list[ReferenceNote]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            select s.literature_item_id, b.library_id, b.item_key, s.note_key
            from synt_artifact_state s
            join synt_zotero_binding b on b.literature_item_id = s.literature_item_id
            where s.artifact_type = 'references'
              and s.status = 'available'
              and coalesce(s.note_key, '') <> ''
              and b.binding_status = 'active'
              and coalesce(b.deleted_at, '') = ''
            order by b.item_key
            """,
        ).fetchall()
    return [
        ReferenceNote(
            literature_item_id=str(row["literature_item_id"]),
            library_id=int(row["library_id"]),
            item_key=str(row["item_key"]),
            note_key=str(row["note_key"]),
        )
        for row in rows
    ]


def discover_reference_notes_from_zotero(
    bridge: str,
    papers: list[dict[str, Any]],
) -> tuple[list[ReferenceNote], list[dict[str, Any]]]:
    notes: list[ReferenceNote] = []
    diagnostics: list[dict[str, Any]] = []
    for paper in papers:
        item_key = str(paper.get("item_key") or paper.get("itemKey") or "")
        literature_item_id = str(
            paper.get("literature_item_id") or paper.get("literatureItemId") or "",
        )
        try:
            library_id = int(paper.get("library_id") or paper.get("libraryId") or 1)
        except (TypeError, ValueError):
            library_id = 1
        if not item_key:
            continue
        try:
            response = run_bridge(
                bridge,
                [
                    "item",
                    "notes",
                    "--library-id",
                    str(library_id),
                    "--key",
                    item_key,
                    "--limit",
                    "50",
                    "--max-excerpt-chars",
                    "200",
                ],
                timeout=60,
            )
        except Exception as exc:
            diagnostics.append(
                {
                    "item_key": item_key,
                    "source": "zotero_child_notes",
                    "error": str(exc)[:300],
                },
            )
            continue
        note_rows = response.get("data", {}).get("data")
        if not isinstance(note_rows, list):
            continue
        candidates = [
            row
            for row in note_rows
            if isinstance(row, dict)
            and str(row.get("title") or "").strip().lower() == "references"
            and row.get("key")
        ]
        if not candidates:
            continue
        candidates.sort(key=lambda row: int(row.get("htmlLength") or 0), reverse=True)
        note_key = str(candidates[0]["key"])
        notes.append(
            ReferenceNote(
                literature_item_id=literature_item_id,
                library_id=library_id,
                item_key=item_key,
                note_key=note_key,
            ),
        )
        if len(candidates) > 1:
            diagnostics.append(
                {
                    "item_key": item_key,
                    "source": "zotero_child_notes",
                    "warning": "multiple References notes found; selected largest note",
                    "selected_note_key": note_key,
                    "candidate_note_keys": [str(row.get("key")) for row in candidates],
                },
            )
    return notes, diagnostics


def merge_reference_notes(
    db_notes: list[ReferenceNote],
    zotero_notes: list[ReferenceNote],
) -> list[ReferenceNote]:
    by_item_key: dict[str, ReferenceNote] = {note.item_key: note for note in db_notes}
    for note in zotero_notes:
        by_item_key[note.item_key] = note
    return sorted(by_item_key.values(), key=lambda note: note.item_key)


def query_citekey_targets(db_path: Path) -> dict[str, list[CitekeyTarget]]:
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            select i.normalized_value,
                   i.literature_item_id,
                   b.item_key,
                   b.library_id,
                   item.display_title,
                   item.year
            from synt_literature_identifier i
            join synt_zotero_binding b on b.literature_item_id = i.literature_item_id
            join synt_literature_item item on item.literature_item_id = i.literature_item_id
            where i.kind = 'citekey'
              and b.binding_status = 'active'
              and coalesce(b.deleted_at, '') = ''
            order by i.normalized_value, b.item_key
            """,
        ).fetchall()
    targets: dict[str, list[CitekeyTarget]] = defaultdict(list)
    for row in rows:
        citekey = normalize_citekey(row["normalized_value"])
        if not citekey:
            continue
        targets[citekey].append(
            CitekeyTarget(
                citekey=citekey,
                literature_item_id=str(row["literature_item_id"]),
                item_key=str(row["item_key"]),
                library_id=int(row["library_id"]),
                title=str(row["display_title"] or ""),
                year=str(row["year"] or ""),
            ),
        )
    return dict(targets)


def read_payload_citekeys(
    bridge: str,
    note: ReferenceNote,
) -> tuple[dict[int, dict[str, Any]], dict[str, Any]]:
    response = run_bridge(
        bridge,
        [
            "note",
            "payload",
            "--library-id",
            str(note.library_id),
            "--key",
            note.note_key,
            "--payload-type",
            "references-json",
            "--max-chars",
            "1",
        ],
        timeout=90,
    )
    payload = (
        response.get("data", {})
        .get("data", {})
        .get("payload")
    )
    if not isinstance(payload, dict):
        raise RuntimeError("references-json payload missing")
    citekeys: dict[int, dict[str, Any]] = {}
    for entry in payload.get("references") or []:
        if not isinstance(entry, dict):
            continue
        citekey = normalize_citekey(entry.get("citekey"))
        if not citekey:
            continue
        index_value = entry.get("ref_index", entry.get("entry_index"))
        try:
            reference_index = int(index_value)
        except (TypeError, ValueError):
            continue
        citekeys[reference_index] = {
            "citekey": citekey,
            "source": "payload",
            "workflow_version": (payload.get("reference_matching") or {}).get(
                "workflow_version",
                "",
            ),
        }
    return citekeys, {
        "source": "payload",
        "reference_count": len(payload.get("references") or []),
        "trusted_citekey_count": len(citekeys),
    }


def read_html_table_citekeys(
    bridge: str,
    note: ReferenceNote,
) -> tuple[dict[int, dict[str, Any]], dict[str, Any]]:
    response = run_bridge(
        bridge,
        [
            "note",
            "get",
            "--library-id",
            str(note.library_id),
            "--key",
            note.note_key,
            "--format",
            "html",
            "--max-chars",
            "200000",
        ],
        timeout=90,
    )
    content = (
        response.get("data", {})
        .get("data", {})
        .get("content")
    )
    if not isinstance(content, str) or not content:
        raise RuntimeError("note HTML content missing")
    parser = ReferencesTableParser()
    parser.feed(content)
    citekeys: dict[int, dict[str, Any]] = {}
    for row in parser.rows:
        if not row or row[0] == "#":
            continue
        if len(row) < 2:
            continue
        try:
            reference_index = int(row[0]) - 1
        except ValueError:
            continue
        citekey = normalize_citekey(row[1])
        if citekey:
            citekeys[reference_index] = {
                "citekey": citekey,
                "source": "html_table",
                "workflow_version": "",
            }
    return citekeys, {
        "source": "html_table",
        "reference_count": max(len(parser.rows) - 1, 0),
        "trusted_citekey_count": len(citekeys),
    }


def load_trusted_citekeys(
    bridge: str,
    notes: list[ReferenceNote],
) -> tuple[dict[tuple[str, int], dict[str, Any]], list[dict[str, Any]]]:
    trusted: dict[tuple[str, int], dict[str, Any]] = {}
    note_summaries: list[dict[str, Any]] = []
    for note in notes:
        try:
            citekeys, summary = read_payload_citekeys(bridge, note)
        except Exception as payload_error:
            try:
                citekeys, summary = read_html_table_citekeys(bridge, note)
                summary["payload_error"] = str(payload_error)[:300]
            except Exception as html_error:
                note_summaries.append(
                    {
                        "item_key": note.item_key,
                        "note_key": note.note_key,
                        "source": "unreadable",
                        "trusted_citekey_count": 0,
                        "error": str(html_error)[:300],
                        "payload_error": str(payload_error)[:300],
                    },
                )
                continue
        for reference_index, value in citekeys.items():
            trusted[(note.item_key, reference_index)] = {
                **value,
                "source_item_key": note.item_key,
                "source_literature_item_id": note.literature_item_id,
                "reference_index": reference_index,
                "note_key": note.note_key,
            }
        note_summaries.append(
            {
                "item_key": note.item_key,
                "note_key": note.note_key,
                **summary,
            },
        )
    return trusted, note_summaries


def candidate_from_target(target: CitekeyTarget, reason: str) -> dict[str, Any]:
    return {
        "citekey": target.citekey,
        "evidence": ["trusted_reference_note_citekey"],
        "item_key": target.item_key,
        "literature_item_id": target.literature_item_id,
        "reason": reason,
        "title": target.title,
        "year": target.year,
    }


def build_labels(
    references: list[dict[str, Any]],
    trusted_by_ref: dict[tuple[str, int], dict[str, Any]],
    targets_by_citekey: dict[str, list[CitekeyTarget]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    labels: list[dict[str, Any]] = []
    matched: list[dict[str, Any]] = []
    unmapped: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []
    for reference in references:
        reference_id = str(reference.get("reference_instance_id") or "")
        source_item_key = str(reference.get("source_item_key") or "")
        reference_index = int(reference.get("reference_index") or 0)
        trusted = trusted_by_ref.get((source_item_key, reference_index))
        base = {
            "reference_instance_id": reference_id,
            "target_item_key": "",
            "target_literature_item_id": "",
            "suggested_candidates": [],
        }
        if not trusted:
            labels.append(
                {
                    **base,
                    "evidence": [],
                    "label": "external_or_missing",
                    "rationale": (
                        "no trusted citeKey was present in the reference note; "
                        "pending semantic review"
                    ),
                },
            )
            continue

        citekey = normalize_citekey(trusted.get("citekey"))
        targets = targets_by_citekey.get(citekey, [])
        if len(targets) == 1:
            target = targets[0]
            labels.append(
                {
                    **base,
                    "evidence": [
                        "trusted_reference_note_citekey",
                        "old_reference_matching_workflow",
                    ],
                    "label": "match",
                    "rationale": (
                        "trusted citeKey from the old reference matching workflow "
                        "resolves uniquely to an active Zotero-bound library item"
                    ),
                    "suggested_candidates": [
                        candidate_from_target(
                            target,
                            "trusted citeKey resolves uniquely in active library",
                        ),
                    ],
                    "target_item_key": target.item_key,
                    "target_literature_item_id": target.literature_item_id,
                    "trusted_citekey": citekey,
                    "trusted_source": trusted.get("source", ""),
                },
            )
            matched.append(
                {
                    "reference_instance_id": reference_id,
                    "source_item_key": source_item_key,
                    "reference_index": reference_index,
                    "citekey": citekey,
                    "target_item_key": target.item_key,
                    "target_literature_item_id": target.literature_item_id,
                    "parsed_title": reference.get("parsed_title", ""),
                    "target_title": target.title,
                    "year": reference.get("year", ""),
                    "trusted_source": trusted.get("source", ""),
                },
            )
        elif len(targets) > 1:
            candidates = [
                candidate_from_target(
                    target,
                    "trusted citeKey resolves to multiple active library items",
                )
                for target in targets
            ]
            row = {
                **base,
                "evidence": [
                    "trusted_reference_note_citekey_ambiguous",
                    "old_reference_matching_workflow",
                ],
                "label": "ambiguous",
                "rationale": (
                    "trusted citeKey is present, but it resolves to multiple active "
                    "library items and needs manual disambiguation"
                ),
                "suggested_candidates": candidates,
                "trusted_citekey": citekey,
                "trusted_source": trusted.get("source", ""),
            }
            labels.append(row)
            ambiguous.append(
                {
                    "reference_instance_id": reference_id,
                    "source_item_key": source_item_key,
                    "reference_index": reference_index,
                    "citekey": citekey,
                    "candidate_item_keys": [target.item_key for target in targets],
                },
            )
        else:
            row = {
                **base,
                "evidence": [
                    "trusted_reference_note_citekey_unmapped",
                    "old_reference_matching_workflow",
                ],
                "label": "suggested_match",
                "rationale": (
                    "trusted citeKey is present in the reference note, but no active "
                    "Zotero-bound library item currently exposes that citeKey"
                ),
                "trusted_citekey": citekey,
                "trusted_source": trusted.get("source", ""),
            }
            labels.append(row)
            unmapped.append(
                {
                    "reference_instance_id": reference_id,
                    "source_item_key": source_item_key,
                    "reference_index": reference_index,
                    "citekey": citekey,
                    "parsed_title": reference.get("parsed_title", ""),
                    "year": reference.get("year", ""),
                },
            )
    details = {
        "ambiguous_trusted_citekeys": ambiguous,
        "matched_trusted_citekeys": matched,
        "unmapped_trusted_citekeys": unmapped,
    }
    return labels, details


def markdown_report(summary: dict[str, Any], details: dict[str, Any]) -> str:
    label_counts = summary["label_counts"]
    note_source_counts = summary["note_source_counts"]
    lines = [
        "# Trusted CiteKey Gold Label Review",
        "",
        f"Generated at: `{summary['generated_at']}`",
        "",
        "This review set treats citeKeys already written into Zotero reference notes by the old reference matching workflow as trusted evidence.",
        "It does not overwrite `gold-labels.json`; promote it only after review.",
        "",
        "## Counts",
        "",
        f"- References: {summary['reference_count']}",
        f"- Reference notes scanned: {summary['reference_note_count']}",
        f"- Trusted citeKey rows found: {summary['trusted_citekey_count']}",
        f"- Unique mapped trusted matches: {label_counts.get('match', 0)}",
        f"- Unmapped trusted citeKeys: {len(details['unmapped_trusted_citekeys'])}",
        f"- Ambiguous trusted citeKeys: {len(details['ambiguous_trusted_citekeys'])}",
        f"- DB-discovered references notes: {summary.get('db_reference_note_count', 0)}",
        f"- Zotero-discovered references notes: {summary.get('zotero_reference_note_count', 0)}",
        "",
        "## Label Counts",
        "",
    ]
    for label, count in sorted(label_counts.items()):
        lines.append(f"- `{label}`: {count}")
    lines.extend(["", "## Note Sources", ""])
    for source, count in sorted(note_source_counts.items()):
        lines.append(f"- `{source}`: {count}")
    if details["matched_trusted_citekeys"]:
        lines.extend(["", "## Trusted Matches", ""])
        for row in details["matched_trusted_citekeys"][:200]:
            lines.append(
                "- "
                f"`{row['citekey']}`: `{row['source_item_key']}#{row['reference_index']}` "
                f"-> `{row['target_item_key']}` ({row.get('year', '')}) "
                f"{row.get('parsed_title', '')}"
            )
    if details["unmapped_trusted_citekeys"]:
        lines.extend(["", "## Unmapped Trusted CiteKeys", ""])
        for row in details["unmapped_trusted_citekeys"][:200]:
            lines.append(
                "- "
                f"`{row['citekey']}` from `{row['source_item_key']}#{row['reference_index']}` "
                f"({row.get('year', '')}) {row.get('parsed_title', '')}"
            )
        if len(details["unmapped_trusted_citekeys"]) > 200:
            lines.append(
                f"- ... truncated {len(details['unmapped_trusted_citekeys']) - 200} more"
            )
    if details["ambiguous_trusted_citekeys"]:
        lines.extend(["", "## Ambiguous Trusted CiteKeys", ""])
        for row in details["ambiguous_trusted_citekeys"][:200]:
            lines.append(
                "- "
                f"`{row['citekey']}` from `{row['source_item_key']}#{row['reference_index']}` "
                f"candidates: {', '.join(row['candidate_item_keys'])}"
            )
    lines.extend(
        [
            "",
            "## Review Notes",
            "",
            "- `match` rows are high-confidence trusted citeKey positives.",
            "- `suggested_match` rows with `trusted_reference_note_citekey_unmapped` need DB/library citeKey inspection.",
            "- Rows without a trusted citeKey remain `external_or_missing` pending semantic review; this file is a trusted-positive seed, not a complete objective gold answer.",
            "",
        ],
    )
    return "\n".join(lines)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description="Build review gold labels from trusted Zotero reference-note citeKeys.",
    )
    parser.add_argument("--db", required=True, help="Synthesis SQLite DB path.")
    parser.add_argument("--fixture", required=True, help="Fixture directory.")
    parser.add_argument(
        "--out-labels",
        default="gold-labels.trusted-citekey.review.json",
        help="Output labels file name under the fixture directory.",
    )
    parser.add_argument("--report", default="", help="Optional Markdown report path.")
    parser.add_argument("--summary", default="", help="Optional JSON summary path.")
    parser.add_argument("--zotero-bridge", default="zotero-bridge")
    args = parser.parse_args()

    db_path = Path(args.db)
    fixture_dir = Path(args.fixture)
    references_doc = read_json(fixture_dir / "references.json")
    library_doc = read_json(fixture_dir / "library.json")
    references = list(references_doc.get("references") or [])
    papers = list(library_doc.get("papers") or [])
    db_notes = query_reference_notes(db_path)
    zotero_notes, discovery_diagnostics = discover_reference_notes_from_zotero(
        args.zotero_bridge,
        papers,
    )
    notes = merge_reference_notes(db_notes, zotero_notes)
    targets_by_citekey = query_citekey_targets(db_path)
    trusted_by_ref, note_summaries = load_trusted_citekeys(args.zotero_bridge, notes)
    labels, details = build_labels(references, trusted_by_ref, targets_by_citekey)

    label_counts = Counter(str(label.get("label", "")) for label in labels)
    note_source_counts = Counter(
        str(summary.get("source", "")) for summary in note_summaries
    )
    generated_at = utc_now()
    output = {
        "schema": SCHEMA_ID,
        "generated_at": generated_at,
        "source": TRUSTED_SOURCE,
        "labels": labels,
    }
    out_labels_path = fixture_dir / args.out_labels
    write_json(out_labels_path, output)

    summary = {
        "ok": True,
        "schema": SCHEMA_ID,
        "generated_at": generated_at,
        "fixture": str(fixture_dir.as_posix()),
        "labels_file": args.out_labels,
        "reference_count": len(references),
        "reference_note_count": len(notes),
        "db_reference_note_count": len(db_notes),
        "zotero_reference_note_count": len(zotero_notes),
        "trusted_citekey_count": len(trusted_by_ref),
        "active_citekey_count": sum(len(targets) for targets in targets_by_citekey.values()),
        "label_counts": dict(sorted(label_counts.items())),
        "note_source_counts": dict(sorted(note_source_counts.items())),
        "unmapped_trusted_citekey_count": len(details["unmapped_trusted_citekeys"]),
        "ambiguous_trusted_citekey_count": len(details["ambiguous_trusted_citekeys"]),
        "unreadable_note_count": note_source_counts.get("unreadable", 0),
        "details": details,
        "discovery_diagnostics": discovery_diagnostics,
        "note_summaries": note_summaries,
    }
    if args.summary:
        write_json(Path(args.summary), summary)
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(markdown_report(summary, details), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
