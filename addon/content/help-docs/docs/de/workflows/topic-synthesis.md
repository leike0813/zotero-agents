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

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Topic Synthesis Übersichtsseite" title="Topic Synthesis Übersichtsseite" loading="lazy" /><figcaption>Topic Synthesis Übersichtsseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Topic Synthesis Taxonomieseite" title="Topic Synthesis Taxonomieseite" loading="lazy" /><figcaption>Topic Synthesis Taxonomieseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Topic Synthesis Behauptungsseite" title="Topic Synthesis Behauptungsseite" loading="lazy" /><figcaption>Topic Synthesis Behauptungsseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Topic Synthesis Vergleichsseite" title="Topic Synthesis Vergleichsseite" loading="lazy" /><figcaption>Topic Synthesis Vergleichsseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Topic Synthesis Seite für zukünftige Richtungen" title="Topic Synthesis Seite für zukünftige Richtungen" loading="lazy" /><figcaption>Topic Synthesis Seite für zukünftige Richtungen</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Topic Synthesis Abdeckungsseite" title="Topic Synthesis Abdeckungsseite" loading="lazy" /><figcaption>Topic Synthesis Abdeckungsseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Topic Synthesis Berichtsseite" title="Topic Synthesis Berichtsseite" loading="lazy" /><figcaption>Topic Synthesis Berichtsseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Topic Synthesis Referenzseite" title="Topic Synthesis Referenzseite" loading="lazy" /><figcaption>Topic Synthesis Referenzseite</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Topic Synthesis Paper-Subgraph" title="Topic Synthesis Paper-Subgraph" loading="lazy" /><figcaption>Topic Synthesis Paper-Subgraph</figcaption></figure>

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
1. Sicherzustellen, dass alle verwandten Artikel durch [Literature Analysis](#doc/workflows%2Fliterature-analysis) verarbeitet wurden
2. Sicherzustellen, dass verwandte Artikel durch [Tag Regulator](#doc/workflows%2Ftag-regulator) verarbeitet wurden
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

- [Synthesis Workbench Übersicht](#doc/synthesis%2Findex) — Leitfaden zur Verwendung des Synthesis Workbench
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Paper-Einleitungen basierend auf Topic-Synthesis-Ergebnissen schreiben
