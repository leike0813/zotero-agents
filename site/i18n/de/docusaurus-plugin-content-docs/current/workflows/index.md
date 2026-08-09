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
| `child` | Untergeordneter Eintrag |
| `selection` | Direkt ausgewählter Eintrag |
| `note` | Notizeintrag |
| `generated-note` | Von einem Workflow generierte Notiz |
| `digest-image-target` | Bildziel für die Digest-Darstellung |
| `workflow` | Batch-Umfang (keine Auswahl erforderlich) |

### Hook-System

Workflows können in verschiedenen Ausführungsphasen benutzerdefinierte JavaScript-Skripte ausführen:

- **validateSelection**: Deklaratives Filtern und Validieren von Eingaben, bevor JavaScript-Hooks ausgeführt werden
- **preflight**: Die aufgelöste Eingabeeinheit prüfen, Ausführungskontext anhängen, überspringen, zu `applyResult` kurzschließen oder eine Eingabe in mehrere Anforderungseinheiten erweitern
- **buildRequest**: Den an das Backend gesendeten Anfrageinhalt erstellen
- **normalizeSettings**: Benutzereinstellungen normalisieren
- **applyResult**: Die vom Backend zurückgegebenen Ergebnisse auf Zotero anwenden

## Vier Ausführungs-Backends

Workflows können über vier Backend-Typen ausgeführt werden:

| Backend | Anfragetyp | Anwendungsfall |
|---------|-------------|---------|
| **Skill-Runner** | `skillrunner.job.v1` / `skillrunner.sequence.v1` | Allgemeine Skill-Ausführung, unterstützt interaktiven Modus |
| **ACP** | `acp.prompt.v1` / `acp.skill.run.v1` / `skillrunner.sequence.v1` | Konversation oder Skill-Ausführung über ACP-Backend |
| **Generic HTTP** | `generic-http.request.v1` / `generic-http.steps.v1` | HTTP-API-Aufrufe |
| **Pass-through** | `pass-through.run.v1` | Rein lokale Vorgänge, kein Remote-Backend erforderlich |

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
| **Literature Metadata Curator** | Bibliografische Metadaten für einen Zotero-Eintrag abfragen, korrigieren und vervollständigen | Übergeordneter Eintrag | Skill-Runner | [Details](literature-metadata-curator) |
| **Literature Translator** | Akademische Literatur mit Glossarverwaltung und Qualitätsprüfung übersetzen | Anhang | Skill-Runner | [Details](literature-translator) |
| **Interactive Literature Explainer** | Multi-Turn-Dialog mit KI für tiefes Literaturverständnis, mit überprüften Antworten zur Vermeidung von Halluzinationen | Anhang | Skill-Runner | [Details](literature-explainer) |
| **Deep Reading** | Strukturierte Deep-Reading-HTML-Ansicht mit Übersetzungsunterstützung erstellen | Anhang | ACP | [Details](literature-deep-reading) |
| **Literature Search & Ingest** | Die KI akademische Literatur suchen und direkt in Zotero importieren lassen | Workflow | ACP | [Details](literature-search-ingest) |
| **Collection Collector** | Vorhandene Literatur aus der Bibliothek für eine bestehende Collection nach angegebenem Umfang auswählen | Workflow | ACP | [Details](collection-collector) |
| **Export/Import Literature Bundle** | Portable ZIP-Bundles von Zotero-Einträgen mit Metadaten, Anhängen und Notizen exportieren/importieren | Übergeordneter Eintrag / Workflow | Pass-through | [Details](export-import-literature-bundle) |
| **Export Research Bundle** | Automatisches Zusammenstellen eines schreibgeschützten Research Bundles für ein Papierprojekt aus Bibliothek und Synthesis-Kontext | Workflow | Skill-Runner | [Details](export-research-bundle) |
| **Tag Auditor** | Alle Bibliothekseinträge gegen das kontrollierte Tag-Vokabular scannen und Konformität melden | Workflow | Pass-through | [Details](tag-auditor) |
| **Tag Bootstrapper** | Interaktiv ein kontrolliertes Tag-Vokabular für ein Forschungsgebiet erstellen | Workflow | Skill-Runner | [Details](tag-bootstrapper) |
| **Tag Regulator** | Tags basierend auf einem kontrollierten Vokabular normalisieren und neue Tags inferieren | Übergeordneter Eintrag | Skill-Runner | [Details](tag-regulator) |
| **Export/Import Notes** | Analyse-Notizen exportieren oder importieren, mit Unterstützung für Bearbeitung und Reimport | Übergeordneter Eintrag | Pass-through | [Details](export-import-notes) |
| **Add Digest Representative Image** | Ein repräsentatives Bild zu einem Literatur-Digest hinzufügen | Übergeordneter Eintrag | ACP | — |

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
