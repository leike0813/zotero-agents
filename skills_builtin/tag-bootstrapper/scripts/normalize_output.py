from __future__ import annotations

import argparse
import json
from typing import Any


def _as_nonempty_string(value: Any) -> str:
    return str(value or "").strip()


def _facet_from_tag(tag: str) -> str:
    return tag.split(":", 1)[0] if ":" in tag else ""


def _normalize_add_tag_objects(values: Any) -> list[dict[str, str]] | None:
    if not isinstance(values, list):
        return None

    parsed: list[dict[str, str]] = []
    for item in values:
        if not isinstance(item, dict):
            return None
        tag = _as_nonempty_string(item.get("tag"))
        note = _as_nonempty_string(item.get("note"))
        if not tag or not note:
            return None
        facet = _as_nonempty_string(item.get("facet")) or _facet_from_tag(tag)
        normalized = {"tag": tag, "note": note}
        if facet:
            normalized["facet"] = facet
        parsed.append(normalized)

    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in parsed:
        key = item["tag"].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return sorted(deduped, key=lambda item: item["tag"].lower())


def _normalize_warnings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [text for text in (_as_nonempty_string(item) for item in value) if text]


def normalize_output_data(output_data: Any) -> Any:
    if not isinstance(output_data, dict):
        return output_data

    normalized_tags = _normalize_add_tag_objects(output_data.get("add_tags"))
    if normalized_tags is not None:
        output_data["add_tags"] = normalized_tags

    output_data["warnings"] = _normalize_warnings(output_data.get("warnings"))
    return output_data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Normalize tag-bootstrapper output JSON (dedupe + stable ordering).",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to the output JSON to normalize in place.",
    )
    args = parser.parse_args(argv)

    with open(args.output, "r", encoding="utf-8") as file:
        data = json.load(file)

    data = normalize_output_data(data)

    with open(args.output, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
