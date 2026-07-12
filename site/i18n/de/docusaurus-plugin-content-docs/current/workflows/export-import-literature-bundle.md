# Export/Import Literature Bundle

## Zweck

Portable ZIP-Bundles von Zotero-Übergeordneten Einträgen mit ihren Metadaten, Tags, Kindnotizen, Anhängen, eingebetteten Bildern und Beziehungen zwischen Einträgen exportieren und importieren, um die Migration zwischen Zotero-Instanzen oder die Zusammenarbeit mit anderen Forschern zu erleichtern.

## Export Literature Bundle

### Anwendungsfälle

- Ausgewählte Zotero-Einträge als eigenständiges ZIP sichern
- Literatur mit Mitarbeitern teilen, die eine andere Zotero-Bibliothek verwenden
- Einträge zur späteren Importierung in eine andere Zotero-Instanz übertragen

### Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Übergeordneter Eintrag |
| Auswahl | Ein oder mehrere übergeordnete Einträge; Anhänge, Notizen und Kindelemente dürfen nicht gemischt werden |
| Ausgabe | Benutzer wählt ZIP-Speicherort; `.zip`-Erweiterung wird automatisch angehängt, falls fehlend |

### Verhalten

1. Validieren, dass alle ausgewählten Einträge übergeordnete Einträge sind (keine Anhänge, Notizen oder Kindelemente erlaubt).
2. Bibliografische Metadaten, Tags, Kindnotizen mit eingebetteten Bildern, lesbare lokale Anhänge und Link-URL-Anhänge für jeden übergeordneten Eintrag sammeln.
3. Für Markdown-Anhänge lokale Bildreferenzen in Bundle-relative Pfade umschreiben und die referenzierten Bilder einbeziehen.
4. Beziehungen zwischen Einträgen nur zwischen übergeordneten Einträgen aufzeichnen, die im selben Batch exportiert werden.
5. `manifest.json` mit Formatversion, Dateibestandsliste, Integritätsdaten und etwaigen Exportwarnungen schreiben.
6. Alles in eine ZIP-Datei am vom Benutzer gewählten Ort verpacken.

Fehlende lokale Dateien werden mit einer Warnung übersprungen; entfernte Bilder in Markdown werden unverändert beibehalten (nicht heruntergeladen). Das Abbrechen des Speicherdialogs bricht den Export ab.

### Ausgaben

| Artefakt | Beschreibung |
|----------|-------------|
| `manifest.json` | Formatversion, Dateibestandsliste, Integritätsinformationen, Exportwarnungen, Beziehungen zwischen Einträgen |
| Metadaten des übergeordneten Eintrags | Portable bibliografische Informationen und Tags pro übergeordnetem Eintrag |
| Kindnotizen | Notizen mit eingebetteten Bildern |
| Anhänge | Lesbare lokale Anhänge; Markdown-Anhänge mit begleitenden lokalen Bildern |
| Link-URL-Anhänge | Linkinformationen |

## Import Literature Bundle

### Anwendungsfälle

- Ein zuvor exportiertes Literaturbündel in die aktuelle Zotero-Bibliothek wiederherstellen
- Von einem Mitarbeiter geteilte Literatur importieren

### Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Workflow (keine Zotero-Elementauswahl erforderlich) |
| Importmethode | ZIP-Datei auswählen, die von Export Literature Bundle erstellt wurde |
| Collection-Kontext | Wenn eine echte Collection in der aktuellen Ansicht ausgewählt ist, werden neue Einträge zu ihr hinzugefügt; andernfalls werden Einträge in das Bibliotheksstammverzeichnis importiert |

### Verhalten

1. Das Bundle validieren: Typ, Version, Archivpfade, Dateibestandsliste, Größe und Integrität. Validierungsfehler brechen ohne Änderung der Bibliothek ab.
2. Für jeden übergeordneten Eintrag im Bundle einen neuen Zotero-Elementgraphen erstellen: bibliografische Metadaten, Tags, Anhänge, Notizen, eingebettete Bilder und Link-URL-Anhänge.
3. Beziehungen zwischen Einträgen zwischen erfolgreich importierten übergeordneten Einträgen aus demselben Bundle wiederherstellen.
4. Wenn ein einzelner übergeordneter Eintrag nicht importiert werden kann, diesen Eintrag und seine neu erstellten Kinder bereinigen, dann mit den verbleibenden Einträgen fortfahren.

Der Import verwendet niemals originale Zotero-Element-IDs oder -Schlüssel wieder, dedupliziert, führt nicht zusammen oder überschreibt vorhandene Einträge. Das erneute Importieren desselben Bundles erzeugt unabhängige Kopien.

### Ausgaben

Neue Zotero-übergeordnete Einträge mit ihren vollständigen Elementgraphen. Fehlende Dateien, Bereinigungsfehler oder Fehler bei der Wiederherstellung von Beziehungen werden als Warnungen gemeldet; das Ergebnis kann teilweise abgeschlossen sein.

## Geschätzte Dauer

Abhängig von der Anzahl der Einträge, Anhangsgrößen und lokaler Festplattengeschwindigkeit. Reine Metadaten oder kleine Notizen sind schnell abgeschlossen; große PDFs oder viele Bilder erhöhen die Dauer proportional.

## Abhängigkeiten

- Keine Backend-Verbindung erforderlich
- Verlässt sich nur auf Zotero lokalen Speicher und Dateizugriffsberechtigungen

## Verwandte Workflows

- [Export/Import Notes](export-import-notes) — Nur Analyse-Notizen exportieren oder importieren
- [Export Research Bundle](export-research-bundle) — Ein schreibgeschütztes Research Bundle für ein Papierprojekt zusammenstellen (anderer Zweck)
