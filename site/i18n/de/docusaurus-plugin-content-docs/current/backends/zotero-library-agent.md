# Zotero Library Agent

## Übersicht

Zotero Library Agent ist die begrenzte, bedarfsorientierte Aufgabenoberfläche der [Host Bridge](host-bridge). Er ermöglicht KI-Agenten, für endliche Anfragen mit einer Zotero-Bibliothek zu arbeiten — Einträge inspizieren, Kontext abrufen, Literatur- und Synthesedaten lesen, Workflows ausführen, genehmigte Änderungen anwenden, Dateien übertragen und Nachweise übergeben — ohne ein dauerhafter Bibliothekswartungsdienst zu werden.

Die Host Bridge bietet drei Oberflächen mit jeweils unterschiedlicher Rolle:

| Oberfläche | Rolle | Einsatz bei |
|------------|-------|-------------|
| **CLI Bundle** (`zotero-bridge`) | Installation, Verbindung und systemnahe Befehlsverträge | Direkter CLI-Zugriff auf Host-Bridge-Fähigkeiten benötigt |
| **Library Agent** | Begrenzte Aufgabenrouting, Nachweisübergabe und überprüfbare Ergebnisse | Endliche Anfrage mit Intent-Routing und Abschlussnachweis |
| **Librarian Profile** (Hermes) | Persistenter Index, geplante Wartung und fortlaufender Bibliotheksdienst | Persistente lokale Indexierung, Cron-Aufgaben oder fortlaufende Überwachung |

## Was der Library Agent bietet

- **Aufgabenrouting**: Leitet den aktuellen Intent an die kleinste passende Befehlsfamilie weiter, ohne eine vollständige Befehlstabelle durchsuchen zu müssen.
- **Journey-Referenzen**: Sieben detaillierte Journey-Handbücher decken spezifische Aufgabenkategorien ab. Jedes Handbuch spezifiziert Verzweigungen, Grenzfälle, Nachweisanforderungen, Genehmigungsgrenzen und Wiederherstellungspfade.
- **Nachweisübergabe**: Portierbare Nachweispakete mit deterministischer Formvalidierung und Artefakt-Digest-Berechnung.
- **Autoritätsgrenzen**: Erzwingt, dass Host Bridge der einzige Steuerungspfad ist, und verhindert direkten Zotero-Speicherzugriff oder Hintergrunddienstverhalten.
- **Begrenzte Operationen**: Jede Aufgabe ist abgeschlossen, wenn das angeforderte Ergebnis und sein Nachweis beobachtbar sind — eine Einreichungsbestätigung oder vorbereitete Übergabe allein gilt nicht als Abschluss.

## Begrenzter Aufgabenablauf

1. **Verbindung bestätigen**: Die geladene CLI und das Host-Bridge-Profil überprüfen. `zotero-bridge surface identity --json` ausführen, um mit dem gepackten Manifest zu vergleichen und die Repository-`releaseSetId` zu bestätigen.
2. **Intent routen**: Die Aufgabenrouting-Referenz lesen, um die kleinste Befehlsfamilie für die Anfrage auszuwählen.
3. **Passende Journey laden**: Genau ein Journey-Handbuch lesen, das zur Aufgabenkategorie passt.
4. **Nachweise bewahren**: Aktuelle Host-Fakten, zurückgegebene Handles, lokale Artefakte und Genehmigungsstatus als getrennte Nachweise bewahren.
5. **Ausführen oder einreichen**: Für Workflows der Workflow-Ausführungsreferenz folgen; Workflow-Optionen niemals über einen Ausführungsmodus senden, der sie nicht akzeptiert.
6. **Erstellen und validieren**: Das finale Nachweispaket mit dem mitgelieferten Helper erstellen und validieren.

Die Aufgabe ist erst abgeschlossen, wenn das angeforderte Ergebnis und sein Nachweis beobachtbar sind.

## Journey-Kategorien

Der Library Agent enthält sieben Journey-Handbücher, die jeweils einen bestimmten Aufgabenbereich abdecken:

| Journey | Umfang |
|---------|--------|
| **Aktueller Kontext & Bibliothekslesen** | Deiktische Auswahl, Suche versus Liste, Eintragsdetails, Notizen und Anhangsnachweise |
| **Notizen, Anhänge & Bereitschaft** | Notizabschnitte und -payloads, Annotationen, PDF/Markdown/Analyse-Bereitschaft und generierte Anhänge |
| **Synthese-Forschungskontext** | Themen, Zitationsgraph-Ansichten, Indizes, Resolver, Artefakte, Schemas und Aufmerksamkeitswarteschlangen |
| **Host-eigene Workflows** | Workflow-Beschreibung, Anforderungen, Validierung, Einreichung, Überwachung, Berechtigungen, Interaktion und Product-Nachweise |
| **Agent-eigene Übergabe** | Agent-eigene Bündelausführung, Ergebnisvalidierung, Apply-back und Quittungswiederherstellung |
| **Konkretes Zurückschreiben** | Vorgeschaute Mutationen, semantische Schreibbefehle, Genehmigung und Live-Verifizierung |
| **Products & Dateien** | Lokale Pfade, registrierte Dateien, Dashboard-Products, Downloads und Anhangsauslieferung |

Jede Journey verweist auf die mitgelieferten `zotero-bridge` CLI-Befehlskarten, wenn genaue Payload- oder Ergebnisfelder benötigt werden.

## Autoritäts- und Sicherheitsgrenzen

Der Library Agent erzwingt strenge Grenzen, um unbeabsichtigte Zotero-Änderungen zu verhindern:

- **Nur Host Bridge**: Host Bridge als einzigen Zotero- und Zotero-Agents-Steuerungspfad behandeln. Nicht direkt auf Zotero-Datenbanken, Speicherverzeichnisse, Plugin-Interna oder Browser-Zustand zugreifen.
- **Begrenzte Arbeit**: Den Library Agent nicht in einen Hintergrund-Bibliotheksdienst verwandeln. Begrenzte Arbeit für die aktuelle Anfrage ausführen und die Steuerung zurückgeben, wenn das Ergebnis oder die benötigte Benutzerentscheidung vorliegt.
- **Keine unbegleiteten Schreibvorgänge**: Keine geplanten oder unbegleiteten Schreibvorgänge ausführen. Eine aktuelle Benutzeranfrage und Host-Bridge-Genehmigung regeln jede Mutation oder jedes Apply-back.
- **Keine veralteten Annahmen**: Cache-Einträge, generierte Referenzen oder Nachweispakete nicht als live Zotero-Wahrheit behandeln; bei benötigter Aktualität über Host Bridge aktuelle Fakten bestätigen.

## Nachweisübergabe

Der Library Agent erstellt portable Nachweispakete für Aufgabenkontinuität. Ein Nachweispaket enthält:

- **Status**: `completed`, `canceled` oder `failed`
- **Zusammenfassung**: Knappe aufgabenlokale Erkenntnisse
- **Nachweisdatei** (optional): Vom Helper erstelltes, validiertes Nachweispaket, das ein anderer Agent oder eine andere Aufgabe konsumieren kann
- **Diagnoseinformationen** (optional): Strukturierte Diagnoseinformationen

Ein Nachweispaket mit dem mitgelieferten Helper erstellen und validieren:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

Der Helper validiert deterministische Form, berechnet Artefakt-Digests und überprüft Workflow-Bündel. Der Agent bleibt verantwortlich für Befehlswahl, Interpretation, Nachweisausreichung und ob eine überprüfte Aktion autorisiert ist.

## Fehlerbehandlung

- Strukturierte Fehlercodes und Handle-Felder beim Melden eines Fehlers bewahren.
- Einen Befehl oder ein Objekt nur neu ermitteln, wenn der Fehler veraltete Syntax oder Identität anzeigt; keine alternativen Handles erraten.
- Wenn eine Operation ein File-Handle oder einen Ausgabepfad zurückgibt, die deklarierte Datei vor der Verwendung als Nachweis- oder Apply-back-Eingabe überprüfen.
- Wenn erforderliche Autorität, Eingabe oder Benutzerintent fehlt, an der Grenze anhalten und die genau fehlende Entscheidung angeben.

## Integration

Der Library Agent benötigt Host Bridge für jeden Zotero-Zugriff. Vor der Verwendung des Library Agent:

1. Sicherstellen, dass Host Bridge läuft (Zotero → Einstellungen → Zotero Agents → Host Bridge → **Starten / Endpunkt anzeigen**).
2. Die `zotero-bridge` CLI installieren (Schaltfläche **CLI installieren** im Host-Bridge-Einstellungsfeld).
3. Das Verbindungsprofil mit der Endpunkt-URL und dem Bearer-Token konfigurieren. Detaillierte Einrichtung siehe [Host-Bridge-Konfiguration](host-bridge).

## Nächste Schritte

- [Host Bridge](host-bridge) — vollständige Referenz für die `zotero-bridge` CLI und Host-Bridge-Fähigkeiten
- [Hermes Profiles](hermes-profiles) — persistenter Bibliotheksdienst mit lokaler Indexierung und geplanter Wartung
- [Workflows](../workflows) — Übersicht aller eingebauten und benutzerdefinierten Workflows
- [MCP Server](mcp-server) — alternative Protokollschnittstelle für MCP-kompatible Clients
