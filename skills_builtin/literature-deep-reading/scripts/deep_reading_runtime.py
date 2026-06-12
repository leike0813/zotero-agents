from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

DB_PATH = Path("runtime/literature-deep-reading.sqlite")
VIEWS_DIR = Path("runtime/views")
SOURCE_DIR = Path("runtime/source")
PAYLOADS_DIR = Path("runtime/payloads")
RESULT_PATH = Path("literature-deep-reading.result.json")
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\n]+)\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.IGNORECASE)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
REFERENCES_HEADING_RE = re.compile(r"\b(references|bibliography)\b|参考文献", re.IGNORECASE)
REFERENCE_ENTRY_RE = re.compile(r"^\s*(?:\[(\d{1,4})\]|(\d{1,4})[\.)])\s+(.+?)\s*$")
REFERENCE_DIGEST_POLICIES = {"all_library_references", "priority_only", "none"}
CITATION_DIRECTIONS = {"incoming", "outgoing", "both"}
READING_ENRICHMENT_FIELDS = {
    "preface_title",
    "preface_cards",
    "preface_reading_path",
    "preface_goal",
    "preface_concepts",
    "preface_warnings",
    "preface_questions",
    "section_notes",
    "concepts",
    "reference_digest_notes",
    "summary_fallback_enabled",
    "summary_fallback_sections",
    "extensions",
}
BLOCK_TRANSLATION_FIELDS = {"translations"}
BLOCK_TRANSLATION_ROW_FIELDS = {"block_id", "translated_markdown", "quality_notes"}
FORMULA_BLOCK_KINDS = {"formula"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def print_json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def normalize_posix(path: Path | str) -> str:
    return str(path).replace("\\", "/")


def resolve_input_path(raw: str, input_path: Path) -> Path:
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    input_relative = (input_path.parent / candidate).resolve()
    if input_relative.exists():
        return input_relative
    return (Path.cwd() / candidate).resolve()


def is_object(value: Any) -> bool:
    return isinstance(value, dict)


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def first_text(*values: Any) -> str:
    for value in values:
        text = clean_text(value)
        if text:
            return text
    return ""


def safe_int(value: Any, fallback: int) -> int:
    try:
        if value is None or value == "":
            return fallback
        return int(value)
    except (TypeError, ValueError):
        return fallback


def clamp_int(value: Any, fallback: int, minimum: int, maximum: int) -> int:
    parsed = safe_int(value, fallback)
    return max(minimum, min(maximum, parsed))


def read_view(name: str, default: Any = None) -> Any:
    return read_json(VIEWS_DIR / name, default)


def source_manifest() -> dict[str, Any]:
    value = read_json(SOURCE_DIR / "source-manifest.json", {})
    return value if isinstance(value, dict) else {}


def bridge_executable(run_root: Path) -> Path:
    env_path = os.environ.get("ZOTERO_BRIDGE_BIN")
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    bridge_dir = run_root / ".zotero-bridge" / "bin"
    candidates.extend(
        [
            bridge_dir / "zotero-bridge.cmd",
            bridge_dir / "zotero-bridge.exe",
            bridge_dir / "zotero-bridge",
        ]
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(f"Host Bridge CLI not found under {bridge_dir}")


def run_bridge_json(run_root: Path, subcommand: list[str], payload: dict[str, Any], input_name: str) -> dict[str, Any]:
    bridge = bridge_executable(run_root)
    input_path = PAYLOADS_DIR / input_name
    write_json(input_path, payload)
    completed = subprocess.run(
        [str(bridge), *subcommand, "--input", f"@runtime/payloads/{input_name}"],
        cwd=str(run_root),
        capture_output=True,
        encoding="utf-8",
        text=True,
        check=False,
    )
    stdout = (completed.stdout or "").strip()
    if completed.returncode != 0:
        raise RuntimeError(stdout or completed.stderr or f"Host Bridge CLI exited with {completed.returncode}")
    parsed = json.loads(stdout or "{}")
    if isinstance(parsed, dict) and parsed.get("ok") is False:
        raise RuntimeError(json.dumps(parsed.get("error") or parsed, ensure_ascii=False))
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def unwrap_bridge_data(output: dict[str, Any]) -> dict[str, Any]:
    data = output.get("data") if isinstance(output.get("data"), dict) else output
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        return data["result"]
    if isinstance(data, dict) and isinstance(data.get("data"), dict):
        return data["data"]
    return data if isinstance(data, dict) else {"value": data}


def safe_extract_zip(bundle_path: Path, extract_dir: Path) -> list[str]:
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    root = extract_dir.resolve()
    with zipfile.ZipFile(bundle_path) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            target = (extract_dir / member.filename).resolve()
            try:
                target.relative_to(root)
            except ValueError as exc:
                raise ValueError(f"Unsafe zip member path: {member.filename}") from exc
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("wb") as dest:
                shutil.copyfileobj(source, dest)
            extracted.append(member.filename.replace("\\", "/"))
    return sorted(extracted)


def slugify(title: str, used: dict[str, int]) -> str:
    base = re.sub(r"[^\w]+", "-", title.lower(), flags=re.UNICODE).strip("-")
    if not base:
        base = "section"
    anchor = f"sec-{base}"
    count = used.get(anchor, 0)
    used[anchor] = count + 1
    if count:
        return f"{anchor}-{count + 1}"
    return anchor


def loose_slug(text: str, prefix: str) -> str:
    base = re.sub(r"[^\w]+", "-", text.lower(), flags=re.UNICODE).strip("-")
    return f"{prefix}-{base or 'item'}"


def stable_id(prefix: str, text: str, used: set[str]) -> str:
    base = loose_slug(text, prefix)
    candidate = base
    counter = 2
    while candidate in used:
        candidate = f"{base}-{counter}"
        counter += 1
    used.add(candidate)
    return candidate


def block_text(block: dict[str, Any]) -> str:
    return str(block.get("source_markdown") or "").strip()


def extract_image_refs(text: str) -> list[str]:
    refs = [match.group(1).strip() for match in MARKDOWN_IMAGE_RE.finditer(text)]
    refs.extend(match.group(1).strip() for match in HTML_IMAGE_RE.finditer(text))
    return refs


def parse_markdown(markdown: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    lines = markdown.splitlines()
    sections: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    used_anchors: dict[str, int] = {}
    current_anchor = "sec-document"
    current_title = "Document"
    current_level = 0
    references_anchor: str | None = None
    after_references = False

    def ensure_default_section() -> None:
        if not sections:
            sections.append(
                {
                    "section_id": "section-0001",
                    "anchor": current_anchor,
                    "title": current_title,
                    "level": current_level,
                    "order_index": 1,
                    "parent_anchor": "",
                    "source_start_block": "",
                    "source_end_block": "",
                }
            )

    def add_section(title: str, level: int) -> str:
        anchor = slugify(title, used_anchors)
        parent_anchor = ""
        for section in reversed(sections):
            if int(section["level"]) < level:
                parent_anchor = str(section["anchor"])
                break
        sections.append(
            {
                "section_id": f"section-{len(sections) + 1:04d}",
                "anchor": anchor,
                "title": title,
                "level": level,
                "order_index": len(sections) + 1,
                "parent_anchor": parent_anchor,
                "source_start_block": "",
                "source_end_block": "",
            }
        )
        return anchor

    def add_block(kind: str, source: str, section_anchor: str, line_start: int, line_end: int) -> None:
        block_id = f"block-{len(blocks) + 1:04d}"
        image_refs = extract_image_refs(source)
        block = {
            "block_id": block_id,
            "kind": kind,
            "section_anchor": section_anchor,
            "order_index": len(blocks) + 1,
            "line_start": line_start,
            "line_end": line_end,
            "source_markdown": source,
            "image_refs": image_refs,
            "translate": not after_references,
        }
        blocks.append(block)
        for section in sections:
            if section["anchor"] == section_anchor:
                if not section["source_start_block"]:
                    section["source_start_block"] = block_id
                section["source_end_block"] = block_id
                break

    i = 0
    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()
        if not stripped:
            i += 1
            continue
        heading = HEADING_RE.match(raw)
        if heading:
            title = heading.group(2).strip()
            current_level = len(heading.group(1))
            current_title = title
            current_anchor = add_section(title, current_level)
            if REFERENCES_HEADING_RE.search(title):
                references_anchor = current_anchor
                after_references = True
            add_block("heading", raw, current_anchor, i + 1, i + 1)
            i += 1
            continue
        ensure_default_section()
        if stripped.startswith("$$"):
            start = i
            collected = [raw]
            i += 1
            while i < len(lines):
                collected.append(lines[i])
                if lines[i].strip().endswith("$$"):
                    i += 1
                    break
                i += 1
            add_block("formula", "\n".join(collected), current_anchor, start + 1, i)
            continue
        if stripped.lower().startswith("<table"):
            start = i
            collected = [raw]
            i += 1
            if "</table>" not in raw.lower():
                while i < len(lines):
                    collected.append(lines[i])
                    if "</table>" in lines[i].lower():
                        i += 1
                        break
                    i += 1
            add_block("table", "\n".join(collected), current_anchor, start + 1, i)
            continue
        if MARKDOWN_IMAGE_RE.search(raw) or HTML_IMAGE_RE.search(raw):
            add_block("image", raw, current_anchor, i + 1, i + 1)
            i += 1
            continue
        start = i
        collected: list[str] = []
        while i < len(lines):
            probe = lines[i]
            probe_stripped = probe.strip()
            if not probe_stripped:
                break
            if HEADING_RE.match(probe) or probe_stripped.startswith("$$") or probe_stripped.lower().startswith("<table"):
                break
            if MARKDOWN_IMAGE_RE.search(probe) or HTML_IMAGE_RE.search(probe):
                break
            collected.append(probe)
            i += 1
        add_block("paragraph", "\n".join(collected), current_anchor, start + 1, i)
    return sections, blocks, references_anchor


def build_image_manifest(extract_dir: Path, blocks: list[dict[str, Any]], source_manifest: dict[str, Any] | None) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    manifest_images = source_manifest.get("images") if isinstance(source_manifest, dict) else None
    if isinstance(manifest_images, list):
        for entry in manifest_images:
            if not isinstance(entry, dict):
                continue
            bundle_path = str(entry.get("bundle_path") or entry.get("path") or "")
            original_src = str(entry.get("original_src") or entry.get("src") or bundle_path)
            if bundle_path:
                seen.add(bundle_path)
            items.append(
                {
                    "image_id": f"image-{len(items) + 1:04d}",
                    "original_src": original_src,
                    "bundle_path": bundle_path,
                    "status": str(entry.get("status") or ("available" if bundle_path and (extract_dir / bundle_path).exists() else "missing")),
                    "reason": str(entry.get("reason") or ""),
                }
            )
    for block in blocks:
        for ref in block.get("image_refs") or []:
            ref_text = str(ref)
            if ref_text in seen:
                continue
            seen.add(ref_text)
            candidate = extract_dir / ref_text
            items.append(
                {
                    "image_id": f"image-{len(items) + 1:04d}",
                    "original_src": ref_text,
                    "bundle_path": ref_text,
                    "status": "available" if candidate.exists() else "missing",
                    "reason": "" if candidate.exists() else "referenced file not found in bundle",
                }
            )
    return {
        "schema_version": "literature-deep-reading.image-manifest.v0",
        "images": items,
        "referenced_count": len(items),
        "available_count": sum(1 for item in items if item["status"] == "available"),
    }


def build_source_structure(sections: list[dict[str, Any]], blocks: list[dict[str, Any]], references_anchor: str | None) -> dict[str, Any]:
    return {
        "schema_version": "literature-deep-reading.source-structure.v0",
        "sections": sections,
        "block_count": len(blocks),
        "references_anchor": references_anchor,
    }


def build_source_reading_view(sections: list[dict[str, Any]], blocks: list[dict[str, Any]]) -> dict[str, Any]:
    blocks_by_section: dict[str, list[dict[str, Any]]] = {}
    for block in blocks:
        blocks_by_section.setdefault(str(block["section_anchor"]), []).append(block)
    section_summaries: list[dict[str, Any]] = []
    for section in sections:
        selected = blocks_by_section.get(str(section["anchor"]), [])
        excerpt_parts: list[str] = []
        for block in selected:
            if block["kind"] == "heading":
                continue
            text = block_text(block)
            if text:
                excerpt_parts.append(text)
            if sum(len(part) for part in excerpt_parts) > 1200:
                break
        section_summaries.append(
            {
                "anchor": section["anchor"],
                "title": section["title"],
                "level": section["level"],
                "block_count": len(selected),
                "excerpt": "\n\n".join(excerpt_parts)[:1400],
            }
        )
    return {
        "schema_version": "literature-deep-reading.source-reading-view.v0",
        "sections": section_summaries,
    }


def build_target_artifacts_view(extract_dir: Path) -> dict[str, Any]:
    artifact_manifest_path = extract_dir / "artifacts" / "artifact-manifest.json"
    manifest = read_json(artifact_manifest_path, {})
    artifacts: list[dict[str, Any]] = []
    if isinstance(manifest, dict):
        raw = manifest.get("artifacts") or manifest.get("items") or []
        if isinstance(raw, list):
            for entry in raw:
                if isinstance(entry, dict):
                    artifacts.append(entry)
    known = [
        ("digest", "artifacts/digest.md", "digest-markdown"),
        ("references", "artifacts/references.json", "references-json"),
        ("citation_analysis", "artifacts/citation-analysis.md", "citation-analysis-markdown"),
        ("citation_analysis", "artifacts/citation_analysis.json", "citation-analysis-json"),
    ]
    for artifact_type, relative, payload_type in known:
        if any(str(item.get("bundle_path") or "") == relative for item in artifacts):
            continue
        path = extract_dir / relative
        artifacts.append(
            {
                "artifact_type": artifact_type,
                "payload_type": payload_type,
                "bundle_path": relative,
                "status": "available" if path.exists() else "missing",
                "sha256": sha256_file(path) if path.exists() else "",
                "bytes": path.stat().st_size if path.exists() else 0,
            }
        )
    return {
        "schema_version": "literature-deep-reading.target-artifacts-view.v0",
        "artifacts": artifacts,
    }


def build_references_seed_view(extract_dir: Path, blocks: list[dict[str, Any]], references_anchor: str | None) -> dict[str, Any]:
    references_path = extract_dir / "artifacts" / "references.json"
    payload = read_json(references_path, None)
    if isinstance(payload, dict):
        references = payload.get("references") or payload.get("items") or []
        if isinstance(references, list):
            return {
                "schema_version": "literature-deep-reading.references-seed-view.v0",
                "source": "artifact",
                "references": references,
                "reference_count": len(references),
            }
    raw_entries: list[dict[str, Any]] = []
    if references_anchor:
        for block in blocks:
            if block.get("section_anchor") != references_anchor or block.get("kind") == "heading":
                continue
            for line in block_text(block).splitlines():
                match = REFERENCE_ENTRY_RE.match(line)
                if match:
                    index = match.group(1) or match.group(2)
                    raw_entries.append({"id": f"ref-{index}", "index": int(index), "raw": match.group(3).strip()})
    return {
        "schema_version": "literature-deep-reading.references-seed-view.v0",
        "source": "markdown" if raw_entries else "none",
        "references": raw_entries,
        "reference_count": len(raw_entries),
    }


def initialize_database(db_path: Path, context: dict[str, Any], sections: list[dict[str, Any]], blocks: list[dict[str, Any]], artifacts: list[dict[str, Any]]) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(
            """
            CREATE TABLE runs (
              run_id TEXT PRIMARY KEY,
              schema_version TEXT NOT NULL,
              target_language TEXT NOT NULL,
              source_kind TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE artifacts (
              artifact_id TEXT PRIMARY KEY,
              artifact_type TEXT NOT NULL,
              payload_type TEXT NOT NULL,
              bundle_path TEXT NOT NULL,
              runtime_path TEXT NOT NULL,
              source TEXT NOT NULL,
              status TEXT NOT NULL,
              sha256 TEXT NOT NULL,
              bytes INTEGER NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE source_sections (
              section_id TEXT PRIMARY KEY,
              anchor TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              level INTEGER NOT NULL,
              order_index INTEGER NOT NULL,
              parent_anchor TEXT NOT NULL,
              source_start_block TEXT NOT NULL,
              source_end_block TEXT NOT NULL
            );
            CREATE TABLE reading_blocks (
              block_id TEXT PRIMARY KEY,
              section_anchor TEXT NOT NULL,
              kind TEXT NOT NULL,
              order_index INTEGER NOT NULL,
              line_start INTEGER NOT NULL,
              line_end INTEGER NOT NULL,
              source_markdown TEXT NOT NULL,
              image_refs_json TEXT NOT NULL,
              translate INTEGER NOT NULL
            );
            CREATE TABLE payload_submissions (
              stage_id TEXT PRIMARY KEY,
              payload_path TEXT NOT NULL,
              schema_id TEXT NOT NULL,
              status TEXT NOT NULL,
              validation_errors_json TEXT NOT NULL,
              submitted_at TEXT NOT NULL
            );
            CREATE TABLE host_context_requests (
              request_id TEXT PRIMARY KEY,
              payload_path TEXT NOT NULL,
              citation_graph_json TEXT NOT NULL,
              topic_context_json TEXT NOT NULL,
              reference_digest_policy_json TEXT NOT NULL,
              concept_policy_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE host_context_exports (
              export_id TEXT PRIMARY KEY,
              capability TEXT NOT NULL,
              request_id TEXT NOT NULL,
              status TEXT NOT NULL,
              output_path TEXT NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE reference_bindings (
              reference_id TEXT PRIMARY KEY,
              reference_index INTEGER NOT NULL,
              title TEXT NOT NULL,
              authors_json TEXT NOT NULL,
              year TEXT NOT NULL,
              raw_json TEXT NOT NULL,
              binding_status TEXT NOT NULL,
              bound_paper_ref TEXT NOT NULL,
              zotero_item_key TEXT NOT NULL,
              match_confidence REAL
            );
            CREATE TABLE reference_digest_artifacts (
              reference_id TEXT PRIMARY KEY,
              bound_paper_ref TEXT NOT NULL,
              status TEXT NOT NULL,
              payload_type TEXT NOT NULL,
              payload_path TEXT NOT NULL,
              digest_markdown TEXT NOT NULL,
              sha256 TEXT NOT NULL,
              bytes INTEGER NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_nodes (
              node_id TEXT PRIMARY KEY,
              kind TEXT NOT NULL,
              title TEXT NOT NULL,
              paper_ref TEXT NOT NULL,
              year TEXT NOT NULL,
              metrics_json TEXT NOT NULL,
              source_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_edges (
              edge_id TEXT PRIMARY KEY,
              source TEXT NOT NULL,
              target TEXT NOT NULL,
              kind TEXT NOT NULL,
              evidence_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_layout (
              node_id TEXT PRIMARY KEY,
              layout_key TEXT NOT NULL,
              x REAL NOT NULL,
              y REAL NOT NULL,
              source TEXT NOT NULL
            );
            CREATE TABLE concepts (
              concept_id TEXT PRIMARY KEY,
              label TEXT NOT NULL,
              aliases_json TEXT NOT NULL,
              kind TEXT NOT NULL,
              definition TEXT NOT NULL,
              source TEXT NOT NULL,
              status TEXT NOT NULL
            );
            CREATE TABLE section_insights (
              section_anchor TEXT PRIMARY KEY,
              reading_goal TEXT NOT NULL,
              concept_refs_json TEXT NOT NULL,
              misread_warnings_json TEXT NOT NULL,
              questions_json TEXT NOT NULL,
              citation_note_json TEXT NOT NULL
            );
            CREATE TABLE block_translations (
              block_id TEXT PRIMARY KEY,
              target_language TEXT NOT NULL,
              translated_markdown TEXT NOT NULL,
              translated_html TEXT NOT NULL,
              status TEXT NOT NULL,
              quality_flags_json TEXT NOT NULL
            );
            """
        )
        now = utc_now()
        conn.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "default",
                "literature-deep-reading.bootstrap.v0",
                context["target_language"],
                context["source_kind"],
                "bootstrapped",
                now,
                now,
                json.dumps(context.get("diagnostics", []), ensure_ascii=False),
            ),
        )
        for index, artifact in enumerate(artifacts, start=1):
            conn.execute(
                "INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    f"artifact-{index:04d}",
                    str(artifact.get("artifact_type") or ""),
                    str(artifact.get("payload_type") or ""),
                    str(artifact.get("bundle_path") or ""),
                    str(artifact.get("runtime_path") or ""),
                    str(artifact.get("source") or ""),
                    str(artifact.get("status") or "missing"),
                    str(artifact.get("sha256") or ""),
                    int(artifact.get("bytes") or 0),
                    json.dumps(artifact.get("diagnostics") or {}, ensure_ascii=False),
                ),
            )
        for section in sections:
            conn.execute(
                "INSERT INTO source_sections VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    section["section_id"],
                    section["anchor"],
                    section["title"],
                    int(section["level"]),
                    int(section["order_index"]),
                    section["parent_anchor"],
                    section["source_start_block"],
                    section["source_end_block"],
                ),
            )
        for block in blocks:
            conn.execute(
                "INSERT INTO reading_blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    block["block_id"],
                    block["section_anchor"],
                    block["kind"],
                    int(block["order_index"]),
                    int(block["line_start"]),
                    int(block["line_end"]),
                    block["source_markdown"],
                    json.dumps(block.get("image_refs") or [], ensure_ascii=False),
                    1 if block.get("translate") else 0,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def ensure_stage10_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS payload_submissions (
          stage_id TEXT PRIMARY KEY,
          payload_path TEXT NOT NULL,
          schema_id TEXT NOT NULL,
          status TEXT NOT NULL,
          validation_errors_json TEXT NOT NULL,
          submitted_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS host_context_requests (
          request_id TEXT PRIMARY KEY,
          payload_path TEXT NOT NULL,
          citation_graph_json TEXT NOT NULL,
          topic_context_json TEXT NOT NULL,
          reference_digest_policy_json TEXT NOT NULL,
          concept_policy_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS host_context_exports (
          export_id TEXT PRIMARY KEY,
          capability TEXT NOT NULL,
          request_id TEXT NOT NULL,
          status TEXT NOT NULL,
          output_path TEXT NOT NULL,
          diagnostics_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reference_bindings (
          reference_id TEXT PRIMARY KEY,
          reference_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          authors_json TEXT NOT NULL,
          year TEXT NOT NULL,
          raw_json TEXT NOT NULL,
          binding_status TEXT NOT NULL,
          bound_paper_ref TEXT NOT NULL,
          zotero_item_key TEXT NOT NULL,
          match_confidence REAL
        );
        CREATE TABLE IF NOT EXISTS reference_digest_artifacts (
          reference_id TEXT PRIMARY KEY,
          bound_paper_ref TEXT NOT NULL,
          status TEXT NOT NULL,
          payload_type TEXT NOT NULL,
          payload_path TEXT NOT NULL,
          digest_markdown TEXT NOT NULL,
          sha256 TEXT NOT NULL,
          bytes INTEGER NOT NULL,
          diagnostics_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_nodes (
          node_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          paper_ref TEXT NOT NULL,
          year TEXT NOT NULL,
          metrics_json TEXT NOT NULL,
          source_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_edges (
          edge_id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          target TEXT NOT NULL,
          kind TEXT NOT NULL,
          evidence_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_layout (
          node_id TEXT PRIMARY KEY,
          layout_key TEXT NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL,
          source TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS concepts (
          concept_id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          aliases_json TEXT NOT NULL,
          kind TEXT NOT NULL,
          definition TEXT NOT NULL,
          source TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS section_insights (
          section_anchor TEXT PRIMARY KEY,
          reading_goal TEXT NOT NULL,
          concept_refs_json TEXT NOT NULL,
          misread_warnings_json TEXT NOT NULL,
          questions_json TEXT NOT NULL,
          citation_note_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS block_translations (
          block_id TEXT PRIMARY KEY,
          target_language TEXT NOT NULL,
          translated_markdown TEXT NOT NULL,
          translated_html TEXT NOT NULL,
          status TEXT NOT NULL,
          quality_flags_json TEXT NOT NULL
        );
        """
    )


def bootstrap(input_path: Path) -> dict[str, Any]:
    input_payload = read_json(input_path, {})
    if not isinstance(input_payload, dict):
        raise ValueError("runtime input must be a JSON object")
    bundle_raw = str(input_payload.get("source_bundle_path") or "").strip()
    if not bundle_raw:
        raise ValueError("runtime input requires source_bundle_path")
    bundle_path = resolve_input_path(bundle_raw, input_path)
    if not bundle_path.exists():
        raise FileNotFoundError(f"source bundle not found: {bundle_path}")

    parameter = input_payload.get("parameter") if isinstance(input_payload.get("parameter"), dict) else {}
    target_language = str(parameter.get("target_language") or input_payload.get("target_language") or "zh-CN")
    extracted = safe_extract_zip(bundle_path, SOURCE_DIR)
    source_manifest = read_json(SOURCE_DIR / "source-manifest.json", {}) or {}
    source_kind = str(source_manifest.get("source_kind") or "mineru_markdown")
    source_md = SOURCE_DIR / "source.md"
    diagnostics: list[dict[str, Any]] = []
    if not source_md.exists():
        diagnostics.append({"severity": "warning", "code": "source_md_missing", "message": "source.md is missing; PDF fallback parsing is deferred."})
        markdown = ""
        source_kind = "pdf_fallback"
    else:
        markdown = source_md.read_text(encoding="utf-8", errors="replace")

    sections, blocks, references_anchor = parse_markdown(markdown)
    if not sections:
        sections = [
            {
                "section_id": "section-0001",
                "anchor": "sec-document",
                "title": "Document",
                "level": 0,
                "order_index": 1,
                "parent_anchor": "",
                "source_start_block": "",
                "source_end_block": "",
            }
        ]
    image_manifest = build_image_manifest(SOURCE_DIR, blocks, source_manifest if isinstance(source_manifest, dict) else {})
    target_artifacts = build_target_artifacts_view(SOURCE_DIR)
    source_structure = build_source_structure(sections, blocks, references_anchor)
    source_reading = build_source_reading_view(sections, blocks)
    references_seed = build_references_seed_view(SOURCE_DIR, blocks, references_anchor)
    missing_images = [item for item in image_manifest["images"] if item.get("status") != "available"]
    for item in missing_images:
        diagnostics.append({"severity": "warning", "code": "image_missing", "image": item.get("bundle_path") or item.get("original_src")})

    context = {
        "target_language": target_language,
        "source_kind": source_kind,
        "diagnostics": diagnostics,
    }
    initialize_database(DB_PATH, context, sections, blocks, target_artifacts["artifacts"])

    write_json(VIEWS_DIR / "source-structure.json", source_structure)
    write_json(VIEWS_DIR / "reading-blocks.json", {"schema_version": "literature-deep-reading.reading-blocks.v0", "blocks": blocks})
    write_json(VIEWS_DIR / "image-manifest.json", image_manifest)
    write_json(VIEWS_DIR / "source-reading-view.json", source_reading)
    write_json(VIEWS_DIR / "target-artifacts-view.json", target_artifacts)
    write_json(VIEWS_DIR / "references-seed-view.json", references_seed)
    write_json(
        VIEWS_DIR / "diagnostics-bootstrap.json",
        {
            "schema_version": "literature-deep-reading.diagnostics-bootstrap.v0",
            "diagnostics": diagnostics,
            "extracted_files": extracted,
            "source_bundle": {
                "path": str(bundle_path),
                "sha256": sha256_file(bundle_path),
                "bytes": bundle_path.stat().st_size,
            },
        },
    )
    result = {
        "kind": "literature_deep_reading_bootstrap",
        "status": "bootstrapped",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "source_structure": normalize_posix(VIEWS_DIR / "source-structure.json"),
            "reading_blocks": normalize_posix(VIEWS_DIR / "reading-blocks.json"),
            "image_manifest": normalize_posix(VIEWS_DIR / "image-manifest.json"),
            "source_reading": normalize_posix(VIEWS_DIR / "source-reading-view.json"),
            "target_artifacts": normalize_posix(VIEWS_DIR / "target-artifacts-view.json"),
            "references_seed": normalize_posix(VIEWS_DIR / "references-seed-view.json"),
        },
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-bootstrap.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def infer_target_refs(manifest: dict[str, Any]) -> dict[str, str]:
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    explicit_ref = first_text(paper.get("paper_ref"), paper.get("paperRef"), paper.get("ref"))
    item_key = first_text(paper.get("item_key"), paper.get("itemKey"), paper.get("key"))
    return {
        "paper_ref": explicit_ref or (f"1:{item_key}" if item_key else ""),
        "graph_start_node_id": f"zotero:item:{item_key}" if item_key else "",
        "item_key": item_key,
        "title": first_text(paper.get("title")),
    }


def validate_context_request_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["context request must be a JSON object"]
    allowed = {
        "main_task",
        "method_family",
        "external_context_section_anchors",
        "request_topic_context",
        "topic_context_reason",
        "request_concept_context",
        "concept_labels",
        "request_citation_graph",
        "citation_graph_depth",
        "citation_graph_direction",
        "citation_graph_max_nodes",
        "citation_graph_max_edges",
        "citation_graph_include_low_signal",
        "reference_digest_policy",
        "priority_reference_indices",
    }
    unknown = sorted(set(payload) - allowed)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))
    structure = read_view("source-structure.json", {})
    anchors = {str(section.get("anchor")) for section in as_list(structure.get("sections")) if isinstance(section, dict)}
    for anchor in as_list(payload.get("external_context_section_anchors")):
        if clean_text(anchor) not in anchors:
            errors.append(f"external_context_section_anchors contains unknown anchor: {anchor}")
    policy = clean_text(payload.get("reference_digest_policy") or "none")
    if policy not in REFERENCE_DIGEST_POLICIES:
        errors.append(f"reference_digest_policy must be one of {sorted(REFERENCE_DIGEST_POLICIES)}")
    direction = clean_text(payload.get("citation_graph_direction") or "both")
    if direction not in CITATION_DIRECTIONS:
        errors.append(f"citation_graph_direction must be one of {sorted(CITATION_DIRECTIONS)}")
    depth = safe_int(payload.get("citation_graph_depth"), 2)
    max_nodes = safe_int(payload.get("citation_graph_max_nodes"), 80)
    max_edges = safe_int(payload.get("citation_graph_max_edges"), 160)
    if depth < 1 or depth > 4:
        errors.append("citation_graph_depth must be between 1 and 4")
    if max_nodes < 1 or max_nodes > 5000:
        errors.append("citation_graph_max_nodes must be between 1 and 5000")
    if max_edges < 1 or max_edges > 20000:
        errors.append("citation_graph_max_edges must be between 1 and 20000")
    for index in as_list(payload.get("priority_reference_indices")):
        if safe_int(index, -1) < 1:
            errors.append(f"priority_reference_indices contains invalid index: {index}")
    return errors


def normalize_context_request(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "main_task": clean_text(payload.get("main_task")),
        "method_family": clean_text(payload.get("method_family")),
        "external_context_section_anchors": [clean_text(item) for item in as_list(payload.get("external_context_section_anchors")) if clean_text(item)],
        "request_topic_context": bool(payload.get("request_topic_context")),
        "topic_context_reason": clean_text(payload.get("topic_context_reason")),
        "request_concept_context": bool(payload.get("request_concept_context")),
        "concept_labels": [clean_text(item) for item in as_list(payload.get("concept_labels")) if clean_text(item)],
        "request_citation_graph": bool(payload.get("request_citation_graph")),
        "citation_graph_depth": clamp_int(payload.get("citation_graph_depth"), 2, 1, 4),
        "citation_graph_direction": clean_text(payload.get("citation_graph_direction") or "both"),
        "citation_graph_max_nodes": clamp_int(payload.get("citation_graph_max_nodes"), 80, 1, 5000),
        "citation_graph_max_edges": clamp_int(payload.get("citation_graph_max_edges"), 160, 1, 20000),
        "citation_graph_include_low_signal": bool(payload.get("citation_graph_include_low_signal")),
        "reference_digest_policy": clean_text(payload.get("reference_digest_policy") or "none"),
        "priority_reference_indices": [safe_int(item, 0) for item in as_list(payload.get("priority_reference_indices")) if safe_int(item, 0) > 0],
    }


def reference_index_from_id(reference_id: str, fallback: int) -> int:
    match = re.search(r"(\d+)$", reference_id)
    return int(match.group(1)) if match else fallback


def normalize_reference(entry: Any, index: int) -> dict[str, Any]:
    raw = entry if isinstance(entry, dict) else {"raw": str(entry)}
    reference_id = first_text(raw.get("id"), raw.get("reference_id"), raw.get("referenceId")) or f"ref-{index}"
    authors = raw.get("authors") or raw.get("author") or []
    if isinstance(authors, str):
        authors_json = [authors]
    elif isinstance(authors, list):
        authors_json = authors
    else:
        authors_json = []
    bound_paper_ref = first_text(raw.get("bound_paper_ref"), raw.get("boundPaperRef"), raw.get("paper_ref"), raw.get("paperRef"))
    item_key = first_text(raw.get("zotero_item_key"), raw.get("zoteroItemKey"), raw.get("item_key"), raw.get("itemKey"))
    binding_status = clean_text(raw.get("binding_status") or raw.get("bindingStatus"))
    if not binding_status:
        binding_status = "library" if bound_paper_ref or item_key else "unresolved"
    if not bound_paper_ref and item_key:
        bound_paper_ref = f"1:{item_key}"
    return {
        "reference_id": reference_id,
        "reference_index": safe_int(raw.get("index"), reference_index_from_id(reference_id, index)),
        "title": first_text(raw.get("title"), raw.get("raw")),
        "authors": authors_json,
        "year": first_text(raw.get("year")),
        "raw": raw,
        "binding_status": binding_status,
        "bound_paper_ref": bound_paper_ref,
        "zotero_item_key": item_key,
        "match_confidence": raw.get("match_confidence") or raw.get("matchConfidence"),
    }


def merge_reference_index_bindings(bindings: list[dict[str, Any]], index_result: dict[str, Any]) -> list[dict[str, Any]]:
    references = as_list(index_result.get("references") or index_result.get("items"))
    by_title: dict[str, dict[str, Any]] = {}
    by_index: dict[int, dict[str, Any]] = {}
    for entry in references:
        if not isinstance(entry, dict):
            continue
        title = clean_text(entry.get("title") or entry.get("reference_title") or entry.get("raw")).lower()
        if title:
            by_title[title] = entry
        idx = safe_int(entry.get("reference_index") or entry.get("index"), 0)
        if idx:
            by_index[idx] = entry
    merged: list[dict[str, Any]] = []
    for binding in bindings:
        if binding["bound_paper_ref"] or binding["zotero_item_key"]:
            merged.append(binding)
            continue
        candidate = by_index.get(binding["reference_index"]) or by_title.get(binding["title"].lower())
        if isinstance(candidate, dict):
            paper_ref = first_text(candidate.get("bound_paper_ref"), candidate.get("boundPaperRef"), candidate.get("paper_ref"), candidate.get("paperRef"))
            item_key = first_text(candidate.get("zotero_item_key"), candidate.get("zoteroItemKey"), candidate.get("item_key"), candidate.get("itemKey"))
            if paper_ref or item_key:
                binding = {
                    **binding,
                    "binding_status": "library",
                    "bound_paper_ref": paper_ref or f"1:{item_key}",
                    "zotero_item_key": item_key,
                    "match_confidence": candidate.get("match_confidence") or candidate.get("matchConfidence"),
                }
        merged.append(binding)
    return merged


def build_reference_bindings(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    seed = read_view("references-seed-view.json", {})
    references = as_list(seed.get("references"))
    bindings = [normalize_reference(entry, index) for index, entry in enumerate(references, start=1)]
    target_refs = infer_target_refs(source_manifest())
    if bindings and target_refs["paper_ref"]:
        try:
            output = run_bridge_json(
                run_root,
                ["reference-index", "get"],
                {"sourceRefs": [target_refs["paper_ref"]], "limit": 250, "artifactCoverage": "all"},
                "reference-index-input.json",
            )
            bindings = merge_reference_index_bindings(bindings, unwrap_bridge_data(output))
            diagnostics.append({"severity": "info", "code": "reference_index_available", "count": len(bindings)})
        except Exception as exc:  # noqa: BLE001
            diagnostics.append({"severity": "warning", "code": "reference_index_unavailable", "message": str(exc)})
    return {
        "schema_version": "literature-deep-reading.reference-bindings-view.v0",
        "source": "references_seed_and_reference_index",
        "items": bindings,
        "target": target_refs,
        "diagnostics": [item for item in diagnostics if str(item.get("code", "")).startswith("reference_")],
    }


def library_bindings_for_policy(bindings: list[dict[str, Any]], context: dict[str, Any]) -> list[dict[str, Any]]:
    policy = context["reference_digest_policy"]
    if policy == "none":
        return []
    selected = [
        item
        for item in bindings
        if item.get("binding_status") == "library" and clean_text(item.get("bound_paper_ref"))
    ]
    if policy == "priority_only":
        priority = set(context["priority_reference_indices"])
        selected = [item for item in selected if safe_int(item.get("reference_index"), 0) in priority]
    return selected


def normalize_exported_digest_items(run_root: Path, bindings: list[dict[str, Any]], export_data: dict[str, Any]) -> list[dict[str, Any]]:
    target_dir = clean_text(export_data.get("targetDir") or export_data.get("target_dir"))
    manifest_path = clean_text(export_data.get("manifestPath") or export_data.get("manifest_path"))
    manifest: dict[str, Any] = {}
    if manifest_path:
        candidate = Path(manifest_path)
        if not candidate.is_absolute():
            candidate = run_root / candidate
        manifest = read_json(candidate, {}) or {}
    artifacts = as_list(manifest.get("artifacts") or manifest.get("items"))
    artifacts_by_paper: dict[str, dict[str, Any]] = {}
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        if clean_text(artifact.get("kind") or artifact.get("artifact_type")) != "digest":
            continue
        paper_ref = first_text(artifact.get("paperRef"), artifact.get("paper_ref"), artifact.get("bound_paper_ref"))
        if paper_ref:
            artifacts_by_paper[paper_ref] = artifact
    items: list[dict[str, Any]] = []
    for binding in bindings:
        paper_ref = clean_text(binding.get("bound_paper_ref"))
        artifact = artifacts_by_paper.get(paper_ref, {})
        content_file = first_text(artifact.get("content_file"), artifact.get("contentFile"), artifact.get("path"), artifact.get("payload_path"))
        candidate: Path | None = None
        if content_file:
            candidate = Path(content_file)
            if not candidate.is_absolute():
                candidate = run_root / content_file
        elif target_dir:
            safe_ref = re.sub(r"[^A-Za-z0-9_.-]+", "_", paper_ref)
            candidate = run_root / target_dir / safe_ref / "digest.md"
        markdown = ""
        status = "missing"
        bytes_value = 0
        sha256 = ""
        if candidate and candidate.exists():
            markdown = candidate.read_text(encoding="utf-8", errors="replace")
            status = "available"
            bytes_value = candidate.stat().st_size
            sha256 = sha256_file(candidate)
        items.append(
            {
                "reference_id": binding["reference_id"],
                "reference_index": binding["reference_index"],
                "bound_paper_ref": paper_ref,
                "zotero_item_key": binding.get("zotero_item_key") or "",
                "title": binding.get("title") or "",
                "digest": {
                    "status": status,
                    "payload_type": "digest-markdown",
                    "markdown": markdown,
                    "html": "",
                    "sha256": sha256,
                    "bytes": bytes_value,
                    "truncated": False,
                },
                "analysis": {},
            }
        )
    return items


def collect_reference_digests(context: dict[str, Any], run_root: Path, bindings: list[dict[str, Any]], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    selected = library_bindings_for_policy(bindings, context)
    paper_refs = sorted({clean_text(item.get("bound_paper_ref")) for item in selected if clean_text(item.get("bound_paper_ref"))})
    if not paper_refs:
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "none",
            "items": [],
            "diagnostics": [{"severity": "info", "code": "reference_digest_no_library_bindings"}],
        }
    try:
        manifest_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "manifest"],
            {"paper_refs": paper_refs, "artifact_types": ["digest"]},
            "paper-artifacts-manifest-input.json",
        )
        export_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "export-filtered"],
            {"run_root": str(run_root), "paper_refs": paper_refs, "artifact_types": ["digest"]},
            "paper-artifacts-export-input.json",
        )
        export_data = unwrap_bridge_data(export_output)
        items = normalize_exported_digest_items(run_root, selected, export_data)
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "host_paper_artifacts",
            "paper_refs": paper_refs,
            "manifest": unwrap_bridge_data(manifest_output),
            "items": items,
            "diagnostics": [],
        }
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "reference_digest_collection_failed", "message": str(exc)})
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "host_paper_artifacts",
            "paper_refs": paper_refs,
            "items": [],
            "diagnostics": [{"severity": "warning", "code": "reference_digest_collection_failed", "message": str(exc)}],
        }


def collect_citation_graph(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    target = infer_target_refs(source_manifest())
    snapshot_empty = {
        "schema_version": "literature-deep-reading.citation-graph-snapshot.v0",
        "source": "none",
        "request": {},
        "raw": {},
        "nodes": [],
        "edges": [],
        "diagnostics": [],
    }
    layout_empty = {
        "schema_version": "literature-deep-reading.citation-graph-layout.v0",
        "source": "none",
        "request": {},
        "raw": {},
        "status": "missing",
        "nodes": [],
        "edges": [],
        "diagnostics": [],
    }
    if not context["request_citation_graph"]:
        return snapshot_empty, layout_empty
    start_node_id = target["graph_start_node_id"]
    paper_ref = target["paper_ref"]
    if not start_node_id and not paper_ref:
        diagnostic = {"severity": "warning", "code": "citation_graph_target_missing"}
        snapshot_empty["diagnostics"] = [diagnostic]
        layout_empty["diagnostics"] = [diagnostic]
        diagnostics.append(diagnostic)
        return snapshot_empty, layout_empty
    request: dict[str, Any] = {
        "depth": context["citation_graph_depth"],
        "direction": context["citation_graph_direction"],
        "maxNodes": context["citation_graph_max_nodes"],
        "maxEdges": context["citation_graph_max_edges"],
        "includeLowSignal": context["citation_graph_include_low_signal"],
    }
    if paper_ref:
        request["paperRef"] = paper_ref
    if start_node_id:
        request["startNodeId"] = start_node_id
    try:
        slice_output = run_bridge_json(run_root, ["citation-graph", "get-slice"], request, "citation-graph-slice-input.json")
        slice_data = unwrap_bridge_data(slice_output)
        snapshot = {
            "schema_version": "literature-deep-reading.citation-graph-snapshot.v0",
            "source": "host_citation_graph_get_slice",
            "start_node_id": start_node_id,
            "paper_ref": paper_ref,
            "request": request,
            "raw": slice_data,
            "nodes": as_list(slice_data.get("nodes")),
            "edges": as_list(slice_data.get("edges")),
            "diagnostics": as_list(slice_data.get("diagnostics")),
        }
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "citation_graph_slice_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        snapshot_empty["source"] = "host_citation_graph_get_slice"
        snapshot_empty["request"] = request
        snapshot_empty["diagnostics"] = [diagnostic]
        snapshot = snapshot_empty
    layout_request = {**request, "preset": "force", "allowTruncated": True}
    try:
        layout_output = run_bridge_json(run_root, ["citation-graph", "get-layout"], layout_request, "citation-graph-layout-input.json")
        layout_data = unwrap_bridge_data(layout_output)
        layout_nodes = as_list(layout_data.get("nodes"))
        layout_edges = as_list(layout_data.get("edges"))
        snapshot_node_ids = {clean_text(node.get("node_id") or node.get("id")) for node in as_list(snapshot.get("nodes")) if isinstance(node, dict)}
        layout_node_ids = {clean_text(node.get("node_id") or node.get("id")) for node in layout_nodes if isinstance(node, dict)}
        mismatch = sorted((snapshot_node_ids ^ layout_node_ids) - {""})
        layout_diagnostics = as_list(layout_data.get("diagnostics"))
        if mismatch:
            layout_diagnostics.append({"severity": "warning", "code": "citation_graph_layout_snapshot_mismatch", "node_ids": mismatch})
        layout = {
            "schema_version": "literature-deep-reading.citation-graph-layout.v0",
            "source": "host_citation_graph_get_layout",
            "request": layout_request,
            "raw": layout_data,
            "ok": bool(layout_data.get("ok")),
            "status": clean_text(layout_data.get("status") or "unknown"),
            "layout_status": clean_text(layout_data.get("layout_status")),
            "graph_hash": clean_text(layout_data.get("graph_hash")),
            "layout_hash": clean_text(layout_data.get("layout_hash")),
            "nodes": layout_nodes,
            "edges": layout_edges,
            "diagnostics": layout_diagnostics,
        }
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "citation_graph_layout_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        layout_empty["source"] = "host_citation_graph_get_layout"
        layout_empty["request"] = layout_request
        layout_empty["diagnostics"] = [diagnostic]
        layout = layout_empty
    return snapshot, layout


def collect_concepts(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    labels = context["concept_labels"]
    if not context["request_concept_context"] or not labels:
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "none",
            "concepts": [],
            "diagnostics": [],
        }
    try:
        output = run_bridge_json(
            run_root,
            ["concepts", "query"],
            {"labels": labels, "limit": max(20, len(labels))},
            "concepts-query-input.json",
        )
        data = unwrap_bridge_data(output)
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "host_concepts_query",
            "request": {"labels": labels},
            "raw": data,
            "concepts": as_list(data.get("concepts")),
            "diagnostics": as_list(data.get("diagnostics")),
        }
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "concepts_query_failed", "message": str(exc)})
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "host_concepts_query",
            "request": {"labels": labels},
            "concepts": [],
            "diagnostics": [{"severity": "warning", "code": "concepts_query_failed", "message": str(exc)}],
        }


def collect_topic_context(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    manifest = source_manifest()
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    topic_id = first_text(paper.get("topic_id"), paper.get("topicId"), manifest.get("topic_id"), manifest.get("topicId"))
    if not context["request_topic_context"]:
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "none", "topic_id": "", "context": {}, "diagnostics": []}
    if not topic_id:
        diagnostic = {"severity": "info", "code": "topic_context_unresolved", "message": "No explicit topic id is available for topics get-context."}
        diagnostics.append(diagnostic)
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "none", "topic_id": "", "context": {}, "diagnostics": [diagnostic]}
    try:
        output = run_bridge_json(run_root, ["topics", "get-context"], {"topicId": topic_id}, "topic-context-input.json")
        data = unwrap_bridge_data(output)
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "host_topics_get_context", "topic_id": topic_id, "context": data, "diagnostics": as_list(data.get("diagnostics"))}
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "topic_context_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "host_topics_get_context", "topic_id": topic_id, "context": {}, "diagnostics": [diagnostic]}


def available_section_anchors() -> set[str]:
    structure = read_view("source-structure.json", {})
    return {clean_text(section.get("anchor")) for section in as_list(structure.get("sections")) if isinstance(section, dict) and clean_text(section.get("anchor"))}


def normalize_question(entry: Any) -> dict[str, str]:
    source = entry if isinstance(entry, dict) else {}
    return {
        "question": clean_text(source.get("question")),
        "answer": clean_text(source.get("answer")),
        "evidence_kind": clean_text(source.get("evidence_kind")),
        "evidence_ref": clean_text(source.get("evidence_ref")),
    }


def normalize_titled_text(entry: Any) -> dict[str, str]:
    source = entry if isinstance(entry, dict) else {}
    return {"title": clean_text(source.get("title")), "body": clean_text(source.get("body"))}


def reference_ids_from_views() -> set[str]:
    ids: set[str] = set()
    for item in as_list(read_view("references-seed-view.json", {}).get("references")):
        if isinstance(item, dict):
            reference_id = first_text(item.get("id"), item.get("reference_id"), item.get("referenceId"))
            if reference_id:
                ids.add(reference_id)
    for item in as_list(read_view("reference-bindings-view.json", {}).get("items")):
        if isinstance(item, dict) and clean_text(item.get("reference_id")):
            ids.add(clean_text(item.get("reference_id")))
    return ids


def validate_reading_enrichment_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["reading enrichment must be a JSON object"]
    unknown = sorted(set(payload) - READING_ENRICHMENT_FIELDS)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))

    anchors = available_section_anchors()
    reference_ids = reference_ids_from_views()

    for field in ["preface_cards", "preface_questions", "section_notes", "concepts", "reference_digest_notes", "summary_fallback_sections", "extensions"]:
        if field in payload and not isinstance(payload.get(field), list):
            errors.append(f"{field} must be an array")

    for index, card in enumerate(as_list(payload.get("preface_cards")), start=1):
        normalized = normalize_titled_text(card)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"preface_cards[{index}] requires title and body")

    for index, question in enumerate(as_list(payload.get("preface_questions")), start=1):
        normalized = normalize_question(question)
        if not normalized["question"] or not normalized["answer"]:
            errors.append(f"preface_questions[{index}] requires question and answer")

    for index, section_note in enumerate(as_list(payload.get("section_notes")), start=1):
        if not isinstance(section_note, dict):
            errors.append(f"section_notes[{index}] must be an object")
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        if not anchor:
            errors.append(f"section_notes[{index}] requires section_anchor")
        elif anchor not in anchors:
            errors.append(f"section_notes[{index}] references unknown section_anchor: {anchor}")
        for question_index, question in enumerate(as_list(section_note.get("questions")), start=1):
            normalized = normalize_question(question)
            if not normalized["question"] or not normalized["answer"]:
                errors.append(f"section_notes[{index}].questions[{question_index}] requires question and answer")
        for role_index, role in enumerate(as_list(section_note.get("citation_reference_roles")), start=1):
            if not isinstance(role, dict):
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] must be an object")
                continue
            reference_id = clean_text(role.get("reference_id"))
            if not reference_id:
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] requires reference_id")
            elif reference_id not in reference_ids:
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] references unknown reference_id: {reference_id}")

    for index, concept in enumerate(as_list(payload.get("concepts")), start=1):
        if not isinstance(concept, dict):
            errors.append(f"concepts[{index}] must be an object")
            continue
        if not clean_text(concept.get("label")):
            errors.append(f"concepts[{index}] requires label")

    for index, note in enumerate(as_list(payload.get("reference_digest_notes")), start=1):
        if not isinstance(note, dict):
            errors.append(f"reference_digest_notes[{index}] must be an object")
            continue
        reference_id = clean_text(note.get("reference_id"))
        if not reference_id:
            errors.append(f"reference_digest_notes[{index}] requires reference_id")
        elif reference_id not in reference_ids:
            errors.append(f"reference_digest_notes[{index}] references unknown reference_id: {reference_id}")

    for index, section in enumerate(as_list(payload.get("summary_fallback_sections")), start=1):
        normalized = normalize_titled_text(section)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"summary_fallback_sections[{index}] requires title and body")

    for index, extension in enumerate(as_list(payload.get("extensions")), start=1):
        normalized = normalize_titled_text(extension)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"extensions[{index}] requires title and body")
    return errors


def normalized_reading_enrichment(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "preface_title": clean_text(payload.get("preface_title")),
        "preface_cards": [normalize_titled_text(item) for item in as_list(payload.get("preface_cards"))],
        "preface_reading_path": [clean_text(item) for item in as_list(payload.get("preface_reading_path")) if clean_text(item)],
        "preface_goal": clean_text(payload.get("preface_goal")),
        "preface_concepts": [clean_text(item) for item in as_list(payload.get("preface_concepts")) if clean_text(item)],
        "preface_warnings": [clean_text(item) for item in as_list(payload.get("preface_warnings")) if clean_text(item)],
        "preface_questions": [normalize_question(item) for item in as_list(payload.get("preface_questions"))],
        "section_notes": as_list(payload.get("section_notes")),
        "concepts": as_list(payload.get("concepts")),
        "reference_digest_notes": as_list(payload.get("reference_digest_notes")),
        "summary_fallback_enabled": bool(payload.get("summary_fallback_enabled")),
        "summary_fallback_sections": [normalize_titled_text(item) for item in as_list(payload.get("summary_fallback_sections"))],
        "extensions": as_list(payload.get("extensions")),
    }


def concept_key(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def normalize_concept_record(entry: Any, source: str, fallback_status: str = "available") -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    label = first_text(entry.get("label"), entry.get("name"), entry.get("title"))
    if not label:
        return None
    aliases = [clean_text(item) for item in as_list(entry.get("aliases") or entry.get("alias")) if clean_text(item)]
    definition = first_text(entry.get("definition"), entry.get("description"))
    return {
        "concept_id": loose_slug(label, "concept"),
        "label": label,
        "aliases": aliases,
        "kind": first_text(entry.get("kind"), entry.get("type")),
        "definition": definition,
        "source": source,
        "status": clean_text(entry.get("status") or fallback_status),
    }


def build_concept_overlay_view(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = read_view("concept-candidates-view.json", {})
    concepts_by_key: dict[str, dict[str, Any]] = {}
    used_ids: set[str] = set()

    for entry in as_list(candidates.get("concepts")):
        concept = normalize_concept_record(entry, "host_concepts_query")
        if not concept:
            continue
        concept["concept_id"] = stable_id("concept", concept["label"], used_ids)
        concepts_by_key[concept_key(concept["label"])] = concept
        for alias in concept["aliases"]:
            concepts_by_key.setdefault(concept_key(alias), concept)

    for entry in as_list(payload.get("concepts")):
        concept = normalize_concept_record(entry, "agent_enrichment")
        if not concept:
            continue
        existing = concepts_by_key.get(concept_key(concept["label"]))
        if existing:
            aliases = sorted({*as_list(existing.get("aliases")), *as_list(concept.get("aliases"))})
            existing.update({key: value for key, value in concept.items() if key not in {"concept_id", "aliases"} and value})
            existing["aliases"] = aliases
            concept = existing
        else:
            concept["concept_id"] = stable_id("concept", concept["label"], used_ids)
        concepts_by_key[concept_key(concept["label"])] = concept
        for alias in as_list(concept.get("aliases")):
            if clean_text(alias):
                concepts_by_key.setdefault(concept_key(clean_text(alias)), concept)

    mentions: dict[str, list[str]] = {}
    keyword_labels: list[str] = []
    for label in as_list(payload.get("preface_concepts")):
        if clean_text(label):
            keyword_labels.append(clean_text(label))
            mentions.setdefault("preface", []).append(clean_text(label))
    for section_note in as_list(payload.get("section_notes")):
        if not isinstance(section_note, dict):
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        for label in as_list(section_note.get("concepts")):
            if clean_text(label):
                keyword_labels.append(clean_text(label))
                mentions.setdefault(anchor, []).append(clean_text(label))

    for label in keyword_labels:
        key = concept_key(label)
        if key in concepts_by_key:
            continue
        concept = {
            "concept_id": stable_id("keyword", label, used_ids),
            "label": label,
            "aliases": [],
            "kind": "keyword",
            "definition": "",
            "source": "reading_aid",
            "status": "keyword_only",
        }
        concepts_by_key[key] = concept
        diagnostics.append({"severity": "info", "code": "concept_keyword_only", "label": label})

    unique_concepts: dict[str, dict[str, Any]] = {}
    for concept in concepts_by_key.values():
        unique_concepts[concept["concept_id"]] = concept
    return {
        "schema_version": "literature-deep-reading.concept-overlay-view.v0",
        "source": "host_candidates_and_agent_enrichment",
        "concepts": sorted(unique_concepts.values(), key=lambda item: item["label"].lower()),
        "mentions_by_anchor": mentions,
        "diagnostics": [item for item in diagnostics if str(item.get("code", "")).startswith("concept_")],
    }


def build_preface_view(payload: dict[str, Any], concept_view: dict[str, Any]) -> dict[str, Any]:
    concepts = {concept_key(item.get("label") or ""): item for item in as_list(concept_view.get("concepts")) if isinstance(item, dict)}
    preface_concepts = []
    for label in as_list(payload.get("preface_concepts")):
        text = clean_text(label)
        if not text:
            continue
        concept = concepts.get(concept_key(text))
        preface_concepts.append(
            {
                "label": text,
                "concept_id": concept.get("concept_id") if concept and concept.get("status") != "keyword_only" else "",
                "status": concept.get("status") if concept else "keyword_only",
            }
        )
    return {
        "schema_version": "literature-deep-reading.preface-view.v0",
        "source": "agent_enrichment",
        "anchor": "preface",
        "title": clean_text(payload.get("preface_title")) or "阅读前导读",
        "goal": clean_text(payload.get("preface_goal")),
        "cards": as_list(payload.get("preface_cards")),
        "reading_path": as_list(payload.get("preface_reading_path")),
        "concepts": preface_concepts,
        "warnings": as_list(payload.get("preface_warnings")),
        "questions": as_list(payload.get("preface_questions")),
    }


def build_section_insights_view(payload: dict[str, Any], concept_view: dict[str, Any]) -> dict[str, Any]:
    concept_by_key = {concept_key(item.get("label") or ""): item for item in as_list(concept_view.get("concepts")) if isinstance(item, dict)}
    items: list[dict[str, Any]] = []
    by_anchor: dict[str, Any] = {}
    for section_note in as_list(payload.get("section_notes")):
        if not isinstance(section_note, dict):
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        concepts = []
        for label in as_list(section_note.get("concepts")):
            text = clean_text(label)
            if not text:
                continue
            concept = concept_by_key.get(concept_key(text))
            concepts.append(
                {
                    "label": text,
                    "concept_id": concept.get("concept_id") if concept and concept.get("status") != "keyword_only" else "",
                    "status": concept.get("status") if concept else "keyword_only",
                }
            )
        citation_note = {
            "body": clean_text(section_note.get("citation_note_body")),
            "reference_roles": [
                {
                    "reference_id": clean_text(role.get("reference_id")) if isinstance(role, dict) else "",
                    "role": clean_text(role.get("role")) if isinstance(role, dict) else "",
                    "note": clean_text(role.get("note")) if isinstance(role, dict) else "",
                }
                for role in as_list(section_note.get("citation_reference_roles"))
                if isinstance(role, dict)
            ],
        }
        item = {
            "section_anchor": anchor,
            "reading_goal": clean_text(section_note.get("reading_goal")),
            "concepts": concepts,
            "misread_warnings": [clean_text(entry) for entry in as_list(section_note.get("misread_warnings")) if clean_text(entry)],
            "questions": [normalize_question(entry) for entry in as_list(section_note.get("questions"))],
            "citation_note": citation_note,
        }
        items.append(item)
        by_anchor[anchor] = item
    return {
        "schema_version": "literature-deep-reading.section-insights-view.v0",
        "source": "agent_enrichment",
        "items": items,
        "by_anchor": by_anchor,
    }


def references_by_id() -> dict[str, dict[str, Any]]:
    bindings = {
        clean_text(item.get("reference_id")): item
        for item in as_list(read_view("reference-bindings-view.json", {}).get("items"))
        if isinstance(item, dict) and clean_text(item.get("reference_id"))
    }
    references: dict[str, dict[str, Any]] = {}
    for index, entry in enumerate(as_list(read_view("references-seed-view.json", {}).get("references")), start=1):
        normalized = normalize_reference(entry, index)
        binding = bindings.get(normalized["reference_id"], {})
        references[normalized["reference_id"]] = {**normalized, **binding, "seed": entry}
    for reference_id, binding in bindings.items():
        references.setdefault(reference_id, binding)
    return references


def digest_items_by_reference_id() -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in as_list(read_view("reference-digests-view.json", {}).get("items")):
        if isinstance(item, dict) and clean_text(item.get("reference_id")):
            result[clean_text(item.get("reference_id"))] = item
    return result


def build_references_view(payload: dict[str, Any]) -> dict[str, Any]:
    seed = read_view("references-seed-view.json", {})
    notes = {
        clean_text(item.get("reference_id")): item
        for item in as_list(payload.get("reference_digest_notes"))
        if isinstance(item, dict) and clean_text(item.get("reference_id"))
    }
    digest_items = digest_items_by_reference_id()
    items: list[dict[str, Any]] = []
    for reference in sorted(references_by_id().values(), key=lambda item: safe_int(item.get("reference_index"), 999999)):
        reference_id = clean_text(reference.get("reference_id"))
        digest_item = digest_items.get(reference_id, {})
        digest = digest_item.get("digest") if isinstance(digest_item.get("digest"), dict) else {}
        digest_available = (
            clean_text(reference.get("binding_status")) == "library"
            and clean_text(digest.get("status")) == "available"
            and bool(clean_text(digest.get("markdown")))
        )
        note = notes.get(reference_id, {})
        items.append(
            {
                "reference_id": reference_id,
                "reference_index": safe_int(reference.get("reference_index"), 0),
                "title": clean_text(reference.get("title")),
                "authors": as_list(reference.get("authors")),
                "year": clean_text(reference.get("year")),
                "raw": reference.get("raw") or reference.get("seed") or {},
                "binding_status": clean_text(reference.get("binding_status") or "unresolved"),
                "bound_paper_ref": clean_text(reference.get("bound_paper_ref")),
                "zotero_item_key": clean_text(reference.get("zotero_item_key")),
                "digest_note": {
                    "role_in_current_paper": clean_text(note.get("role_in_current_paper")) if isinstance(note, dict) else "",
                    "why_open": clean_text(note.get("why_open")) if isinstance(note, dict) else "",
                    "note": clean_text(note.get("note")) if isinstance(note, dict) else "",
                },
                "digest_modal": {
                    "available": digest_available,
                    "title": clean_text(digest_item.get("title") or reference.get("title")) if digest_available else "",
                    "markdown": clean_text(digest.get("markdown")) if digest_available else "",
                    "payload_type": clean_text(digest.get("payload_type")) if digest_available else "",
                },
            }
        )
    return {
        "schema_version": "literature-deep-reading.references-view.v0",
        "source": "references_seed_bindings_and_digests",
        "references_source": seed.get("source") or "none",
        "reference_count": len(items),
        "items": items,
    }


def parse_digest_markdown(markdown: str) -> list[dict[str, str]]:
    sections: list[dict[str, str]] = []
    current_title = "Summary"
    current_lines: list[str] = []
    for line in markdown.splitlines():
        heading = HEADING_RE.match(line)
        if heading:
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append({"title": current_title, "body": body})
            current_title = heading.group(2).strip()
            current_lines = []
        else:
            current_lines.append(line)
    body = "\n".join(current_lines).strip()
    if body:
        sections.append({"title": current_title, "body": body})
    if not sections and markdown.strip():
        sections.append({"title": "Summary", "body": markdown.strip()})
    return sections


def build_summary_view(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    digest_path = SOURCE_DIR / "artifacts" / "digest.md"
    if digest_path.exists():
        markdown = digest_path.read_text(encoding="utf-8", errors="replace")
        return {
            "schema_version": "literature-deep-reading.summary-view.v0",
            "source": "digest_artifact",
            "artifact_path": "artifacts/digest.md",
            "sections": parse_digest_markdown(markdown),
        }
    if payload.get("summary_fallback_enabled"):
        return {
            "schema_version": "literature-deep-reading.summary-view.v0",
            "source": "agent_fallback",
            "sections": as_list(payload.get("summary_fallback_sections")),
        }
    diagnostics.append({"severity": "info", "code": "summary_unavailable"})
    return {
        "schema_version": "literature-deep-reading.summary-view.v0",
        "source": "none",
        "sections": [],
    }


def build_extensions_view(payload: dict[str, Any]) -> dict[str, Any]:
    used: set[str] = set()
    items: list[dict[str, Any]] = []
    for entry in as_list(payload.get("extensions")):
        if not isinstance(entry, dict):
            continue
        title = clean_text(entry.get("title"))
        anchor = clean_text(entry.get("anchor")) or stable_id("extension", title, used)
        if anchor in used:
            anchor = stable_id("extension", title, used)
        else:
            used.add(anchor)
        items.append(
            {
                "anchor": anchor,
                "title": title,
                "body": clean_text(entry.get("body")),
                "links": [
                    {"label": clean_text(link.get("label")), "target": clean_text(link.get("target"))}
                    for link in as_list(entry.get("links"))
                    if isinstance(link, dict) and clean_text(link.get("label")) and clean_text(link.get("target"))
                ],
            }
        )
    return {
        "schema_version": "literature-deep-reading.extensions-view.v0",
        "source": "agent_enrichment",
        "items": items,
    }


def ensure_stage20_tables(conn: sqlite3.Connection) -> None:
    ensure_stage10_tables(conn)


def persist_stage20_db(payload_path: Path, views: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage20_tables(conn)
        now = utc_now()
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_20_reading_enrichment", normalize_posix(payload_path), "literature-deep-reading.reading-enrichment.v0", "valid", "[]", now),
        )
        conn.execute("DELETE FROM concepts")
        for concept in as_list(views.get("concept-overlay-view", {}).get("concepts")):
            if not isinstance(concept, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO concepts VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    clean_text(concept.get("concept_id")),
                    clean_text(concept.get("label")),
                    json.dumps(as_list(concept.get("aliases")), ensure_ascii=False),
                    clean_text(concept.get("kind")),
                    clean_text(concept.get("definition")),
                    clean_text(concept.get("source")),
                    clean_text(concept.get("status")),
                ),
            )
        conn.execute("DELETE FROM section_insights")
        for item in as_list(views.get("section-insights-view", {}).get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO section_insights VALUES (?, ?, ?, ?, ?, ?)",
                (
                    clean_text(item.get("section_anchor")),
                    clean_text(item.get("reading_goal")),
                    json.dumps(as_list(item.get("concepts")), ensure_ascii=False),
                    json.dumps(as_list(item.get("misread_warnings")), ensure_ascii=False),
                    json.dumps(as_list(item.get("questions")), ensure_ascii=False),
                    json.dumps(item.get("citation_note") or {}, ensure_ascii=False),
                ),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("enriched", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def write_invalid_stage20_submission(payload_path: Path, errors: list[str]) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage20_tables(conn)
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_20_reading_enrichment", normalize_posix(payload_path), "literature-deep-reading.reading-enrichment.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
        )
        conn.commit()
    finally:
        conn.close()


def submit_reading_enrichment(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    missing_stage10_views = [
        path
        for path in [
            VIEWS_DIR / "host-context-view.json",
            VIEWS_DIR / "reference-bindings-view.json",
            VIEWS_DIR / "reference-digests-view.json",
            VIEWS_DIR / "concept-candidates-view.json",
        ]
        if not path.exists()
    ]
    if missing_stage10_views:
        raise FileNotFoundError("Stage 10 host context views are missing: " + ", ".join(normalize_posix(path) for path in missing_stage10_views))
    payload_raw = read_json(payload_path, {})
    errors = validate_reading_enrichment_payload(payload_raw)
    if errors:
        write_invalid_stage20_submission(payload_path, errors)
        raise ValueError("; ".join(errors))
    payload = normalized_reading_enrichment(payload_raw)
    diagnostics: list[dict[str, Any]] = []
    concept_overlay = build_concept_overlay_view(payload, diagnostics)
    preface = build_preface_view(payload, concept_overlay)
    section_insights = build_section_insights_view(payload, concept_overlay)
    references = build_references_view(payload)
    summary = build_summary_view(payload, diagnostics)
    extensions = build_extensions_view(payload)
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-enrichment.v0",
        "diagnostics": diagnostics,
    }
    view_map = {
        "preface-view": preface,
        "section-insights-view": section_insights,
        "concept-overlay-view": concept_overlay,
        "references-view": references,
        "summary-view": summary,
        "extensions-view": extensions,
        "diagnostics-enrichment": diagnostics_view,
    }
    for filename, view in view_map.items():
        write_json(VIEWS_DIR / f"{filename}.json", view)
    persist_stage20_db(payload_path, view_map, diagnostics)
    result = {
        "kind": "literature_deep_reading_enriched",
        "status": "enriched",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "preface": normalize_posix(VIEWS_DIR / "preface-view.json"),
            "section_insights": normalize_posix(VIEWS_DIR / "section-insights-view.json"),
            "concept_overlay": normalize_posix(VIEWS_DIR / "concept-overlay-view.json"),
            "references": normalize_posix(VIEWS_DIR / "references-view.json"),
            "summary": normalize_posix(VIEWS_DIR / "summary-view.json"),
            "extensions": normalize_posix(VIEWS_DIR / "extensions-view.json"),
        },
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-enrichment.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def reading_blocks() -> list[dict[str, Any]]:
    view = read_view("reading-blocks.json", {})
    return [item for item in as_list(view.get("blocks")) if isinstance(item, dict)]


def target_language_from_db() -> str:
    if not DB_PATH.exists():
        return "zh-CN"
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute("SELECT target_language FROM runs WHERE run_id = ?", ("default",)).fetchone()
        return clean_text(row[0]) if row and clean_text(row[0]) else "zh-CN"
    finally:
        conn.close()


def quality_notes(value: Any) -> list[str]:
    return [clean_text(item) for item in as_list(value) if clean_text(item)]


def is_table_like(markdown: str) -> bool:
    text = markdown.strip().lower()
    if "<table" in text and "</table>" in text:
        return True
    lines = [line.strip() for line in markdown.splitlines() if line.strip()]
    if len(lines) >= 2 and "|" in lines[0] and "|" in lines[1]:
        return True
    return False


def validate_block_translations_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["block translations must be a JSON object"]
    unknown = sorted(set(payload) - BLOCK_TRANSLATION_FIELDS)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))
    if "translations" not in payload:
        errors.append("translations is required")
        return errors
    if not isinstance(payload.get("translations"), list):
        errors.append("translations must be an array")
        return errors

    blocks = reading_blocks()
    blocks_by_id = {clean_text(block.get("block_id")): block for block in blocks if clean_text(block.get("block_id"))}
    required_block_ids = {
        block_id
        for block_id, block in blocks_by_id.items()
        if bool(block.get("translate")) and clean_text(block.get("kind")) not in FORMULA_BLOCK_KINDS
    }
    seen: set[str] = set()
    submitted_block_ids: set[str] = set()
    for index, row in enumerate(as_list(payload.get("translations")), start=1):
        if not isinstance(row, dict):
            errors.append(f"translations[{index}] must be an object")
            continue
        row_unknown = sorted(set(row) - BLOCK_TRANSLATION_ROW_FIELDS)
        if row_unknown:
            errors.append(f"translations[{index}] has unknown fields: " + ", ".join(row_unknown))
        block_id = clean_text(row.get("block_id"))
        if not block_id:
            errors.append(f"translations[{index}] requires block_id")
            continue
        if block_id in seen:
            errors.append(f"translations[{index}] duplicates block_id: {block_id}")
        seen.add(block_id)
        block = blocks_by_id.get(block_id)
        if not block:
            errors.append(f"translations[{index}] references unknown block_id: {block_id}")
            continue
        if not bool(block.get("translate")):
            errors.append(f"translations[{index}] references non-translatable block_id: {block_id}")
            continue
        translated = clean_text(row.get("translated_markdown"))
        if not translated:
            errors.append(f"translations[{index}] requires translated_markdown")
        if "quality_notes" in row and not isinstance(row.get("quality_notes"), list):
            errors.append(f"translations[{index}].quality_notes must be an array")
        if clean_text(block.get("kind")) == "table" and translated and not is_table_like(translated):
            errors.append(f"translations[{index}] table translation must remain table-like: {block_id}")
        submitted_block_ids.add(block_id)
    missing = sorted(required_block_ids - submitted_block_ids)
    if missing:
        errors.append("missing translations for required blocks: " + ", ".join(missing))
    return errors


def normalize_block_translations(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    submitted: dict[str, dict[str, Any]] = {}
    for row in as_list(payload.get("translations")):
        if isinstance(row, dict) and clean_text(row.get("block_id")):
            submitted[clean_text(row.get("block_id"))] = row
    target_language = target_language_from_db()
    items: list[dict[str, Any]] = []
    for block in reading_blocks():
        block_id = clean_text(block.get("block_id"))
        if not bool(block.get("translate")):
            continue
        kind = clean_text(block.get("kind"))
        row = submitted.get(block_id)
        if row:
            translated = clean_text(row.get("translated_markdown"))
            status = "available"
            notes = quality_notes(row.get("quality_notes"))
        elif kind in FORMULA_BLOCK_KINDS:
            translated = clean_text(block.get("source_markdown"))
            status = "carried_over"
            notes = []
        else:
            continue
        if kind == "table":
            diagnostics.append({"severity": "info", "code": "table_translation_structure_not_deep_verified", "block_id": block_id})
        items.append(
            {
                "block_id": block_id,
                "section_anchor": clean_text(block.get("section_anchor")),
                "kind": kind,
                "source_markdown": clean_text(block.get("source_markdown")),
                "translated_markdown": translated,
                "status": status,
                "quality_notes": notes,
            }
        )
    return {
        "schema_version": "literature-deep-reading.translation-view.v0",
        "source": "agent_block_translations",
        "target_language": target_language,
        "items": items,
        "translated_count": sum(1 for item in items if item.get("status") == "available"),
        "carried_over_count": sum(1 for item in items if item.get("status") == "carried_over"),
    }


def ensure_stage30_tables(conn: sqlite3.Connection) -> None:
    ensure_stage10_tables(conn)


def persist_stage30_db(payload_path: Path, translation_view: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        now = utc_now()
        target_language = clean_text(translation_view.get("target_language")) or "zh-CN"
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_30_block_translation", normalize_posix(payload_path), "literature-deep-reading.block-translations.v0", "valid", "[]", now),
        )
        conn.execute("DELETE FROM block_translations")
        for item in as_list(translation_view.get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO block_translations VALUES (?, ?, ?, ?, ?, ?)",
                (
                    clean_text(item.get("block_id")),
                    target_language,
                    clean_text(item.get("translated_markdown")),
                    "",
                    clean_text(item.get("status")),
                    json.dumps(as_list(item.get("quality_notes")), ensure_ascii=False),
                ),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("translated", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def write_invalid_stage30_submission(payload_path: Path, errors: list[str]) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_30_block_translation", normalize_posix(payload_path), "literature-deep-reading.block-translations.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
        )
        conn.commit()
    finally:
        conn.close()


def submit_block_translations(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    missing_stage20_views = [
        path
        for path in [
            VIEWS_DIR / "preface-view.json",
            VIEWS_DIR / "section-insights-view.json",
            VIEWS_DIR / "concept-overlay-view.json",
            VIEWS_DIR / "references-view.json",
            VIEWS_DIR / "summary-view.json",
            VIEWS_DIR / "extensions-view.json",
        ]
        if not path.exists()
    ]
    if missing_stage20_views:
        raise FileNotFoundError("Stage 20 analysis views are missing: " + ", ".join(normalize_posix(path) for path in missing_stage20_views))
    payload_raw = read_json(payload_path, {})
    errors = validate_block_translations_payload(payload_raw)
    if errors:
        write_invalid_stage30_submission(payload_path, errors)
        raise ValueError("; ".join(errors))
    diagnostics: list[dict[str, Any]] = []
    translation_view = normalize_block_translations(payload_raw, diagnostics)
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-translation.v0",
        "diagnostics": diagnostics,
    }
    write_json(VIEWS_DIR / "translation-view.json", translation_view)
    write_json(VIEWS_DIR / "diagnostics-translation.json", diagnostics_view)
    persist_stage30_db(payload_path, translation_view, diagnostics)
    result = {
        "kind": "literature_deep_reading_translated",
        "status": "translated",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "translation": normalize_posix(VIEWS_DIR / "translation-view.json"),
        },
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-translation.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def persist_stage10_db(context: dict[str, Any], payload_path: Path, views: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage10_tables(conn)
        now = utc_now()
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_10_source_reading_context_request", normalize_posix(payload_path), "literature-deep-reading.context-request.v0", "valid", "[]", now),
        )
        conn.execute(
            "INSERT OR REPLACE INTO host_context_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "context-request-0001",
                normalize_posix(payload_path),
                json.dumps({key: context[key] for key in context if key.startswith("citation_graph_") or key == "request_citation_graph"}, ensure_ascii=False),
                json.dumps({"request_topic_context": context["request_topic_context"]}, ensure_ascii=False),
                json.dumps({"reference_digest_policy": context["reference_digest_policy"], "priority_reference_indices": context["priority_reference_indices"]}, ensure_ascii=False),
                json.dumps({"request_concept_context": context["request_concept_context"], "concept_labels": context["concept_labels"]}, ensure_ascii=False),
                now,
            ),
        )
        for export_index, name in enumerate(["reference-bindings", "reference-digests", "citation-graph-snapshot", "citation-graph-layout", "topic-context", "concept-candidates"], start=1):
            view = views.get(name) or {}
            status_value = clean_text(view.get("status") or ("available" if view.get("source") not in ("", "none") else "missing"))
            conn.execute(
                "INSERT OR REPLACE INTO host_context_exports VALUES (?, ?, ?, ?, ?, ?)",
                (
                    f"host-export-{export_index:04d}",
                    name,
                    "context-request-0001",
                    status_value,
                    normalize_posix(VIEWS_DIR / f"{name}.json"),
                    json.dumps(view.get("diagnostics") or [], ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM reference_bindings")
        for item in as_list(views.get("reference-bindings", {}).get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO reference_bindings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item["reference_id"],
                    int(item["reference_index"]),
                    item.get("title") or "",
                    json.dumps(item.get("authors") or [], ensure_ascii=False),
                    item.get("year") or "",
                    json.dumps(item.get("raw") or {}, ensure_ascii=False),
                    item.get("binding_status") or "",
                    item.get("bound_paper_ref") or "",
                    item.get("zotero_item_key") or "",
                    item.get("match_confidence"),
                ),
            )
        conn.execute("DELETE FROM reference_digest_artifacts")
        for item in as_list(views.get("reference-digests", {}).get("items")):
            if not isinstance(item, dict):
                continue
            digest = item.get("digest") if isinstance(item.get("digest"), dict) else {}
            conn.execute(
                "INSERT OR REPLACE INTO reference_digest_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item.get("reference_id") or "",
                    item.get("bound_paper_ref") or "",
                    digest.get("status") or "missing",
                    digest.get("payload_type") or "digest-markdown",
                    digest.get("payload_path") or "",
                    digest.get("markdown") or "",
                    digest.get("sha256") or "",
                    int(digest.get("bytes") or 0),
                    json.dumps(item.get("diagnostics") or {}, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_nodes")
        for node in as_list(views.get("citation-graph-snapshot", {}).get("nodes")):
            if not isinstance(node, dict):
                continue
            node_id = first_text(node.get("node_id"), node.get("id"))
            if not node_id:
                continue
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_nodes VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    node_id,
                    first_text(node.get("kind"), node.get("type")),
                    first_text(node.get("title"), node.get("label")),
                    first_text(node.get("paper_ref"), node.get("paperRef")),
                    first_text(node.get("year")),
                    json.dumps(node.get("metrics") or {}, ensure_ascii=False),
                    json.dumps(node, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_edges")
        for index, edge in enumerate(as_list(views.get("citation-graph-snapshot", {}).get("edges")), start=1):
            if not isinstance(edge, dict):
                continue
            edge_id = first_text(edge.get("edge_id"), edge.get("id")) or f"edge-{index:04d}"
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_edges VALUES (?, ?, ?, ?, ?)",
                (
                    edge_id,
                    first_text(edge.get("source")),
                    first_text(edge.get("target")),
                    first_text(edge.get("kind"), edge.get("type")),
                    json.dumps(edge.get("evidence") or edge, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_layout")
        layout_view = views.get("citation-graph-layout", {})
        layout_key = first_text(layout_view.get("layout_hash"), layout_view.get("status"), "layout")
        for node in as_list(layout_view.get("nodes")):
            if not isinstance(node, dict):
                continue
            node_id = first_text(node.get("node_id"), node.get("id"))
            if not node_id or node.get("x") is None or node.get("y") is None:
                continue
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_layout VALUES (?, ?, ?, ?, ?)",
                (node_id, layout_key, float(node.get("x")), float(node.get("y")), layout_view.get("source") or ""),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("context_ready", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def submit_context_request(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    payload = read_json(payload_path, {})
    errors = validate_context_request_payload(payload)
    if errors:
        conn = sqlite3.connect(DB_PATH)
        try:
            ensure_stage10_tables(conn)
            conn.execute(
                "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
                ("stage_10_source_reading_context_request", normalize_posix(payload_path), "literature-deep-reading.context-request.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
            )
            conn.commit()
        finally:
            conn.close()
        raise ValueError("; ".join(errors))
    context = normalize_context_request(payload)
    run_root = Path.cwd()
    diagnostics: list[dict[str, Any]] = []
    try:
        bridge_executable(run_root)
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "host_bridge_unavailable", "message": str(exc)})
    reference_bindings = build_reference_bindings(context, run_root, diagnostics)
    reference_digests = collect_reference_digests(context, run_root, as_list(reference_bindings.get("items")), diagnostics)
    citation_snapshot, citation_layout = collect_citation_graph(context, run_root, diagnostics)
    concepts = collect_concepts(context, run_root, diagnostics)
    topic_context = collect_topic_context(context, run_root, diagnostics)
    graph_context = {
        "schema_version": "literature-deep-reading.graph-context.v0",
        "source": "citation_graph_stage_10",
        "snapshot_status": "available" if citation_snapshot.get("nodes") else "missing",
        "layout_status": citation_layout.get("status") or "missing",
        "diagnostics": [],
    }
    host_context = {
        "schema_version": "literature-deep-reading.host-context-view.v0",
        "source": "host_bridge_best_effort",
        "request": context,
        "target": infer_target_refs(source_manifest()),
        "views": {
            "reference_bindings": normalize_posix(VIEWS_DIR / "reference-bindings-view.json"),
            "reference_digests": normalize_posix(VIEWS_DIR / "reference-digests-view.json"),
            "citation_graph_snapshot": normalize_posix(VIEWS_DIR / "citation-graph-snapshot.json"),
            "citation_graph_layout": normalize_posix(VIEWS_DIR / "citation-graph-layout.json"),
            "topic_context": normalize_posix(VIEWS_DIR / "topic-context.json"),
            "graph_context": normalize_posix(VIEWS_DIR / "graph-context.json"),
            "concept_candidates": normalize_posix(VIEWS_DIR / "concept-candidates-view.json"),
        },
        "diagnostics_count": len(diagnostics),
    }
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-host-context.v0",
        "diagnostics": diagnostics,
    }
    view_map = {
        "host-context-view": host_context,
        "reference-bindings-view": reference_bindings,
        "reference-digests-view": reference_digests,
        "citation-graph-snapshot": citation_snapshot,
        "citation-graph-layout": citation_layout,
        "topic-context": topic_context,
        "graph-context": graph_context,
        "concept-candidates-view": concepts,
        "diagnostics-host-context": diagnostics_view,
    }
    for filename, view in view_map.items():
        write_json(VIEWS_DIR / f"{filename}.json", view)
    persist_stage10_db(
        context,
        payload_path,
        {
            "reference-bindings": reference_bindings,
            "reference-digests": reference_digests,
            "citation-graph-snapshot": citation_snapshot,
            "citation-graph-layout": citation_layout,
            "topic-context": topic_context,
            "concept-candidates": concepts,
        },
        diagnostics,
    )
    result = {
        "kind": "literature_deep_reading_context_ready",
        "status": "context_ready",
        "db_path": normalize_posix(DB_PATH),
        "views": host_context["views"],
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-host-context.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def status() -> dict[str, Any]:
    views = {}
    if VIEWS_DIR.exists():
        for path in sorted(VIEWS_DIR.glob("*.json")):
            views[path.stem] = normalize_posix(path)
    return {
        "ok": DB_PATH.exists(),
        "db_path": normalize_posix(DB_PATH),
        "result_path": normalize_posix(RESULT_PATH),
        "views": views,
    }


def validate_bootstrap() -> dict[str, Any]:
    required = [
        DB_PATH,
        VIEWS_DIR / "source-structure.json",
        VIEWS_DIR / "reading-blocks.json",
        VIEWS_DIR / "image-manifest.json",
        VIEWS_DIR / "source-reading-view.json",
        VIEWS_DIR / "target-artifacts-view.json",
        VIEWS_DIR / "references-seed-view.json",
        VIEWS_DIR / "diagnostics-bootstrap.json",
        RESULT_PATH,
    ]
    errors: list[str] = []
    for path in required:
        if not path.exists():
            errors.append(f"missing: {normalize_posix(path)}")
    for path in required:
        if path.suffix == ".json" and path.exists():
            try:
                read_json(path, {})
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(DB_PATH)
            try:
                tables = {
                    row[0]
                    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                }
                for name in ["runs", "artifacts", "source_sections", "reading_blocks"]:
                    if name not in tables:
                        errors.append(f"missing table: {name}")
            finally:
                conn.close()
        except Exception as exc:  # noqa: BLE001
            errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_context_request(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "context-request.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_context_request_payload(payload))
    required_views = [
        VIEWS_DIR / "host-context-view.json",
        VIEWS_DIR / "reference-bindings-view.json",
        VIEWS_DIR / "reference-digests-view.json",
        VIEWS_DIR / "citation-graph-snapshot.json",
        VIEWS_DIR / "citation-graph-layout.json",
        VIEWS_DIR / "topic-context.json",
        VIEWS_DIR / "graph-context.json",
        VIEWS_DIR / "concept-candidates-view.json",
        VIEWS_DIR / "diagnostics-host-context.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "host_context_requests", "host_context_exports", "reference_bindings", "reference_digest_artifacts", "citation_graph_layout"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_reading_enrichment(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "reading-enrichment.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_reading_enrichment_payload(payload))
    required_views = [
        VIEWS_DIR / "preface-view.json",
        VIEWS_DIR / "section-insights-view.json",
        VIEWS_DIR / "concept-overlay-view.json",
        VIEWS_DIR / "references-view.json",
        VIEWS_DIR / "summary-view.json",
        VIEWS_DIR / "extensions-view.json",
        VIEWS_DIR / "diagnostics-enrichment.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "concepts", "section_insights"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                    stage = conn.execute(
                        "SELECT status FROM payload_submissions WHERE stage_id = ?",
                        ("stage_20_reading_enrichment",),
                    ).fetchone()
                    if not stage or stage[0] != "valid":
                        errors.append("missing valid stage_20_reading_enrichment submission")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_block_translations(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "block-translations.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_block_translations_payload(payload))
    required_views = [
        VIEWS_DIR / "translation-view.json",
        VIEWS_DIR / "diagnostics-translation.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "block_translations"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                    stage = conn.execute(
                        "SELECT status FROM payload_submissions WHERE stage_id = ?",
                        ("stage_30_block_translation",),
                    ).fetchone()
                    if not stage or stage[0] != "valid":
                        errors.append("missing valid stage_30_block_translation submission")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Literature deep reading runtime")
    subparsers = parser.add_subparsers(dest="command", required=True)
    bootstrap_parser = subparsers.add_parser("bootstrap")
    bootstrap_parser.add_argument("--input", required=True, help="Path to runtime/input.json")
    context_parser = subparsers.add_parser("submit-context-request")
    context_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/context-request.json")
    enrichment_parser = subparsers.add_parser("submit-reading-enrichment")
    enrichment_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/reading-enrichment.json")
    translation_parser = subparsers.add_parser("submit-block-translations")
    translation_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/block-translations.json")
    subparsers.add_parser("status")
    subparsers.add_parser("validate-bootstrap")
    validate_context_parser = subparsers.add_parser("validate-context-request")
    validate_context_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/context-request.json")
    validate_enrichment_parser = subparsers.add_parser("validate-reading-enrichment")
    validate_enrichment_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/reading-enrichment.json")
    validate_translation_parser = subparsers.add_parser("validate-block-translations")
    validate_translation_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/block-translations.json")
    args = parser.parse_args(argv)
    try:
        if args.command == "bootstrap":
            print_json(bootstrap(Path(args.input)))
            return 0
        if args.command == "submit-context-request":
            print_json(submit_context_request(Path(args.payload)))
            return 0
        if args.command == "submit-reading-enrichment":
            print_json(submit_reading_enrichment(Path(args.payload)))
            return 0
        if args.command == "submit-block-translations":
            print_json(submit_block_translations(Path(args.payload)))
            return 0
        if args.command == "status":
            print_json(status())
            return 0
        if args.command == "validate-bootstrap":
            result = validate_bootstrap()
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-context-request":
            result = validate_context_request(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-reading-enrichment":
            result = validate_reading_enrichment(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-block-translations":
            result = validate_block_translations(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        raise ValueError(f"Unknown command: {args.command}")
    except Exception as exc:  # noqa: BLE001
        error = {
            "kind": "literature_deep_reading_error",
            "status": "failed",
            "db_path": normalize_posix(DB_PATH),
            "views": {},
            "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-bootstrap.json"),
            "final_html_available": False,
            "warnings": [],
            "error": {"message": str(exc), "type": exc.__class__.__name__},
        }
        write_json(RESULT_PATH, error)
        print_json(error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
