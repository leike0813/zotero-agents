# Topic Synthesis

## Zweck

Eine Topic Synthesis durch eine dreistufige automatisierte Pipeline erstellen, die eine systematische Analyse und Synthese einer Gruppe verwandter Artikel durchführt.

Entsprechend dem Topic-Erstellungsablauf im Synthesis Workbench bietet dieser Workflow eine End-to-End-Verarbeitung vom Topic-Seed bis zu einem vollständigen Analysebericht.

## Anwendungsfälle

- Eine umfassende Themenanalyse um eine Forschungsrichtung erstellen
- Automatisch eine Taxonomie, Kernbehauptungen, Zeitleiste und zukünftige Richtungen aufbauen
- Einen strukturierten Syntheseanalysebericht erstellen

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Workflow (es müssen keine Einträge ausgewählt werden) |
| Auslösemethode | Über das Dashboard ausführen oder im Synthesis Workbench ausgelöst werden |

## Ausführungsablauf

Dieser Workflow besteht aus **3 nacheinander ausgeführten Skills**, die automatisch ineinander übergehen:

```
1. create-topic-synthesis-prepare
   └── Topic-Seed empfangen
       └── Topic-Intent erstellen
       └── Paper-Workset aufbauen
       └── Analysekontext vorbereiten

2. topic-synthesis-core-enrichment
   └── Kernanreicherung
       └── Taxonomie schreiben (Klassifikationssystem)
       └── Zeitleiste erstellen
       └── Behauptungen extrahieren
       └── Zukünftige Richtungen analysieren
       └── Review-Gliederung erstellen
       └── Wissensgraph-Vervollständigung

3. topic-synthesis-finalize
   └── Abdeckungsbestimmung
       └── Externe Kontextzusammenfassung erstellen
       └── Kuratierungsvorschläge
       └── Finale Analysezusammenfassung erstellen
```

## Ausgaben

Nach Abschluss der Ausführung werden die Topic-Synthesis-Ergebnisse in den persistenten Speicher des Synthesis-Systems geschrieben und in den Topic- und Graph-Ansichten des Synthesis Workbench widerspiegelt.

Spezifische Ausgaben umfassen:

- **Topic-Metadaten**: Name, Beschreibung, Erstellungszeit
- **Taxonomie**: Hierarchisches Themenklassifikationssystem
- **Zeitleisten-Ereignisse**: Wichtige Ereignisse chronologisch geordnet
- **Behauptungen**: Extrahierte Kernbehauptungen und ihre Belege
- **Vergleiche**: Mehrdimensionale Vergleichsanalyse
- **Zukünftige Richtungen**: Vorschläge für zukünftige Forschungsrichtungen
- **Abdeckung**: Literaturabdeckungsanalyse
- **Bericht**: Syntheseanalysebericht

![Topic Synthesis Übersichtsseite](/img/docs/workflows/topic-synthesis_overview.png)

![Topic Synthesis Taxonomieseite](/img/docs/workflows/topic-synthesis_taxonomy.png)

![Topic Synthesis Behauptungsseite](/img/docs/workflows/topic-synthesis_claims.png)

![Topic Synthesis Vergleichsseite](/img/docs/workflows/topic-synthesis_compare.png)

![Topic Synthesis Seite für zukünftige Richtungen](/img/docs/workflows/topic-synthesis_future-directions.png)

![Topic Synthesis Abdeckungsseite](/img/docs/workflows/topic-synthesis_coverage.png)

![Topic Synthesis Berichtsseite](/img/docs/workflows/topic-synthesis_report.png)

![Topic Synthesis Referenzseite](/img/docs/workflows/topic-synthesis_references.png)

![Topic Synthesis Paper-Subgraph](/img/docs/workflows/topic-synthesis_subgraph.png)

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `topicSeed` | string | Topic-Seed, der das zu erstellende Thema beschreibt | — |
| `language` | string | Ausgabesprache | `auto` |

### Beschreibung von language

- `auto`: Automatisch erkennen (verwendet normalerweise die Plugin-UI-Sprache)
- `zh-CN`: Chinesisch
- `en-US`: Englisch

## Abhängigkeiten

- **Backend**: ACP-Backend
- **Synthesis-System**: Der Synthesis Workbench muss initialisiert sein
- **Bibliothekspaper**: Es wird empfohlen, bereits eine ausreichende Anzahl verwandter Artikel in der Bibliothek zu haben

:::tip Empfohlene Vorbereitung
Vor dem Erstellen eines Topics wird empfohlen:
1. Sicherzustellen, dass alle verwandten Artikel durch [Literature Analysis](literature-analysis) verarbeitet wurden
2. Sicherzustellen, dass verwandte Artikel durch [Tag Regulator](tag-regulator) verarbeitet wurden
3. **Advance Matching** (erweiterte Zitationsabgleich-Deduplizierung) auf der Indexseite des Synthesis Workbench auszuführen
4. Alle Genehmigungselemente auf der Review-Seite zu bearbeiten (nicht vergessen, ausstehende Entscheidungen zu „Anwenden")

Genaue Zitationsgraphbeziehungen beeinflussen direkt die Qualität der Paper-Important-Berechnung in der Topic Synthesis (PageRank, Frontier-Score usw.) und verbessern dadurch die Gesamtqualität der Topic-Übersicht.
:::

## Geschätzte Dauer

| Topic-Größe | Geschätzte Zeit |
|---------|---------|
| Kleines Topic (≤10 Artikel) | 8-12 Minuten |
| Mittleres Topic (10-30 Artikel) | 12-18 Minuten |
| Großes Topic (30+ Artikel) | 18-25 Minuten |

Wenn es viele Artikel gibt, wird empfohlen, stattdessen die Aktualisierungsfunktion für inkrementelle Iteration zu verwenden.

## Modell-Empfehlung

🔴 Modelle mit **starkem Textverständnis + langem Kontext** werden empfohlen. Topic Synthesis erfordert eine umfassende Analyse einer großen Anzahl von Artikel-Zusammenfassungen, Zitationsbeziehungen, Tags und Konzeptwissen, was eine rechenintensive Aufgabe darstellt. Wenn das Backend Subagent-Delegation unterstützt, kann die mehrstufige Pipeline effizienter ausgeführt werden.

## Verwandte Workflows

- [Synthesis Workbench Übersicht](../synthesis/) — Leitfaden zur Verwendung des Synthesis Workbench
- [Manuscript Literature Framing](manuscript-literature-framing) — Paper-Einleitungen basierend auf Topic-Synthesis-Ergebnissen schreiben
