# Workflow-Übersicht

## Was ist ein Workflow?

Workflows sind die Kernfunktion von Zotero Agents und ermöglichen es, mehrere Skill-Schritte zu automatisierten Verarbeitungspipelines zu kombinieren. Ein Workflow definiert eine vollständige Aufgabe: vom Empfang der Eingabe über die Datenverarbeitung bis zur Ausgabeerzeugung.

## Workflow-Struktur

```
workflow.json (Manifestdatei)
├── manifest: deklariert Metadaten, Version, Name
├── parameters: definiert konfigurierbare Parameter
├── inputs: definiert Eingabetypen (Anhänge, Einträge, Notizen usw.)
├── hooks: JavaScript-Hook-Skripte (Eingaben filtern, Anfragen erstellen, Ergebnisse anwenden)
└── provider: gibt den erforderlichen Backend-Typ an
```

### Eingabeeinheitstypen

| Typ | Beschreibung |
|------|------|
| `attachment` | Anhangsdateien eines Eintrags |
| `parent` | Übergeordneter Eintrag des ausgewählten Eintrags |
| `note` | Notizeintrag |
| `workflow` | Batch-Umfang |

### Hook-System

Workflows können in verschiedenen Ausführungsphasen benutzerdefinierte JavaScript-Skripte ausführen:

- **filterInputs**: Eingaben filtern und auswählen
- **buildRequest**: Den an das Backend gesendeten Anfrageinhalt erstellen
- **normalizeSettings**: Benutzereinstellungen normalisieren
- **applyResult**: Die vom Backend zurückgegebenen Ergebnisse auf Zotero anwenden

## Drei Ausführungs-Backends

Workflows können über drei Backend-Typen ausgeführt werden:

| Backend | Anfragetyp | Anwendungsfall |
|---------|-------------|---------|
| **Skill-Runner** | `skill.run.v1` | Allgemeine Skill-Ausführung, unterstützt interaktiven Modus |
| **ACP** | `acp.skill.run.v1` | Skill-Ausführung über ACP-Backend |
| **Generic HTTP** | `generic-http.request.v1` | HTTP-API-Aufrufe |

## Offizielles Workflow-Paket

Offizielle Workflows werden als **eigenständige Pakete** veröffentlicht und installiert, entkoppelt vom Plugin selbst. Installationsmethoden:

- Rechtsklick-Menü → **Zotero Agents** → **📦 Offizielles Workflow-Paket installieren**
- In den Einstellungen auf **Offizielles Workflow-Paket installieren** klicken

Offizielle Pakete unterstützen drei Update-Kanäle: Stable / Beta / Dev. Das Plugin sucht beim Start automatisch nach Updates.

## Offizielle Workflows

Das Plugin enthält eine Reihe offizieller Workflows, nach Funktion gruppiert:

### 📚 Literaturanalyse-Toolkit

| Workflow | Zweck | Eingabe | Backend | Docs |
|---------|------|------|------|------|
| **Literature Analysis** ⭐ | Zusammenfassung, Referenzen und Zitationsanalyse aus PDF/MD erstellen. Kann in Tag-Regulierung kaskadieren | Anhang | Skill-Runner | [Details](literature-analysis) |
| **Interactive Literature Explainer** | Multi-Turn-Dialog mit KI für tiefes Literaturverständnis, mit überprüften Antworten zur Vermeidung von Halluzinationen | Anhang | Skill-Runner | [Details](literature-explainer) |
| **Deep Reading** | Strukturierte Deep-Reading-HTML-Ansicht mit Übersetzungsunterstützung erstellen | Anhang | ACP | [Details](literature-deep-reading) |
| **Literature Search & Ingest** | Die KI akademische Literatur suchen und direkt in Zotero importieren lassen | Workflow | ACP | [Details](literature-search-ingest) |
| **Tag Bootstrapper** | Interaktiv ein kontrolliertes Tag-Vokabular für ein Forschungsgebiet erstellen | Workflow | Skill-Runner | [Details](tag-bootstrapper) |
| **Tag Regulator** | Tags basierend auf einem kontrollierten Vokabular normalisieren und neue Tags inferieren | Übergeordneter Eintrag | Skill-Runner | [Details](tag-regulator) |
| **Export/Import Notes** | Analyse-Notizen exportieren oder importieren, mit Unterstützung für Bearbeitung und Reimport | Übergeordneter Eintrag | Kein Backend erforderlich | [Details](export-import-notes) |

### 🛠️ Dienstprogramme

| Workflow | Zweck | Eingabe | Backend | Docs |
|---------|------|------|------|------|
| **MinerU PDF Parsing** | MinerU-Dienst aufrufen, um PDF in Markdown zu parsen | Anhang | Generic HTTP | [Details](mineru) |
| **Topic Synthesis** | Drei-Stufen-Pipeline zur Erstellung von Topic-Synthesis-Analysen und -Berichten | Workflow | ACP | [Details](topic-synthesis) |
| **Manuscript Literature Framing** | Introduction / Related Work LaTeX-Entwürfe erstellen | Workflow | ACP | [Details](manuscript-literature-framing) |

### 🔧 Debug-Tools

| Workflow | Zweck | Backend | Docs |
|---------|------|------|------|
| **Debug Probe** | Workflow-System-Entwicklungstests und -Diagnose | Skill-Runner | [Details](debug-probe) |

## Nächste Schritte

- [Workflow-Aufruf & -Konfiguration](invocation)
- [Backend-Konfiguration](../backends/) — Detaillierte Anweisungen zur Konfiguration von Backends
