# Import Literature Bundle

Imports a validated literature bundle ZIP into the current Zotero library. New parents are added to the currently selected collection when the active library row is a real collection.

Every import creates new items without deduplication or reuse of source Zotero ids or keys. Invalid bundles are rejected before library mutation, and a failed parent is cleaned up without preventing other parents from importing.

