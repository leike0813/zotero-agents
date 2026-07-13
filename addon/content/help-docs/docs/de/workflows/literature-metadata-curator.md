# Literature Metadata Curator

## Zweck

Bibliografische Metadaten für einen ausgewählten Zotero-Übergeordneten Eintrag abfragen, korrigieren und vervollständigen. Der Workflow behandelt Fälle wie inkonsistente Titelschreibweise, fehlende Autoren, unvollständige Zeitschriften-/Band-/Seitenfelder, unvollständige DOI/ISBN-Einträge und falsch eingestellte Elementtypen.

## Eingaben

| Parameter | Erforderlich | Beschreibung |
| --- | --- | --- |

Keine benutzerkonfigurierbaren Parameter. Wählen Sie genau einen übergeordneten Eintrag in der Zotero-Elementliste aus. Anhänge und mehrere Einträge werden nicht akzeptiert.

## Verhalten

Der Workflow läuft vollständig automatisch ohne Benutzerbestätigung. Er folgt zwei Pfaden:

1. **Lokaler Schnellpfad**: Wenn der Eintrag einen DOI, ISBN oder eine URL hat, die deterministisch zu einem DOI-, arXiv- oder PubMed-Identifikator auflöst, ruft der Workflow `runtime.hostApi.metadata.translateIdentifier` auf (eine kontrollierte schreibgeschützte Zotero `Translate.Search`-Fassade). Wenn der Kandidaten-Identifikator übereinstimmt und wertvolle bibliografische Informationen enthält, werden die Ergebnisse direkt zurückgeschrieben.
2. **Skill-Runner-Fallback**: Wenn kein zuverlässiger Identifikator vorhanden ist, die lokale Suche keine Ergebnisse liefert, der Übersetzer fehlschlägt, der Kandidat nicht vertrauenswürdig ist oder der Identifikator nicht übereinstimmt, führt der Workflow den Skill `literature-metadata-search` für eine leichtgewichtige webbasierte Metadatenabfrage aus.

Beide Pfade teilen sich dasselbe kanonische Ergebnisformat und denselben Apply-Handler.

### Rückschreibregeln

Der Workflow aktualisiert die bibliografischen Felder des übergeordneten Eintrags:

- Titel, DOI, ISBN, ISSN, URL, Abstract, Datum, Sprache, Bibliothekskatalog
- Zeitschriften-/Konferenz-/Buch-/Dissertations-/Berichtsfelder (Zeitschriftenname, Band/Ausgabe/Seiten, Verlag, Konferenzname, Schule, Berichtstyp usw.)
- Ersteller (Autoren, institutionelle Autoren usw.)
- `itemType`, wenn durch hochvertrauenswürdige Beweise unterstützt (z.B. Zeitschriftenartikel zu Dissertation korrigiert)

Der Workflow modifiziert **nicht** Anhänge, Notizen, Tags, Sammlungen, verwandte Einträge, PDF-Dateien oder Web-Snapshots.

Ohne einen stabilen Identifikator überschreibt der Workflow einen bestehenden Titel oder ändert den Elementtyp nur, wenn: der Kandidat als dasselbe direkte Werk nachgewiesen werden kann, mindestens zwei unabhängige bibliografische Signale übereinstimmen und eine autoritative Landingpage dies bestätigt. Container-Titel werden in das entsprechende Containerfeld geschrieben, anstatt den Werktitel zu ersetzen. Ergebnisse mit niedrigem Vertrauen, widersprüchlichen Kandidaten oder nur vermutete Ergebnisse werden übersprungen.

## Ausgabe und Anwendung

Metadatenänderungen werden direkt auf den ausgewählten Zotero-Übergeordneten Eintrag angewendet. Kein Zwischenschritt zur Bestätigung erforderlich.

## Modell-Empfehlung

- **Schnellpfad-Treffer** (DOI/ISBN/unterstützter URL-Identifikator vorhanden): Kein Backend-Modell erforderlich.
- **Fallback auf `literature-metadata-search`**: Ein Modell mit Websuchfähigkeit wird empfohlen. Die Aufgabe ist eine leichtgewichtige Abruf- und Beweisverifizierung — sie erfordert keine Langform-Schreibfähigkeit, muss aber Homonyme, Preprint- vs. veröffentlichte Versionen, Artikel vs. Dissertationen und verschiedene Ausgaben unterscheiden.

## Abhängigkeiten

- **Backend**: Skill-Runner (für Fallback nach lokaler Suchverfehlung)
- **Skill**: `literature-metadata-search`
- **Zotero Host API**: `metadata.translateIdentifier` (kontrollierte schreibgeschützte Schnellmethode)
- **Apply Handler**: `handlers.parent.updateMetadata`

## Verwandte Workflows

- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Nach neuer Literatur suchen und in Zotero importieren
- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Zusammenfassung und Zitationsanalyse aus PDF/Markdown generieren
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Tags normalisieren, nachdem die Metadaten vollständig sind
