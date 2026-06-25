# Export/Import Notes

## Zweck

Die drei Arten von strukturierten Notizen, die von `literature-analysis` erstellt werden (Zusammenfassung, Referenzen, Zitationsanalyse), exportieren und importieren, um die Migration zwischen Zotero-Instanzen zu erleichtern.

:::info Analyseergebnisse bearbeiten
Von [Literature Analysis](#doc/workflows%2Fliterature-analysis) erstellte Notizen werden aus Backend-Daten **gerendert**; das direkte Ändern des Notizinhalts ändert nicht die Backend-Daten. Wenn Sie Analyseergebnisse bearbeiten möchten, ist der korrekte Ansatz: **Notizen exportieren** → die exportierten Dateien ändern → **Notizen importieren** zum Reimportieren verwenden.
:::

## export-notes (Notizen exportieren)

### Anwendungsfälle

- Literaturanalyseergebnisse mit Mitarbeitern teilen
- Analyseergebnisse in einer anderen Zotero-Instanz importieren
- Literaturanalyse-Artefakte sichern

### Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Übergeordneter Eintrag |
| Auswahlmethode | Unterstützt gemischte Auswahl von übergeordneten Einträgen und drei Arten von Notizen |
| Mehrfachauswahlverhalten | Bei Mehrfachauswahl wird nur ein Verzeichnis-Auswahldialog angezeigt |

### Exportierte Artefakte

| Datei | Beschreibung |
|------|------|
| `digest.md` | Literatur-Zusammenfassung Markdown |
| `references.json` | Referenzliste JSON |
| `citation_analysis.json` | Zitationsanalyse-Daten JSON |
| `citation_analysis.md` | Zitationsanalysebericht Markdown |
| `representative_image.jpg` | Repräsentatives Bild (wenn die Zusammenfassungs-Notiz ein eingebettetes Bild enthält) |

Das repräsentative Bild wird als `zs:representative-image:v1` Markdown-Kommentarblock in `digest.md` eingefügt, referenziert über einen relativen Pfad im selben Verzeichnis. Ein fehlgeschlagener Bildexport blockiert nicht den Export von Text- und JSON-Artefakten.

## Geschätzte Dauer

In Sekunden abgeschlossen (rein lokale Dateivorgänge, kein Backend erforderlich).

## import-notes (Notizen importieren)

### Anwendungsfälle

- Literaturanalyseergebnisse in einer anderen Zotero-Instanz wiederherstellen
- Von Mitarbeitern geteilte Analyse-Artefakte importieren

### Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Einzelner übergeordneter Eintrag |
| Importmethode | Ein Verzeichnis mit exportierten Artefakten auswählen |

### Importablauf

```
1. Importverzeichnis auswählen
   └── Verzeichnis sollte digest.md, references.json, citation_analysis.json enthalten

2. Strukturvalidierung
   └── references.json und citation_analysis.json werden vor der Kandidatur strukturell validiert
       └── Validierungsfehler zeigen eine Warnung, blockieren aber nicht den Import anderer Artefakte

3. Bildanalyse
   └── Wenn digest.md einen zs:representative-image:v1-Markerblock enthält
       └── Automatisch das repräsentative Bild aus demselben Verzeichnis parsen
       └── Benutzer kann das repräsentative Bild auch manuell auswählen oder löschen

4. Schreiben
   └── Entsprechende Notizen unter dem übergeordneten Eintrag erstellen/aktualisieren
```

Ein fehlgeschlagener Bildimport blockiert nicht den Import der Zusammenfassungs-Notiz.

## Abhängigkeiten

- Keine Backend-Verbindung erforderlich
- Basieren nur auf dem lokalen Zotero-Speicher

## Verwandte Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Die drei Arten von exportierbaren Notizen erstellen
