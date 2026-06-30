# Zotero Librarian Hermes-Profil

## Überblick

**zotero-librarian** ist ein sofort installierbares [Hermes](https://github.com/anomalyco/hermes)-Profil, das KI-Agenten die Verwaltung Ihrer Zotero-Bibliothek über die [Host Bridge](#doc/backends%2Fhost-bridge) ermöglicht. Es enthält alles, was ein Agent benötigt: die `zotero-bridge`-CLI, eine Host Bridge-Verbindungsprofilvorlage, einen lokalen SQLite-Metadatenindex, einen Workflow-Katalogcache, Überwachungsskripte und geplante Wartungs-Cronjobs.

Das Profil wird als eigenständiges Paket aus dem `host-bridge/zotero-librarian-profile`-Zweig des Zotero Agents-Repository verteilt.

## Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| **Lokaler Metadatenindex** | Pflegt einen durchsuchbaren SQLite-Schnappschuss Ihrer Zotero-Bibliothek — Titel, Ersteller, Tags, Sammlungen, DOIs, Notiz-/Anhangszahlen — für schnelle, offline-fähige Abfragen |
| **Workflow-Katalogcache** | Cacht alle integrierten Workflow-Payload-Verträge lokal, sodass Agenten bekannte Workflows einreichen können, ohne bei jedem Lauf die Schemas erneut abfragen zu müssen |
| **Geplante Wartung** | Sechs integrierte Cron-Vorlagen: Indexaktualisierung, Workflow-Katalogaktualisierung, Ausführungsüberwachung, Posteingangstriage, Bibliothekshygiene und Aufmerksamkeitswarteschlangen-Zusammenfassungen |
| **Ausführungsüberwachung** | Verfolgt eingereichte Workflow-Ausführungen und meldet Zustandsänderungen, Endzustände oder aufmerksamkeitsbedürftige Elemente |
| **Aufmerksamkeitswarteschlange** | Kombiniert Host Bridge `insights.get_attention_queue` mit lokalen Indexmetadaten, um priorisierte Lese- und Analyseaufgaben anzuzeigen |

## Installation

### Voraussetzungen

- [Zotero](https://www.zotero.org/) 7+ mit installiertem **Zotero Agents**-Plugin
- Host Bridge läuft (Prüfung: Zotero → Einstellungen → Zotero Agents → Host Bridge → **Starten / Endpunkt anzeigen**)
- [Hermes](https://github.com/anomalyco/hermes) auf Ihrem System installiert
- `zotero-bridge`-CLI verfügbar (Installation über die Schaltfläche **CLI installieren** im Host Bridge-Einstellungsbereich)

### Profil installieren

```bash
hermes profile install zotero-librarian
```

Dies lädt das Profilpaket herunter und entpackt es in Ihr Hermes-Profile-Verzeichnis.

### Hermes konfigurieren

Bearbeiten Sie die `config.yaml` des Profils, um Ihren bevorzugten Modellanbieter einzurichten:

```yaml
# Im installierten Profilverzeichnis
provider:
  type: anthropic    # oder openai, local, etc.
  model: claude-sonnet-4-20250514
  # ... API-Schlüssel und weitere Anbietereinstellungen
```

Vollständige Anbieterkonfigurationsoptionen finden Sie in der [Hermes-Dokumentation](https://github.com/anomalyco/hermes).

### Zotero Bridge-Verbindung konfigurieren

Das Profil enthält eine Host Bridge-Verbindungsvorlage unter `assets/host-bridge/profile.example.json`. Sie müssen den tatsächlichen Endpunkt und Token angeben:

1. Öffnen Sie Zotero → Einstellungen → Zotero Agents → Host Bridge
2. Klicken Sie auf **Starten / Endpunkt anzeigen**, um sicherzustellen, dass die Bridge läuft, und notieren Sie die Endpunkt-URL (z. B. `http://127.0.0.1:26570/bridge/v1`)
3. Klicken Sie auf **Master-Token kopieren** (oder verwenden Sie das im Panel angezeigte Sitzungstoken)
4. Setzen Sie das Token als Umgebungsvariable:

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<Ihr-Token>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<Ihr-Token>"
```

5. Bei Fern-/LAN-Zugriff geben Sie auch den Endpunkt direkt an:

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

Die Profilvorlage verwendet `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`, sodass die CLI das Token automatisch aus der Umgebung übernimmt. Siehe [Host Bridge-Konfiguration](#doc/backends%2Fhost-bridge) für detaillierte Dokumentation zu Endpunkt, Token und Profildateien.

### Einrichtung überprüfen

```bash
# Host Bridge-Konnektivität prüfen
zotero-bridge status

# CLI-Binärdateien ins Profil installieren (nur beim ersten Mal)
python scripts/install_zotero_bridge_cli.py

# Erste Indexaktualisierung (zieht alle Bibliotheksmetadaten in lokales SQLite)
python scripts/zotero_librarian_index_service.py refresh

# Suche im lokalen Index testen
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## Indexdienst-Befehle

Das Kernwerkzeug des Profils ist `zotero_librarian_index_service.py`. Es pflegt eine lokale SQLite-Datenbank für schnelle, wiederholte Bibliotheksabfragen ohne Zotero bei jeder Anfrage aufzurufen.

| Befehl | Beschreibung |
|--------|-------------|
| `refresh` | Durchläuft `zotero-bridge library snapshot` und aktualisiert den SQLite-Index atomar. In der letzten Aktualisierung fehlende Elemente werden als gelöscht markiert. |
| `search "<Suchtext>"` | Volltextsuche in Titeln, Erstellern, Identifikatoren, Tags, Sammlungen und Publikationsfeldern |
| `item <key-or-id>` | Gibt einen einzelnen indexierten Datensatz nach Zotero-Elementschlüssel oder numerischer ID zurück |
| `stats` | Meldet Anzahl aktiver/gelöschter Elemente, Tags, Sammlungen und Workflow-Katalogstatus |
| `workflow-refresh` | Ruft `workflow list` und `workflow describe` auf, um den lokalen Workflow-Katalogcache zu aktualisieren |
| `workflow-show <id>` | Zeigt den zwischengespeicherten Payload-Vertrag für einen bekannten Workflow an |
| `run-register --run-id <id> --workflow-id <id>` | Registriert eine eingereichte Workflow-Ausführung zur Überwachung |
| `run-watch` | Prüft alle aktiven registrierten Ausführungen und meldet Zustandsänderungen oder Endzustände |

## Anwendungsfälle

### Bibliotheksverwaltung

**Tägliche Posteingangstriage** (`cron/inbox-triage.yaml`)

Der Posteingangstriage-Cron des Profils läuft täglich und prüft neue Elemente in Ihrer Bibliothek auf Vollständigkeit:

- Elemente mit Status `0-inbox` (unbearbeitet)
- Fehlende Tags oder Sammlungszuweisungen
- Fehlende DOI, URL oder Anhangsdateien
- Fehlende Zusammenfassungs- oder Digest-Artefakte

Er erstellt einen Bericht mit Handlungsvorschlägen, nimmt jedoch ohne Ihre Zustimmung keine Zotero-Änderungen vor.

**Wöchentliche Bibliothekshygiene** (`cron/library-hygiene.yaml`)

Läuft wöchentlich montags und durchsucht die Bibliothek nach Datenqualitätsproblemen:

- Doppelte Einträge (nach DOI, Titel oder ISBN)
- Verdächtige Zeichensalat-Titel
- Verwaiste Elemente (keine übergeordnete Sammlung)
- Leere Sammlungen
- Übermäßige Tag-Anzahl bei einzelnen Elementen
- Elemente mit ungewöhnlichen Zotero-Elementtypen

Alle Vorschläge sind schreibgeschützt, bis Sie Korrekturmaßnahmen ausdrücklich genehmigen.

**Aufmerksamkeitswarteschlange** (`cron/attention-queue.yaml`)

Kombiniert Host Bridge `insights.get_attention_queue` mit lokalen Indexmetadaten, um eine priorisierte Liste von Aufgaben anzuzeigen — zu lesende Artikel, zu vervollständigende Metadaten, auszuführende Workflows.

### Literatursuche und -import

1. Durchsuchen Sie zuerst Ihren lokalen Index, um das erneute Hinzufügen bereits vorhandener Artikel zu vermeiden:
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. Wenn ein Artikel nicht gefunden wird, verwenden Sie den `literature-search-ingest`-Workflow, um externe Quellen zu durchsuchen und ihn zu Zotero hinzuzufügen:
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. Führen Sie nach dem Import die Workflows tag-bootstrapper oder tag-regulator aus, um Tags für die neuen Elemente zu normalisieren.

### Automatisierte Literaturanalyse-Workflows

Das Profil katalogisiert alle integrierten Workflows des Zotero Agents-Plugins. Sobald der Katalog aktualisiert ist, können Sie jeden Workflow direkt einreichen, ohne sein Schema erneut abzufragen.

**Batch-Literaturanalyse**

Reichen Sie den `literature-analysis`-Workflow für eine Sammlung von Artikeln ein, um strukturierte Zusammenfassungen zu generieren:

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"de"}'
```

Ausführung registrieren und überwachen:

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**Tiefenlektüre eines einzelnen Artikels**

Für eine gründliche Analyse eines bestimmten Artikels:

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"de","mode":"comprehensive"}'
```

**Themenübergreifende Synthese**

Themen über eine Sammlung von Artikeln hinweg synthetisieren:

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"de"}'
```

**Übersetzungsunterstützung**

Übersetzen Sie Artikelmetadaten oder Zusammenfassungen:

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"de","mode":"metadata"}'
```

**Fragen zu Artikeln**

Stellen Sie Fragen zum Inhalt eines Artikels:

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"de"}'
```

## Geplante Wartungsjobs

Das Profil enthält sechs vorkonfigurierte Cron-Vorlagen im Verzeichnis `cron/`:

| Cron-Job | Zeitplan | Verhalten |
|----------|---------|-----------|
| `index-refresh` | Alle 6 Stunden | Durchläuft `library snapshot`, um den lokalen SQLite-Index aktuell zu halten. Meldet `[SILENT]`, wenn keine Änderungen erkannt werden. |
| `workflow-catalog-refresh` | Täglich um 03:00 | Ruft `workflow list` + `workflow describe` auf, um den Workflow-Katalogcache zu aktualisieren. Meldet `[SILENT]` bei keinen Änderungen. |
| `run-monitor` | Alle 5 Minuten | Ruft `run-watch` auf, um aktive registrierte Ausführungen zu prüfen. Meldet nur Zustandsänderungen, Endzustände oder aufmerksamkeitsbedürftige Elemente. |
| `inbox-triage` | Täglich um 09:00 | Sucht nach Elementen mit `status:0-inbox`, fehlenden Tags, fehlenden Sammlungen, fehlenden Metadaten. Erstellt einen schreibgeschützten Bericht. |
| `library-hygiene` | Wöchentlich montags | Durchsucht nach doppelten Einträgen, verwaisten Elementen, leeren Sammlungen und Datenqualitätsproblemen. |
| `attention-queue` | Täglich um 18:00 | Kombiniert Aufmerksamkeitswarteschlangen-Erkenntnisse mit lokalen Indexdaten zur Priorisierung von Aufgaben. |

Alle nicht-interaktiven Wartungsjobs verwenden `[SILENT]`-Marker, um den Benutzer nicht zu belästigen, wenn keine handlungsrelevanten Ergebnisse vorliegen.

## Sicherheitsgrenzen

- Die Profilvorlage (`profile.example.json`) enthält niemals echte Token. Verwenden Sie stets `ZOTERO_BRIDGE_TOKEN` als Umgebungsvariable.
- Wartungs-Cronjobs sind standardmäßig schreibgeschützt. Änderungen erfordern eine ausdrückliche Benutzergenehmigung.
- Lesen Sie niemals Zotero-Datenbankdateien direkt. Verwenden Sie stets Host Bridge, `zotero-bridge` und den aus `library.sync_snapshot` erstellten lokalen Index.

## Nächste Schritte

- [Host Bridge](#doc/backends%2Fhost-bridge) — vollständige Referenz für die `zotero-bridge`-CLI und Host Bridge-Funktionen
- [Workflows](#doc/workflows%2Findex) — Übersicht aller integrierten und benutzerdefinierten Workflows
- [MCP-Server](#doc/backends%2Fmcp-server) — alternative Protokollschnittstelle für MCP-kompatible Clients
