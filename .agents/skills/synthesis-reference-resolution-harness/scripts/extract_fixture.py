#!/usr/bin/env python3
"""Extract a sanitized Synthesis reference-resolution fixture from SQLite."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def clean(value: Any) -> str:
    return str(value or "").strip()


def parse_json_array(value: Any) -> list[Any]:
    text = clean(value)
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def normalize_title(value: Any) -> str:
    text = clean(value).lower()
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def compact_title(value: Any) -> str:
    return re.sub(r"\s+", "", normalize_title(value))


def author_tokens(authors: list[Any]) -> list[str]:
    tokens: set[str] = set()
    for author in authors:
        text = clean(author)
        if not text:
            continue
        first = re.split(r"\s+(?:and|&)\s+", text, maxsplit=1, flags=re.I)[0]
        first = first.split(",", 1)[0]
        parts = normalize_title(first).split()
        if parts and parts[-1] not in {"et", "al"}:
            tokens.add(parts[-1])
    return sorted(tokens)


def sha256_text(value: str) -> str:
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


def all_rows(db: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    db.row_factory = sqlite3.Row
    return [dict(row) for row in db.execute(sql, params).fetchall()]


def load_fixture(db_path: Path) -> dict[str, Any]:
    db = sqlite3.connect(str(db_path))
    try:
        bound_items = all_rows(
            db,
            """
            SELECT
              item.literature_item_id,
              item.display_title,
              item.normalized_title,
              item.year,
              item.authors_json,
              item.status,
              binding.library_id,
              binding.item_key,
              binding.item_type,
              binding.binding_status
            FROM synt_literature_item item
            JOIN synt_zotero_binding binding
              ON binding.literature_item_id = item.literature_item_id
            WHERE item.status = 'active'
              AND binding.binding_status = 'active'
              AND COALESCE(binding.deleted_at, '') = ''
            ORDER BY binding.library_id, binding.item_key
            """,
        )
        identifiers = all_rows(
            db,
            """
            SELECT literature_item_id, kind, normalized_value, display_value
            FROM synt_literature_identifier
            ORDER BY literature_item_id, kind, normalized_value
            """,
        )
        identifiers_by_lit: dict[str, list[dict[str, str]]] = {}
        for row in identifiers:
            identifiers_by_lit.setdefault(clean(row["literature_item_id"]), []).append(
                {
                    "kind": clean(row["kind"]),
                    "value": clean(row["normalized_value"]),
                    "display_value": clean(row["display_value"]),
                }
            )

        binding_by_lit = {
            clean(row["literature_item_id"]): row for row in bound_items
        }
        papers: list[dict[str, Any]] = []
        for row in bound_items:
            authors = parse_json_array(row["authors_json"])
            title = clean(row["display_title"])
            papers.append(
                {
                    "library_id": int(row["library_id"]),
                    "item_key": clean(row["item_key"]),
                    "literature_item_id": clean(row["literature_item_id"]),
                    "paper_ref": f"{int(row['library_id'])}:{clean(row['item_key'])}",
                    "title": title,
                    "normalized_title": clean(row["normalized_title"]) or normalize_title(title),
                    "compact_title": compact_title(title),
                    "year": clean(row["year"]),
                    "authors": authors,
                    "author_tokens": author_tokens(authors),
                    "identifiers": identifiers_by_lit.get(clean(row["literature_item_id"]), []),
                    "item_type": clean(row["item_type"]),
                }
            )

        reference_rows = all_rows(
            db,
            """
            SELECT
              ref.reference_instance_id,
              ref.source_literature_item_id,
              ref.reference_index,
              ref.parsed_title,
              ref.normalized_title,
              ref.year,
              ref.authors_json,
              ref.raw_reference,
              ref.raw_reference_hash,
              res.resolution_id,
              res.target_literature_item_id,
              res.status AS resolution_status,
              res.confidence,
              res.diagnostics_json
            FROM synt_reference_instance ref
            LEFT JOIN synt_reference_resolution res
              ON res.reference_instance_id = ref.reference_instance_id
            ORDER BY ref.source_literature_item_id, ref.reference_index
            """,
        )

        references: list[dict[str, Any]] = []
        labels: list[dict[str, Any]] = []
        for row in reference_rows:
            source = binding_by_lit.get(clean(row["source_literature_item_id"]), {})
            target = binding_by_lit.get(clean(row["target_literature_item_id"]), {})
            authors = parse_json_array(row["authors_json"])
            title = clean(row["parsed_title"])
            raw = clean(row["raw_reference"])
            diagnostics = parse_json_array(row["diagnostics_json"])
            target_item_key = clean(target.get("item_key"))
            target_literature_item_id = clean(row["target_literature_item_id"]) if target else ""
            status = clean(row["resolution_status"]) or "unresolved"
            confidence = clean(row["confidence"])
            references.append(
                {
                    "reference_instance_id": clean(row["reference_instance_id"]),
                    "source_literature_item_id": clean(row["source_literature_item_id"]),
                    "source_item_key": clean(source.get("item_key")),
                    "source_library_id": int(source.get("library_id") or 0),
                    "reference_index": int(row["reference_index"] or 0),
                    "parsed_title": title,
                    "normalized_title": clean(row["normalized_title"]) or normalize_title(title),
                    "compact_title": compact_title(title),
                    "year": clean(row["year"]),
                    "authors": authors,
                    "author_tokens": author_tokens(authors),
                    "raw_reference": raw,
                    "raw_reference_hash": clean(row["raw_reference_hash"]) or sha256_text(raw),
                    "current_resolution": {
                        "status": status,
                        "confidence": confidence,
                        "target_item_key": target_item_key,
                        "target_literature_item_id": target_literature_item_id,
                        "diagnostics": diagnostics,
                    },
                }
            )

            if status == "matched" and target_item_key and target_literature_item_id:
                label = "match"
                evidence = ["current_matched_resolution"]
                rationale = "current resolver matched an active Zotero-bound library item"
            else:
                label = "external_or_missing"
                evidence = []
                rationale = "draft label: review whether a library-paper identity candidate exists"
            labels.append(
                {
                    "reference_instance_id": clean(row["reference_instance_id"]),
                    "label": label,
                    "target_item_key": target_item_key if label == "match" else "",
                    "target_literature_item_id": target_literature_item_id if label == "match" else "",
                    "evidence": evidence,
                    "suggested_candidates": [],
                    "rationale": rationale,
                }
            )

        return {
            "metadata": {
                "schema": "synthesis.reference_resolution_fixture.v1",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source": "synthesis-sqlite",
                "library_count": len(papers),
                "reference_count": len(references),
                "gold_label_count": len(labels),
                "label_counts": {
                    label: sum(1 for row in labels if row["label"] == label)
                    for label in sorted({row["label"] for row in labels})
                },
            },
            "library": {
                "schema": "synthesis.reference_resolution_library_fixture.v1",
                "papers": papers,
            },
            "references": {
                "schema": "synthesis.reference_resolution_references_fixture.v1",
                "references": references,
            },
            "goldLabels": {
                "schema": "synthesis.reference_resolution_gold_labels.v1",
                "labels": labels,
            },
            "dangerPairs": {
                "schema": "synthesis.reference_resolution_danger_pairs.v1",
                "pairs": [],
            },
        }
    finally:
        db.close()


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    if not args.db.exists():
        raise SystemExit(f"database not found: {args.db}")
    args.out.mkdir(parents=True, exist_ok=True)
    fixture = load_fixture(args.db)
    write_json(args.out / "metadata.json", fixture["metadata"])
    write_json(args.out / "library.json", fixture["library"])
    write_json(args.out / "references.json", fixture["references"])
    write_json(args.out / "gold-labels.draft.json", fixture["goldLabels"])
    write_json(args.out / "danger-pairs.json", fixture["dangerPairs"])
    print(
        json.dumps(
            {
                "ok": True,
                "out": str(args.out),
                "library_count": fixture["metadata"]["library_count"],
                "reference_count": fixture["metadata"]["reference_count"],
                "draft_label_counts": fixture["metadata"]["label_counts"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
