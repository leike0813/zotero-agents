# Tag Auditor

## Zweck

Alle Top-Level-regulären Einträge in der Zotero-Bibliothek gegen das kontrollierte Tag-Vokabular scannen und die Tag-Konformität pro Eintrag melden. Ergebnisse werden in das Tags-Audit-Panel des Synthesis Workbench zur Überprüfung und anschließenden Regulierung geschrieben.

## Eingaben

Keine Parameter und keine Zotero-Elementauswahl erforderlich. Der Workflow arbeitet auf der gesamten Bibliothek.

## Verhalten

1. Das kontrollierte Tag-Vokabular aus Synthesis über `exportTagVocabularyForRegulator` laden.
2. Alle Top-Level-regulären Einträge in der Bibliothek seitenweise durchlaufen (ausgeschlossen Kindelemente, Notizen, Anhänge und gelöschte Einträge).
3. Für jeden Eintrag die aktuellen Tags sammeln und die Konformität bewerten: Ein Tag ist nicht konform, wenn er nicht im kontrollierten Vokabular vorhanden ist.
4. Audit-Einträge nach Bibliotheks-ID gruppieren und über `replaceTagAuditRecords` an Synthesis schreiben.

Der Workflow ist vollständig automatisch und modifiziert keine Zotero-Einträge oder Tags. Er ist ein schreibgeschützter Scan, der Audit-Datensätze für das Tags-Panel erzeugt.

## Ausgabe und Anwendung

Das Tags-Audit-Panel des Synthesis Workbench zeigt pro Eintrag Audit-Datensätze an, die Folgendes enthalten:

| Feld | Beschreibung |
|-------|-------------|
| `itemKey` | Der Zotero-Element-Schlüssel |
| `compliant` | Ob alle Tags des Eintrags im kontrollierten Vokabular sind |
| `nonCompliantTags` | Liste der Tags, die nicht im kontrollierten Vokabular gefunden wurden |

Das Laufergebnis fasst die Anzahl der geprüften Einträge und der Einträge zusammen, die pro Bibliothek eine Tag-Regulierung benötigen. Das erneute Ausführen des Workflows ersetzt die vorherigen Audit-Datensätze (idempotent innerhalb desselben Vokabularzustands).

Voraussetzung ist, dass ein kontrolliertes Tag-Vokabular bereits auf der Tags-Seite des Synthesis Workbench definiert sein muss.

## Abhängigkeiten

- Keine Backend-Verbindung erforderlich
- **Kontrolliertes Vokabular**: Ein kontrolliertes Tag-Vokabular muss zuerst definiert werden; siehe [Tags-Verwaltung](../synthesis/tags)

## Verwandte Workflows

- [Tag Regulator](tag-regulator) — Tags basierend auf dem kontrollierten Vokabular normalisieren und neue Tags inferieren
- [Tag Bootstrapper](tag-bootstrapper) — Interaktiv ein kontrolliertes Tag-Vokabular erstellen
