# Literature Search & Ingest

## Zweck

Akademische Literatur mit KI durchsuchen und genehmigte Ergebnisse direkt in Zotero importieren. Eine leere Abfrage kann ein geführtes Gespräch starten, das einen Forschungsbedarf in ein bestätigtes Suchbriefing verwandelt.

## Suchmodi

| Modus | Beschreibung |
|------|------|
| `auto` | Erkennt einen geeigneten Modus für eine nicht-leere Abfrage; eine leere Abfrage startet die geführte Planung. |
| `guided` | Klärt den Forschungsbedarf, prüft die lokale Zotero/Synthesis-Abdeckung und führt das bestätigte Briefing direkt aus. |
| `topic_expansion` | Suche nach Forschungsrichtung oder Thema. |
| `paper_seed_expansion` | Erweiterung ausgehend von einem Seed-Artikel. |
| `targeted_ingest` | Gezieltes Auffinden und Importieren eines einzelnen Artikels. |

## Ausführungsablauf

```
1. Geführte Planung (leere auto-Abfrage oder guided-Modus)
    └── Forschungsziel in kurzen Runden klären
    └── Nur lokale Zotero/Synthesis-Abdeckung lesen
    └── Strukturiertes Suchbriefing präsentieren
    └── Auf Bestätigung warten; keine Websuche oder Schreibvorgänge vor der Bestätigung

2. Kandidatensuche und -auswahl
    └── Suche gemäß dem bestätigten Briefing oder expliziten Modus
    └── Identifikatoren, autoritative Metadaten, Landing Pages und legale öffentliche PDF-Nachweise überprüfen
    └── Benutzer wählt zu importierende Artikel aus

3. Import und Abschluss
    └── Jeden genehmigten Artikel über zotero-bridge importieren
    └── Kompakte Import-JSON ausgeben, einschließlich Links für fehlende PDFs
```

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|------|
| `query` | string | Suchthema, Artikelkennung, Seed oder ein leerer Wert für geführte Planung. | Leer |
| `searchMode` | string | `auto`, `guided`, `topic_expansion`, `paper_seed_expansion` oder `targeted_ingest`. | `auto` |
| `targetCollection` | string | Optionale Ziel-Collection. | Leer |

## Ausgaben

- Kandidatennachweise werden überprüft, bevor ein Benutzer den Import genehmigen kann.
- Jeder erfolgreiche Import wird in Zotero erstellt oder wiederverwendet; legale Landing-Page-Links bleiben verfügbar, wenn kein PDF angehängt wird.
- Geführte Durchläufe melden `search_mode: "guided"`; andere Durchläufe behalten ihren konkreten Suchmodus.

## Abhängigkeiten

- **Backend**: ACP-Backend mit interaktiver Ausführung
- **Skill**: `literature-search-ingest`
