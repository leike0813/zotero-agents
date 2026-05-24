# Upstream `literature-digest` Representative Image Recommendation

`literature-digest` is externally owned and should not be modified from this repository. A future submodule update can opt in by adding an optional `representative_image` object to `result/result.json`.

Recommended shape:

```json
{
  "representative_image": {
    "status": "selected",
    "source_kind": "markdown_image_ref",
    "label": "Figure 2",
    "caption_quote": "short exact caption fragment",
    "section_hint": "Methods",
    "page_hint": 4,
    "markdown_src_hint": "figures/overview.png",
    "selection_reason": "why this image represents the paper",
    "confidence": "medium"
  }
}
```

Guidance:

- Use `status: "none"` when no image can be selected from textual evidence.
- Do not include image bytes or require all images to be uploaded to Skill Runner.
- Prefer exact caption fragments and figure labels that Host can search deterministically.
- Treat `markdown_src_hint` as a hint only; Host will re-check path safety and file existence.
- For PDF inputs, provide caption/page hints, but Host embedding remains best-effort.
