# Synthesis Workbench – Übersicht

Synthesis Workbench ist eine Plattform für vertiefte Literaturanalyse, bereitgestellt von Zotero Agents. Sie verwandelt Ihre Bibliothek in ein strukturiertes Wissensnetzwerk und unterstützt Themensynthese, Zitationsanalyse, Konzeptverwaltung und kontrolliertes Vokabularmanagement.

![Synthesis Workbench Home](/img/docs/synthesis/home.png)

## So öffnen Sie es

1. Öffnen Sie das Dashboard / den Synthesis Workspace über die **Symbolleisten-Schaltfläche** oder das **Menü**
2. Wechseln Sie im Workspace Tab zur **Synthesis**-Ansicht

## Alle Oberflächen (Seiten)

Synthesis Workbench besteht aus 8 Oberflächen, die jeweils eine andere Funktionssicht bieten:

| Oberfläche | Funktion | Doku |
|------------|----------|------|
| **Home** | Bibliotheksübersichts-Dashboard: Bibliothekseinblicke (registrierte Paper / Themenanzahl / Graph-Knoten), Git-Sync-Status-Panel, Trendthemen-Kartenliste | [Details](home) |
| **Topics** | Themenliste und -verwaltung: 3 Ansichtsmodi (Graph / Raster / Liste), Themen erstellen und aktualisieren, Themensuche und -sortierung | [Details](topic-synthesis) |
| **Index** | Canonical-Reference-Index: Paper-Registry-Ansicht (Paper-Liste + Zitationszeilen + Bindungsstatus), Canonical-Reference-Ansicht (Suche / Zusammenführung / Umleitung / Deduplizierung) | [Details](index-and-citation) |
| **Review** | Review-Zentrale: 3 Unter-Tabs – Citation-Match-Review (Bindungsvorschläge annehmen/ablehnen), Konzept-Review, Themen-Graph-Beziehungs-Review | [Details](review) |
| **Graph** | Zitationsgraph-Visualisierung (force-directed / radial / Komponenten – 3 Layouts), mit Themenfilterung und Knoten-/Kanteninteraktion | [Details](index-and-citation) |
| **Tags** | Verwaltung des kontrollierten Tag-Vokabulars + Genehmigung automatischer Tagging-Vorschläge | [Details](tags) |
| **Concepts** | Konzept-Wissensbasis-Verwaltung: Vierschichtige Struktur aus Konzepten / Sinnvarianten / Aliasen / Relationen, überlagerbar auf dem Themen-Graphen und Reader | [Details](concepts) |
| **Reader** | Themen-Reader: Vollständige Themen-Detailseite mit 8 Unterseiten (Überblick, Taxonomie, Claims, Vergleich, Zukunftsperspektiven, Abdeckung, Referenzen, Bericht) | [Details](topic-synthesis) |

## Kernkonzepte

### Canonical Store

Der Canonical Store ist der zugrunde liegende Wissensgraph-Speicher des Synthesis-Systems. Er speichert inhaltsadressierbare JSON-Dateien im Zotero-Datenverzeichnis.

**Speicherort:** `<Zotero data directory>/zotero-agents/data/synthesis/`

**Verzeichnisstruktur:**

```
synthesis/
├── topics/             # Strukturierte Artefakte für die Themensynthese
├── concepts/           # Konzept-Wissensbasis
├── topic-graph/        # Themen-Graph-Knoten und -Kanten
├── citation-graph/     # Zitationsgraph-Snapshots
├── tags/               # Kontrolliertes Tag-Vokabular
├── sync/               # Git-Sync-Arbeitsbaum
└── state/              # Laufzeitstatus (Transaktionen, Belege, Caches usw.)
```

Jede Datei verwendet ein JSON-Umschlagformat (CanonicalEnvelope), das eine Schema-ID, Versionsnummer, Zeitstempel und einen schemavalidierten Datenkörper enthält. Schreiboperationen verwenden transaktionale Semantik: Daten werden zuerst im Transaktionsverzeichnis bereitgestellt, bei erfolgreicher Validierung an den kanonischen Speicherort befördert und bei Fehlschlag automatisch zurückgerollt.

### Reference Sidecar

Ein Reference Sidecar ist ein Index der angehängten Artefakte für jedes Paper. Wenn ein Workflow ein Literaturobjekt verarbeitet und eine Zusammenfassung, Referenzliste und Zitationsanalyse erstellt, werden diese Artefakte als strukturierte Notizen (Zotero Notes) an das Objekt angehängt. Das Sidecar-System durchsucht diese Notizen und zeichnet den Artefaktstatus (vollständig / teilweise / fehlend) im Index auf.

**Sidecar-Scan-Zyklus:** Der Sidecar wird zu folgenden Zeitpunkten zum Scannen ausgelöst:

- Nach Abschluss einer Workflow-Ausführung und dem Schreiben der Artefakte
- Wenn eine explizite Sidecar-Aktualisierungsoperation ausgelöst wird
- Wenn das System beim Start veraltete Sidecar-Daten erkennt

**Artefakttypen:**

| Artefakt | Beschreibung |
|----------|-------------|
| `digest` | Paper-Zusammenfassung (Markdown) |
| `references` | Referenzliste (JSON) |
| `citation_analysis` | Zitationsanalyse-Bericht (JSON) |

Sidecar-Daten dienen als primäre Eingabe für den Canonical Reference Index – das System extrahiert Zitationsdatensätze aus dem Referenz-Artefakt, erstellt kanonische Referenzen und versucht dann, sie mit Bibliothekseinträgen abzugleichen und zu binden.

### Datenfluss

```
Zotero Library
    │
    ├──→ Workflow-Ausführung (Literature Analysis / Deep Reading)
    │         │
    │         ↓
    │   Artefakt-Notizen (Zusammenfassung / Referenzen / Zitationsanalyse)
    │         │
    │         ↓
    │   Reference Sidecar ← Artefaktstatus scannen
    │         │
    │         ├──→ Canonical Reference Index
    │         │         │
    │         │         ├──→ Zitationsbindung (An Zotero-Objekte binden)
    │         │         └──→ Zitationsgraph
    │         │
    │         └──→ Themensynthese
    │                   │
    │                   ├──→ Themen-Graph (Themenbeziehungen)
    │                   └──→ Konzeptassoziationen (Konzept-Wissensbasis)
    │
    └──→ Git Sync ←→ Remote-Repository (Versionskontrolle und Sicherung)
```

## Voraussetzungen

Die Nutzung von Synthesis Workbench erfordert:

- Ein konfiguriertes [Skill-Runner](../backends/skill-runner)-Backend (zur Ausführung von Synthese-Workflows)
- Bereits in der Bibliothek vorhandene Paper-Objekte

## Nächste Schritte

- [Home-Dashboard](home) – Bibliotheksübersicht und Sync-Status anzeigen
- [Tag-Verwaltung](tags) – Das kontrollierte Tag-Vokabular verwalten
- [Index & Zitationsgraph](index-and-citation) – Mehr über Referenzindexierung und Zitationsnetzwerke erfahren
- [Themensynthese erstellen](topic-synthesis) – Themenanalysen erstellen
- [Review-Zentrale](review) – Zitations-Matches, Konzepte und Themen-Graph-Vorschläge prüfen
- [Konzept-Wissensbasis](concepts) – Kernkonzepte verwalten
- [Git Sync](git-sync) – Datensynchronisierung und -sicherung konfigurieren
