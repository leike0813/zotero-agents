# Literature Translator

## Zweck

Einen Literatur-Anhang (Markdown oder PDF) in eine angegebene Zielsprache übersetzen und eine übersetzte Markdown-Datei sowie zweisprachige Ausrichtungsdaten erzeugen. Es wird dringend empfohlen, PDFs zuerst mit [MinerU](mineru) in Markdown zu konvertieren, um die Übersetzungsqualität erheblich zu verbessern.

## Eingaben

| Parameter | Erforderlich | Beschreibung |
| --- | --- | --- |
| `target_language` | Nein | Zielsprache (Standard: `zh-CN`). Unterstützt: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Werte werden akzeptiert. |
| `mode` | Nein | Übersetzungsmodus: `fast` (Standard) oder `high_quality` (langsamer). |

Akzeptierte Anhangstypen: `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf`.

### Auslösemethoden

- Direkt einen Anhang auswählen (PDF oder Markdown)
- Einen übergeordneten Eintrag auswählen — das Plugin findet automatisch den ersten qualifizierenden Anhang
- Nur ein Anhang pro übergeordnetem Eintrag wird verarbeitet
- Einträge mit einer bestehenden Übersetzung in der Zielsprache werden automatisch übersprungen

## Verhalten

1. Den Zielanhang aus der Auswahl auflösen (direkter Anhang oder erster qualifizierender Anhang unter dem übergeordneten Eintrag).
2. Prüfen, ob bereits ein Übersetzungsartefakt für die Zielsprache existiert; falls ja, überspringen.
3. Den Übersetzungsauftrag an das Skill-Runner-Backend mit dem Skill `literature-translator` übermitteln.
4. Die Übersetzungspipeline durchläuft mehrere Stufen: Ausrichtungsanalyse, Übersetzungsausführung und QA-Verifizierung.
5. Die übersetzte Markdown-Datei in dasselbe Verzeichnis wie die Quelle schreiben, benannt als `<source-name>_<target-language>.md`, und einen verknüpften Anhang unter dem übergeordneten Eintrag erstellen.

Der Workflow ist vollständig automatisch und pausiert nicht für Benutzereingriffe.

## Ausgabe und Anwendung

| Artefakt | Beschreibung |
|----------|-------------|
| Übersetztes Markdown | Neben der Quelldatei geschrieben als `<source-name>_<target-language>.md` |
| Verknüpfter Anhang | Unter dem übergeordneten Eintrag erstellt, der auf das übersetzte Markdown zeigt |
| Ausrichtungsdaten | Zweisprachiges Ausrichtungs-JSON im Skill-Arbeitsbereich |
| Glossar | Extrahiertes Glossar-JSON im Skill-Arbeitsbereich |
| QA-Bericht | Qualitätssicherungsbericht-JSON im Skill-Arbeitsbereich |

## Geschätzte Dauer

| Dateigröße | Geschätzte Zeit |
|-----------|---------------|
| Kurze Arbeit (≤10 Seiten) | 3–5 Minuten |
| Standard (10–30 Seiten) | 5–10 Minuten |
| Lange Arbeit (30+ Seiten) | 10–18 Minuten |

## Modell-Empfehlung

Ein Modell mit Subagent-Delegierungsfähigkeit wird empfohlen. Die Übersetzungspipeline umfasst Ausrichtungsanalyse, Übersetzungsausführung und QA-Verifizierungsstufen. Subagent-Delegierung ermöglicht parallele Verarbeitung dieser Teilaufgaben, was Effizienz und Übersetzungskonsistenz erheblich verbessert.

## Abhängigkeiten

- **Backend**: Skill-Runner
- **Skill**: `literature-translator`

## Verwandte Workflows

- [MinerU PDF Parsing](mineru) — PDF zuerst in Markdown konvertieren für bessere Übersetzungsqualität
- [Literature Analysis](literature-analysis) — Literaturdigest und Analyseartefakte generieren
