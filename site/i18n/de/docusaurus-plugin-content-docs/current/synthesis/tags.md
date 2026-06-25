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
| `status` | Status-Markierung | `status:to_read` |

Tag-Format: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, maximal 120 Zeichen.

## Vocabulary Tab

Auf der Seite Synthesis Workbench → Tags → Vocabulary können Sie:

- **Anzeigen**: Alle definierten kanonischen Tags, mit Status, Facette, Aliasen und Verwendungszähler
- **Hinzufügen**: Neue kanonische Tags erstellen
- **Bearbeiten**: Tag-Metadaten ändern
- **Als veraltet markieren**: Ein Tag als veraltet markieren, optional mit Angabe eines Ersatz-Tags
- **JSON importieren**: Ein Tag-Vokabular aus einer JSON-Datei importieren (Vorschau vor Bestätigung unterstützt)
- **JSON exportieren**: Das aktuelle Vokabular in eine JSON-Datei exportieren

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

Tag-Standardisierung und automatische Inferenz werden durch den [Tag Regulator](../workflows/tag-regulator)-Workflow gesteuert. Die Ausführung dieses Workflows kann Tags basierend auf dem kontrollierten Vokabular automatisch bereinigen und ergänzen.
