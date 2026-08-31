# Export Research Bundle

## Zweck

Automatisches Zusammenstellen eines schreibgeschützten Research Bundles in Dashboard Products aus bestehender Zotero-Bibliothek und Synthesis-Kontext basierend auf einer deklarierten Papierabsicht. Das Bundle sammelt relevante Topics, Kernarbeiten und verwandte Arbeiten mit ihren verfügbaren Analyseartefakten.

## Eingaben

| Parameter | Erforderlich | Beschreibung |
| --- | --- | --- |
| `paperTitle` | Ja | Arbeitstitel des Manuskripts, der zur Findung von Forschungsmaterialien verwendet wird. |
| `researchContent` | Ja | Forschungsproblem, Methoden, Umfang und vorgesehener Beitrag. |
| `articleType` | Nein | Manuskripttyp (Standard: `original research`). |
| `maxTopics` | Nein | Maximale Anzahl relevanter Topics, Bereich 0–10 (Standard: 5). |
| `maxCorePapers` | Nein | Maximale Anzahl von Kernarbeiten, Bereich 1–50 (Standard: 20). |
| `maxRelatedPapers` | Nein | Maximale Anzahl zusätzlicher Arbeiten außerhalb ausgewählter Topics, Bereich 1–200 (Standard: 80). Aus Topics aufgelöste Arbeiten bleiben darüber hinaus erhalten. |

Keine Zotero-Elementauswahl erforderlich.

## Verhalten

1. Die Papierabsichtsparameter vom Benutzer empfangen.
2. Kandidatenmaterialien aus bestehenden Synthesis Topics und begrenzten Zotero-Metadatenankern entdecken. Die Suche gleicht indizierte Metadaten wie Titel, Autoren, Jahre, Publikationstitel und Tags ab; sie ist keine semantische Volltextsuche.
3. Begrenzte Evaluierung durchführen, um Kernarbeiten von verwandten Arbeiten zu unterscheiden.
4. Das Research Bundle mit Topic-Berichten, bibliografischen Metadaten und verfügbaren v2-Analyseartefakten (Digests, Referenzen, Zitationsanalysen, Gesprächsinhalte) zusammenstellen.
5. Für Kernarbeiten Markdown-Quelle mit lokalen Bildern bevorzugen; auf PDF zurückfallen; eine Warnung aufzeichnen, wenn keines verfügbar ist.
6. Das Bundle als schreibgeschütztes Produkt in Dashboard Products registrieren.

Die Nichtverfügbarkeit von Topic, Graph, Analyseartefakt oder Quelle degradiert elegant — der Workflow fährt mit whatever evidence noch lesbar ist fort und zeichnet Diagnostiken und Warnungen auf. Wenn keine Arbeiten die Kriterien erfüllen, endet der Lauf ohne Registrierung eines Produkts.

## Ausgabe und Anwendung

Das Research Bundle wird in Dashboard Products als schreibgeschütztes Artefakt registriert. Seine Struktur:

| Pfad | Beschreibung |
|------|-------------|
| `README.md` | Agenten- und menschenorientierter Einstiegspunkt mit vorgeschlagener Lesereihenfolge, Dateibenennung, Topic-/Papiersindex |
| `manifest.json` | Maschinenlesbares Inventar der v2-Artefaktpfade, Herkunft, Dateiintegrität und Diagnostiken |
| `topics/<topic-id>/report.md` | Topic-Synthesebericht (wenn verfügbar) |
| `papers/<paper-id>/metadata.json` | Portable bibliografische Metadaten pro Arbeit |
| `papers/<paper-id>/source.md` | Markdown-Quelle (wenn verfügbar) |
| `papers/<paper-id>/digest-*.md` | Literature Analysis Digest-Artefakte (wenn verfügbar) |

Nur `topics/` und `papers/` semantische Verzeichnisse werden neben den Root-Dateien verwendet. Markdown-Bilder werden nur einbezogen, wenn ihr aufgelöster lokaler Pfad innerhalb des Verzeichnisbaums der Markdown-Datei liegt; außerbaum- oder fehlende Bilder behalten ihre ursprünglichen Links, werden aber nicht als Produktdateien registriert.

## Geschätzte Dauer

Abhängig von Bibliotheksgröße, Kandidatenanzahl, Topic/Graph-Verfügbarkeit und Backend-Antwortgeschwindigkeit. Fortschritt und Ergebnisse sind im Laufpanel sichtbar.

## Modell-Empfehlung

Ein Modell mit starkem semantischem Verständnis und Tool-Calling-Fähigkeit wird empfohlen. Die Aufgabe erfordert die Beurteilung der Topic- und Paper-Relevanz gegenüber der Papierabsicht und die korrekte Verwendung des schreibgeschützten Zotero- und Synthesis-Kontexts.

## Abhängigkeiten

- **Backend**: Skill-Runner
- **Skill**: `export-research-bundle`
- **Host Bridge**: Erfordert Berechtigung zum Lesen von Zotero- und Synthesis-Kontext

## Verwandte Workflows

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — Digest- und Zitationsanalyseartefakte generieren, die im Bundle enthalten sein können
- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — Fehlende Literatur suchen und importieren, bevor das Bundle zusammengestellt wird
- [Export/Import Literature Bundle](#doc/workflows%2Fexport-import-literature-bundle) — Portable ZIP-Bundles von Zotero-Einträgen exportieren (anderer Zweck)
