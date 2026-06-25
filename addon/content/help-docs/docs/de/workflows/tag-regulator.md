# Tag Regulator

## Zweck

Zotero-Eintrags-Tags basierend auf einem kontrollierten Vokabular normalisieren und die KI mögliche neue Tags inferieren lassen.

Dieser Workflow ruft den Skill `tag-regulator` auf dem Skill-Runner-Backend auf, um zu prüfen, ob Tags dem Vokabular entsprechen, und relevante Tags zu empfehlen.

## Anwendungsfälle

- Batchweises Bereinigen nicht standardisierter Tags
- Automatisch Tags für Einträge basierend auf einem bestehenden kontrollierten Vokabular empfehlen
- Kontinuierliche Aktualisierung und Verfeinerung des kontrollierten Vokabulars aufrechterhalten

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Übergeordneter Eintrag |
| Datenquelle | Vom übergeordneten Eintrag bezogen: aktuelle Tags, Metadaten (Titel, Autoren, Abstract usw.) |

Falls ein von Literature Analysis erstelltes eingebettetes Digest-Markdown-Payload vorhanden ist, lädt der Workflow es automatisch als optionalen Kontext hoch, um die Inferenzqualität zu verbessern.

### Auslösemethoden

- Direkt einen oder mehrere Zotero-Einträge (übergeordnete Einträge) auswählen
- Nach der Auswahl von Einträgen „Tag Regulator" aus dem Kontextmenü wählen

## Ausführungsablauf

```
1. Kontrolliertes Vokabular laden
   └── tagVocabularyJson aus den Zotero-Einstellungen lesen
       └── Die Liste der gültigen Tags im Vokabular parsen

2. Anfrage erstellen
   └── Metadaten des übergeordneten Eintrags und aktuelle Tag-Liste sammeln
       └── Das kontrollierte Vokabular in eine temporäre YAML-Datei schreiben
       └── Zu Skill-Runner hochladen

3. Skill-Runner-Verarbeitung
   └── skill_id: "tag-regulator" aufrufen
       └── Tag-Konformität prüfen
       └── Vorgeschlagene Tags erstellen (suggest_tags)

4. Ergebnisse zurückgeben
   └── Tag-Änderungen anwenden (nicht konforme Tags entfernen, empfohlene Tags hinzufügen)
       └── Vorgeschlagene Tags gegen das aktuelle lokale Vokabular abgleichen
       └── Vorgeschlagene Tags verarbeiten (Popup-Interaktion)
```

### Tag-Verarbeitungslogik

- **remove_tags**: Aktuelle Tags, die nicht im kontrollierten Vokabular sind, werden entfernt
- **add_tags**: Aus Metadaten inferierte Tags, direkt zum Eintrag hinzugefügt
- **suggest_tags**: Von der KI vorgeschlagene neue Tags, erfordern Benutzerbestätigung
- **digest_markdown**: Optionaler Anreicherungskontext, nur hochgeladen, wenn ein eingebettetes Digest-Markdown-Payload vorhanden ist

### Echtzeit-Synchronisierungsregeln

Wenn Ergebnisse zurückgegeben werden, wird der neueste lokale Zustand gelesen:

- Wenn ein `suggest_tag` bereits in das kontrollierte Vokabular aufgenommen wurde, wird kein Popup angezeigt; er nimmt mit `add_tags`-Semantik an der Eintragsaktualisierung teil
- Wenn sich ein `suggest_tag` bereits in der Zwischenablage befindet, wird er nicht erneut in die Zwischenablage geschrieben
- Nur Vorschläge, die unbearbeitet bleiben, gelangen in das Popup

### Geschätzte Dauer

| Szenario | Geschätzte Zeit pro Artikel |
|------|-------------|
| Ohne Digest (Literature Analysis nicht ausgeführt) | Etwa 1 Minute |
| Mit Digest (Literature Analysis bereits ausgeführt) | 1-3 Minuten |

Wenn der Eintrag bereits über einen Digest verfügt, verwendet die KI die Zusammenfassung als zusätzlichen Kontext, was zu präziserer, aber längerer Inferenz führt.

### Popup für vorgeschlagene Tags

Für `suggest_tags` fordert ein Dialog den Benutzer auf, die Vorgehensweise zu wählen:

- **Hinzufügen**: Direkt zum kontrollierten Vokabular hinzufügen
- **Zwischenspeichern**: In die Zwischenablage legen zur späteren Überprüfung
- **Ablehnen**: Den Vorschlag ignorieren
- **Alle hinzufügen / Alle zwischenspeichern / Alle ablehnen**: Batchverarbeitung

Der Dialog hat einen 10-Sekunden-Auto-Zwischenspeicherungs-Countdown; bei Zeitüberschreitung werden Vorschläge automatisch zwischengespeichert.

## Ausgaben

### 1. Tag-Änderungen
- **remove_tags**: Tags, die nicht im Vokabular sind, vom Eintrag entfernen
- **add_tags**: Empfohlene Tags zum Eintrag hinzufügen
- Werden direkt auf die ausgewählten Zotero-Einträge angewendet

### 2. Verarbeitung vorgeschlagener Tags
- Der Benutzer wählt die Vorgehensweise über das Popup
- Akzeptierte Tags: Zur `tagVocabularyJson`-Einstellung hinzugefügt
- Zwischengespeicherte Tags: Zur `tagVocabularyStagedJson`-Einstellung hinzugefügt

## Modell-Empfehlung

🟢 Ein leichtgewichtiges Modell ist ausreichend — Tag-Regulierung ist im Wesentlichen eine einfache Klassifikations- und Zuordnungsaufgabe, die nicht das stärkste Modell erfordert.

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `infer_tag` | boolean | Ob Tag-Inferenz aktiviert werden soll | `true` |
| `valid_tags_format` | string | Vokabularformat | `yaml` |
| `tag_note_language` | string | Sprache für Vorschlagsbeschreibungen | `zh-CN` |

### Verfügbare Werte für valid_tags_format

- `yaml`: YAML-Format verwenden
- `json`: JSON-Format verwenden
- `auto`: Automatisch erkennen

## Abhängigkeiten

- **Kontrolliertes Vokabular**: Ein kontrolliertes Vokabular muss zuerst erstellt werden; siehe [Tags-Verwaltung](#doc/synthesis%2Ftags)
- **Backend**: Skill-Runner-Dienst
- **Backend-Konfiguration**: Konfigurieren Sie einen Skill-Runner-Backend-Typ im Backend Manager
- **Skill**: Der Skill `tag-regulator` muss auf dem Skill-Runner bereitgestellt sein

## Verwandte Workflows

- [Tags-Verwaltung](#doc/synthesis%2Ftags) — Das kontrollierte Tag-Vokabular verwalten
