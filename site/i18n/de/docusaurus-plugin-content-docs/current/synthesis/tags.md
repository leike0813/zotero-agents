# Tag-Verwaltung

## Was ist Tag-Vokabular?

Tag-Vokabular ist ein standardisiertes Tagging-System für die konsistente Annotation von Literatur. Im Gegensatz zu Zoteros nativen Freiform-Tags folgen Tags in einem kontrollierten Vokabular einheitlichen Namenskonventionen, was Statistik und Abruf erleichtert.

## Facetten

Jedes Tag gehört zu einer Facette (Dimension). Derzeit werden folgende Facetten unterstützt:

| Facette | Beschreibung | Beispiel |
|---------|-------------|----------|
| `field` | Forschungsfeld | `field:natural_language_processing` |
| `topic` | Forschungsthema | `topic:transformer_architecture` |
| `method` | Forschungsmethode | `method:reinforcement_learning` |
| `model` | Verwendetes Modell | `model:gpt-4` |
| `ai_task` | KI-Aufgabentyp | `ai_task:text_summarization` |
| `data` | Datensatz | `data:imagenet` |
| `tool` | Werkzeug | `tool:python` |
| `status` | Workflow-Aufgabe | `status:need-analysis` |

Tag-Format: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, maximal 120 Zeichen.

## Vocabulary Tab

Auf der Seite Synthesis Workbench → Tags → Vocabulary können Sie:

- **Anzeigen**: Alle definierten kanonischen Tags, mit Status, Facette, Aliasen und Verwendungszähler
- **Hinzufügen**: Neue kanonische Tags erstellen
- **Bearbeiten**: Tag-Metadaten ändern
- **Als veraltet markieren**: Ein Tag als veraltet markieren, optional mit Angabe eines Ersatz-Tags
- **JSON importieren**: Ein Tag-Vokabular aus einer JSON-Datei importieren (Vorschau vor Bestätigung unterstützt)
- **JSON exportieren**: Das aktuelle Vokabular in eine JSON-Datei exportieren

Die fünf eingebauten Workflow-Status werden beim Plugin-Start initialisiert. Ihr Tag, Facet, ihre Quelle, ihr Veraltungsstatus und ihre Ersetzung können nicht geändert oder gelöscht werden; Notizen bleiben bearbeitbar und Aliase weiterhin den normalen Governance-Pfad verwenden. Eigene `status:*`-Einträge behalten dieselben Verwaltungskontrollen wie andere eigene Vokabulareinträge. Importe können eingebaute Notizen und Aliase aktualisieren, aber das Weglassen eines Eingebauten oder das Ändern seiner geschützten Identität kann ihn nicht entfernen oder ersetzen.

![Synthesis Tags Page](/img/docs/synthesis/tags.png)

Tag-Status:
- `active`: Aktiv
- `deprecated`: Veraltet (hat ein Ersatz-Tag)
- `warning`: Warnung (möglicherweise Überprüfung erforderlich)

## Staged Tab (Ausstehende Tags)

Der **tag-regulator**-Skill analysiert automatisch Literaturmetadaten und generiert kontrollierte Tag-Vorschläge, die auf der Staged-Seite angezeigt werden.

### Genehmigungs-Workflow

1. Prüfen Sie die Liste der vorgeschlagenen Tags
2. Für jedes Tag können Sie:
   - **Hochstufen**: Das Tag zum kanonischen Vokabular hinzufügen
   - **Verwerfen**: Den Vorschlag ablehnen
   - **Staged leeren**: Alle Vorschläge gesammelt verwerfen

### Import-/Export-Format

Das Tag-Vokabular unterstützt JSON-Format-Import/Export (TagVocab-Format), was Folgendes ermöglicht:

- Bibliotheksübergreifende Migration von Tag-Systemen
- Team-Teilung von Tag-Konventionen
- Sicherung und Versionskontrolle

## Zugehöriger Workflow

`status` beschreibt offene Workflow-Aufgaben, nicht den Lesefortschritt. Ein Eintrag kann keine, eine oder mehrere Status-Tags haben. Die fünf eingebauten Definitionen:

- `status:need-metadata-curation`
- `status:need-fulltext`
- `status:need-markdown`
- `status:need-analysis`
- `status:need-deep-reading`

Tag Bootstrapper muss nicht ausgeführt werden, um sie zu erstellen. Tag Bootstrapper fügt nur eigene Vokabulareinträge hinzu, während [Tag Regulator](../workflows/tag-regulator) gewöhnliche kontrollierte Tags prüfen kann, aber eingebaute Workflow-Status auf Literatureinträgen weder hinzufügen noch entfernen darf. Keiner der beiden Workflows darf einen eingebauten Status aus Thema, Sprache, Metadaten oder Volltext einer Arbeit ableiten.

| Ereignis | Zum Eintrag hinzufügen | Vom Eintrag entfernen |
|----------|------------------------|------------------------|
| Search erstellt einen Eintrag | Markdown, Analyse und Deep Reading; Metadaten/Volltext wenn das Ergebnis sie benötigt | — |
| Search verwendet einen Eintrag wieder | Nur Metadaten/Volltext, die dieses Ergebnis explizit benötigt | — |
| Metadata Curator erfolgreich oder bestätigt keine Änderung | — | Metadata Curation |
| MinerU schreibt Markdown und fügt es an | — | Markdown und Volltext |
| Literature Analysis schreibt formale Artefakte | — | Analyse |
| Literature Deep Reading schreibt HTML und fügt es an | — | Deep Reading |

Fehlgeschlagene, übersprungene, abgebrochene oder nicht angewendete Ausführungen löschen keinen Status. Wenn ein Artefakt erfolgreich ist, aber die Statusbereinigung fehlschlägt, bleibt das Artefakt erhalten und die Ausführung meldet eine Teilwarnung. Ein manuell angehängtes PDF entfernt `status:need-fulltext` nicht automatisch.
