# Literature Translator

Translate a selected literature attachment into a target language.

The workflow selects one Markdown or PDF source per parent item using the same source selection policy as Literature Analysis. It sends the source path to the builtin `literature-translator` skill through an ACP sequence request.

On success, the workflow writes only the final translated Markdown next to the source file as `<source-name>_<target-language>.md` and links that Markdown file back to the Zotero parent item. Alignment, glossary, and QA report JSON files remain in the skill run workspace.
