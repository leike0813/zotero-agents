from __future__ import annotations

import argparse
import json
from typing import Any


def _dedup_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def _normalize_suggest_tag_objects(values: list[Any]) -> list[dict[str, str]] | None:
    parsed: list[dict[str, str]] = []
    for item in values:
        if not isinstance(item, dict):
            return None
        tag = item.get("tag")
        note = item.get("note")
        if not isinstance(tag, str) or not isinstance(note, str):
            return None
        parsed.append({"tag": tag, "note": note})

    deduped: list[dict[str, str]] = []
    seen_tags: set[str] = set()
    for item in parsed:
        tag = item["tag"]
        if tag in seen_tags:
            continue
        seen_tags.add(tag)
        deduped.append(item)

    return sorted(deduped, key=lambda item: item["tag"])


def normalize_output_data(output_data: Any) -> Any:
    if not isinstance(output_data, dict):
        return output_data

    input_tags = output_data.get("input_tags")
    remove_tags = output_data.get("remove_tags")
    add_tags = output_data.get("add_tags")
    suggest_tags = output_data.get("suggest_tags")

    if isinstance(input_tags, list) and all(isinstance(x, str) for x in input_tags) and isinstance(
        remove_tags, list
    ) and all(isinstance(x, str) for x in remove_tags):
        remove_set = set(remove_tags)
        output_data["remove_tags"] = [t for t in input_tags if t in remove_set]
        output_data["remove_tags"] = _dedup_preserve_order(output_data["remove_tags"])

    if isinstance(add_tags, list) and all(isinstance(x, str) for x in add_tags):
        output_data["add_tags"] = sorted(_dedup_preserve_order(add_tags))

    if isinstance(suggest_tags, list):
        normalized_objects = _normalize_suggest_tag_objects(suggest_tags)
        if normalized_objects is not None:
            output_data["suggest_tags"] = normalized_objects
        elif all(isinstance(x, str) for x in suggest_tags):
            output_data["suggest_tags"] = sorted(_dedup_preserve_order(suggest_tags))

    return output_data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Normalize tag-regulator output JSON (dedup + stable ordering).")
    parser.add_argument("--output", required=True, help="Path to the output JSON to normalize (in-place).")
    args = parser.parse_args(argv)

    with open(args.output, "r", encoding="utf-8") as f:
        data = json.load(f)

    data = normalize_output_data(data)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
