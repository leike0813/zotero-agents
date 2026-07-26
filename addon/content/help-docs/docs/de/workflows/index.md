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

- **validateSelection**: Deklaratives Filtern und Validieren von Eingaben, bevor JavaScript-Hooks ausgeführt werden
- **preflight**: Die aufgelöste Eingabeeinheit prüfen, Ausführungskontext anhängen, überspringen, zu `applyResult` kurzschließen oder eine Eingabe in mehrere Anforderungseinheiten erweitern
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
| **Literature Analysis** ⭐ | Zusammenfassung, Referenzen und Zitationsanalyse aus PDF/MD erstellen. Kann in Tag-Regulierung kaskadieren | Anhang | Skill-Runner | [Details](#doc/workflows%2Fliterature-analysis) |
| **Literature Metadata Curator** | Bibliografische Metadaten für einen Zotero-Eintrag abfragen, korrigieren und vervollständigen | Übergeordneter Eintrag | Skill-Runner | [Details](#doc/workflows%2Fliterature-metadata-curator) |
| **Literature Translator** | Akademische Literatur mit Glossarverwaltung und Qualitätsprüfung übersetzen | Anhang | Skill-Runner | [Details](#doc/workflows%2Fliterature-translator) |
| **Interactive Literature Explainer** | Multi-Turn-Dialog mit KI für tiefes Literaturverständnis, mit überprüften Antworten zur Vermeidung von Halluzinationen | Anhang | Skill-Runner | [Details](#doc/workflows%2Fliterature-explainer) |
| **Deep Reading** | Strukturierte Deep-Reading-HTML-Ansicht mit Übersetzungsunterstützung erstellen | Anhang | ACP | [Details](#doc/workflows%2Fliterature-deep-reading) |
| **Literature Search & Ingest** | Die KI akademische Literatur suchen und direkt in Zotero importieren lassen | Workflow | ACP | [Details](#doc/workflows%2Fliterature-search-ingest) |
| **Collection Collector** | Vorhandene Literatur aus der Bibliothek für eine bestehende Collection nach angegebenem Umfang auswählen | Workflow | ACP | [Details](#doc/workflows%2Fcollection-collector) |
| **Export/Import Literature Bundle** | Portable ZIP-Bundles von Zotero-Einträgen mit Metadaten, Anhängen und Notizen exportieren/importieren | Übergeordneter Eintrag / Workflow | Kein Backend erforderlich | [Details](#doc/workflows%2Fexport-import-literature-bundle) |
| **Export Research Bundle** | Automatisches Zusammenstellen eines schreibgeschützten Research Bundles für ein Papierprojekt aus Bibliothek und Synthesis-Kontext | Workflow | Skill-Runner | [Details](#doc/workflows%2Fexport-research-bundle) |
| **Tag Auditor** | Alle Bibliothekseinträge gegen das kontrollierte Tag-Vokabular scannen und Konformität melden | Workflow | Kein Backend erforderlich | [Details](#doc/workflows%2Ftag-auditor) |
| **Tag Bootstrapper** | Interaktiv ein kontrolliertes Tag-Vokabular für ein Forschungsgebiet erstellen | Workflow | Skill-Runner | [Details](#doc/workflows%2Ftag-bootstrapper) |
| **Tag Regulator** | Tags basierend auf einem kontrollierten Vokabular normalisieren und neue Tags inferieren | Übergeordneter Eintrag | Skill-Runner | [Details](#doc/workflows%2Ftag-regulator) |
| **Export/Import Notes** | Analyse-Notizen exportieren oder importieren, mit Unterstützung für Bearbeitung und Reimport | Übergeordneter Eintrag | Kein Backend erforderlich | [Details](#doc/workflows%2Fexport-import-notes) |

### 🛠️ Dienstprogramme

| Workflow | Zweck | Eingabe | Backend | Docs |
|---------|------|------|------|------|
| **MinerU PDF Parsing** | MinerU-Dienst aufrufen, um PDF in Markdown zu parsen | Anhang | Generic HTTP | [Details](#doc/workflows%2Fmineru) |
| **Topic Synthesis** | Drei-Stufen-Pipeline zur Erstellung von Topic-Synthesis-Analysen und -Berichten | Workflow | ACP | [Details](#doc/workflows%2Ftopic-synthesis) |
| **Manuscript Literature Framing** | Introduction / Related Work LaTeX-Entwürfe erstellen | Workflow | ACP | [Details](#doc/workflows%2Fmanuscript-literature-framing) |

### 🔧 Debug-Tools

| Workflow | Zweck | Backend | Docs |
|---------|------|------|------|
| **Debug Probe** | Workflow-System-Entwicklungstests und -Diagnose | Skill-Runner | [Details](#doc/workflows%2Fdebug-probe) |

## Nächste Schritte

- [Workflow-Aufruf & -Konfiguration](#doc/workflows%2Finvocation)
- [Backend-Konfiguration](#doc/backends%2Findex) — Detaillierte Anweisungen zur Konfiguration von Backends
